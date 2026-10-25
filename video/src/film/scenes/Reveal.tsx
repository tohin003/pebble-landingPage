// The reveal's first two bars (f648–791):
// - bar 10, the drop (the approved recut's reveal, re-timed): the pebble lands as the full stop of `pebble` on f648 and
//   paper floods out from where it lands (20 frames, the film's first bright frame, ramped, never a flash); the
//   wordmark unrolls over f650–664 with its tracking settle; "A small companion for your Mac" blurs in at f666;
// - bar 11, the star beat: the lockup holds; the wordmark rolls back into the pebble over f738–752; the pebble hops down
//   (take-off f756) and lands in its corner of the light riverbed desktop at f774, as the desktop slides in under it
//   (the camera tilts down from the page to the Mac, f756–774, with motion blur on its fastest frames); its eyes find
//   the arriving pointer, and its natural blink comes at f784.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, ColourFlood, Cursor, Desktop, Wordmark, World, floodRadius, lockupGeometry, type LockupGeometry } from "../../components";
import { useLayout, type AspectId } from "../../motion/layout";
import { EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_DARK, PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { STAR_PAN, landPointer, landPose } from "../desk";
import { filmCues, shiftCues } from "../gaze";
import { DESK_CAMERA, PEBBLE_INSTANCES, PET, REVEAL_FRAME, TYPE_PEBBLE, WORDMARK } from "../timeline";
import { FilmPebble, FlatGround, Horizon, Lines, hopsFor } from "./common";

/** The floods' timing (lane G-fix, REVIEW-G2 P1-1): 20 frames on 1 − (1 − t)^1.5, so the covered share of the frame
 *  takes about 7 frames from 20 % to 80 % (the flash rule's ≥ 7 frames). */
export const FLOOD = { dur: 20, ease: (t: number) => 1 - Math.pow(1 - t, 1.5) } as const;

export const useLockup = () => {
  const L = useLayout();
  return lockupGeometry({ fontSize: L.type.hero, foot: L.lockup.foot, baseline: L.lockup.baseline, pebbleSize: L.pebbleSize });
};

/** The line under the lockup: from a third of an em before the word to a third of an em past the pebble, at its foot. */
export const LockupLine: React.FC<{ g: LockupGeometry; id: string }> = ({ g, id }) => (
  <Horizon id={id} x0={g.box.x - 0.35 * g.fontSize} x1={g.period.x + g.body.w / 2 + 0.35 * g.fontSize} y={g.period.y} />
);

/** The main pebble (frame space): dark on the night and sage, light inside the flood and after it. In 9:16 it grows
 *  during the hop down from the lockup's size to the desktop's (the wallpaper keeps 9:16 at m 1.92 or more). */
const MainPebble: React.FC<{ light: boolean }> = ({ light }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const main = PEBBLE_INSTANCES.main;
  const off = main.offset;
  const landSize = PET.size * DESK_CAMERA.land.m[a];
  const grow = ramp(frame, STAR_PAN.from, STAR_PAN.dur, EASE.move);
  const size = (TYPE_PEBBLE[a] + (landSize - TYPE_PEBBLE[a]) * grow) * L.s;
  return (
    <FilmPebble
      x={main.start[a].x * L.s}
      y={main.start[a].y * L.s}
      size={size}
      hops={hopsFor(main.hops, a, L.s, off / fps)}
      colors={light ? PEBBLE_LIGHT : PEBBLE_DARK}
      cues={shiftCues(filmCues(a), off)}
      offsetFrames={off}
    />
  );
};

/** Vertical motion blur on the tilt's fastest frames (≤ 12 px; none when nearly still). */
const panBlur = (frame: number, height: number) => {
  const p = (f: number) => EASE.camera(Math.min(1, Math.max(0, (f - STAR_PAN.from) / STAR_PAN.dur)));
  const travel = Math.abs(p(frame) - p(frame - 1)) * height;
  return travel < 4 ? 0 : Math.min(12, travel / 16);
};

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect as AspectId;
  const g = useLockup();
  const w = WORDMARK.w1;
  const unroll = ramp(frame, w.unroll.at, w.unroll.dur, EASE.enter) * (1 - ramp(frame, w.rollBack.at, w.rollBack.dur, EASE.exit));
  const settle = ramp(frame, w.settle.at, w.settle.to - w.settle.at, EASE.enter);
  const tracking = `${interpolate(settle, [0, 1], [0.04, -0.035]).toFixed(4)}em`;
  const pan = EASE.camera(Math.min(1, Math.max(0, (frame - STAR_PAN.from) / STAR_PAN.dur)));
  const dy = -pan * height;
  const blur = panBlur(frame, height);
  const flooding = frame < REVEAL_FRAME + FLOOD.dur;
  const filter = blur > 0.2 ? `url(#star-pan-blur)` : undefined;
  const pointer = landPointer(a, L.s, width, height);
  return (
    <AbsoluteFill style={{ backgroundColor: SYSTEM.bg }}>
      {blur > 0.2 ? (
        <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter id="star-pan-blur" x="0" y="-5%" width="100%" height="110%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} edgeMode="duplicate" />
            </filter>
          </defs>
        </svg>
      ) : null}
      {/* the page: the flood, the lockup, the line; it rises out of the top as the camera tilts down */}
      <AbsoluteFill style={{ transform: dy !== 0 ? `translateY(${dy.toFixed(2)}px)` : undefined, filter }}>
        <FlatGround color={SYSTEM.sage}>{flooding ? <MainPebble light={false} /> : null}</FlatGround>
        <ColourFlood from={g.period} at={REVEAL_FRAME} dur={FLOOD.dur} ease={FLOOD.ease} radius={floodRadius(g.period, width, height)}>
          <FlatGround color={SYSTEM.bg}>
            <LockupLine g={g} id="reveal-line" />
            <Wordmark geometry={g} reveal={unroll} tracking={tracking} pebble={null} color={SYSTEM.ink} />
            <Lines ids={["T5"]} world="paper" />
            {flooding ? <MainPebble light /> : null}
          </FlatGround>
        </ColourFlood>
      </AbsoluteFill>
      {/* the light desktop slides in under the hopping pebble */}
      {pan > 0 ? (
        <AbsoluteFill style={{ transform: `translateY(${(height + dy).toFixed(2)}px)`, filter }}>
          <Camera pose={landPose(a, L.s, width, height)}>
            <World>
              <Desktop />
            </World>
          </Camera>
        </AbsoluteFill>
      ) : null}
      {!flooding ? <MainPebble light /> : null}
      <Cursor space="frame" keys={pointer.keys} visible={[pointer.visible]} />
    </AbsoluteFill>
  );
};
