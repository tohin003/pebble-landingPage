// The post-credit scene's stone (setpieces/coda.ts; D157, OVERRIDES §62): data only. The engine tests load every
// `*cues` export of a `*.cues.ts` file and check it (D5–D6): Pebble's own poses only, never an engine state.
//
// Times are SECONDS of the coda's own local time (the plan shifts them with the stone's clock, StoneSpec.clockOffset).
import type { PebbleCue } from "../../../../shared/pebble/cues";

/**
 * The coda: the Companion's own resting pose, `sleepy` (priority row 17, emotion "resting": half-lowered eyes, a 12°
 * lean swaying slowly, the two z's pulsing), from the shot's first frame. The engine is created in it, so no morph
 * plays: the stone is found asleep. Never the engine's catalogue `sleep` state (D6); the z's are avatarMotion's own cue.
 */
export const CODA_CUES: PebbleCue[] = [{ at: 0, pose: "sleepy", note: "the Companion's resting pose (row 17): found asleep, no morph" }];
