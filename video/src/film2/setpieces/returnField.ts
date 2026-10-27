// THE RETURN'S FIELD (MONTAGE_DESIGN revision 2, §2.3, §2.6, §2.7; OVERRIDES §61 R1): the stone at the centre, three
// counter-rotating rings of cells around it (inner 8, middle 14, outer 24 slots), the cells' entries, swaps and returns,
// and the hairline orbits. Everything is a pure function of time, so the picture and the checks read one model.
//
// Frames. The field runs on R-frames at 60 fps: R0 is B2 1:36.53 (the release), R480 the J5 cut onto A4 bar 80 (the
// merge), R720 the title on A4 bar 82. The piece starts at R−60 (the lead-in: S24's last frame is the first cell), so a
// piece-local frame f at `fps` is R = f × 60 ⁄ fps − 60. World units are px at 1080 on the frame's short side at zoom 1
// (the plan's camera multiplies by the frame's `unit`); the stone sits at the world's origin.
//
//   RETURN_GEOMETRY   per aspect: the rings' semi-axes, the cells' long sides (4:3), S24's frame as the first cell, the
//                     stone's title size, its title pose, the flash windows (§2.6, §2.11)
//   buildReturnField  the schedule: every cell's ring, slot (the golden interleave), entry, swap, settle, leave and
//                     return (start, length), from RETURN_CELLS and RETURN_TIMING
//   cellPoseAt        a cell on a local frame: its world rect, parallax depth, draw order (z), blur (px at 1080), and
//                     whether the stone's silhouette leaves any of it visible. Opacity is always 1: a cell leaves only
//                     behind the stone (CR-08), or at a swap's crossing at mid-blur (CR-17)
//   hairlineAt        a ring's hairline orbit: drawn on in the release, returning into the stone after its last cell
// Pure; no React.
import type { Aspect } from "../tokens";
import { E_LEAVE, E_MOVE, clamp01 } from "../motion/ease";
import { planePose, type Pose, type VelocityCamera } from "../motion/camera";
import type { Point, Rect } from "../motion/geometry";
import { GALET, PEBBLE_SCALE, VIEWBOX_SIZE } from "../../../../shared/pebble/character";
import { RETURN_WAVES, type ReturnCellSpec, type ReturnRing, type ReturnWave } from "./returnCells";

/* ---------------------------------------------------------------- geometry (§2.6) ------------------------------ */

export interface ReturnGeometry {
  /** the frame at 1080 on its short side */
  W: number;
  H: number;
  /** the rings' semi-axes (x, y) at zoom 1: inner, middle, outer */
  ell: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  /** the cells' long side per ring (4:3 cells) */
  cell: readonly [number, number, number];
  /** the first cell (S24's last frame): the frame's own aspect, so at R−60 it fills the frame exactly */
  hero: { w: number; h: number };
  /** the stone's drawn size (px of the 220-unit viewBox) at zoom 1: its title size */
  stone: number;
  /** the title stone's pose, frame px at 1080 (setpieces/finale.ts LAYOUT) */
  title: Point;
  /** the flash analysis windows, px (R3 §1.7) */
  windows: readonly (readonly [number, number])[];
  /** the saturated-red area limit, a share of the frame (R3 §4.4) */
  redLimit: number;
}

/** Per aspect: chosen by the design's search for the largest cells whose rings never overlap at any angle (§2.6). */
export const RETURN_GEOMETRY: Readonly<Record<Aspect, ReturnGeometry>> = {
  "16:9": {
    W: 1920,
    H: 1080,
    ell: [
      [330, 206],
      [568, 355],
      [768, 480],
    ],
    cell: [144, 120, 96],
    hero: { w: 161, h: (161 * 1080) / 1920 },
    stone: 190,
    title: { x: 660, y: 291.6 },
    windows: [
      [300, 300],
      [256, 192],
    ],
    redLimit: 0.005,
  },
  "1:1": {
    W: 1080,
    H: 1080,
    ell: [
      [215, 215],
      [358, 358],
      [477, 477],
    ],
    cell: [116, 96, 78],
    hero: { w: 101, h: 101 },
    stone: 170,
    title: { x: 310, y: 194.4 },
    windows: [
      [300, 300],
      [256, 192],
    ],
    redLimit: 0.01,
  },
  "9:16": {
    W: 1080,
    H: 1920,
    ell: [
      [206, 330],
      [352, 564],
      [473, 757],
    ],
    cell: [128, 106, 86],
    hero: { w: (143 * 1080) / 1920, h: 143 },
    stone: 190,
    title: { x: 330, y: 460.8 },
    windows: [[400, 400]],
    redLimit: 0.018,
  },
};

