// Kinetic type (TREATMENT §4 "Type" and "Motion"):
//
// <Headline text="Small pebble. *Real work.*" at={0.2} />
//   Each word rises through its own mask (y 115 % → 0) while its blur clears (8 px → 0), 0.45 s on
//   cubic-bezier(0.22, 1, 0.36, 1), the words 0.06 s apart (and 0.08 s more per line). `*…*` marks accent words, set in
//   Fraunces (SOFT 100, WONK 0) in sage; "\n" breaks a line. By default the size shrinks to fit the box's width, so the
//   same line works on 16:9 and 4:5. Exits: "rise" (up through the mask with a blur, 0.22 s), "fade", or "cut".
//
// <Label text="Both on claude-opus-5-5" /> : Geist Mono 500, tabular figures, sentence case; a short fade-rise.
//
// Masks are clip-paths (not overflow: hidden), so words of different faces still sit on one baseline.
import type { CSSProperties, ReactNode } from "react";
import { measureText } from "@remotion/layout-utils";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, type Rect } from "../layout";
import { DUR, EASE, TYPE, type EaseFn } from "../tokens";
import { useWorld } from "../world";

export type TextVariant = "headline" | "title" | "support";
/** "serif": accents in Fraunces (the emotional beats); "same": accents keep the line's face and change colour only */
export type AccentFace = "serif" | "same";

interface Seg {
  text: string;
  accent: boolean;
}
type Word = Seg[];

/** Parses `*accent*` markup into lines of words of segments. An unmatched `*` is kept as text. */
export const parseMarkup = (text: string): Word[][] => {
  const stars = (text.match(/\*/g) ?? []).length;
  const markup = stars % 2 === 0;
  let accent = false;
  return text.split("\n").map((line) =>
    line
      .split(/ +/)
      .filter((w) => w.length > 0)
      .map((w) => {
        const segs: Seg[] = [];
        let buf = "";
        for (const ch of w) {
          if (ch === "*" && markup) {
            if (buf) segs.push({ text: buf, accent });
            buf = "";
            accent = !accent;
          } else buf += ch;
        }
        if (buf) segs.push({ text: buf, accent });
        return segs;
      })
      .filter((segs) => segs.length > 0),
  );
};

/** How many letters come before word `wi` in its line (spaces count as one). */
const wordOffset = (words: Word[], wi: number): number => {
  let n = 0;
  for (let j = 0; j < wi; j++) n += words[j].reduce((a, seg) => a + [...seg.text].length, 0) + 1;
  return n;
};

/** The words of a line of markup with the markup removed: for word counts and reading time. */
export const plainText = (text: string): string => text.replace(/\*/g, "").replace(/\s+/g, " ").trim();

const segStyle = (variant: TextVariant, accent: boolean, weight?: number, face: AccentFace = "serif") => {
  const base = TYPE[variant];
  if (!accent || face === "same") return { fontFamily: base.fontFamily, fontWeight: weight ?? base.fontWeight, letterSpacing: base.letterSpacing, fontVariationSettings: base.fontVariationSettings };
  return { fontFamily: TYPE.accent.fontFamily, fontWeight: TYPE.accent.fontWeight, letterSpacing: TYPE.accent.letterSpacing, fontVariationSettings: TYPE.accent.fontVariationSettings };
};

/** The width of a line of words at `size` px. */
export const textWidth = (text: string, size: number, variant: TextVariant = "headline", weight?: number, face: AccentFace = "serif"): number =>
  Math.max(0, ...parseMarkup(text).map((l) => lineWidth(l, size, variant, weight, face)));

