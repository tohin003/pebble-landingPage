#!/usr/bin/env node
// Checks the DRAFT 2.0 harness fixtures (film-2.0 only; embargoed). Light: no browser, no network, no render.
//
//   node capture/fixtures-2.0/check.mjs                        the draft's own checks (exit 1 on a failure)
//   node capture/fixtures-2.0/check.mjs --snapshot=<dir>       also look up every non-sample string, word for word,
//                                                              in the 2.0.0 snapshot's src/ and backend/ (read only)
//   node capture/fixtures-2.0/check.mjs --final                fail on any ⟦placeholder⟧ in a film scene (use at G4)
//   node capture/fixtures-2.0/check.mjs --json=<file>          also write the report as JSON
//
// What it checks:
//   A. the string register: every entry has a known status and a source; "snapshot" entries are visible ⟦placeholders⟧
//   B. the sample world: every message in sampleWorld.js equals capture/sample-world-2.0/world.json
//   C. every scene's world answers the RPCs the v1.5.0 harness answered, without throwing; the placeholders each scene
//      still shows are listed (a draft may have them; --final may not)
//   D. privacy and the retired world: no home folder but the demo user's, no e-mail outside example.com, nothing of
//      the trailer's world (Maya, invoice-kit, Lisbon), no "Context Warping", no "undetectable"
//   E. (--snapshot) each string's fixed fragments found in the snapshot's source, or listed as missing

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STRINGS } from "./strings.js";
import * as W from "./sampleWorld.js";
import { buildWorld2, RPC_METHODS_V150 } from "./world.js";
import { SCENES_2 } from "./scenes.js";
import { TIMELINES_2, CHAINS } from "./timelines.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || "").split("=").slice(1).join("=");
const FINAL = args.includes("--final");
const SNAPSHOT = opt("snapshot");
const report = { draft: true, failures: [], warnings: [], register: {}, scenes: {}, snapshot: null };
const fail = (msg) => report.failures.push(msg);
const warn = (msg) => report.warnings.push(msg);
const PH = /⟦[^⟧]*⟧/g;

// ---- A. the register -------------------------------------------------------------------------------------------------
const STATUSES = new Set(["v1.5.0-host", "v1.5.0-ui", "features-1.9.12", "changelog", "snapshot"]);
for (const [key, entry] of Object.entries(STRINGS)) {
  if (!STATUSES.has(entry.status)) fail(`A: ${key} has an unknown status ${entry.status}`);
  if (!entry.source) fail(`A: ${key} has no source`);
  if (entry.status === "snapshot" && !PH.test(entry.text)) fail(`A: ${key} is unknown until the snapshot, so its text must be a ⟦placeholder⟧`);
  PH.lastIndex = 0;
  report.register[entry.status] = (report.register[entry.status] || 0) + 1;
}

// ---- B. the sample world against world.json ----------------------------------------------------------------------------
const worldJson = JSON.parse(fs.readFileSync(path.join(HERE, "..", "sample-world-2.0", "world.json"), "utf8"));
const byId = Object.fromEntries(worldJson.conversations.map((c) => [c.id, c.messages]));
const pairs = [["quick", [W.MESSAGES.quick]], ["open-day", W.MESSAGES.openDay], ["tickets", [W.MESSAGES.tickets]], ["kiln-board", [W.MESSAGES.kilnBoard]],
  ["notes-delete", [W.MESSAGES.notesDelete]], ["app-actions", W.MESSAGES.appActions], ["photos", W.MESSAGES.photos], ["studio-bookings", [W.MESSAGES.bookings]],
  ["glaze", [W.MESSAGES.glaze]], ["kiln", [W.MESSAGES.kiln]]];
for (const [id, mine] of pairs) {
  if (JSON.stringify(byId[id]) !== JSON.stringify(mine)) fail(`B: the messages of '${id}' differ from world.json`);
}
if (worldJson.kiln.tool_name !== W.WORKSHOP.kilnTool) fail("B: the kept tool's name differs from world.json");
if (worldJson.demo_user.home !== W.HOME) fail("B: the demo user's home differs from world.json");

