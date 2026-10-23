// L8 loop-views (6.8 s, 204 frames): two views Pebble built in a conversation, each one card on the riverbed at about
// the app's own scale on the views slot: the "Spending by category" chart of the Lisbon trip budget dashboard (the card
// is the chart's own panel), then the Python datetime quiz. A 0.4 s dissolve between them, each held 3 s; the data never
// animates. DESIGN-LEXINGTON §3.8: one moment per frame, so no whole window (lane G2b's L8 opened on the dashboard's
// window and moved into the chart). Stills main-dashboard@3x and main-quiz@3x. Data: plans.ts L8.
import { useCurrentFrame } from "remotion";
import { UiStill } from "../components";
import { DISSOLVE_BLUR, Ground, LoopStage, StageLayer, SYSTEM, dissolveAt } from "./kit";
import { L8 } from "./plans";

export const LoopViews: React.FC = () => {
  const frame = useCurrentFrame();
  const { chart, quiz } = L8;
  const [[a0, a1], [b0, b1]] = L8.plan.dissolves as unknown as [[number, number], [number, number]];
  // how far the quiz has replaced the chart: 0 → 1 over the first dissolve, 1 → 0 over the second
  const q = frame < b0 ? dissolveAt(frame, a0, a1 - a0) : 1 - dissolveAt(frame, b0, b1 - b0);
  const c = 1 - q;
  return (
    <>
      <Ground />
      <LoopStage stage={chart.stage} background={SYSTEM.panel} opacity={c}>
        <StageLayer pose={chart.pose} blur={DISSOLVE_BLUR * q}>
          <UiStill name="main-dashboard" />
        </StageLayer>
      </LoopStage>
      <LoopStage stage={quiz.stage} background={SYSTEM.panel} opacity={q}>
        <StageLayer pose={quiz.pose} blur={DISSOLVE_BLUR * c}>
          <UiStill name="main-quiz" />
        </StageLayer>
      </LoopStage>
    </>
  );
};
