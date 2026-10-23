// tools/qa/sheets.mjs: pack a shot.mjs run's viewport tiles into review sheets at full resolution (critic H10).
//
//   node tools/qa/sheets.mjs <run> [--max=1600]
//
// For each page × width × motion, the light and dark tile at the same scroll position sit side by side, labelled with
// the width, theme, tile number and scroll position. As many pairs go on one sheet as fit in --max pixels of width
// (phones: two pairs, so four tiles; 768: one pair), so an agent reads every tile at its real size. Wider tiles are
// left as they are (open them one by one). Output: .work/qa/screens/<run>/sheets/. Light work (sharp only); it needs
// no heavy.sh lock.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const sharp = createRequire(path.join(REPO, "tools", "assets", "package.json"))("sharp");

const args = process.argv.slice(2);
const run = args.find((a) => !a.startsWith("--"));
const maxArg = args.find((a) => a.startsWith("--max="));
const MAX = maxArg ? Number(maxArg.slice(6)) : 1600;
if (!run) {
  console.error("usage: node tools/qa/sheets.mjs <run> [--max=1600]");
  process.exit(64);
}
const DIR = path.join(REPO, ".work", "qa", "screens", run);
// report.json lists each shot's tiles with their scroll positions; a run that was stopped early has none, so fall back
// to the tile file names (<page>-<width>-<theme>-<motion>-tile-NN.png).
const report = existsSync(path.join(DIR, "report.json"))
  ? JSON.parse(readFileSync(path.join(DIR, "report.json"), "utf8"))
  : (() => {
      const shots = new Map();
      for (const file of readdirSync(DIR).sort()) {
        const m = file.match(/^(.+)-(\d+)-(light|dark)-(on|paused|reduced)-tile-(\d+)\.png$/);
        if (!m) continue;
        const [, slug, width, theme, motion] = m;
        const key = `${slug}|${width}|${theme}|${motion}`;
        if (!shots.has(key)) shots.set(key, { path: slug === "home" ? "/" : `/${slug}`, width: Number(width), theme, motion, tiles: [] });
        shots.get(key).tiles.push(file);
      }
      return { results: [...shots.values()] };
    })();
const OUT = path.join(DIR, "sheets");
mkdirSync(OUT, { recursive: true });

const GAP = 8;
const LABEL = 22;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (text, width) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL}"><rect width="100%" height="100%" fill="#2a2f2b"/>` +
      `<text x="6" y="15" font-family="Menlo, monospace" font-size="12" fill="#e8ece6">${esc(text)}</text></svg>`,
  );

// group: page|width|motion → theme → tiles
const groups = new Map();
for (const r of report.results) {
  const key = `${r.path}|${r.width}|${r.motion}`;
  if (!groups.has(key)) groups.set(key, {});
  groups.get(key)[r.theme] = r;
}

let made = 0;
for (const [key, byTheme] of groups) {
  const [pagePath, widthText, motion] = key.split("|");
  const width = Number(widthText);
  const themes = Object.keys(byTheme).sort(); // dark, light
  const ordered = ["light", "dark"].filter((t) => themes.includes(t));
  const pairWidth = ordered.length * width + (ordered.length - 1) * GAP;
  const perSheet = Math.max(1, Math.floor((MAX + GAP) / (pairWidth + GAP)));
  if (pairWidth > MAX) continue; // wide tiles: read them one by one
  const count = Math.max(...ordered.map((t) => byTheme[t].tiles.length));
  for (let start = 0, n = 1; start < count; start += perSheet, n++) {
    const composites = [];
    let x = 0;
    let height = 0;
    for (let i = start; i < Math.min(count, start + perSheet); i++) {
      for (const theme of ordered) {
        const tile = byTheme[theme].tiles[i];
        if (!tile) {
          x += width + GAP;
          continue;
        }
        const file = typeof tile === "string" ? tile : tile.file;
        const y = typeof tile === "string" ? "?" : tile.y;
        const src = path.join(DIR, file);
        if (!existsSync(src)) continue;
        const meta = await sharp(src).metadata();
        const img = meta.width > width ? await sharp(src).resize({ width }).toBuffer() : await sharp(src).toBuffer();
        const h = meta.width > width ? Math.round((meta.height * width) / meta.width) : meta.height;
        composites.push({ input: label(`${width} ${theme} ${motion} #${String(i + 1).padStart(2, "0")} y=${y}`, width), left: x, top: 0 });
        composites.push({ input: img, left: x, top: LABEL });
        height = Math.max(height, h + LABEL);
        x += width + GAP;
      }
    }
    if (!composites.length) continue;
    const slug = pagePath === "/" ? "home" : pagePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-");
    const file = path.join(OUT, `${slug}-${width}-${motion}-${String(n).padStart(2, "0")}.png`);
    await sharp({ create: { width: x - GAP, height, channels: 3, background: "#808080" } })
      .composite(composites)
      .png({ compressionLevel: 9 })
      .toFile(file);
    made++;
  }
}
console.log(`${made} sheet(s) → ${OUT}`);
