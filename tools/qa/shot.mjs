// tools/qa/shot.mjs: build the site, serve it, and screenshot it at given widths × themes × motion settings
// (MASTER_PLAN §9.1, critic H10: viewport-sized tiles taken while scrolling, which an agent can actually read).
//
// Always run it through the heavy-job runner, which holds the lock for the build, the server and Chrome together:
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-shot node tools/qa/shot.mjs --widths=390,1440 --themes=light,dark
//
// Options (all optional):
//   --run=NAME            output folder name (default: a timestamp)   → .work/qa/screens/<run>/
//   --paths=/,/film       pages to shoot (default /)
//   --widths=390,1440     CSS widths; under 500 px they use CDP device emulation as a phone (headless Chrome won't make
//                         a window narrower than 500 px), with an iPhone user agent and touch
//   --themes=light,dark   stored theme choice (and the matching prefers-color-scheme)
//   --motion=on,paused,reduced   "paused" = the site's Pause motion; "reduced" = prefers-reduced-motion
//   --height=N            viewport height (default: 844 for phones, 900 up to 1600 px wide, 1080 above)
//   --dpr=1               device pixel ratio
//   --no-build            reuse the last `next build`
//   --no-tiles            no viewport tiles (use with --full)
//   --full                also save one full-page capture per shot (an overview only: Chrome can blank long pages
//                         below ~16,000 px, so judge from the tiles)
//   --tile-wait=450       ms to wait after each scroll step before a tile is taken
//   --lenient             exit 0 even when a shot has console errors, failed requests or horizontal overflow
//   --interactions        also run the shell's interaction checks per width and theme (skip link, sticky call to
//                         action, phone menu, theme and motion toggles), with viewport shots of each state
//
// For each shot: …-tile-NN.png (viewport screenshots taken while scrolling down, so the sticky header and call to
// action show where a visitor sees them), optionally <page>-<width>-<theme>-<motion>.png (full page), plus report.json
// (scroll width, page height, the number of local ground lines, console errors, failed requests, CSP violations, each tile's
// scroll position). tools/qa/sheets.mjs packs the tiles into review sheets. The server (next start on a free port) and
// Chrome are always stopped at the end.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const require = createRequire(path.join(REPO, "capture", "package.json"));
const puppeteer = require("puppeteer-core");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const list = (value) => value.split(",").map((v) => v.trim()).filter(Boolean);

const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const RUN = opt("run", stamp);
const OUT = path.join(REPO, ".work", "qa", "screens", RUN);
const LOGS = path.join(REPO, ".work", "qa", "logs");
const PATHS = list(opt("paths", "/"));
const WIDTHS = list(opt("widths", "390,1440")).map(Number);
const THEMES = list(opt("themes", "light,dark"));
const MOTIONS = list(opt("motion", "on"));
const DPR = Number(opt("dpr", "1"));
const FIXED_HEIGHT = opt("height", "");
const TILE_WAIT = Number(opt("tile-wait", "450")); // ms after each scroll step (the sticky call to action fades in 300 ms)
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";

mkdirSync(OUT, { recursive: true });
mkdirSync(LOGS, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const children = [];
let browser = null;
let profile = null;

async function cleanup() {
  try {
    if (browser) await browser.close();
  } catch {}
  browser = null;
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM"); // the whole process group: npx, next, its workers
    } catch {}
  }
  if (profile) rmSync(profile, { recursive: true, force: true });
  profile = null;
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, async () => {
    await cleanup();
    process.exit(130);
  });
}

