// THE RETURN'S CHECKS (MONTAGE_DESIGN revision 2 §6 "Checks"; OVERRIDES §61 R2). The Return is a montage act: its span
// is exempt from the act-wide cutRate, holds and readingLoad (exemptReturnSpan, narrowly: only lines, shots and cuts
// wholly inside the field's shot) and is held instead to these, each with a canary in tests/return.test.ts:
//   returnSchedule  a slot changes at most once in 22 frames (designed 73); every image settled 60 frames or more before
//                   it moves; no swap completes after R466; every cell at least half in frame and unhidden for 60 frames
//                   or more; no two settled cells overlap; the frame's corners at most 30 px a frame (TREATMENT §5.3);
//                   every entry begins out of frame, its shadow too (RV-02)
//   returnWindows   the flash model per analysis window (R3 §1.7), frame by frame: each swap 2 transitions where its
//                   cells cover 25 % of the window or more (a slide's outgoing and incoming cells as one union), swaps
//                   within 2 frames as one group, and the moving coverage's monotone swings of 25 % (one transition
//                   each, measured from the running minimum and maximum until the first: coverageSwings); an error
//                   above 6 in 60 frames, a warning at 4; IRIS's extended rule (4 or more in 240 of 300 one-second
//                   windows: irisExtended)
//   returnContent   no Stealth feature; light-theme cells only (mean relative luminance 0.70 or more); saturated red
//                   under the aspect's limit of the frame; both held on what is drawn (each image measured, returnLum.ts,
//                   until the 2.0.0 crops carry their own values: RV-05); red cells settled before R240, never swapped,
//                   entries 30 frames or more apart; one take, one moment (CR-11); no two cards in neighbouring slots;
//                   every cell carries its manifest; each swap's step in mean luminance SWAP_LUM_STEP or less (the waves
//                   paired by luminance, §2.4: RV-02); no cell pictures the pebble over PICTURED_STONE_PX (one stone,
//                   CR-01: RV-01), and the captures expected to picture it warn by name
//   returnMerge     the median cell width at first contact at least half the body's; contacts spread over 120 frames or
//                   more; the kept card last; no cell's angular velocity changes sign from 30 frames before its return
//                   until it is hidden; no opacity below 1 before a cell is hidden (CR-08's fade)
//   returnRadius    CR-08's check: each cell's screen radius from the stone falls 70 % or more on average from its
//                   return's start to its first contact, and 50 % or more for each cell (no push cancels it)
//   returnFirstCell the first cell's worst-case content (setpieces/returnFirstCell.ts), moved by the plan's camera and
//                   softened as drawn, through the verdict's own counter (qa/flash-rgb.ts) in the binding windows: an
//                   error above 6 in a second, a warning at 4 (the R9 flash of 31 Oct, which returnWindows cannot see)
//   cellText        a cell's largest text stays under 16 px at 1080 on every frame it shows, except the inner recalls
//   blinkPlaced     the stone's idle blink starts within a frame of its plan (R646), none other in the keep-clear spans,
//                   and 6–8 frames after the kept card is hidden in every aspect (§2.7: RV-08)
//   joinPose        S24's exit pose and velocity equal the Return's entry: its first frame shows the first cell (S24's
//                   last frame) filling the frame within 1 px and 1 % of zoom, moving as S24 left within 0.5 px a frame;
//                   no stone in S24's last frame (one stone, CR-01)
// cameraFloor, stoneCount and groundCoverage (setpieces/qa.ts, qa/checks.ts) cover the Return's shot as any other.
// Pure; no React.
import { cutRate, holds, readingLoads, type Finding, type Report } from "../qa/checks";
import type { FilmTimelineQa } from "../qa/timeline";
import { planePose, screenVelocity, type CamSample, type Pose } from "../motion/camera";
import type { Rect } from "../motion/geometry";
import type { ScenePlan } from "./scene";
import type { ReturnExtra } from "./returnPlan";
import { blinkStartsFor, blinkTouches } from "./blink";
import { ENGINE_CELL_SIZE, manifestProblems, type ReturnCellSpec } from "./returnCells";
import { RETURN_LUM, type DrawnLum } from "./returnLum";
import { firstCellFlash } from "./returnFirstCell";
import { drawnLumOf } from "./returnThumbs";
import { RETURN_SLOTS, bodyR, bodyStats, cellPoseR, localOfR, rOfLocal, rectTouchesBody, visibleFraction, type CellPoseR, type FieldCell, type ReturnField } from "./returnField";

/** The Return's data on a plan (null when the plan has none). */
export const returnOf = (p: ScenePlan): ReturnExtra | null => ((p.extra?.return as ReturnExtra | undefined) ?? null);

/* ---------------------------------------------------------------- the trace ----------------------------------- */

/** One cell on one R-frame: its pose, the stone's share of it, its screen rect (px at 1080). */
export interface TraceCell {
  c: FieldCell;
  p: CellPoseR;
  share: number;
  s: Rect;
}
export interface TraceFrame {
  r: number;
  pose: Pose;
  cells: TraceCell[];
}
export interface ReturnTrace {
  field: ReturnField;
  W: number;
  H: number;
  frames: TraceFrame[];
  /** R-frame → index */
  at: (r: number) => TraceFrame | undefined;
  /** the camera's pose on an R-frame (px at 1080 a world px) */
  poseAt: (r: number) => Pose;
  ref: Pose | null;
}

const traceCache = new WeakMap<object, ReturnTrace>();

/**
 * Every R-frame of the field from R−60 to `to`: every cell drawn, where the frame shows it. `poseAt` is the camera in px
 * at 1080 (zoom: px at 1080 a world px); with `ref`, cells and the stone sit at their parallax depths as drawn.
 */
export function traceReturn(field: ReturnField, poseAt: (r: number) => Pose, o: { to?: number; ref?: Pose | null } = {}): ReturnTrace {
  const { W, H } = field.geometry;
  const from = field.timing.span.from;
  const to = Math.floor(o.to ?? field.timing.span.to);
  const ref = o.ref ?? null;
  const frames: TraceFrame[] = [];
  for (let r = from; r <= to; r++) {
    const pose = poseAt(r);
    const cells: TraceCell[] = [];
    for (const c of field.cells) {
      const p = cellPoseR(field, c, r);
      if (!p) continue;
      const q = p.rect;
      const share = visibleFraction(q.x, q.y, q.x + q.w, q.y + q.h, field.stone.px);
      if (share === 0) continue;
      const pp = ref ? planePose(pose, ref, p.depth) : pose;
      cells.push({ c, p, share, s: { x: W / 2 + (q.x - pp.x) * pp.zoom, y: H / 2 + (q.y - pp.y) * pp.zoom, w: q.w * pp.zoom, h: q.h * pp.zoom } });
    }
    frames.push({ r, pose, cells });
  }
  return { field, W, H, frames, at: (r: number) => frames[Math.round(r) - from], poseAt, ref };
}

/** The trace of a plan's Return (the plan's own camera, its parallax), cached per plan. */
export function planTrace(p: ScenePlan): ReturnTrace | null {
  const ret = returnOf(p);
  if (!ret || !ret.field.view) return null;
  const hit = traceCache.get(p);
  if (hit) return hit;
  const v = ret.field.view;
  const fps = p.fps;
  const poseAt = (r: number): Pose => {
    const q = v.camera.pose(localOfR(r, fps));
    return { x: q.x, y: q.y, zoom: q.zoom / v.unit };
  };
  const ref = { ...v.ref, zoom: v.ref.zoom / v.unit };
  const t = traceReturn(ret.field, poseAt, { to: ret.landing.landR + 2, ref });
  traceCache.set(p, t);
  return t;
}

const inFrameShare = (s: Rect, W: number, H: number): number => {
  const a = s.w * s.h;
  if (a <= 0) return 0;
  return (Math.max(0, Math.min(s.x + s.w, W) - Math.max(s.x, 0)) * Math.max(0, Math.min(s.y + s.h, H) - Math.max(s.y, 0))) / a;
};

/** The fastest of the frame's corners between two R-frames, px at 1080 a frame. */
export function cornerSpeedR(t: ReturnTrace, r: number): number {
  const a = t.poseAt(r);
  const b = t.poseAt(r + 1);
  let best = 0;
  for (const [qx, qy] of [
    [0, 0],
    [t.W, 0],
    [0, t.H],
    [t.W, t.H],
  ] as const) {
    const px = a.x + (qx - t.W / 2) / a.zoom;
    const py = a.y + (qy - t.H / 2) / a.zoom;
    best = Math.max(best, Math.hypot(t.W / 2 + b.zoom * (px - b.x) - qx, t.H / 2 + b.zoom * (py - b.y) - qy));
  }
  return best;
}

/* ---------------------------------------------------------------- returnSchedule ------------------------------- */

