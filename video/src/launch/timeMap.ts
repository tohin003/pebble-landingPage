// Source-time remapping for real takes (pure, no React). The film may compress Pebble's waits ("edited for time"), but
// every frame it shows is a real frame of the take: a time map only chooses WHICH source frame each output frame shows,
// and it never runs backwards. Knots pin output seconds to source seconds; between them a monotone cubic
// (Fritsch–Carlson) joins them, so the speed ramps smoothly instead of stepping.
//
//   rampTo({ srcIn: 44, srcEvent: 52.5, outEvent: 1.2 })      // fast through the wait, 1× from 0.3 s before the presses
//   steps(44, [{ to: 52.4, dur: 0.8 }, { to: 56.6, dur: 4.2 }]) // 8.4 s of source in 0.8 s, then 4.2 s at 1×
//   timeMap([[0, 44], [0.8, 52.4], [5, 56.6]], { tail: 0 })    // the same knots, holding the last frame after 5 s

export type TKnot = readonly [out: number, src: number];

export interface TimeMap {
  /** the source second shown at output second `t` */
  at(t: number): number;
  /** the first output second at which the source reaches `src` (the inverse; for placing camera keys on source events) */
  inv(src: number): number;
  /** source seconds per output second at `t` (1 = real time, 0 = a hold) */
  speed(t: number): number;
  knots: readonly TKnot[];
}

export interface TimeMapOptions {
  /** speed after the last knot (1 = real time, 0 = hold the last frame) */
  tail?: number;
  /** speed before the first knot (0 = hold the first frame) */
  head?: number;
}

