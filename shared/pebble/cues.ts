// Cue lists: how the films (and any scripted pebble) tell the character what to do, as data.
//
// A cue list is sorted by `at` and replayed on a FRESH engine for every rendered frame (`pebbleAt`), because Remotion
// renders frames in parallel and out of order and the engine keeps one slot of history. Replaying the setters up to `t`
// gives exactly the frame a live engine shows at `t` (verified frame by frame in cues.test.ts).
//
// D6: a cue names a Pebble POSE (companionState.ts), never an engine state, so the engine can only reach the three
// states Pebble ships (idle, alert, notify). `checkCues` rejects anything else, including the catalogue names.
// Convention: a module that holds a cue list is named `*.cues.ts` and contains data only (no React, Remotion or path
// aliases); the engine tests load every such file in the repo and check every list in it.
import type { BotEngine } from "./bloub/engine";
import { liveliness } from "./bloub/face";
import { avatarMotion } from "./avatarMotion";
import { POSES, ALIASES, visualFor, type PoseId } from "./companionState";
import { lookFor, type Gaze } from "./gaze";
import { CATALOGUE_STATES, PEBBLE_ENGINE_STATES, applyPose, createPebbleEngine, type PebbleView } from "./character";

export interface PebbleCue {
  /** Seconds, in absolute composition time (films) or engine time (scripts). */
  at: number;
  /** A Pebble pose from companionState.ts. Never an engine catalogue state (D6). */
  pose?: PoseId;
  /** Where the eyes look, in screen terms (x right, y down, each in [−1, 1]); null returns them to the pose's gaze. */
  look?: Gaze | null;
  /** Free text for people reading the timeline. Ignored by the engine. */
  note?: string;
}

const CUE_KEYS = new Set(["at", "pose", "look", "note"]);
const CATALOGUE: ReadonlySet<string> = new Set(CATALOGUE_STATES);
const ENGINE_OK: ReadonlySet<string> = new Set(PEBBLE_ENGINE_STATES);

/** Every problem in a cue list (an empty array means the list is valid). */
export function checkCues(cues: unknown, name = "cues"): string[] {
  if (!Array.isArray(cues)) return [`${name}: not an array`];
  const problems: string[] = [];
  let prev = -Infinity;
  cues.forEach((cue: unknown, i) => {
    const where = `${name}[${i}]`;
    if (!cue || typeof cue !== "object" || Array.isArray(cue)) {
      problems.push(`${where}: not an object`);
      return;
    }
    const c = cue as Record<string, unknown>;
    for (const key of Object.keys(c)) {
      if (!CUE_KEYS.has(key)) problems.push(`${where}: unknown key "${key}" (allowed: at, pose, look, note)`);
    }
    if (typeof c.at !== "number" || !Number.isFinite(c.at)) problems.push(`${where}: "at" must be a finite number of seconds`);
    else {
      if (c.at < prev) problems.push(`${where}: not sorted (at ${c.at} comes after ${prev})`);
      prev = c.at;
    }
    if ("pose" in c) {
      const p = c.pose;
      if (typeof p !== "string") problems.push(`${where}: "pose" must be a string`);
      else if (!Object.prototype.hasOwnProperty.call(POSES, p)) {
        if (CATALOGUE.has(p)) problems.push(`${where}: "${p}" is an engine catalogue state, never shown (D6)`);
        else if (ALIASES[p]) problems.push(`${where}: "${p}" is an old alias; write "${ALIASES[p]}"`);
        else problems.push(`${where}: unknown pose "${p}"`);
      } else if (!ENGINE_OK.has(visualFor(p).engine)) {
        problems.push(`${where}: pose "${p}" maps to engine state "${visualFor(p).engine}" (D6)`);
      }
    }
    if ("look" in c && c.look !== null) {
      const g = c.look as Record<string, unknown> | undefined;
      const ok =
        !!g && typeof g === "object" && typeof g.x === "number" && typeof g.y === "number" &&
        Number.isFinite(g.x) && Number.isFinite(g.y) && Math.abs(g.x) <= 1 && Math.abs(g.y) <= 1;
      if (!ok) problems.push(`${where}: "look" must be null or {x, y} with each in [−1, 1]`);
    }
    if (!("pose" in c) && !("look" in c)) problems.push(`${where}: a cue needs a pose or a look`);
  });
  return problems;
}

