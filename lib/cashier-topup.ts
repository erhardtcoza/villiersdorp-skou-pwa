import type {ShiftContext,ShiftLease} from './pos-shift';
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type CashTopupIntent=ShiftContext & {shift_id:string;wallet_id:string;amount_cents:number;method:'cash';note:string;idempotency_key:string};
type Input=Omit<CashTopupIntent,'idempotency_key'>;
type Request=(path:string,options:{method:string;body:string})=>Promise<{ok?:boolean;topup?:unknown}>;
export function cashierTopupJournal(storage:Store,userId:number,request:Request){
  if(!Number.isSafeInteger(userId)||userId<1)throw new Error('Meld eers as personeel aan.');
  // One unresolved cashier receipt per operator, across departments. Its original
  // terminal and shift must survive navigation instead of being silently changed.
  const key=`skou-cashier-topup:${userId}`;
  let busy=false;
  const valid=(v:CashTopupIntent)=>v&&v.method==='cash'&&[v.shift_id,v.wallet_id,v.terminal_code,v.idempotency_key].every(s=>typeof s==='string'&&s.trim()&&s.length<=128)&&[v.event_id,v.location_id].every(n=>Number.isSafeInteger(n)&&n>0)&&Number.isSafeInteger(v.amount_cents)&&v.amount_cents>=1000&&v.amount_cents<=500000&&typeof v.note==='string'&&v.note.length<=300;
  const pending=():CashTopupIntent|null=>{
    const raw=storage.getItem(key);if(!raw)return null;
    try{const value=JSON.parse(raw);if(!valid(value))throw Error();
      return {shift_id:value.shift_id,wallet_id:value.wallet_id,terminal_code:value.terminal_code,event_id:value.event_id,location_id:value.location_id,amount_cents:value.amount_cents,method:'cash',note:value.note,idempotency_key:value.idempotency_key};
    }catch{throw new Error('Die vorige aanvulling kon nie herlaai word nie. Kontak admin; moenie weer kontant aanvaar nie.');}
  };
  const same=(a:CashTopupIntent,b:CashTopupIntent)=>Object.keys(a).every(k=>a[k as keyof CashTopupIntent]===b[k as keyof CashTopupIntent]);
  return {pending,prepare(input:Input){
    const prior=pending();
    const intent={...input,note:input.note.trim(),idempotency_key:prior?.idempotency_key||crypto.randomUUID()};
    if(!valid(intent))throw new Error('Kontroleer die beursie, bedrag en oop skof.');
    if(prior&&!same(prior,intent))throw new Error('Hervat eers die bestaande aanvulling met dieselfde besonderhede.');
    // Whitelist fields: never persist a lease token or device credential.
    storage.setItem(key,JSON.stringify({shift_id:intent.shift_id,wallet_id:intent.wallet_id,terminal_code:intent.terminal_code,event_id:intent.event_id,location_id:intent.location_id,amount_cents:intent.amount_cents,method:'cash',note:intent.note,idempotency_key:intent.idempotency_key}));
    return pending()!;
  },async submit(lease:ShiftLease){
    if(busy)throw new Error('Die aanvulling word reeds bevestig.');
    const intent=pending();if(!intent)throw new Error('Geen aanvulling om te hervat nie.');
    if(lease.terminal_code!==intent.terminal_code||!lease.device_instance_id||!lease.lease_token)throw new Error('Herstel eers die oorspronklike terminale verbinding.');
    busy=true;
    try{
      const response=await request('/api/app/staff/wallets/topup',{method:'POST',body:JSON.stringify({...intent,...lease})});
      const receipt=response.topup as CashTopupIntent & {id:string;operator_id:number;status:string};
      if(response.ok!==true||!receipt||typeof receipt.id!=='string'||!receipt.id||receipt.operator_id!==userId||receipt.status!=='completed'||!same(intent,receipt))throw new Error('Die aanvulling is nog nie bevestig nie. Herprobeer met dieselfde verwysing.');
      const current=pending();
      if(!current||!same(current,intent))throw new Error('Die aanvulling se plaaslike verwysing het verander. Herlaai en kontak admin.');
      storage.removeItem(key);
      return receipt;
    }finally{busy=false;}
  }};
}
