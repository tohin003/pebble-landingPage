// The Screen-Studio-style camera over a source picture (pure, no React): keyframes frame boxes of the source (in the
// source's own pixels), and the camera glides between them on the treatment's camera ease, zooming in log space (a
// constant perceived speed). The view never shows outside the source.
import { DUR, EASE, type EaseFn } from "./tokens";

/** A rectangle in source pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZoomKey {
  /** when the camera ARRIVES at this framing, seconds (output time unless the ScreenZoom says "source") */
  t: number;
  /** what must be in view, source px: the camera fits it to the view's aspect (contain) */
  box: Box;
  /** how long the move into this key takes, seconds (default 0.6 s for a push in or a pan, 0.7 s for a pull back) */
  dur?: number;
  /** the move's ease (default: the push ease, cubic-bezier(0.16, 1, 0.3, 1)) */
  ease?: EaseFn;
}

export interface Size {
  w: number;
  h: number;
}

/** `box` grown to the view's aspect around its centre, then kept inside the source (and no larger than it). */
export function fitRegion(box: Box, view: Size, src: Size): Box {
  const aspect = view.w / view.h;
  let w = box.w;
  let h = box.h;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  // never larger than the source (cover-fit at most)
  const maxW = Math.min(src.w, src.h * aspect);
  if (w > maxW) {
    w = maxW;
    h = w / aspect;
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return clampRegion({ x: cx - w / 2, y: cy - h / 2, w, h }, src);
}

/** Shift a region so it stays inside the source. */
export function clampRegion(r: Box, src: Size): Box {
  const x = Math.min(Math.max(r.x, 0), Math.max(0, src.w - r.w));
  const y = Math.min(Math.max(r.y, 0), Math.max(0, src.h - r.h));
  return { x, y, w: r.w, h: r.h };
}

/** The whole source, fitted to the view (cover). */
export const fullRegion = (view: Size, src: Size): Box => fitRegion({ x: 0, y: 0, w: src.w, h: src.h }, view, src);

/**
 * The region of the source in view at time `t`. Keys must be sorted by `t`. Before the first key the camera holds the
 * first framing; after the last it holds the last. `drift` is a slow push-in (per second, e.g. 0.012 = 1.2 %/s) so the
 * picture never holds dead still.
 */
export function cameraAt(keys: readonly ZoomKey[], t: number, view: Size, src: Size, drift = 0): Box {
  let r: Box;
  if (keys.length === 0) r = fullRegion(view, src);
  else {
    const regions = keys.map((k) => fitRegion(k.box, view, src));
    const i = keys.findIndex((k) => k.t > t);
    if (i === -1) r = regions[regions.length - 1];
    else if (i === 0) r = regions[0];
    else {
      const a = regions[i - 1];
      const b = regions[i];
      const k = keys[i];
      const dur = k.dur ?? (b.w > a.w * 1.001 ? DUR.pull : DUR.push);
      const start = Math.max(keys[i - 1].t, k.t - dur);
      const span = Math.max(1e-6, k.t - start);
      const p = (k.ease ?? EASE.push)(Math.max(0, Math.min(1, (t - start) / span)));
      const cxa = a.x + a.w / 2;
      const cya = a.y + a.h / 2;
      const cxb = b.x + b.w / 2;
      const cyb = b.y + b.h / 2;
      const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * p);
      const h = w * (a.h / a.w);
      const cx = cxa + (cxb - cxa) * p;
      const cy = cya + (cyb - cya) * p;
      r = { x: cx - w / 2, y: cy - h / 2, w, h };
    }
  }
  if (drift !== 0) {
    const k = Math.exp(-drift * Math.max(0, t));
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    r = { x: cx - (r.w * k) / 2, y: cy - (r.h * k) / 2, w: r.w * k, h: r.h * k };
  }
  return clampRegion(r, src);
}

/** The largest distance, in view px, that any point of the view moves between two camera regions. */
export function viewShift(a: Box, b: Box, view: Size): number {
  let max = 0;
  for (const [vx, vy] of [
    [0, 0],
    [view.w, 0],
    [0, view.h],
    [view.w, view.h],
    [view.w / 2, view.h / 2],
  ]) {
    const sx = a.x + (vx * a.w) / view.w;
    const sy = a.y + (vy * a.h) / view.h;
    const bx = ((sx - b.x) * view.w) / b.w;
    const by = ((sy - b.y) * view.h) / b.h;
    max = Math.max(max, Math.hypot(bx - vx, by - vy));
  }
  return max;
}

/** The zoom of a region relative to the whole source (1 = the full picture, 2 = twice as close). */
export const zoomOf = (r: Box, src: Size): number => src.w / r.w;

/** A box of the source centred on `focus`, `zoom`× closer than the whole picture (the view fits it to its aspect). */
export const zoomBox = (src: Size, focus: { x: number; y: number }, zoom: number): Box => {
  const w = src.w / zoom;
  const h = src.h / zoom;
  return { x: focus.x - w / 2, y: focus.y - h / 2, w, h };
};

/**
 * One push, one action (rulings v1.1): from `from`, push in to `to` arriving at `at` (0.6 s), hold `hold` seconds
 * (default 2.4) with the action inside, then pull back to `back` (default `from`) in 0.7 s.
 */
export const pushHold = (o: { from: Box; to: Box; at: number; hold?: number; back?: Box; t0?: number }): ZoomKey[] => {
  const hold = o.hold ?? DUR.zoomHold;
  return [
    { t: o.t0 ?? 0, box: o.from },
    { t: o.at, box: o.to, dur: DUR.push },
    { t: o.at + hold + DUR.pull, box: o.back ?? o.from, dur: DUR.pull },
  ];
};
