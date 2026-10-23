// The companion's quick chat for the "On your desktop" section (lane F2a): Pebble's real quick-chat window, without
// the app's own pebble, so the page's live pebble (the same engine) can sit where the app draws it.
//
// Source: capture.mjs's `pet-chat` scene (the companion window, 384 × 456 pt, transparent), both themes at 3x:
//   scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs pet-chat --exact --themes=light,dark \
//     --scale=3 --out=capture/shots/page --locale=en-GB --tz=Europe/London
// Then (from the repo root, after `source scripts/env.sh`):
//   node tools/assets/quick-chat.mjs [--src=capture/shots/page] [--out=public/ui/v1]
//
// The app draws its pebble under the window's lower-right corner, overlapping the window's bottom edge. The window
// is symmetric left to right, so the region under the pebble (the window's last rows, its edge and its shadow) is
// replaced by its mirror image from the left side, which has no pebble. Nothing above that strip is touched: the
// lowest UI element (the send button) ends well above it, which is checked below. The transparent rows under the
// shadow are trimmed. Output: <out>/quick-chat-<theme>-<1152|768>.avif|webp, with alpha (sharp writes no metadata).
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
const WIDTHS = [1152, 768];
const AVIF = { quality: 62, effort: 6 };
const WEBP = { quality: 84, effort: 6, alphaQuality: 90 };

/** The mirrored strip, in 3x pixels: everything at or below STRIP_Y, right of STRIP_X. */
const STRIP_Y = 1060;
const STRIP_X = 700;

fs.mkdirSync(OUT, { recursive: true });
for (const theme of ["light", "dark"]) {
  const source = path.join(SRC, `pet-chat-${theme}@3x.png`);
  if (!fs.existsSync(source)) throw new Error(`missing ${path.relative(REPO, source)}: capture pet-chat at --scale=3 first`);
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  if (W !== 1152 || H !== 1368) throw new Error(`${path.basename(source)} is ${W} × ${H}, expected 1152 × 1368 (384 × 456 at 3x)`);
  const at = (x, y) => (y * W + x) * 4;
  const opaque = (x, y) => data[at(x, y) + 3] > 250;

  // The window's horizontal extent, from a row in its middle: the mirror axis is its centre.
  const row = 600;
  let first = 0;
  while (first < W && !opaque(first, row)) first++;
  let last = W - 1;
  while (last >= 0 && !opaque(last, row)) last--;
  const mirror = first + last; // x' = mirror - x

  // The send button (the lowest control, at the right) must end above the strip: compare a row just above the strip
  // with its mirror image; they differ only where content is.
  let differs = 0;
  for (let x = STRIP_X; x < W; x++) {
    const a = at(x, STRIP_Y - 4);
    const b = at(mirror - x, STRIP_Y - 4);
    for (let c = 0; c < 4; c++) if (Math.abs(data[a + c] - data[b + c]) > 3) differs++;
  }
  if (differs) throw new Error(`${theme}: the row above the strip is not symmetric (${differs} channels differ): move STRIP_Y down`);

  for (let y = STRIP_Y; y < H; y++)
    for (let x = STRIP_X; x < W; x++) {
      const from = mirror - x;
      if (from < 0) continue;
      data.copy(data, at(x, y), at(from, y), at(from, y) + 4);
    }

  // Trim the transparent rows under the shadow.
  let bottom = H - 1;
  const visible = (y) => {
    for (let x = 0; x < W; x++) if (data[at(x, y) + 3] > 1) return true;
    return false;
  };
  while (bottom > 0 && !visible(bottom)) bottom--;
  const height = bottom + 1;
  const patched = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 0, top: 0, width: W, height });

  for (const width of WIDTHS) {
    const resized = sharp(await patched.clone().png().toBuffer()).resize({ width, kernel: "lanczos3" });
    const base = path.join(OUT, `quick-chat-${theme}-${width}`);
    const avif = await resized.clone().avif(AVIF).toFile(`${base}.avif`);
    const webp = await resized.clone().webp(WEBP).toFile(`${base}.webp`);
    console.log(`${path.basename(base).padEnd(26)} ${avif.width}x${avif.height}  avif ${(avif.size / 1024).toFixed(0)} KB  webp ${(webp.size / 1024).toFixed(0)} KB`);
  }
  console.log(`${theme}: window ${first}..${last}, mirrored x >= ${STRIP_X}, y >= ${STRIP_Y}; kept ${height} of ${H} rows`);
}
