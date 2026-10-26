// F2-Foundation-Grades: the same composed frame under each grade (light/grades.ts), one grade a frame, labelled, for a
// contact sheet: morning, warm, day, dusk, evening, page, night. Dusk is the Veil's own blue, which the film may use in
// the Stealth passage only; it is here so the lead can judge it. PLACEHOLDER UI.
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { COLOR, FAMILY, SHADOW_WINDOW } from "../tokens";
import { GRADES, type GradeName } from "../light/grades";
import { GradeLayer } from "../light/Grade";
import { RIVERBED_SRC, UiImage } from "./parts";
import { PLACEHOLDER, takeFramePath } from "./placeholders";

export const GRADE_ORDER: GradeName[] = ["morning", "warm", "day", "dusk", "evening", "page", "night"];
export const GRADES_SHEET = { durationInFrames: GRADE_ORDER.length, fps: 60, width: 1920, height: 1080 } as const;

const Frame: React.FC = () => (
  <AbsoluteFill>
    <Img src={staticFile(RIVERBED_SRC)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <div style={{ position: "absolute", left: 210, top: 150, width: 1160 * 0.78, height: 800 * 0.78, borderRadius: 8, overflow: "hidden", boxShadow: SHADOW_WINDOW }}>
      <div style={{ width: 1160, height: 800, transform: "scale(0.78)", transformOrigin: "0 0", position: "relative" }}>
        <UiImage ph={PLACEHOLDER.main} />
      </div>
    </div>
    <Img src={staticFile(takeFramePath(120))} style={{ position: "absolute", left: 1180, top: 330, width: 384 * 1.3, height: 456 * 1.3 }} />
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <circle cx={1180 + 326.7 * 1.3} cy={330 + 397.3 * 1.3} r={150} fill="none" stroke={COLOR.accent} strokeWidth={1.75} />
    </svg>
  </AbsoluteFill>
);

export const GradesSheet: React.FC = () => {
  const i = Math.min(GRADE_ORDER.length - 1, Math.max(0, Math.floor(useCurrentFrame())));
  const name = GRADE_ORDER[i]!;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.riverbedMid }}>
      <GradeLayer grade={GRADES[name]}>
        <Frame />
      </GradeLayer>
      <div style={{ position: "absolute", left: 60, top: 40, fontFamily: `"${FAMILY.mono}"`, fontSize: 30, color: COLOR.ink, background: "rgba(248, 249, 246, 0.85)", padding: "6px 14px" }}>
        grade: {name}
      </div>
    </AbsoluteFill>
  );
};
