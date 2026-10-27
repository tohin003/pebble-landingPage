// <ReturnFieldView>: the Return's field (setpieces/returnField.ts; MONTAGE_DESIGN revision 2 §2.6–§2.11; OVERRIDES §61)
// on its shot, drawn from the very model the checks read (setpieces/returnChecks.ts), so the picture and the validators
// never disagree. ShotView (views/PieceView.tsx) draws the shot's riverbed and calls this between its ground and its
// foreground; it draws, back to front:
//   the hairlines  each ring's orbit, 1.75 px at 1080 in sage #506E54 along its ellipse at its parallax depth, drawn on
//                  over the release and returning into the stone once its last cell has started home (hairlineAt), in
//                  the ground's light (they lie on the ground, as every ring does)
//   the cells      one image each (setpieces/returnThumbs.ts), placed in the frame's own px by cellScreenAt (the plan's
//                  camera at each cell's parallax depth), in their draw order: the inner ring, then the first cell, then
//                  the middle and outer rings; a corner radius of 2 % and the window shadow, both scaled with the cell;
//                  each cell's blur is ONE SVG feGaussianBlur on its own small box (the swap's, round, or the motion's
//                  along its own travel, σ = travel ÷ 7 above 4.6 px a frame): never CameraMotionBlur around the field
//                  (OVERRIDES §52), and never a full-frame layer per cell (46 of them would hold 46 frame-sized surfaces)
//                  The cells take the UI's share of the light (the grade's `ui` gains); the first cell does not: it is
//                  S24's own last frame, drawn live by S24's own view with S24's light, so the pull-back starts on
//                  exactly what S24 showed (MONTAGE_DESIGN §2.12, joinPose). Its corners round in over the lead-in
//                  only (at R−60 it is the frame itself). A3 is Pebble's own engine in its testing pose, drawn live
//   the stone      Pebble's own engine at the rings' centre, ABOVE every cell: its opaque, breathing silhouette is the
//                  mask the cells pass behind (the default merge: nothing fades). Its clock runs (local + clockOffset)
//                  ÷ fps, so the engine's own idle blink falls on R646 (setpieces/blink.ts); through the finale's iris
//                  the one stone is drawn above both shots (PieceView's film-layer stone, CR-01)
//   the toned matte  only with plan merge "toned" (R4's alternative for G1, lead ruling R4): each returning cell's part
//                  inside the body's outline is drawn again above the body and under the eyes, toned toward the stone's
//                  sage (#536B54) over 7 frames from its first contact, and its continued inward travel clears it (its
//                  size shrinks on toward the centre); the eyes are drawn last
// Every cell is a PLACEHOLDER until the 2.0.0 crops replace the stand-ins through the manifest (setpieces/returnCells.ts):
// a published capture of the same feature, or a labelled slot. Nothing here draws Pebble's interface.
import { useMemo } from "react";
import { AbsoluteFill, Freeze, Img, getStaticFiles, staticFile, useCurrentFrame } from "remotion";
import { COLOR } from "../../tokens";
import { smoothstep } from "../../motion/ease";
import { planePose, type CamSample } from "../../motion/camera";
import { World3D, Plane } from "../../camera/World3D";
import { GroundLight } from "../../light/Grade";
import type { Grade } from "../../light/grades";
import { PebbleOnFilm } from "../../../pebble/PebbleOnFilm";
import { BODY, VIEWBOX_SIZE, pebbleAt, type PebbleCue } from "../../../../../shared/pebble";
import { PEBBLE_LIGHT } from "../../../pebble/PebbleSvg";
import { cellsOnScreen, hairlineAt, rOfLocal, tonedMatteK, type CellScreen, type ReturnField } from "../returnField";
import { returnThumbPath } from "../returnThumbs";
import type { ReturnExtra } from "../returnPlan";
import type { ScenePlan, ShotSpec, StoneSpec } from "../scene";

/** The film pebble's foot sits this far below the stone's centre at 148 px (as views/PieceView.tsx places it). */
const CENTRE_TO_FOOT_148 = 38.2;
/** A cell's corner radius, a share of its width (MONTAGE_DESIGN §2.6). */
const CELL_RADIUS = 0.02;
/** The stone's sage, which the toned matte tones toward. */
const TONE = [0x53, 0x6b, 0x54] as const;

const hasStatic = (() => {
  let names: Set<string> | null = null;
  return (path: string): boolean => {
    if (!names) {
      try {
        names = new Set(getStaticFiles().map((f) => f.name));
      } catch {
        names = new Set();
      }
    }
    return names.has(path);
  };
})();

