import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const helperSource = await readFile(new URL("../lib/gate-selection.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const { retainAvailableGateSelection } = module.exports;

test("a loaded gate list never chooses a gate until the operator selects one", () => {
  assert.equal(retainAvailableGateSelection(0, [{ id: 3 }, { id: 8 }]), 0);
});

test("refresh retains the operator's gate only while it remains available", () => {
  const gates = [{ id: 3 }, { id: 8 }];
  assert.equal(retainAvailableGateSelection(8, gates), 8);
  assert.equal(retainAvailableGateSelection(5, gates), 0);
  assert.equal(retainAvailableGateSelection(-1, gates), 0);
});

test("in-app scanner uses the explicit gate selection guard and placeholder", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /setGateId\(\(current\) => retainAvailableGateSelection\(current, liveGates\)\)/);
  assert.match(source, /<option value=\{0\}>\{gates\.length \? "Kies eers ’n hek"/);
  assert.match(source, /direction !== "check" && !gateId/);
});