export interface ScheduleMetrics {
  minChangeGap: number;
  minSettled: number;
  lastSwapEnd: number;
  minOnScreen: number;
  shortOnScreen: string[];
  maxOverlap: number;
  overlapAt: string | null;
  maxCornerPx: number;
  minCornerPx1s: number;
  newImagesPerHalfBar: Record<string, number>;
  /** entries whose first drawn frame shows the cell, or its shadow's reach, inside the frame (appearing from nothing) */
  entriesInFrame: string[];
}

/** The schedule's numbers (MONTAGE_DESIGN §2.3, §2.6). */
export function scheduleMetrics(t: ReturnTrace): ScheduleMetrics {
  const field = t.field;
  const T = field.timing;
  const bySlot = new Map<string, FieldCell[]>();
  for (const c of field.cells) bySlot.set(`${c.ring}:${c.slot}`, [...(bySlot.get(`${c.ring}:${c.slot}`) ?? []), c]);
  let minChangeGap = Infinity;
  let minSettled = Infinity;
  for (const occ of bySlot.values()) {
    const sorted = [...occ].sort((a, b) => a.settle - b.settle);
    const changes = sorted.filter((c) => c.swapIn !== null).map((c) => c.swapIn!);
    if (changes.length) minChangeGap = Math.min(minChangeGap, changes[0]! - sorted[0]!.settle);
    for (let k = 1; k < changes.length; k++) minChangeGap = Math.min(minChangeGap, changes[k]! - changes[k - 1]!);
    for (const c of sorted) {
      const next = c.swappedOutAt ?? c.retStart;
      if (next !== null && c.settle > T.span.from) minSettled = Math.min(minSettled, next - c.settle);
    }
  }
  const lastSwapEnd = Math.max(...field.cells.filter((c) => c.swapIn !== null).map((c) => c.swapIn! + T.swapFrames));
  const onScreen = new Map<string, number>(field.cells.map((c) => [c.id, 0]));
  let maxOverlap = 0;
  let overlapAt: string | null = null;
  for (const fr of t.frames) {
    const settled: TraceCell[] = [];
    for (const x of fr.cells) {
      if (inFrameShare(x.s, t.W, t.H) * x.share >= 0.5) onScreen.set(x.c.id, onScreen.get(x.c.id)! + 1);
      if (x.p.state === "settled") settled.push(x);
    }
    for (let i = 0; i < settled.length; i++)
      for (let j = i + 1; j < settled.length; j++) {
        const a = settled[i]!.s;
        const b = settled[j]!.s;
        const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        if (ox * oy <= 0) continue;
        const f = (ox * oy) / Math.min(a.w * a.h, b.w * b.h);
        if (f > maxOverlap) {
          maxOverlap = f;
          overlapAt = `${settled[i]!.c.id} and ${settled[j]!.c.id} on R${fr.r}`;
        }
      }
  }
  const minOnScreen = Math.min(...onScreen.values());
  const shortOnScreen = [...onScreen.entries()].filter(([, v]) => v < 60).map(([k, v]) => `${k} (${v})`);
  let maxCornerPx = 0;
  const speeds: number[] = [];
  const last = t.frames[t.frames.length - 1]!.r;
  for (let r = T.span.from; r < last; r++) {
    const v = cornerSpeedR(t, r);
    speeds.push(v);
    maxCornerPx = Math.max(maxCornerPx, v);
  }
  let minCornerPx1s = Infinity;
  for (let i = 0; i + 60 <= speeds.length; i++) {
    let s = 0;
    for (let k = i; k < i + 60; k++) s += speeds[k]!;
    minCornerPx1s = Math.min(minCornerPx1s, s / 60);
  }
  const ev = [...field.cells.filter((c) => c.enter !== null).map((c) => c.enter!), ...field.cells.filter((c) => c.swapIn !== null).map((c) => c.swapIn!)];
  const newImagesPerHalfBar: Record<string, number> = {};
  for (let h = 0; h < 720; h += 60) newImagesPerHalfBar[`R${h}`] = ev.filter((x) => x >= h && x < h + 60).length;
  // every entry begins out of frame: on its first drawn frame neither its rect nor its window shadow's reach (40 × its
  // scale) is in frame (RV-02: entries from 1.7× their slot's radius began inside the frame at some slots and zooms)
  const entriesInFrame: string[] = [];
  for (const c of field.cells) {
    if (c.enter === null) continue;
    const x = t.at(Math.ceil(c.enter - 1e-9))?.cells.find((y) => y.c === c);
    if (!x) continue;
    const m = 40 * (x.s.w / x.c.w0);
    if (x.s.x - m < t.W && x.s.y - m < t.H && x.s.x + x.s.w + m > 0 && x.s.y + x.s.h + m > 0) entriesInFrame.push(`${c.id} on R${Math.ceil(c.enter - 1e-9)}`);
  }
  return { minChangeGap, minSettled, lastSwapEnd, minOnScreen, shortOnScreen, maxOverlap, overlapAt, maxCornerPx, minCornerPx1s, newImagesPerHalfBar, entriesInFrame };
}

/** The slot rule, the settle rule, the swaps' end, the cells on screen, no overlap, the travel limit. */
export function returnScheduleOf(t: ReturnTrace, name = "the Return"): Finding[] {
  const out: Finding[] = [];
  const m = scheduleMetrics(t);
  const e = (message: string) => out.push({ check: "returnSchedule", level: "error", message: `${name}: ${message}` });
  if (m.minChangeGap < 22) e(`a slot changes twice within ${m.minChangeGap} frames (at most once in 22; designed 73): R3 and R4's per-place rate`);
  if (m.minSettled < 60) e(`an image moves again ${m.minSettled.toFixed(1)} frames after it settled (60 or more)`);
  if (m.lastSwapEnd > 466) e(`a swap completes on R${m.lastSwapEnd} (none after R466: the merge is motion, never light)`);
  if (m.minOnScreen < 60) e(`cells at least half in frame and unhidden for under 60 frames: ${m.shortOnScreen.join(", ")}`);
  if (m.maxOverlap > 0) e(`two settled cells overlap (${(m.maxOverlap * 100).toFixed(1)} % of the smaller): ${m.overlapAt}`);
  if (m.maxCornerPx > 30) e(`the frame's corners travel ${m.maxCornerPx.toFixed(1)} px a frame (at most 30, TREATMENT §5.3)`);
  if (m.entriesInFrame.length) e(`${m.entriesInFrame.length} entries begin inside the frame, appearing there from nothing: ${m.entriesInFrame.join(", ")} (an entry spirals in from out of frame: plan it with planReturn, whose fitEntries starts it further out)`);
  out.push({ check: "returnSchedule", level: "info", message: `${name}: slot changes ≥ ${m.minChangeGap} frames apart; settled ≥ ${m.minSettled.toFixed(1)} frames before moving; last swap ends R${m.lastSwapEnd}; every cell on screen ≥ ${m.minOnScreen} frames; settled overlap ${m.maxOverlap.toFixed(3)}; corners ≤ ${m.maxCornerPx.toFixed(2)} px a frame, ≥ ${m.minCornerPx1s.toFixed(3)} over every second; new images a half bar ${Object.values(m.newImagesPerHalfBar).join(", ")}` });
  return out;
}

export function returnSchedule(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? returnScheduleOf(t, `${p.id} ${p.aspect}`) : [];
}

/* ---------------------------------------------------------------- returnWindows (the flash model) ------------- */

export interface WindowLoad {
  window: string;
  worst: number;
  swapWorst: number;
  motionWorst: number;
  at: [number, number] | null;
  beforeR240: number;
  fromR240: number;
  atFromR240: [number, number] | null;
  extended: boolean;
}

/** The most events within any 60 frames. */
const max60 = (ts: readonly number[]): number => {
  let best = 0;
  let j = 0;
  for (let i = 0; i < ts.length; i++) {
    while (ts[i]! - ts[j]! >= 60) j++;
    best = Math.max(best, i - j + 1);
  }
  return best;
};

/** A monotone swing of this share of a window's area counts as one transition (MONTAGE_DESIGN §3.2). */
export const SWING = 0.25;

/**
 * The moving coverage's transitions in one window (MONTAGE_DESIGN §3.2): each monotone swing of SWING or more of the
 * window's area counts one, on the frame it reaches SWING. Until the first transition the swing is measured from the
 * running minimum AND maximum (the review's RV-03: measured from the window's first value only, while the coverage
 * stayed within 0.25 of it, a gradual rise of 0.25–0.5 from below that value was never counted); after it, from the
 * extreme of the current swing. `series[from + i]` is frame `r0 + i`, for `n` frames.
 */
