import test from "node:test";
import assert from "node:assert/strict";
import { createRefundJournal, refundOutcome } from "../lib/refund-journal.ts";
const draft={amount_cents:3000,method:"wallet",reason:"Verkeerde item"};
const receipt=(init,status='completed')=>({refund:{...JSON.parse(init.body),processing_shift_id:JSON.parse(init.body).processing_shift_id??null,pos_order_id:42,actor_subject_type:'staff',actor_subject_id:'1',status}});
test("refund processing shift survives reload and cannot silently change on retry",async()=>{
  const store=storage(),calls=[];
  const api=async(_path,init)=>{calls.push(JSON.parse(init.body));throw Error('response lost');};
  await assert.rejects(createRefundJournal(store,'staff:1',api).run(42,{...draft,processing_shift_id:'original-shift'}));
  const resumed=createRefundJournal(store,'staff:1',api);
  await assert.rejects(resumed.run(42,{...draft,processing_shift_id:'new-shift'}),/Hervat/);
  await assert.rejects(resumed.run(42,null),/response lost/);
  assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].processing_shift_id,'original-shift');
  for(const processing_shift_id of ['',23,'x'.repeat(129)]){
    await assert.rejects(createRefundJournal(storage(),'staff:1',api).run(42,{...draft,processing_shift_id}),/ongeldig/);
  }
});
test("late completed response cannot erase another pending refund",async()=>{
  const store=storage();let finish;
  const journal=createRefundJournal(store,'staff:1',async()=>new Promise(resolve=>finish=resolve));
  const active=journal.run(42,draft);
  const replacement={orderId:43,key:'replacement',draft};
  store.setItem('skou-refund-pending:staff:1',JSON.stringify(replacement));
  finish({refund:{status:'completed'}});
  await assert.rejects(active,/verander/);
  assert.deepEqual(journal.pending(),replacement);
});
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test("lost refund response resumes with identical key and payload after reload",async()=>{
  const store=storage(),calls=[];
  const api=async(_path,init)=>{calls.push(JSON.parse(init.body));if(calls.length===1)throw new Error("lost response");return receipt(init);};
  await assert.rejects(createRefundJournal(store,"staff:1",api).run(42,draft));
  const reloaded=createRefundJournal(store,"staff:1",api);
  assert.equal(reloaded.pending().orderId,42);
  await reloaded.run(42,null);
  assert.deepEqual(calls[0],calls[1]);
  assert.equal(reloaded.pending(),null);
});
test("pending provider outcome retains original refund and rejects changed details",async()=>{
  const store=storage();let calls=0;
  const journal=createRefundJournal(store,"staff:1",async()=>{calls++;return {refund:{status:"pending_provider"}};});
  await journal.run(42,draft);
  assert.ok(journal.pending());
  await assert.rejects(journal.run(42,{...draft,amount_cents:1000}),/Hervat/);
  await assert.rejects(journal.run(43,draft),/Hervat/);
  assert.equal(calls,1);
  assert.equal(createRefundJournal(store,"staff:2",async()=>({})).pending(),null);
});
test("failed storage prevents any refund request",async()=>{
  let calls=0;
  const journal=createRefundJournal({getItem:()=>null,setItem:()=>{throw new Error("storage blocked");},removeItem:()=>{}},"staff:1",async()=>{calls++;return {};});
  await assert.rejects(journal.run(42,draft),/storage blocked/);
  assert.equal(calls,0);
});
test("rapid double submission sends only one request",async()=>{
  let release,calls=0;
  const journal=createRefundJournal(storage(),"staff:1",async(_path,init)=>{calls++;await new Promise(r=>release=r);return receipt(init);});
  const first=journal.run(42,draft);
  await assert.rejects(journal.run(42,draft),/reeds/);
  release();await first;
  assert.equal(calls,1);
});

test("confirmed failed refund clears recovery without automatic retry; next explicit request gets a new key",async()=>{
  const store=storage(),calls=[];
  const journal=createRefundJournal(store,"staff:1",async(_path,init)=>{calls.push(JSON.parse(init.body));return receipt(init,'failed_provider');});
  const result=await journal.run(42,draft);
  assert.equal(result.refund.status,"failed_provider");
  assert.equal(journal.pending(),null);
  assert.equal(calls.length,1);
  assert.equal(refundOutcome(result.refund.status).failed,true);
  assert.match(refundOutcome(result.refund.status).message,/misluk/);
  await journal.run(42,draft);
  assert.equal(calls.length,2);
  assert.notEqual(calls[0].idempotency_key,calls[1].idempotency_key);
});

test("ambiguous or unrecognized failures retain the saved refund",async()=>{
  for(const status of [undefined,"failed","provider_error","pending_provider","approved","unknown"]){
    const journal=createRefundJournal(storage(),"staff:1",async()=>({refund:{status}}));
    await journal.run(42,draft);
    assert.ok(journal.pending());
    assert.equal(refundOutcome(status).terminal,false);
    assert.match(refundOutcome(status).message,/oorspronklike versoek bly gestoor/);
  }
});

test('terminal receipt must match every immutable request field before recovery is cleared',async()=>{
  for(const status of ['completed','failed_provider']){
    for(const patch of [{pos_order_id:43},{idempotency_key:'other'},{actor_subject_type:'visitor'},{actor_subject_id:'2'},{amount_cents:1},{method:'card'},{reason:'Different reason'},{processing_shift_id:'other'},{processing_shift_id:undefined}]){
      const store=storage();let wrong=true;
      const journal=createRefundJournal(store,'staff:1',async(_path,init)=>{
        const result=receipt(init,status);if(wrong)Object.assign(result.refund,patch);return result;
      });
      await assert.rejects(journal.run(42,{...draft,processing_shift_id:'OWN'}),/ontvangsbewys/);
      const saved=journal.pending();assert.ok(saved);
      wrong=false;await journal.run(42,null);assert.equal(journal.pending(),null);
    }
  }
});
test('old status-only terminal response is ambiguous and keeps the original request',async()=>{
  const journal=createRefundJournal(storage(),'staff:1',async()=>({refund:{status:'completed'}}));
  await assert.rejects(journal.run(42,draft),/ontvangsbewys/);assert.ok(journal.pending());
});
