// A slate for a loop that is planned but not built: today only L5 (loop-review-commands, P1, MASTER_PLAN §5.3). The
// registration (size, length, fps) is final; the picture names what the loop will show. Every other loop and the teaser
// are built (video/src/loops, video/src/teaser); their slates, with G1's stale notes, went with lane v2-loops.
import { Slate } from "../components";

export const LOOP_SPECS = {
  LoopReviewCommands: { frames: 240, section: "Works in your project (step 03, P1, L5)", note: "Command card → approve → result; Git plan → Run Git plan." },
} as const;
export type LoopId = keyof typeof LOOP_SPECS;

export const LoopStub: React.FC<{ id: LoopId }> = ({ id }) => {
  const spec = LOOP_SPECS[id];
  return <Slate meta={`${id} · ${spec.frames} frames at 30 fps · 1600 × 1000 · silent, seamless`} title={spec.section} detail={spec.note} />;
};