export const RETURN_SLOTS = [8, 14, 24] as const;
/** The golden interleave's stride per ring: item i goes to slot (i × stride) mod n, so the field changes everywhere at once. */
export const RETURN_GOLD: Readonly<Record<number, number>> = { 8: 3, 14: 5, 24: 7 };
/** Slot 0's parametric angle per ring, degrees (12 o'clock is −90; the rings offset so no two line up). */
export const RETURN_START = [-90, -90 + 360 / 28, -90 + 360 / 48] as const;
/** The orbits at full speed, degrees a second (the middle ring counter-rotates; F03). */
export const RETURN_OMEGA = [5, -7, 7] as const;
/** Parallax depth per ring (the outer ring nearest), flattening to 1 as a cell returns. */
export const RETURN_DEPTH = [1, 1.025, 1.06] as const;

/* ---------------------------------------------------------------- timing (§2.3, §2.7) --------------------------- */

export interface ReturnTiming {
  /** R-frames */
  span: { from: number; to: number };
  /** an entry: a 40-frame inward spiral from 1.7× its slot's radius, 25° behind it (E-move) */
  entryFrames: number;
  entryOut: number;
  entryBehindDeg: number;
  /** a swap: 8 frames out and 8 in, crossing at mid-blur (CR-17); a slide swap travels 36 px along the ring */
  swapFrames: number;
  swapBlurPx: number;
  slidePx: number;
  waves: Record<Exclude<ReturnWave, "inner">, { t0: number; dt: number }>;
  /** the returns: each ring's first start, the step between its cells, the length; the kept card last */
  returns: { outer: { s0: number; ds: number; T: number }; middle: { s0: number; ds: number; T: number }; inner: { s0: number; ds: number; T: number }; hero: { s0: number; T: number } };
  /** a cell's long side at first contact and when centred behind the stone, × the body's width */
  wContact: number;
  wEnd: number;
  /** the share of a return over which the orbit's angular velocity decays to zero (the curl, F19) */
  curlShare: number;
  /** the hairlines: drawn on from R0 over 30 frames; each returns over 40 frames once its ring's last cell has left */
  hairlineOn: { at: number; frames: number };
  hairlineReturnFrames: number;
  /** the orbits run at half speed until R120 and reach full speed by R300 (E-move) */
  orbitRamp: { from: number; frames: number };
}

export const RETURN_TIMING: ReturnTiming = {
  span: { from: -60, to: 720 },
  entryFrames: 40,
  entryOut: 0.7,
  entryBehindDeg: 25,
  swapFrames: 16,
  swapBlurPx: 8,
  slidePx: 36,
  waves: {
    mid1: { t0: 120, dt: 7 },
    mid2: { t0: 240, dt: 7 },
    // 3 frames off the outer ring's 6-frame grid, so no two swaps cross within 2 frames
    mid3: { t0: 366, dt: 12 },
    out1: { t0: 150, dt: 7.5 },
    out2: { t0: 321, dt: 6 },
  },
  returns: { outer: { s0: 430, ds: 3.3, T: 72 }, middle: { s0: 494, ds: 3.4, T: 78 }, inner: { s0: 540, ds: 4.2, T: 74 }, hero: { s0: 566, T: 92 } },
  wContact: 0.75,
  wEnd: 0.55,
  curlShare: 0.4,
  hairlineOn: { at: 0, frames: 30 },
  hairlineReturnFrames: 40,
  orbitRamp: { from: 120, frames: 180 },
};

/* ---------------------------------------------------------------- the stone's silhouette ----------------------- */

