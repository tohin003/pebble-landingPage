// Blocking on a video's dark grounds (REVIEW-1 S11: LinkedIn re-encodes uploads at a few Mbps, and grain or soft
// gradients turn into 8 × 8 blocks). For each frame, the luma's step across the codec's 8-px block edges against its
// step everywhere else, measured only where the picture is dark and smooth (luma under 90, local detail low): 1.00 means
// no blocking, and blocking shows from about 1.3.
//
//   bun video/src/launch/master/blockiness.ts <file.mp4> [--from s] [--to s]
// Prints the median and the worst ratio, the darkest frames' share, and the worst second.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("usage: bun blockiness.ts <file.mp4> [--from s] [--to s]");
  process.exit(64);
}
const opt = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};
const probe = spawnSync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", file], { encoding: "utf8" });
const [w, h, rate] = probe.stdout.trim().split(",");
const W = Number(w);
const H = Number(h);
const [ra, rb] = rate.split("/").map(Number);
const fps = ra / (rb || 1);
const from = opt("--from");
const to = opt("--to");
const trim = [...(from !== undefined ? ["-ss", String(from)] : []), ...(to !== undefined ? ["-to", String(to)] : [])];
// every 5th frame at full size (blocking lives on the 8-px grid, so no scaling): 6 a second is plenty
const STEP = 5;
const ff = spawnSync("/opt/homebrew/bin/ffmpeg", ["-v", "error", ...trim, "-i", file, "-vf", `select=not(mod(n\\,${STEP})),format=gray`, "-fps_mode", "passthrough", "-f", "rawvideo", "-"], {
  maxBuffer: 2 ** 31 - 1,
  stdio: ["ignore", "pipe", "inherit"],
});
const raw = ff.stdout;
const n = Math.floor(raw.length / (W * H));
const ratios: { i: number; r: number; dark: number }[] = [];
for (let i = 0; i < n; i++) {
  const o = i * W * H;
  let edge = 0;
  let edgeN = 0;
  let inner = 0;
  let innerN = 0;
  let darkPx = 0;
  // horizontal steps between x-1 and x, on smooth dark pixels (both under 90, the step under 6: a gradient, not an edge)
  for (let y = 0; y < H; y += 2) {
    const row = o + y * W;
    for (let x = 1; x < W; x++) {
      const a = raw[row + x - 1];
      const b = raw[row + x];
      if (a >= 90 || b >= 90) continue;
      const d = Math.abs(a - b);
      if (d >= 6) continue;
      darkPx++;
      if (x % 8 === 0) {
        edge += d;
        edgeN++;
      } else {
        inner += d;
        innerN++;
      }
    }
  }
  if (edgeN > 200 && innerN > 0) ratios.push({ i, r: edge / edgeN / Math.max(1e-6, inner / innerN), dark: darkPx / ((W * H) / 2) });
}
if (!ratios.length) {
  console.log(`${file}: no dark smooth ground to measure`);
  process.exit(0);
}
const sorted = [...ratios].sort((a, b) => a.r - b.r);
const med = sorted[Math.floor(sorted.length / 2)].r;
const worst = sorted[sorted.length - 1];
console.log(
  `${file} (${W}×${H}, ${n} frames, every ${STEP}th): blocking ratio median ${med.toFixed(3)}, worst ${worst.r.toFixed(3)} at ${((from ?? 0) + (worst.i * STEP) / fps).toFixed(2)} s; measured on ${ratios.length} frames with dark ground (${((ratios.reduce((s, x) => s + x.dark, 0) / ratios.length) * 100).toFixed(0)} % of the picture on average)`,
);
