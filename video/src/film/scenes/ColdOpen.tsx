// Bar 1 (f0–71), the cold open, "the look": an extreme close-up of the pebble's eyes and the curve of its body in the
// corner of the dark riverbed desktop (frame 0 is the thumbnail, the eyes already turned to where the pointer will
// enter). Over f4–16 the film's pointer drifts in and the eyes follow it (Pebble's own gaze); it rests in the pet
// window (the app's attentive pose), a natural blink comes near f20, the pointer slides away from f36 and the eyes
// follow it, and on f54 the pebble looks at the viewer. Pebble's own character code on the dark plate; no UI.
//
// The palette is the app's dark theme's (tokens.css@v1.5.0: body #b4cda6, eyes #23351f): the desktop is dark, as is
// every window the tension shows. The engine's clock runs 22 frames ahead (PEBBLE_INSTANCES.open.offset), so its
// natural blink schedule puts a blink at f20–25; the cues move with it, so every pose and look keeps its frame.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Cursor, Desktop, World } from "../../components";
import { useLayout } from "../../motion/layout";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { coldPointer, coldPose } from "../desk";
import { filmCues, shiftCues } from "../gaze";
import { PEBBLE_INSTANCES, PET, PET_FOOT } from "../timeline";
import { FilmPebble } from "./common";

export const ColdOpen: React.FC = () => {
  useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const cam = coldPose(a, L.s, width, height);
  const pointer = coldPointer(a, L.s);
  const off = PEBBLE_INSTANCES.open.offset;
  return (
    <>
      <Camera pose={cam}>
        <World>
          <Desktop dark />
          <FilmPebble x={PET_FOOT.x} y={PET_FOOT.y} size={PET.size} colors={PEBBLE_DARK} cues={shiftCues(filmCues(a), off)} offsetFrames={off} />
        </World>
      </Camera>
      <Cursor space="frame" keys={pointer.keys} visible={[pointer.visible]} />
    </>
  );
};
