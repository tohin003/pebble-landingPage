// L2 loop-models (6 s, 180 frames): Settings › Models. The view moves onto the three ways to connect a model (Add a
// model file, Connect provider, Continue with ChatGPT) while the rest of the panel recedes under a light veil, a ring
// draws on Add a model file (a model on this Mac), and the view returns to the same framing (FILM_SPEC §16; critic C3:
// the ring and the veil are drawn on, the pixels are the capture's). Data: plans.ts L2.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Ring, UiStill } from "../components";
import { cameraAt } from "../motion/camera";
import { Ground, LoopStage, PANEL_BG, StageLayer, StageOverlay } from "./kit";
import { L2 } from "./plans";

export const LoopModels: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stage, ring, ways } = L2;
  const keys = L2.plan.camera.wide;
  const pose = cameraAt(frame, keys, fps, stage.rect.w);
  // the spotlight follows the push-in: 0 at A, 1 at B (log-zoom progress)
  const zA = keys[0]!.zoom;
  const zB = keys[1]!.zoom;
  const spot = Math.max(0, Math.min(1, (Math.log(pose.zoom) - Math.log(zA)) / (Math.log(zB) - Math.log(zA))));
  return (
    <>
      <Ground />
      <LoopStage rect={stage.rect} corners={stage.corners}>
        <StageLayer pose={pose}>
          <UiStill
            name="settings-models"
            veil={PANEL_BG}
            focus={spot > 0.001 ? { rect: ways, mode: "card", radius: 10, amount: spot, veil: 0.55, blur: 3 } : undefined}
          />
        </StageLayer>
      </LoopStage>
      <StageOverlay rect={stage.rect} pose={pose}>
        <Ring rect={ring.rect} radius={ring.radius} drawAt={ring.drawAt} outAt={ring.outAt} />
      </StageOverlay>
    </>
  );
};
