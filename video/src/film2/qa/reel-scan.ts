// The render checks on a reel, frame by frame (pure: qa/luma-scan.ts feeds it the decoded frames; the tests feed it
// synthetic ones). With the plans' marks (setpieces/tools/reel-marks.ts --out) it runs, besides qa/luma.ts on frames
// shrunk to about 192 px:
//   ink      the ink in every line's rect (qa/ink.ts; CR-03)
//   stones   the stone-sized dark blobs around the plan's stones (qa/stones.ts; CR-01)
//   bands    the Drop's bands and the frame they start to open (qa/bands.ts; CR-07)
// and it holds tile pops to what a viewer sees as a pop (calibrated on the three set-piece reels, 27 Oct):
//   - 3 levels in a tile, not 2: the encoder's pulses and the pebble's blinks measured 2.0–2.9 in still tiles, while a
//     vanishing line measured 9.3–15.5, a 2–4 frame exit 4.0–21.8 and a card popping in 4.0–9.3;
//   - a change that a shift of up to 2 px of the previous frame explains, or that keeps the tile's mean (its ink and
//     light) within a quarter of its difference, is a move, not a pop: glyphs settling a pixel at the end of a slow
//     rise measured 2.0–8.3 in a tile but changed its mean by at most 0.11 of that, while every line or card that
//     appeared, vanished or faded changed it by 0.44–0.97;
//   - a line's declared entrance (a rise from its mask, a blur-in) is a designed reveal, not judged here (its timing is
//     the plan's: a 12-frame floor on slams belongs there); a card's entrance is judged, and named;
//   - every pop names what its tile shows, for triage (a line's exit, a line that stops being drawn, a card arriving).
// Only small frames, the previous full frame and per-frame numbers are kept.
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
  /** transitions' frames [from, to): designed changes tile pops do not judge */
  transitions?: { from: number; to: number }[];
  waits: string[];
  hits: number[];
  types: (InkTrack & { vanishes?: string })[];
  stones: { from: number; to: number; count: number; rMin: number; rMax: number }[];
  /** each frame's stones as the plan draws them: [centre x, centre y, radius], the plans' frame px */
  stoneAt?: Record<number, [number, number, number][]>;
  /** planes' card entrances and placeholder stills' entrances, to name what a tile pop shows */
  entrances?: { id: string; from: number; to: number; kind: string }[];
  apertures: { piece: string; hit: number; planOpen: number; rest: { from: number; to: number } }[];
}

