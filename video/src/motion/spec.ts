// Motion spec for the films and loops: timing, easing, springs, camera, cursor, typing, type sizes and colour tokens.
// Source: R5 (research/r5-scripts/spec-extracted.ts), unchanged except FPS.film = 30 (decision D7: every film and loop
// renders at 30 fps; R5 assumed 60). Frame counts always come from sec(s, fps), never hard-coded.
// Lane G1 appended the presets block at the end of this file (and `spring` to this import); the R5 block is unchanged.

import {Easing, interpolate, random, spring} from 'remotion';

/* ---------- frame rates & time ---------- */
export const FPS = {film: 30, filmFallback: 30, loop: 30} as const;
export const sec = (s: number, fps: number) => Math.round(s * fps); // the ONLY way to make frame counts

/* ---------- timing tokens (seconds) ---------- */
export const T = {
  press: 0.12, micro: 0.18, pop: 0.3,
  wordIn: 0.15, wordStagger: 0.08, letterStagger: 1 / 30, lineStagger: 0.12, listStagger: 0.06,
  textIn: 0.5, cardIn: 0.6, exit: 0.3,
  camera: 0.8, cameraLong: 1.2, fastMove: 0.45, whip: 0.2, crossfade: 0.4,
  blink: 0.18, anticipation: 0.15, lookLead: 0.1, hitLead: 0.1, preClickDwell: 0.15,
  payoffPause: 0.5, minLineHold: 1.2, lastLineHold: 2.0, endCardHold: 3.5,
} as const;
/** Hold for a line that must be read: 0.5 s + 0.3 s/word; last line ≥ 2 s. */
export const holdFor = (words: number, last = false) =>
  Math.max(last ? T.lastLineHold : T.minLineHold, 0.5 + 0.3 * words);
/** Claim / CTA: readable twice at 200 wpm. */
export const holdTwice = (words: number) => Math.max(2.0, 0.6 * words);

/* ---------- music grid ---------- */
export const MUSIC = {bpm: 100, beatsPerBar: 4, firstDownbeatS: 0}; // set from the real track
export const beatFrame = (i: number, fps: number, m = MUSIC) =>
  Math.round((m.firstDownbeatS + (i * 60) / m.bpm) * fps); // from the index — never accumulate
export const barFrame = (bar: number /* 1-based */, fps: number, m = MUSIC) =>
  beatFrame((bar - 1) * m.beatsPerBar, fps, m);

/* ---------- easing by role ---------- */
export const EASE = {
  enter: Easing.bezier(0.16, 1, 0.3, 1),      // arrivals: text, cards, chips (expo-out)
  enterFirm: Easing.bezier(0.23, 1, 0.32, 1), // UI-like arrivals (quint-out)
  camera: Easing.bezier(0.65, 0, 0.25, 1),    // camera: soft start, long landing
  move: Easing.bezier(0.45, 0, 0.55, 1),      // on-screen object moves, colour floods
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),     // exits & zoom-throughs (accelerate away)
  drawer: Easing.bezier(0.32, 0.72, 0, 1),    // sheet/drawer-like panels
  linear: Easing.linear,                      // rotation, progress, constant drift ONLY
  ramp: Easing.bezier(0.85, 0, 0.15, 1),      // speed-ramped camera moves (the energetic recut: the hook's f19-30, the f1188-1211 pull-back)
};
/** Minimum-jerk (Flash & Hogan 1985): rest-to-rest, peak speed = 1.875 × mean. */
export const minJerk = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);

/* ---------- springs for spring({frame, fps, config}) ---------- */
const apple = (duration: number, bounce: number) => ({
  mass: 1,
  stiffness: (2 * Math.PI / duration) ** 2,         // Apple: k = (2π/d)²
  damping: (4 * Math.PI * (1 - bounce)) / duration, // Apple: c = 4π(1−bounce)/d, bounce ≥ 0
  overshootClamping: false,
});
export const SPRING = {
  calm: apple(0.55, 0),      // ζ1.00 k130.5 c22.85  settle 0.65 s — UI cards, panels, text, charts
  snappy: apple(0.35, 0.1),  // ζ0.90 k322.3 c32.31  settle 0.31 s — chips, toggles, cursor release
  premium: apple(0.8, 0.15), // ζ0.85 k61.7  c13.35  0.6% overshoot — hero object, logo landing
  pebble: apple(0.5, 0.35),  // ζ0.65 k157.9 c16.34  6.8% overshoot — mascot hops/pops ONLY
  jelly: apple(0.4, 0.45),   // ζ0.55 k246.7 c17.28 12.6% overshoot — squash recovery, eyes ONLY
} as const;
// Never use Remotion's default {stiffness:100, damping:10} (= Apple 0.63 s / bounce 0.5) on UI or type.