export function coverageSwings(series: ArrayLike<number>, r0 = 0, from = 0, n = series.length - from): number[] {
  const tr: number[] = [];
  let lo = series[from]!;
  let hi = lo;
  let ext = lo;
  let state = 0;
  for (let i = 0; i < n; i++) {
    const v = series[from + i]!;
    if (state === 0) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      // (v is the new extreme on the side it moved to, so at most one of these holds)
      if (v - lo >= SWING) {
        tr.push(r0 + i);
        state = 1;
        ext = v;
      } else if (hi - v >= SWING) {
        tr.push(r0 + i);
        state = -1;
        ext = v;
      }
    } else if (state > 0) {
      if (v <= ext - SWING) {
        tr.push(r0 + i);
        state = -1;
        ext = v;
      } else ext = Math.max(ext, v);
    } else if (v >= ext + SWING) {
      tr.push(r0 + i);
      state = 1;
      ext = v;
    } else ext = Math.min(ext, v);
  }
  return tr;
}

/** The share of a window covered by the union of rects (a slide swap's outgoing and incoming cells at its crossing). */
const unionShare = (rs: readonly Rect[], X: number, Y: number, ww: number, wh: number): number => {
  const clip = rs.map((s) => ({ x0: Math.max(s.x, X), y0: Math.max(s.y, Y), x1: Math.min(s.x + s.w, X + ww), y1: Math.min(s.y + s.h, Y + wh) })).filter((q) => q.x1 > q.x0 && q.y1 > q.y0);
  if (!clip.length) return 0;
  const area = (q: { x0: number; y0: number; x1: number; y1: number }) => (q.x1 - q.x0) * (q.y1 - q.y0);
  let a = clip.reduce((s, q) => s + area(q), 0);
  // two rects at most (the outgoing and the incoming): take their overlap off once
  if (clip.length === 2) {
    const [p, q] = clip as [(typeof clip)[number], (typeof clip)[number]];
    const o = { x0: Math.max(p.x0, q.x0), y0: Math.max(p.y0, q.y0), x1: Math.min(p.x1, q.x1), y1: Math.min(p.y1, q.y1) };
    if (o.x1 > o.x0 && o.y1 > o.y0) a -= area(o);
  }
  return a / (ww * wh);
};

/**
 * IRIS's extended rule on a window's transitions: 4 or more transitions in each of 240 of 300 consecutive one-second
 * windows (4 s of any 5) over the frames r0 … r0 + nF − 1.
 */
export function irisExtended(all: readonly number[], r0: number, nF: number): boolean {
  const counts: number[] = [];
  let j0 = 0;
  let j1 = 0;
  for (let r = r0; r + 60 <= r0 + nF; r++) {
    while (j0 < all.length && all[j0]! < r) j0++;
    while (j1 < all.length && all[j1]! < r + 60) j1++;
    counts.push(j1 - j0);
  }
  let n4 = 0;
  for (let k = 0; k < counts.length; k++) {
    if (counts[k]! >= 4) n4++;
    if (k >= 300 && counts[k - 300]! >= 4) n4--;
    if (k >= 299 && n4 >= 240) return true;
  }
  return false;
}

/** The flash model per window size (MONTAGE_DESIGN §3.2; schedule_r2.py's run_aspect, frame by frame). */
export function windowLoads(t: ReturnTrace): WindowLoad[] {
  const out: WindowLoad[] = [];
  const field = t.field;
  const R0 = t.frames[0]!.r;
  const nF = t.frames.length;
  for (const [ww, wh] of field.geometry.windows) {
    const A = ww * wh;
    const stride = 40;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let x = 0; x <= t.W - ww; x += stride) xs.push(x);
    for (let y = 0; y <= t.H - wh; y += stride) ys.push(y);
    const nx = xs.length;
    const ny = ys.length;
    const nW = nx * ny;
    const cov = new Float64Array(nW * nF);
    t.frames.forEach((fr, fi) => {
      for (const x of fr.cells) {
        const { x: sx0, y: sy0 } = x.s;
        const sx1 = x.s.x + x.s.w;
        const sy1 = x.s.y + x.s.h;
        const ix0 = Math.max(0, Math.ceil((sx0 - ww) / stride));
        const ix1 = Math.min(nx - 1, Math.floor(sx1 / stride));
        const iy0 = Math.max(0, Math.ceil((sy0 - wh) / stride));
        const iy1 = Math.min(ny - 1, Math.floor(sy1 / stride));
        for (let iy = iy0; iy <= iy1; iy++) {
          const Y = ys[iy]!;
          const oy = Math.min(sy1, Y + wh) - Math.max(sy0, Y);
          if (oy <= 0) continue;
          for (let ix = ix0; ix <= ix1; ix++) {
            const X = xs[ix]!;
            const ox = Math.min(sx1, X + ww) - Math.max(sx0, X);
            if (ox > 0) cov[(iy * nx + ix) * nF + fi] += (ox * oy * x.share) / A;
          }
        }
      }
    });
    // each swap at its crossing: what changes there is the outgoing cell (on its last frame, slid on) and the incoming
    // one (on its first): for a slide swap their union, 36 px wider than either (the review's RV-03: the incoming alone
    // undercounted a slide's area); for a blur swap in place, one rect
    const swapEv: { t: number; s: Rect[] }[] = [];
    for (const c of field.cells) {
      if (c.swapIn === null) continue;
      const tc = c.swapIn + field.timing.swapFrames / 2;
      const hit = t.at(Math.floor(tc))?.cells.find((x) => x.c === c);
      const prev = field.cells.find((x) => x.ring === c.ring && x.slot === c.slot && x.swappedOutAt === c.swapIn);
      const out = prev ? t.at(Math.ceil(tc) - 1)?.cells.find((x) => x.c === prev) : undefined;
      if (hit) swapEv.push({ t: tc, s: [hit.s, ...(out ? [out.s] : [])] });
    }
    const w: WindowLoad = { window: `${ww}x${wh}`, worst: 0, swapWorst: 0, motionWorst: 0, at: null, beforeR240: 0, fromR240: 0, atFromR240: null, extended: false };
    for (let wi = 0; wi < nW; wi++) {
      const X = xs[wi % nx]!;
      const Y = ys[Math.floor(wi / nx)]!;
      // the moving coverage's swings of 25 % (a conservative proxy: every cell differs from the ground by 0.1 or more)
      const tr = coverageSwings(cov, R0, wi * nF, nF);
      // swaps: 2 transitions where the cell covers 25 % of the window; groups within 2 frames adding up to 25 %
      const ev: { t: number; o: number }[] = [];
      for (const s of swapEv) {
        const o = unionShare(s.s, X, Y, ww, wh);
        if (o > 0) ev.push({ t: s.t, o });
      }
      ev.sort((a, b) => a.t - b.t);
      const st: number[] = [];
      for (const e of ev) if (e.o >= 0.25) st.push(e.t, e.t);
      for (let i = 0; i < ev.length; i++) {
        const grp = ev.filter((e) => e.t - ev[i]!.t >= 0 && e.t - ev[i]!.t <= 2).map((e) => e.o);
        if (grp.length >= 2 && grp.reduce((a, b) => a + b, 0) >= 0.25 && Math.max(...grp) < 0.25) st.push(ev[i]!.t, ev[i]!.t);
      }
      const all = [...tr, ...st].sort((a, b) => a - b);
      const mAll = max60(all);
      const mA = max60(all.filter((x) => x < 240));
      const mB = max60(all.filter((x) => x >= 240));
      w.beforeR240 = Math.max(w.beforeR240, mA);
      if (mB > w.fromR240) {
        w.fromR240 = mB;
        w.atFromR240 = [X, Y];
      }
      if (mAll > w.worst) {
        w.worst = mAll;
        w.at = [X, Y];
      }
      w.swapWorst = Math.max(w.swapWorst, max60([...st].sort((a, b) => a - b)));
      w.motionWorst = Math.max(w.motionWorst, max60(tr));
      // IRIS's extended rule: 4 or more transitions in each of 240 of 300 consecutive one-second windows
      if (mAll >= 4 && !w.extended && irisExtended(all, R0, nF)) w.extended = true;
    }
    out.push(w);
  }
  return out;
}

export function returnWindowsOf(t: ReturnTrace, name = "the Return"): Finding[] {
  const out: Finding[] = [];
  for (const w of windowLoads(t)) {
    const where = w.at ? ` (the ${w.window} window at ${w.at[0]}, ${w.at[1]})` : "";
    if (w.worst > 6) out.push({ check: "returnWindows", level: "error", message: `${name}: ${w.worst} transitions in 60 frames in a ${w.window} window${where}: WCAG 2.3.1 fails above 6 (swaps ${w.swapWorst}, motion ${w.motionWorst})` });
    else if (w.worst >= 4) out.push({ check: "returnWindows", level: "warn", message: `${name}: ${w.worst} transitions in 60 frames in a ${w.window} window${where}: IRIS's warning level (before R240 ${w.beforeR240}, from R240 ${w.fromR240}); flash-rgb.ts on the render is the verdict` });
    if (w.extended) out.push({ check: "returnWindows", level: "error", message: `${name}: IRIS's extended failure in a ${w.window} window (4 or more transitions in 240 of 300 one-second windows)` });
    out.push({ check: "returnWindows", level: "info", message: `${name}: ${w.window}: worst ${w.worst} in 60 frames (swaps ${w.swapWorst}, motion ${w.motionWorst}); before R240 ${w.beforeR240}, from R240 ${w.fromR240}; extended ${w.extended ? "yes" : "no"} (the model)` });
  }
  return out;
}

