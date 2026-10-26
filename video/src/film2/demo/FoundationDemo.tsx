// F2-Foundation-Demo: the motion foundation's demo reel (28 s, 1920 × 1080, 60 fps; render it at half size). It shows
// each of the seven transition kinds, a ring leading a push-in, type reveals and the light grades, on PLACEHOLDER UI
// (demo/placeholders.ts: real captures of published Pebble releases, standing in for the 2.0.0 captures).
// Everything it draws comes from demo/timeline.ts, which qa/check-demo.ts checks.
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "../tokens";
import { ScalarTrack, worldToFrame } from "../motion/camera";
import { World3D, Plane } from "../camera/World3D";
import { ForegroundMotionBlur } from "../camera/MotionBlur";
import { RingLayer } from "../carrier/RingLayer";
import { RippleGround } from "../carrier/Ripple";
import { Aperture } from "../carrier/Aperture";
import { GradeLayer } from "../light/Grade";
import { gradeAt } from "../light/grades";
import { TextSweep } from "../light/Sweep";
import { FontGate } from "../type/FontGate";
import { KineticLine } from "../type/KineticLine";
import { Cascade, swapLook } from "../type/Cascade";
import { typeStyle } from "../type/scale";
import { rackFocus, ringIris } from "../transitions/presentations";
import { RecordedTake, askCardPlaneStyle } from "../transitions/entrances";
import { PlaceholderSlate, Riverbed, Stone, UiImage } from "./parts";
import { PLACEHOLDER, TAKE, takeFramePath } from "./placeholders";
import {
  APERTURE_CENTER_Y,
  BACKGROUND,
  DURATION,
  IRIS,
  LIGHT_CUES,
  LIGHT_INITIAL,
  PLACE,
  RACK,
  RING_ASK,
  RING_BURST,
  RING_CONVERGE,
  S1,
  S1_CAMERA,
  S2,
  S2_BEATS,
  S2_CAMERA,
  S3,
  S3_BEATS,
  S3_CAMERA,
  S3_FAR_TILT,
  S3_ITEMS,
  S3_REF,
  S3_SCHEDULE,
  S4,
  S4_BEATS,
  S4_CAMERA,
  S4_STONE,
  STONE,
  STONE2,
  TYPE_POS,
  apertureOpenAt,
} from "./timeline";

/* ---------------------------------------------------------------- S1: Act I and the Drop ----------------------- */

const S1_REF = S1_CAMERA.pose(0);
const MAIN_TILT_RY = new ScalarTrack([
  { at: 160, v: 0 },
  { at: 232, v: -9 },
  { at: 300, v: 0 },
]);
const MAIN_TILT_RX = new ScalarTrack([
  { at: 160, v: 0 },
  { at: 232, v: 4 },
  { at: 300, v: 0 },
]);
const takeFrames = Array.from({ length: TAKE.last - TAKE.first + 1 }, (_, i) => takeFramePath(TAKE.first + i));

/** S1's ground: the riverbed with the burst's ripple, and the ring on the ground layer (never blurred by the camera). */
const S1Ground: React.FC = () => {
  const f = useCurrentFrame();
  const s = S1_CAMERA.sample(f);
  return (
    <World3D cam={{ pose: s.pose, ref: S1_REF, vel: s.vel }} dofScale={10}>
      <RippleGround specs={[RING_BURST]} pose={s.pose} poseAt={(x) => S1_CAMERA.pose(x)}>
        <Plane kind="ground" depth={0.4}>
          <Riverbed center={S1_REF} />
        </Plane>
      </RippleGround>
      <RingLayer specs={[RING_BURST]} pose={s.pose} layer="ground" poseAt={(x) => S1_CAMERA.pose(x)} />
    </World3D>
  );
};

