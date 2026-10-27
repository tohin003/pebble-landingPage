// Prints a set-piece reel's marks for the pixel checks and the sheets: each piece's first frame, every seam (a
// transition at its middle), the cuts (both) and the still holds (the title's waits), as JSON. Light work:
//   bun video/src/film2/setpieces/tools/reel-marks.ts 16:9
// then pass `cuts` to render/sheets.sh and qa/luma-scan.ts (--cuts), and `waits` to luma-scan (--waits).
//
// With --out <marks.json> it also writes what the render checks added after the craft review need (CR-15), in reel
// frames and the plans' frame px (qa/luma-scan.ts --marks scales them to the render):
//   types      every line the plans draw: its rect (and, for a line set in the world, its rect on each frame), its ink's
//              polarity, when it lands, when it stops being drawn, and the exits it declares (qa/ink.ts judges its ink)
//   stones     runs of frames with the stones the plan shows and their radii, and each frame's stones (centre and
//              radius): qa/stones.ts counts the dark blobs around them (the placeholders carry Pebble's own avatar and
//              dark controls, which are compact dark blobs too, but the film's stone is only where the plan draws it)
//   apertures  the Drop's hit, the frame its bands start to open in the plan, and a resting stretch before it
//              (qa/bands.ts measures the bands)
//   transitions  each iris, rack or swap's frames, and the Veil's own cast, which tile pops do not judge (a designed
//              change, as a cut is)
//   entrances  each plane's card entrance and each placeholder still's entrance inside a take view, to name a tile pop
//   gaps       the end card's margins between facts, which must stay empty while the facts are held (CR-20)
//   states     a take's placeholder stills switching with a hard cut on their source frames (CR-18): not judged as pops
import { writeFileSync } from "node:fs";
import { hexToRgb } from "../../light/grades";
import { demoPlans } from "../demo/plans";
import { COLOR } from "../../tokens";
import { apertureOpenStart, drawnSpan, stonesOnFrame, typeTracks } from "../qa";
import { carriedRect } from "../kit";
import { ACTIVATE } from "../../../../../shared/pebble/veil";
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
const gaps: { id: string; from: number; to: number; rect: { x: number; y: number; w: number; h: number }; inkLuma: number; rectAt?: Record<number, number[]> }[] = [];
const states: { frame: number; id: string }[] = [];
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
        // a line set in the world moves: its rect on every frame it is drawn (reel frames, rounded to 0.1 px)
        ...(t.rects ? { rectAt: Object.fromEntries(Object.entries(t.rects).map(([fr, r]) => [off + Number(fr), [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 10) / 10)])) } : {}),
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
        // a slot's caption of the take's state changes on its source frame (a placeholder's label: what the take shows)
        for (const st of u.manifest.views[pl.content.view]?.slotStates ?? []) {
          const at = frameOfSource(st.from, u.at, p.fps, u.manifest, u.inPoint);
          if (st.from > 0 && at > u.at && at < u.until && at > s.from && at < s.to) states.push({ frame: off + at, id: `${p.id}/${pl.id}: "${st.label}"` });
        }
        for (const vs of u.manifest.views[pl.content.view]?.stills ?? []) {
          // a still with no entrance switches in and out with a hard cut on its source frames (a take's own state change)
          if (!vs.entrance) {
            for (const src of [vs.from, vs.to]) {
              if (src === undefined) continue;
              const at = frameOfSource(src, u.at, p.fps, u.manifest, u.inPoint);
              if (at > u.at && at < u.until && at >= (pl.from ?? -Infinity) && at < (pl.to ?? Infinity) && at > s.from && at < s.to) states.push({ frame: off + at, id: `${p.id}/${pl.id}:${vs.standIn.id}` });
            }
            continue;
          }
          const at = frameOfSource(vs.from, u.at, p.fps, u.manifest, u.inPoint);
          if (at >= u.at && at < u.until) entrances.push({ id: `${p.id}/${pl.id}:${vs.standIn.id}`, from: off + at, to: off + at + 24, kind: "card entrance (a placeholder of the recording's own)" });
        }
      }
    // the end card's gaps between facts (CR-20): empty while both facts are held, wherever the page carries them
    for (const gp of ((p.extra as { factGaps?: { id: string; left: string; right: string; rect: { x: number; y: number; w: number; h: number } }[] } | undefined)?.factGaps ?? [])) {
      const left = p.types.find((t) => t.id === gp.left);
      const right = p.types.find((t) => t.id === gp.right);
      if (!left || !right) continue;
      const from = Math.max(drawnSpan(left, p.fps, p.duration).landed, drawnSpan(right, p.fps, p.duration).landed);
      const to = Math.min(left.exitAt ?? p.duration, right.exitAt ?? p.duration);
      const rectAt: Record<number, number[]> = {};
      if (right.carry) for (let fr = from; fr < to; fr++) {
        const r = carriedRect(p, right, gp.rect, fr);
        rectAt[off + fr] = [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 10) / 10);
      }
      const [r, g, b] = hexToRgb(right.color ?? COLOR.ink);
      gaps.push({ id: `${p.id}/${gp.id}`, from: off + from, to: off + to, rect: gp.rect, inkLuma: Math.round(255 * (0.299 * r! + 0.587 * g! + 0.114 * b!)), ...(right.carry ? { rectAt } : {}) });
    }
    // the Veil's own cast (Pebble's code, stealthVeil.ts: the dusk colour sweeps down the pebble in about 10 frames)
    for (const sh of p.shots) for (const v of sh.stone?.veil ?? []) transitions.push({ from: off + Math.round(v.at * p.fps), to: off + Math.round((v.at + ACTIVATE) * p.fps) + 2 });
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
  writeFileSync(out, JSON.stringify({ ...marks, transitions, entrances, states, types, stones, stoneAt, apertures, gaps }));
  console.log(JSON.stringify({ ...marks, types: types.length, stones: stones.length, apertures, gaps: gaps.length, states }));
} else console.log(JSON.stringify(marks));
