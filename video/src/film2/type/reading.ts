// The reading-time rules (TREATMENT §5.2, §5.5): pure functions the components use to place their exits and the
// validators use to check a timeline.
//
// - Every line holds at least max(50 frames at 60 fps, 0.5 s + 0.3 s a word); key lines at least 2 s.
// - Stealth's honest line holds at least 9 s; a promise and its limit (L05 + L06) together at least 2.5 s.
// - Reading load: film lines apportioned over their holds, plus the UI words that must be read, at most 3.14 words a
//   second in any shot (3.0 flags).
// - A cascade item (four words or fewer) is the one exception to the hold formula: about 1.1 s first, 0.65–1.05 s after.
import { READING, TRANSITION } from "../tokens";

/** Words a viewer reads: tokens with a letter or a digit ("·" separators and dashes are not words). */
export const wordCount = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export interface HoldOptions {
  key?: boolean;
  honest?: boolean;
  /** a cascade item: the cascade's own holds apply instead */
  cascadeItem?: boolean;
}

/** Seconds a line must stay on screen to be read. */
export const requiredHoldS = (words: number, o: HoldOptions = {}): number => {
  if (o.cascadeItem) return TRANSITION.swap.holdS[0];
  let s = Math.max(READING.minHoldS, READING.baseS + READING.perWordS * words);
  if (o.key) s = Math.max(s, READING.keyMinS);
  if (o.honest) s = Math.max(s, READING.honestLineMinS);
  return s;
};

export const requiredHoldFrames = (words: number, fps: number, o: HoldOptions = {}): number => Math.ceil(requiredHoldS(words, o) * fps - 1e-9);

/** A line on screen, as the validators see it. Frames are composition frames; [from, to) is its time on screen. */
export interface TextEvent {
  id: string;
  text: string;
  /** first frame of its entrance */
  from: number;
  /** first frame it is gone (after its exit) */
  to: number;
  /** frames its entrance takes (it counts as on screen, not as fully legible) */
  enterFrames?: number;
  key?: boolean;
  honest?: boolean;
  cascadeItem?: boolean;
  /** id of the line it pairs with (a promise and its limit): together they hold at least 2.5 s */
  pairWith?: string;
  /** "film" lines count toward the word budget; "ui" are interface words the viewer must read */
  kind?: "film" | "ui" | "name" | "title" | "end" | "cascade";
  /** frame-space rect (for overlap checks); a function when it moves */
  rect?: { x: number; y: number; w: number; h: number } | ((frame: number) => { x: number; y: number; w: number; h: number });
}

export interface ShotWindow {
  id: string;
  from: number;
  to: number;
}

/** Words a viewer must read in a shot: each line's words apportioned by how much of its time falls inside the shot. */
export const wordsInShot = (shot: ShotWindow, texts: readonly TextEvent[]): number =>
  texts.reduce((sum, t) => {
    const len = t.to - t.from;
    if (len <= 0) return sum;
    const overlap = Math.max(0, Math.min(t.to, shot.to) - Math.max(t.from, shot.from));
    return sum + (wordCount(t.text) * overlap) / len;
  }, 0);

/** Reading load of a shot, words a second. */
export const readingLoad = (shot: ShotWindow, texts: readonly TextEvent[], fps: number): number => {
  const s = (shot.to - shot.from) / fps;
  return s > 0 ? wordsInShot(shot, texts) / s : 0;
};

/** The frame a line's exit may start: its entrance frame plus its required hold, rounded up. */
export const earliestExit = (from: number, text: string, fps: number, o: HoldOptions = {}): number => from + requiredHoldFrames(wordCount(text), fps, o);
