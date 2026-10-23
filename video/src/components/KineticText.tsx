// Kinetic type (R5 §4; docs/FILM_SPEC.md §3) in the brand's faces (DESIGN.md §3): Fraunces 350 (SOFT 100, WONK 0) for
// headlines and side lines, Inter for support lines and the CTA, Geist Mono for the URL. Lines are given explicitly
// (≤ 6 words each, never re-wrapped), land with one of the spec's entrances and are DEAD STILL once landed: a landed
// word has no transform and no filter, only opacity 1. Exits are shorter than entrances and leave as a line.
//
// Entrances (FILM_SPEC §3):
//   "blur" (A): per word, blur 6 px → 0 and opacity 0 → 1 over 5 frames, words 2 frames apart, no movement;
//   "ink"  (B): per word, opacity 0.35 → 1 over 5 frames, words 2 frames apart (pass inkFrom #B0C2AE on light grounds);
//   "rise" (C): each line rises translateY(105 %) → 0 inside its own clip over 15 frames, lines 4 frames apart;
//   "fade": the line fades in over 15 frames (small print); "none".
// Exit: blur 0 → 8 px and opacity → 0 over 6 frames. `wordStarts` gives each word its own frame (T7 builds with its
// verbs).
import type { CSSProperties } from "react";
import { interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "../fonts";
import type { Rect } from "../motion/camera";
import { useLayout, type TypeScale } from "../motion/layout";
import { COLOR, EASE, FX_REST, T, T2, TYPO, blurIn, blurOut, fadeIn, fadeOut, fxStyle, mixFx, ramp, sec, type Fx, type TypoRole } from "../motion/spec";

export type TextRole = "hero" | "headline" | "side" | "tagline" | "support" | "cta" | "mono" | "small";

const ROLE_TYPO: Record<TextRole, TypoRole> = {
  hero: "display",
  headline: "display",
  side: "display",
  tagline: "display",
  support: "text",
  cta: "text",
  mono: "mono",
  small: "small",
};
const ROLE_SIZE: Record<TextRole, keyof TypeScale> = {
  hero: "hero",
  headline: "headline",
  side: "side",
  tagline: "tagline",
  support: "support",
  cta: "cta",
  mono: "mono",
  small: "small",
};

/** FILM_SPEC §3: words 2 frames apart (at 30 fps). */
export const WORD_STEP_S = 2 / 30;

export interface KineticTextProps {
  lines: readonly string[];
  role?: TextRole;
  /** px; default from useLayout().type */
  size?: number;
  weight?: number;
  /** local frame the entrance starts on (the first word's frame) */
  at?: number;
  /** local frame the exit starts on */
  exitAt?: number;
  enter?: "blur" | "ink" | "rise" | "fade" | "none";
  exit?: "blur" | "fade" | "none";
  color?: string;
  /** the colour words start from with enter="ink" (default: the text colour at 35 %) */
  inkFrom?: string;
  align?: "left" | "center" | "right";
  /** frame-space box the lines sit in (default: the layout's safe area) */
  box?: Rect;
  valign?: "top" | "center" | "bottom";
  /** seconds between words (default 2 frames) */
  wordStagger?: number;
  /** seconds between lines for "rise" (default 0.12 s = 4 frames) */
  lineStagger?: number;
  /** explicit start frame for each word, in reading order across the lines (overrides the stagger) */
  wordStarts?: readonly number[];
  style?: CSSProperties;
}

const FLEX = { left: "flex-start", center: "center", right: "flex-end", top: "flex-start", bottom: "flex-end" } as const;

/** The words of a line. */
const wordsOf = (line: string) => line.split(" ").filter((w) => w.length > 0);

/** "#rrggbb" at alpha `a` (other colour forms are returned unchanged). */
export const withAlpha = (color: string, a: number) => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  return m ? `rgba(${parseInt(m[1]!, 16)}, ${parseInt(m[2]!, 16)}, ${parseInt(m[3]!, 16)}, ${a})` : color;
};

