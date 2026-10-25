// Pointer-driven look cues: the app's eyes follow the pointer, so wherever the film's pointer is on screen near the
// pebble, the gaze is `gazeToward(pointer, the pebble's box, reach)` quantised to 1/8, and a cue is written only when
// the quantised gaze changes (the engine's 0.24 s catch-up does the rest). Reach is the app's 200 pt at the pebble's
// scale. When the pointer leaves, the eyes go back to the look the timeline has in force (or the pose's own gaze).
//
// The trailer's pointers near the pebble: the cold open's (bar 1), the star beat's (bar 11) and the climax's two clicks
// (bars 21–23). The glimpse's and the montage's pointers have no pebble in frame.
import { BODY, VIEWBOX_SIZE, gazeToward, pebbleAt, sameGaze, type Gaze, type PebbleCue } from "../../../shared/pebble";
import type { Point } from "../motion/camera";
import { REFERENCE, layoutFor } from "../motion/layout";
import { cursorPathAt } from "../motion/spec";
import { mergeCues } from "../pebble/acting";
import { coldPointer, coldPose, landPointer } from "./desk";
import { WIN_STAGE, pointerSpans } from "./framing";
import { ASPECT_IDS, DESK_CAMERA, FILM_PEBBLE_CUES, FPS, PEBBLE_INSTANCES, PET, PET_FOOT, landFoot, time, type Aspect } from "./timeline";

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

/* ================================================================================================================
 * The cold open's poster rules (OVERRIDES §46 P1-2): frame 0 is the page's film poster and every thumbnail, under a
 * centred play button, so the eyes sit in one third and the button's area stays dark; the frame crops the body ("the
 * eyes plus one curve"); the eyes stay whole in frame, and above the caption band, through bar 1.
 * ============================================================================================================== */

const numbers = (s: string) => (s.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);

/** The bar-1 pebble on `frame`, in frame px at the reference size: its outline (the body path's on-curve points) and
 *  the box of its two eyes (each eye's capsule, through its matrix and the pose's motion transform). */
export function coldPebbleOnFrame(a: Aspect, frame: number): { outline: Point[]; eyes: { x0: number; x1: number; y0: number; y1: number } } {
  const { width: W, height: H } = REFERENCE[a];
  const cam = coldPose(a, 1, W, H);
  const off = PEBBLE_INSTANCES.open.offset;
  const view = pebbleAt(shiftCues(filmCues(a), off), (frame + off) / FPS);
  const [tx = 0, ty = 0, rot = 0, sx = 1, sy = 1] = numbers(view.motion.transform);
  const r = (rot * Math.PI) / 180;
  const unit = PET.size / VIEWBOX_SIZE;
  // viewBox units (the body's centre at 0, 0) -> the motion transform -> the desktop -> the frame
  const toFrame = (x: number, y: number): Point => {
    const mx = x * sx * Math.cos(r) - y * sy * Math.sin(r) + tx;
    const my = x * sx * Math.sin(r) + y * sy * Math.cos(r) + ty;
    return { x: W / 2 + (PET_FOOT.x + mx * unit - cam.x) * cam.zoom, y: H / 2 + (PET_FOOT.y + (my - BODY.bottom) * unit - cam.y) * cam.zoom };
  };
  const outline = view.frame.bodyPath
    .split("C")
    .slice(1)
    .map((seg) => {
      const n = numbers(seg);
      return toFrame(n[4]!, n[5]!);
    });
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const e of view.frame.eyes) {
    const [ea, eb, ec, ed, ee, ef] = numbers(e.matrix) as [number, number, number, number, number, number];
    // the capsule (bloub shape.ts capsulePath): M(-hw, -hh + r) A r r 0 0 1 (-hw + r, -hh) ...
    const mv = numbers(e.d.slice(1, e.d.indexOf("A")));
    const cap = numbers(e.d.slice(e.d.indexOf("A") + 1, e.d.indexOf("L")))[0]!;
    const hw = -mv[0]!;
    const hh = cap - mv[1]!;
    for (let i = 0; i <= 16; i++) {
      const th = (Math.PI * i) / 16;
      for (const [px, py] of [
        [-cap * Math.cos(th) - (hw - cap) * Math.sign(Math.cos(th)), -hh + cap - cap * Math.sin(th)],
        [cap * Math.cos(th), hh - cap + cap * Math.sin(th)],
      ] as const) {
        const p = toFrame(ea * px + ec * py + ee, eb * px + ed * py + ef);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
    }
  }
  return { outline, eyes: { x0, x1, y0, y1 } };
}

