// Speed ramps: a monotone time-warp from the reel's frames to a take's source frames. Pure; no React.
//
// The reel is "Edited for time" (the person, 1 Nov): Pebble's waits may run fast and jump, every screen stays real.
// A warp is a list of knots [outFrame, srcFrame], both increasing, joined by a monotone cubic (Fritsch–Carlson), so the
// speed changes smoothly (a ramp, never a stutter) and never runs backwards. `ramp()` builds the common one: fast
// through the wait, 1× into the moment that matters, then a hold or 1× after it.

export type Knot = readonly [out: number, src: number];

export interface Warp {
  /** the source frame shown on output frame `f` (fractional; floor it for a still) */
  at(f: number): number;
  /** the source speed at output frame `f`, source frames per output frame (1 = real time) */
  speed(f: number): number;
  knots: readonly Knot[];
}

export function warp(knots: readonly Knot[]): Warp {
  if (knots.length < 2) throw new Error("warp: needs two knots");
  for (let i = 1; i < knots.length; i++) {
    if (!(knots[i][0] > knots[i - 1][0])) throw new Error(`warp: output frames must increase (${knots[i - 1][0]} → ${knots[i][0]})`);
    if (knots[i][1] < knots[i - 1][1]) throw new Error(`warp: source frames must not decrease (${knots[i - 1][1]} → ${knots[i][1]})`);
  }
  const n = knots.length;
  const x = knots.map((k) => k[0]);
  const y = knots.map((k) => k[1]);
  const d = x.slice(1).map((xi, i) => (y[i + 1] - y[i]) / (xi - x[i]));
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  const seg = (f: number) => {
    let i = 0;
    while (i < n - 2 && f > x[i + 1]) i++;
    return i;
  };
  const at = (f: number): number => {
    if (f <= x[0]) return y[0]; // before the first knot: hold the first source frame
    if (f >= x[n - 1]) return y[n - 1];
    const i = seg(f);
    const h = x[i + 1] - x[i];
    const t = (f - x[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
  const speed = (f: number): number => (at(f + 0.5) - at(f - 0.5));
  return { at, speed, knots };
}

/**
 * The usual ramp: the shot shows source `srcIn` on its first frame and reaches the take's moment `srcEvent` exactly on
 * output frame `outEvent`, arriving at 1× (`landSpeed`) so the moment itself plays real; after it the take runs at
 * `afterSpeed` (1 = real time, 0 = a hold) to the shot's end `outEnd`.
 */
export function ramp(o: { srcIn: number; srcEvent: number; outEvent: number; outEnd: number; landSpeed?: number; afterSpeed?: number; landFrames?: number }): Warp {
  const land = o.landSpeed ?? 1;
  const after = o.afterSpeed ?? 1;
  const lf = Math.min(o.landFrames ?? 8, o.outEvent * 0.5);
  const knots: Knot[] = [[0, o.srcIn]];
  if (o.outEvent - lf > 0.5) knots.push([o.outEvent - lf, Math.max(o.srcIn, o.srcEvent - land * lf)]);
  knots.push([o.outEvent, o.srcEvent]);
  if (o.outEnd > o.outEvent + 0.5) knots.push([o.outEnd, o.srcEvent + after * (o.outEnd - o.outEvent)]);
  return warp(knots);
}

/** Real time: the source runs 1× from `srcIn`. */
export const realTime = (srcIn: number, len: number): Warp => warp([[0, srcIn], [Math.max(1, len), srcIn + Math.max(1, len)]]);
