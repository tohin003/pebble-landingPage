// Pixel checks on a render (TREATMENT §5.5 "Luminance and flashes ... on a low-resolution render", "Dead frames"),
// pure analysis of 8-bit grey frames. qa/luma-scan.ts decodes a video into such frames with FFmpeg (a heavy job: run it
// through scripts/heavy.sh) and calls analyseLuma().
//
// - Flashes (WCAG 2.3.1, general flash): a flash is a pair of opposing changes in relative luminance of 10 % or more of
//   the maximum, where the darker state is below 0.80. Any area of a quarter of a 10° field counts: about 2.8 % of the
//   screen, so the frame is cut into a 6 × 6 grid of tiles (2.8 % each) and every tile is checked, plus the whole
//   frame. At most three flashes (six opposing transitions) in any one second.
// - Dead frames: a window of 1 s whose last frame (and middle frame) differ from its first by less than `deadMad`
//   levels on average, outside the waiting states given. Comparing across the whole second, not frame to frame, is what
//   catches a frame that is "moving" too slowly to see: a 0.2 px drift a frame is a still to the eye, and frame-to-frame
//   differences of a slow drift are below any noise threshold even when the second as a whole does change (measured
//   on the demo's first render: frame-to-frame MAD missed nothing and flagged everything slow).
// - Pops: a frame-to-frame difference more than 3× the median of its six neighbours and above 2 levels, away from the
//   cuts given (a hard cut is meant to differ) (TOOLS_TESTS §1's definition).
// - Tile pops (added after the craft review, CR-03/CR-15): the same rule per tile of the 6 × 6 grid, each tile judged
//   against its own six neighbours in time. A line that vanishes is a few percent of the frame: the whole-frame
//   difference cannot see it ("Its own tools." left in 2 frames at a whole-frame MAD of 3.15, inside its moving
//   neighbours' 2.2–2.9), but in its own tile it is most of the change.
// - Dips: a seam whose mean luma falls more than 3 levels below both sides (a crossfade over a third layer).

export interface LumaOptions {
  fps: number;
  width: number;
  height: number;
  /** composition frames where a hard cut or a transition starts (pops there are expected) */
  cuts?: readonly number[];
  /** waiting states inside takes (still frames allowed) */
  waits?: readonly { from: number; to: number }[];
  /** mean absolute difference (8-bit levels) between a window's first and last frames below which it counts as dead */
  deadMad?: number;
  grid?: number;
  /** a tile pop: its frame-to-frame difference above `minLevels` and above `ratio` × the median of its own neighbours */
  tilePop?: { minLevels?: number; ratio?: number };
}

/** One tile's pop: the tile (row-major in the grid), its difference and the median of its own six neighbours. */
export interface TilePop {
  frame: number;
  tile: number;
  row: number;
  col: number;
  mad: number;
  neighbours: number;
}

export interface LumaReport {
  frames: number;
  meanLuma: number[];
  mad: number[];
  maxFlashesPerSecond: number;
  flashFrames: number[];
  deadRuns: { from: number; to: number; seconds: number }[];
  pops: number[];
  tilePops: TilePop[];
  dips: { at: number; depth: number }[];
  ok: boolean;
  problems: string[];
}

/** The tile-pop thresholds: the whole-frame rule's (above 2 levels, above 3× the neighbours' median). */
export const TILE_POP = { minLevels: 2, ratio: 3 } as const;

/**
 * Tile pops from per-tile frame differences (`tileMad[tile][frame]`, frame 0 is 0): a tile's difference above
 * `minLevels` and above `ratio` × the median of its own six neighbours (frames f−3…f+3 but f), away from the cuts
 * (±1 frame). Pure: analyseLuma() and qa/luma-scan.ts call it.
 */
