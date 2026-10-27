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
import { GradeLayer, GroundLight } from "../../light/Grade";
import { gradeAt } from "../../light/grades";
import { LightLeak } from "../../light/LightLeak";
import { FontGate } from "../../type/FontGate";
import { KineticLine } from "../../type/KineticLine";
import { wordsIn } from "../../type/exits";
import { typeSizePx } from "../../type/scale";
import { defaultEntranceOf, exitPlanOf } from "../frame";
import { carryTransform } from "../kit";
import { Cascade, SWAP_SLIDE, cascadeSchedule, swapLook } from "../../type/Cascade";
import { askCardPlaneStyle } from "../../transitions/entrances";
import { rackFocus, ringIris, swapInPlace } from "../../transitions/presentations";
import { IRIS_DEFAULT_EASE, IRIS_DRAWN } from "../../transitions/kinds";
import { Riverbed } from "../../demo/parts";
import { RIVERBED, groundRectOf } from "../ground";
import { PebbleOnFilm } from "../../../pebble/PebbleOnFilm";
import type { PlaneSpec, ScenePlan, ShotSpec, TypeSpec } from "../scene";
import { frameOfSource, sourceFrameAt, stillsAt } from "../take";
import { drawnSlots, labelOpacityOn } from "../labels";
import { ImageContent, SetPiecesSlate, StandInView, TakeViewContent } from "./StandInViews";
import { SageTextSweep } from "./SageSweep";
import { VeilCast } from "./VeilCast";
import { WallCells } from "./WallView";

/** The film pebble's foot sits this far below the stone's centre at 148 px (video/src/film/timeline.ts PET). */
const CENTRE_TO_FOOT_148 = 38.2;

const dimFilter = (d: number): string | undefined => (d > 0.002 ? `brightness(${(1 - 0.24 * d).toFixed(4)}) saturate(${(1 - 0.3 * d).toFixed(4)})` : undefined);

/** One plane of a shot: its entrance, swaps, dimming and tilt, around its content. */
const PlaneView: React.FC<{ plan: ScenePlan; shot: ShotSpec; pl: PlaneSpec; frame: number; zoom: number }> = ({ plan, shot, pl, frame, zoom }) => {
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
  // a take's placeholder view that shows nothing yet draws nothing (no card-shaped box or shadow before the card
  // lands); a view showing one arriving still arrives with it, its shadow included
  let planeEntrance = false;
  if (pl.content.kind === "take") {
    const u = pl.content.use;
    const v = u.manifest.views[pl.content.view];
    if (v && !u.manifest.pattern && !v.slot) {
      if (frame < u.at || frame >= u.until) return null;
      const shown = stillsAt(v, sourceFrameAt(frame, u.at, fps, u.manifest, u.inPoint));
      if (!shown.length) return null;
      if (shown.length === 1 && shown[0]!.entrance) {
        const e = askCardPlaneStyle(frame, frameOfSource(shown[0]!.from, u.at, fps, u.manifest, u.inPoint), fps, unit / zoom);
        opacity *= e.opacity;
        if (e.style.transform) style.transform = [style.transform, e.style.transform].filter(Boolean).join(" ");
        if (e.style.filter) filters.push(String(e.style.filter));
        planeEntrance = true;
      }
    }
  }
  if (filters.length) style.filter = [style.filter, ...filters].filter(Boolean).join(" ");
  const tilt = pl.kind === "pebble" && (pl.tiltRx || pl.tiltRy) ? { rx: pl.tiltRx ? new ScalarTrack(pl.tiltRx).at(frame) : 0, ry: pl.tiltRy ? new ScalarTrack(pl.tiltRy).at(frame) : 0 } : undefined;
  const reading = !!pl.read && frame >= pl.read.from && frame < pl.read.to;
  const c = pl.content;
  // each slot's label as the plan has it: whole or not drawn (setpieces/labels.ts, NF-08)
  const slots = drawnSlots(plan, shot, pl);
  const labelOpacity = (key: string) => {
    const d = slots.find((x) => x.key === key);
    return d ? labelOpacityOn(plan, shot, d, frame) : 1;
  };
  return (
    <Plane kind={pl.kind} rect={pl.rect} depth={pl.depth ?? 1} tilt={tilt} reading={reading} opacity={opacity} shadow={pl.shadow} radius={pl.radius} style={style}>
      {c.kind === "standIn" ? (
        <StandInView standIn={c.standIn} w={pl.rect.w} h={pl.rect.h} px={zoom} labelOpacity={labelOpacity("self")} copyOpacity={(i) => labelOpacity(`self@${i}`)} />
      ) : c.kind === "take" ? (
        <TakeViewContent use={c.use} view={c.view} w={pl.rect.w} h={pl.rect.h} px={zoom} offset={shot.from} planeEntrance={planeEntrance} labelOpacity={labelOpacity} />
      ) : (
        <ImageContent src={c.src} w={pl.rect.w} h={pl.rect.h} />
      )}
    </Plane>
  );
};

