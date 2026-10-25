// Pointer-driven look cues: the app's eyes follow the pointer, so wherever the film's pointer is on screen near the
// pebble, the gaze is `gazeToward(pointer, the pebble's box, reach)` quantised to 1/8, and a cue is written only when
// the quantised gaze changes (the engine's 0.24 s catch-up does the rest). Reach is the app's 200 pt at the pebble's
// scale. When the pointer leaves, the eyes go back to the look the timeline has in force (or the pose's own gaze).
//
// The trailer's pointers near the pebble: the cold open's (bar 1), the star beat's (bar 11) and the climax's two clicks
// (bars 21–23). The glimpse's and the montage's pointers have no pebble in frame.
import { BODY, VIEWBOX_SIZE, gazeToward, sameGaze, type Gaze, type PebbleCue } from "../../../shared/pebble";
import type { Point } from "../motion/camera";
import { REFERENCE, layoutFor } from "../motion/layout";
import { cursorPathAt } from "../motion/spec";
import { mergeCues } from "../pebble/acting";
import { coldPointer, coldPose, landPointer } from "./desk";
import { WIN_STAGE, pointerSpans } from "./framing";
import { DESK_CAMERA, FILM_PEBBLE_CUES, FPS, PET, landFoot, time, type Aspect } from "./timeline";

/** A pebble's box in frame px from its foot (bottom centre of the body) and its PebbleOnFilm size. */
export const pebbleBox = (foot: Point, size: number) => {
  const unit = size / VIEWBOX_SIZE;
  const cx = foot.x;
  const cy = foot.y - BODY.bottom * unit;
  const w = BODY.width * unit;
  const h = BODY.height * unit;
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
};

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
export function filmCues(a: Aspect): readonly PebbleCue[] {
  const hit = cache.get(a);
  if (hit) return hit;
  const L = layoutFor(REFERENCE[a].width, REFERENCE[a].height);
  const statics = FILM_PEBBLE_CUES[a];
  const W = L.width;
  const H = L.height;
  // bar 1: the close-up's pebble under the cold camera; the pointer in frame px, until it slides away (f36–50)
  const cam = coldPose(a, L.s, W, H);
  const foot = { x: W / 2 + (PET.centre.x - cam.x) * cam.zoom, y: H / 2 + (PET.centre.y + PET.centreToFoot - cam.y) * cam.zoom };
  const coldBox = pebbleBox(foot, PET.size * cam.zoom);
  const cp = coldPointer(a, L.s);
  const s1: Sample[] = [];
  for (let f = cp.visible[0]; f <= cp.visible[1] && f < 54; f++) {
    const p = cursorPathAt(f, cp.keys, FPS);
    s1.push({ frame: f, pointer: f < cp.visible[1] ? p : null, box: coldBox, reach: 200 * cam.zoom });
  }
  // bar 11: the landed pebble at the lockup's size (9:16: the desktop's) and the arriving pointer
  const lf = landFoot(a);
  const landSize = PET.size * DESK_CAMERA.land.m[a];
  const lp = landPointer(a, L.s, W, H);
  const s11: Sample[] = [];
  for (let f = lp.visible[0]; f <= 791; f++) s11.push({ frame: f, pointer: cursorPathAt(f, lp.keys, FPS), box: pebbleBox({ x: lf.x * L.s, y: lf.y * L.s }, landSize * L.s), reach: 200 * DESK_CAMERA.land.m[a] * L.s });
  // the climax: the pebble at its spot in the window world
  const winBox = pebbleBox(L.win.pebble.foot, L.win.pebble.size);
  const reach = (200 * L.win.pebble.size) / PET.size;
  const st = WIN_STAGE[a];
  const spans = pointerSpans(a, L.s).filter((sp) => sp.visible[0] >= 1440);
  const win: Sample[] = [];
  for (let f = 1490; f <= 1604; f++) {
    const sp = spans.find((x) => f >= x.visible[0] && f < x.visible[1]);
    const p = sp ? cursorPathAt(f, sp.keys, FPS) : null;
    win.push({ frame: f, pointer: p ? { x: st.x * L.s + p.x, y: st.y * L.s + p.y } : null, box: winBox, reach });
  }
  const merged = mergeCues(statics, cuesFrom(s1, statics, "bar 1"), cuesFrom(s11, statics, "bar 11"), cuesFrom(win, statics, "climax"));
  cache.set(a, merged);
  return merged;
}

/** A cue list moved by `frames` (an instance whose engine clock is shifted keeps its poses on their film frames). */
export const shiftCues = (cues: readonly PebbleCue[], frames: number): PebbleCue[] => (frames === 0 ? [...cues] : cues.map((c) => ({ ...c, at: c.at + frames / FPS })));
