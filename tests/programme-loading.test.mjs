import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const panel = source.slice(source.indexOf("function ProgrammePanel("), source.indexOf("function ShowMapPanel("));
const callback = panel.match(/useCallback\((async \(\) => \{[\s\S]*?)\n  \}, \[horseOnly\]\)/)?.[1];
assert.ok(callback, "extract actual programme loader");

async function load(horseOnly, eventId = 4, failure = false) {
  const state = { calls: [] };
  const context = vm.createContext({
    horseOnly,
    setLoading: v => state.loading = v,
    setError: v => state.error = v,
    setEventName: v => state.event = v,
    setProgramme: v => state.artists = v,
    setHorses: v => state.horses = v,
    api: async path => {
      state.calls.push(path);
      if (path === "/api/app/health") return { event: { id: eventId, name: "Test skou" } };
      if (failure) throw new Error("Programme unavailable");
      return { items: [{ id: path.includes("horse-show") ? 10 : 20 }] };
    },
  });
  await vm.runInContext(`(${callback}\n})`, context)();
  return state;
}

test("horse menu dispatches to in-app programme panel", () => {
  assert.match(source, /moduleKey === "programme" \|\| moduleKey === "horse-programme" \? \(\s*<ProgrammePanel[^>]+horseOnly=\{moduleKey === "horse-programme"\}/);
});
test("calendar reuses the canonical programme panel instead of fixed dates", () => {
  const calendar = source.slice(source.indexOf('{tab === "calendar" && ('), source.indexOf('{tab === "profile" && ('));
  assert.match(calendar, /<ProgrammePanel ModuleIcon=\{CalendarDays\}/);
  assert.doesNotMatch(calendar, /2026|Skoudag [12]|href=/);
});
test("horse-only programme uses current event without depending on artist API", async () => {
  const result = await load(true);
  assert.deepEqual(result.calls, ["/api/app/health", "/api/public/horse-show?event_id=4"]);
  assert.equal(result.artists.length, 0);
  assert.equal(result.horses[0].id, 10);
  assert.equal(result.loading, false);
});
test("combined programme retains both canonical feeds", async () => {
  const result = await load(false);
  assert.equal(result.artists[0].id, 20);
  assert.equal(result.horses[0].id, 10);
});
test("missing event never makes an unscoped programme request", async () => {
  const result = await load(true, 0);
  assert.deepEqual(result.calls, ["/api/app/health"]);
  assert.ok(result.error);
  assert.equal(result.loading, false);
});
test("backend failure ends loading and exposes an error", async () => {
  const result = await load(true, 4, true);
  assert.ok(result.error);
  assert.equal(result.loading, false);
  assert.equal(result.artists.length, 0);
  assert.equal(result.horses.length, 0);
  assert.match(panel, /disabled=\{loading\} onClick=\{\(\) => void load\(\)\}/);
});
test("calendar accepts a later event rather than assuming the 2026 show", async () => {
  const result = await load(false, 99);
  assert.deepEqual(result.calls, ["/api/app/health", "/api/public/programme?event_id=99", "/api/public/horse-show?event_id=99"]);
});
