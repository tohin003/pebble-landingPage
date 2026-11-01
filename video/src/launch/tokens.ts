// The launch film's look, "Riverstone" (docs/launch/TREATMENT.md §4): palette, type, easings and durations as tokens.
// Pure data and pure functions; sizes that depend on the frame's aspect live in layout.ts. Every scene reads these,
// never a hex code or a bezier of its own.
import { Easing } from "remotion";
import { FONT, FRAUNCES_AXES } from "../fonts";

/* ---------- palette (TREATMENT §4) ---------- */

export const C = {
  /** deepest ground, letterbox */
  ink0: "#070B09",
  /** the stage */
  ink1: "#0E1411",
  /** panels, chart tracks */
  ink2: "#18201B",
  /** hairlines */
  line: "#2A342E",
  /** headline type */
  stone0: "#F2EFE7",
  /** secondary type */
  stone1: "#C9C6BC",
  /** footnotes, rival bars */
  mute: "#7E8681",
  /** Pebble's accent, Pebble's bars, highlights */
  sage: "#A6C795",
  /** the character's body (dark theme): never recoloured */
  pebble: "#B4CDA6",
  /** sage shadows, fills */
  sageDeep: "#506E54",
  /** rare light accents (verified moments) */
  glow: "#9EE6A0",
  /** the one warm counter-accent: "not verified", warnings */
  clay: "#E0784C",
  /** the Veil's family: ONLY inside Stealth Lockdown */
  dusk: "#44528C",
  duskHi: "#7684C6",
} as const;

export type ColorToken = keyof typeof C;

