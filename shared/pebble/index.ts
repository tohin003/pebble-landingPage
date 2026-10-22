// The Pebble character, shared by the site (`@pebble/index`) and the video project (`../../shared/pebble`).
// Plain TypeScript with no imports from outside this folder: no React, no Remotion, no DOM.
//
// Credit: the character engine is bloub by Jérémy Perret (MIT), vendored in ./bloub with its LICENSE. The pose table,
// body motion and pointer gaze come from Pebble 1.0.1 (Apache-2.0). See README.md in this folder.

export { BotEngine } from "./bloub/engine";
export type { BotFrame, Look, RenderedEye } from "./bloub/engine";
export { EXPRESSION_BY_ID } from "./bloub/expressions";
export type { BotExpression, ExpressionId } from "./bloub/expressions";
export { liveliness } from "./bloub/face";
export { SHAPE_BY_ID } from "./bloub/skins";
export type { StateId } from "./bloub/states";

export { avatarMotion, CUE_HZ } from "./avatarMotion";
export { ALIASES, POSES, TAP_MS, poseId, visualFor } from "./companionState";
export type { PoseId, Visual } from "./companionState";
export { GAZE_STEPS, REACH_PX, gazeToward, lookFor, quantize, sameGaze } from "./gaze";
export type { Box, Gaze } from "./gaze";

export {
  BODY,
  CATALOGUE_STATES,
  GALET,
  HOLD_SECONDS,
  MAX_FPS,
  PEBBLE_ENGINE_STATES,
  PEBBLE_SCALE,
  STATIC_AT,
  VIEWBOX,
  VIEWBOX_SIZE,
  applyPose,
  createPebbleEngine,
  eyesOpenFrom,
  settleDelay,
  staticTime,
  staticView,
} from "./character";
export type { PebbleMotion, PebbleView } from "./character";
export { assertCues, blinkFreeOffset, blinkStarts, checkCues, pebbleAt, replayAt, snapToBlink } from "./cues";
export type { PebbleCue } from "./cues";
export { LivePebble, MAX_STEP, RESTART_BY, RESTART_FROM, closestEarlyTime } from "./live";
