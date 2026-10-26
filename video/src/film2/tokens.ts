// Film 2 ("Ripples") design and motion tokens: the one place every shot reads its numbers from.
//
// Sources, all binding (see film2/README.md):
// - colours: docs/DESIGN-LEXINGTON.md §5 (the page's tokens) and shared/pebble/veil.ts (the Veil's dusk family, which
//   the film may use inside the Stealth passage only, TREATMENT §3.3);
// - timings, eases and blur: TREATMENT §5.1 (the seven transition kinds) and §5.3 (camera speeds), given as frames at
//   60 fps there and here; `f60()` converts for a 30 fps master (lead ruling L2 is open);
// - type: TREATMENT §5.2; reading rules: §5.2 and §5.5.
//
// Pure data: no React, no Remotion, no fonts. Validators run it under Bun (qa/), the components import it in the
// browser. Never import ../fonts here: that module loads font files when it is imported.

/** The rate every number in TREATMENT §5 is written at. */
export const REF_FPS = 60;

/** Frames at 60 fps converted to `fps`, rounded: f60(24, 30) = 12. */
export const f60 = (frames60: number, fps: number): number => Math.round((frames60 * fps) / REF_FPS);

/** Seconds to frames at `fps`, rounded (the only way to turn seconds into frame counts). */
export const sec = (s: number, fps: number): number => Math.round(s * fps);

/** A speed in px per frame at 60 fps, converted to px per frame at `fps` (a frame at 30 fps is twice as long). */
export const speed60 = (pxPerFrame60: number, fps: number): number => (pxPerFrame60 * REF_FPS) / fps;

/** An acceleration in px per frame² at 60 fps, converted to `fps`. */
export const accel60 = (pxPerFrame2At60: number, fps: number): number => pxPerFrame2At60 * (REF_FPS / fps) ** 2;

/* ---------------------------------------------------------------- colour (DESIGN-LEXINGTON §5, light first) ---- */

export const COLOR = {
  page: "#F8F9F6", // --bg: the sage-white page (Act I, convergence, title)
  fill: "#EDF0EB", // --fill: the one flat panel
  ink: "#1D2520", // --ink
  ink2: "#5D665E", // --ink-2: muted lines, small print
  line: "#DBE1D9", // --line: the one hairline
  accent: "#506E54", // --accent, light: the ring's hairline on light grounds
  accentDark: "#A6C795", // --accent, dark: the ring on dark grounds
  pebble: "#536B54", // --pebble
  stone: "#BFCEBC", // --stone
  trail: "#AABDA7", // --trail
  shadeRgb: "19, 37, 27", // --shade: every shadow and vignette is this green, never black
  nightPage: "#191E1B", // dark --bg
  nightFill: "#212822", // dark --fill
  nightInk: "#E8EEE6", // dark --ink
  riverbedMid: "#D3DDCD", // the riverbed's mid ground (what shows where no layer is drawn; never black)
  // The Veil's dusk blue (shared/pebble/veil.ts VEIL_LIGHT / VEIL_DARK). The brand's one allowed exception, and only
  // inside the Stealth passage (TREATMENT §3.3, §5.4).
  dusk: "#44528C",
  duskHi: "#7684C6",
  duskDark: "#A3AEEA",
} as const;

/** "r, g, b" for a #rrggbb colour, for rgba() strings. */
export const rgbOf = (hex: string): string => {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
};

/* ---------------------------------------------------------------- eases (CRAFT §3 conventions) --------------- */

