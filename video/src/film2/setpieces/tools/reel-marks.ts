// Prints a set-piece reel's marks for the pixel checks and the sheets: each piece's first frame, every seam (a
// transition at its middle), the cuts (both) and the still holds (the title's waits), as JSON. Light work:
//   bun video/src/film2/setpieces/tools/reel-marks.ts 16:9
// then pass `cuts` to render/sheets.sh and qa/luma-scan.ts (--cuts), and `waits` to luma-scan (--waits).
//
// With --out <marks.json> it also writes what the render checks added after the craft review need (CR-15), in reel
// frames and the plans' frame px (qa/luma-scan.ts --marks scales them to the render):
//   types      every line the plans draw: its rect, its ink's polarity, when it lands, when it stops being drawn, and the
//              exits it declares (qa/ink.ts judges the ink in its rect)
//   stones     runs of frames with the stones the plan shows and their radii (qa/stones.ts counts the dark blobs)
//   apertures  the Drop's hit, the frame its bands start to open in the plan, and a resting stretch before it
//              (qa/bands.ts measures the bands)
//   transitions  each iris, rack or swap's frames, which tile pops do not judge (a designed change, as a cut is)
import { writeFileSync } from "node:fs";
import { hexToRgb } from "../../light/grades";
import { demoPlans } from "../demo/plans";
import { apertureOpenStart, stonesOnFrame, typeTracks } from "../qa";

const args = process.argv.slice(2);
const a = (args.find((x) => /^(16:9|1:1|9:16)$/.test(x)) ?? "16:9") as "16:9" | "1:1" | "9:16";
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : undefined;

let off = 0;
const starts: number[] = [];
const seams: number[] = [];
const transitions: { from: number; to: number }[] = [];
const waits: string[] = [];
const hits: number[] = [];
const types: unknown[] = [];
const stones: { from: number; to: number; count: number; rMin: number; rMax: number }[] = [];
const apertures: { piece: string; hit: number; planOpen: number; rest: { from: number; to: number } }[] = [];
const entries = demoPlans(a);
const first = entries[0]!.plan;
for (const e of entries) {
  const p = e.plan;
  starts.push(off);
  for (const s of p.seams) seams.push(off + s.at + (s.frames > 0 ? Math.round(s.frames / 2) : 0));
  for (const s of p.seams) if (s.frames > 0) transitions.push({ from: off + s.at, to: off + s.at + s.frames });
  for (const s of p.shots) for (const w of s.waits ?? []) waits.push(`${off + w.from}-${off + w.to}`);
  for (const h of p.hits) hits.push(off + h);
  if (out) {
    for (const t of typeTracks(p)) {
      const [r, g, b] = hexToRgb(t.color);
      types.push({
        id: `${p.id}/${t.id}`,
        text: t.text,
        rect: t.rect,
        polarity: 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 0.5 ? "dark" : "light",
        from: off + t.from,
        landed: off + t.landed,
        until: off + t.until,
        exits: t.exits.map((x) => ({ from: off + x.from, to: off + x.to, kind: x.kind })),
        ...(t.vanishes ? { vanishes: t.vanishes } : {}),
      });
    }
    let run: (typeof stones)[number] | null = null;
    for (let fr = 0; fr < p.duration; fr++) {
      const st = stonesOnFrame(p, fr);
      const count = st.length;
      const rMin = count ? Math.min(...st.map((s) => s.r)) : 0;
      const rMax = count ? Math.max(...st.map((s) => s.r)) : 0;
      if (run && run.count === count && run.to === off + fr) {
        run.to++;
        run.rMin = Math.min(run.rMin, rMin);
        run.rMax = Math.max(run.rMax, rMax);
      } else {
        if (run && run.count > 0) stones.push(run);
        run = { from: off + fr, to: off + fr + 1, count, rMin, rMax };
      }
    }
    if (run && run.count > 0) stones.push(run);
    const open = apertureOpenStart(p);
    if (open !== null && p.hits.length) {
      const hit = p.hits[0]!;
      apertures.push({ piece: p.id, hit: off + hit, planOpen: off + open, rest: { from: off + Math.max(0, hit - 60), to: off + Math.max(1, hit - 10) } });
    }
  }
  off += p.duration;
}
const marks = { aspect: a, fps: first.fps, width: first.frame.w, height: first.frame.h, total: off, starts, seams, cuts: [...starts.slice(1), ...seams].sort((x, y) => x - y), waits, hits };
if (out) {
  writeFileSync(out, JSON.stringify({ ...marks, transitions, types, stones, apertures }, null, 1));
  console.log(JSON.stringify({ ...marks, types: types.length, stones: stones.length, apertures }));
} else console.log(JSON.stringify(marks));
