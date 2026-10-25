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
//          [--text-every=10] [--text-at=F1,F2]  with a timeline's probes on: also save the visible text on these frames
// Timelines: pet-live-error (alias pet-live), pet-live-150, main-live-film, main-live-film-150, main-challenge-live,
// pet-gaze, pet-veil. Output: numbered PNGs 00001.png... plus timeline.json (for pet-gaze also the cursor position of every frame,
// for compositing; for a timeline with a schedule its `meta`) and, with probes, probes.json. Encode later, e.g.
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
// With a timeline's probes on: the visible text every TEXT_EVERY frames, and on the frames listed in --text-at=F1,F2,…
const TEXT_EVERY = Number(opt("text-every", "10")) || 10;
const TEXT_AT = new Set(opt("text-at", "").split(",").filter(Boolean).map(Number));

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
// Scroll a panel over frames f0..f1 (30 fps, ease-in-out, one step per frame) so that `target`'s centre ends at the
// viewport y stored in window.__film[yKey]. The end is measured again on every frame, so rows that arrive above the
// target while the person scrolls are followed, and on f1 the target sits exactly there (main-live-film-150).
function followScroll(steps, f0, f1, panel, target, yKey) {
  for (let f = f0; f <= f1; f++) {
    const k = (f - f0) / (f1 - f0), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    steps.push([f / 30, (page) => page.evaluate((sel, tsel, key, ease, first) => {
      const el = document.querySelector(sel), one = document.querySelector(tsel);
      if (!el || !one) return;
      if (first) el.dataset.followFrom = String(el.scrollTop);
      const r = one.getBoundingClientRect(), y = (window.__film || {})[key] ?? 692;
      const end = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + (r.top + r.bottom) / 2 - y));
      const from = Number(el.dataset.followFrom);
      el.scrollTop = from + (end - from) * ease;
    }, panel, target, yKey, e, f === f0)]);
  }
}

// Scroll a panel over frames f0..f1 (30 fps, ease-in-out) to its end, as a wheel does: each frame adds the ease
// profile's share of the distance still left, measured on that frame, so content that the browser's scroll anchoring
// absorbs while it runs (rows inserted above the view) never makes the view jump back, and the last frame lands on the
// end (main-live-film-150, after the tests).
function scrollEaseToEnd(steps, f0, f1, panel) {
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  for (let f = f0 + 1; f <= f1; f++) {
    const before = ease((f - 1 - f0) / (f1 - f0)), now = ease((f - f0) / (f1 - f0)), share = (now - before) / (1 - before);
    steps.push([f / 30, (page) => page.evaluate((sel, part) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.scrollTop += (el.scrollHeight - el.clientHeight - el.scrollTop) * part;
    }, panel, share)]);
  }
}

// Per-frame probes (a timeline's `probe: true`), in CSS px of the viewport: where the controls the film aims at are,
// what the toast, the status line, the receipts and the usage lines say, and which steps the drawer shows. Saved as
// deltas in probes.json (a key is written on a frame when its value changed), with the visible text every few frames.
async function probeFrame(page) {
  return page.evaluate(() => {
    const round = (v) => Math.round(v * 10) / 10;
    const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [round(b.left), round(b.top), round(b.width), round(b.height)]; };
    const text = (el) => (el ? el.innerText.replace(/\s+/g, " ").trim() : null);
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
    const panel = q("#details-drawer .details-panel"), conv = q(".conversation-scroll");
    const seen = (el, box) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > box.top + 1 && b.top < box.bottom - 1; };
    const pbox = panel ? panel.getBoundingClientRect() : null, cbox = conv ? conv.getBoundingClientRect() : null;
    const toast = q(".toast");
    // the conversation's status line (App.vue .working-line): its words sit in .status-text, or in the toggle button
    // while a live record makes it expandable
    const statusEl = q(".working-line:not(.quiet)");
    const status = statusEl ? [".status-word", ".status-detail", ".status-elapsed"].map((s) => text(statusEl.querySelector(s))).filter(Boolean).join(" | ") : null;
    const inConv = (sel) => (cbox ? qa(sel).filter((el) => seen(el, cbox)) : []);
    return {
      drawerTop: panel ? round(panel.scrollTop) : null,
      drawerBox: rect(panel), // the Details drawer's scrolling panel: what of it the window shows
      convTop: conv ? round(conv.scrollTop) : null,
      toast: toast ? [text(toast), rect(toast), getComputedStyle(toast).opacity] : null,
      status,
      // each visible step: its label (and "· N s"), its "+N s" stamp, its box, and its phase (ThinkingDisclosure's class)
      steps: pbox ? qa("#drawer-thinking .thinking-steps > li").filter((li) => seen(li, pbox)).map((li) => [text(li.querySelector(".thinking-label") || li), text(li.querySelector(".thinking-time")), rect(li),
        ["running", "done", "failed", "unfinished"].find((c) => li.classList.contains(c)) || null]) : [],
      cards: pbox ? qa("#details-drawer .action-card").filter((c) => seen(c, pbox)).map((c) => [text(c.querySelector(".action-heading")), rect(c)]) : [],
      apply: rect(q("#details-drawer .action-card.pending .primary-button")),
      undo: rect(q("#details-drawer .undo-button")),
      held: qa(".run-conversation .run-held button").map((b) => [text(b), rect(b)]),
      heldState: (() => { const s = q(".run-conversation .run-state"); return s && cbox && seen(s, cbox) ? [text(s), rect(s)] : null; })(),
      receipts: inConv(".thinking-title").map((el) => [text(el), rect(el)]),
      usage: inConv(".token-stats").map((el) => [text(el), rect(el)]),
      drawerRun: pbox ? qa("#details-drawer .run-panel .run-state").filter((el) => seen(el, pbox)).map((el) => [text(el), rect(el)]) : [],
      // The "Run isolated tests" card wherever it is (its heading carries the status word), and whether it is in view.
      testsCard: (() => {
        const card = qa("#details-drawer .action-card").find((c) => /^Run isolated tests/.test(text(c.querySelector(".action-heading")) || ""));
        return card ? [text(card.querySelector(".action-heading")), rect(card), pbox ? seen(card, pbox) : false] : null;
      })(),
      // The drawer's live model output (AttemptStream.vue), when shown and in view.
      liveAttempt: (() => {
        const s = q("#details-drawer section[aria-label='Live attempt output']");
        return s && pbox && seen(s, pbox) ? [text(s.querySelector("[role=status]")), rect(s), text(s.querySelector("pre"))] : null;
      })(),
      // The conversation's messages in view: role, the first 64 characters, box.
      bubbles: inConv(".messages > .message").map((el) => [el.classList.contains("user") ? "user" : "assistant", (text(el.querySelector(".message-content, .user-text")) || "").slice(0, 64), rect(el)]),
      // The companion's quick chat (Pet.vue): its status line, the task summary line and the feed's messages.
      pet: (() => {
        if (!q(".quick-feed")) return null;
        const box = q(".quick-feed").getBoundingClientRect(), composer = q(".pet-composer textarea[aria-label='Message Pebble']");
        return { status: text(q(".pet-status")), task: text(q(".pet-summary-task")),
          feed: qa(".quick-feed > article").map((a) => [a.classList.contains("user") ? "user" : "assistant", (text(a) || "").slice(0, 80), rect(a)]),
          // the usage lines in the feed that a viewer can see (TokenStats), the feed's own box, the composer's text and
          // its last button: Send message (.pet-send), or Stop task while a run is working with an empty composer
          usage: qa(".quick-feed .token-stats").filter((el) => seen(el, box)).map((el) => [text(el), rect(el)]),
          feedBox: rect(q(".quick-feed")), typed: composer ? composer.value : null,
          send: (() => { const b = q(".pet-composer .pet-send") || q(".pet-composer button[aria-label='Stop task']");
            return b ? [b.getAttribute("aria-label"), rect(b), b.disabled] : null; })() };
      })(),
    };
  });
}