export function findTilePops(tileMad: readonly (readonly number[])[], grid: number, cuts: readonly number[] = [], o: { minLevels?: number; ratio?: number } = {}): TilePop[] {
  const minLevels = o.minLevels ?? TILE_POP.minLevels;
  const ratio = o.ratio ?? TILE_POP.ratio;
  const near = new Set<number>();
  for (const c of cuts) for (let k = -1; k <= 1; k++) near.add(c + k);
  const out: TilePop[] = [];
  tileMad.forEach((series, tile) => {
    const n = series.length;
    for (let f = 3; f < n - 3; f++) {
      if (near.has(f)) continue;
      const v = series[f]!;
      if (v <= minLevels) continue;
      const m = median([series[f - 3]!, series[f - 2]!, series[f - 1]!, series[f + 1]!, series[f + 2]!, series[f + 3]!]);
      if (v > ratio * Math.max(m, 0.05)) out.push({ frame: f, tile, row: Math.floor(tile / grid), col: tile % grid, mad: Math.round(v * 100) / 100, neighbours: Math.round(m * 100) / 100 });
    }
  });
  return out.sort((a, b) => a.frame - b.frame || a.tile - b.tile);
}

const lin = (v8: number) => {
  const v = v8 / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const LUT = Array.from({ length: 256 }, (_, i) => lin(i));

/** Transitions of ≥ 0.1 relative luminance with the darker end below 0.8, as (frame, direction). */
export const luminanceTransitions = (series: readonly number[]): { frame: number; dir: number }[] => {
  const out: { frame: number; dir: number }[] = [];
  let anchor = 0;
  let dir = 0;
  for (let f = 1; f < series.length; f++) {
    const d = Math.sign(series[f]! - series[f - 1]!);
    if (d !== 0 && d !== dir) {
      anchor = f - 1;
      dir = d;
    }
    const a = series[anchor]!;
    const b = series[f]!;
    if (dir !== 0 && Math.abs(b - a) >= 0.1 && Math.min(a, b) < 0.8) {
      out.push({ frame: f, dir });
      anchor = f;
    }
  }
  return out;
};

/** The most flashes (pairs of opposing transitions) in any window of `fps` frames. */
export const maxFlashesPerSecond = (tr: readonly { frame: number; dir: number }[], fps: number): { max: number; at: number } => {
  let max = 0;
  let at = -1;
  for (let i = 0; i < tr.length; i++) {
    const inWin = tr.filter((x) => x.frame >= tr[i]!.frame && x.frame < tr[i]!.frame + fps);
    let opposing = 0;
    for (let k = 1; k < inWin.length; k++) if (inWin[k]!.dir !== inWin[k - 1]!.dir) opposing++;
    const flashes = Math.floor((opposing + 1) / 2);
    if (flashes > max) {
      max = flashes;
      at = tr[i]!.frame;
    }
  }
  return { max, at };
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export function analyseLuma(frames: readonly Uint8Array[], o: LumaOptions): LumaReport {
  const n = frames.length;
  const W = o.width;
  const H = o.height;
  const G = o.grid ?? 6;
  const deadMad = o.deadMad ?? 0.3;
  const meanLuma: number[] = [];
  const tileL: number[][] = Array.from({ length: G * G + 1 }, () => []);
  const mad: number[] = [0];
  // each pixel's tile, and each tile's pixel count
  const tileOf = new Uint16Array(W * H);
  const tilePx = new Array(G * G).fill(0);
  for (let y = 0; y < H; y++) {
    const ty = Math.min(G - 1, Math.floor((y * G) / H));
    for (let x = 0; x < W; x++) {
      const t = ty * G + Math.min(G - 1, Math.floor((x * G) / W));
      tileOf[y * W + x] = t;
      tilePx[t]++;
    }
  }
  const tileMad: number[][] = Array.from({ length: G * G }, () => [0]);
  for (let f = 0; f < n; f++) {
    const px = frames[f]!;
    let sum = 0;
    const tiles = new Array(G * G).fill(0);
    let wholeLin = 0;
    for (let i = 0; i < W * H; i++) {
      const v = px[i]!;
      sum += v;
      const l = LUT[v]!;
      wholeLin += l;
      tiles[tileOf[i]!] += l;
    }
    meanLuma.push(sum / (W * H));
    for (let t = 0; t < G * G; t++) tileL[t]!.push(tiles[t] / Math.max(1, tilePx[t]));
    tileL[G * G]!.push(wholeLin / (W * H));
    if (f > 0) {
      const prev = frames[f - 1]!;
      let d = 0;
      const td = new Array(G * G).fill(0);
      for (let i = 0; i < W * H; i++) {
        const a = Math.abs(px[i]! - prev[i]!);
        d += a;
        td[tileOf[i]!] += a;
      }
      mad.push(d / (W * H));
      for (let t = 0; t < G * G; t++) tileMad[t]!.push(td[t] / Math.max(1, tilePx[t]));
    }
  }
  const problems: string[] = [];
  // flashes, per tile and for the whole frame
  let maxF = 0;
  const flashFrames: number[] = [];
  for (const series of tileL) {
    const tr = luminanceTransitions(series);
    const m = maxFlashesPerSecond(tr, o.fps);
    if (m.max > maxF) maxF = m.max;
    if (m.max > 3) flashFrames.push(m.at);
  }
  if (maxF > 3) problems.push(`flashes: ${maxF} in one second in some area (WCAG 2.3.1 allows 3), around frames ${flashFrames.slice(0, 5).join(", ")}`);
  // dead windows: across a whole second (and its middle), the picture must change
  const between = (a: number, b: number) => {
    const A = frames[a]!;
    const B = frames[b]!;
    let d = 0;
    for (let i = 0; i < W * H; i++) d += Math.abs(A[i]! - B[i]!);
    return d / (W * H);
  };
  const inWait = (f: number) => !!o.waits?.some((w) => f >= w.from && f < w.to);
  const win = Math.max(2, Math.round(o.fps));
  const dead = new Uint8Array(n);
  for (let f = 0; f + win - 1 < n; f++) {
    if (inWait(f) || inWait(f + win - 1)) continue;
    if (between(f, f + win - 1) < deadMad && between(f, f + (win >> 1)) < deadMad) for (let k = f; k < f + win; k++) dead[k] = 1;
  }
  const deadRuns: { from: number; to: number; seconds: number }[] = [];
  for (let f = 0; f < n; f++) {
    if (!dead[f]) continue;
    let g = f;
    while (g < n && dead[g]) g++;
    deadRuns.push({ from: f, to: g, seconds: (g - f) / o.fps });
    f = g;
  }
  for (const d of deadRuns) problems.push(`dead frames: ${d.seconds.toFixed(2)} s without change from frame ${d.from}`);
  // pops away from cuts
  const cuts = new Set<number>();
  for (const c of o.cuts ?? []) for (let k = -1; k <= 1; k++) cuts.add(c + k);
  const pops: number[] = [];
  for (let f = 3; f < n - 3; f++) {
    if (cuts.has(f)) continue;
    const neigh = [mad[f - 3]!, mad[f - 2]!, mad[f - 1]!, mad[f + 1]!, mad[f + 2]!, mad[f + 3]!];
    const m = median(neigh);
    if (mad[f]! > 2 && mad[f]! > 3 * Math.max(m, 0.05)) pops.push(f);
  }
  if (pops.length) problems.push(`pops (frame steps away from cuts): frames ${pops.slice(0, 12).join(", ")}${pops.length > 12 ? " …" : ""}`);
  // tile pops: each tile against its own neighbours (a vanishing line, a card popping in)
  const tilePops = findTilePops(tileMad, G, o.cuts ?? [], o.tilePop);
  if (tilePops.length) {
    const frames = [...new Set(tilePops.map((p) => p.frame))];
    problems.push(`tile pops (a part of the frame steps, away from cuts): frames ${frames.slice(0, 12).join(", ")}${frames.length > 12 ? " …" : ""}`);
  }
  // dips at seams
  const dips: { at: number; depth: number }[] = [];
  for (const c of o.cuts ?? []) {
    for (let f = Math.max(3, c - 6); f < Math.min(n - 3, c + 30); f++) {
      const before = meanLuma[Math.max(0, f - 3)]!;
      const after = meanLuma[Math.min(n - 1, f + 3)]!;
      const depth = Math.min(before, after) - meanLuma[f]!;
      if (depth > 3) {
        dips.push({ at: f, depth: Math.round(depth * 10) / 10 });
        break;
      }
    }
  }
  for (const d of dips) problems.push(`luma dip of ${d.depth} levels at frame ${d.at}`);
  return { frames: n, meanLuma, mad, maxFlashesPerSecond: maxF, flashFrames, deadRuns, pops, tilePops, dips, ok: problems.length === 0, problems };
}