/** The body's radius (px) along direction `phi` (screen axes, y down) for a stone drawn `stonePx` wide: the engine's galet. */
export function bodyR(phi: number, stonePx: number): number {
  const n = GALET.length;
  let a = phi % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  const x = (a / (2 * Math.PI)) * n;
  const i = Math.floor(x) % n;
  const j = (i + 1) % n;
  const f = x - Math.floor(x);
  return (GALET[i]! * (1 - f) + GALET[j]! * f) * PEBBLE_SCALE * (stonePx / VIEWBOX_SIZE);
}

/** The body's least and greatest radius and its mean width (2 × the mean radius), px. */
export function bodyStats(stonePx: number): { min: number; max: number; width: number } {
  let min = Infinity;
  let max = 0;
  let sum = 0;
  for (let k = 0; k < 720; k++) {
    const r = bodyR((2 * Math.PI * k) / 720, stonePx);
    min = Math.min(min, r);
    max = Math.max(max, r);
    sum += r;
  }
  return { min, max, width: (2 * sum) / 720 };
}

/** Does a rect (world px, the stone at the origin) touch the body? */
export function rectTouchesBody(x0: number, y0: number, x1: number, y1: number, stonePx: number): boolean {
  const qx = Math.min(Math.max(0, x0), x1);
  const qy = Math.min(Math.max(0, y0), y1);
  if (qx === 0 && qy === 0 && x0 <= 0 && 0 <= x1 && y0 <= 0 && 0 <= y1) return true;
  return Math.hypot(qx, qy) < bodyR(Math.atan2(qy, qx), stonePx);
}

const rectHidden = (x0: number, y0: number, x1: number, y1: number, stonePx: number): boolean => {
  for (const [cx, cy] of [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ] as const)
    if (Math.hypot(cx, cy) > bodyR(Math.atan2(cy, cx), stonePx)) return false;
  return true;
};

/** The share of a rect (world px, the stone at the origin) the opaque body, drawn above every cell, leaves visible. */
export function visibleFraction(x0: number, y0: number, x1: number, y1: number, stonePx: number): number {
  if (!rectTouchesBody(x0, y0, x1, y1, stonePx)) return 1;
  if (rectHidden(x0, y0, x1, y1, stonePx)) return 0;
  let n = 0;
  let out = 0;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 6; j++) {
      const px = x0 + ((x1 - x0) * (i + 0.5)) / 8;
      const py = y0 + ((y1 - y0) * (j + 0.5)) / 6;
      n++;
      if (Math.hypot(px, py) > bodyR(Math.atan2(py, px), stonePx)) out++;
    }
  return out / n;
}

/* ---------------------------------------------------------------- the field ----------------------------------- */

export type CellKind = "inner" | "entry" | "blur" | "slide";

/** A cell on the field: its spec and its schedule (R-frames). */
export interface FieldCell {
  spec: ReturnCellSpec;
  id: string;
  ring: ReturnRing;
  slot: number;
  wave: ReturnWave;
  kind: CellKind;
  /** an entry's first frame (null: present from the start, or swapped in) */
  enter: number | null;
  /** settled on its slot from this frame */
  settle: number;
  /** a swap's first frame (it is drawn from its crossing, swapIn + swapFrames ÷ 2) */
  swapIn: number | null;
  /** swapped out: the successor's swapIn, and the frame it is gone (the crossing) */
  swappedOutAt: number | null;
  leave: number | null;
  /** its return into the stone (null when it is swapped out first) */
  retStart: number | null;
  retT: number | null;
  /** the world size on its ring */
  w0: number;
  h0: number;
  /** the slide swap's direction along the ring's travel (+1 or −1), 0 for a blur swap */
  slideSign: number;
  /** the stacking order among the cells (the stone is drawn above every cell) */
  zOrder: number;
  /** its polar state at the return's start and its real angular velocity there (rad a second), per field */
  ret?: { rho: number; phi: number; wReal: number; phiSum: Float64Array };
}

