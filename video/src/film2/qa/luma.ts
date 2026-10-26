// Pixel checks on a render (TREATMENT §5.5 "Luminance and flashes ... on a low-resolution render", "Dead frames"),
// pure analysis of 8-bit grey frames. qa/luma-scan.ts decodes a video into such frames with FFmpeg (a heavy job: run it
// through scripts/heavy.sh) and calls analyseLuma().
//
// - Flashes (WCAG 2.3.1, general flash): a flash is a pair of opposing changes in relative luminance of 10 % or more of
//   the maximum, where the darker state is below 0.80. Any area of a quarter of a 10° field counts: about 2.8 % of the
//   screen, so the frame is cut into a 6 × 6 grid of tiles (2.8 % each) and every tile is checked, plus the whole
//   frame. At most three flashes (six opposing transitions) in any one second.
// - Dead frames: a run of 1 s or more whose consecutive frames differ by less than `deadMad` levels on average,
//   outside the waiting states given.
// - Pops: a frame-to-frame difference more than 3× the median of its six neighbours and above 2 levels, away from the
//   cuts given (a hard cut is meant to differ) (TOOLS_TESTS §1's definition).
// - Dips: a seam whose mean luma falls more than 3 levels below both sides (a crossfade over a third layer).

export interface LumaOptions {
  fps: number;
  width: number;
  height: number;
  /** composition frames where a hard cut or a transition starts (pops there are expected) */
  cuts?: readonly number[];
  /** waiting states inside takes (still frames allowed) */
  waits?: readonly { from: number; to: number }[];
  /** mean absolute difference (8-bit levels) below which two frames count as identical */
  deadMad?: number;
  grid?: number;
}

export interface LumaReport {
  frames: number;
  meanLuma: number[];
  mad: number[];
  maxFlashesPerSecond: number;
  flashFrames: number[];
  deadRuns: { from: number; to: number; seconds: number }[];
  pops: number[];
  dips: { at: number; depth: number }[];
  ok: boolean;
  problems: string[];
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
  const deadMad = o.deadMad ?? 0.15;
  const meanLuma: number[] = [];
  const tileL: number[][] = Array.from({ length: G * G + 1 }, () => []);
  const mad: number[] = [0];
  for (let f = 0; f < n; f++) {
    const px = frames[f]!;
    let sum = 0;
    const tiles = new Array(G * G).fill(0);
    const counts = new Array(G * G).fill(0);
    let wholeLin = 0;
    for (let y = 0; y < H; y++) {
      const ty = Math.min(G - 1, Math.floor((y * G) / H));
      for (let x = 0; x < W; x++) {
        const v = px[y * W + x]!;
        sum += v;
        const l = LUT[v]!;
        wholeLin += l;
        const t = ty * G + Math.min(G - 1, Math.floor((x * G) / W));
        tiles[t] += l;
        counts[t]++;
      }
    }
    meanLuma.push(sum / (W * H));
    for (let t = 0; t < G * G; t++) tileL[t]!.push(tiles[t] / Math.max(1, counts[t]));
    tileL[G * G]!.push(wholeLin / (W * H));
    if (f > 0) {
      const prev = frames[f - 1]!;
      let d = 0;
      for (let i = 0; i < W * H; i++) d += Math.abs(px[i]! - prev[i]!);
      mad.push(d / (W * H));
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
  // dead runs
  const inWait = (f: number) => !!o.waits?.some((w) => f >= w.from && f < w.to);
  const deadRuns: { from: number; to: number; seconds: number }[] = [];
  let run = 0;
  for (let f = 1; f <= n; f++) {
    const still = f < n && mad[f]! < deadMad && !inWait(f);
    if (still) run++;
    else {
      if (run + 1 >= o.fps) deadRuns.push({ from: f - run - 1, to: f, seconds: (run + 1) / o.fps });
      run = 0;
    }
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
  return { frames: n, meanLuma, mad, maxFlashesPerSecond: maxF, flashFrames, deadRuns, pops, dips, ok: problems.length === 0, problems };
}
