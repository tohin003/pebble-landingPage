// The virtual camera (R5 §5.2): a world point sits at the frame's centre, magnified `zoom` times (frame px per world
// unit; a world unit is one CSS px of the captured UI). Pure arithmetic: no React, so scenes, stills and checks share it.
//
// Rules it encodes:
// - a key is an ARRIVAL: the camera lands on the framing at frame `at` and holds until the next key's move starts
//   (`at - dur` of that key), so "arrive, then hold while the UI acts" is the default;
// - zoom always travels in log space (constant perceived zoom speed);
// - the default path is van Wijk & Nuij's smooth pan-zoom (the one d3.interpolateZoom implements): for a small pan it
//   is a plain log-space zoom, for a pan wider than the view it pulls back a little and pushes in again;
// - moves ease with EASE.camera and never overshoot.
import { EASE, T, sec, type Ease } from "./spec";

export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CamPose {
  /** the world point at the frame's centre */
  x: number;
  y: number;
  /** frame px per world unit */
  zoom: number;
}
export interface CamKey extends CamPose {
  /** the frame the camera ARRIVES on (local to the Sequence the camera lives in) */
  at: number;
  /** frames the move into this key takes (default T.camera = 0.8 s); the move starts at `at - dur` */
  dur?: number;
  /** ease of the move into this key (default EASE.camera) */
  ease?: Ease;
  /** "smooth": van Wijk & Nuij pan-zoom (default); "direct": focus and log-zoom on the same eased progress */
  path?: "smooth" | "direct";
  /** curvature of the smooth path (√2 as in the paper and d3; lower values pull back less) */
  rho?: number;
}

