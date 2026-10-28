// The coda's flash model (coda.ts codaLumaSeries, the check C8) calibrated against a render of the coda alone (OVERRIDES
// §65 on the post-credit review's P2-1: the model read page 2's ink at a fifth of each line's box and missed the rise the
// render showed before the closing iris's fall). From the render's 8-bit grey frames, as qa/reel-scan.ts measures them
// (shrunk to about 192 px by box averages, each small pixel decoded by qa/luma.ts's sRGB curve, 6 × 6 tiles), beside the
// model's on the same frames:
//   fit          the ink share (the share of a line's box its glyphs cover; CODA_LUMA.inkShare) by least squares, where
//                the model is affine in it: the page's ink on the frames before the closing iris (page 2's lines), the
//                night's ink on the frames after the opening one (the coda's lines), each on the tiles the lines touch
//   levels       the grounds the model draws against the render's: the page on L0 and the night plate on the last frame,
//                each over the tiles nothing else touches (render ÷ model)
//   flashes      opposing pairs of large luminance changes within a second (qa/luma.ts's rule), per tile and for the
//                whole frame: on the render, in the model as planned, and in the model with the fitted shares
//   transitions  where the render's large transitions and the model's disagree (more than `tol` frames apart, or one
//                with no partner of the same sign)
// The verdict (`ok`): no flash on the render (C8 as written: no opposing pair) and none in the model as fitted. The
// numbers say what to set (`recommend`); the plan's constants change only after someone looks at them.
// Pure; codaCalibrateCli.ts decodes a render and writes the report (a heavy job).
import { luminanceTransitions, maxFlashesPerSecond } from "../qa/luma";
import { shrink } from "../qa/stones";
import { CODA_LUMA, FLASH_GRID, codaLumaSeries, codaOf, type CodaLuma } from "./coda";
import type { ScenePlan } from "./scene";

/** Every tile's mean relative luminance frame by frame (row-major, FLASH_GRID × FLASH_GRID), and the whole frame's. */
export interface TileSeries {
  tiles: number[][];
  whole: number[];
}

const lin = (v8: number): number => {
  const v = v8 / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const LUT = Array.from({ length: 256 }, (_, i) => lin(i));

/**
 * A render's tile series, as qa/reel-scan.ts measures a frame for its luma checks: shrunk K× (K = round(longer side ÷
 * 192)) by box averages of the grey levels, each small pixel decoded by the sRGB curve, the tiles' means taken over the
 * small pixels each tile holds. Push the frames in order.
 */
export class RenderLuma {
  readonly K: number;
  readonly w: number;
  readonly h: number;
  readonly series: TileSeries;
  private readonly tileOf: Uint16Array;
  private readonly tilePx: number[];

  constructor(
    readonly W: number,
    readonly H: number,
    readonly G: number = FLASH_GRID,
  ) {
    this.K = Math.max(1, Math.round(Math.max(W, H) / 192));
    this.w = Math.floor(W / this.K);
    this.h = Math.floor(H / this.K);
    this.tileOf = new Uint16Array(this.w * this.h);
    this.tilePx = new Array(G * G).fill(0);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const t = Math.min(G - 1, Math.floor((y * G) / this.h)) * G + Math.min(G - 1, Math.floor((x * G) / this.w));
        this.tileOf[y * this.w + x] = t;
        this.tilePx[t] = (this.tilePx[t] ?? 0) + 1;
      }
    this.series = { tiles: Array.from({ length: G * G }, () => []), whole: [] };
  }

  /** One grey frame, W × H bytes. */
  push(frame: Uint8Array): void {
    const s = this.K > 1 ? shrink(frame, this.W, this.H, this.K).px : frame;
    const G = this.G;
    const t = new Array(G * G).fill(0);
    let whole = 0;
    for (let i = 0; i < this.w * this.h; i++) {
      const l = LUT[s[i]!]!;
      t[this.tileOf[i]!] += l;
      whole += l;
    }
    for (let k = 0; k < G * G; k++) this.series.tiles[k]!.push(t[k] / Math.max(1, this.tilePx[k]!));
    this.series.whole.push(whole / (this.w * this.h));
  }
}

/** A tile's name as the reports write it (row, column), or the whole frame's. */
const where = (k: number, G: number): string => (k === G * G ? "the whole frame" : `tile ${Math.floor(k / G)},${k % G}`);

