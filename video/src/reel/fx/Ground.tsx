// The reel's ground: a deep forest field with saturated glows that drift at half the foreground's speed (parallax),
// a vignette in the shade green, and a fine grain so the gradients never band in the encode.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FilmGrain } from "../../film2/light/Grain";
import { REEL } from "./look";

export type Tint = "sage" | "clay" | "deep";

export const Ground: React.FC<{
  tint?: Tint;
  /** where the main glow sits, 0..1 of the frame */
  focus?: { x: number; y: number };
  /** 0..1.5: the glows' strength (a hit can push it) */
  energy?: number;
  /** the foreground's offset in px; the glows move at `parallax` of it */
  shift?: { x: number; y: number };
  parallax?: number;
}> = ({ tint = "sage", focus = { x: 0.5, y: 0.5 }, energy = 1, shift = { x: 0, y: 0 }, parallax = 0.35 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = frame / 60;
  const fx = focus.x * W + shift.x * parallax + Math.sin(t * 0.7) * W * 0.02;
  const fy = focus.y * H + shift.y * parallax + Math.cos(t * 0.55) * H * 0.02;
  // clay keeps the green ground and adds the warm glow beside a sage one (a brown base read as mud, v3)
  const base = tint === "deep" ? REEL.baseDeep : REEL.base;
  const main = tint === "clay" ? REEL.clay : tint === "deep" ? REEL.deep : REEL.sage;
  const second = tint === "clay" ? REEL.sage : REEL.clay;
  const mainA = tint === "clay" ? 0.42 : 0.5;
  const secondA = tint === "clay" ? 0.4 : 0.2;
  const R = Math.max(W, H);
  const e = Math.max(0, energy);
  // the counter-glow sits across the frame from the main one and drifts the other way
  const cx = W - fx * 0.8 + Math.sin(t * 0.4 + 1) * W * 0.03;
  const cy = H - fy * 0.7 + H * 0.15;
  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(${R * 0.36}px ${R * 0.3}px at ${fx}px ${fy}px, rgba(${REEL.sageCore}, ${0.16 * e}), transparent 70%)`,
            `radial-gradient(${R * 0.75}px ${R * 0.6}px at ${fx}px ${fy}px, rgba(${main}, ${mainA * e}), transparent 72%)`,
            `radial-gradient(${R * 0.5}px ${R * 0.42}px at ${cx}px ${cy}px, rgba(${second}, ${secondA * e}), transparent 70%)`,
          ].join(", "),
        }}
      />
      {/* the vignette, in the shade green */}
      <AbsoluteFill style={{ background: `radial-gradient(${R * 0.8}px ${R * 0.62}px at 50% 50%, transparent 55%, rgba(${REEL.shadeRgb}, 0.85) 100%)` }} />
      <FilmGrain on amountPct={3} hz={30} />
    </AbsoluteFill>
  );
};
