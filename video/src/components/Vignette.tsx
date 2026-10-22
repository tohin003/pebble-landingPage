// Finishing in frame space (R5 §8, critic H8):
// - <Vignette>: a 6–10 % darkening tinted with the brand's shadow green (#13251B), never black, with an eased falloff
//   (no ring where it starts). A CSS radial gradient, cheaper than the WebGL effect. Use it on worlds with a ground;
//   skip it on white UI punch-ins.
// - <Grain>: OFF by default (H8: baked grain fights the web encodes). If a test keeps it, it cycles at 15 Hz (every
//   second frame at 30 fps) and stays around 2 %; its seed follows `frame % period` so loops stay periodic.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easedStops } from "./gradients";

export const Vignette: React.FC<{ amount?: number; color?: string; center?: { x: number; y: number }; inner?: number }> = ({
  amount = 0.07,
  color = "19, 37, 27",
  center = { x: 0.5, y: 0.46 },
  inner = 0.45,
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse 74% 74% at ${center.x * 100}% ${center.y * 100}%, ${easedStops(color, 0, amount, inner * 100, 100)})`,
    }}
  />
);

export const Grain: React.FC<{ amount?: number; hz?: number; period?: number }> = ({ amount = 0.02, hz = 15, period }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const f = period ? frame % period : frame;
  const seed = Math.floor((f * hz) / fps);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "soft-light", opacity: Math.min(1, amount * 12) }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        <filter id={`grain-${seed}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
