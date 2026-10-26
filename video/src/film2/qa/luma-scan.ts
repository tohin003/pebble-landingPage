// Decodes a render to grey frames with FFmpeg and runs the pixel checks. FFmpeg is a heavy job:
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh f2-luma /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/qa/luma-scan.ts <video.mp4> --fps 60 --cuts 120,480 --waits 300-360 --out report.json
// Without --marks it decodes small frames (--size, default 192 × 108) and runs qa/luma.ts: flashes, dead seconds, pops
// (whole frame and per tile) and dips; the frames stay in memory (20 KB each, 34 MB for 28 s at 60 fps).
//
// With --marks <marks.json> (setpieces/tools/reel-marks.ts --out) it decodes the render at its own size, streams it,
// and adds the checks added after the craft review (CR-15), each on what the plans say is on screen:
//   ink      the ink in every line's rect: no fall of more than 50 % within 6 frames unless an exit is declared
//            (qa/ink.ts; CR-03)
//   stones   wherever the plan shows the stone, the stone-sized dark blobs: never two (qa/stones.ts; CR-01)
//   bands    the Drop's aperture: the frame its bands start to open, within 2 frames of the hit (qa/bands.ts; CR-07)
// The luma checks then run on the frames shrunk by an integer factor to about 192 px on the long side (5× for a half-size
// reel), as before. Only small frames and per-frame numbers are kept; nothing is written but the report.
// Exit status 0 when nothing is found, 2 when a check fails.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { analyseLuma } from "./luma";
import { INK, inkIn, judgeInk, type InkFinding, type InkTrack } from "./ink";
import { shrink, stoneBlobs } from "./stones";
import { bandHeights, openingStart, type BandHeights } from "./bands";
import type { Rect } from "../motion/geometry";

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
const parseWaits = (s: string) =>
  s
    .split(",")
    .filter(Boolean)
    .map((r) => {
      const [a, b] = r.split("-").map(Number);
      return { from: a!, to: b! };
    });

interface Marks {
  aspect: string;
  width: number;
  height: number;
  total: number;
  cuts: number[];
  waits: string[];
  hits: number[];
  types: (InkTrack & { vanishes?: string })[];
  stones: { from: number; to: number; count: number; rMin: number; rMax: number }[];
  apertures: { piece: string; hit: number; planOpen: number; rest: { from: number; to: number } }[];
}

const marksPath = opt("marks");
const marks: Marks | null = marksPath ? JSON.parse(readFileSync(marksPath, "utf8")) : null;
const cuts = marks ? marks.cuts : (opt("cuts") ?? "").split(",").filter(Boolean).map(Number);
const waits = marks ? parseWaits(marks.waits.join(",")) : parseWaits(opt("waits") ?? "");

// the decoded size: the render's own (marks mode), or the small luma size
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
// the luma checks' frames: shrunk to about 192 px on the long side
const K = marks ? Math.max(1, Math.round(Math.max(W, H) / 192)) : 1;
// the plans' frame px → the render's px
const S = marks ? W / marks.width : 1;
const scaleRect = (r: Rect): Rect => ({ x: r.x * S, y: r.y * S, w: r.w * S, h: r.h * S });

const small: Uint8Array[] = [];
let smallW = W;
let smallH = H;
// ink series per track, stone blobs per frame, band heights per frame
const tracks = (marks?.types ?? []).map((t) => ({ ...t, rect: scaleRect(t.rect) }));
const ink: (number | undefined)[][] = tracks.map(() => []);
const stoneAt: { frame: number; expect: number; blobs: number; diameters1080: number[] }[] = [];
const bands: (BandHeights | undefined)[] = [];
const stoneRun = (f: number) => marks?.stones.find((s) => f >= s.from && f < s.to);
const apertureNear = (f: number) => marks?.apertures.some((a) => f >= a.rest.from && f < a.hit + 90) ?? false;