export const rectCenter = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const insetRect = (r: Rect, dx: number, dy = dx): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w - 2 * dx, h: r.h - 2 * dy });
export const unionRect = (...rs: readonly Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/* ---------- world <-> frame ---------- */

export const toFrame = (p: Point, pose: CamPose, frameW: number, frameH: number): Point => ({
  x: frameW / 2 + (p.x - pose.x) * pose.zoom,
  y: frameH / 2 + (p.y - pose.y) * pose.zoom,
});
export const toWorld = (p: Point, pose: CamPose, frameW: number, frameH: number): Point => ({
  x: pose.x + (p.x - frameW / 2) / pose.zoom,
  y: pose.y + (p.y - frameH / 2) / pose.zoom,
});
export const rectToFrame = (r: Rect, pose: CamPose, frameW: number, frameH: number): Rect => {
  const p = toFrame(r, pose, frameW, frameH);
  return { x: p.x, y: p.y, w: r.w * pose.zoom, h: r.h * pose.zoom };
};
/** The CSS transform that maps world units to frame px (apply with transform-origin 0 0). */
export const worldMatrix = (pose: CamPose, frameW: number, frameH: number) => {
  const z = pose.zoom;
  return `matrix(${z.toFixed(6)}, 0, 0, ${z.toFixed(6)}, ${(frameW / 2 - pose.x * z).toFixed(3)}, ${(frameH / 2 - pose.y * z).toFixed(3)})`;
};

/* ---------- framing ---------- */

/** The pose that puts world point `world` at frame point `at`, magnified `zoom` times. */
export const poseAt = (world: Point, at: Point, zoom: number, frameW: number, frameH: number): CamPose => ({
  x: world.x - (at.x - frameW / 2) / zoom,
  y: world.y - (at.y - frameH / 2) / zoom,
  zoom,
});

export interface FitOptions {
  /** "contain" (default): the whole rect is visible; "cover": the rect fills the box; "width" / "height": that side fits */
  mode?: "contain" | "cover" | "width" | "height";
  /** frame px kept free inside the box around the rect */
  pad?: number;
  minZoom?: number;
  maxZoom?: number;
  /** where the rect sits in the box when it is smaller than the box on an axis: 0 start, 0.5 centre, 1 end */
  align?: Point;
}
/**
 * The pose that frames world rect `rect` inside frame box `box`. This is how shots stay aspect-aware: a shot names
 * the world region that must be seen, each composition fits it into its own layout box.
 */
export const fitRect = (rect: Rect, box: Rect, frameW: number, frameH: number, opts: FitOptions = {}): CamPose => {
  const pad = opts.pad ?? 0;
  const bw = Math.max(1, box.w - 2 * pad);
  const bh = Math.max(1, box.h - 2 * pad);
  const zx = bw / rect.w;
  const zy = bh / rect.h;
  const mode = opts.mode ?? "contain";
  let zoom = mode === "cover" ? Math.max(zx, zy) : mode === "width" ? zx : mode === "height" ? zy : Math.min(zx, zy);
  zoom = Math.min(opts.maxZoom ?? Infinity, Math.max(opts.minZoom ?? 0, zoom));
  const align = opts.align ?? { x: 0.5, y: 0.5 };
  // the rect's on-screen size, and where its top-left must land inside the padded box
  const sw = rect.w * zoom;
  const sh = rect.h * zoom;
  const left = box.x + pad + (bw - sw) * align.x;
  const top = box.y + pad + (bh - sh) * align.y;
  return poseAt({ x: rect.x, y: rect.y }, { x: left, y: top }, zoom, frameW, frameH);
};

/**
 * Keeps a pose inside a world region (for example the wallpaper): the visible frame never shows beyond `bounds`.
 * When the view is larger than the bounds on an axis, the pose is centred on that axis.
 */
export const clampPose = (pose: CamPose, bounds: Rect, frameW: number, frameH: number): CamPose => {
  const hw = frameW / 2 / pose.zoom;
  const hh = frameH / 2 / pose.zoom;
  const cx = bounds.w <= 2 * hw ? bounds.x + bounds.w / 2 : Math.min(bounds.x + bounds.w - hw, Math.max(bounds.x + hw, pose.x));
  const cy = bounds.h <= 2 * hh ? bounds.y + bounds.h / 2 : Math.min(bounds.y + bounds.h - hh, Math.max(bounds.y + hh, pose.y));
  return { x: cx, y: cy, zoom: pose.zoom };
};
/** The smallest zoom at which the frame stays inside `bounds`. */
export const coverZoom = (bounds: Rect, frameW: number, frameH: number) => Math.max(frameW / bounds.w, frameH / bounds.h);

/* ---------- paths ---------- */

type View = [number, number, number]; // centre x, centre y, visible width (world units)

/**
 * Van Wijk & Nuij, "Smooth and efficient zooming and panning" (InfoVis 2003): the optimal path between two views,
 * the same construction d3-interpolate's interpolateZoom uses (ISC). Returns a function of the path parameter
 * u ∈ [0, 1], uniform in perceived distance; feed it an eased u for rest-to-rest moves.
 */
export function zoomPath(p0: View, p1: View, rho = Math.SQRT2): (u: number) => View {
  const [ux0, uy0, w0] = p0;
  const [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  const rho2 = rho * rho;
  const rho4 = rho2 * rho2;
  if (d2 < 1e-12) {
    const S = Math.log(w1 / w0) / rho;
    return (u) => [ux0 + u * dx, uy0 + u * dy, w0 * Math.exp(rho * u * S)];
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  const coshr0 = Math.cosh(r0);
  return (u) => {
    const s = u * S;
    const k = (w0 / (rho2 * d1)) * (coshr0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
    return [ux0 + k * dx, uy0 + k * dy, (w0 * coshr0) / Math.cosh(rho * s + r0)];
  };
}

/** Pose between two poses at eased progress `t` (0..1), along the chosen path. `viewW` is the frame width in px. */
export function blendPose(a: CamPose, b: CamPose, t: number, viewW: number, path: "smooth" | "direct" = "smooth", rho?: number): CamPose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (path === "direct") {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t),
    };
  }
  const f = zoomPath([a.x, a.y, viewW / a.zoom], [b.x, b.y, viewW / b.zoom], rho);
  const [x, y, w] = f(t);
  return { x, y, zoom: viewW / w };
}

/**
 * The camera on `frame`: it holds each key from its arrival until the next key's move starts, then travels into
 * that key over its `dur` frames. Keys must be sorted by `at`; a move may not start before the previous one has
 * arrived (checkCamKeys reports it).
 */
export function cameraAt(frame: number, keys: readonly CamKey[], fps: number, viewW: number): CamPose {
  const first = keys[0];
  if (!first) return { x: 0, y: 0, zoom: 1 };
  let pose: CamPose = first;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    const dur = Math.max(1, k.dur ?? sec(T.camera, fps));
    const start = k.at - dur;
    if (frame <= start) return pose;
    if (frame < k.at) {
      const t = (k.ease ?? EASE.camera)((frame - start) / dur);
      return blendPose(pose, k, t, viewW, k.path ?? "smooth", k.rho);
    }
    pose = k;
  }
  return pose;
}

/** Problems in a key list (empty when it is valid). */
export function checkCamKeys(keys: readonly CamKey[], fps: number, name = "camera"): string[] {
  const out: string[] = [];
  keys.forEach((k, i) => {
    if (!(k.zoom > 0)) out.push(`${name}[${i}]: zoom must be positive`);
    if (i === 0) return;
    const prev = keys[i - 1]!;
    const start = k.at - (k.dur ?? sec(T.camera, fps));
    if (k.at < prev.at) out.push(`${name}[${i}]: not sorted`);
    if (start < prev.at) out.push(`${name}[${i}]: its move starts on frame ${start}, before the previous key arrives (${prev.at})`);
  });
  return out;
}

/**
 * A plane at another depth (R5 §5.9: background 0.4×, UI 1×, foreground 1.15×): relative to a reference pose (where
 * every plane lines up), it travels `factor` times as far and zooms `factor` times as much in log space.
 */
export const planePose = (pose: CamPose, ref: CamPose, factor: number): CamPose =>
  factor === 1
    ? pose
    : {
        x: ref.x + (pose.x - ref.x) * factor,
        y: ref.y + (pose.y - ref.y) * factor,
        zoom: ref.zoom * Math.pow(pose.zoom / ref.zoom, factor),
      };
