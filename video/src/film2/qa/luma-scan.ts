// Decodes a render to grey frames with FFmpeg and runs the pixel checks. FFmpeg is a heavy job:
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh f2-luma /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/qa/luma-scan.ts <video.mp4> --fps 60 --cuts 120,480 --waits 300-360 --out report.json
// Without --marks it decodes small frames (--size, default 192 × 108) and runs qa/luma.ts: flashes, dead seconds, pops
// and dips; the frames stay in memory (20 KB each, 34 MB for 28 s at 60 fps). Tile pops are listed but not judged
// there: telling a pop from a move needs the full frames and the plan's transitions, which only --marks has.
//
// With --marks <marks.json> (setpieces/tools/reel-marks.ts --out) it decodes the render at its own size, streams it,
// and runs qa/reel-scan.ts: the luma checks on frames shrunk to about 192 px, plus the checks added after the craft
// review (CR-15), each on what the plans say is on screen: the ink in every line's rect (CR-03), the stone-sized dark
// blobs wherever the plan shows the stone (CR-01), and the frame the Drop's bands start to open (CR-07).
// Nothing is written but the report. Exit status 0 when nothing is found, 2 when a check fails.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { analyseLuma } from "./luma";
import { ReelScan, parseWaits, type ReelMarks } from "./reel-scan";

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error("usage: bun luma-scan.ts <video> [--fps 60] [--cuts a,b,c] [--waits a-b,c-d] [--out report.json] [--size 192x108] [--marks marks.json]");
  process.exit(64);
}
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const fps = Number(opt("fps") ?? 60);
const ff = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.env.FFPROBE ?? "/opt/homebrew/bin/ffprobe";
const marksPath = opt("marks");
const marks: ReelMarks | null = marksPath ? JSON.parse(readFileSync(marksPath, "utf8")) : null;

// the decoded size: the render's own (with marks), or the small luma size
let W: number;
let H: number;
if (marks) {
  const probe = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { encoding: "utf8" });
  const m = /(\d+)x(\d+)/.exec(probe.stdout ?? "");
  if (!m) {
    console.error(`ffprobe could not read ${file}: ${probe.stderr}`);
    process.exit(1);
  }
  W = Number(m[1]);
  H = Number(m[2]);
} else [W, H] = (opt("size") ?? "192x108").split("x").map(Number) as [number, number];

const scan = marks ? new ReelScan(W, H, marks) : null;
const small: Uint8Array[] = [];
const proc = spawn(ff, ["-v", "error", "-i", file, "-vf", marks ? "format=gray" : `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { stdio: ["ignore", "pipe", "inherit"] });
const size = W * H;
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
      if (scan) scan.push(buf);
      else small.push(buf.slice());
      fill = 0;
    }
  }
});
proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(1);
  }
  const rs = scan ? scan.finish(fps) : null;
  const r = rs ? rs.luma : analyseLuma(small, { fps, width: W, height: H, cuts: (opt("cuts") ?? "").split(",").filter(Boolean).map(Number), waits: parseWaits(opt("waits") ?? "") });
  // without the marks, tile pops are unconfirmed (no move test, no transitions): listed, not judged
  const problems = rs ? rs.problems : r.problems.filter((x) => !x.startsWith("tile pops"));
  const summary = {
    file,
    frames: r.frames,
    size: `${W}x${H}`,
    ok: problems.length === 0,
    maxFlashesPerSecond: r.maxFlashesPerSecond,
    deadRuns: r.deadRuns,
    pops: r.pops,
    tilePops: r.tilePops,
    dips: r.dips,
    meanLumaRange: [Math.min(...r.meanLuma), Math.max(...r.meanLuma)].map((v) => Math.round(v * 10) / 10),
    maxMad: Math.round(Math.max(...r.mad) * 100) / 100,
    ...(rs ? { tileSettles: rs.settles, popCauses: rs.popCauses, ink: rs.ink, stones: { framesChecked: rs.stones.framesChecked, twoStoneRuns: rs.stones.twoStoneRuns }, apertures: rs.apertures.map(({ trace: _t, ...a }) => a), rows: rs.rows, factsEvenness: rs.factsEvenness, states: marks?.states ?? [] } : {}),
    problems,
  };
  const out = opt("out");
  if (out)
    writeFileSync(
      out,
      JSON.stringify(
        {
          ...summary,
          meanLuma: r.meanLuma.map((v) => Math.round(v * 10) / 10),
          mad: r.mad.map((v) => Math.round(v * 100) / 100),
          ...(rs ? { inkSeries: rs.inkSeries, stoneFrames: rs.stones.frames, bandTraces: rs.apertures.map((a) => ({ piece: a.piece, trace: a.trace })) } : {}),
        },
        null,
        1,
      ),
    );
  console.log(JSON.stringify({ ...summary, tilePops: summary.tilePops.length > 40 ? `${summary.tilePops.length} tile pops` : summary.tilePops }, null, 1));
  process.exit(summary.ok ? 0 : 2);
});
