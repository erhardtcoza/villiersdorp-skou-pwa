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

  assert.match(source, /key:\s*"kitchen-pos"[\s\S]*?permissions:\s*\["kitchen_pos",\s*"pos_sales"\]/);
  for (const key of ["applications", "horse-processing", "venue-approvals", "rental-approvals"]) {
    const moduleBlock = source.match(new RegExp(`key:\\s*"${key}"[\\s\\S]*?status:\\s*"([^"]+)"`));
    assert.equal(moduleBlock?.[1], "live", `${key} should be marked as an app-native live workflow`);
  }
  assert.match(source, /const staffReviewScopes:[\s\S]*"horse-processing"[\s\S]*"venue-approvals"[\s\S]*"rental-approvals"[\s\S]*applications/);
});
