// The ring carrier (TREATMENT §3, pattern 2; §5.1 kind 1): sage hairline rings that leave the stone, travel and lead
// the camera to a place, frame an ask, and return to the stone as the ring's chapter ends on its receipt. Pure and
// frame-driven: a ring's whole life is data (phases), and its state on any frame is a function of that frame alone.
//
// Rules the geometry keeps (and qa/checks.ts enforces):
// - never over text being read: by default a ring lives on the ground layer, behind every window, so UI occludes it;
//   a ring drawn in front (an iris edge, the Drop's burst) is checked against every readable rect;
// - never drawn around a receipt: the "frame" phase takes an ask's rect, and a ring framing a rect never crosses it
//   (its radius is at least the rect's half-diagonal plus a clearance); the return to the stone happens on the
//   receipt's beat, behind the windows, and fades as it reaches the stone;
// - never distorts UI: the ripple refraction is drawn on the ground layer only (carrier/Ripple.tsx);
// - one ring chapter in flight at a time (echo ripples excepted).
//
// Coordinates: world units (one CSS px of a capture at 1×) for centres and radii; the hairline's width is in frame px
// at 1080 px on the frame's short side and never scales with the camera. Frames are composition-local.
import { RING, TRANSITION, f60 } from "../tokens";
import { E_ARRIVE, E_LEAVE, E_MOVE, curve, smoothstep, type Curve } from "../motion/ease";
import { lerpPt, rectCenter, rectHalfDiagonal, type Point, type Rect } from "../motion/geometry";

interface PhaseBase {
  /** length in frames (at the composition's fps) */
  frames: number;
  /** a curve name from motion/ease.ts; each kind has a default */
  ease?: string;
}
export type RingPhase =
  | (PhaseBase & { kind: "emit"; radius: number })
  /** a ring that fades in where it is (centre `at`, default the source) at `radius`: the convergence's first phase */
  | (PhaseBase & { kind: "appear"; radius: number; at?: Point })
  | (PhaseBase & { kind: "travel"; to: Point; radius?: number })
  | (PhaseBase & { kind: "frame"; rect: Rect; clearance?: number })
  | (PhaseBase & { kind: "hold" })
  | (PhaseBase & { kind: "burst"; radius: number | "edge" })
  | (PhaseBase & { kind: "return" })
  | (PhaseBase & { kind: "fade" });

export type RingLayer = "ground" | "front";

export interface RingSpec {
  id: string;
  /** frame the ring leaves the stone */
  start: number;
  /** the stone's centre, world units */
  source: Point;
  /** the stone's radius, world units: the ring is born at the stone's edge */
  stoneRadius: number;
  phases: readonly RingPhase[];
  /** extra rings, each `echoGap` frames later and `echoFade` as bright (default none) */
  echoes?: number;
  echoGap?: number;
  echoFade?: number;
  /**
   * "emit" (default): echoes are ripples that follow the emit and fade out (the stone dropping into water);
   * "all": echoes repeat every phase, delayed (a train of rings, as in the convergence).
   */
  echoMode?: "emit" | "all";
  tone?: "light" | "dark";
  /** hairline width in px at 1080 px on the short side (default RING.hairlinePx) */
  widthPx?: number;
  /** "ground" (default): behind the windows; "front": an iris edge, checked against readable rects */
  layer?: RingLayer;
  /** the emit and the burst refract the ground (default true) */
  ripple?: boolean;
}

export interface RingState {
  id: string;
  /** 0 for the ring itself, k for its k-th echo */
  echo: number;
  phase: RingPhase["kind"];
  c: Point;
  /** radius, world units */
  r: number;
  opacity: number;
  widthPx: number;
  layer: RingLayer;
  tone: "light" | "dark";
}

export interface RippleState {
  id: string;
  c: Point;
  /** world units */
  r: number;
  /** displacement amplitude, px at 1080 px on the short side (≤ 6, decaying to 0 over 30 frames at 60 fps) */
  amplitudePx: number;
  /** width of the refracting band, world units */
  band: number;
}

const DEFAULT_EASE: Record<RingPhase["kind"], Curve> = {
  emit: E_ARRIVE, // "the ring expands fast, then slows" (S06)
  appear: E_MOVE,
  travel: E_MOVE,
  frame: E_ARRIVE,
  hold: E_MOVE,
  burst: E_ARRIVE,
  return: E_LEAVE, // accelerates into the stone
  fade: E_MOVE,
};

