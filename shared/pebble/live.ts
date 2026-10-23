// The live pebble's clock and state, without any DOM: the site's PebbleLive drives one of these from
// requestAnimationFrame, and the engine tests drive it with a fake clock.
//
// Engine time ("time") only advances while the pebble is animated, so pausing (hidden tab, off-screen, settled after
// HOLD_SECONDS) and resuming continue from the exact frame on screen instead of jumping.
//
// The engine's blink schedule is pre-drawn up to 900 s and then stops (bloub/face.ts), so the timeline restarts before
// 840 s: from RESTART_FROM on, at the first calm moment (eyes open, no morph under way), the pebble moves to a fresh
// engine at the early time whose gaze drift and body sway best match the frame on screen, which keeps the switch
// below a pixel or so. RESTART_BY forces it if no calm moment came.
import type { BotEngine, Look } from "./bloub/engine";
import { liveliness } from "./bloub/face";
import { avatarMotion } from "./avatarMotion";
import { visualFor, type PoseId } from "./companionState";
import { lookFor, sameGaze, type Gaze } from "./gaze";
import {
  HOLD_SECONDS,
  PEBBLE_SCALE,
  applyPose,
  createPebbleEngine,
  eyesOpenFrom,
  settleDelay,
  staticTime,
  type PebbleView,
} from "./character";

/** From this engine time on, the timeline restarts at the first calm moment. */
export const RESTART_FROM = 780;
/** The timeline always restarts by this engine time, so it never reaches 840 s (MASTER_PLAN §4.2). */
export const RESTART_BY = 835;
/** The largest clock step accepted at once: a long main-thread stall slows the pebble down instead of jumping it. */
export const MAX_STEP = 0.25;
/** bloub's LOOK_MORPH (0.24 s) with a margin. */
const LOOK_SETTLE = 0.3;
/** Where a restarted timeline may land: early in the blink schedule, after the first blink. */
const LAND_FROM = 2;
const LAND_TO = 90;
const LAND_FPS = 30;
/** viewBox units an eye (or the body's edge) moves per degree of head turn (or tilt), at most. */
const UNITS_PER_DEG = (PEBBLE_SCALE * Math.PI) / 180;

export class LivePebble {
  private engine: BotEngine;
  /** Engine time, in seconds. */
  time: number;
  /** The pose the engine shows. */
  pose: PoseId;
  private poseAt = -Infinity;
  private gaze: Gaze | null = null;
  private look: Look | null = null;
  private lookAt = -Infinity;
  private inputAt: number;
  /** Where the eyes rest when nothing draws them (null: the pose's own direction). */
  private readonly rest: Gaze | null;
  /** How many times the timeline has restarted (tests and diagnostics). */
  restarts = 0;

  /**
   * `rest`: a resting gaze (screen terms) used instead of the pose's own direction whenever the gaze is let go
   * (setGaze(null)) and when the pebble settles (relax()). The site passes { x: 0, y: 0 }, straight ahead
   * (docs/DESIGN.md §9); the first frame then matches staticView(pose, rest).
   */
  constructor(pose: PoseId = "idle", rest: Gaze | null = null) {
    this.pose = pose;
    this.engine = createPebbleEngine(pose);
    this.time = staticTime(pose);
    this.inputAt = this.time;
    this.rest = rest ? { x: rest.x, y: rest.y } : null;
    if (this.rest) {
      this.gaze = { ...this.rest };
      this.look = lookFor(this.gaze);
      this.engine.setLook(this.look, Math.max(0, this.time - 1)); // arrived before the first frame, as staticView
    }
  }

  /** Show `pose` from now on (a 0.45 s morph). Returns false if it was already showing. */
  setPose(pose: PoseId): boolean {
    if (pose === this.pose) return false;
    applyPose(this.engine, pose, this.time);
    this.pose = pose;
    this.poseAt = this.time;
    this.inputAt = this.time;
    return true;
  }

  /** Turn the eyes toward a quantised gaze, or rest them (null). Returns false if the gaze did not change. */
  setGaze(gaze: Gaze | null): boolean {
    const target = gaze ?? this.rest;
    if (sameGaze(target, this.gaze)) return false;
    this.gaze = target ? { x: target.x, y: target.y } : null;
    this.look = lookFor(this.gaze);
    this.engine.setLook(this.look, this.time);
    this.lookAt = this.time;
    this.inputAt = this.time;
    return true;
  }

