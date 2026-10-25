// The breakdown (bars 26–28, f1800–2015): the recut's approved claims on the flat sage field (#425643, white type at
// 7.9:1), arriving by a hard cut on the downbeat: "Free and open source" already landed on f1800 with "Apache-2.0" inking
// in, "No telemetry" (f1872) and "Your keys stay in your Keychain" (f1926) slam onto their beats, the list leaves over
// f1998–2004, and from f1999 the end card's pebble leads its hop in from off frame lower right (H4 takes off f2002 and
// lands on bar 29, in S9).
import { useCurrentFrame } from "remotion";
import { useLayout } from "../../motion/layout";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES } from "../timeline";
import { FilmPebble, FlatGround, Lines, hopsFor } from "./common";

export const S8Claims: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = L.aspect;
  const end = PEBBLE_INSTANCES.end;
  return (
    <FlatGround color={SYSTEM.sage}>
      {/* the pebble flies in UNDER the last line, which is leaving where it lands */}
      {frame >= end.from ? (
        <FilmPebble x={end.start[a].x * L.s} y={end.start[a].y * L.s} size={L.pebbleSize} hops={hopsFor(end.hops, a, L.s)} colors={PEBBLE_DARK} />
      ) : null}
      <Lines ids={["T15", "T15s", "T16", "T17"]} world="sage" />
    </FlatGround>
  );
};
