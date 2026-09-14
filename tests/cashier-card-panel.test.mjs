import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {cashierCardTopupJournal} from '../lib/cashier-card-topup.ts';
import {validateOpenShift} from '../lib/pos-shift.ts';
const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const start=source.indexOf('  const cardTopup=async');
const callback=source.slice(start,source.indexOf('  return (',start));
function harness(request){
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const cardJournal=cashierCardTopupJournal(storage,1,request);
  const state={busy:'',restored:true,config:{event:{id:1},cashier_card_topup_enabled:true},lease:{terminal_code:'T',device_instance_id:'D',lease_token:'L'},shiftReady:true,wallet:{id:'W'},locationId:1,amount:1000,note:'',recoveryId:''};
  const sandbox={Error,api:request,cardJournal,journal:{pending:()=>null},userId:1,validateOpenShift,inFlight:{current:false},mounted:{current:true}};
  for(const k of Object.keys(state))Object.defineProperty(sandbox,k,{get:()=>state[k]});
  for(const k of ['Busy','Error','Message','CardPending','CardRedirect','Wallet','RecoveryId','Note'])sandbox['set'+k]=v=>state[k[0].toLowerCase()+k.slice(1)]=v;
  const context=vm.createContext(sandbox);vm.runInContext(ts.transpile(callback,{target:ts.ScriptTarget.ES2022})+';globalThis.run=cardTopup',context);
  return {state,cardJournal,run:context.run};
}
test('card controls resume original pending request without current shift or lease',async()=>{
  let reads=0,attempts=0,original;
  const h=harness(async(path,opt)=>{
    if(path.endsWith('/current')){reads++;return {shift:{id:'S',status:'open',operator_id:1,terminal_code:'T',location_id:1,event_id:1,opening_float_cents:0}};}
    const sent=JSON.parse(opt.body);attempts++;
    if(attempts===1){original=sent;throw Error('response lost');}
    assert.equal(sent.idempotency_key,original.idempotency_key);assert.equal(sent.amount_cents,1000);
    return {ok:true,intent:{...sent,operator_id:1,topup_id:'TC'},topup:{id:'TC',wallet_id:'W',subject_type:'staff',subject_id:1,amount_cents:1000,status:'paid',checkout_id:null,yoco_payment_id:'P',paid_at:100}};
  });
  await h.run();assert.ok(h.cardJournal.pending());assert.match(h.state.error,/response lost/);
  h.state.lease=null;h.state.shiftReady=false;h.state.wallet=null;h.state.amount=9000;
  await h.run();assert.equal(reads,1);assert.equal(attempts,2);assert.equal(h.cardJournal.pending(),null);assert.match(h.state.message,/10.00/);
});
test('disabled card capability never prepares an intent or calls provider',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw Error('unexpected');});h.state.config.cashier_card_topup_enabled=false;
  await h.run();assert.equal(calls,0);assert.equal(h.cardJournal.pending(),null);assert.ok(h.state.error);
  assert.doesNotMatch(callback,/window.location|window.open/);
});
