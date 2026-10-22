// The film's two type worlds (R5 §8 grounds), in frame space, full bleed:
// - <SageField>: the kinetic-type world (tension, claims). Pebble sage with one or two soft accent-soft glows at
//   15–25 % that drift no more than 40 px over their period, and a slightly deeper edge. White type.
// - <PaperField>: the light world of the reveal and the end card, after the site's hero (comp 3): Pebble's cool
//   sage-white with a pool of light where the pebble stands, settling to the room colour at the edges.
// Radial gradients only (linear ones band under H.264, R5 §8), each with an eased falloff over many stops (no Mach
// bands; gradients.ts). No baked grain by default (critic H8).
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, periodic } from "../motion/spec";
import { easedStops, glow } from "./gradients";

export interface FieldProps {
  children?: ReactNode;
  style?: CSSProperties;
}

/** Where a glow sits, as fractions of the frame, and how it drifts. */
export interface Glow {
  x: number;
  y: number;
  /** radius as a fraction of the frame's larger side */
  r: number;
  opacity: number;
  /** drift period in seconds (in loops, choose one that divides the loop) */
  period: number;
  phase: number;
}

const ACCENT_SOFT = "176, 194, 174"; // #B0C2AE
const SAGE_DEEP = "74, 95, 75"; // #4A5F4B
const ROOM = "231, 236, 227"; // #E7ECE3

export const SAGE_GLOWS: readonly Glow[] = [
  { x: 0.24, y: 0.2, r: 0.62, opacity: 0.22, period: 24, phase: 0 },
  { x: 0.86, y: 0.92, r: 0.5, opacity: 0.12, period: 38.4, phase: 2.1 },
];

export const SageField: React.FC<FieldProps & { glows?: readonly Glow[]; drift?: number }> = ({
  children,
  style,
  glows = SAGE_GLOWS,
  drift = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const big = Math.max(width, height);
  const layers = glows.map((g) => {
    const dx = (drift / 2) * periodic(frame, fps, g.period, g.phase);
    const dy = (drift / 2) * periodic(frame, fps, g.period, g.phase + Math.PI / 2);
    return glow(ACCENT_SOFT, g.opacity, g.x * width + dx, g.y * height + dy, g.r * big);
  });
  const edge = `radial-gradient(${(0.8 * big).toFixed(0)}px ${(0.64 * big).toFixed(0)}px at 50% 46%, ${easedStops(SAGE_DEEP, 0, 1, 40, 100)})`;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.pebble, backgroundImage: [...layers, edge].join(", "), ...style }}>
      {children}
    </AbsoluteFill>
  );
};

export const PaperField: React.FC<FieldProps & { pool?: { x: number; y: number } }> = ({ children, style, pool = { x: 0.5, y: 0.42 } }) => {
  const { width, height } = useVideoConfig();
  const big = Math.max(width, height);
  const cx = pool.x * width;
  const cy = pool.y * height;
  const light = glow("255, 255, 255", 0.85, cx, cy, 0.44 * big, 0.36 * big);
  const settle = `radial-gradient(${(0.78 * big).toFixed(0)}px ${(0.64 * big).toFixed(0)}px at ${cx}px ${cy}px, ${easedStops(ROOM, 0, 1, 30, 100)})`;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ground, backgroundImage: `${light}, ${settle}`, ...style }}>
      {children}
    </AbsoluteFill>
  );
};
