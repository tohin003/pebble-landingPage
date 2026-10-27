// The joins between set pieces (CR-06; TREATMENT §5.1 kind 2, "the default seam inside every ring and between blocks";
// §5.3 "arrive, glide, leave"). Every piece has an entry and an exit pose and velocity: a piece either CONTINUES the
// previous one's camera in the same world (the Drop into a ring, the wall into the convergence: one shot across the
// join, no cut), or a MOMENTUM CUT takes it in from another world at the outgoing screen velocity (E-leave out,
// matched speed in, gliding on). Before the review only two of the reel's five joins were designed: three were hard
// cuts from a near-still frame into a blank or unrelated one.
//
//   cutVelocity()   the screen velocity a piece's last frame leaves with (px a frame, at the frame's centre)
//   shareGround()   two shots that join without a cut share one riverbed rect (setpieces/ground.ts), so it never jumps
//   checkJoins()    the join check the review asked for: a continued join is continuous (pose and velocity); a cut is
//                   velocity-matched (speeds within ±25 %, directions within 30°) and never between two rests; and the
//                   incoming piece's first readable frame comes at most 6 frames after the join
// Pure.
import { TRANSITION } from "../tokens";
import { screenVelocity, worldToFrame, type CamSample } from "../motion/camera";
import { angleBetweenDeg, len, type Vec } from "../motion/geometry";
import type { Finding } from "../qa/checks";
import { groundNeed, riverbedCovering, unionOf } from "./ground";
import { firstReadableFrom } from "./qa";
import type { ScenePlan, ShotSpec } from "./scene";

/** The centre's screen velocity under a camera sample (px a frame). */
const centreVelocity = (p: ScenePlan, s: CamSample): Vec => screenVelocity(s, { x: p.frame.w / 2, y: p.frame.h / 2 }, p.frame.w, p.frame.h);

/** The screen velocity a piece leaves with: its last shot's camera on its last frame (px a frame, the centre). */
export const cutVelocity = (p: ScenePlan): Vec => {
  const s = p.shots[p.shots.length - 1]!;
  return centreVelocity(p, s.camera.sample(p.duration - 1 - s.from));
};

/** The fastest of the frame's corners (and its centre) under a camera sample (px a frame). */
const fastestPoint = (p: ScenePlan, s: CamSample): number => {
  const { w, h } = p.frame;
  return Math.max(...[{ x: w / 2, y: h / 2 }, { x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }].map((q) => len(screenVelocity(s, q, w, h))));
};

/** Two shots that join without a cut share one riverbed: the rect covering both shots' every frame. */
export function shareGround(a: ScenePlan, b: ScenePlan): void {
  const sa = a.shots[a.shots.length - 1]!;
  const sb = b.shots[0]!;
  if (sa.ground !== "riverbed" || sb.ground !== "riverbed") return;
  const { w, h } = a.frame;
  const seamB = b.seams.find((x) => x.out === sb.id && x.frames > 0);
  const need = unionOf(groundNeed(sa.camera, sa.ref, sa.to - sa.from, w, h), groundNeed(sb.camera, sb.ref, sb.to - sb.from + (seamB ? seamB.frames : 0), w, h));
  const r = riverbedCovering(need);
  (sa as ShotSpec).groundRect = r;
  (sb as ShotSpec).groundRect = r;
}

export type JoinKind = "continue" | "cut";

/**
 * The first frame of a piece that shows something to read (setpieces/qa.ts readableOn: a line landed, the stone, a read
 * plane, a capture filling an eighth of the frame, or a slot with its label whole in frame). Blank ground, a slot with
 * its label out of frame and a palette still fading in are not (CR-06: Dusk opened on 12 blank frames of bare ground,
 * the climax on 16 frames of its slot before its take began; NF-07: the cut into Kiln on 62 frames of unlabelled slot).
 */
export function firstReadableFrame(p: ScenePlan, within = 60): number | null {
  return firstReadableFrom(p, 0, within);
}

