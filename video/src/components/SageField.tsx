// The film's two type worlds, in frame space, full bleed (docs/FILM_SPEC.md §4, R5 §8):
// - <SageField>: flat #536B54 with one radial glow of #B0C2AE at 15 %, radius 900 px, centred at (0.5 W, 0.42 H), drifting
//   no more than 40 px over the shot. White type. Add <Vignette amount={0.06} /> on top.
// - <PaperField>: #F8F9F6 with a pool of light (white at 70 %, radius 760 px in 16:9, 600 px in the square) centred on
//   the lockup. Add <Vignette amount={0.06} /> on top.
// Radial gradients only (linear ones band under H.264), each with an eased falloff over many stops so no ring shows
// where the light ends (gradients.ts). No baked grain (critic H8).
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../motion/layout";
import { COLOR, periodic } from "../motion/spec";
import { glow } from "./gradients";

export interface FieldProps {
  children?: ReactNode;
  style?: CSSProperties;
}

/** A glow on the sage field: centre as fractions of the frame, radius px at 1920 × 1080, drift period s. */
export interface Glow {
  x: number;
  y: number;
  r: number;
  opacity: number;
  period: number;
  phase: number;
}

const ACCENT_SOFT = "176, 194, 174"; // #B0C2AE

/** FILM_SPEC §4: one glow, 15 %, radius 900 px, at (0.5 W, 0.42 H). The drift period is long against any shot. */
export const SAGE_GLOWS: readonly Glow[] = [{ x: 0.5, y: 0.42, r: 900, opacity: 0.15, period: 28.8, phase: 0 }];

/**
 * The type worlds' ground (lane G-fix, the lead's addendum to REVIEW-G2): white type must read at ≥ 7:1 on the sage
 * field. White on #536B54 is 5.8:1, and 4.8:1 at the 15 % glow's peak, where the lines sit; so the field the lines are
 * read on settles on a deeper sage of the same hue, #425643 (L 0.082), with the glow at 4 %: white is 7.4:1 at the
 * glow's peak and 7.9:1 off it. A field still ARRIVES on the colour it is entered through (the pebble's #536B54 after
 * the S1 dive, the badge's #506E54 after S7c) and deepens within 12 frames, as the eye adjusts.
 */
export const SAGE_TYPE = { ground: "#425643", glow: 0.04 } as const;
export const SAGE_TYPE_GLOWS: readonly Glow[] = SAGE_GLOWS.map((g) => ({ ...g, opacity: SAGE_TYPE.glow }));

export const SageField: React.FC<FieldProps & { glows?: readonly Glow[]; drift?: number }> = ({ children, style, glows = SAGE_GLOWS, drift = 40 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = useLayout();
  const layers = glows.map((g) => {
    // a slow ellipse of at most `drift` px across over the period
    const dx = (drift / 2) * periodic(frame, fps, g.period, g.phase);
    const dy = (drift / 4) * periodic(frame, fps, g.period, g.phase + Math.PI / 2);
    return glow(ACCENT_SOFT, g.opacity, g.x * width + dx, g.y * height + dy, g.r * L.s);
  });
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.pebble, backgroundImage: layers.join(", "), ...style }}>
      {children}
    </AbsoluteFill>
  );
};

export const PaperField: React.FC<FieldProps & { pool?: { x: number; y: number }; opacity?: number }> = ({ children, style, pool, opacity = 0.7 }) => {
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const cx = pool ? pool.x : width / 2;
  const cy = pool ? pool.y : height * 0.4;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ground, backgroundImage: glow("255, 255, 255", opacity, cx, cy, L.poolRadius), ...style }}>
      {children}
    </AbsoluteFill>
  );
};