function run(cmd, cmdArgs, logName) {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(path.join(LOGS, logName));
    const child = spawn(cmd, cmdArgs, { cwd: REPO, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${cmdArgs.join(" ")} exited with ${code}`))));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url, seconds = 90) {
  for (let i = 0; i < seconds * 2; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`the server did not answer at ${url}`);
}

const viewportHeight = (width) => (FIXED_HEIGHT ? Number(FIXED_HEIGHT) : width < 500 ? 844 : width <= 1600 ? 900 : 1080);
const slug = (p) => (p === "/" ? "home" : p.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-"));

async function shoot(base, pagePath, width, theme, motion) {
  const page = await browser.newPage();
  const phone = width < 500;
  const height = viewportHeight(width);
  const problems = { console: [], pageErrors: [], failed: [], csp: [] };
  // Video requests Chrome cancels itself (net::ERR_ABORTED): a <source> it won't play, before it moves on to the next
  // one, or a preload it has enough of. Expected media behaviour, not a failure (lib.mjs skips them too); they're kept
  // in the report, apart from the problems, so a run can still check which source each video ended up playing.
  const mediaAborted = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.console.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    const why = req.failure()?.errorText ?? "";
    if (why === "net::ERR_ABORTED" && /\.(mp4|webm)(\?|$)/.test(req.url())) return void mediaAborted.push(req.url());
    problems.failed.push(`${req.url()} ${why}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) problems.failed.push(`${res.status()} ${res.url()}`);
  });
  if (phone) await page.setUserAgent(IPHONE_UA);
  await page.setViewport({ width, height, deviceScaleFactor: DPR, isMobile: phone, hasTouch: phone });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: theme },
    { name: "prefers-reduced-motion", value: motion === "reduced" ? "reduce" : "no-preference" },
  ]);
  await page.evaluateOnNewDocument(
    (t, m) => {
      try {
        localStorage.setItem("pebble-theme", t);
        localStorage.setItem("pebble-motion", m === "paused" ? "paused" : "on");
      } catch {}
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    },
    theme,
    motion,
  );
  await page.goto(`${base}${pagePath}`, { waitUntil: "networkidle0", timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200); // the hero reveal (≈ 0.9 s) and the path's first build
  // scroll through once: lazy images load and the line draws on (it never retracts), then back to the top
  // (behavior "instant": the page scrolls smoothly when motion is on, and a capture mid-scroll would be wrong)
  await page.evaluate(async () => {
    const to = (top) => window.scrollTo({ top, left: 0, behavior: "instant" });
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      to(y);
      await new Promise((r) => setTimeout(r, 140));
    }
    to(document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    await Promise.all(
      [...document.images].filter((img) => !img.complete).map((img) => new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 4000); })),
    );
    to(0);
    await new Promise((r) => setTimeout(r, 500));
  });
  await sleep(400);
  const probe = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    theme: document.documentElement.dataset.theme,
    motion: document.documentElement.dataset.motion,
    platform: document.documentElement.dataset.platform,
    // the pebble's local grounds (src/components/ui/Horizon.tsx; the page-wide path was retired in the v2 system)
    horizons: document.querySelectorAll("svg[data-horizon]").length,
    csp: window.__csp ?? [],
  }));
  problems.csp = probe.csp;
  delete probe.csp;
  const name = `${slug(pagePath)}-${width}-${theme}-${motion}`;
  // Tiles are viewport screenshots taken while scrolling down, so each one is what a visitor sees there, sticky header
  // and sticky call to action included. (Slicing one full-page capture fails on long pages: past Chrome's ~16,384 px
  // texture limit the capture comes out blank below a point, lane F2a's open issue 2.)
  const tiles = [];
  if (!flag("no-tiles")) {
    for (let i = 1, y = 0; i < 200; i++, y += height) {
      const at = await page.evaluate(async (top) => {
        window.scrollTo({ top, left: 0, behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { y: Math.round(window.scrollY), end: window.scrollY + innerHeight >= document.documentElement.scrollHeight - 1 };
      }, y);
      await sleep(TILE_WAIT);
      const tile = path.join(OUT, `${name}-tile-${String(i).padStart(2, "0")}.png`);
      await page.screenshot({ path: tile });
      tiles.push({ file: path.basename(tile), y: at.y });
      if (at.end) break;
    }
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  }
  if (flag("full")) {
    // optional overview (may come out blank below ~16,000 px; judge from the tiles)
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true, captureBeyondViewport: true });
  }
  await page.close();
  const overflow = probe.scrollWidth > probe.innerWidth;
  const bad = problems.console.length + problems.pageErrors.length + problems.failed.length + problems.csp.length + (overflow ? 1 : 0);
  console.log(
    `${name}: ${probe.scrollHeight}px tall, scrollWidth ${probe.scrollWidth}/${probe.innerWidth}${overflow ? " OVERFLOW" : ""}, ` +
      `theme ${probe.theme}, motion ${probe.motion}, platform ${probe.platform}, ${probe.horizons} horizons, ` +
      `${tiles.length} tiles, ${bad ? `${bad} problem(s)` : "no problems"}`,
  );
  for (const [kind, items] of Object.entries(problems)) for (const item of items) console.log(`  ${kind}: ${item}`);
  if (mediaAborted.length) console.log(`  (not a problem) video requests Chrome cancelled: ${mediaAborted.map((u) => u.split("/").pop()).join(", ")}`);
  return { name, width, theme, motion, path: pagePath, probe, problems, mediaAborted, overflow, tiles, ok: bad === 0 };
}

