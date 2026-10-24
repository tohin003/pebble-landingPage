// Deterministic frame-by-frame recording of the REAL Pebble UI (vclock mode): every frame is a PNG screenshot taken
// after advancing the page's virtual clock by exactly 1/fps, with backend events played from a timeline.
// Usage: node record.mjs <timeline> [--theme=light|dark] [--fps=30] [--scale=2] [--out=DIR]
//          [--frames=N]        record only the first N frames (a short excerpt, e.g. to prove the pipeline)
//          [--from=SECONDS]    play the whole timeline but save no frame before this time (the numbering is kept: a
//                              film that reads main-live-film from 3.85 s needs no frame before it; lane G-fix)
//          [--at=1.5,4,9.25]   do not record a sequence: play the timeline and save one still at each of these times
//                              (<timeline>-<theme>-t<seconds>.png), to check its states cheaply
//          [--hide=SELECTORS]  make these elements invisible (opacity 0: still laid out and clickable), e.g.
//                              --hide=.pet-avatar records the companion without its pebble, which the films draw
//                              themselves (FILM_SPEC §17 R1; lane G2b)
// Timelines: pet-live-error (alias pet-live), main-live-film, pet-gaze, pet-veil. Output: numbered PNGs 00001.png...
// plus timeline.json (for pet-gaze also the cursor position of every frame, for compositing). Encode later, e.g.
// ffmpeg -framerate 30 -i %05d.png -c:v prores_ks -pix_fmt yuva444p10le out.mov
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const ALIASES = { "pet-live": "pet-live-error" };
const NAME = ALIASES[args.find((a) => !a.startsWith("--")) || "pet-live-error"] || args.find((a) => !a.startsWith("--")) || "pet-live-error";
const THEME = opt("theme", "light");
const FPS = Number(opt("fps", "30"));
const SCALE = Number(opt("scale", "2"));
const BASE = opt("base", "http://127.0.0.1:5199/");
const OUT = path.resolve(opt("out", path.join(HERE, "frames-vclock", `${NAME}-${THEME}`)));
const LIMIT = Number(opt("frames", "0")) || Infinity;
const AT = opt("at", "") ? opt("at", "").split(",").map(Number).filter((t) => t >= 0).sort((a, b) => a - b) : null;
const HIDE = opt("hide", "");
const FROM = Number(opt("from", "0")) || 0;

// ---- timeline helpers --------------------------------------------------------------------------------------------
const emit = (event, data) => (page) => page.evaluate((e, d) => window.__pebble.emit(e, d), event, data);
const live = (fn, ...rest) => (page) => page.evaluate((name, list) => window.__pebble.world.live[name](...list), fn, rest);
const fixture = (page, getter) => page.evaluate(`window.__pebble.world.live.${getter}`);
const row = (seq, at, kind, label, status = "done", activity = null, duration = null, detail = null) => ({ seq, at, kind, label, status, activity, duration, detail });
// Stream `text` word by word between t0 and t1 (token events with one message id).
function streamWords(steps, t0, t1, ids, text) {
  const words = text.split(/(?<=\s)/);
  words.forEach((w, i) => steps.push([t0 + ((t1 - t0) * i) / words.length, emit("token", { ...ids, text: w })]));
}
// Scroll an element to its end between t0 and t1 with an ease-in-out, one step per frame (as a person scrolls down to
// what just appeared below the fold).
function scrollToEnd(steps, t0, t1, selector, fps) {
  const n = Math.max(1, Math.round((t1 - t0) * fps));
  let from = null;
  for (let i = 0; i <= n; i++) {
    const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    steps.push([t0 + (t1 - t0) * k, (page) => page.evaluate((sel, ease, first) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (first || el.dataset.scrollFrom === undefined) el.dataset.scrollFrom = String(el.scrollTop);
      const start = Number(el.dataset.scrollFrom), end = el.scrollHeight - el.clientHeight;
      el.scrollTop = start + (end - start) * ease;
    }, selector, e, i === 0)]);
  }
  return from;
}
// Scroll a panel between t0 and t1 (ease-in-out, one step per frame), as a person scrolls (FILM_SPEC §17 R2, lane
// G2a). `to.frac`: the chosen element's bottom ends at that fraction of the panel's visible height; `to.y`: its centre
// ends at that viewport y (CSS px); `to.top`: the panel returns to its top. `to.pick` ("last" by default or "first")
// chooses among the elements matching `target`. The end position is measured once, on the scroll's first frame.
function scrollPanel(steps, t0, t1, panel, target, to, fps) {
  const n = Math.max(1, Math.round((t1 - t0) * fps));
  for (let i = 0; i <= n; i++) {
    const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    steps.push([t0 + (t1 - t0) * k, (page) => page.evaluate((sel, tsel, o, ease, first) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (first || el.dataset.scrollTo === undefined) {
        const items = tsel ? el.querySelectorAll(tsel) : [], one = o.pick === "first" ? items[0] : items[items.length - 1];
        let end = o.top ? 0 : el.scrollTop;
        if (one && o.frac !== undefined) end += one.getBoundingClientRect().bottom - el.getBoundingClientRect().top - o.frac * el.clientHeight;
        if (one && o.y !== undefined) { const r = one.getBoundingClientRect(); end += (r.top + r.bottom) / 2 - o.y; }
        el.dataset.scrollFrom = String(el.scrollTop);
        el.dataset.scrollTo = String(Math.max(0, Math.min(el.scrollHeight - el.clientHeight, end)));
      }
      const a = Number(el.dataset.scrollFrom), b = Number(el.dataset.scrollTo);
      el.scrollTop = a + (b - a) * ease;
    }, panel, target, to, e, i === 0)]);
  }
}
// Type `text` one character at a time from t0, `gap` seconds apart.
function typeChars(steps, t0, gap, text) {
  [...text].forEach((ch, i) => steps.push([t0 + i * gap, (page) => page.keyboard.type(ch)]));
  return t0 + text.length * gap;
}

