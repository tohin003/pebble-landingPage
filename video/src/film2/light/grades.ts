// The light of the film as grades (TREATMENT §3.3, §5.4; §5.1 kind 7). Each section has a light; a light change is
// continuous over at least 0.5 s (30 frames at 60 fps) on E-move, never a step, and at most one large luminance change
// a second (WCAG 2.3.1 allows three flashes; the film allows one large change).
//
//   morning  Act I: soft, cool, on the sage-white page around the narrow aperture
//   warm     the Drop: it warms as the frame opens
//   day      the rings: bright day, one key light above left
//   dusk     the quiet passage only: the Veil's own dusk blue, the brand's one allowed exception; the ground dims
//   evening  the climax: evening warmth, on Pebble's light theme
//   page     the convergence and the title: the page again, neutral
//   night    for dark-theme scenes in the tour and kit (the hero film has no night arc: §3.3)
//
// A grade is a small set of numbers, so it can be interpolated, applied in CSS (light/Grade.tsx), modelled for the
// luminance checks (gradeLuminance) and baked into a .cube LUT (light/lut.ts) with the same arithmetic. Grades stay
// subtle on purpose: the UI under them is real, and must keep its own colours closely enough to read as itself.
import { COLOR, LIGHT, TRANSITION, f60 } from "../tokens";
import { E_MOVE, clamp01, curve } from "../motion/ease";

export interface Grade {
  name: string;
  /** CSS brightness() */
  brightness: number;
  /** CSS contrast() */
  contrast: number;
  /** CSS saturate() */
  saturate: number;
  /** −1 cool … +1 warm: a soft-light wash, 14 % at ±1 */
  warmth: number;
  /** an extra soft-light tint (the dusk blue) and its amount 0..0.2 */
  tint: string;
  tintAmount: number;
  /** extra darkening of the ground only (multiply), 0..0.3: "the ground dims" */
  groundDim: number;
  /** the key light's pool, above left (screen), 0..0.12 */
  keyLight: number;
  /** the vignette, tinted with the brand's shade green, 0.06–0.10 */
  vignette: number;
}

const WARM = "#FFB36B";
const COOL = "#8FB6D9";

export const GRADES = {
  morning: { name: "morning", brightness: 1.0, contrast: 0.98, saturate: 0.95, warmth: -0.3, tint: COOL, tintAmount: 0, groundDim: 0, keyLight: 0.05, vignette: 0.06 },
  warm: { name: "warm", brightness: 1.0, contrast: 1.01, saturate: 1.02, warmth: 0.32, tint: WARM, tintAmount: 0, groundDim: 0, keyLight: 0.07, vignette: 0.07 },
  day: { name: "day", brightness: 1.0, contrast: 1.03, saturate: 1.02, warmth: 0.08, tint: WARM, tintAmount: 0, groundDim: 0, keyLight: 0.08, vignette: 0.07 },
  dusk: { name: "dusk", brightness: 0.93, contrast: 1.0, saturate: 0.9, warmth: -0.18, tint: COLOR.dusk, tintAmount: 0.15, groundDim: 0.16, keyLight: 0.03, vignette: 0.1 },
  evening: { name: "evening", brightness: 0.985, contrast: 1.02, saturate: 1.03, warmth: 0.45, tint: WARM, tintAmount: 0, groundDim: 0.04, keyLight: 0.07, vignette: 0.08 },
  page: { name: "page", brightness: 1, contrast: 1, saturate: 1, warmth: 0, tint: WARM, tintAmount: 0, groundDim: 0, keyLight: 0.03, vignette: 0.06 },
  night: { name: "night", brightness: 0.86, contrast: 1.04, saturate: 0.92, warmth: -0.3, tint: COOL, tintAmount: 0.05, groundDim: 0.2, keyLight: 0.04, vignette: 0.1 },
} as const satisfies Record<string, Grade>;
export type GradeName = keyof typeof GRADES;

/* ---------------------------------------------------------------- colour arithmetic -------------------------- */

export type RGB = [number, number, number]; // sRGB, 0..1
export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
};
export const rgbToHex = (c: RGB): string =>
  "#" + c.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
/** WCAG relative luminance of an sRGB colour. */
export const relLuminance = (c: RGB): number => 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]);
/** Mix two colours in linear light. */
export const mixLinear = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => toSrgb(toLin(a[i]!) + (toLin(b[i]!) - toLin(a[i]!)) * t)) as RGB;

/** W3C soft-light, per channel (backdrop cb, source cs). */
const softLight = (cb: number, cs: number): number => {
  if (cs <= 0.5) return cb - (1 - 2 * cs) * cb * (1 - cb);
  const d = cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb);
  return cb + (2 * cs - 1) * (d - cb);
};
const screen = (cb: number, cs: number) => cb + cs - cb * cs;

