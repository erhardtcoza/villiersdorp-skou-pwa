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
