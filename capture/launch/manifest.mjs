// Writes video/src/launch/data/ui.ts: the launch film's harness clips and stills (lane launch-ui), from what the
// recordings logged (.work/launch/ui/meta/<clip>.timeline.json: moments, boxes, the pointer) and the files themselves
// (ffprobe for the mp4s, the PNG headers for the stills). Light: no browser, no render.
//   node capture/launch/manifest.mjs [--check]     (--check: compare with the file on disk, write nothing)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(REPO, "video", "public");
const META = path.join(REPO, ".work", "launch", "ui", "meta");
const OUT = path.join(REPO, "video", "src", "launch", "data", "ui.ts");
const FP = process.env.FP || "/opt/homebrew/bin/ffprobe";

// Each clip: what it shows, and words for its moments and boxes (the timeline names them; see capture/launch/timelines.mjs).
const CLIPS = {
  agentguard: {
    meta: "launch-agentguard",
    act: "4 AgentGuard",
    what: "The held task → Run the tests → the \"Run isolated tests\" card → Run tests → 2.4 s of tests → the run resumes → \"Verified · pytest 42 passed on current files\". Conversation (invoice-kit, \"Fix month-end due dates\") on the left, Details › Activity on the right.",
    moments: {
      held: "first frame: \"Pebble's change isn't verified yet.\" with Run the tests / Ask Pebble to finish / Accept as unverified; the receipt's verdict reads \"Not verified · 2 changed files, no tests run\"",
      runTheTests: "click on Run the tests (the pointer arrives 0.35 s before)",
      card: "the \"Run isolated tests\" card lands at the top of Details (Needs your review), Run tests ready; the conversation shows \"1 action needs your review\"",
      runTests: "click on Run tests (pointer arrives 0.4 s before); the card leaves for Earlier actions and reads Running",
      testsEnd: "the tests end: the card reads Done with its Result; \"The isolated test run finished with exit code 0.\" in the conversation; the toast \"Action completed\" (3.5 s); the run resumes (live turn, work view)",
      verified: "the completion check lands: \"Verified · pytest 42 passed on current files\" (Details › Steps)",
      complete: "the run completes: the reply moves below the tests' summary, its receipt's verdict now \"Verified · pytest 42 passed on current files\"",
    },
    spans: {
      cardScroll: "the person scrolls Details to the card (Earlier actions) while the tests run",
      resultScroll: "Details scrolls on to the card's result and the test output",
      convScroll: "the conversation scrolls to the reply's end",
      stepsScroll: "Details scrolls back up to the newest steps: Tests · pytest 42 passed, the Verified check card, the run's summary",
    },
    boxes: {
      heldRow: "the held block under the reply (sentence and the three buttons)",
      heldButtons: "Run the tests / Ask Pebble to finish / Accept as unverified",
      heldSentence: "\"Pebble's change isn't verified yet. · 2 file(s) changed and no tests were run, …\"",
      verdictBefore: "the receipt's verdict line, \"Not verified · 2 changed files, no tests run\"",
      notice: "the reply's quote, \"Verification remains incomplete: …\"",
      runTheTests: "the Run the tests button",
      testsCard: "the Run isolated tests card (needs review)",
      runTestsButton: "its Run tests button",
      runTests: "the Run tests button as clicked",
      testsCardRunning: "the card in Earlier actions, Running",
      testsCardDone: "the card, Done",
      testsCardResult: "the card with its Result (passed 42) and output",
      testsOutput: "the test output (\"42 passed in 1.84s\")",
      verdictAfter: "the receipt's verdict line, \"Verified · pytest 42 passed on current files\"",
      receiptAfter: "the receipt and the verdict together",
      replyAfter: "the whole final reply",
      testsWorkCard: "the work view's Tests · pytest card (42 passed, the green meter)",
      verifiedWorkCard: "the work view's check card (Verified · pytest 42 passed on current files)",
      summaryCard: "the work view's Done summary",
    },
  },
  memory: {
    meta: "launch-memory",
    act: "6 Memory",
    what: "Settings › Memory: the six layers with their counts, \"Your preferences\" listed → Facts & knowledge → the trash button on an outdated price (\"Wheel taster: 10.00\", from the 2025 price list) → Keep / Forget → Forget: the record goes and the layer's count drops 3 → 2.",
    moments: {
      layers: "first frame: the six layers (Working context 1, Past experiences 3, Facts & knowledge 3, Procedures 1, Time-sensitive information 2, Your preferences 5)",
      factsLayer: "click on Facts & knowledge (pointer arrives 0.45 s before): its three records",
      trash: "click on the trash button of “Wheel taster: 10.00”: Keep / Forget in its place",
      forget: "click on Forget: the record leaves, Facts & knowledge reads 2",
    },
    spans: {},
    boxes: {
      layers: "the six layer buttons with counts",
      records: "the records of Your preferences",
      panel: "the Settings dialog",
      factsLayer: "the Facts & knowledge button",
      factsRecords: "the records of Facts & knowledge",
      trash: "the trash button on the outdated price",
      confirm: "Keep / Forget",
      record: "the record asking Keep / Forget",
      forget: "the Forget button",
      factsAfter: "Facts & knowledge after Forget (two records)",
      factsTab: "the Facts & knowledge button after Forget (count 2)",
    },
  },
  visualAnswer: {
    meta: "launch-visual-answer",
    act: "3 or 5 (visual answers)",
    what: "A new Companion conversation: the celadon question sent → the reply written live (the table forms row by row) → the checked reply lands with its table drawn natively (Table | Chart) → Chart: \"Grams by Material\" as bars.",
    moments: {
      send: "the question is sent (it was in the message box from the first frame)",
      reply: "the checked reply lands: the native table with Table | Chart",
      chart: "click on Chart (pointer arrives 0.5 s before): the bar chart replaces the table",
    },
    spans: {},
    boxes: {
      composer: "the message box with the question",
      draft: "the live draft (the table forming), just before it is replaced",
      table: "the native table",
      toggle: "Table | Chart",
      chart: "the Chart button",
      chartFigure: "the chart",
      replyAfter: "the reply with its chart",
    },
  },
};

