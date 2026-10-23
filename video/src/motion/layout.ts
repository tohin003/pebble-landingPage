// Aspect-aware layout (OVERRIDES §4 and §14; docs/FILM_SPEC.md §2–§4, §22): one set of scenes, three compositions.
// Every scene reads its safe area, type sizes, caption band, the window world's split (text column or band, the stage,
// the pebble's spot) and the cursor's size from here instead of hard-coding pixels, so LaunchFilm (1920 × 1080),
// LaunchFilmSquare (1080 × 1080) and LaunchFilmVertical (1080 × 1920) share one timeline and each gets its own
// framing, never a crop of another.
//
// The numbers are FILM_SPEC's (16:9 / square / vertical). Other sizes (the teaser, loops, posters) scale the matching
// reference set by min(width / refW, height / refH). An aspect is chosen by the frame's ratio: ≥ 1.3 wide, ≤ 0.75
// vertical, the square in between (the loops' 4:5 phone cuts, 0.8, stay square).
import { useVideoConfig } from "remotion";
import type { Point, Rect } from "./camera";

export type AspectId = "wide" | "square" | "vertical";
export const ASPECTS: readonly AspectId[] = ["wide", "square", "vertical"];
/** Each aspect's reference frame (FILM_SPEC §2). */
export const REFERENCE: Record<AspectId, { width: number; height: number }> = {
  wide: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};

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
  /** a support line that carries a number ("Apache-2.0"): Geist Mono 500 with tabular numerals */
  data: number;
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

/** Which of the stage's corners are rounded: the others bleed off the frame. */
export type StageCorners = "left" | "top" | "topLeft" | "all";

/** The window world's split (FILM_SPEC §4): the text column (16:9) or band (square, vertical), the stage, the pebble's spot. */
export interface WindowLayout {
  /** where side lines sit: their block starts at `text.y` */
  text: Rect;
  /** the stage: a hairline-framed viewport into Pebble's real UI, one moment at a time. Its visible part: it bleeds off
   *  the right edge (16:9, vertical) or the right and bottom edges (square) of the frame */
  stage: Rect;
  stageCorners: StageCorners;
  stageRadius: number;
  /** the pebble in the window world: foot position and PebbleOnFilm size */
  pebble: { foot: Point; size: number };
  /** the line the pebble stands on at its spot: from x0 to x1, at the foot's y */
  ground: { x0: number; x1: number };
  /** the S5e check mark's centre x (16:9 only; null where there is no room outside the stage) */
  checkX: number | null;
  checkSize: number;
}

export interface Layout {
  width: number;
  height: number;
  aspect: AspectId;
  /** px per design px: 1 at the reference size of this aspect */
  s: number;
  /** text never leaves this box */
  safe: Rect;
  /** the band every essential element stays in: the whole frame in 16:9 and the square; in 9:16 the central
   *  1080 × 1420 band (y 250–1670), clear of X's and LinkedIn's phone UI above and below it (OVERRIDES §14) */
  band: Rect;
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
  /** the paper world's pool of light radius, px (stills only: the film's paper is flat, PHILOSOPHY) */
  poolRadius: number;
}

const WIDE_TYPE: TypeScale = { hero: 216, headline: 112, side: 92, tagline: 92, support: 58, data: 54, cta: 56, mono: 52, small: 32, label: 40, uiMin: 28 };
// the square and the vertical are both 1080 px wide and both seen at a phone's width: one scale (FILM_SPEC §3)
const NARROW_TYPE: TypeScale = { hero: 172, headline: 92, side: 92, tagline: 72, support: 50, data: 46, cta: 48, mono: 44, small: 34, label: 36, uiMin: 34 };

const scaleType = (t: TypeScale, s: number): TypeScale =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v * s)])) as unknown as TypeScale;
const r = (v: number, s: number) => Math.round(v * s);

/** The aspect of a frame of `width` × `height`. */
export const aspectOf = (width: number, height: number): AspectId => {
  const ratio = width / height;
  return ratio >= 1.3 ? "wide" : ratio <= 0.75 ? "vertical" : "square";
};