/** Cubic-bezier control points. v0 = y1/x1 and v1 = (1-y2)/(1-x2) are the start and end speeds as a multiple of the mean. */
export const BEZIER = {
  /** E-arrive: an incoming shot after a momentum cut; UI that lands. v0 6.25, v1 0. */
  arrive: [0.16, 1, 0.3, 1],
  /** E-leave: a move that leaves into a cut (Material's emphasized accelerate). v0 0, v1 4.25. */
  leave: [0.3, 0, 0.8, 0.15],
  /** E-move: a rest-to-rest move inside a shot; colour and light changes. Peak 1.82 at mid. */
  move: [0.45, 0, 0.55, 1],
  /** The text match cut's curve (HyperFrames text-match-cut: After Effects easy-ease at 85 % influence). */
  match: [0.85, 0, 0.15, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/* ---------------------------------------------------------------- the seven transition kinds (§5.1) ----------- */

/** Every range is [min, max] frames at 60 fps unless it says px. */
export const TRANSITION = {
  ring: {
    burstFrames: [60, 90], // a burst to the frame's edge
    irisFrames: [20, 36], // an iris between places
    featherPx: [24, 48],
    hairlinePx: [1.5, 2], // at 1080 px on the frame's short side
    rippleMaxPx: 6, // the ground ripple's largest displacement
    rippleDecayFrames: 30,
    whooshLeadFrames: 12,
  },
  momentum: {
    leaveFrames: [12, 24], // the outgoing move on E-leave
    glideTauFrames: [15, 30], // the incoming glide's time constant
    speedTolerance: 0.25, // speeds within ±25 % across the cut
    directionToleranceDeg: 30,
    blurPerTravel: 1 / 7, // σ = travel ÷ 7 at the cut
    soundLeadFrames: [8, 16],
    restPxPerFrame: 2, // below this on both sides, a cut falls "between two rests"
  },
  push: {
    frames: [90, 240],
    scale: [1.06, 1.15], // from 1.00, in log space
  },
  swap: {
    outFrames: 8, // blur 0 → 8 px, opacity → 0
    inFrames: 8, // blur 8 → 0 px
    blurPx: 8,
    maxWords: 4,
    firstHoldS: 1.1,
    holdS: [0.65, 1.05],
    leadBeatFrames: [2, 3], // each swap lands 2–3 frames before a beat
  },
  rack: {
    frames: [24, 48],
    blurPx: [10, 16], // at 1080 px
  },
  light: {
    minFrames: 30, // a light change takes at least 30 frames (0.5 s), never a step
    maxFrames: 60, // "or longer" is allowed; this is the usual upper end
    maxLargeChangesPerSecond: 1,
  },
  cardEntrance: { risePx: 24, blurPx: 8, frames: 24 }, // the entrance every ask card shares
} as const;

/** Which of the seven kinds a seam or a move is (TREATMENT §5.1). */
export type TransitionKind = "ring" | "momentum" | "product" | "push" | "swap" | "rack" | "light";
export const TRANSITION_KINDS: readonly TransitionKind[] = ["ring", "momentum", "product", "push", "swap", "rack", "light"];

/* ---------------------------------------------------------------- camera (§5.3) ------------------------------ */

export const CAMERA = {
  readMaxPxPerFrame: 4.6, // sharp text steps while anything is read (up to 9 if a step judders)
  readJudderMaxPxPerFrame: 9,
  travelMaxPxPerFrame: 30, // with σ = travel ÷ 7 along the motion
  whipMinPxPerFrame: 50, // faster only for whips, which are reserved
  glideTauS: [0.25, 0.5],
  driftMaxPxPerFrame: 1, // while the UI acts
  travelS: [0.7, 1.4], // a ring-led move
  tilt: { ryDeg: [8, 20], rxDeg: [4, 12], perspectivePx: [1600, 3000], flattenFrames: [48, 72] },
  uiReadMinPx: 28, // any UI text the viewer must read, at 1080 px after magnification
  pointerHeightPct: [4, 7],
  callout: { veil: 0.45, blurPx: 2.5 },
  depthFactor: { ground: 0.4, ui: 1, near: 1.15 }, // parallax planes (R5 §5.9)
  dofMaxBlurPx: [8, 16], // background, at 1080 px
} as const;

/* ---------------------------------------------------------------- light (§5.4) ------------------------------- */

export const LIGHT = {
  key: { x: 0.18, y: 0.1 }, // one key light, above left, for every shadow (frame UV)
  vignette: [0.06, 0.1],
  grainPct: 2, // only if the lead keeps grain; none is baked by default (OVERRIDES §8 H8)
  grainHz: 24,
  sweep: { frames: [36, 54], coreSigmaPx: 65, haloSigmaPx: 200, angleDeg: 30, coreIntensity: 0.4, haloIntensity: 0.3 },
  lensBlur: { radius: 12, samples: 64 },
} as const;

/** The shadow a Pebble window may cast inside a riverbed picture: DESIGN-LEXINGTON §3.5's --shadow-window, unchanged. */
export const SHADOW_WINDOW = `0 1px 2px rgba(${COLOR.shadeRgb}, 0.08), 0 14px 36px -10px rgba(${COLOR.shadeRgb}, 0.22)`;

/* ---------------------------------------------------------------- type (§5.2) -------------------------------- */

export type Aspect = "16:9" | "1:1" | "9:16";
export type TypeTier = "expressive" | "functional" | "small" | "label" | "data";

/** Font families, as ../fonts.ts registers them (the same woff2 files as the site). */
export const FAMILY = { display: "Fraunces", sans: "Inter", mono: "Geist Mono" } as const;
/** Fraunces' default instance is WONK 1; the brand asks for SOFT 100 and WONK 0 (D14). */
export const FRAUNCES_AXES = '"SOFT" 100, "WONK" 0';

/** px at 1080 px on the frame's short side: [min, max] per aspect. */
export const TYPE_SIZE: Record<TypeTier, Record<Aspect, readonly [number, number]>> = {
  expressive: { "16:9": [72, 96], "1:1": [64, 84], "9:16": [80, 104] },
  functional: { "16:9": [40, 48], "1:1": [44, 52], "9:16": [52, 60] },
  small: { "16:9": [24, 28], "1:1": [24, 28], "9:16": [24, 28] },
  label: { "16:9": [28, 34], "1:1": [28, 34], "9:16": [28, 34] },
  data: { "16:9": [40, 48], "1:1": [44, 52], "9:16": [52, 60] }, // "as the context needs": functional sizes by default
};

export const TYPE_FACE: Record<TypeTier, { family: string; weight: number; tracking: string; leading: number; tabular?: boolean }> = {
  expressive: { family: FAMILY.display, weight: 350, tracking: "-0.022em", leading: 1.08 },
  functional: { family: FAMILY.sans, weight: 450, tracking: "-0.01em", leading: 1.25 },
  small: { family: FAMILY.sans, weight: 400, tracking: "0em", leading: 1.35 },
  label: { family: FAMILY.sans, weight: 500, tracking: "0em", leading: 1.25 },
  data: { family: FAMILY.mono, weight: 400, tracking: "0em", leading: 1.2, tabular: true },
};

/** Entrances and exits, frames at 60 fps (§5.2). */
export const TYPE_MOTION = {
  rise: { frames: 30, lineStagger: 8 }, // a rise from a mask
  wordBlur: { frames: 9, wordStagger: 4, blurPx: 6 }, // a per-word blur-in, no movement
  blurIn: { frames: 8, blurPx: 6 }, // the functional line's blur-in, opacity from 0
  exitRatio: 0.55, // exits are 40–50 % shorter than entrances
} as const;

/** Text keeps 60 px from every edge (at 1080 px on the short side). */
export const SAFE_MARGIN_PX = 60;

/** Reading rules (§5.2, §5.5; the task's 3.14 words a second is the hard ceiling, 3.0 flags). */
export const READING = {
  minHoldS: 50 / 60, // 50 frames at 60 fps
  baseS: 0.5,
  perWordS: 0.3,
  keyMinS: 2,
  honestLineMinS: 9, // Stealth's honest line
  pairMinS: 2.5, // a promise and its limit together (L05 + L06)
  flagWordsPerSecond: 3.0,
  maxWordsPerSecond: 3.14,
  wordBudget: 130, // film-line words outside the cascades, the name, the title and the end card
  maxLinesPerRing: 3,
} as const;

/* ---------------------------------------------------------------- the ring carrier ---------------------------- */

export const RING = {
  hairlinePx: 1.75, // at 1080 px; inside TRANSITION.ring.hairlinePx
  color: { light: COLOR.accent, dark: COLOR.accentDark },
  echoGapFrames: 10, // frames between a ring and its echo (60 fps)
  echoFade: 0.5, // each echo's opacity relative to the one before
  frameClearancePx: 40, // world px between an ask's rect and the ring that frames it
  emitFrames: 36,
  travelFrames: 60,
  returnFrames: 42,
} as const;

/* ---------------------------------------------------------------- smoothness limits (§5.5) ------------------- */

export const LIMITS = {
  maxShotChangesPerMinute: 18,
  maxAccelPxPerFrame2At60: 30, // velocity continuity between frames, outside marked hits
  blurAuditRatio: 0.8, // applied σ ≥ 0.8 × travel ÷ 7 where travel exceeds the reading speed
  deadWindowS: 1, // no window this long without change, outside waiting states
  uiShotMinS: 2,
  uiStateMinS: 0.45, // a new UI state the viewer must notice (CRAFT S06)
  wcagFlashesPerSecond: 3, // WCAG 2.3.1
  flashDeltaL: 0.1, // a change of 10 % of the maximum relative luminance
  flashDarkerBelow: 0.8, // ... where the darker state is below 0.8
} as const;