/** The window shadow (tokens.ts SHADOW_WINDOW) at a world-to-frame scale `k`, as a plane carries it. */
const shadowAt = (k: number, a = 1): string =>
  `0 ${(1 * k).toFixed(2)}px ${(2 * k).toFixed(2)}px rgba(${COLOR.shadeRgb}, ${(0.08 * a).toFixed(3)}), 0 ${(14 * k).toFixed(2)}px ${(36 * k).toFixed(2)}px ${(-10 * k).toFixed(2)}px rgba(${COLOR.shadeRgb}, ${(0.22 * a).toFixed(3)})`;

const filterIdOf = (c: CellScreen, tag: string) => `rf-${tag}-${c.cell.id.replace(/[^A-Za-z0-9]/g, "_")}`;

/** The per-cell blur filters (only for cells that move fast enough or are mid-swap). */
const BlurDefs: React.FC<{ cells: readonly CellScreen[]; tag: string }> = ({ cells, tag }) => {
  const blurred = cells.filter((c) => c.blur.sx > 0.05 || c.blur.sy > 0.05);
  if (!blurred.length) return null;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        {blurred.map((c) => (
          <filter key={c.cell.id} id={filterIdOf(c, tag)} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${c.blur.sx.toFixed(2)} ${c.blur.sy.toFixed(2)}`} />
          </filter>
        ))}
      </defs>
    </svg>
  );
};

/** What a cell shows: its image (or, for the two cells Pebble's code draws, that code). */
const CellContent: React.FC<{ c: CellScreen; plan: ScenePlan; renderS24: S24Renderer; extra: ReturnExtra; frame: number }> = ({ c, plan, renderS24, extra, frame }) => {
  // the shot's own first frame (useCurrentFrame() is the shot's local frame inside its sequence)
  const shotFrom = frame - useCurrentFrame();
  const spec = c.cell.spec;
  const si = spec.standIn;
  if (si.kind === "frame") {
    // S24's own last frame, drawn by S24's own view at the frame's size and scaled into the cell
    const src = extra.join?.source;
    const shot = src?.shots.find((s) => s.id === si.shot);
    if (!src || !shot) return <div style={{ position: "absolute", inset: 0, backgroundColor: COLOR.fill }} />;
    const k = c.rect.w / plan.frame.w;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: plan.frame.w, height: plan.frame.h, transformOrigin: "0 0", transform: `scale(${k.toFixed(6)})` }}>
        <Freeze frame={src.duration - 1 - shot.from}>{renderS24(src, shot)}</Freeze>
      </div>
    );
  }
  if (si.kind === "engine") {
    // Pebble's own engine in one of its poses, on the page's ground (V: it renders now), on the piece's clock at 1×
    const size = c.rect.h * 0.78;
    const cues: PebbleCue[] = [{ at: 0, pose: si.pose, note: `${spec.id}: Pebble's own ${si.pose} pose, drawn by its engine` }];
    return (
      <div style={{ position: "absolute", inset: 0, backgroundColor: COLOR.page }}>
        <PebbleOnFilm cues={cues} initialPose={si.pose} size={size} x={c.rect.w / 2} y={c.rect.h / 2 + CENTRE_TO_FOOT_148 * (size / 148)} offsetFrames={shotFrom} shadow={false} />
      </div>
    );
  }
  const path = returnThumbPath(spec);
  if (!path || !hasStatic(path)) return <div style={{ position: "absolute", inset: 0, backgroundColor: COLOR.fill }} />;
  return <Img src={staticFile(path)} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", maxWidth: "none", display: "block" }} />;
};

export type S24Renderer = (plan: ScenePlan, shot: ShotSpec) => React.ReactNode;

/** One cell's box in the frame's px: its rect, radius, shadow and blur, around its content. */
const CellBox: React.FC<{ c: CellScreen; tag: string; plan: ScenePlan; renderS24: S24Renderer; extra: ReturnExtra; frame: number; tone?: number }> = ({ c, tag, plan, renderS24, extra, frame, tone }) => {
  const { rect } = c;
  const r = rOfLocal(frame, plan.fps);
  const hero = !!c.cell.spec.hero;
  // the first cell is the frame itself at R−60: its corners and its shadow come in over the lead-in
  const inK = hero ? smoothstep(-60, 0, r) : 1;
  const k = rect.w / c.cell.w0;
  const blurred = c.blur.sx > 0.05 || c.blur.sy > 0.05;
  const filters = [blurred ? `url(#${filterIdOf(c, tag)})` : "", tone !== undefined && tone > 0.002 ? `url(#rt-${Math.round(tone * 16)})` : ""].filter(Boolean).join(" ");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: rect.w,
        height: rect.h,
        transform: `translate(${rect.x.toFixed(3)}px, ${rect.y.toFixed(3)}px)`,
        borderRadius: CELL_RADIUS * rect.w * inK,
        overflow: "hidden",
        boxShadow: tone === undefined ? shadowAt(k, inK) : undefined,
        backgroundColor: COLOR.page,
        filter: filters || undefined,
        willChange: "transform",
      }}
    >
      <CellContent c={c} plan={plan} renderS24={renderS24} extra={extra} frame={frame} />
    </div>
  );
};

