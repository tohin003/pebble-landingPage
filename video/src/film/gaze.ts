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
import { ASPECT_IDS, DESK_CAMERA, FILM_PEBBLE_CUES, FPS, PEBBLE_INSTANCES, PET, PET_FOOT, entryLook, landFoot, time, type Aspect } from "./timeline";

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
 * The cold open's poster rules (OVERRIDES §46 P1-2, §47 R2-3): frame 0 is the page's film poster and every thumbnail,
 * under a centred play button, so the eyes sit in one third and the button's area stays dark; the frame crops the body
 * ("the eyes plus one curve"); the eyes stay whole in frame, and above the caption band, through bar 1. In 16:9 the
 * page's first screen shows the poster's top (§47 R2-3), so there the eyes, with body round them, sit in the frame's
 * top 30 %, legible at 360 px wide, looking toward the pointer's entry.
 * ============================================================================================================== */

const numbers = (s: string) => (s.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);

export interface EyeBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The bar-1 pebble on `frame`, in frame px at the reference size: its outline (the body path's cubic segments, each
 *  flattened to 12 points, so the outline follows the curve and not its chords), the box of its two eyes and each eye's
 *  own box (each eye's capsule, through its matrix and the pose's motion transform). */
export function coldPebbleOnFrame(a: Aspect, frame: number): { outline: Point[]; eyes: EyeBox; each: EyeBox[] } {
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
  const d = view.frame.bodyPath;
  const start = numbers(d.slice(d.indexOf("M") + 1, d.indexOf("C")));
  let px = start[0]!;
  let py = start[1]!;
  const outline: Point[] = [];
  for (const seg of d.split("C").slice(1)) {
    const n = numbers(seg);
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      const u = 1 - t;
      const b0 = u * u * u;
      const b1 = 3 * u * u * t;
      const b2 = 3 * u * t * t;
      const b3 = t * t * t;
      outline.push(toFrame(b0 * px + b1 * n[0]! + b2 * n[2]! + b3 * n[4]!, b0 * py + b1 * n[1]! + b2 * n[3]! + b3 * n[5]!));
    }
    px = n[4]!;
    py = n[5]!;
  }
  const each: EyeBox[] = [];
  for (const e of view.frame.eyes) {
    const [ea, eb, ec, ed, ee, ef] = numbers(e.matrix) as [number, number, number, number, number, number];
    // the capsule (bloub shape.ts capsulePath): M(-hw, -hh + r) A r r 0 0 1 (-hw + r, -hh) ...
    const mv = numbers(e.d.slice(1, e.d.indexOf("A")));
    const cap = numbers(e.d.slice(e.d.indexOf("A") + 1, e.d.indexOf("L")))[0]!;
    const hw = -mv[0]!;
    const hh = cap - mv[1]!;
    const box: EyeBox = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let i = 0; i <= 16; i++) {
      const th = (Math.PI * i) / 16;
      for (const [qx, qy] of [
        [-cap * Math.cos(th) - (hw - cap) * Math.sign(Math.cos(th)), -hh + cap - cap * Math.sin(th)],
        [cap * Math.cos(th), hh - cap + cap * Math.sin(th)],
      ] as const) {
        const p = toFrame(ea * qx + ec * qy + ee, eb * qx + ed * qy + ef);
        box.x0 = Math.min(box.x0, p.x);
        box.x1 = Math.max(box.x1, p.x);
        box.y0 = Math.min(box.y0, p.y);
        box.y1 = Math.max(box.y1, p.y);
      }
    }
    each.push(box);
  }
  const eyes: EyeBox = {
    x0: Math.min(...each.map((b) => b.x0)),
    x1: Math.max(...each.map((b) => b.x1)),
    y0: Math.min(...each.map((b) => b.y0)),
    y1: Math.max(...each.map((b) => b.y1)),
  };
  return { outline, eyes, each };
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

