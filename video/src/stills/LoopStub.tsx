// Placeholder for the feature loops and the teaser (MASTER_PLAN §5.2, §5.3) until lane G2 builds them: the
// registration (size, length, fps) is final, the picture is a slate naming what the loop will show.
import { Slate } from "../components";

export const LOOP_SPECS = {
  LoopCompanion: { frames: 240, section: "On your desktop", note: "Idle pet → the pointer arcs in, the eyes follow → click → the quick chat opens and the reply streams → hold → collapse → the same idle frame." },
  LoopModels: { frames: 180, section: "Your model, your choice", note: "Pan across the three ways in → one callout ring on Add a model file / On this Mac → the camera returns." },
  LoopApproveUndo: { frames: 300, section: "Works in your project (step 01)", note: "The card rises → dwell → Apply edit → Done + Undo this edit → hold → a 0.4 s time-passage dissolve back to the pending card." },
  LoopIsolatedTests: { frames: 240, section: "Works in your project (step 02)", note: "Timeline rows arrive → \"Requesting isolated tests · 11 s\" → \"Verified · pytest 42 passed on current files\" → reset." },
  LoopMemory: { frames: 240, section: "Memory you can see", note: "The pointer finds a record → Forget this memory → the record dissolves → hold → reset." },
  LoopViews: { frames: 300, section: "Views", note: "Request → the canvas opens on the dashboard → the camera into the chart → the quiz → back." },
  LoopAgentGuard: { frames: 240, section: "AgentGuard (P1, L6)", note: "\"Pebble's change isn't verified yet.\" → Run the tests → Verified." },
  LoopReviewCommands: { frames: 240, section: "Works in your project (step 03, P1, L5)", note: "Command card → approve → result; Git plan → Run Git plan." },
} as const;
export type LoopId = keyof typeof LOOP_SPECS;

export const LoopStub: React.FC<{ id: LoopId }> = ({ id }) => {
  const spec = LOOP_SPECS[id];
  return <Slate meta={`${id} · ${spec.frames} frames at 30 fps · 1600 × 1000 · silent, seamless`} title={spec.section} detail={spec.note} />;
};

export const TeaserStub: React.FC = () => (
  <Slate
    meta="FilmTeaser · 240 frames at 30 fps · 1280 × 720 · silent, seamless"
    title="Approve → test → Verified"
    detail="A recomposed excerpt of the proof (approve, the isolated tests, Verified) that starts and ends on the same wide window frame (MASTER_PLAN §5.2)."
  />
);