/** The worst flash count in any second, per series (each tile, then the whole frame). */
export function flashesOf(s: TileSeries, fps: number): { worst: number; where: string; at: number; flashing: { where: string; flashes: number; at: number }[] } {
  const G = Math.round(Math.sqrt(s.tiles.length));
  const all = [...s.tiles, s.whole];
  const flashing: { where: string; flashes: number; at: number }[] = [];
  let worst = { worst: 0, where: "none", at: -1 };
  all.forEach((series, k) => {
    const m = maxFlashesPerSecond(luminanceTransitions(series), fps);
    if (m.max > 0) flashing.push({ where: where(k, G), flashes: m.max, at: m.at });
    if (m.max > worst.worst) worst = { worst: m.max, where: where(k, G), at: m.at };
  });
  return { ...worst, flashing };
}

/** Where two series' large transitions disagree: a transition with no partner of the same sign within `tol` frames. */
export function transitionDiffs(model: TileSeries, render: TileSeries, tol = 2): { where: string; render: string; model: string }[] {
  const G = Math.round(Math.sqrt(model.tiles.length));
  const fmt = (tr: { frame: number; dir: number }[]) => tr.map((x) => `${x.frame}${x.dir > 0 ? "+" : "−"}`).join(" ");
  const out: { where: string; render: string; model: string }[] = [];
  const ms = [...model.tiles, model.whole];
  const rs = [...render.tiles, render.whole];
  ms.forEach((m, k) => {
    const a = luminanceTransitions(m);
    const b = luminanceTransitions(rs[k] ?? []);
    const unmatched = (xs: typeof a, ys: typeof a) => xs.some((x) => !ys.some((y) => y.dir === x.dir && Math.abs(y.frame - x.frame) <= tol));
    if (unmatched(a, b) || unmatched(b, a)) out.push({ where: where(k, G), render: fmt(b), model: fmt(a) });
  });
  return out;
}

/** A least-squares fit of the ink share on some frames: the share, the samples it used, and the RMS error before and after. */
export interface InkFit {
  share: number | null;
  samples: number;
  rmsPlanned: number;
  rmsFitted: number;
}

/**
 * The ink share that best fits the render on `frames` (local frames of the plan): the model is A + B·share in every
 * tile (a line's glyphs scale its box's step from its ground), so share = Σ B(R − A) ÷ Σ B² over the tiles where a line
 * moves the model (|B| > 1e-4). null when no line is on those frames.
 */
export function fitInkShare(p: ScenePlan, render: TileSeries, frames: readonly number[], base: Readonly<CodaLuma> = CODA_LUMA): InkFit {
  let sbb = 0;
  let sbr = 0;
  const rows: { A: number; B: number; R: number }[] = [];
  for (const fr of frames) {
    if (fr < 0 || fr >= p.duration || render.whole[fr] === undefined) continue;
    const a = codaLumaSeries(p, fr, fr + 1, { ...base, inkShare: 0 });
    const b = codaLumaSeries(p, fr, fr + 1, { ...base, inkShare: 1 });
    a.tiles.forEach((col, k) => {
      const A = col[0]!;
      const B = b.tiles[k]![0]! - A;
      const R = render.tiles[k]![fr]!;
      if (Math.abs(B) <= 1e-4 || R === undefined) return;
      rows.push({ A, B, R });
      sbb += B * B;
      sbr += B * (R - A);
    });
  }
  if (!rows.length || sbb <= 0) return { share: null, samples: 0, rmsPlanned: 0, rmsFitted: 0 };
  const share = sbr / sbb;
  const rms = (s: number) => Math.sqrt(rows.reduce((t, r) => t + (r.A + r.B * s - r.R) ** 2, 0) / rows.length);
  return { share, samples: rows.length, rmsPlanned: rms(base.inkShare), rmsFitted: rms(share) };
}

/**
 * A ground's level in the render against the model's, over the tiles that show only that ground on a frame (the model's
 * tile equal to the ground's own value): the render's mean ÷ the model's. null when no tile shows only it.
 */
