// Framing for the set pieces, per aspect (TREATMENT §3.12: one timeline, each aspect framed on its own, never a crop
// of another). Pure: the plans use it to place type and to aim cameras, the validators to check what is in frame.
import { SAFE_MARGIN_PX, TYPE_MOTION, f60, type Aspect, type TypeTier } from "../tokens";
import type { Pose } from "../motion/camera";
import type { Rect } from "../motion/geometry";
import { approxLineWidth, aspectOfFrame, typeSizePx } from "../type/scale";

export interface FrameBox {
  w: number;
  h: number;
  aspect: Aspect;
  /** the frame's short side ÷ 1080 (0.5 in a half-size proxy) */
  unit: number;
  /** the safe margin, px (60 at 1080) */
  safe: number;
}

export const frameBox = (w: number, h: number): FrameBox => {
  const unit = Math.min(w, h) / 1080;
  return { w, h, aspect: aspectOfFrame(w, h), unit, safe: SAFE_MARGIN_PX * unit };
};

export const ASPECT_SIZE: Record<Aspect, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

/** A table with one entry per aspect. */
export type ByAspect<T> = Record<Aspect, T>;
export const pick = <T>(t: ByAspect<T>, a: Aspect): T => t[a];

/** A frame rect from fractions of the frame. */
export const rel = (f: FrameBox, x0: number, y0: number, x1: number, y1: number): Rect => ({ x: x0 * f.w, y: y0 * f.h, w: (x1 - x0) * f.w, h: (y1 - y0) * f.h });

export const unionRect = (...rs: readonly Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export const offsetRect = (r: Rect, dx: number, dy: number): Rect => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });

/**
 * The pose that shows world rect `r` inside the frame region `region` (frame px), filling `fill` of it on the binding
 * side, centred in it. `maxZoom` caps the magnification.
 */
export function fitPose(r: Rect, region: Rect, f: FrameBox, fill = 0.9, maxZoom = Infinity): Pose {
  const zoom = Math.min(maxZoom, fill * Math.min(region.w / r.w, region.h / r.h));
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rx = region.x + region.w / 2;
  const ry = region.y + region.h / 2;
  return { x: cx - (rx - f.w / 2) / zoom, y: cy - (ry - f.h / 2) / zoom, zoom };
}

/** Where a world rect lands in the frame under `pose`. */
export const rectInFrame = (r: Rect, pose: Pose, f: FrameBox): Rect => ({
  x: f.w / 2 + (r.x - pose.x) * pose.zoom,
  y: f.h / 2 + (r.y - pose.y) * pose.zoom,
  w: r.w * pose.zoom,
  h: r.h * pose.zoom,
});

/** Is a frame rect inside the frame, `margin` px from every edge? */
export const insideFrame = (r: Rect, f: FrameBox, margin = 0): boolean => r.x >= margin && r.y >= margin && r.x + r.w <= f.w - margin && r.y + r.h <= f.h - margin;

/* ---------------------------------------------------------------- type layout ---------------------------------- */

/** Line height KineticLine sets per tier. */
export const lineHeightOf = (tier: TypeTier): number => (tier === "expressive" ? 1.25 : 1.3);

/**
 * Breaks `text` into lines no wider than `maxWidth` px, with "\n" between them: KineticLine never re-wraps, so every
 * multi-line film line is broken here, per aspect. It uses the fewest lines the width allows, and among those the
 * breaks that make the lines most even (no orphan word on a last line). Explicit "\n" are kept.
 */
