// The velocity camera (TREATMENT §5.3, §5.5 rule 1; CRAFT T01, S01). It replaces the old film's arrive-and-hold camera
// (motion/camera.ts: "a key is an ARRIVAL ... and holds"), which put every cut between two rests.
//
// - The state is the world point at the frame's centre (x, y, in world units: one unit is one CSS px of a capture at 1×)
//   and the log of the zoom (lz; zoom = frame px per world unit). Zoom always moves in log space.
// - A track is a chain of segments, each a pure function of the frame with an exact velocity:
//     hermite  cubic Hermite on x, y and lz between two states with given velocities (C1 by construction);
//     ease     a named curve from one state to another (E-leave into a cut, E-arrive out of one, E-move inside a shot);
//     glide    the coast after an arrival: v = v_d + (v0 − v_d)·e^(−t/τ), settling into a drift of ≤ 1 px a frame.
//   Each segment starts where the previous one ended. Hermite and glide segments also start at its velocity.
// - Beyond its last segment a track keeps moving at its last velocity, so a shot that runs long never freezes.
// - Momentum across a cut: arriveWithMomentum() builds the incoming camera so the content under the frame's centre
//   leaves the cut at the outgoing shot's screen velocity (T01: E-leave out, E-arrive or a glide in).
//
// Frames are local to the shot. Velocities are per frame. Pure; no React.
import type { Point, Vec } from "./geometry";
import { E_ARRIVE, curve as curveByName, glideDistance, glideVelocity, type Curve } from "./ease";

export interface CamState {
  x: number;
  y: number;
  /** log of the zoom */
  lz: number;
}
export type CamVel = CamState;
export interface Pose {
  x: number;
  y: number;
  zoom: number;
}

const ZERO: CamVel = { x: 0, y: 0, lz: 0 };
export const toState = (p: Pose): CamState => ({ x: p.x, y: p.y, lz: Math.log(p.zoom) });
export const toPose = (s: CamState): Pose => ({ x: s.x, y: s.y, zoom: Math.exp(s.lz) });
const fill = (v?: Partial<CamVel>): CamVel => ({ x: v?.x ?? 0, y: v?.y ?? 0, lz: v?.lz ?? 0 });

type Segment =
  | { kind: "hermite"; f0: number; f1: number; a: CamState; b: CamState; va: CamVel; vb: CamVel }
  | { kind: "ease"; f0: number; f1: number; a: CamState; b: CamState; curve: Curve }
  | { kind: "glide"; f0: number; f1: number; a: CamState; v0: CamVel; vd: CamVel; tau: number };

export interface CamSample {
  frame: number;
  state: CamState;
  vel: CamVel;
  pose: Pose;
}

const hermite = (p0: number, p1: number, m0: number, m1: number, u: number, T: number): [number, number] => {
  // m0, m1 are per-frame velocities; Hermite tangents are velocity × segment length
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const pos = h00 * p0 + h10 * m0 * T + h01 * p1 + h11 * m1 * T;
  const d00 = 6 * u2 - 6 * u;
  const d10 = 3 * u2 - 4 * u + 1;
  const d01 = -6 * u2 + 6 * u;
  const d11 = 3 * u2 - 2 * u;
  const vel = (d00 * p0 + d10 * m0 * T + d01 * p1 + d11 * m1 * T) / T;
  return [pos, vel];
};