/** S1's foreground: the main window, the companion take and the stone (CameraMotionBlur may wrap only this). */
const S1Foreground: React.FC = () => {
  const f = useCurrentFrame();
  const s = S1_CAMERA.sample(f);
  return (
    <World3D cam={{ pose: s.pose, ref: S1_REF, vel: s.vel }} dofScale={10} background="transparent">
      <Plane kind="pebble" rect={PLACE.main} tilt={{ rx: MAIN_TILT_RX.at(f), ry: MAIN_TILT_RY.at(f) }}>
        <UiImage ph={PLACEHOLDER.main} />
      </Plane>
      <Plane kind="pebble" rect={PLACE.models} tilt={{ rx: MAIN_TILT_RX.at(f) * 0.8, ry: -MAIN_TILT_RY.at(f) * 0.8 }}>
        <UiImage ph={PLACEHOLDER.models} />
      </Plane>
      <Plane kind="pebble" rect={PLACE.companion} shadow={false} radius={0}>
        {/* the companion take at 1×, from its frame 22 (the chat already open); it ends before its usage line */}
        <RecordedTake frames={takeFrames} sourceFps={TAKE.fps} at={0} inPoint={22 - TAKE.first} width={PLACE.companion.w} height={PLACE.companion.h} />
      </Plane>
      <Plane kind="film">
        <Stone at={STONE} offsetFrames={0} />
      </Plane>
    </World3D>
  );
};

/** The momentum cut's outgoing frames: CameraMotionBlur (8 samples) on the foreground only; it switches on from rest. */
export const S1_CUT_BLUR = [{ from: 331, to: S1.to }] as const;

const ShotS1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <S1Ground />
      <ForegroundMotionBlur windows={S1_CUT_BLUR}>
        <S1Foreground />
      </ForegroundMotionBlur>
      <Aperture open={apertureOpenAt(f)} centerY={APERTURE_CENTER_Y} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- S2: a ring chapter ------------------------- */

const S2_REF = S2_CAMERA.pose(0);
const s2PoseAt = (abs: number) => S2_CAMERA.pose(abs - S2.from);

const S2Ground: React.FC = () => {
  const L = useCurrentFrame();
  const s = S2_CAMERA.sample(L);
  return (
    <World3D cam={{ pose: s.pose, ref: S2_REF, vel: s.vel }} dofScale={14}>
      <RippleGround specs={[RING_ASK]} pose={s.pose} poseAt={s2PoseAt} offset={S2.from}>
        <Plane kind="ground" depth={0.4}>
          <Riverbed center={S2_REF} />
        </Plane>
      </RippleGround>
      <RingLayer specs={[RING_ASK]} pose={s.pose} layer="ground" offset={S2.from} poseAt={s2PoseAt} />
    </World3D>
  );
};

const S2Foreground: React.FC = () => {
  const L = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = S2_CAMERA.sample(L);
  // the shared ask entrance (placeholder of the recorded one): its 24 px rise and 8 px blur are frame px at 1080, and
  // the card is a plane in world units
  const ask = askCardPlaneStyle(L, S2_BEATS.askIn, fps, 1 / s.pose.zoom);
  const receipt = askCardPlaneStyle(L, S2_BEATS.receiptIn, fps, 1 / s.pose.zoom);
  return (
    <World3D cam={{ pose: s.pose, ref: S2_REF, vel: s.vel }} dofScale={14} background="transparent">
      {ask.opacity > 0 ? (
        <Plane kind="pebble" rect={PLACE.ask} opacity={ask.opacity} style={ask.style}>
          <UiImage ph={PLACEHOLDER.ask} />
        </Plane>
      ) : null}
      {receipt.opacity > 0 ? (
        <Plane kind="pebble" rect={PLACE.receipt} opacity={receipt.opacity} style={receipt.style}>
          <UiImage ph={PLACEHOLDER.receipt} />
        </Plane>
      ) : null}
      <Plane kind="film">
        {/* the companion minimized to its pebble: S2's own place (demo/timeline.ts STONE2) */}
        <Stone at={STONE2} offsetFrames={S2.from} />
      </Plane>
    </World3D>
  );
};

