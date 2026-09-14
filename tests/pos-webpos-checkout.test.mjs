import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCheckout,PendingWebPOS,webPOSFrameUrl} from '../lib/pos-checkout.ts';

const draft={location_id:1,terminal_code:'TEST',customer_id:null,customer_name:null,customer_mobile:null,wallet_id:null,items:[{product_id:1,qty:1}],method:'yoco_webpos',provider_reference:null};
const lease={terminal_code:'TEST',lease_token:'not-persisted'};
const order={id:3,order_code:'ORDER-3',total_cents:3000};
const pending={status:'pending',yoco_payment:{id:'test-3',redirect_url:'https://cpw.yoco.com/redirect/payments/test-3'}};
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}

for(const lost of ['none','start','fulfil'])test(`integrated card ${lost} response loss recovers with only one start and no manual pay`,async()=>{
  const store=storage();const calls=[];let failed=false;let paid=false;
  const api=async(path,init)=>{
    calls.push({path,init});
    if(path.endsWith('/orders'))return {order};
    if(path.endsWith('/yoco/start')){
      assert.equal(JSON.parse(store.getItem('skou-pos-pending:test')).webposStarted,true);
      if(lost==='start'&&!failed){failed=true;throw new Error('lost start response');}
      return pending;
    }
    if(path.endsWith('/yoco/status')){assert.equal(init.method,'GET');return paid?{status:'successful'}:pending;}
    if(path.endsWith('/fulfil')){
      assert.equal(paid,true);
      if(lost==='fulfil'&&!failed){failed=true;throw new Error('lost fulfil response');}
      return {order};
    }
    throw new Error('Unexpected endpoint '+path);
  };
  await assert.rejects(createCheckout(store,'test',api).run(draft,lease));
  await assert.rejects(createCheckout(store,'test',api).run(null,lease),PendingWebPOS);
  assert.equal(calls.filter(c=>c.path.endsWith('/fulfil')).length,0);
  paid=true;
  const restored=createCheckout(store,'test',api);
  if(lost==='fulfil')await assert.rejects(restored.run(null,lease),/lost fulfil/);
  assert.equal((await restored.run(null,lease)).order_code,'ORDER-3');
  assert.equal(restored.pending(),null);
  assert.equal(calls.filter(c=>c.path.endsWith('/yoco/start')).length,1);
  assert.equal(calls.filter(c=>c.path.endsWith('/pay')).length,0);
  assert.equal(new Set(calls.filter(c=>c.path.endsWith('/orders')).map(c=>JSON.parse(c.init.body).idempotency_key)).size,1);
});

test('failed and unknown status cannot fulfil or restart payment',async()=>{
  for(const status of ['failed','unknown','SUCCESSFUL',undefined]){
    const store=storage();const calls=[];
    store.setItem('skou-pos-pending:test',JSON.stringify({key:'original',draft,webposStarted:true}));
    const checkout=createCheckout(store,'test',async(path)=>{calls.push(path);return path.endsWith('/orders')?{order}:{status};});
    await assert.rejects(checkout.run(null,lease),PendingWebPOS);
    assert.ok(checkout.pending());
    assert.deepEqual(calls,['/api/pos-v1/orders','/api/pos-v1/orders/3/yoco/status']);
  }
});

test('unauthenticated status retains recovery without fulfilment or another start',async()=>{
  const store=storage();const calls=[];
  store.setItem('skou-pos-pending:test',JSON.stringify({key:'original',draft,webposStarted:true}));
  const checkout=createCheckout(store,'test',async(path)=>{calls.push(path);if(path.endsWith('/orders'))return {order};throw new Error('unauthorized');});
  await assert.rejects(checkout.run(null,lease),/unauthorized/);
  assert.ok(checkout.pending());
  assert.deepEqual(calls,['/api/pos-v1/orders','/api/pos-v1/orders/3/yoco/status']);
});

test('failure to persist start intent prevents provider start',async()=>{
  const store=storage();let writes=0;const calls=[];
  const guarded={...store,setItem(k,v){if(++writes===2)throw new Error('storage unavailable');store.setItem(k,v);}};
  const checkout=createCheckout(guarded,'test',async(path)=>{calls.push(path);return {order};});
  await assert.rejects(checkout.run(draft,lease),/storage unavailable/);
  assert.deepEqual(calls,['/api/pos-v1/orders']);
  assert.equal(checkout.pending().webposStarted,undefined);
});

test('iframe URL must match provider host and payment identity',()=>{
  assert.equal(webPOSFrameUrl(pending.yoco_payment.redirect_url,'test-3'),pending.yoco_payment.redirect_url);
  for(const url of ['javascript:alert(1)','http://cpw.yoco.com/redirect/payments/test-3','https://cpw.yoco.com.evil.invalid/redirect/payments/test-3','https://user@cpw.yoco.com/redirect/payments/test-3','https://cpw.yoco.com/redirect/payments/other','https://cpw.yoco.com/other'])assert.equal(webPOSFrameUrl(url,'test-3'),null);
});

test('refused cancellation unlocks only status recovery for the same started WebPOS payment',async()=>{
  for(const reason of ['cannot_cancel_paid_or_changed_order','yoco_payment_reconciliation_required','cannot_cancel_paid_or_changed_order Verwysing: fixture']){
    const store=storage();const calls=[];
    store.setItem('skou-pos-pending:test',JSON.stringify({key:'original',draft,webposStarted:true}));
    const checkout=createCheckout(store,'test',async(path)=>{
      calls.push(path);
      if(path.endsWith('/cancel'))throw new Error(reason);
      if(path.endsWith('/yoco/status'))return {status:'successful'};
      return {order};
    });
    await assert.rejects(checkout.cancel('Kliënt wil stop',lease),/Kontroleer die bestaande/);
    assert.equal(checkout.pending().cancelReason,undefined);
    assert.equal(checkout.pending().webposStarted,true);
    await checkout.run(null,lease);
    assert.ok(calls.includes('/api/pos-v1/orders/3/yoco/status'));
    assert.ok(!calls.some(path=>path.endsWith('/pay')||path.endsWith('/yoco/start')));
    assert.equal(checkout.pending(),null);
  }
});

test('uncertain WebPOS cancellation remains locked and cannot trigger status/fulfilment',async()=>{
  const store=storage();const calls=[];
  store.setItem('skou-pos-pending:test',JSON.stringify({key:'original',draft,webposStarted:true}));
  const checkout=createCheckout(store,'test',async(path)=>{calls.push(path);if(path.endsWith('/cancel'))throw new Error('network timeout');return {order};});
  await assert.rejects(checkout.cancel('Stop',lease),/network timeout/);
  await assert.rejects(checkout.run(null,lease),/kansellasie/);
  assert.equal(checkout.pending().cancelReason,'Stop');
  assert.deepEqual(calls,['/api/pos-v1/orders','/api/pos-v1/orders/3/cancel']);
});
