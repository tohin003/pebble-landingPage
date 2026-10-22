// The film's poster for the site (MASTER_PLAN §5.4 FilmPoster, 1280 × 720; DESIGN.md §6): the riverbed desktop with
// Pebble's main window (the finished, verified task) and the companion on the desktop beside it, as comp 3's poster
// frames it. No play button and no text: the page draws the galet play button and the label in HTML. Render it at
// --scale=2 for the page's retina slot (critic H3), then tools/assets/posters.mjs encodes AVIF/WebP.
import { useVideoConfig } from "remotion";
import { Camera, Desktop, MacWindow, UiStill, Vignette, World } from "../components";
import { WORLD } from "../film/timeline";
import { clampPose, coverZoom, poseAt } from "../motion/camera";
import type { PebbleCue } from "../../../shared/pebble";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";

const STILL_CUES: readonly PebbleCue[] = [{ at: 0, look: { x: -0.75, y: 0.125 }, note: "looking toward the window" }];

export const FilmPoster: React.FC = () => {
  const { width, height } = useVideoConfig();
  const win = WORLD.mainWindow;
  // comp 3: the window takes about two thirds of the poster's width, its top 8.6 % down, centred; never so wide a
  // view that the frame shows past the wallpaper
  const zoom = Math.max((0.7 * width) / win.w, coverZoom(WORLD.desktop, width, height));
  const pose = clampPose(
    poseAt({ x: win.x + win.w / 2, y: win.y }, { x: width / 2, y: 0.086 * height }, zoom, width, height),
    WORLD.desktop,
    width,
    height,
  );
  // the companion on the desktop at the window's lower right, overlapping its edge (it floats above windows)
  const foot = { x: win.x + win.w + 34, y: win.y + win.h - 70 };
  return (
    <>
      <Camera pose={pose}>
        <World>
          <Desktop />
          <MacWindow x={win.x} y={win.y} width={win.w} height={win.h}>
            <UiStill name="main-done" dpr={2} />
          </MacWindow>
          <PebbleOnFilm cues={STILL_CUES} size={190} x={foot.x} y={foot.y} offsetFrames={30} />
        </World>
      </Camera>
      <Vignette amount={0.06} />
    </>
  );
};
