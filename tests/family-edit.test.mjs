import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const panel = source.slice(source.indexOf('function FamilyFlow()'), source.indexOf('function PhotosFlow()'));
const submit = panel.slice(panel.indexOf('const submit ='), panel.indexOf('\n  return ('));
const js = ts.transpile(submit, { target: ts.ScriptTarget.ES2022 });
function fixture(editing, apiImpl = async () => ({ ok: true }), removal = false, confirmed = true) {
  const state = { calls: [], busy: false, error: '', closed: false, loaded: 0 };
  const context = vm.createContext({
    editing, Error, saving: { current: false }, confirmRemoval: confirmed,
    setConfirmRemoval: value => { state.confirmation = value; },
    FormData: class { get(key) { return ({ name: 'Updated name', relationship: 'Kind', email: '', phone: '', date_of_birth: '' })[key]; } },
    setBusy: value => { state.busy = value; },
    setError: value => { state.error = value; },
    setAdding: () => {},
    setEditing: value => { state.closed = value === null; },
    load: async () => { state.loaded++; },
    api: async (url, options) => { state.calls.push({ url, ...options }); return apiImpl(); },
  });
  vm.runInContext(`${js}; globalThis.run = ${removal ? 'removeMember' : 'submit'};`, context);
  return { state, run: () => context.run({ preventDefault() {}, currentTarget: {} }) };
}
test('editing updates the selected canonical family ID without creating a duplicate', async () => {
  const f = fixture({ id: 17 }); await f.run();
  assert.equal(f.state.calls[0].url, '/api/app/family/17');
  assert.equal(f.state.calls[0].method, 'PATCH');
  assert.equal(JSON.parse(f.state.calls[0].body).name, 'Updated name');
  assert.equal(f.state.closed, true); assert.equal(f.state.loaded, 1);
});
test('new family member retains POST workflow', async () => {
  const f = fixture(null); await f.run();
  assert.equal(f.state.calls[0].url, '/api/app/family');
  assert.equal(f.state.calls[0].method, 'POST');
});
test('rejected edit preserves form and exposes error for retry', async () => {
  const f = fixture({ id: 17 }, async () => { throw new Error('Not permitted'); }); await f.run();
  assert.equal(f.state.closed, false); assert.equal(f.state.loaded, 0);
  assert.equal(f.state.error, 'Not permitted'); assert.equal(f.state.busy, false);
});
test('rapid repeated submission makes only one pending request', async () => {
  let release;
  const f = fixture({ id: 17 }, () => new Promise(resolve => { release = resolve; }));
  const first = f.run(); await f.run();
  assert.equal(f.state.calls.length, 1);
  release({ ok: true }); await first;
});
test('edit form prefills all supported fields and stays inside app', () => {
  for (const field of ['name', 'relationship', 'date_of_birth', 'email', 'phone']) {
    assert.ok(panel.includes(`defaultValue={editing?.${field} || ""}`));
  }
  assert.doesNotMatch(panel, /window\.location|href=/);
});
test('removal requires explicit confirmation and selected profile', async () => {
  for (const [member, confirmed] of [[{ id: 17 }, false], [null, true]]) {
    const f = fixture(member, undefined, true, confirmed); await f.run();
    assert.equal(f.state.calls.length, 0);
  }
});
test('confirmed removal calls canonical DELETE and refreshes list', async () => {
  const f = fixture({ id: 17 }, undefined, true); await f.run();
  assert.equal(f.state.calls[0].url, '/api/app/family/17');
  assert.equal(f.state.calls[0].method, 'DELETE');
  assert.equal(f.state.confirmation, false); assert.equal(f.state.loaded, 1);
});
test('assigned-ticket refusal keeps removal dialog and profile available', async () => {
  const f = fixture({ id: 17 }, async () => { throw new Error('Move ticket first'); }, true); await f.run();
  assert.equal(f.state.closed, false); assert.equal(f.state.loaded, 0);
  assert.equal(f.state.error, 'Move ticket first');
});
