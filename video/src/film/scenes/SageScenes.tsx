// The sage field (FILM_SPEC §4): S2 the three neutral questions (144–359), S3 the intent line with the pebble rising in
// (360–503), S8 the claims (1800–2015). One slow glow, white type, a 6 % tinted vignette, no grain (critic H8). Each field
// arrives from a zoom-through on the colour the dive ends on (the pebble's #536B54; S8 the quiz badge's #506E54), so the
// world changes without a pop; its glow and vignette come up over the first 18 frames (EASE.enter) while the ground
// deepens to the type ground (SAGE_TYPE: #425643, glow 4 %) within 12 frames, so the white lines read at ≥ 7:1 (lane
// G-fix, the lead's addendum to REVIEW-G2). S3 sits on the type ground throughout.
import { interpolateColors, useCurrentFrame } from "remotion";
import { SageField, SAGE_TYPE, SAGE_TYPE_GLOWS, Vignette } from "../../components";
import { useLayout } from "../../motion/layout";
import { COLOR, EASE, ramp } from "../../motion/spec";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES } from "../timeline";
import { QUIZ } from "../ui";
import { FilmPebble, Lines, hopsFor } from "./common";

const SageWorld: React.FC<{ arriveAt?: number; fromColour?: string; children?: React.ReactNode }> = ({ arriveAt, fromColour = COLOR.pebble, children }) => {
  const frame = useCurrentFrame();
  const k = arriveAt === undefined ? 1 : ramp(frame, arriveAt, 18, EASE.enter);
  const ground = arriveAt === undefined ? SAGE_TYPE.ground : interpolateColors(ramp(frame, arriveAt, 12, EASE.move), [0, 1], [fromColour, SAGE_TYPE.ground]);
  return (
    <SageField glows={SAGE_TYPE_GLOWS.map((g) => ({ ...g, opacity: g.opacity * k }))} style={{ backgroundColor: ground }}>
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
