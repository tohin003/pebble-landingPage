// Timeline of the PebbleDemo composition (a reference for the film lanes, not part of any film). Pure data: no React,
// Remotion or path aliases, so the engine tests can load it (every `*CUES` export of a `*.cues.ts` file is checked).
// Times are seconds of composition time at 30 fps; positions are px in a 1920 × 1080 frame.
import type { PebbleCue } from "../../../shared/pebble/cues";

export const DEMO_START = { x: 600, y: 760 };
export const DEMO_HOPS = [{ at: 2.0, to: { x: 1320, y: 760 }, duration: 0.45 }];

export const DEMO_CUES: PebbleCue[] = [
  { at: 1.75, look: { x: 1, y: -0.25 }, note: "eyes lead: 0.1 s before the anticipation squash (1.85 s)" },
  { at: 2.45, pose: "tap", note: "lands" },
  { at: 2.95, look: null },
  { at: 3.65, pose: "idle" },
  { at: 4.4, pose: "review", note: "the approval card arrives" },
  { at: 6.6, pose: "happy", note: "the Verified result lands" },
];

/** The pose sheet along the bottom of the demo: Pebble's own poses only (D6). */
export const DEMO_SHEET_POSES = ["idle", "hover", "reading", "editing", "review", "testing", "happy", "sleepy"] as const;