/** The same colours as "r, g, b" for rgba(): `rgba(${RGB.sage}, 0.12)`. */
export const RGB = Object.fromEntries(
  Object.entries(C).map(([k, hex]) => [k, [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")]),
) as Record<ColorToken, string>;

/** rgba() of a token. */
export const rgba = (token: ColorToken, alpha: number): string => `rgba(${RGB[token]}, ${Math.max(0, Math.min(1, alpha))})`;

/** Shadows are the stage's own ink, never pure black. */
export const SHADE = "3, 6, 4";

/* ---------- type (TREATMENT §4 "Type") ---------- */

export const FAMILY = {
  sans: `"${FONT.sans}", system-ui, sans-serif`,
  serif: `"${FONT.display}", Georgia, serif`,
  mono: `"${FONT.mono}", ui-monospace, monospace`,
} as const;

export const TYPE = {
  /** headlines: Inter variable 650-750, opsz 32 (Inter Display), -0.035 em, leading 1.0 */
  headline: {
    fontFamily: FAMILY.sans,
    fontWeight: 680,
    fontVariationSettings: '"opsz" 32',
    letterSpacing: "-0.035em",
    lineHeight: 1.0,
  },
  /** the title lockup ("Pebble 2.0"): the heaviest the treatment allows, a little tighter */
  title: {
    fontFamily: FAMILY.sans,
    fontWeight: 720,
    fontVariationSettings: '"opsz" 32',
    letterSpacing: "-0.045em",
    lineHeight: 0.95,
  },
  /** supporting lines under a headline: Inter text weight, opsz 32 at these sizes */
  support: {
    fontFamily: FAMILY.sans,
    fontWeight: 460,
    fontVariationSettings: '"opsz" 32',
    letterSpacing: "-0.012em",
    lineHeight: 1.22,
  },
  /**
   * Accent words (`*Real work.*`): Fraunces, SOFT 100, WONK 0, weight 400-500. The treatment asks for Fraunces italic,
   * but the repo's Fraunces (fonts/README.md) is the roman file only; Chrome would synthesise a slanted roman, so the
   * accent stays upright (the site's D14 says the same: never italic). `scale` evens Fraunces' smaller x-height
   * against Inter Display.
   */
  accent: {
    fontFamily: FAMILY.serif,
    fontWeight: 440,
    fontVariationSettings: `${FRAUNCES_AXES}, "opsz" 144`,
    letterSpacing: "-0.02em",
    scale: 1.1,
  },
  /** labels and numbers: Geist Mono 500, tabular figures, sentence case */
  mono: {
    fontFamily: FAMILY.mono,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0em",
  },
} as const;

/* ---------- easing (TREATMENT §4 "Motion") ---------- */

export const EASE = {
  /** entrances: the masked rise, cards, windows: cubic-bezier(0.22, 1, 0.36, 1) */
  enter: Easing.bezier(0.22, 1, 0.36, 1),
  /** camera moves: cubic-bezier(0.65, 0, 0.35, 1) */
  camera: Easing.bezier(0.65, 0, 0.35, 1),
  /** Screen-Studio pushes and pull-backs (rulings v1.1): cubic-bezier(0.16, 1, 0.3, 1) */
  push: Easing.bezier(0.16, 1, 0.3, 1),
  /** exits accelerate away */
  exit: Easing.bezier(0.5, 0, 0.75, 0),
  /** on-screen moves between two rests */
  move: Easing.bezier(0.45, 0, 0.55, 1),
  /** whips: slow-fast-slow with a very fast middle */
  whip: Easing.bezier(0.75, 0, 0.25, 1),
  /** count-ups and bars: a long landing */
  count: Easing.bezier(0.16, 1, 0.3, 1),
  linear: Easing.linear,
} as const;

export type EaseFn = (t: number) => number;

/* ---------- durations, seconds (TREATMENT §4 "Motion") ---------- */

export const DUR = {
  /** a word's masked rise */
  wordIn: 0.45,
  /** per-word stagger (0.05-0.07) */
  wordStagger: 0.06,
  /** extra delay per line */
  lineStagger: 0.08,
  /** blur at the start of a rise, px at 1080p */
  wordBlurPx: 8,
  /** exits (0.2-0.25) */
  exit: 0.22,
  /** a window rising onto the stage */
  windowIn: 0.75,
  /** a window's tilt flattening as the action starts */
  flatten: 0.9,
  /** a camera glide between two framings */
  glide: 0.9,
  /** a ScreenZoom push in (rulings v1.1: 0.6 s to ~2×) */
  push: 0.6,
  /** a ScreenZoom pull back (0.7 s) */
  pull: 0.7,
  /** the hold between a push and its pull-back, with one action inside it */
  zoomHold: 2.4,
  /** a whip (0.2-0.3) */
  whip: 0.26,
  /** a scale-through */
  scaleThrough: 0.55,
  /** a pebble match-shape wipe */
  pebbleWipe: 0.6,
  /** bars and count-ups */
  count: 1.3,
} as const;

/** Minimum time a line stays readable: 0.8 s per 3 words (TREATMENT §4), at least 0.8 s. */
export const readTime = (words: number): number => Math.max(0.8, (0.8 * words) / 3);

/* ---------- the stage's light, the window, the grain ---------- */

export const LIGHT = {
  /** the sage key light's peak opacity (8-14 %) */
  sage: 0.12,
  /** the faint clay light opposite */
  clay: 0.055,
  /** the dusk key light, Stealth only */
  dusk: 0.2,
  /** film grain, per cent (4-6) */
  grainPct: 5,
  /** the grain re-seeds this many times a second (film-like, never every 60 fps frame) */
  grainHz: 30,
  /** vignette strength, 0..1 */
  vignette: 0.6,
  /** the slow drift of the lights: seconds per cycle */
  driftS: 14,
} as const;

export const WINDOW = {
  /** corner radius at 1080p (scaled by the layout's unit) */
  radius: 22,
  /** the entrance tilt (TREATMENT: rotateX ≈ 8°, rotateY ≈ −12°) */
  tilt: { rx: 8, ry: -12, rz: 0 },
  perspective: 2600,
} as const;

/** The deep soft shadow under a floating window: layered, tinted with the ground's shade. `k` scales it (1 = default). */
export const windowShadow = (k = 1, u = 1, shade: string = SHADE): string => {
  const a = (v: number) => Math.min(1, v * Math.max(0, k)).toFixed(3);
  const px = (v: number) => `${(v * u).toFixed(1)}px`;
  return [
    `0 ${px(1)} ${px(2)} rgba(${shade}, ${a(0.35)})`,
    `0 ${px(10)} ${px(24)} rgba(${shade}, ${a(0.35)})`,
    `0 ${px(34)} ${px(80)} rgba(${shade}, ${a(0.5)})`,
    `0 ${px(80)} ${px(160)} -${px(20)} rgba(${shade}, ${a(0.6)})`,
  ].join(", ");
};

/** The window's edge: a 1 px hairline round it and a 1 px highlight along the top (drawn above the content). */
export const windowEdge = (u = 1): string =>
  [`inset 0 0 0 ${Math.max(1, u).toFixed(2)}px rgba(255, 255, 255, 0.07)`, `inset 0 ${Math.max(1, u).toFixed(2)}px 0 rgba(255, 255, 255, 0.16)`].join(", ");
