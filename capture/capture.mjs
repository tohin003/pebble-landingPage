// Capture Pebble's real UI (served by serve.mjs with demo fixtures) as PNG stills, in light and dark themes.
// Uses the installed Google Chrome (no browser download) through puppeteer-core, with a throwaway profile folder.
// Usage: node capture.mjs [scene-name-filter ...] [--exact] [--themes=light,dark] [--scale=2[,3]]
//          [--base=http://127.0.0.1:5199/] [--locale=en-GB] [--tz=Europe/London]
//          [--out=DIR]          where the PNGs go (default: capture/shots, inside the landing repo; never the Pebble repo)
//          [--naming=video]     name files <scene>[-<step>]@<scale>x.png (one theme only), as video/public/ui/ expects;
//                               the default is <scene>[-<step>]-<theme>.png at 2x and <scene>[-<step>]-<theme>@<scale>x.png
//          [--record]           also save every repainted frame (CDP screencast) to frames/ (1x; prefer record.mjs)
// Filters match scene names by substring (or exactly with --exact). Ends with a SUMMARY line and exits 1 if any run had
// an unhandled IPC call, an error banner or a console error. The per-run JSON report goes to capture/logs/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const BASE = opt("base", "http://127.0.0.1:5199/");
const THEMES = opt("themes", "light,dark").split(",");
const SCALES = opt("scale", "2").split(",").map(Number);
const FILTERS = args.filter((a) => !a.startsWith("--"));
const EXACT = args.includes("--exact");
const LOCALE = opt("locale", "");
const TZ = opt("tz", "");
const RECORD = args.includes("--record");
const NAMING = opt("naming", "default");
const OUT = path.resolve(opt("out", path.join(HERE, "shots")));
const LOGS = path.join(HERE, "logs");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });
if (NAMING === "video" && THEMES.length !== 1) throw new Error("--naming=video takes exactly one theme (--themes=light)");

const MAIN = { width: 1160, height: 800 }; // src-tauri/tauri.conf.json main window
const WIDE = { width: 1440, height: 900 }; // the same window, resized larger (marketing framing)
const PET = { collapsed: { width: 112, height: 112 }, status: { width: 176, height: 136 }, expanded: { width: 384, height: 456 }, sidebar: { width: 744, height: 576 } }; // main.rs pet_expand

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function settle(page, ms = 700) {
  await page.evaluate(() => document.fonts.ready);
  await pause(ms);
}
// Click the first element matching `selector` (whose text contains `text`, when given).
async function click(page, selector, { text, timeout = 5000 } = {}) {
  if (text) {
    const handle = await page.waitForFunction(
      (sel, words) => [...document.querySelectorAll(sel)].find((el) => el.textContent.replace(/\s+/g, " ").includes(words)),
      { timeout },
      selector,
      text,
    );
    await handle.asElement().click();
  } else {
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.click(selector);
  }
}
const emit = (page, event, data) => page.evaluate((e, d) => window.__pebble.emit(e, d), event, data);
const live = (page, fn, ...rest) => page.evaluate((name, list) => window.__pebble.world.live[name](...list), fn, rest);
const fixture = (page, getter) => page.evaluate(`window.__pebble.world.live.${getter}`);
const scrollEnd = (page, selector) => page.evaluate((sel) => document.querySelectorAll(sel).forEach((el) => (el.scrollTop = el.scrollHeight)), selector);
async function stream(page, chatId, runId, id, text, pieces = 8, gap = 140) {
  const words = text.split(/(?<=\s)/);
  const size = Math.ceil(words.length / pieces);
  for (let i = 0; i < words.length; i += size) {
    await emit(page, "token", { chat_id: chatId, run_id: runId, id, text: words.slice(i, i + size).join("") });
    await pause(gap);
  }
}
// One activity row, as the host's `activity` event carries it (run_activity.py item shape).
const row = (seq, at, kind, label, status = "done", activity = null, duration = null, detail = null) => ({ seq, at, kind, label, status, activity, duration, detail });

// A clip rectangle (CSS px) around the union of the elements matching `selectors`, padded ({x, y} or one number) and
// kept inside the viewport and, with `within`, inside that element (a modal's visible box, for example).
// A selector wrapped in first() counts only its first match.
async function region(page, selectors, { pad = 16, within = null } = {}) {
  const specs = selectors.map((s) => (typeof s === "string" ? { sel: s, one: false } : s));
  const padding = typeof pad === "number" ? { x: pad, y: pad } : pad;
  return page.evaluate(
    (list, padding, inside) => {
      const found = list.flatMap(({ sel, one }) => {
        const all = [...document.querySelectorAll(sel)];
        return one ? all.slice(0, 1) : all;
      });
      const boxes = found.map((el) => el.getBoundingClientRect()).filter((b) => b.width && b.height);
      if (!boxes.length) throw new Error("no visible element for " + list.map((s) => s.sel).join(", "));
      const x0 = Math.min(...boxes.map((b) => b.left)), y0 = Math.min(...boxes.map((b) => b.top));
      const x1 = Math.max(...boxes.map((b) => b.right)), y1 = Math.max(...boxes.map((b) => b.bottom));
      const box = inside ? document.querySelector(inside)?.getBoundingClientRect() : null;
      const lim = box ? { l: box.left, t: box.top, r: box.right, b: box.bottom } : { l: 0, t: 0, r: innerWidth, b: innerHeight };
      const x = Math.max(lim.l, 0, Math.floor(x0 - padding.x)), y = Math.max(lim.t, 0, Math.floor(y0 - padding.y));
      const right = Math.min(lim.r, innerWidth, Math.ceil(x1 + padding.x)), bottom = Math.min(lim.b, innerHeight, Math.ceil(y1 + padding.y));
      return { x: Math.ceil(x), y: Math.ceil(y), width: Math.floor(right - Math.ceil(x)), height: Math.floor(bottom - Math.ceil(y)) };
    },
    specs,
    padding,
    within,
  );
}
const first = (selector) => ({ sel: selector, one: true });