export interface ReturnFieldOptions {
  /** the stone's drawn size at zoom 1 (default the aspect's title size; the plan passes the title stone's size at the landing) */
  stonePx?: number;
  timing?: Partial<ReturnTiming>;
  geometry?: Partial<ReturnGeometry>;
  /** the manifest (default RETURN_CELLS by wave): canaries pass their own */
  waves?: Readonly<Record<ReturnWave, readonly ReturnCellSpec[]>>;
  /** hold the inner ring still through the lead-in and start its orbit at R0 (the plan: S24's frame is a still at the join) */
  holdInner?: boolean;
  /** parallax depths per ring (default RETURN_DEPTH; the reference model ignores parallax: [1, 1, 1]) */
  depth?: readonly [number, number, number];
  /** canaries only: an extra turn during the return (deg, signed; the design has none), a fade, the old size law */
  twistDeg?: readonly [number, number, number];
  fade?: { from: number; to: number };
  sizeLaw?: "contact" | "radius";
  /** canaries only: the slot stride per ring (default the golden interleave) */
  stride?: Readonly<Record<number, number>>;
}

export interface ReturnField {
  aspect: Aspect;
  geometry: ReturnGeometry;
  timing: ReturnTiming;
  cells: readonly FieldCell[];
  /** the stone at the world's origin: its drawn size and its body */
  stone: { at: Point; px: number; body: { min: number; max: number; width: number } };
  options: ReturnFieldOptions;
  depth: readonly [number, number, number];
  /** the cumulative orbit angle per ring (degrees) on every R-frame of the span */
  theta: readonly Float64Array[];
  /** the piece's frame rate (local frames ↔ R-frames) */
  fps: number;
  /** what the camera adds (the plan sets it): the camera, its parallax ref and the frame, for screen speeds and blur */
  view?: { camera: VelocityCamera; ref: Pose; w: number; h: number; unit: number };
}

/** A piece-local frame as an R-frame, and back. */
export const rOfLocal = (local: number, fps: number, lead = 60): number => (local * 60) / fps - lead;
export const localOfR = (r: number, fps: number, lead = 60): number => ((r + lead) * fps) / 60;

/** The golden order of a ring's slots. */
export const slotOrder = (n: number, stride?: number, k = n): number[] => {
  const g = stride ?? RETURN_GOLD[n]!;
  return Array.from({ length: k }, (_, i) => (i * g) % n);
};

/** The orbit's angular speed (deg a second) on an R-frame: half until the gather, full by R300, never changing sign. */
export const omegaOf = (field: Pick<ReturnField, "timing" | "options">, ring: number, r: number): number => {
  const t = field.timing.orbitRamp;
  let k = 0.5 + 0.5 * E_MOVE((r - t.from) / t.frames);
  if (ring === 0 && field.options.holdInner) k *= E_MOVE(clamp01(r / 60));
  return RETURN_OMEGA[ring]! * k;
};

/** The ring's cumulative orbit angle (deg) on an R-frame (fractional frames interpolate). */
export const thetaAt = (field: ReturnField, ring: number, r: number): number => {
  const th = field.theta[ring]!;
  const x = r - field.timing.span.from;
  if (x <= 0) return th[0]! + (omegaOf(field, ring, field.timing.span.from) / 60) * x;
  const i = Math.floor(x);
  if (i >= th.length - 1) return th[th.length - 1]! + (omegaOf(field, ring, field.timing.span.to) / 60) * (x - (th.length - 1));
  return th[i]! + (th[i + 1]! - th[i]!) * (x - i);
};

/** A slot's centre on its ring (world px) on an R-frame. */
export function slotXY(field: ReturnField, ring: number, slot: number, r: number): Point {
  const [a, b] = field.geometry.ell[ring]!;
  const t = ((RETURN_START[ring]! + (360 * slot) / RETURN_SLOTS[ring]! + thetaAt(field, ring, r)) * Math.PI) / 180;
  return { x: a * Math.cos(t), y: b * Math.sin(t) };
}