/* ---------- camera ---------- */
export const CAM = {wide: [1.1, 1.4], pane: [1.8, 2.2], punch: [2.5, 3.2], uiReadMinPx: 28, tiltDeg: 0} as const;
export const zoomAt = (frame: number, f0: number, f1: number, s0: number, s1: number) =>
  Math.exp(interpolate(frame, [f0, f1], [Math.log(s0), Math.log(s1)], {
    easing: EASE.camera, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })); // log-space zoom = constant perceived zoom speed

/* ---------- cursor ---------- */
export const cursorTravelS = (distPx: number, targetPx: number) =>
  Math.min(1.1, Math.max(0.45, 0.32 + 0.13 * Math.log2(1 + distPx / targetPx))); // Fitts-shaped
export const cursorAt = (p0: {x: number; y: number}, p1: {x: number; y: number}, t: number, seed: string) => {
  const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
  const arc = (random(seed) < 0.5 ? -1 : 1) * Math.min(80, Math.max(12, 0.08 * d)); // gentle arc
  const cx = (p0.x + p1.x) / 2 - (dy / d) * arc, cy = (p0.y + p1.y) / 2 + (dx / d) * arc;
  const u = minJerk(Math.min(1, Math.max(0, t)));
  return {x: (1 - u) ** 2 * p0.x + 2 * (1 - u) * u * cx + u * u * p1.x,
          y: (1 - u) ** 2 * p0.y + 2 * (1 - u) * u * cy + u * u * p1.y};
};
export const CLICK = {pressScale: 0.88, pressS: 0.06, holdS: 0.04, uiPressScale: 0.97, uiPressS: 0.12} as const; // release: SPRING.snappy

/* ---------- typing & streaming ---------- */
export const typingTimes = (text: string, seed: string, baseS = 0.07): number[] => {
  const out: number[] = []; let t = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) {
      const u1 = Math.max(1e-6, random(`${seed}-a-${i}`)), u2 = random(`${seed}-b-${i}`);
      const z = Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
      let iki = baseS * Math.exp(0.3 * z);             // right-skewed like real inter-key intervals
      if (text[i - 1] === ' ') iki += 0.06;            // word boundary
      if (',.;:!?'.includes(text[i - 1])) iki += 0.22; // clause boundary
      t += iki;
    }
    out.push(t);
  }
  return out; // ≈12–14 chars/s; keep typed prompts ≤ 40 chars
};
export const STREAM = {thinkingS: [0.6, 1.2], wordIntervalS: 0.06, wordFadeS: 0.15, blurPx: 2, maxLines: 4} as const;

/* ---------- type @1920×1080 ---------- */
export const TYPE = {
  hero: {px: [180, 240], weight: [600, 700], tracking: '-0.03em', leading: 0.95, maxWords: 3},
  headline: {px: [104, 128], weight: [550, 650], tracking: '-0.022em', leading: 1.05, maxWordsPerLine: 6},
  support: {px: [56, 72], weight: [450, 520], tracking: '-0.01em', leading: 1.2, maxWords: 12},
  label: {px: [40, 44], weight: [500, 560], tracking: '0.01em', leading: 1.2}, // non-essential only
  cta: {px: [56, 64], maxChars: 32},
  safe: {x: 96, y: 54}, // EBU R95 graphics-safe 5 %
} as const;