// ---- shared scene steps ------------------------------------------------------------------------------------------
async function loadVerdict(page) {
  const receipt = ".message.assistant.latest .thinking-summary";
  await click(page, receipt);
  await settle(page, 400);
  await click(page, receipt);
  await scrollEnd(page, ".conversation-scroll");
  await settle(page, 600);
}
// A card that just announced itself takes keyboard focus (App.vue announceApprovals); clear the focus ring for stills.
const blur = (page) => page.evaluate(() => document.activeElement?.blur());
async function openSettings(page, tab) {
  if (tab === "permissions") await click(page, ".permission-label");
  else {
    await click(page, ".profile");
    if (tab && tab !== "models") await click(page, '[role="tab"]', { text: tab });
  }
  await settle(page, 900);
}
// ---- 1.1.0: Stealth Lockdown, in Settings › Privacy and focus (App.vue, the section after Usage telemetry) -------
const PRIVACY = ".modal .settings-section:has(.stealth-card)";
// Scroll the Settings dialog until the Privacy and focus section sits in the middle of its visible height, as a
// person scrolls to it. The dialog's title scrolls away with its content (it isn't sticky).
async function scrollToPrivacy(page) {
  await page.evaluate((sel) => {
    const modal = document.querySelector(".modal"), section = document.querySelector(sel);
    const m = modal.getBoundingClientRect(), s = section.getBoundingClientRect();
    modal.scrollTop += Math.round(s.top + s.height / 2 - (m.top + m.height / 2));
  }, PRIVACY);
  await settle(page, 500);
}
// The switch, as a person clicks it (App.vue stealth(): the setting, then the shell's stealth_set); the pointer moves
// on, so there is no hover or focus ring, and the avatars finish the Veil's cast (stealthVeil.ts ACTIVATE, 1.25 s).
async function stealthSwitch(page) {
  await click(page, `${PRIVACY} .stealth-card button[role="switch"]`);
  await page.mouse.move(2, 2);
  await blur(page);
  await settle(page, 1800);
}
// The switch glows by CSS animation on the compositor's clock (style.css: stealth-breathe and stealth-spin while off;
// stealth-breathe-on, stealth-sheen and a slower stealth-spin while on). Stop those animations at one instant of
// their cycle, so light and dark, and every retake, show the same moment of the same glow.
const GLOW_AT = { off: { "stealth-breathe": 1400, "stealth-spin": 900 }, on: { "stealth-breathe-on": 1800, "stealth-sheen": 1500, "stealth-spin": 1900 } };
async function holdGlow(page, state) {
  const held = await page.evaluate((times) => {
    let n = 0;
    for (const a of document.getAnimations()) {
      if (!(a.animationName in times)) continue;
      a.pause();
      a.currentTime = times[a.animationName];
      n++;
    }
    return n;
  }, GLOW_AT[state]);
  if (!held) throw new Error("the Stealth Lockdown switch has no running glow animation to hold");
  await settle(page, 300);
}
async function privacy(page, state) {
  await openSettings(page, "models");
  await page.mouse.move(2, 2); // the same pointer in both states
  await scrollToPrivacy(page);
  if (state === "on") await stealthSwitch(page);
  await holdGlow(page, state);
}
// The section alone, padded: its label, the card, the honest line and the two halves. The card overhangs the
// dialog's content by 12 pt (style.css .stealth-card), so 12 pt more reaches within 2 pt of the dialog's edge
// without taking in its border.
const privacyClip = (page) => region(page, [`${PRIVACY} > .section-label`, `${PRIVACY} .stealth-card`, `${PRIVACY} .stealth-honest`, `${PRIVACY} .stealth-halves`], { pad: { x: 12, y: 14 }, within: ".modal" });

