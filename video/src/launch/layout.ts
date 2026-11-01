// The layout layer: the film ships in 16:9 (1920×1080) and a 4:5 re-layout (1080×1350, not a crop), so every scene is
// placed from here, never from hard-coded 1920×1080 numbers. `useLayout()` keys off the composition's size and gives
// the aspect's safe area, type scale and the framings scenes share (the feature split, the window, the device, the
// chart, the stage floor). Every number is at the aspect's reference size and scaled by `u`, so a 3840×2160 or a
// 540×675 composition lays out the same.
import { useVideoConfig } from "remotion";

export type AspectId = "16x9" | "4x5";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Pt {
  x: number;
  y: number;
}

/**
 * Type sizes, px at the reference size. Phone legibility (launch-film-craft x-linkedin-delivery: a 390 pt phone shows
 * 16:9 at 0.20× and 4:5 at 0.36×): anything that must be read is ≥ 56 px on 16:9 and ≥ 40 px on 4:5; the footnote is
 * small print by design (its sentence also goes in the post text).
 */
export interface TypeScale {
  /** the title lockup ("Pebble 2.0") */
  hero: number;
  /** a one-line statement alone on the stage ("This is Pebble.") */
  display: number;
  /** a feature's headline ("Your apps.") */
  headline: number;
  /** a smaller headline beside a busy picture, a chart's title */
  title: number;
  /** a supporting line (the README line under the title) */
  sub: number;
  /** the honest line, body copy */
  body: number;
  /** Geist Mono labels */
  label: number;
  /** footnotes (the benchmark's method) */
  foot: number;
}

export interface Layout {
  id: AspectId;
  W: number;
  H: number;
  portrait: boolean;
  /** px per reference px: 1 at 1920×1080 (16:9) and at 1080×1350 (4:5) */
  u: number;
  /** a reference length in this frame's px */
  px: (v: number) => number;
  /** EBU R95 graphics-safe (5 %): nothing that must be read goes outside it */
  safe: Rect;
  /** the design margins inside which type is set (inside `safe`) */
  margin: { x: number; y: number };
  /** the content box: the frame minus the margins */
  content: Rect;
  type: TypeScale;
  centre: Pt;
  /** where a stage pebble's foot stands */
  floorY: number;
  /** text with real UI: the text's box and the window's (side by side on 16:9, stacked on 4:5) */
  feature: { text: Rect; media: Rect; align: "left" | "center" };
  /** a window alone on the stage, as big as the frame allows */
  window: Rect;
  /** the iPhone: its height and centre */
  device: { h: number; centre: Pt };
  /** a chart's box and the footnote's under it */
  chart: Rect;
  foot: Rect;
}

const scaleRect = (r: Rect, u: number): Rect => ({ x: r.x * u, y: r.y * u, w: r.w * u, h: r.h * u });
const scalePt = (p: Pt, u: number): Pt => ({ x: p.x * u, y: p.y * u });

/** The reference designs: 16:9 at 1920×1080, 4:5 at 1080×1350. */
const REF = {
  "16x9": {
    W: 1920,
    H: 1080,
    safe: { x: 96, y: 54, w: 1728, h: 972 },
    margin: { x: 128, y: 96 },
    type: { hero: 192, display: 168, headline: 144, title: 116, sub: 56, body: 46, label: 28, foot: 20 },
    floorY: 760,
    feature: { text: { x: 128, y: 150, w: 560, h: 780 }, media: { x: 744, y: 156, w: 1072, h: 768 }, align: "left" as const },
    window: { x: 190, y: 110, w: 1540, h: 860 },
    device: { h: 900, centre: { x: 1290, y: 540 } },
    chart: { x: 128, y: 392, w: 1664, h: 470 },
    foot: { x: 128, y: 948, w: 1664, h: 76 },
  },
  "4x5": {
    W: 1080,
    H: 1350,
    safe: { x: 54, y: 68, w: 972, h: 1214 },
    margin: { x: 64, y: 96 },
    type: { hero: 158, display: 140, headline: 116, title: 96, sub: 44, body: 40, label: 26, foot: 20 },
    floorY: 940,
    feature: { text: { x: 64, y: 104, w: 952, h: 300 }, media: { x: 40, y: 432, w: 1000, h: 820 }, align: "left" as const },
    window: { x: 40, y: 300, w: 1000, h: 880 },
    device: { h: 980, centre: { x: 540, y: 790 } },
    chart: { x: 64, y: 500, w: 952, h: 560 },
    foot: { x: 64, y: 1130, w: 952, h: 150 },
  },
} as const;

/** The layout for a frame of `width` × `height` px (portrait frames take the 4:5 design, landscape the 16:9). */
export const layoutFor = (width: number, height: number): Layout => {
  const id: AspectId = height > width ? "4x5" : "16x9";
  const r = REF[id];
  const u = width / r.W;
  const type = Object.fromEntries(Object.entries(r.type).map(([k, v]) => [k, v * u])) as unknown as TypeScale;
  const margin = { x: r.margin.x * u, y: r.margin.y * u };
  return {
    id,
    W: width,
    H: height,
    portrait: id === "4x5",
    u,
    px: (v: number) => v * u,
    safe: scaleRect(r.safe, u),
    margin,
    content: { x: margin.x, y: margin.y, w: width - 2 * margin.x, h: height - 2 * margin.y },
    type,
    centre: { x: width / 2, y: height / 2 },
    floorY: r.floorY * u,
    feature: { text: scaleRect(r.feature.text, u), media: scaleRect(r.feature.media, u), align: r.feature.align },
    window: scaleRect(r.window, u),
    device: { h: r.device.h * u, centre: scalePt(r.device.centre, u) },
    chart: scaleRect(r.chart, u),
    foot: scaleRect(r.foot, u),
  };
};

/** The layout of the current composition. */
export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
};

/** One value per aspect: `pick(L, { "16x9": 0.6, "4x5": 0.5 })`. */
export const pick = <T,>(L: Layout, v: Record<AspectId, T>): T => v[L.id];

/** A rect's centre. */
export const centreOf = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** A rect shrunk by `d` px on every side (grown, with a negative `d`). */
export const inset = (r: Rect, d: number): Rect => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });
