// The film's poster (1280 × 720) = the teaser T0's frame 0 (docs/FILM_SPEC.md §2, §15): the riverbed desktop; Pebble's
// window at m 0.75 (870 × 600) at x 110–980, y 60–660, with the edit card waiting and Apply edit active; the pebble on
// the desktop at foot (1130, 640), size 120, idle, looking at the window {x: −0.75, y: −0.25}, engine time +1.0 s.
// No play button and no text: the page draws the galet play button and the label in HTML. Render at --scale=2 for
// the page's retina slot (critic H3); tools/assets/posters.mjs then encodes AVIF/WebP.
// The window shows lane D's still `main-live-04-waiting-approval`; with the vclock recording, T0's frame at 8.30 s.
import type { PebbleCue } from "../../../shared/pebble";
import { Camera, Desktop, MacWindow, UiStill, Vignette, World } from "../components";
import { DESKTOP_RECT } from "../film/timeline";
import { poseAt } from "../motion/camera";
import { useVideoConfig } from "remotion";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";

export const POSTER_CUES: readonly PebbleCue[] = [{ at: 0, look: { x: -0.75, y: -0.25 }, note: "looking at the window (T0)" }];

export const FilmPoster: React.FC = () => {
  const { width, height } = useVideoConfig();
  const s = width / 1280;
  const ground = Math.max(width / DESKTOP_RECT.w, height / DESKTOP_RECT.h);
  // the window's CSS (0, 0) at frame (110, 60), magnified 0.75
  const win = poseAt({ x: 0, y: 0 }, { x: 110 * s, y: 60 * s }, 0.75 * s, width, height);
  return (
    <>
      <Camera pose={{ x: DESKTOP_RECT.w / 2, y: DESKTOP_RECT.h / 2, zoom: ground }}>
        <World>
          <Desktop />
        </World>
      </Camera>
      <Camera pose={win} background="transparent">
        <World>
          <MacWindow x={0} y={0} width={1160} height={800}>
            <UiStill name="main-live-04-waiting-approval" dpr={2} />
          </MacWindow>
        </World>
      </Camera>
      <PebbleOnFilm cues={POSTER_CUES} size={120 * s} x={1130 * s} y={640 * s} offsetFrames={30} />
      <Vignette amount={0.06} />
    </>
  );
};