const evalSegment = (seg: Segment, frame: number): { s: CamState; v: CamVel } => {
  const T = seg.f1 - seg.f0;
  const t = Math.min(Math.max(frame - seg.f0, 0), T);
  if (seg.kind === "hermite") {
    const u = T > 0 ? t / T : 1;
    const [x, vx] = hermite(seg.a.x, seg.b.x, seg.va.x, seg.vb.x, u, T);
    const [y, vy] = hermite(seg.a.y, seg.b.y, seg.va.y, seg.vb.y, u, T);
    const [lz, vlz] = hermite(seg.a.lz, seg.b.lz, seg.va.lz, seg.vb.lz, u, T);
    return { s: { x, y, lz }, v: { x: vx, y: vy, lz: vlz } };
  }
  if (seg.kind === "ease") {
    const u = T > 0 ? t / T : 1;
    const e = seg.curve(u);
    const de = T > 0 ? seg.curve.slope(u) / T : 0;
    return {
      s: { x: seg.a.x + (seg.b.x - seg.a.x) * e, y: seg.a.y + (seg.b.y - seg.a.y) * e, lz: seg.a.lz + (seg.b.lz - seg.a.lz) * e },
      v: { x: (seg.b.x - seg.a.x) * de, y: (seg.b.y - seg.a.y) * de, lz: (seg.b.lz - seg.a.lz) * de },
    };
  }
  const g = (k: keyof CamState) => [seg.a[k] + glideDistance(t, seg.v0[k], seg.vd[k], seg.tau), glideVelocity(t, seg.v0[k], seg.vd[k], seg.tau)];
  const [x, vx] = g("x");
  const [y, vy] = g("y");
  const [lz, vlz] = g("lz");
  return { s: { x: x!, y: y!, lz: lz! }, v: { x: vx!, y: vy!, lz: vlz! } };
};

export class VelocityCamera {
  private readonly segments: Segment[] = [];
  private readonly startFrame: number;
  private readonly startState: CamState;
  private readonly startVel: CamVel;

  /** A camera at `pose` on `startFrame`, already moving at `vel` (per frame) if given. */
  constructor(pose: Pose, vel?: Partial<CamVel>, startFrame = 0) {
    this.startFrame = startFrame;
    this.startState = toState(pose);
    this.startVel = fill(vel);
  }

  /** The state and velocity where the track currently ends. */
  end(): { frame: number; state: CamState; vel: CamVel } {
    const last = this.segments[this.segments.length - 1];
    if (!last) return { frame: this.startFrame, state: this.startState, vel: this.startVel };
    const e = evalSegment(last, last.f1);
    return { frame: last.f1, state: e.s, vel: e.v };
  }

  private push(seg: Segment) {
    if (!(seg.f1 > seg.f0)) throw new Error(`VelocityCamera: a segment must end after it starts (frame ${seg.f0} → ${seg.f1})`);
    this.segments.push(seg);
    return this;
  }

  /** A cubic Hermite move to `pose`, arriving at `vel` (default: at rest), starting at the current velocity. */
  hermite(toFrame: number, pose: Pose, vel?: Partial<CamVel>): this {
    const e = this.end();
    return this.push({ kind: "hermite", f0: e.frame, f1: toFrame, a: e.state, b: toState(pose), va: e.vel, vb: fill(vel) });
  }

  /**
   * A move to `pose` on a named curve: "E-leave" accelerates into a cut, "E-arrive" lands after one, "E-move" is a
   * rest-to-rest move inside a shot. The curve's own start speed applies (E-leave starts at rest).
   */
  ease(toFrame: number, pose: Pose, c: Curve | string): this {
    const e = this.end();
    const cv = typeof c === "string" ? curveByName(c) : c;
    return this.push({ kind: "ease", f0: e.frame, f1: toFrame, a: e.state, b: toState(pose), curve: cv });
  }

  /**
   * The glide: from the current velocity, coast and settle into `drift` (per frame) with time constant `tau` frames.
   * TREATMENT §5.3: τ = 0.25–0.5 s, drifting ≤ 1 px a frame while the UI acts.
   */
  glide(toFrame: number, tau: number, drift?: Partial<CamVel>): this {
    const e = this.end();
    return this.push({ kind: "glide", f0: e.frame, f1: toFrame, a: e.state, v0: e.vel, vd: fill(drift), tau });
  }

  /** A push-in or pull-back in log space by `factor` (1.06–1.15 for a push-in), as a Hermite to a drift. */
  pushBy(toFrame: number, factor: number, endVel?: Partial<CamVel>): this {
    const e = this.end();
    const p = toPose(e.state);
    return this.hermite(toFrame, { x: p.x, y: p.y, zoom: p.zoom * factor }, endVel);
  }