async function interact(base, width, theme) {
  const page = await browser.newPage();
  const phone = width < 500;
  const height = viewportHeight(width);
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  if (phone) await page.setUserAgent(IPHONE_UA);
  await page.setViewport({ width, height, deviceScaleFactor: DPR, isMobile: phone, hasTouch: phone });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("pebble-theme", t);
      localStorage.removeItem("pebble-motion");
    } catch {}
  }, theme);
  await page.goto(`${base}/`, { waitUntil: "networkidle0", timeout: 90000 });
  await sleep(1200);
  const name = (step) => `interact-${width}-${theme}-${step}`;
  // click the first element matching `selector` that is actually shown (the header has phone-only twins)
  const clickVisible = async (selector) => {
    const handles = await page.$$(selector);
    for (const handle of handles) {
      if (await handle.evaluate((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== "hidden")) {
        await handle.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await handle.click();
        return true;
      }
    }
    throw new Error(`nothing visible matches ${selector}`);
  };
  const shot = (step) => page.screenshot({ path: path.join(OUT, `${name(step)}.png`) });
  const checks = [];
  const check = (step, ok, detail) => {
    checks.push({ step, ok: !!ok, detail });
    console.log(`  ${ok ? "ok  " : "FAIL"} ${width} ${theme} ${step}${detail ? `: ${detail}` : ""}`);
  };

  // 1 the skip link is the first stop
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), href: document.activeElement?.getAttribute("href") }));
  await shot("01-skip-link");
  check("skip link first", first.href === "#main", JSON.stringify(first));
  await page.keyboard.press("Escape");

  // 2 the sticky call to action shows once the hero has gone
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), height * 2.2);
  await sleep(700);
  const sticky = await page.evaluate(() => {
    const el = document.querySelector("aside[data-visible]");
    return el ? getComputedStyle(el).visibility : "hidden";
  });
  await shot("02-sticky");
  check("sticky call to action visible", sticky === "visible", sticky);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(400);

  // 3 the phone menu: opens as a modal, Escape closes it and focus returns to the button
  if (width < 1024) {
    await clickVisible('button[aria-haspopup="dialog"]');
    await sleep(450);
    const open = await page.evaluate(() => !!document.querySelector("dialog[open]"));
    await shot("03-menu-open");
    await page.keyboard.press("Escape");
    await sleep(300);
    const after = await page.evaluate(() => ({
      open: !!document.querySelector("dialog[open]"),
      focus: document.activeElement?.getAttribute("aria-haspopup"),
      expanded: document.querySelector('button[aria-haspopup="dialog"]')?.getAttribute("aria-expanded"),
    }));
    check("menu opens and closes, focus returns", open && !after.open && after.focus === "dialog" && after.expanded === "false", JSON.stringify(after));
  }

  // 4 the theme toggle flips the theme and stores the choice
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await clickVisible('header button[title="Theme"]');
  await sleep(400);
  const flipped = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("pebble-theme") }));
  await shot("04-theme-flipped");
  const expected = theme === "dark" ? "light" : "dark";
  check("theme toggle", flipped.theme === expected && flipped.stored === expected, JSON.stringify(flipped));

  // 5 Pause motion (in the header on desktops, in the footer everywhere). By its data-control: the footer's theme words
  // (Light, Dark, System) are aria-pressed buttons too, and come first.
  const motionSelector = width < 1024 ? 'footer button[data-control="motion"]' : 'header button[data-control="motion"]';
  await clickVisible(motionSelector);
  await sleep(300);
  const motion = await page.evaluate((sel) => ({
    motion: document.documentElement.dataset.motion,
    pressed: document.querySelector(sel)?.getAttribute("aria-pressed"),
    stored: localStorage.getItem("pebble-motion"),
    pebble: document.querySelector("[data-mode]")?.getAttribute("data-mode") ?? null,
  }), motionSelector);
  check("pause motion", motion.motion === "paused" && motion.pressed === "true" && motion.stored === "paused", JSON.stringify(motion));
  await clickVisible(motionSelector);
  await sleep(200);

  check("no page errors", errors.length === 0, errors.join(" | "));
  await page.close();
  return { width, theme, checks, ok: checks.every((c) => c.ok) };
}

let failed = false;
try {
  if (!flag("no-build")) await run("npx", ["next", "build"], `next-build-${RUN}.log`);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn("npx", ["next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: REPO,
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(server);
  const serverLog = createWriteStream(path.join(LOGS, `next-start-${RUN}.log`));
  server.stdout.pipe(serverLog);
  server.stderr.pipe(serverLog);
  await waitFor(`${base}/`);
  profile = mkdtempSync(path.join(REPO, ".work", "qa", "chrome-profile-"));
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: profile,
    args: [
      "--hide-scrollbars",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--mute-audio",
      "--font-render-hinting=none",
    ],
  });
  const results = [];
  for (const pagePath of PATHS)
    for (const width of WIDTHS)
      for (const theme of THEMES)
        for (const motion of MOTIONS) results.push(await shoot(base, pagePath, width, theme, motion));
  const interactions = [];
  if (flag("interactions")) {
    for (const width of WIDTHS) for (const theme of THEMES) interactions.push(await interact(base, width, theme));
  }
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ run: RUN, base, dpr: DPR, results, interactions }, null, 2));
  failed = results.some((r) => !r.ok) || interactions.some((r) => !r.ok);
  console.log(`SUMMARY: ${results.length} shot(s), ${results.filter((r) => !r.ok).length} with problems → ${OUT}`);
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  await cleanup();
}
process.exit(failed && !flag("lenient") ? 1 : 0);
