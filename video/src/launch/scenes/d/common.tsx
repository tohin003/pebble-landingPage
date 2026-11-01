// Scene group d (S06 Memory, S07 Context warping, S10 Benchmarks): helpers shared by the group's scenes only.
// Nothing here is part of the motion system; anything worth sharing more widely is listed in the group's handoff.
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { SfxCue } from "../../components/Sfx";

/** Local time, seconds. */
export const useT = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/**
 * The scene's retime factor: its length on the master over its nominal length (1 in the previews). Beat STARTS are
 * multiplied by it, so a scene the director stretches or squeezes by ±15 % keeps its beats spread across it; the
 * animations themselves keep their own durations (the slack lives in the holds).
 */
export const useRetime = (nominalS: number, durationInFrames?: number): { k: number; dur: number; at: (s: number) => number } => {
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const frames = durationInFrames ?? compFrames;
  const dur = frames / fps;
  const k = Math.max(0.8, Math.min(1.25, dur / nominalS));
  return { k, dur, at: (s: number) => s * k };
};

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ---------- sound ---------- */

/**
 * The group's SFX, from the kit in video/public/launch/audio/sfx/ (kit.json). The director lays the master's sound, so
 * the scenes export their cue lists and only place them themselves when PLACE_SFX is on. A cue's `at` is the FILE's
 * start: `peakAt()` puts the file's measured peak (kit.json `measure.peak_time_s`) on the picture's contact frame,
 * half a frame late.
 */
export const PLACE_SFX = false;
export const SFX = {
  tick: "launch/audio/sfx/sfx-tick.wav",
  click: "launch/audio/sfx/sfx-click-soft-a.wav",
  click2: "launch/audio/sfx/sfx-click-soft-b.wav",
  thud: "launch/audio/sfx/sfx-impact-low.wav",
  whoosh: "launch/audio/sfx/sfx-whoosh-short.wav",
  whoosh2: "launch/audio/sfx/sfx-whoosh-short-b.wav",
  shimmer: "launch/audio/sfx/sfx-shimmer.wav",
  swell: "launch/audio/sfx/sfx-swell-soft.wav",
} as const;
const PEAK: Record<string, number> = {
  [SFX.tick]: 0.0006,
  [SFX.click]: 0.0022,
  [SFX.click2]: 0.0005,
  [SFX.thud]: 0.0039,
  [SFX.whoosh]: 0.2809,
  [SFX.whoosh2]: 0.2401,
  [SFX.shimmer]: 0.0007,
  [SFX.swell]: 1.5715,
};
/** A cue whose peak lands at `event` seconds (+ half a frame at 60 fps). */
export const peakAt = (src: string, event: number, db: number): SfxCue => ({ src, at: +(event + 1 / 120 - (PEAK[src] ?? 0)).toFixed(4), db });
