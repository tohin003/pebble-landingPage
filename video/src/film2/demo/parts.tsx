// Building blocks the demo's shots share: the riverbed ground, a placeholder capture on a plane, the stone (the film
// pebble, drawn by Pebble's own character engine), and the placeholder slate. The set-piece lane reuses the same pieces
// with the 2.0.0 captures in place of the placeholders.
import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FAMILY } from "../tokens";
import type { Point } from "../motion/geometry";
import { PebbleOnFilm } from "../../pebble/PebbleOnFilm";
import { F2_DEMO_CUES } from "./f2demo.cues";
import { TAKE, type Placeholder } from "./placeholders";

/** The riverbed (the page's own picture, rendered by RiverbedPlate) as the ground, centred on a world point. */
export const Riverbed: React.FC<{ center: Point; width?: number }> = ({ center, width = 3400 }) => {
  const h = width / 1.6;
  return (
    <Img
      src={staticFile("desktop/riverbed-light@3x.png")}
      style={{ position: "absolute", left: center.x - width / 2, top: center.y - h / 2, width, height: h, maxWidth: "none" }}
    />
  );
};

/** A placeholder capture filling its plane (cropped when the placeholder says so; never stretched). */
export const UiImage: React.FC<{ ph: Placeholder }> = ({ ph }) => {
  const c = ph.crop ?? { x: 0, y: 0, w: ph.w, h: ph.h };
  return (
    <Img
      src={staticFile(ph.src)}
      style={{ position: "absolute", left: -c.x, top: -c.y, width: ph.w, height: ph.h, maxWidth: "none", display: "block" }}
    />
  );
};

/** The stone: the film pebble at a world point (its centre), replaying the demo's cue list. */
export const Stone: React.FC<{ at: Point; offsetFrames: number; size?: number }> = ({ at, offsetFrames, size = TAKE.pebbleSize }) => (
  <PebbleOnFilm cues={F2_DEMO_CUES} size={size} x={at.x} y={at.y + TAKE.centreToFoot * (size / TAKE.pebbleSize)} offsetFrames={offsetFrames} />
);

/** The demo's slate: says, on every frame, that the UI is a placeholder. Internal reels only; never in a film. */
export const PlaceholderSlate: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        right: 28,
        bottom: 20,
        fontFamily: `"${FAMILY.mono}"`,
        fontSize: 17,
        color: COLOR.ink2,
        opacity: 0.75,
        letterSpacing: "0.01em",
      }}
    >
      F2 motion foundation: placeholder UI, real captures of published Pebble releases
    </div>
  </AbsoluteFill>
);