// ---- C. every scene's world --------------------------------------------------------------------------------------------
function walkStrings(value, out, seen = new Set()) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const v of Array.isArray(value) ? value : Object.values(value)) walkStrings(v, out, seen);
  }
  return out;
}
const sampleParams = (chat) => ({ id: chat.id, chat_id: chat.id, run_id: chat.runs?.[0]?.id, kind: "profile", ids: ["mem-fact-3"], key: "theme", value: "light", after: 0 });
// What a scene's steps open, so its placeholders are the ones it would show (the composer shows the model's name in
// every window scene, so state() always counts).
const PANEL_RPCS = { Memory: ["memory_list", "memory_forget_preview"], "Skills & connectors": ["extensions", "connector_status"], Permissions: [],
  agents: ["agent_list"], goal: ["goal_list", "goal_get"], tools: ["screen_sessions"], sources: ["research_sources"], schedules: ["job_list"] };
for (const scene of SCENES_2) {
  const surface = /(^|&)pet(&|$)/.test(scene.query) ? "pet" : "main";
  const world = buildWorld2({ scene: scene.world, surface });
  const st = await world.rpc("state", {});
  const firstChat = await world.rpc("get_chat", { id: st.chats[0].id });
  const errors = [];
  for (const method of RPC_METHODS_V150) { // every v1.5.0 RPC answers, in every scene
    if (!world.has(method)) { fail(`C: ${scene.name}: the v1.5.0 RPC '${method}' is not answered`); continue; }
    if (["send", "approve", "reject", "undo", "memory_delete", "setting", "run_held_tests", "run_held_accept", "cancel", "new_chat"].includes(method)) continue; // effects: not called here
    try {
      await world.rpc(method, sampleParams(firstChat));
    } catch (error) {
      if (!(method === "artifact_get" && String(error).includes("View not found"))) errors.push(`${method}: ${error}`);
    }
  }
  const strings = walkStrings(st, []);
  walkStrings(firstChat, strings);
  for (const r of firstChat.runs || []) walkStrings(await world.rpc("run_activity", { run_id: r.id }), strings);
  const opened = scene.steps.flatMap(([verb, what]) => (["openSettings", "openDrawer"].includes(verb) ? PANEL_RPCS[what] || [] : []));
  for (const method of opened) walkStrings(await world.rpc(method, sampleParams(firstChat)), strings);
  const placeholders = [...new Set(strings.flatMap((s) => s.match(PH) || []))];
  const shown = scene.strings.filter((k) => !STRINGS[k]) ;
  if (shown.length) fail(`C: ${scene.name} names unknown register keys: ${shown.join(", ")}`);
  const sceneStatus = scene.strings.map((k) => STRINGS[k]?.status).filter(Boolean);
  report.scenes[scene.name] = { shot: scene.shot, film: scene.film, world: scene.world, first: st.chats[0].title, errors,
    placeholders, register: sceneStatus.reduce((a, s) => ({ ...a, [s]: (a[s] || 0) + 1 }), {}),
    ready: errors.length === 0 && placeholders.length === 0 && !sceneStatus.includes("snapshot") };
  if (errors.length) fail(`C: ${scene.name}: ${errors.join("; ")}`);
  if (FINAL && scene.film && placeholders.length) fail(`C: ${scene.name} is a film scene and still shows ${placeholders.length} placeholder(s)`);
}
for (const [name, t] of Object.entries(TIMELINES_2)) {
  if (!t.moments?.length) fail(`C: timeline ${name} has no moments`);
  if (t.moments.some((m) => !["log", "person"].includes(m.source))) fail(`C: timeline ${name} has a moment with no source`);
}
if (CHAINS.length !== 11) warn(`C: TREATMENT §3.6 lists 11 timed chains; timelines.js has ${CHAINS.length}`);

