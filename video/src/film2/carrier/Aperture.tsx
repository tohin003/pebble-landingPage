// <Aperture>: the frame within the frame (TREATMENT §3.9 step 4, §3.12). Act I is deliberately narrow; at the Drop the
// ring reaches the aperture's edges and the frame opens with it to full bleed:
//   16:9 opens from 2.39:1, 9:16 from 4:5, 1:1 from 16:9.
// The aperture is square-cornered (everything made by hand is square and exact) and the page around it is the
// sage-white page. Drive it with `open` (0..1, already eased), or let it follow a ring with apertureOpenForRing().
import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLOR } from "../tokens";
import { apertureRect } from "./apertureMath";

export { APERTURE_START, apertureOpenForRing, apertureRect, aspectOf } from "./apertureMath";

export const Aperture: React.FC<{ open: number; centerY?: number; color?: string; children?: ReactNode }> = ({ open, centerY, color = COLOR.page, children }) => {
  const { width, height } = useVideoConfig();
  const r = apertureRect(width, height, open, centerY ?? height / 2);
  if (r.h >= height - 0.01) return children ? <AbsoluteFill>{children}</AbsoluteFill> : null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* the page above and below the aperture (and nothing at the sides: the aperture is full width) */}
      <div style={{ position: "absolute", left: 0, top: 0, width, height: Math.max(0, r.y), background: color }} />
      <div style={{ position: "absolute", left: 0, top: r.y + r.h, width, height: Math.max(0, height - (r.y + r.h)), background: color }} />
      {children}
    </AbsoluteFill>
  );
};
