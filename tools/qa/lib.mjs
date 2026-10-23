// tools/qa/lib.mjs: shared plumbing for the QA scripts (a11y.mjs, interact.mjs, requests.mjs): serve the last
// `next build` with `next start` on a free port, drive the installed Chrome with puppeteer-core (from capture/, no
// browser download), open pages as a given width × theme × motion, and always stop the server and Chrome at the end.
// Every script that uses it is a heavy job: run it through scripts/heavy.sh.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { createWriteStream, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../..");
const require = createRequire(path.join(REPO, "capture", "package.json"));
export const puppeteer = require("puppeteer-core");

export const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);
export const flag = (name) => args.includes(`--${name}`);
export const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
export const list = (value) => String(value).split(",").map((v) => v.trim()).filter(Boolean);

let server = null;
let browser = null;
let profile = null;

export async function cleanup() {
  try {
    if (browser) await browser.close();
  } catch {}
  browser = null;
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM"); // the process group: npx, next and its workers
    } catch {}
  }
  server = null;
  if (profile) rmSync(profile, { recursive: true, force: true });
  profile = null;
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, async () => {
    await cleanup();
    process.exit(130);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** `next start` on a free port, serving the last build. Returns the base URL. */
export async function startServer(logName = "next-start-qa.log") {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const logs = path.join(REPO, ".work", "qa", "logs");
  mkdirSync(logs, { recursive: true });
  server = spawn("npx", ["next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: REPO,
    env: process.env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = createWriteStream(path.join(logs, logName));
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  for (let i = 0; i < 180; i++) {
    try {
      const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return base;
    } catch {}
    await sleep(500);
  }
  throw new Error(`next start did not answer at ${base}`);
}

/** The installed Chrome, headless, with a throwaway profile under .work/qa. */
export async function launch(extraArgs = []) {
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
      ...extraArgs,
    ],
  });
  return browser;
}

export const viewportHeight = (width) => (width < 500 ? 844 : width <= 1600 ? 900 : 1080);

/**
 * A page at `width` × `theme` × `motion` ("on" | "paused" | "reduced"). Under 500 px it is an iPhone (user agent,
 * touch), so the page shows its non-Mac call to action. `problems` collects console errors and warnings, page errors,
 * failed requests (and 4xx/5xx responses) and CSP violations.
 */
export async function openPage(base, pagePath, { width, theme, motion = "on", height, keepDownloads = false } = {}) {
  const page = await browser.newPage();
  const phone = width < 500;
  const problems = { console: [], pageErrors: [], failed: [], csp: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.console.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.pageErrors.push(String(err)));
  page.on("requestfailed", (req) => {
    const why = req.failure()?.errorText ?? "";
    if (why === "net::ERR_ABORTED" && /\.(mp4|webm)(\?|$)/.test(req.url())) return; // a video the page itself stopped
    problems.failed.push(`${req.url()} ${why}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) problems.failed.push(`${res.status()} ${res.url()}`);
  });
  if (phone) await page.setUserAgent(IPHONE_UA);
  await page.setViewport({ width, height: height ?? viewportHeight(width), deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: theme },
    { name: "prefers-reduced-motion", value: motion === "reduced" ? "reduce" : "no-preference" },
  ]);
  await page.evaluateOnNewDocument(
    (t, m, keep) => {
      try {
        localStorage.setItem("pebble-theme", t);
        localStorage.setItem("pebble-motion", m === "paused" ? "paused" : "on");
      } catch {}
      window.__csp = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
      if (!keep) {
        // stay on the page: a click on Download must not start a download or navigate away
        document.addEventListener(
          "click",
          (e) => {
            const a = e.target instanceof Element ? e.target.closest('[data-cta="download"]') : null;
            if (a) e.preventDefault();
          },
          true,
        );
      }
    },
    theme,
    motion,
    keepDownloads,
  );
  await page.goto(`${base}${pagePath}`, { waitUntil: "networkidle0", timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  return { page, problems };
}

/** Scroll through the whole page once (lazy media loads, the line draws on), then back to the top. */
export async function scrollThrough(page, { pause = 140 } = {}) {
  await page.evaluate(async (wait) => {
    const to = (top) => window.scrollTo({ top, left: 0, behavior: "instant" });
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      to(y);
      await new Promise((r) => setTimeout(r, wait));
    }
    to(document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
  }, pause);
}

export async function cspViolations(page) {
  return page.evaluate(() => window.__csp ?? []);
}
