// The pebble's cues in F2-Foundation-Demo (pure data: the engine tests load every `*cues` export of a `*.cues.ts`
// file and check it, D5–D6). Times are seconds of composition time at 60 fps. Pebble's own poses only.
import type { PebbleCue } from "../../../../shared/pebble/cues";

export const F2_DEMO_CUES: PebbleCue[] = [
  { at: 0.3, pose: "hover", note: "the person starts typing in the quick chat (the take plays at 1×)" },
  { at: 2.6, pose: "sending", note: "the question is sent" },
  { at: 2.85, pose: "working", note: "Pebble works: the ring leaves the stone, the frame opens" },
  { at: 12.4, pose: "happy", note: "the receipt lands; the ring returns to the stone" },
  { at: 14.2, pose: "idle" },
];
