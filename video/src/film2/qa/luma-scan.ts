// Decodes a render to small grey frames with FFmpeg and runs the pixel checks (qa/luma.ts). FFmpeg is a heavy job:
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh f2-luma /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/qa/luma-scan.ts <video.mp4> --fps 60 --cuts 120,480 --waits 300-360 --out report.json
// The frames stay in memory (96 × 54 grey = 5 KB each); nothing is written but the report.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { analyseLuma } from "./luma";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("usage: bun luma-scan.ts <video> [--fps 60] [--cuts a,b,c] [--waits a-b,c-d] [--out report.json] [--size 96x54]");
  process.exit(64);
}
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const fps = Number(opt("fps") ?? 60);
const cuts = (opt("cuts") ?? "").split(",").filter(Boolean).map(Number);
const waits = (opt("waits") ?? "")
  .split(",")
  .filter(Boolean)
  .map((r) => {
    const [a, b] = r.split("-").map(Number);
    return { from: a!, to: b! };
  });
const [W, H] = (opt("size") ?? "96x54").split("x").map(Number) as [number, number];
const ff = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";

const proc = spawn(ff, ["-v", "error", "-i", file, "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
const chunks: Buffer[] = [];
proc.stdout.on("data", (c: Buffer) => chunks.push(c));
proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(1);
  }
  const all = Buffer.concat(chunks);
  const size = W * H;
  const frames: Uint8Array[] = [];
  for (let i = 0; i + size <= all.length; i += size) frames.push(new Uint8Array(all.buffer, all.byteOffset + i, size));
  const r = analyseLuma(frames, { fps, width: W, height: H, cuts, waits });
  const summary = {
    file,
    frames: r.frames,
    ok: r.ok,
    maxFlashesPerSecond: r.maxFlashesPerSecond,
    deadRuns: r.deadRuns,
    pops: r.pops,
    dips: r.dips,
    meanLumaRange: [Math.min(...r.meanLuma), Math.max(...r.meanLuma)].map((v) => Math.round(v * 10) / 10),
    maxMad: Math.round(Math.max(...r.mad) * 100) / 100,
    problems: r.problems,
  };
  const out = opt("out");
  if (out) writeFileSync(out, JSON.stringify({ ...summary, meanLuma: r.meanLuma.map((v) => Math.round(v * 10) / 10), mad: r.mad.map((v) => Math.round(v * 100) / 100) }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
  process.exit(r.ok ? 0 : 2);
});
