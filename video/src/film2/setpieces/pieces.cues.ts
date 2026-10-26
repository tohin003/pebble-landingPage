// The stone's cues in the set pieces, as templates: data only (the engine tests load every `*cues` export of a
// `*.cues.ts` file and check it, D5–D6). Pebble's own poses only, never an engine state.
//
// Times are SECONDS RELATIVE TO AN ANCHOR the piece names (the Drop's receipt, Ring 4's Verified, the kept card); a plan
// shifts each list by its anchor's time with anchored() (setpieces/kit.ts), so a cue lands on the real host event in
// the take, wherever the music put it. A cue before the piece's first frame is replayed like any other.
import type { PebbleCue } from "../../../../shared/pebble/cues";

/** The Drop, anchored on the companion's receipt: the card waits for the person, then Pebble works in the browser. */
export const DROP_CUES: PebbleCue[] = [
  { at: -12, pose: "review", note: "the companion's card waits for the person's Allow" },
  { at: 0.05, pose: "working", note: "the receipt arrives (a real host event): Pebble works in the browser" },
];

/** A ring block (Ring 4: tests in the project), anchored on the ring's start, then on the receipt (Verified). */
export const RING_START_CUES: PebbleCue[] = [{ at: 0, pose: "testing", note: "the ring leaves the stone: the project's tests run" }];
export const RING_RECEIPT_CUES: PebbleCue[] = [{ at: 0.2, pose: "idle", note: "the receipt is in: Verified gets no hit, no pose of its own" }];

/** The wall and the convergence: the stone at rest at the centre of every ring. */
export const WALL_CUES: PebbleCue[] = [{ at: 0, pose: "idle", note: "the stone at the wall's centre" }];

/** The Dusk passage's Veil render: the pebble rests while the Veil casts (the Veil is drawn by stealthVeil.ts). */
export const DUSK_CUES: PebbleCue[] = [{ at: 0, pose: "idle", note: "the pebble at rest under the Veil" }];

/** The climax, anchored on the take's "happy" event: the avatar turns happy as the kept card lands, then settles. */
export const CLIMAX_CUES: PebbleCue[] = [
  { at: -6, pose: "working", note: "Pebble works in \"Kiln\": the make-and-check rows run" },
  { at: 0, pose: "happy", note: "the take's own event: the kept card is in" },
  { at: 2.6, pose: "idle" },
];

/** The title: the stone at rest on the sage-white page. */
export const TITLE_CUES: PebbleCue[] = [{ at: 0, pose: "idle", note: "the stone at rest beside the wordmark" }];
