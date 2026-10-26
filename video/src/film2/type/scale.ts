// The type scale for each aspect (TREATMENT §5.2, §3.12). Sizes are px at 1080 px on the frame's short side, so the
// same call gives the right size in a half-size proxy render. Pure.
import type { CSSProperties } from "react";
import { FRAUNCES_AXES, SAFE_MARGIN_PX, TYPE_FACE, TYPE_SIZE, type Aspect, type TypeTier } from "../tokens";

export const aspectOfFrame = (w: number, h: number): Aspect => {
  const r = w / h;
  if (r > 1.2) return "16:9";
  if (r < 0.8) return "9:16";
  return "1:1";
};

/** The frame's scale against 1080 px on its short side (0.5 in a half-size proxy). */
export const unitOf = (w: number, h: number): number => Math.min(w, h) / 1080;

/** A tier's size in px for this frame; `t` picks within the tier's range (0 smallest, 1 largest). */
export const typeSizePx = (tier: TypeTier, w: number, h: number, t = 0.5): number => {
  const [lo, hi] = TYPE_SIZE[tier][aspectOfFrame(w, h)];
  return (lo + (hi - lo) * Math.min(1, Math.max(0, t))) * unitOf(w, h);
};

/** Text keeps 60 px (at 1080) from every edge. */
export const safeMarginPx = (w: number, h: number): number => SAFE_MARGIN_PX * unitOf(w, h);

/** The CSS for a tier at this frame size. */
export const typeStyle = (tier: TypeTier, w: number, h: number, t = 0.5): CSSProperties => {
  const f = TYPE_FACE[tier];
  const size = typeSizePx(tier, w, h, t);
  return {
    fontFamily: `"${f.family}"`,
    fontWeight: f.weight,
    fontSize: size,
    lineHeight: f.leading,
    letterSpacing: f.tracking,
    fontVariationSettings: tier === "expressive" ? FRAUNCES_AXES : undefined,
    fontFeatureSettings: f.tabular ? '"tnum" 1' : undefined,
    fontVariantNumeric: f.tabular ? "tabular-nums" : undefined,
    whiteSpace: "pre",
    margin: 0,
  };
};

/** Approximate advance width of a line, px (for layout rects in validators; ~0.5 em Inter, 0.48 em Fraunces). */
export const approxLineWidth = (text: string, tier: TypeTier, w: number, h: number, t = 0.5): number => {
  const k = tier === "expressive" ? 0.48 : tier === "data" ? 0.6 : 0.52;
  return text.length * k * typeSizePx(tier, w, h, t);
};
