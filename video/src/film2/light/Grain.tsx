// Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's film (film2/THIRD_PARTY_NOTICES.md).
// <FilmGrain>: film grain made in code, deterministic, OFF unless a shot asks for it (TREATMENT §5.4 and OVERRIDES §8
// H8: no baked grain by default; it fights the web encodes). If the lead keeps it: about 2 % at 24 Hz, in the master
// only, never on a single layer. Ported in spirit from HyperFrames' grain-overlay (Apache-2.0, v0.8.202): a fractal
// noise field re-seeded at a fixed rate; here the seed comes from the frame, so every render tab draws the same grain.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LIGHT } from "../tokens";

export const FilmGrain: React.FC<{ amountPct?: number; hz?: number; on?: boolean }> = ({ amountPct = LIGHT.grainPct, hz = LIGHT.grainHz, on = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!on || amountPct <= 0) return null;
  const seed = Math.floor((Math.floor(frame) * hz) / fps);
  const id = `f2grain-${seed}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "soft-light", opacity: Math.min(1, (amountPct / 100) * 12) }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};
