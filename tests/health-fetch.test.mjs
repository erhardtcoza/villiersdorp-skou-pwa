import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchHealthJson } from '../worker/health-fetch.ts';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const workerSource = ts.transpileModule(readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(/^import .*;$/gm, '').replace('export default worker;', 'globalThis.testWorker = worker;');

async function healthRoute(catalogueStatus) {
  const calls = [];
  const context = vm.createContext({ Request, Response, URL, Headers, fetchHealthJson,
    resolveBackendOrigin: () => 'https://dev.invalid',
    fetch: async request => {
      calls.push(new URL(request.url).pathname);
      return new Response(JSON.stringify(request.url.includes('/public/')
        ? { ok: catalogueStatus === 200, ticket_types: 7 }
        : { ok: true, event: { id: 1 }, checks: {} }), { status: request.url.includes('/public/') ? catalogueStatus : 200 });
    },
  });
  vm.runInContext(workerSource, context);
  const response = await context.testWorker.fetch(new Request('https://app.invalid/api/app/health'), {}, {});
  assert.deepEqual(calls.sort(), ['/api/app/health', '/api/public/health']);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  return { status: response.status, body: await response.json() };
}

test('actual Worker health branch accepts successful checks', async () => {
  const result = await healthRoute(200);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test('actual Worker health branch rejects failed HTTP even with ticket counts', async () => {
  const result = await healthRoute(503);
  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
});

test('health deadline rejects a transport that never returns headers', async () => {
  let signal;
  await assert.rejects(fetchHealthJson('https://test.invalid/health', request => {
    signal = request.signal;
    return new Promise(() => {});
  }, 20), /timed out/);
  assert.equal(signal.aborted, true);
});

test('health deadline includes stalled body and cancels it', async () => {
  let cancelled = false;
  await assert.rejects(fetchHealthJson('https://test.invalid/health', async () =>
    new Response(new ReadableStream({ cancel() { cancelled = true; } })), 20), /timed out/);
  assert.equal(cancelled, true);
});

test('health response byte limit cancels oversized stream', async () => {
  let cancelled = false;
  await assert.rejects(fetchHealthJson('https://test.invalid/health', async () =>
    new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(11)); }, cancel() { cancelled = true; } })), 100, 10), /size limit/);
  assert.equal(cancelled, true);
});

test('health JSON preserves upstream failure status and split UTF-8 data', async () => {
  const bytes = new TextEncoder().encode('{"detail":"Skougrónde"}');
  const result = await fetchHealthJson('https://test.invalid/health', async request => {
    assert.equal(request.method, 'GET');
    assert.equal(request.redirect, 'manual');
    return new Response(new ReadableStream({ start(c) {
      for (const byte of bytes) c.enqueue(new Uint8Array([byte]));
      c.close();
    } }), { status: 503 });
  });
  assert.deepEqual(result, { ok: false, status: 503, body: { detail: 'Skougrónde' } });
});

test('invalid JSON is rejected rather than treated as healthy', async () => {
  await assert.rejects(fetchHealthJson('https://test.invalid/health', async () => new Response('<html>Error</html>')));
});

test('health rejects redirects without following a different destination', async () => {
  await assert.rejects(fetchHealthJson('https://test.invalid/health', async () =>
    new Response(null, { status: 302, headers: { location: 'https://other.invalid/' } })), /redirect/);
});