/** Throws with every problem listed, so a bad timeline fails loudly in Studio and in renders. */
export function assertCues(cues: unknown, name = "cues"): asserts cues is readonly PebbleCue[] {
  const problems = checkCues(cues, name);
  if (problems.length) throw new Error(`Invalid pebble cue list:\n  ${problems.join("\n  ")}`);
}

/**
 * A fresh engine with every cue at or before `t` applied at its own time, and the pose in force at `t`.
 * `cues` must be sorted by `at` (see checkCues).
 */
export function replayAt(cues: readonly PebbleCue[], t: number, initial: PoseId = "idle"): { engine: BotEngine; pose: PoseId } {
  const engine = createPebbleEngine(initial);
  let pose: PoseId = initial;
  for (const c of cues) {
    if (c.at > t) break;
    if (c.pose && c.pose !== pose) {
      pose = c.pose;
      applyPose(engine, pose, c.at);
    }
    if (c.look !== undefined) engine.setLook(lookFor(c.look), c.at);
  }
  return { engine, pose };
}

/** The frame and body motion at time `t` of a cue list: what a film renders on every frame. */
export function pebbleAt(cues: readonly PebbleCue[], t: number, initial: PoseId = "idle"): PebbleView & { pose: PoseId } {
  const { engine, pose } = replayAt(cues, t, initial);
  return { frame: engine.sample(t), motion: avatarMotion(pose, t, false), still: false, pose };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Authoring helpers for the films. The blink schedule is fixed and deterministic (bloub/face.ts, seed 0x5eed), so a  */
/* timeline can be laid out around it.                                                                                 */

/** Start times (seconds) of the blinks in [from, to), sampled at 1 ms. Forced blinks of blinkIn states are not listed. */
export function blinkStarts(from: number, to: number): number[] {
  const out: number[] = [];
  let open = liveliness(from).lid >= 0.999;
  for (let ms = Math.ceil(from * 1000); ms < to * 1000; ms++) {
    const t = ms / 1000;
    const nowOpen = liveliness(t).lid >= 0.999;
    if (open && !nowOpen) out.push(+(t - 0.001).toFixed(3));
    open = nowOpen;
  }
  return out;
}

/**
 * The time nearest to `t` at which the eyes are closest to shut (a blink's deepest point), searching `before` seconds
 * back and `after` seconds ahead; `t` itself when no blink is in range. Put a face change there and the blink hides it.
 */
export function snapToBlink(t: number, after = 0.6, before = 0.25): number {
  // A blink lasts 0.18 s and is shut at 45 % of it (bloub/face.ts).
  const SHUT = 0.45 * 0.18;
  let best = t;
  let dist = Infinity;
  for (const start of blinkStarts(t - before - SHUT, t + after)) {
    const shut = start + SHUT;
    if (shut < t - before || shut > t + after) continue;
    if (Math.abs(shut - t) < dist) {
      dist = Math.abs(shut - t);
      best = +shut.toFixed(3);
    }
  }
  return best;
}

/**
 * The first engine-time offset at or after `from` (stepping by 1/fps) such that a loop of `duration` seconds that
 * plays [offset, offset + duration) has no blink within `margin` seconds of either end, so the seam never cuts a
 * blink (MASTER_PLAN §4.3 loops, R5 §13.5).
 */
export function blinkFreeOffset(duration: number, fps = 30, from = 1, margin = 0.3): number {
  const blinks = blinkStarts(from, from + 120 + duration);
  const clear = (a: number) => blinks.every((b) => b + 0.18 < a - margin || b > a + margin);
  for (let f = Math.round(from * fps); f < (from + 120) * fps; f++) {
    const o = f / fps;
    if (clear(o) && clear(o + duration)) return o;
  }
  return from;
}
