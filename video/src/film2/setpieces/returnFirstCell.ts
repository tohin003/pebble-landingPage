// THE RETURN'S FIRST CELL IN MOTION (the R9 flash, 31 Oct; MONTAGE_DESIGN §2.12, §3). The first cell is S24's last
// frame, and the pull-back carries it from filling the frame to a cell of the field while it is still near its own size
// (k 0.94 at R0, 0.82 at R30, 0.52 at R80 in 16:9) and its content moves at up to 8–12 px a frame at 1080. Moving
// detail of any real capture is a flash risk there: on 31 Oct the render failed flash-rgb's css2560 window in 16:9 (8
// transitions in a second at R9; 7 at full size) from four lines of S24's placeholder label text alone, while the plan's
// flash model (returnWindows) passed, since it models each cell as coverage and not what is inside it. So:
//   firstCellMotion   the first cell on a frame: its screen rect, its scale k (S24's frame px to frame px) and its
//                     content's fastest point inside the frame, px a frame at 1080 (the cell's motion and its zoom)
//   firstCellSoftenAt the softening the view draws on it, by that speed alone, whatever the content: a round blur σ and a
//                     veil toward the page (#F8F9F6), both rising on a smoothstep from v0 to v1 px a frame (σ then
//                     follows the speed), so nothing at rest (S24's glide at the join is 0.39 px a frame), and
//                     full while the cell's scale is FIRST_CELL_MIN_K (0.2) or more, fading out to FIRST_CELL_FADE_K (0.12), where it is one of
//                     the field's cells (whose content no check models: G4 judges real crops on renders)
//   firstCellFlash    the guard (returnFirstCell, in returnChecks): the first cell's worst-case content, moved by the
//                     plan's own camera and softened as drawn, through the verdict's own counter (qa/flash-rgb.ts, the
//                     general rule in the aspect's binding windows) on the analysis grid; an error above 6 transitions
//                     in a second, a warning at 4 (IRIS)
// The worst case (FIRST_CELL_MODEL): S24's frame at full contrast, text-like rows and columns of black ink (an ink
// share of 0.4 in each dark band, half the period) on white: rows at periods of 16, 24, 96 and 192 S24 px, columns at 24
// (the periods that were ever the worst, measured on 31 Oct over rows and columns of 16–384). Black-and-white square
// waves are harsher than any light-theme capture and are not the bound: measured on 31 Oct (the Return lane's scratch,
// r9/), they fail the verdict at any motion over about 1 px a frame (slowing the pull-back 2× or 4× gives 38–48), as
// would every reading glide in the film. Pure; no React.
import { smoothstep } from "../motion/ease";
import { FlashRgb, flashGrid } from "../qa/flash-rgb";
import { COLOR } from "../tokens";
import type { Rect } from "../motion/geometry";
import { cellScreenAt, type FieldCell, type ReturnField } from "./returnField";

/**
 * The softening by speed v (px a frame at 1080): a ramp q = smoothstep(v0, v1, v); the blur's σ = q × max(sigmaMin,
 * sigmaPerV × v) (px at 1080: a floor, then it follows the speed), the veil's opacity q × veilMax.
 */
export interface FirstCellSoften {
  v0: number;
  v1: number;
  sigmaMin: number;
  sigmaPerV: number;
  veilMax: number;
}

/** The film's softening (chosen on 31 Oct by firstCellFlash on FIRST_CELL_MODEL, every aspect; G1.md §9). */
export const FIRST_CELL_SOFTEN: FirstCellSoften = { v0: 0.6, v1: 3, sigmaMin: 20, sigmaPerV: 2, veilMax: 0.4 };

/** The guard's worst-case content (see the header). */
export const FIRST_CELL_MODEL = { ink: 0.4, rows: [16, 24, 96, 192] as readonly number[], cols: [24] as readonly number[] };

/** The guard follows the first cell until its scale falls under this (then its content is a cell's: returnWindows). */
export const FIRST_CELL_MIN_K = 0.2;
/** Under FIRST_CELL_MIN_K the softening fades out, gone at this scale (the cell is one of the field's). */
export const FIRST_CELL_FADE_K = 0.12;

const lin = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
/** The page's relative luminance (the veil's colour, and the ground the guard puts round the cell). */
export const PAGE_LUM = lin(COLOR.page);

export const firstCellOf = (field: ReturnField): FieldCell | null => field.cells.find((c) => !!c.spec.hero && c.spec.standIn.kind === "frame") ?? null;

export interface FirstCellMotion {
  rect: Rect;
  /** S24's frame px to frame px */
  k: number;
  /** the content's fastest point inside the frame, px a frame at 1080 */
  v: number;
}

