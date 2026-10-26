// The title's light sweep under lead ruling L3a (OVERRIDES §52): ONCE in the film, across the wordmark at the title,
// as the converging rings arrive; in sage (#506E54 on a light ground, #A6C795 on dark); it lightens the glyphs by at
// most 15 %, inside the glyphs only, with no halo or bloom beyond their edges.
//
// "Lightens by at most 15 %" is measured as CIELAB lightness: the glyphs' L* rises by at most 15 (of 100) where the
// band's core crosses them. The band is the sage laid over the ink glyphs at alpha α (CSS composites in sRGB), so the
// cap is the largest α with L*(mix(ink, sage, α)) − L*(ink) ≤ 15. Pure; the component is views/SageSweep.tsx.
import { COLOR, TRANSITION } from "../tokens";
import { E_MOVE } from "../motion/ease";
import { hexToRgb, type RGB } from "../light/grades";

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
/** CIELAB L* of an sRGB colour (D65). */
export const lightness = (c: RGB): number => {
  const Y = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const f = Y > 216 / 24389 ? Math.cbrt(Y) : (24389 / 27 * Y + 16) / 116;
  return 116 * f - 16;
};
const mixSrgb = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as RGB;

/** The largest band alpha that lifts the glyphs' L* by at most `maxLift`. */
export function sweepAlphaMax(ink: string = COLOR.ink, sage: string = COLOR.accent, maxLift = 15): number {
  const a = hexToRgb(ink);
  const b = hexToRgb(sage);
  const L0 = lightness(a);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (lightness(mixSrgb(a, b, m)) - L0 <= maxLift) lo = m;
    else hi = m;
  }
  return lo;
}

/** The lift a band of alpha `alpha` gives the glyphs, L* units. */
export const sweepLift = (alpha: number, ink: string = COLOR.ink, sage: string = COLOR.accent): number => lightness(mixSrgb(hexToRgb(ink), hexToRgb(sage), alpha)) - lightness(hexToRgb(ink));

export const SAGE_SWEEP = {
  /** 36–54 frames at 60 fps (TREATMENT S26) */
  frames: [36, 54] as const,
  /** the band's half-width, as a fraction of the wordmark's width (a soft core with an eased falloff, no hard edge) */
  halfWidth: 0.22,
  angleDeg: 22,
} as const;

/** The band's core position across the wordmark at `frame` (−0.3 before … 1.3 after), or null outside the sweep. */
export const sageSweepPosition = (frame: number, at: number, frames: number): number | null => {
  const u = (frame - at) / frames;
  if (u < 0 || u > 1) return null;
  return -0.3 + 1.6 * E_MOVE(u);
};

/** Alpha of the band at signed distance d from its core (in the wordmark's widths): a cosine bell, 0 at ±halfWidth. */
export const sageBand = (d: number, alphaMax: number): number => {
  const x = Math.abs(d) / SAGE_SWEEP.halfWidth;
  return x >= 1 ? 0 : alphaMax * 0.5 * (1 + Math.cos(Math.PI * x));
};

/** The frame range a sweep must use (checked by the finale's plan). */
export const sweepFramesOk = (frames: number, fps: number): boolean => frames >= (SAGE_SWEEP.frames[0] * fps) / 60 - 0.5 && frames <= (SAGE_SWEEP.frames[1] * fps) / 60 + 0.5;

/** Not a transition: listed for the README's table. */
export const SWEEP_NOTE = `${TRANSITION.light.minFrames} frames is the light change's minimum; the sweep is not a light change`;
