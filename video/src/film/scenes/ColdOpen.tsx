// Bar 1 (f0–71), the cold open, "the look": an extreme close-up of the pebble's two eyes and one curve of its body in
// a corner of the dark riverbed desktop, the frame cropping the rest (OVERRIDES §46 P1-2: "parts before the whole").
// Frame 0 is the page's poster and every thumbnail, under a centred play button, so the eyes sit in one third and the
// button's area is dark. 16:9 (OVERRIDES §47 R2-3): the top-right corner, the eyes in the frame's top 30 %, the part of
// the poster the page shows above the fold, so the pebble peeks up into the first screen; the top edge crops the crown.
// 1:1 and 9:16: the bottom-left, the eyes in the left third. The eyes are already turned to where the pointer will
// enter (above the frame, up-left). Over f4–16 the film's pointer drifts in and the eyes follow it (Pebble's own gaze);
// it rests beside the face, in the pet window (the app's attentive pose), a natural blink comes near f20, the pointer
// slides away off the left edge from f36 and the eyes follow it, and on f54 the pebble looks at the viewer (its eyes
// swing right: in 16:9 toward the right edge, which they keep clear of; in 1:1 and 9:16 toward the frame's inside).
// checkColdOpen (film/gaze.ts) holds these rules. Pebble's own character code on the dark plate; no UI.
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
