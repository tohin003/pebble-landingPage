// Aspect-aware layout (OVERRIDES §4; docs/FILM_SPEC.md §2–§4): one set of scenes, several compositions. Every scene
// reads its safe area, type sizes, caption band, the window world's split (text column or band, the stage, the pebble's
// spot) and the cursor's size from here instead of hard-coding pixels, so LaunchFilm (1920 × 1080) and
// LaunchFilmSquare (1080 × 1080) share one timeline and the square reframes with tighter punch-ins.
//
// The numbers are FILM_SPEC's (16:9 / square). Other sizes (the teaser, loops, posters) scale the 16:9 set by
// min(width / 1920, height / 1080).
import { useVideoConfig } from "remotion";
import type { Point, Rect } from "./camera";

export type AspectId = "wide" | "square";

export interface TypeScale {
  /** the `pebble` wordmark (Inter 650) */
  hero: number;
  /** a headline on the sage field (Fraunces 350, white) */
  headline: number;
  /** a side line in the window world's text column or band, and the end card's tagline (Fraunces 350, ink) */
  side: number;
  /** the end card's tagline "A little help, right here." */
  tagline: number;
  /** support lines (Inter 500) */
  support: number;
  /** the CTA's words (Inter 500) */
  cta: number;
  /** the URL (Geist Mono 500) */
  mono: number;
  /** small print (Inter 400) */
  small: number;
  /** non-essential labels */
  label: number;
  /** the smallest UI text a viewer must read, after magnification */
  uiMin: number;
}

/** The window world's split (FILM_SPEC §4): the text column (16:9) or band (square), the stage, the pebble's spot. */
export interface WindowLayout {
  /** where side lines sit: their block starts at `text.y` */
  text: Rect;
  /** the stage: a rounded viewport into Pebble's real UI. Its visible part; it bleeds off the right (16:9) or the
   *  bottom (square) edge of the frame */
  stage: Rect;
  /** which stage corners are rounded (the others bleed off the frame) */
  stageCorners: "left" | "top";
  stageRadius: number;
  /** the pebble in the window world: foot position and PebbleOnFilm size */
  pebble: { foot: Point; size: number };
  /** the S5e check mark's centre x (16:9 only; null in the square) */
  checkX: number | null;
  checkSize: number;
}

export interface Layout {
  width: number;
  height: number;
  aspect: AspectId;
  /** px per design px: 1 at the reference size of this aspect (1920 × 1080 or 1080 × 1080) */
  s: number;
  /** text never leaves this box */
  safe: Rect;
  /** player captions own everything below this y: no kinetic type, no click target (FILM_SPEC §2) */
  captionBandY: number;
  /** a UI region of interest stays this far from every frame edge */
  roiMargin: number;
  type: TypeScale;
  gap: number;
  /** the cursor's height, px (FILM_SPEC §2) */
  cursor: number;
  win: WindowLayout;
  /** type worlds: the pebble's size (FILM_SPEC §4) */
  pebbleSize: number;
  /** the reveal and end-card lockup: the pebble's foot and the wordmark's baseline */
  lockup: { foot: Point; baseline: number };
  /** the paper world's pool of light radius, px */
  poolRadius: number;
}

const WIDE_TYPE: TypeScale = { hero: 216, headline: 112, side: 92, tagline: 92, support: 58, cta: 56, mono: 52, small: 32, label: 40, uiMin: 28 };
const SQUARE_TYPE: TypeScale = { hero: 172, headline: 92, side: 92, tagline: 72, support: 50, cta: 48, mono: 44, small: 34, label: 36, uiMin: 34 };

const scaleType = (t: TypeScale, s: number): TypeScale =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v * s)])) as unknown as TypeScale;
const r = (v: number, s: number) => Math.round(v * s);

/** The layout of a frame of `width` × `height` (pure; useLayout() is the hook). */
export function layoutFor(width: number, height: number): Layout {
  const aspect: AspectId = width / height >= 1.3 ? "wide" : "square";
  if (aspect === "wide") {
    const s = Math.min(width / 1920, height / 1080);
    return {
      width,
      height,
      aspect,
      s,
      safe: { x: r(96, s), y: r(64, s), w: width - 2 * r(96, s), h: height - 2 * r(64, s) },
      captionBandY: r(918, s),
      roiMargin: r(60, s),
      type: scaleType(WIDE_TYPE, s),
      gap: r(24, s),
      cursor: r(56, s),
      win: {
        text: { x: r(96, s), y: r(300, s), w: r(764, s), h: r(618, s) },
        stage: { x: r(920, s), y: r(64, s), w: width - r(920, s), h: r(952, s) },
        stageCorners: "left",
        stageRadius: r(28, s),
        pebble: { foot: { x: r(330, s), y: r(900, s) }, size: r(210, s) },
        checkX: r(890, s),
        checkSize: r(56, s),
      },
      pebbleSize: r(210, s),
      lockup: { foot: { x: r(1295, s), y: r(422, s) }, baseline: r(420, s) },
      poolRadius: r(760, s),
    };
  }
  const s = Math.min(width, height) / 1080;
  return {
    width,
    height,
    aspect,
    s,
    safe: { x: r(80, s), y: r(80, s), w: width - 2 * r(80, s), h: height - 2 * r(80, s) },
    captionBandY: r(918, s),
    roiMargin: r(60, s),
    type: scaleType(SQUARE_TYPE, s),
    gap: r(22, s),
    cursor: r(52, s),
    win: {
      text: { x: r(80, s), y: r(96, s), w: r(780, s), h: r(220, s) },
      stage: { x: r(24, s), y: r(336, s), w: r(1032, s), h: height - r(336, s) },
      stageCorners: "top",
      stageRadius: r(28, s),
      pebble: { foot: { x: r(940, s), y: r(300, s) }, size: r(170, s) },
      checkX: null,
      checkSize: r(56, s),
    },
    pebbleSize: r(170, s),
    lockup: { foot: { x: r(806, s), y: r(402, s) }, baseline: r(400, s) },
    poolRadius: r(600, s),
  };
}

/** The layout of the current composition (reads useVideoConfig, so it adapts to every registration). */
export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
};

/** Pick a value by aspect: `byAspect(layout, {wide: …, square: …})`. */
export const byAspect = <T,>(layout: Layout, values: Record<AspectId, T>): T => values[layout.aspect];
