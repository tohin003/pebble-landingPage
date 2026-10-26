// <PieceView>: draws any set piece from its plan (setpieces/scene.ts), so the picture is exactly what the checks read.
// Put it in a <Sequence from={start}>: every frame in a plan is the piece's local frame.
//
// Layers, back to front (the foundation's recipe, film2/README "How the set-piece lane uses this"):
//   the grade (light/Grade.tsx) over: the ground world (the riverbed under still water with the rings' ripple, or the
//   sage-white page), the ground rings, the foreground world (the planes and the stone; CameraMotionBlur only inside a
//   shot's short blur windows), the front rings, the aperture's bands;
//   then, outside the grade: the code light leaks, the type (one FontGate), the slate.
// Seams: a hard cut is two sequences; a rack, an iris or a swap is a @remotion/transitions presentation, during which
// the outgoing shot keeps rendering (its camera keeps its last velocity) while the incoming one starts.
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { Fragment } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, TRANSITION, f60 } from "../../tokens";
import { E_MOVE, clamp01 } from "../../motion/ease";
import { ScalarTrack, worldToFrame } from "../../motion/camera";
import { World3D, Plane } from "../../camera/World3D";
import { ForegroundMotionBlur } from "../../camera/MotionBlur";
import { RingLayer } from "../../carrier/RingLayer";
import { RippleGround } from "../../carrier/Ripple";
import { Aperture } from "../../carrier/Aperture";
import { GradeLayer } from "../../light/Grade";
import { gradeAt } from "../../light/grades";
import { LightLeak } from "../../light/LightLeak";
import { FontGate } from "../../type/FontGate";
import { KineticLine } from "../../type/KineticLine";
import { typeSizePx } from "../../type/scale";
import { defaultEntranceOf, enterFramesOf, exitFramesOf } from "../frame";
import { Cascade, cascadeSchedule, swapLook } from "../../type/Cascade";
import { askCardPlaneStyle } from "../../transitions/entrances";
import { rackFocus, ringIris, swapInPlace } from "../../transitions/presentations";
import { IRIS_DEFAULT_EASE, IRIS_DRAWN } from "../../transitions/kinds";
import { Riverbed } from "../../demo/parts";
import { RIVERBED } from "../ground";
import { PebbleOnFilm } from "../../../pebble/PebbleOnFilm";
import type { PlaneSpec, ScenePlan, ShotSpec, TypeSpec } from "../scene";
import { ImageContent, SetPiecesSlate, StandInView, TakeViewContent } from "./StandInViews";
import { SageTextSweep } from "./SageSweep";
import { VeilCast } from "./VeilCast";
import { WallCells } from "./WallView";

/** The film pebble's foot sits this far below the stone's centre at 148 px (video/src/film/timeline.ts PET). */
const CENTRE_TO_FOOT_148 = 38.2;

const dimFilter = (d: number): string | undefined => (d > 0.002 ? `brightness(${(1 - 0.24 * d).toFixed(4)}) saturate(${(1 - 0.3 * d).toFixed(4)})` : undefined);

