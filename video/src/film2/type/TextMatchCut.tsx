// <TextMatchCut>: one line becomes another in the middle of a move (a match cut on type). Port of HyperFrames'
// text-match-cut (Apache-2.0, heygen-com/hyperframes v0.8.202, registry/components/text-match-cut, git blob
// c8c116a7af; read as source): both lines ride ONE value curve, cubic-bezier(.85, 0, .15, 1) (After Effects easy-ease at
// 85 % influence, measured from its source tutorial at 60 fps); the hard cut falls exactly halfway, at the speed peak,
// so line B appears at line A's value, still moving, with no crossfade.
//
// Changes in the port, for Pebble's rules:
// - no cyan-to-blue gradient sweep through the glyphs (decorative gradients and that hue are on the brand's never-list);
// - the smear is σ = travel ÷ 7 at the text's moving edge (the film's blur rule), not HyperFrames' min(6, 0.07·v);
// - built as fromTo tweens on elements (the original drives a proxy clock through onUpdate, which @remotion/gsap
//   forbids); the smear rises on power2.in to the cut and falls on power2.out after it, following the curve's speed.
// Each line is read before or after the move, never during it: hold line A for its reading time before `at`, and line
// B for its own after `at + frames`.
import { useGsapTimeline } from "@remotion/gsap";
import type { CSSProperties } from "react";
import { useVideoConfig } from "remotion";
import { COLOR, f60, type TypeTier } from "../tokens";
import { E_MATCH } from "../motion/ease";
import { sigmaForTravel } from "../motion/blur";
import { fs } from "./gsap";
import { approxLineWidth, typeStyle } from "./scale";

export type MatchMode = "scale-down" | "scale-up" | "slide-left" | "slide-right" | "slide-up" | "slide-down";

const MODES: Record<MatchMode, { prop: "scale" | "x" | "y"; v0: number; v1: number }> = {
  "scale-down": { prop: "scale", v0: 1.7, v1: 1.0 },
  "scale-up": { prop: "scale", v0: 0.6, v1: 1.0 },
  "slide-left": { prop: "x", v0: 0.0885, v1: -0.0885 },
  "slide-right": { prop: "x", v0: -0.0885, v1: 0.0885 },
  "slide-up": { prop: "y", v0: 0.139, v1: -0.139 },
  "slide-down": { prop: "y", v0: -0.139, v1: 0.139 },
};

export interface TextMatchCutProps {
  a: string;
  b: string;
  /** local frame the move starts (line A is on screen before it) */
  at: number;
  /** the whole move, frames (default 120 at 60 fps: the measured 2.0 s) */
  frames?: number;
  mode?: MatchMode;
  tier?: TypeTier;
  color?: string;
  /** the box the lines are centred in (frame px) */
  style?: CSSProperties;
}

/** The cut's frame and the smear's peak σ (px) for a line of width `widthPx`. */
export const matchCutNumbers = (mode: MatchMode, frames: number, widthPx: number, frameW: number, frameH: number) => {
  const m = MODES[mode];
  const peakSlope = E_MATCH.slope(0.5); // 6.67× the mean at the middle
  const span = m.prop === "scale" ? (Math.abs(m.v1 - m.v0) * widthPx) / 2 : m.prop === "x" ? Math.abs(m.v1 - m.v0) * frameW : Math.abs(m.v1 - m.v0) * frameH;
  const peakTravel = (span * peakSlope) / frames;
  return { cutFrame: frames / 2, peakTravel, peakSigma: sigmaForTravel(peakTravel) };
};

export const TextMatchCut: React.FC<TextMatchCutProps> = ({ a, b, at, frames, mode = "scale-down", tier = "expressive", color = COLOR.ink, style }) => {
  const { fps, width, height } = useVideoConfig();
  const IN = frames ?? f60(120, fps);
  const m = MODES[mode];
  const wA = approxLineWidth(a, tier, width, height);
  const { peakSigma } = matchCutNumbers(mode, IN, wA, width, height);
  const scope = useGsapTimeline<HTMLDivElement>(
    ({ timeline: tl, selector: q }) => {
      const mover = q(".tmc-mover")[0] as HTMLElement;
      const A = q(".tmc-a")[0] as HTMLElement;
      const B = q(".tmc-b")[0] as HTMLElement;
      const t0 = fs(at, fps);
      const cut = t0 + fs(IN / 2, fps);
      const from = m.prop === "scale" ? { scale: m.v0 } : m.prop === "x" ? { x: m.v0 * width } : { y: m.v0 * height };
      const to = m.prop === "scale" ? { scale: m.v1 } : m.prop === "x" ? { x: m.v1 * width } : { y: m.v1 * height };
      tl.fromTo(mover, from, { ...to, duration: fs(IN, fps), ease: "E-match" }, t0);
      tl.fromTo(mover, { filter: "blur(0px)" }, { filter: `blur(${peakSigma.toFixed(2)}px)`, duration: fs(IN / 2, fps), ease: "power2.in" }, t0);
      tl.fromTo(mover, { filter: `blur(${peakSigma.toFixed(2)}px)` }, { filter: "blur(0px)", duration: fs(IN / 2, fps), ease: "power2.out", immediateRender: false }, cut);
      // the hard cut: one visibility owner, at the same instant
      tl.set(A, { autoAlpha: 1 }, 0);
      tl.set(B, { autoAlpha: 0 }, 0);
      tl.set(A, { autoAlpha: 0 }, cut);
      tl.set(B, { autoAlpha: 1 }, cut);
    },
    { dependencies: [a, b, at, IN, mode, tier, fps, width, height, peakSigma] },
  );
  const ts = typeStyle(tier, width, height);
  return (
    <div ref={scope} style={{ position: "absolute", display: "grid", placeItems: "center", ...style }}>
      <div className="tmc-mover" style={{ position: "relative", transformOrigin: "50% 50%" }}>
        <div className="tmc-a" style={{ ...ts, color, textAlign: "center" }}>
          {a}
        </div>
        <div className="tmc-b" style={{ ...ts, color, textAlign: "center", position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)" }}>
          {b}
        </div>
      </div>
    </div>
  );
};
