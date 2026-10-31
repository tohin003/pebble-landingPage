// The flash verdict on a render (MONTAGE_DESIGN §3.3 item 1; R3_SAFETY_PERCEPTION §2.5): a port of the R3 lane's research
// reference, research3/tools/flashref.py v2 (27 Oct), so the pipeline can run it on every Return render (the review's
// RV-03, 28 Oct: "qa/flash-rgb.ts, the design's verdict, is not built"). luma.ts stays for pops and dips; this is the
// verdict (luma.ts read pure red as 0.037 and missed four other canaries: R3 §2.3).
//
// It reads rgb24 frames already on a small analysis grid (192 × 108 for a 16:9 1080p frame: one cell is 10 × 10 px of
// the source; 108 × 108 for 1:1, 108 × 192 for 9:16), and reports, as flashref.py does, field for field:
//   general         per cell, opposing changes in relative luminance (linearised sRGB, Rec. 709 weights) of 0.1 or more
//                   with the darker state under 0.8; a window registers a transition when cells whose latest transition
//                   (within `sync` frames, 2 at 60 fps: Jordan & Vanderheiden's 20 ms) runs the same way cover 25 % of
//                   it; same-way transitions merge. Fail above 6 in any 60 frames, warn at 4 (IRIS), extended when 4
//                   or more hold on 80 % of the frames of a 5 s window. Windows: desk27 (the 10° field of a 16:9 frame
//                   on a 27-inch screen at 60 cm, 299 px square at 1080p), css2560 (WCAG's 341 × 256 CSS px block at
//                   2,560 CSS px wide: 256 × 192 px of a 1920 frame), tv (the whole frame); for 9:16 also w400 and
//                   css9x16 (455 × 341 px), the windows that bind it (`binding`, R3 §1.7)
//   general_qual66  the same, a change counting only if it builds within 66 ms (Jordan & Vanderheiden 2024; not a standard)
//   red             a transition to or from saturated red (R/(R+G+B) ≥ 0.8, linear) whose CIE 1976 u′v′ distance from
//                   the other state is over 0.2; the same windows and counts
//   sceneChanges    80 % of the frame changing by 20 % in gamma-encoded brightness; more than 3 a second fails
//   irisLike        EA IRIS's frame-mean test (a transition at an accumulated change of 0.1 of the whole frame's mean)
//   pattern         light–dark alternations in column, row and radial profiles (a screening heuristic)
//   steps           the film's own targets: frame-mean step under 0.03, desk27-window mean step under 0.05
// The arithmetic follows the reference's float32 where its verdicts compare against thresholds (Math.fround), so the
// two agree on every count (tests/return.test.ts, and the parity runs on the reference's canaries, recorded in README §8).
// Pure: qa/flash-rgb-scan.ts decodes a render with FFmpeg (a heavy job) and feeds this.

const f32 = Math.fround;
const K = { r: f32(0.2126), g: f32(0.7152), b: f32(0.0722), xr: f32(0.4124), xg: f32(0.3576), xb: f32(0.1805), zr: f32(0.0193), zg: f32(0.1192), zb: f32(0.9505) };
const T01 = f32(0.1);
const T08 = f32(0.8);
const T02 = f32(0.2);
const EPS7 = f32(1e-7);
const U_WHITE = f32(0.1978);
const V_WHITE = f32(0.4683);

/** sRGB 8-bit to linear, as float32 (the reference's LUT). */
const LUT = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Python's round(): half to even. */
const roundHalfEven = (x: number): number => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};
const roundTo = (x: number, d: number): number => {
  const k = 10 ** d;
  return roundHalfEven(x * k) / k;
};

export interface FlashRgbOptions {
  /** the analysis grid's size (cells) */
  w: number;
  h: number;
  fps: number;
  /** the source frame's width in px (for the windows' px) */
  srcW: number;
  /** frames over which same-way cell transitions are summed (default 2) */
  sync?: number;
  name?: string;
  /** the frame's aspect (default from the grid): which windows bind (R3 §1.7) */
  aspect?: "16:9" | "1:1" | "9:16";
  /**
   * only the general rule in the binding windows, on grey frames fed by pushGrey() (the plan's first-cell guard,
   * setpieces/returnFirstCell.ts, which runs the verdict on synthetic frames many times); the rest of the report empty
   */
  lean?: boolean;
}