const insidePolygon = (poly: readonly Point[], x: number, y: number): boolean => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const p = poly[i]!;
    const q = poly[j]!;
    if (p.y > y !== q.y > y && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) c = !c;
  }
  return c;
};

/** The centred play button over frame 0, in frame px at the reference size: the page's 116 x 102 CSS px galet over the
 *  16:9 poster at its 1,280 px desktop width (FilmTrigger.module.css), a social player's button (about 150 px) on the
 *  narrow films' thumbnails. */
export const POSTER_BUTTON: Record<Aspect, { w: number; h: number }> = { wide: { w: 174, h: 153 }, square: { w: 150, h: 150 }, vertical: { w: 150, h: 150 } };
/** Where the eyes must stay through bar 1 (FILM_SPEC §2): the frame, 24 px in; in 9:16 the band every essential element
 *  stays in (y 250–1670: the phone players' UI covers the rest). The caption band may take the pebble (it is not
 *  kinetic type or a click target). */
const COLD_SAFE: Record<Aspect, { y0: number; y1: number }> = { wide: { y0: 24, y1: 1056 }, square: { y0: 24, y1: 1056 }, vertical: { y0: 250, y1: 1670 } };

/** Every problem with bar 1's framing (an empty list means OVERRIDES §46 P1-2's rules hold in all three aspects). */
export function checkColdOpen(): string[] {
  const out: string[] = [];
  for (const a of ASPECT_IDS) {
    const { width: W, height: H } = REFERENCE[a];
    const third = DESK_CAMERA.cold.third[a];
    for (let f = 0; f < 72; f++) {
      const { outline, eyes } = coldPebbleOnFrame(a, f);
      const safe = COLD_SAFE[a];
      if (eyes.x0 < 24 || eyes.x1 > W - 24 || eyes.y0 < safe.y0 || eyes.y1 > safe.y1) out.push(`${a} bar 1 f${f}: an eye leaves x 24-${W - 24}, y ${safe.y0}-${safe.y1} (x ${eyes.x0.toFixed(0)}-${eyes.x1.toFixed(0)}, y ${eyes.y0.toFixed(0)}-${eyes.y1.toFixed(0)})`);
      if (f !== 0) continue;
      const inThird = third === "right" ? eyes.x0 >= (2 * W) / 3 + 8 : eyes.x1 <= W / 3 - 8;
      if (!inThird) out.push(`${a} frame 0: the eyes (x ${eyes.x0.toFixed(0)}-${eyes.x1.toFixed(0)}) are not inside the ${third} third`);
      const b = POSTER_BUTTON[a];
      let on = 0;
      for (let y = H / 2 - b.h / 2; y <= H / 2 + b.h / 2; y += 3) for (let x = W / 2 - b.w / 2; x <= W / 2 + b.w / 2; x += 3) if (insidePolygon(outline, x, y)) on++;
      if (on) out.push(`${a} frame 0: the body reaches the play button's area (${on} sample points)`);
      const edges = [outline.some((p) => p.x < 0), outline.some((p) => p.y < 0), outline.some((p) => p.x > W), outline.some((p) => p.y > H)].filter(Boolean).length;
      if (edges < (a === "vertical" ? 1 : 2)) out.push(`${a} frame 0: the frame crops the body at ${edges} edge(s), not ${a === "vertical" ? 1 : 2}`);
    }
  }
  return out;
}
