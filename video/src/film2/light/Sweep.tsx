// Motivated light on Pebble's own surfaces (TREATMENT §5.4; CRAFT T08, R02, U10). Both need the lead's ruling L3a
// (PHILOSOPHY lists "glow" among the never-items), so they are opt-in per use and never decorative:
//
// <LightSweep>: a soft specular band crosses a wordmark or a Pebble window once, 36–54 frames (60 fps) on E-move,
//   its core crossing the subject's optical centre 0–2 frames after the music hit. The band follows Remotion's shine
//   defaults (core σ 65 px, halo σ 200 px, 30°, core 0.4, halo 0.3), drawn in CSS so it runs on the headless shell.
//   Also a port of the travelling band in HyperFrames' light-sweep-pass (Apache-2.0, v0.8.202,
//   registry/components/light-sweep-pass, git blob 6f313d37f2): one position drives the whole pass, sine.inOut.
// <RimLight>: a thin highlight on a Pebble window's upper-left edges while it travels (one key light, above left),
//   scaled by the window's speed, gone when it is read.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LIGHT } from "../tokens";
import { E_MOVE } from "../motion/ease";

export interface SweepProps {
  /** frame the band starts crossing */
  at: number;
  /** 36–54 frames at 60 fps */
  frames: number;
  angleDeg?: number;
  /** 0..1 multiplier on the shine defaults (keep the core at or under 0.4) */
  strength?: number;
}

/** Where the band's core is, as 0..1 across the subject (−0.25 before, 1.25 after: it enters and leaves off the edge). */
export const sweepPosition = (frame: number, at: number, frames: number): number | null => {
  const u = (frame - at) / frames;
  if (u < 0 || u > 1) return null;
  return -0.25 + 1.5 * E_MOVE(u);
};

/** A gradient band (core and halo) at position p (0..1 across a box of size w × h), as CSS. */
export const sweepGradient = (p: number, w: number, h: number, angleDeg: number, strength: number): string => {
  const { coreSigmaPx, haloSigmaPx, coreIntensity, haloIntensity } = LIGHT.sweep;
  // gradient line length for this angle, so σ in px maps to percent of the line
  const a = (angleDeg * Math.PI) / 180;
  const L = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const c = p * 100;
  const stops: string[] = [];
  for (let i = -12; i <= 12; i++) {
    const x = (i / 12) * 3 * haloSigmaPx; // px from the core
    const core = coreIntensity * Math.exp(-(x * x) / (2 * coreSigmaPx * coreSigmaPx));
    const halo = haloIntensity * Math.exp(-(x * x) / (2 * haloSigmaPx * haloSigmaPx));
    const alpha = Math.min(1, (core + halo) * strength);
    stops.push(`rgba(255, 255, 255, ${alpha.toFixed(4)}) ${(c + (x / L) * 100).toFixed(2)}%`);
  }
  return `linear-gradient(${(90 + angleDeg).toFixed(1)}deg, ${stops.join(", ")})`;
};

/** A sweep over a box (a Pebble window's content); place it inside the window, above its picture. */
export const LightSweep: React.FC<SweepProps & { width: number; height: number; style?: CSSProperties }> = ({
  at,
  frames,
  angleDeg = LIGHT.sweep.angleDeg,
  strength = 1,
  width,
  height,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = sweepPosition(frame, at, frames);
  if (p === null) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "soft-light", background: sweepGradient(p, width, height, angleDeg, strength), ...style }} />;
};

/** A sweep across type (the wordmark): the same band, drawn through the glyphs with background-clip: text. */
export const TextSweep: React.FC<SweepProps & { children: ReactNode; style: CSSProperties; width: number; height: number }> = ({
  at,
  frames,
  angleDeg = LIGHT.sweep.angleDeg,
  strength = 1,
  children,
  style,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const p = sweepPosition(frame, at, frames);
  if (p === null) return null;
  return (
    <div
      aria-hidden
      style={{
        ...style,
        color: "transparent",
        backgroundImage: sweepGradient(p, width, height, angleDeg, strength),
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
};

/**
 * The rim on a travelling Pebble window: a 1.5 px highlight along its top and left edges (the key light is above
 * left), alpha ∝ speed (0 at rest, 0.35 at 30 px a frame or more at 60 fps). Never on third-party or Apple windows.
 */
export const RimLight: React.FC<{ speedPxPerFrame60: number; radius?: number }> = ({ speedPxPerFrame60, radius = 10 }) => {
  const a = Math.min(0.35, (Math.max(0, speedPxPerFrame60 - 4.6) / 25.4) * 0.35);
  if (a < 0.005) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        borderRadius: radius,
        boxShadow: `inset 1.5px 1.5px 0 rgba(255, 255, 255, ${a.toFixed(3)})`,
        mixBlendMode: "screen",
      }}
    />
  );
};