export interface FlashWindow {
  maxTransitions1s: number;
  at: number | null;
  /** [x, y, w, h] in source px */
  window: number[] | null;
  extended: boolean;
  maxArea: number;
  windowsWithTransitions: number;
  fail: boolean;
  warn: boolean;
}

export interface FlashRgbReport {
  name: string;
  frames: number;
  grid: [number, number];
  sync: number;
  /**
   * the windows whose counts are the verdict for this aspect (R3 §1.7: 16:9 and 1:1 the 10° field and the CSS reading,
   * 256 × 192 px; 9:16 a 400 × 400 px window and its own CSS reading, 455 × 341 px, 1.87 % of the frame at 25 %; the
   * whole frame always). The reference's 16:9 windows are reported in every aspect too: on 9:16 its css2560 is a 16:9
   * reading of a frame shown 1,920 px wide, not 9:16's, so it does not bind there
   */
  binding: string[];
  general: Record<string, FlashWindow>;
  general_qual66: Record<string, FlashWindow>;
  red: Record<string, FlashWindow>;
  redCellsMaxFrac: number;
  sceneChanges: { count: number; max1s: number; fail: boolean; maxFrac: number };
  irisLike: { transitions: number; maxTransitions1s: number; fail: boolean };
  pattern: { maxPairs: number; where: string | null; over5: boolean };
  steps: { frameMeanStep1: number; frameMeanStep4: number; windowMeanStep1: number; windowMeanStep4: number; framesFrameMeanStepGe003: number; framesWindowStepGe005: number; meanLRange: [number, number] };
}

/** Does the report fail any rule a standard sets (general or red above 6 in a second or extended, in a binding window; scene changes; IRIS)? */
export const flashFails = (r: FlashRgbReport): string[] => {
  const out: string[] = [];
  for (const [kind, set] of [
    ["general", r.general],
    ["red", r.red],
  ] as const)
    for (const [w, v] of Object.entries(set)) {
      if (!r.binding.includes(w)) continue;
      if (v.fail) out.push(`${kind} ${w}: ${v.maxTransitions1s} transitions in a second (frame ${v.at}, window ${v.window?.join(",")}): more than 6`);
      if (v.extended) out.push(`${kind} ${w}: the extended rule (4 or more a second for 4 s of 5)`);
    }
  if (r.sceneChanges.fail) out.push(`scene changes: ${r.sceneChanges.max1s} in a second (more than 3)`);
  if (r.irisLike.fail) out.push(`IRIS-like: ${r.irisLike.maxTransitions1s} in a second (more than 6)`);
  return out;
};

/** Feeds rgb24 frames on the grid, in order; finish() reports. */
export class FlashRgb {
  readonly W: number;
  readonly H: number;
  readonly N: number;
  readonly fps: number;
  readonly sync: number;
  readonly PX: number;
  private L: Float32Array[] = [];
  private evGen: Int8Array[] = [];
  private evQual: Int8Array[] = [];
  private evRed: Int8Array[] = [];
  private redFrac: number[] = [];
  private sceneFrac: number[] = [];
  // the per-cell state of the transition logic
  private gAnchor: Float32Array;
  private gDir: Int8Array;
  private qAnchor: Float32Array;
  private qDir: Int8Array;
  private rU: Float32Array;
  private rV: Float32Array;
  private rR: Uint8Array;
  private prevYp: Float32Array | null = null;
  private qual: number;

  constructor(readonly o: FlashRgbOptions) {
    this.W = o.w;
    this.H = o.h;
    this.N = o.w * o.h;
    this.fps = Math.round(o.fps);
    this.sync = Math.max(1, o.sync ?? 2);
    this.PX = o.srcW / o.w;
    this.qual = Math.max(1, roundHalfEven(0.066 * this.fps));
    this.gAnchor = new Float32Array(this.N);
    this.gDir = new Int8Array(this.N);
    this.qAnchor = new Float32Array(this.N);
    this.qDir = new Int8Array(this.N);
    this.rU = new Float32Array(this.N);
    this.rV = new Float32Array(this.N);
    this.rR = new Uint8Array(this.N);
  }

  get frames(): number {
    return this.L.length;
  }

