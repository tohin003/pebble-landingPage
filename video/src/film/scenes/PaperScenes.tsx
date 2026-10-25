// The title and the button (bars 29–32, the recut's approved end card): the pebble lands as the full stop of `pebble.`
// and paper floods out from where it lands, as at the drop (Reveal.tsx), deliberately: the visual motif repeats with the
// musical motif. The sage field stays outside the circle; the pebble is drawn twice, dark on sage and light inside the
// flood, so its palette changes with the light.
//
// Lane v2-film (docs/PHILOSOPHY.md; the page's footer graft): both grounds are flat (no pool of light, no vignette),
// and the lockup stands on the pebble's line, the hand-drawn stroke the page draws under the hero's pebble and along
// the footer wordmark's baseline, so the film's last frame and the page's last screen are the same picture.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ColourFlood, Wordmark, floodRadius } from "../../components";
import { useLayout } from "../../motion/layout";
import { EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_DARK, PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES, WORDMARK } from "../timeline";
import { FilmPebble, FlatGround, Lines, hopsFor } from "./common";
import { FLOOD, LockupLine, useLockup } from "./Reveal";

/** The end card's pebble, drawn dark on the sage and light inside the flood, so its palette changes with the light. */
const TwoTonePebble: React.FC<{ instance: "end"; light: boolean }> = ({ instance, light }) => {
  const L = useLayout();
  const a = L.aspect;
  const inst = PEBBLE_INSTANCES[instance];
  return <FilmPebble x={inst.start[a].x * L.s} y={inst.start[a].y * L.s} size={L.pebbleSize} hops={hopsFor(inst.hops, a, L.s)} colors={light ? PEBBLE_LIGHT : PEBBLE_DARK} />;
};

/** S9, the end card (2016–2303): the pebble lands on bar 29; flood f2016–2035; (W) unroll f2018–2032; T18 at f2088;
 *  T19 slams onto the final hit (f2160) with its limit right under it in the same voice ("Not notarized", OVERRIDES §39),
 *  T20 (the URL, f2164); the small print at f2196. Everything holds to the last frame. */
export const S9EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = useLockup();
  const unroll = ramp(frame, WORDMARK.w2.unroll.at, WORDMARK.w2.unroll.dur, EASE.enter);
  return (
    <>
      <FlatGround color={SYSTEM.sage}>
        <TwoTonePebble instance="end" light={false} />
      </FlatGround>
      <ColourFlood from={g.period} at={2016} dur={FLOOD.dur} ease={FLOOD.ease} radius={floodRadius(g.period, width, height)}>
        <FlatGround color={SYSTEM.bg}>
          <LockupLine g={g} id="end-card-line" />
          {frame >= WORDMARK.w2.unroll.at ? <Wordmark geometry={g} reveal={unroll} pebble={null} color={SYSTEM.ink} /> : null}
          <Lines ids={["T18", "T19", "NN", "T20", "T21", "T22"]} world="paper" />
          <TwoTonePebble instance="end" light />
        </FlatGround>
      </ColourFlood>
    </>
  );
};