  /**
   * Settling: bring the eyes back to the resting gaze without counting it as input, so the pebble holds right after
   * the look morph. Returns false (and does nothing) when there is no resting gaze or the eyes are already there.
   */
  relax(): boolean {
    if (!this.rest || sameGaze(this.rest, this.gaze)) return false;
    this.gaze = { ...this.rest };
    this.look = lookFor(this.gaze);
    this.engine.setLook(this.look, this.time);
    this.lookAt = this.time;
    return true;
  }

  /** Input that changes nothing on screen (a pointer move inside one gaze step, scrolling into view): keep awake. */
  touch(): void {
    this.inputAt = this.time;
  }

  /** Advance engine time by `dt` seconds (clamped to [0, MAX_STEP]), restarting the timeline when it is due. */
  advance(dt: number): void {
    const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_STEP) : 0;
    this.time += step;
    if (this.time >= RESTART_BY || (this.time >= RESTART_FROM && this.calm())) this.restart();
  }

  /** Nothing is mid-change: the pose and gaze morphs are over and the eyes are open. */
  calm(): boolean {
    return (
      this.time - this.poseAt >= settleDelay(this.pose) &&
      this.time - this.lookAt >= LOOK_SETTLE &&
      liveliness(this.time).lid >= 0.999
    );
  }

  /** A calm (`hold`) pose has had no input for HOLD_SECONDS and the frame is settled: stop animating here. */
  shouldHold(): boolean {
    return visualFor(this.pose).hold && this.time - this.inputAt >= HOLD_SECONDS && this.calm();
  }

  /** The animated frame at the current time. */
  view(): PebbleView {
    return { frame: this.engine.sample(this.time), motion: avatarMotion(this.pose, this.time, false), still: false };
  }

  /**
   * A settled still frame of the current pose (reduced motion, paused motion, or another pebble holds the animation):
   * morphs finished, eyes open. The clock moves to that frame, so animating again continues from it.
   */
  still(): PebbleView {
    if (this.time >= RESTART_FROM) this.restart(); // invisible here: the next frame is a still anyway
    const t = eyesOpenFrom(Math.max(this.time, this.poseAt + settleDelay(this.pose), this.lookAt + LOOK_SETTLE));
    this.time = t;
    return { frame: this.engine.sample(t), motion: avatarMotion(this.pose, t, true), still: true };
  }

  /** Move to a fresh engine at the early time that looks most like now. */
  private restart(): void {
    const from = this.time;
    const to = closestEarlyTime(from, this.pose, this.look?.wander ?? 1);
    const engine = createPebbleEngine(this.pose);
    if (this.look) engine.setLook(this.look, to - 1); // already arrived by `to`
    this.engine = engine;
    this.time = to;
    this.inputAt += to - from;
    this.poseAt = -Infinity;
    this.lookAt = -Infinity;
    this.restarts++;
  }
}

/** What changes with time alone for a settled pose, in viewBox units: gaze drift, float, breath, sway and cue phase. */
function timeSignature(t: number, pose: PoseId, wander: number): { lid: number; v: number[] } {
  const life = liveliness(t, { wander });
  const m = avatarMotion(pose, t, false);
  const v = [
    life.dYaw * UNITS_PER_DEG,
    life.dPitch * UNITS_PER_DEG,
    life.dRoll * UNITS_PER_DEG,
    life.driftX * PEBBLE_SCALE,
    life.driftY * PEBBLE_SCALE,
    (life.breath - 1) * PEBBLE_SCALE,
    m.x,
    m.y,
    m.tilt * UNITS_PER_DEG,
    (m.sx - 1) * PEBBLE_SCALE,
    (m.sy - 1) * PEBBLE_SCALE,
  ];
  const cue = visualFor(pose).cue;
  if (cue) for (const p of m.pulse) v.push(p * 4);
  if (cue === "orbit") {
    const a = (((t * 85) % 360) * Math.PI) / 180; // Avatar.vue rotates the orbit dots at 85°/s on a 76-unit circle
    v.push(76 * Math.cos(a), 76 * Math.sin(a));
  }
  return { lid: life.lid, v };
}

/** The time in [LAND_FROM, LAND_TO], on a 1/30 s grid and with the eyes open, whose signature is closest to `from`'s. */
export function closestEarlyTime(from: number, pose: PoseId, wander: number): number {
  const target = timeSignature(from, pose, wander).v;
  let best = LAND_FROM;
  let bestDistance = Infinity;
  for (let f = LAND_FROM * LAND_FPS; f <= LAND_TO * LAND_FPS; f++) {
    const t = f / LAND_FPS;
    const { lid, v } = timeSignature(t, pose, wander);
    if (lid < 1) continue;
    let d = 0;
    for (let i = 0; i < v.length; i++) d += (v[i]! - target[i]!) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = t;
    }
  }
  return best;
}
