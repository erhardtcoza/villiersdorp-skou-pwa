import test from 'node:test';
import assert from 'node:assert/strict';
import {cashupJournal,countedCashCents} from '../lib/pos-cashup.ts';
const draft={shift_id:'S',expected_revision:2,expected_fingerprint:'a'.repeat(64),expected_cash_cents:1300,counted_cash_cents:1200,variance_reason:'Missing cash'};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const receipt=b=>({...b,actor_id:1,revision:3,variance_cents:-100,closed_at:123});
test('cash-up lost response reload resends exact intent and verifies receipt',async()=>{
  const store=storage(),requests=[];
  const api=async(path,init)=>{const b=JSON.parse(init.body);requests.push(b);assert.equal(path,'/api/app/pos/cashups/S/close');if(requests.length===1)throw Error('lost');return {receipt:receipt(b)};};
  await assert.rejects(cashupJournal(store,1,api).run(draft),/lost/);
  const restored=cashupJournal(store,1,api);await assert.rejects(restored.run(draft),/Hervat/);
  await restored.run(null);assert.deepEqual(requests[0],requests[1]);assert.equal(restored.pending(),null);
});
test('cash-up receipt mismatches never clear recovery',async()=>{
  for(const patch of [{actor_id:2},{shift_id:'other'},{revision:4},{idempotency_key:'wrong'},{expected_cash_cents:1400},{counted_cash_cents:1300},{variance_cents:0},{variance_reason:'changed'},{closed_at:0}]){
    const store=storage();const journal=cashupJournal(store,1,async(_p,init)=>({receipt:{...receipt(JSON.parse(init.body)),...patch}}));
    await assert.rejects(journal.run(draft),/Ontvangsbewys/);assert.ok(journal.pending());
  }
});
test('cash-up local storage failure and invalid variance prevent financial dispatch',async()=>{
  let calls=0;const api=async()=>{calls++;return {};};
  await assert.rejects(cashupJournal({getItem:()=>null,setItem:()=>{throw Error('blocked storage')},removeItem:()=>{}},1,api).run(draft),/blocked storage/);
  await assert.rejects(cashupJournal(storage(),1,api).run({...draft,variance_reason:''}),/ongeldig/);
  assert.equal(calls,0);
});
test('cash-up concurrent clicks blocked and replaced intent retained',async()=>{
  const store=storage();let finish;
  const journal=cashupJournal(store,1,async(_p,init)=>new Promise(resolve=>finish=()=>resolve({receipt:receipt(JSON.parse(init.body))})));
  const active=journal.run(draft);await assert.rejects(journal.run(null),/reeds/);
  const replacement={...draft,shift_id:'other',idempotency_key:'replacement'};store.setItem('skou-cashup-pending:staff:1',JSON.stringify(replacement));
  finish();await assert.rejects(active,/verander/);assert.deepEqual(journal.pending(),replacement);
});
test('cash count accepts cents precisely and rejects coercion',()=>{
  assert.equal(countedCashCents('12,05'),1205);assert.equal(countedCashCents('0'),0);
  for(const text of ['','-1','1e3','1.001','Infinity','R 20','9007199254740992'])assert.throws(()=>countedCashCents(text));
});
test('cash-up cancellation preserves reason across lost response and blocks close retry',async()=>{
  const store=storage(),calls=[];let lose=true;
  const api=async(path,init)=>{
    const body=JSON.parse(init.body);calls.push({path,body});
    if(path.endsWith('/close'))throw Error('close response lost');
    if(lose){lose=false;throw Error('cancel response lost');}
    return {status:'cancelled',cancellation:{...body,actor_id:1,created_at:123}};
  };
  const first=cashupJournal(store,1,api);await assert.rejects(first.run(draft));
  await assert.rejects(first.cancel('Recount cash'),/cancel response lost/);
  const restored=cashupJournal(store,1,api);assert.equal(restored.pending().cancel_reason,'Recount cash');
  await assert.rejects(restored.run(null),/kansellasie/);
  await assert.rejects(restored.cancel('Different reason'),/oorspronklike/);
  const result=await restored.cancel(null);assert.equal(result.status,'cancelled');assert.equal(restored.pending(),null);
  assert.deepEqual(calls[1],calls[2]);
});
test('cancellation cannot clear an ambiguous or mismatched confirmation',async()=>{
  for(const patch of [{status:'pending'},{cancellation:{actor_id:2}},{cancellation:null}]){
    const store=storage();const api=async(path,init)=>{
      if(path.endsWith('/close'))throw Error('lost');
      return {status:'cancelled',cancellation:{...JSON.parse(init.body),actor_id:1,created_at:123},...patch};
    };
    const journal=cashupJournal(store,1,api);await assert.rejects(journal.run(draft));
    await assert.rejects(journal.cancel('Recount cash'),/Kansellasie/);assert.equal(journal.pending().cancel_reason,'Recount cash');
  }
});
test('cancel response for an already closed shift verifies and returns original receipt',async()=>{
  const store=storage();const journal=cashupJournal(store,1,async(path,init)=>{
    if(path.endsWith('/close'))throw Error('lost');return {status:'completed',receipt:receipt(JSON.parse(init.body))};
  });
  await assert.rejects(journal.run(draft));const result=await journal.cancel('Correct count');
  assert.equal(result.status,'completed');assert.equal(result.receipt.counted_cash_cents,1200);assert.equal(journal.pending(),null);
});
