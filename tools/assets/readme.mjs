// README media for the Pebble repo (OVERRIDES §6): real-UI captures -> PNG stills, a composed hero and the gaze GIF.
//
// Usage (from the repo root, after `source scripts/env.sh`; capture the sources first, see capture/README.md):
//   node tools/assets/readme.mjs --out=/path/to/readme [--src=capture/shots/readme] [--frames=capture/frames-vclock]
//
// Every PNG is re-encoded by sharp, which writes no metadata (no EXIF, XMP, ICC or text chunks), then checked.
// The hero places the main window (rounded corners, a hairline edge, a soft shadow and three plain circles for the
// window controls; no Apple artwork) beside the floating pebble on a plain backdrop. The GIF composites the pebble's
// recorded frames (record.mjs pet-gaze) with our own cursor (a black arrow with a white edge) and cross-fades the last
// half second into the first, so it loops without a seam; ffmpeg's palettegen/paletteuse make the palette.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const OUT = opt("out", "") ? path.resolve(opt("out", "")) : null;
if (!OUT) throw new Error("--out=DIR is required (the README media folder, outside this repo)");
const SRC = path.resolve(REPO, opt("src", "capture/shots/readme"));
const FRAMES = path.resolve(REPO, opt("frames", "capture/frames-vclock"));
const FF = process.env.FF || "/opt/homebrew/bin/ffmpeg";
fs.mkdirSync(OUT, { recursive: true });

const THEMES = {
  dark: { backdrop: "#0e120f", edge: "rgba(255,255,255,0.10)", shadow: "rgba(0,0,0,0.62)", suffix: "" },
  light: { backdrop: "#e1e7dd", edge: "rgba(19,37,27,0.12)", shadow: "rgba(19,37,27,0.24)", suffix: "-light" },
};
const png = (image) => image.png({ compressionLevel: 9, adaptiveFiltering: true });
const written = [];
const src = (name) => {
  const file = path.join(SRC, name);
  if (!fs.existsSync(file)) throw new Error("missing source " + path.relative(REPO, file));
  return file;
};

// ---- stills -------------------------------------------------------------------------------------------------------
// [output stem, capture file stem (without -<theme>@scale), scale suffix]
const STILLS = [
  ["02-project-edit", "main-approval-wide", "1.6667"],
  ["03-agentguard", "held-unverified-wide", "1.6667"],
  ["03b-agentguard-challenge", "main-challenge-wide", "1.6667"],
  ["04-memory", "settings-memory-wide", "1.6667"],
  ["04b-memory-forget", "main-forget-wide", "1.6667"],
  ["05-views", "main-dashboard", "1.6667"],
];
for (const [stem, capture, scale] of STILLS) {
  for (const [theme, t] of Object.entries(THEMES)) {
    const file = path.join(OUT, `${stem}${t.suffix}.png`);
    await png(sharp(src(`${capture}-${theme}@${scale}x.png`)).removeAlpha()).toFile(file);
    written.push(file);
  }
}

// ---- 01: the hero ---------------------------------------------------------------------------------------------------
const S = 1.675; // capture scale of main-welcome and pet-collapsed-gaze (2400 px canvas)
for (const [theme, t] of Object.entries(THEMES)) {
  const win = sharp(src(`main-welcome-${theme}@${S}x.png`));
  const { width: W, height: H } = await win.metadata();
  const pet = src(`pet-collapsed-gaze-${theme}@${S}x.png`);
  const P = (await sharp(pet).metadata()).width;
  const canvas = { width: 2400, height: H + 2 * 110 };
  const at = { x: 96, y: 110 };
  const petAt = { x: at.x + W + Math.round(44 * S), y: at.y + H - P - Math.round(18 * S) };
  const radius = Math.round(12 * S);
  const mask = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
  const lights = [["#ff5f57", "#e0443e"], ["#febc2e", "#dea123"], ["#28c840", "#1aab29"]]
    .map(([fill, line], i) => `<circle cx="${(20 + i * 20) * S}" cy="${20 * S}" r="${6 * S - 0.5}" fill="${fill}" stroke="${line}" stroke-width="${0.5 * S}"/>`).join("");
  const chrome = Buffer.from(`<svg width="${W}" height="${H}">${lights}<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="${radius}" ry="${radius}" fill="none" stroke="${t.edge}" stroke-width="1.5"/></svg>`);
  const windowImage = await win.composite([{ input: mask, blend: "dest-in" }, { input: chrome }]).png().toBuffer();
  // The shadow: the window's rounded box, offset down and blurred, on a layer the size of the canvas.
  const shadow = await sharp(Buffer.from(`<svg width="${canvas.width}" height="${canvas.height}"><rect x="${at.x}" y="${at.y + Math.round(14 * S)}" width="${W}" height="${H}" rx="${radius}" fill="${t.shadow}"/></svg>`))
    .blur(34).png().toBuffer();
  const file = path.join(OUT, `01-hero${t.suffix}.png`);
  await png(sharp({ create: { ...canvas, channels: 4, background: t.backdrop } })
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: windowImage, left: at.x, top: at.y },
      { input: pet, left: petAt.x, top: petAt.y },
    ])).removeAlpha().toFile(file);
  written.push(file);
}

