// What a frame of a plan shows, and how it moves, as the viewer sees it (fix round 2: the verifier's CR-04 and CR-15
// findings, 27 Oct). The camera floor (qa/checks.ts cameraFloor) measures the frame's corners, and a zoom anchored on
// the subject passed it while the subject sat still: the Drop's L05/L06 hold moved its corners 0.4 px a frame while the
// companion, the frame's subject, moved 0.04–0.09 and the reviewer's own measure read 0.07–0.15. These helpers look at
// the frame's CONTENT instead: the planes the plan draws (Pebble's windows, the stills and slots standing in for them),
// the cascade's cards, the wall's cells and the stone, each at its own parallax depth, topmost first, sampled on a grid
// of the frame. The ground (a soft, defocused riverbed) and film type in a fixed screen band are not the subject: type
// is designed to stay still while the world moves behind it (TREATMENT §5.2).
//
//   planeOpacityAt()   a plane's opacity on a frame: its own entrance, its swaps, the stills its take view shows
//   drawnItems()       every UI item a frame draws, back to front, with its frame rect and where a point of it goes on
//                      the next frame
//   contentMotion()    the median screen speed of the content under a grid of the frame (px a frame at 1080), the share
//                      of the frame it covers, and the content's mean velocity (its direction)
// Pure; no React.
import { E_MOVE, clamp01 } from "../motion/ease";
import { frameToWorld, planePose, worldToFrame, type Pose } from "../motion/camera";
import type { Point, Rect, Vec } from "../motion/geometry";
import { cascadeSchedule, swapLook } from "../type/Cascade";
import { askCardLook } from "../transitions/entrances";
import { apertureRect } from "../carrier/apertureMath";
import { rectInFrame } from "./frame";
import { cellAt } from "./wall";
import { sourceFrameAt, stillsAt } from "./take";
import { shotOf, type PlaneSpec, type ScenePlan, type ShotSpec } from "./scene";

/** A plane's opacity on a local frame of its shot: its window, its entrance, its swaps, its take view's stills. */
export function planeOpacityAt(p: ScenePlan, pl: PlaneSpec, fr: number): number {
  if (fr < (pl.from ?? -Infinity) || fr >= (pl.to ?? Infinity)) return 0;
  let o = 1;
  if (pl.enterAt !== undefined) {
    if (fr < pl.enterAt) return 0;
    o *= pl.enterKind === "fade" ? E_MOVE(clamp01((fr - pl.enterAt) / Math.round((20 * p.fps) / 60))) : askCardLook(fr, pl.enterAt, p.fps).opacity;
  }
  const swapN = Math.round((8 * p.fps) / 60);
  if (pl.swapInAt !== undefined) {
    if (fr < pl.swapInAt) return 0;
    o *= E_MOVE(clamp01((fr - pl.swapInAt) / swapN));
  }
  if (pl.swapOutAt !== undefined && fr >= pl.swapOutAt) o *= 1 - E_MOVE(clamp01((fr - pl.swapOutAt) / swapN));
  const c = pl.content;
  if (c.kind === "take") {
    const u = c.use;
    if (fr < u.at || fr >= u.until) return 0;
    const v = u.manifest.views[c.view];
    if (!v) return 0;
    if (u.manifest.pattern || v.slot) return o;
    const src = sourceFrameAt(fr, u.at, p.fps, u.manifest, u.inPoint);
    const shown = stillsAt(v, src);
    if (!shown.length) return 0;
    o *= Math.max(...shown.map((x) => (x.entrance ? askCardLook(Math.floor(((src - x.from) * p.fps) / u.manifest.fps), 0, p.fps).opacity : 1)));
  }
  return o;
}

/** One UI item a frame draws: its frame rect on `fr`, and where a frame point on it is on `fr + 1`. */
export interface DrawnItem {
  id: string;
  kind: "plane" | "card" | "cell" | "stone";
  /** frame px on `fr` (a disc's bounding box for the stone) */
  rect: Rect;
  /** a disc (the stone): its centre and radius, frame px */
  disc?: { c: Point; r: number };
  /** where the item's point under frame point `q` on `fr` is on `fr + 1` (frame px) */
  next: (q: Point) => Point;
}

const posesOf = (s: ShotSpec, fr: number): [Pose, Pose] => [s.camera.pose(fr - s.from), s.camera.pose(fr + 1 - s.from)];

