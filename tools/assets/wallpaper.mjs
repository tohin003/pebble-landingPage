// The riverbed wallpaper (design comp 2: speckled sage stones lit from the upper left, and its dusk twin) as the
// site's raster backdrop for product media (docs/DESIGN.md §1, §6). The 87 KB feTurbulence SVGs never ship; they are
// rendered here by sharp (librsvg) at 1× and 2× of their 1600 × 1000 size and encoded like the UI stills.
//
//   node tools/assets/wallpaper.mjs [--out=public/media/v1]      (run it through scripts/heavy.sh: AVIF is slow)
//
// Writes wallpaper-<light|dark>-<1600|3200>.<avif|webp>: AVIF quality 64 effort 6 and WebP quality 80 (a little
// higher than the stills, so a hint of the stones' speckle survives; each file is still under 35 KB), no metadata.
// Sources: tools/assets/wallpaper/wallpaper-<theme>.svg, copied from .work/design/comp-2/assets (made by that comp's
// tools/wallpaper.py, deterministic).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, statSync } from "node:fs";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const OUT = path.resolve(REPO, opt("out", "public/media/v1"));
mkdirSync(OUT, { recursive: true });

const WIDTHS = [1600, 3200];
for (const theme of ["light", "dark"]) {
  const source = path.join(HERE, "wallpaper", `wallpaper-${theme}.svg`);
  for (const width of WIDTHS) {
    const density = 72 * (width / 1600);
    const raster = await sharp(source, { density }).resize({ width }).removeAlpha().png().toBuffer();
    const base = path.join(OUT, `wallpaper-${theme}-${width}`);
    await sharp(raster).avif({ quality: 64, effort: 6 }).toFile(`${base}.avif`);
    await sharp(raster).webp({ quality: 80, effort: 6 }).toFile(`${base}.webp`);
    const kb = (file) => (statSync(file).size / 1024).toFixed(1);
    console.log(`${theme} ${width}: avif ${kb(`${base}.avif`)} KB, webp ${kb(`${base}.webp`)} KB`);
  }
}
