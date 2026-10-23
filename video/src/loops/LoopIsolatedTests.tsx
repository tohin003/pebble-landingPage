// L4 loop-isolated-tests (8 s, 240 frames; 4:5 phone cut too): the real "Run isolated tests" card in the Details
// drawer ("Runs the project's tests in a temporary copy. Your project files don't change."), the pointer clicks Run
// tests, the drawer's steps take the card's place and the newest arrive ("Requesting isolated tests · 11 s"), then
// AgentGuard's check "Verified · pytest 42 passed on current files". The camera holds while the UI acts. As Verified
// lands, the rows above "Requesting isolated tests" recede under a veil (lane G-fix, REVIEW-G2 P1-9), so "Not verified"
// above it never reads as the payoff. No counter, nothing invented (critic C3): every pixel is main-live-film's. A
// time-passage dissolve returns to the card. Data: plans.ts L4.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../components";
import { cameraAt } from "../motion/camera";
import { EASE, ramp } from "../motion/spec";
import { DISSOLVE_BLUR, Ground, LoopStage, PressShade, RECORDINGS, RecFocus, RecFrame, StageLayer, StageOverlay, dissolveAt, srcAt, useLoopAspect } from "./kit";
import { L4 } from "./plans";

const REC = RECORDINGS.mainLiveFilm;

export const LoopIsolatedTests: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aspect = useLoopAspect();
  const stage = L4.stage[aspect];
  const pose = cameraAt(frame, L4.plan.camera[aspect], fps, stage.rect.w);
  const [d0, d1] = L4.plan.dissolves[0]!;
  const back = dissolveAt(frame, d0, d1 - d0);
  const t = srcAt(frame, L4.src);
  const click = L4.plan.clicks[0]!;
  const spot = ramp(frame, L4.payoff.at, L4.payoff.dur, EASE.move);
  // the tall frame is taller: the pointer comes from further below
  const cursor = aspect === "tall" ? L4.cursor.map((k, i) => (i === 0 || i === 2 ? { ...k, y: k.y + 60 } : k)) : L4.cursor;
  return (
    <>
      <Ground />
      <LoopStage rect={stage.rect} corners={stage.corners}>
        {back < 1 ? (
          <StageLayer pose={pose} blur={DISSOLVE_BLUR * back}>
            <RecFocus rec={REC} t={t} rect={L4.payoff.rect} amount={spot} zoom={pose.zoom} />
            <PressShade rect={L4.runRect} at={click} radius={8} />
          </StageLayer>
        ) : null}
        {back > 0 ? (
          <StageLayer pose={pose} opacity={back} blur={DISSOLVE_BLUR * (1 - back)}>
            <RecFrame rec={REC} t={L4.resetSrc} />
          </StageLayer>
        ) : null}
      </LoopStage>
      <StageOverlay rect={stage.rect} pose={pose}>
        <Cursor keys={cursor} clicks={L4.plan.clicks} visible={L4.plan.cursorVisible} />
      </StageOverlay>
    </>
  );
};
