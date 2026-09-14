import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../components/photo-moderation.tsx', import.meta.url), 'utf8');
const callback = source.slice(source.indexOf('const review ='), source.indexOf('\n  return <section'));
const js = ts.transpile(callback, { target: ts.ScriptTarget.ES2022 });
async function run({ reason = 'Reviewed', failure = false } = {}) {
  const state = { calls: [], refreshed: 0, loaded: 0 };
  const context = vm.createContext({ Error, pending: { current: false },
    FormData: class { get(key) { return key === 'reason' ? reason : 'approved'; } },
    setError: value => { state.error = value; }, setBusy: value => { state.busy = value; }, setMessage: value => { state.message = value; },
    api: async (path, options) => { state.calls.push({ path, ...options }); if (failure) throw new Error('Conflict: reload'); },
    load: async () => { state.loaded++; }, onChanged: async () => { state.refreshed++; },
  });
  vm.runInContext(`${js}; globalThis.run = review`, context);
  await context.run({ preventDefault() {}, currentTarget: {} }, { id: 3, status: 'pending' });
  return state;
}
test('photo decision carries original state and reason to canonical review route', async () => {
  const r = await run(); assert.equal(r.calls[0].path, '/api/app/staff/photos/3/review');
  assert.deepEqual(JSON.parse(r.calls[0].body), { status: 'approved', expected_status: 'pending', reason: 'Reviewed' });
  assert.equal(r.loaded, 1); assert.equal(r.refreshed, 1);
});
test('empty reason makes no request', async () => {
  const r = await run({ reason: ' ' }); assert.equal(r.calls.length, 0); assert.ok(r.error);
});
test('failed decision preserves list/form and does not claim success', async () => {
  const r = await run({ failure: true }); assert.equal(r.loaded, 0); assert.equal(r.refreshed, 0);
  assert.equal(r.message, ''); assert.equal(r.busy, false); assert.match(r.error, /Conflict/);
});
test('photo moderation visibility follows server capability and navigation stays in app', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /setCanModerate\(result.can_moderate === true\)/);
  assert.match(page, /canModerate && <PhotoModeration/);
  assert.doesNotMatch(source, /window\.location|href=/);
  assert.match(source, /load\(nextAfter\)/);
});

function historyHarness(api) {
  const history = source.slice(source.indexOf('function PhotoReviewHistory'));
  const load = history.slice(history.indexOf('const load ='), history.indexOf('\n  const label ='));
  const state = { reviews: [{ id: 90 }], next: 90, busy: false, error: '' };
  const context = vm.createContext({ Error, api, photoId: 3, inFlight: { current: false },
    setReviews: value => { state.reviews = value; }, setNext: value => { state.next = value; },
    setBusy: value => { state.busy = value; }, setError: value => { state.error = value; },
  });
  vm.runInContext(`${ts.transpile(load, { target: ts.ScriptTarget.ES2022 })}; globalThis.run = load`, context);
  return { state, run: context.run };
}
test('history requests the canonical photo route and follows the server cursor', async () => {
  const calls = [];
  const h = historyHarness(async path => { calls.push(path); return { reviews: [{ id: 70 }], next_before: 70 }; });
  await h.run(); await h.run(h.state.next);
  assert.deepEqual(calls, ['/api/app/staff/photos/3/reviews?before=0', '/api/app/staff/photos/3/reviews?before=70']);
  assert.equal(h.state.reviews[0].id, 70); assert.equal(h.state.busy, false);
});
test('history failure retains visible decisions and cursor and permits a retry', async () => {
  let calls = 0;
  const h = historyHarness(async () => { if (++calls === 1) throw new Error('Unavailable'); return { reviews: [], next_before: null }; });
  await h.run(90);
  assert.equal(h.state.reviews[0].id, 90); assert.equal(h.state.next, 90);
  assert.equal(h.state.error, 'Unavailable'); assert.equal(h.state.busy, false);
  await h.run(90);
  assert.equal(h.state.reviews.length, 0); assert.equal(h.state.next, null); assert.equal(h.state.error, '');
});
test('history suppresses concurrent requests while a page is loading', async () => {
  let finish; let calls = 0;
  const h = historyHarness(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = h.run(); await h.run(90);
  assert.equal(calls, 1); assert.equal(h.state.busy, true);
  finish({ reviews: [], next_before: null }); await first;
  assert.equal(h.state.busy, false);
});
