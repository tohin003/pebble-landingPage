// The `pebble` lockup with the character as its full stop (docs/FILM_SPEC.md S4, S9; DESIGN.md: the site header's
// wordmark, Inter 650, lowercase). The letters are right-aligned to the pebble, so the pebble's resting place is an
// exact, known point (it hops in and lands there) and no text has to be measured.
//
// (W) the wordmark unroll: a clip that opens from the pebble outward (right to left), 15 frames, EASE.enter; on the
// reveal it comes with the film's one tracking settle (+0.04 em → −0.035 em), the word settling toward the pebble.
// The period is the real character (lane B's PebbleOnFilm: the bloub engine, replayed from cues every frame).
import type { CSSProperties } from "react";
import type { PebbleCue, PoseId } from "../../../shared/pebble";
import { BODY, VIEWBOX_SIZE } from "../../../shared/pebble";
import { FONT } from "../fonts";
import type { Point } from "../motion/camera";
import { COLOR, TYPO } from "../motion/spec";
import type { Hop } from "../pebble/acting";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";
import type { PebbleColors } from "../pebble/PebbleSvg";

/** Inter's metrics (Inter 4 at opsz 32): baseline below the top of a line-height-1 box, and the advance of `pebble`
 *  at weight 650 with −0.035 em tracking (measured on a render; it only centres the lockup). */
export const INTER = { baseline: 0.865, xHeight: 0.52 } as const;
export const PEBBLE_WORD_EM = 2.95;

export interface LockupGeometry {
  fontSize: number;
  /** where the pebble's foot rests (bottom centre of its body), px */
  period: Point;
  /** the letters' baseline, px */
  baseline: number;
  /** right edge of the letters, px */
  textRight: number;
  /** the pebble's body, px */
  body: { w: number; h: number };
  /** PebbleOnFilm `size` (the 220-unit viewBox), px */
  pebbleSize: number;
  /** the whole lockup's estimated box */
  box: { x: number; y: number; w: number; h: number };
}

/**
 * The lockup from FILM_SPEC's numbers: the pebble's foot (its resting point), the wordmark's baseline, the font size
 * and the pebble's size. The letters end `gapEm` before the pebble's body.
 */
export function lockupGeometry(o: { fontSize: number; foot: Point; baseline: number; pebbleSize: number; gapEm?: number }): LockupGeometry {
  const bodyW = (BODY.width * o.pebbleSize) / VIEWBOX_SIZE;
  const bodyH = (BODY.height * o.pebbleSize) / VIEWBOX_SIZE;
  const gap = (o.gapEm ?? 0.1) * o.fontSize;
  const textRight = o.foot.x - bodyW / 2 - gap;
  const textW = PEBBLE_WORD_EM * o.fontSize;
  const left = textRight - textW;
  return {
    fontSize: o.fontSize,
    period: o.foot,
    baseline: o.baseline,
    textRight,
    body: { w: bodyW, h: bodyH },
    pebbleSize: o.pebbleSize,
    box: { x: left, y: o.baseline - 0.76 * o.fontSize, w: o.foot.x + bodyW / 2 - left, h: 0.76 * o.fontSize },
  };
}

export interface WordmarkProps {
  geometry: LockupGeometry;
  color?: string;
  /** 0..1: the unroll, opening from the pebble outward (right to left) with a soft edge (1 = all shown) */
  reveal?: number;
  /** letter-spacing override (the reveal's tracking settle), e.g. "0.01em" */
  tracking?: string;
  /** letters' opacity (fades and exits) */
  opacity?: number;
  /** the pebble acting as the full stop; null draws the letters alone */
  pebble?: {
    cues: readonly PebbleCue[];
    /** where the foot stands before any hop (default: the period) */
    start?: Point;
    hops?: readonly Hop[];
    initialPose?: PoseId;
    offsetFrames?: number;
    shadow?: boolean;
    colors?: PebbleColors;
  } | null;
  style?: CSSProperties;
}

export const Wordmark: React.FC<WordmarkProps> = ({ geometry: g, color = COLOR.ink, reveal = 1, tracking, opacity = 1, pebble, style }) => {
  const feather = 12; // % of the word's width
  const p = Math.max(0, Math.min(1, reveal)) * (100 + feather);
  // opens from the right (the pebble) toward the left
  const mask = reveal >= 1 ? undefined : `linear-gradient(270deg, #000 ${(p - feather).toFixed(2)}%, transparent ${p.toFixed(2)}%)`;
  const top = g.baseline - INTER.baseline * g.fontSize;
  return (
    <>
      {opacity > 0 && reveal > 0 ? (
        <div
          style={{
            position: "absolute",
            right: `calc(100% - ${g.textRight.toFixed(2)}px)`,
            top,
            fontFamily: FONT.sans,
            fontSize: g.fontSize,
            fontWeight: TYPO.wordmark.weight,
            letterSpacing: tracking ?? TYPO.wordmark.tracking,
            lineHeight: 1,
            color,
            whiteSpace: "pre",
            opacity,
            WebkitMaskImage: mask,
            maskImage: mask,
            ...style,
          }}
        >
          pebble
        </div>
      ) : null}
      {pebble ? (
        <PebbleOnFilm
          cues={pebble.cues}
          size={g.pebbleSize}
          x={(pebble.start ?? g.period).x}
          y={(pebble.start ?? g.period).y}
          hops={pebble.hops}
          initialPose={pebble.initialPose}
          offsetFrames={pebble.offsetFrames}
          shadow={pebble.shadow ?? true}
          colors={pebble.colors}
        />
      ) : null}
    </>
  );
};