/** The stone's engine frame and its mapping into the frame's px (for the toned matte's clip and its eyes). */
interface StoneMap {
  bodyPath: string;
  eyes: readonly { d: string; matrix?: string; alpha: number }[];
  /** the SVG transform from the stone's viewBox to the frame's px */
  transform: string;
}

const stoneMap = (st: StoneSpec, sample: CamSample, w: number, h: number, fps: number, local: number, off: number): StoneMap => {
  const cues = st.cues.map((c) => ({ ...c, at: c.at + off / fps }));
  const t = (local + off) / fps;
  const view = pebbleAt(cues, t, "idle");
  const z = sample.pose.zoom;
  // as PebbleOnFilm places the viewBox: the foot at (x, y), the body's bottom BODY.bottom units below the box's centre
  const u = st.size / VIEWBOX_SIZE;
  const footY = st.at.y + CENTRE_TO_FOOT_148 * (st.size / 148);
  const cx = st.at.x;
  const cy = footY - BODY.bottom * u;
  const sx = w / 2 + (cx - sample.pose.x) * z;
  const sy = h / 2 + (cy - sample.pose.y) * z;
  return { bodyPath: view.frame.bodyPath, eyes: view.frame.eyes.map((e) => ({ d: e.d, matrix: e.matrix, alpha: e.alpha })), transform: `translate(${sx.toFixed(3)} ${sy.toFixed(3)}) scale(${(u * z).toFixed(6)}) ${view.motion.transform ?? ""}` };
};

