// Deterministic frame-by-frame recording of the REAL Pebble UI (vclock mode): every frame is a 2x PNG screenshot taken
// after advancing the page's virtual clock by exactly 1/fps, with backend events played from a timeline.
// Usage: node record.mjs [pet-live] [--theme=light|dark] [--fps=30] [--scale=2] [--out=frames-vclock/<name>-<theme>]
// Output: numbered PNGs (+ timeline.json). Encode later, e.g. ffmpeg -framerate 30 -i %05d.png -c:v prores_ks -pix_fmt yuva444p10le out.mov
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const NAME = args.find((a) => !a.startsWith("--")) || "pet-live";
const THEME = opt("theme", "light");
const FPS = Number(opt("fps", "30"));
const SCALE = Number(opt("scale", "2"));
const BASE = opt("base", "http://127.0.0.1:5199/");
const OUT = path.resolve(opt("out", path.join(HERE, "frames-vclock", `${NAME}-${THEME}`)));

// A timeline: [seconds, action(page)] pairs, played in order as virtual time passes.
const emit = (event, data) => (page) => page.evaluate((e, d) => window.__pebble.emit(e, d), event, data);
const TIMELINES = {
  "pet-live": {
    url: "?pet&scene=pet-live",
    viewport: { width: 384, height: 456 },
    transparent: true,
    seconds: 9,
    build() {
      const chat = "chat-live-pet", run = "run-live-1", reply = "msg-live-pet-reply";
      const question = "Will it rain in Lisbon tomorrow morning?";
      const answer = "Light showers until about **11:00**, then clearing up, with a high of **19 °C**.\n\nPack a light jacket for the morning; the afternoon looks good for a walk in Alfama.";
      const steps = [
        [0.6, (page) => page.click(".pet-avatar")],
        ...[...question].map((ch, i) => [1.3 + i * 0.035, (page) => page.keyboard.type(ch)]),
        [3.0, (page) => page.keyboard.press("Enter")],
        [3.15, emit("run", { chat_id: chat, run_id: run, state: "queued" })],
        [3.3, emit("run", { chat_id: chat, run_id: run, state: "running" })],
        [3.45, emit("progress", { chat_id: chat, run_id: run, kind: "working", tool: "Weather", activity: "searching", label: "Looking up current weather" })],
        [4.7, emit("progress", { chat_id: chat, run_id: run, kind: "done", tool: "Weather", activity: "searching", label: "Looking up current weather" })],
      ];
      // Stream the reply word by word between 4.8 s and 6.6 s.
      const words = answer.split(/(?<=\s)/);
      words.forEach((w, i) => steps.push([4.8 + (1.8 * i) / words.length, emit("token", { chat_id: chat, run_id: run, id: reply, text: w })]));
      const usage = { input_tokens: 1840, output_tokens: 58, cached_tokens: 1024, tokens_per_second: 42.0, route: "model", calls: 2, seconds: 1.4 };
      steps.push(
        [6.7, emit("usage", { chat_id: chat, id: reply, usage })],
        [6.75, (page) => page.evaluate((c, r, id, text, u) => {
          const live = window.__pebble.world.live;
          live.message(c, { id, role: "assistant", content: text, run_id: r, usage: u });
          live.run(c, { id: r, state: "completed", elapsed: 4, counts: { steps: 1, retries: 0, waited: 0 } });
          live.active(null, null);
        }, chat, run, reply, answer, usage)],
        [6.8, emit("run", { chat_id: chat, run_id: run, state: "completed" })],
        [7.4, emit("idle", { chat_id: chat, run_id: run })],
      );
      return steps.sort((a, b) => a[0] - b[0]);
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
try {
  const page = await browser.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  await page.setViewport({ ...spec.viewport, deviceScaleFactor: SCALE });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: THEME }]);
  await page.goto(`${BASE}${spec.url}&theme=${THEME}&vclock`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".pet-root, .app-shell");
  if (!(await page.evaluate(() => !!window.__pebbleClock))) throw new Error("vclock is not installed");
  await page.evaluate(() => window.__pebbleClock.advance(500)); // boot: first paint of the pebble
  const steps = spec.build();
  const total = Math.round(spec.seconds * FPS);
  let next = 0;
  for (let frame = 0; frame < total; frame++) {
    const t = frame / FPS;
    while (next < steps.length && steps[next][0] <= t) await steps[next++][1](page);
    await page.evaluate((ms) => window.__pebbleClock.advance(ms), 1000 / FPS);
    await page.screenshot({ path: path.join(OUT, String(frame + 1).padStart(5, "0") + ".png"), omitBackground: !!spec.transparent, captureBeyondViewport: false });
  }
  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ name: NAME, theme: THEME, fps: FPS, scale: SCALE, frames: total, problems }, null, 1));
  const seconds = (Date.now() - started) / 1000;
  console.log(`${NAME} [${THEME}] ${total} frames at ${FPS} fps (${spec.seconds} s of video) in ${seconds.toFixed(1)} s -> ${OUT}${problems.length ? "  page errors: " + problems.join(" | ") : ""}`);
} finally {
  await browser.close();
}
