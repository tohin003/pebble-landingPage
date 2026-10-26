// THE WALL (TREATMENT §3.8, S25): every feature cell at once, on three concentric rings around the stone (inner 8,
// middle 8, outer 12), not a grid (bento grids and card grids are on the brand's never-list). The cells are made to be
// SEEN, not read: on screen their text stays far under the reading floor, and they make no claim. Each cell plays at 1×
// or holds still (lead ruling L3b); the placeholders hold still (setpieces/standins.ts CELL_SOURCES, thumbnails of
// published captures). No Stealth cell, ever, so the wall never shows the Veil or ⌃⌥⌘H without the honest line.
//
// The camera is calm: a pull-back in log space from the inner ring to the whole wall, easing into a slow drift, while
// the rings orbit slowly (alternate directions, ≤ 2° a second). In 9:16 the rings are cropped by the frame on purpose
// (§3.12). The convergence (setpieces/finale.ts) moves the same cells inward along their rings into the stone.
// Pure data.
import { f60, sec } from "../tokens";
import { E_LEAVE, clamp01 } from "../motion/ease";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import type { Point, Rect } from "../motion/geometry";
import { place, type MusicGrid } from "./music";
import { fitPose, frameBox, type FrameBox } from "./frame";
import { CELL_SOURCES, STEALTH_FEATURES, cellThumbPath } from "./standins";
import { WALL_CUES } from "./pieces.cues";
import { anchored, musicHit } from "./kit";
import { move, type MusicHit, type ScenePlan } from "./scene";
import { STONE_R } from "./world";

export interface WallCell {
  id: string;
  feature: string;
  ring: 0 | 1 | 2;
  src: string;
  /** world size (the thumbnail's own aspect, never stretched) */
  w: number;
  h: number;
  /** its angle on the ring at frame 0, degrees */
  angle0: number;
}

export interface WallSpec {
  centre: Point;
  cells: readonly WallCell[];
  /** ring radii, world units */
  radii: readonly [number, number, number];
  /** orbit speeds, degrees a second (alternating directions) */
  orbit: readonly [number, number, number];
  /** parallax depth per ring (the outer ring a touch nearer) */
  depth: readonly [number, number, number];
  /** the convergence: from this local frame the cells travel inward along their rings and shrink into the stone */
  converge?: { at: number; frames: number; turnDeg: number };
  /** frames the rings have already orbited (a piece that continues the wall keeps its clock) */
  t0?: number;
}

export const WALL_GEOMETRY = {
  radii: [640, 1100, 1580] as const,
  longSide: [380, 290, 240] as const,
  orbit: [1.6, -1.1, 0.8] as const,
  depth: [1, 1.025, 1.06] as const,
  /** where each ring's first cell sits, degrees (offset so no two rings line up) */
  start: [-90, -67.5, -75] as const,
};

/** The 28 cells, placed on their rings. */
export function wallCells(): WallCell[] {
  const byRing = [0, 1, 2].map((r) => CELL_SOURCES.filter((c) => c.ring === r));
  const out: WallCell[] = [];
  byRing.forEach((cells, r) => {
    cells.forEach((c, i) => {
      const long = WALL_GEOMETRY.longSide[r]!;
      const k = long / Math.max(c.crop.w, c.crop.h);
      out.push({ id: c.id, feature: c.feature, ring: r as 0 | 1 | 2, src: cellThumbPath(c.id), w: c.crop.w * k, h: c.crop.h * k, angle0: WALL_GEOMETRY.start[r]! + (i * 360) / cells.length });
    });
  });
  return out;
}

/**
 * A cell's world rect, opacity and depth on a local frame: on its ring at its orbit angle; in the convergence it
 * travels inward along a spiral (its angle keeps turning) and shrinks into the stone on E-leave, accelerating, gone just
 * before contact (as a ring's return is).
 */
export function cellAt(cell: WallCell, spec: WallSpec, frame: number, fps: number): { rect: Rect; opacity: number; depth: number } {
  const t = (frame + (spec.t0 ?? 0)) / fps;
  let angle = cell.angle0 + spec.orbit[cell.ring]! * t;
  let r = spec.radii[cell.ring]!;
  let scale = 1;
  let opacity = 1;
  if (spec.converge && frame >= spec.converge.at) {
    const u = clamp01((frame - spec.converge.at) / spec.converge.frames);
    const e = E_LEAVE(u);
    r = r * (1 - e) + STONE_R * 0.5 * e;
    angle += spec.converge.turnDeg * e * (cell.ring % 2 === 0 ? 1 : -1);
    scale = Math.max(0.02, 1 - 0.97 * e);
    opacity = 1 - clamp01((u - 0.82) / 0.14);
  }
  const a = (angle * Math.PI) / 180;
  const cx = spec.centre.x + r * Math.cos(a);
  const cy = spec.centre.y + r * Math.sin(a);
  const w = cell.w * scale;
  const h = cell.h * scale;
  return { rect: { x: cx - w / 2, y: cy - h / 2, w, h }, opacity, depth: spec.depth[cell.ring]! };
}

