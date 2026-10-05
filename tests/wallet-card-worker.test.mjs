import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const source = ts.transpileModule(await readFile(new URL('../worker/wallet-card.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace('export function walletCardPage', 'function walletCardPage') + '\nglobalThis.walletCardPage = walletCardPage;';
const context = vm.createContext({ Request, Response, URL });
vm.runInContext(source, context);
const page = context.walletCardPage;
const token = `VSW2.${'a'.repeat(43)}`;

test('public NFC landing page keeps the opaque token only in the customer-side fragment', async () => {
  const response = page(new Request(`https://wallet.villiersdorpskou.co.za/n/${token}`));
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.match(body, new RegExp(`connect-card#${token}`));
  assert.doesNotMatch(body, /api\/card-desk|api\/customer-wallet|balance_cents/);
  assert.match(body, /Laai kaart of koppel beursie/);
  assert.match(body, /net.*aktiveringskode/i);
});

test('configured development customer origin stays isolated from production', async () => {
  const response = page(new Request(`https://wallet.example/n/${token}`), 'https://skou-events-dev.vinetis.workers.dev');
  assert.match(await response.text(), new RegExp(`https://skou-events-dev\.vinetis\.workers\.dev/connect-card#${token}`));
});

test('invalid and write NFC landing requests cannot reveal or mutate a card', async () => {
  const malformed = page(new Request('https://wallet.villiersdorpskou.co.za/n/not-a-token'));
  assert.equal(malformed.status, 404);
  assert.equal(malformed.headers.get('cache-control'), 'no-store');
  const write = page(new Request(`https://wallet.villiersdorpskou.co.za/n/${token}`, { method: 'POST' }));
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET, HEAD');
  assert.equal(await write.text(), '');
});

test('worker routes the dedicated wallet hostname and NFC path before app or backend handling', async () => {
  const workerSource = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8');
  assert.match(workerSource, /url\.pathname\.startsWith\("\/n\/"\) \|\| url\.hostname === "wallet\.villiersdorpskou\.co\.za"/);
  assert.match(workerSource, /return walletCardPage\(request, env\.WALLET_BACKEND_ORIGIN\);/);
  assert.match(workerSource, /if \(isBackendPage \|\| isBackendMedia \|\| isBackendApi\)/);
});
