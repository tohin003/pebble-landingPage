// The site's icons (MASTER_PLAN §7.8), from Pebble's own artwork in the Pebble checkout (read-only, $PEBBLE_REPO):
//   src/app/icon.svg        browser-extension/icons/pebble.svg, as is
//   src/app/apple-icon.png  src-tauri/icons/app-icon.png, its rounded square cropped to a full-bleed 180 px square
//                           (iOS draws its own corners and fills transparency with black)
//   src/app/favicon.ico     16, 32 and 48 px renders of pebble.svg, joined by FFmpeg's ICO muxer (sharp can't
//                           write ICO)
//
//   source scripts/env.sh && node tools/assets/icons.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const PEBBLE = process.env.PEBBLE_REPO;
const FF = process.env.FF || "/opt/homebrew/bin/ffmpeg";
if (!PEBBLE) throw new Error("PEBBLE_REPO is not set (source scripts/env.sh)");
const APP = path.join(REPO, "src", "app");

// 1. icon.svg
const svg = path.join(PEBBLE, "browser-extension", "icons", "pebble.svg");
copyFileSync(svg, path.join(APP, "icon.svg"));

// 2. apple-icon.png: the 1024 px app icon's rounded square spans 40..984; fill its transparent corners with the
// square's own background colour, sampled from inside it.
const appIcon = path.join(PEBBLE, "src-tauri", "icons", "app-icon.png");
const { data } = await sharp(appIcon).extract({ left: 120, top: 120, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
const background = { r: data[0], g: data[1], b: data[2] };
await sharp(appIcon)
  .extract({ left: 40, top: 40, width: 944, height: 944 })
  .flatten({ background })
  .resize(180, 180, { kernel: "lanczos3" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(APP, "apple-icon.png"));

// 3. favicon.ico (16, 32, 48)
const tmp = mkdtempSync(path.join(tmpdir(), "pebble-icons-"));
try {
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) {
    const file = path.join(tmp, `pebble-${size}.png`);
    await sharp(svg, { density: Math.max(72, (72 * size) / 32) * 4 }).resize(size, size).png().toFile(file);
    pngs.push(file);
  }
  const inputs = pngs.flatMap((file) => ["-i", file]);
  const maps = pngs.flatMap((_, i) => ["-map", String(i)]);
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", ...inputs, ...maps, "-c", "copy", path.join(APP, "favicon.ico")]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

for (const name of ["icon.svg", "apple-icon.png", "favicon.ico"]) {
  console.log(`${name}: ${statSync(path.join(APP, name)).size} bytes`);
}
console.log(`apple-icon background: rgb(${background.r}, ${background.g}, ${background.b})`);
