// L7 loop-memory (7 s, 210 frames): Settings › Memory, the saved records, one card at the app's own scale on the
// riverbed. The pointer comes in off the riverbed and clicks the bin of "Uses metric units and 24-hour times." (its
// label: "Forget this memory"); the record fades (0.4 s, as MASTER_PLAN §5.3 asks; the app itself removes it at once)
// and the next record takes its place, as the app re-renders (settings-memory-forgotten), arriving in 200 ms. The
// pointer hides once it has acted. A time-passage dissolve brings the record back for the seam. Data: plans.ts L7.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor, UiStill } from "../components";
import { cameraAt } from "../motion/camera";
import { EASE, ramp } from "../motion/spec";
import { Cover, DISSOLVE_BLUR, Ground, LoopStage, PressShade, StageLayer, StageOverlay, SYSTEM, dissolveAt, fadeAwayAt } from "./kit";
import { L7 } from "./plans";

export const LoopMemory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stage, record, bin } = L7;
  const card = stage.wide;
  const pose = cameraAt(frame, L7.plan.camera.wide, fps, card.rect.w);
  const [d0, d1] = L7.plan.dissolves[0]!;
  const back = dissolveAt(frame, d0, d1 - d0); // forgotten → the original records (time passes)
  const gone = frame < L7.swapAt ? fadeAwayAt(frame, L7.fadeAt, L7.fadeFrames) : 0; // the clicked record fades
  const swapped = frame >= L7.swapAt && back < 1;
  // the next record arriving in the emptied slot: the panel's white over it, going (a 200 ms opacity change)
  const arriving = 1 - ramp(frame, L7.swapAt, L7.arriveFrames, EASE.enterFirm);
  const r = record;
  return (
    <>
      <Ground />
      <LoopStage stage={card} background={SYSTEM.panel}>
        {swapped ? (
          <>
            <StageLayer pose={pose} blur={DISSOLVE_BLUR * back}>
              <UiStill name="settings-memory-forgotten" veil={SYSTEM.panel} />
              <Cover rect={r} color={SYSTEM.panel} opacity={arriving} />
            </StageLayer>
            <StageLayer pose={pose} opacity={back} blur={DISSOLVE_BLUR * (1 - back)}>
              <UiStill name="settings-memory" veil={SYSTEM.panel} />
            </StageLayer>
          </>
        ) : (
          <StageLayer pose={pose}>
            <UiStill name="settings-memory" veil={SYSTEM.panel} />
            {gone > 0 ? (
              <>
                {/* the slot empties under the record as it fades (the panel's white) */}
                <Cover rect={r} color={SYSTEM.panel} />
                <div
                  style={{
                    position: "absolute",
                    left: r.x,
                    top: r.y,
                    width: r.w,
                    height: r.h,
                    overflow: "hidden",
                    opacity: 1 - gone,
                    // 4 px on screen: the layer is drawn at the camera's zoom
                    filter: `blur(${((4 * gone) / pose.zoom).toFixed(3)}px)`,
                  }}
                >
                  <UiStill name="settings-memory" x={-r.x} y={-r.y} />
                </div>
              </>
            ) : null}
            <PressShade rect={bin.rect} at={L7.plan.clicks[0]!} radius={6} />
          </StageLayer>
        )}
      </LoopStage>
      <StageOverlay rect={card.rect} pose={pose}>
        <Cursor keys={L7.cursor} clicks={L7.plan.clicks} visible={L7.plan.cursorVisible} />
      </StageOverlay>
    </>
  );
};