/** The momentum cut's incoming frames: the foreground keeps its camera blur until the arrival has slowed. */
export const S2_CUT_BLUR = [{ from: 0, to: 24 }] as const;

const ShotS2: React.FC = () => (
  <AbsoluteFill>
    <S2Ground />
    <ForegroundMotionBlur windows={S2_CUT_BLUR}>
      <S2Foreground />
    </ForegroundMotionBlur>
  </AbsoluteFill>
);

/* ---------------------------------------------------------------- S3: a cascade ------------------------------ */

const CARDS = [PLACEHOLDER.memoryRecords, PLACEHOLDER.memoryKinds, PLACEHOLDER.forget] as const;
const cardRect = (i: number) => {
  const ph = CARDS[i]!;
  const c = "crop" in ph && ph.crop ? ph.crop : { w: ph.w, h: ph.h };
  return { x: PLACE.stage.x + (PLACE.stage.w - c.w) / 2, y: PLACE.stage.y + (PLACE.stage.h - c.h) / 2, w: c.w, h: c.h };
};
const FAR_RY = new ScalarTrack([
  { at: 0, v: S3_FAR_TILT.ry[0] },
  { at: S3_FAR_TILT.flattenFrom, v: S3_FAR_TILT.ry[0] * 0.6 },
  { at: S3_FAR_TILT.flattenTo, v: S3_FAR_TILT.ry[1] },
]);
const FAR_RX = new ScalarTrack([
  { at: 0, v: S3_FAR_TILT.rx[0] },
  { at: S3_FAR_TILT.flattenFrom, v: S3_FAR_TILT.rx[0] * 0.6 },
  { at: S3_FAR_TILT.flattenTo, v: S3_FAR_TILT.rx[1] },
]);

const ShotS3: React.FC = () => {
  const M = useCurrentFrame();
  const s = S3_CAMERA.sample(M);
  return (
    <World3D cam={{ pose: s.pose, ref: S3_REF, vel: s.vel }} dofScale={20}>
      <Plane kind="ground" depth={0.4}>
        <Riverbed center={S3_REF} />
      </Plane>
      <Plane kind="pebble" rect={PLACE.far} depth={0.7} tilt={{ rx: FAR_RX.at(M), ry: FAR_RY.at(M) }}>
        <UiImage ph={PLACEHOLDER.main} />
      </Plane>
      {S3_SCHEDULE.map((w, i) => {
        const last = i === S3_SCHEDULE.length - 1;
        // the first card is already on the stage when the rack lands; the last one holds until the iris covers it
        const look = i === 0 && M < w.inStart ? { opacity: 1, blur: 0 } : swapLook(w, M, last);
        if (!look) return null;
        return (
          <Plane key={i} kind="pebble" rect={cardRect(i)} opacity={look.opacity} style={{ filter: look.blur > 0.05 ? `blur(${(look.blur / s.pose.zoom).toFixed(2)}px)` : undefined }}>
            <UiImage ph={CARDS[i]!} />
          </Plane>
        );
      })}
    </World3D>
  );
};

/* ---------------------------------------------------------------- S4: convergence and title ------------------- */

const S4_REF = { x: 960, y: 540, zoom: 1 };
const ShotS4: React.FC = () => {
  const N = useCurrentFrame();
  const s = S4_CAMERA.sample(N);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.page }}>
      <World3D cam={{ pose: s.pose, ref: S4_REF, vel: s.vel }} background={COLOR.page}>
        <RingLayer specs={[RING_CONVERGE]} pose={s.pose} layer="ground" offset={S4.from} />
        <Plane kind="film">
          <Stone at={S4_STONE} offsetFrames={S4.from} size={210} />
        </Plane>
      </World3D>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- type (outside the grade) ------------------- */

