// The Pebble character as the site and the films use it: the bloub engine set up the way Pebble's Avatar.vue sets it
// up (galet body, radius 65 in a 220-unit viewBox, one expression per pose), plus the rules both renderers share.
// Pure TypeScript with no imports from outside shared/pebble, so the site, the video project and bun can all load it.
import { BotEngine, type BotFrame } from "./bloub/engine";
import { EXPRESSION_BY_ID } from "./bloub/expressions";
import { liveliness } from "./bloub/face";
import { SHAPE_BY_ID } from "./bloub/skins";
import { avatarMotion } from "./avatarMotion";
import { visualFor, type PoseId } from "./companionState";

/** Body radius in viewBox units (Pebble: `new BotEngine(65, …)`). */
export const PEBBLE_SCALE = 65;
/** The viewBox every renderer uses (Avatar.vue). The margin above the head holds the cues (y ≈ −76…−81). */
export const VIEWBOX = "-110 -110 220 220";
export const VIEWBOX_SIZE = 220;

/**
 * The galet profile. Always pass THIS array, never a copy: the eye-fit table in bloub/eyefit.ts is keyed by the
 * array's identity, and a copy silently loses the eye offset.
 */
export const GALET: number[] = SHAPE_BY_ID.get("galet")!.radii;

/** The only engine states Pebble shows (`companionState.ts` POSES): decision D6. */
export const PEBBLE_ENGINE_STATES = ["idle", "alert", "notify"] as const;
/**
 * The engine's catalogue states. They imitate the reference avatar most directly, so the site and the films never show
 * them (D6). Note that Pebble's own `thinking` POSE is fine: it maps to the `idle` engine state plus thought dots.
 */
export const CATALOGUE_STATES = [
  "thinking", "wink", "wide", "exclaim", "sleep", "egg", "hexagon", "play", "orbit", "swirl", "burst", "comet",
] as const;

/** Calm (`hold`) poses settle to a still frame after this long without input (Avatar.vue HOLD_SECONDS). */
export const HOLD_SECONDS = 8;
/** Frame-rate cap of an animated pebble (Avatar.vue). */
export const MAX_FPS = 30;
/** Time of the static frame: the eyes are open and the first blink (1.4 s) has not started (MASTER_PLAN §4.2). */
export const STATIC_AT = 1.0;

export type PebbleMotion = ReturnType<typeof avatarMotion>;
export interface PebbleView {
  frame: BotFrame;
  motion: PebbleMotion;
  /** true for a settled still frame (it also pins the orbit cue at −30°, as Avatar.vue does) */
  still: boolean;
}

/** A fresh engine already showing `pose`, with no morph from anything before it. */
export function createPebbleEngine(pose: PoseId = "idle"): BotEngine {
  const v = visualFor(pose);
  return new BotEngine(PEBBLE_SCALE, v.engine, GALET, EXPRESSION_BY_ID.get(v.expression) ?? null);
}

/** Switch an engine to `pose` at time `t` (seconds), exactly as Avatar.vue's pose() does. */
export function applyPose(engine: BotEngine, pose: PoseId, t: number): void {
  const v = visualFor(pose);
  engine.setState(v.engine, t);
  engine.setExpression(EXPRESSION_BY_ID.get(v.expression) ?? null, t);
}

/**
 * Seconds after a pose change until its morphs are over: 0.45 s for the face (0.6 s with margin, the plan's
 * MIN_BLOCK), and 2.5 s for the engine's alert and notify states, whose glyph runs until 2.0 s (Avatar.vue settles every
 * still 2.5 s after the change).
 */
export function settleDelay(pose: PoseId): number {
  return visualFor(pose).engine === "idle" ? 0.6 : 2.5;
}

/** The first time at or after `t` when the eyes are fully open, so a still never freezes mid-blink (Avatar.vue). */
export function eyesOpenFrom(t: number): number {
  let s = t;
  for (let i = 0; i < 40 && liveliness(s).lid < 0.99; i++) s += 0.05;
  return s;
}

/** Engine time of the static frame of `pose` on a fresh engine: 1.0 s for idle-state poses, settled for the rest. */
export function staticTime(pose: PoseId = "idle"): number {
  return eyesOpenFrom(visualFor(pose).engine === "idle" ? STATIC_AT : settleDelay(pose));
}

/** The static frame of a pose: what PebbleStatic renders, and the frame PebbleLive starts from. */
export function staticView(pose: PoseId = "idle"): PebbleView & { t: number } {
  const t = staticTime(pose);
  return { frame: createPebbleEngine(pose).sample(t), motion: avatarMotion(pose, t, true), still: true, t };
}

/**
 * The galet's extent in viewBox units around the centre (y down), measured from the profile: where the body's bottom
 * sits, for contact shadows and for placing a pebble on a ground line.
 */
export const BODY = (() => {
  let top = 0, bottom = 0, left = 0, right = 0;
  for (let i = 0; i < GALET.length; i++) {
    const a = (i / GALET.length) * Math.PI * 2;
    const r = (GALET[i] ?? 1) * PEBBLE_SCALE;
    top = Math.min(top, r * Math.sin(a));
    bottom = Math.max(bottom, r * Math.sin(a));
    left = Math.min(left, r * Math.cos(a));
    right = Math.max(right, r * Math.cos(a));
  }
  return { top, bottom, left, right, width: right - left, height: bottom - top };
})();