/** The centred play button over frame 0, in frame px at the reference size. 16:9: the page's galet over the poster
 *  (FilmTrigger.module.css), 116 x 102 CSS px on the 1,280 px desktop frame, and 72 x 63 CSS px on a phone's frame,
 *  taken at the narrowest, a 320 px screen less its 16 px gutters (288 x 162 CSS px), where the button covers most of
 *  the frame; 1:1 and 9:16: a social player's button (about 150 px) on the narrow films' thumbnails. */
export const POSTER_BUTTONS: Record<Aspect, readonly { w: number; h: number; on: string }[]> = {
  wide: [
    { w: (116 * 1920) / 1280, h: (102 * 1080) / 720, on: "the page's desktop frame (116 x 102 CSS px of 1280 x 720)" },
    { w: (72 * 1920) / 288, h: (63 * 1080) / 162, on: "a 320 px phone's frame (72 x 63 CSS px of 288 x 162)" },
  ],
  square: [{ w: 150, h: 150, on: "a social player" }],
  vertical: [{ w: 150, h: 150, on: "a social player" }],
};
/** Where the eyes must stay through bar 1 (FILM_SPEC §2): the frame, 24 px in; in 9:16 the band every essential element
 *  stays in (y 250–1670: the phone players' UI covers the rest). The caption band may take the pebble (it is not
 *  kinetic type or a click target). */
const COLD_SAFE: Record<Aspect, { y0: number; y1: number }> = { wide: { y0: 24, y1: 1056 }, square: { y0: 24, y1: 1056 }, vertical: { y0: 250, y1: 1670 } };
/** 16:9's first-screen rules on frame 0 (OVERRIDES §47 R2-3). The page shows the poster's top 227 of 720 CSS px above
 *  the fold at 1440 × 900, 31.5 % (39.3, 42.9 and 61.7 % at 1470 × 956, 1512 × 982 and 1728 × 1117), so: */
export const COLD_FIRST_SCREEN = {
  /** both eyes inside the frame's top 30 % */
  strip: 0.3,
  /** with body round them: every point within 24 px of the eyes' box (inside the frame and the strip) is on the body */
  ring: 24,
  /** legible (§46 P1-2): each eye at least 30 px tall and 15 px wide on a 360 px wide thumbnail */
  eye360: { h: 30, w: 15 },
  /** "the eyes plus one curve": the frame shows one run of the outline and at most 75 % of the body's area */
  visibleMax: 0.75,
} as const;

/** Every problem with bar 1's framing (an empty list means OVERRIDES §46 P1-2's rules hold in all three aspects, and
 *  §47 R2-3's in 16:9). */