export interface ReelScanReport {
  luma: LumaReport;
  ink: InkFinding[];
  inkSeries: Record<string, Record<number, number>>;
  stones: { framesChecked: number; twoStoneRuns: { from: number; to: number; most: number }[]; frames: { frame: number; expect: number; blobs: number; diameters1080: number[]; at1080: [number, number][] }[] };
  /** tile pops a shift of up to 2 px explains (settles), and what each remaining pop's tile shows */
  settles: number;
  popCauses: { frame: number; tile: number; cause: string; mad: number }[];
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
  private prevFull: Uint8Array | null = null;
  private prevSmall: Uint8Array | null = null;
  private tileOf: Uint16Array;
  private tilePx: number[];
  private lastTileMad: number[][];
  /** for (frame, tile) candidates, at full size: the best shifted difference over the unshifted one, and the change of
   * the tile's mean over its difference */
  private moveTest = new Map<string, { shiftRatio: number; meanShare: number }>();

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
    const G = TILE_GRID;
    this.tileOf = new Uint16Array(this.smallW * this.smallH);
    this.tilePx = new Array(G * G).fill(0);
    for (let y = 0; y < this.smallH; y++) {
      const ty = Math.min(G - 1, Math.floor((y * G) / this.smallH));
      for (let x = 0; x < this.smallW; x++) {
        const t = ty * G + Math.min(G - 1, Math.floor((x * G) / this.smallW));
        this.tileOf[y * this.smallW + x] = t;
        this.tilePx[t]++;
      }
    }
    this.lastTileMad = Array.from({ length: G * G }, () => []);
  }

  /** A tile's rect at full size (the small frame's tile, scaled back by K). */
  private tileRect(t: number): Rect {
    const G = TILE_GRID;
    const row = Math.floor(t / G);
    const col = t % G;
    const x0 = Math.ceil((col * this.smallW) / G);
    const x1 = Math.ceil(((col + 1) * this.smallW) / G);
    const y0 = Math.ceil((row * this.smallH) / G);
    const y1 = Math.ceil(((row + 1) * this.smallH) / G);
    return { x: x0 * this.K, y: y0 * this.K, w: (x1 - x0) * this.K, h: (y1 - y0) * this.K };
  }

  /**
   * Is a tile's change between two full frames a move? The best difference over shifts of up to ±2 px over the
   * unshifted one (a shift explains it when that is small), and the change of the tile's mean over its difference (a
   * move keeps the mean; an appearance, a vanish or a fade changes it).
   */
  private moveOf(prev: Uint8Array, cur: Uint8Array, r: Rect): { shiftRatio: number; meanShare: number } {
    const { W, H } = this;
    const x0 = Math.max(2, r.x);
    const y0 = Math.max(2, r.y);
    const x1 = Math.min(W - 2, r.x + r.w);
    const y1 = Math.min(H - 2, r.y + r.h);
    let unshifted = 0;
    let best = Infinity;
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      sum += cur[y * W + x]! - prev[y * W + x]!;
      n++;
    }
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        let d = 0;
        for (let y = y0; y < y1; y++) {
          const row = y * W;
          const prow = (y + dy) * W + dx;
          for (let x = x0; x < x1; x++) d += Math.abs(cur[row + x]! - prev[prow + x]!);
        }
        if (dx === 0 && dy === 0) unshifted = d;
        if (d < best) best = d;
      }
    return unshifted > 0 ? { shiftRatio: best / unshifted, meanShare: Math.abs(sum) / unshifted } : { shiftRatio: 1, meanShare: 1 };
  }

  push(px: Uint8Array): void {
    const f = this.frameNo++;
    const { W, H, K, S, marks } = this;
    const s = K > 1 ? shrink(px, W, H, K) : { px: px.slice(), w: W, h: H };
    this.small.push(s.px);
    // tile differences on the small frame; a tile that stands above its last three frames is a pop candidate, and
    // whether a small shift of the previous full frame explains it is decided now, while that frame is at hand
    if (this.prevSmall && this.prevFull) {
      const G = TILE_GRID;
      const td = new Array(G * G).fill(0);
      for (let i = 0; i < s.px.length; i++) td[this.tileOf[i]!] += Math.abs(s.px[i]! - this.prevSmall[i]!);
      for (let t = 0; t < G * G; t++) {
        const v = td[t] / Math.max(1, this.tilePx[t]);
        const last = this.lastTileMad[t]!;
        const before = last.length === 3 ? [...last].sort((a, b) => a - b)[1]! : 0;
        if (v > TILE_POP_REEL.minLevels && v > TILE_POP_REEL.ratio * Math.max(before, 0.05)) this.moveTest.set(`${f}:${t}`, this.moveOf(this.prevFull, px, this.tileRect(t)));
        last.push(v);
        if (last.length > 3) last.shift();
      }
    }
    this.prevSmall = s.px;
    this.prevFull = px.slice();
    this.tracks.forEach((t, i) => {
      if (f >= t.from - INK.withinFrames && f < t.until + INK.withinFrames + 1) this.ink[i]![f] = inkIn(px, W, H, t.rect, t.polarity, INK.noise, t.inkLuma);
    });
    const run = marks.stones.find((x) => f >= x.from && f < x.to);
    if (run) {
      // blobs on the frame shrunk 2× (a stone is 15–100 px across there); a blob inside a line of type on screen is a
      // glyph (Fraunces at 72–96 px makes compact dark shapes), not a stone
      const h2 = shrink(px, W, H, 2);
      const k = S / 2;
      const typeRects = this.tracks.filter((t) => f >= t.from && f < t.until).map((t) => ({ x: t.rect.x / 2 - 2, y: t.rect.y / 2 - 2, w: t.rect.w / 2 + 4, h: t.rect.h / 2 + 4 }));
      // around the plan's stones on this frame: within 4 of their radii (two stones of a bad match are 2–3 apart)
      const near = (marks.stoneAt?.[f] ?? []).map(([x, y, r]) => ({ x: x * k, y: y * k, R: 4 * r * k }));
      const rs = (marks.stoneAt?.[f] ?? []).map((s) => s[2]);
      const rMin = rs.length ? Math.min(...rs) : run.rMin;
      const rMax = rs.length ? Math.max(...rs) : run.rMax;
      const blobs = stoneBlobs(h2.px, h2.w, h2.h, { minR: Math.max(3, rMin * k * 0.5), maxR: rMax * k * 1.6 }).filter(
        (b) => !typeRects.some((r) => b.cx >= r.x && b.cx < r.x + r.w && b.cy >= r.y && b.cy < r.y + r.h) && (!marks.stoneAt || near.some((n) => Math.hypot(b.cx - n.x, b.cy - n.y) <= n.R)),
      );
      // each blob's diameter and centre in px at 1080: shrunk px → render px (×2) → the plans' px (÷S) → at 1080
      const unit1080 = Math.min(marks.width, marks.height) / 1080;
      this.stoneAt.push({
        frame: f,
        expect: run.count,
        blobs: blobs.length,
        diameters1080: blobs.map((b) => Math.round((b.r * 4) / S / unit1080)),
        at1080: blobs.map((b) => [Math.round((b.cx * 2) / S / unit1080), Math.round((b.cy * 2) / S / unit1080)]),
      });
    }
    if (marks.apertures.some((a) => f >= a.rest.from && f < a.hit + 90)) this.bands[f] = bandHeights(px, W, H);
  }

  get frames(): number {
    return this.frameNo;
  }

  finish(fps = this.marks.fps): ReelScanReport {
    const lumaAll = analyseLuma(this.small, { fps, width: this.smallW, height: this.smallH, cuts: this.marks.cuts, transitions: this.marks.transitions ?? [], waits: parseWaits(this.marks.waits.join(",")), tilePop: TILE_POP_REEL });
    // a change that a small shift explains, or that keeps the tile's mean, is a move (glyphs settling, the camera), not a pop
    const tilePops = lumaAll.tilePops.filter((p) => {
      const m = this.moveTest.get(`${p.frame}:${p.tile}`) ?? { shiftRatio: 1, meanShare: 1 };
      return m.shiftRatio >= TILE_POP_REEL.unexplainedShare && m.meanShare >= TILE_POP_REEL.meanShare;
    });
    const settles = lumaAll.tilePops.length - tilePops.length;
    const named = tilePops.map((p) => ({ p, cause: this.causeOf(p.frame, this.tileRect(p.tile)) }));
    // a line's own declared entrance is a designed reveal (its timing is checked on the plan)
    const judged = named.filter((x) => !x.cause.startsWith("the entrance of "));
    const popCauses = judged.map(({ p, cause }) => ({ frame: p.frame, tile: p.tile, mad: p.mad, cause }));
    const luma = { ...lumaAll, tilePops: judged.map((x) => x.p), problems: lumaAll.problems.filter((x) => !x.startsWith("tile pops")) };
    const problems = [...luma.problems];
    // one problem per cause and run of frames, so the fix lane sees what popped
    const groups: { cause: string; from: number; to: number; most: number }[] = [];
    for (const c of [...popCauses].sort((a, b) => a.frame - b.frame)) {
      const g = groups.find((x) => x.cause === c.cause && c.frame <= x.to + 3);
      if (g) {
        g.to = Math.max(g.to, c.frame);
        g.most = Math.max(g.most, c.mad);
      } else groups.push({ cause: c.cause, from: c.frame, to: c.frame, most: c.mad });
    }
    for (const g of groups) problems.push(`tile pop: ${g.cause}, frames ${g.from}${g.to > g.from ? `–${g.to}` : ""} (up to ${g.most.toFixed(1)} levels in its tile)`);
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
    return { luma, ink, inkSeries, stones: { framesChecked: this.stoneAt.length, twoStoneRuns: runs, frames: this.stoneAt }, apertures, settles, popCauses, problems };
  }

  /** What a tile shows on a frame, per the plan's lines: an exit, an entrance, a line that stops being drawn … */
  private causeOf(f: number, tile: Rect): string {
    const over = this.tracks.filter((t) => t.rect.x < tile.x + tile.w && t.rect.x + t.rect.w > tile.x && t.rect.y < tile.y + tile.h && t.rect.y + t.rect.h > tile.y);
    for (const t of over) if (f >= t.until - 1 && f <= t.until + 1 && !t.exits.some((e) => f >= e.from - 1 && f <= e.to + 1)) return `${t.id} stops being drawn`;
    // of the exits under way, the fastest (two lines leaving together: the quicker one is what pops)
    const leaving = over.flatMap((t) => t.exits.filter((e) => f >= e.from - 1 && f <= e.to + 1).map((e) => ({ t, e }))).sort((x, y) => x.e.to - x.e.from - (y.e.to - y.e.from));
    if (leaving.length) return `the ${leaving[0]!.e.kind} exit of ${leaving[0]!.t.id} (${leaving[0]!.e.to - leaving[0]!.e.from} frames)`;
    for (const t of over) if (f >= t.from - 1 && f <= t.landed + 2) return `the entrance of ${t.id}`;
    for (const e of this.marks.entrances ?? []) if (f >= e.from - 1 && f <= e.to) return `the ${e.kind} of ${e.id}`;
    for (const t of over) if (f > t.landed && f < t.until) return `under ${t.id} while it is held (a plane or a card behind it)`;
    return "no line here (a plane, a card or the stone: look at it)";
  }
}

/** The tile grid of the luma checks (WCAG's 2.8 % areas). */
const TILE_GRID = 6;

/**
 * Tile pops on a reel: 3 levels, 3× both sides, at least half the change not explained by a 2 px shift, and the tile's
 * mean changed by at least a quarter of its difference.
 */
export const TILE_POP_REEL = { minLevels: 3, ratio: 3, unexplainedShare: 0.5, meanShare: 0.25 } as const;
