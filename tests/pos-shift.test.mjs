import test from 'node:test';
import assert from 'node:assert/strict';
import {openingFloatCents,shiftOpeningJournal,shiftStopJournal,validateOpenShift,validateStoppedShift} from '../lib/pos-shift.ts';

const context={terminal_code:'TEST',event_id:1,location_id:2};
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('opening cash uses integer cents and requires an explicit nonnegative amount',()=>{
  for(const [input,expected] of [['0',0],['123.45',12345],[' 1,2 ',120],['000.01',1]])assert.equal(openingFloatCents(input),expected);
  for(const input of ['', ' ', '-1','1e3','0.001','Infinity','1.2.3','9007199254740991'])assert.throws(()=>openingFloatCents(input));
});
test('opening journal survives remount with the same request and does not persist lease credentials',()=>{
  const s=storage(),first=shiftOpeningJournal(s,7,context).prepare(1000);
  assert.deepEqual(shiftOpeningJournal(s,7,context).prepare(1000),first);
  assert.deepEqual(Object.keys(first).sort(),['idempotency_key','opening_float_cents']);
  assert.throws(()=>shiftOpeningJournal(s,7,context).prepare(2000),/Hervat/);
  shiftOpeningJournal(s,7,context).clear();assert.equal(shiftOpeningJournal(s,7,context).pending(),null);
});
test('opening cash journal is isolated by cashier, event, location and terminal',()=>{
  const s=storage();shiftOpeningJournal(s,7,context).prepare(0);
  for(const [user,c] of [[8,context],[7,{...context,event_id:2}],[7,{...context,location_id:3}],[7,{...context,terminal_code:'OTHER'}]])assert.equal(shiftOpeningJournal(s,user,c).pending(),null);
});
test('corrupt and unavailable storage fails closed without replacing the recovery reference',()=>{
  const s=storage(),j=shiftOpeningJournal(s,7,context);j.prepare(1);const key=[...s.values.keys()][0];
  for(const value of ['{','null','{}',JSON.stringify({idempotency_key:' ',opening_float_cents:0}),JSON.stringify({idempotency_key:'x',opening_float_cents:-1})]){
    s.values.set(key,value);assert.throws(()=>j.prepare(1));assert.equal(s.values.get(key),value);
  }
  assert.throws(()=>shiftOpeningJournal({...s,setItem(){throw new Error('Storage unavailable');}},8,context).prepare(0),/Storage unavailable/);
});
test('only a valid open shift for the exact cashier and sale context enables selling',()=>{
  const good={...context,id:'s1',status:'open',operator_id:7,opening_float_cents:0};
  assert.equal(validateOpenShift(good,7,context),good);
  for(const changed of [null,undefined,{}, {...good,status:'closed'},{...good,operator_id:8},{...good,event_id:2},{...good,location_id:3},{...good,terminal_code:'OTHER'},{...good,opening_float_cents:0.5}])assert.throws(()=>validateOpenShift(changed,7,context));
});
test('stop journal isolates identities and preserves immutable reason/revision on retry',()=>{
  const s=storage(),j=shiftStopJournal(s,7,context),shift={...context,id:'s1',revision:1};
  const entry=j.prepare(shift,' Finished ');assert.equal(entry.reason,'Finished');assert.deepEqual(shiftStopJournal(s,7,context).pending(),entry);
  assert.equal(shiftStopJournal(s,8,context).pending(),null);assert.equal(shiftStopJournal(s,7,{...context,event_id:9}).pending(),null);
  assert.throws(()=>j.prepare(shift,'Changed'));assert.throws(()=>j.prepare({...shift,revision:2},'Finished'));
  assert.deepEqual(Object.keys(entry).sort(),['expected_revision','idempotency_key','reason','shift_id']);
  j.clear();assert.equal(j.pending(),null);assert.throws(()=>j.prepare(shift,' '));assert.throws(()=>j.prepare({...shift,revision:undefined},'Finished'));
});
test('corrupt stop journal fails closed; only matched stopped or closed result clears uncertainty',()=>{
  const s=storage(),j=shiftStopJournal(s,7,context),entry=j.prepare({id:'s1',revision:1},'Finished');const key=[...s.values.keys()][0];
  s.values.set(key,'{}');assert.throws(()=>j.pending());assert.throws(()=>j.prepare({id:'s1',revision:1},'Finished'));assert.equal(s.values.get(key),'{}');
  const good={...context,id:'s1',operator_id:7,status:'cashup_pending',revision:2};assert.equal(validateStoppedShift(good,7,context,entry),good);
  for(const patch of [{status:'open'},{revision:1},{id:'s2'},{event_id:2},{operator_id:8}])assert.throws(()=>validateStoppedShift({...good,...patch},7,context,entry));
});