const lineWidth = (words: Word[], size: number, variant: TextVariant, weight?: number, face: AccentFace = "serif"): number => {
  let w = 0;
  words.forEach((word, i) => {
    for (const seg of word) {
      const st = segStyle(variant, seg.accent, weight, face);
      const fs = seg.accent && face === "serif" ? size * TYPE.accent.scale : size;
      w += measureText({
        text: seg.text,
        fontFamily: st.fontFamily,
        fontSize: fs,
        fontWeight: st.fontWeight,
        letterSpacing: st.letterSpacing,
        additionalStyles: { fontVariationSettings: st.fontVariationSettings },
      }).width;
    }
    if (i < words.length - 1) {
      const st = segStyle(variant, false, weight);
      w += measureText({ text: " ", fontFamily: st.fontFamily, fontSize: size, fontWeight: st.fontWeight, letterSpacing: st.letterSpacing }).width;
    }
  });
  return w;
};

/** The largest size ≤ `size` at which every line of `text` fits `maxWidth`. */
export const fitSize = (text: string, size: number, maxWidth: number, variant: TextVariant = "headline", weight?: number, face: AccentFace = "serif"): number => {
  const lines = parseMarkup(text);
  const widest = Math.max(1, ...lines.map((l) => lineWidth(l, 100, variant, weight, face)));
  return Math.min(size, (maxWidth / widest) * 100 * 0.985);
};

export type Exit = "rise" | "fade" | "cut";

/**
 * How words arrive (vary them through the film; one entrance everywhere is a tell):
 * - "rise": the default: each word rises through its mask with a blur (0.45 s, words 0.06 s apart);
 * - "blur": each word sharpens in place from a 6 px blur (0.13 s, words 0.067 s apart), no movement;
 * - "ink": every word is there, dim, and brightens in turn (0.08 s apart), no movement;
 * - "line": the whole line at once, 8 px of blur to sharp in 0.2 s;
 * - "letters": a name, letter by letter (0.05 s apart), from 30 % with a slight blur.
 */
export type Entrance = "rise" | "blur" | "ink" | "line" | "letters";

const ENTRANCE: Record<Entrance, { dur: number; stagger: number; blur: number }> = {
  rise: { dur: DUR.wordIn, stagger: DUR.wordStagger, blur: DUR.wordBlurPx },
  blur: { dur: 0.13, stagger: 0.067, blur: 6 },
  ink: { dur: 0.2, stagger: 0.08, blur: 0 },
  line: { dur: 0.2, stagger: 0, blur: 8 },
  letters: { dur: 0.25, stagger: 0.05, blur: 3 },
};

export interface HeadlineProps {
  /** the line; `*word*` accents, "\n" breaks */
  text: string;
  /** entrance start, seconds (local to the enclosing Sequence) */
  at?: number;
  /** exit start, seconds (undefined: stays) */
  exitAt?: number;
  exit?: Exit;
  /** px (default: the layout's headline size) */
  size?: number;
  variant?: TextVariant;
  weight?: number;
  color?: string;
  accentColor?: string;
  accentFace?: AccentFace;
  align?: "left" | "center" | "right";
  /** the box the block is set in (default: the layout's content box) */
  box?: Rect;
  valign?: "top" | "middle" | "bottom";
  /** shrink to fit the box's width (default true; off when `wrap`) */
  fit?: boolean;
  /** let lines wrap inside the box instead (body copy); wrapped lines never leave an orphan */
  wrap?: boolean;
  /** with `wrap`: balance the lines' lengths (short paragraphs, up to about six lines) */
  balance?: boolean;
  stagger?: number;
  lineStagger?: number;
  /** each word's rise, seconds */
  dur?: number;
  /** blur at the start of the rise, px at 1080p */
  blur?: number;
  ease?: EaseFn;
  /** a scale on the whole block (beat punches), about its centre */
  scale?: number;
  /** line height override */
  leading?: number;
  /** every word at once (no stagger), e.g. a slam on a downbeat */
  together?: boolean;
  /** how the words arrive (default "rise") */
  entrance?: Entrance;
  style?: CSSProperties;
  /** rendered after the last word, inside the block (an inline pebble, a mark) */
  trailing?: ReactNode;
}