/** The CSS filter chain brightness() contrast() saturate(), as Chrome applies it to sRGB values. */
export const applyFilter = (c: RGB, g: Pick<Grade, "brightness" | "contrast" | "saturate">): RGB => {
  let [r, gg, b] = c.map((v) => v * g.brightness) as RGB;
  [r, gg, b] = [r, gg, b].map((v) => (v - 0.5) * g.contrast + 0.5) as RGB;
  const s = g.saturate;
  const R = (0.2126 + 0.7874 * s) * r + (0.7152 - 0.7152 * s) * gg + (0.0722 - 0.0722 * s) * b;
  const G = (0.2126 - 0.2126 * s) * r + (0.7152 + 0.2848 * s) * gg + (0.0722 - 0.0722 * s) * b;
  const B = (0.2126 - 0.2126 * s) * r + (0.7152 - 0.7152 * s) * gg + (0.0722 + 0.9278 * s) * b;
  return [R, G, B].map(clamp01) as RGB;
};

/** The warmth and tint washes, as soft-light layers at their alpha. */
export const applyWashes = (c: RGB, g: Grade): RGB => {
  let out = c;
  const warmA = Math.abs(g.warmth) * 0.14;
  if (warmA > 0) {
    const w = hexToRgb(g.warmth >= 0 ? WARM : COOL);
    out = out.map((v, i) => v + (softLight(v, w[i]!) - v) * warmA) as RGB;
  }
  if (g.tintAmount > 0) {
    const t = hexToRgb(g.tint);
    out = out.map((v, i) => v + (softLight(v, t[i]!) - v) * g.tintAmount) as RGB;
  }
  return out.map(clamp01) as RGB;
};

/** A colour through a grade (filter, then washes, then the key light at `key` 0..1 of its pool). */
export const gradeColor = (c: RGB, g: Grade, key = 0.5, ground = false): RGB => {
  let out = applyWashes(applyFilter(c, g), g);
  if (ground && g.groundDim > 0) out = out.map((v) => v * (1 - g.groundDim)) as RGB;
  const k = g.keyLight * key;
  if (k > 0) out = out.map((v) => screen(v, k)) as RGB;
  return out.map(clamp01) as RGB;
};

/** The approximate mean relative luminance of a frame on the page or the riverbed under a grade (for the checks). */
export const gradeLuminance = (g: Grade, base: string = COLOR.riverbedMid, ground = true): number =>
  relLuminance(gradeColor(hexToRgb(base), g, 0.5, ground)) * (1 - g.vignette * 0.35);

/* ---------------------------------------------------------------- interpolation and cues ---------------------- */

export const mixGrade = (a: Grade, b: Grade, t: number): Grade => {
  const k = clamp01(t);
  const n = (x: number, y: number) => x + (y - x) * k;
  // a tint fades out and in through its amount; the colour switches where the amount is smallest
  const tint = a.tintAmount === 0 ? b.tint : b.tintAmount === 0 ? a.tint : k < 0.5 ? a.tint : b.tint;
  return {
    name: k < 0.5 ? a.name : b.name,
    brightness: n(a.brightness, b.brightness),
    contrast: n(a.contrast, b.contrast),
    saturate: n(a.saturate, b.saturate),
    warmth: n(a.warmth, b.warmth),
    tint,
    tintAmount: n(a.tintAmount, b.tintAmount),
    groundDim: n(a.groundDim, b.groundDim),
    keyLight: n(a.keyLight, b.keyLight),
    vignette: n(a.vignette, b.vignette),
  };
};

export interface LightCue {
  /** the frame the change starts */
  at: number;
  to: GradeName | Grade;
  /** frames the change takes: at least 30 at 60 fps (checked) */
  frames: number;
  ease?: string;
}

const resolve = (g: GradeName | Grade): Grade => (typeof g === "string" ? GRADES[g] : g);

/** The grade on `frame`, given a starting grade and sorted cues. */
export const gradeAt = (frame: number, initial: GradeName | Grade, cues: readonly LightCue[]): Grade => {
  let g = resolve(initial);
  for (const c of cues) {
    if (frame < c.at) break;
    const to = resolve(c.to);
    const u = c.frames > 0 ? (frame - c.at) / c.frames : 1;
    if (u >= 1) {
      g = to;
      continue;
    }
    return mixGrade(g, to, (c.ease ? curve(c.ease) : E_MOVE)(u));
  }
  return g;
};

/** Problems in a cue list: steps (shorter than the minimum), overlaps, unsorted cues. */
export const checkLightCues = (cues: readonly LightCue[], fps: number): string[] => {
  const out: string[] = [];
  const min = f60(TRANSITION.light.minFrames, fps);
  cues.forEach((c, i) => {
    if (c.frames < min) out.push(`light cue ${i} (${typeof c.to === "string" ? c.to : c.to.name}) takes ${c.frames} frames; a light change takes at least ${min} (0.5 s): never a step`);
    const prev = cues[i - 1];
    if (prev && c.at < prev.at + prev.frames) out.push(`light cue ${i} starts on ${c.at}, before cue ${i - 1} finishes (${prev.at + prev.frames})`);
  });
  return out;
};

/** Where the key light sits (frame UV) and how far its pool reaches. */
export const KEY_LIGHT = { u: LIGHT.key.x, v: LIGHT.key.y, reach: 0.95 } as const;
