// How a line leaves (TREATMENT §5.2; CR-03), as pure arithmetic that <KineticLine> draws, setpieces/views/PieceView.tsx
// staggers and setpieces/frame.ts and the checks read, so the picture and the validators never disagree.
//
//   blur   words blur out (0 → 8 px) and fade, leading with the first word. At least 10 frames at 60 fps (CR-03: a
//          functional line's 4-frame blur wiped out word by word in 2–3 frames, which read as a pop on the reels)
//   lift   lines leave upward through their masks on E-leave, to −140 % (CR-03: at −125 % with a fade over the second
//          half, the descenders of "gg" were the last thing left in the mask, still at about 60 % opacity), fading
//          linearly to nothing by 85 % of the lift, so no part of a glyph lingers alone
//   camera no exit of its own: the line is set in the world (TypeSpec.carry) and leaves with it
// Exits are 40–50 % shorter than their entrance (TYPE_MOTION.exitRatio), never under the 10-frame floor.
import { TYPE_MOTION, f60 } from "../tokens";

export const EXIT = {
  /** the shortest drawn exit, frames at 60 fps (CR-03 asks 10–14 for a screen-band line) */
  minFrames: TYPE_MOTION.exitMinFrames,
  /** the lift's travel, % of the line's height */
  liftToPercent: -140,
  /** the lift's fade ends at this share of its frames */
  liftFadeShare: 0.85,
  /** each word's own blur, as a share of the exit (the rest is the stagger across the words) */
  blurWordShare: 0.6,
  /** the lift's stagger between lines, as a share of one line's lift */
  liftStaggerShare: 0.4,
} as const;

/** The frames a drawn exit takes for a line whose entrance takes `inFrames`. */
export const exitOutFrames = (inFrames: number, fps: number): number => Math.max(f60(EXIT.minFrames, fps), Math.round(inFrames * TYPE_MOTION.exitRatio));

/** A blur exit of `out` frames over `words` words: each word's own blur and the stagger between them. */
export const blurTiming = (out: number, words: number): { each: number; stagger: number } => {
  const each = Math.max(2, Math.round(out * EXIT.blurWordShare));
  return { each, stagger: words > 1 ? (out - each) / (words - 1) : 0 };
};

/** A lift of `out` frames over `lines` lines (inside one KineticLine): each line's lift and the stagger between them. */
export const liftTiming = (out: number, lines: number): { each: number; stagger: number } => {
  const each = Math.max(2, Math.round(out / Math.max(1, lines * 0.5 + 0.5)));
  return { each, stagger: Math.max(1, Math.round(each * EXIT.liftStaggerShare)) };
};

/** The stagger between the lines of a multi-line spec that TypeView draws as one KineticLine per line. */
export const lineLiftStagger = (outPerLine: number): number => Math.max(1, Math.round(outPerLine * EXIT.liftStaggerShare));
