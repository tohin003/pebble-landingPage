// The riverbed ground's extent and depth, read by the picture and by the coverage check alike (CR-02). The ground is a
// parallax plane at RIVERBED.depth; PieceView draws the Riverbed over `groundRectOf()`, and setpieces/qa.ts
// groundCoverage() requires the frame's four corners to stay inside that rect on every frame. Where nothing is drawn
// the world shows the flat riverbedMid colour, so a corner outside the rect shows the image's straight edge and a flat
// band (the review saw it for about 7 s in the wall).
//
// The general rule (CR-02, OVERRIDES §55): each shot's ground is sized from its own widest pose. groundRectOf() walks
// every frame the shot renders (its transition out included), takes the union of the ground plane's view, pads it by
// 5 % and grows it to the riverbed's own 1.6:1 (never stretched), at least RIVERBED.w wide. Two shots that join without
// a cut share one rect (`ShotSpec.groundRect`, set where one piece continues another: setpieces/joins.ts).
// Pure.
import { CAMERA } from "../tokens";
import { planePose, type Pose, type VelocityCamera } from "../motion/camera";
import type { Rect } from "../motion/geometry";

/** The riverbed's least size (world units of its plane at the ref pose; the image is 1.6:1) and its parallax depth. */
export const RIVERBED = { w: 3400, h: 3400 / 1.6, aspect: 1.6, depth: CAMERA.depthFactor.ground, margin: 0.05 } as const;

/** The riverbed's rect centred on a pose, at its least size (a shot with no camera to walk). */
export const riverbedRect = (ref: Pose): Rect => ({ x: ref.x - RIVERBED.w / 2, y: ref.y - RIVERBED.h / 2, w: RIVERBED.w, h: RIVERBED.h });

/** What a shot needs to size its ground: its frames, camera and parallax ref (a ScenePlan's ShotSpec has them). */
export interface GroundShot {
  from: number;
  to: number;
  camera: VelocityCamera;
  ref: Pose;
  groundRect?: Rect;
}

/** The ground plane's view on one of a shot's local frames (world units of the ground plane). */
export const groundView = (camera: VelocityCamera, ref: Pose, localFrame: number, w: number, h: number): Rect => {
  const gp = planePose(camera.pose(localFrame), ref, RIVERBED.depth);
  const hw = w / 2 / gp.zoom;
  const hh = h / 2 / gp.zoom;
  return { x: gp.x - hw, y: gp.y - hh, w: 2 * hw, h: 2 * hh };
};

/** The union of the ground's views over a shot's local frames [0, frames). */
export const groundNeed = (camera: VelocityCamera, ref: Pose, frames: number, w: number, h: number): Rect => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let fr = 0; fr < Math.max(1, frames); fr++) {
    const v = groundView(camera, ref, fr, w, h);
    x0 = Math.min(x0, v.x);
    y0 = Math.min(y0, v.y);
    x1 = Math.max(x1, v.x + v.w);
    y1 = Math.max(y1, v.y + v.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** The smallest 1.6:1 rect, at least RIVERBED.w wide, that covers `need` padded by the margin. */
export const riverbedCovering = (need: Rect): Rect => {
  const nw = need.w * (1 + 2 * RIVERBED.margin);
  const nh = need.h * (1 + 2 * RIVERBED.margin);
  const w = Math.max(RIVERBED.w, nw, nh * RIVERBED.aspect);
  const h = w / RIVERBED.aspect;
  const cx = need.x + need.w / 2;
  const cy = need.y + need.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

/** The union of two rects. */
export const unionOf = (a: Rect, b: Rect): Rect => {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, w: Math.max(a.x + a.w, b.x + b.w) - x0, h: Math.max(a.y + a.h, b.y + b.h) - y0 };
};

const cache = new WeakMap<object, Rect>();

/**
 * The riverbed rect of a shot (world units of its ground plane): its own `groundRect` when a join set one, else sized
 * from every frame it renders, [from, to + `extraFrames`) (a transition out keeps the outgoing shot rendering).
 */
export const groundRectOf = (shot: GroundShot, w: number, h: number, extraFrames = 0): Rect => {
  if (shot.groundRect) return shot.groundRect;
  const hit = cache.get(shot);
  if (hit) return hit;
  const r = riverbedCovering(groundNeed(shot.camera, shot.ref, shot.to - shot.from + extraFrames, w, h));
  cache.set(shot, r);
  return r;
};
