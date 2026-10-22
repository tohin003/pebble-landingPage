// Reference composition for the film lanes (not part of any film): one pebble that looks, hops, lands, asks for review
// and is happy, over a sheet of Pebble's own poses. Frame 30 (t = 1.0 s) shows the static frame of the site.
import { AbsoluteFill } from "remotion";
import type { PebbleCue } from "../../../shared/pebble";
import { FONT } from "../fonts";
import { COLOR } from "../motion/spec";
import { DEMO_CUES, DEMO_HOPS, DEMO_SHEET_POSES, DEMO_START } from "./demo.cues";
import { PebbleOnFilm } from "./PebbleOnFilm";

const NO_CUES: readonly PebbleCue[] = [];
export const PEBBLE_DEMO_FRAMES = 240;

export const PebbleDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.ground }}>
      <PebbleOnFilm cues={DEMO_CUES} hops={DEMO_HOPS} x={DEMO_START.x} y={DEMO_START.y} size={420} />
      {DEMO_SHEET_POSES.map((pose, i) => {
        const x = 260 + i * 200;
        return (
          <div key={pose}>
            <PebbleOnFilm cues={NO_CUES} initialPose={pose} x={x} y={985} size={150} />
            <div
              style={{
                position: "absolute",
                left: x - 90,
                top: 1004,
                width: 180,
                textAlign: "center",
                fontFamily: FONT.sans,
                fontSize: 26,
                color: COLOR.secondary,
              }}
            >
              {pose}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
