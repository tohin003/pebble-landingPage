// Calibration still (Tools folder): "H" in each film face at 200 px, line-height 1, each box's top at y = 100. The bottom
// of the H is the baseline, so (H bottom − 100) / 200 is the face's baseline offset in em for line-height 1; the
// constants in components/textMetrics.ts were measured on this still (render it again if the fonts change).
import { AbsoluteFill } from "remotion";
import { FONT, FRAUNCES_AXES } from "../fonts";

const FACES = [
  { family: FONT.display, weight: 350, axes: FRAUNCES_AXES },
  { family: FONT.sans, weight: 500, axes: undefined },
  { family: FONT.sans, weight: 650, axes: undefined },
  { family: FONT.mono, weight: 500, axes: undefined },
] as const;

export const FontMetrics: React.FC = () => (
  <AbsoluteFill style={{ background: "#FFFFFF" }}>
    {FACES.map((f, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 60 + i * 460,
          top: 100,
          fontFamily: f.family,
          fontWeight: f.weight,
          fontVariationSettings: f.axes,
          fontSize: 200,
          lineHeight: 1,
          color: "#000000",
          whiteSpace: "pre",
        }}
      >
        Hx
      </div>
    ))}
  </AbsoluteFill>
);
