// Kind 3, the product's own motion (TREATMENT §5.1): the Space slide, the banner, the card entrances and the ⌘K palette
// play AS RECORDED; the film never imitates a motion the product does not make. These components only frame that rule:
//
// <RecordedTake>  plays a capture's frames at 1× (Pebble's time is never sped up, §3.6), with the camera locked or
//                 gliding while the product moves; the take's own motion carries the cut.
// <AskCardEntrance> the entrance every ask shares (§5.1): the card rises 24 px with an 8 px blur clearing over 24
//                 frames on E-arrive, and the camera pushes in to meet it. It is the film's framing of Pebble's own card
//                 arriving. Use it on a harness capture (a still of the card) ONLY where the 2.0.0 recording shows the
//                 card arriving the same way; where the recording carries its own entrance, show the recording.
//                 Until the 2.0.0 captures exist (G4), every use is a PLACEHOLDER and is listed as such in the demo.
import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TRANSITION, f60 } from "../tokens";
import { E_ARRIVE, clamp01 } from "../motion/ease";

/** The ask card's entrance on `frame`: { dy px (at 1080), blur px (at 1080), opacity }. */
export const askCardLook = (frame: number, at: number, fps: number): { dy: number; blur: number; opacity: number } => {
  const N = f60(TRANSITION.cardEntrance.frames, fps);
  const u = clamp01((frame - at) / N);
  const e = E_ARRIVE(u);
  return {
    dy: TRANSITION.cardEntrance.risePx * (1 - e),
    blur: TRANSITION.cardEntrance.blurPx * (1 - e),
    opacity: frame < at ? 0 : Math.min(1, e * 1.6),
  };
};

/**
 * The ask card's entrance as a plane's style (opacity, rise and blur on the whole card, shadow included), for a card
 * that is a <Plane> in the world: <Plane opacity={e.opacity} style={e.style}>. `pxScale` as below.
 */
export const askCardPlaneStyle = (frame: number, at: number, fps: number, pxScale: number): { opacity: number; style: React.CSSProperties } => {
  const l = askCardLook(frame, at, fps);
  const done = l.blur < 0.01 && l.dy < 0.01;
  return {
    opacity: Math.max(0, l.opacity),
    style: done ? {} : { transform: `translateY(${(l.dy * pxScale).toFixed(2)}px)`, filter: `blur(${(l.blur * pxScale).toFixed(2)}px)` },
  };
};

/**
 * `pxScale`: local units per "px at 1080" (default: the frame's own, min(w, h) / 1080). Inside a world plane pass
 * 1 / zoom, so the rise and the blur keep their size on screen whatever the camera's magnification.
 */
export const AskCardEntrance: React.FC<{ at: number; pxScale?: number; children: ReactNode }> = ({ at, pxScale, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = pxScale ?? Math.min(width, height) / 1080;
  const l = askCardLook(frame, at, fps);
  if (l.opacity <= 0) return null;
  const done = l.blur < 0.01 && l.dy < 0.01;
  return (
    <AbsoluteFill
      style={{
        opacity: l.opacity,
        transform: done ? undefined : `translateY(${(l.dy * unit).toFixed(2)}px)`,
        filter: done ? undefined : `blur(${(l.blur * unit).toFixed(2)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export interface RecordedTakeProps {
  /** the take's frames, as paths under video/public (image sequence from the capture harness or a recording) */
  frames: readonly string[];
  /** the rate the take was recorded at */
  sourceFps: number;
  /** local frame the take's first frame shows */
  at: number;
  /** the source frame to start from (an in-point chosen late enough, §3.6: never cut inside a take) */
  inPoint?: number;
  width: number;
  height: number;
}

/**
 * Source frame for a composition frame: 1× always. Pebble's time is never sped up, so there is no rate parameter:
 * the person's own spans (typing, pointer travel) may run up to 2×, but those are cut in the edit, never retimed here.
 */
export const takeFrame = (frame: number, at: number, fps: number, sourceFps: number, inPoint = 0): number =>
  inPoint + Math.max(0, Math.floor(((frame - at) * sourceFps) / fps + 1e-6));

export const RecordedTake: React.FC<RecordedTakeProps> = ({ frames, sourceFps, at, inPoint = 0, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at || frames.length === 0) return null;
  const i = Math.min(frames.length - 1, takeFrame(frame, at, fps, sourceFps, inPoint));
  return <Img src={staticFile(frames[i]!)} style={{ position: "absolute", left: 0, top: 0, width, height }} />;
};
