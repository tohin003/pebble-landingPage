// The desktop world's cameras and pointers (the trailer's bars 1, 11, 12–13), as pure arithmetic shared by the
// scenes, the gaze cues and the checks. World units are the riverbed desktop's points (1600 × 1000); the pet and its
// quick-chat panel live at their place on it (timeline PET, PET_PANEL).
import type { CamPose, Point } from "../motion/camera";
import { poseAt } from "../motion/camera";
import type { CursorKey } from "../motion/spec";
import { DESK_CAMERA, PET, PET_PANEL, type Aspect } from "./timeline";

/** The star beat's tilt from the page down to the desktop (bar 11): the pebble's hop H3 takes off on f756 and lands
 *  on f774 as the desktop arrives. */
export const STAR_PAN = { from: 756, dur: 18 } as const;

/** The camera that puts the pebble's centre at the frame point `pebbleAt` (reference px), magnified m. */
const deskPose = (m: number, pebbleAt: Point, s: number, width: number, height: number): CamPose =>
  poseAt(PET.centre, { x: pebbleAt.x * s, y: pebbleAt.y * s }, m * s, width, height);

/** Bar 1: the extreme close-up on the dark riverbed (frame 0 is the thumbnail), held still. */
export const coldPose = (a: Aspect, s: number, width: number, height: number): CamPose =>
  deskPose(DESK_CAMERA.cold.m[a], DESK_CAMERA.cold.pebbleAt[a], s, width, height);
/** Bar 11: the light riverbed under the landing pebble (its size the lockup's). */
export const landPose = (a: Aspect, s: number, width: number, height: number): CamPose =>
  deskPose(DESK_CAMERA.land.m[a], DESK_CAMERA.land.pebbleAt[a], s, width, height);
/** Bars 12–13: the whole quick-chat panel (the recut's C1). */
export const chatPose = (a: Aspect, s: number, width: number, height: number): CamPose =>
  deskPose(DESK_CAMERA.chat.m[a], DESK_CAMERA.chat.pebbleAt[a], s, width, height);
/** f918–935: the punch-in on the question and Pebble's answer, the pebble out of frame. */
export const answerPose = (a: Aspect, s: number): CamPose => {
  const c = DESK_CAMERA.answer;
  return { x: PET_PANEL.x + c.centre[a].x, y: PET_PANEL.y + c.centre[a].y, zoom: c.m[a] * s };
};

/**
 * Bar 1's pointer, in frame px: it drifts in over f4–16 on a 12-frame minimum-jerk arc to rest beside the face, inside
 * the pet window (the app's attentive pose), and from f36 slides away out of the frame (the eyes follow it).
 */
export function coldPointer(a: Aspect, s: number): { keys: CursorKey[]; visible: [number, number] } {
  const p = DESK_CAMERA.coldPointer;
  const sc = (q: Point) => ({ x: q.x * s, y: q.y * s });
  return {
    keys: [
      { at: 4, ...sc(p.from[a]) },
      { at: 16, ...sc(p.rest[a]), travel: 12, seed: "cold-in" },
      { at: 50, ...sc(p.away[a]), travel: 14, seed: "cold-away" },
    ],
    visible: [4, 50],
  };
}

/** Bar 11's pointer, in frame px: it arrives toward the landed pebble (f776–791); the eyes find it. */
export function landPointer(a: Aspect, s: number, width: number, height: number): { keys: CursorKey[]; visible: [number, number] } {
  const cam = landPose(a, s, width, height);
  const pet = { x: width / 2 + (PET.centre.x - cam.x) * cam.zoom, y: height / 2 + (PET.centre.y - cam.y) * cam.zoom };
  const from = DESK_CAMERA.landPointerFrom[a];
  return {
    keys: [
      { at: 776, x: from.x * s, y: from.y * s },
      { at: 790, x: pet.x + 160 * s, y: pet.y - 150 * s, travel: 14, seed: "land" },
    ],
    visible: [776, 800],
  };
}

/** Where the pet window sits on the frame under a pose (the collapsed window is 112 × 112 pt about the body). */
export const petWindowOnFrame = (cam: CamPose, width: number, height: number) => {
  const half = 56 * cam.zoom;
  const cx = width / 2 + (PET.centre.x - cam.x) * cam.zoom;
  const cy = height / 2 + (PET.centre.y - 0.8 - cam.y) * cam.zoom;
  return { x: cx - half, y: cy - half, w: 2 * half, h: 2 * half };
};
