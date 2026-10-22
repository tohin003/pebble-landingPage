// Capture Pebble's real UI (served by serve.mjs with demo fixtures) as 2x PNGs in light and dark themes.
// Uses the installed Google Chrome (no browser download) through puppeteer-core, with a throwaway profile folder.
// Usage: node capture.mjs [scene-name-filter ...] [--themes=light,dark] [--base=http://127.0.0.1:5199/] [--scale=2]
//          [--locale=en-US] [--tz=America/Los_Angeles]   (default: this Mac's region, as the real app would use)
//          [--record]   also save every repainted frame (CDP screencast, PNG + frames.json timestamps) to frames/.
//                       Measured on Chrome 155: ~40 fps but most frames arrive at 1x; use record.mjs (virtual clock,
//                       exact 2x frames with alpha) for video.
//          [--out=DIR]  where the PNGs go (default: capture/shots, inside the landing repo; never the Pebble repo)
// Ends with a SUMMARY line and exits 1 if any run had an unhandled IPC call, an error banner or a console error.
// The per-run JSON report goes to capture/logs/.
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
const SCALE = Number(opt("scale", "2"));
const FILTERS = args.filter((a) => !a.startsWith("--"));
const LOCALE = opt("locale", "");
const TZ = opt("tz", "");
const RECORD = args.includes("--record");
const OUT = path.resolve(opt("out", path.join(HERE, "shots")));
const LOGS = path.join(HERE, "logs");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });

