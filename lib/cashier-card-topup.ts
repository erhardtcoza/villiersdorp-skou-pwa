import type {CashTopupIntent} from './cashier-topup';
import type {ShiftLease} from './pos-shift';

type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type Intent=Omit<CashTopupIntent,'method'> & {method:'card'};
type Journal={intent:Intent;topup_id?:string;recovery_payment_id?:string;cancel_reason?:string};
type Request=(path:string,options:{method:string;body:string})=>Promise<unknown>;
const fields=['shift_id','wallet_id','terminal_code','event_id','location_id','amount_cents','note','idempotency_key'] as const;
const text=(v:unknown,max=128):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const uncertain=()=>new Error('Die kaartaanvulling is nog nie bevestig nie. Hervat die oorspronklike versoek; moenie weer betaal nie.');

/** Only immutable intent and reconciliation identifiers are stored, never credentials. */
export function cashierCardTopupJournal(storage:Store,userId:number,request:Request){
  if(!positive(userId))throw new Error('Meld eers as personeel aan.');
  const key=`skou-cashier-card-topup:${userId}`;
  let busy=false;
  const cleanIntent=(v:any):Intent=>{
    if(!v||v.method!=='card'||!['shift_id','wallet_id','terminal_code','idempotency_key'].every(k=>text(v[k]))||!positive(v.event_id)||!positive(v.location_id)||!Number.isSafeInteger(v.amount_cents)||v.amount_cents<1000||v.amount_cents>500000||typeof v.note!=='string'||v.note.length>300)throw uncertain();
    return {shift_id:v.shift_id,wallet_id:v.wallet_id,terminal_code:v.terminal_code,event_id:v.event_id,location_id:v.location_id,amount_cents:v.amount_cents,note:v.note,idempotency_key:v.idempotency_key,method:'card'};
  };
  const pending=():Journal|null=>{
    const raw=storage.getItem(key);if(raw===null)return null;
    try{
      const v=JSON.parse(raw),j:Journal={intent:cleanIntent(v.intent)};
      for(const k of ['topup_id','recovery_payment_id','cancel_reason'] as const){
        if(v[k]!==undefined){if(!text(v[k],k==='cancel_reason'?300:128)||(k==='cancel_reason'&&v[k].trim().length<3))throw uncertain();j[k]=v[k];}
      }
      return j;
    }catch{throw new Error('Die vorige kaartaanvulling kon nie herlaai word nie. Kontak admin voordat jy weer betaal.');}
  };
  const write=(j:Journal)=>storage.setItem(key,JSON.stringify(j));
  const unchanged=(j:Journal)=>{if(JSON.stringify(pending())!==JSON.stringify(j))throw uncertain();};
  const same=(a:Intent,b:any)=>b&&fields.every(k=>a[k]===b[k]);
  const execute=async(cancel:boolean,lease?:ShiftLease)=>{
    if(busy)throw new Error('Die kaartaanvulling word reeds bevestig.');
    const j=pending();if(!j)throw uncertain();
    if(cancel?!j.cancel_reason:!!j.cancel_reason)throw new Error('Hervat eers die bestaande kansellasie.');
    if(lease&&(lease.terminal_code!==j.intent.terminal_code||!text(lease.device_instance_id)||!text(lease.lease_token,4096)))throw uncertain();
    busy=true;
    try{
      const body=cancel?{...j.intent,reason:j.cancel_reason}:{...j.intent,...(lease?{terminal_code:lease.terminal_code,device_instance_id:lease.device_instance_id,lease_token:lease.lease_token}:{}),...(j.recovery_payment_id?{recovery_payment_id:j.recovery_payment_id}:{})};
      const r:any=await request(`/api/app/staff/wallets/card-topup/${cancel?'cancel':'start'}`,{method:'POST',body:JSON.stringify(body)});
      unchanged(j);
      if(r?.ok!==true||!same(j.intent,r.intent)||r.intent.operator_id!==userId||!text(r.intent.topup_id)||(j.topup_id&&j.topup_id!==r.intent.topup_id))throw uncertain();
      if(cancel&&r.status==='reconciliation_required'){
        const d=r.dispatch;
        if(r.cancellation_reason!==j.cancel_reason||!d||d.topup_id!==r.intent.topup_id||d.client_reference!==r.intent.topup_id||!text(d.device_id)||!['sandbox','production'].includes(d.environment)||!positive(d.created_at))throw uncertain();
        // Retire only the failed cancellation mode; the original payment and
        // recovery candidate remain durable and must still be reconciled.
        const {cancel_reason:_,...resume}=j;
        write({...resume,topup_id:r.intent.topup_id});
        return {...r,terminal:false,redirect_url:null};
      }
      let terminal=false;
      if(cancel&&r.status==='cancelled'){
        const c=r.cancellation;
        if(!c||c.topup_id!==r.intent.topup_id||c.actor_id!==userId||c.reason!==j.cancel_reason||!positive(c.created_at))throw uncertain();
        terminal=true;
      }else{
        const t=r.topup;
        if(!t||t.id!==r.intent.topup_id||t.wallet_id!==j.intent.wallet_id||t.subject_type!=='staff'||t.subject_id!==userId||t.amount_cents!==j.intent.amount_cents||t.checkout_id!==null)throw uncertain();
        if(t.status==='paid'){
          if(!positive(t.paid_at)||!text(t.yoco_payment_id)||(j.recovery_payment_id&&j.recovery_payment_id!==t.yoco_payment_id))throw uncertain();
          terminal=true;
        }else{
          if(cancel||!['pending','failed','cancelled'].includes(t.status)||t.paid_at!==null||t.yoco_payment_id!==null)throw uncertain();
          terminal=t.status!=='pending';
        }
      }
      let redirect_url:string|null=null;
      if(!terminal&&r.redirect_url!=null){
        const url=new URL(r.redirect_url);
        if(url.protocol!=='https:'||url.hostname!=='cpw.yoco.com'||url.port||url.username||url.password)throw uncertain();
        redirect_url=url.href;
      }
      if(terminal)storage.removeItem(key);else write({...j,topup_id:r.intent.topup_id});
      return {...r,redirect_url,terminal};
    }finally{busy=false;}
  };
  return {pending,prepare(input:Omit<Intent,'idempotency_key'>){
    if(busy)throw uncertain();
    const prior=pending(),intent=cleanIntent({...input,note:input.note.trim(),idempotency_key:prior?.intent.idempotency_key||crypto.randomUUID()});
    if(prior&&!same(intent,prior.intent))throw uncertain();
    if(!prior)write({intent});
    return pending()!;
  },recover(paymentId:string){
    const j=pending();if(busy||!j||j.cancel_reason||!text(paymentId)||(j.recovery_payment_id&&j.recovery_payment_id!==paymentId))throw uncertain();
    write({...j,recovery_payment_id:paymentId});
  },prepareCancellation(reason:string){
    const j=pending(),value=reason.trim();
    if(busy||!j||!text(value,300)||value.length<3||(j.cancel_reason&&j.cancel_reason!==value))throw uncertain();
    write({...j,cancel_reason:value});
  },submit:(lease?:ShiftLease)=>execute(false,lease),cancel:()=>execute(true)};
}
