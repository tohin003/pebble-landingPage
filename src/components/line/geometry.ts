// The pebble's path: pure geometry, no DOM (docs/DESIGN.md §2, ported from design comp 3's `buildTrail`).
//
// Input: the anchors that sections register (PebblePath.tsx reads them from the DOM), in document order, and the page
// size. Output: polylines in page coordinates, ready for <path d>, with their arc lengths for the scroll draw-on.
//
// 1. Waypoints: the line leaves from under the hero pebble, runs down a margin, sweeps across the page in the gaps
//    between sections (S-curves), passes through rail stops, rises into the dial's arch, has a gap at a gate, and
//    ends under the sleeping pebble in the footer. Long descents get gentle sideways sways, so no stretch is straight.
// 2. A centripetal Catmull-Rom spline through the waypoints (cubic Bézier segments), flattened to a fine polyline.
// 3. Resampled every 5 px along its length, with a slow sine wobble along the normal (the hand-drawn feel), unless
//    `wobble` is false (reduced motion or Pause motion: DESIGN asks for a static path with no wobble).
// 4. Cut into pieces: a fade-in at the start, a fade-out at the end, and a gap at each gate.

export type Pt = readonly [number, number];

export type AnchorKind = "floor" | "cross" | "stop" | "arc" | "gate" | "margin";

/** One registered anchor, measured in page coordinates (CSS px from the top-left of the page). */
export type Anchor = Readonly<{
  kind: AnchorKind;
  left: number;
  top: number;
  width: number;
  height: number;
  /** cross: the element's top padding (the sweep is centred on top + padTop / 2) */
  padTop?: number;
  /** arc: radius and centre (y from the element's top), from --path-r and --path-cy */
  radius?: number;
  arcCy?: number;
  /** phones keep only floors and stops unless an anchor says "keep" */
  phone?: "keep" | "skip";
}>;

export type PathOptions = Readonly<{
  width: number;
  height: number;
  /** add the hand-drawn wobble (false under reduced or paused motion) */
  wobble: boolean;
}>;

export type PathPiece = Readonly<{
  d: string;
  /** arc length where the piece starts and its own length */
  start: number;
  length: number;
  /** "in" and "out" pieces are stroked with a fade gradient running from x0 to x1 */
  fade?: Readonly<{ kind: "in" | "out"; x0: number; x1: number; y: number }>;
}>;

export type Gate = Readonly<{ x: number; y: number; side: "left" | "right" }>;

export type PathGeometry = Readonly<{
  width: number;
  height: number;
  pieces: readonly PathPiece[];
  gates: readonly Gate[];
  total: number;
  /** for the draw-on: sample arc lengths and the lowest y reached so far at each (monotonic) */
  samples: Readonly<{ s: Float64Array; maxY: Float64Array }>;
}>;

const STEP = 5; // resampling step, px
const GATE_HALF = 9; // half the gate's gap, px of arc length
const PHONE_MAX = 560;
const NARROW_MAX = 899;

export function isPhone(width: number): boolean {
  return width <= PHONE_MAX;
}

/** The line's x position in the left and right margins. Off the canvas below 900 px, as in comp 3. */
export function margins(width: number): { xL: number; xR: number; narrow: boolean } {
  const narrow = width <= NARROW_MAX;
  const content = Math.min(1120, width - 48);
  const xL = narrow ? -40 : Math.max(36, (width - content) / 2 - 82);
  return { xL, xR: width - xL, narrow };
}

type Side = "left" | "right";

type Plan = {
  pts: Pt[];
  gates: Gate[];
  fadeIn: { x0: number; x1: number; y: number } | null;
  fadeOut: { x0: number; x1: number; y: number } | null;
};

