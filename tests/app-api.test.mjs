import test from "node:test";
import assert from "node:assert/strict";
import { api } from "../lib/app-api.ts";

test("app API times out while waiting for JSON after headers", async t => {
  let signal;
  t.mock.method(globalThis, "fetch", async (_path, init) => {
    signal = init.signal;
    return new Response(new ReadableStream({ start(c) {
      signal.addEventListener("abort", () => c.error(new DOMException("Aborted", "AbortError")), { once: true });
    } }));
  });
  await assert.rejects(api("/fixture", { method: "POST" }, 15), /onbekend|onderbreek/);
  assert.equal(signal.aborted, true);
});
test("app API caller signal cannot bypass deadline", async t => {
  const caller = new AbortController();
  t.mock.method(globalThis, "fetch", async (_path, init) => new Promise((_, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  await assert.rejects(api("/fixture", { signal: caller.signal }, 15), /onbekend|onderbreek/);
  assert.equal(caller.signal.aborted, false);
});
test("app API preserves request headers, credentials and server error reference", async t => {
  t.mock.method(globalThis, "fetch", async (_path, init) => {
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.headers.get("x-fixture"), "test");
    assert.equal(init.headers.get("content-type"), "application/json");
    return Response.json({ ok: false, reason: "refund_pending", request_id: "fixture" }, { status: 409 });
  });
  await assert.rejects(api("/fixture", { headers: { "x-fixture": "test" } }), /refund_pending Verwysing: fixture/);
});
test("app API preserves multipart upload boundary and successful JSON", async t => {
  const body = new FormData(); body.set("fixture", "yes");
  t.mock.method(globalThis, "fetch", async (_path, init) => {
    assert.equal(init.headers.has("content-type"), false);
    assert.equal(init.body, body);
    return Response.json({ ok: true, value: 1 });
  });
  assert.deepEqual(await api("/fixture", { method: "POST", body }), { ok: true, value: 1 });
});
