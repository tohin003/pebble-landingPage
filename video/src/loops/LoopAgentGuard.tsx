// L6 loop-agentguard (8 s, 240 frames; 4:5 phone cut too): AgentGuard's hold, resolved with one click, in one card at
// the app's own scale on the riverbed.
// Shot A, the conversation: the reply's own notice, then "Blocked" and "Pebble's change isn't verified yet. · 2 file(s)
// changed and no tests were run, …" with Run the tests / Ask Pebble to finish / Accept as unverified (RunPanel, verbatim
// from main-live-film). The pointer comes in off the riverbed and clicks Run the tests; Pebble asks to run them in an
// isolated copy ("Needs your review", "1 action needs your review"). A time-passage dissolve (the person approves; the
// tests run) to shot B in the same card, the Details drawer, where the check lands: "Requesting isolated tests · 11 s",
// then "Verified · pytest 42 passed on current files" as the newest row (the rows above "You asked Pebble to run the
// tests" stay out of the card). A second dissolve returns to the hold. Data: plans.ts L6.
import { useCurrentFrame } from "remotion";
import { Cursor } from "../components";
import { DISSOLVE_BLUR, Ground, LoopStage, PressShade, RECORDINGS, RecFrame, StageLayer, StageOverlay, dissolveAt, srcAt, useLoopAspect } from "./kit";
import { L6 } from "./plans";

const REC = RECORDINGS.mainLiveFilm;

export const LoopAgentGuard: React.FC = () => {
  const frame = useCurrentFrame();
  const aspect = useLoopAspect() === "tall" ? "tall" : "wide";
  const stage = L6.stage[aspect];
  const A = L6.poses.A[aspect];
  const B = L6.poses.B[aspect];
  // the 4:5 cut dissolves into the drawer right after the click (plans.ts L6.tallDissolves)
  const dissolves = aspect === "tall" ? L6.tallDissolves : L6.plan.dissolves;
  const [[a0, a1], [b0, b1]] = dissolves as unknown as [[number, number], [number, number]];
  const toB = dissolveAt(frame, a0, a1 - a0);
  const toA = dissolveAt(frame, b0, b1 - b0);
  const click = L6.plan.clicks[0]!;
  const tA = frame < b0 ? srcAt(frame, L6.srcA) : L6.resetSrc;
  const tB = srcAt(frame, L6.srcB);
  const layers: React.ReactNode[] = [];
  if (frame < a1 || frame >= b0) {
    // shot A: the hold (and, from b0, the hold coming back over B)
    const coming = frame >= b0;
    layers.push(
      <StageLayer key="A" pose={A} opacity={coming ? toA : 1} blur={coming ? DISSOLVE_BLUR * (1 - toA) : DISSOLVE_BLUR * toB}>
        <RecFrame rec={REC} t={tA} />
        {coming ? null : <PressShade rect={L6.runRect} at={click} radius={8} />}
      </StageLayer>,
    );
  }
  if (frame >= a0 && frame < b1) {
    const leaving = frame >= b0;
    layers.push(
      <StageLayer key="B" pose={B} opacity={leaving ? 1 : toB} blur={leaving ? DISSOLVE_BLUR * toA : DISSOLVE_BLUR * (1 - toB)}>
        <RecFrame rec={REC} t={tB} />
      </StageLayer>,
    );
  }
  // draw order: the picture that is arriving goes on top
  const ordered = frame >= b0 ? [...layers].reverse() : layers;
  return (
    <>
      <Ground />
      <LoopStage stage={stage}>{ordered}</LoopStage>
      <StageOverlay rect={stage.rect} pose={A}>
        <Cursor keys={L6.cursor} clicks={L6.plan.clicks} visible={L6.plan.cursorVisible} />
      </StageOverlay>
    </>
  );
};
