// Eases with their derivatives, so every move can report its velocity (TREATMENT §5.5 rule 1: continuous velocity).
//
// - cubicBezier(): the film's three curves (E-arrive, E-leave, E-move) and the text match cut's, with exact slopes.
// - GSAP's named eases ("power3.inOut", "expo.out", "sine.inOut", ...) re-implemented from GSAP 3's own formulas, so the
//   validators can evaluate a GSAP choreography's speed profile without a browser. tests/ease.test.ts checks them
//   against gsap.parseEase() once gsap is installed.
// - glide: the coast after an arrival, v(t) = v_d + (v0 − v_d)·e^(−t/τ) (CRAFT §3), and its position.
//
// Pure functions; t is progress 0..1 unless it says frames.
import { BEZIER } from "../tokens";

export interface Curve {
  /** eased progress for linear progress t in [0, 1] (clamped outside) */
  (t: number): number;
  /** d(eased)/dt: the speed as a multiple of the move's mean speed */
  slope: (t: number) => number;
  name: string;
  /** speed at the start and at the end, as a multiple of the mean */
  v0: number;
  v1: number;
}

const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);

/** A CSS-style cubic-bezier(x1, y1, x2, y2) with an exact slope. x1 and x2 must lie in [0, 1]. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, name = `bezier(${x1},${y1},${x2},${y2})`): Curve {
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) throw new RangeError(`${name}: x1 and x2 must lie in [0, 1]`);
  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  const dbx = (s: number) => 3 * (1 - s) * (1 - s) * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s * s * (1 - x2);
  const dby = (s: number) => 3 * (1 - s) * (1 - s) * y1 + 6 * (1 - s) * s * (y2 - y1) + 3 * s * s * (1 - y2);
  // s for a given x: Newton from a linear guess, guarded by bisection (bx is monotonic for x1, x2 in [0, 1]).
  const solve = (x: number): number => {
    let lo = 0;
    let hi = 1;
    let s = x;
    for (let i = 0; i < 12; i++) {
      const err = bx(s) - x;
      if (Math.abs(err) < 1e-9) return s;
      if (err > 0) hi = s;
      else lo = s;
      const d = dbx(s);
      const next = d > 1e-9 ? s - err / d : (lo + hi) / 2;
      s = next <= lo || next >= hi ? (lo + hi) / 2 : next;
    }
    for (let i = 0; i < 40 && hi - lo > 1e-10; i++) {
      s = (lo + hi) / 2;
      if (bx(s) > x) hi = s;
      else lo = s;
    }
    return (lo + hi) / 2;
  };
  const curve = ((t: number) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    return by(solve(x));
  }) as Curve;
  curve.slope = (t: number) => {
    const x = clamp01(t);
    const s = x === 0 ? 0 : x === 1 ? 1 : solve(x);
    const dx = dbx(s);
    if (dx < 1e-9) {
      // vertical tangent in x (x1 = 0 at s = 0, or x2 = 1 at s = 1): the slope is dy/dx in the limit
      const ds = s < 0.5 ? 1e-4 : -1e-4;
      return (by(s + ds) - by(s)) / (bx(s + ds) - bx(s));
    }
    return dby(s) / dx;
  };
  Object.defineProperty(curve, "name", { value: name }); // a function's own name is read-only; redefine it
  curve.v0 = x1 > 0 ? y1 / x1 : Infinity;
  curve.v1 = x2 < 1 ? (1 - y2) / (1 - x2) : Infinity;
  return curve;
}

/** E-arrive (0.16, 1, 0.3, 1): starts at 6.25× the mean speed and lands at rest. */
export const E_ARRIVE = cubicBezier(...BEZIER.arrive, "E-arrive");
/** E-leave (0.3, 0, 0.8, 0.15): starts at rest and leaves at 4.25× the mean speed. */
export const E_LEAVE = cubicBezier(...BEZIER.leave, "E-leave");
/** E-move (0.45, 0, 0.55, 1): rest to rest, peak 1.82× the mean at the middle. */
export const E_MOVE = cubicBezier(...BEZIER.move, "E-move");
/** The text match cut's curve (0.85, 0, 0.15, 1): peak speed at the middle, where the cut falls. */
export const E_MATCH = cubicBezier(...BEZIER.match, "E-match");

/* ---------------------------------------------------------------- GSAP's named eases -------------------------- */

const fromFormula = (name: string, f: (t: number) => number, v0: number, v1: number): Curve => {
  const c = ((t: number) => {
    const x = clamp01(t);
    return x === 0 || x === 1 ? x : f(x);
  }) as Curve;
  c.slope = (t: number) => {
    const x = clamp01(t);
    const h = 1e-5;
    const a = Math.max(0, x - h);
    const b = Math.min(1, x + h);
    return (f(b) - f(a)) / (b - a);
  };
  Object.defineProperty(c, "name", { value: name });
  c.v0 = v0;
  c.v1 = v1;
  return c;
};