/* ---------- look (Pebble src/tokens.css) ---------- */
export const COLOR = {
  ground: '#f8f9f6', side: '#f1f3ee', panel: '#ffffff', ink: '#252c28', secondary: '#5d665e', line: '#e5e9e1',
  pebble: '#536b54', accent: '#506e54', accentSoft: '#b0c2ae', eye: '#ffffff', shadowRgb: '19, 37, 27',
  darkGround: '#191e1b', darkAccent: '#a6c795', darkPebble: '#b4cda6',
} as const;
export const SHADOW = {
  window: `0 2px 4px rgba(${COLOR.shadowRgb},.06), 0 14px 36px rgba(${COLOR.shadowRgb},.10), 0 44px 96px rgba(${COLOR.shadowRgb},.14)`,
  card: `0 1px 2px rgba(${COLOR.shadowRgb},.06), 0 8px 24px rgba(${COLOR.shadowRgb},.10)`,
} as const;
export const FINISH = {grainPercent: 2, grainHz: 24, vignettePercent: [6, 10], glowOpacity: [0.15, 0.25], driftPeriodS: 24, maxBlurPx: 20} as const;

/* ---------- loops ---------- */
export const LOOP = {lengthS: [6, 12], fps: 30, idleHeadS: 0.5, idleTailS: 0.4, resetS: 0.8, payoffHoldS: [1.2, 2.0]} as const;
/** Use periodS = loopS / k (k integer) so frame N ≡ frame 0. */
export const periodic = (frame: number, fps: number, periodS: number, phase = 0) =>
  Math.sin(2 * Math.PI * (frame / fps / periodS) + phase);

/* =====================================================================================================================
 * PRESETS (lane G1). The motion vocabulary every scene uses, built only from the R5 constants above.
 * Rules they encode:
 * - one-shot moves clamp; opacity, colour and data never spring; the character springs (pebble, jelly) are for the
 *   pebble only, never for UI or type;
 * - a landed element is dead still: every entrance returns FX_REST exactly (no filter, no transform) once it is done;
 * - cameras ease with EASE.camera and zoom in log space; cursors travel on minimum-jerk arcs, Fitts-timed;
 * - every duration is seconds through sec(), so the same preset works at any frame rate.
 * =================================================================================================================== */

export type Ease = (t: number) => number;
type SpringConfig = (typeof SPRING)[keyof typeof SPRING];

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Extra timing tokens (seconds), from R5 §4, §5.3, §5.4, §5.7 and §5.8. */
export const T2 = {
  lineOut: 0.2, // a line leaves: blur-out plus fade, 40–50 % shorter than its entrance (R5 §4)
  cardOut: 0.3, // card exit, −12 px (R5 §5.7)
  inkStagger: 0.08, // per-word ink (R5 §4 B)
  letterIn: 0.2, // per-letter opacity 0.3 → 1 for the name only (R5 §4 D)
  drawCheck: 0.35, // a check mark drawing on (R5 §5.7)
  ringIn: 0.4, // callout ring draws on (R5 §5.8)
  ringOut: 0.2, // callout fades (R5 §5.8)
  labelLag: 0.12, // callout label after its ring (R5 §5.8)
  cursorFade: 0.15, // the cursor hides or appears (R5 §5.4)
  dimIn: 0.4, // spotlight: the rest of the UI dims (R5 §5.3)
  dimOut: 0.3,
  flood: 0.4, // colour flood between grounds (R5 §7.1)
} as const;

/** 0 → 1 over `dur` frames from frame `at`, eased; 0 before, 1 after. */
export const ramp = (frame: number, at: number, dur: number, easing: Ease = EASE.enter): number =>
  interpolate(frame, [at, at + Math.max(1, dur)], [0, 1], {...CLAMP, easing});

/** A spring released at frame `at` (0 before it). Use SPRING.calm / snappy on UI, premium on the hero object. */
export const springAt = (frame: number, fps: number, at: number, config: SpringConfig = SPRING.calm): number =>
  frame < at ? 0 : spring({frame: frame - at, fps, config});

/** Frames a line must hold to be read: 0.5 s + 0.3 s per word, at least 1.2 s (2 s for the last line). */
export const holdFrames = (words: number, fps: number, last = false) => sec(holdFor(words, last), fps);
export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/* ---------- effects as numbers (combine, then convert once) ---------- */

