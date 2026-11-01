// Scene group C (S04 AgentGuard, S05 Pebble's Workshop): helpers shared by the two scenes. Owned by the group's worker;
// nothing here is part of the motion system.
import type { ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Rect } from "../../layout";
import { EASE, type EaseFn } from "../../tokens";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const mixRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  w: lerp(a.w, b.w, p),
  h: lerp(a.h, b.h, p),
});

/**
 * The scene's clock. Beats are choreographed in seconds for `nominalS`; when the director retimes the scene, `T(x)`
 * moves a beat proportionally (entrance and exit durations stay fixed), so the slack lands in the holds.
 */
export const useClock = (nominalS: number, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const frames = durationInFrames ?? compFrames;
  const D = frames / fps;
  const k = D / nominalS;
  return { frame, fps, frames, D, k, t: frame / fps, T: (x: number) => x * k };
};

export interface RectKey {
  /** the rect is reached at `t` (seconds) */
  t: number;
  rect: Rect;
  /** the move into this key, seconds (default 0.6) */
  dur?: number;
  ease?: EaseFn;
}

/** A rect that glides between keys (each key ARRIVES at its `t`), on the camera ease by default. */
export const rectAt = (keys: readonly RectKey[], t: number): Rect => {
  let r = keys[0].rect;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const dur = k.dur ?? 0.6;
    const p = clamp01((t - (k.t - dur)) / dur);
    if (p <= 0) break;
    r = mixRect(r, k.rect, (k.ease ?? EASE.camera)(p));
  }
  return r;
};

/** 0 → 1 over `dur` from `at`, eased. */
export const ramp = (t: number, at: number, dur: number, ease: EaseFn = EASE.enter) => ease(clamp01((t - at) / dur));

/** A hit: a fast rise (attack) then a decay, 0..1. */
export const hit = (t: number, at: number, attack = 0.05, decay = 0.5) => {
  const dt = t - at;
  if (dt < 0) return 0;
  if (dt < attack) return dt / attack;
  return Math.exp(-(dt - attack) / decay);
};

/** A centred rect of `w` × `h` around (cx, cy). */
export const centred = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });

/** A box in a source's own px. */
export const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

type ToView = (p: { x: number; y: number }) => { x: number; y: number };

/**
 * A soft glow ring round a box of the source (an annotation over the real UI, never a redraw): a hairline in the
 * colour and a wide blurred halo outside it, `k` 0..1.
 */
export const glowRing = (
  toView: ToView,
  b: { x: number; y: number; w: number; h: number },
  color: string,
  k: number,
  opts: { radius?: number; pad?: number; spread?: number; line?: number } = {},
): ReactNode => {
  if (k <= 0.001) return null;
  const pad = opts.pad ?? 10;
  const a = toView({ x: b.x - pad, y: b.y - pad });
  const z = toView({ x: b.x + b.w + pad, y: b.y + b.h + pad });
  const spread = opts.spread ?? 36;
  const hex = Math.round(clamp01(k) * 255)
    .toString(16)
    .padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        left: a.x,
        top: a.y,
        width: z.x - a.x,
        height: z.y - a.y,
        borderRadius: opts.radius ?? 14,
        boxShadow: `0 0 0 ${opts.line ?? 2}px ${color}${hex}, 0 0 ${spread}px ${spread * 0.25}px ${color}${Math.round(clamp01(k) * 150)
          .toString(16)
          .padStart(2, "0")}`,
      }}
    />
  );
};

/** A scene-local SFX cue for the report and the director's master (seconds at the nominal length, the PEAK's time). */
export interface SfxNote {
  scene: string;
  /** seconds from the scene's start at its nominal length: where the effect's peak lands */
  s: number;
  file: string;
  db: number;
  note: string;
}

const SFX_DIR = "launch/audio/sfx/";
/** The kit's peak offsets (video/public/launch/audio/sfx/kit.json `measure.peak_time_s`), seconds. */
const SFX_PEAK: Record<string, number> = {
  "sfx-click-soft-a.wav": 0.0022,
  "sfx-click-soft-b.wav": 0.0005,
  "sfx-shimmer.wav": 0.0007,
  "sfx-tick.wav": 0.0006,
  "sfx-tick-b.wav": 0.0006,
  "sfx-pop-soft.wav": 0.0005,
  "sfx-pop-soft-b.wav": 0.0006,
  "sfx-whoosh-short.wav": 0.2809,
  "sfx-whoosh-short-b.wav": 0.2401,
  "sfx-whoosh-medium.wav": 0.3575,
};
/** The file's start time so that its peak lands on `peakAt` (+ `late` s: 0 to 1 frame after the contact frame). */
export const sfxStart = (file: string, peakAt: number, late = 1 / 120) => peakAt + late - (SFX_PEAK[file] ?? 0);
export const sfxSrc = (file: string) => SFX_DIR + file;
/** A drawn check in a circle (a diagram mark): the ring grows, then the tick draws. */
export const Check: React.FC<{ x: number; y: number; d: number; p: number; color: string }> = ({ x, y, d, p, color }) => {
  const ring = clamp01(p / 0.5);
  const tick = clamp01((p - 0.35) / 0.65);
  const len = 30;
  return (
    <svg width={d} height={d} viewBox="0 0 40 40" style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <circle cx={20} cy={20} r={18} fill={color} opacity={0.14 * ring} />
      <circle cx={20} cy={20} r={18} fill="none" stroke={color} strokeWidth={2.4} strokeDasharray={113.1} strokeDashoffset={113.1 * (1 - ring)} transform="rotate(-90 20 20)" />
      <path d="M12 20.5 L17.6 26 L28.5 14.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - tick)} />
    </svg>
  );
};


/** A drawn cross in a circle (a diagram mark for a failed test). */
export const Cross: React.FC<{ x: number; y: number; d: number; p: number; color: string }> = ({ x, y, d, p, color }) => {
  const ring = clamp01(p / 0.5);
  const a = clamp01((p - 0.35) / 0.35);
  const b = clamp01((p - 0.6) / 0.4);
  return (
    <svg width={d} height={d} viewBox="0 0 40 40" style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <circle cx={20} cy={20} r={18} fill={color} opacity={0.12 * ring} />
      <circle cx={20} cy={20} r={18} fill="none" stroke={color} strokeWidth={2.4} strokeDasharray={113.1} strokeDashoffset={113.1 * (1 - ring)} transform="rotate(-90 20 20)" />
      <path d="M14 14 L26 26" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeDasharray={17} strokeDashoffset={17 * (1 - a)} />
      <path d="M26 14 L14 26" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeDasharray={17} strokeDashoffset={17 * (1 - b)} />
    </svg>
  );
};