// The "Your preferences" record the film and loop L7 forget (third in the list, so it is on screen before and after).
const FORGET_RECORD = "Uses metric units and 24-hour times.";
async function forgetRecord(page, words) {
  await click(page, `#memory-records button[aria-label="Forget this memory: ${words}"]`);
  await page.mouse.move(2, 2); // the pointer moves on: no hover left on the record that slid up under it
  await settle(page, 900);
}
// The held task's "Run the tests": the host stages the covering recipe for approval and announces it (controller.py
// held() -> _held_tests(): a 'run' event with waiting_approval, then an 'actions' event).
async function runHeldTests(page) {
  await click(page, ".run-held button", { text: "Run the tests" });
  await settle(page, 400);
  const chat = "chat-invoice-fix";
  await emit(page, "run", { chat_id: chat, run_id: "run-fix-2", state: "waiting_approval" });
  const actions = await page.evaluate(async () => (await window.__pebble.world.rpc("get_chat", { id: "chat-invoice-fix" })).actions);
  await emit(page, "actions", { chat_id: chat, actions });
  await settle(page, 1200);
}
// The scope-challenge run, played live in Auto in project: reads, the in-scope edit, five drifting edits, then the sixth
// write refused by AgentGuard (the step's error is the engine's challenge). The model is then still working.
async function playChallenge(page) {
  const chat = "chat-pdf-dates", run = "run-live-1";
  const request = await fixture(page, "text.challengeRequest");
  const challenge = await fixture(page, "text.challenge");
  await page.type("textarea[aria-label='Message Pebble']", request, { delay: 0 });
  await page.keyboard.press("Enter");
  await settle(page, 300);
  await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
  await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
  const add = (r) => emit(page, "activity", { chat_id: chat, run_id: run, item: r });
  const progress = (tool, activity, label, kind = "working") => emit(page, "progress", { chat_id: chat, run_id: run, kind, tool, activity, label });
  await add(row(0, 0.2, "context", "Recalled 3 memories", "done", null, 0.21, "Context ready in 210 ms"));
  await add(row(32, 0.4, "model", "The model responded", "done", null, 1.4, "Headers after 0.3 s; first text after 0.8 s."));
  await add(row(64, 1.9, "tool", "Searching project source", "done", "searching", 0.5));
  await add(row(128, 2.6, "tool", "Reading invoice_kit/pdf.py", "done", "reading", 0.2));
  await add(row(192, 3.1, "tool", "Reading invoice_kit/dates.py", "done", "reading", 0.2));
  const edits = ["invoice_kit/pdf.py", "invoice_kit/templates/invoice.html", "invoice_kit/templates/receipt.html", "invoice_kit/static/invoice.css", "docs/billing.md", "README.md"];
  const at = [9.8, 14.0, 17.2, 20.5, 24.1, 27.9];
  const actions = [];
  // runner.py: progress(label, tool=name) before each tool and progress(label, "done", tool=name) after it; a refused
  // call ends with progress(message, "blocked", tool=name), which puts the companion back to Thinking.
  for (const [i, file] of edits.entries()) {
    await progress("Edit", "editing", "Preparing an edit to " + file);
    await add(row(256 + i * 64, at[i], "tool", "Preparing an edit to " + file, "done", "editing", 0.3));
    await progress("Edit", "editing", "Preparing an edit to " + file, "done");
    actions.push({ id: "act-pdf-" + i, chat_id: chat, kind: "edit", status: "applied", payload: { path: file, baseline: (0x5a1e00 + i * 7919).toString(16) + "c0de12", diff: "@@ -1 +1 @@\n-…\n+…" } });
  }
  await live(page, "actions", chat, actions);
  await emit(page, "actions", { chat_id: chat, actions });
  const refused = "invoice_kit/templates/statement.html";
  await progress("Edit", "editing", "Preparing an edit to " + refused);
  await add(row(640, 31.0, "tool", "Preparing an edit to " + refused, "failed", "editing", 0.1, challenge));
  await progress("Edit", "editing", challenge, "blocked");
  await add(row(704, 31.2, "model", "Waiting for the model", "running"));
  await settle(page, 1200);
}

