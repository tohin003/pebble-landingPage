// <Cascade>: kind 5, the swap in place (TREATMENT §3.8, §5.1). One fixed line (the expressive tier, entering once and
// staying for the whole cascade) and one swapping item (the functional tier, four words or fewer), with the item's
// real UI beside it swapping the same way. No edits: each swap is a blur swap on one stage, the outgoing blurring out
// (0 → 8 px, opacity → 0) over the same 8 frames as the incoming blurs in (8 → 0 px), so the two cross at mid-blur and
// the stage never empties (CR-17: out, then in, passed through an empty stage for 4–6 frames and read as a slideshow
// fade); a short matched slide (the item rolls up 10 px, a card moves 28 px across) makes it a swap, not a dissolve.
// The first item holds about 1.1 s, the rest 0.65–1.05 s, and each swap lands 2–3 frames before a beat (Muse's
// measured cascades, MEASURED §4). A cascade that ends before its shot does (`endAt`) takes its last item out with a
// drawn blur exit of 12 frames, so nothing vanishes on the cut (CR-03).
//
// cascadeSchedule() is pure, so validators check the same windows the picture draws.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, TRANSITION, f60 } from "../tokens";
import { E_MOVE } from "../motion/ease";
import { wordCount } from "./reading";
import { typeStyle } from "./scale";

export interface CascadeItem {
  text: string;
  /** seconds this item holds (from fully in to the start of its swap out); default 1.1 first, 0.85 after */
  holdS?: number;
}

export interface CascadeWindow {
  index: number;
  text: string;
  /** first frame of its swap in */
  inStart: number;
  /** frame its swap in completes (it is fully legible) */
  inEnd: number;
  /** first frame of its swap out (the next item's swap in starts when this one's out ends) */
  outStart: number;
  /** frame it is gone */
  outEnd: number;
}

/**
 * The swap windows. With `beats` (frames), each item's swap-in completes `leadFrames` before the first beat at or
 * after its planned landing, so swaps land just ahead of the music. Each item's swap out runs over the same frames as
 * the next item's swap in (they cross; the stage never empties). With `endAt`, the last item leaves on that frame with
 * a 12-frame blur exit (`TRANSITION.swap.exitFrames`); without it, it holds (the shot leaves with it, `holdLast`).
 */
export function cascadeSchedule(start: number, items: readonly CascadeItem[], fps: number, beats?: readonly number[], leadFrames?: number, endAt?: number): CascadeWindow[] {
  const outF = f60(TRANSITION.swap.outFrames, fps);
  const inF = f60(TRANSITION.swap.inFrames, fps);
  const lead = leadFrames ?? Math.max(1, f60(2.5, fps));
  const out: CascadeWindow[] = [];
  let earliest = start; // the first frame this item's swap in may start (the previous one's swap out starts with it)
  items.forEach((it, i) => {
    let inStart = earliest;
    let inEnd = inStart + inF;
    if (beats && beats.length) {
      // land on the first beat that leaves room: the swap completes `lead` frames before it
      const b = beats.find((x) => x - lead >= inEnd);
      if (b !== undefined) {
        inEnd = Math.round(b - lead);
        inStart = inEnd - inF;
      }
    }
    const prev = out[i - 1];
    if (prev) {
      // one stage, never empty: the previous item holds until this one swaps in, and leaves over the same frames
      prev.outStart = inStart;
      prev.outEnd = inStart + outF;
    }
    const hold = it.holdS ?? (i === 0 ? TRANSITION.swap.firstHoldS : 0.85);
    const outStart = inEnd + Math.round(hold * fps);
    out.push({ index: i, text: it.text, inStart, inEnd, outStart, outEnd: outStart + outF });
    earliest = outStart;
  });
  const last = out[out.length - 1];
  if (last && endAt !== undefined) {
    // the cascade's end: the last item leaves with a drawn exit that is over before its shot cuts
    last.outStart = Math.max(endAt, last.inEnd + 1);
    last.outEnd = last.outStart + f60(TRANSITION.swap.exitFrames, fps);
  }
  return out;
}