export function returnWindows(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? returnWindowsOf(t, `${p.id} ${p.aspect}`) : [];
}

/* ---------------------------------------------------------------- returnContent -------------------------------- */

/** When a cell is drawn: from its entry or its swap's crossing to its leave or the end of its return. */
const presence = (c: FieldCell, swapFrames: number): [number, number] => [c.enter ?? (c.swapIn !== null ? c.swapIn + swapFrames / 2 : -Infinity), c.leave ?? (c.retStart !== null ? c.retStart + c.retT! : Infinity)];

/**
 * A swap's step in mean relative luminance may be at most this (outgoing to incoming, as drawn). The reels of 28 Oct
 * calibrate it: A2's pebble into B7's slot (a step of about 0.15) snapped 3.4-5.8 levels in its tile in every aspect,
 * and E1+E2's still into I1*'s slot (0.057, the darker slots of then) 3.29 in 1:1's; the outer ring's steps of up to
 * 0.08 did not snap, the middle ring's larger cells did, so the limit sits under both snaps (the review's RV-02).
 */
export const SWAP_LUM_STEP = 0.05;

/**
 * A pictured pebble drawn wider than this (px at 1080) reads as a second stone: under it the body is a speck whose
 * eyes (about a tenth of its width each) are under a pixel (the review's RV-01).
 */
export const PICTURED_STONE_PX = 6;

/** The companion's pebble a cell pictures, its body's width in px at 1080 for the cell drawn screenW × screenH (0: none). */
export const picturedStonePxOf = (c: Pick<FieldCell, "spec">, screenW: number, screenH: number): number => {
  const si = c.spec.standIn;
  // Pebble's engine in the cell (views/ReturnView.tsx draws it at ENGINE_CELL_SIZE of the cell's height)
  if (si.kind === "engine") return bodyStats(ENGINE_CELL_SIZE * screenH).width;
  if (si.kind !== "still" || !si.avatarPx) return 0;
  const k = si.fit === "cover" ? Math.max(screenW / si.crop.w, screenH / si.crop.h) : Math.min(screenW / si.crop.w, screenH / si.crop.h);
  return si.avatarPx * k;
};



/** The drawn images' mean relative luminance, least to greatest (for the report). */
const lumRange = (cells: readonly FieldCell[], table?: Readonly<Record<string, DrawnLum>>): string => {
  const v = cells.map((c) => drawnLumOf(c, table).mean).filter((x): x is number => x !== undefined);
  return v.length ? `${Math.min(...v).toFixed(3)}–${Math.max(...v).toFixed(3)} (${v.length} measured)` : "not measured";
};

/**
 * A slice's R-frames (RV-11): its frames at 1×, the last (its moment) on the frame the cell settles, or, for a recall
 * present from the start, the first frame it shows at least half in frame and unhidden; null when it never does.
 */
export function sliceWindowR(t: ReturnTrace, c: FieldCell): { from: number; to: number } | null {
  const n = c.spec.slice?.frames ?? 1;
  let end: number | null = c.enter !== null || c.swapIn !== null ? c.settle : null;
  if (end === null)
    for (const fr of t.frames) {
      const x = fr.cells.find((y) => y.c === c);
      if (x && inFrameShare(x.s, t.W, t.H) * x.share >= 0.5) {
        end = fr.r;
        break;
      }
    }
  return end === null ? null : { from: end - n + 1, to: end };
}

