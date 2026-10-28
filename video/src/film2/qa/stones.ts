// Stone count on a render (added after the craft review: CR-01, CR-15): the film has one stone, and a frame where the
// plan shows the stone must show exactly one stone-sized dark blob. The review counted two at the title's iris in every
// aspect (frames 4632–4637 in 16:9) while every check passed; the plan-level count is setpieces/qa.ts stoneCount().
//
// A blob is an 8-connected component of pixels at or below `maxLuma` (the pebble's body is #536B54, about 97 in grey;
// the riverbed, the page and the cards are above 200), kept when its area-equivalent radius is in the plan's range for
// the stone on that frame and it is compact (it fills at least `minFill` of its bounding box, whose sides are within
// `maxAspect` of each other): glyph strokes, hairlines, buttons and the aperture's bands are not stones.
// Pure: 8-bit grey frames in.
import type { Rect } from "../motion/geometry";

export interface Blob {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  cx: number;
  cy: number;
  /** the radius of a disc of the same area */
  r: number;
}

export interface BlobOptions {
  /** pixels at or below this grey level are dark */
  maxLuma?: number;
  /** the area-equivalent radius a stone may have, px of the analysed frame */
  minR: number;
  maxR: number;
  minFill?: number;
  maxAspect?: number;
  region?: Rect;
}

export const STONE_BLOB = { maxLuma: 140, minFill: 0.5, maxAspect: 1.8 } as const;

/**
 * The least area, a share of the stone's, at which a dark blob counts as a pebble (fix round 3; the verifier's VF-01):
 * the Return's A3 cell drew Pebble's engine, a whole pebble about 15 % of the stone's area, beside the stone at the
 * merge, and the old floor (blobs from half the stone's radius: 25 % of its area) passed it. Inside the Return's cells
 * a blob also counts only when it is round, as a pebble is (PICTURED_BLOB.minFill), not a bar or a button.
 */
export const PICTURED_BLOB = { share: 0.1, minFill: 0.6, maxAspect: 1.6 } as const;

/** The stone-like dark blobs of a grey frame. */
export function stoneBlobs(frame: Uint8Array, W: number, H: number, o: BlobOptions): Blob[] {
  const maxLuma = o.maxLuma ?? STONE_BLOB.maxLuma;
  const minFill = o.minFill ?? STONE_BLOB.minFill;
  const maxAspect = o.maxAspect ?? STONE_BLOB.maxAspect;
  const x0 = Math.max(0, Math.floor(o.region?.x ?? 0));
  const y0 = Math.max(0, Math.floor(o.region?.y ?? 0));
  const x1 = Math.min(W, Math.ceil(o.region ? o.region.x + o.region.w : W));
  const y1 = Math.min(H, Math.ceil(o.region ? o.region.y + o.region.h : H));
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const out: Blob[] = [];
  const minArea = Math.PI * o.minR * o.minR;
  const maxArea = Math.PI * o.maxR * o.maxR;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i0 = y * W + x;
      if (seen[i0] || frame[i0]! > maxLuma) continue;
      // flood fill (8-connected) inside the region
      let sp = 0;
      stack[sp++] = i0;
      seen[i0] = 1;
      let area = 0;
      let sx = 0;
      let sy = 0;
      let bx0 = x;
      let bx1 = x;
      let by0 = y;
      let by1 = y;
      let big = false;
      while (sp > 0) {
        const i = stack[--sp]!;
        const px = i % W;
        const py = (i - px) / W;
        area++;
        sx += px;
        sy += py;
        if (px < bx0) bx0 = px;
        if (px > bx1) bx1 = px;
        if (py < by0) by0 = py;
        if (py > by1) by1 = py;
        if (area > maxArea * 4) big = true;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = py + dy;
          if (ny < y0 || ny >= y1) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = px + dx;
            if (nx < x0 || nx >= x1) continue;
            const j = ny * W + nx;
            if (seen[j] || frame[j]! > maxLuma) continue;
            seen[j] = 1;
            stack[sp++] = j;
          }
        }
      }
      if (big || area < minArea || area > maxArea) continue;
      const bw = bx1 - bx0 + 1;
      const bh = by1 - by0 + 1;
      if (area / (bw * bh) < minFill || Math.max(bw / bh, bh / bw) > maxAspect) continue;
      out.push({ x: bx0, y: by0, w: bw, h: bh, area, cx: sx / area, cy: sy / area, r: Math.sqrt(area / Math.PI) });
    }
  }
  return out;
}

/** A grey frame shrunk by an integer factor (a box filter): for the cheaper whole-frame analyses. */
export function shrink(frame: Uint8Array, W: number, H: number, k: number): { px: Uint8Array; w: number; h: number } {
  const w = Math.floor(W / k);
  const h = Math.floor(H / k);
  const px = new Uint8Array(w * h);
  const kk = k * k;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < k; dy++) {
        const row = (y * k + dy) * W + x * k;
        for (let dx = 0; dx < k; dx++) s += frame[row + dx]!;
      }
      px[y * w + x] = Math.round(s / kk);
    }
  }
  return { px, w, h };
}
