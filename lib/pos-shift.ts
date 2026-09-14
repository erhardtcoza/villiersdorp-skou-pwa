type Storage = Pick<globalThis.Storage, 'getItem'|'setItem'|'removeItem'>;
export type ShiftContext = {terminal_code:string;location_id:number;event_id:number};
export type ShiftLease = {terminal_code:string;device_instance_id:string;lease_token:string};
export type POSShift = ShiftContext & {id:string;status:string;operator_id:number;opening_float_cents:number;revision:number};
export type PendingShiftStop={shift_id:string;expected_revision:number;idempotency_key:string;reason:string};
export function shiftStopJournal(storage:Storage,userId:number,context:ShiftContext){
  const key=`skou-pos-shift-stop:${userId}:${context.event_id}:${context.location_id}:${context.terminal_code}`;
  const valid=(e:PendingShiftStop)=>e&&typeof e.shift_id==='string'&&e.shift_id.trim()&&e.shift_id.length<=128&&Number.isSafeInteger(e.expected_revision)&&e.expected_revision>0&&typeof e.idempotency_key==='string'&&e.idempotency_key.trim()&&e.idempotency_key.length<=128&&typeof e.reason==='string'&&e.reason.trim()&&e.reason.length<=500;
  const pending=():PendingShiftStop|null=>{
    const raw=storage.getItem(key);if(!raw)return null;
    try{const e=JSON.parse(raw);if(!valid(e))throw Error();return {shift_id:e.shift_id,expected_revision:e.expected_revision,idempotency_key:e.idempotency_key,reason:e.reason};}
    catch{throw new Error('Die skof-stopversoek kon nie herlaai word nie. Kontak admin.');}
  };
  return {pending,clear:()=>storage.removeItem(key),prepare(shift:POSShift,reason:string){
    const prior=pending(),entry=prior||{shift_id:shift.id,expected_revision:shift.revision,idempotency_key:crypto.randomUUID(),reason:reason.trim()};
    if(!valid(entry))throw new Error('Verskaf ’n rede (hoogstens 500 karakters) en herlaai die skof indien nodig.');
    if(prior&&(prior.shift_id!==shift.id||prior.expected_revision!==shift.revision||prior.reason!==reason.trim()))throw new Error('Hervat eers die bestaande skof-stopversoek.');
    storage.setItem(key,JSON.stringify(entry));return entry;
  }};
}
export function validateStoppedShift(value:unknown,userId:number,context:ShiftContext,entry:PendingShiftStop):POSShift{
  const s=value as POSShift|null;
  if(!s||s.id!==entry.shift_id||!['cashup_pending','closed'].includes(s.status)||s.operator_id!==userId||s.event_id!==context.event_id||s.location_id!==context.location_id||s.terminal_code!==context.terminal_code||!Number.isSafeInteger(s.revision)||s.revision<=entry.expected_revision)
    throw new Error('Die skof-stop is nog nie bevestig nie. Herprobeer met dieselfde verwysing.');
  return s;
}
export function validateOpenShift(value:unknown,userId:number,context:ShiftContext):POSShift {
  const shift=value as POSShift|null;
  if(!shift||typeof shift.id!=='string'||!shift.id||shift.status!=='open'||shift.operator_id!==userId||shift.terminal_code!==context.terminal_code||shift.event_id!==context.event_id||shift.location_id!==context.location_id||!Number.isSafeInteger(shift.opening_float_cents)||shift.opening_float_cents<0)
    throw new Error('Die skof is nie oop vir hierdie kassier en verkooppunt nie. Herlaai die skof.');
  return shift;
}
export function openingFloatCents(value:string) {
  const text=value.trim().replace(',','.');
  if(!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Vul openingskontant in met hoogstens twee desimale.');
  const [whole,fraction='']=text.split('.');
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents)) throw new Error('Die bedrag is te groot.');
  return cents;
}
export function shiftOpeningJournal(storage:Storage,userId:number,context:ShiftContext) {
  const key=`skou-pos-shift-open:${userId}:${context.event_id}:${context.location_id}:${context.terminal_code}`;
  function pending():{idempotency_key:string;opening_float_cents:number}|null {
    const raw=storage.getItem(key);if(!raw)return null;
    try {
      const entry=JSON.parse(raw);
      if(typeof entry.idempotency_key!=='string'||!entry.idempotency_key.trim()||entry.idempotency_key.length>128||!Number.isSafeInteger(entry.opening_float_cents)||entry.opening_float_cents<0) throw new Error();
      return {idempotency_key:entry.idempotency_key,opening_float_cents:entry.opening_float_cents};
    }catch{throw new Error('Die skofversoek kon nie herlaai word nie. Kontak admin voordat jy weer probeer.');}
  }
  return {pending,clear:()=>storage.removeItem(key),prepare(cents:number){
    if(!Number.isSafeInteger(cents)||cents<0)throw new Error('Ongeldige openingskontant.');
    const prior=pending();
    if(prior&&prior.opening_float_cents!==cents)throw new Error('Hervat eers die vorige openingskontant-versoek.');
    const entry=prior||{idempotency_key:crypto.randomUUID(),opening_float_cents:cents};
    storage.setItem(key,JSON.stringify(entry));
    return entry;
  }};
}
