// Scene group d (S06 Memory, S07 Context warping, S10 Benchmarks): helpers shared by the group's scenes only.
// Nothing here is part of the motion system; anything worth sharing more widely is listed in the group's handoff.
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { SfxCue } from "../../components/Sfx";
import { useLayout, type Rect } from "../../layout";
import { EASE, TYPE } from "../../tokens";
import { useWorld } from "../../world";

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

/** Small print in the world's small ink, wrapped, bottom-aligned in its box. */
export const SmallPrint: React.FC<{ text: string; box: Rect; at?: number; maxWidth?: number; opacity?: number; size?: number }> = ({ text, box, at = 0, maxWidth, opacity = 1, size }) => {
  const L = useLayout();
  const W = useWorld();
  const t = useT();
  const p = EASE.enter(clamp01((t - at) / 0.5));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        display: "flex",
        alignItems: "flex-end",
        opacity: p * opacity,
        fontFamily: TYPE.support.fontFamily,
        fontVariationSettings: '"opsz" 14',
        fontWeight: 420,
        fontSize: size ?? L.type.foot,
        lineHeight: 1.45,
        color: W.small,
        letterSpacing: "0.003em",
      }}
    >
      <div style={{ maxWidth: maxWidth ?? box.w }}>{text}</div>
    </div>
  );
};

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

/**
 * Count-up ticks, rate-limited (EDIT_PLAN: one per 3 frames at most): a tick on each frame the shown digits change,
 * never closer than `minGap` seconds to the one before. Mirrors BarCompare's own timing (rows start `at + 0.1 + i ×
 * rowStagger` and count over `dur` on EASE.count), so the ticks follow the digits exactly.
 */
export const countTicks = (o: {
  at: number;
  rows: readonly { value: number }[];
  decimals: number;
  dur: number;
  rowStagger?: number;
  fps?: number;
  minGap?: number;
  db?: number;
}): SfxCue[] => {
  const fps = o.fps ?? 60;
  const minGap = o.minGap ?? 3 / 60;
  const stagger = o.rowStagger ?? 0.22;
  const out: SfxCue[] = [];
  let last = -Infinity;
  const start = o.at + 0.1;
  const end = start + (o.rows.length - 1) * stagger + o.dur;
  const shownAt = (t: number) => o.rows.map((r, i) => (r.value * EASE.count(clamp01((t - (start + i * stagger)) / o.dur))).toFixed(o.decimals)).join("|");
  let prev = shownAt(start - 1 / fps);
  for (let f = Math.floor(start * fps); f <= Math.ceil(end * fps); f++) {
    const t = f / fps;
    const now = shownAt(t);
    if (now !== prev && t - last >= minGap - 1e-6) {
      out.push(peakAt(SFX.tick, t, o.db ?? -16));
      last = t;
    }
    prev = now;
  }
  return out;
};

/**
 * A landed title that moves once: from its hero place (`from`, the anchor the children are laid out around) to `to`,
 * scaling by `scale` about that anchor, on the camera ease. Before and after the move it is dead still.
 */
export const Settle: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  scale: number;
  at: number;
  dur?: number;
  children: React.ReactNode;
}> = ({ from, to, scale, at, dur = 0.6, children }) => {
  const t = useT();
  const p = EASE.camera(clamp01((t - at) / dur));
  const dx = (to.x - from.x) * p;
  const dy = (to.y - from.y) * p;
  const s = lerp(1, scale, p);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: p > 0 ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(5)})` : undefined,
        transformOrigin: `${from.x.toFixed(1)}px ${from.y.toFixed(1)}px`,
      }}
    >
      {children}
    </div>
  );
};
