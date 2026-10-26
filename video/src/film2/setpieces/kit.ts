// Helpers every set-piece plan shares: type events for the reading checks, anchored cues, ring geometry against the
// frame, and the music report. Pure; no React.
import { worldToFrame, type Pose } from "../motion/camera";
import { annulusHitsRect, radiusToCorners, type Point, type Rect } from "../motion/geometry";
import { ringStates, type RingSpec } from "../carrier/ring";
import { checkCues, type PebbleCue } from "../../../../shared/pebble/cues";
import type { TextEvent } from "../type/reading";
import { defaultEntranceOf, enterFramesOf, exitFramesOf, lineRect, type FrameBox } from "./frame";
import type { MusicHit, TypeSpec } from "./scene";
import type { Placement } from "./music";

/** A type spec's time on screen, as the reading checks see it. Small print is legal text, not a reading requirement. */
export function typeEvent(t: TypeSpec, f: FrameBox, fps: number, pieceEnd: number): TextEvent | null {
  if (t.kind === "small") return null;
  const ent = t.entrance ?? defaultEntranceOf(t.tier);
  const enter = enterFramesOf(ent, t.text, fps);
  const to = t.exitAt === undefined ? pieceEnd : t.exitAt + exitFramesOf(ent, t.exit ?? "blur", t.text, fps);
  const kind: TextEvent["kind"] = t.kind === "label" ? "film" : t.kind;
  return {
    id: t.id,
    text: t.text,
    from: t.at,
    to,
    enterFrames: enter,
    key: t.key,
    honest: t.honest,
    pairWith: t.pairWith,
    kind,
    rect: lineRect(t.text, t.tier, f, t.box, t.sizeT ?? 0.5),
  };
}

/** Frames a line takes to land (for scheduling its landing on a beat). */
export const landFrames = (t: Pick<TypeSpec, "text" | "tier" | "entrance">, fps: number): number => enterFramesOf(t.entrance ?? defaultEntranceOf(t.tier), t.text, fps);

/** A cue template (seconds relative to an anchor) at an anchor time, checked. */
export function anchored(template: readonly PebbleCue[], anchorS: number, name: string): PebbleCue[] {
  const out = template.map((c) => ({ ...c, at: Math.round((c.at + anchorS) * 1000) / 1000 }));
  const problems = checkCues(out, name);
  if (problems.length) throw new Error(problems.join("\n"));
  return out;
}

/** Concatenate cue lists in time order (each already checked), and check the result. */
export function cueList(name: string, ...lists: (readonly PebbleCue[])[]): PebbleCue[] {
  const out = lists.flat().sort((a, b) => a.at - b.at);
  const problems = checkCues(out, name);
  if (problems.length) throw new Error(problems.join("\n"));
  return out;
}

/** The world radius from `c` to the frame's farthest corner under `poseAt(frame)` (resolves a ring's "edge"). */
export const edgeRadius =
  (poseAt: (frame: number) => Pose, w: number, h: number) =>
  (frame: number, c: Point): number => {
    const pose = poseAt(frame);
    return radiusToCorners(worldToFrame(c, pose, w, h), w, h) / pose.zoom;
  };

/**
 * The first frame from which no ring of `specs` (main or echo, opacity > 0.05) crosses any of `rects` (frame px), in
 * [from, to); `from` when none ever does. The plans schedule a line's reading after it.
 */
export function ringClearFrame(specs: readonly RingSpec[], rects: readonly Rect[], fps: number, poseAt: (frame: number) => Pose, f: FrameBox, from: number, to: number): number {
  const edge = edgeRadius(poseAt, f.w, f.h);
  const margin = 6 * f.unit;
  let clear = from;
  for (let fr = from; fr < to; fr++) {
    const pose = poseAt(fr);
    for (const spec of specs) {
      for (const r of ringStates(spec, fr, fps, edge)) {
        if (r.opacity <= 0.05) continue;
        const c = worldToFrame(r.c, pose, f.w, f.h);
        const R = r.r * pose.zoom;
        const wpx = r.widthPx * f.unit;
        if (rects.some((rect) => annulusHitsRect(c, R, wpx, rect, margin))) clear = fr + 1;
      }
    }
  }
  return clear;
}

/** A music report row from a placement. */
export const musicHit = (event: string, p: Placement): MusicHit => ({ event, frame: p.point ?? p.at, point: p.point, level: p.level, waited: p.waited });

/** Round a frame count up to a whole frame. */
export const ceilF = (x: number): number => Math.ceil(x - 1e-9);