export interface PhaseWindow {
  index: number;
  kind: RingPhase["kind"];
  f0: number;
  f1: number;
  from: { c: Point; r: number; opacity: number };
  to: { c: Point; r: number; opacity: number };
}

/**
 * Every phase's frame window and its start and end geometry. `edgeRadius(frame)` resolves a burst to "edge": the
 * world radius that reaches the frame's farthest corner from the ring's centre on that frame (the caller knows the
 * camera); without it, "edge" bursts to 3000 world units.
 */
export function phaseWindows(spec: RingSpec, edgeRadius?: (frame: number, c: Point) => number): PhaseWindow[] {
  const out: PhaseWindow[] = [];
  let c = spec.source;
  let r = spec.stoneRadius;
  let opacity = 0;
  let f = spec.start;
  spec.phases.forEach((ph, index) => {
    if (!(ph.frames > 0)) throw new Error(`ring ${spec.id}: phase ${index} (${ph.kind}) needs frames > 0`);
    const from = { c, r, opacity };
    let to = { c, r, opacity: opacity };
    switch (ph.kind) {
      case "emit":
        to = { c: spec.source, r: ph.radius, opacity: 1 };
        break;
      case "appear":
        from.c = ph.at ?? spec.source;
        from.r = ph.radius;
        from.opacity = 0;
        to = { c: ph.at ?? spec.source, r: ph.radius, opacity: 1 };
        break;
      case "travel":
        to = { c: ph.to, r: ph.radius ?? r, opacity: 1 };
        break;
      case "frame":
        to = { c: rectCenter(ph.rect), r: rectHalfDiagonal(ph.rect) + (ph.clearance ?? RING.frameClearancePx), opacity: 1 };
        break;
      case "hold":
        to = { c, r, opacity: 1 };
        break;
      case "burst": {
        const end = f + ph.frames;
        const R = ph.radius === "edge" ? (edgeRadius ? edgeRadius(end, c) : 3000) : ph.radius;
        to = { c, r: R, opacity: 1 };
        break;
      }
      case "return":
        to = { c: spec.source, r: spec.stoneRadius, opacity: 0 };
        break;
      case "fade":
        to = { c, r, opacity: 0 };
        break;
    }
    out.push({ index, kind: ph.kind, f0: f, f1: f + ph.frames, from, to });
    c = to.c;
    r = to.r;
    opacity = to.opacity;
    f += ph.frames;
  });
  return out;
}

/** The frame after the ring's last phase ends. */
export const ringEnd = (spec: RingSpec): number => spec.start + spec.phases.reduce((s, p) => s + p.frames, 0);

const mainState = (spec: RingSpec, frame: number, fps: number, edgeRadius?: (frame: number, c: Point) => number): RingState | null => {
  if (frame < spec.start || frame >= ringEnd(spec)) return null;
  // (an "all" echo calls this with its frame shifted back by its delay)
  const wins = phaseWindows(spec, edgeRadius);
  const w = wins.find((x) => frame < x.f1)!;
  const ph = spec.phases[w.index]!;
  const u = (frame - w.f0) / (w.f1 - w.f0);
  const e = (ph.ease ? curve(ph.ease) : DEFAULT_EASE[ph.kind])(u);
  const c = lerpPt(w.from.c, w.to.c, e);
  const r = w.from.r + (w.to.r - w.from.r) * e;
  let opacity: number;
  if (ph.kind === "emit") {
    // born at the stone's edge: the hairline appears over the emit's first 6 frames (at 60 fps)
    opacity = smoothstep(0, Math.max(1, f60(6, fps)), frame - w.f0);
  } else if (ph.kind === "appear") {
    opacity = E_MOVE(u);
  } else if (ph.kind === "return") {
    // it merges into the stone: full until 60 % of the return, gone by 95 % (before the contact frame)
    opacity = 1 - smoothstep(0.6, 0.95, u);
  } else {
    opacity = w.from.opacity + (w.to.opacity - w.from.opacity) * e;
  }
  return {
    id: spec.id,
    echo: 0,
    phase: ph.kind,
    c,
    r,
    opacity,
    widthPx: spec.widthPx ?? RING.hairlinePx,
    layer: spec.layer ?? "ground",
    tone: spec.tone ?? "light",
  };
};

