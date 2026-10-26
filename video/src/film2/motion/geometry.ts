// Plain geometry shared by the camera, the ring carrier and the validators. Pure; no React.

export interface Point {
  x: number;
  y: number;
}
export interface Vec {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerpPt = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The angle between two vectors in degrees, 0..180 (0 when either is zero). */
export const angleBetweenDeg = (a: Vec, b: Vec): number => {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const c = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
};

export const rectCenter = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const rectHalfDiagonal = (r: Rect): number => Math.hypot(r.w, r.h) / 2;
export const inflate = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
export const rectsIntersect = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const rectInside = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

/** Distance from a point to the nearest point of a rect (0 inside it). */
export const distToRect = (p: Point, r: Rect): number => {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
};
/** Distance from a point to the farthest corner of a rect. */
export const farDistToRect = (p: Point, r: Rect): number =>
  Math.max(
    Math.hypot(p.x - r.x, p.y - r.y),
    Math.hypot(p.x - (r.x + r.w), p.y - r.y),
    Math.hypot(p.x - r.x, p.y - (r.y + r.h)),
    Math.hypot(p.x - (r.x + r.w), p.y - (r.y + r.h)),
  );

/**
 * Does a circle's stroke (centre c, radius r, line width w, plus margin m) touch a rect? The annulus
 * [r − w/2 − m, r + w/2 + m] meets the rect when the rect's nearest point is inside its outer edge and its farthest
 * corner is outside its inner edge.
 */
export const annulusHitsRect = (c: Point, r: number, w: number, rect: Rect, m = 0): boolean => {
  const outer = r + w / 2 + m;
  const inner = Math.max(0, r - w / 2 - m);
  return distToRect(c, rect) <= outer && farDistToRect(c, rect) >= inner;
};

/** The radius from p that reaches every corner of a w × h frame. */
export const radiusToCorners = (p: Point, w: number, h: number): number =>
  Math.max(Math.hypot(p.x, p.y), Math.hypot(w - p.x, p.y), Math.hypot(p.x, h - p.y), Math.hypot(w - p.x, h - p.y));

/** Intersection of two rects, or null. */
export const intersectRect = (a: Rect, b: Rect): Rect | null => {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
};
