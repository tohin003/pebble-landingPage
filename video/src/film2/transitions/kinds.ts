// The seven transition kinds (TREATMENT §5.1) as one table: what each is, which component builds it, and its limits
// in frames at 60 fps. The validators read it (qa/checks.ts transitionTiming), and README.md is written from it.
import { TRANSITION, f60, type TransitionKind } from "../tokens";
import { E_ARRIVE, E_MOVE, clamp01 } from "../motion/ease";

/**
 * The ease ringIris() uses when a seam names none (presentations.tsx reads it, and so does the iris-ease check in
 * qa/checks.ts, so the picture and the check can never disagree). Lead ruling §52: an iris between places is E-move;
 * E-arrive only on the Drop and on hits the cue marks (CR-21: the default is still "arrive").
 */
export const IRIS_DEFAULT_EASE: "arrive" | "move" = "arrive";

/**
 * The ring iris's radius at progress p, from the stone's radius to past the farthest corner: E-arrive (a burst, on the
 * Drop and on hits the cue marks) or E-move (an iris between places, lead ruling L-iris in OVERRIDES §52). Pure, here so
 * the checks model the iris exactly as presentations.tsx draws it (setpieces/qa.ts stoneCount, CR-01).
 */
export const irisRadius = (p: number, r0: number, rMax: number, ease: "arrive" | "move" = "arrive"): number =>
  r0 + (rMax - r0) * (ease === "move" ? E_MOVE : E_ARRIVE)(clamp01(p));

/** The iris as PieceView draws it, px at 1080: its feather and the radius it starts from. */
export const IRIS_DRAWN = { featherPx: 36, startRadiusPx: 44 } as const;

export interface KindSpec {
  kind: TransitionKind;
  name: string;
  build: string;
  /** frames at 60 fps the seam or move may take: [min, max]; null when it plays as recorded */
  frames: readonly [number, number] | null;
  ease: string;
  blur: string;
  sound: string;
  limits: string;
}

export const KINDS: Record<TransitionKind, KindSpec> = {
  ring: {
    kind: "ring",
    name: "The ring (the carrier: an iris, a mask, a hairline)",
    build: "carrier/ring.ts + carrier/RingLayer.tsx, carrier/Ripple.tsx, carrier/Aperture.tsx; transitions/presentations.tsx ringIris()",
    frames: [TRANSITION.ring.irisFrames[0], TRANSITION.ring.burstFrames[1]],
    ease: "E-arrive",
    blur: "none; feather 24–48 px; hairline 1.5–2 px at 1080, sage #506E54 (#A6C795 on dark); ground ripple ≤ 6 px decaying over 30",
    sound: "the ring's whoosh, 12 frames early (five whooshes at most in the film)",
    limits: "never over text being read; never drawn around a receipt; never distorts UI; one ring chapter in flight at a time",
  },
  momentum: {
    kind: "momentum",
    name: "Momentum cut (velocity matched)",
    build: "transitions/momentum.ts momentumCut(); motion/camera.ts arriveWithMomentum(); transitions/ports.tsx <CutTheCurve> for a subject",
    frames: [TRANSITION.momentum.leaveFrames[0], TRANSITION.momentum.leaveFrames[1]],
    ease: "out on E-leave over 12–24; in at the matched speed, then E-arrive or a glide with τ = 15–30",
    blur: "σ = travel ÷ 7 at the cut",
    sound: "a pickup or click starting 8–16 frames early",
    limits: "speeds within ±25 %, directions within 30°; no cut between two rests",
  },
  product: {
    kind: "product",
    name: "The product's own motion",
    build: "transitions/entrances.tsx <RecordedTake> (1×), <AskCardEntrance> (the shared ask entrance, on captures only)",
    frames: null,
    ease: "as recorded",
    blur: "as recorded",
    sound: "none of the film's",
    limits: "never imitated where the product doesn't move that way",
  },
  push: {
    kind: "push",
    name: "Push-in and pull-back in log space",
    build: "camera/moves.ts pushIn(), pushInCarried(), pullBack(), dolly(), crane(), travelTo()",
    frames: [TRANSITION.push.frames[0], TRANSITION.push.frames[1]],
    ease: "E-move; pull-backs ease into a glide",
    blur: "σ = travel ÷ 7 above the reading speed",
    sound: "none",
    limits: "1.00 → 1.06–1.15; flatten to face-on before anything is read; start with the shot",
  },
  swap: {
    kind: "swap",
    name: "Swap in place",
    build: "type/Cascade.tsx (cascadeSchedule, <Cascade>); transitions/presentations.tsx swapInPlace()",
    frames: [TRANSITION.swap.outFrames + TRANSITION.swap.inFrames, TRANSITION.swap.outFrames + TRANSITION.swap.inFrames],
    ease: "out: blur 0 → 8 px; in: 8 → 0 px",
    blur: "the swap's own 8 px",
    sound: "none (the music carries the swaps)",
    limits: "items of four words or fewer; each swap lands 2–3 frames before a beat",
  },
  rack: {
    kind: "rack",
    name: "Rack focus",
    build: "transitions/presentations.tsx rackFocus(); camera/World3D.tsx focus + ScalarTrack for a pull inside a shot",
    frames: [TRANSITION.rack.frames[0], TRANSITION.rack.frames[1]],
    ease: "E-move (focus moves linearly in dioptres)",
    blur: "0 → 10–16 px at 1080",
    sound: "none",
    limits: "text being read is never defocused",
  },
  light: {
    kind: "light",
    name: "Light change between sections",
    build: "light/grades.ts (gradeAt, LightCue), transitions/LightChange.tsx",
    frames: [TRANSITION.light.minFrames, Infinity],
    ease: "E-move on light and colour",
    blur: "none",
    sound: "none",
    limits: "never a step; at most one large luminance change a second (WCAG 2.3.1)",
  },
};

/** Problems with one seam or move's length for its kind. */
export const checkKindFrames = (kind: TransitionKind, frames: number, fps: number, label: string = kind): string[] => {
  const spec = KINDS[kind];
  if (!spec.frames) return [];
  const lo = f60(spec.frames[0], fps);
  const hi = Number.isFinite(spec.frames[1]) ? f60(spec.frames[1], fps) : Infinity;
  if (frames < lo || frames > hi) return [`${label}: ${frames} frames is outside ${kind}'s ${lo}–${Number.isFinite(hi) ? hi : "∞"} (60 fps: ${spec.frames[0]}–${spec.frames[1]})`];
  return [];
};