// Stills (capture.mjs scenes in capture/launch/scenes.mjs, --naming=video, written as <scene>[-<step>]@3x.png).
const STILLS = {
  held: ["launch-held@3x.png", "The held task in the 1440×900 window (Details › Activity open)"],
  heldRow: ["launch-held-row@3x.png", "Crop: the verdict line, the notice and \"Pebble's change isn't verified yet.\" with its three buttons"],
  workView: ["launch-work-view@3x.png", "The work view: the finished run's steps as cards, opened under its receipt (Read 2 files · 1 search, Changed 1 file …, the Done summary)"],
  workViewCards: ["launch-work-view-cards@3x.png", "Crop: the work view alone"],
  workViewEnd: ["launch-work-view-end@3x.png", "The work view scrolled to its newest cards: Tests · pytest 42 passed, the Verified check, the summary"],
  workViewEndCards: ["launch-work-view-end-cards@3x.png", "Crop: those cards"],
  toolbox: ["launch-toolbox@3x.png", "Settings › Skills & connectors: Pebble's Toolbox with kiln_ramp_time (kept by you) and glaze_batch (kept by Pebble)"],
  toolboxCode: ["launch-toolbox-code@3x.png", "The same, with kiln_ramp_time's code open (View code)"],
  toolboxCrop: ["launch-toolbox-crop@3x.png", "Crop: the Toolbox section (label, the Workshop note, the two tools)"],
  keptCard: ["launch-kept-card@3x.png", "The Workshop's notice in its conversation: \"Kept in Pebble's Toolbox · glaze_batch\", \"Pebble kept this tested calculation on its own. Remove it if you don't want it.\" (the real take RSW-01 has the ask card)"],
  keptCardCrop: ["launch-kept-card-crop@3x.png", "Crop: the notice card"],
  privacy: ["launch-privacy@3x.png", "Settings › Privacy & Stealth, Stealth Lockdown off, with the honest line"],
  privacyOn: ["launch-privacy-on@3x.png", "The same, switched on (the dusk card, the Veil on the pebbles)"],
  privacyCropOff: ["launch-privacy-crop-off@3x.png", "Crop: Privacy and focus, off (label, card, honest line, the two halves)"],
  privacyCropOn: ["launch-privacy-crop-on@3x.png", "Crop: the same frame, on"],
  permissions: ["launch-permissions@3x.png", "Settings › Permissions: How Pebble acts, Ask for approval selected"],
  permissionsCropAsk: ["launch-permissions-crop-ask@3x.png", "Crop: the three modes, Ask for approval selected"],
  permissionsCropAuto: ["launch-permissions-crop-auto@3x.png", "Crop: the same frame, Auto in project selected"],
  memory: ["launch-memory@3x.png", "Settings › Memory: the six layers with counts, Your preferences listed"],
  visualTable: ["launch-visual-table@3x.png", "A visual answer: the reply's table drawn natively, Table | Chart"],
  visualChart: ["launch-visual-chart@3x.png", "The same reply after Chart: Grams by Material"],
};

