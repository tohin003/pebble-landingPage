// Bars 12–13 (f792–935), the small form: Pebble's real quick chat (pet-live-150-light-hidden, v1.5.0, avatar hidden,
// the film's engine-drawn pebble in its place) on the light riverbed, at 1× (OVERRIDES §42):
// - f792 (bar 12's downbeat): a punch-in cut to the whole panel as the question is sent (Enter, 3.00 s), with the
//   send-key sound; the person's click and typing before it are elided by the cut (they are the person's, not Pebble's);
// - "Thinking", "~1s", "~2s", "Reasoning it through" at 1×; the answer whole on f898 (6.533 s; v1.5.0 shows it whole);
//   "Task: completed" on f900;
// - f918 (beat 4): a punch-in on the question and the answer, the pebble out of frame: the host's idle on that frame
//   (7.20 s) starts the app's celebration of the quick chat, and the trailer keeps its one celebration for the held run.
// Poses as the app's reducer gives them: sending, thinking (the app's from f799, cued at f806 for the engine's morph),
// idle when the task completes (the 3-frame "writing" before it never shows in the app's own morph).
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Desktop, World } from "../../components";
import { useLayout } from "../../motion/layout";
import { PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { answerPose, chatPose } from "../desk";
import { filmCues, shiftCues } from "../gaze";
import { PEBBLE_INSTANCES, PET, PET_FOOT, PET_PANEL, SOURCE_MAPS, at, sourceAt } from "../timeline";
import { PET_150 } from "../ui";
import { FilmPebble, RecordedUi, recFrame } from "./common";

export const QuickChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const answer = frame >= at(13, 4);
  const cam = answer ? answerPose(a, L.s) : chatPose(a, L.s, width, height);
  const src = (sourceAt(SOURCE_MAPS.chat, frame) ?? 3) * 30;
  const desk = PEBBLE_INSTANCES.desk;
  return (
    <Camera pose={cam}>
      <World>
        <Desktop />
        <RecordedUi src={recFrame(PET_150, src)} width={PET_150.width} height={PET_150.height} x={PET_PANEL.x} y={PET_PANEL.y} />
        {frame < desk.to ? (
          <FilmPebble x={PET_FOOT.x} y={PET_FOOT.y} size={PET.size} colors={PEBBLE_LIGHT} cues={shiftCues(filmCues(a), desk.offset)} offsetFrames={desk.offset} />
        ) : null}
      </World>
    </Camera>
  );
};