/** The ring and its echo ripples on `frame` (empty when none is alive). */
export function ringStates(spec: RingSpec, frame: number, fps: number, edgeRadius?: (frame: number, c: Point) => number): RingState[] {
  const out: RingState[] = [];
  const m = mainState(spec, frame, fps, edgeRadius);
  if (m) out.push(m);
  const n = spec.echoes ?? 0;
  if ((spec.echoMode ?? "emit") === "all") {
    const gap = spec.echoGap ?? f60(RING.echoGapFrames, fps);
    for (let k = 1; k <= n; k++) {
      const e = mainState(spec, frame - k * gap, fps, edgeRadius ? (f, c) => edgeRadius(f + k * gap, c) : undefined);
      if (e) out.push({ ...e, echo: k, opacity: e.opacity * (spec.echoFade ?? RING.echoFade) ** k });
    }
    return out;
  }
  const emit = spec.phases[0]?.kind === "emit" ? (spec.phases[0] as Extract<RingPhase, { kind: "emit" }>) : null;
  if (emit && n > 0) {
    const gap = spec.echoGap ?? f60(RING.echoGapFrames, fps);
    const fadeOut = f60(18, fps);
    for (let k = 1; k <= n; k++) {
      const f0 = spec.start + k * gap;
      const t = frame - f0;
      if (t < 0 || t >= emit.frames + fadeOut) continue;
      const u = Math.min(1, t / emit.frames);
      const r = spec.stoneRadius + (emit.radius - spec.stoneRadius) * (emit.ease ? curve(emit.ease) : E_ARRIVE)(u);
      const appear = smoothstep(0, Math.max(1, f60(6, fps)), t);
      const vanish = 1 - smoothstep(emit.frames, emit.frames + fadeOut, t);
      out.push({
        id: spec.id,
        echo: k,
        phase: "emit",
        c: spec.source,
        r,
        opacity: appear * vanish * (spec.echoFade ?? RING.echoFade) ** k,
        widthPx: spec.widthPx ?? RING.hairlinePx,
        layer: "ground",
        tone: spec.tone ?? "light",
      });
    }
  }
  return out;
}

/**
 * The ground ripple of the ring's emit and burst, and of each echo: it follows the ring's radius, and its amplitude
 * starts at ≤ 6 px and decays to 0 over 30 frames (at 60 fps): A(t) = A0·(1 − t/T)².
 */
export function rippleStates(spec: RingSpec, frame: number, fps: number, edgeRadius?: (frame: number, c: Point) => number): RippleState[] {
  if (spec.ripple === false) return [];
  const decay = Math.max(1, f60(TRANSITION.ring.rippleDecayFrames, fps));
  const A0 = TRANSITION.ring.rippleMaxPx;
  const out: RippleState[] = [];
  const wins = phaseWindows(spec, edgeRadius);
  const rings = ringStates(spec, frame, fps, edgeRadius);
  for (const ring of rings) {
    let born: number | null = null;
    if (ring.echo === 0) {
      const w = wins.find((x) => frame >= x.f0 && frame < x.f1 && (x.kind === "emit" || x.kind === "burst"));
      born = w ? w.f0 : null;
    } else {
      born = spec.start + ring.echo * (spec.echoGap ?? f60(RING.echoGapFrames, fps));
    }
    if (born === null) continue;
    const t = frame - born;
    if (t < 0 || t >= decay) continue;
    const a = A0 * (1 - t / decay) ** 2 * (ring.echo === 0 ? 1 : (spec.echoFade ?? RING.echoFade) ** ring.echo);
    out.push({ id: `${spec.id}:${ring.echo}`, c: ring.c, r: ring.r, amplitudePx: a, band: Math.max(18, ring.r * 0.12) });
  }
  return out;
}

/** Rings alive on a frame across a whole film (echoes included). */
export const allRingStates = (specs: readonly RingSpec[], frame: number, fps: number, edgeRadius?: (frame: number, c: Point) => number) =>
  specs.flatMap((s) => ringStates(s, frame, fps, edgeRadius));

/** How many ring chapters (not echoes) are in flight on `frame`: the treatment allows one. */
export const ringsInFlight = (specs: readonly RingSpec[], frame: number): number =>
  specs.filter((s) => frame >= s.start && frame < ringEnd(s)).length;

/** The hairline colour for a tone. */
export const ringColor = (tone: "light" | "dark") => RING.color[tone];