/** One plane of a shot: its entrance, swaps, dimming and tilt, around its content. */
const PlaneView: React.FC<{ shot: ShotSpec; pl: PlaneSpec; frame: number; zoom: number }> = ({ shot, pl, frame, zoom }) => {
  const { fps, width, height } = useVideoConfig();
  if (frame < (pl.from ?? -Infinity) || frame >= (pl.to ?? Infinity)) return null;
  const unit = Math.min(width, height) / 1080;
  let opacity = 1;
  const style: React.CSSProperties = {};
  const filters: string[] = [];
  if (pl.enterAt !== undefined) {
    if (frame < pl.enterAt) return null;
    if (pl.enterKind === "fade") {
      opacity *= E_MOVE(clamp01((frame - pl.enterAt) / f60(20, fps)));
    } else {
      const e = askCardPlaneStyle(frame, pl.enterAt, fps, unit / zoom);
      opacity *= e.opacity;
      Object.assign(style, e.style);
    }
  }
  const swapN = f60(TRANSITION.swap.inFrames, fps);
  const blurOf = (b: number) => `blur(${((b * unit) / zoom).toFixed(2)}px)`;
  if (pl.swapInAt !== undefined) {
    if (frame < pl.swapInAt) return null;
    const u = E_MOVE(clamp01((frame - pl.swapInAt) / swapN));
    opacity *= u;
    if (u < 1) filters.push(blurOf(TRANSITION.swap.blurPx * (1 - u)));
  }
  if (pl.swapOutAt !== undefined && frame >= pl.swapOutAt) {
    const u = E_MOVE(clamp01((frame - pl.swapOutAt) / swapN));
    if (u >= 1) return null;
    opacity *= 1 - u;
    filters.push(blurOf(TRANSITION.swap.blurPx * u));
  }
  if (pl.dim) {
    const d = new ScalarTrack(pl.dim).at(frame);
    const f = dimFilter(d);
    if (f) filters.push(f);
  }
  if (filters.length) style.filter = [style.filter, ...filters].filter(Boolean).join(" ");
  const tilt = pl.kind === "pebble" && (pl.tiltRx || pl.tiltRy) ? { rx: pl.tiltRx ? new ScalarTrack(pl.tiltRx).at(frame) : 0, ry: pl.tiltRy ? new ScalarTrack(pl.tiltRy).at(frame) : 0 } : undefined;
  const reading = !!pl.read && frame >= pl.read.from && frame < pl.read.to;
  const c = pl.content;
  return (
    <Plane kind={pl.kind} rect={pl.rect} depth={pl.depth ?? 1} tilt={tilt} reading={reading} opacity={opacity} shadow={pl.shadow} radius={pl.radius} style={style}>
      {c.kind === "standIn" ? (
        <StandInView standIn={c.standIn} w={pl.rect.w} h={pl.rect.h} px={zoom} />
      ) : c.kind === "take" ? (
        <TakeViewContent use={c.use} view={c.view} w={pl.rect.w} h={pl.rect.h} px={zoom} offset={shot.from} />
      ) : (
        <ImageContent src={c.src} w={pl.rect.w} h={pl.rect.h} />
      )}
    </Plane>
  );
};

