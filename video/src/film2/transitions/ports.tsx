// Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's film (film2/THIRD_PARTY_NOTICES.md).
// HyperFrames registry moves ported as GSAP code (Apache-2.0; heygen-com/hyperframes at tag v0.8.202, read as source:
// the files and their git blob hashes are in .work/film2/hf-registry@v0.8.202/MANIFEST.json; see film2/README.md).
// Each port keeps the move's mechanic and drops what Pebble's rules forbid. All run inside useGsapTimeline (fromTo at
// absolute positions, no callbacks, DOM and SVG targets only).
//
// <WhipPanCut>  port of components/whip-pan-cut (git blob e0d0b4ff5c). RESERVED in TREATMENT §5.1 ("whips: the rings
//   carry the travel"): kept for the tour and the kit. Both scenes ride ONE strip (B docked one frame-width beyond A),
//   so the seam's velocity is matched by construction; one power3.inOut tween over 0.55 s. Changed: the directional
//   blur's peak is σ = peak travel ÷ 7 (the film's rule), not the original's 16 px cap, which under-blurs a 1920 px whip
//   (233 px a frame at its peak); the seam hairline is off by default (the hairline belongs to the stone's rings).
// <CutTheCurve> port of components/cut-the-curve (git blob b470b6966c): the velocity-matched directional hard cut.
//   The outgoing subject accelerates along one vector on power4.in; at peak velocity the identities swap; the incoming
//   subject continues on the same vector and decelerates on power4.out. The incoming distance is derived so the speeds
//   match at the cut: D_in = D_out × T_in / T_out (power4's slope is 5 at the joining end of both halves). Matched blur
//   (σ = peak travel ÷ 7) and matched opacity (0.72) at the seam. Kind 2 for a subject (a card, the pointer) rather
//   than the camera.
import { useGsapTimeline } from "@remotion/gsap";
import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { RING, f60 } from "../tokens";
import { curve } from "../motion/ease";
import { sigmaForTravel } from "../motion/blur";
import { fs } from "../type/gsap";

/* ---------------------------------------------------------------- whip-pan-cut -------------------------------- */

export interface WhipPanCutProps {
  /** local frame the whip starts */
  at: number;
  /** the whip's length, frames (default 33 at 60 fps: the original's 0.55 s) */
  frames?: number;
  direction?: "left" | "right";
  before: ReactNode;
  after: ReactNode;
  seam?: boolean;
}

/** The whip's peak screen speed (px per frame) and its σ. power3.inOut peaks at 4× the mean speed. */
export const whipNumbers = (widthPx: number, frames: number) => {
  const peak = (widthPx * curve("power3.inOut").slope(0.5)) / frames;
  return { peakTravel: peak, peakSigma: sigmaForTravel(peak) };
};

