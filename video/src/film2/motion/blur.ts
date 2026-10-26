// Motion blur matched to speed (TREATMENT §5.5 rule 3; CRAFT S03): a 180° shutter smears half of each frame's travel,
// which is a Gaussian of σ ≈ travel ÷ 7 along the motion (L = travel/2, σ = L/√12 ≈ travel/6.9). No cap that leaves
// the fastest frames under-blurred: the old film's σ = min(12, travel/16), switched off above 400 px a frame, strobed.
// Below the reading speed nothing blurs, so text being read stays sharp.
import { CAMERA, TRANSITION, speed60 } from "../tokens";
import type { Vec } from "./geometry";

/** σ (px) for a travel of `pxPerFrame` at a 180° shutter. */
export const sigmaForTravel = (pxPerFrame: number): number => Math.abs(pxPerFrame) * TRANSITION.momentum.blurPerTravel;

/**
 * The blur a moving layer should carry: none at or below the reading speed (4.6 px a frame at 60 fps, where the
 * full σ would be 0.66 px and only soften text), then σ = travel ÷ 7. The step at the threshold is 0.66 px of σ,
 * below what the eye resolves, and it keeps the audit's rule exact.
 */
export const blurForTravel = (pxPerFrame: number, fps: number): number => {
  const s = Math.abs(pxPerFrame);
  return s <= speed60(CAMERA.readMaxPxPerFrame, fps) ? 0 : sigmaForTravel(s);
};

/** Axis-aligned components of a directional blur for a 2D velocity (SVG feGaussianBlur takes "σx σy"). */
export const directionalSigma = (v: Vec, fps: number): { sx: number; sy: number; sigma: number } => {
  const speed = Math.hypot(v.x, v.y);
  const sigma = blurForTravel(speed, fps);
  if (speed < 1e-9) return { sx: 0, sy: 0, sigma: 0 };
  return { sx: (sigma * Math.abs(v.x)) / speed, sy: (sigma * Math.abs(v.y)) / speed, sigma };
};

/**
 * The hybrid for whips and dives (CRAFT §5.4, measured): CameraMotionBlur at 8 samples over a small directional blur
 * of σ = travel ÷ 55, which fills the gaps between samples. CameraMotionBlur alone steps at whip speed.
 */
export const hybridGapSigma = (pxPerFrame: number): number => Math.abs(pxPerFrame) / 55;

/** The audit rule (§5.5): applied σ ≥ 0.8 × travel ÷ 7 wherever travel exceeds the reading speed. */
export const blurIsEnough = (appliedSigma: number, pxPerFrame: number, fps: number, ratio = 0.8): boolean =>
  Math.abs(pxPerFrame) <= speed60(CAMERA.readMaxPxPerFrame, fps) || appliedSigma >= ratio * sigmaForTravel(pxPerFrame) - 1e-6;

/** CameraMotionBlur's settings for the foreground (TOOLS_TESTS §2.4): 8 samples, a 180° shutter. */
export const CAMERA_BLUR = { samples: 8, shutterAngle: 180 } as const;