/** One shot of a piece: the ground world, the foreground world, the rings and the aperture. */
export const ShotView: React.FC<{ plan: ScenePlan; shot: ShotSpec }> = ({ plan, shot }) => {
  const L = useCurrentFrame();
  const frame = L + shot.from; // the piece's local frame
  const s = shot.camera.sample(L);
  const cam = { pose: s.pose, ref: shot.ref, vel: s.vel };
  const poseAt = (f: number) => shot.camera.pose(f - shot.from);
  const focus = shot.focus ? shot.focus(frame) : 1;
  const ground = shot.ground === "page" ? COLOR.page : COLOR.riverbedMid;
  const st = shot.stone;
  return (
    <AbsoluteFill style={{ backgroundColor: ground }}>
      <World3D cam={cam} dofScale={shot.dofScale ?? 14} focus={focus} background={ground}>
        {shot.ground === "riverbed" ? (
          <RippleGround specs={shot.rings} pose={s.pose} poseAt={poseAt} offset={shot.from}>
            {/* the extent and depth the coverage check reads (setpieces/ground.ts, CR-02) */}
            <Plane kind="ground" depth={RIVERBED.depth}>
              <Riverbed center={shot.ref} width={RIVERBED.w} />
            </Plane>
          </RippleGround>
        ) : null}
        <RingLayer specs={shot.rings} pose={s.pose} layer="ground" offset={shot.from} poseAt={poseAt} />
      </World3D>
      <ForegroundMotionBlur windows={shot.blur ?? []}>
        <World3D cam={cam} dofScale={shot.dofScale ?? 14} focus={focus} background="transparent">
          {shot.planes.map((pl) => (
            <PlaneView key={pl.id} shot={shot} pl={pl} frame={frame} zoom={s.pose.zoom} />
          ))}
          {shot.wall ? <WallCells spec={shot.wall} frame={frame} /> : null}
          {shot.cascade
            ? (() => {
                const sched = cascadeSchedule(shot.cascade.start, shot.cascade.items, plan.fps, shot.cascade.beats);
                return shot.cascade.cards.map((card, i) => {
                  const w = sched[i];
                  if (!w) return null;
                  // the first card is on the stage from the cut (the shot is never empty); the rest swap in place
                  const look = i === 0 && frame < w.inEnd ? { opacity: 1, blur: 0 } : swapLook(w, frame, shot.cascade!.holdLast && i === sched.length - 1);
                  if (!look) return null;
                  return (
                    <Plane key={`card${i}`} kind={card.kind} rect={card.rect} opacity={look.opacity} shadow={card.shadow} radius={card.radius} reading={look.opacity > 0.99} style={{ filter: look.blur > 0.05 ? `blur(${((look.blur * Math.min(plan.frame.w, plan.frame.h)) / 1080 / s.pose.zoom).toFixed(2)}px)` : undefined }}>
                      {card.content.kind === "standIn" ? <StandInView standIn={card.content.standIn} w={card.rect.w} h={card.rect.h} px={s.pose.zoom} /> : null}
                    </Plane>
                  );
                });
              })()
            : null}
          {st ? (
            <Plane kind="film">
              {st.veil ? (
                <VeilCast at={st.at} size={st.size} cues={st.cues} veil={st.veil} offsetFrames={shot.from} />
              ) : (
                <PebbleOnFilm cues={st.cues} size={st.size} x={st.at.x} y={st.at.y + CENTRE_TO_FOOT_148 * (st.size / 148)} offsetFrames={shot.from} />
              )}
            </Plane>
          ) : null}
        </World3D>
      </ForegroundMotionBlur>
      <RingLayer specs={shot.rings} pose={s.pose} layer="front" offset={shot.from} poseAt={poseAt} />
      {shot.aperture ? <Aperture open={shot.aperture.open(frame)} centerY={shot.aperture.centerY} color={shot.aperture.band} /> : null}
    </AbsoluteFill>
  );
};

/** The shots, with their seams. */
const Shots: React.FC<{ plan: ScenePlan }> = ({ plan }) => {
  const { width, height } = useVideoConfig();
  if (plan.shots.length === 1) return <ShotView plan={plan} shot={plan.shots[0]!} />;
  const items: React.ReactNode[] = [];
  plan.shots.forEach((shot, i) => {
    const seam = plan.seams.find((x) => x.out === shot.id);
    const T = seam && seam.frames > 0 ? seam.frames : 0;
    items.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={shot.to - shot.from + T}>
        <ShotView plan={plan} shot={shot} />
      </TransitionSeries.Sequence>,
    );
    if (seam && T > 0) {
      const next = plan.shots[i + 1]!;
      const c = seam.irisCenter ? worldToFrame(seam.irisCenter, next.camera.pose(0), width, height) : { x: width / 2, y: height / 2 };
      const presentation =
        seam.presentation === "rack"
          ? rackFocus({ blurPx: seam.blurPx ?? 13 })
          : seam.presentation === "iris"
            ? ringIris({ center: [c.x / width, c.y / height], featherPx: IRIS_DRAWN.featherPx, startRadiusPx: IRIS_DRAWN.startRadiusPx, ease: seam.ease ?? IRIS_DEFAULT_EASE })
            : swapInPlace({});
      items.push(<TransitionSeries.Transition key={`t${i}`} timing={linearTiming({ durationInFrames: T })} presentation={presentation as never} />);
    }
  });
  return <TransitionSeries>{items}</TransitionSeries>;
};

