// The pebble in the films (MASTER_PLAN §4.3, U1 §3.9b). On EVERY frame it builds a fresh engine and replays the sorted
// cue list up to t (absolute composition time), because Remotion renders frames in parallel and out of order and the
// engine keeps a single slot of history. Never keep an engine in useRef, useMemo or module scope.
//
// Acting (hops, anticipation, stretch, landing squash) and the contact shadow are outer transforms only (acting.ts).
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { PebbleCue, PoseId } from "../../../shared/pebble";
import { BODY, VIEWBOX_SIZE, assertCues, pebbleAt } from "../../../shared/pebble";
import { COLOR } from "../motion/spec";
import { actingAt, contactShadow, type Hop, type Point } from "./acting";
import { PebbleSvg, type PebbleColors } from "./PebbleSvg";

export interface PebbleOnFilmProps {
  /** sorted by `at`, in seconds of absolute composition time (see checkCues in shared/pebble/cues.ts) */
  cues: readonly PebbleCue[];
  /** rendered size of the 220-unit viewBox, px (the body is about 0.59 of it) */
  size: number;
  /** where the foot (bottom centre of the body) stands before any hop, px in the parent's box */
  x: number;
  y: number;
  hops?: readonly Hop[];
  /** the pose before the first pose cue */
  initialPose?: PoseId;
  /** inside a <Sequence from={n}>, pass n here: cue times stay absolute composition time */
  offsetFrames?: number;
  shadow?: boolean;
  colors?: PebbleColors;
}

export const PebbleOnFilm: React.FC<PebbleOnFilmProps> = ({
  cues,
  size,
  x,
  y,
  hops = [],
  initialPose = "idle",
  offsetFrames = 0,
  shadow = true,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame + offsetFrames) / fps;

  assertCues(cues, "PebbleOnFilm cues"); // D6 and ordering, every frame: cheap, and a bad timeline fails loudly
  const view = pebbleAt(cues, t, initialPose); // a fresh engine, replayed up to t

  const unit = size / VIEWBOX_SIZE;
  const acting = actingAt(t, fps, { x, y }, hops, BODY.height * unit);
  // the foot inside the SVG box: the viewBox is centred on the body, whose bottom sits BODY.bottom units below centre
  const footInBox: Point = { x: size / 2, y: (VIEWBOX_SIZE / 2 + BODY.bottom) * unit };
  const sh = contactShadow(view.frame, view.motion, acting, unit);

  return (
    <>
      {shadow && (
        <div
          style={{
            position: "absolute",
            left: sh.x - sh.width / 2,
            top: sh.y - sh.height / 2,
            width: sh.width,
            height: sh.height,
            borderRadius: "50%",
            background: `rgb(${COLOR.shadowRgb})`,
            opacity: sh.opacity,
            filter: `blur(${sh.blur}px)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: acting.foot.x - footInBox.x,
          top: acting.foot.y - footInBox.y,
          width: size,
          height: size,
          transform: `scale(${acting.sx}, ${acting.sy})`,
          transformOrigin: `${footInBox.x}px ${footInBox.y}px`,
        }}
      >
        <PebbleSvg frame={view.frame} motion={view.motion} size={size} colors={colors} />
      </div>
    </>
  );
};
