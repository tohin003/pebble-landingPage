// <KineticLine>: the film's kinetic type (TREATMENT §5.2), GSAP SplitText reveals under masks, driven by the frame.
//
// Entrances (frames at 60 fps; converted for the composition's fps):
//   lineRise  each line rises from its mask (yPercent 105 → 0) over 30 frames on E-arrive, lines 8 frames apart:
//             the expressive tier's default (the name, chapter lines, the title, the README line);
//   wordRise  the same rise per word, words 4 frames apart (for a two- or three-word line);
//   wordBlur  per word, blur 6 → 0 px and opacity 0 → 1 over 9 frames, words 4 apart, no movement;
//   lineBlur  the whole line blurs in over 8 frames from opacity 0: the functional and label tiers' default.
// Exits are 40–50 % shorter than the entrance (TYPE_MOTION.exitRatio):
//   blur      words blur out (0 → 8 px) and fade, leading with the first word;
//   lift      lines leave upward through their masks on E-leave;
//   camera    no exit of its own: the line leaves with the camera or the layer that carries it.
// A landed line is dead still: nothing moves while it is read (the rule the old film's slams broke).
//
// SplitText needs the fonts: put every <KineticLine> inside <FontGate>. Never put it inside a CameraMotionBlur: the
// blur duplicates its subtree eight times, and each copy would split again.
import { useGsapTimeline } from "@remotion/gsap";
import type { CSSProperties } from "react";
import { useVideoConfig } from "remotion";
import { COLOR, TYPE_MOTION, f60, type TypeTier } from "../tokens";
import { SplitText, fs } from "./gsap";
import { typeStyle } from "./scale";

export type Entrance = "lineRise" | "wordRise" | "wordBlur" | "lineBlur";
export type Exit = "blur" | "lift" | "camera";

export interface KineticLineProps {
  /** the line; "\n" breaks lines explicitly (lines are never re-wrapped) */
  text: string;
  tier: TypeTier;
  /** local frame the entrance starts */
  at: number;
  /** local frame the exit starts; omit to keep the line until the sequence ends */
  exitAt?: number;
  entrance?: Entrance;
  exit?: Exit;
  /** 0..1 within the tier's size range */
  sizeT?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** where the line sits (absolute positioning in frame px) */
  style?: CSSProperties;
}

export const defaultEntrance = (tier: TypeTier): Entrance => (tier === "expressive" || tier === "data" ? "lineRise" : "lineBlur");

/** Frames the entrance takes from its first frame to its last element landing, for a line of `units` lines or words. */
export const entranceFrames = (e: Entrance, units: number, fps: number): number => {
  switch (e) {
    case "lineRise":
      return f60(TYPE_MOTION.rise.frames + TYPE_MOTION.rise.lineStagger * (units - 1), fps);
    case "wordRise":
      return f60(TYPE_MOTION.rise.frames + 4 * (units - 1), fps);
    case "wordBlur":
      return f60(TYPE_MOTION.wordBlur.frames + TYPE_MOTION.wordBlur.wordStagger * (units - 1), fps);
    case "lineBlur":
      return f60(TYPE_MOTION.blurIn.frames, fps);
  }
};

export const KineticLine: React.FC<KineticLineProps> = ({ text, tier, at, exitAt, entrance, exit = "blur", sizeT = 0.5, color = COLOR.ink, align = "left", style }) => {
  const { fps, width, height } = useVideoConfig();
  const ent = entrance ?? defaultEntrance(tier);
  const scope = useGsapTimeline<HTMLDivElement>(
    ({ timeline: tl, selector: q }) => {
      const el = q(".f2-kl")[0] as HTMLElement;
      const byLine = ent === "lineRise";
      const byWord = ent === "wordRise" || ent === "wordBlur";
      const split = byLine || byWord || exit === "blur" || exit === "lift" ? new SplitText(el, { type: "lines,words", mask: ent === "lineRise" || exit === "lift" ? "lines" : ent === "wordRise" ? "words" : undefined }) : null;
      const t0 = fs(at, fps);
      if (ent === "lineRise") {
        tl.fromTo(split!.lines, { yPercent: 105 }, { yPercent: 0, duration: fs(f60(TYPE_MOTION.rise.frames, fps), fps), ease: "E-arrive", stagger: fs(f60(TYPE_MOTION.rise.lineStagger, fps), fps) }, t0);
      } else if (ent === "wordRise") {
        tl.fromTo(split!.words, { yPercent: 105 }, { yPercent: 0, duration: fs(f60(TYPE_MOTION.rise.frames, fps), fps), ease: "E-arrive", stagger: fs(f60(4, fps), fps) }, t0);
      } else if (ent === "wordBlur") {
        tl.fromTo(
          split!.words,
          { opacity: 0, filter: `blur(${TYPE_MOTION.wordBlur.blurPx}px)` },
          { opacity: 1, filter: "blur(0px)", duration: fs(f60(TYPE_MOTION.wordBlur.frames, fps), fps), ease: "power2.out", stagger: fs(f60(TYPE_MOTION.wordBlur.wordStagger, fps), fps) },
          t0,
        );
      } else {
        tl.fromTo(el, { opacity: 0, filter: `blur(${TYPE_MOTION.blurIn.blurPx}px)` }, { opacity: 1, filter: "blur(0px)", duration: fs(f60(TYPE_MOTION.blurIn.frames, fps), fps), ease: "power2.out" }, t0);
      }
      if (exitAt !== undefined && exit !== "camera") {
        const units = byLine ? split!.lines.length : byWord ? split!.words.length : 1;
        const inFrames = entranceFrames(ent, units, fps);
        const outFrames = Math.max(2, Math.round(inFrames * TYPE_MOTION.exitRatio));
        const t1 = fs(exitAt, fps);
        if (exit === "lift") {
          const n = split!.lines.length;
          const each = Math.max(2, Math.round(outFrames / Math.max(1, n * 0.5 + 0.5)));
          tl.fromTo(split!.lines, { yPercent: 0 }, { yPercent: -105, duration: fs(each, fps), ease: "E-leave", stagger: fs(Math.max(1, Math.round(each * 0.4)), fps), immediateRender: false }, t1);
        } else {
          const words = split!.words;
          const each = Math.max(2, Math.round(outFrames * 0.6));
          const stagger = words.length > 1 ? (outFrames - each) / (words.length - 1) : 0;
          tl.fromTo(
            words,
            { opacity: 1, filter: "blur(0px)" },
            { opacity: 0, filter: "blur(8px)", duration: fs(each, fps), ease: "power2.in", stagger: fs(stagger, fps), immediateRender: false },
            t1,
          );
        }
      }
    },
    { dependencies: [text, tier, at, exitAt, ent, exit, fps, width, height, sizeT] },
  );
  return (
    <div ref={scope} style={{ position: "absolute", textAlign: align, ...style }}>
      <div className="f2-kl" style={{ ...typeStyle(tier, width, height, sizeT), lineHeight: tier === "expressive" ? 1.25 : 1.3, color }}>
        {text}
      </div>
    </div>
  );
};