// Every text node a viewer can see on this frame (inside the viewport and every clipping ancestor, not hidden, not at
// opacity 0), as [top, left, text]: for checking each on-screen string against the release's own source.
async function visibleLines(page) {
  return page.evaluate(() => {
    const W = innerWidth, H = innerHeight, out = [];
    const clipOf = (el) => {
      let box = { l: 0, t: 0, r: W, b: H };
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return null;
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          const b = e.getBoundingClientRect();
          box = { l: Math.max(box.l, b.left), t: Math.max(box.t, b.top), r: Math.min(box.r, b.right), b: Math.min(box.b, b.bottom) };
        }
      }
      return box;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const s = n.textContent.replace(/\s+/g, " ").trim();
      if (!s || !n.parentElement) continue;
      const clip = clipOf(n.parentElement);
      if (!clip) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const b of range.getClientRects()) {
        const w = Math.min(b.right, clip.r) - Math.max(b.left, clip.l), h = Math.min(b.bottom, clip.b) - Math.max(b.top, clip.t);
        if (w > 2 && h > 2) { out.push([Math.round(b.top), Math.round(b.left), s]); break; }
      }
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  });
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

// v1.5.0's host at the sample model's 4,096-token window (OVERRIDES §40-§41, fidelity round 2): what the service sends
// the window during a run, in the runner's own order, for the 1.5.0 timelines (main-live-film-150, main-challenge-live,
// pet-live-150). Every helper schedules steps on frames (30 fps) of the recording; T0 is the send's frame, from which
// every "+N s" counts (run_activity.py `at`). `schedule` collects every published or recorded row for the clock check.
//   progress()  runner.py progress(): one `progress` event with the host's class (activity_kinds.classify: only a
//               working event has one; without a tool it is the model's own turn, "thinking").
//   pub()       a row the runner publishes (run_activity.py publish: an `activity` event), kept in the host's record.
//   record()    a change to the host's record that nobody publishes yet: the window reads it later (run_activity).
//   turn()      one model turn: "Working with your model", the stream's begin (stream_journal.py; the drawer's live
//               response, AttemptStream.vue) and "Waiting for the model"; the text streams into the journal only; at its
//               end the row settles with its own duration (a local GGUF model reports no timings: no detail), the
//               retry helper's commit, `run` running, the cumulative usage (save_usage), the journal settled with the
//               response and "committed", then the turn's text in ONE token event (runner.py V1-081).
//   tool()      a tool call: progress, the row running, then done (or failed with its error) and progress again.
//   staged()    an Ask-mode edit: the tool row, propose()'s action and `actions` event (the card), the approval row
//               bound to it, the tool row done "Staged for your approval.".
//   finish()    app.py finish(): the reply saved (created, or saved again: it moves after anything written since), its
//               usage with the segment's own seconds, and `complete`.
//   settle()    runner.py settle_run(): the run's state (the host's record first), its `run` event and its state note.
function host150({ chat, run, reply, T0, steps, schedule, attemptBase = "a3f0" }) {
  const F = (f) => f / 30, r3 = (x) => Math.round(x * 1000) / 1000;
  const at = (f) => r3((f - T0) / 30), span = (a, b) => r3((b - a) / 30);
  const on = (f, fn) => steps.push([F(f), fn]);
  const ids = { chat_id: chat, run_id: run, id: reply };
  const A = (item) => emit("activity", { chat_id: chat, run_id: run, item });
  const CLASS = { Grep: "searching", Read: "reading", Edit: "editing", RunTests: "testing" };
  // Every progress event, for the checker: while a run has no host activity row yet, the window's own fallback rows
  // (activity.ts, from progress events) are the steps it shows.
  const progressLog = [];
  const progress = (f, label, kind = "working", tool = null, extra = {}) => {
    progressLog.push({ f, label, kind });
    on(f, emit("progress", { chat_id: chat, run_id: run, label, kind, ...(tool ? { tool } : {}), ...extra,
      activity: kind === "working" ? (tool ? CLASS[tool] || "working" : "thinking") : null }));
  };
  const note = (f, item, made, by) => schedule.push({ f, made, seq: item.seq, kind: item.kind, label: item.label, status: item.status,
    at: item.at, duration: item.duration, ...(by ? { by } : {}) });
  const pub = (f, item, made = f) => {
    note(f, item, made);
    on(f, async (pg) => { await live("publish", run, item)(pg); await A(item)(pg); });
  };
  const record = (f, item, made) => {
    note(f, item, made, "record");
    on(f, live("publish", run, item));
  };
  const resend = (f, items) => on(f, async (pg) => { for (const item of items) await A(item)(pg); });
  const sendActions = (f, list) => on(f, async (pg) => { await live("actions", chat, list)(pg); await emit("actions", { chat_id: chat, actions: list })(pg); });
  // The runner's usage (runner.py): counts summed over the run's model calls; generation seconds from the provider's
  // rate (stats.usage_metrics), here 0.8 of each attempt; tokens per second over the whole; finish() adds the segment's
  // own wall seconds (app.py finish()), which TokenStats shows instead of the generation seconds.
  const usage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0, calls: 0, generation_seconds: 0, tokens_per_second: null };
  const usageLog = [];
  const attempts = {};
  let attemptCount = 0, separate = false, messageSaved = false;
  // runner.py token(): a turn's text after earlier text starts on its own line (`separate`).
  const tokenText = (text) => {
    const out = separate && text ? "\n" + text : text;
    separate = !out.endsWith("\n");
    return out;
  };
  const turn = ({ seq, f0, f1, text = "", from = f0 + 4, to = f1 - 3, use }) => {
    const n = ++attemptCount, id = attemptBase + String(n).padStart(28, "0");
    const journal = (event) => live("streamEvent", run, { attempt_id: id, step: n, attempt: 1, ...event });
    const stream = (type) => emit("stream", { chat_id: chat, run_id: run, attempt_id: id, type, authorization: "none" });
    progress(f0, "Working with your model");
    on(f0, async (pg) => { await journal({ kind: "begin", state: "open" })(pg); await stream("begin")(pg); });
    pub(f0, row(seq, at(f0), "model", "Waiting for the model", "running"));
    if (f1 === null || f1 === undefined) {
      attempts["a" + n] = null; // a turn still running when the recording ends
      return null;
    }
    if (text) {
      const words = text.split(/(?<=\s)/);
      words.forEach((w, i) => on(from + Math.floor(((to - from) * i) / words.length), async (pg) => { await journal({ kind: "delta", text: w })(pg); await stream("delta")(pg); }));
    }
    const seconds = span(f0, f1);
    pub(f1, row(seq, at(f0), "model", "The model responded", "done", null, seconds), f0);
    on(f1, stream("commit"));
    on(f1, emit("run", { chat_id: chat, run_id: run, state: "running" }));
    const [inTok, cachedTok, outTok] = use;
    usage.input_tokens += inTok; usage.cached_tokens += cachedTok; usage.output_tokens += outTok; usage.calls += 1;
    usage.generation_seconds = r3(usage.generation_seconds + seconds * 0.8);
    usage.tokens_per_second = Math.round((usage.output_tokens / usage.generation_seconds) * 10) / 10;
    const snapshot = { ...usage, route: "model" };
    usageLog.push({ f: f1, ...snapshot });
    on(f1, emit("usage", { chat_id: chat, id: reply, usage: snapshot }));
    if (messageSaved) on(f1, live("message", chat, { id: reply, usage: snapshot })); // save_usage: the metrics row
    on(f1, async (pg) => { await journal({ kind: "settle", state: "committed", origin: "host" })(pg); await stream("committed")(pg); });
    if (text) {
      const part = tokenText(text);
      on(f1, emit("token", { ...ids, text: part }));
    }
    attempts["a" + n] = seconds;
    return seconds;
  };
  const tool = (seq, f0, f1, name, label, { status = "done", detail = null, blocked = null } = {}) => {
    progress(f0, label, "working", name);
    pub(f0, row(seq, at(f0), "tool", label, "running"));
    pub(f1, row(seq, at(f0), "tool", label, status, null, span(f0, f1), detail), f0);
    if (status === "failed") progress(f1, blocked || detail, "blocked", name);
    else progress(f1, label, "done", name);
  };
  const staged = (toolSeq, approvalSeq, f0, f1, file, actionsAfter) => {
    const label = "Preparing an edit to " + file;
    progress(f0, label, "working", "Edit");
    pub(f0, row(toolSeq, at(f0), "tool", label, "running"));
    sendActions(f1, actionsAfter);
    progress(f1, label, "done", "Edit");
    pub(f1, row(approvalSeq, at(f1), "approval", "Waiting for your approval: " + label, "running"));
    pub(f1, row(toolSeq, at(f0), "tool", label, "done", null, span(f0, f1), "Staged for your approval."), f0);
    return { label, tool: row(toolSeq, at(f0), "tool", label, "done", null, span(f0, f1)), bound: f1 };
  };
  const finish = (f, content, wallFrom) => {
    const saved = { ...usage, route: "model", seconds: Math.round(span(wallFrom, f) * 10) / 10 };
    usageLog.push({ f, ...saved, finish: true });
    on(f, live(messageSaved ? "resave" : "message", chat, { id: reply, role: "assistant", content, run_id: run, usage: saved }));
    on(f, emit("usage", { chat_id: chat, id: reply, usage: saved }));
    on(f, emit("complete", { chat_id: chat, id: reply, seconds: saved.seconds }));
    messageSaved = true;
    return saved;
  };
  const settle = (f, state, extra = {}) => {
    on(f, live("run", chat, { id: run, state, created_t: F(T0), updated_t: F(f), ...extra }));
    on(f, emit("run", { chat_id: chat, run_id: run, state }));
  };
  return { F, r3, at, span, on, ids, progress, pub, record, resend, sendActions, turn, tool, staged, finish, settle, tokenText,
    usageLog, attempts, usage, progressLog };
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

  // The quick chat on Pebble 1.5.0 in v1.5.0's own event order (OVERRIDES §41, fidelity round 2; the trailer's bars
  // 12-13): the companion opens, the question is typed and sent exactly as in pet-live-error (the person's part), and
  // the model's turn runs at the 4,096-token window. Pet.vue shows a reply only from `token` events and has no live
  // stream view, and the runner sends a turn's text in one token event when the turn ends (runner.py V1-081): so the
  // pet says "Thinking" until the answer arrives whole, "Writing" for a moment, then the task completes.
  "pet-live-150": {
    url: "?pet&scene=pet-live&version=1.5.0",
    viewport: { width: 384, height: 456 },
    transparent: true,
    seconds: 9,
    probe: true,
    note: "Pebble 1.5.0's companion (the frozen v1.5.0 tree) driven by scripted host events in v1.5.0's own event order (fidelity round 2): a re-enactment with sample data.",
    async build(page) {
      const chat = "chat-live-pet", run = "run-live-1", reply = "msg-live-pet-reply";
      // click: the pebble opens the quick chat; type: the question, one character every 34 ms; send: Enter; respond: the
      // model's turn ends and its answer arrives; complete: the run completes; idle: the host's idle after its upkeep.
      const K = { click: 18, type: 39, send: 90, queued: 95, running: 99, turn: 102, respond: 195, complete: 198, idle: 216 };
      const question = await fixture(page, "text.petQuestion");
      const answer = await fixture(page, "reply.pet");
      const steps = [], schedule = [];
      const h = host150({ chat, run, reply, T0: K.send, steps, schedule, attemptBase: "d2b4" });
      const { F, span, on, progress, turn, finish, settle } = h;
      on(K.click, (pg) => pg.click(".pet-avatar"));
      typeChars(steps, F(K.type), 0.034, question);
      on(K.send, (pg) => pg.keyboard.press("Enter"));
      on(K.queued, emit("run", { chat_id: chat, run_id: run, state: "queued" }));
      settle(K.running, "running", { elapsed: 0 });
      progress(K.running + 1, "Preparing your local workspace");
      turn({ seq: 128, f0: K.turn, f1: K.respond, text: answer, from: K.turn + 8, to: K.respond - 5, use: [1180, 0, 52] });
      finish(K.respond + 2, answer, K.running);
      on(K.complete - 1, live("active", null, null));
      settle(K.complete, "completed", { elapsed: span(K.running, K.complete), counts: { steps: 1, retries: 0, waited: 0 } });
      on(K.idle, emit("idle", { chat_id: chat, run_id: run }));
      TIMELINES["pet-live-150"].meta = { fidelity_round: 2, K, model: h.attempts, usage: h.usageLog, progress: h.progressLog };
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

  // The trailer's P0 (TRAILER_RESEARCH §6.5 and §9, OVERRIDES §39-§41): the invoice-kit run on Pebble 1.5.0's frontend
  // (capture/freeze-release.py v1.5.0), in v1.5.0's own event order at the sample model's 4,096-token window (fidelity
  // round 2, host150()), with every clock the window prints taken from the recording itself: a row's "+N s" is its own
  // frame's offset from the send (frame 30); a step's "· N s" its own span; the status line's exact time the host's live
  // seconds (fixtures.js clock()); a receipt's time those live seconds and its "waited" the approvals' spans.
  // What v1.5.0 does here, and so what the recording shows:
  //   - Segment 1 (the request): each model turn opens the drawer's live response and ends with its text in one piece;
  //     the model searches and reads, stages the two edits (each card arrives as its edit is staged, and the first opens
  //     the drawer), then writes its proposal; the completion check finds pending approvals ("Checked the reply") and
  //     the run waits for them. Host rows carry no activity class, so the window folds no "Explored" row.
  //   - The edits (9.20 s, 9.70 s): each approve route applies its edit, writes "Applied the edit to …" into the
  //     conversation and answers ("Action completed"); the second also dispatches the run's continuation.
  //   - Segment 2: the resumed run recalls context again ("Recalled 3 memories"), and the model's three turns are each
  //     shown as they end (no turn-end is held at 4K): its summary, then two replies to the completion check's repair
  //     requests, each followed by "Not verified · 2 changed files, no tests run"; the third check holds the run
  //     (14.033 s) with the host's notice, and the reply, saved again, moves after the "Applied …" messages.
  //   - The climax (round 1, OVERRIDES §40): Run tests (17.80 s); the approve route runs the tests for 2.4 s while the
  //     card reads Running; then the result, the summary, "Action completed"; the resumed turn; Verified (22.433 s);
  //     completion (22.50 s).
  // The edits are applied at 9.20 s and 9.70 s, so the 3.5-s "Action completed" toast (App.vue notify; a 0.2-s leave)
  // has gone by 13.45 s, before the held run's shots from 13.6 s. The usage stays under the 4,096-token window. The
  // host's idle follows each settle in the same frame. Frames carry probes (probes.json); timeline.json carries the
  // schedule (meta).
  "main-live-film-150": {
    url: "?scene=live-film&version=1.5.0",
    viewport: { width: 1160, height: 800 },
    transparent: false,
    seconds: 27.5,
    probe: true,
    note: "Pebble 1.5.0's frontend (the frozen v1.5.0 tree) driven by scripted host events and fixture timings in v1.5.0's own event order (fidelity round 2): a re-enactment with sample data. Every clock the window prints is the recording's own.",
    async build(page) {
      const chat = "chat-live-fix", run = "run-live-1", reply = "msg-live-reply";
      // Key frames (30 fps). Segment 1: send, the run (queued, running), the two cards (as each edit is staged), the
      // settle. The edits: p1/p2 (Apply edit), the second also queues the run (queued2) and the runner starts (running2).
      // Segment 2: the drawer scroll to Undo (scroll), the model's text (respond2), the hold. The climax as in round 1:
      // runTheTests, card, runTests, cardScroll, testsEnd, context, resultScroll, stepsScroll, respond, verified, complete.
      const K = { send: 30, queued1: 31, running1: 33, card1: 129, card2: 134, proposal: 174, settle1: 178,
        p1: 276, p2: 291, queued2: 291, running2: 294, scroll: [306, 324], respond2: 360, notice: 418, hold: 421,
        convScroll: [435, 453], runTheTests: 480, card: 484, runTests: 534, cardScroll: [537, 555], testsEnd: 606, context: 609,
        resultScroll: [612, 630], stepsScroll: [648, 666], respond: 672, verified: 673, complete: 675 };
      const STEPS_Y = 380; // where the person brings the newest step (its centre, CSS px of the window)
      // Retake 2b (the lead, after round 2): the person's scroll to the applied card brings its "Undo this edit" to this
      // centre y, so the whole card stays in the window while the drawer's live response grows above it (10.80-14.03 s).
      // Round 2 brought it to where Apply edit had been (y 692), and the card dipped below the window.
      const UNDO_Y = 560;
      const T0 = K.send;
      const request = await fixture(page, "text.request");
      const r = await fixture(page, "reply");
      const diffs = await fixture(page, "diffs");
      const text = await fixture(page, "text");
      const testScope = await fixture(page, "testScope"); // 1.2.0+: the host's reason on the tests/test_dates.py edit
      const steps = [], schedule = [];
      const h = host150({ chat, run, reply, T0, steps, schedule });
      const A = (item) => emit("activity", { chat_id: chat, run_id: run, item });
      const { F, r3, at, span, on, ids, progress, pub, record, resend, sendActions, turn, tool, staged, finish, settle, tokenText } = h;
      const edit = (id, file, baseline, diff, status, extra = {}) => ({ id, chat_id: chat, kind: "edit", status, payload: { path: file, baseline, diff, ...extra } });
      const dates = (status) => edit("act-film-dates", "invoice_kit/dates.py", "9f2c41d07ab3", diffs.dates, status);
      const testsEdit = (status) => edit("act-film-tests", "tests/test_dates.py", "51ab9e2c3d70", diffs.tests, status, testScope);
      const tests = (status, result) => ({ id: "act-tests-1", chat_id: chat, kind: "tests", status,
        payload: { recipe: "pytest", plan: { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
          executable: { realpath: "/Users/maya/Projects/invoice-kit/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } }, ...(result ? { result } : {}) } });
      // pytest's own "in 1.84s" sits inside the 2.4-s test run (the copy and the interpreter's start take the rest).
      const passed = { outcome: "passed", exit_code: 0, tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 },
        snapshot_digest: "c0ffee5a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5", drafts_included: [], output: "..........................................  [100%]\n42 passed in 1.84s" };
      // The run's state changes on the recording's clock (fixtures.js clock(): run_activity's started and elapsed); the
      // run accrues live seconds only while queued or running (the waits for approvals and the approved tests don't).
      const transitions = [[F(T0), "queued"], [F(K.running1), "running"], [F(K.settle1), "waiting_approval"], [F(K.queued2), "queued"],
        [F(K.running2), "running"], [F(K.hold), "verification_required"], [F(K.runTheTests + 2), "waiting_approval"],
        [F(K.testsEnd), "queued"], [F(K.testsEnd), "running"], [F(K.complete), "completed"]];
      const live1 = span(T0, K.settle1), live2 = r3(live1 + span(K.queued2, K.hold)), live3 = r3(live2 + span(K.testsEnd, K.complete));
      // The person's waits on each approval: from its binding (the staged card) to the click.
      const bindDates = K.card1, bindTests = K.card2, bindRun = K.runTheTests + 1;
      const waitDates = span(bindDates, K.p1), waitTests = span(bindTests, K.p2), waitRun = span(bindRun, K.runTests);
      const counts = (n, waited) => ({ steps: n, retries: 0, waited: r3(waited) });
      // Row identities (run_activity.py seq): in the order of the run events that anchor them.
      const S = { context1: 64, a1: 128, grep: 192, read: 256, a2: 320, editDates: 384, okDates: 448, editTests: 512, okTests: 576,
        a3: 640, checked: 704, waiting: 768, context2: 832, a4: 896, check1: 960, a5: 1024, check2: 1088, a6: 1152, check3: 1216,
        incomplete: 1280, heldNote: 1344, heldCall: 1408, heldOk: 1472, heldWaiting: 1600, context3: 1664, a7: 1728, verified: 1856 };

      on(0, live("origin"));
      on(0, live("clock", run, { t0: F(T0), transitions }));
      for (const id of ["act-film-dates", "act-film-tests", "act-tests-1"]) on(0, live("deferApproval", id));
      // The person's request, typed at once (the film shows the typing itself only in the quick chat) and sent.
      on(9, (pg) => pg.type("textarea[aria-label='Message Pebble']", request, { delay: 0 }));
      on(T0, (pg) => pg.keyboard.press("Enter"));
      // ---- Segment 1: app.py send() creates the run and launches it (`run` queued); the runner starts it.
      on(K.queued1, emit("run", { chat_id: chat, run_id: run, state: "queued" }));
      settle(K.running1, "running", { elapsed: 0 });
      progress(34, "Preparing your local workspace");
      progress(36, "Recalled relevant context", "done", null, { memory_count: 3 });
      pub(40, row(S.context1, at(40), "context", "Recalled 3 memories", "done", null, span(K.running1, 40), `Context ready in ${Math.round(span(K.running1, 40) * 1000)} ms`));
      turn({ seq: S.a1, f0: 42, f1: 60, use: [380, 0, 30] }); // its two tool calls, no text
      tool(S.grep, 62, 80, "Grep", "Searching project source");
      tool(S.read, 82, 94, "Read", "Reading invoice_kit/dates.py");
      turn({ seq: S.a2, f0: 96, f1: 124, use: [400, 256, 92] }); // the two edits, no text
      const stagedDates = staged(S.editDates, S.okDates, 126, K.card1, "invoice_kit/dates.py", [dates("pending")]);
      const stagedTests = staged(S.editTests, S.okTests, 131, K.card2, "tests/test_dates.py", [dates("pending"), testsEdit("pending")]);
      turn({ seq: S.a3, f0: 136, f1: K.proposal, text: r.proposedHeld, use: [420, 256, 120] });
      // controller.py completion(): approvals are pending, so the check finds nothing to do (no AgentGuard summary).
      pub(K.proposal + 1, row(S.checked, at(K.proposal + 1), "check", "Checked the reply", "done", null, 0.01));
      finish(K.proposal + 2, r.proposedHeld, K.running1);
      on(K.settle1 - 1, live("active", null, null));
      settle(K.settle1, "waiting_approval", { elapsed: live1, counts: counts(5, 0) });
      pub(K.settle1, row(S.waiting, at(K.settle1), "note", "Waiting for your approval"));
      on(K.settle1, emit("idle", { chat_id: chat, run_id: run }));
      // ---- The edits. The person reads both cards (from 6.00 s), then applies both (App.vue decide(): approve, then
      // get_chat). Each approve route (app.py _approve()) marks its action running, applies it, commits the receipt,
      // writes its summary into the conversation, sends actions and idle and answers; the run's records change with
      // it (the approval "Approved: …" with its wait, the staging call's receipt now the applied one, without "Staged").
      // The second leaves nothing pending, so it also dispatches the continuation before it answers.
      const approveEdit = (f, id, label, toolRow, okSeq, bound, wait, running, applied, summary, dispatch) => {
        on(f, (pg) => pg.click("#details-drawer .action-card.pending .primary-button"));
        sendActions(f, running);
        on(f, async (pg) => {
          await live("actions", chat, applied)(pg);
          await live("hostMessage", chat, { id: "msg-live-" + id, role: "assistant", content: summary })(pg);
        });
        record(f, row(okSeq, at(bound), "approval", "Approved: " + label, "done", null, wait), bound);
        record(f, toolRow, Math.round(toolRow.at * 30) + T0);
        on(f, emit("actions", { chat_id: chat, actions: applied }));
        on(f, live("active", null, null));
        on(f, emit("idle", { chat_id: chat, run_id: run }));
        if (dispatch) dispatch();
        on(f, live("finishApproval", chat, id, applied.find((a) => a.id === id)));
      };
      approveEdit(K.p1, "act-film-dates", stagedDates.label, stagedDates.tool, S.okDates, bindDates, waitDates,
        [dates("running"), testsEdit("pending")], [dates("applied"), testsEdit("pending")], text.appliedDates, null);
      approveEdit(K.p2, "act-film-tests", stagedTests.label, stagedTests.tool, S.okTests, bindTests, waitTests,
        [dates("applied"), testsEdit("running")], [dates("applied"), testsEdit("applied")], text.appliedTests, () => {
          on(K.p2, live("active", chat, run));
          settle(K.queued2, "queued", { elapsed: live1 });
        });
      // ---- Segment 2: the runner resumes the run; its first progress publishes the rows the window hasn't had.
      settle(K.running2, "running", { elapsed: live1 });
      progress(295, "Preparing your local workspace");
      on(295, async (pg) => {
        const rows = await pg.evaluate((id) => window.__pebble.world.live.items(id), run);
        for (const item of rows.filter((i) => [S.editDates, S.okDates, S.editTests, S.okTests].includes(i.seq))) await A(item)(pg);
      });
      progress(296, "Recalled relevant context", "done", null, { memory_count: 3 });
      progress(297, "Resumed committed context", "done");
      pub(297, row(S.context2, at(297), "context", "Recalled 3 memories", "done", null, span(K.running2, 297), `Context ready in ${Math.round(span(K.running2, 297) * 1000)} ms`));
      // The person scrolls the drawer to the applied card, so its "Undo this edit" sits at UNDO_Y; the end follows the
      // card while rows arrive.
      on(K.scroll[0] - 1, (pg) => pg.evaluate((y) => (window.__film = { ...(window.__film || {}), undoY: y }), UNDO_Y));
      followScroll(steps, K.scroll[0], K.scroll[1], "#details-drawer .details-panel", "#details-drawer .undo-button", "undoY");
      const check = (seq, f) => {
        // controller.py completion(): AgentGuard's summary (completion_gate), then the check row with its verdict
        pub(f, row(seq, at(f), "check", "Not verified · 2 changed files, no tests run", "done", null, 0.02, "1 item to resolve"));
      };
      turn({ seq: S.a4, f0: 299, f1: K.respond2, text: r.continueHeld, use: [680, 512, 70] });
      check(S.check1, K.respond2 + 1);
      progress(K.respond2 + 1, "Collecting missing completion evidence", "review", null, { repair: 1 });
      turn({ seq: S.a5, f0: 363, f1: 383, text: r.repairHeld[0], use: [660, 512, 18] });
      check(S.check2, 384);
      progress(384, "Collecting missing completion evidence", "review", null, { repair: 2 });
      turn({ seq: S.a6, f0: 386, f1: K.notice - 1, text: r.repairHeld[1], use: [660, 512, 22] });
      check(S.check3, K.notice);
      on(K.notice, emit("token", { ...ids, text: tokenText("\n\n" + text.heldNoticeText) }));
      const heldText = r.proposedHeld + "\n" + r.continueHeld + "\n" + r.repairHeld[0] + "\n" + r.repairHeld[1] + "\n\n\n" + text.heldNoticeText;
      finish(K.notice + 1, heldText, K.running2);
      on(K.hold - 1, live("active", null, null));
      settle(K.hold, "verification_required", { error: text.heldIssue, elapsed: live2, counts: counts(8, waitDates + waitTests) });
      pub(K.hold, row(S.incomplete, at(K.hold), "note", "Verification remains incomplete"));
      on(K.hold, emit("idle", { chat_id: chat, run_id: run }));
      // The held row (RunPanel) sits under the reply: the person scrolls it into view.
      scrollToEnd(steps, F(K.convScroll[0]), F(K.convScroll[1]), ".conversation-scroll", 30);
      // ---- Run the tests (controller.py held() 'tests'): the mock adds the decision note, the host's own RunTests call
      // that stages the recipe (done one frame later, "Staged for your approval."), the approval bound to it and the state
      // note, each at its own time; the "Run isolated tests" card arrives through the normal approval. Nothing publishes
      // these rows: the window reads them when the run resumes (20.20 s).
      on(K.runTheTests, (pg) => pg.click(".run-held button:first-child"));
      schedule.push({ f: K.runTheTests, made: K.runTheTests, seq: S.heldNote, kind: "note", label: "You asked Pebble to run the tests", status: "done", at: at(K.runTheTests), duration: null, by: "mock" },
        { f: bindRun, made: K.runTheTests, seq: S.heldCall, kind: "tool", label: "Requesting isolated tests", status: "done", at: at(K.runTheTests), duration: span(K.runTheTests, bindRun), by: "mock" },
        { f: K.runTheTests, made: bindRun, seq: S.heldOk, kind: "approval", label: "Waiting for your approval: Requesting isolated tests", status: "running", at: at(bindRun), duration: null, by: "mock" },
        { f: K.runTheTests, made: bindRun + 1, seq: S.heldWaiting, kind: "note", label: "Waiting for your approval", status: "done", at: at(bindRun + 1), duration: null, by: "mock" });
      on(K.runTheTests + 3, emit("run", { chat_id: chat, run_id: run, state: "waiting_approval" }));
      sendActions(K.card, [dates("applied"), testsEdit("applied"), tests("pending")]);
      // The announced card takes keyboard focus (App.vue announceApprovals); the pointer moves on, so no focus ring.
      on(K.card, (pg) => pg.evaluate(() => document.activeElement?.blur()));
      // ---- Run tests (17.80 s): the approve route runs the tests (app.py _approve(): the action 'running' and an
      // actions event, perform_action(), then commit_action()). The card reads Running in Earlier actions for exactly
      // 2.4 s; the run stays waiting_approval and no progress, activity or run event is sent while the tests run.
      on(K.runTests, (pg) => pg.click("#details-drawer .action-card.pending .primary-button"));
      sendActions(K.runTests, [dates("applied"), testsEdit("applied"), tests("running")]);
      on(K.runTests, live("active", chat, run));
      // The card is now the drawer's last: the person scrolls down to it.
      scrollToEnd(steps, F(K.cardScroll[0]), F(K.cardScroll[1]), "#details-drawer .details-panel", 30);
      // The tests end (20.20 s): the receipt, the summary in the conversation, the run's records (the approval now
      // "Approved: …" with its wait; the staging call's receipt the applied one), actions and idle; the continuation is
      // dispatched (run queued, the runner's run running) and the route answers ("Action completed").
      const approvedRun = row(S.heldOk, at(bindRun), "approval", "Approved: Requesting isolated tests", "done", null, waitRun);
      const stagedCall = row(S.heldCall, at(K.runTheTests), "tool", "Requesting isolated tests", "done", null, span(K.runTheTests, bindRun));
      record(K.testsEnd, approvedRun, bindRun);
      on(K.testsEnd, async (pg) => {
        await live("actions", chat, [dates("applied"), testsEdit("applied"), tests("applied", passed)])(pg);
        await live("hostMessage", chat, { id: "msg-live-tests-summary", role: "assistant", content: text.testsSummary })(pg);
        await live("publish", run, stagedCall)(pg);
      });
      on(K.testsEnd, emit("actions", { chat_id: chat, actions: [dates("applied"), testsEdit("applied"), tests("applied", passed)] }));
      on(K.testsEnd, live("active", null, null));
      on(K.testsEnd, emit("idle", { chat_id: chat, run_id: run }));
      on(K.testsEnd, live("active", chat, run));
      settle(K.testsEnd, "queued", { elapsed: live2 });
      settle(K.testsEnd, "running", { elapsed: live2 });
      on(K.testsEnd, live("finishApproval", chat, "act-tests-1", tests("applied", passed)));
      // ---- The resumed run: its first progress publishes the rows the window hasn't had; it recalls context again;
      // then one model turn, and the completion check on it.
      progress(K.testsEnd + 1, "Preparing your local workspace");
      on(K.testsEnd + 1, async (pg) => {
        const rows = await pg.evaluate((id) => window.__pebble.world.live.items(id), run);
        for (const item of rows.filter((i) => i.seq >= S.heldNote)) await A(item)(pg);
      });
      progress(K.testsEnd + 2, "Recalled relevant context", "done", null, { memory_count: 3 });
      progress(K.context, "Resumed committed context", "done");
      pub(K.context, row(S.context3, at(K.context), "context", "Recalled 3 memories", "done", null, span(K.testsEnd, K.context), `Context ready in ${Math.round(span(K.testsEnd, K.context) * 1000)} ms`));
      turn({ seq: S.a7, f0: K.context, f1: K.respond, text: r.continueVerified, from: K.context + 9, to: K.respond - 3, use: [720, 640, 48] });
      // The completion check runs on the finished turn (runner.py: controller.completion(), record_check()).
      pub(K.verified, row(S.verified, at(K.verified), "check", "Verified · pytest 42 passed on current files", "done", null, 0.01));
      const finalText = heldText + "\n" + r.continueVerified;
      finish(K.complete - 1, finalText, K.testsEnd);
      on(K.complete - 1, live("active", null, null));
      settle(K.complete, "completed", { elapsed: live3, counts: counts(10, waitDates + waitTests + waitRun) });
      on(K.complete, emit("idle", { chat_id: chat, run_id: run }));
      // The person reads the result (the card grew below the fold), then scrolls back up to the newest steps, where the
      // model's turn runs and the completion check arrives. The first scroll runs while rows arrive above the view.
      scrollEaseToEnd(steps, K.resultScroll[0], K.resultScroll[1], "#details-drawer .details-panel");
      on(K.stepsScroll[0] - 1, (pg) => pg.evaluate((y) => (window.__film = { ...(window.__film || {}), stepsY: y }), STEPS_Y));
      followScroll(steps, K.stepsScroll[0], K.stepsScroll[1], "#details-drawer .details-panel", "#drawer-thinking .thinking-steps > li:last-child", "stepsY");
      // A check on the mock's own rows for the held decision, which the window reads when the run resumes.
      on(K.runTheTests + 20, async (pg) => {
        const rows = await pg.evaluate((id) => window.__pebble.world.live.items(id), run);
        const seen = Object.fromEntries(rows.filter((i) => i.seq >= S.heldNote && i.seq <= S.heldWaiting).map((i) => [i.seq, i.at]));
        if (seen[S.heldNote] !== at(K.runTheTests) || seen[S.heldCall] !== at(K.runTheTests) || seen[S.heldOk] !== at(bindRun) || seen[S.heldWaiting] !== at(bindRun + 1))
          throw new Error("the held decision's rows are not where the schedule says: " + JSON.stringify(seen));
      });
      TIMELINES["main-live-film-150"].meta = { fidelity_round: 2, retake: "2b", undoY: UNDO_Y, T0, K, transitions, live: [live1, live2, live3],
        settles: [K.settle1, K.hold, K.complete], waits: { dates: waitDates, tests: waitTests, run: waitRun },
        bind: { dates: bindDates, tests: bindTests, run: bindRun }, model: h.attempts, usage: h.usageLog, schedule,
        testsRunning: [K.runTests, K.testsEnd], progress: h.progressLog };
      return steps;
    },
  },

  // The trailer's P2 (TRAILER_RESEARCH §9, bar 20): AgentGuard's scope challenge in motion, on Pebble 1.5.0's frontend.
  // The run of capture.mjs playChallenge (Auto in project: reads, the in-scope edit, five edits outside the task's
  // reach), played on the clock in v1.5.0's own event order at the 4,096-token window (fidelity round 2, host150()):
  // each model turn opens the drawer's live response (tool calls only, so its text stays empty), host rows carry no
  // activity class (no "Explored" fold), the edits apply without cards (Auto in project: app.py propose() runs them and
  // sends one actions event each, and writes no conversation message), and the next write is refused: its step fails
  // with the engine's own words as its error (app.py execute(): a completed {'error'} receipt; vendored
  // validate/checks.py scope_creep(), challenge/renderer.py render(), guard.py refusal(); OVERRIDES §9: five files, the
  // fixture's CHALLENGE). The model's next turn starts at once. The person then opens the step's Details.
  // As in main-live-film-150, every "+N s" and "· N s" is the recording's own (the send is frame 30).
  "main-challenge-live": {
    url: "?scene=challenge&drawer=520&version=1.5.0",
    viewport: { width: 1160, height: 800 },
    transparent: false,
    seconds: 12.5,
    probe: true,
    note: "Pebble 1.5.0's frontend (the frozen v1.5.0 tree) driven by scripted host events and fixture timings in v1.5.0's own event order (fidelity round 2): a re-enactment with sample data. Every clock the window prints is the recording's own.",
    async build(page) {
      const chat = "chat-pdf-dates", run = "run-live-1", reply = "msg-live-challenge";
      // refused: the write's tool step (it fails on its own frame f1); details: the person opens them; scroll: the person
      // brings the whole challenge into view, which then holds still to the end (12.5 s)
      const K = { send: 30, running: 33, refused: [229, 232], details: 270, scroll: [282, 297] };
      const T0 = K.send;
      const request = await fixture(page, "text.challengeRequest");
      const challenge = await fixture(page, "text.challenge");
      const steps = [], schedule = [];
      const h = host150({ chat, run, reply, T0, steps, schedule, attemptBase: "c7e1" });
      const { F, at, span, on, progress, pub, turn, tool, settle } = h;
      on(0, live("origin"));
      const transitions = [[F(T0), "queued"], [F(K.running), "running"]];
      on(0, live("clock", run, { t0: F(T0), transitions }));
      on(9, (pg) => pg.type("textarea[aria-label='Message Pebble']", request, { delay: 0 }));
      on(T0, (pg) => pg.keyboard.press("Enter"));
      on(31, emit("run", { chat_id: chat, run_id: run, state: "queued" }));
      settle(K.running, "running", { elapsed: 0 });
      progress(34, "Preparing your local workspace");
      progress(36, "Recalled relevant context", "done", null, { memory_count: 3 });
      pub(40, row(64, at(40), "context", "Recalled 3 memories", "done", null, span(K.running, 40), `Context ready in ${Math.round(span(K.running, 40) * 1000)} ms`));
      turn({ seq: 128, f0: 42, f1: 78, use: [410, 0, 41] }); // its three tool calls, no text
      tool(192, 80, 95, "Grep", "Searching project source");
      tool(256, 97, 103, "Read", "Reading invoice_kit/pdf.py");
      tool(320, 105, 111, "Read", "Reading invoice_kit/dates.py");
      turn({ seq: 384, f0: 113, f1: 167, use: [560, 256, 180] }); // its seven edits, no text
      // Auto in project: each edit applies without a card (app.py propose(): automatic, one actions event once applied).
      const files = ["invoice_kit/pdf.py", "invoice_kit/templates/invoice.html", "invoice_kit/templates/receipt.html", "invoice_kit/static/invoice.css", "docs/billing.md", "README.md"];
      const actions = [];
      files.forEach((file, i) => {
        const f0 = 169 + i * 10, f1 = f0 + 9;
        const action = { id: "act-pdf-" + i, chat_id: chat, kind: "edit", status: "applied", payload: { path: file, baseline: (0x5a1e00 + i * 7919).toString(16) + "c0de12", diff: "@@ -1 +1 @@\n-…\n+…" } };
        on(f1, async (pg) => { actions.push(action); await live("actions", chat, [...actions])(pg); await emit("actions", { chat_id: chat, actions: [...actions] })(pg); });
        tool(448 + i * 64, f0, f1, "Edit", "Preparing an edit to " + file);
      });
      // The next write, outside the task's reach, is refused before it runs; the step's error is AgentGuard's challenge.
      tool(832, K.refused[0], K.refused[1], "Edit", "Preparing an edit to invoice_kit/templates/statement.html", { status: "failed", detail: challenge });
      // The model's next turn starts at once (the run continues; this recording ends before it does).
      turn({ seq: 896, f0: K.refused[1] + 2, f1: null });
      // The person opens the refused step's Details, then scrolls the drawer a little so all of it is in view.
      on(K.details, (pg) => pg.click("#details-drawer .thinking-step.failed .thinking-detail summary"));
      scrollPanel(steps, F(K.scroll[0]), F(K.scroll[1]), "#details-drawer .details-panel", "#details-drawer .thinking-step.failed", { pick: "first", y: 430 }, 30);
      TIMELINES["main-challenge-live"].meta = { fidelity_round: 2, T0, K, transitions, schedule, model: h.attempts, usage: h.usageLog, progress: h.progressLog };
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
  const probes = [], texts = {}, lastProbe = {};
  let next = 0, saved = 0, atIndex = 0;
  for (let frame = 0; frame < (AT ? Math.round(lastAt * FPS) + 1 : total); frame++) {
    const t = frame / FPS;
    while (next < steps.length && steps[next][0] <= t) await steps[next++][1](page);
    await page.evaluate((ms) => window.__pebbleClock.advance(ms), 1000 / FPS);
    if (spec.probe) {
      const values = await probeFrame(page), delta = {};
      for (const [key, value] of Object.entries(values)) {
        const s = JSON.stringify(value);
        if (lastProbe[key] !== s) (delta[key] = value), (lastProbe[key] = s);
      }
      if (Object.keys(delta).length) probes.push({ f: frame, ...delta });
      if (frame % TEXT_EVERY === 0 || TEXT_AT.has(frame)) texts[frame] = await visibleLines(page);
    }
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
  if (spec.probe) fs.writeFileSync(path.join(OUT, "probes.json"), JSON.stringify({ name: NAME, theme: THEME, fps: FPS, keys: "per-frame deltas (CSS px: left, top, width, height)", probes, texts }));
  const unhandled = await page.evaluate(() => window.__pebble.unhandled.map((u) => u.method || u.cmd));
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ name: NAME, theme: THEME, fps: FPS, scale: SCALE, frames: saved, from: FROM || null, at: AT, hide: HIDE || null, ...(spec.note ? { note: spec.note } : {}), unhandled, problems, ...(frames.length ? { cursor: frames } : {}), ...(spec.meta ? { meta: spec.meta } : {}) }, null, 1));
  const seconds = (Date.now() - started) / 1000;
  console.log(`${NAME} [${THEME}] ${saved} ${AT ? "stills" : "frames"} at ${FPS} fps, ${SCALE}x, in ${seconds.toFixed(1)} s -> ${OUT}; unhandled IPC calls ${unhandled.length}${unhandled.length ? " (" + unhandled.join(",") + ")" : ""}; page errors ${problems.length}${problems.length ? ": " + problems.join(" | ") : ""}`);
  if (unhandled.length || problems.length) exitCode = 1;
} finally {
  await browser.close();
}
process.exitCode = exitCode;