export const KineticText: React.FC<KineticTextProps> = ({
  lines,
  role = "headline",
  size,
  weight,
  at = 0,
  exitAt,
  enter = "blur",
  exit = "blur",
  color = COLOR.ink,
  inkFrom,
  align = "left",
  box,
  valign = "top",
  wordStagger = WORD_STEP_S,
  lineStagger = T.lineStagger,
  wordStarts,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const typo = TYPO[ROLE_TYPO[role]];
  const px = size ?? layout.type[ROLE_SIZE[role]];
  const b = box ?? layout.safe;
  const from = inkFrom ?? withAlpha(color, 0.35);

  // each word's start frame, in reading order across the lines
  let n = 0;
  const starts = lines.map((line) =>
    wordsOf(line).map(() => {
      const s = wordStarts?.[n] ?? at + sec(n * wordStagger, fps);
      n++;
      return s;
    }),
  );

  const exitFx = (li: number): Fx => {
    if (exitAt === undefined || exit === "none") return FX_REST;
    const startAt = exitAt + sec(li * 0.04, fps);
    return exit === "fade" ? fadeOut(frame, startAt, fps, T2.lineOut) : blurOut(frame, startAt, fps, 8, T2.lineOut);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        display: "flex",
        flexDirection: "column",
        justifyContent: FLEX[valign],
        alignItems: FLEX[align],
        textAlign: align,
        pointerEvents: "none",
        ...style,
      }}
    >
      {lines.map((line, li) => {
        const lineStyle: CSSProperties = {
          fontFamily: FONT[typo.family],
          fontSize: px,
          fontWeight: weight ?? typo.weight,
          letterSpacing: typo.tracking,
          lineHeight: typo.leading,
          fontVariationSettings: typo.axes,
          whiteSpace: "pre",
          color,
          fontKerning: "normal",
        };
        const out = exitFx(li);
        if (enter === "rise") {
          const p = ramp(frame, at + sec(li * lineStagger, fps), sec(T.textIn, fps), EASE.enter);
          // the line starts 125 % of its line height below its clip box (FILM_SPEC §3 says 105 %): the box's bottom padding
          // (0.16 em) showed the tip of a tall ascender on the first frame (T4 at f360, REVIEW-G2 P2-3, lane G-fix)
          const fx = mixFx(out, p >= 1 ? FX_REST : { ...FX_REST, dy: (1 - p) * px * typo.leading * 1.25 });
          if (frame < at) return <div key={li} style={{ ...lineStyle, opacity: 0 }}>{line}</div>;
          return (
            <div key={li} style={{ overflow: "hidden", fontSize: px, lineHeight: typo.leading, padding: "0.12em 0 0.16em", margin: "-0.12em 0 -0.16em" }}>
              <div style={{ ...lineStyle, ...fxStyle(fx) }}>{line}</div>
            </div>
          );
        }
        if (enter === "fade" || enter === "none") {
          const fx = enter === "fade" ? mixFx(fadeIn(frame, at + sec(li * lineStagger, fps), fps, T.textIn), out) : out;
          return (
            <div key={li} style={{ ...lineStyle, ...fxStyle(fx) }}>
              {line}
            </div>
          );
        }
        // per word: (A) blur-in or (B) ink
        const ws = wordsOf(line);
        return (
          <div key={li} style={{ ...lineStyle, ...fxStyle(out) }}>
            {ws.map((w, wi) => {
              const s = starts[li]![wi]!;
              if (enter === "ink") {
                const shown = frame >= Math.min(at, s) ? 1 : 0;
                const inked = ramp(frame, s, sec(T.wordIn, fps), EASE.enter);
                return (
                  <span key={wi}>
                    {wi > 0 ? " " : ""}
                    <span style={{ opacity: shown, color: inked >= 1 ? color : interpolateColors(inked, [0, 1], [from, color]) }}>{w}</span>
                  </span>
                );
              }
              const fx = blurIn(frame, s, fps);
              return (
                <span key={wi}>
                  {wi > 0 ? " " : ""}
                  <span style={{ display: "inline-block", ...fxStyle(fx) }}>{w}</span>
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Local frame on which a KineticText's last word has landed (for timing holds and the next beat). */
export const landedAt = (lines: readonly string[], at: number, fps: number, enter: KineticTextProps["enter"] = "blur") => {
  if (enter === "rise" || enter === "fade") return at + sec((lines.length - 1) * T.lineStagger + T.textIn, fps);
  const words = lines.reduce((k, l) => k + wordsOf(l).length, 0);
  return at + sec((words - 1) * WORD_STEP_S + T.wordIn, fps);
};
