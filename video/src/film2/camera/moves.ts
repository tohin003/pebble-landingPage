// The camera's moves over the UI (TREATMENT §5.3, §5.1 kind 4), as builders on a VelocityCamera. Each move starts
// with the shot (never late, never a slow creep added at the end: HyperFrames lists that as a generated tell), carries
// velocity in and out, and settles into a glide drifting ≤ 1 px a frame while the UI acts.
//
//   pushIn    1.00 → 1.06–1.15 in log space over 90–240 frames (60 fps), on E-move from rest, or carried from a cut
//   pullBack  out in log space, easing into a glide (it never stops dead)
//   dolly     toward a place: a Hermite pan with a zoom change; parallax planes make it a dolly, not a zoom
//   crane     a vertical rise (or fall) with a slight pull-back, continuous
//   travelTo  a ring-led move of 0.7–1.4 s that arrives with momentum, then glides (reading starts in the glide)
//   leave     accelerate out on E-leave into a cut (12–24 frames)
//
// Pure (no React): the demo, the set pieces and the validators build the same cameras.
import { CAMERA, TRANSITION, f60, sec } from "../tokens";
import { E_LEAVE, E_MOVE } from "../motion/ease";
import { toPose, type CamVel, type Pose, type VelocityCamera } from "../motion/camera";

const endPose = (cam: VelocityCamera): Pose => toPose(cam.end().state);

/** A push-in by `factor` (1.06–1.15) over `frames` (90–240 at 60 fps), from rest on E-move. */
export const pushIn = (cam: VelocityCamera, toFrame: number, factor = 1.1, aim?: { x: number; y: number }): VelocityCamera => {
  const p = endPose(cam);
  return cam.ease(toFrame, { x: aim?.x ?? p.x, y: aim?.y ?? p.y, zoom: p.zoom * factor }, E_MOVE);
};

/**
 * A push-in carried across a cut: it starts at the current velocity (the incoming shot's) and lands on a slow drift
 * in zoom, so the push never starts from rest and never stops dead.
 */
export const pushInCarried = (cam: VelocityCamera, toFrame: number, factor = 1.1, driftLzPerFrame = 0.00004, aim?: { x: number; y: number }): VelocityCamera => {
  const p = endPose(cam);
  return cam.hermite(toFrame, { x: aim?.x ?? p.x, y: aim?.y ?? p.y, zoom: p.zoom * factor }, { lz: driftLzPerFrame });
};

/** A pull-back by `factor` (< 1), easing into a glide of time constant `tau` that runs to `glideTo`. */
export const pullBack = (cam: VelocityCamera, toFrame: number, factor: number, glideTo: number, fps: number, aim?: { x: number; y: number }): VelocityCamera => {
  const p = endPose(cam);
  const frames = toFrame - cam.end().frame;
  // leave the pull-back still moving out (a quarter of its mean speed) so the glide has something to settle
  const meanLz = Math.log(factor) / frames;
  cam.hermite(toFrame, { x: aim?.x ?? p.x, y: aim?.y ?? p.y, zoom: p.zoom * factor }, { lz: meanLz * 0.35 });
  return cam.glide(glideTo, sec(0.4, fps), { lz: meanLz * 0.02 });
};

/** A dolly toward `to` (a place and its framing), arriving with momentum `arriveVel` (per frame), then a glide. */
export const dolly = (cam: VelocityCamera, toFrame: number, to: Pose, glideTo: number, fps: number, arriveVel?: Partial<CamVel>, drift?: Partial<CamVel>): VelocityCamera => {
  cam.hermite(toFrame, to, arriveVel);
  return cam.glide(glideTo, sec(0.35, fps), drift);
};

/**
 * A crane: a continuous vertical move by `dy` world units with a slight pull-back (`zoomFactor` < 1 rises away from the
 * subject). It keeps moving at its end, then glides: a crane in a launch film never lands with a stop.
 */
export const crane = (cam: VelocityCamera, toFrame: number, dy: number, zoomFactor: number, glideTo: number, fps: number): VelocityCamera => {
  const p = endPose(cam);
  const frames = toFrame - cam.end().frame;
  cam.hermite(toFrame, { x: p.x, y: p.y + dy, zoom: p.zoom * zoomFactor }, { y: (dy / frames) * 0.3, lz: (Math.log(zoomFactor) / frames) * 0.3 });
  return cam.glide(glideTo, sec(0.4, fps));
};

/**
 * The ring-led arrival: travel to `to` over 0.7–1.4 s, arriving with momentum (the incoming speed decays in a glide of
 * τ = 0.25–0.5 s that ends on the framing), so reading begins in a slow drift, never after a dead stop. The Hermite
 * lands `coast` short of the framing at the glide's start speed; the glide covers the rest.
 */
export const travelTo = (cam: VelocityCamera, toFrame: number, to: Pose, glideTo: number, fps: number, opts: { arriveSpeedPxPerFrame?: number; tauS?: number } = {}): VelocityCamera => {
  const start = endPose(cam);
  const tau = sec(opts.tauS ?? 0.35, fps);
  const dx = to.x - start.x;
  const dy = to.y - start.y;
  const d = Math.hypot(dx, dy);
  // the speed at the hand-off from travel to glide, in world units per frame (screen px ÷ zoom)
  const vScreen = opts.arriveSpeedPxPerFrame ?? (8 * 60) / fps;
  const v = d > 1e-6 ? Math.min(vScreen / to.zoom, d / Math.max(1, toFrame - cam.end().frame)) : 0;
  const ux = d > 1e-6 ? dx / d : 0;
  const uy = d > 1e-6 ? dy / d : 0;
  const coast = v * tau * (1 - Math.exp(-(glideTo - toFrame) / tau));
  const handOff: Pose = { x: to.x - ux * coast, y: to.y - uy * coast, zoom: to.zoom };
  cam.hermite(toFrame, handOff, { x: ux * v, y: uy * v, lz: 0 });
  return cam.glide(glideTo, tau, { x: 0, y: 0, lz: 0 });
};

/** Accelerate out of the shot into a cut, over 12–24 frames (60 fps) on E-leave, by a screen distance `dPx`. */
export const leave = (cam: VelocityCamera, toFrame: number, dir: { x: number; y: number }, dPx: number, lzChange = 0): VelocityCamera => {
  const p = endPose(cam);
  const n = Math.hypot(dir.x, dir.y) || 1;
  // the camera moves opposite to the content: content leaving left means the camera moves right
  const wx = (-dir.x / n) * (dPx / p.zoom);
  const wy = (-dir.y / n) * (dPx / p.zoom);
  return cam.ease(toFrame, { x: p.x + wx, y: p.y + wy, zoom: p.zoom * Math.exp(lzChange) }, E_LEAVE);
};

/** The screen speed (px per frame) an E-leave of `dPx` over `frames` reaches at the cut: 4.25 × the mean. */
export const leaveExitSpeed = (dPx: number, frames: number): number => (dPx / frames) * E_LEAVE.v1;

/** Frame counts for a 60 fps number at this fps (re-exported for move planning). */
export const frames60 = f60;

/** The limits a move must respect (for planning). */
export const MOVE_LIMITS = {
  readPx: CAMERA.readMaxPxPerFrame,
  travelPx: CAMERA.travelMaxPxPerFrame,
  pushFrames: TRANSITION.push.frames,
  pushScale: TRANSITION.push.scale,
  leaveFrames: TRANSITION.momentum.leaveFrames,
} as const;