/** An element's animated look. Entrances and exits return one; combine them with mixFx, convert with fxStyle. */
export interface Fx {
  opacity: number;
  blur: number; // px
  dx: number; // px
  dy: number; // px
  scale: number;
}
export const FX_REST: Fx = {opacity: 1, blur: 0, dx: 0, dy: 0, scale: 1};
export const mixFx = (...list: readonly Fx[]): Fx =>
  list.reduce(
    (a, b) => ({opacity: a.opacity * b.opacity, blur: a.blur + b.blur, dx: a.dx + b.dx, dy: a.dy + b.dy, scale: a.scale * b.scale}),
    FX_REST,
  );
/** CSS for an Fx. A resting Fx gives {opacity: 1} and nothing else, so a landed element is pixel-still. */
export const fxStyle = (fx: Fx): {opacity: number; filter?: string; transform?: string} => {
  const style: {opacity: number; filter?: string; transform?: string} = {opacity: Math.max(0, Math.min(1, fx.opacity))};
  if (fx.blur > 0.02) style.filter = `blur(${fx.blur.toFixed(2)}px)`;
  if (Math.abs(fx.dx) > 0.01 || Math.abs(fx.dy) > 0.01 || Math.abs(fx.scale - 1) > 1e-4) {
    style.transform = `translate(${fx.dx.toFixed(2)}px, ${fx.dy.toFixed(2)}px) scale(${fx.scale.toFixed(5)})`;
  }
  return style;
};

/* ---------- entrances and exits ---------- */

/** (A) Per-word blur-in: blur 6 px → 0 and opacity 0 → 1 in 0.15 s, no translate. The default for headlines. */
export const blurIn = (frame: number, at: number, fps: number, px = 6): Fx => {
  const p = ramp(frame, at, sec(T.wordIn, fps), EASE.enter);
  return p >= 1 ? FX_REST : {...FX_REST, opacity: p, blur: (1 - p) * px};
};
/**
 * The slam (the energetic recut, ENERGY_SPEC §7): a line lands ON its beat. `landing` is the cue's `in`, the frame it
 * is first at rest; over the 3 frames before it (0.1 s), p = ramp(frame, landing − 3, 3, EASE.exit), so it accelerates
 * into the beat: scale 1 + (k − 1)(1 − p) about the line's anchor (its left middle, or its centre when centred),
 * blur 6(1 − p) px, opacity min(1, 3p). FX_REST from the landing frame: landed type is dead still. k is SLAM.k's (the
 * overscale, ≤ 1.10 / 1.06 / 1.04 by aspect and place).
 */
export const SLAM = {preRollS: 0.1, blur: 6, k: {wide: 1.1, narrow: 1.06, narrowColumn: 1.04}} as const;
export const slamPreRoll = (fps: number) => Math.max(1, sec(SLAM.preRollS, fps));
export const slamIn = (frame: number, landing: number, fps: number, k: number, px: number = SLAM.blur): Fx => {
  if (frame >= landing) return FX_REST;
  const n = slamPreRoll(fps);
  const p = ramp(frame, landing - n, n, EASE.exit);
  return {...FX_REST, opacity: Math.min(1, 3 * p), blur: px * (1 - p), scale: 1 + (k - 1) * (1 - p)};
};
/** A line or element leaves: blur 0 → 8 px and opacity → 0 over 0.2 s, accelerating away. FX_REST before `at`. */
export const blurOut = (frame: number, at: number, fps: number, px = 8, dur: number = T2.lineOut): Fx => {
  if (frame < at) return FX_REST;
  const p = ramp(frame, at, sec(dur, fps), EASE.exit);
  return {...FX_REST, opacity: 1 - p, blur: p * px};
};
/** Card or panel in (R5 §5.7): +32 px → 0 on the calm spring, opacity over 0.3 s (opacity never springs), optional blur. */
export const riseIn = (frame: number, at: number, fps: number, dist = 32, blurPx = 0): Fx => {
  if (frame >= at + sec(0.9, fps)) return FX_REST;
  const s = springAt(frame, fps, at, SPRING.calm);
  const o = ramp(frame, at, sec(0.3, fps), EASE.enter);
  return {...FX_REST, opacity: o, dy: (1 - s) * dist, blur: (1 - o) * blurPx};
};
/** Card exit (R5 §5.7): 0.3 s, accelerating, −12 px, opacity → 0. */
export const sinkOut = (frame: number, at: number, fps: number, dist = 12): Fx => {
  if (frame < at) return FX_REST;
  const p = ramp(frame, at, sec(T2.cardOut, fps), EASE.exit);
  return {...FX_REST, opacity: 1 - p, dy: -dist * p};
};
/** A chip or badge pops in on the snappy spring from 0.94 (never from 0), opacity over 0.18 s. */
export const popIn = (frame: number, at: number, fps: number, from = 0.94): Fx => {
  if (frame >= at + sec(0.6, fps)) return FX_REST;
  const s = springAt(frame, fps, at, SPRING.snappy);
  return {...FX_REST, opacity: ramp(frame, at, sec(T.micro, fps), EASE.enter), scale: from + (1 - from) * s};
};
export const fadeIn = (frame: number, at: number, fps: number, dur: number = T.micro): Fx => {
  const p = ramp(frame, at, sec(dur, fps), EASE.enter);
  return p >= 1 ? FX_REST : {...FX_REST, opacity: p};
};
export const fadeOut = (frame: number, at: number, fps: number, dur: number = T.micro): Fx =>
  frame < at ? FX_REST : {...FX_REST, opacity: 1 - ramp(frame, at, sec(dur, fps), EASE.exit)};