/** The first cell on a piece-local frame (null when it is not drawn). */
export function firstCellMotion(field: ReturnField, frame: number): FirstCellMotion | null {
  const hero = firstCellOf(field);
  const v = field.view;
  if (!hero || !v) return null;
  const c = cellScreenAt(hero, frame, field);
  const a = cellScreenAt(hero, frame - 0.5, field);
  const b = cellScreenAt(hero, frame + 0.5, field);
  if (!c || !a || !b) return null;
  const dl = Math.log(b.rect.w / a.rect.w);
  const ca = { x: a.rect.x + a.rect.w / 2, y: a.rect.y + a.rect.h / 2 };
  const cb = { x: b.rect.x + b.rect.w / 2, y: b.rect.y + b.rect.h / 2 };
  const cc = { x: c.rect.x + c.rect.w / 2, y: c.rect.y + c.rect.h / 2 };
  const vx = cb.x - ca.x;
  const vy = cb.y - ca.y;
  // a content point at frame point p moves vc + (p − centre)·dl: the fastest is at a corner of the visible part
  const x0 = Math.max(0, c.rect.x);
  const x1 = Math.min(v.w, c.rect.x + c.rect.w);
  const y0 = Math.max(0, c.rect.y);
  const y1 = Math.min(v.h, c.rect.y + c.rect.h);
  let vmax = 0;
  if (x1 > x0 && y1 > y0) for (const px of [x0, x1]) for (const py of [y0, y1]) vmax = Math.max(vmax, Math.hypot(vx + (px - cc.x) * dl, vy + (py - cc.y) * dl));
  return { rect: c.rect, k: c.rect.w / v.w, v: vmax / v.unit };
}

/** The softening the view draws on the first cell on a frame: σ in frame px, the veil's opacity, and the speed. */
export function firstCellSoftenAt(field: ReturnField, frame: number, s: FirstCellSoften | null = field.soften ?? null): { sigma: number; veil: number; v: number } {
  const m = firstCellMotion(field, frame);
  if (!m || !s) return { sigma: 0, veil: 0, v: m?.v ?? 0 };
  // by speed, and only while the cell is still S24's frame pulling back: full to FIRST_CELL_MIN_K, then it fades out by
  // FIRST_CELL_FADE_K, where it is a cell of the field (its orbit and return are never softened)
  const q = smoothstep(s.v0, s.v1, m.v) * smoothstep(FIRST_CELL_FADE_K, FIRST_CELL_MIN_K, m.k);
  return { sigma: Math.max(s.sigmaMin, s.sigmaPerV * m.v) * q * (field.view?.unit ?? 1), veil: s.veilMax * q, v: m.v };
}

/* ---------------------------------------------------------------- the guard ----------------------------------- */

/** ∫₀ʸ of a square wave of period p, white (1) for the first half. */
const sqI = (y: number, p: number): number => {
  const n = Math.floor(y / p);
  return (n * p) / 2 + Math.min(y - n * p, p / 2);
};
/** The mean over [a, b] of that square wave blurred by a Gaussian of σ (its odd harmonics, each attenuated). */
export function squareMean(a: number, b: number, p: number, s: number): number {
  if (b - a < 1e-9) return 0.5;
  if (s < 0.05) return (sqI(b, p) - sqI(a, p)) / (b - a);
  let acc = 0;
  for (let n = 1; n < 400; n += 2) {
    const att = Math.exp((-2 * Math.PI * Math.PI * n * n * s * s) / (p * p));
    if (att < 1e-5) break;
    acc += (2 / (n * Math.PI)) * att * (p / (2 * Math.PI * n)) * (Math.cos((2 * Math.PI * n * a) / p) - Math.cos((2 * Math.PI * n * b) / p));
  }
  return 0.5 + acc / (b - a);
}

/** Relative luminance to an sRGB byte, through a table (4,096 steps: under a byte's step everywhere it matters). */
const BYTE = Uint8Array.from({ length: 4097 }, (_, i) => {
  const L = i / 4096;
  const c = L <= 0.0031308 ? 12.92 * L : 1.055 * L ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
});
const toByte = (L: number): number => BYTE[Math.max(0, Math.min(4096, Math.round(L * 4096)))]!;

export interface FirstCellFlash {
  /** the worst binding window: its name, transitions in a second, the frame and the pattern */
  worst: { window: string; n: number; at: number | null; pattern: string };
  /** every binding window's worst */
  windows: Record<string, { n: number; at: number | null; pattern: string }>;
  frames: number;
  /** the softening's largest σ (px at 1080) and veil over those frames, and the content's top speed */
  peak: { sigma: number; veil: number; v: number };
}

/** Results by what decides them (the aspect, the model, and every frame's rect, scale, σ and veil): plans that move the first cell alike share one. */
const cache = new Map<string, FirstCellFlash>();