export function returnContentOf(t: ReturnTrace, name = "the Return"): Finding[] {
  const out: Finding[] = [];
  const field = t.field;
  const e = (message: string) => out.push({ check: "returnContent", level: "error", message: `${name}: ${message}` });
  const specs: ReturnCellSpec[] = field.cells.map((c) => c.spec);
  for (const m of manifestProblems(specs)) e(m);
  const lumTable = field.options.lum ?? RETURN_LUM;
  // light-theme cells only: held on what is drawn (the stand-in's image now, the 2.0.0 crop once measured; RV-05)
  let unmeasured = 0;
  let crops = 0;
  for (const c of field.cells) {
    if (c.spec.theme !== "light") e(`${c.id} is a ${c.spec.theme}-theme cell: light-theme captures only on the page ground (R3 §4.4)`);
    const d = drawnLumOf(c, lumTable);
    if (d.mean !== undefined && d.mean < 0.7) e(`${c.id}'s mean relative luminance is ${d.mean.toFixed(2)}${d.measuredOn === "stand-in" ? " (its stand-in, as drawn)" : ""} (0.70 or more)`);
    if (d.mean === undefined && c.spec.standIn.kind !== "frame") unmeasured++;
    if (c.spec.meanLum !== undefined) crops++;
  }
  // one stone from the climax to the end card (CR-01; MONTAGE_DESIGN §2.12, §2.13; RV-01): no cell pictures the pebble
  const pictured = new Map<FieldCell, { px: number; r: number }>();
  for (const fr of t.frames)
    for (const x of fr.cells) {
      if (inFrameShare(x.s, t.W, t.H) <= 0) continue;
      const px = picturedStonePxOf(x.c, x.s.w, x.s.h);
      if (px > PICTURED_STONE_PX && (pictured.get(x.c)?.px ?? 0) < px) pictured.set(x.c, { px, r: fr.r });
    }
  for (const [c, w] of pictured) e(`${c.id} pictures the pebble ${w.px.toFixed(0)} px wide at 1080 on R${w.r} (${c.spec.standIn.kind === "engine" ? "Pebble's engine drawn in the cell" : "its image shows the companion's avatar"}): a second stone beside the stone, which is one from the climax to the end card (CR-01; MONTAGE_DESIGN §2.12, §2.13). Crop the avatar out (${PICTURED_STONE_PX} px or less), or the cell leaves the Return for the tour and the shorts`);
  const expected = field.cells.filter((c) => c.spec.avatar === "expected" && !pictured.has(c) && !(c.spec.standIn.kind === "still" && c.spec.standIn.avatarPx !== undefined));
  if (expected.length) out.push({ check: "returnContent", level: "warn", message: `${name}: ${expected.length} cells' 2.0.0 captures are expected to picture the companion's avatar (${expected.map((c) => c.id).join(", ")}): each crop must leave it out (${PICTURED_STONE_PX} px or less at 1080, measured as avatarPx), or the cell leaves the Return for the tour and the shorts (one stone, RV-01; A2 and A3, whose features are the companion itself, wait for the lead's ruling)` });
  // red: the share of the frame, settled before R240, never swapped, entries 30 frames apart
  const reds = field.cells.filter((c) => c.spec.red);
  const frameArea = t.W * t.H;
  for (const c of field.cells) {
    const red = drawnLumOf(c, lumTable).red;
    if (red === undefined || (c.spec.red && c.spec.redShare === undefined)) {
      if (c.spec.red) out.push({ check: "returnContent", level: "warn", message: `${name}: ${c.id}'s saturated-red share is not measured on its 2.0.0 crop yet (fill it before the schedule freezes; its budget: returnContent's info)` });
      if (red === undefined) continue;
    }
    // the most of it the frame ever shows (its part inside the frame, less what the stone hides)
    let maxArea = 0;
    for (const fr of t.frames) for (const x of fr.cells) if (x.c === c) maxArea = Math.max(maxArea, x.s.w * x.s.h * inFrameShare(x.s, t.W, t.H) * x.share);
    const share = (red * maxArea) / frameArea;
    if (share >= field.geometry.redLimit) e(`${c.id}'s saturated red reaches ${(share * 100).toFixed(2)} % of the frame (under ${(field.geometry.redLimit * 100).toFixed(1)} %)`);
  }
  // each red cell's budget for its 2.0.0 crop: the most saturated red its crop may hold, given the most of the frame it
  // fills (for the capture lane: RV-05)
  const budgets = reds.map((c) => {
    let maxArea = 0;
    for (const fr of t.frames) for (const x of fr.cells) if (x.c === c) maxArea = Math.max(maxArea, x.s.w * x.s.h * inFrameShare(x.s, t.W, t.H) * x.share);
    return `${c.id} fills at most ${((maxArea / frameArea) * 100).toFixed(2)} % of the frame, so its crop may hold under ${Math.min(100, (field.geometry.redLimit * frameArea * 100) / Math.max(maxArea, 1e-9)).toFixed(0)} % saturated red`;
  });
  if (budgets.length) out.push({ check: "returnContent", level: "info", message: `${name}: the red cells' budgets: ${budgets.join("; ")}` });
  for (const c of reds) {
    if (c.settle >= 240) e(`the red cell ${c.id} settles on R${c.settle} (before R240, out of the fast phase)`);
    if (c.swappedOutAt !== null) e(`the red cell ${c.id} is swapped out on R${c.swappedOutAt} (red cells are never swapped)`);
    if (c.swapIn !== null) e(`the red cell ${c.id} swaps in on R${c.swapIn} (red cells enter early and hold)`);
  }
  for (let i = 0; i < reds.length; i++)
    for (let j = i + 1; j < reds.length; j++) {
      const a = reds[i]!.enter ?? reds[i]!.swapIn ?? -Infinity;
      const b = reds[j]!.enter ?? reds[j]!.swapIn ?? -Infinity;
      if (Math.abs(a - b) < 30) e(`the red cells ${reds[i]!.id} and ${reds[j]!.id} enter ${Math.abs(a - b)} frames apart (30 or more)`);
    }
  // each swap's step in mean relative luminance, outgoing to incoming (the review's RV-02: a swap crosses at mid-blur in
  // one frame, so a step this large snaps, as A2's dark pebble did into B7's pale slot: 4.7-5.8 levels in its tile; the
  // waves are paired by luminance to keep the steps small, MONTAGE_DESIGN §2.4)
  const steps: { c: FieldCell; prev: FieldCell; d: number }[] = [];
  const unpaired: string[] = [];
  for (const c of field.cells) {
    if (c.swapIn === null) continue;
    const prev = field.cells.find((x) => x.ring === c.ring && x.slot === c.slot && x.swappedOutAt === c.swapIn);
    if (!prev) continue;
    const a = drawnLumOf(prev, lumTable).mean;
    const b = drawnLumOf(c, lumTable).mean;
    if (a === undefined || b === undefined) unpaired.push(`${prev.id}→${c.id}`);
    else steps.push({ c, prev, d: Math.abs(a - b) });
  }
  for (const x of steps.filter((y) => y.d > SWAP_LUM_STEP)) e(`${x.c.id} swaps in for ${x.prev.id} on R${x.c.swapIn}: a step of ${x.d.toFixed(3)} in mean relative luminance (${SWAP_LUM_STEP} or less: a swap crosses at mid-blur on one frame, so a larger step snaps; pair the wave by luminance, MONTAGE_DESIGN §2.4)`);
  if (unpaired.length) out.push({ check: "returnContent", level: "warn", message: `${name}: ${unpaired.length} swaps' luminance is not measured (${unpaired.slice(0, 6).join(", ")}${unpaired.length > 6 ? " …" : ""}): their step is unchecked and their wave keeps the manifest's order` });
  const worstStep = steps.reduce<(typeof steps)[number] | null>((a, b) => (!a || b.d > a.d ? b : a), null);
  out.push({ check: "returnContent", level: "info", message: `${name}: ${steps.length} swaps; the largest step in mean relative luminance ${worstStep ? `${worstStep.d.toFixed(3)} (${worstStep.prev.id} → ${worstStep.c.id} on R${worstStep.c.swapIn})` : "—"}, the mean ${steps.length ? (steps.reduce((a, b) => a + b.d, 0) / steps.length).toFixed(4) : "—"} (${SWAP_LUM_STEP} or less); waves paired by luminance: ${field.pairing.map((w) => `${w.wave} ${w.paired ? `paired, ${w.moved} moved` : "in the manifest's order"}`).join(", ")}` });
  // the slices (RV-11): at 1×, played once, forward, ending on the moment as the cell settles (a recall present from the
  // start: as it first shows at least half in frame), every frame while the cell is drawn
  const slices: string[] = [];
  for (const c of field.cells) {
    const sl = c.spec.slice;
    if (!sl) continue;
    if ((sl.rate ?? 1) !== 1) e(`${c.id}'s slice plays at ${sl.rate}× (1× only: nothing Pebble does is sped up, the method line L4)`);
    const w = sliceWindowR(t, c);
    const drawn = presence(c, field.timing.swapFrames)[0];
    const first = Number.isFinite(drawn) ? drawn : field.timing.span.from;
    if (w === null) e(`${c.id}'s slice has no moment to end on: the cell never shows at least half in frame`);
    else if (w.from < first) e(`${c.id}'s slice of ${sl.frames} frames would start on R${w.from}, before the cell is drawn (R${first}): ending on its moment as it settles (R${w.to}), at most ${Math.floor(w.to - first + 1)} frames fit`);
    else slices.push(`${c.id} R${w.from}–R${w.to}`);
  }
  if (slices.length) out.push({ check: "returnContent", level: "info", message: `${name}: the slices at 1×, each ending on its moment: ${slices.join(", ")}` });
  // one take, one moment (CR-11): two moments of one take never on screen together
  for (let i = 0; i < field.cells.length; i++)
    for (let j = i + 1; j < field.cells.length; j++) {
      const a = field.cells[i]!;
      const b = field.cells[j]!;
      if (a.spec.take !== b.spec.take || a.spec.moment === b.spec.moment) continue;
      const [s1, e1] = presence(a, field.timing.swapFrames);
      const [s2, e2] = presence(b, field.timing.swapFrames);
      if (s1 < e2 && s2 < e1) e(`${a.id} (${a.spec.moment}) and ${b.id} (${b.spec.moment}) show two moments of "${a.spec.take}" on screen together (R${Math.max(s1, s2)}–R${Math.min(e1, e2)}): one take, one moment (CR-11)`);
    }
  // the same on what is drawn (RV-05): two stand-ins cropped from one published conversation at different moments, on
  // screen together. Placeholders only (the 2.0.0 crops come from the takes the manifest names, held above): listed for
  // the lead, who decides whether they become slots (F11*'s did: it sat 4.5 s beside F12's Verified)
  const srcOf = (c: FieldCell) => (c.spec.standIn.kind === "still" ? (c.spec.standIn.source ?? null) : null);
  const drawnClash: string[] = [];
  for (let i = 0; i < field.cells.length; i++)
    for (let j = i + 1; j < field.cells.length; j++) {
      const a = field.cells[i]!;
      const b = field.cells[j]!;
      const sa = srcOf(a);
      const sb = srcOf(b);
      if (!sa || !sb || sa.take !== sb.take || sa.moment === sb.moment) continue;
      const [s1, e1] = presence(a, field.timing.swapFrames);
      const [s2, e2] = presence(b, field.timing.swapFrames);
      if (s1 < e2 && s2 < e1) drawnClash.push(`${a.id} (${sa.moment}) and ${b.id} (${sb.moment}) of ${sa.take}, R${Math.max(s1, s2)}–R${Math.min(e1, e2)}`);
    }
  if (drawnClash.length) out.push({ check: "returnContent", level: "warn", message: `${name}: ${drawnClash.length} pairs of stand-ins show two moments of one published conversation on screen together: ${drawnClash.join("; ")}. Placeholders only (the cells' own takes hold CR-11); the lead decides whether they become slots (RV-05)` });
  // no two cards side by side on a ring
  let adjacent: string | null = null;
  for (const fr of t.frames) {
    const byRing = new Map<number, Map<number, FieldCell>>();
    for (const x of fr.cells) {
      if (x.p.state !== "settled") continue;
      if (!byRing.has(x.c.ring)) byRing.set(x.c.ring, new Map());
      byRing.get(x.c.ring)!.set(x.c.slot, x.c);
    }
    for (const [ring, occ] of byRing)
      for (const [slot, c1] of occ) {
        const c2 = occ.get((slot + 1) % RETURN_SLOTS[ring]!);
        if (c2 && c1.spec.card && c2.spec.card && !adjacent) adjacent = `${c1.id} and ${c2.id} (ring ${ring}, slots ${slot} and ${(slot + 1) % RETURN_SLOTS[ring]!}) on R${fr.r}`;
      }
  }
  if (adjacent) e(`two card-type cells sit side by side: ${adjacent} (cards go to every other slot)`);
  // the light-theme rule holds by declaration only until each crop's mean luminance is measured: say so, as for red
  // the light rule holds on what is drawn; the 2.0.0 crops still have to be measured before the schedule freezes
  const imaged = field.cells.filter((c) => c.spec.standIn.kind !== "frame").length;
  if (unmeasured) out.push({ check: "returnContent", level: "warn", message: `${name}: the light-theme rule is declared, not measured: ${unmeasured} of ${imaged} drawn cells have no mean relative luminance (0.70 or more; measure the images, through heavy.sh: setpieces/tools/return-thumbs.ts --measure)` });
  if (crops < imaged) out.push({ check: "returnContent", level: "warn", message: `${name}: the light-theme rule is held on the stand-ins as drawn; ${imaged - crops} of ${imaged} cells' 2.0.0 crops are not measured yet (0.70 or more; measure them, through heavy.sh, before the schedule freezes)` });
  out.push({ check: "returnContent", level: "info", message: `${name}: ${field.cells.length} cells, ${field.cells.filter((c) => c.spec.card).length} card-type, ${reds.length} red (${reds.map((c) => `${c.id} R${c.enter ?? c.swapIn}→R${c.settle}`).join(", ")}), ${field.cells.filter((c) => c.spec.shown).length} the film shows; the drawn images' mean relative luminance ${lumRange(field.cells, lumTable)}; ${unmeasured} unmeasured; ${crops} 2.0.0 crops measured` });
  return out;
}