/** Step 1: the waypoints the spline passes through. */
export function planWaypoints(anchors: readonly Anchor[], width: number): Plan {
  const phone = isPhone(width);
  const { xL, xR, narrow } = margins(width);
  const cx = width / 2;
  const pts: Pt[] = [];
  const gates: Gate[] = [];
  let fadeIn: Plan["fadeIn"] = null;
  let fadeOut: Plan["fadeOut"] = null;
  const add = (x: number, y: number) => pts.push([x, y]);
  const xOf = (side: Side) => (side === "left" ? xL : xR);
  const sign = (side: Side) => (side === "left" ? -1 : 1);
  const other = (side: Side): Side => (side === "left" ? "right" : "left");
  // a slow descent along a margin, never quite straight
  const sway = (side: Side, y0: number, y1: number) => {
    const n = Math.max(1, Math.round((y1 - y0) / 360));
    for (let i = 1; i < n; i++) add(xOf(side) + (i % 2 ? 1 : -1) * sign(side) * 11, y0 + ((y1 - y0) * i) / n);
  };

  const usable = anchors.filter((a) => {
    if (!phone) return true;
    if (a.phone === "keep") return true;
    if (a.phone === "skip") return false;
    return a.kind === "floor" || a.kind === "stop";
  });
  const floors = usable.filter((a) => a.kind === "floor");
  if (floors.length === 0) return { pts, gates, fadeIn, fadeOut };
  if (floors.length === 1) {
    // A page with only the footer's pebble (the 404, /credits …): just the ground it rests on, fading at both ends.
    const only = floors[0]!;
    const reach = Math.min(220, width * 0.36);
    const y = only.top;
    add(cx - reach, y);
    add(cx - reach * 0.45, y + 0.8);
    add(cx + reach * 0.45, y + 0.8);
    add(cx + reach, y);
    fadeIn = { x0: cx - reach - 2, x1: cx - reach * 0.3, y };
    fadeOut = { x0: cx + reach * 0.3, x1: cx + reach + 2, y };
    return { pts, gates, fadeIn, fadeOut };
  }
  const first = floors[0]!;
  const last = floors[floors.length - 1]!;

  // 1 the ground line under the hero pebble, which then leaves the light to the right
  let side: Side = "right";
  const fy = first.top;
  const g0 = Math.min(210, width * 0.36);
  add(cx - g0, fy + 1);
  add(cx - g0 / 3, fy + 1.5);
  add(cx + 80, fy + 2.5);
  let lastY: number;
  if (narrow) {
    add(cx + (phone ? 120 : 150), fy + 6);
    add(width + 30, fy + 44);
    lastY = fy + 44;
  } else {
    add(cx + 330, fy + 8);
    add(xR - 90, fy + 34);
    add(xR, fy + 150);
    lastY = fy + 150;
  }
  fadeIn = { x0: cx - g0 - 4, x1: cx - g0 * 0.12, y: fy };

  const rest = usable.slice(usable.indexOf(first) + 1, usable.indexOf(last));
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.kind === "margin") continue;

    if (a.kind === "cross") {
      if (phone) continue;
      const gy = a.top + (a.padTop ?? 0) / 2;
      // Keep the sweep inside the gap above the section (its top padding): an end that rose above it or dropped below
      // it runs through the last line of the section before, or this section's heading (tools/qa/line-check.mjs).
      const band = a.padTop === undefined ? Infinity : a.padTop / 2 - 10;
      const span = Math.min(120, gy - lastY - 40, band);
      if (span < 40) continue; // too close to the previous feature: stay on this side
      const from = xOf(side);
      const to = xOf(other(side));
      sway(side, lastY, gy - span);
      add(from, gy - span);
      add(from + (to - from) * 0.16, gy - span * 0.42);
      add(cx, gy);
      add(to - (to - from) * 0.16, gy + span * 0.42);
      add(to, gy + span);
      side = other(side);
      lastY = gy + span;
      continue;
    }

    if (a.kind === "stop") {
      // a run of consecutive stops: in from this side, through every stop, out on the other side
      const run: Anchor[] = [a];
      while (rest[i + 1]?.kind === "stop") run.push(rest[++i]!);
      const centres = run.map((s) => [s.left + s.width / 2, s.top + s.height / 2] as const);
      const ry = centres.reduce((sum, c) => sum + c[1], 0) / centres.length;
      centres.sort((p, q) => (side === "left" ? p[0] - q[0] : q[0] - p[0]));
      const near = xOf(side);
      const far = xOf(other(side));
      const dir = side === "left" ? 1 : -1;
      const reach = narrow ? 60 : 150;
      const lead = Math.min(120, Math.max(40, ry - lastY - 20));
      sway(side, lastY, ry - lead);
      add(near, ry - lead);
      add(near + dir * (narrow ? 30 : 46), ry - Math.min(26, lead / 3));
      add(centres[0]![0] - dir * reach, ry);
      for (const c of centres) add(c[0], c[1]);
      add(centres[centres.length - 1]![0] + dir * reach, ry);
      add(far - dir * (narrow ? 30 : 46), ry + 26);
      add(far, ry + 120);
      side = other(side);
      lastY = ry + 120;
      continue;
    }

    if (a.kind === "arc") {
      // the anchor's box is the arch's box (2R wide, R tall, baseline at its bottom) unless --path-r/--path-cy say otherwise
      const R = a.radius ?? a.width / 2;
      const dcx = a.left + a.width / 2;
      const dcy = a.top + (a.arcCy ?? a.height);
      const lead = Math.min(150, Math.max(40, dcy - lastY - 20));
      sway(side, lastY, dcy - lead);
      const dir = side === "left" ? 1 : -1;
      const near = xOf(side);
      const far = xOf(other(side));
      add(near, dcy - lead);
      add(near + dir * (narrow ? 26 : 50), dcy - 16);
      add(dcx - dir * (R + (narrow ? 70 : 120)), dcy);
      add(dcx - dir * (R + (narrow ? 22 : 34)), dcy - 3);
      // over the arch from the near foot to the far one: 168° to 12° from the left, mirrored from the right
      for (let deg = 168; deg >= 12; deg -= 6) {
        const r = (deg * Math.PI) / 180;
        add(dcx + dir * Math.cos(r) * R, dcy - Math.sin(r) * R);
      }
      add(dcx + dir * (R + (narrow ? 22 : 34)), dcy - 3);
      add(dcx + dir * (R + (narrow ? 70 : 120)), dcy);
      add(far - dir * (narrow ? 26 : 50), dcy + 16);
      add(far, dcy + 150);
      side = other(side);
      lastY = dcy + 150;
      continue;
    }

    if (a.kind === "gate") {
      const gy = a.top + a.height / 2;
      if (gy - 70 < lastY) continue;
      sway(side, lastY, gy - 70);
      add(xOf(side), gy - 70);
      add(xOf(side), gy);
      add(xOf(side), gy + 70);
      gates.push({ x: xOf(side), y: gy, side });
      lastY = gy + 70;
      continue;
    }
  }

  // the end: the line comes in to the centre and the sleeping pebble rests on it
  {
    const ey = last.top;
    const lead = Math.max(40, Math.min(150, ey - lastY - 20));
    sway(side, lastY, ey - lead);
    const dir = side === "left" ? 1 : -1;
    const tail = Math.min(230, width * 0.36); // past the pebble, then it fades out (on screen, even on phones)
    add(xOf(side), ey - lead);
    add(xOf(side) + dir * (narrow ? 26 : 60), ey - 14);
    add(cx - dir * Math.min(150, width * 0.3), ey + 0.5);
    add(cx, ey + 1);
    add(cx + dir * tail * 0.52, ey + 0.5);
    add(cx + dir * tail, ey);
    fadeOut = { x0: cx + dir * Math.min(40, tail * 0.2), x1: cx + dir * (tail + 2), y: ey };
  }
  return { pts, gates, fadeIn, fadeOut };
}