  /** State and velocity at `frame` (velocity per frame). */
  sample(frame: number): CamSample {
    let s: CamState;
    let v: CamVel;
    if (frame <= this.startFrame || this.segments.length === 0) {
      // before the first segment (or with none): moving at the start velocity, so a pre-roll stays continuous
      const t = frame - this.startFrame;
      s = { x: this.startState.x + this.startVel.x * t, y: this.startState.y + this.startVel.y * t, lz: this.startState.lz + this.startVel.lz * t };
      v = this.startVel;
    } else {
      const seg = this.segments.find((g) => frame <= g.f1);
      if (seg) {
        const r = evalSegment(seg, frame);
        s = r.s;
        v = r.v;
      } else {
        const e = this.end();
        const t = frame - e.frame; // past the end: keep the last velocity
        s = { x: e.state.x + e.vel.x * t, y: e.state.y + e.vel.y * t, lz: e.state.lz + e.vel.lz * t };
        v = e.vel;
      }
    }
    return { frame, state: s, vel: v, pose: toPose(s) };
  }

  pose(frame: number): Pose {
    return this.sample(frame).pose;
  }

  /** Last frame the track defines (motion continues past it at constant velocity). */
  get lastFrame(): number {
    return this.end().frame;
  }

  /** Segment boundaries (frames), for validators that look at hand-offs. */
  get joins(): number[] {
    return this.segments.map((s) => s.f0).concat(this.segments.length ? [this.segments[this.segments.length - 1]!.f1] : []);
  }
}

/* ---------------------------------------------------------------- world ↔ frame ------------------------------ */

/** Where world point `p` lands in a frame of w × h px. */
export const worldToFrame = (p: Point, pose: Pose, w: number, h: number): Point => ({
  x: w / 2 + (p.x - pose.x) * pose.zoom,
  y: h / 2 + (p.y - pose.y) * pose.zoom,
});
export const frameToWorld = (p: Point, pose: Pose, w: number, h: number): Point => ({
  x: pose.x + (p.x - w / 2) / pose.zoom,
  y: pose.y + (p.y - h / 2) / pose.zoom,
});

/** The CSS matrix that maps world units to frame px for this pose (transform-origin 0 0). */
export const poseMatrix = (pose: Pose, w: number, h: number): string => {
  const z = pose.zoom;
  return `matrix(${z.toFixed(6)}, 0, 0, ${z.toFixed(6)}, ${(w / 2 - pose.x * z).toFixed(3)}, ${(h / 2 - pose.y * z).toFixed(3)})`;
};

/**
 * A parallax plane at depth factor k (0.4 far ground, 1 the UI, 1.15 near): relative to the reference pose (where
 * every plane lines up) it travels k times as far and zooms k times as much in log space.
 */
export const planePose = (pose: Pose, ref: Pose, k: number): Pose =>
  k === 1 ? pose : { x: ref.x + (pose.x - ref.x) * k, y: ref.y + (pose.y - ref.y) * k, zoom: ref.zoom * Math.pow(pose.zoom / ref.zoom, k) };

/**
 * The screen velocity (frame px per frame) of the content at frame point `p` under a moving camera:
 * dP/dt = −zoom·(vx, vy) + (P − centre)·vlz. For a parallax plane, scale the velocity by its depth factor first.
 */
export const screenVelocity = (sample: CamSample, p: Point, w: number, h: number, depth = 1): Vec => {
  const z = sample.pose.zoom;
  const vx = sample.vel.x * depth;
  const vy = sample.vel.y * depth;
  const vlz = sample.vel.lz * depth;
  return { x: -z * vx + (p.x - w / 2) * vlz, y: -z * vy + (p.y - h / 2) * vlz };
};

/** The largest screen speed over a set of probe points (the frame's centre and corners by default). */
export const maxScreenSpeed = (sample: CamSample, w: number, h: number, probes?: readonly Point[], depth = 1): number => {
  const pts = probes ?? [
    { x: w / 2, y: h / 2 },
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ];
  return Math.max(
    ...pts.map((p) => {
      const v = screenVelocity(sample, p, w, h, depth);
      return Math.hypot(v.x, v.y);
    }),
  );
};

/* ---------------------------------------------------------------- momentum across a cut (T01) ---------------- */