/** Spotlight (R5 §5.3): the rest of the UI goes to 45 % and 6 px blur over 0.4 s from `at`, and back over 0.3 s from `release`. */
export const dimFx = (frame: number, at: number, release: number, fps: number): Fx => {
  const k = ramp(frame, at, sec(T2.dimIn, fps), EASE.enter) * (1 - ramp(frame, release, sec(T2.dimOut, fps), EASE.enter));
  return k <= 0 ? FX_REST : {...FX_REST, opacity: 1 - 0.55 * k, blur: 6 * k};
};

/* ---------- presses and clicks (R5 §5.4) ---------- */

/** The cursor's own press: 1 → 0.88 in 0.06 s, held 0.04 s, released on the snappy spring. `clicks` are click-down frames. */
export const cursorPressScale = (frame: number, clicks: readonly number[], fps: number): number => {
  let at = -Infinity;
  for (const c of clicks) if (c <= frame && c > at) at = c;
  if (!Number.isFinite(at)) return 1;
  const down = Math.max(1, sec(CLICK.pressS, fps));
  const hold = sec(CLICK.holdS, fps);
  if (frame < at + down) return interpolate(frame, [at, at + down], [1, CLICK.pressScale], {...CLAMP, easing: EASE.enterFirm});
  if (frame < at + down + hold) return CLICK.pressScale;
  return CLICK.pressScale + (1 - CLICK.pressScale) * spring({frame: frame - at - down - hold, fps, config: SPRING.snappy});
};
/** A pressed UI target: 0.97 from the click-down frame for 0.12 s, then released on the snappy spring. */
export const pressScale = (frame: number, at: number, fps: number): number => {
  if (frame < at) return 1;
  const held = sec(CLICK.uiPressS, fps);
  if (frame < at + held) return CLICK.uiPressScale;
  return CLICK.uiPressScale + (1 - CLICK.uiPressScale) * spring({frame: frame - at - held, fps, config: SPRING.snappy});
};

/* ---------- camera (the camera itself is motion/camera.ts: arrival keys, log-space zoom, smooth pan-zoom) ---------- */

/** The frame of a move's peak speed (where a cut on action belongs, R5 §7.1). */
export const fastestFrame = (at: number, dur: number, ease: Ease = EASE.camera): number => {
  let best = at;
  let bestV = -Infinity;
  for (let f = at; f < at + dur; f++) {
    const v = ease((f + 1 - at) / dur) - ease((f - at) / dur);
    if (v > bestV) {
      bestV = v;
      best = f;
    }
  }
  return best;
};

/* ---------- cursor paths ---------- */

/**
 * A cursor key: the pointer ARRIVES at (x, y) on frame `at` and rests there until the next key's move begins. The move
 * into a key starts `travel` frames before `at` (default: the Fitts-shaped time for the distance, 0.45–1.1 s).
 */