const TypeLayer: React.FC = () => {
  const { width, height } = useVideoConfig();
  const titleStyle = { ...typeStyle("expressive", width, height, 1), lineHeight: 1.25, color: COLOR.ink };
  return (
    <FontGate>
      <Sequence from={0} durationInFrames={200} layout="none">
        <KineticLine text="Pebble" tier="expressive" at={40} exitAt={165} sizeT={1} align="center" style={{ left: TYPE_POS.name.x, top: TYPE_POS.name.y, width: TYPE_POS.name.w }} />
      </Sequence>
      <Sequence from={S2.from} durationInFrames={S2_BEATS.pairOut + 40} layout="none">
        <KineticLine text="AgentGuard, built in." tier="expressive" sizeT={0} at={S2_BEATS.pairIn} exitAt={S2_BEATS.pairOut} style={{ left: TYPE_POS.pairA.x, top: TYPE_POS.pairA.y }} />
        <KineticLine text="Reliability, not security." tier="functional" sizeT={0} at={S2_BEATS.pairIn + 16} exitAt={S2_BEATS.pairOut} style={{ left: TYPE_POS.pairB.x, top: TYPE_POS.pairB.y }} />
      </Sequence>
      <Sequence from={S3.from} durationInFrames={S3_BEATS.fixedOut + 40} layout="none">
        <KineticLine text="Memory you control" tier="expressive" at={S3_BEATS.fixedIn} exitAt={S3_BEATS.fixedOut} exit="lift" style={{ left: TYPE_POS.fixed.x, top: TYPE_POS.fixed.y }} />
        <Cascade items={S3_ITEMS} start={S3_BEATS.itemsFrom} holdLast={false} itemStyle={{ left: TYPE_POS.item.x, top: TYPE_POS.item.y }} />
      </Sequence>
      <Sequence from={S4.from} durationInFrames={S4.dur} layout="none">
        <KineticLine text="Pebble" tier="expressive" sizeT={1} at={S4_BEATS.titleIn} style={{ left: TYPE_POS.title.x, top: TYPE_POS.title.y }} />
        <TextSweep at={S4_BEATS.sweepAt} frames={44} strength={0.35} width={360} height={130} style={{ ...titleStyle, position: "absolute", left: TYPE_POS.title.x, top: TYPE_POS.title.y, whiteSpace: "pre" }}>
          Pebble
        </TextSweep>
        <KineticLine text="Shown with sample data." tier="functional" sizeT={0} at={S4_BEATS.smallIn} color={COLOR.ink2} style={{ left: TYPE_POS.small.x, top: TYPE_POS.small.y }} />
      </Sequence>
    </FontGate>
  );
};

/* ---------------------------------------------------------------- the reel ------------------------------------ */

export const FoundationDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const grade = gradeAt(frame, LIGHT_INITIAL, LIGHT_CUES);
  const irisCenter = worldToFrame(S4_STONE, S4_CAMERA.pose(0), width, height);
  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND }}>
      <GradeLayer grade={grade}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={S1.to - S1.from}>
            <ShotS1 />
          </TransitionSeries.Sequence>
          <TransitionSeries.Sequence durationInFrames={S2.dur}>
            <ShotS2 />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition timing={linearTiming({ durationInFrames: RACK.frames })} presentation={rackFocus({ blurPx: 13 })} />
          <TransitionSeries.Sequence durationInFrames={S3.dur}>
            <ShotS3 />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: IRIS.frames })}
            presentation={ringIris({ center: [irisCenter.x / width, irisCenter.y / height], featherPx: 36, startRadiusPx: S4_STONE.r })}
          />
          <TransitionSeries.Sequence durationInFrames={S4.dur}>
            <ShotS4 />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </GradeLayer>
      <TypeLayer />
      <PlaceholderSlate />
    </AbsoluteFill>
  );
};

export const FOUNDATION_DEMO = { durationInFrames: DURATION, fps: 60, width: 1920, height: 1080 } as const;
