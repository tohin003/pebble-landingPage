// Motion spec for the films and loops: timing, easing, springs, camera, cursor, typing, type sizes and colour tokens.
// Source: R5 (research/r5-scripts/spec-extracted.ts), unchanged except FPS.film = 30 (decision D7: every film and loop
// renders at 30 fps; R5 assumed 60). Frame counts always come from sec(s, fps), never hard-coded.

import {Easing, interpolate, random} from 'remotion';

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