/** Builds the field: the cells on their slots, every entry, swap, leave and return. */
export function buildReturnField(aspect: Aspect, o: ReturnFieldOptions = {}, fps = 60): ReturnField {
  const geometry: ReturnGeometry = { ...RETURN_GEOMETRY[aspect], ...(o.geometry ?? {}) };
  const timing: ReturnTiming = { ...RETURN_TIMING, ...(o.timing ?? {}) };
  const waves = o.waves ?? RETURN_WAVES;
  const stride = o.stride ?? RETURN_GOLD;
  const stonePx = o.stonePx ?? geometry.stone;
  const depth = o.depth ?? RETURN_DEPTH;
  const T = timing;
  const cells: FieldCell[] = [];
  const size = (ring: number, spec: ReturnCellSpec) => (spec.hero ? { w: geometry.hero.w, h: geometry.hero.h } : { w: geometry.cell[ring]!, h: 0.75 * geometry.cell[ring]! });
  const mk = (spec: ReturnCellSpec, ring: ReturnRing, slot: number, kind: CellKind, enter: number | null, settle: number, swapIn: number | null): FieldCell => {
    const s = size(ring, spec);
    return { spec, id: spec.id, ring, slot, wave: spec.wave, kind, enter, settle, swapIn, swappedOutAt: null, leave: null, retStart: null, retT: null, w0: s.w, h0: s.h, slideSign: kind === "slide" ? Math.sign(RETURN_OMEGA[ring]!) : 0, zOrder: 0 };
  };
  waves.inner.forEach((spec, i) => cells.push(mk(spec, 0, i, "inner", null, T.span.from, null)));
  const m1 = slotOrder(14, stride[14]);
  waves.mid1.forEach((spec, i) => {
    const e = T.waves.mid1.t0 + T.waves.mid1.dt * i;
    cells.push(mk(spec, 1, m1[i]!, "entry", e, e + T.entryFrames, null));
  });
  // M2 swaps the slots of M1's items 1–12, in entry order
  waves.mid2.forEach((spec, i) => {
    const t = T.waves.mid2.t0 + T.waves.mid2.dt * i;
    cells.push(mk(spec, 1, m1[i + 1]!, "blur", null, t + T.swapFrames, t));
  });
  // M3: N2's slot (M1's last), then the first seven M2 slots
  const m3 = [m1[13]!, ...Array.from({ length: 7 }, (_, k) => m1[1 + k]!)];
  waves.mid3.forEach((spec, i) => {
    const t = T.waves.mid3.t0 + T.waves.mid3.dt * i;
    cells.push(mk(spec, 1, m3[i]!, "slide", null, t + T.swapFrames, t));
  });
  const o1 = slotOrder(24, stride[24]);
  waves.out1.forEach((spec, i) => {
    const e = T.waves.out1.t0 + T.waves.out1.dt * i;
    cells.push(mk(spec, 2, o1[i]!, "entry", e, e + T.entryFrames, null));
  });
  // O2 swaps O1's items 0–19 except F9's (item 3): a red cell is never swapped out
  const o2idx = [0, 1, 2, ...Array.from({ length: 16 }, (_, k) => 4 + k)];
  waves.out2.forEach((spec, i) => {
    const t = T.waves.out2.t0 + T.waves.out2.dt * i;
    cells.push(mk(spec, 2, o1[o2idx[i]!]!, "slide", null, t + T.swapFrames, t));
  });
  // occupancy: each cell leaves at its successor's crossing, or stays to return
  const bySlot = new Map<string, FieldCell[]>();
  for (const c of cells) bySlot.set(`${c.ring}:${c.slot}`, [...(bySlot.get(`${c.ring}:${c.slot}`) ?? []), c]);
  for (const occ of bySlot.values()) {
    occ.sort((a, b) => a.settle - b.settle);
    for (let k = 0; k + 1 < occ.length; k++) {
      occ[k]!.leave = occ[k + 1]!.swapIn! + T.swapFrames / 2;
      occ[k]!.swappedOutAt = occ[k + 1]!.swapIn;
    }
  }
  // the merge: per ring, outer first, in the order they settled, then in golden order; the kept card last
  const stay = cells.filter((c) => c.leave === null);
  for (const [name, ring] of [
    ["outer", 2],
    ["middle", 1],
    ["inner", 0],
  ] as const) {
    const gord = new Map(slotOrder(RETURN_SLOTS[ring]!, stride[RETURN_SLOTS[ring]!]).map((s, k) => [s, k]));
    const group = stay.filter((c) => c.ring === ring && !c.spec.hero).sort((a, b) => a.settle - b.settle || gord.get(a.slot)! - gord.get(b.slot)!);
    const R = T.returns[name];
    group.forEach((c, j) => {
      c.retStart = R.s0 + R.ds * j;
      c.retT = R.T;
    });
  }
  for (const c of cells)
    if (c.spec.hero) {
      c.retStart = T.returns.hero.s0;
      c.retT = T.returns.hero.T;
    }
  // the draw order: the outer ring nearest, later arrivals above earlier ones in a ring, the kept card above its ring
  cells.forEach((c) => (c.zOrder = c.ring * 1000 + (c.spec.hero ? 999 : Math.round(c.settle - T.span.from))));

  const theta: Float64Array[] = [];
  const field: ReturnField = { aspect, geometry, timing: T, cells, stone: { at: { x: 0, y: 0 }, px: stonePx, body: bodyStats(stonePx) }, options: o, depth, theta, fps };
  for (let ring = 0; ring < 3; ring++) {
    const n = T.span.to - T.span.from + 1;
    const th = new Float64Array(n);
    let acc = 0;
    for (let k = 0; k < n; k++) {
      th[k] = acc;
      acc += omegaOf(field, ring, T.span.from + k) / 60;
    }
    theta.push(th);
  }
  // each returning cell's polar state at its start, its angular velocity (continuous with the orbit), and the curl's sum
  for (const c of cells) {
    if (c.retStart === null) continue;
    const s = c.retStart;
    const p = slotXY(field, c.ring, c.slot, s);
    const rho = Math.hypot(p.x, p.y);
    const [a, b] = geometry.ell[c.ring]!;
    const wReal = ((omegaOf(field, c.ring, s) * Math.PI) / 180) * ((a * b) / (rho * rho));
    const Tn = c.retT!;
    const phiSum = new Float64Array(Math.ceil(Tn) + 2);
    for (let k = 0; k + 1 < phiSum.length; k++) phiSum[k + 1] = phiSum[k]! + (wReal * (1 - E_MOVE(k / (T.curlShare * Tn)))) / 60;
    c.ret = { rho, phi: Math.atan2(p.y, p.x), wReal, phiSum };
  }
  return field;
}

