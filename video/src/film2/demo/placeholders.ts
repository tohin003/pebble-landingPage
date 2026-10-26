// PLACEHOLDER UI for the motion foundation's demo reel. Every picture of Pebble here is a REAL capture of a PUBLISHED
// Pebble release (1.0.x–1.5.0, from video/public/ui and video/public/ui-frames; their sample world is the old one:
// invoice-kit, Lisbon, Maya). They stand in for the 2.0.0 captures, which come later from the frozen 2.0.0 snapshot
// through the capture harness and from real takes on a demo macOS user (OVERRIDES §49, §50). Nothing here is drawn:
// no button, card or line of Pebble's interface is invented, and none of these stills may be presented as 2.0.0.
//
// Rules kept even on placeholders:
// - usage lines (a cached count and a rate) and timing lines never show: the receipt is cropped below its "Worked for …"
//   line, and the companion take ends before the frame where its usage line appears (source frame 199);
// - the take plays at 1× (Pebble's time is never sped up);
// - crops never stretch a capture: every crop keeps the capture's own pixels at its own aspect.
import type { Rect } from "../motion/geometry";

export interface Placeholder {
  /** path under video/public */
  src: string;
  /** the capture's size in CSS px (world units at 1×) */
  w: number;
  h: number;
  /** the part shown, CSS px (default: all of it) */
  crop?: Rect;
  /** what it stands in for in the 2.0.0 film */
  standsFor: string;
  version: string;
}

export const PLACEHOLDER = {
  /** the companion's quick chat, a harness take at 30 fps with the avatar hidden (the film pebble is drawn by its own engine) */
  companionTake: {
    src: "ui-frames/pet-live-error-light-hidden",
    w: 384,
    h: 456,
    standsFor: "RS-15: the live question typed to the companion (A4, A6)",
    version: "1.0.x harness take (published UI)",
  },
  /** an ask card: "Run isolated tests" with Don't allow / Run tests */
  ask: { src: "ui/crop-tests-card@2x.png", w: 495, h: 344, standsFor: "an ask card (the site card J3, the folder card, the Workshop's ask G4)", version: "1.0.x" },
  /** a receipt, cropped below its timing line ("Worked for 1 min 12 s · 5 steps · …" is never shown) */
  receipt: {
    src: "ui/crop-done-receipt@2x.png",
    w: 684,
    h: 278,
    crop: { x: 0, y: 30, w: 684, h: 248 },
    standsFor: "a receipt (Verified, the file receipt, the kept card)",
    version: "1.0.x",
  },
  /** the main window's welcome, Pebble 1.5.0 */
  main: { src: "ui/v150/main-welcome@2x.png", w: 1160, h: 800, standsFor: "a Pebble window in the composed world", version: "1.5.0" },
  /** Settings › Memory's kinds and switch (top of the memory records crop) */
  memoryKinds: {
    src: "ui/crop-memory-records@2x.png",
    w: 504,
    h: 516,
    crop: { x: 0, y: 0, w: 504, h: 265 },
    standsFor: "Cascade 3: six kinds, six switches (D1)",
    version: "1.0.x",
  },
  /** the memory records list ("You asked Pebble to remember this") */
  memoryRecords: {
    src: "ui/crop-memory-records@2x.png",
    w: 504,
    h: 516,
    crop: { x: 0, y: 330, w: 504, h: 186 },
    standsFor: "Cascade 3: Remember that … (D2)",
    version: "1.0.x",
  },
  /** the forget card in the conversation */
  forget: {
    src: "ui/main-forget-card@2x.png",
    w: 1160,
    h: 800,
    crop: { x: 380, y: 305, w: 660, h: 228 },
    standsFor: "Cascade 3: Forget this memory (D3)",
    version: "1.0.x",
  },
} as const satisfies Record<string, Placeholder>;

/** The companion take's frames (30 fps, 3× captures named 00001.png …): usable from 19 (the chat open) to 198. */
export const TAKE = {
  fps: 30,
  first: 19,
  /** the last frame before the reply completes and the usage line appears (frame 199) */
  last: 198,
  /** where the avatar's centre sits in the 384 × 456 panel, and the film pebble's size (video/src/film/timeline.ts PET) */
  stone: { x: 326.7, y: 397.3 },
  pebbleSize: 148,
  centreToFoot: 38.2,
} as const;

export const takeFramePath = (n: number): string => `${PLACEHOLDER.companionTake.src}/${String(n).padStart(5, "0")}.png`;

/** The words a viewer must read in each placeholder (for the reading load). */
export const MUST_READ_WORDS = {
  askTitle: 3, // "Run isolated tests"
  askLine: 13, // "Runs the project's tests in a temporary copy. Your project files don't change."
  receiptTop: 9, // "Verified · pytest 42 passed on current files" + "Done, and verified:"
} as const;
