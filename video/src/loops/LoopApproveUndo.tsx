// L3 loop-approve-undo (9 s, 270 frames; square for the project story's tile, 4:5 for phones): the approval card for
// invoice_kit/dates.py in the Details drawer, one card at about the app's own scale on the riverbed. The view tilts from
// the card's top down to its diff and buttons; the pointer comes in off the riverbed and clicks Apply edit; a match cut
// on the click shows the same card applied, with Undo this edit on the row where Apply edit was. The applied card
// ("Done", then "Undo this edit") comes forward while the steps above it recede (the spotlight in the window's own
// colour; lane G2b's accent ring is gone). A time-passage dissolve brings the waiting card back and the view tilts up
// again (FILM_SPEC §16; main-live-film frames, R3's fallback). Data: plans.ts L3.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../components";
import { cameraAt } from "../motion/camera";
import { EASE, ramp } from "../motion/spec";
import {
  DISSOLVE_BLUR,
  Ground,
  LoopStage,
  PressShade,
  RECORDINGS,
  RecFocus,
  RecFrame,
  StageLayer,
  StageOverlay,
  SYSTEM,
  dissolveAt,
  settleScale,
  useLoopAspect,
  zoomAbout,
} from "./kit";
import { L3 } from "./plans";

const REC = RECORDINGS.mainLiveFilm;

export const LoopApproveUndo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aspect = useLoopAspect() === "tall" ? "tall" : "square";
  const stage = L3.stage[aspect];
  const base = cameraAt(frame, L3.plan.camera[aspect], fps, stage.rect.w);
  const [d0, d1] = L3.plan.dissolves[0]!;
  const back = dissolveAt(frame, d0, d1 - d0);
  const applied = frame >= L3.cutAt && back < 1;
  // the match cut arrives at 1.04 and settles, about the click
  const pose = applied ? zoomAbout(base, L3.clickPoint, settleScale(frame, L3.cutAt, fps)) : base;
  const click = L3.plan.clicks[0]!;
  const done = L3.applied;
  const focus = ramp(frame, done.in, done.dur, EASE.move) * (1 - ramp(frame, done.out, done.dur, EASE.move));
  return (
    <>
      <Ground />
      <LoopStage stage={stage}>
        {applied ? (
          <>
            <StageLayer pose={pose} blur={DISSOLVE_BLUR * back}>
              <RecFocus rec={REC} t={L3.appliedAt} rect={done.rect} radius={done.radius} amount={focus} zoom={pose.zoom} veil={SYSTEM.focus.veil} blur={SYSTEM.focus.blur} />
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
        <Cursor keys={L3.cursor} clicks={L3.plan.clicks} visible={L3.plan.cursorVisible} />
      </StageOverlay>
    </>
  );
};