/**
 * The largest text a cell shows on screen, px at 1080, under a zoom (the thumbnails' captures carry ~11–15 px text).
 * `worldW` is the cell's drawn width (it shrinks as it converges); default its size on its ring.
 */
export const cellTextPx = (cell: WallCell, zoom: number, f: FrameBox, sourceTextCss = 15, worldW = cell.w): number => {
  const src = CELL_SOURCES.find((c) => c.id === cell.id)!;
  const k = worldW / src.crop.w;
  return (sourceTextCss * k * zoom) / f.unit;
};

export interface WallOptions {
  w: number;
  h: number;
  fps: number;
  grid?: MusicGrid;
  /** the wall's centre (the stone), world units */
  centre?: Point;
  /** continue a camera; default the wall's own pull-back from the inner ring */
  entry?: { pose: Pose; vel: CamVel };
  /** at least this long (the pull-back and a hold to see the whole wall), then the next bar line */
  minS?: number;
}

/** The wall's framings: the inner ring, and the whole wall (9:16 frames its height and crops the sides). */
export const wallFramings = (f: FrameBox, centre: Point) => {
  const R = WALL_GEOMETRY.radii;
  const L = WALL_GEOMETRY.longSide;
  const inner = { x: centre.x - R[0] - L[0] / 2, y: centre.y - R[0] - L[0] / 2, w: 2 * R[0] + L[0], h: 2 * R[0] + L[0] };
  const whole = { x: centre.x - R[2] - L[2] / 2, y: centre.y - R[2] - L[2] / 2, w: 2 * R[2] + L[2], h: 2 * R[2] + L[2] };
  const full = { x: 0, y: 0, w: f.w, h: f.h };
  const near = fitPose(inner, full, f, 0.98);
  let far = fitPose(whole, full, f, 0.96);
  if (f.aspect === "9:16") far = fitPose({ ...whole, x: centre.x - whole.h * 0.28, w: whole.h * 0.56 }, full, f, 0.98);
  return { near, far };
};

/** The plan of the wall for one aspect. */
export function planWall(o: WallOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const centre = o.centre ?? { x: 0, y: 0 };
  const music: MusicHit[] = [];
  const cells = wallCells();
  if (cells.some((c) => (STEALTH_FEATURES as readonly string[]).includes(c.feature))) throw new Error("the wall holds a Stealth cell: never");
  const spec: WallSpec = { centre, cells, radii: WALL_GEOMETRY.radii, orbit: WALL_GEOMETRY.orbit, depth: WALL_GEOMETRY.depth };
  const { near, far } = wallFramings(f, centre);

  // the pull-back: 150 frames in log space from the inner ring to the whole wall, easing into a slow drift outward
  const pullFrames = f60(150, fps);
  const cam = new VelocityCamera(o.entry?.pose ?? near, o.entry?.vel ?? { lz: -0.0006 });
  const meanLz = Math.log(far.zoom / (o.entry?.pose.zoom ?? near.zoom)) / pullFrames;
  cam.hermite(pullFrames, far, { lz: meanLz * 0.25 });
  const earliestEnd = Math.max(pullFrames + sec(1.6, fps), sec(o.minS ?? 4, fps));
  const endP = place(earliestEnd, o.grid, { level: "bar", maxWait: sec(2.5, fps) });
  const end = endP.point ?? earliestEnd;
  music.push(musicHit("the wall ends (the convergence starts)", endP));
  cam.glide(end, f60(40, fps), { lz: -0.00028 });

  return {
    id: "wall",
    name: `Wall ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      {
        id: "wall",
        from: 0,
        to: end,
        kind: "cutscene",
        camera: cam,
        ref: o.entry?.pose ?? near,
        ground: "riverbed",
        planes: [],
        wall: spec,
        stone: { at: centre, r: STONE_R, size: 148, cues: anchored(WALL_CUES, 0, "the wall's cues") },
        rings: [],
        dofScale: 8,
      },
    ],
    seams: [],
    types: [],
    lightInitial: "evening",
    lightCues: [],
    leaks: [],
    hits: [],
    takes: [],
    music,
    moves: [move("push", 0, pullFrames, "the pull-back to the whole wall")],
    exit: { pose: cam.pose(end), vel: cam.sample(end).vel, shot: "wall", ref: o.entry?.pose ?? near },
    extra: { cells: cells.length, near, far },
  };
}