/** One shot of a piece: the ground world (in its own light), the foreground world, the rings and the aperture. */
export const ShotView: React.FC<{ plan: ScenePlan; shot: ShotSpec }> = ({ plan, shot }) => {
  const L = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const frame = L + shot.from; // the piece's local frame
  const s = shot.camera.sample(L);
  const cam = { pose: s.pose, ref: shot.ref, vel: s.vel };
  const poseAt = (f: number) => shot.camera.pose(f - shot.from);
  const focus = shot.focus ? shot.focus(frame) : 1;
  const ground = shot.ground === "page" ? COLOR.page : COLOR.riverbedMid;
  const st = shot.stone;
  // the riverbed sized from the shot's widest pose (or the rect a join shares), as the coverage check reads it (CR-02)
  const seamOut = plan.seams.find((x) => x.out === shot.id && x.frames > 0);
  const bed = shot.ground === "riverbed" ? groundRectOf(shot, width, height, seamOut ? seamOut.frames : 0) : null;
  // the light lives in the ground (CR-14): the grade's linear-light gains on the riverbed, a few per cent on the windows
  const gradeNow = gradeAt(frame, plan.lightInitial, plan.lightCues);
  const gains = gradeNow.ground;
  return (
    <AbsoluteFill style={{ backgroundColor: ground }}>
      <GroundLight gains={shot.ground === "riverbed" ? gains : [1, 1, 1]}>
        <World3D cam={cam} dofScale={shot.dofScale ?? 14} focus={focus} background={ground}>
          {bed ? (
            <RippleGround specs={shot.rings} pose={s.pose} poseAt={poseAt} offset={shot.from}>
              {/* the extent and depth the coverage check reads (setpieces/ground.ts, CR-02) */}
              <Plane kind="ground" depth={RIVERBED.depth}>
                <Riverbed center={{ x: bed.x + bed.w / 2, y: bed.y + bed.h / 2 }} width={bed.w} />
              </Plane>
            </RippleGround>
          ) : null}
          <RingLayer specs={shot.rings} pose={s.pose} layer="ground" offset={shot.from} poseAt={poseAt} />
        </World3D>
      </GroundLight>
      <GroundLight gains={gradeNow.ui}>
      <ForegroundMotionBlur windows={shot.blur ?? []}>
        <World3D cam={cam} dofScale={shot.dofScale ?? 14} focus={focus} background="transparent">
          {shot.planes.map((pl) => (
            <PlaneView key={pl.id} plan={plan} shot={shot} pl={pl} frame={frame} zoom={s.pose.zoom} />
          ))}
          {shot.wall ? <WallCells spec={shot.wall} frame={frame} /> : null}
          {shot.cascade
            ? (() => {
                const c = shot.cascade;
                const sched = cascadeSchedule(c.start, c.items, plan.fps, c.beats, undefined, c.endAt);
                const unit = Math.min(plan.frame.w, plan.frame.h) / 1080;
                return c.cards.map((card, i) => {
                  const w = sched[i];
                  if (!w) return null;
                  // the first card is on the stage from the cut (the shot is never empty); the rest swap in place,
                  // crossing the outgoing card at mid-blur with a matched slide (CR-17)
                  // the last card is UI in the world: it holds and leaves with the camera's E-leave (its item exits first)
                  const look = i === 0 && frame < w.inEnd ? { opacity: 1, blur: 0, shift: 0 } : swapLook(w, frame, i === sched.length - 1);
                  if (!look) return null;
                  const k = unit / s.pose.zoom; // world units per px at 1080
                  const dx = look.shift * SWAP_SLIDE.cardPx * k;
                  const fx = [look.blur > 0.05 ? `blur(${(look.blur * k).toFixed(2)}px)` : "", ""].filter(Boolean).join(" ");
                  return (
                    <Plane key={`card${i}`} kind={card.kind} rect={card.rect} opacity={look.opacity} shadow={card.shadow} radius={card.radius} reading={look.opacity > 0.99} style={{ filter: fx || undefined, transform: Math.abs(dx) > 0.01 ? `translateX(${dx.toFixed(2)}px)` : undefined }}>
                      {card.content.kind === "standIn" ? (
                        <StandInView
                          standIn={card.content.standIn}
                          w={card.rect.w}
                          h={card.rect.h}
                          px={s.pose.zoom}
                          labelOpacity={card.content.standIn.kind === "slot" ? labelOpacityOn(plan, shot, { id: card.id, key: "self", slot: card.content.standIn, box: card.rect, depth: 1, from: shot.from, to: shot.to, state: () => undefined, timecode: () => undefined }, frame) : 1}
                        />
                      ) : null}
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
      </GroundLight>
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
 * frames apart; lifts staggered as setpieces/frame.ts exitPlanOf says). Each line is unmounted once its exit is over;
 * a line set in the world (`carry`) moves with its shot's camera and is drawn until that shot ends (it leaves with the
 * world: the plans carry it out of frame first, setpieces/qa.ts typeExits).
 */
const TypeLines: React.FC<{ t: TypeSpec; plan: ScenePlan; inRow?: boolean }> = ({ t, plan, inRow = false }) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const pieceEnd = plan.duration;
  const tier = t.tier;
  const lines = t.text.split("\n");
  const size = typeSizePx(tier, width, height, t.sizeT ?? 0.5);
  const lh = size * (tier === "expressive" ? 1.25 : 1.3);
  const ent = t.entrance ?? defaultEntranceOf(tier);
  const exit = t.exit ?? "blur";
  const stagger = ent === "lineRise" ? f60(8, fps) : 0;
  const plan_ = exitPlanOf(ent, exit, t.text, fps);
  const carriedShot = t.carry ? plan.shots.find((x) => x.id === t.carry!.shot) : undefined;
  const end = t.exitAt === undefined || exit === "camera" ? Math.min(pieceEnd, carriedShot ? carriedShot.to : pieceEnd) : t.exitAt + plan_.total + 2;
  if (end <= 0) return null;
  const m = carryTransform(plan, t, frame);
  const body = (
    <>
      {lines.map((ln, i) => (
        <KineticLine
          key={i}
          text={ln}
          tier={tier}
          at={t.at + i * stagger}
          exitAt={t.exitAt === undefined || exit === "camera" ? undefined : t.exitAt + i * plan_.stagger}
          exitFrames={plan_.perLine || undefined}
          blockWords={wordsIn(t.text)}
          entrance={ent}
          exit={exit}
          sizeT={t.sizeT ?? 0.5}
          color={t.color ?? COLOR.ink}
          align={t.box.align}
          style={inRow ? { position: "relative" } : { left: t.box.left, top: t.box.top + i * lh, width: t.box.width }}
        />
      ))}
      {t.sweep ? <SageTextSweep spec={t} /> : null}
    </>
  );
  // a span of a row (TypeSpec.row): the row places it, and carries it with its world
  if (inRow) return <Sequence durationInFrames={Math.max(1, end)} layout="none" name={t.id}>{body}</Sequence>;
  return (
    <Sequence durationInFrames={Math.max(1, end)} layout="none" name={t.id}>
      {m ? (
        // its own compositor layer, moved at sub-pixel precision: laid out in the page, a line's glyphs snap to whole
        // pixels and a slow push makes each line jump a pixel now and then (measured on the 1:1 reel's end card: a
        // tile step of 3–8 levels), where the layer glides
        <AbsoluteFill style={{ transformOrigin: "0 0", transform: `matrix(${m.k.toFixed(6)}, 0, 0, ${m.k.toFixed(6)}, ${m.tx.toFixed(3)}, ${m.ty.toFixed(3)})`, willChange: "transform" }}>{body}</AbsoluteFill>
      ) : (
        body
      )}
    </Sequence>
  );
};

/**
 * One row of spans (TypeSpec.row, NF-04): a flex row across the frame, centred, its spans `gapEm` of their size apart in
 * `index` order, at the first span's top; set in the world like its spans (they share one carry), so the whole row
 * moves as one. The browser lays out the glyphs, so every gap is exact.
 */
const TypeRow: React.FC<{ specs: readonly TypeSpec[]; plan: ScenePlan }> = ({ specs, plan }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const first = specs[0]!;
  const size = typeSizePx(first.tier, width, height, first.sizeT ?? 0.5);
  const m = carryTransform(plan, first, frame);
  const row = (
    <div style={{ position: "absolute", left: 0, top: first.box.top, width, display: "flex", justifyContent: "center", alignItems: "flex-start", columnGap: (first.row?.gapEm ?? 1) * size }}>
      {[...specs].sort((a, b) => (a.row?.index ?? 0) - (b.row?.index ?? 0)).map((t) => (
        <div key={t.id} style={{ position: "relative" }}>
          <TypeLines t={t} plan={plan} inRow />
        </div>
      ))}
    </div>
  );
  return m ? <AbsoluteFill style={{ transformOrigin: "0 0", transform: `matrix(${m.k.toFixed(6)}, 0, 0, ${m.k.toFixed(6)}, ${m.tx.toFixed(3)}, ${m.ty.toFixed(3)})`, willChange: "transform" }}>{row}</AbsoluteFill> : row;
};

/** The type layer: every line of the plan, the rows of spans, the cascades' fixed lines and items, the title's sweep. */
export const TypeView: React.FC<{ plan: ScenePlan }> = ({ plan }) => (
  <FontGate>
    {plan.types.filter((t) => !t.row).map((t) => (
      <TypeLines key={t.id} t={t} plan={plan} />
    ))}
    {[...new Set(plan.types.filter((t) => t.row).map((t) => t.row!.id))].map((id) => (
      <TypeRow key={id} specs={plan.types.filter((t) => t.row?.id === id)} plan={plan} />
    ))}
    {plan.shots.map((s) =>
      s.cascade ? (
        <Fragment key={`c-${s.id}`}>
          <TypeLines t={s.cascade.fixed} plan={plan} />
          <Cascade
            items={s.cascade.items}
            start={s.cascade.start}
            beats={s.cascade.beats}
            holdLast={s.cascade.holdLast}
            endAt={s.cascade.endAt}
            itemStyle={{ left: s.cascade.itemBox.left, top: s.cascade.itemBox.top, width: s.cascade.itemBox.width, textAlign: s.cascade.itemBox.align }}
          />
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
