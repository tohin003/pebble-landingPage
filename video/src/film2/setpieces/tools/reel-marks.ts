// Prints a set-piece reel's marks for the pixel checks and the sheets: each piece's first frame, every seam (a
// transition at its middle), the cuts (both) and the still holds (the title's waits), as JSON. Light work:
//   bun video/src/film2/setpieces/tools/reel-marks.ts 16:9
// then pass `cuts` to render/sheets.sh and qa/luma-scan.ts (--cuts), and `waits` to luma-scan (--waits).
//
// With --out <marks.json> it also writes what the render checks added after the craft review need (CR-15), in reel
// frames and the plans' frame px (qa/luma-scan.ts --marks scales them to the render):
//   types      every line the plans draw: its rect, its ink's polarity, when it lands, when it stops being drawn, and the
//              exits it declares (qa/ink.ts judges the ink in its rect)
//   stones     runs of frames with the stones the plan shows and their radii, and each frame's stones (centre and
//              radius): qa/stones.ts counts the dark blobs around them (the placeholders carry Pebble's own avatar and
//              dark controls, which are compact dark blobs too, but the film's stone is only where the plan draws it)
//   apertures  the Drop's hit, the frame its bands start to open in the plan, and a resting stretch before it
//              (qa/bands.ts measures the bands)
//   transitions  each iris, rack or swap's frames, which tile pops do not judge (a designed change, as a cut is)
//   entrances  each plane's card entrance and each placeholder still's entrance inside a take view, to name a tile pop
import { writeFileSync } from "node:fs";
import { hexToRgb } from "../../light/grades";
import { demoPlans } from "../demo/plans";
import { apertureOpenStart, stonesOnFrame, typeTracks } from "../qa";
import { frameOfSource } from "../take";

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
const stoneAt: Record<number, [number, number, number][]> = {};
const apertures: { piece: string; hit: number; planOpen: number; rest: { from: number; to: number } }[] = [];
const entrances: { id: string; from: number; to: number; kind: string }[] = [];
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
        // the line's own colour as an 8-bit grey (what FFmpeg's gray format gives: BT.601 luma)
        inkLuma: Math.round(255 * (0.299 * r! + 0.587 * g! + 0.114 * b!)),
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
      if (st.length) stoneAt[off + fr] = st.map((s) => [Math.round(s.c.x * 10) / 10, Math.round(s.c.y * 10) / 10, Math.round(s.r * 10) / 10]);
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
    for (const s of p.shots)
      for (const pl of s.planes) {
        if (pl.enterAt !== undefined) entrances.push({ id: `${p.id}/${pl.id}`, from: off + pl.enterAt, to: off + pl.enterAt + (pl.enterKind === "fade" ? 20 : 24), kind: pl.enterKind === "fade" ? "fade-in" : "card entrance" });
        if (pl.content.kind !== "take") continue;
        const u = pl.content.use;
        for (const vs of u.manifest.views[pl.content.view]?.stills ?? []) {
          if (!vs.entrance) continue;
          const at = frameOfSource(vs.from, u.at, p.fps, u.manifest, u.inPoint);
          if (at >= u.at && at < u.until) entrances.push({ id: `${p.id}/${pl.id}:${vs.standIn.id}`, from: off + at, to: off + at + 24, kind: "card entrance (a placeholder of the recording's own)" });
        }
      }
    const open = apertureOpenStart(p);
    if (open !== null && p.hits.length) {
      const hit = p.hits[0]!;
      apertures.push({ piece: p.id, hit: off + hit, planOpen: off + open, rest: { from: off + Math.max(0, hit - 60), to: off + Math.max(1, hit - 10) } });
      // the frame opening with the ring is a designed change on the hit (its edges cross the tiles fast): like a transition
      transitions.push({ from: off + open - 2, to: off + open + 36 });
    }
  }
  off += p.duration;
}
const marks = { aspect: a, fps: first.fps, width: first.frame.w, height: first.frame.h, total: off, starts, seams, cuts: [...starts.slice(1), ...seams].sort((x, y) => x - y), waits, hits };
if (out) {
  writeFileSync(out, JSON.stringify({ ...marks, transitions, entrances, types, stones, stoneAt, apertures }));
  console.log(JSON.stringify({ ...marks, types: types.length, stones: stones.length, apertures }));
} else console.log(JSON.stringify(marks));
