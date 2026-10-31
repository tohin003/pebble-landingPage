// The reel's look: the site's palette pushed bolder for energy (.work/reel/STYLE.md §7). Pure.
export const REEL = {
  /** the ground: a deep forest, never black */
  base: "#06110B",
  baseClay: "#0F0A07",
  baseDeep: "#04100F",
  /** saturated sage glows (the site's --accent #506E54 and dark accent #A6C795, pushed) */
  sage: "63, 143, 85",
  sageCore: "158, 230, 160",
  /** the demo poster's clay, the one warm counter-glow */
  clay: "224, 120, 76",
  /** a deep green-teal for the third tint (still the green family; never cyan or purple) */
  deep: "34, 116, 96",
  /** type */
  ink: "#F1F7EE",
  inkSoft: "#B9CDB5",
  accent: "#A6E3A0",
  /** shadows are the site's shade green, never black */
  shadeRgb: "2, 12, 6",
} as const;

export const INTER_HEAVY = { fontFamily: "Inter", fontWeight: 800, letterSpacing: "-0.045em" } as const;

/** clamp to [0, 1] */
export const c01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** expo-out */
export const expoOut = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * c01(t)));
/** expo-in */
export const expoIn = (t: number): number => (t <= 0 ? 0 : Math.pow(2, 10 * (c01(t) - 1)));
/** cubic in-out */
export const inOut = (t: number): number => {
  const x = c01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** back-out with overshoot s */
export const backOut = (t: number, s = 1.7): number => {
  const x = c01(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};
/** a hit's envelope: up in `rise` frames, then an exponential decay with time constant `tau` frames */
export const hitEnv = (dt: number, rise = 2, tau = 9): number => (dt < 0 ? 0 : dt < rise ? dt / rise : Math.exp(-(dt - rise) / tau));
/** a damped spring from 0 to 1 (frames), for landings */
export const springTo = (dt: number, freq = 0.11, damp = 0.16): number => (dt <= 0 ? 0 : 1 - Math.exp(-damp * dt) * Math.cos(2 * Math.PI * freq * dt));
