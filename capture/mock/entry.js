// Runs BEFORE Pebble's own /src/main.ts (serve.mjs swaps the index.html entry to this file).
// It installs Tauri v2's official IPC mocks (@tauri-apps/api/mocks: mockWindows + mockIPC) and answers every
// `invoke("rpc", {method, params})` from the demo fixtures in ./fixtures.js, so App.vue / Pet.vue render real states.
//
// URL parameters:  ?scene=<name>  &theme=light|dark  [&pet]  [&drawer=320..520]  (`pet` is Pebble's own companion switch)
// Debug/automation handle: window.__pebble = { world, calls, unhandled, emit(event, data) }
import "./vclock.js"; // first: with ?vclock it replaces the page clock before any Pebble module reads it
import { mockIPC, mockWindows } from "pebble-tauri-mocks";
import { buildWorld } from "./fixtures.js";

const params = new URLSearchParams(location.search);
const surface = params.has("pet") ? "pet" : "main";
const scene = params.get("scene") || (surface === "pet" ? "pet-chat" : "approval");
const theme = params.get("theme") === "dark" ? "dark" : "light";

// @tauri-apps/api 2.x isTauri() reads globalThis.isTauri; mockIPC does not set it, and bridge.ts evaluates
// `native = isTauri()` once at import time, so it must be true before /src/main.ts loads App.vue or Pet.vue.
window.isTauri = true;

const world = buildWorld({ scene, theme, surface, drawer: Number(params.get("drawer")) || null });

// Deterministic per-scene browser storage (drawer state, the pet's remembered conversation, quiz drafts).
try {
  localStorage.clear();
  for (const [key, value] of Object.entries(world.storage || {})) localStorage.setItem(key, value);
} catch {
  /* storage refused: the app keeps its defaults */
}

mockWindows(surface); // window labels "main" / "pet", as in src-tauri/tauri.conf.json

const calls = [];
const unhandled = [];
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

async function windowCommand(cmd, args) {
  const name = cmd.slice("plugin:window|".length);
  const size = { width: Math.round(innerWidth * devicePixelRatio), height: Math.round(innerHeight * devicePixelRatio) };
  switch (name) {
    case "inner_size":
    case "outer_size":
      return size;
    case "inner_position":
    case "outer_position":
      return { x: 0, y: 0 };
    case "scale_factor":
      return devicePixelRatio;
    case "is_fullscreen":
    case "is_maximized":
    case "is_minimized":
      return false;
    case "is_visible":
    case "is_focused":
      return true;
    default:
      return null; // start_dragging, set_size, show, hide, set_focus ...
  }
}

mockIPC(
  async (cmd, args = {}) => {
    calls.push({ cmd, method: args?.method, params: clone(args?.params), at: Math.round(performance.now()) });
    if (cmd === "rpc") {
      const { method, params: p = {} } = args;
      if (!world.has(method)) {
        unhandled.push({ method, params: clone(p) });
        console.warn("[pebble-mock] unhandled rpc", method, p);
      }
      // A refusal from the real shell/service is a string (bridge.ts parses coded strings); keep that contract.
      return clone(await world.rpc(method, p));
    }
    if (cmd.startsWith("plugin:window|")) return windowCommand(cmd, args);
    if (cmd.startsWith("plugin:webview|") || cmd.startsWith("plugin:app|")) return null;
    if (cmd.startsWith("plugin:dialog|")) return null; // a cancelled file/save dialog
    switch (cmd) {
      case "compact":
      case "pet_expand":
      case "pet_gaze":
      case "show_pet":
      case "open_workspace":
      case "service_restart":
        return null;
      case "login_item_status":
        return { status: "enabled" };
      case "login_item_set":
        return { status: "enabled" };
      case "notification_authorization":
        return { status: "authorized" };
      case "export_choose_destination":
      case "telemetry_choose_destination":
        return null;
      default:
        unhandled.push({ cmd, args: clone(args) });
        console.warn("[pebble-mock] unhandled command", cmd, args);
        return null;
    }
  },
  { shouldMockEvents: true }, // listen()/emit() go through the mock, so backend-event streams can be scripted
);

window.__pebble = {
  world,
  calls,
  unhandled,
  /** Push one Pebble backend event ({event, data}) to every listener, exactly as the shell's "backend-event". */
  emit(event, data) {
    return window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "backend-event", payload: { event, data } });
  },
};

await import("/src/main.ts");