/** Every UI item a local frame draws (opacity 0.5 or more), back to front: planes, cascade cards, wall cells, the stone. */
export function drawnItems(p: ScenePlan, fr: number, shot?: ShotSpec): DrawnItem[] {
  const s = shot ?? shotOf(p, fr);
  if (!s) return [];
  const { w, h } = p.frame;
  const [P0, P1] = posesOf(s, fr);
  const out: DrawnItem[] = [];
  const atDepth = (k: number) => [planePose(P0, s.ref, k), planePose(P1, s.ref, k)] as const;
  const mover = (k: number) => {
    const [a, b] = atDepth(k);
    return (q: Point) => worldToFrame(frameToWorld(q, a, w, h), b, w, h);
  };
  for (const pl of s.planes) {
    if (planeOpacityAt(p, pl, fr) < 0.5) continue;
    const k = pl.depth ?? 1;
    out.push({ id: pl.id, kind: "plane", rect: rectInFrame(pl.rect, atDepth(k)[0], p.frame), next: mover(k) });
  }
  if (s.cascade) {
    const c = s.cascade;
    const sched = cascadeSchedule(c.start, c.items, p.fps, c.beats, undefined, c.endAt);
    c.cards.forEach((card, i) => {
      const win = sched[i];
      if (!win) return;
      const look = i === 0 && fr < win.inEnd ? { opacity: 1 } : swapLook(win, fr, i === sched.length - 1);
      if (!look || look.opacity < 0.5) return;
      out.push({ id: card.id, kind: "card", rect: rectInFrame(card.rect, P0, p.frame), next: mover(1) });
    });
  }
  if (s.wall) {
    for (const cell of s.wall.cells) {
      const a = cellAt(cell, s.wall, fr, p.fps);
      if (a.opacity < 0.5) continue;
      const b = cellAt(cell, s.wall, fr + 1, p.fps);
      const [pa, pb] = atDepth(a.depth);
      const ra = rectInFrame(a.rect, pa, p.frame);
      const rb = rectInFrame(b.rect, pb, p.frame);
      // a point of the cell keeps its place in the cell (the cell orbits and shrinks as well as the camera moving)
      out.push({ id: `cell:${cell.id}`, kind: "cell", rect: ra, next: (q) => ({ x: rb.x + ((q.x - ra.x) / Math.max(1e-6, ra.w)) * rb.w, y: rb.y + ((q.y - ra.y) / Math.max(1e-6, ra.h)) * rb.h }) });
    }
  }
  if (s.stone) {
    const c = worldToFrame(s.stone.at, P0, w, h);
    const r = s.stone.r * P0.zoom;
    out.push({ id: "stone", kind: "stone", rect: { x: c.x - r, y: c.y - r, w: 2 * r, h: 2 * r }, disc: { c, r }, next: mover(1) });
  }
  return out;
}

const inItem = (it: DrawnItem, q: Point): boolean => (it.disc ? Math.hypot(q.x - it.disc.c.x, q.y - it.disc.c.y) <= it.disc.r : q.x >= it.rect.x && q.x < it.rect.x + it.rect.w && q.y >= it.rect.y && q.y < it.rect.y + it.rect.h);

/** The probe grid of a frame: about 30 points along its long side. */
export const probeGrid = (w: number, h: number, long = 30): Point[] => {
  const nx = w >= h ? long : Math.max(4, Math.round((long * w) / h));
  const ny = w >= h ? Math.max(4, Math.round((long * h) / w)) : long;
  const pts: Point[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push({ x: ((i + 0.5) * w) / nx, y: ((j + 0.5) * h) / ny });
  return pts;
};

export interface ContentMotion {
  /** the median screen speed of the content under the grid, px a frame at 1080 (null: no content) */
  median: number | null;
  /** the share of the grid's points that show UI content */
  cover: number;
  /** the content's mean velocity, px a frame at 1080 (its direction) */
  mean: Vec;
  /** the speed of the fastest corner of the frame under the UI plane's camera, px a frame at 1080 */
  corner: number;
}

/**
 * How the content of a local frame moves to the next: at each point of a grid of the frame, the topmost UI item drawn
 * there (a plane at its depth, a cascade card, a wall cell with its own orbit, the stone), and how far that point of it
 * moves; the median over the points that show content.
 */
export function contentMotion(p: ScenePlan, fr: number, grid: readonly Point[] = probeGrid(p.frame.w, p.frame.h), shot?: ShotSpec): ContentMotion {
  const s = shot ?? shotOf(p, fr);
  const { w, h, unit } = p.frame;
  if (!s) return { median: null, cover: 0, mean: { x: 0, y: 0 }, corner: 0 };
  const items = drawnItems(p, fr, s);
  // the aperture's opaque bands (the Drop's narrow frame) hide what is under them
  const ap = s.aperture ? apertureRect(w, h, s.aperture.open(fr), s.aperture.centerY) : null;
  const speeds: number[] = [];
  let mx = 0;
  let my = 0;
  let seen = 0;
  for (const q of grid) {
    if (ap && (q.y < ap.y || q.y >= ap.y + ap.h)) continue;
    seen++;
    let top: DrawnItem | undefined;
    for (let i = items.length - 1; i >= 0; i--) if (inItem(items[i]!, q)) {
      top = items[i];
      break;
    }
    if (!top) continue;
    const n = top.next(q);
    speeds.push(Math.hypot(n.x - q.x, n.y - q.y) / unit);
    mx += (n.x - q.x) / unit;
    my += (n.y - q.y) / unit;
  }
  speeds.sort((a, b) => a - b);
  const [P0, P1] = posesOf(s, fr);
  let corner = 0;
  for (const c of [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }]) {
    const n = worldToFrame(frameToWorld(c, P0, w, h), P1, w, h);
    corner = Math.max(corner, Math.hypot(n.x - c.x, n.y - c.y) / unit);
  }
  const k = speeds.length;
  return {
    median: k ? (k % 2 ? speeds[(k - 1) / 2]! : (speeds[k / 2 - 1]! + speeds[k / 2]!) / 2) : null,
    cover: k / Math.max(1, seen),
    mean: k ? { x: mx / k, y: my / k } : { x: 0, y: 0 },
    corner,
  };
}
