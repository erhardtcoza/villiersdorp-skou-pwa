import test from "node:test";
import assert from "node:assert/strict";
import { currentTicketEvent } from "../lib/current-ticket-event.ts";

test("ticket selection follows app event ID, not first event or 2026", async () => {
  const calls = [];
  const result = await currentTicketEvent(async path => {
    calls.push(path);
    return path.endsWith("health") ? { event: { id: 12 } } : {
      current: [{ id: 1, slug: "old-show", status: "active" }],
      upcoming: [{ id: 12, slug: "skou-2027", status: "active" }],
    };
  });
  assert.deepEqual(result, { id: 12, slug: "skou-2027" });
  assert.deepEqual(calls, ["/api/app/health", "/api/public/events/catalog"]);
});
test("missing app event fails before requesting any catalogue", async () => {
  let calls = 0;
  await assert.rejects(currentTicketEvent(async () => { calls++; return {}; }));
  assert.equal(calls, 1);
});
test("missing, archived, draft and slugless matches do not fall back to another show", async () => {
  for (const match of [null, { id: 12, slug: "archived", status: "archived" }, { id: 12, slug: "draft", status: "draft" }, { id: 12, status: "active" }]) {
    await assert.rejects(currentTicketEvent(async path => path.endsWith("health") ? { event: { id: 12 } } : {
      current: [{ id: 1, slug: "other", status: "active" }, ...(match ? [match] : [])],
    }));
  }
});
test("catalogue failure propagates without choosing stale data", async () => {
  await assert.rejects(currentTicketEvent(async path => {
    if (path.endsWith("health")) return { event: { id: 12 } };
    throw new Error("offline");
  }), /offline/);
});
