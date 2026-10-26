// <RippleGround>: the faint ripple refraction a ring leaves on the ground (TREATMENT §5.1 kind 1: "a ground ripple of
// 6 px or less, decaying over 30" frames). On the ground layer only, never on UI the viewer reads.
//
// How: the ground is drawn once as it is, then twice more for each live ripple, scaled about the ripple's centre and
// masked to a thin feathered band on each side of the crest: the outer band slightly outward, the inner band slightly
// inward. Content near the crest is pulled apart like light through a water ripple. Pure CSS transforms and masks:
// deterministic, GPU-composited, no SVG displacement filter (whose map would have to be rebuilt every frame).
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../tokens";
import { worldToFrame, type Pose } from "../motion/camera";
import type { Point } from "../motion/geometry";
import { rippleStates, type RingSpec } from "./ring";

export interface RippleGroundProps {
  specs: readonly RingSpec[];
  /** the pose of the plane the rings live on (depth 1); ripple centres map through it */
  pose: Pose;
  /** the ground, drawn in frame space (absolutely positioned, fills the frame) */
  children: ReactNode;
  offset?: number;
  poseAt?: (frame: number) => Pose;
  /** a faint crest highlight lit from above left (≤ 0.06); 0 turns it off */
  highlight?: number;
}

const band = (cx: number, cy: number, r0: number, r1: number, r2: number) =>
  `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${Math.max(0, r0).toFixed(1)}px, #000 ${Math.max(0, r1).toFixed(1)}px, transparent ${Math.max(0, r2).toFixed(1)}px)`;

export const RippleGround: React.FC<RippleGroundProps> = ({ specs, pose, children, offset = 0, poseAt, highlight = 0.04 }) => {
  const frame = useCurrentFrame() + offset;
  const { width, height, fps } = useVideoConfig();
  const short = Math.min(width, height);
  const edge = poseAt
    ? (f: number, c: Point) => {
        const p = poseAt(f);
        const fc = worldToFrame(c, p, width, height);
        return Math.max(Math.hypot(fc.x, fc.y), Math.hypot(width - fc.x, fc.y), Math.hypot(fc.x, height - fc.y), Math.hypot(width - fc.x, height - fc.y)) / p.zoom;
      }
    : undefined;
  const ripples = specs.flatMap((s) => rippleStates(s, frame, fps, edge)).filter((r) => r.amplitudePx > 0.05);
  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      {ripples.map((rp) => {
        const c = worldToFrame(rp.c, pose, width, height);
        const R = rp.r * pose.zoom;
        if (R < 4) return null;
        const a = (rp.amplitudePx * short) / 1080;
        const b = Math.max(10, rp.band * pose.zoom);
        const shift = Math.min(a, R * 0.25);
        const sOut = 1 + shift / R;
        const sIn = 1 - shift / R;
        const origin = `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`;
        const outer = band(c.x, c.y, R, R + b * 0.3, R + b * 0.6);
        const inner = band(c.x, c.y, R - b * 0.6, R - b * 0.3, R);
        return (
          <AbsoluteFill key={rp.id} style={{ pointerEvents: "none" }}>
            <AbsoluteFill style={{ WebkitMaskImage: outer, maskImage: outer }}>
              <AbsoluteFill style={{ transform: `scale(${sOut.toFixed(6)})`, transformOrigin: origin }}>{children}</AbsoluteFill>
            </AbsoluteFill>
            <AbsoluteFill style={{ WebkitMaskImage: inner, maskImage: inner }}>
              <AbsoluteFill style={{ transform: `scale(${sIn.toFixed(6)})`, transformOrigin: origin }}>{children}</AbsoluteFill>
            </AbsoluteFill>
            {highlight > 0 ? (
              <AbsoluteFill
                style={{
                  background: band(c.x, c.y, R - b * 0.15, R, R + b * 0.15).replace(/#000/g, `rgba(255, 255, 255, ${Math.min(0.06, highlight * (a / ((6 * short) / 1080))).toFixed(4)})`),
                  // lit from above left: the crest brightens on that side only
                  WebkitMaskImage: `linear-gradient(135deg, #000 0%, transparent 62%)`,
                  maskImage: `linear-gradient(135deg, #000 0%, transparent 62%)`,
                  mixBlendMode: "screen",
                }}
              />
            ) : null}
            {/* the crest's shade on the far side, as faint as the highlight */}
            {highlight > 0 ? (
              <AbsoluteFill
                style={{
                  background: band(c.x, c.y, R - b * 0.1, R + b * 0.05, R + b * 0.2).replace(
                    /#000/g,
                    `rgba(${COLOR.shadeRgb}, ${Math.min(0.05, highlight * 0.8 * (a / ((6 * short) / 1080))).toFixed(4)})`,
                  ),
                  WebkitMaskImage: `linear-gradient(315deg, #000 0%, transparent 62%)`,
                  maskImage: `linear-gradient(315deg, #000 0%, transparent 62%)`,
                  mixBlendMode: "multiply",
                }}
              />
            ) : null}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
