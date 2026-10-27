// The set pieces' common model: a piece is a PLAN (pure data the component draws and the checks read), so the picture
// and the validators can never disagree (TREATMENT §7.1's timeline pattern; film2/README "How the set-piece lane uses
// this"). Frames are the piece's LOCAL frames (0 = its first frame); the edit lane places a piece at a composition
// frame and shifts its music grid into local frames with shiftGrid(grid, −start).
//
// A plan holds shots (each with its own world, camera and planes), the type, rings, light, takes and the music report
// (which event landed on which beat). Pure; no React.
import type { Aspect, TransitionKind, TypeTier } from "../tokens";
import type { Pose, ScalarKey, VelocityCamera } from "../motion/camera";
import type { Point, Rect } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import type { Grade, GradeName, LightCue } from "../light/grades";
import type { Entrance, Exit } from "../type/KineticLine";
import type { TextEvent } from "../type/reading";
import type { QaLeak, QaSeam } from "../qa/timeline";
import type { QaMove } from "../qa/checks";
import type { PebbleCue } from "../../../../shared/pebble/cues";
import type { StandIn } from "./standins";
import type { TakeUse } from "./take";
import type { FrameBox, TypeBox } from "./frame";
import type { MusicalLevel } from "./music";
import type { WallSpec } from "./wall";

/* ---------------------------------------------------------------- planes ------------------------------------- */

export type PlaneContent =
  | { kind: "standIn"; standIn: StandIn }
  | { kind: "take"; use: TakeUse; view: string }
  /**
   * a published image at a uniform scale (the companion's panel, a wall cell): never stretched. `textPx` (its body
   * text, CSS px) and `words` (every legible word in it) let the legibility checks see its text (CR-05)
   */
  | { kind: "image"; src: string; w: number; h: number; note: string; textPx?: number; words?: number };

export interface PlaneSpec {
  id: string;
  /** Pebble's own windows may tilt (while travelling); third-party and Apple windows stay flat */
  kind: "pebble" | "thirdParty" | "apple";
  /** world rect (world units: CSS px of a capture at 1×) */
  rect: Rect;
  depth?: number;
  content: PlaneContent;
  /** local frames it is on screen: [from, to) (default the whole shot) */
  from?: number;
  to?: number;
  /** the shared card entrance at this frame (a PLACEHOLDER of the recording's own arrival, §5.1) */
  enterAt?: number;
  /** "card" (default): the ask entrance; "fade": E-move over 20 frames (a large panel: the card's fast start reads as a pop) */
  enterKind?: "card" | "fade";
  /** a blur swap out over 8 frames from this frame (kind 5) */
  swapOutAt?: number;
  /** a blur swap in over 8 frames from this frame (kind 5) */
  swapInAt?: number;
  /** a dimmed still: 1 dimmed … 0 in full light, keyed (the composed world's places, lifting as the ring passes) */
  dim?: readonly ScalarKey[];
  /** degrees, keyed: Pebble's own windows only, flattened before reading */
  tiltRx?: readonly ScalarKey[];
  tiltRy?: readonly ScalarKey[];
  /**
   * the viewer reads it on these frames: never defocused, face-on, at 28 px or more, wholly in frame; its words count
   * toward the reading load from `seenFrom` to `seenTo` (default `from`, `to`): the frames its text is already
   * legible on the way in (a dolly) and still legible on the way out (a glide that carries it out of frame)
   */
  read?: { from: number; to: number; words: number; receipt?: boolean; textPx?: number; rect?: Rect; seenFrom?: number; seenTo?: number };
  shadow?: boolean;
  radius?: number;
  /** carries no text (the Dock's icons): film type may pass over it */
  textless?: boolean;
  /**
   * the real window this plane shows ("companion", "studio-bookings" …; a take view's own `place` by default). A still
   * and a take view of the same place never share a frame unless both are views of one take on one clock (CR-11)
   */
  place?: string;
}

/* ---------------------------------------------------------------- type --------------------------------------- */

export interface TypeSpec {
  id: string;
  text: string;
  tier: TypeTier;
  /** local frame its entrance starts */
  at: number;
  /** local frame its exit starts (omit: it stays until the piece ends) */
  exitAt?: number;
  entrance?: Entrance;
  exit?: Exit;
  sizeT?: number;
  color?: string;
  box: TypeBox;
  /** the reading model's kind: film lines count toward the 130-word budget */
  kind: NonNullable<TextEvent["kind"]> | "label" | "small";
  key?: boolean;
  honest?: boolean;
  pairWith?: string;
  /** a gradient-free sage sweep through the glyphs (the title only, L3a) */
  sweep?: { at: number; frames: number };
  /**
   * the line is set in the world of shot `shot` (TREATMENT §5.2: "type is set in the world, as a layer the camera
   * passes"): its box is exact under that shot's camera on frame `at` (a piece-local frame), and the line moves with
   * the world from there, so the camera's E-leave carries it out (CR-03, CR-19: the Veil's label leaves with the render);
   * `outFrom` is the frame its world starts carrying it out of the frame (the crane): it is read until then
   */
  carry?: { shot: string; at: number; outFrom?: number };
  /**
   * the line is one span of a row laid out by the browser (fix round 2, NF-04): every span with the same row `id` sits
   * in one flex row centred at `box.top`, `gapEm` of its size apart, in `index` order, so every gap is exact whatever
   * the glyphs' advance widths (the plan's `box.left` is the estimate the checks use; the end card's facts placed by
   * estimated widths came out 62–165 px apart)
   */
  row?: { id: string; gapEm: number; index: number };
}