export function returnContent(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? returnContentOf(t, `${p.id} ${p.aspect}`) : [];
}

/* ---------------------------------------------------------------- returnMerge and returnRadius --------------- */

export interface MergeMetrics {
  returns: number;
  contacts: number;
  firstContact: number;
  lastContact: number;
  spread: number;
  heroContact: number | null;
  heroHidden: number | null;
  lastHidden: number | null;
  contactsPerBeat: number[];
  widthAtContactPx: { min: number; median: number; max: number };
  medianWidthOverBody: number;
  /** screen radius at first contact ÷ at the return's start: its fall, mean and least per ring */
  radiusFallMean: number;
  radiusFallMinByRing: Record<number, number>;
  worstFall: { cell: string; fall: number } | null;
  contactToHidden: { min: number; max: number };
  signChanges: string[];
  fadesBeforeHidden: string[];
}

/** The merge's numbers (MONTAGE_DESIGN §2.7), on the trace's frames. */
export function mergeMetrics(t: ReturnTrace): MergeMetrics {
  const field = t.field;
  const rets = field.cells.filter((c) => c.retStart !== null);
  const contact = new Map<FieldCell, number>();
  const hidden = new Map<FieldCell, number>();
  const contactW = new Map<FieldCell, number>();
  const startScreen = new Map<FieldCell, number>();
  const contactScreen = new Map<FieldCell, number>();
  const fades = new Set<string>();
  const signs: string[] = [];
  const stoneScreen = (fr: TraceFrame, depth = 1) => {
    const pp = t.ref ? planePose(fr.pose, t.ref, depth) : fr.pose;
    return { x: t.W / 2 + (0 - pp.x) * pp.zoom, y: t.H / 2 + (0 - pp.y) * pp.zoom };
  };
  for (const c of rets) {
    // its polar angle about the stone, from 30 frames before its return until it is hidden: the angular velocity's sign
    let prevPhi: number | null = null;
    let sign = 0;
    let signAt = 0;
    for (let r = Math.floor(c.retStart! - 30); r <= c.retStart! + c.retT!; r++) {
      const p = cellPoseR(field, c, r);
      if (!p) {
        prevPhi = null;
        continue;
      }
      const q = p.rect;
      const share = visibleFraction(q.x, q.y, q.x + q.w, q.y + q.h, field.stone.px);
      if (p.state === "return") {
        if (!contact.has(c) && rectTouchesBody(q.x, q.y, q.x + q.w, q.y + q.h, field.stone.px)) {
          contact.set(c, r);
          contactW.set(c, Math.max(q.w, q.h));
          const fr = t.at(r);
          if (fr) {
            const s = stoneScreen(fr, p.depth);
            const pp = t.ref ? planePose(fr.pose, t.ref, p.depth) : fr.pose;
            contactScreen.set(c, Math.hypot(t.W / 2 + (p.c.x - pp.x) * pp.zoom - s.x, t.H / 2 + (p.c.y - pp.y) * pp.zoom - s.y));
          }
        }
        if (!startScreen.has(c)) {
          const fr = t.at(r);
          if (fr) {
            const s = stoneScreen(fr, p.depth);
            const pp = t.ref ? planePose(fr.pose, t.ref, p.depth) : fr.pose;
            startScreen.set(c, Math.hypot(t.W / 2 + (p.c.x - pp.x) * pp.zoom - s.x, t.H / 2 + (p.c.y - pp.y) * pp.zoom - s.y));
          }
        }
        if (!hidden.has(c) && share === 0) hidden.set(c, r);
        if (share > 0 && p.opacity < 1 - 1e-9) fades.add(`${c.id} (opacity ${p.opacity.toFixed(2)} on R${r}, ${(share * 100).toFixed(0)} % still visible)`);
      }
      if (share === 0) break;
      const phi = Math.atan2(p.c.y, p.c.x);
      if (prevPhi !== null) {
        let d = phi - prevPhi;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        const s = Math.abs(d) < 1e-5 ? 0 : Math.sign(d);
        if (s !== 0) {
          if (sign !== 0 && s !== sign && r - signAt <= 30) signs.push(`${c.id} on R${r}`);
          sign = s;
          signAt = r;
        }
      }
      prevPhi = phi;
    }
  }
  const cts = [...contact.values()].sort((a, b) => a - b);
  const widths = [...contactW.values()].sort((a, b) => a - b);
  const hero = rets.find((c) => c.spec.hero) ?? null;
  const falls: { cell: FieldCell; fall: number }[] = [];
  for (const c of rets) if (contactScreen.has(c) && startScreen.has(c) && startScreen.get(c)! > 0) falls.push({ cell: c, fall: 1 - contactScreen.get(c)! / startScreen.get(c)! });
  const byRing: Record<number, number> = {};
  for (const f of falls) byRing[f.cell.ring] = Math.min(byRing[f.cell.ring] ?? Infinity, f.fall);
  const worst = falls.length ? falls.reduce((a, b) => (b.fall < a.fall ? b : a)) : null;
  const c2h = [...hidden.entries()].filter(([c]) => contact.has(c)).map(([c, h]) => h - contact.get(c)!);
  const firstContact = cts[0] ?? NaN;
  return {
    returns: rets.length,
    contacts: cts.length,
    firstContact,
    lastContact: cts[cts.length - 1] ?? NaN,
    spread: cts.length ? cts[cts.length - 1]! - cts[0]! : 0,
    heroContact: hero ? (contact.get(hero) ?? null) : null,
    heroHidden: hero ? (hidden.get(hero) ?? null) : null,
    lastHidden: hidden.size ? Math.max(...hidden.values()) : null,
    contactsPerBeat: Array.from({ length: 6 }, (_, k) => cts.filter((x) => x >= 480 + 30 * k && x < 510 + 30 * k).length),
    widthAtContactPx: { min: widths[0] ?? NaN, median: widths[Math.floor(widths.length / 2)] ?? NaN, max: widths[widths.length - 1] ?? NaN },
    medianWidthOverBody: (widths[Math.floor(widths.length / 2)] ?? 0) / field.stone.body.width,
    radiusFallMean: falls.length ? falls.reduce((a, b) => a + b.fall, 0) / falls.length : 0,
    radiusFallMinByRing: byRing,
    worstFall: worst ? { cell: worst.cell.id, fall: worst.fall } : null,
    contactToHidden: { min: c2h.length ? Math.min(...c2h) : NaN, max: c2h.length ? Math.max(...c2h) : NaN },
    signChanges: signs,
    fadesBeforeHidden: [...fades],
  };
}

export function returnMergeOf(t: ReturnTrace, name = "the Return"): Finding[] {
  const out: Finding[] = [];
  const m = mergeMetrics(t);
  const e = (message: string) => out.push({ check: "returnMerge", level: "error", message: `${name}: ${message}` });
  if (m.contacts < m.returns) e(`${m.returns - m.contacts} returning cells never reach the stone`);
  if (!(m.medianWidthOverBody >= 0.5)) e(`the median cell reaches the stone ${m.widthAtContactPx.median.toFixed(1)} px wide, ${m.medianWidthOverBody.toFixed(2)} of the body's width (at least 0.5: the cells visibly reach it, CR-08)`);
  if (!(m.spread >= 120)) e(`the contacts spread over ${m.spread} frames (120 or more: the person's "slowly merging")`);
  const heroLast = m.heroContact !== null && m.heroContact >= m.lastContact && m.heroHidden !== null && m.heroHidden >= (m.lastHidden ?? -Infinity);
  if (!heroLast) e(`the kept card is not the last to return (its contact R${m.heroContact}, hidden R${m.heroHidden}; the last contact R${m.lastContact}, hidden R${m.lastHidden})`);
  if (m.signChanges.length) e(`a returning cell's angular velocity changes sign within 30 frames: ${m.signChanges.slice(0, 4).join(", ")}${m.signChanges.length > 4 ? ` and ${m.signChanges.length - 4} more` : ""} (no twist: the cell curls off its ring and never reverses)`);
  if (m.fadesBeforeHidden.length) e(`cells fade before the stone hides them: ${m.fadesBeforeHidden.slice(0, 3).join("; ")}${m.fadesBeforeHidden.length > 3 ? ` and ${m.fadesBeforeHidden.length - 3} more` : ""} (a cell leaves only behind the stone; CR-08's fade)`);
  out.push({ check: "returnMerge", level: "info", message: `${name}: ${m.contacts} contacts R${m.firstContact}–R${m.lastContact} (${m.spread} frames; a beat from R480: ${m.contactsPerBeat.join(", ")}); widths at contact ${m.widthAtContactPx.min.toFixed(1)}–${m.widthAtContactPx.max.toFixed(1)} px, median ${m.medianWidthOverBody.toFixed(2)} of the body; contact to hidden ${m.contactToHidden.min}–${m.contactToHidden.max} frames; the kept card contacts R${m.heroContact}, hidden R${m.heroHidden}` });
  return out;
}

