import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckout } from '../lib/pos-checkout.ts';

const draft = { event_id: 2, location_id: 1, terminal_code: 'TEST', customer_id: null, customer_name: null, customer_mobile: null, wallet_id: 'test-wallet', items: [{ product_id: 1, qty: 1 }], method: 'event_balance', provider_reference: null };
const lease = { terminal_code: 'TEST', lease_token: 'never-store-this' };
function storage() { const m = new Map(); return { getItem: k => m.get(k) || null, setItem: (k,v) => m.set(k,v), removeItem: k => m.delete(k) }; }

test('new manual card sale requires reference and explicit cashier acknowledgement before requests or journal writes', async () => {
  for (const fields of [{}, { manual_card_confirmed: true }, { provider_reference: 'receipt-1' }, { manual_card_confirmed: true, provider_reference: '  ' }]) {
    const store = storage(); let calls = 0;
    const checkout = createCheckout(store, 'card', async () => { calls++; });
    await assert.rejects(checkout.run({ ...draft, method: 'yoco_manual', ...fields }, lease), /Yoco-toestel/);
    assert.equal(calls, 0); assert.equal(checkout.pending(), null);
  }
});

test('confirmed manual card retry retains reference and keys without claiming provider verification', async () => {
  const store = storage(); const calls = []; let fail = true;
  const api = async (path, init) => {
    const body = JSON.parse(init.body); calls.push({ path, body });
    if (path.endsWith('/pay') && fail) { fail = false; throw new Error('lost payment response'); }
    return { order: { id: 2, order_code: 'CARD-2' } };
  };
  await assert.rejects(createCheckout(store, 'card', api).run({ ...draft, method: 'yoco_manual', provider_reference: 'receipt-2', manual_card_confirmed: true }, lease));
  await createCheckout(store, 'card', api).run(null, lease);
  const payments = calls.filter(call => call.path.endsWith('/pay'));
  assert.equal(payments.length, 2);
  assert.deepEqual(payments[0].body, payments[1].body);
  assert.equal(payments[0].body.provider_reference, 'receipt-2');
  assert.ok(calls.every(call => !('manual_card_confirmed' in call.body)));
  assert.equal(createCheckout(store, 'card', api).pending(), null);
});

test('legacy pending manual card retains recovery without asking the cashier to charge again', async () => {
  const store = storage(); const keys = [];
  store.setItem('skou-pos-pending:legacy', JSON.stringify({ key: 'pre-upgrade', draft: { ...draft, method: 'yoco_manual' } }));
  await createCheckout(store, 'legacy', async (path, init) => {
    if (path.endsWith('/pay')) keys.push(JSON.parse(init.body).idempotency_key);
    return { order: { id: 3, order_code: 'LEGACY-3' } };
  }).run(null, lease);
  assert.deepEqual(keys, ['TEST:app-pay:3:pre-upgrade']);
});

for (const stage of ['orders', 'pay', 'fulfil']) {
  test(`lost ${stage} response resumes after reload with one order and one debit`, async () => {
    const store = storage(); const orders = new Map(); const payments = new Map(); let failed = false; let fulfilments = 0;
    const api = async (path, init) => {
      const b = JSON.parse(init.body);
      const step = path.split('/').at(-1);
      if (step === 'orders' && !orders.has(b.idempotency_key)) orders.set(b.idempotency_key, { id: 1, order_code: 'TEST-1' });
      if (step === 'pay') payments.set(b.idempotency_key, 3000);
      if (step === 'fulfil') fulfilments++;
      if (step === stage && !failed) { failed = true; throw new Error('lost response'); }
      return { order: [...orders.values()][0] };
    };
    await assert.rejects(createCheckout(store, 'user-1:bar', api).run(draft, lease));
    assert.ok(store.getItem('skou-pos-pending:user-1:bar'));
    assert.ok(!store.getItem('skou-pos-pending:user-1:bar').includes('never-store-this'));
    const restored = createCheckout(store, 'user-1:bar', api);
    assert.equal((await restored.run(null, lease)).order_code, 'TEST-1');
    assert.equal(orders.size, 1); assert.equal(payments.size, 1); assert.ok(fulfilments >= 1);
    assert.equal(restored.pending(), null);
  });
}
test('failed storage never starts a financial request', async () => {
  let calls = 0;
  const store = { getItem: () => null, setItem: () => { throw new Error('storage disabled'); }, removeItem() {} };
  await assert.rejects(createCheckout(store, 'x', async () => { calls++; }).run(draft, lease));
  assert.equal(calls, 0);
});
test('pending sale prevents changed basket and other terminal; owner scopes are separate', async () => {
  const store = storage(); let calls = 0;
  const api = async () => { calls++; throw new Error('offline'); };
  const checkout = createCheckout(store, 'owner-a', api);
  await assert.rejects(checkout.run(draft, lease));
  await assert.rejects(checkout.run({ ...draft, items: [] }, lease), /Hervat eers/);
  await assert.rejects(checkout.run(null, { terminal_code: 'OTHER' }), /oorspronklike terminal/);
  assert.equal(calls, 1);
  assert.equal(createCheckout(store, 'owner-b', api).pending(), null);
});
test('rapid double click sends only one initial request', async () => {
  let release; let calls = 0;
  const checkout = createCheckout(storage(), 'x', async () => { calls++; await new Promise(r => { release = r; }); throw new Error('offline'); });
  const first = checkout.run(draft, lease);
  await assert.rejects(checkout.run(draft, lease), /reeds verwerk/);
  release(); await assert.rejects(first); assert.equal(calls, 1);
});

test('lost cancellation response retains intent and retries without paying', async () => {
  const store=storage(); let fail=true; const calls=[];
  const api=async(path,init)=>{
    calls.push({path,body:JSON.parse(init.body)});
    if(path.endsWith('/cancel') && fail){fail=false;throw new Error('lost response');}
    return {order:{id:9,order_code:'TEST-9'}};
  };
  store.setItem('skou-pos-pending:x',JSON.stringify({key:'same-order',draft}));
  const first=createCheckout(store,'x',api);
  await assert.rejects(first.cancel('',lease),/Verskaf/); assert.equal(calls.length,0);
  await assert.rejects(first.cancel('Customer declined',lease),/lost response/);
  const restored=createCheckout(store,'x',api);
  await assert.rejects(restored.run(null,lease),/kansellasie/);
  await restored.cancel('Different reason',lease);
  assert.equal(restored.pending(),null);
  assert.ok(calls.every(c=>!c.path.endsWith('/pay')));
  assert.deepEqual(calls.filter(c=>c.path.endsWith('/cancel')).map(c=>c.body.reason),['Customer declined','Customer declined']);
  assert.equal(new Set(calls.filter(c=>c.path.endsWith('/orders')).map(c=>c.body.idempotency_key)).size,1);
});
test('paid cancellation rejection retains order and allows fulfilment recovery',async()=>{
  const store=storage();store.setItem('skou-pos-pending:x',JSON.stringify({key:'original',draft}));
  const checkout=createCheckout(store,'x',async(path)=>{
    if(path.endsWith('/cancel'))throw new Error('cannot_cancel_paid_order');
    return {order:{id:9,order_code:'TEST-9'}};
  });
  await assert.rejects(checkout.cancel('Cancel',lease),/reeds betaal/);
  assert.equal(checkout.pending().key,'original');assert.equal(checkout.pending().cancelReason,undefined);
  await checkout.run(null,lease);assert.equal(checkout.pending(),null);
});