type Cubic = readonly [number, number, number, number, number, number, number, number];

/** Step 2: centripetal Catmull-Rom through the points (ends repeated), as cubic Bézier segments. */
export function catmullRom(points: readonly Pt[]): Cubic[] {
  if (points.length < 2) return [];
  const p = [points[0]!, ...points, points[points.length - 1]!];
  const dist = (a: Pt, b: Pt) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const out: Cubic[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1]!, p1 = p[i]!, p2 = p[i + 1]!, p3 = p[i + 2]!;
    const d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
    const c1 = [0, 1].map((k) => (d1 * d1 * p2[k]! - d2 * d2 * p0[k]! + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]!) / (3 * d1 * (d1 + d2)));
    const c2 = [0, 1].map((k) => (d3 * d3 * p1[k]! - d2 * d2 * p3[k]! + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]!) / (3 * d3 * (d3 + d2)));
    out.push([p1[0], p1[1], c1[0]!, c1[1]!, c2[0]!, c2[1]!, p2[0], p2[1]]);
  }
  return out;
}

/** Flattens the curve into a dense polyline (about one point per 2 px). */
export function flatten(segments: readonly Cubic[]): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  segments.forEach((s, index) => {
    const chord = Math.hypot(s[6] - s[0], s[7] - s[1]) + Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
    const n = Math.max(4, Math.ceil(chord / 2));
    for (let i = index === 0 ? 0 : 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      x.push(u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6]);
      y.push(u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7]);
    }
  });
  return { x, y };
}

/** The hand-drawn wobble (comp 3): two slow sines along the arc length, about ±1.35 px. */
export function wobbleAt(s: number): number {
  return 0.9 * Math.sin(s / 61 + 1.3) + 0.45 * Math.sin(s / 23.5 + 0.4);
}

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();

