// The render checks on a reel, frame by frame (pure: qa/luma-scan.ts feeds it the decoded frames; the tests feed it
// synthetic ones). With the plans' marks (setpieces/tools/reel-marks.ts --out) it runs, besides qa/luma.ts on frames
// shrunk to about 192 px:
//   ink      the ink in every line's rect (qa/ink.ts; CR-03)
//   stones   the stone-sized dark blobs wherever the plan shows the stone (qa/stones.ts; CR-01)
//   bands    the Drop's bands and the frame they start to open (qa/bands.ts; CR-07)
// Only small frames and per-frame numbers are kept.
import type { Rect } from "../motion/geometry";
import { analyseLuma, type LumaReport } from "./luma";
import { INK, inkIn, judgeInk, type InkFinding, type InkTrack } from "./ink";
import { shrink, stoneBlobs } from "./stones";
import { bandHeights, openingStart, type BandHeights } from "./bands";

/** What reel-marks.ts writes: reel frames, and rects and radii in the plans' frame px. */
export interface ReelMarks {
  aspect: string;
  fps: number;
  width: number;
  height: number;
  total: number;
  cuts: number[];
  waits: string[];
  hits: number[];
  types: (InkTrack & { vanishes?: string })[];
  stones: { from: number; to: number; count: number; rMin: number; rMax: number }[];
  apertures: { piece: string; hit: number; planOpen: number; rest: { from: number; to: number } }[];
}

export interface ReelScanReport {
  luma: LumaReport;
  ink: InkFinding[];
  inkSeries: Record<string, Record<number, number>>;
  stones: { framesChecked: number; twoStoneRuns: { from: number; to: number; most: number }[]; frames: { frame: number; expect: number; blobs: number; diameters1080: number[] }[] };
  apertures: { piece: string; hit: number; planOpen: number; renderOpen: number | null; framesFromHit: number | null; trace: Record<number, BandHeights> }[];
  problems: string[];
}

export const parseWaits = (s: string) =>
  s
    .split(",")
    .filter(Boolean)
    .map((r) => {
      const [a, b] = r.split("-").map(Number);
      return { from: a!, to: b! };
    });

/** Feeds a reel's grey frames (W × H, the render's own size) in order; finish() judges them. */
export class ReelScan {
  readonly K: number;
  readonly S: number;
  private frameNo = 0;
  private small: Uint8Array[] = [];
  private smallW: number;
  private smallH: number;
  private tracks: InkTrack[];
  private ink: (number | undefined)[][];
  private stoneAt: ReelScanReport["stones"]["frames"] = [];
  private bands: (BandHeights | undefined)[] = [];

  constructor(
    readonly W: number,
    readonly H: number,
    readonly marks: ReelMarks,
  ) {
    this.K = Math.max(1, Math.round(Math.max(W, H) / 192));
    this.S = W / marks.width;
    this.smallW = Math.floor(W / this.K);
    this.smallH = Math.floor(H / this.K);
    const s = this.S;
    const scale = (r: Rect): Rect => ({ x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s });
    this.tracks = marks.types.map((t) => ({ ...t, rect: scale(t.rect) }));
    this.ink = this.tracks.map(() => []);
  }

  push(px: Uint8Array): void {
    const f = this.frameNo++;
    const { W, H, K, S, marks } = this;
    const s = K > 1 ? shrink(px, W, H, K) : { px: px.slice(), w: W, h: H };
    this.small.push(s.px);
    this.tracks.forEach((t, i) => {
      if (f >= t.from - INK.withinFrames && f < t.until + INK.withinFrames + 1) this.ink[i]![f] = inkIn(px, W, H, t.rect, t.polarity);
    });
    const run = marks.stones.find((x) => f >= x.from && f < x.to);
    if (run) {
      // blobs on the frame shrunk 2× (a stone is 15–100 px across there)
      const h2 = shrink(px, W, H, 2);
      const k = S / 2;
      const blobs = stoneBlobs(h2.px, h2.w, h2.h, { minR: Math.max(3, run.rMin * k * 0.5), maxR: run.rMax * k * 1.6 });
      // each blob's diameter in px at 1080: shrunk px → render px (×2) → the plans' px (÷S) → at 1080
      const unit1080 = Math.min(marks.width, marks.height) / 1080;
      this.stoneAt.push({ frame: f, expect: run.count, blobs: blobs.length, diameters1080: blobs.map((b) => Math.round((b.r * 4) / S / unit1080)) });
    }
    if (marks.apertures.some((a) => f >= a.rest.from && f < a.hit + 90)) this.bands[f] = bandHeights(px, W, H);
  }

  get frames(): number {
    return this.frameNo;
  }

  finish(fps = this.marks.fps): ReelScanReport {
    const luma = analyseLuma(this.small, { fps, width: this.smallW, height: this.smallH, cuts: this.marks.cuts, waits: parseWaits(this.marks.waits.join(",")) });
    const problems = [...luma.problems];
    const ink: InkFinding[] = [];
    this.tracks.forEach((t, i) => ink.push(...judgeInk(t, this.ink[i]!)));
    for (const x of ink) if (x.kind === "vanish") problems.push(`ink: ${x.message}`);
    const runs: { from: number; to: number; most: number }[] = [];
    for (const s of this.stoneAt.filter((x) => x.blobs >= 2)) {
      const last = runs[runs.length - 1];
      if (last && s.frame === last.to) {
        last.to++;
        last.most = Math.max(last.most, s.blobs);
      } else runs.push({ from: s.frame, to: s.frame + 1, most: s.blobs });
    }
    for (const x of runs) problems.push(`stones: ${x.most} stone-sized dark blobs on frames ${x.from}–${x.to} (one stone only, CR-01)`);
    const apertures = this.marks.apertures.map((a) => {
      const open = openingStart(this.bands, a.rest, a.rest.to);
      const late = open === null ? null : open - a.hit;
      if (open === null) problems.push(`bands: the ${a.piece}'s bands never open in the render`);
      else if (Math.abs(late!) > 2) problems.push(`bands: the ${a.piece}'s bands start to open on frame ${open}, ${late} frames from the hit (${a.hit}); within 2 (CR-07)`);
      const trace: Record<number, BandHeights> = {};
      for (let f = a.rest.from; f < a.hit + 90; f++) if (this.bands[f]) trace[f] = this.bands[f]!;
      return { ...a, renderOpen: open, framesFromHit: late, trace };
    });
    const inkSeries = Object.fromEntries(this.tracks.map((t, i) => [t.id, Object.fromEntries(Object.entries(this.ink[i]!).map(([f, v]) => [Number(f), Math.round(v! * 10) / 10]))]));
    return { luma, ink, inkSeries, stones: { framesChecked: this.stoneAt.length, twoStoneRuns: runs, frames: this.stoneAt }, apertures, problems };
  }
}
