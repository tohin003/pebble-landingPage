// The "pebble." lockup with the character as its full stop (MASTER_PLAN §5.1 reveal and end card; DESIGN.md: the
// wordmark is the site header's, Inter 650 at −0.032 em, lowercase). The letters are right-aligned to the period, so
// the pebble's resting place is an exact, known point (it can hop in and land there) and no text has to be measured.
//
// The period is the real character (lane B's PebbleOnFilm: the bloub engine, replayed from cues every frame), its body
// as tall as the x-height times `scale`, standing on the baseline.
import type { CSSProperties } from "react";
import type { PebbleCue, PoseId } from "../../../shared/pebble";
import { BODY, VIEWBOX_SIZE } from "../../../shared/pebble";
import { FONT } from "../fonts";
import type { Point } from "../motion/camera";
import { COLOR, TYPO } from "../motion/spec";
import type { Hop } from "../pebble/acting";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";
import type { PebbleColors } from "../pebble/PebbleSvg";

/** Inter's metrics (Inter 4, opsz 32): baseline below the top of a line-height-1 box, x-height, and the measured
 *  advance of "pebble" at weight 650 with −0.032 em tracking (measured on a render; used only to centre the lockup).
 *  The gap keeps the landing squash (1.15 × wider for two frames) clear of the "e". */
export const INTER = { baseline: 0.864, xHeight: 0.546 } as const;
export const PEBBLE_WORD_EM = 2.95;

export interface LockupGeometry {
  fontSize: number;
  /** where the pebble's foot rests (bottom centre of its body), parent px */
  period: Point;
  /** right edge of the letters */
  textRight: number;
  /** pebble body size, px */
  body: { w: number; h: number };
  /** PebbleOnFilm `size` (the 220-unit viewBox), px */
  pebbleSize: number;
  /** the whole lockup's estimated box */
  box: { x: number; y: number; w: number; h: number };
}

/** The lockup centred on `center` (the centre of its x-height band), with the period's body `scale` × x-height tall. */
export function lockupGeometry(fontSize: number, center: Point, scale = 1.06, gapEm = 0.11): LockupGeometry {
  const bodyH = INTER.xHeight * fontSize * scale;
  const bodyW = (bodyH * BODY.width) / BODY.height;
  const textW = PEBBLE_WORD_EM * fontSize;
  const gap = gapEm * fontSize;
  const total = textW + gap + bodyW;
  const left = center.x - total / 2;
  const baseline = center.y + (INTER.xHeight * fontSize) / 2;
  const textRight = left + textW;
  const period = { x: textRight + gap + bodyW / 2, y: baseline };
  return {
    fontSize,
    period,
    textRight,
    body: { w: bodyW, h: bodyH },
    pebbleSize: (bodyH * VIEWBOX_SIZE) / BODY.height,
    box: { x: left, y: baseline - 0.76 * fontSize, w: total, h: 0.76 * fontSize },
  };
}

export interface WordmarkProps {
  geometry: LockupGeometry;
  color?: string;
  /** 0..1: a feathered wipe of the letters, left to right (1 = all shown) */
  reveal?: number;
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

export const Wordmark: React.FC<WordmarkProps> = ({ geometry: g, color = COLOR.ink, reveal = 1, opacity = 1, pebble, style }) => {
  const feather = 14; // % of the word's width
  const p = Math.max(0, Math.min(1, reveal)) * (100 + feather);
  const mask = reveal >= 1 ? undefined : `linear-gradient(90deg, #000 ${(p - feather).toFixed(2)}%, transparent ${p.toFixed(2)}%)`;
  const top = g.period.y - INTER.baseline * g.fontSize;
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
            letterSpacing: TYPO.wordmark.tracking,
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
