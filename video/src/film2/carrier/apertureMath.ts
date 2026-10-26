// The aperture's geometry (pure; carrier/Aperture.tsx draws it). TREATMENT §3.9 step 4, §3.12: Act I is narrow, and at
// the Drop the frame opens with the ring: 16:9 from 2.39:1, 9:16 from 4:5, 1:1 from 16:9.
import type { Aspect } from "../tokens";
import type { Rect } from "../motion/geometry";

/** The aperture's starting aspect (width ÷ height) for each frame aspect. */
export const APERTURE_START: Record<Aspect, number> = { "16:9": 2.39, "9:16": 4 / 5, "1:1": 16 / 9 };

export const aspectOf = (w: number, h: number): Aspect => {
  const r = w / h;
  if (r > 1.2) return "16:9";
  if (r < 0.8) return "9:16";
  return "1:1";
};

/** The aperture rect at `open` (0 narrow, 1 full bleed): full width, its height opening symmetrically about `centerY`. */
export const apertureRect = (w: number, h: number, open: number, centerY = h / 2): Rect => {
  const h0 = Math.min(h, w / APERTURE_START[aspectOf(w, h)]);
  const hh = h0 + (h - h0) * Math.min(1, Math.max(0, open));
  // the centre slides to the frame's centre as it opens, so the full-bleed frame is exact
  const cy = centerY + (h / 2 - centerY) * Math.min(1, Math.max(0, open));
  return { x: 0, y: cy - hh / 2, w, h: hh };
};

/**
 * The opening that keeps the aperture's edges just outside a ring centred at (cx, cy) of radius r (frame px): the
 * ring reaches the edges, and the frame opens with it. Returns 0 until the ring touches an edge, 1 at full bleed.
 */
export const apertureOpenForRing = (w: number, h: number, cy: number, r: number, centerY = h / 2): number => {
  const h0 = Math.min(h, w / APERTURE_START[aspectOf(w, h)]);
  const top0 = centerY - h0 / 2;
  const bottom0 = centerY + h0 / 2;
  // half-height needed so both edges sit at or beyond the ring's top and bottom
  const need = Math.max(cy + r - centerY, centerY - (cy - r));
  const half0 = h0 / 2;
  if (need <= half0 || bottom0 - top0 >= h) return need <= half0 ? 0 : 1;
  return Math.min(1, (need - half0) / (h / 2 - half0));
};
