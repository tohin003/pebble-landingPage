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
export const SmallPrint: React.FC<{ text: string; box: Rect; at?: number; maxWidth?: number; opacity?: number }> = ({ text, box, at = 0, maxWidth, opacity = 1 }) => {
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
        fontSize: L.type.foot,
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
 * The group's SFX files (TREATMENT §4 "Sound"; EDIT_PLAN "Sound map"). video/public/launch/audio/sfx/ was empty when
 * these scenes were built, so the scenes export their cue lists (for the master) and only place them themselves when
 * PLACE_SFX is on. Turn it on once the files exist under these names.
 */
export const PLACE_SFX = false;
export const SFX = {
  tick: "launch/audio/sfx/tick.wav",
  click: "launch/audio/sfx/click.wav",
  thud: "launch/audio/sfx/thud-soft.wav",
  whoosh: "launch/audio/sfx/whoosh-short.wav",
  shimmer: "launch/audio/sfx/shimmer.wav",
  swell: "launch/audio/sfx/swell-soft.wav",
} as const;

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
      out.push({ src: SFX.tick, at: +t.toFixed(4), db: o.db ?? -16 });
      last = t;
    }
    prev = now;
  }
  return out;
};
