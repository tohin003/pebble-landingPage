// Page stills: real-UI PNG captures (capture/capture.mjs) -> AVIF + WebP for the site, in both themes and two widths.
//
// Usage (from the repo root, after `source scripts/env.sh`):
//   node tools/assets/stills.mjs [--src=capture/shots/page] [--out=public/ui/v1] [--widths=2400,1200] [name ...]
//
// Sources are <src>/<scene>-<theme>@3x.png (capture.mjs at --scale=3), downscaled with Lanczos so text stays crisp.
// Outputs are <out>/<name>-<theme>-<width>.avif|webp (AVIF quality 50 effort 6, WebP quality 76; sharp writes no
// metadata). The widths follow critic H3 (twice the largest CSS slot) and the themes H5 (switch by [data-theme]);
// /ui/v1/ is versioned because /ui/* is served immutable (M2). The Pebble 1.0.4 retake replaced v1 in place (the lead's
// call, 2026-10-23: the site had never been deployed). Once the site is live, a re-capture goes to /ui/v2/, never over
// v1, or returning visitors keep the old pictures for a year.
// Budget: an AVIF at 2400 w over 300 KB (1600 w equivalent of 150 KB, scaled by area) is reported as OVER.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const SRC = path.resolve(REPO, opt("src", "capture/shots/page"));
const OUT = path.resolve(REPO, opt("out", "public/ui/v1"));
const WIDTHS = opt("widths", "2400,1200").split(",").map(Number);
const THEMES = ["light", "dark"];
const AVIF = { quality: 50, effort: 6 };
const WEBP = { quality: 76, effort: 6 };
const BUDGET_2400 = 300 * 1024;

// name on the page -> capture scene (and what it shows). Keep in step with capture.mjs SCENES.
export const STILLS = {
  "main-done": { scene: "main-done-wide", shows: "A finished coding task: the receipt with AgentGuard's verdict \"Verified · pytest 42 passed on current files\", the summary, and Undo this edit in Details › Activity" },
  "main-approval": { scene: "main-approval-wide", shows: "Two edit cards waiting for approval (plain-language lead, diff, Don't allow / Apply edit) in Ask for approval mode" },
  "held-unverified": { scene: "held-unverified-wide", shows: "AgentGuard holding a task: \"Pebble's change isn't verified yet.\" with Run the tests / Ask Pebble to finish / Accept as unverified" },
  "main-challenge": { scene: "main-challenge-wide", shows: "AgentGuard's scope challenge as the refused step's error in Details › Activity (\"5 file(s) changed that the task does not reach\")" },
  "settings-permissions": { scene: "settings-permissions-wide", shows: "Settings › Permissions: the three modes with their exact runs-without-asking / always-asks copy" },
  "settings-models": { scene: "settings-models-wide", shows: "Settings › Models: a local GGUF model on this Mac, Add a model file, Connect provider, Continue with ChatGPT" },
  "settings-memory": { scene: "settings-memory-wide", shows: "Settings › Memory: the six layers with counts and the \"Your preferences\" records, each with Forget" },
  "main-quiz": { scene: "main-quiz-wide", shows: "A quiz view in the canvas: \"Python datetime check-in\", question 1 of 5" },
  "main-dashboard": { scene: "main-dashboard", shows: "A dashboard view in the widened canvas: \"Lisbon trip budget\" with metrics and a planned-vs-spent chart" },
};

const wanted = args.filter((a) => !a.startsWith("--"));
const names = wanted.length ? wanted : Object.keys(STILLS);
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
let missing = 0, over = 0;
for (const name of names) {
  const still = STILLS[name];
  if (!still) throw new Error(`unknown still ${name}; known: ${Object.keys(STILLS).join(", ")}`);
  for (const theme of THEMES) {
    const source = path.join(SRC, `${still.scene}-${theme}@3x.png`);
    if (!fs.existsSync(source)) {
      console.error(`missing source ${path.relative(REPO, source)}`);
      missing++;
      continue;
    }
    const meta = await sharp(source).metadata();
    for (const width of WIDTHS) {
      if (width > meta.width) throw new Error(`${path.basename(source)} is ${meta.width} px wide, narrower than ${width}`);
      const resized = sharp(source).resize({ width, kernel: "lanczos3" }).removeAlpha();
      const base = path.join(OUT, `${name}-${theme}-${width}`);
      const avif = await resized.clone().avif(AVIF).toFile(base + ".avif");
      const webp = await resized.clone().webp(WEBP).toFile(base + ".webp");
      const flag = width === 2400 && avif.size > BUDGET_2400 ? "OVER" : "";
      if (flag) over++;
      rows.push({ file: path.basename(base), size: `${avif.width}x${avif.height}`, avif: avif.size, webp: webp.size, flag });
    }
  }
}
const kb = (n) => (n / 1024).toFixed(0).padStart(5) + " KB";
for (const r of rows) console.log(`${r.file.padEnd(36)} ${r.size.padEnd(10)} avif ${kb(r.avif)}  webp ${kb(r.webp)}  ${r.flag}`);
const total = rows.reduce((n, r) => n + r.avif + r.webp, 0);
console.log(`STILLS: ${rows.length * 2} files in ${path.relative(REPO, OUT)}, ${(total / 1048576).toFixed(2)} MB; missing sources ${missing}; AVIF 2400 w over ${BUDGET_2400 / 1024} KB: ${over}`);
if (missing) process.exitCode = 1;
