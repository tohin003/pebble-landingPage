// The stone's own idle blinks, placed by its clock (MONTAGE_DESIGN §2.7; OVERRIDES §61). Pebble's engine blinks on a
// fixed, seeded schedule of its own time (shared/pebble/bloub/face.ts, read through cues.ts blinkStarts()). A stone in
// the film runs the engine on a clock of its own: engine time = (the piece's local frame + clockOffset) ÷ fps
// (StoneSpec.clockOffset). Choosing the offset chooses which of the engine's real blinks falls where: the engine does
// nothing it does not do in the product, the timing is the film's choice, and the film claims no reaction.
//
//   blinkStartsFor()  the local frames where a stone with a given clock offset starts a blink
//   offsetForBlink()  the smallest clock offset that starts one of the engine's blinks on `target` (within a frame) and
//                     none inside the keep-clear spans: 710 for the Return (target R646, its local 706)
// Pure; no React.
import { blinkStarts } from "../../../../shared/pebble/cues";

/** A blink lasts 0.18 s (bloub/face.ts). */
export const BLINK_S = 0.18;

/** A span of local frames, [from, to] inclusive. */
export interface FrameSpan {
  from: number;
  to: number;
  /** why it is kept clear (for the reports) */
  why?: string;
}

/** The engine's blink starts, seconds of engine time, cached per horizon. */
const startsCache = new Map<number, number[]>();
const engineBlinks = (untilS: number): number[] => {
  const h = Math.ceil(untilS / 30) * 30;
  let s = startsCache.get(h);
  if (!s) {
    s = blinkStarts(0, h);
    startsCache.set(h, s);
  }
  return s;
};

/**
 * The local frames (fractional) where a stone whose clock is (local + `offset`) ÷ `fps` starts a blink, for local
 * frames in [from, to).
 */
export function blinkStartsFor(offset: number, fps: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (const s of engineBlinks((to + offset) / fps + 1)) {
    const local = s * fps - offset;
    if (local >= from && local < to) out.push(local);
  }
  return out;
}

/** Does a blink starting on local frame `start` (lasting BLINK_S) touch the span? */
export const blinkTouches = (start: number, fps: number, span: FrameSpan): boolean => start <= span.to && start + BLINK_S * fps >= span.from;

/**
 * The smallest clock offset (whole frames, ≥ 0) that puts the start of one of the engine's blinks on local frame
 * `target` (each candidate aligns a blink to the target, rounded to a frame) while no other blink touches a keep-clear
 * span. The candidates are the engine's blinks in order of their time, so the answer is the earliest blink of the
 * schedule that fits. Throws when none of the first `horizonS` seconds of the schedule fits.
 *
 * For the Return (target R646, local frame 706; keep clear R430–R496, the drain's first return to the J5 cut and its
 * first beat, and R658–R780, the iris, the wordmark and the title's first second) this returns 710: blinks at R1
 * (off screen), R166, R371 (mid-rush), R646 and R869, as MONTAGE_DESIGN §2.7 has them. Keeping only R466–R496 clear
 * would return 435, which blinks at R441, 11 frames into the drain (and twice as the stone first shows, R86 and R101).
 */
export function offsetForBlink(target: number, fps: number, keepClear: readonly FrameSpan[], o: { horizonS?: number; tolerance?: number } = {}): number {
  const horizon = o.horizonS ?? 180;
  const tol = o.tolerance ?? 1;
  const lo = Math.min(target, ...keepClear.map((k) => k.from)) - 2 * fps;
  const hi = Math.max(target, ...keepClear.map((k) => k.to)) + 2 * fps;
  const candidates = [...new Set(engineBlinks(horizon).map((s) => Math.round(s * fps - target)))].filter((x) => x >= 0).sort((a, b) => a - b);
  for (const offset of candidates) {
    const starts = blinkStartsFor(offset, fps, lo, hi);
    const planned = starts.find((s) => Math.abs(s - target) <= tol);
    if (planned === undefined) continue;
    if (starts.some((s) => s !== planned && keepClear.some((k) => blinkTouches(s, fps, k)))) continue;
    // the planned blink itself may not run into a keep-clear span that starts after it (the iris)
    if (keepClear.some((k) => k.from > target && blinkTouches(planned, fps, k))) continue;
    return offset;
  }
  throw new Error(`no clock offset in the engine's first ${horizon} s starts a blink on frame ${target} with ${keepClear.map((k) => `${k.from}–${k.to}`).join(", ")} clear`);
}
