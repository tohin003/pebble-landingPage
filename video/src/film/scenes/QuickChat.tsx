// Bars 12–13 (f792–935), the small form: Pebble's real quick chat (pet-live-150-light-hidden, v1.5.0, avatar hidden,
// the film's engine-drawn pebble in its place) on the light riverbed, at 1× (OVERRIDES §42):
// - f792 (bar 12's downbeat): a punch-in cut to the whole panel as the question is sent (Enter, 3.00 s), with the
//   send-key sound; the person's click and typing before it are elided by the cut (they are the person's, not Pebble's).
//   In 1:1 the cut lands on the panel's top, the header with Pebble's live status over the question, and on f898 the
//   camera tilts down to the answer and the pebble (OVERRIDES §46 P2-3; desk.ts chatPose);
// - "Thinking", "~1s", "~2s", "Reasoning it through" at 1×; the answer whole on f898 (6.533 s; v1.5.0 shows it whole);
//   "Task: completed" on f900;
// - f918 (beat 4): a punch-in on the question and the answer, the pebble out of frame: the host's idle on that frame
//   (7.20 s) starts the app's celebration of the quick chat, and the trailer keeps its one celebration for the held run.
// Poses as the app's reducer gives them: sending, thinking (the app's from f799, cued at f806 for the engine's morph),
// idle when the task completes (the 3-frame "writing" before it never shows in the app's own morph).
// A capture-artifact repair (OVERRIDES §43, FILM_SPEC §7.4): the composer's caret, [25, 273, 1, 15] in the panel, blinks
// on Chrome's real clock in the recording (every 2–3 frames, about 10 Hz in the film, from source frame 90 on); the app
// blinks about once a second. On every frame the caret's box shows source frame 94's (a recorded "off" frame: the
// composer's white and the placeholder W's first column, which the caret overlaps), and the caret is drawn again to
// the app's rhythm: on for 15 frames from the send (the cleared composer resets it), off for 15, and so on.
import { Img, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Desktop, World } from "../../components";
import { useLayout } from "../../motion/layout";
import { PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { answerPose, chatPose } from "../desk";
import { filmCues, shiftCues } from "../gaze";
import { PEBBLE_INSTANCES, PET, PET_FOOT, PET_PANEL, SOURCE_MAPS, at, sourceAt } from "../timeline";
import { PET_150 } from "../ui";
import { FilmPebble, RecordedUi, recFrame } from "./common";

/** The composer's caret in the panel (CSS px of pet-live-150; measured on source frames 92–93: x 25–26, y 273–288),
 *  its colour, a recorded frame with the caret off, and the app's blink (0.5 s on, 0.5 s off) from the send (90). */
export const CHAT_CARET = { x: 25, y: 273, w: 1, h: 15, colour: "#252C28", offFrame: 94, from: 90, half: 15 } as const;
export const caretOn = (src: number): boolean => Math.floor((src - CHAT_CARET.from) / CHAT_CARET.half) % 2 === 0;

export const QuickChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const answer = frame >= at(13, 4);
  const cam = answer ? answerPose(a, L.s) : chatPose(a, L.s, width, height, frame);
  const src = (sourceAt(SOURCE_MAPS.chat, frame) ?? 3) * 30;
  const desk = PEBBLE_INSTANCES.desk;
  return (
    <Camera pose={cam}>
      <World>
        <Desktop />
        <RecordedUi src={recFrame(PET_150, src)} width={PET_150.width} height={PET_150.height} x={PET_PANEL.x} y={PET_PANEL.y} />
        {/* the recorded caret painted out with a recorded "off" frame's pixels, then the app's own blink */}
        {/* half a px of margin all round (the two frames are identical there), so no edge of the recorded caret survives
            the box's anti-aliasing */}
        <div style={{ position: "absolute", left: PET_PANEL.x + CHAT_CARET.x - 0.5, top: PET_PANEL.y + CHAT_CARET.y - 0.5, width: CHAT_CARET.w + 1, height: CHAT_CARET.h + 1, overflow: "hidden" }}>
          <Img src={recFrame(PET_150, CHAT_CARET.offFrame)} style={{ position: "absolute", left: -(CHAT_CARET.x - 0.5), top: -(CHAT_CARET.y - 0.5), width: PET_150.width, height: PET_150.height, display: "block" }} />
        </div>
        {caretOn(Math.round(src)) ? (
          <div style={{ position: "absolute", left: PET_PANEL.x + CHAT_CARET.x, top: PET_PANEL.y + CHAT_CARET.y, width: CHAT_CARET.w, height: CHAT_CARET.h, background: CHAT_CARET.colour }} />
        ) : null}
        {frame < desk.to ? (
          <FilmPebble x={PET_FOOT.x} y={PET_FOOT.y} size={PET.size} colors={PEBBLE_LIGHT} cues={shiftCues(filmCues(a), desk.offset)} offsetFrames={desk.offset} />
        ) : null}
      </World>
    </Camera>
  );
};
