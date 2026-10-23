// S1, the hook (0–143), FILM_SPEC §6 S1 and §7.1: the pebble on its riverbed desktop (frame 0 is the thumbnail), the
// pointer arrives and the eyes follow it, the click on f36 opens the REAL quick chat (pet-live-error recorded at 3× with
// the avatar hidden, R1; the film's own engine-drawn pebble sits in the avatar's place), the camera pulls back f40–63,
// then a hard cut on bar 2 (f72) to the sent question, and from f126 the camera dives into the thinking pebble's body
// until its sage fills the frame on f143 (lane G-fix: the dive runs f131–143, REVIEW-G2 P1-2): the seam into S2.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Cursor, Desktop, Vignette, World } from "../../components";
import { useLayout } from "../../motion/layout";
import { COLOR, ramp } from "../../motion/spec";
import { hookPointer, hookPoseAt, ZOOM_THROUGH } from "../hook";
import { PET, PET_FOOT, PET_PANEL, SOURCE_MAPS, sourceAt } from "../timeline";
import { PET_FILM } from "../ui";
import { FilmPebble, FrameBlur, RecordedUi, Solid, recordedFrame } from "./common";

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const cam = hookPoseAt(frame, a, width, height, L.s, fps);
  const pointer = hookPointer(a, width, height, L.s);
  // the quick chat: shown from the click frame (the app opens it at once, no expand animation)
  const src = sourceAt(SOURCE_MAPS["pet-live-error"], frame);
  // zoom blur on the dive's fastest frames only (f141–143, ≤ 20 px; FILM_SPEC §6)
  const blur = frame < ZOOM_THROUGH.blurFrom ? 0 : interpolate(frame, [ZOOM_THROUGH.blurFrom, ZOOM_THROUGH.fill], [ZOOM_THROUGH.blur[1], ZOOM_THROUGH.blur[2]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame >= ZOOM_THROUGH.solidFrom) return <Solid color={COLOR.pebble} />;
  return (
    <>
      {/* the blur is applied in frame px on a frame-sized wrapper, never on the magnified world layer */}
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
      <Vignette amount={0.06 * (1 - ramp(frame, ZOOM_THROUGH.from, 12))} />
    </>
  );
};