/**
 * The join check (CR-06). `kinds[i]` says how piece i + 1 starts: "continue" (the same world: its first shot's pose
 * and velocity equal the previous piece's exit within a pixel and a hair of zoom) or "cut" (a momentum cut: the
 * centre's screen velocity on both sides of the join within ±25 % in speed and 30° in direction, and never two rests:
 * below 2 px a frame at every probe on both sides). Every incoming piece reads within 6 frames of its join.
 */
export function checkJoins(plans: readonly ScenePlan[], kinds: readonly JoinKind[]): Finding[] {
  const out: Finding[] = [];
  const tolSpeed = TRANSITION.momentum.speedTolerance;
  const tolDeg = TRANSITION.momentum.directionToleranceDeg;
  for (let i = 1; i < plans.length; i++) {
    const a = plans[i - 1]!;
    const b = plans[i]!;
    const kind = kinds[i - 1] ?? "cut";
    const sa = a.shots[a.shots.length - 1]!;
    const sb = b.shots[0]!;
    const last = sa.camera.sample(a.duration - 1 - sa.from);
    const exitS = sa.camera.sample(a.duration - sa.from);
    const first = sb.camera.sample(0);
    const name = `${a.id} → ${b.id}`;
    if (kind === "continue") {
      const unit = a.frame.unit;
      const dx = (Math.hypot(first.pose.x - exitS.pose.x, first.pose.y - exitS.pose.y) * first.pose.zoom) / unit;
      const dz = Math.abs(Math.log(first.pose.zoom / exitS.pose.zoom));
      const dv = len({ x: (first.vel.x - exitS.vel.x) * first.pose.zoom, y: (first.vel.y - exitS.vel.y) * first.pose.zoom }) / unit + (Math.abs(first.vel.lz - exitS.vel.lz) * Math.hypot(a.frame.w, a.frame.h)) / 2 / unit;
      if (dx > 1 || dz > 0.002 || dv > 0.5) out.push({ check: "joins", level: "error", message: `${name}: a continued world jumps at the join (${dx.toFixed(1)} px, zoom ×${Math.exp(dz).toFixed(4)}, velocity ${dv.toFixed(2)} px a frame at 1080)`, frame: 0 });
      if (sa.ref.x !== sb.ref.x || sa.ref.y !== sb.ref.y || sa.ref.zoom !== sb.ref.zoom) out.push({ check: "joins", level: "error", message: `${name}: a continued world changes its parallax ref at the join (its depth planes would jump)`, frame: 0 });
    } else {
      const vOut = centreVelocity(a, last);
      const vIn = centreVelocity(b, first);
      const rest = TRANSITION.momentum.restPxPerFrame * a.frame.unit;
      if (fastestPoint(a, last) < rest && fastestPoint(b, first) < rest) out.push({ check: "joins", level: "error", message: `${name}: a cut between two rests (both sides under ${TRANSITION.momentum.restPxPerFrame} px a frame)`, frame: 0 });
      else {
        const so = len(vOut);
        const si = len(vIn);
        const ratio = si / Math.max(1e-6, so);
        const ang = angleBetweenDeg(vOut, vIn);
        if (Math.abs(ratio - 1) > tolSpeed || ang > tolDeg)
          out.push({ check: "joins", level: "error", message: `${name}: the cut's speeds are ${so.toFixed(1)} → ${si.toFixed(1)} px a frame (×${ratio.toFixed(2)}) at ${ang.toFixed(0)}°: a momentum cut matches within ±${tolSpeed * 100} % and ${tolDeg}°`, frame: 0 });
      }
    }
    const r = firstReadableFrame(b);
    if (r === null || r > Math.round((6 * b.fps) / 60)) out.push({ check: "joins", level: "error", message: `${name}: ${b.id} shows nothing to read until frame ${r ?? "≥ 60"} after the join (at most 6: CR-06)`, frame: 0 });
  }
  return out;
}

/** Where a world point is on a piece's first frame (for tests of the hand-offs). */
export const onFirstFrame = (p: ScenePlan, pt: { x: number; y: number }) => worldToFrame(pt, p.shots[0]!.camera.pose(0), p.frame.w, p.frame.h);
