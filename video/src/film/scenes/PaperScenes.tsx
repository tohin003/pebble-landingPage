// The paper world (FILM_SPEC §4, §6 S4 and S9): the pebble lands as the full stop of `pebble` and paper floods out
// from where it lands (the impact pushes the light out), radius 0 → past the farthest corner in 20 frames on FLOOD.ease.
// The sage field stays outside the circle; the pebble is drawn twice, dark on sage and light inside the flood, so its
// palette changes with the light (§6 S4). The same colour flood performs the end card on bar 29, deliberately: the
// visual motif repeats with the musical motif.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ColourFlood, PaperField, SAGE_TYPE, SAGE_TYPE_GLOWS, SageField, Vignette, Wordmark, floodRadius, lockupGeometry } from "../../components";
import { useLayout } from "../../motion/layout";
import { EASE, ramp } from "../../motion/spec";
import { PEBBLE_DARK, PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { PEBBLE_INSTANCES, WORDMARK } from "../timeline";
import { FilmPebble, Lines, hopsFor } from "./common";

/**
 * The floods' timing (lane G-fix, REVIEW-G2 P1-1): 13 frames on EASE.enter turned 75 % of the frame white in two frames,
 * a flash. 1 − (1 − t)^1.5 over 20 frames still leaves the landing at speed (the impact pushes the light out: 108 px
 * of radius on the next frame) but spreads the light: the covered share of the frame (so the frame's mean luminance)
 * takes 7.0 frames (16:9) and 6.75 (square) to go from 20 % to 80 %, and the frame is covered by +17. The review's
 * 18-frame bezier(0.2, 0.55, 0.3, 1) measured 3.5 frames here, the circle's area growing with the square of its radius.
 */
export const FLOOD = { dur: 20, ease: (t: number) => 1 - Math.pow(1 - t, 1.5) } as const;

const useLockup = () => {
  const L = useLayout();
  return lockupGeometry({ fontSize: L.type.hero, foot: L.lockup.foot, baseline: L.lockup.baseline, pebbleSize: L.pebbleSize });
};

/** One pebble instance drawn dark on the sage and light inside the flood. */
const TwoTonePebble: React.FC<{ instance: "main" | "end"; light: boolean }> = ({ instance, light }) => {
  const L = useLayout();
  const a = L.aspect;
  const inst = PEBBLE_INSTANCES[instance];
  return (
    <FilmPebble
      x={inst.start[a].x * L.s}
      y={inst.start[a].y * L.s}
      size={L.pebbleSize}
      hops={hopsFor(inst.hops, a, L.s)}
      colors={light ? PEBBLE_LIGHT : PEBBLE_DARK}
    />
  );
};

/** S4, the reveal (504–647): flood f504–523; (W) unroll f506–520 with the tracking settle to f529; T5 f522–612; the
 *  word rolls back into the pebble f614–628; anticipation f629–634 and the leap toward the window world (H3). */
export const S4Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = useLockup();
  const w = WORDMARK.w1;
  const unroll = ramp(frame, w.unroll.at, w.unroll.dur, EASE.enter) * (1 - ramp(frame, w.rollBack.at, w.rollBack.dur, EASE.exit));
  const settle = ramp(frame, w.settle.at, w.settle.to - w.settle.at, EASE.enter);
  const tracking = `${interpolate(settle, [0, 1], [0.04, -0.035]).toFixed(4)}em`;
  return (
    <>
      <SageField glows={SAGE_TYPE_GLOWS} style={{ backgroundColor: SAGE_TYPE.ground }}>
        <TwoTonePebble instance="main" light={false} />
        <Vignette amount={0.06} />
      </SageField>
      <ColourFlood from={g.period} at={504} dur={FLOOD.dur} ease={FLOOD.ease} radius={floodRadius(g.period, width, height)}>
        <PaperField pool={{ x: width / 2, y: g.baseline - g.fontSize * 0.25 }}>
          <Wordmark geometry={g} reveal={unroll} tracking={tracking} pebble={null} />
          <Lines ids={["T5"]} world="paper" />
          <Vignette amount={0.06} />
          <TwoTonePebble instance="main" light />
        </PaperField>
      </ColourFlood>
    </>
  );
};

/** S9, the end card (2016–2303): the pebble lands on bar 29; flood f2016–2035; (W) unroll f2018–2032; T18 at f2088;
 *  T19 and T20 under the final chord (f2160, f2164); the small print at f2196. Everything holds to the last frame. */
export const S9EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = useLockup();
  const unroll = ramp(frame, WORDMARK.w2.unroll.at, WORDMARK.w2.unroll.dur, EASE.enter);
  return (
    <>
      <SageField glows={SAGE_TYPE_GLOWS} style={{ backgroundColor: SAGE_TYPE.ground }}>
        <TwoTonePebble instance="end" light={false} />
        <Vignette amount={0.06} />
      </SageField>
      <ColourFlood from={g.period} at={2016} dur={FLOOD.dur} ease={FLOOD.ease} radius={floodRadius(g.period, width, height)}>
        <PaperField pool={{ x: width / 2, y: g.baseline - g.fontSize * 0.25 }}>
          {frame >= WORDMARK.w2.unroll.at ? <Wordmark geometry={g} reveal={unroll} pebble={null} /> : null}
          <Lines ids={["T18", "T19", "T20", "T21", "T22"]} world="paper" />
          <Vignette amount={0.06} />
          <TwoTonePebble instance="end" light />
        </PaperField>
      </ColourFlood>
    </>
  );
};