const r1 = (v) => Math.round(v * 10) / 10;
function probe(file) {
  const out = execFileSync(FP, ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(out), s = j.streams[0], [n, d] = s.r_frame_rate.split("/").map(Number);
  return { w: s.width, h: s.height, fps: n / d, frames: Number(s.nb_read_frames), duration: Number(j.format.duration) };
}
function pngSize(file) {
  const b = fs.readFileSync(file).subarray(0, 24);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// [left, top, width, height] in CSS px of the window -> {x, y, w, h} in source px.
const toPx = (b, scale) => (b ? { x: Math.round(b[0] * scale), y: Math.round(b[1] * scale), w: Math.round(b[2] * scale), h: Math.round(b[3] * scale) } : null);

const THEMES = ["dark", "light"];
const clips = {}, missing = [], notes = [];
for (const [key, c] of Object.entries(CLIPS)) {
  const found = THEMES.filter((th) => fs.existsSync(path.join(PUBLIC, "launch", "ui", `${c.meta}-${th}.mp4`)) && fs.existsSync(path.join(META, `${c.meta}-${th}.timeline.json`)));
  for (const th of THEMES) if (!found.includes(th)) missing.push(`launch/ui/${c.meta}-${th}.mp4`);
  if (!found.length) continue;
  // The themes play one timeline: the first theme found gives the timing and the boxes; the others must agree.
  const read = (th) => ({ v: probe(path.join(PUBLIC, "launch", "ui", `${c.meta}-${th}.mp4`)), tl: JSON.parse(fs.readFileSync(path.join(META, `${c.meta}-${th}.timeline.json`), "utf8")) });
  const all = Object.fromEntries(found.map((th) => [th, read(th)]));
  const { v, tl } = all[found[0]], m = tl.meta || {}, scale = tl.scale;
  for (const th of found.slice(1)) {
    const o = all[th];
    if (o.v.frames !== v.frames || o.v.w !== v.w || o.v.h !== v.h) notes.push(`${c.meta}: ${th} has ${o.v.w}x${o.v.h}, ${o.v.frames} frames; ${found[0]} ${v.w}x${v.h}, ${v.frames}`);
    for (const [k, b] of Object.entries(m.boxes || {})) {
      const ob = o.tl.meta?.boxes?.[k]?.box;
      if (b.box && ob && b.box.some((x, i) => Math.abs(x - ob[i]) > 1.5)) notes.push(`${c.meta}: box ${k} differs by theme (${b.box} / ${ob})`);
    }
  }
  const spans = Object.fromEntries(Object.keys(c.spans).filter((k) => m.K?.[k]).map((k) => [k, { from: m.K[k][0], to: m.K[k][1], what: c.spans[k] }]));
  const boxes = Object.fromEntries(Object.entries(m.boxes || {}).filter(([, b]) => b.box).map(([k, b]) => [k, { t: b.t, box: toPx(b.box, scale), what: c.boxes[k] || k }]));
  clips[key] = {
    src: Object.fromEntries(found.map((th) => [th, `launch/ui/${c.meta}-${th}.mp4`])), act: c.act, what: c.what,
    size: { w: v.w, h: v.h }, fps: v.fps, frames: v.frames, duration: Math.round((v.frames / v.fps) * 1000) / 1000,
    scale, window: { w: 1440, h: 900 }, hidden: tl.hide || null, note: tl.note || null,
    moments: Object.fromEntries(Object.entries(m.moments || {}).map(([k, t]) => [k, { t, what: c.moments[k] || k }])),
    spans, boxes,
    pointer: (m.pointer || []).map(([t, x, y, kind]) => ({ t, x: Math.round(x * scale), y: Math.round(y * scale), click: kind === "click" })),
  };
}
const stills = {};
for (const [key, [name, what]] of Object.entries(STILLS)) {
  const found = THEMES.filter((th) => fs.existsSync(path.join(PUBLIC, "launch", "ui", "stills", th, name)));
  for (const th of THEMES) if (!found.includes(th)) missing.push(`launch/ui/stills/${th}/${name}`);
  if (!found.length) continue;
  stills[key] = { src: Object.fromEntries(found.map((th) => [th, `launch/ui/stills/${th}/${name}`])), size: pngSize(path.join(PUBLIC, "launch", "ui", "stills", found[0], name)), scale: 3, what };
}
const json = (v) => JSON.stringify(v, null, 2);
const ts = `// Pebble 2.0.1's real UI for the launch film: the harness clips and stills (lane launch-ui, ${new Date().toISOString().slice(0, 10)}).
// GENERATED by capture/launch/manifest.mjs from the recordings' own logs; re-run it after a re-capture instead of editing.
//
// Source: Pebble's own frontend at the published tag v2.0.1 (commit c85ed02, frozen with capture/freeze-release.py),
// in Chrome, with Tauri's IPC mocked and sample data (capture/mock/launch-world.js): a re-enactment, never a screen
// recording. Every host string is v2.0.1's own; names, files and numbers are sample data ("Shown with sample data.").
// The clips: the 1440×900 window at 2.5 px per CSS px (3600×2250, H.264 High, level 5.2, yuv420p BT.709, CRF 14,
// 60 fps, a keyframe a second), in Pebble's dark and light themes (the same timeline: one set of times and boxes), usage
// lines hidden at capture (opacity 0: the message's token line and the work view's token chip), so nothing needs
// blurring. The stills: the same window at 3 px per CSS px (4320×2700 PNG), both themes.
//
// Times are seconds from the clip's first frame. Boxes are {x, y, w, h} in the clip's own pixels (camera.ts's Box),
// measured at \`t\` (things move when a panel scrolls). \`pointer\`: the person's pointer, as clicked (\`click\`) or moved
// (it arrives over a control a moment before the click; the real mouse was there, so hover states match a drawn
// cursor). No cursor is in the picture.

export interface UiBox { x: number; y: number; w: number; h: number }
export interface UiSize { w: number; h: number }
export type UiTheme = "dark" | "light";
export interface UiClip {
  /** under video/public, by Pebble's theme (the same timeline in each) */
  src: Partial<Record<UiTheme, string>>;
  act: string;
  what: string;
  size: UiSize;
  fps: number;
  frames: number;
  /** seconds */
  duration: number;
  /** source px per CSS px of the window */
  scale: number;
  window: UiSize;
  /** CSS selectors hidden (opacity 0) at capture */
  hidden: string | null;
  note: string | null;
  moments: Record<string, { t: number; what: string }>;
  spans: Record<string, { from: number; to: number; what: string }>;
  boxes: Record<string, { t: number; box: UiBox; what: string }>;
  pointer: readonly { t: number; x: number; y: number; click: boolean }[];
}
export interface UiStill { src: Partial<Record<UiTheme, string>>; size: UiSize; scale: number; what: string }

export const UI_CLIPS = ${json(clips)} as const satisfies Record<string, UiClip>;

export const UI_STILLS = ${json(stills)} as const satisfies Record<string, UiStill>;
`;
if (missing.length) console.warn("manifest: not found (left out): " + missing.join(", "));
if (notes.length) console.warn("manifest: themes disagree: " + notes.join("; "));
if (process.argv.includes("--check")) {
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, "utf8").replace(/lane launch-ui, \d{4}-\d{2}-\d{2}/, "") === ts.replace(/lane launch-ui, \d{4}-\d{2}-\d{2}/, "");
  console.log(same ? "manifest: ui.ts is current" : "manifest: ui.ts differs from the recordings");
  process.exitCode = same ? 0 : 1;
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, ts);
  console.log(`manifest: ${Object.keys(clips).length} clips, ${Object.keys(stills).length} stills -> ${path.relative(REPO, OUT)}`);
}
