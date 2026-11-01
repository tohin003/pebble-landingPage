// <Grain>: film grain made in code, deterministic (the seed comes from the frame, so every render tab draws the same
// grain), re-seeded `hz` times a second like film, never on every 60 fps frame. The noise is drawn at half the frame's
// size and scaled up, which gives a soft two-pixel grain and costs a quarter of a full-size turbulence. It sits over
// everything (the stage, the UI, the type), as grain on a film does. `amountPct` is the treatment's 4-6 %.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { LIGHT } from "../tokens";

export const Grain: React.FC<{ amountPct?: number; hz?: number }> = ({ amountPct = LIGHT.grainPct, hz = LIGHT.grainHz }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (amountPct <= 0) return null;
  const seed = Math.floor((Math.floor(frame) * hz) / fps) % 997;
  const id = `launch-grain-${seed}`;
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);
  // A zero-mean noise: the turbulence (about 0.5 ± 0.15 per channel) desaturated, its contrast raised about 0.5, then
  // laid over the picture with "overlay", whose effect on the dark stage is small; a second pass in "soft-light"
  // lifts it where it is darkest. Opacity carries the amount.
  const k = Math.min(1, amountPct / 5);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <svg
        width={w}
        height={h}
        style={{ position: "absolute", left: 0, top: 0, transform: "scale(2)", transformOrigin: "0 0", mixBlendMode: "overlay", opacity: 0.55 * k }}
      >
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={seed} stitchTiles="stitch" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="g" />
          <feComponentTransfer in="g">
            <feFuncR type="linear" slope="2.4" intercept="-0.7" />
            <feFuncG type="linear" slope="2.4" intercept="-0.7" />
            <feFuncB type="linear" slope="2.4" intercept="-0.7" />
          </feComponentTransfer>
        </filter>
        <rect width={w} height={h} filter={`url(#${id})`} />
      </svg>
      <svg
        width={w}
        height={h}
        style={{ position: "absolute", left: 0, top: 0, transform: "scale(2)", transformOrigin: "0 0", mixBlendMode: "screen", opacity: 0.05 * k }}
      >
        <filter id={`${id}-s`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={seed + 31} stitchTiles="stitch" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" />
        </filter>
        <rect width={w} height={h} filter={`url(#${id}-s)`} />
      </svg>
    </AbsoluteFill>
  );
};