export interface MomentumIn {
  /** the framing the incoming shot lands on */
  target: Pose;
  /** frames over which it lands (E-arrive) or the glide runs */
  frames: number;
  /** the outgoing shot's screen velocity at the cut, px per frame, of the content it hands over (usually the centre) */
  vScreen: Vec;
  /** the outgoing log-zoom velocity per frame (a push-in carried across the cut), default 0 */
  vlz?: number;
  /** "arrive" lands on E-arrive; "glide" coasts with time constant `tau` into `drift` */
  mode?: "arrive" | "glide";
  tau?: number;
  drift?: Partial<CamVel>;
  startFrame?: number;
}

/**
 * The incoming camera of a momentum cut: on its first frame the content under the frame's centre moves at the
 * outgoing velocity, then it decelerates and lands on `target`. With E-arrive, v_start = D·6.25/T, so the incoming
 * move covers D = v·T/6.25 (CRAFT T01: D_in/T_in = 0.68·D_out/T_out after an E-leave).
 */
export function arriveWithMomentum(m: MomentumIn): VelocityCamera {
  const mode = m.mode ?? "arrive";
  const t = m.target;
  const start = m.startFrame ?? 0;
  const vlz = m.vlz ?? 0;
  if (mode === "arrive") {
    const k = E_ARRIVE.v0; // 6.25
    const lzA = Math.log(t.zoom) - (vlz * m.frames) / k;
    const zA = Math.exp(lzA);
    // camera world velocity that gives the centre content this screen velocity: v_cam = −v_screen / zoom
    const vc = { x: -m.vScreen.x / zA, y: -m.vScreen.y / zA };
    const from: Pose = { x: t.x - (vc.x * m.frames) / k, y: t.y - (vc.y * m.frames) / k, zoom: zA };
    return new VelocityCamera(from, { x: vc.x, y: vc.y, lz: vlz }, start).ease(start + m.frames, t, E_ARRIVE);
  }
  const tau = m.tau ?? 24;
  const d = fill(m.drift);
  const zA = t.zoom; // a glide's zoom follows its own velocity; solve x and y at the landing zoom
  const vc = { x: -m.vScreen.x / zA, y: -m.vScreen.y / zA, lz: vlz };
  const T = m.frames;
  const back = (k: keyof CamState) => glideDistance(T, vc[k], d[k], tau);
  const from: Pose = { x: t.x - back("x"), y: t.y - back("y"), zoom: Math.exp(Math.log(t.zoom) - back("lz")) };
  return new VelocityCamera(from, vc, start).glide(start + T, tau, d);
}

/** A still camera (a waiting state inside a take, or a locked frame while the product's own motion plays). */
export const lockedCamera = (pose: Pose): VelocityCamera => new VelocityCamera(pose, ZERO);

/* ---------------------------------------------------------------- scalar tracks (tilt, focus, light) ---------- */

export interface ScalarKey {
  at: number;
  v: number;
  /** velocity at the key, per frame (default 0: the key is a turning point) */
  dv?: number;
}

/** A Hermite track for one number (tilt degrees, focus depth, a light mix). Holds the first and last values outside. */
export class ScalarTrack {
  readonly keys: readonly ScalarKey[];
  constructor(keys: readonly ScalarKey[]) {
    if (keys.length === 0) throw new Error("ScalarTrack needs at least one key");
    for (let i = 1; i < keys.length; i++) if (!(keys[i]!.at > keys[i - 1]!.at)) throw new Error(`ScalarTrack: keys must be strictly increasing (key ${i})`);
    this.keys = keys;
  }
  at(frame: number): number {
    return this.sample(frame)[0];
  }
  /** [value, velocity per frame] */
  sample(frame: number): [number, number] {
    const k = this.keys;
    if (frame <= k[0]!.at) return [k[0]!.v, 0];
    const last = k[k.length - 1]!;
    if (frame >= last.at) return [last.v, 0];
    let i = 0;
    while (i < k.length - 1 && frame > k[i + 1]!.at) i++;
    const a = k[i]!;
    const b = k[i + 1]!;
    const T = b.at - a.at;
    return hermite(a.v, b.v, a.dv ?? 0, b.dv ?? 0, (frame - a.at) / T, T);
  }
}
