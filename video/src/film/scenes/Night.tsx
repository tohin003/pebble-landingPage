// The tension (bars 2–9, f72–647) on the night field, the page's own dark ground (#191E1B, flat):
// - the three questions (C-CH-1), each slammed onto its bar's downbeat (it appears already landed on the cut), dead
//   still, blurred out over its last 6 frames;
// - after each, a glimpse of Pebble's real dark-theme window (main-live-film-150-dark, v1.5.0, retake 2b) in a hairline
//   frame, rising on a 6-frame luminance ramp: the change (bar 3, the press on Apply edit ends it), the undo (bar 5, the
//   camera locked on the applied card as the drawer's live response moves it, the focus on Undo this edit) and the hold
//   (bar 7, "Pebble's change isn't verified yet." arriving on f445);
// - the turn (bar 8): "An agent shouldn't / grade its own work", calm;
// - the build (bar 9): the field steps from night to sage in four flat colour changes (f576–600, a dawn, never a
//   gradient); the pebble's crown rises out of the bottom edge (f576), its eyes clear it (f582), it looks up (f594),
//   squashes, leaps on the dead stop's first frame (f612) and hangs at the apex over f618–642.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Cursor } from "../../components";
import { useLayout } from "../../motion/layout";
import { CLICK, EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { GLIMPSES, datesCardTop, glimpseAt, glimpsePointer, glimpsePose, type GlimpseId } from "../framing";
import { filmCues, shiftCues } from "../gaze";
import { PEBBLE_INSTANCES, SOURCE_MAPS, TYPE_PEBBLE, sourceAt } from "../timeline";
import { DARK_150, RUN } from "../ui";
import { FOCUS, FilmPebble, FilmStage, FlatGround, Lines, RecordedUi, hopsFor, recFrame } from "./common";

/** The dawn (bar 9): four flat steps from the night field to the sage type ground, on f576, 584, 592 and 600. */
const DAWN = ["#232C25", "#2E3A2F", "#384839", SYSTEM.sage] as const;
export const nightGround = (frame: number) => (frame < 576 ? SYSTEM.night : DAWN[Math.min(3, Math.floor((frame - 576) / 8))]!);

/** The press drawn over the frame before the click (the app re-renders on the click frame): 4 frames. */
const PRESS_FRAMES = 4;

/** One glimpse: the stage, the recorded dark window at its source time, the press, the focus and the pointer. */
const Glimpse: React.FC<{ id: GlimpseId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = L.aspect;
  const s = L.s;
  const gl = GLIMPSES[id];
  const st = gl.stage[a];
  const rect = { x: st.x * s, y: st.y * s, w: st.w * s, h: st.h * s };
  const pose = glimpsePose(id, a, s, frame);
  const map = SOURCE_MAPS[gl.map];
  const src = (sourceAt(map, frame) ?? 0) * 30;
  const fade = ramp(frame, gl.rampIn[0], gl.rampIn[1] - gl.rampIn[0], EASE.move) * (gl.rampOut ? 1 - ramp(frame, gl.rampOut[0], gl.rampOut[1] - gl.rampOut[0], EASE.move) : 1);
  if (fade <= 0.001) return null;
  // glimpse 1: the press on Apply edit, drawn over the last frame before the click (the card waits for the person)
  const pressing = id === "G1" && frame >= 198 && frame < 198 + PRESS_FRAMES;
  const press = pressing ? { rect: RUN.applyEdit.rect, radius: RUN.applyEdit.radius, ground: "#212822", scale: CLICK.uiPressScale, darken: 0.05 } : null;
  // glimpse 2: the focus settles on Undo this edit over f300–330 and holds (the rest of the frame recedes under the
  // dark window's own colour)
  let focus = null;
  if (id === "G2") {
    const top = datesCardTop(Math.round(src)) + RUN.undo.dy;
    const pad = 8;
    focus = {
      rect: { x: 832 - pad, y: top - pad, w: RUN.undo.w + 2 * pad, h: RUN.undo.h + 2 * pad },
      amount: ramp(frame, 300, 30, EASE.enter),
      zoom: pose.zoom,
      radius: RUN.undo.radius + pad,
      veil: FOCUS.dark,
    };
  }
  const pointer = id === "G1" ? glimpsePointer(a, s) : null;
  return (
    <FilmStage
      id={`glimpse-${id}`}
      rect={rect}
      pose={pose}
      corners="all"
      ring={SYSTEM.nightLine}
      background={SYSTEM.night}
      opacity={fade}
      overlay={pointer ? <Cursor space="frame" keys={pointer.keys} clicks={pointer.clicks} visible={[pointer.visible]} /> : null}
    >
      <RecordedUi src={recFrame(DARK_150, src)} width={DARK_150.width} height={DARK_150.height} press={press} focus={focus} />
    </FilmStage>
  );
};

/** Bars 2–7 (f72–503): the questions and their glimpses. */
export const Questions: React.FC = () => {
  const frame = useCurrentFrame();
  const g = glimpseAt(frame);
  return (
    <FlatGround color={SYSTEM.night}>
      <Lines ids={["Q1", "Q2", "Q3"]} world="night" />
      {g ? <Glimpse id={g} /> : null}
    </FlatGround>
  );
};

/** Bars 8–9 (f504–647): the turn, the dawn, the peek and the leap into the dead stop. */
export const TurnAndBuild: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const main = PEBBLE_INSTANCES.main;
  const off = main.offset;
  return (
    <FlatGround color={nightGround(frame)}>
      <Lines ids={["T4"]} world="night" />
      {frame >= main.from ? (
        <FilmPebble
          x={main.start[a].x * L.s}
          y={main.start[a].y * L.s}
          size={TYPE_PEBBLE[a] * L.s}
          hops={hopsFor(main.hops, a, L.s, off / fps)}
          colors={PEBBLE_DARK}
          cues={shiftCues(filmCues(a), off)}
          offsetFrames={off}
        />
      ) : null}
    </FlatGround>
  );
};