export function breakLines(text: string, tier: TypeTier, f: FrameBox, maxWidth: number, sizeT = 0.5): string {
  const width = (words: readonly string[]) => approxLineWidth(words.join(" "), tier, f.w, f.h, sizeT);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    const n = words.length;
    if (n === 0) {
      out.push("");
      continue;
    }
    // best[i][k]: the smallest possible widest line for words[i..] in k lines (Infinity when impossible)
    const memo = new Map<string, { worst: number; cut: number }>();
    const solve = (i: number, k: number): { worst: number; cut: number } => {
      const key = `${i}:${k}`;
      const hit = memo.get(key);
      if (hit) return hit;
      let res = { worst: Infinity, cut: n };
      if (k === 1) res = { worst: width(words.slice(i)) <= maxWidth ? width(words.slice(i)) : Infinity, cut: n };
      else {
        for (let j = i + 1; j < n; j++) {
          const w = width(words.slice(i, j));
          if (w > maxWidth) break;
          const rest = solve(j, k - 1);
          const worst = Math.max(w, rest.worst);
          if (worst < res.worst) res = { worst, cut: j };
        }
      }
      memo.set(key, res);
      return res;
    };
    let k = 1;
    while (k < n && solve(0, k).worst === Infinity) k++;
    if (solve(0, k).worst === Infinity) {
      // a single word wider than the box: one word a line
      out.push(...words);
      continue;
    }
    let i = 0;
    for (let left = k; left >= 1; left--) {
      const c = left === 1 ? n : solve(i, left).cut;
      out.push(words.slice(i, c).join(" "));
      i = c;
    }
  }
  return out.join("\n");
}

export interface TypeBox {
  /** absolute position of KineticLine's box, frame px */
  left: number;
  top: number;
  width?: number;
  align: "left" | "center" | "right";
}

/** The rect a (possibly multi-line) line occupies, frame px (approximate advance widths; for the checks). */
export function lineRect(text: string, tier: TypeTier, f: FrameBox, box: TypeBox, sizeT = 0.5): Rect {
  const size = typeSizePx(tier, f.w, f.h, sizeT);
  const lines = text.split("\n");
  const w = Math.max(...lines.map((l) => approxLineWidth(l, tier, f.w, f.h, sizeT)));
  const h = lines.length * size * lineHeightOf(tier);
  const x = box.align === "left" || box.width === undefined ? box.left : box.align === "center" ? box.left + (box.width - w) / 2 : box.left + box.width - w;
  return { x, y: box.top, w, h };
}

/** The pixel size of a capture's text of `cssPx` under `zoom`, at 1080 px on the short side. */
export const textPxAt1080 = (cssPx: number, zoom: number, f: FrameBox): number => (cssPx * zoom) / f.unit;

/* ---------------------------------------------------------------- type timing (KineticLine's, pure) ----------- */

export type EntranceKind = "lineRise" | "wordRise" | "wordBlur" | "lineBlur";
export type ExitKind = "blur" | "lift" | "camera";

/** KineticLine's default entrance for a tier. */
export const defaultEntranceOf = (tier: TypeTier): EntranceKind => (tier === "expressive" || tier === "data" ? "lineRise" : "lineBlur");

const wordsOf = (text: string): number => text.split(/\s+/).filter(Boolean).length;
const linesOf = (text: string): number => text.split("\n").length;

/** Frames an entrance takes (KineticLine.entranceFrames, for this text). */
export const enterFramesOf = (e: EntranceKind, text: string, fps: number): number => {
  switch (e) {
    case "lineRise":
      return f60(TYPE_MOTION.rise.frames + TYPE_MOTION.rise.lineStagger * (linesOf(text) - 1), fps);
    case "wordRise":
      return f60(TYPE_MOTION.rise.frames + 4 * (wordsOf(text) - 1), fps);
    case "wordBlur":
      return f60(TYPE_MOTION.wordBlur.frames + TYPE_MOTION.wordBlur.wordStagger * (wordsOf(text) - 1), fps);
    case "lineBlur":
      return f60(TYPE_MOTION.blurIn.frames, fps);
  }
};

/** Frames an exit takes, from its start to the last glyph gone (KineticLine's arithmetic; "camera" has none). */
export const exitFramesOf = (e: EntranceKind, x: ExitKind, text: string, fps: number): number => {
  if (x === "camera") return 0;
  const inF = enterFramesOf(e, text, fps);
  const out = Math.max(2, Math.round(inF * TYPE_MOTION.exitRatio));
  if (x === "blur") return out;
  const n = linesOf(text);
  const each = Math.max(2, Math.round(out / Math.max(1, n * 0.5 + 0.5)));
  const stg = Math.max(1, Math.round(each * 0.4));
  return each + stg * (n - 1);
};