let frameNo = 0;
const onFrame = (px: Uint8Array) => {
  const f = frameNo++;
  if (!marks) {
    small.push(px.slice());
    return;
  }
  const s = K > 1 ? shrink(px, W, H, K) : { px: px.slice(), w: W, h: H };
  small.push(s.px);
  smallW = s.w;
  smallH = s.h;
  tracks.forEach((t, i) => {
    if (f >= t.from - INK.withinFrames && f < t.until + INK.withinFrames + 1) ink[i]![f] = inkIn(px, W, H, t.rect, t.polarity);
  });
  const run = stoneRun(f);
  if (run) {
    // blobs on the frame shrunk 2×: a stone is 15–100 px across there
    const h2 = shrink(px, W, H, 2);
    const k = S / 2;
    const blobs = stoneBlobs(h2.px, h2.w, h2.h, { minR: Math.max(3, run.rMin * k * 0.5), maxR: run.rMax * k * 1.6 });
    // each blob's diameter in px at 1080: shrunk px → render px (×2) → the plan's px (÷S) → at 1080 (÷ the plan's unit)
    const unit1080 = Math.min(marks.width, marks.height) / 1080;
    stoneAt.push({ frame: f, expect: run.count, blobs: blobs.length, diameters1080: blobs.map((b) => Math.round((b.r * 2 * 2) / S / unit1080)) });
  }
  if (apertureNear(f)) bands[f] = bandHeights(px, W, H);
};

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
      onFrame(buf);
      fill = 0;
    }
  }
});
proc.on("close", (code) => {
  if (code !== 0) {
    console.error(`ffmpeg exited ${code}`);
    process.exit(1);
  }
  const r = analyseLuma(small, { fps, width: smallW, height: smallH, cuts, waits });
  const problems = [...r.problems];
  // ink: every line's rect
  const inkFindings: InkFinding[] = [];
  tracks.forEach((t, i) => inkFindings.push(...judgeInk(t, ink[i]!)));
  for (const x of inkFindings) if (x.kind === "vanish") problems.push(`ink: ${x.message}`);
  // stones: never two where the plan shows the stone
  const runs: { from: number; to: number; most: number }[] = [];
  for (const s of stoneAt.filter((x) => x.blobs >= 2)) {
    const last = runs[runs.length - 1];
    if (last && s.frame === last.to) {
      last.to++;
      last.most = Math.max(last.most, s.blobs);
    } else runs.push({ from: s.frame, to: s.frame + 1, most: s.blobs });
  }
  for (const x of runs) problems.push(`stones: ${x.most} stone-sized dark blobs on frames ${x.from}–${x.to} (one stone only, CR-01)`);
  // bands: the opening against the hit
  const apertures = (marks?.apertures ?? []).map((a) => {
    const open = openingStart(bands, a.rest, a.rest.to);
    const late = open === null ? null : open - a.hit;
    if (open === null) problems.push(`bands: the ${a.piece}'s bands never open in the render`);
    else if (Math.abs(late!) > 2) problems.push(`bands: the ${a.piece}'s bands start to open on frame ${open}, ${late} frames from the hit (${a.hit}); within 2 (CR-07)`);
    const trace: Record<number, BandHeights> = {};
    for (let f = a.rest.from; f < a.hit + 90; f++) if (bands[f]) trace[f] = bands[f]!;
    return { ...a, renderOpen: open, framesFromHit: late, trace };
  });
  const summary = {
    file,
    frames: r.frames,
    size: `${W}x${H}`,
    lumaSize: `${smallW}x${smallH}`,
    ok: problems.length === 0,
    maxFlashesPerSecond: r.maxFlashesPerSecond,
    deadRuns: r.deadRuns,
    pops: r.pops,
    tilePops: r.tilePops,
    dips: r.dips,
    meanLumaRange: [Math.min(...r.meanLuma), Math.max(...r.meanLuma)].map((v) => Math.round(v * 10) / 10),
    maxMad: Math.round(Math.max(...r.mad) * 100) / 100,
    ...(marks ? { ink: inkFindings, stones: { framesChecked: stoneAt.length, twoStoneRuns: runs }, apertures: apertures.map(({ trace: _trace, ...a }) => a) } : {}),
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
          ...(marks
            ? {
                inkSeries: Object.fromEntries(tracks.map((t, i) => [t.id, Object.fromEntries(Object.entries(ink[i]!).map(([f, v]) => [f, Math.round(v! * 10) / 10]))])),
                stoneFrames: stoneAt,
                bandTraces: apertures.map((a) => ({ piece: a.piece, trace: a.trace })),
              }
            : {}),
        },
        null,
        1,
      ),
    );
  console.log(JSON.stringify({ ...summary, tilePops: summary.tilePops.length > 40 ? `${summary.tilePops.length} tile pops` : summary.tilePops }, null, 1));
  process.exit(summary.ok ? 0 : 2);
});
