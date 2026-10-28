// The coda's flash model calibrated against a render of the coda alone (setpieces/codaCalibrate.ts; OVERRIDES §65 on the
// post-credit review's P2-1). A heavy job: it decodes the render with FFmpeg (streamed, one grey frame at a time). From
// the repo root, after render-segments.sh has made F2-SP-coda-<aspect>:
//   scripts/heavy.sh coda-cal-16x9 /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/setpieces/codaCalibrateCli.ts <F2-SP-coda-16x9.mp4> 16:9 --out <report.json>
// It plans the coda as the main reel does (setpieces/demo/plans.ts), prints the summary and writes the whole report.
// Exit 0 when the render shows no flash and the model with the fitted ink share shows none; 2 otherwise; 1 on an error.
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import type { Aspect } from "../tokens";
import { demoPlans } from "./demo/plans";
import { RenderLuma, calibrate } from "./codaCalibrate";

const args = process.argv.slice(2);
const file = args[0];
const aspect = args[1] as Aspect | undefined;
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : undefined;
if (!file || !aspect || !["16:9", "1:1", "9:16"].includes(aspect)) {
  console.error("usage: bun codaCalibrateCli.ts <render.mp4> <16:9|1:1|9:16> [--out report.json]");
  process.exit(64);
}
const plan = demoPlans(aspect).find((e) => e.plan.id === "coda")?.plan;
if (!plan) {
  console.error(`the ${aspect} reel has no coda`);
  process.exit(1);
}
const ff = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.env.FFPROBE ?? "/opt/homebrew/bin/ffprobe";
const probe = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { encoding: "utf8" });
const m = /(\d+)x(\d+)/.exec(probe.stdout ?? "");
if (!m) {
  console.error(`ffprobe could not read ${file}: ${probe.stderr}`);
  process.exit(1);
}
const W = Number(m[1]);
const H = Number(m[2]);
const luma = new RenderLuma(W, H);
const size = W * H;
const buf = new Uint8Array(size);
let fill = 0;
const proc = spawn(ff, ["-v", "error", "-i", file, "-vf", "format=gray", "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
proc.stdout.on("data", (c: Buffer) => {
  let o = 0;
  while (o < c.length) {
    const n = Math.min(size - fill, c.length - o);
    buf.set(c.subarray(o, o + n), fill);
    fill += n;
    o += n;
    if (fill === size) {
      luma.push(buf);
      fill = 0;
    }
  }
});
proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(1);
  }
  const r = calibrate(plan, luma.series);
  if (out) writeFileSync(out, JSON.stringify({ file, aspect, size: `${W}x${H}`, small: `${luma.w}x${luma.h}`, series: { render: luma.series }, ...r }, null, 1));
  const shareOf = (s: number | null) => (s === null ? "none" : s.toFixed(3));
  console.log(
    JSON.stringify(
      {
        file,
        aspect,
        frames: r.frames,
        inkShare: { page: shareOf(r.fit.page.share), night: shareOf(r.fit.night.share) },
        levels: { page: r.levels.page.ratio?.toFixed(3) ?? "none", plate: r.levels.plate.ratio?.toFixed(3) ?? "none" },
        flashes: { render: r.flashes.render.worst, planned: r.flashes.planned.worst, fitted: r.flashes.fitted.worst },
        transitionsDisagree: r.transitions.length,
        recommend: r.recommend,
        problems: r.problems,
        ok: r.ok,
      },
      null,
      1,
    ),
  );
  process.exit(r.ok ? 0 : 2);
});
