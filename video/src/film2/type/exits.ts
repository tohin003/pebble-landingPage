// How a line leaves (TREATMENT §5.2; CR-03), as pure arithmetic that <KineticLine> draws, setpieces/views/PieceView.tsx
// staggers and setpieces/frame.ts and the checks read, so the picture and the validators never disagree.
//
//   blur   words blur out (0 → 8 px) and fade, leading with the first word. At least 10 frames at 60 fps (CR-03: a
//          functional line's 4-frame blur wiped out word by word in 2–3 frames, which read as a pop on the reels); a
//          long block 14, each word over 70 % of it on power1.in (EXIT.longFrames)
//   lift   lines leave upward through their masks on E-leave, to −140 % (CR-03: at −125 % with a fade over the second
//          half, the descenders of "gg" were the last thing left in the mask, still at about 60 % opacity), fading
//          linearly to nothing by 85 % of the lift, so no part of a glyph lingers alone
//   camera no exit of its own: the line is set in the world (TypeSpec.carry) and leaves with it
// Exits are 40–50 % shorter than their entrance (TYPE_MOTION.exitRatio), never under the 10-frame floor.
import { TYPE_MOTION, f60 } from "../tokens";

export const EXIT = {
  /** the shortest drawn exit, frames at 60 fps (CR-03 asks 10–14 for a screen-band line) */
  minFrames: TYPE_MOTION.exitMinFrames,
  /**
   * a block of many words (the honest line: 27 words on three to five lines) leaves over the longest of CR-03's range,
   * each word over 70 % of it on a gentler curve: at 12 frames, each word blurring over 7 on power2.in (a cube), the
   * last 37 % of a word's ink went in one frame, a tile step of 3.6 levels where the block fills the frame's width (the
   * 9:16 reel, frame 3352); at 14 frames, each word over 10 on power1.in (a square), the largest step is 19 %
   */
  longFrames: 14,
  longWords: 12,
  longWordShare: 0.7,
  longEase: "power1.in",
  /** every other blur exit's curve */
  blurEase: "power2.in",
  /** the lift's travel, % of the line's height */
  liftToPercent: -140,
  /** the lift's fade ends at this share of its frames */
  liftFadeShare: 0.85,
  /** each word's own blur, as a share of the exit (the rest is the stagger across the words) */
  blurWordShare: 0.6,
  /** the lift's stagger between lines, as a share of one line's lift */
  liftStaggerShare: 0.4,
} as const;

/** The frames a drawn exit takes for a line whose entrance takes `inFrames` (`words`: the whole block's, for its floor). */
export const exitOutFrames = (inFrames: number, fps: number, words = 0): number =>
  Math.max(f60(isLongBlock(words) ? EXIT.longFrames : EXIT.minFrames, fps), Math.round(inFrames * TYPE_MOTION.exitRatio));

/** The words of a block, across its lines. */
export const wordsIn = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** Whether a block of `words` words leaves as a long block (longer, each word over more of it, on a gentler curve). */
export const isLongBlock = (words: number): boolean => words >= EXIT.longWords;

/**
 * A blur exit of `out` frames over `words` words (of one drawn line; `long`: it belongs to a long block): each word's own
 * blur, the stagger between them and the curve.
 */
export const blurTiming = (out: number, words: number, long = false): { each: number; stagger: number; ease: string } => {
  const each = Math.max(2, Math.round(out * (long ? EXIT.longWordShare : EXIT.blurWordShare)));
  return { each, stagger: words > 1 ? (out - each) / (words - 1) : 0, ease: long ? EXIT.longEase : EXIT.blurEase };
};

/** A lift of `out` frames over `lines` lines (inside one KineticLine): each line's lift and the stagger between them. */
export const liftTiming = (out: number, lines: number): { each: number; stagger: number } => {
  const each = Math.max(2, Math.round(out / Math.max(1, lines * 0.5 + 0.5)));
  return { each, stagger: Math.max(1, Math.round(each * EXIT.liftStaggerShare)) };
};

/** The stagger between the lines of a multi-line spec that TypeView draws as one KineticLine per line. */
export const lineLiftStagger = (outPerLine: number): number => Math.max(1, Math.round(outPerLine * EXIT.liftStaggerShare));