export function returnRadiusOf(t: ReturnTrace, name = "the Return"): Finding[] {
  const out: Finding[] = [];
  const m = mergeMetrics(t);
  if (!(m.radiusFallMean >= 0.7)) out.push({ check: "returnRadius", level: "error", message: `${name}: the cells' screen radius from the stone falls ${(m.radiusFallMean * 100).toFixed(0)} % on average to first contact (70 % or more: CR-08, the camera's push cancelled the cells' inward travel)` });
  if (m.worstFall && m.worstFall.fall < 0.5) out.push({ check: "returnRadius", level: "error", message: `${name}: ${m.worstFall.cell}'s screen radius falls only ${(m.worstFall.fall * 100).toFixed(0)} % to first contact (50 % or more for each cell)` });
  out.push({ check: "returnRadius", level: "info", message: `${name}: the screen radius falls ${(m.radiusFallMean * 100).toFixed(0)} % on average to first contact; least by ring ${Object.entries(m.radiusFallMinByRing).map(([k, v]) => `${["inner", "middle", "outer"][+k]} ${(v * 100).toFixed(0)} %`).join(", ")}` });
  return out;
}

export function returnMerge(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? returnMergeOf(t, `${p.id} ${p.aspect}`) : [];
}
export function returnRadius(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? returnRadiusOf(t, `${p.id} ${p.aspect}`) : [];
}

/* ---------------------------------------------------------------- cellText ------------------------------------- */

/** A cell's largest text on screen (px at 1080) for its drawn width, from its crop's largest text (CSS px). */
export const cellTextPxOf = (c: FieldCell, screenW: number, screenH: number): number => {
  const si = c.spec.standIn;
  if (c.spec.textPx <= 0) return 0;
  if (si.kind === "still") {
    const k = si.fit === "cover" ? Math.max(screenW / si.crop.w, screenH / si.crop.h) : Math.min(screenW / si.crop.w, screenH / si.crop.h);
    return c.spec.textPx * k;
  }
  if (si.kind === "frame") return Infinity;
  return c.spec.textPx * Math.max(screenW / si.w, screenH / si.h);
};

export function cellTextOf(t: ReturnTrace, name = "the Return", limit = 16): Finding[] {
  const out: Finding[] = [];
  const worst = new Map<FieldCell, { px: number; r: number }>();
  let overall = 0;
  for (const fr of t.frames)
    for (const x of fr.cells) {
      if (x.c.ring === 0) continue; // the inner ring recalls what the film read
      if (inFrameShare(x.s, t.W, t.H) <= 0) continue;
      const px = cellTextPxOf(x.c, x.s.w, x.s.h);
      overall = Math.max(overall, px);
      if (px >= limit && (worst.get(x.c)?.px ?? 0) < px) worst.set(x.c, { px, r: fr.r });
    }
  for (const [c, w] of worst) out.push({ check: "cellText", level: "error", message: `${name}: ${c.id}'s text reaches ${w.px.toFixed(1)} px at 1080 on R${w.r} (under ${limit}: cells are seen, not read; only the inner recalls may read)` });
  out.push({ check: "cellText", level: "info", message: `${name}: the largest text outside the inner ring is ${overall.toFixed(1)} px at 1080` });
  return out;
}

export function cellText(p: ScenePlan): Finding[] {
  const t = planTrace(p);
  return t ? cellTextOf(t, `${p.id} ${p.aspect}`) : [];
}

/* ---------------------------------------------------------------- blinkPlaced ---------------------------------- */

export function blinkPlaced(p: ScenePlan): Finding[] {
  const ret = returnOf(p);
  if (!ret) return [];
  const shot = p.shots.find((s) => s.returnField);
  const offset = shot?.stone?.clockOffset ?? 0;
  const { at, keepClear } = ret.blink;
  const lo = Math.min(at, ...keepClear.map((k) => k.from)) - p.fps;
  const hi = Math.max(at, ...keepClear.map((k) => k.to)) + p.fps;
  const starts = blinkStartsFor(offset, p.fps, lo, hi);
  const planned = starts.find((s) => Math.abs(s - at) <= 1);
  const out: Finding[] = [];
  const R = (f: number) => (f * 60) / p.fps - 60;
  if (planned === undefined) out.push({ check: "blinkPlaced", level: "error", message: `${p.id} ${p.aspect}: with the clock offset ${offset} no blink starts within a frame of R${R(at).toFixed(0)} (the engine's blinks fall on ${starts.map((s) => `R${R(s).toFixed(1)}`).join(", ") || "none here"})` });
  for (const s of starts) {
    if (s === planned) continue;
    const k = keepClear.find((x) => blinkTouches(s, p.fps, x));
    if (k) out.push({ check: "blinkPlaced", level: "error", message: `${p.id} ${p.aspect}: a blink on R${R(s).toFixed(1)} falls in R${R(k.from).toFixed(0)}–R${R(k.to).toFixed(0)}, ${k.why ?? "a span kept clear"}` });
  }
  // the planned blink falls 6–8 frames after the kept card is hidden, in every aspect (§2.7; the review's RV-08: 8.1,
  // 5.1 and 5.1 with the field's stone at the landing size, until the card's return was retimed per aspect)
  const t = planTrace(p);
  const hidden = t ? mergeMetrics(t).heroHidden : null;
  let gapNote = "";
  if (planned !== undefined && hidden !== null) {
    const gap = R(planned) - hidden;
    gapNote = `; the planned blink ${gap.toFixed(1)} frames after the kept card is hidden (R${hidden})`;
    // (the toned matte, G1's alternative, draws the card inside the outline after the body hides it: its gap is G1's to
    // judge, so it is reported, not held; RV-08 binds the default merge)
    if (ret.merge !== "behind") gapNote += ` (the toned matte draws it inside the outline until its return ends on R${(ret.field.cells.find((c) => c.spec.hero)?.retStart ?? 0) + (ret.field.cells.find((c) => c.spec.hero)?.retT ?? 0)}: G1 judges that gap)`;
    else if (gap < 6 || gap > 8) out.push({ check: "blinkPlaced", level: "error", message: `${p.id} ${p.aspect}: the blink on R${R(planned).toFixed(1)} falls ${gap.toFixed(1)} frames after the kept card is hidden (R${hidden}): 6–8 (MONTAGE_DESIGN §2.7; retime the card's return in this aspect, RETURN_TIMING.returns.hero.byAspect)` });
  }
  out.push({ check: "blinkPlaced", level: "info", message: `${p.id} ${p.aspect}: clock offset ${offset}: blinks on ${starts.map((s) => `R${R(s).toFixed(1)}`).join(", ")}${gapNote}` });
  return out;
}

/* ---------------------------------------------------------------- joinPose ------------------------------------- */

export interface JoinMetrics {
  /** the first cell's edges against the frame's on the Return's first frame, px at 1080 (worst) */
  edgePx: number;
  /** the zoom's ratio to the frame-filling zoom */
  zoomRatio: number;
  /** the screen velocity's difference at the centre and corners, px a frame at 1080 (worst) */
  velPx: number;
  stones: number;
  firstCellIsS24: boolean;
  /** the shot the first cell draws, and S24's last shot (the view draws the first, so they must be one: RV-10) */
  firstCellShot: string | null;
  s24LastShot: string | null;
}