/* ---------------------------------------------------------------- a cell on a frame ---------------------------- */

export type CellState = "entry" | "settled" | "swapIn" | "swapOut" | "return";

/** A cell's pose on an R-frame, before the camera: world rect, state, opacity, depth, the swap's blur (px at 1080). */
export interface CellPoseR {
  cell: FieldCell;
  rect: Rect;
  /** the centre, world px */
  c: Point;
  state: CellState;
  depth: number;
  /** the swap's own blur, px at 1080 (motion blur is added by cellPoseAt where the camera is known) */
  swapBlur: number;
  /** 1 in the design: a cell leaves behind the stone, never by a fade */
  opacity: number;
  /** the return's progress, 0–1 (only while returning) */
  u?: number;
}

const DEG = Math.PI / 180;

/** The cell on an R-frame, or null when it is not drawn (before it enters or crosses in, after it leaves or has returned). */
export function cellPoseR(field: ReturnField, c: FieldCell, r: number): CellPoseR | null {
  const T = field.timing;
  const o = field.options;
  if (c.enter !== null && r < c.enter) return null;
  if (c.swapIn !== null && r < c.swapIn + T.swapFrames / 2) return null;
  if (c.leave !== null && r >= c.leave) return null;
  const d0 = field.depth[c.ring]!;
  const rect = (x: number, y: number, w: number, h: number): Rect => ({ x: x - w / 2, y: y - h / 2, w, h });
  // the return: along its own radius, the curl decaying to zero, the size decoupled from the radius (§2.7)
  if (c.retStart !== null && r >= c.retStart && c.ret) {
    const Tn = c.retT!;
    const u = (r - c.retStart) / Tn;
    if (u > 1) return null;
    const R = c.ret;
    const t = r - c.retStart;
    const k = Math.floor(t);
    const dphi = R.phiSum[k]! + (R.phiSum[k + 1]! - R.phiSum[k]!) * (t - k);
    const twist = o.twistDeg ? o.twistDeg[c.ring]! * DEG * E_MOVE(u) : 0;
    const phi = R.phi + dphi + twist;
    const rho = R.rho * (1 - E_MOVE(u));
    const L0 = Math.max(c.w0, c.h0);
    const bw = field.stone.body.width;
    let Ls: number;
    if (o.sizeLaw === "radius") Ls = L0 * Math.max(0.02, rho / R.rho);
    else {
      const Lc = T.wContact * bw;
      const Le = T.wEnd * bw;
      const hc = (Math.abs(Math.cos(phi)) * ((Lc * c.w0) / L0)) / 2 + (Math.abs(Math.sin(phi)) * ((Lc * c.h0) / L0)) / 2;
      const dc = bodyR(phi, field.stone.px) + hc;
      Ls = rho >= dc ? Lc + ((L0 - Lc) * (rho - dc)) / Math.max(1e-6, R.rho - dc) : Le + ((Lc - Le) * rho) / dc;
    }
    const w = (Ls * c.w0) / L0;
    const h = (Ls * c.h0) / L0;
    const x = rho * Math.cos(phi);
    const y = rho * Math.sin(phi);
    const opacity = o.fade ? 1 - clamp01((u - o.fade.from) / (o.fade.to - o.fade.from)) : 1;
    return { cell: c, rect: rect(x, y, w, h), c: { x, y }, state: "return", depth: d0 + (1 - d0) * E_MOVE(clamp01(u / 0.5)), swapBlur: 0, opacity, u };
  }
  const p = slotXY(field, c.ring, c.slot, r);
  // an entry: a spiral in from 1.7× its slot's radius, 25° behind it
  if (c.enter !== null && r < c.enter + T.entryFrames) {
    const k = E_MOVE((r - c.enter) / T.entryFrames);
    const rho = Math.hypot(p.x, p.y) * (1 + T.entryOut * (1 - k));
    const phi = Math.atan2(p.y, p.x) - Math.sign(RETURN_OMEGA[c.ring]!) * T.entryBehindDeg * DEG * (1 - k);
    const x = rho * Math.cos(phi);
    const y = rho * Math.sin(phi);
    return { cell: c, rect: rect(x, y, c.w0, c.h0), c: { x, y }, state: "entry", depth: d0, swapBlur: 0, opacity: 1 };
  }
  // a swap: the outgoing blurs up over 8 frames (and slides on), the incoming arrives at mid-blur and settles (CR-17)
  let state: CellState = "settled";
  let blur = 0;
  let slide = 0;
  if (c.swapIn !== null && r < c.swapIn + T.swapFrames) {
    const e = E_MOVE((r - c.swapIn - T.swapFrames / 2) / (T.swapFrames / 2));
    state = "swapIn";
    blur = T.swapBlurPx * (1 - e);
    slide = -(T.slidePx / 2) * (1 - e);
  } else if (c.swappedOutAt !== null && r >= c.swappedOutAt) {
    const e = E_MOVE((r - c.swappedOutAt) / (T.swapFrames / 2));
    state = "swapOut";
    blur = T.swapBlurPx * e;
    slide = (T.slidePx / 2) * e;
  }
  let x = p.x;
  let y = p.y;
  if (slide !== 0 && c.slideSign !== 0) {
    // along the ring's travel: the tangent of the ellipse at the slot, in the orbit's direction
    const [a, b] = field.geometry.ell[c.ring]!;
    const t = (RETURN_START[c.ring]! + (360 * c.slot) / RETURN_SLOTS[c.ring]! + thetaAt(field, c.ring, r)) * DEG;
    const tx = -a * Math.sin(t);
    const ty = b * Math.cos(t);
    const n = Math.hypot(tx, ty) || 1;
    x += (c.slideSign * slide * tx) / n;
    y += (c.slideSign * slide * ty) / n;
  }
  return { cell: c, rect: rect(x, y, c.w0, c.h0), c: { x, y }, state, depth: d0, swapBlur: blur, opacity: 1 };
}

