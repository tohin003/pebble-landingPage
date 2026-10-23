// L3 loop-approve-undo (10 s, 300 frames): the approval card for invoice_kit/dates.py in the Details drawer. The view
// tilts from the card's header down to its diff and buttons; the pointer clicks Apply edit; a match cut on the click
// shows the same card applied, "Done", with Undo this edit on the row where Apply edit was (a ring draws on it).
// A time-passage dissolve brings the waiting card back and the view tilts up again (FILM_SPEC §16; main-live-film
// frames, R3's fallback). Data: plans.ts L3.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor, Ring } from "../components";
import { cameraAt } from "../motion/camera";
import { DISSOLVE_BLUR, Ground, LoopStage, PressShade, RECORDINGS, RecFrame, StageLayer, StageOverlay, dissolveAt, settleScale, zoomAbout } from "./kit";
import { L3 } from "./plans";

const REC = RECORDINGS.mainLiveFilm;

export const LoopApproveUndo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { stage } = L3;
  const base = cameraAt(frame, L3.plan.camera.wide, fps, stage.rect.w);
  const [d0, d1] = L3.plan.dissolves[0]!;
  const back = dissolveAt(frame, d0, d1 - d0);
  const applied = frame >= L3.cutAt && back < 1;
  // the match cut arrives at 1.04 and settles, about the click
  const pose = applied ? zoomAbout(base, L3.clickPoint, settleScale(frame, L3.cutAt, fps)) : base;
  const click = L3.plan.clicks[0]!;
  return (
    <>
      <Ground />
      <LoopStage rect={stage.rect} corners={stage.corners}>
        {applied ? (
          <>
            <StageLayer pose={pose} blur={DISSOLVE_BLUR * back}>
              <RecFrame rec={REC} t={L3.applied} />
            </StageLayer>
            <StageLayer pose={base} opacity={back} blur={DISSOLVE_BLUR * (1 - back)}>
              <RecFrame rec={REC} t={L3.waiting} />
            </StageLayer>
          </>
        ) : (
          <StageLayer pose={base}>
            <RecFrame rec={REC} t={L3.waiting} />
            <PressShade rect={L3.applyRect} at={click} radius={8} />
          </StageLayer>
        )}
      </LoopStage>
      <StageOverlay rect={stage.rect} pose={pose}>
        {applied ? <Ring rect={L3.undoRing.rect} radius={L3.undoRing.radius} drawAt={L3.undoRing.drawAt} outAt={L3.undoRing.outAt} /> : null}
        <Cursor keys={L3.cursor} clicks={L3.plan.clicks} visible={L3.plan.cursorVisible} />
      </StageOverlay>
    </>
  );
};
