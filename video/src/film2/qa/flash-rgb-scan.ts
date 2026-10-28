// Decodes a render to rgb24 on the flash grid with FFmpeg and runs qa/flash-rgb.ts (the flash verdict: MONTAGE_DESIGN
// §3.3 item 1, a port of research3's flashref.py v2). FFmpeg is a heavy job: run it through heavy.sh.
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh f2-flash /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/qa/flash-rgb-scan.ts <video.mp4> [--fps 60] [--src-w 1920] [--from 4206 --to 4985] [--out report.json] [--name x]
// The grid is 10 source px a cell on the short side (192 × 108 for 16:9, 108 × 108, 108 × 192), area-averaged, as the
// reference reads it; `--src-w` is the frame's width at full size (a half-size render of a 1920 frame is still 1920).
// Exit status 0 when no standard's rule fails (general and red: more than 6 transitions in a second, or the extended
// rule; scene changes; IRIS-like), 2 when one does. Only the report is written.
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { FlashRgb, flashFails, flashGrid } from "./flash-rgb";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("usage: bun flash-rgb-scan.ts <video> [--fps 60] [--src-w 1920] [--from a --to b] [--out report.json] [--name x]");
  process.exit(64);
}
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ff = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.env.FFPROBE ?? "/opt/homebrew/bin/ffprobe";
const probe = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { encoding: "utf8" });
const m = /(\d+)x(\d+)/.exec(probe.stdout ?? "");
if (!m) {
  console.error(`ffprobe could not read ${file}: ${probe.stderr}`);
  process.exit(1);
}
const vw = Number(m[1]);
const vh = Number(m[2]);
const g = flashGrid(vw, vh);
// the frame's width at full size: a half-size render of a 1080p frame is read as 1080p's
const srcW = Number(opt("src-w") ?? (Math.min(vw, vh) < 1080 ? (vw * 1080) / Math.min(vw, vh) : vw));
const fps = Number(opt("fps") ?? 60);
const from = opt("from");
const to = opt("to");
const select = from !== undefined && to !== undefined ? `select='between(n\\,${from}\\,${to})',` : "";
const scan = new FlashRgb({ w: g.w, h: g.h, fps, srcW, name: opt("name") ?? file });
const proc = spawn(ff, ["-v", "error", "-i", file, "-vf", `${select}scale=${g.w}:${g.h}:flags=area,format=rgb24`, "-fps_mode", "passthrough", "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
const size = g.w * g.h * 3;
const buf = new Uint8Array(size);
let fill = 0;
proc.stdout.on("data", (c: Buffer) => {
  let o = 0;
  while (o < c.length) {
    const n = Math.min(size - fill, c.length - o);
    buf.set(c.subarray(o, o + n), fill);
    fill += n;
    o += n;
    if (fill === size) {
      scan.push(buf);
      fill = 0;
    }
  }
});
proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(1);
  }
  const r = scan.finish();
  const fails = flashFails(r);
  const out = opt("out");
  if (out) writeFileSync(out, JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ ...r, fails }, null, 1));
  process.exit(fails.length ? 2 : 0);
});