// The companion's gaze: the shell samples the cursor at 15 Hz and sends a direction quantized to 1/8 in [-1, 1], only
// when it changes (src-tauri/src/main.rs pet_gaze). The cursor circles the pebble once per loop.
const GAZE = { seconds: 6, reach: 400, orbit: { x: 280, y: 280 }, start: -Math.PI / 2 };
const step8 = (v) => { const q = Math.round(Math.max(-1, Math.min(1, v)) * 8) / 8; return q === 0 ? 0 : q; };
function cursorAt(t) {
  const a = GAZE.start + (2 * Math.PI * t) / GAZE.seconds; // clockwise on screen (y down): up, right, down, left
  return { dx: GAZE.orbit.x * Math.cos(a), dy: GAZE.orbit.y * Math.sin(a) }; // pt from the avatar's centre
}

const TIMELINES = {
  // L1 / the film's hook (D22): the companion opens, the question is typed and sent, Thinking, the model's reply
  // streams (Writing), the task completes and the pebble celebrates.
  "pet-live-error": {
    url: "?pet&scene=pet-live",
    viewport: { width: 384, height: 456 },
    transparent: true,
    seconds: 9,
    async build(page) {
      const chat = "chat-live-pet", run = "run-live-1", reply = "msg-live-pet-reply";
      const question = await fixture(page, "text.petQuestion");
      const answer = await fixture(page, "reply.pet");
      const steps = [[0.6, (page) => page.click(".pet-avatar")]];
      typeChars(steps, 1.3, 0.034, question);
      steps.push(
        [3.0, (page) => page.keyboard.press("Enter")],
        [3.15, emit("run", { chat_id: chat, run_id: run, state: "queued" })],
        [3.3, emit("run", { chat_id: chat, run_id: run, state: "running" })],
      );
      streamWords(steps, 4.6, 6.4, { chat_id: chat, run_id: run, id: reply }, answer);
      const usage = { input_tokens: 1180, output_tokens: 52, cached_tokens: 0, tokens_per_second: 24.5, route: "model", calls: 1, seconds: 2.2 };
      steps.push(
        [6.5, emit("usage", { chat_id: chat, id: reply, usage })],
        [6.55, live("message", chat, { id: reply, role: "assistant", content: answer, run_id: run, usage })],
        [6.56, live("run", chat, { id: run, state: "completed", elapsed: 4, counts: { steps: 0, retries: 0, waited: 0 } })],
        [6.57, live("active", null, null)],
        [6.6, emit("run", { chat_id: chat, run_id: run, state: "completed" })],
        [7.2, emit("idle", { chat_id: chat, run_id: run })],
      );
      return steps;
    },
  },

  // C8 (P0): the main-window proof sequence for the film. Request -> Reading -> two edit cards -> Apply edit (x2) ->
  // AgentGuard holds the task ("Pebble's change isn't verified yet.") -> Run the tests -> the "Run isolated tests"
  // card -> Run tests -> "Requesting isolated tests · 11 s" -> "Verified · pytest 42 passed on current files".
  "main-live-film": {
    url: "?scene=live-film",
    viewport: { width: 1160, height: 800 },
    transparent: false,
    seconds: 27,
    async build(page) {
      const chat = "chat-live-fix", run = "run-live-1", reply = "msg-live-reply", ids = { chat_id: chat, run_id: run, id: reply };
      const request = await fixture(page, "text.request");
      const r = await fixture(page, "reply");
      const diffs = await fixture(page, "diffs");
      const heldIssue = await fixture(page, "text.heldIssue");
      const A = (item) => emit("activity", { chat_id: chat, run_id: run, item });
      const P = (tool, activity, label, kind = "working") => emit("progress", { chat_id: chat, run_id: run, kind, tool, activity, label });
      const items = []; // the host record so far, for run_activity reads after idle
      // keep(): play an activity row and remember it (at play time) for the host record that later reads return.
      const keep = (t, item) => [t, async (page) => { items.push(item); await A(item)(page); }];
      // heldGap: the fixture dates the "You asked Pebble to run the tests" note 2 s after the hold (the 16.0 s click).
      const record = (state) => live("activity", run, { state, started: null, elapsed: null, items: dedupe(items), heldGap: 2 });
      const dedupe = (list) => [...new Map(list.map((i) => [i.seq, i])).values()].sort((a, b) => a.seq - b.seq);
      // 1.2.0: the test-file edit carries the host's reason (fixtures.js TEST_SCOPE), which 1.2.0's card shows before its
      // lead; earlier releases ignore it. The film's frames on disk are 1.0.4's: a re-record from 1.2.0 makes that card
      // taller, so video/src/film/ui.ts's LIVE_FILM boxes would need measuring again.
      const testScope = await fixture(page, "testScope");
      const edit = (id, file, baseline, diff, status, extra = {}) => ({ id, chat_id: chat, kind: "edit", status, payload: { path: file, baseline, diff, ...extra } });
      const pending = [edit("act-film-dates", "invoice_kit/dates.py", "9f2c41d07ab3", diffs.dates, "pending"), edit("act-film-tests", "tests/test_dates.py", "51ab9e2c3d70", diffs.tests, "pending", testScope)];
      const applied = pending.map((a) => ({ ...a, status: "applied" }));
      const tests = (status, result) => ({ id: "act-tests-1", chat_id: chat, kind: "tests", status,
        payload: { recipe: "pytest", plan: { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
          executable: { realpath: "/Users/maya/Projects/invoice-kit/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } }, ...(result ? { result } : {}) } });
      const passed = { outcome: "passed", exit_code: 0, tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 },
        snapshot_digest: "c0ffee5a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5", drafts_included: [], output: "..........................................  [100%]\n42 passed in 1.84s" };
      const verdictRow = (seq, at, last) => row(seq, at, "check", "Not verified · 2 changed files, no tests run", "done", null, 0.6, last ? "1 item unresolved" : "1 item to resolve");
      const withdrawn = (seq, at) => row(seq, at, "note", "Draft withdrawn: a check asked for a fix; the reply follows it");
      const steps = [
        [0.3, (page) => page.type("textarea[aria-label='Message Pebble']", request, { delay: 0 })],
        [1.0, (page) => page.keyboard.press("Enter")],
        [1.15, emit("run", { chat_id: chat, run_id: run, state: "queued" })],
        [1.3, emit("run", { chat_id: chat, run_id: run, state: "running" })],
        keep(1.4, row(0, 0.2, "context", "Recalled 3 memories", "done", null, 0.18, "Context ready in 180 ms")),
        keep(1.5, row(32, 0.3, "model", "Waiting for the model", "running")),
        keep(2.1, row(32, 0.3, "model", "The model responded", "done", null, 0.6, "Headers after 0.3 s; first text after 0.5 s.")),
        [2.2, P("Grep", "searching", "Searching project source")], keep(2.2, row(64, 1.0, "tool", "Searching project source", "running", "searching")),
        keep(3.0, row(64, 1.0, "tool", "Searching project source", "done", "searching", 0.6)), [3.0, P("Grep", "searching", "Searching project source", "done")],
        [3.1, P("Read", "reading", "Reading invoice_kit/dates.py")], keep(3.1, row(128, 1.8, "tool", "Reading invoice_kit/dates.py", "running", "reading")),
        keep(4.7, row(128, 1.8, "tool", "Reading invoice_kit/dates.py", "done", "reading", 0.2)), [4.7, P("Read", "reading", "Reading invoice_kit/dates.py", "done")],
        keep(4.8, row(160, 3.4, "model", "Waiting for the model", "running")),
        keep(5.4, row(160, 3.4, "model", "The model responded", "done", null, 0.6, "Headers after 0.2 s; first text after 0.4 s.")),
        [5.5, P("Edit", "editing", "Preparing an edit to invoice_kit/dates.py")],
        keep(5.6, row(192, 4.2, "tool", "Preparing an edit to invoice_kit/dates.py", "done", "editing", 0.3, "Staged for your approval.")),
        [5.7, P("Edit", "editing", "Preparing an edit to tests/test_dates.py")],
        keep(5.8, row(256, 4.6, "tool", "Preparing an edit to tests/test_dates.py", "done", "editing", 0.3, "Staged for your approval.")),
        [5.9, P("Edit", "editing", "Preparing an edit to tests/test_dates.py", "done")],
        [6.0, live("actions", chat, pending)], [6.0, emit("actions", { chat_id: chat, actions: pending })],
      ];
      streamWords(steps, 6.2, 8.0, ids, r.proposedHeld);
      const usage1 = { input_tokens: 3480, output_tokens: 412, cached_tokens: 2048, tokens_per_second: 21.6, route: "model", calls: 2, seconds: 6.8 };
      steps.push(
        [8.1, emit("usage", { chat_id: chat, id: reply, usage: usage1 })],
        [8.12, live("message", chat, { id: reply, role: "assistant", content: r.proposedHeld, run_id: run, usage: usage1 })],
        [8.13, live("run", chat, { id: run, state: "waiting_approval", elapsed: 7, counts: { steps: 4, retries: 0, waited: 0 } })],
        [8.14, live("active", null, null)],
        keep(8.15, row(320, 6.9, "note", "Waiting for your approval")),
        [8.16, (page) => record("waiting_approval")(page)],
        [8.2, emit("run", { chat_id: chat, run_id: run, state: "waiting_approval" })],
        [8.3, emit("idle", { chat_id: chat, run_id: run })],
        // The person applies both edits (App.vue decide(): approve, then get_chat).
        [9.4, (page) => page.click("#details-drawer .action-card.pending .primary-button")],
        [10.3, (page) => page.click("#details-drawer .action-card.pending .primary-button")],
      );
      // The person scrolls the drawer a little to look at the applied card, so its "Undo this edit" sits where Apply
      // edit was (centre y 692; the film's match cut on the click uses the 11.05 s frame), then back to the top before
      // the next steps arrive (lane G2a; the film shows neither scroll).
      scrollPanel(steps, 10.45, 10.95, "#details-drawer .details-panel", "#details-drawer .undo-button", { pick: "first", y: 692 }, 30);
      scrollPanel(steps, 11.25, 11.75, "#details-drawer .details-panel", null, { top: true }, 30);
      steps.push(
        // The run continues (controller.py dispatch_now), finishes without test evidence and is held by the gate.
        [10.8, live("active", chat, run)],
        [10.85, live("actions", chat, applied)], [10.9, emit("actions", { chat_id: chat, actions: applied })],
        [10.95, emit("run", { chat_id: chat, run_id: run, state: "queued" })],
        [11.0, emit("run", { chat_id: chat, run_id: run, state: "running" })],
        keep(11.1, row(384, 8.0, "approval", "Approved: Preparing an edit to invoice_kit/dates.py", "done", null, 2.4)),
        keep(11.15, row(448, 8.1, "approval", "Approved: Preparing an edit to tests/test_dates.py", "done", null, 0.9)),
        keep(11.2, row(512, 9.4, "model", "The model responded", "done", null, 1.1, "Headers after 0.2 s; first text after 0.4 s.")),
        keep(11.3, verdictRow(576, 10.6, false)), keep(11.35, withdrawn(640, 10.7)),
        keep(11.4, row(704, 10.8, "model", "The model responded", "done", null, 1.2, "Headers after 0.2 s; first text after 0.5 s.")),
        keep(11.5, verdictRow(768, 12.1, false)), keep(11.55, withdrawn(832, 12.2)),
        keep(11.6, row(896, 12.3, "model", "Waiting for the model", "running")),
      );
      streamWords(steps, 11.8, 13.6, ids, "\n" + r.continueHeld);
      steps.push(
        keep(13.7, row(896, 12.3, "model", "The model responded", "done", null, 1.9, "Headers after 0.2 s; first text after 0.4 s.")),
        keep(13.75, verdictRow(960, 14.3, true)),
        [13.8, emit("token", { ...ids, text: r.heldNotice })],
        keep(13.85, row(1024, 14.4, "note", "Verification remains incomplete")),
      );
      const heldText = r.proposedHeld + "\n" + r.continueHeld + r.heldNotice;
      const usage2 = { input_tokens: 4630, output_tokens: 188, cached_tokens: 3072, tokens_per_second: 22.8, route: "model", calls: 3, seconds: 4.2 };
      steps.push(
        [14.0, emit("usage", { chat_id: chat, id: reply, usage: usage2 })],
        [14.02, live("message", chat, { id: reply, role: "assistant", content: heldText, run_id: run, usage: usage2 })],
        [14.03, live("run", chat, { id: run, state: "verification_required", error: heldIssue, elapsed: 15, counts: { steps: 7, retries: 0, waited: 3 } })],
        [14.04, live("active", null, null)],
        [14.05, (page) => record("verification_required")(page)],
        [14.1, emit("run", { chat_id: chat, run_id: run, state: "verification_required" })],
        [14.2, emit("idle", { chat_id: chat, run_id: run })],
      );
      // The held row (RunPanel) appears under the reply: bring it into view.
      scrollToEnd(steps, 14.5, 15.1, ".conversation-scroll", 30);
      steps.push(
        // "Run the tests" stages the covering recipe through the normal approval (controller.py held() 'tests').
        [16.0, (page) => page.click(".run-held button:first-child")],
        [16.1, live("actions", chat, [...applied, tests("pending")])],
        [16.15, emit("run", { chat_id: chat, run_id: run, state: "waiting_approval" })],
        [16.2, emit("actions", { chat_id: chat, actions: [...applied, tests("pending")] })],
        // The announced card takes keyboard focus (App.vue announceApprovals); the pointer moves on, so no focus ring.
        [16.35, (page) => page.evaluate(() => document.activeElement?.blur())],
        // Run tests: the recipe runs in a temporary copy; the gate then verifies the change.
        [17.8, (page) => page.click("#details-drawer .action-card.pending .primary-button")],
        [18.2, live("active", chat, run)],
        [18.25, emit("run", { chat_id: chat, run_id: run, state: "running" })],
        keep(18.3, row(1152, 18.5, "approval", "Approved: Requesting isolated tests", "done", null, 1.6)),
        [18.35, P("RunTests", "testing", "Requesting isolated tests")], keep(18.35, row(1216, 18.6, "tool", "Requesting isolated tests", "running", "testing")),
      );
      // R2 (FILM_SPEC §17): the person scrolls the Details drawer down to its newest steps, so the rows that follow
      // ("Requesting isolated tests · 11 s", "Verified · …") arrive in view, in the drawer's lower half.
      scrollPanel(steps, 18.4, 19.0, "#details-drawer .details-panel", "#drawer-thinking .thinking-steps > li", { frac: 0.42 }, 30);
      steps.push(
        keep(20.4, row(1216, 18.6, "tool", "Requesting isolated tests", "done", "testing", 11.2)), [20.4, P("RunTests", "testing", "Requesting isolated tests", "done")],
        [20.45, live("actions", chat, [...applied, tests("applied", passed)])], [20.5, emit("actions", { chat_id: chat, actions: [...applied, tests("applied", passed)] })],
        keep(20.6, row(1280, 30.0, "check", "Verified · pytest 42 passed on current files", "done", null, 2.4)),
        keep(20.7, row(1344, 32.5, "model", "Waiting for the model", "running")),
      );
      streamWords(steps, 20.9, 22.1, ids, "\n" + r.continueVerified);
      const finalText = heldText + "\n" + r.continueVerified;
      const usage3 = { input_tokens: 5210, output_tokens: 61, cached_tokens: 4096, tokens_per_second: 23.9, route: "model", calls: 4, seconds: 2.6 };
      steps.push(
        keep(22.2, row(1344, 32.5, "model", "The model responded", "done", null, 1.3, "Headers after 0.2 s; first text after 0.4 s.")),
        [22.3, emit("usage", { chat_id: chat, id: reply, usage: usage3 })],
        [22.32, live("message", chat, { id: reply, role: "assistant", content: finalText, run_id: run, usage: usage3 })],
        [22.33, live("run", chat, { id: run, state: "completed", elapsed: 36, counts: { steps: 9, retries: 0, waited: 5 } })],
        [22.34, live("active", null, null)],
        [22.35, (page) => record("completed")(page)],
        [22.4, emit("run", { chat_id: chat, run_id: run, state: "completed" })],
        [23.0, emit("idle", { chat_id: chat, run_id: run })],
      );
      return steps;
    },
  },

  // README 06 (OVERRIDES §6): the collapsed companion's eyes follow a pointer circling it. Frames are transparent; the
  // cursor and backdrop are composited afterwards from timeline.json (tools/assets/readme.mjs).
  "pet-gaze": {
    url: "?pet&scene=pet-chat",
    viewport: { width: 112, height: 112 },
    transparent: true,
    seconds: GAZE.seconds + 0.5, // half a second more than one loop, to cross-fade the seam (tools/assets/readme.mjs)
    async build() {
      const steps = [];
      let sent = null;
      const samples = Math.round((GAZE.seconds + 0.5) * 15); // the shell's lively 15 Hz sampling
      for (let i = 0; i < samples; i++) {
        const t = i / 15, { dx, dy } = cursorAt(t);
        const gaze = { x: step8(dx / GAZE.reach), y: step8(dy / GAZE.reach) };
        if (sent && gaze.x === sent.x && gaze.y === sent.y) continue; // sent only when it changes
        sent = gaze;
        steps.push([t, (page) => page.evaluate((g) => window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "pet-gaze", payload: g }), gaze)]);
      }
      return steps;
    },
    frameInfo: (t) => ({ t, ...cursorAt(t), reach: GAZE.reach }),
  },

  // 1.1.0: the floating pebble puts on the Veil (Stealth Lockdown's look, src/stealthVeil.ts in Avatar.vue) and takes
  // it off. The switch changes the way the host changes it for every window (main.rs stealth_toggle -> app.py
  // setting() stores it and emits "settings" -> Pet.vue re-reads state()). Times are from the first frame:
  //   1.0 s on: the cast (ACTIVATE 1.25 s), then the one shimmer at 0.95-2.05 s after the switch (the next would come
  //   6 s later); 6.0 s off: the release (RELEASE 0.65 s); idle until 7.4 s. The pebble is awake throughout (its
  //   8 s settle, HOLD_SECONDS, runs from the window's first paint, 7.5 s after frame 0). No pointer, no gaze.
  // From a 1.1.0 tree the dusk glass and its rim arrive in the switch's first frame and leave in one frame: 1.1.0's
  // Avatar.vue stealth watcher read veilAtTime() after the prop had changed, so its starting state was already the new
  // one and stealthVeil.ts's 0.45 s wipe and fades didn't play. Pebble 1.2.0 fixed that start state (our finding,
  // credited in its notes; OVERRIDES §23, §26), so from a 1.2.0 or later tree the designed sweep plays, as the site's
  // pebble plays it. The squash and stretch, the closed eyes, the ring, the shimmer, the hop and the blink play in both.
  // These frames show whatever the tree the harness was pointed at does, as it is.
  // It is a render of the pebble by Pebble's own code on the virtual clock, not a screen recording: a window under
  // Stealth Lockdown can't be screen-recorded.
  "pet-veil": {
    url: "?pet&scene=pet-chat",
    viewport: { width: 112, height: 112 },
    transparent: true,
    seconds: 7.4,
    note: "A render of the pebble by Pebble's own Pet.vue, Avatar.vue and stealthVeil.ts (from the tree the harness was pointed at) on the virtual clock; not a screen recording.",
    async build() {
      const stealth = (on) => (page) =>
        page.evaluate(async (value) => {
          await window.__pebble.world.rpc("setting", { key: "stealth", value });
          await window.__pebble.emit("settings", {});
        }, on);
      return [[1.0, stealth(true)], [6.0, stealth(false)]];
    },
  },
};

const spec = TIMELINES[NAME];
if (!spec) throw new Error("Unknown timeline " + NAME + "; known: " + Object.keys(TIMELINES).join(", "));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
await fetch(new URL("__pebble/invalidate", BASE)).catch(() => {});
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(HERE, "chrome-profile"),
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb", "--run-all-compositor-stages-before-draw"],
});
const started = Date.now();
let exitCode = 0;
try {
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && problems.push("console: " + m.text()));
  await page.setViewport({ ...spec.viewport, deviceScaleFactor: SCALE });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: THEME }, { name: "prefers-reduced-motion", value: "no-preference" }]);
  await (await page.createCDPSession()).send("Emulation.setLocaleOverride", { locale: "en-GB" });
  await page.emulateTimezone("Europe/London");
  await page.goto(`${BASE}${spec.url}&theme=${THEME}&vclock`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".pet-root, .app-shell");
  if (HIDE) await page.addStyleTag({ content: `${HIDE} { opacity: 0 !important; }` });
  if (!(await page.evaluate(() => !!window.__pebbleClock))) throw new Error("vclock is not installed");
  await page.evaluate(() => window.__pebbleClock.advance(500)); // boot: first paint of the pebble
  const steps = (await spec.build(page)).sort((a, b) => a[0] - b[0]);
  const total = Math.min(Math.round(spec.seconds * FPS), LIMIT);
  const lastAt = AT ? AT.at(-1) : null;
  const frames = [];
  let next = 0, saved = 0, atIndex = 0;
  for (let frame = 0; frame < (AT ? Math.round(lastAt * FPS) + 1 : total); frame++) {
    const t = frame / FPS;
    while (next < steps.length && steps[next][0] <= t) await steps[next++][1](page);
    await page.evaluate((ms) => window.__pebbleClock.advance(ms), 1000 / FPS);
    if (AT) {
      while (atIndex < AT.length && Math.round(AT[atIndex] * FPS) === frame) {
        await page.screenshot({ path: path.join(OUT, `${NAME}-${THEME}-t${AT[atIndex].toFixed(2)}.png`), omitBackground: !!spec.transparent, captureBeyondViewport: false });
        atIndex++;
        saved++;
      }
    } else {
      if (t + 1e-9 >= FROM) {
        await page.screenshot({ path: path.join(OUT, String(frame + 1).padStart(5, "0") + ".png"), omitBackground: !!spec.transparent, captureBeyondViewport: false });
        saved++;
      }
      if (spec.frameInfo) frames.push(spec.frameInfo(t));
    }
  }
  const unhandled = await page.evaluate(() => window.__pebble.unhandled.map((u) => u.method || u.cmd));
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ name: NAME, theme: THEME, fps: FPS, scale: SCALE, frames: saved, from: FROM || null, at: AT, hide: HIDE || null, ...(spec.note ? { note: spec.note } : {}), unhandled, problems, ...(frames.length ? { cursor: frames } : {}) }, null, 1));
  const seconds = (Date.now() - started) / 1000;
  console.log(`${NAME} [${THEME}] ${saved} ${AT ? "stills" : "frames"} at ${FPS} fps, ${SCALE}x, in ${seconds.toFixed(1)} s -> ${OUT}; unhandled IPC calls ${unhandled.length}${unhandled.length ? " (" + unhandled.join(",") + ")" : ""}; page errors ${problems.length}${problems.length ? ": " + problems.join(" | ") : ""}`);
  if (unhandled.length || problems.length) exitCode = 1;
} finally {
  await browser.close();
}
process.exitCode = exitCode;