export const WhipPanCut: React.FC<WhipPanCutProps> = ({ at, frames, direction = "left", before, after, seam = false }) => {
  const { fps, width, height } = useVideoConfig();
  const N = frames ?? f60(33, fps);
  const sign = direction === "left" ? -1 : 1;
  const { peakSigma } = whipNumbers(width, N);
  const scope = useGsapTimeline<HTMLDivElement>(
    ({ timeline: tl, selector: q }) => {
      const strip = q(".wpc-strip")[0]!;
      const blur = q(".wpc-blur")[0]!;
      const t0 = fs(at, fps);
      const half = fs(N / 2, fps);
      tl.fromTo(strip, { x: 0 }, { x: sign * width, duration: fs(N, fps), ease: "power3.inOut" }, t0);
      // the blur envelope mirrors the speed: up on power3.in to the middle, down on power3.out
      tl.fromTo(blur, { attr: { stdDeviation: "0 0" } }, { attr: { stdDeviation: `${peakSigma.toFixed(2)} 0` }, duration: half, ease: "power3.in" }, t0);
      tl.fromTo(blur, { attr: { stdDeviation: `${peakSigma.toFixed(2)} 0` } }, { attr: { stdDeviation: "0 0" }, duration: half, ease: "power3.out", immediateRender: false }, t0 + half);
      if (seam) {
        const line = q(".wpc-seam")[0]!;
        tl.fromTo(line, { autoAlpha: 0 }, { autoAlpha: 1, duration: fs(Math.min(6, N / 4), fps), ease: "power1.out", immediateRender: false }, t0);
        tl.fromTo(line, { autoAlpha: 1 }, { autoAlpha: 0, duration: fs(9, fps), ease: "power1.in", immediateRender: false }, t0 + fs(N - 9, fps));
      }
    },
    { dependencies: [at, N, sign, width, height, fps, peakSigma, seam] },
  );
  const fid = `wpc-${at}-${N}`;
  return (
    <AbsoluteFill ref={scope} style={{ overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={fid} x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur className="wpc-blur" in="SourceGraphic" stdDeviation="0 0" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill className="wpc-strip" style={{ filter: `url(#${fid})` }}>
        <AbsoluteFill>{before}</AbsoluteFill>
        <AbsoluteFill style={{ left: sign < 0 ? width : -width }}>{after}</AbsoluteFill>
        {seam ? (
          <div
            className="wpc-seam"
            style={{ position: "absolute", top: 0, bottom: 0, left: sign < 0 ? width : 0, width: RING.hairlinePx * (Math.min(width, height) / 1080), background: RING.color.light, transform: "translateX(-50%)", opacity: 0 }}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- cut-the-curve ------------------------------- */

export interface CutTheCurveProps {
  at: number;
  /** the whole profile, frames (0.3–3 s; default 60 at 60 fps) */
  frames?: number;
  direction?: "left" | "right" | "up" | "down";
  /** where the cut falls, 0..1 (default 0.33: about 1:2 out to in, in time and space) */
  cutFraction?: number;
  /** outgoing travel, px at 1080 (default 34 % of the frame's width, as the original) */
  distancePx?: number;
  outgoing: ReactNode;
  incoming: ReactNode;
}

export const cutTheCurveNumbers = (frames: number, cutFraction: number, dOut: number) => {
  const cut = frames * cutFraction;
  const entry = frames - cut;
  const dIn = cut > 0 ? (dOut * entry) / cut : dOut * 2;
  const vCut = cut > 0 ? (5 * dOut) / cut : 0; // power4.in ends at 5× its mean speed; power4.out starts at the same
  return { cut, entry, dIn, vCut, sigma: sigmaForTravel(vCut) };
};

export const CutTheCurve: React.FC<CutTheCurveProps> = ({ at, frames, direction = "left", cutFraction = 0.33, distancePx, outgoing, incoming }) => {
  const { fps, width, height } = useVideoConfig();
  const N = frames ?? f60(60, fps);
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const dOut = distancePx !== undefined ? (distancePx * Math.min(width, height)) / 1080 : axis === "x" ? 0.34 * width : 0.26 * height;
  const n = cutTheCurveNumbers(N, cutFraction, dOut);
  const scope = useGsapTimeline<HTMLDivElement>(
    ({ timeline: tl, selector: q }) => {
      const o = q(".ctc-out")[0]!;
      const i = q(".ctc-in")[0]!;
      const t0 = fs(at, fps);
      const tc = t0 + fs(n.cut, fps);
      const seamBlur = `blur(${n.sigma.toFixed(2)}px)`;
      tl.fromTo(o, { [axis]: 0, opacity: 1, filter: "blur(0px)" }, { [axis]: sign * dOut, opacity: 0.72, filter: seamBlur, duration: fs(n.cut, fps), ease: "power4.in" }, t0);
      tl.set(i, { autoAlpha: 0 }, 0);
      tl.set(o, { autoAlpha: 0 }, tc);
      tl.fromTo(i, { [axis]: -sign * n.dIn, autoAlpha: 0.72, filter: seamBlur }, { [axis]: 0, autoAlpha: 1, filter: "blur(0px)", duration: fs(n.entry, fps), ease: "power4.out", immediateRender: false }, tc);
    },
    { dependencies: [at, N, axis, sign, dOut, cutFraction, fps] },
  );
  return (
    <AbsoluteFill ref={scope}>
      <AbsoluteFill className="ctc-out">{outgoing}</AbsoluteFill>
      <AbsoluteFill className="ctc-in" style={{ opacity: 0 }}>
        {incoming}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
