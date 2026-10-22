// Aspect-aware layout (OVERRIDES §4): one set of scenes, several compositions. Every scene reads its safe area, type
// sizes, camera framings and caption boxes from here instead of hard-coding pixels, so LaunchFilm (1920 × 1080) and
// LaunchFilmSquare (1080 × 1080) share one timeline and the square can reframe with tighter punch-ins.
//
// The square is judged at 360 px wide (a phone feed): a scale of 1/3, so its type is relatively larger, its punch-ins
// tighter (UI text ≥ 34 px in frame ≈ 11 CSS px on the phone) and no text sits within 80 px of an edge (OVERRIDES §4
// asks for 60). The wide film follows R5 §4 (≥ 56 px for essential text, 28 px for UI text) with 64 px top and bottom.
import { useVideoConfig } from "remotion";
import type { Rect } from "./camera";

export type AspectId = "wide" | "square";

export interface TypeScale {
  /** the "pebble." wordmark at the reveal */
  hero: number;
  /** a kinetic headline line (Fraunces 350, ≤ 6 words) */
  headline: number;
  /** a support or caption line (Inter) */
  support: number;
  /** non-essential labels */
  label: number;
  /** the CTA's words (Inter) */
  cta: number;
  /** the URL (Geist Mono) */
  mono: number;
  /** small print ("Shown with sample data") */
  small: number;
  /** the smallest UI text a viewer must read, after magnification */
  uiMin: number;
}

export interface Layout {
  width: number;
  height: number;
  aspect: AspectId;
  /** px per design px: 1 at the reference size of this aspect (1920 × 1080 or 1080 × 1080) */
  s: number;
  /** text never leaves this box */
  safe: Rect;
  type: TypeScale;
  /** the base spacing step */
  gap: number;
  /** camera magnifications (frame px per UI CSS px) for the three framings of R5 §5.1, tighter in the square */
  zoom: { wide: number; pane: number; punch: number };
  /** the cursor's height range in frame px (R5 §5.4: 4–7 % of the frame's height) */
  cursor: { min: number; max: number };
  /** where proof captions sit (on a defocused or quiet area, never over sharp UI) */
  caption: { top: Rect; bottom: Rect };
  /** where a shot's focus region is fitted: the frame inside the safe area, minus the caption band */
  stage: { withTopCaption: Rect; withBottomCaption: Rect; full: Rect };
}

const WIDE_TYPE: TypeScale = { hero: 216, headline: 112, support: 58, label: 40, cta: 56, mono: 50, small: 32, uiMin: 28 };
const SQUARE_TYPE: TypeScale = { hero: 172, headline: 92, support: 50, label: 36, cta: 48, mono: 42, small: 34, uiMin: 34 };

const scaleType = (t: TypeScale, s: number): TypeScale =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v * s)])) as unknown as TypeScale;

/** The layout of a frame of `width` × `height` (pure; useLayout() is the hook). */
export function layoutFor(width: number, height: number): Layout {
  const aspect: AspectId = width / height >= 1.3 ? "wide" : "square";
  if (aspect === "wide") {
    const s = Math.min(width / 1920, height / 1080);
    const sx = Math.round(96 * s);
    const sy = Math.round(64 * s);
    const safe = { x: sx, y: sy, w: width - 2 * sx, h: height - 2 * sy };
    const capH = Math.round(260 * s);
    return {
      width,
      height,
      aspect,
      s,
      safe,
      type: scaleType(WIDE_TYPE, s),
      gap: Math.round(24 * s),
      zoom: { wide: 1.25, pane: 2.0, punch: 2.7 },
      cursor: { min: Math.round(46 * s), max: Math.round(70 * s) },
      caption: {
        top: { x: sx, y: sy, w: Math.round(1100 * s), h: capH },
        bottom: { x: sx, y: height - sy - capH, w: Math.round(1100 * s), h: capH },
      },
      stage: {
        withTopCaption: { x: sx, y: sy + capH, w: safe.w, h: safe.h - capH },
        withBottomCaption: { x: sx, y: sy, w: safe.w, h: safe.h - capH },
        full: safe,
      },
    };
  }
  const s = Math.min(width, height) / 1080;
  const sx = Math.round(80 * s);
  const top = Math.round(88 * s);
  const bottom = Math.round(104 * s); // LinkedIn draws its controls along the bottom of a feed video
  const safe = { x: sx, y: top, w: width - 2 * sx, h: height - top - bottom };
  const capH = Math.round(236 * s);
  return {
    width,
    height,
    aspect,
    s,
    safe,
    type: scaleType(SQUARE_TYPE, s),
    gap: Math.round(22 * s),
    zoom: { wide: 0.92, pane: 1.9, punch: 2.9 },
    cursor: { min: Math.round(50 * s), max: Math.round(72 * s) },
    caption: {
      top: { x: sx, y: top, w: safe.w, h: capH },
      bottom: { x: sx, y: height - bottom - capH, w: safe.w, h: capH },
    },
    stage: {
      withTopCaption: { x: sx, y: top + capH, w: safe.w, h: safe.h - capH },
      withBottomCaption: { x: sx, y: top, w: safe.w, h: safe.h - capH },
      full: safe,
    },
  };
}

/** The layout of the current composition (reads useVideoConfig, so it adapts to every registration). */
export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
};

/** Pick a value by aspect: `byAspect(layout, {wide: …, square: …})`. */
export const byAspect = <T,>(layout: Layout, values: Record<AspectId, T>): T => values[layout.aspect];
