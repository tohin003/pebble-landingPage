// L8 loop-views (10 s, 300 frames): views Pebble builds in a conversation. The "Lisbon trip budget" dashboard's window
// on the riverbed desktop; the camera moves into its "Spending by category" chart; a cut to the Python datetime quiz;
// a cut back to the chart and the camera returns to the wide frame (FILM_SPEC §16). Stills main-dashboard@3x and
// main-quiz@3x; in the close framings the rest of the window recedes under a light veil (UiStill focus, R5 §5.3), so
// the conversation's cut-off lines never compete with the view. The data never animates. Data: plans.ts L8.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Desktop, MacWindow, UiStill, World } from "../components";
import { cameraAt } from "../motion/camera";
import { L8 } from "./plans";

/** The chart panel and the quiz card in their windows (CSS px), the regions that stay sharp in the close framings. */
const CHART = { x: 676, y: 430, w: 734, h: 470 };
const QUIZ = { x: 728, y: 206, w: 418, h: 548 };

export const LoopViews: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const quiz = frame >= L8.cutToQuiz && frame < L8.cutBack;
  const pose = quiz ? L8.poses.quiz : cameraAt(frame, L8.plan.camera.wide, fps, width);
  // the dashboard's focus follows the camera into the chart (0 wide → 1 at the chart framing)
  const into = (Math.log(pose.zoom) - Math.log(L8.poses.wide.zoom)) / (Math.log(L8.poses.chart.zoom) - Math.log(L8.poses.wide.zoom));
  const focus = Math.max(0, Math.min(1, into));
  const { dash, quiz: q } = L8;
  return (
    <Camera pose={pose}>
      <World>
        <Desktop />
        {quiz ? (
          <MacWindow x={q.x} y={q.y} width={q.w} height={q.h}>
            {/* lane G-fix (REVIEW-G2 P2-22): S7c's veil (60 % paper, 10 px blur), so the conversation's strip left of the
                quiz card shows no readable fragments ("go, and I'll") */}
            <UiStill name="main-quiz" focus={{ rect: QUIZ, amount: 1, mode: "card", radius: 14, veil: 0.6, blur: 10 }} />
          </MacWindow>
        ) : (
          <MacWindow x={dash.x} y={dash.y} width={dash.w} height={dash.h}>
            <UiStill name="main-dashboard" focus={focus > 0.001 ? { rect: CHART, amount: 0.6 * focus, mode: "card", radius: 12, veil: 0.4 } : undefined} />
          </MacWindow>
        )}
      </World>
    </Camera>
  );
};