export function groundLevel(model: TileSeries, render: TileSeries, fr: number, value: number): { ratio: number | null; tiles: number } {
  let m = 0;
  let r = 0;
  let n = 0;
  model.tiles.forEach((col, k) => {
    const v = col[fr];
    const q = render.tiles[k]?.[fr];
    if (v === undefined || q === undefined || Math.abs(v - value) > 1e-9) return;
    m += v;
    r += q;
    n++;
  });
  return { ratio: n && m > 0 ? r / m : null, tiles: n };
}

/** The calibration's report. */
export interface CodaCalibration {
  plan: string;
  frames: { plan: number; render: number };
  fit: { page: InkFit; night: InkFit };
  levels: { page: { ratio: number | null; tiles: number }; plate: { ratio: number | null; tiles: number } };
  flashes: { render: ReturnType<typeof flashesOf>; planned: ReturnType<typeof flashesOf>; fitted: ReturnType<typeof flashesOf> };
  transitions: ReturnType<typeof transitionDiffs>;
  recommend: string[];
  problems: string[];
  ok: boolean;
}

/** The share of CODA_LUMA.inkShare a fitted share may stray before the report recommends setting it. */
export const INK_SHARE_TOLERANCE = 0.25;

/** The coda's flash model against a render of it (the render's tile series, frame 0 = the coda's L0). */
export function calibrate(p: ScenePlan, render: TileSeries, o: { tol?: number; base?: Readonly<CodaLuma> } = {}): CodaCalibration {
  const x = codaOf(p);
  if (!x) throw new Error(`${p.id} is not the coda`);
  const base = o.base ?? CODA_LUMA;
  const problems: string[] = [];
  const recommend: string[] = [];
  const n = render.whole.length;
  if (n !== p.duration) problems.push(`the render has ${n} frames; the plan ${p.duration}: render the coda alone (F2-SP-coda-<aspect>), whole`);
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
  const page = fitInkShare(p, render, range(0, x.irisOut.at), base);
  const night = fitInkShare(p, render, range(x.irisIn.at + x.irisIn.frames, p.duration), base);
  const fitted: CodaLuma = { ...base };
  const shares = [page.share, night.share].filter((s): s is number => s !== null && s > 0);
  if (shares.length) fitted.inkShare = Math.max(...shares);
  for (const [name, f] of [["page 2's ink", page], ["the night's ink", night]] as const)
    if (f.share !== null && Math.abs(f.share - base.inkShare) > INK_SHARE_TOLERANCE * base.inkShare) recommend.push(`${name}: the render fits an ink share of ${f.share.toFixed(3)} (RMS ${f.rmsFitted.toFixed(4)}, ${f.samples} tile samples) against CODA_LUMA.inkShare ${base.inkShare} (RMS ${f.rmsPlanned.toFixed(4)}): set it from the larger of the two (the stricter model)`);
  const planned = codaLumaSeries(p, 0, p.duration, base);
  const model = codaLumaSeries(p, 0, p.duration, fitted);
  const levels = { page: groundLevel(planned, render, 0, base.page), plate: groundLevel(planned, render, p.duration - 1, base.plate) };
  for (const [name, l] of [["the page (L0)", levels.page], ["the night plate (the last frame)", levels.plate]] as const)
    if (l.ratio !== null && Math.abs(l.ratio - 1) > 0.2) recommend.push(`${name}: the render's level is ${l.ratio.toFixed(2)}× the model's over ${l.tiles} tiles: recalibrate CODA_LUMA from the render`);
  const flashes = { render: flashesOf(render, p.fps), planned: flashesOf(planned, p.fps), fitted: flashesOf(model, p.fps) };
  if (flashes.render.worst > 0) problems.push(`the render flashes: ${flashes.render.flashing.map((f) => `${f.where} ${f.flashes} from L${f.at}`).join("; ")} (C8: no opposing pair)`);
  if (flashes.fitted.worst > 0) problems.push(`the model with the fitted ink share flashes: ${flashes.fitted.flashing.map((f) => `${f.where} ${f.flashes} from L${f.at}`).join("; ")}`);
  if (flashes.render.worst > 0 && flashes.planned.worst === 0) recommend.push("the render flashes where the model as planned does not: the model misses it (the review's P2-1)");
  return {
    plan: p.name,
    frames: { plan: p.duration, render: n },
    fit: { page, night },
    levels,
    flashes,
    transitions: transitionDiffs(model, render, o.tol ?? 2),
    recommend,
    problems,
    ok: problems.length === 0,
  };
}