/** What cellPoseAt returns: what the view draws, and what the checks read. */
export interface CellPose {
  id: string;
  /** world rect (the plane's rect at its depth) */
  rect: Rect;
  depth: number;
  /** the draw order among the cells (higher on top); the stone is drawn above every cell */
  z: number;
  /** blur, px at 1080: the swap's, or the motion's (σ = travel ÷ 7 above 4.6 px a frame), whichever is larger */
  blurPx: number;
  /** some of it is drawn: present and not wholly behind the stone */
  visible: boolean;
  /** the share of it the stone leaves visible */
  share: number;
  opacity: number;
  state: CellState;
}

/** The screen centre (px at 1080) of a world point at a depth under the plan's camera on a local frame. */
const screenAt = (field: ReturnField, local: number, p: Point, depth: number): Point => {
  const v = field.view!;
  const pose = planePose(v.camera.pose(local), v.ref, depth);
  return { x: (v.w / 2 + (p.x - pose.x) * pose.zoom) / v.unit, y: (v.h / 2 + (p.y - pose.y) * pose.zoom) / v.unit };
};

/**
 * A cell on a piece-local frame (MONTAGE_DESIGN §6): { rect, depth, z, blurPx, visible }, with opacity always 1 and
 * visibility from occlusion by the stone's silhouette. Null when the cell is not on the field on that frame.
 */