/** The layout of a frame of `width` × `height` (pure; useLayout() is the hook). */
export function layoutFor(width: number, height: number): Layout {
  const aspect = aspectOf(width, height);
  if (aspect === "wide") {
    const s = Math.min(width / 1920, height / 1080);
    return {
      width,
      height,
      aspect,
      s,
      safe: { x: r(96, s), y: r(64, s), w: width - 2 * r(96, s), h: height - 2 * r(64, s) },
      band: { x: 0, y: 0, w: width, h: height },
      captionBandY: r(918, s),
      roiMargin: r(60, s),
      type: scaleType(WIDE_TYPE, s),
      gap: r(24, s),
      cursor: r(56, s),
      win: {
        text: { x: r(96, s), y: r(300, s), w: r(764, s), h: r(618, s) },
        stage: { x: r(920, s), y: r(64, s), w: width - r(920, s), h: r(952, s) },
        stageCorners: "left",
        stageRadius: r(16, s),
        pebble: { foot: { x: r(330, s), y: r(900, s) }, size: r(210, s) },
        ground: { x0: r(150, s), x1: r(510, s) },
        // REVIEW-G2 P1-5 (lane G-fix): 72 px at x 860, a clear 24 px from the stage (at 56 px on x 890 it sat 8 px from
        // the stage's edge, in its shadow)
        checkX: r(860, s),
        checkSize: r(72, s),
      },
      pebbleSize: r(210, s),
      lockup: { foot: { x: r(1295, s), y: r(422, s) }, baseline: r(420, s) },
      poolRadius: r(760, s),
    };
  }
  if (aspect === "vertical") {
    // FILM_SPEC §22: the text band in the upper part of the central band, the pebble at the band's right end on its
    // line, and under them the stage, the square's 1,056 × 744 (so the two narrow aspects share their framings), framed
    // on three sides and bleeding off the right edge as 16:9's does; it ends at y 1444, above the caption band (1460),
    // so nothing essential reaches the phone UI below y 1670 (or above y 250)
    const s = Math.min(width / 1080, height / 1920);
    return {
      width,
      height,
      aspect,
      s,
      safe: { x: r(80, s), y: r(290, s), w: width - 2 * r(80, s), h: r(1340, s) },
      band: { x: 0, y: r(250, s), w: width, h: r(1420, s) },
      captionBandY: r(1460, s),
      roiMargin: r(60, s),
      type: scaleType(NARROW_TYPE, s),
      gap: r(22, s),
      cursor: r(52, s),
      win: {
        text: { x: r(80, s), y: r(380, s), w: r(780, s), h: r(310, s) },
        stage: { x: r(24, s), y: r(700, s), w: width - r(24, s), h: r(744, s) },
        stageCorners: "left",
        stageRadius: r(16, s),
        pebble: { foot: { x: r(930, s), y: r(660, s) }, size: r(170, s) },
        ground: { x0: r(840, s), x1: r(1020, s) },
        checkX: null,
        checkSize: r(56, s),
      },
      pebbleSize: r(170, s),
      lockup: { foot: { x: r(806, s), y: r(832, s) }, baseline: r(830, s) },
      poolRadius: r(600, s),
    };
  }
  const s = Math.min(width, height) / 1080;
  return {
    width,
    height,
    aspect,
    s,
    safe: { x: r(80, s), y: r(80, s), w: width - 2 * r(80, s), h: height - 2 * r(80, s) },
    band: { x: 0, y: 0, w: width, h: height },
    captionBandY: r(918, s),
    roiMargin: r(60, s),
    type: scaleType(NARROW_TYPE, s),
    gap: r(22, s),
    cursor: r(52, s),
    win: {
      text: { x: r(80, s), y: r(96, s), w: r(780, s), h: r(220, s) },
      // lane v2-film: the stage bleeds off the right edge too (x 24 → 1080), so a moment magnified to the 34 px floor
      // runs off the frame's edge, as a screen does, instead of being cut 24 px inside it
      stage: { x: r(24, s), y: r(336, s), w: width - r(24, s), h: height - r(336, s) },
      stageCorners: "topLeft",
      stageRadius: r(16, s),
      pebble: { foot: { x: r(940, s), y: r(300, s) }, size: r(170, s) },
      ground: { x0: r(850, s), x1: r(1030, s) },
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

/** Pick a value by aspect: `byAspect(layout, {wide: …, square: …, vertical: …})`. */
export const byAspect = <T,>(layout: Layout, values: Record<AspectId, T>): T => values[layout.aspect];
