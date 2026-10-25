// Bar 14 (f936–1007), the big form: the whole workspace, and the full reveal completes. A cut on the downbeat (a whoosh
// peaks on it) into Pebble's whole main window in its hairline frame on the page's paper, on its own home screen
// ("Good to see you.", main-welcome from v1.5.0 with its own pebble hidden, still laid out), and the film's pebble in
// exactly the home pebble's place, in the pose the app shows there (idle): a match landing. A slow pull-back,
// 1.04 → 1.0, shows the whole window. A film cut, never the native "Open full workspace" move.
import { useCurrentFrame } from "remotion";
import { Camera, UiStill, World } from "../../components";
import { useLayout } from "../../motion/layout";
import { EASE, ramp } from "../../motion/spec";
import { FRAME, SYSTEM } from "../../motion/system";
import { PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { BODY, VIEWBOX_SIZE } from "../../../../shared/pebble";
import { PEBBLE_INSTANCES, at, per } from "../timeline";
import { WELCOME_150 } from "../ui";
import { FilmPebble, FlatGround } from "./common";

/** The window's magnification and centre on the frame (reference px), per aspect. */
const WHOLE = { m: per(1.2, 0.9, 0.9), centre: per({ x: 960, y: 540 }, { x: 540, y: 540 }, { x: 540, y: 960 }) } as const;

export const WholeWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = L.aspect;
  const k = 1.04 - 0.04 * ramp(frame, at(14), 72, EASE.camera);
  const m = WHOLE.m[a] * L.s * k;
  const c = WHOLE.centre[a];
  const pose = { x: WELCOME_150.width / 2, y: WELCOME_150.height / 2, zoom: m };
  const hp = WELCOME_150.homePebble;
  // the home pebble's box is the app's avatar box: the 220-unit viewBox, centred on the body
  const size = hp.w;
  const foot = { x: hp.x + hp.w / 2, y: hp.y + hp.h / 2 + (BODY.bottom * size) / VIEWBOX_SIZE };
  const W = WELCOME_150.width * m;
  const H = WELCOME_150.height * m;
  const left = c.x * L.s - W / 2;
  const top = c.y * L.s - H / 2;
  const radius = 16 * L.s;
  return (
    <FlatGround>
      <div style={{ position: "absolute", left, top, width: W, height: H, borderRadius: radius, overflow: "hidden", background: SYSTEM.bg }}>
        <Camera pose={pose} viewport={{ width: W, height: H }}>
          <World>
            <UiStill name="v150/avatar-hidden/main-welcome" />
            <FilmPebble x={foot.x} y={foot.y} size={size} colors={PEBBLE_LIGHT} shadow={false} offsetFrames={PEBBLE_INSTANCES.whole.offset} />
          </World>
        </Camera>
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: `inset 0 0 0 ${Math.max(1, FRAME.ring * L.s)}px ${SYSTEM.line}`, pointerEvents: "none" }} />
      </div>
    </FlatGround>
  );
};
