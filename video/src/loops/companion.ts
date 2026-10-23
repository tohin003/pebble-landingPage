// L1 loop-companion: the pointer's path and the pebble's cue list, as data (no React), so loops.test.ts can check them.
//
// Poses follow the app's reducer (Pebble 1.0.1 companionState.ts): hover when the pointer enters the pebble, tap for
// 1.2 s on the click, sending on Enter, thinking once the run is queued, writing while text arrives, happy for
// COMPLETED_MS (4.5 s) after completion — minimizing the chat doesn't end it — then idle. The eyes follow the pointer as
// the shell's gaze sampler does (15 Hz, gazeToward quantised to 1/8, reach 200 pt); while the pointer rests (hidden)
// the look stays pinned on it, so the gaze is identical at both ends of the loop.
// The engine offset (49.5 frames, engine time 1.65 s at frame 0) leaves no blink within 0.3 s of the seam and makes the
// breath (period 3.4 s) match across it; the eye drift with a pinned look (wander 0.1) differs by < 0.3°.
import type { PebbleCue, PoseId } from "../../../shared/pebble";
import { gazeToward, sameGaze, type Gaze } from "../../../shared/pebble";
import { PET } from "../film/timeline";
import { cursorPathAt, type CursorKey } from "../motion/spec";
import { L1 } from "./plans";

export const L1_ENGINE_OFFSET = 49.5;

/** The pointer, in desktop points. It rests off the frame's left edge at both ends (frame px (−733, 348) in L1's resting framing, m 2.4). */
export const L1_CURSOR: readonly CursorKey[] = [
  { at: 12, x: 330, y: 617, travel: 1 },
  { at: 34, x: 1058, y: 768, target: 60, seed: "l1-pet" }, // onto the pebble's lower left (not over its eyes); click f46
  { at: 64, x: 940, y: 650, travel: 18, seed: "l1-away" }, // drifts to the composer, then rests there (hidden)
  { at: 222, x: 940, y: 650, travel: 1 },
  { at: 246, x: 1100, y: 395, target: 24, seed: "l1-close" }, // "Minimize to pebble"; click f254
  { at: 290, x: 330, y: 617, travel: 30, seed: "l1-leave" },
];

/** The collapsed pet's hit box (the 112 × 112 pet window around the pebble), desktop points. */
export const PET_BOX = { left: PET.centre.x - 56, top: PET.centre.y - 56, width: 112, height: 112 };
const REACH = 200; // pt (the app's REACH_PX)
const inBox = (p: { x: number; y: number }) =>
  p.x >= PET_BOX.left && p.x <= PET_BOX.left + PET_BOX.width && p.y >= PET_BOX.top && p.y <= PET_BOX.top + PET_BOX.height;

/** The loop frame on which the recording shows source time `seconds`. */
export const l1FrameOf = (seconds: number) => {
  for (let i = 1; i < L1.src.length; i++) {
    const [f0, s0] = L1.src[i - 1]!;
    const [f1, s1] = L1.src[i]!;
    if (seconds >= s0 && seconds <= s1) return Math.round(f0 + ((seconds - s0) / (s1 - s0)) * (f1 - f0));
  }
  throw new Error(`L1: source ${seconds} s is outside the source map`);
};

/** The pebble's cue list (absolute engine seconds = (frame + offset) / 30). */
export function l1Cues(fps = 30): { cues: PebbleCue[]; hoverAt: number; poses: [number, PoseId][] } {
  const t = (f: number) => (f + L1_ENGINE_OFFSET) / fps;
  let hoverAt = -1;
  for (let f = 0; f < L1.click; f++) {
    if (inBox(cursorPathAt(f, L1_CURSOR, fps))) {
      hoverAt = f;
      break;
    }
  }
  if (hoverAt < 0 || L1.click - hoverAt < 14) throw new Error(`L1: hover at f${hoverAt} must lead the tap (f${L1.click}) by ≥ 14 frames`);
  const sending = l1FrameOf(3.0);
  const queued = l1FrameOf(3.15);
  const firstText = l1FrameOf(4.6);
  const poses: [number, PoseId][] = [
    [hoverAt, "hover"],
    [L1.click, "tap"],
    [L1.click + 36, "idle"], // TAP_MS 1.2 s; the pointer has left the pebble
    [sending, "sending"],
    [Math.max(queued, sending + 14), "thinking"], // live once queued; the face takes 0.45 s to morph
    [firstText, "writing"],
    [L1.completed, "happy"],
    [L1.happyEnds, "idle"],
  ];
  const looks: [number, Gaze][] = [];
  let last: Gaze | null = null;
  for (let f = -40; f < L1.plan.n; f += 2) {
    const p = cursorPathAt(Math.max(0, f), L1_CURSOR, fps);
    const g = gazeToward(p.x, p.y, PET_BOX, REACH);
    if (g && !sameGaze(g, last)) {
      looks.push([f, g]);
      last = g;
    }
  }
  const cues: PebbleCue[] = [
    ...poses.map(([f, pose]) => ({ at: t(f), pose })),
    ...looks.map(([f, look]) => ({ at: t(f), look })),
  ].sort((a, b) => a.at - b.at);
  return { cues, hoverAt, poses };
}
