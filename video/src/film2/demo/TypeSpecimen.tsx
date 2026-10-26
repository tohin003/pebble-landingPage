// F2-Type-16x9, F2-Type-1x1, F2-Type-9x16: the type scale for each aspect (TREATMENT §5.2, §3.12), landed and still,
// with the 60 px safe margin and Act I's starting aperture drawn as hairline guides. One frame each; a still for review.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLOR, FAMILY, TYPE_SIZE } from "../tokens";
import { apertureRect } from "../carrier/apertureMath";
import { FontGate } from "../type/FontGate";
import { aspectOfFrame, safeMarginPx, typeSizePx, typeStyle } from "../type/scale";

const LINES = [
  { tier: "expressive" as const, t: 1, text: "Memory you control" },
  { tier: "expressive" as const, t: 0, text: "AgentGuard, built in." },
  { tier: "functional" as const, t: 0.5, text: "Reliability, not security." },
  { tier: "label" as const, t: 0.5, text: "A render, not a screen recording." },
  { tier: "data" as const, t: 0.5, text: "github.com/tohin003/Pebble" },
  { tier: "small" as const, t: 0.5, text: "Shown with sample data." },
];

export const TypeSpecimen: React.FC = () => {
  const { width, height } = useVideoConfig();
  const m = safeMarginPx(width, height);
  const aspect = aspectOfFrame(width, height);
  const ap = apertureRect(width, height, 0);
  let y = m + 8;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.page }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <rect x={m} y={m} width={width - 2 * m} height={height - 2 * m} fill="none" stroke={COLOR.line} strokeWidth={1} />
        <rect x={ap.x + 0.5} y={ap.y + 0.5} width={ap.w - 1} height={ap.h - 1} fill="none" stroke={COLOR.accent} strokeWidth={1} strokeDasharray="6 6" />
      </svg>
      <FontGate>
        {LINES.map((l, i) => {
          const s = typeStyle(l.tier, width, height, l.t);
          const top = y;
          y += (s.fontSize as number) * 1.35 + 18;
          const [lo, hi] = TYPE_SIZE[l.tier][aspect];
          return (
            <div key={i} style={{ position: "absolute", left: m, top, maxWidth: width - 2 * m }}>
              <div style={{ ...s, color: COLOR.ink, whiteSpace: "normal" }}>{l.text}</div>
              <div style={{ fontFamily: `"${FAMILY.mono}"`, fontSize: 15 * (Math.min(width, height) / 1080), color: COLOR.ink2 }}>
                {l.tier} {Math.round(typeSizePx(l.tier, width, height, l.t))} px ({lo}–{hi} at 1080, {aspect})
              </div>
            </div>
          );
        })}
      </FontGate>
    </AbsoluteFill>
  );
};