export function checkColdOpen(): string[] {
  const out: string[] = [];
  for (const a of ASPECT_IDS) {
    const { width: W, height: H } = REFERENCE[a];
    const third = DESK_CAMERA.cold.third[a];
    for (let f = 0; f < 72; f++) {
      const { outline, eyes, each } = coldPebbleOnFrame(a, f);
      const safe = COLD_SAFE[a];
      if (eyes.x0 < 24 || eyes.x1 > W - 24 || eyes.y0 < safe.y0 || eyes.y1 > safe.y1) out.push(`${a} bar 1 f${f}: an eye leaves x 24-${W - 24}, y ${safe.y0}-${safe.y1} (x ${eyes.x0.toFixed(0)}-${eyes.x1.toFixed(0)}, y ${eyes.y0.toFixed(0)}-${eyes.y1.toFixed(0)})`);
      if (f !== 0) continue;
      const inThird = third === "right" ? eyes.x0 >= (2 * W) / 3 + 8 : eyes.x1 <= W / 3 - 8;
      if (!inThird) out.push(`${a} frame 0: the eyes (x ${eyes.x0.toFixed(0)}-${eyes.x1.toFixed(0)}) are not inside the ${third} third`);
      for (const b of POSTER_BUTTONS[a]) {
        let on = 0;
        for (let y = H / 2 - b.h / 2; y <= H / 2 + b.h / 2; y += 3) for (let x = W / 2 - b.w / 2; x <= W / 2 + b.w / 2; x += 3) if (insidePolygon(outline, x, y)) on++;
        if (on) out.push(`${a} frame 0: the body reaches the play button's area on ${b.on} (${on} sample points)`);
      }
      const edges = [outline.some((p) => p.x < 0), outline.some((p) => p.y < 0), outline.some((p) => p.x > W), outline.some((p) => p.y > H)].filter(Boolean).length;
      if (edges < (a === "vertical" ? 1 : 2)) out.push(`${a} frame 0: the frame crops the body at ${edges} edge(s), not ${a === "vertical" ? 1 : 2}`);
      if (a !== "wide") continue;
      // 16:9, the page's first screen (OVERRIDES §47 R2-3)
      const R = COLD_FIRST_SCREEN;
      const stripY = R.strip * H;
      if (eyes.y1 > stripY) out.push(`wide frame 0: the eyes reach y ${eyes.y1.toFixed(0)}, below the frame's top ${100 * R.strip} % (y ${stripY})`);
      let bare = 0;
      for (let y = Math.max(0, eyes.y0 - R.ring); y <= Math.min(stripY, eyes.y1 + R.ring); y += 4) for (let x = Math.max(0, eyes.x0 - R.ring); x <= Math.min(W, eyes.x1 + R.ring); x += 4) if (!insidePolygon(outline, x, y)) bare++;
      if (bare) out.push(`wide frame 0: ${bare} sample points within ${R.ring} px of the eyes are off the body (the eyes need body round them in the first screen)`);
      const k = 360 / W;
      each.forEach((e, i) => {
        if ((e.y1 - e.y0) * k < R.eye360.h || (e.x1 - e.x0) * k < R.eye360.w) out.push(`wide frame 0: eye ${i + 1} is ${((e.x1 - e.x0) * k).toFixed(1)} x ${((e.y1 - e.y0) * k).toFixed(1)} px on a 360 px thumbnail, under ${R.eye360.w} x ${R.eye360.h}`);
      });
      const inFrame = outline.map((p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H);
      const runs = inFrame.filter((v, i) => v && !inFrame[(i - 1 + inFrame.length) % inFrame.length]).length;
      if (runs !== 1) out.push(`wide frame 0: the frame shows ${runs} runs of the body's outline, not one curve`);
      const bx0 = Math.min(...outline.map((p) => p.x));
      const bx1 = Math.max(...outline.map((p) => p.x));
      const by0 = Math.min(...outline.map((p) => p.y));
      const by1 = Math.max(...outline.map((p) => p.y));
      let body = 0;
      let shown = 0;
      for (let y = by0; y <= by1; y += 6) for (let x = bx0; x <= bx1; x += 6) if (insidePolygon(outline, x, y)) {
        body++;
        if (x >= 0 && x <= W && y >= 0 && y <= H) shown++;
      }
      if (shown > R.visibleMax * body) out.push(`wide frame 0: the frame shows ${((100 * shown) / body).toFixed(0)} % of the body, over ${100 * R.visibleMax} %`);
      // the look toward the pointer's entry (above the frame, up-left), held until the pointer appears
      const entry = entryLook(a);
      if (!(entry.x < 0 && entry.y < 0)) out.push(`wide: the look toward the pointer's entry is (${entry.x}, ${entry.y}), not up-left`);
      const cues = filmCues(a);
      for (let g = 0; g < coldPointer(a, 1).visible[0]; g++) {
        const held = lookAt(cues, time(g));
        if (!sameGaze(held, entry)) out.push(`wide bar 1 f${g}: the eyes look (${held?.x}, ${held?.y}), not toward the pointer's entry (${entry.x}, ${entry.y})`);
      }
    }
  }
  return out;
}
