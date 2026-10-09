import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPOSModuleAvailable, livePOSAreasFromHealth } from "../lib/pos-availability.ts";

test("backend health controls bar POS visibility and unknown configuration fails closed", () => {
  assert.deepEqual([...livePOSAreasFromHealth("Live POS areas: hek.")], ["hek"]);
  assert.deepEqual([...livePOSAreasFromHealth("Live POS areas: hek, kroeg. Planned areas: kombuis.")], ["hek", "kroeg"]);
  assert.deepEqual([...livePOSAreasFromHealth("POS config check failed.")], []);
  assert.equal(isPOSModuleAvailable("bar-pos", "Live POS areas: hek."), false);
  assert.equal(isPOSModuleAvailable("bar-pos", "POS config check failed."), false);
  assert.equal(isPOSModuleAvailable("bar-pos", "Live POS areas: hek, kroeg."), true);
  assert.equal(isPOSModuleAvailable("pos", "Live POS areas: hek."), true);
});

test("POS launcher never restores an unconfigured sales department from static fallbacks", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const ordered = \[\.\.\.\(config \? \[\.\.\.scopedLiveOptions, \.\.\.fallbackAdditions\] : fallbackAdditions\)\]/);
  assert.match(source, /moduleKey === "bar-pos" && scopedLiveOptions\.length === 0[\s\S]*Kroeg-POS is vir hierdie skoujaar afgeskakel/);
});
