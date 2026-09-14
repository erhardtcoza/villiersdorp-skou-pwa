import test from 'node:test';
import assert from 'node:assert/strict';
import {cashierCardTopupJournal} from '../lib/cashier-card-topup.ts';
const input={shift_id:'S',wallet_id:'W',terminal_code:'T',event_id:1,location_id:1,amount_cents:1000,method:'card',note:' top up '};
function fixture(){
  const map=new Map();
  const storage={getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  let response,body,calls=0;
  const request=async(_path,opt)=>{calls++;body=JSON.parse(opt.body);if(response instanceof Error)throw response;return typeof response==='function'?response(body):response;};
  const journal=()=>cashierCardTopupJournal(storage,1,request);
  const receipt=(intent,status='pending')=>({ok:true,intent:{...intent,operator_id:1,topup_id:'TC'},topup:{id:'TC',wallet_id:'W',subject_type:'staff',subject_id:1,amount_cents:1000,checkout_id:null,status,paid_at:status==='paid'?100:null,yoco_payment_id:status==='paid'?'PAY':null},redirect_url:'https://cpw.yoco.com/pay'});
  return {map,storage,journal,receipt,setResponse:r=>response=r,get body(){return body;},get calls(){return calls;}};
}
test('lost response/remount preserves original intent without credentials; pending is not payment',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare({...input,lease_token:'SECRET',device_instance_id:'DEVICE'});
  assert.doesNotMatch([...f.map.values()].join(''),/SECRET|DEVICE/);
  f.setResponse(new Error('connection lost'));await assert.rejects(j.submit());
  const resumed=f.journal();assert.deepEqual(resumed.pending().intent,intent);
  assert.throws(()=>resumed.prepare({...input,amount_cents:2000}));
  f.setResponse(f.receipt(intent));const pending=await resumed.submit();
  assert.equal(pending.terminal,false);assert.equal(resumed.pending().topup_id,'TC');
  assert.equal(f.body.idempotency_key,intent.idempotency_key);
  f.setResponse(f.receipt(intent,'paid'));assert.equal((await resumed.submit()).terminal,true);assert.equal(resumed.pending(),null);
});
test('receipt identity, provider evidence and unsafe redirects fail closed',async()=>{
  const changes=[r=>r.intent.operator_id=2,r=>r.intent.amount_cents=2000,r=>r.topup.subject_id=2,r=>r.topup.wallet_id='OTHER',r=>r.topup.checkout_id='CHECKOUT',r=>r.topup.paid_at=100,r=>r.topup.yoco_payment_id='PAY',r=>r.redirect_url='https://cpw.yoco.com.evil.test/pay'];
  for(const change of changes){const f=fixture(),j=f.journal(),{intent}=j.prepare(input),r=f.receipt(intent);change(r);f.setResponse(r);await assert.rejects(j.submit());assert.ok(j.pending());}
  for(const change of [r=>r.topup.paid_at=null,r=>r.topup.yoco_payment_id='',r=>r.topup.amount_cents=999]){const f=fixture(),j=f.journal(),{intent}=j.prepare(input),r=f.receipt(intent,'paid');change(r);f.setResponse(r);await assert.rejects(j.submit());assert.ok(j.pending());}
});
test('recovery candidate is durable and cannot silently change',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare(input);j.recover('PAY');assert.throws(()=>j.recover('OTHER'));
  f.setResponse(new Error('lost'));await assert.rejects(f.journal().submit());assert.equal(f.body.recovery_payment_id,'PAY');
  f.setResponse(f.receipt(intent,'paid'));await f.journal().submit();assert.equal(j.pending(),null);
});
test('cancellation persists reason, blocks start and verifies exact immutable receipt',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare(input);assert.throws(()=>j.prepareCancellation(' '));j.prepareCancellation('Guest changed mind');
  await assert.rejects(j.submit());assert.equal(f.calls,0);assert.throws(()=>j.prepareCancellation('Different reason'));
  f.setResponse(new Error('lost'));await assert.rejects(j.cancel());
  const r={ok:true,status:'cancelled',intent:{...intent,operator_id:1,topup_id:'TC'},cancellation:{topup_id:'TC',actor_id:2,reason:'Guest changed mind',created_at:100}};
  f.setResponse(r);await assert.rejects(f.journal().cancel());assert.ok(j.pending());
  r.cancellation.actor_id=1;assert.equal((await f.journal().cancel()).terminal,true);assert.equal(j.pending(),null);
});
test('already paid cancellation returns paid receipt, never a false cancellation',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare(input);j.prepareCancellation('No longer needed');f.setResponse({...f.receipt(intent,'paid'),status:'paid'});
  const r=await j.cancel();assert.equal(r.status,'paid');assert.equal(j.pending(),null);
});
test('busy guard and changed local journal cannot clear another request',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare(input);let release;
  f.setResponse(()=>new Promise(resolve=>release=resolve));const task=j.submit();await assert.rejects(j.submit());assert.throws(()=>j.recover('PAY'));assert.throws(()=>j.prepareCancellation('stop'));
  f.map.set('skou-cashier-card-topup:1',JSON.stringify({intent:{...intent,idempotency_key:'OTHER'}}));release(f.receipt(intent,'paid'));await assert.rejects(task);assert.equal(j.pending().intent.idempotency_key,'OTHER');
});
test('corrupt storage fails closed and user journals are isolated',()=>{
  const f=fixture();f.journal().prepare(input);assert.equal(cashierCardTopupJournal(f.storage,2,async()=>({})).pending(),null);
  f.map.set('skou-cashier-card-topup:1','');assert.throws(()=>f.journal().pending());assert.throws(()=>cashierCardTopupJournal(f.storage,0,async()=>({})));
});
test('verified dispatch refusal retires only cancellation mode and permits original reconciliation',async()=>{
  const f=fixture(),j=f.journal(),{intent}=j.prepare(input);j.recover('PAY');j.prepareCancellation('Guest changed mind');
  const r={ok:true,status:'reconciliation_required',intent:{...intent,operator_id:1,topup_id:'TC'},cancellation_reason:'Guest changed mind',dispatch:{topup_id:'TC',client_reference:'OTHER',device_id:'DEVICE',environment:'sandbox',created_at:100}};
  f.setResponse(r);await assert.rejects(j.cancel());assert.equal(j.pending().cancel_reason,'Guest changed mind');
  r.dispatch.client_reference='TC';assert.equal((await j.cancel()).terminal,false);
  assert.equal(j.pending().cancel_reason,undefined);assert.deepEqual(j.pending().intent,intent);assert.equal(j.pending().recovery_payment_id,'PAY');
  f.setResponse(f.receipt(intent,'paid'));await f.journal().submit();assert.equal(j.pending(),null);
});
