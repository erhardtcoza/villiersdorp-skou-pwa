export type CashupIntent={shift_id:string;idempotency_key:string;expected_revision:number;expected_fingerprint:string;expected_cash_cents:number;counted_cash_cents:number;variance_reason:string;cancel_reason?:string};
export type CashupReceipt={shift_id:string;idempotency_key:string;actor_id:number;revision:number;expected_cash_cents:number;counted_cash_cents:number;variance_cents:number;variance_reason:string;closed_at:number};
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function countedCashCents(text:string){
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(text.trim()))throw Error('Voer ’n geldige kontantbedrag in, byvoorbeeld 120.50.');
  const [whole,fraction='']=text.trim().replace(',','.').split('.');
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents))throw Error('Kontantbedrag is te groot.');return cents;
}
type Cancellation=Omit<CashupIntent,'expected_cash_cents'>&{actor_id:number;created_at:number};
export function cashupJournal(store:Store,userId:number,api:(path:string,init:RequestInit)=>Promise<{receipt?:CashupReceipt;status?:string;cancellation?:Cancellation}>){
  const key=`skou-cashup-pending:staff:${userId}`;let busy=false;
  function validate(value:CashupIntent){
    if(!value||typeof value.shift_id!=='string'||!value.shift_id.trim()||typeof value.idempotency_key!=='string'||!value.idempotency_key.trim()||
      !Number.isSafeInteger(value.expected_revision)||value.expected_revision<1||!Number.isSafeInteger(value.expected_cash_cents)||value.expected_cash_cents<0||
      !Number.isSafeInteger(value.counted_cash_cents)||value.counted_cash_cents<0||typeof value.expected_fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(value.expected_fingerprint)||
      typeof value.variance_reason!=='string'||value.variance_reason.length>2000||
      (value.cancel_reason!==undefined&&(typeof value.cancel_reason!=='string'||value.cancel_reason.trim().length<3||value.cancel_reason.length>2000))||
      (value.counted_cash_cents!==value.expected_cash_cents&&value.variance_reason.trim().length<3))throw Error('Kasafsluitbesonderhede is ongeldig. Kontroleer die bedrag en rede; kontak admin indien herstel misluk.');
    return value;
  }
  function pending(){const raw=store.getItem(key);return raw?validate(JSON.parse(raw)):null;}
  function verifyReceipt(r:CashupReceipt|undefined,saved:CashupIntent){
    if(!r||r.shift_id!==saved.shift_id||r.idempotency_key!==saved.idempotency_key||r.actor_id!==userId||r.revision!==saved.expected_revision+1||
      r.expected_cash_cents!==saved.expected_cash_cents||r.counted_cash_cents!==saved.counted_cash_cents||r.variance_reason!==saved.variance_reason||
      r.variance_cents!==saved.counted_cash_cents-saved.expected_cash_cents||!Number.isSafeInteger(r.closed_at)||r.closed_at<=0)throw Error('Ontvangsbewys kon nie bevestig word nie. Hervat die oorspronklike kasafsluiting of kontak admin.');
    return r;
  }
  async function run(draft:Omit<CashupIntent,'idempotency_key'>|null){
    if(busy)throw Error('Kasafsluiting word reeds verwerk.');busy=true;
    try{
      let saved=pending();
      if(saved?.cancel_reason)throw Error('Hervat eers die kansellasie van hierdie versoek.');
      if(saved&&draft)throw Error('Hervat eers die oorspronklike kasafsluiting.');
      if(!saved){if(!draft)throw Error('Geen gestoorde kasafsluiting nie.');saved=validate({...draft,idempotency_key:crypto.randomUUID()});store.setItem(key,JSON.stringify(saved));}
      const result=await api(`/api/app/pos/cashups/${encodeURIComponent(saved.shift_id)}/close`,{method:'POST',body:JSON.stringify(saved)});
      if(JSON.stringify(pending())!==JSON.stringify(saved))throw Error('Die gestoorde kasafsluiting het verander. Herlaai en kontak admin.');
      const r=verifyReceipt(result.receipt,saved);
      store.removeItem(key);return r;
    }finally{busy=false;}
  }
  async function cancel(reason:string|null){
    if(busy)throw Error('Kasafsluiting word reeds verwerk.');busy=true;
    try{
      let saved=pending();if(!saved)throw Error('Geen gestoorde kasafsluiting nie.');
      if(saved.cancel_reason&&reason!==null&&reason.trim()!==saved.cancel_reason)throw Error('Hervat die oorspronklike kansellasierede.');
      if(!saved.cancel_reason){
        if(typeof reason!=='string'||reason.trim().length<3||reason.length>2000)throw Error('Gee ’n rede vir kansellasie.');
        saved={...saved,cancel_reason:reason.trim()};store.setItem(key,JSON.stringify(saved));
      }
      const result=await api(`/api/app/pos/cashups/${encodeURIComponent(saved.shift_id)}/cancel`,{method:'POST',body:JSON.stringify(saved)});
      if(JSON.stringify(pending())!==JSON.stringify(saved))throw Error('Die gestoorde kasafsluiting het verander. Herlaai en kontak admin.');
      if(result.status==='completed'){
        const receipt=verifyReceipt(result.receipt,saved);store.removeItem(key);return {status:'completed' as const,receipt};
      }
      const c=result.cancellation;
      if(result.status!=='cancelled'||!c||c.actor_id!==userId||c.idempotency_key!==saved.idempotency_key||c.shift_id!==saved.shift_id||
        c.expected_revision!==saved.expected_revision||c.expected_fingerprint!==saved.expected_fingerprint||c.counted_cash_cents!==saved.counted_cash_cents||
        c.variance_reason!==saved.variance_reason||c.cancel_reason!==saved.cancel_reason||!Number.isSafeInteger(c.created_at)||c.created_at<=0)throw Error('Kansellasie kon nie bevestig word nie. Hervat die oorspronklike kansellasie of kontak admin.');
      store.removeItem(key);return {status:'cancelled' as const};
    }finally{busy=false;}
  }
  return {pending,run,cancel};
}
