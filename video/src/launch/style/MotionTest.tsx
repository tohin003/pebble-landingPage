// LaunchMotionTest: six seconds from the cold open into the title, to judge the motion. Frame 0 is the finished cold
// open (the thumbnail: the pebble awake, "This is Pebble." landed); the pebble glances up at its name, the line leaves,
// the pebble anticipates and hops into the lockup (the match move: the same pebble carries the eye from one scene to
// the next), lands on the drop with a squash, the frame punches in 5 %, the light swells, "Pebble 2.0" arrives letter
// by letter and the README's line follows. Timed in seconds, so it renders at 30 or 60 fps.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../components/FontGate";
import { Headline } from "../components/Headline";
import { PebbleActor, cues, look, lookBack, pose } from "../components/PebbleActor";
import { Stage } from "../components/Stage";
import { useLayout } from "../layout";
import { punchAt, tween, useTime } from "../timing";
import { EASE } from "../tokens";
import { LockupType, coldOpenGeometry, lockupGeometry } from "./scenes";

export const MOTION_TEST_S = 6;

/** the hop's take-off and landing (the drop), seconds */
const HOP = 1.95;
const FLIGHT = 0.5;
const LAND = HOP + FLIGHT;

const Inner: React.FC = () => {
  const L = useLayout();
  const t = useTime();
  const g = lockupGeometry(L);
  const co = coldOpenGeometry(L);
  const cold = co.pebble;
  const textBox = co.textBox;
  // the eyes lead the hop toward the landing spot
  const dx = g.pebble.x - cold.x;
  const dy = g.pebble.y - cold.y;
  const d = Math.hypot(dx, dy) || 1;
  const energy = t < LAND ? tween(t, [HOP - 0.2, LAND], [1, 0.85]) : tween(t, [LAND, LAND + 0.1, LAND + 1.4], [0.85, 1.55, 1.15], EASE.camera);
  const key = { x: 0.5, y: tween(t, [HOP, LAND + 0.3], [0.26, 0.36], EASE.camera), r: tween(t, [HOP, LAND + 0.3], [0.78, 0.82], EASE.camera) };
  // the camera: a 5 % punch on the drop for everything; a slow push (1.2 %/s) on the cold open's pebble, released during
  // the hop so the pebble lands exactly on the title's baseline (a landed lockup is still; only the light moves)
  const hit = punchAt([LAND], t, 0.05, 0.03, 0.22);
  const push = t < HOP ? 1 + 0.012 * t : 1 + 0.012 * HOP * (1 - EASE.camera(Math.min(1, (t - HOP) / FLIGHT)));
  const origin = `${L.centre.x}px ${L.centre.y}px`;
  return (
    <Stage energy={energy} keyLight={key}>
      <AbsoluteFill style={{ transform: `scale(${(hit * push).toFixed(5)})`, transformOrigin: origin }}>
        <PebbleActor
          x={cold.x}
          y={cold.y}
          size={cold.size}
          cues={cues(
            pose(0, "idle"),
            look(0.5, 0, -0.75),
            look(HOP - 0.3, dx / d, Math.max(-1, dy / d - 0.25)),
            pose(LAND, "happy"),
            lookBack(LAND + 0.5),
            pose(LAND + 1.9, "idle"),
          )}
          hops={[{ at: HOP, to: { x: g.pebble.x, y: g.pebble.y }, duration: FLIGHT, height: L.px(L.portrait ? 120 : 150) }]}
          grow={{ at: HOP - 0.05, to: g.pebble.size, dur: FLIGHT + 0.1 }}
          pool={tween(t, [HOP, HOP + 0.25], [1, 0])}
          glow={tween(t, [LAND - 0.1, LAND + 0.4], [0, 0.6])}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${hit.toFixed(5)})`, transformOrigin: origin }}>
        <Headline text="This is Pebble." at={-1} exitAt={HOP - 0.25} size={L.type.display} align="center" box={textBox} />
        <LockupType at={LAND - 0.03} subAt={LAND + 0.42} />
      </AbsoluteFill>
    </Stage>
  );
};

export const MotionTest: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#070B09" }}>
    <FontGate>
      <Inner />
    </FontGate>
  </AbsoluteFill>
);