export function timeMap(knots: readonly TKnot[], { tail = 1, head = 0 }: TimeMapOptions = {}): TimeMap {
  if (knots.length < 2) throw new Error("timeMap: needs at least two knots");
  for (let i = 1; i < knots.length; i++) {
    if (!(knots[i][0] > knots[i - 1][0])) throw new Error(`timeMap: output times must increase (${knots[i - 1][0]} → ${knots[i][0]})`);
    if (knots[i][1] < knots[i - 1][1]) throw new Error(`timeMap: source times must not decrease (${knots[i - 1][1]} → ${knots[i][1]})`);
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
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  const at = (t: number): number => {
    if (t <= x[0]) return Math.max(0, y[0] - head * (x[0] - t));
    if (t >= x[n - 1]) return y[n - 1] + tail * (t - x[n - 1]);
    let i = 0;
    while (i < n - 2 && t > x[i + 1]) i++;
    const h = x[i + 1] - x[i];
    const u = (t - x[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y[i + 1] + (u3 - u2) * h * m[i + 1];
  };
  const inv = (src: number): number => {
    if (src <= y[0]) return x[0];
    let lo = x[0];
    let hi = x[n - 1];
    if (src > y[n - 1]) {
      if (tail <= 0) return Infinity;
      return x[n - 1] + (src - y[n - 1]) / tail;
    }
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (at(mid) < src) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const speed = (t: number): number => (at(t + 0.005) - at(t - 0.005)) / 0.01;
  return { at, inv, speed, knots };
}

/** Real time from `srcStart`: output 0 shows source `srcStart`. */
export const realTime = (srcStart: number): TimeMap => timeMap([[0, srcStart], [1, srcStart + 1]], { tail: 1, head: 1 });

/**
 * The usual ramp: output 0 shows `srcIn`; the source runs fast through the wait and reaches the moment `srcEvent` at
 * output `outEvent`, arriving at 1× for the last `land` seconds so the moment itself plays in real time; after it the
 * take runs at `tail` (1 = real time, 0 = a hold).
 */
export const rampTo = (o: { srcIn: number; srcEvent: number; outEvent: number; land?: number; tail?: number }): TimeMap => {
  if (!(o.outEvent > 0)) throw new Error(`rampTo: outEvent must be after output 0 (got ${o.outEvent})`);
  if (o.srcEvent < o.srcIn) throw new Error(`rampTo: the event (${o.srcEvent}) comes before srcIn (${o.srcIn})`);
  const land = Math.min(o.land ?? 0.3, o.outEvent * 0.5, o.srcEvent - o.srcIn);
  const knots: TKnot[] = [[0, o.srcIn]];
  if (o.outEvent - land > 1e-3) knots.push([o.outEvent - land, o.srcEvent - land]);
  knots.push([o.outEvent, o.srcEvent]);
  knots.push([o.outEvent + 1, o.srcEvent + (o.tail ?? 1)]);
  return timeMap(knots, { tail: o.tail ?? 1 });
};

/** Consecutive pieces: from `srcStart`, reach source `to` after `dur` output seconds, then the next piece, … */
export const steps = (srcStart: number, pieces: readonly { to: number; dur: number }[], opts?: TimeMapOptions): TimeMap => {
  const knots: TKnot[] = [[0, srcStart]];
  let t = 0;
  for (const p of pieces) {
    t += p.dur;
    knots.push([t, p.to]);
  }
  return timeMap(knots, opts);
};

/** A piece of a take played at a constant speed (data/takes.ts `Ramp`): source [s0, s1) at `speed`. */
export interface RampSegment {
  s0: number;
  s1: number;
  speed: number;
}

/**
 * The takes lane's ramps as one time map: the segments play in order from output 0, each at its speed. Where one
 * segment ends where the next begins, the speed changes linearly over a short ramp (`ramp` seconds each side of the
 * boundary, never more than a quarter of either segment): the picture never jolts from 1× to 20×, and everything
 * outside the ramp windows plays exactly as the segments say (inside a window the source runs up to (v₂ − v₁)·ramp/4
 * seconds ahead). Where the next segment begins later in the take, it is a hard jump cut on that frame. After the last
 * segment the take runs on at `tail` (1 = real time, 0 = hold). Place cues on a source event with `inv(s)`.
 */
export const fromRamps = (segments: readonly RampSegment[], { ramp = 0.1, tail = 1 }: { ramp?: number; tail?: number } = {}): TimeMap & { duration: number } => {
  if (!segments.length) throw new Error("fromRamps: no segments");
  const seg = segments.map((g, i) => {
    if (!(g.speed > 0)) throw new Error(`fromRamps: segment ${i} has speed ${g.speed}`);
    if (!(g.s1 > g.s0)) throw new Error(`fromRamps: segment ${i} is empty (${g.s0} → ${g.s1})`);
    if (i > 0 && g.s0 < segments[i - 1].s1 - 1e-6) throw new Error(`fromRamps: segment ${i} starts before the previous one ends (no backward jumps)`);
    return { ...g, d: (g.s1 - g.s0) / g.speed };
  });
  const starts: number[] = [];
  let acc = 0;
  for (const g of seg) {
    starts.push(acc);
    acc += g.d;
  }
  const total = acc;
  // the ramp's half-width at each internal boundary (0 at a jump cut)
  const half = seg.map((g, i) => {
    if (i === 0) return 0;
    const prev = seg[i - 1];
    if (Math.abs(g.s0 - prev.s1) > 1e-6) return 0;
    return Math.min(ramp, prev.d / 4, g.d / 4);
  });
  const linear = (i: number, t: number) => seg[i].s0 + (t - starts[i]) * seg[i].speed;
  const at = (t: number): number => {
    if (t <= 0) return seg[0].s0;
    if (t >= total) return seg[seg.length - 1].s1 + tail * (t - total);
    let i = 0;
    while (i < seg.length - 1 && t >= starts[i + 1]) i++;
    // inside a ramp round the boundary at the start of segment i, or of segment i + 1
    for (const j of [i, i + 1]) {
      if (j <= 0 || j >= seg.length || half[j] <= 0) continue;
      const b = starts[j];
      const r = half[j];
      if (t > b - r && t < b + r) {
        const va = seg[j - 1].speed;
        const vb = seg[j].speed;
        const tau = t - (b - r);
        return linear(j - 1, b - r) + va * tau + ((vb - va) * tau * tau) / (4 * r);
      }
    }
    return linear(i, t);
  };
  const inv = (src: number): number => {
    if (src <= seg[0].s0) return 0;
    const end = seg[seg.length - 1].s1;
    if (src >= end) return tail > 0 ? total + (src - end) / tail : total;
    let lo = 0;
    let hi = total;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (at(mid) < src) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const speed = (t: number): number => (at(t + 0.005) - at(t - 0.005)) / 0.01;
  return { at, inv, speed, knots: seg.map((g, i) => [starts[i], g.s0] as TKnot), duration: total };
};
