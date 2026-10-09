import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../components/gate-camera.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
}).outputText;

function camera({ denied = false, disabled = false, qrData = null } = {}) {
  let cursor = 0, timerId = 0;
  const hooks = [], effects = [], listeners = new Map(), timers = new Map();
  const calls = { getUserMedia: 0, requested: null };
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track] };
  const video = { srcObject: null, readyState: qrData ? 2 : 0, videoWidth: qrData ? 640 : 0, videoHeight: qrData ? 480 : 0, play: async () => {} };
  const document = {
    hidden: false,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
    createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) }) }),
  };
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
  const useState = (initial) => {
    const i = cursor++;
    if (!(i in hooks)) hooks[i] = initial;
    return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }];
  };
  const react = {
    useState,
    useRef(initial) { const [value] = useState({ current: initial }); return value; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn) { cursor++; if (!effects.length) effects.push(fn); },
  };
  const module = { exports: {} };
  const context = {
    module, exports: module.exports,
    require(name) {
      if (name === "react") return react;
      if (name === "jsqr") return { __esModule: true, default: () => qrData ? { data: qrData } : null };
      throw new Error(`unexpected require ${name}`);
    },
    React,
    navigator: { mediaDevices: { getUserMedia: async constraints => {
      calls.getUserMedia++;
      calls.requested = constraints;
      if (denied) throw new DOMException("Permission denied", "NotAllowedError");
      return stream;
    } } },
    document,
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    Error, DOMException,
  };
  vm.runInNewContext(compiled, context);
  const codes = [];
  const component = module.exports.GateCamera;
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.children)];
  }
  const content = node => Array.isArray(node) ? node.map(content).join("") : node && typeof node === "object" ? content(node.children) : String(node ?? "");
  function render() {
    cursor = 0;
    const tree = component({ onCode: code => codes.push(code), disabled });
    const videoNode = nodes(tree).find(node => node.type === "video");
    if (videoNode) videoNode.props.ref.current = video;
    return tree;
  }
  const button = label => nodes(render()).find(node => node.type === "button" && content(node).trim() === label);
  const text = () => content(render());
  const initialTree = render();
  const videoRef = nodes(initialTree).find(node => node.type === "video")?.props.ref;
  const cleanups = effects.map(effect => effect());
  const tick = () => new Promise(resolve => setImmediate(resolve));
  return { button, calls, codes, document, listeners, stream, text, tick, timers, track, video, videoRef, cleanups };
}

test("gate camera requests the rear-facing camera and stopping releases its stream", async () => {
  const c = camera();
  assert.equal(c.videoRef?.current, c.video);
  c.button("Lees QR met kamera").props.onClick();
  for (let i = 0; i < 10 && !c.video.srcObject; i++) await c.tick();
  assert.equal(c.calls.getUserMedia, 1);
  assert.equal(c.calls.requested.video.facingMode.ideal, "environment");
  assert.equal(c.video.srcObject, c.stream);
  c.button("Stop kamera").props.onClick();
  assert.equal(c.track.stopped, true);
  assert.equal(c.video.srcObject, null);
});

test("camera permission denial shows a manual-entry fallback without retaining a stream", async () => {
  const c = camera({ denied: true });
  c.button("Lees QR met kamera").props.onClick();
  for (let i = 0; i < 10 && !/Kameratoegang is geweier/.test(c.text()); i++) await c.tick();
  assert.equal(c.calls.getUserMedia, 1);
  assert.match(c.text(), /Kameratoegang is geweier/);
  assert.equal(c.track.stopped, false);
  assert.match(c.text(), /tik die kode in/);
});

test("camera delivers a decoded QR code and stops the camera", async () => {
  const c = camera({ qrData: "VDS-TICKET-123" });
  c.button("Lees QR met kamera").props.onClick();
  for (let i = 0; i < 10 && c.codes.length === 0; i++) await c.tick();
  assert.deepEqual(c.codes, ["VDS-TICKET-123"]);
  assert.equal(c.track.stopped, true);
  assert.equal(c.video.srcObject, null);
});

test("camera stops and releases tracks when the page becomes hidden or unmounts", async () => {
  const c = camera();
  c.button("Lees QR met kamera").props.onClick();
  for (let i = 0; i < 10 && !c.video.srcObject; i++) await c.tick();
  c.document.hidden = true;
  c.listeners.get("visibilitychange")();
  assert.equal(c.track.stopped, true);
  assert.equal(c.video.srcObject, null);
  assert.equal(c.button("Lees QR met kamera")?.props.disabled, false);
  c.document.hidden = false;
  c.button("Lees QR met kamera").props.onClick();
  for (let i = 0; i < 10 && !c.video.srcObject; i++) await c.tick();
  for (const cleanup of c.cleanups) cleanup?.();
  assert.equal(c.track.stopped, true);
  assert.equal(c.video.srcObject, null);
  assert.equal(c.listeners.has("visibilitychange"), false);
});

test("a disabled gate camera cannot request device access", () => {
  const c = camera({ disabled: true });
  assert.equal(c.button("Lees QR met kamera").props.disabled, true);
  assert.equal(c.calls.getUserMedia, 0);
});
