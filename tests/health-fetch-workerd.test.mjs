import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the edge Request/Response implementation, not only Node fetch.
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const helper = ts.transpileModule(readFileSync(new URL('../worker/health-fetch.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;

test('health helper works in workerd and rejects redirect/stalled-body probes', async () => {
  const mf = new Miniflare({ modules: true, compatibilityDate: '2026-05-15', script: helper + `
    export default { async fetch(request) {
      const path = new URL(request.url).pathname;
      try {
        const result = await fetchHealthJson('https://backend.invalid/health', async probe => {
          if (probe.redirect !== 'manual') throw new Error('incorrect redirect mode');
          if (path === '/redirect') return new Response(null, {status:302});
          if (path === '/slow') return new Response(new ReadableStream({}));
          return Response.json({ok:true});
        }, 25);
        return Response.json(result);
      } catch (e) { return Response.json({error:e.message},{status:503}); }
    }};
  ` });
  try {
    const ready = await mf.dispatchFetch('https://test.invalid/ready');
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).body.ok, true);
    const redirect = await mf.dispatchFetch('https://test.invalid/redirect');
    assert.equal(redirect.status, 503);
    assert.match((await redirect.json()).error, /redirect/);
    const slow = await mf.dispatchFetch('https://test.invalid/slow');
    assert.equal(slow.status, 503);
    assert.match((await slow.json()).error, /timed out/);
  } finally { await mf.dispose(); }
});