/**
 * One TypeSpec as KineticLines, one per explicit line: GSAP SplitText drops the "\n" of a single block (it re-flows the
 * words on one line), so a multi-line spec is drawn as stacked lines with KineticLine's own stagger (lineRise lines 8
 * frames apart; lifts staggered as KineticLine staggers them). Each line is unmounted once its exit is over, and a
 * "camera" exit (the line leaves with its shot) unmounts on its exit frame.
 */
const TypeLines: React.FC<{ t: TypeSpec; pieceEnd: number }> = ({ t, pieceEnd }) => {
  const { fps, width, height } = useVideoConfig();
  const tier = t.tier;
  const lines = t.text.split("\n");
  const size = typeSizePx(tier, width, height, t.sizeT ?? 0.5);
  const lh = size * (tier === "expressive" ? 1.25 : 1.3);
  const ent = t.entrance ?? defaultEntranceOf(tier);
  const exit = t.exit ?? "blur";
  const stagger = ent === "lineRise" ? f60(8, fps) : 0;
  const blockExit = t.exitAt === undefined ? 0 : exitFramesOf(ent, exit, t.text, fps);
  const liftEach = Math.max(2, Math.round(Math.max(2, Math.round(enterFramesOf(ent, lines[0]!, fps) * 0.55))));
  const liftStagger = exit === "lift" ? Math.max(1, Math.round(liftEach * 0.4)) : 0;
  const end = t.exitAt === undefined ? pieceEnd : exit === "camera" ? t.exitAt : t.exitAt + blockExit + 2;
  if (end <= 0) return null;
  return (
    <Sequence durationInFrames={Math.max(1, end)} layout="none" name={t.id}>
      {lines.map((ln, i) => (
        <KineticLine
          key={i}
          text={ln}
          tier={tier}
          at={t.at + i * stagger}
          exitAt={t.exitAt === undefined || exit === "camera" ? undefined : t.exitAt + i * liftStagger}
          entrance={ent}
          exit={exit}
          sizeT={t.sizeT ?? 0.5}
          color={t.color ?? COLOR.ink}
          align={t.box.align}
          style={{ left: t.box.left, top: t.box.top + i * lh, width: t.box.width }}
        />
      ))}
      {t.sweep ? <SageTextSweep spec={t} /> : null}
    </Sequence>
  );
};

/** The type layer: every line of the plan, the cascades' fixed lines and items, the title's sweep. */
export const TypeView: React.FC<{ plan: ScenePlan }> = ({ plan }) => (
  <FontGate>
    {plan.types.map((t) => (
      <TypeLines key={t.id} t={t} pieceEnd={plan.duration} />
    ))}
    {plan.shots.map((s) =>
      s.cascade ? (
        <Fragment key={`c-${s.id}`}>
          <TypeLines t={s.cascade.fixed} pieceEnd={plan.duration} />
          <Cascade items={s.cascade.items} start={s.cascade.start} beats={s.cascade.beats} holdLast={s.cascade.holdLast} itemStyle={{ left: s.cascade.itemBox.left, top: s.cascade.itemBox.top, width: s.cascade.itemBox.width, textAlign: s.cascade.itemBox.align }} />
        </Fragment>
      ) : null,
    )}
  </FontGate>
);

/** A whole piece: graded shots, leaks, type and (in demos) the placeholder slate. */
export const PieceView: React.FC<{ plan: ScenePlan; slate?: boolean }> = ({ plan, slate = true }) => {
  const frame = useCurrentFrame();
  const grade = gradeAt(frame, plan.lightInitial, plan.lightCues);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.riverbedMid }}>
      <GradeLayer grade={grade}>
        <Shots plan={plan} />
      </GradeLayer>
      {plan.leaks.map((l, i) => (
        <LightLeak key={i} at={l.at} frames={l.frames} tone="warm" strength={0.8} />
      ))}
      <TypeView plan={plan} />
      {slate ? <SetPiecesSlate piece={plan.name} /> : null}
    </AbsoluteFill>
  );
};