export const Headline: React.FC<HeadlineProps> = ({
  text,
  at = 0,
  exitAt,
  exit = "rise",
  size,
  variant = "headline",
  weight,
  color: colorProp,
  accentColor: accentProp,
  accentFace = "serif",
  align = "left",
  box,
  valign = "middle",
  fit,
  wrap = false,
  balance = false,
  stagger: staggerProp,
  lineStagger = DUR.lineStagger,
  dur: durProp,
  blur: blurProp,
  ease = EASE.enter,
  scale = 1,
  leading,
  together = false,
  entrance = "rise",
  style,
  trailing,
}) => {
  const world = useWorld();
  const color = colorProp ?? world.ink;
  const accentColor = accentProp ?? world.accent;
  const E = ENTRANCE[entrance];
  const stagger = staggerProp ?? E.stagger;
  const dur = durProp ?? E.dur;
  const blur = blurProp ?? E.blur;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const t = frame / fps;
  const b = box ?? L.content;
  const base = size ?? (variant === "support" ? L.type.sub : variant === "title" ? L.type.hero : L.type.headline);
  const doFit = fit ?? !wrap;
  const px = doFit ? fitSize(text, base, b.w, variant, weight, accentFace) : base;
  const lines = parseMarkup(text);
  const blurPx = blur * L.u;

  // exit envelope: 0 (resting) → 1 (gone)
  const ex = exitAt === undefined ? 0 : Math.max(0, Math.min(1, (t - exitAt) / DUR.exit));
  if (exitAt !== undefined && exit === "cut" && t >= exitAt) return null;
  if (ex >= 1) return null;
  const exE = EASE.exit(ex);

  let index = 0;
  const v = TYPE[variant];
  const rendered = lines.map((words, li) => (
    <div key={li} style={wrap ? ({ whiteSpace: "normal", textWrap: balance ? "balance" : "pretty" } as CSSProperties) : { whiteSpace: "nowrap" }}>
      {words.map((word, wi) => {
        const i = index++;
        const start = at + (together || entrance === "line" ? 0 : i * stagger + li * lineStagger);
        const p = ease(Math.max(0, Math.min(1, (t - start) / dur)));
        const exBlur = exit === "cut" ? 0 : exE * Math.max(blurPx, 6 * L.u) * 0.75;
        const segs = (wordOpacity: (k: number) => number, wordBlur: (k: number) => number) => {
          let k = 0;
          return word.map((seg, si) => {
            const segStyleProps: CSSProperties = seg.accent
              ? accentFace === "serif"
                ? { ...segStyle(variant, true), fontSize: `${TYPE.accent.scale}em`, color: accentColor }
                : { color: accentColor }
              : {};
            if (entrance !== "letters") return <span key={si} style={segStyleProps}>{seg.text}</span>;
            return (
              <span key={si} style={segStyleProps}>
                {[...seg.text].map((ch, ci) => {
                  const kk = k++;
                  const o = wordOpacity(kk);
                  const bl = wordBlur(kk);
                  return (
                    <span key={ci} style={{ opacity: o, filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : undefined }}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          });
        };
        let inner: ReactNode;
        if (entrance === "rise") {
          const rise = (1 - p) * 115 + (exit === "rise" ? -exE * 70 : 0);
          const bl = blurPx * (1 - p) + exBlur;
          inner = (
            <span style={{ display: "inline-block", clipPath: "inset(-0.12em -0.08em -0.24em -0.08em)", visibility: p <= 0 ? "hidden" : undefined }}>
              <span
                style={{
                  display: "inline-block",
                  transform: Math.abs(rise) > 0.01 ? `translateY(${rise.toFixed(3)}%)` : undefined,
                  filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : undefined,
                  opacity: Math.min(1, p * 2.2) * (1 - exE),
                }}
              >
                {segs(() => 1, () => 0)}
              </span>
            </span>
          );
        } else if (entrance === "letters") {
          // letter k of this word starts `stagger` after the one before it, counted from the line's first letter
          const letterStart = (kk: number) => at + (li * lineStagger) + (wordOffset(words, wi) + kk) * stagger;
          const lp = (kk: number) => ease(Math.max(0, Math.min(1, (t - letterStart(kk)) / dur)));
          inner = (
            <span style={{ display: "inline-block", transform: exit === "rise" && exE > 0 ? `translateY(${(-exE * 30).toFixed(2)}%)` : undefined, opacity: 1 - exE, filter: exBlur > 0.05 ? `blur(${exBlur.toFixed(2)}px)` : undefined }}>
              {segs(
                (kk) => (t < letterStart(kk) ? 0 : 0.3 + 0.7 * lp(kk)),
                (kk) => (t < letterStart(kk) ? 0 : blurPx * (1 - lp(kk))),
              )}
            </span>
          );
        } else {
          // blur, ink and line: in place, no movement
          const op = entrance === "ink" ? (t < at ? 0 : 0.2 + 0.8 * p) : p;
          const bl = blurPx * (1 - p) + exBlur;
          inner = (
            <span
              style={{
                display: "inline-block",
                opacity: op * (1 - exE),
                filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : undefined,
                transform: exit === "rise" && exE > 0 ? `translateY(${(-exE * 30).toFixed(2)}%)` : undefined,
              }}
            >
              {segs(() => 1, () => 0)}
            </span>
          );
        }
        return (
          <span key={wi}>
            {inner}
            {wi < words.length - 1 ? " " : null}
          </span>
        );
      })}
      {li === lines.length - 1 ? trailing : null}
    </div>
  ));

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
        justifyContent: valign === "top" ? "flex-start" : valign === "bottom" ? "flex-end" : "center",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: v.fontFamily,
          fontWeight: weight ?? v.fontWeight,
          fontVariationSettings: v.fontVariationSettings,
          letterSpacing: v.letterSpacing,
          lineHeight: leading ?? v.lineHeight,
          fontSize: px,
          color,
          textAlign: align,
          fontKerning: "normal",
          textRendering: "geometricPrecision",
          WebkitFontSmoothing: "antialiased",
          maxWidth: b.w,
          transform: Math.abs(scale - 1) > 1e-4 ? `scale(${scale.toFixed(5)})` : undefined,
          ...style,
        }}
      >
        {rendered}
      </div>
    </div>
  );
};

export interface LabelProps {
  text: string;
  at?: number;
  exitAt?: number;
  size?: number;
  color?: string;
  /** position: the label's anchor point, px */
  x: number;
  y: number;
  align?: "left" | "center" | "right";
  /** vertical anchor: the label's top, middle or baseline-ish bottom at `y` */
  valign?: "top" | "middle" | "bottom";
  weight?: 400 | 500;
  style?: CSSProperties;
}

/** Geist Mono labels and numbers: tabular figures, sentence case, a short fade-rise (0.35 s). */
export const Label: React.FC<LabelProps> = ({ text, at = 0, exitAt, size, color: colorProp, x, y, align = "left", valign = "top", weight = 500, style }) => {
  const world = useWorld();
  const color = colorProp ?? world.ink2;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const t = frame / fps;
  const p = EASE.enter(Math.max(0, Math.min(1, (t - at) / 0.35)));
  const ex = exitAt === undefined ? 0 : Math.max(0, Math.min(1, (t - exitAt) / DUR.exit));
  if (p <= 0 || ex >= 1) return null;
  const tx = align === "left" ? "0%" : align === "right" ? "-100%" : "-50%";
  const ty = valign === "top" ? "0%" : valign === "bottom" ? "-100%" : "-50%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${tx}, ${ty}) translateY(${((1 - p) * 0.45 * (size ?? L.type.label)).toFixed(2)}px)`,
        opacity: p * (1 - ex),
        fontFamily: TYPE.mono.fontFamily,
        fontWeight: weight,
        fontVariantNumeric: TYPE.mono.fontVariantNumeric,
        letterSpacing: TYPE.mono.letterSpacing,
        fontSize: size ?? L.type.label,
        lineHeight: 1.25,
        color,
        whiteSpace: "pre",
        textAlign: align,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
