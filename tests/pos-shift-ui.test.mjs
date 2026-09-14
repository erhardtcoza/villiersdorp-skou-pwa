import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {openingFloatCents,shiftOpeningJournal,shiftStopJournal,validateOpenShift,validateStoppedShift} from '../lib/pos-shift.ts';
const source=readFileSync(new URL('../components/pos-shift.tsx',import.meta.url),'utf8');
const saleContext={terminal_code:'TEST',event_id:1,location_id:2};
const shift={...saleContext,id:'s1',status:'open',operator_id:7,opening_float_cents:1000,revision:1};
function harness(api){
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},journal=shiftOpeningJournal(storage,7,saleContext),stopJournal=shiftStopJournal(storage,7,saleContext);
  const state={busy:false,loaded:true,disabled:false,amount:'10',error:'',ready:false,shift:null,pendingStop:null,stopReason:'Finished selling'};
  const sandbox={Error,api,userId:7,context:saleContext,body:{...saleContext,device_instance_id:'device',lease_token:'lease'},journal,stopJournal,openingFloatCents,validateOpenShift,validateStoppedShift,
    generation:{current:1},inFlight:{current:false},onReady:v=>state.ready=v};
  for(const key of ['busy','loaded','disabled','amount','shift','pendingStop','stopReason'])Object.defineProperty(sandbox,key,{get:()=>state[key]});
  for(const key of ['Busy','Error','Loaded','Shift','Pending','Amount','PendingStop','StopReason','StopMessage'])sandbox[`set${key}`]=v=>state[key[0].toLowerCase()+key.slice(1)]=v;
  const ctx=vm.createContext(sandbox);
  const callbacks=source.slice(source.indexOf('const refresh='),source.indexOf('  useEffect('))+source.slice(source.indexOf('const open='),source.indexOf('  return <section'));
  vm.runInContext(`${ts.transpile(callbacks,{target:ts.ScriptTarget.ES2022})};globalThis.actions={refresh,open,stop}`,ctx);
  return {state,journal,stopJournal,generation:sandbox.generation,...ctx.actions};
}
test('current shift request validates context before allowing new sales',async()=>{
  let call;const h=harness(async(path,opts)=>{call={path,body:JSON.parse(opts.body)};return {shift};});
  await h.refresh();assert.equal(call.path,'/api/pos-v1/shifts/current');assert.equal(call.body.lease_token,'lease');assert.equal(h.state.ready,true);
  const wrong=harness(async()=>({shift:{...shift,operator_id:8}}));await wrong.refresh();assert.equal(wrong.state.ready,false);assert.equal(wrong.state.loaded,false);assert.ok(wrong.state.error);
});
test('unknown open result retains the same idempotency key on retry',async()=>{
  const calls=[];const h=harness(async(path,opts)=>{calls.push({path,body:JSON.parse(opts.body)});if(calls.length===1)throw new Error('Timeout');return {shift};});
  await h.open();assert.equal(h.state.ready,false);assert.ok(h.journal.pending());
  await h.open();assert.equal(calls[0].path,'/api/pos-v1/shifts/open');assert.equal(calls[0].body.idempotency_key,calls[1].body.idempotency_key);assert.equal(h.state.ready,true);assert.equal(h.journal.pending(),null);
});
test('duplicate open suppressed; late response from previous context cannot enable sales or clear recovery',async()=>{
  let finish,calls=0;const h=harness(()=>{calls++;return new Promise(resolve=>finish=resolve);});
  const pending=h.open();await h.open();assert.equal(calls,1);
  h.generation.current++;finish({shift});await pending;
  assert.equal(h.state.ready,false);assert.ok(h.journal.pending());
});
test('current request also ignores stale result and restores pending float for a valid empty result',async()=>{
  let finish;const stale=harness(()=>new Promise(resolve=>finish=resolve));const work=stale.refresh();stale.generation.current++;finish({shift});await work;assert.equal(stale.state.ready,false);
  const h=harness(async()=>({shift:null}));h.journal.prepare(1234);await h.refresh();assert.equal(h.state.amount,'12.34');assert.equal(h.state.pending,true);assert.equal(h.state.ready,false);assert.equal(h.state.loaded,true);
});
test('PWA wires the shift panel and gates new checkout without blocking pending-payment recovery',()=>{
  const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.match(page,/<POSShiftPanel/);assert.match(page,/!resume && \(!basketLines.length \|\| !shiftReady\)/);
  assert.match(page,/disabled=\{!lease \|\| Boolean\(busy\)\} onClick=\{\(\) => void completeSale\(true\)\}/);
  assert.doesNotMatch(source,/window\.location|href=/);
});
test('stop requires reason and sends no request for invalid input',async()=>{
  let calls=0;const h=harness(async()=>{calls++;});h.state.shift=shift;h.state.stopReason=' ';
  await h.stop();assert.equal(calls,0);assert.equal(h.stopJournal.pending(),null);assert.ok(h.state.error);assert.equal(h.state.ready,false);
});
test('unknown stop outcome keeps original reason/key and does not claim cash-up',async()=>{
  const calls=[];const h=harness(async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});if(calls.length===1)throw Error('Timeout');return {shift:{...shift,status:'cashup_pending',revision:2}};});
  h.state.shift=shift;await h.stop();assert.ok(h.stopJournal.pending());assert.equal(h.state.ready,false);assert.equal(h.state.stopMessage,undefined);
  h.state.stopReason='Changed locally';await h.stop();assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].path,'/api/pos-v1/shifts/stop');
  assert.equal(h.stopJournal.pending(),null);assert.equal(h.state.shift,null);assert.equal(h.state.ready,false);assert.equal(h.state.loaded,false);assert.match(h.state.stopMessage,/Kontantafsluiting is nog uitstaande/);
});
test('remount with pending stop blocks opening and selling even if server still reports open',async()=>{
  const calls=[];const h=harness(async(path)=>{calls.push(path);return {shift};});h.stopJournal.prepare(shift,'End shift');
  await h.refresh();assert.equal(h.state.stopReason,'End shift');assert.equal(h.state.ready,false);await h.open();assert.equal(calls.length,1);
});
test('late or mismatched stop cannot clear recovery or claim completion',async()=>{
  let finish;const h=harness(()=>new Promise(resolve=>finish=resolve));h.state.shift=shift;const work=h.stop();await h.stop();h.generation.current++;
  finish({shift:{...shift,status:'cashup_pending',revision:2}});await work;assert.ok(h.stopJournal.pending());assert.equal(h.state.stopMessage,undefined);
  const wrong=harness(async()=>({shift:{...shift,id:'other',status:'cashup_pending',revision:2}}));wrong.state.shift=shift;await wrong.stop();assert.ok(wrong.stopJournal.pending());assert.ok(wrong.state.error);assert.equal(wrong.state.stopMessage,undefined);
});
