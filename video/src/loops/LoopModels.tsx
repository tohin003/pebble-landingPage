// L2 loop-models (6 s, 180 frames): Settings › Models, one card at the app's own scale on the riverbed. The three ways to
// connect a model (Add a model file, Connect provider, Continue with ChatGPT and its qualifier) come forward while the
// models list above recedes (the spotlight, in the sheet's own white), hold, and go back. No camera move and no ring:
// the system points with the picture itself (kit.tsx SYSTEM.focus); the pixels are the capture's (critic C3).
// Data: plans.ts L2.
import { useCurrentFrame } from "remotion";
import { UiStill } from "../components";
import { EASE, ramp } from "../motion/spec";
import { Ground, LoopStage, StageLayer, SYSTEM } from "./kit";
import { L2 } from "./plans";

export const LoopModels: React.FC = () => {
  const frame = useCurrentFrame();
  const { stage, ways, spot } = L2;
  const pose = L2.plan.camera.wide[0]!;
  const amount = ramp(frame, spot.in, spot.dur, EASE.move) * (1 - ramp(frame, spot.out, spot.dur, EASE.move));
  return (
    <>
      <Ground />
      <LoopStage stage={stage.wide} background={SYSTEM.panel}>
        <StageLayer pose={pose}>
          <UiStill
            name="settings-models"
            veil={SYSTEM.panel}
            focus={amount > 0.001 ? { rect: ways, mode: "card", radius: 10, amount, veil: SYSTEM.focus.veil, blur: SYSTEM.focus.blur } : undefined}
          />
        </StageLayer>
      </LoopStage>
    </>
  );
};