/** The share of the stage a cascade fills on a frame: the summed opacity of its items (1 while one is held). */
export const stageCover = (sched: readonly CascadeWindow[], frame: number, holdLast: boolean): number =>
  sched.reduce((sum, w, i) => sum + (swapLook(w, frame, holdLast && i === sched.length - 1)?.opacity ?? 0), 0);

/** Problems with a cascade: long items, short holds. */
export function checkCascade(items: readonly CascadeItem[], sched: readonly CascadeWindow[], fps: number): string[] {
  const out: string[] = [];
  items.forEach((it, i) => {
    const n = wordCount(it.text);
    if (n > TRANSITION.swap.maxWords) out.push(`cascade item "${it.text}" has ${n} words (at most ${TRANSITION.swap.maxWords})`);
    const w = sched[i]!;
    const hold = (w.outStart - w.inEnd) / fps;
    const min = i === 0 ? TRANSITION.swap.firstHoldS - 0.15 : TRANSITION.swap.holdS[0];
    if (hold + 1e-6 < min) out.push(`cascade item "${it.text}" holds ${hold.toFixed(2)} s (at least ${min.toFixed(2)} s)`);
  });
  return out;
}

/**
 * The look of item `i` on `frame`: opacity, blur and slide of the swap in place. Both halves ease in and out (E-move),
 * so the change is slowest where one item hands the stage to the next (with E-leave out and E-arrive in, the two
 * fastest frames met at the hand-off and the render's pixel check read the swap as a pop). `shift` runs from +1 (still
 * arriving) through 0 (in place) to −1 (gone): callers turn it into their own slide (10 px for an item, 28 for a card).
 */
export const swapLook = (w: CascadeWindow, frame: number, last: boolean): { opacity: number; blur: number; shift: number } | null => {
  if (frame < w.inStart || (!last && frame >= w.outEnd)) return null;
  if (frame < w.inEnd) {
    const e = E_MOVE((frame - w.inStart) / (w.inEnd - w.inStart));
    return { opacity: e, blur: TRANSITION.swap.blurPx * (1 - e), shift: 1 - e };
  }
  if (last || frame < w.outStart) return { opacity: 1, blur: 0, shift: 0 };
  const e = E_MOVE((frame - w.outStart) / (w.outEnd - w.outStart));
  return { opacity: 1 - e, blur: TRANSITION.swap.blurPx * e, shift: -e };
};

/** The slides of the swap in place, px at 1080: the item rolls up, a card moves across (CR-17). */
export const SWAP_SLIDE = { itemPx: 10, cardPx: 28 } as const;

export interface CascadeProps {
  items: readonly CascadeItem[];
  /** local frame the first item swaps in */
  start: number;
  beats?: readonly number[];
  /** keep the last item after its hold (the cascade's layer leaves with the camera) */
  holdLast?: boolean;
  /** the frame the last item leaves with a drawn exit (the cascade's end, before its shot cuts) */
  endAt?: number;
  /** each item's real UI, swapped in place beside it (by index) */
  ui?: (index: number) => ReactNode;
  itemStyle?: CSSProperties;
  uiStyle?: CSSProperties;
  color?: string;
}

/** The swapping item and its UI card. The fixed line is a <KineticLine> placed by the scene. */
export const Cascade: React.FC<CascadeProps> = ({ items, start, beats, holdLast = true, endAt, ui, itemStyle, uiStyle, color = COLOR.ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const sched = cascadeSchedule(start, items, fps, beats, undefined, endAt);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sched.map((w, i) => {
        const look = swapLook(w, frame, endAt === undefined && holdLast && i === sched.length - 1);
        if (!look) return null;
        const dy = look.shift * SWAP_SLIDE.itemPx * unit;
        const fx: CSSProperties = {
          opacity: look.opacity,
          filter: look.blur > 0.05 ? `blur(${look.blur.toFixed(2)}px)` : undefined,
          transform: Math.abs(dy) > 0.01 ? `translateY(${dy.toFixed(2)}px)` : undefined,
        };
        return (
          <AbsoluteFill key={i}>
            <div style={{ position: "absolute", ...typeStyle("functional", width, height), color, ...itemStyle, ...fx }}>{w.text}</div>
            {ui ? <div style={{ position: "absolute", ...uiStyle, ...fx }}>{ui(i)}</div> : null}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
