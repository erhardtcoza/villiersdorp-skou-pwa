import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appShellRoutes = [
  "app/kaartjies/page.tsx",
  "app/kroeg/page.tsx",
  "app/perde/page.tsx",
  "app/horses/page.tsx",
  "app/pos/page.tsx",
  "app/terreinbesprekings/page.tsx",
  "app/verhurings/page.tsx",
];

test("app shell subroutes explicitly render the hydrated client app", async () => {
  for (const route of appShellRoutes) {
    const source = await readFile(path.join(root, route), "utf8");

    assert.match(source, /^"use client";/);
    assert.match(source, /import HomePage from "\.\.\/page";/);
    assert.match(source, /return <HomePage \/>;/);
    assert.doesNotMatch(source, /^export \{ default \} from "\.\.\/page";/m);
  }
});

test("app module permissions and native review labels stay aligned", async () => {
  const source = await readFile(path.join(root, "app/page.tsx"), "utf8");

  assert.match(source, /key:\s*"pos"[\s\S]*?permissions:\s*\["pos_sales"\]/);
  assert.match(source, /key:\s*"bar-pos"[\s\S]*?permissions:\s*\["bar_pos"\]/);
  assert.match(source, /key:\s*"kitchen-pos"[\s\S]*?permissions:\s*\["kitchen_pos"\]/);
  assert.match(source, /key:\s*"kitchen-pos"[\s\S]*?href:\s*"https:\/\/tickets\.villiersdorpskou\.co\.za\/app\?pos_area=kombuis"/);
  for (const key of ["applications", "horse-processing", "venue-approvals", "rental-approvals"]) {
    const moduleBlock = source.match(new RegExp(`key:\\s*"${key}"[\\s\\S]*?status:\\s*"([^"]+)"`));
    assert.equal(moduleBlock?.[1], "live", `${key} should be marked as an app-native live workflow`);
  }
  assert.match(source, /const staffReviewScopes:[\s\S]*"horse-processing"[\s\S]*"venue-approvals"[\s\S]*"rental-approvals"[\s\S]*applications/);
});

test("bar refund clients surface backend failures and reuse refund keys while busy", async () => {
  const webSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");

  assert.match(webSource, /!response\.ok \|\| data\?\.ok === false/);
  assert.match(webSource, /data\.request_id \? ` Verwysing: \$\{data\.request_id\}` : ""/);
  assert.match(webSource, /const idempotencyKey = refundKeys\[transaction\.id\] \|\| crypto\.randomUUID\(\)/);
  assert.match(webSource, /idempotency_key: idempotencyKey/);

  assert.match(nativeSource, /!response\.ok \|\| data\?\.ok === false/);
  assert.match(nativeSource, /const idempotencyKey = refundKeys\[transaction\.id\]/);
  assert.match(nativeSource, /idempotency_key: idempotencyKey/);
});

test("app health route checks the app backend and ticket catalogue", async () => {
  const workerSource = await readFile(path.join(root, "worker/index.ts"), "utf8");

  assert.match(workerSource, /https:\/\/tickets\.villiersdorpskou\.co\.za\/api\/app\/health/);
  assert.match(workerSource, /https:\/\/tickets\.villiersdorpskou\.co\.za\/api\/public\/health/);
  assert.match(workerSource, /App backend health API is reachable/);
  assert.match(workerSource, /payload\.checks\.ticket_catalogue/);
});