// ---- D. privacy and the retired world ------------------------------------------------------------------------------------
const files = ["strings.js", "sampleWorld.js", "world.js", "scenes.js", "timelines.js", "README.md", "HARNESS_PLAN.md"].filter((f) => fs.existsSync(path.join(HERE, f)));
const banned = [
  [/\/Users\/(?!studio\b|Shared\b)[A-Za-z0-9._-]+/, "a home folder other than the demo user's"],
  [/[A-Za-z0-9._%+-]+@(?!example\.com\b)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, "an e-mail address outside example.com"],
  [/\bMaya\b|invoice-kit|\bLisbon\b/, "the trailer's retired sample world"],
  [/Context Warping/, "a name the film may not use (§49)"],
  [/\bundetectable\b/i, "a word the film may not use (§49)"],
];
for (const f of files) {
  const lines = fs.readFileSync(path.join(HERE, f), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [rx, what] of banned) {
      if (rx.test(line) && !/banned|the trailer's retired|may not use|never|not use|no "Context|retired/.test(line)) fail(`D: ${f}:${i + 1}: ${what}`);
    }
  });
}

// ---- E. the snapshot ---------------------------------------------------------------------------------------------------------
if (SNAPSHOT) {
  const roots = ["src", "backend"].map((d) => path.join(SNAPSHOT, d)).filter((d) => fs.existsSync(d));
  if (!roots.length) fail(`E: ${SNAPSHOT} has no src/ or backend/`);
  const corpus = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(vue|ts|js|mjs|py)$/.test(entry.name) && !/\.test\./.test(entry.name)) corpus.push(fs.readFileSync(p, "utf8"));
    }
  };
  roots.forEach(walk);
  const text = corpus.join("\n");
  const result = { found: [], missing: [], to_read: [] };
  for (const [key, entry] of Object.entries(STRINGS)) {
    if (entry.status === "snapshot") { result.to_read.push(key); continue; }
    const fragments = entry.text.split(/\{\w+\}/).map((s) => s.trim()).filter((s) => s.length >= 4);
    const ok = fragments.every((frag) => text.includes(frag) || text.includes(frag.replace(/'/g, "\\'")) || text.includes(frag.replace(/'/g, "’")));
    (ok ? result.found : result.missing).push(key);
  }
  report.snapshot = { dir: SNAPSHOT, files: corpus.length, ...result };
  if (result.missing.length) warn(`E: ${result.missing.length} string(s) not found word for word in the snapshot: ${result.missing.join(", ")}`);
}

// ---- the report ------------------------------------------------------------------------------------------------------------
const film = Object.entries(report.scenes).filter(([, s]) => s.film);
console.log(`fixtures-2.0 (DRAFT): ${Object.keys(STRINGS).length} register strings ${JSON.stringify(report.register)}`);
console.log(`scenes: ${SCENES_2.length} (${film.length} may reach the film after the snapshot check); timelines: ${Object.keys(TIMELINES_2).length}`);
for (const [name, s] of Object.entries(report.scenes)) {
  console.log(`  ${s.ready ? "ready " : "DRAFT "} ${name.padEnd(20)} ${String(s.shot).padEnd(26)} first: ${s.first.slice(0, 26).padEnd(26)} placeholders: ${s.placeholders.length}`);
}
if (report.snapshot) console.log(`snapshot: ${report.snapshot.files} files; found ${report.snapshot.found.length}, missing ${report.snapshot.missing.length}, still to read ${report.snapshot.to_read.length}`);
for (const w of report.warnings) console.log("warning: " + w);
for (const f of report.failures) console.log("FAIL: " + f);
if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(report, null, 1) + "\n");
console.log(report.failures.length ? `${report.failures.length} failure(s)` : "draft checks passed (placeholders are expected until the 2.0.0 snapshot)");
process.exit(report.failures.length ? 1 : 0);