  /**
   * The lean path (FlashRgbOptions.lean; setpieces/returnFirstCell.ts): one grey byte a cell, the general rule's per-cell
   * events only, computed as push() computes them for a grey pixel (the same table and float32 arithmetic), so its
   * general verdict equals push()'s on the same grey frames; no red, qual66, scene or frame-mean data.
   */
  pushGrey(grey: Uint8Array): void {
    const { N } = this;
    const t = this.L.length;
    const L = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const R = LUT[grey[i]!]!;
      L[i] = f32(f32(f32(K.r * R) + f32(K.g * R)) + f32(K.b * R));
    }
    const eg = new Int8Array(N);
    if (t === 0) this.gAnchor.set(L);
    else {
      const prev = this.L[t - 1]!;
      for (let i = 0; i < N; i++) {
        const cur = L[i]!;
        const p = prev[i]!;
        const d = cur > p ? 1 : cur < p ? -1 : 0;
        if (d !== 0 && d !== this.gDir[i]) {
          this.gAnchor[i] = p;
          this.gDir[i] = d;
        }
        const a = this.gAnchor[i]!;
        if (this.gDir[i] !== 0 && Math.abs(f32(cur - a)) >= T01 && Math.min(cur, a) < T08) {
          eg[i] = this.gDir[i]!;
          this.gAnchor[i] = cur;
        }
      }
    }
    this.L.push(L);
    this.evGen.push(eg);
  }

  push(rgb: Uint8Array): void {
    const { N } = this;
    const t = this.L.length;
    const L = new Float32Array(N);
    const U = new Float32Array(N);
    const V = new Float32Array(N);
    const RED = new Uint8Array(N);
    const Yp = new Float32Array(N);
    let reds = 0;
    for (let i = 0; i < N; i++) {
      const c0 = rgb[3 * i]!;
      const c1 = rgb[3 * i + 1]!;
      const c2 = rgb[3 * i + 2]!;
      const R = LUT[c0]!;
      const G = LUT[c1]!;
      const B = LUT[c2]!;
      const Lc = f32(f32(f32(K.r * R) + f32(K.g * G)) + f32(K.b * B));
      const X = f32(f32(f32(K.xr * R) + f32(K.xg * G)) + f32(K.xb * B));
      const Z = f32(f32(f32(K.zr * R) + f32(K.zg * G)) + f32(K.zb * B));
      const den = f32(f32(X + f32(15 * Lc)) + f32(3 * Z));
      const ok = den > 1e-9;
      U[i] = ok ? f32(f32(4 * X) / den) : U_WHITE;
      V[i] = ok ? f32(f32(9 * Lc) / den) : V_WHITE;
      const S = f32(f32(R + G) + B);
      const red = S > 1e-9 && f32(R / S) >= T08;
      RED[i] = red ? 1 : 0;
      if (red) reds++;
      Yp[i] = f32((0.2126 * c0 + 0.7152 * c1 + 0.0722 * c2) / 255);
      L[i] = Lc;
    }
    this.redFrac.push(reds / N);
    // the transitions, per cell
    const eg = new Int8Array(N);
    const eq = new Int8Array(N);
    const er = new Int8Array(N);
    if (t === 0) {
      this.gAnchor.set(L);
      this.qAnchor.set(L);
      this.rU.set(U);
      this.rV.set(V);
      this.rR.set(RED);
    } else {
      const prev = this.L[t - 1]!;
      const back = this.L[Math.max(0, t - this.qual)]!;
      for (let i = 0; i < N; i++) {
        const cur = L[i]!;
        const p = prev[i]!;
        const d = cur > p ? 1 : cur < p ? -1 : 0;
        // general
        if (d !== 0 && d !== this.gDir[i]) {
          this.gAnchor[i] = p;
          this.gDir[i] = d;
        }
        let a = this.gAnchor[i]!;
        if (this.gDir[i] !== 0 && Math.abs(f32(cur - a)) >= T01 && Math.min(cur, a) < T08) {
          eg[i] = this.gDir[i]!;
          this.gAnchor[i] = cur;
        }
        // qualifying duration: the change built within `qual` frames
        if (d !== 0 && d !== this.qDir[i]) {
          this.qAnchor[i] = p;
          this.qDir[i] = d;
        }
        a = this.qAnchor[i]!;
        if (this.qDir[i] !== 0 && Math.abs(f32(cur - a)) >= T01 && Math.min(cur, a) < T08 && Math.abs(f32(cur - back[i]!)) >= T01) {
          eq[i] = this.qDir[i]!;
          this.qAnchor[i] = cur;
        }
        // red
        if (this.rR[i] !== RED[i] && f32(Math.hypot(f32(U[i]! - this.rU[i]!), f32(V[i]! - this.rV[i]!))) > T02) {
          er[i] = RED[i] ? 1 : -1;
          this.rU[i] = U[i]!;
          this.rV[i] = V[i]!;
          this.rR[i] = RED[i]!;
        }
      }
      // scene changes: 80 % of the cells change by 0.2 in gamma-encoded brightness
      let big = 0;
      const py = this.prevYp!;
      for (let i = 0; i < N; i++) if (Math.abs(f32(Yp[i]! - py[i]!)) >= T02) big++;
      this.sceneFrac.push(big / N);
    }
    this.prevYp = Yp;
    this.L.push(L);
    this.evGen.push(eg);
    this.evQual.push(eq);
    this.evRed.push(er);
  }

  /** Each cell's most recent event within the last `sync` frames (0 if none), on frame t. */
  private latestSign(ev: Int8Array[], t: number, i: number): number {
    for (let j = 0; j < this.sync && t - j >= 0; j++) {
      const v = ev[t - j]![i]!;
      if (v !== 0) return v;
    }
    return 0;
  }

  private positions(wh: number, ww: number, stride: number): { ys: number[]; xs: number[] } {
    const { W, H } = this;
    const ys: number[] = [];
    const xs: number[] = [];
    for (let y = 0; y <= H - wh; y += stride) ys.push(y);
    for (let x = 0; x <= W - ww; x += stride) xs.push(x);
    if (!ys.length) ys.push(0);
    if (!xs.length) xs.push(0);
    if (ys[ys.length - 1] !== H - wh) ys.push(H - wh);
    if (xs[xs.length - 1] !== W - ww) xs.push(W - ww);
    return { ys, xs };
  }

  private windowReport(ev: Int8Array[], whIn: number, wwIn: number, stride: number, frac = 0.25): FlashWindow {
    const { W, H, fps } = this;
    const m = ev.length;
    const wh = Math.min(whIn, H);
    const ww = Math.min(wwIn, W);
    const thr = frac * wh * ww;
    const { ys, xs } = this.positions(wh, ww, stride);
    const nWin = ys.length * xs.length;
    const up = new Int32Array(nWin * m);
    const dn = new Int32Array(nWin * m);
    const SU = new Int32Array((H + 1) * (W + 1));
    const SD = new Int32Array((H + 1) * (W + 1));
    const W1 = W + 1;
    for (let t = 0; t < m; t++) {
      // the integral images of the cells whose latest transition (within `sync` frames) runs up, and down
      for (let y = 0; y < H; y++) {
        let ru = 0;
        let rd = 0;
        for (let x = 0; x < W; x++) {
          const s = this.latestSign(ev, t, y * W + x);
          if (s > 0) ru++;
          else if (s < 0) rd++;
          SU[(y + 1) * W1 + x + 1] = SU[y * W1 + x + 1]! + ru;
          SD[(y + 1) * W1 + x + 1] = SD[y * W1 + x + 1]! + rd;
        }
      }
      let k = 0;
      for (const y of ys)
        for (const x of xs) {
          const a = (y + wh) * W1 + x + ww;
          const b = y * W1 + x + ww;
          const c = (y + wh) * W1 + x;
          const d = y * W1 + x;
          up[k * m + t] = SU[a]! - SU[b]! - SU[c]! + SU[d]!;
          dn[k * m + t] = SD[a]! - SD[b]! - SD[c]! + SD[d]!;
          k++;
        }
    }
    const best: FlashWindow = { maxTransitions1s: 0, at: null, window: null, extended: false, maxArea: 0, windowsWithTransitions: 0, fail: false, warn: false };
    const win5 = 5 * fps;
    let k = 0;
    for (const y of ys)
      for (const x of xs) {
        const base = k * m;
        k++;
        const tr: number[] = [];
        let last = 0;
        for (let t = 0; t < m; t++) {
          const u = up[base + t]!;
          const d = dn[base + t]!;
          best.maxArea = Math.max(best.maxArea, Math.max(u, d) / (wh * ww));
          if (u >= thr || d >= thr) {
            const dir = u >= d ? 1 : -1;
            if (dir !== last) {
              tr.push(t);
              last = dir;
            }
          }
        }
        if (!tr.length) continue;
        best.windowsWithTransitions++;
        // transitions in (t − fps, t], on every frame
        const counts = new Int32Array(m);
        let j0 = 0;
        let j1 = 0;
        let c = 0;
        let at = 0;
        for (let t = 0; t < m; t++) {
          while (j1 < tr.length && tr[j1]! <= t) j1++;
          while (j0 < tr.length && tr[j0]! <= t - fps) j0++;
          counts[t] = j1 - j0;
          if (counts[t]! > c) {
            c = counts[t]!;
            at = t;
          }
        }
        if (c > best.maxTransitions1s) {
          best.maxTransitions1s = c;
          best.at = at;
          best.window = [Math.trunc(x * this.PX), Math.trunc(y * this.PX), Math.trunc(ww * this.PX), Math.trunc(wh * this.PX)];
        }
        if (m >= win5 && !best.extended) {
          let run = 0;
          for (let t = 0; t < m; t++) {
            run += counts[t]! >= 4 ? 1 : 0;
            if (t >= win5) run -= counts[t - win5]! >= 4 ? 1 : 0;
            if (t >= win5 - 1 && run >= 0.8 * win5) {
              best.extended = true;
              break;
            }
          }
        }
      }
    best.maxArea = roundTo(best.maxArea, 3);
    best.fail = best.maxTransitions1s > 6;
    best.warn = best.maxTransitions1s >= 4;
    return best;
  }

  /** Events in (t − fps, t], the most on any frame. */
  private max1s(ev: readonly number[]): number {
    let best = 0;
    let j = 0;
    for (let i = 0; i < ev.length; i++) {
      while (ev[i]! - ev[j]! >= this.fps) j++;
      best = Math.max(best, i - j + 1);
    }
    return best;
  }

  private sceneChanges(): FlashRgbReport["sceneChanges"] {
    const ev: number[] = [];
    this.sceneFrac.forEach((f, i) => {
      if (f >= 0.8) ev.push(i + 1);
    });
    const merged = ev.filter((t, i) => i === 0 || t - ev[i - 1]! > 1);
    const mx = merged.length ? this.max1s(merged) : 0;
    return { count: merged.length, max1s: mx, fail: mx > 3, maxFrac: this.sceneFrac.length ? roundTo(Math.max(...this.sceneFrac), 3) : 0 };
  }

  private frameMeans(): number[] {
    return this.L.map((L) => {
      let s = 0;
      for (let i = 0; i < L.length; i++) s += L[i]!;
      return f32(s / L.length);
    });
  }

  private irisLike(mean: readonly number[], area = 0.25): FlashRgbReport["irisLike"] {
    const m = this.L.length;
    const trans: number[] = [];
    let accList: number[] = [];
    let lastAcc = 0;
    for (let t = 1; t < m; t++) {
      const a = this.L[t]!;
      const b = this.L[t - 1]!;
      let changed = 0;
      for (let i = 0; i < a.length; i++) if (Math.abs(f32(a[i]! - b[i]!)) > EPS7) changed++;
      const diff = changed / a.length >= area ? f32(mean[t]! - mean[t - 1]!) : 0;
      let prevAcc = lastAcc;
      let acc: number;
      if (prevAcc >= 0 === diff >= 0 && diff !== 0) {
        accList.push(diff);
        if (accList.length > this.fps) prevAcc -= accList.shift()!;
        acc = prevAcc + diff;
      } else {
        accList = [diff];
        acc = diff;
      }
      const darker = Math.min(mean[t]!, mean[t - 1]!);
      const sameCounted = prevAcc >= 0 === acc >= 0 && Math.abs(prevAcc) >= 0.1;
      if (!sameCounted && Math.abs(acc) >= 0.1 && darker < 0.8) trans.push(t);
      lastAcc = acc;
    }
    const mx = trans.length ? this.max1s(trans) : 0;
    return { transitions: trans.length, maxTransitions1s: mx, fail: mx > 6 };
  }

  private static alternations(p: ArrayLike<number>, thr = 0.1, dark = 0.8): number {
    let swings = 0;
    let direction = 0;
    let lo = p[0]!;
    let hi = p[0]!;
    let ext = p[0]!;
    for (let i = 1; i < p.length; i++) {
      const v = p[i]!;
      if (direction === 0) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
        if (v - lo >= thr && lo < dark) {
          direction = 1;
          ext = v;
          swings++;
        } else if (hi - v >= thr && v < dark) {
          direction = -1;
          ext = v;
          swings++;
        }
      } else if (direction === 1) {
        if (v > ext) ext = v;
        else if (ext - v >= thr && v < dark) {
          direction = -1;
          ext = v;
          swings++;
        }
      } else if (v < ext) ext = v;
      else if (v - ext >= thr && ext < dark) {
        direction = 1;
        ext = v;
        swings++;
      }
    }
    return Math.floor(swings / 2);
  }

  private pattern(every = 6): FlashRgbReport["pattern"] {
    const { W, H } = this;
    const out: FlashRgbReport["pattern"] = { maxPairs: 0, where: null, over5: false };
    const cy = (H - 1) / 2;
    const cx = (W - 1) / 2;
    const rr = new Int32Array(W * H);
    let rMax = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const r = Math.trunc(Math.hypot(y - cy, x - cx));
        rr[y * W + x] = r;
        rMax = Math.max(rMax, r);
      }
    const regions: [string, number, number, number, number, number][] = [
      ["frame", 0, H, 0, W, 1],
      ["centre36", Math.trunc(H * 0.2), Math.trunc(H * 0.8), Math.trunc(W * 0.2), Math.trunc(W * 0.8), 0.36],
    ];
    for (let t = 0; t < this.L.length; t += every) {
      const f = this.L[t]!;
      for (const [name, y0, y1, x0, x1, area] of regions) {
        const cols = new Float64Array(x1 - x0);
        const rows = new Float64Array(y1 - y0);
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            cols[x - x0] += f[y * W + x]!;
            rows[y - y0] += f[y * W + x]!;
          }
        for (let i = 0; i < cols.length; i++) cols[i] /= y1 - y0;
        for (let i = 0; i < rows.length; i++) rows[i] /= x1 - x0;
        for (const [profName, prof] of [
          ["columns", cols],
          ["rows", rows],
        ] as const) {
          const k = FlashRgb.alternations(prof);
          if (k > out.maxPairs) {
            out.maxPairs = k;
            out.where = `${name} ${profName} @frame ${t} (${Math.trunc(area * 100)} % of frame)`;
          }
        }
      }
      const sum = new Float64Array(rMax + 1);
      const cnt = new Float64Array(rMax + 1);
      for (let i = 0; i < f.length; i++) {
        sum[rr[i]!] += f[i]!;
        cnt[rr[i]!]++;
      }
      const radial = Array.from(sum.subarray(0, Math.trunc(Math.min(H, W) / 2)), (s, r) => s / Math.max(cnt[r]!, 1));
      const k = FlashRgb.alternations(radial);
      if (k > out.maxPairs) {
        out.maxPairs = k;
        out.where = `radial from centre @frame ${t}`;
      }
    }
    out.over5 = out.maxPairs > 5;
    return out;
  }

  private steps(mean: readonly number[], wh: number, ww: number, stride: number): FlashRgbReport["steps"] {
    const { W, H } = this;
    const m = this.L.length;
    const { ys, xs } = this.positions(Math.min(wh, H), Math.min(ww, W), stride);
    const hist: Float64Array[] = [];
    let r1 = 0;
    let r4 = 0;
    let nR = 0;
    let nF = 0;
    const W1 = W + 1;
    const S = new Float64Array((H + 1) * W1);
    for (let t = 0; t < m; t++) {
      const f = this.L[t]!;
      for (let y = 0; y < H; y++) {
        let run = 0;
        for (let x = 0; x < W; x++) {
          run += f[y * W + x]!;
          S[(y + 1) * W1 + x + 1] = S[y * W1 + x + 1]! + run;
        }
      }
      const wm = new Float64Array(ys.length * xs.length);
      let k = 0;
      for (const y of ys) for (const x of xs) wm[k++] = (S[(y + wh) * W1 + x + ww]! - S[y * W1 + x + ww]! - S[(y + wh) * W1 + x]! + S[y * W1 + x]!) / (wh * ww);
      if (t >= 1) {
        const prev = hist[hist.length - 1]!;
        let d1 = 0;
        for (let i = 0; i < wm.length; i++) d1 = Math.max(d1, Math.abs(wm[i]! - prev[i]!));
        r1 = Math.max(r1, d1);
        if (d1 >= 0.05) nR++;
        if (Math.abs(mean[t]! - mean[t - 1]!) >= 0.03) nF++;
      }
      if (t >= 4) {
        const back = hist[hist.length - 4]!;
        for (let i = 0; i < wm.length; i++) r4 = Math.max(r4, Math.abs(wm[i]! - back[i]!));
      }
      hist.push(wm);
      if (hist.length > 4) hist.shift();
    }
    let f1 = 0;
    for (let t = 1; t < m; t++) f1 = Math.max(f1, Math.abs(mean[t]! - mean[t - 1]!));
    let f4 = 0;
    for (let t = 4; t < m; t++) f4 = Math.max(f4, Math.abs(mean[t]! - mean[t - 4]!));
    return {
      frameMeanStep1: roundTo(f1, 4),
      frameMeanStep4: roundTo(f4, 4),
      windowMeanStep1: roundTo(r1, 4),
      windowMeanStep4: roundTo(r4, 4),
      framesFrameMeanStepGe003: nF,
      framesWindowStepGe005: nR,
      meanLRange: [roundTo(Math.min(...mean), 4), roundTo(Math.max(...mean), 4)],
    };
  }

  finish(): FlashRgbReport {
    const cells = (px: number) => Math.max(1, roundHalfEven(px / this.PX));
    const side = cells(299);
    const aspect = this.o.aspect ?? (this.W > this.H ? "16:9" : this.W === this.H ? "1:1" : "9:16");
    // the reference's windows (desk27, css2560, tv), and for 9:16 the 400 × 400 window and the CSS reading at 455 × 341
    // px (the review's flashref-review.py: a 9:16 frame shown 1,440 CSS px tall)
    const cases: Record<string, [number, number, number]> = {
      desk27: [side, side, Math.max(1, Math.floor(side / 10))],
      css2560: [cells(192), cells(256), 2],
      ...(aspect === "9:16" ? { w400: [cells(400), cells(400), 4] as [number, number, number], css9x16: [cells(341), cells(455), 4] as [number, number, number] } : {}),
      tv: [this.H, this.W, this.H],
    };
    const binding = aspect === "9:16" ? ["w400", "css9x16", "tv"] : ["desk27", "css2560", "tv"];
    const lean = !!this.o.lean;
    const general = Object.fromEntries(Object.entries(cases).filter(([k]) => !lean || binding.includes(k)).map(([k, v]) => [k, this.windowReport(this.evGen, ...v)]));
    if (lean) {
      // the general rule in the binding windows only (pushGrey's frames carry nothing else)
      const none = { maxTransitions1s: 0, at: null, window: null, extended: false, maxArea: 0, windowsWithTransitions: 0, fail: false, warn: false };
      return {
        name: this.o.name ?? "",
        frames: this.L.length,
        grid: [this.W, this.H],
        sync: this.sync,
        binding,
        general,
        general_qual66: {},
        red: Object.fromEntries(binding.map((k) => [k, none])),
        redCellsMaxFrac: 0,
        sceneChanges: { count: 0, max1s: 0, fail: false, maxFrac: 0 },
        irisLike: { transitions: 0, maxTransitions1s: 0, fail: false },
        pattern: { maxPairs: 0, where: null, over5: false },
        steps: { frameMeanStep1: 0, frameMeanStep4: 0, windowMeanStep1: 0, windowMeanStep4: 0, framesFrameMeanStepGe003: 0, framesWindowStepGe005: 0, meanLRange: [0, 0] },
      };
    }
    const general_qual66 = lean
      ? {}
      : Object.fromEntries(
          Object.entries(cases)
            .filter(([k]) => k !== "css2560")
            .map(([k, v]) => [k, this.windowReport(this.evQual, ...v)]),
        );
    const red = lean ? {} : Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, this.windowReport(this.evRed, ...v)]));
    const mean = this.frameMeans();
    return {
      name: this.o.name ?? "",
      frames: this.L.length,
      grid: [this.W, this.H],
      sync: this.sync,
      binding,
      general,
      general_qual66,
      red,
      redCellsMaxFrac: this.redFrac.length ? roundTo(Math.max(...this.redFrac), 4) : 0,
      sceneChanges: this.sceneChanges(),
      irisLike: this.irisLike(mean),
      pattern: this.pattern(),
      steps: this.steps(mean, side, side, Math.max(1, Math.floor(side / 10))),
    };
  }
}

/** The analysis grid for a frame size (10 source px a cell on the short side: 192 × 108, 108 × 108, 108 × 192). */
export const flashGrid = (w: number, h: number): { w: number; h: number } => {
  const k = Math.min(w, h) / 108;
  return { w: Math.round(w / k), h: Math.round(h / k) };
};