/** Steps 1–4. */
export function buildPath(anchors: readonly Anchor[], options: PathOptions): PathGeometry | null {
  const plan = planWaypoints(anchors, options.width);
  if (plan.pts.length < 4) return null;
  const dense = flatten(catmullRom(plan.pts));
  const n = dense.x.length;
  if (n < 2) return null;

  // cumulative length of the dense polyline
  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1]! + Math.hypot(dense.x[i]! - dense.x[i - 1]!, dense.y[i]! - dense.y[i - 1]!);
  const total = cum[n - 1]!;

  // resample every STEP px, with the wobble along the normal
  const count = Math.floor(total / STEP) + 1;
  const sx = new Float64Array(count);
  const sy = new Float64Array(count);
  const ss = new Float64Array(count);
  let j = 0;
  for (let k = 0; k < count; k++) {
    const s = Math.min(total, k * STEP);
    while (j < n - 2 && cum[j + 1]! < s) j++;
    const span = cum[j + 1]! - cum[j]! || 1;
    const t = (s - cum[j]!) / span;
    const px = dense.x[j]! + (dense.x[j + 1]! - dense.x[j]!) * t;
    const py = dense.y[j]! + (dense.y[j + 1]! - dense.y[j]!) * t;
    let nx = -(dense.y[j + 1]! - dense.y[j]!);
    let ny = dense.x[j + 1]! - dense.x[j]!;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const w = options.wobble ? wobbleAt(s) : 0;
    sx[k] = px + nx * w;
    sy[k] = py + ny * w;
    ss[k] = s;
  }

  // the lowest point reached so far, for the scroll draw-on
  const maxY = new Float64Array(count);
  for (let k = 0; k < count; k++) maxY[k] = Math.max(k ? maxY[k - 1]! : -Infinity, sy[k]!);

  // where to cut: the start fade, the end fade and every gate
  const cuts: { at: number; kind: "fade-in-end" | "fade-out-start" | "gate" }[] = [];
  if (plan.fadeIn) {
    const x1 = plan.fadeIn.x1;
    let k = 0;
    while (k < count - 1 && sx[k]! < x1) k++;
    cuts.push({ at: ss[k]!, kind: "fade-in-end" });
  }
  if (plan.fadeOut) {
    const { x0 } = plan.fadeOut;
    const toRight = plan.fadeOut.x1 > x0;
    let k = count - 1;
    while (k > 0 && (toRight ? sx[k]! > x0 : sx[k]! < x0)) k--;
    cuts.push({ at: ss[k]!, kind: "fade-out-start" });
  }
  for (const gate of plan.gates) {
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < count; k++) {
      const d = Math.abs(sy[k]! - gate.y) + Math.abs(sx[k]! - gate.x) * 0.5;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    cuts.push({ at: ss[best]!, kind: "gate" });
  }
  cuts.sort((a, b) => a.at - b.at);

  // pieces between the cuts (a gate removes GATE_HALF on either side)
  type Range = { from: number; to: number; fade?: PathPiece["fade"] };
  const ranges: Range[] = [];
  let cursor = 0;
  for (const cut of cuts) {
    if (cut.kind === "fade-in-end" && plan.fadeIn) {
      ranges.push({ from: cursor, to: cut.at, fade: { kind: "in", x0: plan.fadeIn.x0, x1: plan.fadeIn.x1, y: plan.fadeIn.y } });
      cursor = cut.at;
    } else if (cut.kind === "gate") {
      ranges.push({ from: cursor, to: Math.max(cursor, cut.at - GATE_HALF) });
      cursor = cut.at + GATE_HALF;
    } else if (cut.kind === "fade-out-start" && plan.fadeOut) {
      ranges.push({ from: cursor, to: cut.at });
      ranges.push({ from: cut.at, to: total, fade: { kind: "out", x0: plan.fadeOut.x0, x1: plan.fadeOut.x1, y: plan.fadeOut.y } });
      cursor = total;
    }
  }
  if (cursor < total) ranges.push({ from: cursor, to: total });

  const pieces: PathPiece[] = [];
  for (const range of ranges) {
    const k0 = Math.max(0, Math.floor(range.from / STEP));
    const k1 = Math.min(count - 1, Math.ceil(range.to / STEP));
    if (k1 - k0 < 1) continue;
    let d = `M${f1(sx[k0]!)} ${f1(sy[k0]!)}`;
    for (let k = k0 + 1; k <= k1; k++) d += `L${f1(sx[k]!)} ${f1(sy[k]!)}`;
    pieces.push({ d, start: ss[k0]!, length: ss[k1]! - ss[k0]!, fade: range.fade });
  }

  return { width: options.width, height: options.height, pieces, gates: plan.gates, total, samples: { s: ss, maxY } };
}

/** How much of the line is drawn when the reader has seen down to `y`: the arc length before the line first goes below y. */
export function drawnLength(geometry: PathGeometry, y: number): number {
  const { s, maxY } = geometry.samples;
  let lo = 0;
  let hi = maxY.length - 1;
  if (maxY[hi]! <= y) return geometry.total;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (maxY[mid]! <= y) lo = mid + 1;
    else hi = mid;
  }
  return s[lo]!;
}
