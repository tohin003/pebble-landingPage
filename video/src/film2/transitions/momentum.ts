// Kind 2, the momentum cut (TREATMENT §5.1; CRAFT T01): a hard cut inside continuous motion. The outgoing shot
// accelerates into the cut on E-leave over 12–24 frames (60 fps); the incoming shot is already moving in the same
// screen direction at the same speed (±25 %, directions within 30°), then lands on E-arrive or glides (τ 15–30).
// σ = travel ÷ 7 on the frames that touch the cut. No cut between two rests.
//
// momentumCut() builds both cameras so the hand-off is exact by construction, and returns the seam record the
// validators check (qa/checks.ts cutAudit).
import { TRANSITION, f60 } from "../tokens";
import { E_LEAVE } from "../motion/ease";
import { arriveWithMomentum, screenVelocity, toPose, type Pose, type VelocityCamera } from "../motion/camera";
import type { Vec } from "../motion/geometry";

export interface MomentumCutPlan {
  /** the outgoing shot's camera (its E-leave is appended here) */
  out: VelocityCamera;
  /** the outgoing shot's local frame on which the cut falls (its last frame + 1) */
  cutFrame: number;
  /** the screen direction the content leaves in (e.g. {x: -1, y: 0}: the picture moves left) */
  dir: Vec;
  /** the screen distance the outgoing E-leave covers, px */
  dPx: number;
  /** frames of the E-leave (12–24 at 60 fps) */
  leaveFrames?: number;
  /** the incoming shot's landing framing */
  target: Pose;
  /** frames the incoming arrival takes */
  inFrames: number;
  mode?: "arrive" | "glide";
  tau?: number;
  frameW: number;
  frameH: number;
  fps: number;
}

export interface MomentumSeam {
  /** screen velocity of the frame's centre on the outgoing shot's last frame, px per frame */
  vOut: Vec;
  /** ... and on the incoming shot's first frame */
  vIn: Vec;
  inCam: VelocityCamera;
}

export function momentumCut(p: MomentumCutPlan): MomentumSeam {
  const leaveFrames = p.leaveFrames ?? f60(18, p.fps);
  const [lo, hi] = TRANSITION.momentum.leaveFrames;
  if (leaveFrames < f60(lo, p.fps) || leaveFrames > f60(hi, p.fps)) {
    throw new Error(`momentumCut: an E-leave runs 12–24 frames at 60 fps (${f60(lo, p.fps)}–${f60(hi, p.fps)} here), not ${leaveFrames}`);
  }
  const leaveStart = p.cutFrame - 1 - leaveFrames;
  if (p.out.end().frame > leaveStart) {
    throw new Error(`momentumCut: the outgoing camera already runs to frame ${p.out.end().frame}, past the E-leave's start (${leaveStart})`);
  }
  // coast at the current velocity up to the leave (a shot that already drifts keeps drifting: it never rests), then
  // accelerate out on E-leave
  if (p.out.end().frame < leaveStart) p.out.glide(leaveStart, f60(24, p.fps), p.out.end().vel);
  const startPose = toPose(p.out.end().state);
  const n = Math.hypot(p.dir.x, p.dir.y) || 1;
  const wx = (-p.dir.x / n) * (p.dPx / startPose.zoom);
  const wy = (-p.dir.y / n) * (p.dPx / startPose.zoom);
  p.out.ease(p.cutFrame - 1, { x: startPose.x + wx, y: startPose.y + wy, zoom: startPose.zoom }, E_LEAVE);
  const c = { x: p.frameW / 2, y: p.frameH / 2 };
  const vOut = screenVelocity(p.out.sample(p.cutFrame - 1), c, p.frameW, p.frameH);
  const inCam = arriveWithMomentum({ target: p.target, frames: p.inFrames, vScreen: vOut, mode: p.mode, tau: p.tau });
  const vIn = screenVelocity(inCam.sample(0), c, p.frameW, p.frameH);
  return { vOut, vIn, inCam };
}

/** The incoming distance for an E-arrive after an E-leave of the same length: 0.68 × (4.25/6.25). */
export const MOMENTUM_RATIO = E_LEAVE.v1 / 6.25;
