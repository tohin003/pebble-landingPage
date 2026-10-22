// The colour flood (R5 §7.1; docs/FILM_SPEC.md S4, S9): the next world spreads from a point as a circle, its edge
// feathered, while the hero stays. The reveal and the end card use it from the pebble's landing point (the impact
// pushes the light out). Children are the arriving world, revealed by the circle; whatever is behind stays visible
// outside it.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Point } from "../motion/camera";
import { EASE, ramp, type Ease } from "../motion/spec";

export interface ColourFloodProps {
  /** where the circle starts, frame px */
  from: Point;
  /** local frame the flood starts and its length in frames */
  at: number;
  dur: number;
  /** the final radius, px (FILM_SPEC: 1,453 in 16:9, 1,053 in the square: past the farthest corner) */
  radius: number;
  feather?: number;
  ease?: Ease;
  children: ReactNode;
}

export const ColourFlood: React.FC<ColourFloodProps> = ({ from, at, dur, radius, feather = 24, ease = EASE.enter, children }) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, at, dur, ease);
  if (p <= 0) return null;
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const rr = Math.max(0.01, p * radius);
  const mask = `radial-gradient(circle ${(rr + feather).toFixed(1)}px at ${from.x.toFixed(1)}px ${from.y.toFixed(1)}px, #000 ${((rr / (rr + feather)) * 100).toFixed(2)}%, transparent 100%)`;
  return <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{children}</AbsoluteFill>;
};

/** The radius that reaches every corner of a w × h frame from point p. */
export const floodRadius = (p: Point, w: number, h: number) =>
  Math.max(Math.hypot(p.x, p.y), Math.hypot(w - p.x, p.y), Math.hypot(p.x, h - p.y), Math.hypot(w - p.x, h - p.y));
