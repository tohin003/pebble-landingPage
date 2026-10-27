// Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's film (film2/THIRD_PARTY_NOTICES.md).
// Code light leaks (TREATMENT §5.4 asks for light made in code; stock light-leak clips are on §5.1's banned list).
// Use at most once or twice in a film, and only where light motivates it (the Drop's warming): CRAFT T08 prefers sweeps,
// and the lab films' sources report no leaks. qa/checks.ts counts them.
//
// <LightLeak> is a port of HyperFrames' light-leak block (Apache-2.0, heygen-com/hyperframes v0.8.202,
// registry/blocks/light-leak/light-leak.html, git blob 8385d63a1a; read as source, see film2/README.md). Its shader:
//   lp = (1.3, −0.2) in UV, beyond the top-right corner; dist = |uv − lp|;
//   leak = clamp(exp(−1.8·dist)·progress·4, 0, 1); colour = mix((1, .5, .15), (1, .9, .75), 0.7·dist);
//   flare = exp(−15·|uv.y − (−0.2 + 0.3·uv.x)|)·leak·0.3; overexposed = A + colour·leak·3 + (1, .8, .5)·flare.
// Ported as CSS layers in `screen` blend: a radial falloff sampled into eased stops (the same exp(−1.8·dist) curve, with
// the same colour ramp) and a thin streak along the same line. No WebGL, so it runs on the headless shell, and it is a
// pure function of the frame. Its strength is capped (peak alpha 0.38 at the corner) so the frame's mean luminance moves
// well under WCAG's 10 % flash threshold on the light grounds, and its envelope rises and falls on E-move.
//
// <LightLeakEffect> uses @remotion/effects' lightLeak() on a <Solid> instead (WebGL2; fine on the headless shell).
import { AbsoluteFill, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { lightLeak } from "@remotion/effects/light-leak";
import { E_MOVE } from "../motion/ease";

export interface LeakTiming {
  /** frame the leak starts */
  at: number;
  /** its whole life, frames: 0.6–1.0 s (36–60 at 60 fps) */
  frames: number;
}

/** 0 → 1 → 0 over the leak's life, on E-move (rise over the first 45 %, fall over the rest). */
export const leakEnvelope = (frame: number, t: LeakTiming): number => {
  const u = (frame - t.at) / t.frames;
  if (u <= 0 || u >= 1) return 0;
  return u < 0.45 ? E_MOVE(u / 0.45) : 1 - E_MOVE((u - 0.45) / 0.55);
};

const mix3 = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t);
const NEAR = [1, 0.5, 0.15];
const FAR = [1, 0.9, 0.75];
/** The sage variant: the same ramp, its hue moved toward the brand's sage (CRAFT T08: hueShift about 90–110°). */
const NEAR_SAGE = [0.62, 0.78, 0.52];
const FAR_SAGE = [0.9, 0.95, 0.86];

export const LightLeak: React.FC<LeakTiming & { tone?: "warm" | "sage"; strength?: number }> = ({ at, frames, tone = "warm", strength = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const e = leakEnvelope(frame, { at, frames }) * Math.min(1, Math.max(0, strength));
  if (e <= 0.001) return null;
  const near = tone === "sage" ? NEAR_SAGE : NEAR;
  const far = tone === "sage" ? FAR_SAGE : FAR;
  // radial falloff: sample exp(−1.8·d)·4·p (clamped) at distances d (UV) from lp, as eased stops of a gradient whose
  // 100 % radius is d = 1.6 UV (the frame's far corner from lp is about 1.48 UV away)
  const stops: string[] = [];
  const D = 1.6;
  for (let i = 0; i <= 16; i++) {
    const d = (i / 16) * D;
    const leak = Math.min(1, Math.exp(-1.8 * d) * 4 * e);
    const c = mix3(near, far, Math.min(1, 0.7 * d));
    const a = leak * 0.38; // the cap
    stops.push(`rgba(${Math.round(c[0]! * 255)}, ${Math.round(c[1]! * 255)}, ${Math.round(c[2]! * 255)}, ${a.toFixed(4)}) ${((i / 16) * 100).toFixed(1)}%`);
  }
  const rx = D * width;
  const ry = D * height;
  const cx = 1.3 * width;
  const cy = -0.2 * height;
  // the streak: the line y = −0.2 + 0.3·x in UV; in px its angle is atan(0.3·H/W)
  const angle = (Math.atan2(0.3 * height, width) * 180) / Math.PI;
  const streakA = Math.min(1, e * 4) * 0.3 * 0.38;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <AbsoluteFill style={{ background: `radial-gradient(${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, ${stops.join(", ")})` }} />
      <AbsoluteFill
        style={{
          // a band 2/15 UV wide around the line, its centre crossing the frame's right edge near the top
          background: `linear-gradient(${(90 + angle).toFixed(2)}deg, transparent 38%, rgba(255, 204, 128, ${streakA.toFixed(4)}) 46%, transparent 54%)`,
          WebkitMaskImage: `radial-gradient(${(rx * 0.7).toFixed(0)}px ${(ry * 0.7).toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, #000 0%, transparent 100%)`,
          maskImage: `radial-gradient(${(rx * 0.7).toFixed(0)}px ${(ry * 0.7).toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, #000 0%, transparent 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** The @remotion/effects version (lightLeak on a Solid, WebGL2): hueShift ≈ 100 tints it toward sage. */
export const LightLeakEffect: React.FC<LeakTiming & { seed?: number; hueShift?: number; opacity?: number }> = ({ at, frames, seed = 3, hueShift = 0, opacity = 0.6 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = (frame - at) / frames;
  if (u <= 0 || u >= 1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity }}>
      <Solid width={width} height={height} color="#000000" effects={[lightLeak({ seed, hueShift, progress: u })]} />
    </AbsoluteFill>
  );
};
