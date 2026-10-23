// The sage field (FILM_SPEC §4): S2 the three neutral questions (144–359), S3 the intent line with the pebble rising in
// (360–503), S8 the claims (1800–2015). Flat #536B54 with one slow glow (#B0C2AE, 15 %), white type, a 6 % tinted
// vignette, no grain (critic H8). Each field arrives from a zoom-through: its glow and vignette come up over the first
// 18 frames (EASE.enter), so the solid colour the dive ends on becomes the world without a pop; S8 starts on the quiz
// badge's #506E54 and eases to #536B54 by f1812 (§6 S8).
import { interpolateColors, useCurrentFrame } from "remotion";
import { SageField, SAGE_GLOWS, Vignette } from "../../components";
import { useLayout } from "../../motion/layout";
import { COLOR, EASE, ramp } from "../../motion/spec";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES } from "../timeline";
import { QUIZ } from "../ui";
import { FilmPebble, Lines, hopsFor } from "./common";

const SageWorld: React.FC<{ arriveAt?: number; fromColour?: string; children?: React.ReactNode }> = ({ arriveAt, fromColour, children }) => {
  const frame = useCurrentFrame();
  const k = arriveAt === undefined ? 1 : ramp(frame, arriveAt, 18, EASE.enter);
  const ground = fromColour && arriveAt !== undefined ? interpolateColors(ramp(frame, arriveAt, 12, EASE.move), [0, 1], [fromColour, COLOR.pebble]) : COLOR.pebble;
  return (
    <SageField glows={SAGE_GLOWS.map((g) => ({ ...g, opacity: g.opacity * k }))} style={{ backgroundColor: ground }}>
      {children}
      <Vignette amount={0.06 * k} />
    </SageField>
  );
};

/** S2: "What did it change?" · "Can I undo it?" · "Did it run the tests?" — one per bar, (B) ink, centred. */
export const S2Questions: React.FC = () => (
  <SageWorld arriveAt={144}>
    <Lines ids={["T1", "T2", "T3"]} world="sage" />
  </SageWorld>
);

/** S3: "An agent shouldn't / grade its own work" (C); the pebble rises in (H1, f432–447), looks up, leaps (H2, f490). */
export const S3Build: React.FC = () => {
  const L = useLayout();
  const a = L.aspect;
  const main = PEBBLE_INSTANCES.main;
  return (
    <SageWorld>
      <Lines ids={["T4"]} world="sage" />
      <FilmPebble x={main.start[a].x * L.s} y={main.start[a].y * L.s} size={L.pebbleSize} hops={hopsFor(main.hops, a, L.s)} colors={PEBBLE_DARK} />
    </SageWorld>
  );
};

/** S8: "Free and open source" + "Apache-2.0", "No telemetry", "Your keys stay in your Keychain"; from f1999 the end
 *  card's pebble leads its hop in from off frame lower right (H4 takes off f2002 and lands on bar 29, in S9). */
export const S8Claims: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = L.aspect;
  const end = PEBBLE_INSTANCES.end;
  return (
    <SageWorld arriveAt={1800} fromColour={QUIZ.badgeColour}>
      {/* the pebble flies in UNDER the last line, which is leaving (T17's blur-out, f2010–2016) where it lands */}
      {frame >= end.from ? (
        <FilmPebble x={end.start[a].x * L.s} y={end.start[a].y * L.s} size={L.pebbleSize} hops={hopsFor(end.hops, a, L.s)} colors={PEBBLE_DARK} />
      ) : null}
      <Lines ids={["T15", "T15s", "T16", "T17"]} world="sage" />
    </SageWorld>
  );
};