/** GSAP's powerN.in is t^(N+1) (power1 = quad ... power4 = quint); .out and .inOut are built from it as GSAP does. */
const powerIn = (n: number) => (t: number) => t ** (n + 1);
const outOf = (fin: (t: number) => number) => (t: number) => 1 - fin(1 - t);
const inOutOf = (fin: (t: number) => number) => (t: number) => (t < 0.5 ? fin(t * 2) / 2 : 1 - fin((1 - t) * 2) / 2);
/**
 * GSAP 3.15's Expo in(p) = 2^(10(p−1))·p + p⁶(1 − p): a blend that lands exactly on 0 and 1 (gsap-core.js; earlier
 * GSAP used 2^(10(p−1)) alone). Its end slope is still 10·ln 2.
 */
const expoIn = (t: number) => 2 ** (10 * (t - 1)) * t + t ** 6 * (1 - t);
/** GSAP: Sine in(p) = 1 − cos(p·π/2) (its out is sin(p·π/2) and its inOut −(cos(π·p) − 1)/2, the same curves). */
const sineIn = (t: number) => 1 - Math.cos((t * Math.PI) / 2);

const named: Record<string, Curve> = { none: fromFormula("none", (t) => t, 1, 1), linear: fromFormula("linear", (t) => t, 1, 1) };
for (let n = 1; n <= 4; n++) {
  const fin = powerIn(n);
  const k = n + 1;
  named[`power${n}.in`] = fromFormula(`power${n}.in`, fin, 0, k);
  named[`power${n}.out`] = fromFormula(`power${n}.out`, outOf(fin), k, 0);
  named[`power${n}.inOut`] = fromFormula(`power${n}.inOut`, inOutOf(fin), 0, 0);
}
named["expo.in"] = fromFormula("expo.in", expoIn, 0, 10 * Math.LN2);
named["expo.out"] = fromFormula("expo.out", outOf(expoIn), 10 * Math.LN2, 0);
named["expo.inOut"] = fromFormula("expo.inOut", inOutOf(expoIn), 0, 0);
named["sine.in"] = fromFormula("sine.in", sineIn, 0, Math.PI / 2);
named["sine.out"] = fromFormula("sine.out", outOf(sineIn), Math.PI / 2, 0);
named["sine.inOut"] = fromFormula("sine.inOut", inOutOf(sineIn), 0, 0);
named["E-arrive"] = E_ARRIVE;
named["E-leave"] = E_LEAVE;
named["E-move"] = E_MOVE;
named["E-match"] = E_MATCH;

export type CurveName = keyof typeof named | "E-arrive" | "E-leave" | "E-move" | "E-match";

/** A curve by its GSAP name or its film name. Throws on an unknown name. */
export const curve = (name: string): Curve => {
  const c = named[name];
  if (!c) throw new Error(`Unknown ease "${name}". Known: ${Object.keys(named).join(", ")}`);
  return c;
};
export const CURVE_NAMES = Object.keys(named);

/** The film's bezier curves as GSAP CustomEase strings ("x1,y1,x2,y2"), registered by type/gsap.ts. */
export const CUSTOM_EASES: Record<"E-arrive" | "E-leave" | "E-move" | "E-match", string> = {
  "E-arrive": BEZIER.arrive.join(","),
  "E-leave": BEZIER.leave.join(","),
  "E-move": BEZIER.move.join(","),
  "E-match": BEZIER.match.join(","),
};

/* ---------------------------------------------------------------- glide and helpers -------------------------- */

/**
 * The glide (CRAFT §3): after an arrival at speed v0, the camera coasts and settles into a drift v_d with time
 * constant tau. t and tau in frames, speeds in units per frame. Returns the distance travelled since the glide began.
 */
export const glideDistance = (t: number, v0: number, vd: number, tau: number): number =>
  vd * t + (v0 - vd) * tau * (1 - Math.exp(-t / tau));
export const glideVelocity = (t: number, v0: number, vd: number, tau: number): number => vd + (v0 - vd) * Math.exp(-t / tau);

/** The distance a glide still covers before it settles (to within 1 %): (v0 − vd)·tau. */
export const glideCoast = (v0: number, vd: number, tau: number): number => (v0 - vd) * tau;

/** 0..1 progress of `frame` through [from, from + frames], eased by `c`. */
export const progress = (frame: number, from: number, frames: number, c: Curve = E_MOVE): number =>
  c(frames <= 0 ? (frame >= from ? 1 : 0) : (frame - from) / frames);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Interpolates scales in log space (constant perceived zoom speed). */
export const logLerp = (a: number, b: number, t: number): number => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export { clamp01 };

/** Smoothstep, for masks and feathered edges (not for motion). */
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
