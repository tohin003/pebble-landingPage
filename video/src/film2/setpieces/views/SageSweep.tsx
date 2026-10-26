// <SageTextSweep>: the title's one light sweep (lead ruling L3a; setpieces/sweep.ts has the numbers). The same text,
// in the same place and style as its <KineticLine>, painted with a sage band through `background-clip: text`, so the
// light exists only inside the glyphs: no halo, no bloom, nothing beyond their edges. Its alpha is capped so the glyphs'
// L* rises by at most 15.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../../tokens";
import { typeStyle } from "../../type/scale";
import type { TypeSpec } from "../scene";
import { SAGE_SWEEP, sageBand, sageSweepPosition, sweepAlphaMax } from "../sweep";

const ALPHA_MAX = sweepAlphaMax(COLOR.ink, COLOR.accent, 15);

export const SageTextSweep: React.FC<{ spec: TypeSpec; dark?: boolean }> = ({ spec, dark = false }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (!spec.sweep) return null;
  const p = sageSweepPosition(frame, spec.sweep.at, spec.sweep.frames);
  if (p === null) return null;
  const sage = dark ? COLOR.accentDark : COLOR.accent;
  const alphaMax = dark ? sweepAlphaMax(COLOR.nightInk, COLOR.accentDark, 15) : ALPHA_MAX;
  const tier = spec.tier === "small" ? "small" : spec.tier;
  const st = typeStyle(tier, width, height, spec.sizeT ?? 0.5);
  // stops along the band's direction, in the text box's width; the band leans by the sweep's angle
  const rgb = sage.replace("#", "");
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  const stops: string[] = [];
  for (let i = -16; i <= 16; i++) {
    const d = (i / 16) * SAGE_SWEEP.halfWidth;
    stops.push(`rgba(${r}, ${g}, ${b}, ${sageBand(d, alphaMax).toFixed(4)}) ${((p + d) * 100).toFixed(2)}%`);
  }
  return (
    <div aria-hidden style={{ position: "absolute", left: spec.box.left, top: spec.box.top, width: spec.box.width, textAlign: spec.box.align, pointerEvents: "none" }}>
      <div
        style={{
          ...st,
          lineHeight: tier === "expressive" ? 1.25 : 1.3,
          // shrink-to-fit: the band's percentages run across the glyphs' own width, and the glyphs sit exactly where
          // the line's own glyphs do (the same box, style and alignment)
          display: "inline-block",
          color: "transparent",
          backgroundImage: `linear-gradient(${90 + SAGE_SWEEP.angleDeg}deg, rgba(${r}, ${g}, ${b}, 0) 0%, ${stops.join(", ")}, rgba(${r}, ${g}, ${b}, 0) 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        }}
      >
        {spec.text}
      </div>
    </div>
  );
};