/** The toned matte's tone filters: a multiply toward the stone's sage, in 16 steps. */
const ToneDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {Array.from({ length: 17 }, (_, i) => {
        const k = i / 16;
        const [r, g, b] = TONE.map((v) => 1 - k * (1 - v / 255));
        return (
          <filter key={i} id={`rt-${i}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`${r!.toFixed(5)} 0 0 0 0  0 ${g!.toFixed(5)} 0 0 0  0 0 ${b!.toFixed(5)} 0 0  0 0 0 1 0`} />
          </filter>
        );
      })}
    </defs>
  </svg>
);

export interface ReturnFieldViewProps {
  plan: ScenePlan;
  shot: ShotSpec;
  /** the piece's local frame */
  frame: number;
  /** the shot's camera on this frame */
  sample: CamSample;
  grade: Grade;
  /** the finale's iris draws the one stone above both shots (PieceView): the field's own stone steps aside then */
  hideStone: boolean;
  /** S24's own view of one shot (PieceView's ShotView), for the first cell */
  renderS24: S24Renderer;
}

export const ReturnFieldView: React.FC<ReturnFieldViewProps> = ({ plan, shot, frame, sample, grade, hideStone, renderS24 }) => {
  const field = shot.returnField!;
  const extra = (plan.extra?.return ?? null) as ReturnExtra | null;
  if (!extra || !field.view) throw new Error(`${plan.id}: a Return field without its plan (planReturn sets field.view and extra.return)`);
  const { w, h, unit } = field.view;
  const st = shot.stone;
  const off = st?.clockOffset ?? 0;
  const cues = useMemo(() => (st ? st.cues.map((c) => ({ ...c, at: c.at + off / plan.fps })) : []), [st, off, plan.fps]);
  const cells = cellsOnScreen(field, frame);
  const inner = cells.filter((c) => c.cell.ring === 0 && !c.cell.spec.hero);
  const hero = cells.filter((c) => c.cell.spec.hero);
  const outer = cells.filter((c) => c.cell.ring !== 0);
  const r = rOfLocal(frame, plan.fps);
  const toned = extra.merge === "toned";
  const matte = toned && st ? cells.filter((c) => c.state === "return" && tonedMatteK(field, c.cell, r) > 0) : [];
  const sm = toned && st && matte.length ? stoneMap(st, sample, w, h, plan.fps, frame, off) : null;
  const hairlines = [0, 1, 2].map((ring) => hairlineAt(ring, frame, field)).filter((x) => x !== null);
  const cam = { pose: sample.pose, ref: shot.ref, vel: sample.vel };
  const common = { plan, renderS24, extra, frame };
  return (
    <AbsoluteFill>
      {/* the hairlines, on the ground, in the ground's light */}
      {hairlines.length ? (
        <GroundLight gains={grade.ground}>
          <svg width={w} height={h} style={{ position: "absolute", inset: 0 }} aria-hidden>
            {hairlines.map((hl) => {
              const pp = planePose(sample.pose, shot.ref, hl.depth);
              const cx = w / 2 + (0 - pp.x) * pp.zoom;
              const cy = h / 2 + (0 - pp.y) * pp.zoom;
              const a = hl.a * pp.zoom;
              const b = hl.b * pp.zoom;
              // from 12 o'clock, the way its ring orbits (the middle ring counter-rotates)
              const sweep = hl.ring === 1 ? 0 : 1;
              const d = `M ${cx.toFixed(2)} ${(cy - b).toFixed(2)} A ${a.toFixed(2)} ${b.toFixed(2)} 0 1 ${sweep} ${cx.toFixed(2)} ${(cy + b).toFixed(2)} A ${a.toFixed(2)} ${b.toFixed(2)} 0 1 ${sweep} ${cx.toFixed(2)} ${(cy - b).toFixed(2)}`;
              return <path key={hl.ring} d={d} pathLength={1} fill="none" stroke={COLOR.accent} strokeWidth={hl.widthPx * unit} strokeDasharray={hl.drawn >= 0.999 ? undefined : `${hl.drawn.toFixed(4)} ${(1 - hl.drawn + 0.001).toFixed(4)}`} opacity={hl.opacity} />;
            })}
          </svg>
        </GroundLight>
      ) : null}
      {/* the inner ring's recalls, under the first cell */}
      <GroundLight gains={grade.ui}>
        <BlurDefs cells={inner} tag="i" />
        {inner.map((c) => (
          <CellBox key={c.cell.id} c={c} tag="i" {...common} />
        ))}
      </GroundLight>
      {/* the first cell: S24's own last frame, in S24's own light */}
      <AbsoluteFill>
        <BlurDefs cells={hero} tag="h" />
        {hero.map((c) => (
          <CellBox key={c.cell.id} c={c} tag="h" {...common} />
        ))}
      </AbsoluteFill>
      {/* the middle and outer rings, nearer */}
      <GroundLight gains={grade.ui}>
        <BlurDefs cells={outer} tag="o" />
        {outer.map((c) => (
          <CellBox key={c.cell.id} c={c} tag="o" {...common} />
        ))}
      </GroundLight>
      {/* the stone, above every cell: its silhouette takes them (the default merge) */}
      {st && !hideStone ? (
        <GroundLight gains={grade.ui}>
          <World3D cam={cam} dofScale={shot.dofScale ?? 14} focus={1} background="transparent">
            <Plane kind="film">
              <PebbleOnFilm cues={cues} size={st.size} x={st.at.x} y={st.at.y + CENTRE_TO_FOOT_148 * (st.size / 148)} offsetFrames={shot.from + off} />
            </Plane>
          </World3D>
        </GroundLight>
      ) : null}
      {/* R4's toned matte (G1's alternative): the cells' parts inside the outline, toned, above the body, under the eyes */}
      {sm && !hideStone ? (
        <GroundLight gains={grade.ui}>
          <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
            <defs>
              <clipPath id="return-body" clipPathUnits="userSpaceOnUse">
                <path d={sm.bodyPath} transform={sm.transform} />
              </clipPath>
            </defs>
          </svg>
          <ToneDefs />
          <BlurDefs cells={matte} tag="t" />
          <AbsoluteFill style={{ clipPath: "url(#return-body)" }}>
            {matte.map((c) => (
              <CellBox key={c.cell.id} c={c} tag="t" tone={tonedMatteK(field, c.cell, r)} {...common} />
            ))}
          </AbsoluteFill>
          <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden>
            <g transform={sm.transform}>
              {sm.eyes.map((e, i) => (
                <path key={i} d={e.d} transform={e.matrix} opacity={e.alpha} fill={PEBBLE_LIGHT.eye} />
              ))}
            </g>
          </svg>
        </GroundLight>
      ) : null}
    </AbsoluteFill>
  );
};

/** For a sheet's labels: the cells drawn on a frame (id, ring, rect in frame px), back to front. */
export const cellsDrawnOn = (field: ReturnField, frame: number) => cellsOnScreen(field, frame).map((c) => ({ id: c.cell.id, ring: c.cell.ring, rect: c.rect, z: c.z }));