/**
 * The first cell's worst-case content (FIRST_CELL_MODEL, or `model`) through the verdict on the analysis grid, from the
 * Return's first frame until the cell's scale falls under FIRST_CELL_MIN_K, softened by `soften` (the field's own by
 * default; null draws it unsoftened, the canary). Null when the plan has no first cell. Cached by trajectory.
 */
export function firstCellFlash(field: ReturnField, aspect: "16:9" | "1:1" | "9:16", o: { soften?: FirstCellSoften | null; model?: { ink: number; rows: readonly number[]; cols: readonly number[] } } = {}): FirstCellFlash | null {
  const soften = o.soften === undefined ? (field.soften ?? null) : o.soften;
  const model = o.model ?? FIRST_CELL_MODEL;
  const v = field.view;
  if (!v || !firstCellOf(field)) return null;
  const g = flashGrid(v.w, v.h);
  const PX = v.w / g.w;
  const frames: { m: FirstCellMotion | null; sigma: number; veil: number }[] = [];
  const peak = { sigma: 0, veil: 0, v: 0 };
  for (let f = 0; f < 1200; f++) {
    const m = firstCellMotion(field, f);
    if (m && m.k < FIRST_CELL_MIN_K) break;
    const s = firstCellSoftenAt(field, f, soften);
    frames.push({ m, sigma: s.sigma, veil: s.veil });
    if (m) {
      peak.sigma = Math.max(peak.sigma, s.sigma / v.unit);
      peak.veil = Math.max(peak.veil, s.veil);
      peak.v = Math.max(peak.v, m.v);
    }
  }
  const key = JSON.stringify([aspect, v.w, v.h, field.fps, model, frames.map((F) => (F.m ? [F.m.rect.x, F.m.rect.y, F.m.rect.w, F.m.rect.h, F.sigma, F.veil].map((x) => Math.round(x * 100)) : 0))]);
  const hit = cache.get(key);
  if (hit) return hit;
  const G = PAGE_LUM;
  const windows: FirstCellFlash["windows"] = {};
  const covX = new Float64Array(g.w);
  const covY = new Float64Array(g.h);
  const valX = new Float64Array(g.w);
  const valY = new Float64Array(g.h);
  const runs = [...model.rows.map((p) => ["rows", p] as const), ...model.cols.map((p) => ["cols", p] as const)];
  for (const [dir, p0] of runs) {
      const fr = new FlashRgb({ w: g.w, h: g.h, fps: field.fps, srcW: v.w, aspect, lean: true });
      const grey = new Uint8Array(g.w * g.h);
      for (const F of frames) {
        grey.fill(toByte(G));
        const r = F.m?.rect;
        if (r && F.m) {
          const sC = F.sigma / F.m.k;
          for (let gx = 0; gx < g.w; gx++) {
            const a = Math.max(gx * PX, r.x);
            const b = Math.min((gx + 1) * PX, r.x + r.w);
            covX[gx] = b > a ? (b - a) / PX : 0;
            valX[gx] = b > a && dir === "cols" ? squareMean((a - r.x) / F.m.k, (b - r.x) / F.m.k, p0, sC) : 0;
          }
          for (let gy = 0; gy < g.h; gy++) {
            const a = Math.max(gy * PX, r.y);
            const b = Math.min((gy + 1) * PX, r.y + r.h);
            covY[gy] = b > a ? (b - a) / PX : 0;
            valY[gy] = b > a && dir === "rows" ? squareMean((a - r.y) / F.m.k, (b - r.y) / F.m.k, p0, sC) : 0;
          }
          for (let gy = 0; gy < g.h; gy++) {
            if (!covY[gy]) continue;
            for (let gx = 0; gx < g.w; gx++) {
              if (!covX[gx]) continue;
              const m = dir === "rows" ? valY[gy]! : valX[gx]!;
              const inside = (1 - F.veil) * (1 - model.ink * (1 - m)) + F.veil * G;
              const cov = covX[gx]! * covY[gy]!;
              grey[gy * g.w + gx] = toByte(cov * inside + (1 - cov) * G);
            }
          }
        }
        fr.pushGrey(grey);
      }
      const rep = fr.finish();
      for (const wn of rep.binding) {
        const x = rep.general[wn];
        if (x && (!windows[wn] || x.maxTransitions1s > windows[wn]!.n)) windows[wn] = { n: x.maxTransitions1s, at: x.at, pattern: `${dir} of ${p0} px` };
      }
    }
  const [wn, w] = Object.entries(windows).sort((a, b) => b[1].n - a[1].n)[0] ?? ["none", { n: 0, at: null, pattern: "" }];
  const out: FirstCellFlash = { worst: { window: wn, ...w }, windows, frames: frames.length, peak };
  cache.set(key, out);
  return out;
}
