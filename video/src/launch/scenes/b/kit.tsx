// Scene group b's local helpers (the real-take scenes S02, S03, S09). Owned by group b; nothing here belongs to the
// motion system. If the director wants any of it shared, it can move to launch/components.
import { useId, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Box } from "../../camera";
import type { Layout, Rect } from "../../layout";
import type { TimeMap } from "../../timeMap";
import { EASE } from "../../tokens";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The scene's length in seconds and its retime factor against the nominal length (1 = as choreographed). */
export const useSceneTime = (nominalS: number, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const frames = durationInFrames ?? compFrames;
  const lenS = frames / fps;
  return { t: frame / fps, fps, frames, lenS, k: lenS / nominalS, f: (sec: number) => Math.round(sec * fps) };
};

/** The largest rect of `aspect` (w/h) inside `area`, aligned by `ax`, `ay` (0..1, default centred). */
export const fitAspect = (area: Rect, aspect: number, ax = 0.5, ay = 0.5): Rect => {
  let w = area.w;
  let h = w / aspect;
  if (h > area.h) {
    h = area.h;
    w = h * aspect;
  }
  return { x: area.x + (area.w - w) * ax, y: area.y + (area.h - h) * ay, w, h };
};

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

/**
 * Group b's frame: the layout's feature split (text beside the window on 16:9, above it on 4:5), with a band under the
 * window on 4:5 for a second line.
 */
export const frameOf = (L: Layout) => ({
  text: L.feature.text,
  media: L.feature.media,
  under: L.portrait ? { x: L.content.x, y: L.px(1262), w: L.content.w, h: L.px(70) } : { x: L.feature.text.x, y: L.px(560), w: L.feature.text.w, h: L.px(360) },
});

/** A rect centred on (cx, cy). */
export const centred = (cx: number, cy: number, w: number, h: number): Rect => ({ x: cx - w / 2, y: cy - h / 2, w, h });

/** The card S04 opens on (scenes/c S04AgentGuard R0): centred, 60 % of the frame's width, 1.6:1. */
export const seamCard = (L: Layout): Rect => centred(L.W / 2, L.H / 2, L.W * 0.6, (L.W * 0.6) / 1.6);

/** A hazard to blur, in source px, while the source time is inside [s0, s1). */
export interface BlurMask {
  box: Box;
  s0: number;
  s1: number;
  /** blur, px in the view (default 16) */
  px?: number;
}

/**
 * A ScreenZoom overlay that blurs hazards in place (TREATMENT §5, fix "blur"). It follows the camera exactly, since it
 * is placed through ScreenZoom's own source → view mapping.
 */
export const blurOverlay =
  (masks: readonly BlurMask[], map: TimeMap) =>
  (toView: (p: { x: number; y: number }) => { x: number; y: number }, _scale: number, t: number): ReactNode => {
    const src = map.at(t);
    return (
      <>
        {masks
          .filter((m) => src >= m.s0 && src < m.s1)
          .map((m, i) => {
            const a = toView({ x: m.box.x, y: m.box.y });
            const b = toView({ x: m.box.x + m.box.w, y: m.box.y + m.box.h });
            const pad = 6;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: a.x - pad,
                  top: a.y - pad,
                  width: b.x - a.x + 2 * pad,
                  height: b.y - a.y + 2 * pad,
                  borderRadius: 10,
                  backdropFilter: `blur(${m.px ?? 16}px)`,
                  WebkitBackdropFilter: `blur(${m.px ?? 16}px)`,
                  background: "rgba(24, 26, 25, 0.12)",
                }}
              />
            );
          })}
      </>
    );
  };

/**
 * Half a whip at a scene's edge: "out" over the last `dur` seconds (the picture accelerates away to the left in a
 * directional blur), "in" over the first `dur` seconds (the next picture arrives at speed and sharpens). The two halves
 * either side of a hard cut read as one whip. The travel is short (8 % of the width) and the picture overscales to
 * cover it, so no edge or empty ground ever shows; the blur carries the speed. If the director lays a full whip over
 * the seam instead, pass `dur` 0.
 */
export const EdgeWhip: React.FC<{ role: "out" | "in"; start: number; dur: number; children: ReactNode }> = ({ role, start, dur, children }) => {
  const id = `ew${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const p = dur <= 0 ? (role === "out" ? 0 : 1) : clamp01((t - start) / dur);
  // speed: 0 → 1 across the out half (accelerating), 1 → 0 across the in half (settling)
  const v = role === "out" ? p * p : (1 - p) * (1 - p);
  if (v <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;
  const dx = role === "out" ? -0.08 * width * p * p : 0.08 * width * (1 - p) * (1 - p);
  const k = 1 + 0.17 * v;
  const b = 90 * (height / 1080) * v;
  return (
    <AbsoluteFill style={{ transform: `translateX(${dx.toFixed(2)}px) scale(${k.toFixed(4)})`, filter: `url(#${id})` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${b.toFixed(2)} 0`} edgeMode="duplicate" />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

/** 0 → 1 over [at, at + dur] on an ease (camera ease by default). */
export const ramp = (t: number, at: number, dur: number, ease = EASE.camera) => ease(clamp01((t - at) / Math.max(1e-6, dur)));

/* ---------- SFX (video/public/launch/audio/sfx, kit.json) ---------- */

const SFX_DIR = "launch/audio/sfx/";
/** group b's effects and each file's peak time (kit.json `peak_time_s`): place the peak, not the file start */
export const SFX = {
  click: "sfx-click-soft-a.wav",
  clickB: "sfx-click-soft-b.wav",
  keyA: "sfx-key-tap-a.wav",
  keyB: "sfx-key-tap-b.wav",
  keyC: "sfx-key-tap-c.wav",
  shimmer: "sfx-shimmer.wav",
  whoosh: "sfx-whoosh-short.wav",
  whooshB: "sfx-whoosh-short-b.wav",
  pop: "sfx-pop-soft-b.wav",
} as const;
export type SfxName = keyof typeof SFX;
const PEAK: Record<SfxName, number> = {
  click: 0.0022,
  clickB: 0.0005,
  keyA: 0.001,
  keyB: 0.001,
  keyC: 0.002,
  shimmer: 0.0007,
  whoosh: 0.2809,
  whooshB: 0.2401,
  pop: 0.0006,
};
/** the file's start so that its peak lands half a frame (60 fps) after the visual contact at `t` */
export const sfxAt = (name: SfxName, t: number) => t + 1 / 120 - PEAK[name];
export const sfxSrc = (name: SfxName) => SFX_DIR + SFX[name];

export interface SfxNote {
  name: SfxName;
  /** the visual contact, scene seconds */
  s: number;
  db: number;
  what: string;
}