// ---- 06: the gaze GIF ---------------------------------------------------------------------------------------------
const GIF = { width: 600, height: 450, fps: 20, period: 6, fade: 10, radius: { x: 228, y: 178 } };
const cursorSvg = Buffer.from(`<svg width="30" height="44" viewBox="-2 -2 30 44"><path d="M0 0 L0 30 L7.5 23 L12.5 35 L18 32.5 L13 21 L23 21 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`);
const cursor = await sharp(cursorSvg).png().toBuffer();
for (const [theme, t] of Object.entries(THEMES)) {
  const dir = path.join(FRAMES, `pet-gaze-${theme}`);
  const timeline = JSON.parse(fs.readFileSync(path.join(dir, "timeline.json"), "utf8"));
  const frames = fs.readdirSync(dir).filter((f) => /^\d{5}\.png$/.test(f)).sort();
  const T = GIF.period * GIF.fps, k = GIF.fade;
  if (timeline.fps !== GIF.fps || frames.length < T + k) throw new Error(`pet-gaze-${theme}: need ${T + k} frames at ${GIF.fps} fps`);
  const petSize = (await sharp(path.join(dir, frames[0])).metadata()).width;
  const petAt = { x: Math.round((GIF.width - petSize) / 2), y: Math.round((GIF.height - petSize) / 2) };
  // One opaque RGB frame: the pebble's transparent frame over the backdrop (composite adds alpha; drop it).
  const onBackdrop = async (i) => {
    const flat = await sharp({ create: { width: GIF.width, height: GIF.height, channels: 3, background: t.backdrop } })
      .composite([{ input: path.join(dir, frames[i]), left: petAt.x, top: petAt.y }]).png().toBuffer();
    return sharp(flat).removeAlpha().raw().toBuffer();
  };
  const work = path.join(REPO, ".work", "readme-gif-" + theme); // gitignored; removed below
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  try {
    for (let j = 0; j < T; j++) {
      let pixels = await onBackdrop(k + j);
      if (j >= T - k) { // cross-fade into the frames that precede the loop's first frame
        const w = (j - (T - k) + 1) / (k + 1), other = await onBackdrop(j - (T - k));
        pixels = Buffer.from(pixels.map((v, n) => Math.round(v * (1 - w) + other[n] * w)));
      }
      const c = timeline.cursor[(k + j) % T]; // the path is periodic: frame k + j and frame (k + j) mod T share it
      const x = Math.round(GIF.width / 2 + (c.dx / Math.hypot(c.dx, c.dy)) * GIF.radius.x * Math.min(1, Math.hypot(c.dx, c.dy) / 280));
      const y = Math.round(GIF.height / 2 + (c.dy / Math.hypot(c.dx, c.dy)) * GIF.radius.y * Math.min(1, Math.hypot(c.dx, c.dy) / 280));
      await sharp(pixels, { raw: { width: GIF.width, height: GIF.height, channels: 3 } })
        .composite([{ input: cursor, left: x - 2, top: y - 2 }]).png().toFile(path.join(work, String(j).padStart(4, "0") + ".png"));
    }
    const file = path.join(OUT, `06-pebble-gaze${t.suffix}.gif`);
    execFileSync(FF, ["-y", "-v", "error", "-framerate", String(GIF.fps), "-i", path.join(work, "%04d.png"),
      "-vf", "split[a][b];[a]palettegen=max_colors=128:stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=sierra2_4a",
      "-loop", "0", file]);
    written.push(file);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// ---- checks: sizes, metadata, no local paths ----------------------------------------------------------------------
const rows = [];
for (const file of written) {
  const meta = await sharp(file, { animated: true }).metadata();
  const bytes = fs.statSync(file).size;
  const strings = execFileSync("strings", ["-n", "5", file]).toString();
  const leaks = ["exif", "icc", "iptc", "xmp"].filter((key) => meta[key]);
  if (/\/Users\/|Pebble Mock|fixture|puppeteer|HeadlessChrome/i.test(strings)) leaks.push("strings");
  const height = meta.pages ? meta.pageHeight : meta.height;
  rows.push({ file: path.basename(file), size: `${meta.width}x${height}${meta.pages ? " · " + meta.pages + " frames" : ""}`, bytes, leaks });
}
for (const r of rows) console.log(`${r.file.padEnd(36)} ${r.size.padEnd(24)} ${String(r.bytes).padStart(9)} B  ${r.leaks.length ? "METADATA: " + r.leaks.join(",") : "clean"}`);
console.log(`README: ${rows.length} files in ${OUT}; metadata or path leaks: ${rows.filter((r) => r.leaks.length).length}`);
fs.writeFileSync(path.join(SRC, "readme-files.json"), JSON.stringify(rows, null, 1));
if (rows.some((r) => r.leaks.length) || rows.some((r) => r.file.endsWith(".gif") && r.bytes > 5 * 1024 * 1024)) process.exitCode = 1;
