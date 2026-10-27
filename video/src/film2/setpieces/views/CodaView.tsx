// <CodaView>: draws the post-credit scene from its plan (setpieces/coda.ts), so the picture is exactly what the checks
// read (setpieces/codaChecks.ts). Put it in a <Sequence from={start}> right after the end card: every frame here is the
// coda's local frame, and its frame 0 is the end card's true ending.
//
// Layers, back to front:
//   L0 to the iris-out's end: the end card itself, played on past its end by its own PieceView
//     (extra.coda.endCard.extended): its page and camera as it left them, its stone on its engine clock, page 2's lines
//     leaving with their own exits. Nothing is redrawn, so the join is the end card's own next frame;
//   from the iris-in: the coda's shot under its light (coda.ts CODA_GRADE): the riverbed at night (the site's own dark
//     wallpaper, defocused, at the ground's parallax depth, over exactly the extent the coverage check reads) and the
//     sleeping stone (Pebble's own engine, the Companion's `sleepy` pose, the page's dark palette, on its own clock),
//     moving with the push;
//   the night cover (outside the grade, so it is exactly the dark --bg): night green outside the closing iris, over the
//     whole breath, and outside the opening iris, each iris with the sage hairline on its edge (codaIrisOut and
//     codaIrisIn: the circles the checks read);
//   the coda's own lines (one FontGate, outside the grade, set in the coda's world: TypeSpec.carry);
//   the placeholder slate (the demo reels only).
import { useMemo } from "react";
import { AbsoluteFill, Img, Sequence, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, RING } from "../../tokens";
import { smoothstep } from "../../motion/ease";
import type { Rect } from "../../motion/geometry";
import { World3D, Plane } from "../../camera/World3D";
import { GradeLayer, GroundLight } from "../../light/Grade";
import { gradeAt } from "../../light/grades";
import { PebbleOnFilm } from "../../../pebble/PebbleOnFilm";
import { PEBBLE_DARK } from "../../../pebble/PebbleSvg";
import { RIVERBED, groundRectOf } from "../ground";
import { CENTRE_TO_FOOT_148, codaIrisIn, codaIrisOut, codaOf } from "../coda";
import type { ScenePlan, ShotSpec } from "../scene";
import { PieceView, TypeView } from "./PieceView";
import { SetPiecesSlate } from "./StandInViews";

/** Whether a file is in video/public (the night plate is derived and gitignored: until it is made, its mid tone shows). */
const hasStatic = (path: string): boolean => {
  try {
    return getStaticFiles().some((f) => f.name === path);
  } catch {
    return false;
  }
};

/** The riverbed at night over a world rect of its plane: the plate, or its mid tone until the plate is rendered. */
const NightRiverbed: React.FC<{ rect: Rect; src: string; fallback: string }> = ({ rect, src, fallback }) => (
  <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundColor: fallback }}>
    {hasStatic(src) ? <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: rect.w, height: rect.h, maxWidth: "none" }} /> : null}
  </div>
);

