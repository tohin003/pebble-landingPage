// S1, the hook (FILM_SPEC §6 S1, §7.1), lane G2a: the desktop world's camera, the pointer and the zoom through the
// pebble, as pure arithmetic shared by the scene, the gaze cues and the motion audit. World units are the riverbed
// desktop's points (1600 × 1000); the pet's panel and the pebble live at their place on it (timeline PET).
import type { CamKey, CamPose, Point } from "../motion/camera";
import { cameraAt, poseAt } from "../motion/camera";
import { EASE, type CursorKey } from "../motion/spec";
import type { AspectId } from "../motion/layout";
import { PET, S1_CAMERA } from "./timeline";

/** C0 (frame 0), C1 (the whole panel), C2 (the punch-in at f72): poses that put the pebble's centre where §6 says. */
export function hookPoses(a: AspectId, width: number, height: number, s: number) {
  const at = (p: Point) => ({ x: p.x * s, y: p.y * s });
  return {
    c0: poseAt(PET.centre, at(S1_CAMERA.c0.pebbleAt[a]), S1_CAMERA.c0.m[a] * s, width, height),
    c1: poseAt(PET.centre, at(S1_CAMERA.c1.pebbleAt[a]), S1_CAMERA.c1.m[a] * s, width, height),
    c2: poseAt(PET.centre, at(S1_CAMERA.c2.pebbleAt[a]), S1_CAMERA.c2.m[a] * s, width, height),
  };
}

/**
 * The energetic recut (ENERGY_SPEC §5): C0 holds to the click (f18); f19–30 the camera makes room for the panel the
 * click opened, a 12-frame speed-ramped move (EASE.ramp, focus and log-zoom on one eased progress) with the frame's
 * motion blur (S1Hook); C1 holds while the question types itself and is sent; f72 is a punch-in cut to C2. It replaces
 * the 24-frame pull-back to m 1.5, which shrank the chat to 19 px text.
 */
export const HOOK_MOVE = { from: 18, to: 30 } as const;
export function hookKeys(a: AspectId, width: number, height: number, s: number): CamKey[] {
  const { c0, c1, c2 } = hookPoses(a, width, height, s);
  return [
    { at: 0, ...c0 },
    { at: HOOK_MOVE.to, ...c1, dur: HOOK_MOVE.to - HOOK_MOVE.from, path: "direct", ease: EASE.ramp },
    { at: 72, ...c2, dur: 1, path: "direct" },
  ];
}

/**
 * The zoom through the pebble (f135–143, the first breath). The camera aims at a body point and dives:
 * - the aim is the point of the body farthest from both its edge and the eyes over the dive (28 viewBox units clear),
 *   (−36, −10) from the body's centre, left of the eyes: §6's (−20, +25) sits 4 units from the thinking pose's eye;
 * - zoom ×1 → ×30 in log space on EASE.exit (accelerating), reached on f143, when the body covers the whole frame
 *   (needs ×26.6 in 16:9, ×18.4 in the square for 28 units of clearance); §6's ×22 leaves the frame unfilled;
 * - the aim point drifts from where C2 shows it to the frame's centre on EASE.camera over the same frames.
 * Lane G-fix (REVIEW-G2 P1-2): the fill lands on f143, the last frame before the bar line, the world changes on f144
 * and the whoosh peaks there (SFX f143 + 1). The energetic recut: it starts on f135 (was f131), so the dive fills the
 * breath's nine frames, one light-to-dark change (≥ 3 frames from 20 % to 80 % of its swing; analyze.py checks it).
 */
export const ZOOM_THROUGH = {
  from: S1_CAMERA.zoomThrough.from, // f135
  fill: 143,
  solidFrom: 144,
  to: S1_CAMERA.zoomThrough.to, // f144 (exclusive)
  aim: { x: -36, y: -10 },
  scale: 30,
  /** zoom blur on screen, px, f141 → f143, the dive's fastest frames (FILM_SPEC: only on its last frames, ≤ 20 px) */
  blur: [0, 8, 16] as const,
  blurFrom: 141,
} as const;

/** The aim point in desktop units. */
export const zoomAim = (): Point => {
  const k = PET.size / 220; // desktop units per viewBox unit
  return { x: PET.centre.x + ZOOM_THROUGH.aim.x * k, y: PET.centre.y + ZOOM_THROUGH.aim.y * k };
};

/** The hook camera on any frame of S1 (0–143), the zoom-through included. */
export function hookPoseAt(frame: number, a: AspectId, width: number, height: number, s: number, fps: number): CamPose {
  const { c2 } = hookPoses(a, width, height, s);
  if (frame < ZOOM_THROUGH.from) return cameraAt(frame, hookKeys(a, width, height, s), fps, width);
  const u = Math.min(1, Math.max(0, (frame - ZOOM_THROUGH.from) / (ZOOM_THROUGH.fill - ZOOM_THROUGH.from)));
  const A = zoomAim();
  const p0 = { x: width / 2 + (A.x - c2.x) * c2.zoom, y: height / 2 + (A.y - c2.y) * c2.zoom };
  const d = EASE.camera(u);
  const where = { x: p0.x + (width / 2 - p0.x) * d, y: p0.y + (height / 2 - p0.y) * d };
  const zoom = c2.zoom * Math.exp(Math.log(ZOOM_THROUGH.scale) * EASE.exit(u));
  return poseAt(A, where, zoom, width, height);
}

/**
 * The pointer (ENERGY_SPEC §5): from f1 it drops in from its entry point (timeline S1_CAMERA.pointerFrom, frame px at
 * C0: above the frame in 16:9 and 1:1, from the left inside the band in 9:16) on a minimum-jerk arc, 12 frames, onto
 * the pebble by f13; it dwells 5 frames (the eyes follow it), clicks on f18 and fades f24–28 while the camera makes
 * room. World units (it rides the camera's move while it fades, as a pointer on the desktop does).
 */
export function hookPointer(a: AspectId, width: number, height: number, s: number): { keys: CursorKey[]; clicks: number[]; visible: [number, number] } {
  const { c0 } = hookPoses(a, width, height, s);
  const from = S1_CAMERA.pointerFrom[a];
  const start = { x: c0.x + (from.x * s - width / 2) / c0.zoom, y: c0.y + (from.y * s - height / 2) / c0.zoom };
  return {
    keys: [
      { at: 1, ...start },
      { at: 13, x: PET.centre.x - 9, y: PET.centre.y + 6, travel: 12, seed: "hook" },
    ],
    clicks: [18],
    visible: [1, 28],
  };
}

/** The collapsed pet window around the pebble (pet-collapsed is 112 × 112 pt, the body's centre at (55.3, 56.8)). */
export const PET_WINDOW = { x: PET.centre.x - 55.3, y: PET.centre.y - 56.8, w: 112, h: 112 } as const;
