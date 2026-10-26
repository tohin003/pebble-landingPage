// The timeline the smoothness checks read (TREATMENT §5.5). A shot lane describes its shots, seams, cameras, lines,
// rings, readable UI and light cues as data; qa/checks.ts runs every check over it. The demo builds one
// (demo/timeline.ts); the set-piece lanes build theirs the same way and call checkAll() in a Bun test.
//
// Frames are composition frames unless a field says "local". Rects are frame px.
import type { TransitionKind } from "../tokens";
import type { VelocityCamera, Pose } from "../motion/camera";
import type { Point, Rect } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import type { GradeName, Grade, LightCue } from "../light/grades";
import type { TextEvent } from "../type/reading";

export interface FrameRange {
  from: number;
  /** exclusive */
  to: number;
}

export interface QaShot {
  id: string;
  from: number;
  /** exclusive */
  to: number;
  /** the act or block it belongs to (cut rate is per act) */
  act?: string;
  /** "ui" shots hold at least 2 s */
  kind?: "ui" | "cutscene" | "type" | "title";
  /** the shot's camera, frames LOCAL to the shot (frame − from) */
  camera?: VelocityCamera;
  /** the foreground's depth factor (default 1) */
  depth?: number;
  /** where the eye is (frame px): the speed probe for cut and velocity checks; default the frame's centre */
  focal?: Point;
  /**
   * the motion blur the foreground actually carries on a composition frame (σ px); default: what <Plane> applies
   * (σ = travel ÷ 7 above the reading speed)
   */
  appliedBlur?: (frame: number) => number;
  /** the product's own motion plays here, as recorded: the camera is locked or gliding, never imitating it */
  recorded?: boolean;
  /** waiting states inside takes: the only allowed still frames */
  waits?: readonly FrameRange[];
  /** something on screen changes on this frame (type, a ring, the UI): for the dead-frame model */
  activity?: (frame: number) => boolean;
}

export interface QaSeam {
  /** the first frame of the incoming shot (for a transition: the frame it starts) */
  at: number;
  /** what kind of seam: a hard cut is "momentum" (or "product" when the product's own motion carries it) */
  kind: TransitionKind;
  /** the transition's length in frames (0 for a hard cut) */
  frames: number;
  /** the outgoing and incoming shots */
  out: string;
  in: string;
  /** where the content swaps, and the frames the swap is covered by (blur, a fill, the ring's mask) */
  swapAt?: number;
  covered?: FrameRange;
  /** a static cut allowed as punctuation (marked in the beat sheet) */
  punctuation?: boolean;
}

export interface QaReadable {
  id: string;
  from: number;
  to: number;
  /** frame px (a function when the camera moves it) */
  rect: Rect | ((frame: number) => Rect);
  /** words a viewer must read in it (they count toward the reading load) */
  words?: number;
  /** a receipt: no ring is ever drawn around it */
  receipt?: boolean;
}

export interface QaLeak {
  at: number;
  frames: number;
}

export interface FilmTimelineQa {
  name: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  shots: readonly QaShot[];
  seams: readonly QaSeam[];
  texts: readonly TextEvent[];
  readables?: readonly QaReadable[];
  rings?: readonly RingSpec[];
  /** the camera pose of the plane the rings live on, on a composition frame */
  ringPose?: (frame: number) => Pose;
  lightInitial?: GradeName | Grade;
  lightCues?: readonly LightCue[];
  /** frames where a velocity spike is meant (a hit): the continuity check skips ±2 frames around each */
  hits?: readonly number[];
  leaks?: readonly QaLeak[];
  acts?: readonly { id: string; from: number; to: number }[];
  /** a film is held to "each kind used more than once"; a demo reel only reports */
  isFilm?: boolean;
}