export function cellPoseAt(cell: FieldCell, frame: number, field: ReturnField): CellPose | null {
  const r = rOfLocal(frame, field.fps);
  const p = cellPoseR(field, cell, r);
  if (!p) return null;
  const q = p.rect;
  const share = visibleFraction(q.x, q.y, q.x + q.w, q.y + q.h, field.stone.px);
  let blur = p.swapBlur;
  if (field.view) {
    // the cell's own screen speed over a frame (its motion and the camera's), σ = travel ÷ 7 above the reading speed
    const a = cellPoseR(field, cell, rOfLocal(frame - 0.5, field.fps));
    const b = cellPoseR(field, cell, rOfLocal(frame + 0.5, field.fps));
    if (a && b) {
      const sa = screenAt(field, frame - 0.5, a.c, a.depth);
      const sb = screenAt(field, frame + 0.5, b.c, b.depth);
      const travel = Math.hypot(sb.x - sa.x, sb.y - sa.y);
      if (travel > 4.6) blur = Math.max(blur, travel / 7);
    }
  }
  return { id: cell.id, rect: q, depth: p.depth, z: cell.zOrder, blurPx: blur, visible: share > 0 && p.opacity > 0, share, opacity: p.opacity, state: p.state };
}

/* ---------------------------------------------------------------- the hairlines --------------------------------- */

export interface HairlinePose {
  ring: number;
  /** semi-axes, world px (shrinking to the stone as the ring returns) */
  a: number;
  b: number;
  /** the share of the ellipse drawn (it draws on in the release) */
  drawn: number;
  /** 1 while it shows; it is gone before it reaches the stone */
  opacity: number;
  depth: number;
  /** its stroke, px at 1080 */
  widthPx: number;
}

/** The R-frame each ring's hairline starts its return: its last cell's return start. */
export const hairlineReturnStart = (field: ReturnField, ring: number): number => Math.max(...field.cells.filter((c) => c.ring === ring && c.retStart !== null).map((c) => c.retStart!));

/**
 * A ring's hairline orbit (1.5–2 px in sage #506E54 along its ellipse): drawn on over 30 frames from R0; once its last
 * cell has started home it returns into the stone on E-leave over 40 frames (the carrier's own return), gone before
 * contact. Null when not drawn.
 */
export function hairlineAt(ring: number, frame: number, field: ReturnField): HairlinePose | null {
  const r = rOfLocal(frame, field.fps);
  const T = field.timing;
  if (r < T.hairlineOn.at) return null;
  const [a0, b0] = field.geometry.ell[ring]!;
  const s = hairlineReturnStart(field, ring);
  const drawn = E_MOVE(clamp01((r - T.hairlineOn.at) / T.hairlineOn.frames));
  if (r < s) return { ring, a: a0, b: b0, drawn, opacity: 1, depth: field.depth[ring]!, widthPx: 1.75 };
  const u = (r - s) / T.hairlineReturnFrames;
  if (u >= 1) return null;
  const e = E_LEAVE(u);
  const k = 1 - e;
  const inner = field.stone.body.max * 1.1;
  // gone before contact: it fades over the last fifth of its travel, while still outside the stone
  const d0 = field.depth[ring]!;
  return { ring, a: inner + (a0 - inner) * k, b: inner + (b0 - inner) * k, drawn: 1, opacity: 1 - clamp01((u - 0.8) / 0.2), depth: d0 + (1 - d0) * E_MOVE(clamp01(u / 0.5)), widthPx: 1.75 };
}

