// Kind 7, the light change between sections (TREATMENT §5.1): continuous over 30–60 frames (60 fps) or longer, on
// E-move, never a step, at most one large luminance change a second. The grade's numbers interpolate (light/grades.ts),
// so morning warms into the Drop, day cools into dusk, dusk warms into evening, and the page returns, without a cut.
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { GradeLayer } from "../light/Grade";
import { gradeAt, type GradeName, type LightCue, type Grade } from "../light/grades";

export const useGrade = (initial: GradeName | Grade, cues: readonly LightCue[], offset = 0): Grade => {
  const frame = useCurrentFrame() + offset;
  return gradeAt(frame, initial, cues);
};

export const LightChange: React.FC<{ initial: GradeName | Grade; cues: readonly LightCue[]; offset?: number; children: ReactNode; vignette?: boolean }> = ({
  initial,
  cues,
  offset = 0,
  children,
  vignette = true,
}) => {
  const g = useGrade(initial, cues, offset);
  return (
    <GradeLayer grade={g} vignette={vignette}>
      {children}
    </GradeLayer>
  );
};
