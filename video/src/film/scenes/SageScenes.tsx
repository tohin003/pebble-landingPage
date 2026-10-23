// The sage field (FILM_SPEC §4): S2 the three neutral questions (144–359), S3 the intent line with the pebble rising in
// (360–503), S8 the claims (1800–2015). Lane v2-film (docs/PHILOSOPHY.md): a FLAT field, no glow, no grain, no vignette;
// colour and texture live only in imagery. Each field arrives from a zoom-through on the colour the dive ends on (the
// pebble's #536B54; S8 the quiz badge's #506E54), so the world changes without a pop, and the ground settles on the
// type ground (SYSTEM.sage, #425643) within 12 frames, where white lines read at 7.9:1 (lane G-fix, the lead's
// addendum to REVIEW-G2). S3 sits on the type ground throughout.
import { interpolateColors, useCurrentFrame } from "remotion";
import { useLayout } from "../../motion/layout";
import { COLOR, EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES } from "../timeline";
import { QUIZ } from "../ui";
import { FilmPebble, FlatGround, Lines, hopsFor } from "./common";

export const SageWorld: React.FC<{ arriveAt?: number; fromColour?: string; children?: React.ReactNode }> = ({ arriveAt, fromColour = COLOR.pebble, children }) => {
  const frame = useCurrentFrame();
  const ground = arriveAt === undefined ? SYSTEM.sage : interpolateColors(ramp(frame, arriveAt, 12, EASE.move), [0, 1], [fromColour, SYSTEM.sage]);
  return <FlatGround color={ground}>{children}</FlatGround>;
};

/** S2: "What did it change?" · "Can I undo it?" · "Did it run the tests?" — one per bar, (B) ink, a list. */
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