const MAIN = { width: 1160, height: 800 }; // src-tauri/tauri.conf.json main window
const WIDE = { width: 1440, height: 900 }; // the same window, resized larger (marketing framing)
const PET = { collapsed: { width: 112, height: 112 }, status: { width: 176, height: 136 }, expanded: { width: 384, height: 456 }, sidebar: { width: 744, height: 576 } }; // main.rs pet_expand

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function settle(page, ms = 700) {
  await page.evaluate(() => document.fonts.ready);
  await pause(ms);
}
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
const scrollEnd = (page, selector) => page.evaluate((sel) => document.querySelectorAll(sel).forEach((el) => (el.scrollTop = el.scrollHeight)), selector);
async function stream(page, chatId, runId, id, text, pieces = 8, gap = 140) {
  const words = text.split(/(?<=\s)/);
  const size = Math.ceil(words.length / pieces);
  for (let i = 0; i < words.length; i += size) {
    await emit(page, "token", { chat_id: chatId, run_id: runId, id, text: words.slice(i, i + size).join("") });
    await pause(gap);
  }
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

// ---- scenes ------------------------------------------------------------------------------------------------------
// run(page, shot): interactions; call shot(suffix?) for each frame. Without run, one shot after load.
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
  { name: "settings-models", query: "scene=settings-permissions", viewport: MAIN, run: async (page, shot) => { await click(page, ".profile"); await settle(page, 900); await shot(); } },
  {
    name: "settings-skills", query: "scene=settings-permissions", viewport: MAIN,
    run: async (page, shot) => { await click(page, ".profile"); await click(page, '[role="tab"]', { text: "Skills" }); await settle(page, 900); await shot(); },
  },
  { name: "settings-permissions", query: "scene=settings-permissions", viewport: MAIN, run: async (page, shot) => { await click(page, ".permission-label"); await settle(page); await shot(); } },
  {
    name: "settings-memory", query: "scene=settings-memory", viewport: MAIN,
    run: async (page, shot) => {
      await click(page, ".profile");
      await click(page, '[role="tab"]', { text: "Memory" });
      await settle(page);
      await shot();
    },
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
    name: "main-quiz", query: "scene=quiz", viewport: MAIN,
    run: async (page, shot) => { await click(page, ".artifact-links button", { text: "Start / resume test" }); await settle(page, 1000); await shot(); },
  },
  {
    // A scripted run in the main window, played as the backend's own event stream (run, activity, actions, token, idle).
    name: "main-live", query: "scene=live", viewport: MAIN,
    run: async (page, shot) => {
      const chat = "chat-live-fix", run = "run-live-1", reply = "msg-live-reply";
      await shot("01-empty");
      await page.type("textarea[aria-label='Message Pebble']", "The CSV export crashes for invoices issued on the 31st: ValueError: day is out of range for month. Can you find the bug and fix it?", { delay: 0 });
      await page.keyboard.press("Enter");
      await settle(page, 300);
      await live(page, "title", chat, "Fix month-end due dates");
      await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
      await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
      const item = (seq, at, kind, label, status, activity, duration = null, detail = null) =>
        emit(page, "activity", { chat_id: chat, run_id: run, item: { seq, at, kind, label, status, activity, duration, detail } });
      await item(0, 0.3, "context", "Read your request and the project notes", "done", null, 0.4);
      await item(64, 1.1, "tool", "Searching project source", "running", "searching");
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Grep", activity: "searching", label: "Searching project source" });
      await settle(page, 900);
      await item(64, 1.1, "tool", "Searching project source", "done", "searching", 0.6);
      await item(128, 1.9, "tool", "Reading invoice_kit/dates.py", "running", "reading");
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Read", activity: "reading", label: "Reading invoice_kit/dates.py" });
      await settle(page, 1700);
      await shot("02-reading");
      await item(128, 1.9, "tool", "Reading invoice_kit/dates.py", "done", "reading", 0.2);
      await item(192, 9.6, "tool", "Preparing an edit to invoice_kit/dates.py", "done", "editing", 0.3, "Staged for your approval.");
      await item(256, 14.2, "tool", "Preparing an edit to tests/test_dates.py", "done", "editing", 0.3, "Staged for your approval.");
      const diffs = await page.evaluate(() => window.__pebble.world.live.diffs);
      const actions = [
        { id: "act-live-dates", chat_id: chat, kind: "edit", status: "pending", payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: diffs.dates } },
        { id: "act-live-tests", chat_id: chat, kind: "edit", status: "pending", payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: diffs.tests } },
      ];
      await live(page, "actions", chat, actions);
      await emit(page, "actions", { chat_id: chat, actions });
      const text = await page.evaluate(() => window.__pebble.world.live.reply.proposed);
      await stream(page, chat, run, reply, text.slice(0, 260), 5, 160);
      await settle(page, 500);
      await shot("03-approval-streaming");
      await stream(page, chat, run, reply, text.slice(260), 6, 120);
      const usage = { input_tokens: 6120, output_tokens: 412, cached_tokens: 4096, tokens_per_second: 38.4, route: "model", calls: 4, seconds: 46.2 };
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
  { name: "pet-collapsed", query: "pet&scene=pet-chat", viewport: PET.collapsed, transparent: true },
  {
    name: "pet-status", query: "pet&scene=pet-chat", viewport: PET.status, transparent: true,
    run: async (page, shot) => {
      // The collapsed pet's status pill while a task runs (pet_expand gives the window 176x136 for it).
      const chat = "chat-pet-weather", run = "run-pet-status";
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
    // The companion answering live: send, searching status, streamed reply, celebration, settled.
    name: "pet-live", query: "pet&scene=pet-live", viewport: PET.expanded, transparent: true,
    run: async (page, shot) => {
      const chat = "chat-live-pet", run = "run-live-1", reply = "msg-live-pet-reply";
      await click(page, ".pet-avatar");
      await settle(page, 900);
      await shot("01-greeting");
      await page.type("textarea[aria-label='Message Pebble']", "Will it rain in Lisbon tomorrow morning?", { delay: 0 });
      await page.keyboard.press("Enter");
      await settle(page, 250);
      await emit(page, "run", { chat_id: chat, run_id: run, state: "queued" });
      await emit(page, "run", { chat_id: chat, run_id: run, state: "running" });
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "working", tool: "Weather", activity: "searching", label: "Looking up current weather" });
      await settle(page, 1600);
      await shot("02-searching");
      await emit(page, "progress", { chat_id: chat, run_id: run, kind: "done", tool: "Weather", activity: "searching", label: "Looking up current weather" });
      const text = await page.evaluate(() => window.__pebble.world.live.reply.pet);
      await stream(page, chat, run, reply, text.slice(0, 70), 4, 150);
      await settle(page, 400);
      await shot("03-writing");
      await stream(page, chat, run, reply, text.slice(70), 5, 120);
      const usage = { input_tokens: 1840, output_tokens: 58, cached_tokens: 1024, tokens_per_second: 42.0, route: "model", calls: 2, seconds: 1.4 };
      await emit(page, "usage", { chat_id: chat, id: reply, usage });
      await live(page, "message", chat, { id: reply, role: "assistant", content: text, run_id: run, usage });
      await live(page, "run", chat, { id: run, state: "completed", elapsed: 6, counts: { steps: 1, retries: 0, waited: 0 } });
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

await fetch(new URL("__pebble/invalidate", BASE)).catch(() => {}); // pick up edited fixtures (serve.mjs)
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: path.join(HERE, "chrome-profile"),
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb", "--disable-features=Translate,MediaRouter", "--run-all-compositor-stages-before-draw"],
});
const report = [];
try {
  for (const scene of SCENES.filter((s) => !FILTERS.length || FILTERS.some((f) => s.name.includes(f)))) {
    for (const theme of THEMES) {
      const page = await browser.newPage();
      const log = [];
      page.on("console", (m) => ["error", "warn", "warning"].includes(m.type()) && log.push(`${m.type()}: ${m.text()}`));
      page.on("pageerror", (e) => log.push(`pageerror: ${e.message}`));
      page.on("requestfailed", (r) => log.push(`requestfailed: ${r.url()}`));
      page.on("response", (r) => r.status() >= 400 && log.push(`http ${r.status()}: ${r.url()}`));
      await page.setViewport({ ...scene.viewport, deviceScaleFactor: SCALE });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }, { name: "prefers-reduced-motion", value: "no-preference" }]);
      if (LOCALE) await (await page.createCDPSession()).send("Emulation.setLocaleOverride", { locale: LOCALE });
      if (TZ) await page.emulateTimezone(TZ);
      const url = `${BASE}?${scene.query}&theme=${theme}`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
      await page.waitForSelector(scene.query.startsWith("pet") ? ".pet-root" : ".app-shell", { timeout: 30000 });
      await settle(page, 600);
      const files = [];
      const shot = async (suffix = "") => {
        const file = path.join(OUT, `${scene.name}${suffix ? "-" + suffix : ""}-${theme}.png`);
        await page.screenshot({ path: file, omitBackground: !!scene.transparent });
        files.push(path.basename(file));
      };
      const recorder = RECORD ? await startRecording(page, path.join(HERE, "frames", `${scene.name}-${theme}`), !!scene.transparent) : null;
      if (scene.run) await scene.run(page, shot);
      else {
        await settle(page, 600);
        await shot();
      }
      const debug = await page.evaluate(() => ({
        unhandled: window.__pebble?.unhandled || [],
        calls: (window.__pebble?.calls || []).map((c) => (c.cmd === "rpc" ? "rpc:" + c.method : c.cmd)),
        errorBanner: document.querySelector(".error-banner, .pet-error, .modal-error")?.textContent?.trim() || null,
      }));
      report.push({ scene: scene.name, theme, url, files, log, ...debug });
      console.log(`${scene.name} [${theme}] -> ${files.join(", ")}${debug.errorBanner ? "  ERROR BANNER: " + debug.errorBanner : ""}${log.length ? "  (" + log.length + " console issues)" : ""}${debug.unhandled.length ? "  unhandled: " + debug.unhandled.map((u) => u.method || u.cmd).join(",") : ""}`);
      if (recorder) {
        const frames = await recorder.stop();
        const span = frames.length > 1 ? frames.at(-1).t - frames[0].t : 0;
        console.log(`  recorded ${frames.length} frames over ${span.toFixed(1)} s (${(frames.length / Math.max(span, 0.001)).toFixed(1)} fps avg), ${frames[0]?.w}x${frames[0]?.h} css px`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
  const reportFile = path.join(LOGS, `capture-report${FILTERS.length ? "-" + FILTERS.join("_") : ""}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  // Console warnings are listed but don't fail the run; errors, failed requests, HTTP errors and page errors do.
  const isWarning = (line) => line.startsWith("warn");
  const unhandled = report.reduce((n, r) => n + r.unhandled.length, 0);
  const banners = report.filter((r) => r.errorBanner).length;
  const errors = report.reduce((n, r) => n + r.log.filter((l) => !isWarning(l)).length, 0);
  const warnings = report.reduce((n, r) => n + r.log.filter(isWarning).length, 0);
  console.log(`SUMMARY: ${report.length} runs, ${report.reduce((n, r) => n + r.files.length, 0)} PNGs in ${OUT}; unhandled IPC calls ${unhandled}, error banners ${banners}, console errors ${errors}, console warnings ${warnings}; report ${reportFile}`);
  if (unhandled || banners || errors) process.exitCode = 1;
}
