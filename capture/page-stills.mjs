// Page stills that tools/assets/stills.mjs doesn't list (yet): Pebble 1.1.0's Settings › Privacy and focus, with
// Stealth Lockdown off and on, as the whole 1440 × 900 window and as a crop of the section. The encoding is
// tools/assets/stills.mjs's, unchanged: Lanczos 3 down to 2400 and 1200 px wide, AVIF quality 50 effort 6, WebP
// quality 76 effort 6, no metadata (sharp writes none), the same budget (an AVIF at 2400 w over 300 KB is OVER) and
// the same names: public/ui/v1/<name>-<theme>-<width>.avif|webp. The windows are 16:10 (2400 × 1500, 1200 × 750), as
// media.ts uiStill() expects; a crop keeps its own aspect, printed below.
//
// Sources (capture.mjs, both themes, into capture/shots/page): the windows at --scale=3, the crops at --scale=5 (a
// 520 pt section is 2600 px wide at 5x, enough for the 2400 px file).
//   scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs settings-privacy-wide settings-privacy-on-wide \
//     --exact --scale=3 --out=capture/shots/page --locale=en-GB --tz=Europe/London
//   scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs crop-privacy-card crop-privacy-card-on \
//     --exact --scale=5 --out=capture/shots/page --locale=en-GB --tz=Europe/London
// Then (from the repo root, after `source scripts/env.sh`):
//   node capture/page-stills.mjs [--src=capture/shots/page] [--out=public/ui/v1] [name ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const sharp = createRequire(path.join(REPO, "tools/assets/package.json"))("sharp"); // the stills tool's own copy
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const SRC = path.resolve(REPO, opt("src", "capture/shots/page"));
const OUT = path.resolve(REPO, opt("out", "public/ui/v1"));
const WIDTHS = [2400, 1200];
const THEMES = ["light", "dark"];
const AVIF = { quality: 50, effort: 6 };
const WEBP = { quality: 76, effort: 6 };
const BUDGET_2400 = 300 * 1024;

// name on the page -> capture scene, its scale, and what it shows. Keep in step with capture.mjs SCENES.
export const STILLS = {
  "settings-privacy-off": { scene: "settings-privacy-wide", scale: 3, shows: "Settings › Privacy and focus, Stealth Lockdown off: the switch, its description, \"Off. Pebble shows in screen shares, the Dock and ⌘Tab as usual.\", the honest line and the Stealth and Lockdown halves" },
  "settings-privacy-on": { scene: "settings-privacy-on-wide", scale: 3, shows: "The same with Stealth Lockdown on: \"On. Pebble is hidden from screen capture and won't take focus. Find it in the menu bar.\"; the app's pebbles behind the dialog wear the Veil" },
  "settings-privacy-card-off": { scene: "crop-privacy-card", scale: 5, shows: "The Privacy and focus section alone, off" },
  "settings-privacy-card-on": { scene: "crop-privacy-card-on", scale: 5, shows: "The Privacy and focus section alone, on" },
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
    const source = path.join(SRC, `${still.scene}-${theme}@${still.scale}x.png`);
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
for (const r of rows) console.log(`${r.file.padEnd(40)} ${r.size.padEnd(10)} avif ${kb(r.avif)}  webp ${kb(r.webp)}  ${r.flag}`);
const total = rows.reduce((n, r) => n + r.avif + r.webp, 0);
console.log(`STILLS: ${rows.length * 2} files in ${path.relative(REPO, OUT)}, ${(total / 1048576).toFixed(2)} MB; missing sources ${missing}; AVIF 2400 w over ${BUDGET_2400 / 1024} KB: ${over}`);
if (missing) process.exitCode = 1;