// ---- scenes ------------------------------------------------------------------------------------------------------
// run(page, shot): interactions; call shot(step?, {clip}) for each frame. Without run, one shot after load.
const SCENES = [
  { name: "main-welcome", query: "scene=welcome", viewport: MAIN },
  { name: "main-approval", query: "scene=approval", viewport: MAIN },
  { name: "main-approval-wide", query: "scene=approval&drawer=500", viewport: WIDE },
  {
    name: "main-done", query: "scene=done", viewport: MAIN,
    run: async (page, shot) => {
      // Open and close the receipt above the final reply: it loads run_activity, so the AgentGuard verdict line
      // ("Verified · pytest 42 passed on current files") shows under the receipt, as after a live run.
      const receipt = ".message.assistant.latest .thinking-summary, .message.assistant.latest button[aria-expanded]";
      await click(page, receipt);
      await settle(page, 600);
      await shot("timeline");
      await click(page, receipt);
      await scrollEnd(page, ".conversation-scroll");
      await settle(page, 600);
      await shot();
    },
  },
  {
    name: "main-done-wide", query: "scene=done", viewport: WIDE,
    run: async (page, shot) => {
      const receipt = ".message.assistant.latest .thinking-summary";
      await click(page, receipt);
      await settle(page, 400);
      await click(page, receipt);
      await scrollEnd(page, ".conversation-scroll");
      await settle(page, 600);
      await shot();
    },
  },
  { name: "settings-models", query: "scene=settings-permissions", viewport: MAIN, run: async (page, shot) => { await openSettings(page, "models"); await shot(); } },
  { name: "settings-skills", query: "scene=settings-permissions", viewport: MAIN, run: async (page, shot) => { await openSettings(page, "Skills"); await shot(); } },
  { name: "settings-permissions", query: "scene=settings-permissions", viewport: MAIN, run: async (page, shot) => { await openSettings(page, "permissions"); await shot(); } },
  {
    // C8: proof 6 is a match cut on the click that moves the selection to Auto in project.
    name: "settings-permissions-auto", query: "scene=settings-permissions", viewport: MAIN,
    run: async (page, shot) => { await openSettings(page, "permissions"); await click(page, "#permission-mode-auto"); await settle(page, 900); await shot(); },
  },
  { name: "settings-memory", query: "scene=settings-memory", viewport: MAIN, run: async (page, shot) => { await openSettings(page, "Memory"); await shot(); } },
  // 1.1.0: Settings › Privacy and focus, Stealth Lockdown off, then switched on (the page's Stealth section).
  { name: "settings-privacy-wide", query: "scene=settings-permissions", viewport: WIDE, run: async (page, shot) => { await privacy(page, "off"); await shot(); } },
  { name: "settings-privacy-on-wide", query: "scene=settings-permissions", viewport: WIDE, run: async (page, shot) => { await privacy(page, "on"); await shot(); } },
  // The section alone; the clip is measured once, before the switch, so both states share one frame.
  { name: "crop-privacy-card", query: "scene=settings-permissions", viewport: WIDE, run: async (page, shot) => { await privacy(page, "off"); await shot("", { clip: await privacyClip(page) }); } },
  {
    name: "crop-privacy-card-on", query: "scene=settings-permissions", viewport: WIDE,
    run: async (page, shot) => {
      await openSettings(page, "models");
      await page.mouse.move(2, 2);
      await scrollToPrivacy(page);
      const clip = await privacyClip(page);
      await stealthSwitch(page);
      const after = await privacyClip(page);
      if (after.height > clip.height) throw new Error(`the section grew when switched on (${clip.height} -> ${after.height} pt): the shared clip would cut it`);
      await holdGlow(page, "on");
      await shot("", { clip });
    },
  },
  {
    // Loop L7 / film proof 7: the same screen after Forget on one "Your preferences" record (memory_delete).
    name: "settings-memory-forgotten", query: "scene=settings-memory", viewport: MAIN,
    run: async (page, shot) => { await openSettings(page, "Memory"); await forgetRecord(page, FORGET_RECORD); await shot(); },
  },
  {
    name: "main-dashboard", query: "scene=dashboard", viewport: WIDE,
    run: async (page, shot) => {
      await click(page, ".artifact-links button", { text: "Open dashboard" });
      await settle(page, 900);
      // Widen the canvas the way a person does: its resizer takes ArrowLeft in 30 px steps (ArtifactPanel.vue).
      await page.focus(".canvas-resizer");
      for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowLeft");
      await page.evaluate(() => document.activeElement?.blur());
      await settle(page, 1200);
      await shot();
    },
  },
  {
    // The dashboard in the standard window, for the README (1600-2400 px wide at 2x).
    name: "main-dashboard-main", query: "scene=dashboard", viewport: MAIN,
    run: async (page, shot) => {
      await click(page, ".artifact-links button", { text: "Open dashboard" });
      await settle(page, 900);
      await page.focus(".canvas-resizer");
      for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowLeft");
      await page.evaluate(() => document.activeElement?.blur());
      await settle(page, 1200);
      await shot();
    },
  },
  {
    name: "main-quiz", query: "scene=quiz", viewport: MAIN,
    run: async (page, shot) => { await click(page, ".artifact-links button", { text: "Start / resume test" }); await settle(page, 1000); await shot(); },
  },
  {
    // A scripted run in the main window, played as the backend's own event stream (run, activity, actions, token, idle).
    name: "main-live", query: "scene=live", viewport: MAIN,
    run: async (page, shot) => {
      const chat = "chat-live-fix", run = "run-live-1", reply = "msg-live-reply";
      await shot("01-empty");
      await page.type("textarea[aria-label='Message Pebble']", await fixture(page, "text.request"), { delay: 0 });
      await page.keyboard.press("Enter");
      await settle(page, 300);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
      await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
      const add = (r) => emit(page, "activity", { chat_id: chat, run_id: run, item: r });
      await add(row(0, 0.2, "context", "Recalled 3 memories", "done", null, 0.18, "Context ready in 180 ms"));
      await add(row(32, 0.4, "model", "The model responded", "done", null, 1.6, "Headers after 0.3 s; first text after 0.9 s."));
      await add(row(64, 2.1, "tool", "Searching project source", "running", "searching"));
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Grep", activity: "searching", label: "Searching project source" });
      await settle(page, 900);
      await add(row(64, 2.1, "tool", "Searching project source", "done", "searching", 0.6));
      await add(row(128, 3.0, "tool", "Reading invoice_kit/dates.py", "running", "reading"));
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Read", activity: "reading", label: "Reading invoice_kit/dates.py" });
      await settle(page, 1700);
      await shot("02-reading");
      await add(row(128, 3.0, "tool", "Reading invoice_kit/dates.py", "done", "reading", 0.2));
      await add(row(192, 12.6, "tool", "Preparing an edit to invoice_kit/dates.py", "done", "editing", 0.3, "Staged for your approval."));
      await add(row(256, 19.9, "tool", "Preparing an edit to tests/test_dates.py", "done", "editing", 0.3, "Staged for your approval."));
      const diffs = await fixture(page, "diffs");
      const actions = [
        { id: "act-live-dates", chat_id: chat, kind: "edit", status: "pending", payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: diffs.dates } },
        { id: "act-live-tests", chat_id: chat, kind: "edit", status: "pending", payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: diffs.tests } },
      ];
      await live(page, "actions", chat, actions);
      await emit(page, "actions", { chat_id: chat, actions });
      const text = await fixture(page, "reply.proposed");
      await stream(page, chat, run, reply, text.slice(0, 260), 5, 160);
      await settle(page, 500);
      await shot("03-approval-streaming");
      await stream(page, chat, run, reply, text.slice(260), 6, 120);
      const usage = { input_tokens: 3480, output_tokens: 412, cached_tokens: 2048, tokens_per_second: 21.6, route: "model", calls: 4, seconds: 46.2 };
      await emit(page, "usage", { chat_id: chat, id: reply, usage });
      await live(page, "message", chat, { id: reply, role: "assistant", content: text, run_id: run, usage });
      await live(page, "run", chat, { id: run, state: "waiting_approval", elapsed: 46, counts: { steps: 4, retries: 0, waited: 0 } });
      await live(page, "active", null, null);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "waiting_approval" });
      await emit(page, "idle", { chat_id: chat, run_id: run });
      await settle(page, 1200);
      await shot("04-waiting-approval");
    },
  },
  {
    // AgentGuard's completion gate held the task: "Pebble's change isn't verified yet." (RunPanel.vue).
    name: "held-unverified", query: "scene=held", viewport: MAIN,
    run: async (page, shot) => { await loadVerdict(page); await blur(page); await settle(page, 300); await shot(); },
  },
  {
    name: "held-unverified-wide", query: "scene=held", viewport: WIDE,
    run: async (page, shot) => { await loadVerdict(page); await blur(page); await settle(page, 300); await shot(); },
  },
  {
    // "Run the tests" stages the covering recipe as a normal approval: the "Run isolated tests" card (App.vue).
    name: "held-tests-review", query: "scene=held", viewport: MAIN,
    run: async (page, shot) => {
      await loadVerdict(page);
      await runHeldTests(page);
      await blur(page);
      await scrollEnd(page, ".conversation-scroll");
      await settle(page, 600);
      await shot();
    },
  },
  {
    // AgentGuard's scope challenge: the refused step's error in Details › Activity (no dedicated card exists).
    name: "main-challenge", query: "scene=challenge&drawer=520", viewport: MAIN,
    run: async (page, shot) => {
      await playChallenge(page);
      await click(page, "#details-drawer .thinking-step.failed .thinking-detail summary");
      await settle(page, 500);
      await page.evaluate(() => document.querySelector("#details-drawer .thinking-step.failed")?.scrollIntoView({ block: "start" }));
      await page.evaluate(() => { const s = document.querySelector("#details-drawer .thinking-step.failed"); let el = s?.parentElement; while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement; if (el) el.scrollTop -= 150; });
      await settle(page, 700);
      await shot();
    },
  },
  {
    // "Forget my Lisbon trip plans." The host's reply and the main window's Forget card (App.vue, V1-034); the second
    // shot is after Forget on the first record.
    name: "main-forget", query: "scene=forget", viewport: MAIN,
    run: async (page, shot) => {
      const forget = await fixture(page, "forget");
      await emit(page, "memory_forget", { chat_id: "chat-forget-trip", run_id: "run-forget-1", message_id: "msg-f2", subject: forget.subject, memory_ids: forget.ids, authorization: "none" });
      await settle(page, 900);
      await scrollEnd(page, ".conversation-scroll");
      await settle(page, 400);
      await shot("card");
      await click(page, ".forget-card .forget-list button", { text: "Forget" });
      await settle(page, 900);
      await shot();
    },
  },
  // ---- P1: a terminal command and a Git plan waiting for review (loop L5) ---------------------------------------
  { name: "command-review", query: "scene=command&drawer=500", viewport: WIDE },
  { name: "git-plan", query: "scene=git&drawer=500", viewport: WIDE, run: async (page, shot) => { await scrollEnd(page, ".conversation-scroll"); await settle(page, 600); await shot(); } },
  {
    name: "crop-command-card", query: "scene=command&drawer=500", viewport: WIDE,
    run: async (page, shot) => { await settle(page, 600); await shot("", { clip: await region(page, [first("#details-drawer .action-card.pending")], { pad: { x: 14, y: 6 } }) }); },
  },
  {
    name: "crop-git-card", query: "scene=git&drawer=500", viewport: WIDE,
    run: async (page, shot) => { await settle(page, 600); await shot("", { clip: await region(page, [first("#details-drawer .action-card.pending")], { pad: { x: 14, y: 6 } }) }); },
  },
  // ---- DPR-3 crops for film punch-ins (§3.2); region screenshots of the real UI ---------------------------------
  {
    name: "crop-approval-card", query: "scene=approval&drawer=500", viewport: WIDE,
    run: async (page, shot) => { await settle(page, 600); await shot("", { clip: await region(page, [first("#details-drawer .action-card.pending")], { pad: { x: 14, y: 6 } }) }); },
  },
  {
    name: "crop-done-receipt", query: "scene=done", viewport: WIDE,
    run: async (page, shot) => {
      const receipt = ".message.assistant.latest .thinking-summary";
      await click(page, receipt);
      await settle(page, 400);
      await click(page, receipt);
      await scrollEnd(page, ".conversation-scroll");
      await settle(page, 600);
      await shot("", { clip: await region(page, [".message.assistant.latest .thinking", ".message.assistant.latest .message-content > :not(.message-actions):not(.thinking)"], { pad: { x: 18, y: 8 } }) });
    },
  },
  {
    name: "crop-models-ways-in", query: "scene=settings-permissions", viewport: MAIN,
    run: async (page, shot) => { await openSettings(page, "models"); await shot("", { clip: await region(page, [first(".modal .section-label"), ".modal .profile-row", first(".modal .setting-actions"), ".modal .chatgpt-sign-in"], { pad: { x: 18, y: 10 }, within: ".modal" }) }); },
  },
  {
    name: "crop-permissions-modes", query: "scene=settings-permissions", viewport: MAIN,
    run: async (page, shot) => { await openSettings(page, "permissions"); await shot("", { clip: await region(page, ["#permission-mode-label", ".permission-modes"], { pad: { x: 18, y: 10 }, within: ".modal" }) }); },
  },
  {
    name: "crop-permissions-modes-auto", query: "scene=settings-permissions", viewport: MAIN,
    run: async (page, shot) => {
      await openSettings(page, "permissions");
      await click(page, "#permission-mode-auto");
      await settle(page, 900);
      await shot("", { clip: await region(page, ["#permission-mode-label", ".permission-modes"], { pad: { x: 18, y: 10 }, within: ".modal" }) });
    },
  },
  {
    name: "crop-memory-records", query: "scene=settings-memory", viewport: MAIN,
    run: async (page, shot) => { await openSettings(page, "Memory"); await shot("", { clip: await region(page, [".memory-types", "#memory-records"], { pad: { x: 18, y: 10 }, within: ".modal" }) }); },
  },
  {
    name: "crop-memory-records-forgotten", query: "scene=settings-memory", viewport: MAIN,
    run: async (page, shot) => {
      await openSettings(page, "Memory");
      const clip = await region(page, [".memory-types", "#memory-records"], { pad: { x: 18, y: 10 }, within: ".modal" }); // the same frame as before
      await forgetRecord(page, FORGET_RECORD);
      await shot("", { clip });
    },
  },
  {
    name: "crop-dashboard-chart", query: "scene=dashboard", viewport: WIDE,
    run: async (page, shot) => {
      await click(page, ".artifact-links button", { text: "Open dashboard" });
      await settle(page, 900);
      await page.focus(".canvas-resizer");
      for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowLeft");
      await page.evaluate(() => document.activeElement?.blur());
      await settle(page, 1200);
      await page.evaluate(() => document.querySelector(".dash-panel.wide")?.scrollIntoView({ block: "center" }));
      await settle(page, 500);
      await shot("", { clip: await region(page, [first(".dash-panel.wide")], { pad: { x: 16, y: 6 } }) });
    },
  },
  {
    name: "crop-held", query: "scene=held", viewport: WIDE,
    run: async (page, shot) => {
      await loadVerdict(page);
      await blur(page);
      await settle(page, 300);
      await shot("", { clip: await region(page, [".message.assistant.latest blockquote", ".live-turn", ".run-panel.run-conversation"], { pad: { x: 18, y: 12 } }) });
    },
  },
  {
    name: "crop-tests-card", query: "scene=held&drawer=500", viewport: WIDE,
    run: async (page, shot) => {
      await loadVerdict(page);
      await runHeldTests(page);
      await blur(page);
      await settle(page, 300);
      await shot("", { clip: await region(page, [first("#details-drawer .action-card.pending")], { pad: { x: 14, y: 6 } }) });
    },
  },
  {
    name: "crop-challenge-step", query: "scene=challenge&drawer=520", viewport: WIDE,
    run: async (page, shot) => {
      await playChallenge(page);
      await click(page, "#details-drawer .thinking-step.failed .thinking-detail summary");
      await settle(page, 500);
      await page.evaluate(() => document.querySelector("#details-drawer .thinking-step.failed")?.scrollIntoView({ block: "center" }));
      await settle(page, 600);
      await shot("", { clip: await region(page, ["#details-drawer .thinking-step.failed"], { pad: { x: 14, y: 4 } }) });
    },
  },
  // ---- the companion (transparent PNGs at the window sizes main.rs pet_expand uses) ------------------------------
  { name: "pet-collapsed", query: "pet&scene=pet-chat", viewport: PET.collapsed, transparent: true },
  {
    // README hero: the floating pebble looking toward the main window beside it (the shell's quantized pointer
    // direction, as main.rs pet_gaze sends it: pointer to the left of the pebble and a little below).
    name: "pet-collapsed-gaze", query: "pet&scene=pet-chat", viewport: PET.collapsed, transparent: true,
    run: async (page, shot) => {
      await page.evaluate(() => window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "pet-gaze", payload: { x: -0.75, y: 0.125 } }));
      await settle(page, 1200);
      await shot();
    },
  },
  {
    name: "pet-status", query: "pet&scene=pet-chat", viewport: PET.status, transparent: true,
    run: async (page, shot) => {
      // The collapsed pet's status pill while a task runs (pet_expand gives the window 176x136 for it).
      const chat = "chat-pet-dates", run = "run-pet-status";
      await live(page, "active", chat, run);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
      await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Read", activity: "reading", label: "Reading invoice_kit/dates.py" });
      await settle(page, 1800);
      await shot();
    },
  },
  {
    name: "pet-chat", query: "pet&scene=pet-chat", viewport: PET.expanded, transparent: true,
    run: async (page, shot) => { await click(page, ".pet-avatar"); await settle(page, 1100); await shot(); },
  },
  {
    name: "pet-sidebar", query: "pet&scene=pet-chat", viewport: PET.sidebar, transparent: true,
    run: async (page, shot) => {
      await click(page, ".pet-avatar");
      await settle(page, 600);
      await click(page, "button[aria-label='Toggle companion sidebar']");
      await settle(page, 900);
      await shot();
    },
  },
  {
    // The companion answering live (D22): send, Thinking, the reply streams (Writing), celebration, settled.
    name: "pet-live", query: "pet&scene=pet-live", viewport: PET.expanded, transparent: true,
    run: async (page, shot) => {
      const chat = "chat-live-pet", run = "run-live-1", reply = "msg-live-pet-reply";
      await click(page, ".pet-avatar");
      await settle(page, 900);
      await shot("01-greeting");
      await page.type("textarea[aria-label='Message Pebble']", await fixture(page, "text.petQuestion"), { delay: 0 });
      await page.keyboard.press("Enter");
      await settle(page, 250);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
      await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
      await settle(page, 1600);
      await shot("02-thinking");
      const text = await fixture(page, "reply.pet");
      await stream(page, chat, run, reply, text.slice(0, 80), 4, 150);
      await settle(page, 400);
      await shot("03-writing");
      await stream(page, chat, run, reply, text.slice(80), 5, 120);
      const usage = { input_tokens: 1180, output_tokens: 52, cached_tokens: 0, tokens_per_second: 24.5, route: "model", calls: 1, seconds: 2.2 };
      await emit(page, "usage", { chat_id: chat, id: reply, usage });
      await live(page, "message", chat, { id: reply, role: "assistant", content: text, run_id: run, usage });
      await live(page, "run", chat, { id: run, state: "completed", elapsed: 4, counts: { steps: 0, retries: 0, waited: 0 } });
      await live(page, "active", null, null);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "completed" });
      await settle(page, 700);
      await shot("04-celebrate");
      await emit(page, "idle", { chat_id: chat, run_id: run });
      await settle(page, 1200);
      await shot("05-settled");
    },
  },
];