export interface CursorKey {
  at: number;
  x: number;
  y: number;
  travel?: number;
  /** target size in the path's units for the Fitts time (default 40) */
  target?: number;
  seed?: string;
}
export const cursorTravelFrames = (from: {x: number; y: number}, to: CursorKey, fps: number): number =>
  to.travel ?? sec(cursorTravelS(Math.hypot(to.x - from.x, to.y - from.y), to.target ?? 40), fps);
/** Where the pointer is on `frame` (minimum-jerk progress along a gently arced quadratic Bézier, R5 §5.4). */
export const cursorPathAt = (frame: number, keys: readonly CursorKey[], fps: number): {x: number; y: number; moving: boolean} => {
  const first = keys[0];
  if (!first) return {x: 0, y: 0, moving: false};
  if (frame <= first.at) return {x: first.x, y: first.y, moving: false};
  let prev = first;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    const travel = cursorTravelFrames(prev, k, fps);
    const start = k.at - travel;
    if (frame < k.at) {
      if (frame <= start) return {x: prev.x, y: prev.y, moving: false};
      const p = cursorAt(prev, k, (frame - start) / travel, k.seed ?? `cursor-${i}`);
      return {...p, moving: true};
    }
    prev = k;
  }
  return {x: prev.x, y: prev.y, moving: false};
};

/* ---------- look (Pebble src/tokens.css, comp 2 and comp 3 of the landing page; DESIGN.md) ---------- */

export const LOOK = {
  room: '#E7ECE3', // the stage behind a window (comp 3 --room)
  soft: '#F0F5ED',
  line2: '#D5DCD1',
  trail: '#AABDA7', // the pebble's path (decorative only, never text)
  stone: '#BFCEBC',
  accentPress: '#45604A',
  riverbed: {g0: '#E7ECE2', g1: '#D3DDCD', g2: '#C6D3C0'}, // the wallpaper's ground (comp 2 wallpaper.py)
  sageDeep: '#4A5F4B', // the far edge of the sage field's own light
  onSage: '#FFFFFF',
  onSageSoft: 'rgba(255, 255, 255, 0.72)',
  dark: {
    ground: '#191E1B',
    ground2: '#151A17',
    panel: '#212822',
    ink: '#E0E7DE',
    ink2: '#ADB9AB',
    line: '#2B342C',
    accent: '#A6C795',
    pebble: '#B4CDA6',
    pebbleEye: '#23351F',
  },
  traffic: {close: '#E8705F', minimize: '#EBB54B', zoom: '#66B65E', off: '#DADFD6', edge: 'rgba(0, 0, 0, 0.14)'},
} as const;

/* ---------- typography by role (FILM_SPEC §3 and DESIGN.md §3 over R5 §4: Fraunces 350, SOFT 100, WONK 0) ---------- */

/**
 * Faces, weights, tracking and leading per role. Sizes are aspect-aware and come from useLayout().type. Fraunces is
 * never italic and never accent-coloured (DESIGN.md §3); Geist Mono, with tabular numerals, is the data's voice: the
 * URL and anything that carries a number (docs/PHILOSOPHY.md, "Type"; lane v2-film).
 */
export const TYPO = {
  /** kinetic headlines and the claim: calm at 350 */
  display: {family: 'display', weight: 350, tracking: '-0.02em', leading: 1.05, axes: '"SOFT" 100, "WONK" 0'},
  /** support lines and the CTA's words */
  text: {family: 'sans', weight: 500, tracking: '-0.01em', leading: 1.22, axes: undefined},
  /** the `pebble` wordmark (Inter 650, −0.035 em, lowercase; the site header's is −0.8 px at 25 px) */
  wordmark: {family: 'sans', weight: 650, tracking: '-0.035em', leading: 1, axes: undefined},
  /** URLs and paths */
  mono: {family: 'mono', weight: 500, tracking: '0em', leading: 1.3, axes: undefined},
  /** a support line that carries a number ("Apache-2.0"): Geist Mono at the support line's place */
  data: {family: 'mono', weight: 500, tracking: '0em', leading: 1.25, axes: undefined},
  /** small print ("Shown with sample data") */
  small: {family: 'sans', weight: 400, tracking: '0em', leading: 1.3, axes: undefined},
} as const;
export type TypoRole = keyof typeof TYPO;