export function joinMetrics(p: ScenePlan): JoinMetrics | null {
  const ret = returnOf(p);
  const shot = p.shots.find((s) => s.returnField);
  if (!ret || !ret.join || !shot) return null;
  const field = ret.field;
  const { w, h, unit } = p.frame;
  const hero = field.cells.find((c) => c.spec.hero);
  const first = shot.camera.sample(0);
  // the first cell's rect on the Return's first frame
  let edgePx = Infinity;
  let zoomRatio = Infinity;
  if (hero) {
    const hp = cellPoseR(field, hero, rOfLocal(0, p.fps))!;
    const pp = planePose(first.pose, shot.ref, hp.depth);
    const q = { x: w / 2 + (hp.rect.x - pp.x) * pp.zoom, y: h / 2 + (hp.rect.y - pp.y) * pp.zoom, w: hp.rect.w * pp.zoom, h: hp.rect.h * pp.zoom };
    edgePx = Math.max(Math.abs(q.x), Math.abs(q.y), Math.abs(q.x + q.w - w), Math.abs(q.y + q.h - h)) / unit;
    zoomRatio = q.w / w;
  }
  // S24's exit and the Return's first frame: the content's screen velocity at the centre and the corners
  const join = ret.join;
  const sS: CamSample = { frame: 0, state: { x: join.exit.pose.x, y: join.exit.pose.y, lz: Math.log(join.exit.pose.zoom) }, vel: join.exit.vel, pose: join.exit.pose };
  let velPx = 0;
  for (const q of [
    { x: w / 2, y: h / 2 },
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ]) {
    const a = screenVelocity(sS, q, join.frame.w, join.frame.h);
    const b = screenVelocity(first, q, w, h, hero ? (cellPoseR(field, hero, -60)?.depth ?? 1) : 1);
    velPx = Math.max(velPx, Math.hypot((a.x * join.fps) / p.fps - b.x, (a.y * join.fps) / p.fps - b.y) / unit);
  }
  const firstCellShot = hero && hero.spec.standIn.kind === "frame" ? hero.spec.standIn.shot : null;
  const src = join.source;
  const s24LastShot = src ? (src.shots[src.shots.length - 1]?.id ?? null) : null;
  return {
    edgePx,
    zoomRatio,
    velPx,
    stones: join.stonesOnLastFrame,
    firstCellIsS24: !!hero && hero.spec.standIn.kind === "frame" && hero.spec.standIn.piece === join.from.replace(/:.*$/, "") && firstCellShot !== null && firstCellShot === s24LastShot,
    firstCellShot,
    s24LastShot,
  };
}

export function joinPose(p: ScenePlan): Finding[] {
  const ret = returnOf(p);
  if (!ret) return [];
  const name = `${p.id} ${p.aspect}`;
  if (!ret.join) return [{ check: "joinPose", level: "error", message: `${name}: the Return continues no S24 (plan it with the climax, planned into the Return): its first cell is S24's last frame (MONTAGE_DESIGN §2.12)` }];
  const m = joinMetrics(p)!;
  const out: Finding[] = [];
  const e = (message: string) => out.push({ check: "joinPose", level: "error", message: `${name}: ${message}` });
  if (!m.firstCellIsS24) e(`the first cell is not S24's last frame (${ret.join.from}): it draws the shot "${m.firstCellShot}", and S24's last shot is "${m.s24LastShot}" (the view would draw a missing frame: RV-10)`);
  if (!(m.edgePx <= 1)) e(`the first cell sits ${m.edgePx.toFixed(1)} px off the frame's edges on the Return's first frame (within 1 px: S24's last frame, exactly; a cut into a fresh field is not the join)`);
  if (!(Math.abs(m.zoomRatio - 1) <= 0.01)) e(`the first cell fills ${(m.zoomRatio * 100).toFixed(1)} % of the frame's width on the Return's first frame (within 1 %)`);
  if (!(m.velPx <= 0.5)) e(`the Return's first frame moves ${m.velPx.toFixed(2)} px a frame away from S24's exit velocity (within 0.5: the pull-back continues S24's glide)`);
  if (m.stones > 0) e(`S24's last frame shows ${m.stones} stone(s): the first cell would hold a second stone (one stone, CR-01)`);
  out.push({ check: "joinPose", level: "info", message: `${name}: the first cell's edges within ${m.edgePx.toFixed(2)} px of the frame's, zoom ×${m.zoomRatio.toFixed(4)}, velocity within ${m.velPx.toFixed(3)} px a frame of S24's exit; S24's last frame holds ${m.stones} stone(s)` });
  return out;
}

/* ---------------------------------------------------------------- all of them, and R2's exemption ------------ */

/** The Return's checks, by name (OVERRIDES §61 R2). */
export const RETURN_CHECKS = ["returnSchedule", "returnWindows", "returnContent", "returnMerge", "returnRadius", "cellText", "blinkPlaced", "joinPose"] as const;

/** Every Return check on a plan (none when the plan has no Return). */
/**
 * returnFirstCell (the R9 flash, 31 Oct; setpieces/returnFirstCell.ts): the first cell's worst-case content
 * (FIRST_CELL_MODEL), moved by the plan's camera and softened as the view draws it, through the verdict's own counter
 * (qa/flash-rgb.ts) in the aspect's binding windows: an error above 6 transitions in a second, a warning at 4. It covers
 * what returnWindows cannot: the content inside the first cell while it is still S24's frame pulling back.
 */
export function returnFirstCell(p: ScenePlan): Finding[] {
  const ret = returnOf(p);
  if (!ret || !ret.join) return [];
  const r = firstCellFlash(ret.field, p.aspect as "16:9" | "1:1" | "9:16");
  if (!r) return [];
  const name = `${p.id} ${p.aspect}`;
  const w = r.worst;
  const where = `${w.window}, ${w.pattern}${w.at !== null ? `, local frame ${w.at}` : ""}`;
  const peak = `softening at most σ ${r.peak.sigma.toFixed(1)} px and a veil of ${r.peak.veil.toFixed(2)}, the content at up to ${r.peak.v.toFixed(1)} px a frame, over ${r.frames} frames`;
  if (w.n > 6) return [{ check: "returnFirstCell", level: "error", message: `${name}: the first cell's worst-case content makes ${w.n} transitions in a second (${where}): WCAG 2.3.1 fails above 6 (${peak}); soften it by its speed (FIRST_CELL_SOFTEN) or slow the pull-back` }];
  if (w.n >= 4) return [{ check: "returnFirstCell", level: "warn", message: `${name}: the first cell's worst-case content makes ${w.n} transitions in a second (${where}): IRIS's warning level (${peak})` }];
  return [{ check: "returnFirstCell", level: "info", message: `${name}: the first cell's worst-case content makes at most ${w.n} transitions in a second (${where}; ${peak})` }];
}

export function returnChecks(p: ScenePlan): Finding[] {
  if (!returnOf(p)) return [];
  return [...returnSchedule(p), ...returnWindows(p), ...returnFirstCell(p), ...returnContent(p), ...returnMerge(p), ...returnRadius(p), ...cellText(p), ...blinkPlaced(p), ...joinPose(p)];
}

/** The checks R2 exempts the Return's span from. */
export const R2_EXEMPT = ["cutRate", "holds", "readingLoad"] as const;

/**
 * Lead ruling R2: the Return is a montage act, exempt from the act-wide cutRate, holds and readingLoad. Narrowly: the act
 * is the field's shot only ([span.from, span.to), local frames); cuts inside it leave the cut rate; lines and reads that
 * lie wholly inside it leave holds and the reading load; a shot wholly inside it leaves the UI-shot and reading rules.
 * Everything outside it, or straddling its edges, keeps every rule (and the film's word budget counts every line). The
 * report's other findings are untouched. A plan without a Return is returned as it came.
 */
export function exemptReturnSpan(p: ScenePlan, t: FilmTimelineQa, r: Report): Report {
  const ret = returnOf(p);
  if (!ret) return r;
  const { from, to } = ret.span;
  const inside = (a: number, b: number) => a >= from && b <= to;
  const acts = [...(from > 0 ? [{ id: `${p.id}:before`, from: 0, to: from }] : []), ...(to < t.durationInFrames ? [{ id: `${p.id}:after`, from: to, to: t.durationInFrames }] : [])];
  const t2: FilmTimelineQa = {
    ...t,
    acts: acts.length ? acts : [{ id: `${p.id}:none`, from: 0, to: 0 }],
    texts: t.texts.filter((x) => !inside(x.from, x.to)),
    shots: t.shots.filter((s) => !inside(s.from, s.to)),
    readables: (t.readables ?? []).filter((x) => !inside(x.from, x.to)),
  };
  const BUDGET = /^film lines carry /;
  const again = [...cutRate(t2).findings, ...holds(t2).filter((x) => !BUDGET.test(x.message)), ...holds(t).filter((x) => BUDGET.test(x.message)), ...readingLoads(t2).findings];
  const exempt = new Set<string>(R2_EXEMPT);
  const keep = (xs: readonly Finding[]) => xs.filter((x) => !exempt.has(x.check));
  const errors = [...keep(r.errors), ...again.filter((x) => x.level === "error")];
  return {
    ...r,
    ok: errors.length === 0,
    errors,
    warnings: [...keep(r.warnings), ...again.filter((x) => x.level === "warn")],
    infos: [...keep(r.infos), ...again.filter((x) => x.level === "info"), { check: "R2", level: "info", message: `${p.id} ${p.aspect}: the Return's span ${from}–${to} is a montage act: exempt from ${R2_EXEMPT.join(", ")} (lead ruling R2)` }],
  };
}

/** For the sheet: the body's radius along a direction (re-exported for tools); what a cell draws, measured. */
export { bodyR, drawnLumOf };
