// Time for the launch film (TREATMENT §6): every time is in SECONDS and becomes frames with the composition's fps, so a
// scene renders the same at 60 fps (finals) and 30 fps (drafts). Beat helpers read a beat map (the music lane's
// output), so cuts, text hits and punch-ins land on the music; until the music is chosen, `gridBeatMap` stands in.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, type EaseFn } from "./tokens";

/* ---------- seconds and frames ---------- */

/** Seconds to frames at `fps` (rounded): the only way to make a frame count. */
export const s = (sec: number, fps: number): number => Math.round(sec * fps);

/** `s()` bound to the composition's fps: `const S = useS(); <Sequence from={S(1.2)} durationInFrames={S(2)}>`. */
export const useS = (): ((sec: number) => number) => {
  const { fps } = useVideoConfig();
  return (sec: number) => Math.round(sec * fps);
};

/** The current time in seconds, local to the enclosing <Sequence>. */
export const useTime = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 → 1 between seconds `at` and `at + dur`, eased (clamped both sides). */
export const prog = (t: number, at: number, dur: number, ease: EaseFn = EASE.enter): number =>
  dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur));

/** interpolate() over seconds with clamping: `tween(t, [0.2, 0.8], [0, 1], EASE.camera)`. */
export const tween = (t: number, input: readonly number[], output: readonly number[], ease: EaseFn = EASE.enter): number =>
  interpolate(t, input as number[], output as number[], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Interpolation in log space (zooms and scales): constant perceived speed. */
export const logTween = (t: number, input: readonly [number, number], output: readonly [number, number], ease: EaseFn = EASE.camera): number =>
  Math.exp(tween(t, input, [Math.log(output[0]), Math.log(output[1])], ease));

/* ---------- beat maps ---------- */

/** The music lane's beat map: times in seconds of the film. */
export interface BeatMap {
  bpm: number;
  /** every beat, ascending */
  beats: number[];
  /** the bars' first beats, ascending (a subset of `beats`) */
  downbeats: number[];
  /** named stretches of the music: intro, build, drop, ... */
  sections: { name: string; start: number; end: number }[];
}

/** "downbeat": the bars' first beats; "beat": every beat; "eighth": every half beat. */
export type Grid = "downbeat" | "beat" | "eighth";

/** A steady grid standing in for the music: `bars` bars of `beatsPerBar` beats from `first` seconds. */
export const gridBeatMap = (bpm: number, bars: number, first = 0, beatsPerBar = 4): BeatMap => {
  const step = 60 / bpm;
  const beats = Array.from({ length: bars * beatsPerBar + 1 }, (_, i) => +(first + i * step).toFixed(4));
  const downbeats = beats.filter((_, i) => i % beatsPerBar === 0);
  return { bpm, beats, downbeats, sections: [{ name: "all", start: first, end: beats[beats.length - 1] }] };
};

/** The times of a grid: downbeats, beats, or eighths (each beat and the point halfway to the next). */
export const gridTimes = (map: BeatMap, grid: Grid = "beat"): number[] => {
  if (grid === "downbeat") return map.downbeats;
  if (grid === "beat") return map.beats;
  const out: number[] = [];
  for (let i = 0; i < map.beats.length - 1; i++) {
    const a = map.beats[i];
    const b = map.beats[i + 1];
    out.push(a, (a + b) / 2);
  }
  if (map.beats.length) out.push(map.beats[map.beats.length - 1]);
  return out;
};

/** The grid time nearest to `t`. */
export const nearest = (map: BeatMap, t: number, grid: Grid = "beat"): number => {
  const ts = gridTimes(map, grid);
  let best = t;
  let d = Infinity;
  for (const x of ts) {
    const dx = Math.abs(x - t);
    if (dx < d) {
      d = dx;
      best = x;
    }
  }
  return best;
};

/** A cut snapped to the grid: the nearest grid time within `maxShift` seconds, else `t` unchanged. */
export const snapCut = (map: BeatMap, t: number, grid: Grid = "downbeat", maxShift = 0.5): number => {
  const n = nearest(map, t, grid);
  return Math.abs(n - t) <= maxShift ? n : t;
};

/** The last grid time at or before `t` (or -Infinity) and the next one after it (or Infinity). */
export const around = (map: BeatMap, t: number, grid: Grid = "beat"): { prev: number; next: number; index: number } => {
  const ts = gridTimes(map, grid);
  let lo = 0;
  let hi = ts.length - 1;
  if (!ts.length || t < ts[0]) return { prev: -Infinity, next: ts[0] ?? Infinity, index: -1 };
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return { prev: ts[lo], next: ts[lo + 1] ?? Infinity, index: lo };
};

/** Grid times in [a, b). */
export const timesIn = (map: BeatMap, a: number, b: number, grid: Grid = "beat"): number[] => gridTimes(map, grid).filter((x) => x >= a && x < b);

/** The section playing at `t`, if any. */
export const sectionAt = (map: BeatMap, t: number) => map.sections.find((sec) => t >= sec.start && t < sec.end);

/**
 * A hit's envelope at `t`: 0 before the last grid time, up to 1 in `attack` seconds after it, then an exponential decay
 * with time constant `decay`. Drive punch-ins, light swells and the pebble's squash pulses with it.
 */
export const pulse = (map: BeatMap, t: number, { grid = "beat" as Grid, attack = 0.03, decay = 0.16 } = {}): number => {
  const { prev } = around(map, t, grid);
  if (!Number.isFinite(prev)) return 0;
  return hitEnvelope(t - prev, attack, decay);
};

/** The same envelope for one hit `dt` seconds ago. */
export const hitEnvelope = (dt: number, attack = 0.03, decay = 0.16): number =>
  dt < 0 ? 0 : dt < attack ? dt / attack : Math.exp(-(dt - attack) / decay);

/** A punch-in on accents (TREATMENT: 3-6 %): a scale of 1 + amount × the hit's envelope. */
export const punch = (map: BeatMap, t: number, amount = 0.04, opts?: { grid?: Grid; attack?: number; decay?: number }): number =>
  1 + amount * pulse(map, t, opts);

/** A punch from an explicit list of hit times (seconds). */
export const punchAt = (hits: readonly number[], t: number, amount = 0.04, attack = 0.03, decay = 0.18): number => {
  let e = 0;
  for (const h of hits) e = Math.max(e, hitEnvelope(t - h, attack, decay));
  return 1 + amount * e;
};
