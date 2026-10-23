// L1 loop-companion (12 s, 360 frames; 4:5 phone cut too): the pebble on its desktop. The pointer arcs in and the
// eyes follow it; a click opens the real quick chat (pet-live-error, recorded with the pebble hidden: one engine-drawn
// pebble carries the loop, FILM_SPEC R1); the question is sent, Pebble thinks and writes, the reply completes and the
// pebble celebrates; the pointer minimizes the chat (Pet.vue "Minimize to pebble": the panel goes at once, R4) while
// the pebble keeps celebrating, as the app does for 4.5 s, then it settles to idle on its desktop: frame 0 again.
// Timeline: plans.ts L1; pointer and cues: companion.ts.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Cursor, Desktop, World } from "../components";
import { PET, PET_PANEL } from "../film/timeline";
import { cameraAt } from "../motion/camera";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";
import { L1_CURSOR, L1_ENGINE_OFFSET, l1Cues } from "./companion";
import { PressShade, RECORDINGS, RecFrame, srcAt, useLoopAspect } from "./kit";
import { L1 } from "./plans";

const CUES = l1Cues().cues;

export const LoopCompanion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const aspect = useLoopAspect();
  const pose = cameraAt(frame, L1.plan.camera[aspect], fps, width);
  // the chat shows from the click's frame until the minimize click is released (3 frames of press)
  const open = frame >= L1.click && frame < L1.close + 3;
  return (
    <Camera pose={pose}>
      <World>
        <Desktop />
        {open ? (
          <div style={{ position: "absolute", left: PET_PANEL.x, top: PET_PANEL.y, width: PET_PANEL.w, height: PET_PANEL.h }}>
            <RecFrame rec={RECORDINGS.petLive} t={srcAt(frame, L1.src)} />
            <PressShade rect={L1.minimize.rect} at={L1.close} radius={8} frames={3} />
          </div>
        ) : null}
        <PebbleOnFilm cues={CUES} size={PET.size} x={PET.centre.x} y={PET.centre.y + PET.centreToFoot} offsetFrames={L1_ENGINE_OFFSET} />
      </World>
      <Cursor keys={L1_CURSOR} clicks={L1.plan.clicks} visible={L1.plan.cursorVisible} />
    </Camera>
  );
};
