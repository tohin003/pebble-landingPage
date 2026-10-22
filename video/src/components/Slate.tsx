// A quiet placeholder for a shot or composition that is not built yet (the board-o-matic and the loop stubs): what the
// shot is, its frames and its lines, in the brand's type, so a timing review with the music works before the scenes
// exist. Never part of a final render: lane G2 replaces every slate.
import { AbsoluteFill } from "remotion";
import { FONT } from "../fonts";
import { useLayout } from "../motion/layout";
import { COLOR, LOOK } from "../motion/spec";

export const Slate: React.FC<{
  title: string;
  detail?: string;
  lines?: readonly string[];
  meta?: string;
  tone?: "paper" | "sage";
}> = ({ title, detail, lines = [], meta, tone = "paper" }) => {
  const layout = useLayout();
  const ink = tone === "sage" ? "#FFFFFF" : COLOR.ink;
  const ink2 = tone === "sage" ? "rgba(255, 255, 255, 0.72)" : COLOR.secondary;
  return (
    <AbsoluteFill
      style={{
        background: tone === "sage" ? COLOR.pebble : LOOK.room,
        padding: `${layout.safe.y}px ${layout.safe.x}px`,
        justifyContent: "center",
        gap: layout.gap,
      }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: Math.round(26 * layout.s), color: ink2 }}>{meta}</div>
      <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: Math.round(56 * layout.s), color: ink, letterSpacing: "-0.02em" }}>
        {title}
      </div>
      {detail ? (
        <div style={{ fontFamily: FONT.sans, fontSize: Math.round(28 * layout.s), lineHeight: 1.4, color: ink2, maxWidth: Math.round(1400 * layout.s) }}>
          {detail}
        </div>
      ) : null}
      {lines.map((l) => (
        <div key={l} style={{ fontFamily: FONT.sans, fontSize: Math.round(36 * layout.s), color: ink }}>
          “{l}”
        </div>
      ))}
    </AbsoluteFill>
  );
};
