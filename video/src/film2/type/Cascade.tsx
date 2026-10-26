// <Cascade>: kind 5, the swap in place (TREATMENT §3.8, §5.1). One fixed line (the expressive tier, entering once and
// staying for the whole cascade) and one swapping item (the functional tier, four words or fewer), with the item's
// real UI beside it swapping the same way. No edits: each swap is a blur swap on one stage, 8 frames out (blur 0 → 8
// px, opacity → 0) and 8 frames in (blur 8 → 0 px); the ground never cuts. The first item holds about 1.1 s, the rest
// 0.65–1.05 s, and each swap lands 2–3 frames before a beat (Muse's measured cascades, MEASURED §4).
//
// cascadeSchedule() is pure, so validators check the same windows the picture draws.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, TRANSITION, f60 } from "../tokens";
import { E_ARRIVE, E_LEAVE } from "../motion/ease";
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
 * after its planned landing, so swaps land just ahead of the music.
 */
export function cascadeSchedule(start: number, items: readonly CascadeItem[], fps: number, beats?: readonly number[], leadFrames?: number): CascadeWindow[] {
  const outF = f60(TRANSITION.swap.outFrames, fps);
  const inF = f60(TRANSITION.swap.inFrames, fps);
  const lead = leadFrames ?? Math.max(1, f60(2.5, fps));
  const out: CascadeWindow[] = [];
  let earliest = start; // the first frame this item's swap in may start (the previous one is out)
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
      // one stage, no gap: the previous item holds until this one swaps in
      prev.outStart = inStart - outF;
      prev.outEnd = inStart;
    }
    const hold = it.holdS ?? (i === 0 ? TRANSITION.swap.firstHoldS : 0.85);
    const outStart = inEnd + Math.round(hold * fps);
    out.push({ index: i, text: it.text, inStart, inEnd, outStart, outEnd: outStart + outF });
    earliest = outStart + outF;
  });
  return out;
}

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

/** The look of item `i` on `frame`: opacity and blur of the swap in place. */
export const swapLook = (w: CascadeWindow, frame: number, last: boolean): { opacity: number; blur: number } | null => {
  if (frame < w.inStart || (!last && frame >= w.outEnd)) return null;
  if (frame < w.inEnd) {
    const u = (frame - w.inStart) / (w.inEnd - w.inStart);
    return { opacity: E_ARRIVE(u), blur: TRANSITION.swap.blurPx * (1 - E_ARRIVE(u)) };
  }
  if (last || frame < w.outStart) return { opacity: 1, blur: 0 };
  const u = (frame - w.outStart) / (w.outEnd - w.outStart);
  return { opacity: 1 - E_LEAVE(u), blur: TRANSITION.swap.blurPx * E_LEAVE(u) };
};

export interface CascadeProps {
  items: readonly CascadeItem[];
  /** local frame the first item swaps in */
  start: number;
  beats?: readonly number[];
  /** keep the last item after its hold (the cascade's layer leaves with the camera) */
  holdLast?: boolean;
  /** each item's real UI, swapped in place beside it (by index) */
  ui?: (index: number) => ReactNode;
  itemStyle?: CSSProperties;
  uiStyle?: CSSProperties;
  color?: string;
}

/** The swapping item and its UI card. The fixed line is a <KineticLine> placed by the scene. */
export const Cascade: React.FC<CascadeProps> = ({ items, start, beats, holdLast = true, ui, itemStyle, uiStyle, color = COLOR.ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sched = cascadeSchedule(start, items, fps, beats);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sched.map((w, i) => {
        const look = swapLook(w, frame, holdLast && i === sched.length - 1);
        if (!look) return null;
        const fx: CSSProperties = { opacity: look.opacity, filter: look.blur > 0.05 ? `blur(${look.blur.toFixed(2)}px)` : undefined };
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
