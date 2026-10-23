// tools/encode/poster.mjs: a video poster (a Remotion still, PNG) -> <out-base>.avif + <out-base>.webp for the page.
//
// usage (repo root; encode.sh runs it as a heavy job): node tools/encode/poster.mjs <png> <out-base> <width> <height>
//   e.g. node tools/encode/poster.mjs video/out/stills/film-poster.png public/media/v1/film.poster 1920 1080
//
// MASTER_PLAN §5.5: AVIF quality 50 effort 6 (<= 60 KB) and WebP quality 76 (<= 90 KB), with sharp from
// tools/assets/node_modules (the same encoder settings as tools/assets/stills.mjs; no new dependency). Over budget,
// the quality steps down by 2 (AVIF to 30 at the lowest, WebP to 50) until the file fits. A simple picture (flat
// fields and soft gradients, such as L1's riverbed) comes out under a quarter of its budget at the start quality, and
// that is where the start quality shows: banding, block columns and lost texture (measured on loop-companion.poster:
// AVIF q50 2.9 KB with streaks along the stone's edge, WebP q76 6.4 KB with block columns, while the loop's own frame 0
// keeps the texture). Such a poster gets the highest quality, in steps of 2 up to AVIF 80 / WebP 90, whose file still
// stays under that quarter. The PNG must have the poster's aspect ratio (within 1 %): it is resized with Lanczos, never
// cropped or stretched, and an opaque PNG loses its alpha channel. sharp writes no metadata. Files are written through
// a dot-file and a rename.
// Exit 0: both fit. Exit 1: a file is over budget even at the lowest quality (it is written anyway, for a look).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const KB = 1000;
export const POSTER = {
  avif: { start: 50, floor: 30, ceiling: 80, step: 2, effort: 6, budget: 60 * KB },
  webp: { start: 76, floor: 50, ceiling: 90, step: 2, effort: 6, budget: 90 * KB },
};
/** Under this share of its budget at the start quality, a poster is a simple picture and its quality is raised. */
export const SIMPLE_SHARE = 0.25;

async function loadSharp() {
  const require = createRequire(path.join(REPO, "tools/assets/package.json"));
  let resolved;
  try {
    resolved = require.resolve("sharp");
  } catch {
    throw new Error("sharp is not installed in tools/assets (cd tools/assets && npm ci)");
  }
  const mod = await import(pathToFileURL(resolved).href);
  return mod.default ?? mod;
}

function writeAtomic(file, buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, file);
}

async function main() {
  const [png, base, w, h] = process.argv.slice(2);
  const width = Number(w);
  const height = Number(h);
  if (!png || !base || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    console.error("usage: node tools/encode/poster.mjs <png> <out-base> <width> <height>");
    return 2;
  }
  if (/\.(avif|webp|png)$/i.test(base)) throw new Error("out-base takes no extension: <out-base>.avif and <out-base>.webp are written");
  const sharp = await loadSharp();
  const meta = await sharp(png).metadata();
  const aspect = width / height;
  const srcAspect = meta.width / meta.height;
  if (Math.abs(srcAspect - aspect) / aspect > 0.01) throw new Error(`${path.basename(png)} is ${meta.width}x${meta.height}; a ${width}x${height} poster needs the same aspect ratio (render the still at that aspect)`);
  if (meta.width < width) console.error(`poster.mjs: note: ${meta.width}x${meta.height} is upscaled to ${width}x${height}; render the still at ${width} wide or more`);
  const { isOpaque } = await sharp(png).stats();
  let pipeline = sharp(png).resize(width, height, { fit: "fill", kernel: "lanczos3" });
  if (isOpaque) pipeline = pipeline.removeAlpha();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const raw = () => sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });

  // Tests only: ENCODE_BUDGET_SCALE multiplies the budgets so a test image exercises the quality steps.
  const scale = Number(process.env.ENCODE_BUDGET_SCALE ?? 1) || 1;
  if (scale !== 1) console.error(`poster.mjs: TEST MODE: ENCODE_BUDGET_SCALE=${scale} scales the budgets`);
  let over = 0;
  for (const format of ["avif", "webp"]) {
    const spec = { ...POSTER[format], budget: Math.round(POSTER[format].budget * scale) };
    const encode = (q) => raw()[format]({ quality: q, effort: spec.effort }).toBuffer();
    let quality = spec.start;
    let buffer = await encode(quality);
    const simpleCap = Math.floor(spec.budget * SIMPLE_SHARE);
    const simple = buffer.length <= simpleCap;
    if (simple) {
      // The highest quality on the start + k * step grid (up to the ceiling) whose file stays under the cap. The size
      // rises with the quality, so a binary search over the grid finds it in a few encodes.
      let lo = 0;
      let hi = Math.floor((spec.ceiling - spec.start) / spec.step);
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const candidate = await encode(spec.start + mid * spec.step);
        if (candidate.length <= simpleCap) {
          lo = mid;
          quality = spec.start + mid * spec.step;
          buffer = candidate;
        } else hi = mid - 1;
      }
    } else {
      while (buffer.length > spec.budget && quality - spec.step >= spec.floor) {
        quality -= spec.step;
        buffer = await encode(quality);
      }
    }
    const file = `${base}.${format}`;
    writeAtomic(file, buffer);
    const fits = buffer.length <= spec.budget;
    if (!fits) over++;
    const shown = file.startsWith(REPO + path.sep) ? path.relative(REPO, file) : file;
    const how = quality === spec.start ? "" : simple ? ` (from q${spec.start}: a simple picture, kept under ${simpleCap / KB} KB)` : ` (from q${spec.start})`;
    console.error(
      `poster.mjs: ${fits ? "ok  " : "OVER"} ${shown} ${width}x${height} q${quality}${how} ` +
        `${(buffer.length / KB).toFixed(1)} KB, budget ${spec.budget / KB} KB${isOpaque ? "" : ", with alpha"}`,
    );
  }
  return over ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`poster.mjs: ${error.message}`);
    process.exit(2);
  },
);
