import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const source = await readFile(new URL("../lib/gate-scan-readiness.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const testModule = { exports: {} };
vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports });
const { canSubmitGateScan } = testModule.exports;

test("gate actions fail closed while offline or before network status is known", () => {
  for (const online of [false, null]) {
    assert.equal(canSubmitGateScan({ online, busy: false, direction: "in", gateId: 1 }), false);
    assert.equal(canSubmitGateScan({ online, busy: false, direction: "check", gateId: 0 }), false);
  }
});

test("gate actions require a selected gate and a free scanner", () => {
  assert.equal(canSubmitGateScan({ online: true, busy: false, direction: "in", gateId: 0 }), false);
  assert.equal(canSubmitGateScan({ online: true, busy: false, direction: "out", gateId: 4 }), true);
  assert.equal(canSubmitGateScan({ online: true, busy: false, direction: "check", gateId: 0 }), true);
  assert.equal(canSubmitGateScan({ online: true, busy: true, direction: "in", gateId: 4 }), false);
});

test("scanner UI states its fail-closed offline policy and reconnects by reloading gates", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Offline — skandering is geblokkeer/);
  assert.ok(/moenie toegang verleen totdat die verbinding terug is/.test(page), "offline state must explain that entry requires a server check");
  assert.match(page, /const handleOnline = \(\) => \{ syncOnline\(\); void loadScanner\(\); \}/);
  assert.match(page, /canSubmitGateScan\(\{ online: online === true/);
});
