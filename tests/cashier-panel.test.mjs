import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {cashierTopupJournal} from '../lib/cashier-topup.ts';
import {validateOpenShift} from '../lib/pos-shift.ts';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const panel=page.slice(page.indexOf('function PosWalletTopupPanel'),page.indexOf('function FamilyFlow'));
function harness(request){
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const journal=cashierTopupJournal(storage,1,request);
  const state={busy:'',pending:null,wallet:{id:'W'},shiftReady:true,lease:{terminal_code:'T',device_instance_id:'D',lease_token:'L'},config:{event:{id:1}},locationId:1,method:'cash',amount:1000,note:''};
  const sandbox={Error,api:request,journal,cardJournal:{pending:()=>null},userId:1,validateOpenShift,inFlight:{current:false},mounted:{current:true}};
  for(const key of Object.keys(state))Object.defineProperty(sandbox,key,{get:()=>state[key]});
  for(const key of ['Busy','Error','Message','Pending','Wallet','Note'])sandbox['set'+key]=v=>state[key[0].toLowerCase()+key.slice(1)]=v;
  const callback=panel.slice(panel.indexOf('  const topup = async'),panel.indexOf('  return (',panel.indexOf('  const topup = async')));
  const context=vm.createContext(sandbox);vm.runInContext(ts.transpile(callback,{target:ts.ScriptTarget.ES2022})+';globalThis.run=topup',context);
  return {state,journal,run:context.run};
}
test('cashier panel resumes exact pending credit even after shift stop without preparing a new intent',async()=>{
  let attempts=0,currentReads=0,first;
  const h=harness(async(path,opt)=>{
    if(path.endsWith('/current')){currentReads++;return {shift:{id:'S',status:'open',operator_id:1,terminal_code:'T',location_id:1,event_id:1,opening_float_cents:0}};}
    const sent=JSON.parse(opt.body);attempts++;
    if(attempts===1){first=sent;throw Error('lost response');}
    assert.equal(sent.idempotency_key,first.idempotency_key);
    return {ok:true,topup:{...sent,id:'receipt',operator_id:1,status:'completed'}};
  });
  await h.run();assert.ok(h.journal.pending());assert.ok(h.state.pending);assert.match(h.state.error,/lost response/);
  h.state.shiftReady=false;h.state.wallet=null;h.state.amount=9000;
  await h.run();assert.equal(currentReads,1);assert.equal(attempts,2);assert.equal(h.journal.pending(),null);assert.equal(h.state.pending,null);assert.match(h.state.message,/10.00/);
});
test('cashier panel refuses new receipt without an open shift or for unconfirmed card',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw Error('unexpected')});
  h.state.shiftReady=false;await h.run();assert.equal(calls,0);
  h.state.shiftReady=true;h.state.method='card';await h.run();assert.equal(calls,0);assert.equal(h.journal.pending(),null);
  assert.match(panel,/POSShiftPanel/);assert.match(panel,/journal.submit\(lease\)/);assert.doesNotMatch(panel,/window.location|result.wallet\);\s*setNote/);
});
