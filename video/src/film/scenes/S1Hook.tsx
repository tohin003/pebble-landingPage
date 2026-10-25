// S1, the hook (0–143), FILM_SPEC §6 S1 and §7.1, re-cut for energy (ENERGY_SPEC §5): the pebble on its riverbed
// desktop (frame 0 is the thumbnail), the pointer drops in f1–13 and the eyes follow it, the click on f18 opens the REAL
// quick chat (pet-live-error recorded at 3× with the avatar hidden, R1; the film's own engine-drawn pebble sits in the
// avatar's place), f19–30 a ramped camera move with motion blur makes room for the panel, the question types itself
// (2×) and is sent on f54, then Pebble's part plays at 1×: a punch-in cut on bar 2 (f72) to the conversation, the answer
// streaming from f102, and from f135 the camera dives into the writing pebble's body until its sage fills the frame on
// f143: the seam into S2.
//
// Lane v2-film (docs/PHILOSOPHY.md): this is the film's one scene, so it is the one place the riverbed shows full
// frame; it is the imagery, so nothing is laid over it (no vignette).
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Cursor, Desktop, World } from "../../components";
import { useLayout, type AspectId } from "../../motion/layout";
import { COLOR } from "../../motion/spec";
import { HOOK_MOVE, hookPointer, hookPoseAt, ZOOM_THROUGH } from "../hook";
import { PET, PET_FOOT, PET_PANEL, SOURCE_MAPS, sourceAt } from "../timeline";
import { PET_FILM } from "../ui";
import { FilmPebble, FrameBlur, RecordedUi, Solid, recordedFrame } from "./common";

/** The pebble's centre on the frame on `frame` (the camera's point of interest while it moves). */
const pebbleOnFrame = (frame: number, a: AspectId, width: number, height: number, s: number, fps: number) => {
  const cam = hookPoseAt(frame, a, width, height, s, fps);
  return { x: width / 2 + (PET.centre.x - cam.x) * cam.zoom, y: height / 2 + (PET.centre.y - cam.y) * cam.zoom };
};
/** FrameBlur px on the f19–30 move: min(8, travel / 16), travel = the pebble's frame travel since the last frame. */
export const hookMoveBlur = (frame: number, a: AspectId, width: number, height: number, s: number, fps: number) => {
  const p = pebbleOnFrame(frame, a, width, height, s, fps);
  const q = pebbleOnFrame(frame - 1, a, width, height, s, fps);
  return Math.min(8 * s, Math.hypot(p.x - q.x, p.y - q.y) / 16);
};

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const cam = hookPoseAt(frame, a, width, height, L.s, fps);
  const pointer = hookPointer(a, width, height, L.s);
  // the quick chat: shown from the click frame (the app opens it at once, no expand animation)
  const src = sourceAt(SOURCE_MAPS["pet-live-error"], frame);
  // zoom blur on the dive's fastest frames only (f141–143, ≤ 20 px; FILM_SPEC §6); on the ramped move that makes room
  // for the panel (f19–30), motion blur from the pebble's own travel on the frame since the last frame, ≤ 8 px
  const blur =
    frame > HOOK_MOVE.from && frame <= HOOK_MOVE.to
      ? hookMoveBlur(frame, a, width, height, L.s, fps)
      : frame < ZOOM_THROUGH.blurFrom
        ? 0
        : interpolate(frame, [ZOOM_THROUGH.blurFrom, ZOOM_THROUGH.fill], [ZOOM_THROUGH.blur[1], ZOOM_THROUGH.blur[2]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame >= ZOOM_THROUGH.solidFrom) return <Solid color={COLOR.pebble} />;
  return (
    // the blur is applied in frame px on a frame-sized wrapper, never on the magnified world layer
    <FrameBlur px={blur}>
      {(viewport) => (
        <Camera pose={cam} viewport={viewport}>
          <World>
            <Desktop />
            {src !== null ? (
              <RecordedUi src={recordedFrame(PET_FILM.dir, PET_FILM.frames, src)} width={PET_FILM.width} height={PET_FILM.height} x={PET_PANEL.x} y={PET_PANEL.y} />
            ) : null}
            <FilmPebble x={PET_FOOT.x} y={PET_FOOT.y} size={PET.size} />
          </World>
          <Cursor keys={pointer.keys} clicks={pointer.clicks} visible={[pointer.visible]} />
        </Camera>
      )}
    </FrameBlur>
  );
};