/** A cascade (kind 5): one fixed line, one swapping item and its UI card, swapped in place. */
export interface CascadeSpec {
  /** the fixed line (expressive), entering once and staying for the whole cascade */
  fixed: TypeSpec;
  items: readonly { text: string; holdS?: number }[];
  /** local frame the first item swaps in, and the beats the swaps land before */
  start: number;
  beats?: readonly number[];
  itemBox: TypeBox;
  /** the UI card of each item, swapped in place on one stage (world planes) */
  cards: readonly PlaneSpec[];
  /** the last item stays (the shot leaves with the camera) */
  holdLast: boolean;
  /** the cascade's end: the last item leaves with a 12-frame blur exit from this frame, before its shot cuts (CR-03) */
  endAt?: number;
}

/* ---------------------------------------------------------------- the stone ---------------------------------- */

export interface StoneSpec {
  /** the stone's centre, world units */
  at: Point;
  /** its radius, world units (rings are born at its edge) */
  r: number;
  /** the pebble's rendered size, px of the 220-unit viewBox in world units */
  size: number;
  /** cues in seconds of the PIECE's local time (the component shifts them to composition time) */
  cues: readonly PebbleCue[];
  /** the Veil (Stealth Lockdown's look) switches, seconds of local time: the Dusk passage's render only */
  veil?: readonly { at: number; on: boolean }[];
}

/* ---------------------------------------------------------------- shots, seams and the plan -------------------- */

export interface ShotSpec {
  id: string;
  from: number;
  /** exclusive */
  to: number;
  kind: "ui" | "cutscene" | "type" | "title";
  /** the camera, frames LOCAL to the shot (0 = `from`) */
  camera: VelocityCamera;
  /** the pose every parallax plane lines up at */
  ref: Pose;
  /** the world's ground: the riverbed under still water (L3c), or the sage-white page */
  ground: "riverbed" | "page";
  /** the riverbed's rect in its plane (setpieces/ground.ts): set where a shot continues another one's world; default sized from the shot's own widest pose */
  groundRect?: Rect;
  planes: readonly PlaneSpec[];
  stone?: StoneSpec;
  /** rings on this shot's world (frames are the piece's local frames) */
  rings: readonly RingSpec[];
  /** CameraMotionBlur windows (local to the shot) on the foreground only, at cuts */
  blur?: readonly { from: number; to: number }[];
  /** UI read in this shot that is not a plane of its own (a receipt inside a take's view), world rects */
  reads?: readonly { id: string; rect: Rect; from: number; to: number; words: number; receipt?: boolean; textPx: number; seenFrom?: number }[];
  /** waiting states inside takes: the only allowed still frames (piece-local frames) */
  waits?: readonly { from: number; to: number }[];
  /** the frame aperture (the Drop): a function of the piece's local frame, 0 narrow … 1 full bleed */
  aperture?: { centerY: number; band: string; open: (frame: number) => number };
  /** world depth in focus (default 1) and the depth of field's scale */
  focus?: (frame: number) => number;
  dofScale?: number;
  cascade?: CascadeSpec;
  /** the wall's cells on their rings (setpieces/wall.ts), orbiting, and converging into the stone */
  wall?: WallSpec;
}

/** A music event: which grid point an event landed on (null without a grid), and how long it waited for it. */
export interface MusicHit {
  event: string;
  frame: number;
  point: number | null;
  level: MusicalLevel | "hit" | null;
  waited: number;
}

export interface ScenePlan {
  id: string;
  name: string;
  aspect: Aspect;
  frame: FrameBox;
  fps: number;
  duration: number;
  shots: readonly ShotSpec[];
  /** seams between consecutive shots (QaSeam's frames are local) */
  seams: readonly (QaSeam & { presentation?: "rack" | "iris" | "swap"; irisCenter?: Point; blurPx?: number })[];
  types: readonly TypeSpec[];
  /** light: the grade on frame 0 and the cues (local) */
  lightInitial: GradeName | Grade;
  lightCues: readonly LightCue[];
  leaks: readonly QaLeak[];
  /** frames where a velocity spike or a snap is meant (only the cue's marked hits) */
  hits: readonly number[];
  takes: readonly TakeUse[];
  music: readonly MusicHit[];
  moves: readonly QaMove[];
  /**
   * what the next piece continues from: the camera's last state (the same world, for a continuous hand-off), or the
   * screen velocity its last frame leaves with (a momentum cut into another world), and its riverbed and light
   */
  exit?: { pose: Pose; vel: { x: number; y: number; lz: number }; shot: string; ref: Pose; groundRect?: Rect; grade?: GradeName | Grade };
  /** the piece ends the film (the end card): type may stay to its last frame; anywhere else that type vanishes on a cut */
  endsFilm?: boolean;
  /** anything a piece's own checks need (the Dusk's honest line, the title's sweep) */
  extra?: Record<string, unknown>;
}

/** The shot a local frame falls in. */
export const shotOf = (p: ScenePlan, frame: number): ShotSpec | undefined => p.shots.find((s) => frame >= s.from && frame < s.to);

/** A move record for the kinds and timing checks. */
export const move = (kind: TransitionKind, at: number, frames: number, label: string): QaMove => ({ kind, at, frames, label });