// The same scenes in the larger window (README and page framing): <name>-wide, unless the scene already has one.
for (const name of ["main-challenge", "settings-memory", "settings-memory-forgotten", "main-forget", "main-welcome", "main-quiz", "settings-permissions", "settings-models"]) {
  const scene = SCENES.find((x) => x.name === name);
  if (!SCENES.some((x) => x.name === name + "-wide")) SCENES.push({ ...scene, name: name + "-wide", viewport: WIDE });
}

await fetch(new URL("__pebble/invalidate", BASE)).catch(() => {}); // pick up edited fixtures (serve.mjs)
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: path.join(HERE, "chrome-profile"),
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=Translate,MediaRouter", "--run-all-compositor-stages-before-draw"],
});
const report = [];
const selected = SCENES.filter((s) => !FILTERS.length || FILTERS.some((f) => (EXACT ? s.name === f : s.name.includes(f))));
if (!selected.length) throw new Error("no scene matches " + FILTERS.join(", "));
try {
  for (const scene of selected) {
    for (const scale of SCALES) {
      for (const theme of THEMES) {
        const page = await browser.newPage();
        const log = [];
        page.on("console", (m) => ["error", "warn", "warning"].includes(m.type()) && log.push(`${m.type()}: ${m.text()}`));
        page.on("pageerror", (e) => log.push(`pageerror: ${e.message}`));
        page.on("requestfailed", (r) => log.push(`requestfailed: ${r.url()}`));
        page.on("response", (r) => r.status() >= 400 && log.push(`http ${r.status()}: ${r.url()}`));
        await page.setViewport({ ...scene.viewport, deviceScaleFactor: scale });
        await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }, { name: "prefers-reduced-motion", value: "no-preference" }]);
        if (LOCALE) await (await page.createCDPSession()).send("Emulation.setLocaleOverride", { locale: LOCALE });
        if (TZ) await page.emulateTimezone(TZ);
        const url = `${BASE}?${scene.query}&theme=${theme}`;
        await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
        await page.waitForSelector(scene.query.startsWith("pet") ? ".pet-root" : ".app-shell", { timeout: 30000 });
        await settle(page, 600);
        const files = [];
        const shot = async (step = "", { clip } = {}) => {
          const stem = `${scene.name}${step ? "-" + step : ""}`;
          const file = path.join(OUT, NAMING === "video" ? `${stem}@${scale}x.png` : `${stem}-${theme}${scale === 2 ? "" : "@" + scale + "x"}.png`);
          await page.screenshot({ path: file, omitBackground: !!scene.transparent, ...(clip ? { clip, captureBeyondViewport: false } : {}) });
          files.push(path.basename(file));
        };
        const recorder = RECORD ? await startRecording(page, path.join(HERE, "frames", `${scene.name}-${theme}`), !!scene.transparent) : null;
        try {
          if (scene.run) await scene.run(page, shot);
          else {
            await settle(page, 600);
            await shot();
          }
        } catch (error) {
          log.push(`scene error: ${error.message}`);
        }
        const debug = await page.evaluate(() => ({
          unhandled: window.__pebble?.unhandled || [],
          calls: (window.__pebble?.calls || []).map((c) => (c.cmd === "rpc" ? "rpc:" + c.method : c.cmd)),
          errorBanner: document.querySelector(".error-banner, .pet-error, .modal-error")?.textContent?.trim() || null,
        }));
        report.push({ scene: scene.name, theme, scale, url, files, log, ...debug });
        console.log(`${scene.name} [${theme} @${scale}x] -> ${files.join(", ")}${debug.errorBanner ? "  ERROR BANNER: " + debug.errorBanner : ""}${log.length ? "  (" + log.length + " console issues: " + log.join(" | ").slice(0, 400) + ")" : ""}${debug.unhandled.length ? "  unhandled: " + debug.unhandled.map((u) => u.method || u.cmd).join(",") : ""}`);
        if (recorder) {
          const frames = await recorder.stop();
          const span = frames.length > 1 ? frames.at(-1).t - frames[0].t : 0;
          console.log(`  recorded ${frames.length} frames over ${span.toFixed(1)} s (${(frames.length / Math.max(span, 0.001)).toFixed(1)} fps avg), ${frames[0]?.w}x${frames[0]?.h} css px`);
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  const reportFile = path.join(LOGS, `capture-report${FILTERS.length ? "-" + FILTERS.join("_").slice(0, 80) : ""}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  // Console warnings are listed but don't fail the run; errors, failed requests, HTTP errors, page and scene errors do.
  const isWarning = (line) => line.startsWith("warn");
  const unhandled = report.reduce((n, r) => n + r.unhandled.length, 0);
  const banners = report.filter((r) => r.errorBanner).length;
  const errors = report.reduce((n, r) => n + r.log.filter((l) => !isWarning(l)).length, 0);
  const warnings = report.reduce((n, r) => n + r.log.filter(isWarning).length, 0);
  console.log(`SUMMARY: ${report.length} runs, ${report.reduce((n, r) => n + r.files.length, 0)} PNGs in ${OUT}; unhandled IPC calls ${unhandled}, error banners ${banners}, console errors ${errors}, console warnings ${warnings}; report ${reportFile}`);
  if (unhandled || banners || errors) process.exitCode = 1;
}

// CDP screencast: Chrome sends a frame whenever the page repaints (variable rate, ~30-60 fps while the pebble animates).
async function startRecording(page, dir, transparent) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.createCDPSession();
  if (transparent) await cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = String(frames.length + 1).padStart(5, "0") + ".png";
    fs.writeFileSync(path.join(dir, file), Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp, w: metadata.deviceWidth, h: metadata.deviceHeight });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const vp = page.viewport();
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: Math.round(vp.width * vp.deviceScaleFactor), maxHeight: Math.round(vp.height * vp.deviceScaleFactor) });
  return {
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await pause(200);
      fs.writeFileSync(path.join(dir, "frames.json"), JSON.stringify(frames, null, 1));
      return frames;
    },
  };
}