/** The coda's shot: the night riverbed and the sleeping stone, under the coda's light. Inside <Sequence from={shot.from}>. */
const CodaShot: React.FC<{ plan: ScenePlan; shot: ShotSpec }> = ({ plan, shot }) => {
  const L = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const x = codaOf(plan)!;
  const frame = L + shot.from; // the coda's local frame
  const s = shot.camera.sample(L);
  const cam = { pose: s.pose, ref: shot.ref, vel: s.vel };
  const bed = groundRectOf(shot, width, height, 0);
  const st = shot.stone!;
  // the engine's clock: (the coda's local frame + clockOffset) ÷ fps, the cues shifted with it (StoneSpec.clockOffset)
  const off = st.clockOffset ?? 0;
  const cues = useMemo(() => st.cues.map((c) => ({ ...c, at: c.at + off / plan.fps })), [st.cues, off, plan.fps]);
  const grade = gradeAt(frame, plan.lightInitial, plan.lightCues);
  const dof = shot.dofScale ?? 8;
  // the ground's light with the plate's own exposure in it (coda.ts CODA_PLATE.exposure: linear gains multiply)
  const e = x.ground.exposure;
  const groundGains = useMemo(() => [grade.ground[0] * e, grade.ground[1] * e, grade.ground[2] * e] as const, [grade.ground, e]);
  return (
    <GradeLayer grade={grade}>
      <AbsoluteFill style={{ backgroundColor: x.ground.fallback }}>
        <GroundLight gains={groundGains}>
          <World3D cam={cam} dofScale={dof} focus={1} background={x.ground.fallback}>
            {/* the extent and depth the coverage check reads (setpieces/ground.ts, CR-02) */}
            <Plane kind="ground" depth={RIVERBED.depth}>
              <NightRiverbed rect={bed} src={x.ground.src} fallback={x.ground.fallback} />
            </Plane>
          </World3D>
        </GroundLight>
        <GroundLight gains={grade.ui}>
          <World3D cam={cam} dofScale={dof} focus={1} background="transparent">
            <Plane kind="film">
              <PebbleOnFilm cues={cues} size={st.size} x={st.at.x} y={st.at.y + CENTRE_TO_FOOT_148 * (st.size / 148)} offsetFrames={shot.from + off} initialPose={x.stone.initialPose} colors={x.stone.palette === "dark" ? PEBBLE_DARK : undefined} />
            </Plane>
          </World3D>
        </GroundLight>
      </AbsoluteFill>
    </GradeLayer>
  );
};

/** The night cover: outside the closing iris, the whole breath, outside the opening iris (null elsewhere). */
const NightCover: React.FC<{ plan: ScenePlan }> = ({ plan }) => {
  const fr = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const x = codaOf(plan)!;
  const unit = Math.min(width, height) / 1080;
  const out = codaIrisOut(plan, fr);
  const inn = codaIrisIn(plan, fr);
  const hole = out ?? inn;
  const shut = fr >= x.irisOut.at + x.irisOut.frames && fr < x.irisIn.at;
  if (!hole) return shut ? <AbsoluteFill style={{ backgroundColor: COLOR.nightPage }} /> : null;
  const iris = out ? x.irisOut : x.irisIn;
  // clear inside max(0, R − feather), night green from R: ringIris()'s feathered edge, its feather narrowed while the
  // hole is small (coda.ts codaFeather), so the face shows and no halo rings it
  const inner = Math.max(0, hole.R - hole.feather);
  const mask = `radial-gradient(circle at ${hole.c.x.toFixed(1)}px ${hole.c.y.toFixed(1)}px, transparent ${inner.toFixed(1)}px, #000 ${Math.max(hole.R, inner + 0.01).toFixed(2)}px)`;
  const lineOpacity = smoothstep(0, 0.08, hole.u) * (1 - smoothstep(0.85, 1, hole.u));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: COLOR.nightPage, WebkitMaskImage: mask, maskImage: mask }} />
      {lineOpacity > 0.002 ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <circle cx={hole.c.x} cy={hole.c.y} r={Math.max(0.5, hole.edge)} fill="none" stroke={iris.hairline} strokeWidth={RING.hairlinePx * unit} opacity={lineOpacity} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/** The post-credit scene. */
export const CodaView: React.FC<{ plan: ScenePlan; slate?: boolean }> = ({ plan, slate = true }) => {
  const x = codaOf(plan);
  // the coda's own lines (the end card's carried lines are drawn by the end card itself, with their exits)
  const own = useMemo(() => ({ ...plan, types: plan.types.filter((t) => !(x?.carried ?? []).includes(t.id)) }), [plan, x]);
  if (!x) throw new Error(`CodaView draws the coda only, not ${plan.id}`);
  const shut = x.irisOut.at + x.irisOut.frames;
  const coda = plan.shots.find((s) => s.id === "coda")!;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.nightPage }}>
      <Sequence from={-x.endCard.end} durationInFrames={x.endCard.end + shut} layout="none" name="the end card, carried on">
        <PieceView plan={x.endCard.extended} slate={false} />
      </Sequence>
      <Sequence from={coda.from} durationInFrames={coda.to - coda.from} name="the riverbed at night">
        <CodaShot plan={plan} shot={coda} />
      </Sequence>
      <NightCover plan={plan} />
      <TypeView plan={own} />
      {slate ? <SetPiecesSlate piece={plan.name} /> : null}
    </AbsoluteFill>
  );
};
