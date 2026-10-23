// Pointer-driven look cues (FILM_SPEC §9.3), lane G2a: the app's eyes follow the pointer, so wherever the film's
// pointer is on screen, the pebble's gaze is `gazeToward(pointer, the pebble's box, reach)` quantised to 1/8, and a cue
// is written only when the quantised gaze changes (the engine's 0.24 s catch-up does the rest). Reach is the app's
// 200 pt at the pebble's scale: in S1 the desktop's points times the camera's zoom; in the window world 200 × the
// film pebble's size over the desktop pet's (148). When the pointer leaves, the eyes go back to the look the timeline
// had in force (or the pose's own gaze).
//
// The list is computed once per aspect and merged with the timeline's static cues (FILM_PEBBLE_CUES). It is data,
// never an engine: PebbleOnFilm still builds a fresh engine on every frame and replays the merged list.
import { BODY, VIEWBOX_SIZE, gazeToward, sameGaze, type Gaze, type PebbleCue } from "../../../shared/pebble";
import type { Point } from "../motion/camera";
import type { AspectId } from "../motion/layout";
import { REFERENCE, layoutFor } from "../motion/layout";
import { cursorPathAt } from "../motion/spec";
import { mergeCues } from "../pebble/acting";
import { pointerFrameAt } from "./framing";
import { hookPointer, hookPoseAt } from "./hook";
import { FILM_PEBBLE_CUES, FPS, PET, PET_FOOT, time } from "./timeline";

/** A pebble's box in frame px from its foot (bottom centre of the body) and its PebbleOnFilm size. */
export const pebbleBox = (foot: Point, size: number) => {
  const unit = size / VIEWBOX_SIZE;
  const cx = foot.x;
  const cy = foot.y - BODY.bottom * unit;
  const w = BODY.width * unit;
  const h = BODY.height * unit;
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
};

/** The look in force at `t` in a static cue list (null: the pose's own gaze). */
const lookAt = (cues: readonly PebbleCue[], t: number): Gaze | null => {
  let g: Gaze | null = null;
  for (const c of cues) {
    if (c.at > t) break;
    if (c.look !== undefined) g = c.look;
  }
  return g;
};

interface Sample {
  frame: number;
  pointer: Point | null;
  box: ReturnType<typeof pebbleBox>;
  reach: number;
}

/** Look cues from a run of samples: one per change of the quantised gaze; back to the static look when it leaves. */
function cuesFrom(samples: readonly Sample[], statics: readonly PebbleCue[], tag: string): PebbleCue[] {
  const out: PebbleCue[] = [];
  let last: Gaze | null | undefined;
  let on = false;
  for (const s of samples) {
    if (s.pointer) {
      const g = gazeToward(s.pointer.x, s.pointer.y, s.box, s.reach);
      if (g && (last === undefined || !sameGaze(g, last ?? null))) {
        out.push({ at: time(s.frame), look: g, note: `${tag}: the eyes follow the pointer` });
        last = g;
      }
      on = true;
    } else if (on) {
      const rest = lookAt(statics, time(s.frame));
      out.push({ at: time(s.frame), look: rest, note: `${tag}: the pointer has gone; back to the timeline's look` });
      last = rest;
      on = false;
    }
  }
  return out;
}

const cache = new Map<string, PebbleCue[]>();

/** The film's whole cue list for an aspect: the timeline's cues plus the pointer-driven looks. */
export function filmCues(a: AspectId): readonly PebbleCue[] {
  const hit = cache.get(a);
  if (hit) return hit;
  const L = layoutFor(REFERENCE[a].width, REFERENCE[a].height);
  const statics = FILM_PEBBLE_CUES[a];
  // S1: the desk pebble in the desktop world, seen through the hook camera (f2–47; the timeline's f48 cue returns the look)
  const hp = hookPointer(a, L.width, L.height, L.s);
  const s1: Sample[] = [];
  for (let f = hp.visible[0]; f < hp.visible[1]; f++) {
    const cam = hookPoseAt(f, a, L.width, L.height, L.s, FPS);
    const w = cursorPathAt(f, hp.keys, FPS);
    const toF = (p: Point) => ({ x: L.width / 2 + (p.x - cam.x) * cam.zoom, y: L.height / 2 + (p.y - cam.y) * cam.zoom });
    const foot = toF(PET_FOOT);
    s1.push({ frame: f, pointer: toF(w), box: pebbleBox(foot, PET.size * cam.zoom), reach: 200 * cam.zoom });
  }
  // the window world (f780–1555): the pebble at its spot in the text column / band
  const foot = L.win.pebble.foot;
  const size = L.win.pebble.size;
  const box = pebbleBox(foot, size);
  const reach = (200 * size) / PET.size;
  const win: Sample[] = [];
  for (let f = 776; f <= 1560; f++) win.push({ frame: f, pointer: pointerFrameAt(f, a, L.s, FPS), box, reach });
  const merged = mergeCues(statics, cuesFrom(s1, statics, "S1"), cuesFrom(win, statics, "window"));
  cache.set(a, merged);
  return merged;
}
