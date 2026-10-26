// The set pieces' checks: a plan becomes the foundation's FilmTimelineQa (so every smoothness check in qa/checks.ts runs
// on it unchanged), plus the checks only set pieces need:
//   bandContrast     the Drop's aperture bands against the picture's edge, at least 3:1 (lead ruling §52)
//   takes            every take at 1×: in-point, length, and every shown span equal to its real span (§3.6)
//   typeSafe         every film line inside the frame, 60 px (at 1080) from every edge (§3.12)
//   typeOverUi       film type never over UI the viewer reads (§5.2 "never over the UI's own text")
//   uiReadSize       UI text a viewer must read is at least 28 px at 1080 while it is read (§5.3)
//   music            every placed event sits on a point of its level, and nothing waited a negative time
//   cues             the stone's cue lists pass the engine's own checkCues (D6)
// Added after the craft review (CR-15; OVERRIDES §55), each proved on a planted canary in tests/setpieces.test.ts:
//   groundCoverage   the frame's four corners stay inside the riverbed on every frame (CR-02)
//   stoneCount       one stone wherever the stone shows: never two at once, through an iris or a cross (CR-01)
//   planesInFrame    every plane drawn with text of 20 px or more (at 1080) is wholly in frame (CR-05)
//   legibleWords     every legible word (text at 20 px or more) counts toward the reading load; a read is never
//                    declared with 0 words (CR-05, CR-09)
//   hitSync          the aperture's opening and the burst start within 2 frames of the hit, in every aspect; no light
//                    leak over the bands (CR-07)
//   smallPrintHolds  each end-card page held for its reading time; any line with the honest text held 9 s (CR-10)
//   askActClock      a still and a take view of the same window never share a frame (CR-11)
//   typeExits        no line vanishes: a "camera" exit or a line held to a piece's end has no drawn exit (CR-03)
// (cameraFloor and irisEase, CR-04 and CR-21, are foundation checks in qa/checks.ts and run through checkAll.)
// Pure; no React. setpieces/tests run checkPlan() on every piece, every aspect and many music grids.
import { CAMERA, COLOR } from "../tokens";
import { checkAll, type Finding, type QaMove, type Report } from "../qa/checks";
import type { FilmTimelineQa, QaReadable, QaShot } from "../qa/timeline";
import { GRADES, gradeColor, gradeLuminance, hexToRgb, relLuminance, type Grade } from "../light/grades";
import { radiusToCorners, rectsIntersect, type Point, type Rect } from "../motion/geometry";
import { planePose, worldToFrame } from "../motion/camera";
import { E_MOVE, clamp01, smoothstep } from "../motion/ease";
import { readingLoad, requiredHoldS, wordCount, type TextEvent } from "../type/reading";
import { cascadeSchedule } from "../type/Cascade";
import { IRIS_DEFAULT_EASE, IRIS_DRAWN, irisRadius } from "../transitions/kinds";
import { checkCues } from "../../../../shared/pebble/cues";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { defaultEntranceOf, enterFramesOf, exitFramesOf, insideFrame, lineRect, rectInFrame } from "./frame";
import { typeEvent } from "./kit";
import { onGrid, pointsOf, type MusicGrid } from "./music";
import { STEALTH_FEATURES, shownSize, type StandIn, type StillStandIn } from "./standins";
import { cellAt, cellTextPx } from "./wall";
import { COMPANION_PANEL, checkTakeUse, frameOfSource, sourceFrameAt, stillsAt, type TakeUse } from "./take";
import { RIVERBED, riverbedRect } from "./ground";
import { shotOf, type PlaneSpec, type ScenePlan, type ShotSpec, type TypeSpec } from "./scene";

const at = (p: ScenePlan, s: ShotSpec, fr: number) => s.camera.pose(fr - s.from);

/** Where a plane's rect (or its read rect) is in the frame on a local frame. */
export const planeRectAt = (p: ScenePlan, s: ShotSpec, pl: PlaneSpec, fr: number, r: Rect = pl.rect): Rect => rectInFrame(r, at(p, s, fr), p.frame);

const visible = (pl: PlaneSpec, fr: number) => fr >= (pl.from ?? -Infinity) && fr < (pl.to ?? Infinity);

/** Is anything other than the camera changing on a frame of this shot (a take plays, a still swaps, a place lifts)? */
const activityOf = (p: ScenePlan, s: ShotSpec) => (fr: number): boolean => {
  for (const pl of s.planes) {
    if (!visible(pl, fr)) continue;
    if (pl.enterAt !== undefined && fr >= pl.enterAt && fr < pl.enterAt + (pl.enterKind === "fade" ? 20 : 24)) return true;
    if (pl.swapInAt !== undefined && fr >= pl.swapInAt && fr < pl.swapInAt + 16) return true;
    if (pl.swapOutAt !== undefined && fr >= pl.swapOutAt && fr < pl.swapOutAt + 16) return true;
    if (pl.dim && pl.dim.some((k, i) => i > 0 && fr >= pl.dim![i - 1]!.at && fr < k.at && k.v !== pl.dim![i - 1]!.v)) return true;
    if (pl.content.kind === "take") {
      const u = pl.content.use;
      if (fr < u.at || fr >= u.until) continue;
      const v = u.manifest.views[pl.content.view];
      // a real recording or a slot's ticking source time changes every frame; a placeholder still only when it swaps
      if (u.manifest.pattern || v?.slot) return true;
      const a = stillsAt(v!, sourceFrameAt(fr, u.at, p.fps, u.manifest, u.inPoint)).length;
      const b = stillsAt(v!, sourceFrameAt(fr - 1, u.at, p.fps, u.manifest, u.inPoint)).length;
      if (a !== b) return true;
    }
  }
  if (s.stone?.veil?.some((v) => fr >= v.at * p.fps && fr < (v.at + 1.3) * p.fps)) return true;
  // the wall's cells orbit on every frame (and, in the film, play their loops at 1×)
  if (s.wall) return true;
  return false;
};

/** The plan as the foundation's QA model. */
export function planQa(p: ScenePlan): FilmTimelineQa {
  const shots: QaShot[] = p.shots.map((s) => ({
    id: s.id,
    from: s.from,
    to: s.to,
    act: p.id,
    kind: s.kind,
    camera: s.camera,
    waits: s.waits,
    activity: activityOf(p, s),
  }));
  const texts: TextEvent[] = p.types.map((t) => typeEvent(t, p.frame, p.fps, p.duration)).filter((x): x is TextEvent => x !== null);
  for (const s of p.shots) {
    const c = s.cascade;
    if (!c) continue;
    const fixed = typeEvent(c.fixed, p.frame, p.fps, p.duration);
    if (fixed) texts.push({ ...fixed, kind: "cascade" });
    const sched = cascadeSchedule(c.start, c.items, p.fps, c.beats);
    sched.forEach((w, i) => {
      const last = i === sched.length - 1;
      texts.push({
        id: `${s.id}-item${i}`,
        text: w.text,
        from: w.inStart,
        to: last && c.holdLast ? s.to : w.outEnd,
        enterFrames: w.inEnd - w.inStart,
        cascadeItem: true,
        kind: "cascade",
        rect: lineRect(w.text, "functional", p.frame, c.itemBox),
      });
    });
  }
  const readables: QaReadable[] = [];
  for (const s of p.shots) {
    for (const pl of s.planes) {
      if (!pl.read) continue;
      const r = pl.read;
      readables.push({ id: pl.id, from: Math.max(r.from, s.from), to: Math.min(r.to, s.to), rect: (fr) => planeRectAt(p, s, pl, fr, r.rect ?? pl.rect), words: r.words, receipt: r.receipt });
    }
    for (const r of s.reads ?? []) readables.push({ id: r.id, from: Math.max(r.from, s.from), to: Math.min(r.to, s.to), rect: (fr) => rectInFrame(r.rect, at(p, s, fr), p.frame), words: r.words, receipt: r.receipt });
  }
  const rings = p.shots.flatMap((s) => s.rings);
  return {
    name: p.name,
    fps: p.fps,
    width: p.frame.w,
    height: p.frame.h,
    durationInFrames: p.duration,
    shots,
    seams: p.seams,
    texts,
    readables,
    rings,
    ringPose: (fr) => {
      const s = p.shots.find((x) => fr >= x.from && fr < x.to) ?? p.shots[p.shots.length - 1]!;
      return at(p, s, fr);
    },
    lightInitial: p.lightInitial,
    lightCues: p.lightCues,
    hits: p.hits,
    leaks: p.leaks,
    acts: [{ id: p.id, from: 0, to: p.duration }],
    isFilm: false,
  };
}

/* ---------------------------------------------------------------- set-piece checks ---------------------------- */

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const gradeOf = (g: ScenePlan["lightInitial"]): Grade => (typeof g === "string" ? GRADES[g] : g);

/** The Drop's bands against the picture's edge (the riverbed under the opening grade): at least 3:1. */
export function bandContrast(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const s of p.shots) {
    if (!s.aperture) continue;
    const band = relLuminance(hexToRgb(s.aperture.band));
    const edge = gradeLuminance(gradeOf(p.lightInitial), COLOR.riverbedMid);
    const c = contrast(band, edge);
    if (c < 3) out.push({ check: "bandContrast", level: "error", message: `${s.id}: the aperture's bands are ${c.toFixed(2)}:1 against the picture's edge (at least 3:1)` });
    else out.push({ check: "bandContrast", level: "info", message: `${s.id}: bands ${c.toFixed(1)}:1 against the picture's edge` });
  }
  return out;
}

export function takes(p: ScenePlan): Finding[] {
  return p.takes.flatMap((u) => checkTakeUse(u, p.fps).map((m) => ({ check: "takes", level: "error" as const, message: m })));
}

export function typeSafe(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const t of p.types) {
    const r = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5);
    if (!insideFrame(r, p.frame, p.frame.safe - 0.5)) out.push({ check: "typeSafe", level: "error", message: `"${t.text.replace(/\n/g, " ")}" leaves the safe area (${Math.round(r.x)}, ${Math.round(r.y)}, ${Math.round(r.w)} × ${Math.round(r.h)})` });
  }
  for (const s of p.shots) {
    if (!s.cascade) continue;
    const c = s.cascade;
    for (const [i, it] of c.items.entries()) {
      const r = lineRect(it.text, "functional", p.frame, c.itemBox);
      if (!insideFrame(r, p.frame, p.frame.safe - 0.5)) out.push({ check: "typeSafe", level: "error", message: `cascade item ${i} "${it.text}" leaves the safe area` });
    }
  }
  return out;
}

/** Film type over UI being read (sampled every 4 frames). */
export function typeOverUi(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const q = planQa(p);
  const seen = new Set<string>();
  for (const t of q.texts) {
    if (!t.rect || typeof t.rect === "function") continue;
    for (const r of q.readables ?? []) {
      if ((r.words ?? 0) === 0) continue;
      for (let fr = Math.max(t.from, r.from); fr < Math.min(t.to, r.to); fr += 4) {
        const rr = typeof r.rect === "function" ? r.rect(fr) : r.rect;
        if (rectsIntersect(t.rect, rr) && !seen.has(`${t.id}:${r.id}`)) {
          seen.add(`${t.id}:${r.id}`);
          out.push({ check: "typeOverUi", level: "error", message: `"${t.text.replace(/\n/g, " ")}" sits over ${r.id} while it is read (frame ${fr})`, frame: fr });
        }
      }
    }
  }
  return out;
}

/** UI text a viewer must read is at least 28 px at 1080 while it is read. */
export function uiReadSize(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const s of p.shots) {
    for (const pl of s.planes) {
      if (!pl.read || pl.read.words === 0) continue;
      const css = pl.read.textPx ?? (pl.content.kind === "standIn" && pl.content.standIn.kind === "still" ? pl.content.standIn.readPx : undefined);
      if (css === undefined) continue;
      let worst = Infinity;
      for (let fr = Math.max(pl.read.from, s.from); fr < Math.min(pl.read.to, s.to); fr++) {
        const z = at(p, s, fr).zoom;
        const scale = pl.content.kind === "standIn" ? pl.rect.w / shownSize(pl.content.standIn).w : 1;
        worst = Math.min(worst, (css * scale * z) / p.frame.unit);
      }
      if (worst < CAMERA.uiReadMinPx - 1e-6) out.push({ check: "uiReadSize", level: "error", message: `${pl.id}: its text reads at ${worst.toFixed(1)} px at 1080 (at least ${CAMERA.uiReadMinPx})` });
    }
    for (const r of s.reads ?? []) {
      let worst = Infinity;
      for (let fr = Math.max(r.from, s.from); fr < Math.min(r.to, s.to); fr++) worst = Math.min(worst, (r.textPx * at(p, s, fr).zoom) / p.frame.unit);
      if (worst < CAMERA.uiReadMinPx - 1e-6) out.push({ check: "uiReadSize", level: "error", message: `${r.id}: its text reads at ${worst.toFixed(1)} px at 1080 (at least ${CAMERA.uiReadMinPx})` });
    }
  }
  return out;
}

export function music(p: ScenePlan, grid?: MusicGrid): Finding[] {
  const out: Finding[] = [];
  for (const m of p.music) {
    if (m.waited < 0) out.push({ check: "music", level: "error", message: `${m.event}: placed ${-m.waited} frames EARLY (holds are never shortened)` });
    if (grid && m.point !== null && m.level && m.level !== "hit" && !pointsOf(grid, m.level).includes(m.point)) out.push({ check: "music", level: "error", message: `${m.event}: frame ${m.point} is not a ${m.level} point` });
    if (grid && m.point !== null && m.level === "hit" && !onGrid(grid, m.point, "beat")) out.push({ check: "music", level: "warn", message: `${m.event}: the hit on ${m.point} is not on a beat of the grid` });
  }
  return out;
}

export function cues(p: ScenePlan): Finding[] {
  return p.shots.flatMap((s) => (s.stone ? checkCues(s.stone.cues, `${p.id}/${s.id}`).map((m) => ({ check: "cues", level: "error" as const, message: m })) : []));
}

/**
 * Film type over any other UI plane while the line is read (sampled every 6 frames): a warning for the edit lane, since
 * type must never sit over the UI's own text (§5.2) and only the 2.0.0 capture shows where its text is. Over a published
 * still it is a warning; over a slot (no capture yet) it is noted.
 */
export function typeOverPlanes(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const q = planQa(p);
  const seen = new Set<string>();
  for (const t of q.texts) {
    if (!t.rect || typeof t.rect === "function") continue;
    for (let fr = t.from + (t.enterFrames ?? 0); fr < t.to; fr += 6) {
      const s = p.shots.find((x) => fr >= x.from && fr < x.to);
      if (!s) continue;
      for (const pl of s.planes) {
        if (pl.textless || fr < (pl.from ?? -Infinity) || fr >= (pl.to ?? Infinity) || (pl.content.kind === "take" && fr < pl.content.use.at)) continue;
        const r = planeRectAt(p, s, pl, fr);
        const x = rectsIntersect(t.rect, r);
        if (!x || seen.has(`${t.id}:${pl.id}`)) continue;
        seen.add(`${t.id}:${pl.id}`);
        const c = pl.content;
        const slot = (c.kind === "standIn" && c.standIn.kind === "slot") || (c.kind === "take" && !c.use.manifest.pattern && !!c.use.manifest.views[c.view]?.slot);
        out.push({ check: "typeOverPlanes", level: slot ? "info" : "warn", message: `"${t.text.replace(/\n/g, " ").slice(0, 40)}" sits over ${pl.id}${slot ? " (a slot: check the 2.0.0 capture has no text there)" : ""} (frame ${fr})`, frame: fr });
      }
    }
  }
  return out;
}

/** UI the viewer must read is wholly in frame while it is read (checked every 3 frames). */
export function readInFrame(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const q = planQa(p);
  for (const r of q.readables ?? []) {
    if ((r.words ?? 0) === 0) continue;
    for (let fr = r.from; fr < r.to; fr += 3) {
      const rr = typeof r.rect === "function" ? r.rect(fr) : r.rect;
      if (!insideFrame(rr, p.frame, -0.5)) {
        out.push({ check: "readInFrame", level: "error", message: `${r.id} is read on frame ${fr} but lies outside the frame (${Math.round(rr.x)}, ${Math.round(rr.y)}, ${Math.round(rr.w)} × ${Math.round(rr.h)})`, frame: fr });
        break;
      }
    }
  }
  return out;
}

/** The wall: no Stealth cell, ever; and the cells are seen, not read (their text far under the 28 px floor). */
export function wallCheck(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const s of p.shots) {
    if (!s.wall) continue;
    for (const c of s.wall.cells) if ((STEALTH_FEATURES as readonly string[]).includes(c.feature)) out.push({ check: "wall", level: "error", message: `cell ${c.id} shows Stealth Lockdown (${c.feature}): the wall never does` });
    let worst = 0;
    for (let fr = s.from; fr < s.to; fr += 3) {
      const z = at(p, s, fr).zoom;
      for (const c of s.wall.cells) {
        const cur = cellAt(c, s.wall, fr, p.fps);
        if (cur.opacity > 0.02) worst = Math.max(worst, cellTextPx(c, z, p.frame, 15, cur.rect.w));
      }
    }
    if (worst > 16) out.push({ check: "wall", level: "error", message: `${s.id}: a cell's text reaches ${worst.toFixed(1)} px at 1080: the wall is seen, not read (keep it under 16)` });
    else out.push({ check: "wall", level: "info", message: `${s.id}: the cells' text stays under ${worst.toFixed(1)} px at 1080` });
  }
  return out;
}

/** Small print and every other line: the never-list applies to them too (they are on screen). */
export function smallPrint(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const NEVER = /\b(undetectable|invisible|magic|seamless|revolutionary|beats?|first|unique|context warping|never takes focus)\b|!/i;
  for (const t of p.types) if (t.kind === "small" && NEVER.test(t.text)) out.push({ check: "copy", level: "error", message: `small print "${t.text.slice(0, 60)}…" has "${t.text.match(NEVER)![0]}"` });
  return out;
}

/* ---------------------------------------------------------------- checks added after the craft review (CR-15) -- */

/** The longest a picture fault may last before it is an error (a glimpse while the camera travels is not read). */
export const GLIMPSE_FRAMES_60 = 30;

/** Frame runs of a predicate over [from, to): [start, end) pairs. */
const runsOf = (from: number, to: number, on: (f: number) => boolean): { from: number; to: number }[] => {
  const out: { from: number; to: number }[] = [];
  for (let f = from; f < to; f++) {
    if (!on(f)) continue;
    let g = f;
    while (g < to && on(g)) g++;
    out.push({ from: f, to: g });
    f = g;
  }
  return out;
};

type Seam = ScenePlan["seams"][number];

/** A shot drawn on a local frame: the shot the frame falls in, or the outgoing shot of a transition (it keeps rendering). */
export interface DrawnShot {
  shot: ShotSpec;
  role: "only" | "in" | "out";
  seam?: Seam;
}

/** Every shot drawn on a local frame (PieceView: a transition's outgoing shot renders `seam.frames` past its end). */
export function drawnShots(p: ScenePlan, fr: number): DrawnShot[] {
  const s = shotOf(p, fr);
  const out: DrawnShot[] = s ? [{ shot: s, role: "only" }] : [];
  for (const seam of p.seams) {
    if (seam.frames <= 0 || fr < seam.at || fr >= seam.at + seam.frames) continue;
    const o = p.shots.find((x) => x.id === seam.out);
    if (!o || o === s) continue;
    if (out[0]) {
      out[0].role = "in";
      out[0].seam = seam;
    }
    out.push({ shot: o, role: "out", seam });
  }
  return out;
}

/** The iris on a frame of its seam, as PieceView draws it: centre (frame px), radius and feather. */
export function irisOnFrame(p: ScenePlan, seam: Seam, fr: number): { c: Point; R: number; feather: number } {
  const next = p.shots.find((x) => x.id === seam.in)!;
  const c = seam.irisCenter ? worldToFrame(seam.irisCenter, next.camera.pose(0), p.frame.w, p.frame.h) : { x: p.frame.w / 2, y: p.frame.h / 2 };
  const feather = IRIS_DRAWN.featherPx * p.frame.unit;
  const R = irisRadius((fr - seam.at) / seam.frames, IRIS_DRAWN.startRadiusPx * p.frame.unit, radiusToCorners(c, p.frame.w, p.frame.h) + feather, seam.ease ?? IRIS_DEFAULT_EASE);
  return { c, R, feather };
}

/**
 * How much of a disc (frame px) a drawn shot shows on a frame: 1 outside transitions; through an iris, the share of
 * its diameter on its side of the mask's half-opaque radius; through a rack or a swap, the shot's opacity.
 */
export function shownShare(p: ScenePlan, d: DrawnShot, fr: number, c: Point, r: number): number {
  const seam = d.seam;
  if (!seam || d.role === "only") return 1;
  const u = clamp01((fr - seam.at) / seam.frames);
  if (seam.presentation === "iris") {
    const iris = irisOnFrame(p, seam, fr);
    const edge = iris.R - iris.feather / 2;
    const dist = Math.hypot(c.x - iris.c.x, c.y - iris.c.y);
    return d.role === "in" ? clamp01((edge - (dist - r)) / (2 * r)) : clamp01((dist + r - edge) / (2 * r));
  }
  if (seam.presentation === "rack") {
    const o = smoothstep(0.36, 0.64, u);
    return d.role === "in" ? o : 1 - o;
  }
  // the swap in place: out over the first half, in over the second
  return d.role === "in" ? E_MOVE(clamp01(u * 2 - 1)) : 1 - E_MOVE(clamp01(u * 2));
}

/* ---------------------------------------------------------------- ground coverage (CR-02) ---------------------- */

/**
 * The frame's four corners stay inside the riverbed on every frame of every shot that shows it, the frames its
 * transition out renders included (setpieces/ground.ts: the extent PieceView draws, centred on the shot's ref, at
 * parallax depth 0.4). A corner outside shows the image's straight edge and the flat world colour beyond it.
 */
export function groundCoverage(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const { w, h, unit } = p.frame;
  for (const s of p.shots) {
    if (s.ground !== "riverbed") continue;
    const seam = p.seams.find((x) => x.out === s.id && x.frames > 0);
    const to = s.to + (seam ? seam.frames : 0);
    const g = riverbedRect(s.ref);
    const over = new Float64Array(to - s.from);
    const edges: string[][] = [];
    for (let fr = s.from; fr < to; fr++) {
      const gp = planePose(s.camera.pose(fr - s.from), s.ref, RIVERBED.depth);
      const hw = w / 2 / gp.zoom;
      const hh = h / 2 / gp.zoom;
      const by = { left: g.x - (gp.x - hw), right: gp.x + hw - (g.x + g.w), top: g.y - (gp.y - hh), bottom: gp.y + hh - (g.y + g.h) };
      over[fr - s.from] = (Math.max(0, ...Object.values(by)) * gp.zoom) / unit;
      edges[fr - s.from] = Object.entries(by)
        .filter(([, v]) => v > 0)
        .map(([k]) => k);
    }
    for (const run of runsOf(s.from, to, (fr) => over[fr - s.from]! >= 1)) {
      let worst = 0;
      const sides = new Set<string>();
      for (let fr = run.from; fr < run.to; fr++) {
        worst = Math.max(worst, over[fr - s.from]!);
        for (const e of edges[fr - s.from]!) sides.add(e);
      }
      out.push({
        check: "groundCoverage",
        level: "error",
        message: `${s.id}: the riverbed's ${[...sides].join(" and ")} edge${sides.size > 1 ? "s" : ""} come${sides.size > 1 ? "" : "s"} into frame for ${((run.to - run.from) / p.fps).toFixed(2)} s, frames ${run.from}–${run.to} (up to ${worst.toFixed(0)} px inside the frame at 1080): size the ground from the shot's widest pose (CR-02)`,
        frame: run.from,
        to: run.to,
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- one stone (CR-01) ---------------------------- */

export interface StoneOnFrame {
  shot: string;
  /** frame px */
  c: Point;
  r: number;
  /** the share of it the frame shows (its shot's transition mask, the frame's edge) */
  share: number;
}

/** The stones a frame shows (each at least a quarter shown). */
export function stonesOnFrame(p: ScenePlan, fr: number, minShare = 0.25): StoneOnFrame[] {
  const { w, h } = p.frame;
  const out: StoneOnFrame[] = [];
  for (const d of drawnShots(p, fr)) {
    const st = d.shot.stone;
    if (!st) continue;
    const pose = d.shot.camera.pose(fr - d.shot.from);
    const c = worldToFrame(st.at, pose, w, h);
    const r = st.r * pose.zoom;
    const inFrame = clamp01((Math.min(c.x + r, w) - Math.max(c.x - r, 0)) / (2 * r)) * clamp01((Math.min(c.y + r, h) - Math.max(c.y - r, 0)) / (2 * r));
    const share = inFrame * shownShare(p, d, fr, c, r);
    if (share >= minShare) out.push({ shot: d.shot.id, c, r, share });
  }
  return out;
}

/**
 * Exactly one stone wherever the stone shows: two stones a frame shows at once must be the same stone (centres within
 * 6 px at 1080, sizes within 6 %), as a match through an iris is; otherwise the frame shows two stones.
 */
export function stoneCount(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const tol = 6 * p.frame.unit;
  const two = (fr: number) => {
    const s = stonesOnFrame(p, fr);
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++) {
        const a = s[i]!;
        const b = s[j]!;
        if (Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y) > tol || Math.abs(Math.log(a.r / b.r)) > 0.06) return { a, b };
      }
    return null;
  };
  for (const run of runsOf(0, p.duration, (fr) => two(fr) !== null)) {
    const first = two(run.from)!;
    out.push({
      check: "stoneCount",
      level: "error",
      message: `two stones for ${run.to - run.from} frames, ${run.from}–${run.to}: ${first.a.shot}'s stone and ${first.b.shot}'s are ${(Math.hypot(first.a.c.x - first.b.c.x, first.a.c.y - first.b.c.y) / p.frame.unit).toFixed(0)} px apart at 1080 on frame ${run.from} (one stone only: land one on the other's pose, with zero relative velocity, before both show, CR-01)`,
      frame: run.from,
      to: run.to,
    });
  }
  return out;
}

/* ---------------------------------------------------------------- legible planes (CR-05, CR-09) ---------------- */

/** Text drawn at this size (px at 1080) or more is legible: its plane is wholly in frame, and its words are read. */
export const LEGIBLE_PX = 20;

/** A text-bearing part of a plane: what it shows, its body text, its words and the local frames it is drawn. */
export interface TextItem {
  id: string;
  shot: ShotSpec;
  plane: PlaneSpec;
  /** world rect of the drawn part */
  rect: Rect;
  /** its body text, world units */
  css: number;
  words: number;
  from: number;
  to: number;
}

const textOfStill = (s: StillStandIn) => ({ px: s.textPx ?? s.readPx, words: s.words });
/** The text of the published images the plans draw (the companion's panel). */
const IMAGE_TEXT: Record<string, { textPx: number; words: number }> = { [COMPANION_PANEL.src]: { textPx: COMPANION_PANEL.textPx, words: COMPANION_PANEL.words } };

/** A still drawn into a box at a uniform scale, centred (StillImage): its drawn rect and the scale. */
const stillIn = (st: StillStandIn, box: Rect): { rect: Rect; k: number } => {
  const c = st.crop ?? { x: 0, y: 0, w: st.w, h: st.h };
  const k = Math.min(box.w / c.w, box.h / c.h);
  return { rect: { x: box.x + (box.w - c.w * k) / 2, y: box.y + (box.h - c.h * k) / 2, w: c.w * k, h: c.h * k }, k };
};

/** The local frames a plane is drawn in its shot (its own window, its entrance, its swaps, its take). */
const planeWindow = (s: ShotSpec, pl: PlaneSpec, swapF: number): { from: number; to: number } => {
  let from = Math.max(s.from, pl.from ?? -Infinity, pl.enterAt ?? -Infinity, pl.swapInAt ?? -Infinity);
  let to = Math.min(s.to, pl.to ?? Infinity, pl.swapOutAt !== undefined ? pl.swapOutAt + swapF : Infinity);
  if (pl.content.kind === "take") {
    from = Math.max(from, pl.content.use.at);
    to = Math.min(to, pl.content.use.until);
  }
  return { from, to };
};

/** Every text-bearing part of every plane (stills, the stills inside placeholder take views, real views, images). */
export function textItems(p: ScenePlan): TextItem[] {
  const out: TextItem[] = [];
  const swapF = 16;
  for (const s of p.shots) {
    const planes: PlaneSpec[] = [...s.planes];
    if (s.cascade) {
      const sched = cascadeSchedule(s.cascade.start, s.cascade.items, p.fps, s.cascade.beats);
      s.cascade.cards.forEach((card, i) => {
        const w = sched[i];
        if (!w) return;
        const last = s.cascade!.holdLast && i === sched.length - 1;
        planes.push({ ...card, from: i === 0 ? s.from : w.inStart, to: last ? s.to : w.outEnd });
      });
    }
    for (const pl of planes) {
      const win = planeWindow(s, pl, swapF);
      if (win.to <= win.from) continue;
      const c = pl.content;
      const add = (id: string, rect: Rect, css: number | undefined, words: number | undefined, from: number, to: number) => {
        if (css === undefined || words === undefined || words <= 0 || to <= from) return;
        out.push({ id, shot: s, plane: pl, rect, css, words, from, to });
      };
      if (c.kind === "standIn") {
        if (c.standIn.kind !== "still") continue; // a slot is a placeholder's label, not UI
        const d = stillIn(c.standIn, pl.rect);
        const t = textOfStill(c.standIn);
        add(pl.id, d.rect, t.px === undefined ? undefined : t.px * d.k, t.words, win.from, win.to);
      } else if (c.kind === "image") {
        const t = c.textPx !== undefined && c.words !== undefined ? { textPx: c.textPx, words: c.words } : IMAGE_TEXT[c.src];
        if (t) add(pl.id, pl.rect, t.textPx * (pl.rect.w / c.w), t.words, win.from, win.to);
      } else {
        const u = c.use;
        const v = u.manifest.views[c.view];
        if (!v) continue;
        const kx = pl.rect.w / v.w;
        const ky = pl.rect.h / v.h;
        if (u.manifest.pattern) {
          const crop = v.crop ?? { x: 0, y: 0, w: u.manifest.w, h: u.manifest.h };
          add(pl.id, pl.rect, v.textPx === undefined ? undefined : v.textPx * (pl.rect.w / crop.w), v.words, win.from, win.to);
          continue;
        }
        (v.stills ?? []).forEach((vs, i) => {
          if (vs.standIn.kind !== "still") return;
          const r = vs.rect ?? { x: 0, y: 0, w: v.w, h: v.h };
          const box = { x: pl.rect.x + r.x * kx, y: pl.rect.y + r.y * ky, w: r.w * kx, h: r.h * ky };
          const d = stillIn(vs.standIn, box);
          const t = textOfStill(vs.standIn);
          const from = Math.max(win.from, frameOfSource(vs.from, u.at, p.fps, u.manifest, u.inPoint));
          const to = Math.min(win.to, vs.to === undefined ? Infinity : frameOfSource(vs.to, u.at, p.fps, u.manifest, u.inPoint));
          add(`${pl.id}:${vs.standIn.id}${i ? `#${i}` : ""}`, d.rect, t.px === undefined ? undefined : t.px * d.k, t.words, from, to);
        });
      }
    }
  }
  return out;
}

/** An item's text size on a frame, px at 1080, and where it is in the frame. */
const itemOnFrame = (p: ScenePlan, it: TextItem, fr: number) => {
  const pose = it.shot.camera.pose(fr - it.shot.from);
  return { px: (it.css * pose.zoom) / p.frame.unit, rect: rectInFrame(it.rect, pose, p.frame) };
};

const visibleIn = (r: Rect, w: number, h: number) => r.x < w && r.y < h && r.x + r.w > 0 && r.y + r.h > 0;

/**
 * Every plane drawn with text of 20 px or more (at 1080) is wholly in frame (CR-05: readable cards and receipts were
 * cut mid-word by the frame's edge for seconds; readInFrame only checked the declared read rects). A cut shorter than
 * half a second (a plane crossing the edge as the camera travels) is not judged.
 */
export function planesInFrame(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const { w, h } = p.frame;
  const glimpse = Math.round((GLIMPSE_FRAMES_60 * p.fps) / 60);
  for (const it of textItems(p)) {
    const cut = (fr: number) => {
      const o = itemOnFrame(p, it, fr);
      return o.px >= LEGIBLE_PX - 1e-9 && visibleIn(o.rect, w, h) && !insideFrame(o.rect, p.frame, -0.5);
    };
    for (const run of runsOf(it.from, it.to, cut)) {
      if (run.to - run.from < glimpse) continue;
      let worstOut = 0;
      let px = 0;
      const sides = new Set<string>();
      for (let fr = run.from; fr < run.to; fr++) {
        const o = itemOnFrame(p, it, fr);
        px = Math.max(px, o.px);
        const r = o.rect;
        const inside = Math.max(0, Math.min(r.x + r.w, w) - Math.max(r.x, 0)) * Math.max(0, Math.min(r.y + r.h, h) - Math.max(r.y, 0));
        worstOut = Math.max(worstOut, 1 - inside / (r.w * r.h));
        if (r.x < -0.5) sides.add("left");
        if (r.x + r.w > w + 0.5) sides.add("right");
        if (r.y < -0.5) sides.add("top");
        if (r.y + r.h > h + 0.5) sides.add("bottom");
      }
      out.push({
        check: "planesInFrame",
        level: "error",
        message: `${it.id}: drawn with text up to ${px.toFixed(0)} px at 1080 (${it.words} words) but cut by the frame's ${[...sides].join(" and ")} edge for ${((run.to - run.from) / p.fps).toFixed(2)} s, frames ${run.from}–${run.to} (up to ${Math.round(worstOut * 100)} % of it outside): frame the whole plane, or crop its view at a card or line boundary (CR-05)`,
        frame: run.from,
        to: run.to,
      });
    }
  }
  return out;
}

/** The words the plan's reading model counts over an item's rect on a frame (its plane's read, the shot's reads). */
const countedWords = (p: ScenePlan, it: TextItem, fr: number): number => {
  let n = 0;
  const overlaps = (r: Rect) => {
    const x = Math.max(0, Math.min(r.x + r.w, it.rect.x + it.rect.w) - Math.max(r.x, it.rect.x));
    const y = Math.max(0, Math.min(r.y + r.h, it.rect.y + it.rect.h) - Math.max(r.y, it.rect.y));
    return x * y > 0.5 * Math.min(r.w * r.h, it.rect.w * it.rect.h);
  };
  const r = it.plane.read;
  if (r && fr >= r.from && fr < r.to && overlaps(r.rect ?? it.plane.rect)) n += r.words;
  for (const x of it.shot.reads ?? []) if (fr >= x.from && fr < x.to && overlaps(x.rect)) n += x.words;
  return n;
};

/**
 * Every legible word counts toward the reading load (CR-05: about 60 legible words were on screen while the reading
 * load counted 9), and a read is never declared with 0 words (CR-09: the Drop's ask card was declared read with 0
 * words, so its 28 px floor could never fail). Per text item: the words it shows at 20 px or more beyond the words the
 * plan's reads count over it, for half a second or more, are an error; per shot: its reading load counting every
 * legible word must stay at 3.14 words a second or less.
 */
export function legibleWords(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const { w, h } = p.frame;
  const glimpse = Math.round((GLIMPSE_FRAMES_60 * p.fps) / 60);
  for (const s of p.shots) for (const pl of s.planes) if (pl.read && pl.read.words === 0) out.push({ check: "legibleWords", level: "error", message: `${pl.id}: declared read with 0 words, so its size and its load are never checked: an ask the viewer must read counts its words (CR-09)`, frame: pl.read.from });
  const extra: TextEvent[] = [];
  for (const it of textItems(p)) {
    const legible = (fr: number) => {
      const o = itemOnFrame(p, it, fr);
      return o.px >= LEGIBLE_PX - 1e-9 && visibleIn(o.rect, w, h);
    };
    for (const run of runsOf(it.from, it.to, legible)) {
      if (run.to - run.from < glimpse) continue;
      // the frames of the run the plan counts fewer words than the item shows, and the most it ever counts
      let short = 0;
      let most = 0;
      let px = 0;
      for (let fr = run.from; fr < run.to; fr++) {
        const n = countedWords(p, it, fr);
        most = Math.max(most, n);
        if (n < it.words) short++;
        px = Math.max(px, itemOnFrame(p, it, fr).px);
      }
      if (short < glimpse) continue;
      out.push({
        check: "legibleWords",
        level: "error",
        message: `${it.id}: ${it.words} legible words (text up to ${px.toFixed(0)} px at 1080) for ${((run.to - run.from) / p.fps).toFixed(2)} s, frames ${run.from}–${run.to}, but the reading load counts at most ${most}: count every legible word, or show less at reading size (CR-05)`,
        frame: run.from,
        to: run.to,
      });
      extra.push({ id: `${it.id}@${run.from}`, text: Array.from({ length: Math.max(0, it.words - most) }, () => "w").join(" "), from: run.from, to: run.to, kind: "ui" });
    }
  }
  if (extra.length) {
    const q = planQa(p);
    const declared: TextEvent[] = [
      ...q.texts.filter((x) => !x.cascadeItem),
      ...(q.readables ?? []).filter((r) => (r.words ?? 0) > 0).map((r) => ({ id: r.id, text: Array.from({ length: r.words! }, () => "w").join(" "), from: r.from, to: r.to, kind: "ui" as const })),
    ];
    for (const s of p.shots) {
      const load = readingLoad({ id: s.id, from: s.from, to: s.to }, [...declared, ...extra], p.fps);
      if (load > 3.14 + 1e-9) out.push({ check: "legibleWords", level: "error", message: `shot ${s.id} asks for ${load.toFixed(2)} words a second counting every legible word (at most 3.14; the declared reads alone ask ${readingLoad({ id: s.id, from: s.from, to: s.to }, declared, p.fps).toFixed(2)})`, frame: s.from });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- the hit, in every aspect (CR-07) ------------- */

/** The aperture's first opening frame (the first frame its bands have moved), or null. */
export const apertureOpenStart = (p: ScenePlan): number | null => {
  for (const s of p.shots) {
    if (!s.aperture) continue;
    for (let fr = s.from; fr < s.to; fr++) if (s.aperture.open(fr) > 1e-4) return fr;
  }
  return null;
};

/** The frame a burst ring first shows past the stone (its start + 1: a ring is invisible on its first frame). */
export const burstStarts = (p: ScenePlan): { id: string; at: number }[] =>
  p.shots.flatMap((s) => s.rings.filter((r) => r.phases.some((ph) => ph.kind === "burst")).map((r) => ({ id: r.id, at: r.start + 1 })));

const nearestHit = (p: ScenePlan, f: number): number | undefined => [...p.hits].sort((a, b) => Math.abs(a - f) - Math.abs(b - f))[0];

/**
 * The Drop's turn lands on the hit in every aspect (CR-07: in 9:16 the frame opened 21 frames after it): the
 * aperture's opening and every burst start within 2 frames of the nearest marked hit; and no light leak plays over the
 * bands (PieceView draws the leaks above them: the warm leak turned the night green muddy brown).
 */
export function hitSync(p: ScenePlan, toleranceFrames = 2): Finding[] {
  const out: Finding[] = [];
  const tol = Math.max(1, Math.round((toleranceFrames * p.fps) / 60));
  const open = apertureOpenStart(p);
  if (open !== null) {
    const hit = nearestHit(p, open);
    if (hit === undefined) out.push({ check: "hitSync", level: "error", message: `the aperture opens on frame ${open} but the plan marks no hit`, frame: open });
    else if (Math.abs(open - hit) > tol) out.push({ check: "hitSync", level: "error", message: `the aperture starts to open on frame ${open}, ${open - hit} frames ${open > hit ? "after" : "before"} the hit (${hit}): within ${tol} in every aspect (CR-07)`, frame: open });
    else out.push({ check: "hitSync", level: "info", message: `the aperture starts to open on frame ${open} (the hit is ${hit})` });
    for (const s of p.shots) {
      if (!s.aperture) continue;
      for (const l of p.leaks) {
        const over = runsOf(Math.max(s.from, l.at), Math.min(s.to, l.at + l.frames), (fr) => s.aperture!.open(fr) < 0.999);
        const n = over.reduce((k, r) => k + r.to - r.from, 0);
        if (n > 0) out.push({ check: "hitSync", level: "error", message: `the light leak at ${l.at} plays over the aperture's bands for ${n} frames (${over[0]!.from}–${over[over.length - 1]!.to}): it tints the night green; draw it under the bands or once they have cleared (CR-07)`, frame: over[0]!.from });
      }
    }
  }
  for (const b of burstStarts(p)) {
    const hit = nearestHit(p, b.at);
    if (hit === undefined || Math.abs(b.at - hit) > tol + 1) out.push({ check: "hitSync", level: "error", message: `the burst ${b.id} first shows on frame ${b.at}, ${hit === undefined ? "with no marked hit" : `${b.at - hit} frames from the hit (${hit})`}: within ${tol} (CR-07)`, frame: b.at });
  }
  return out;
}

/** The aperture's opening against the hit in each aspect's plan of one piece (one timeline, §3.12). */
export function hitSyncAcross(plans: Readonly<Record<string, ScenePlan>>, toleranceFrames = 2): { findings: Finding[]; byAspect: Record<string, { open: number | null; hit: number | undefined }> } {
  const byAspect: Record<string, { open: number | null; hit: number | undefined }> = {};
  const findings: Finding[] = [];
  for (const [a, p] of Object.entries(plans)) {
    const open = apertureOpenStart(p);
    byAspect[a] = { open, hit: open === null ? undefined : nearestHit(p, open) };
  }
  const opens = Object.values(byAspect).filter((x) => x.open !== null) as { open: number; hit: number }[];
  if (opens.length > 1) {
    const spread = Math.max(...opens.map((x) => x.open)) - Math.min(...opens.map((x) => x.open));
    if (spread > 2 * toleranceFrames) findings.push({ check: "hitSync", level: "error", message: `the aperture opens on frames ${Object.entries(byAspect).map(([a, x]) => `${a} ${x.open}`).join(", ")}: ${spread} frames apart across the aspects (one timeline: each within ${toleranceFrames} of the hit, CR-07)` });
  }
  return { findings, byAspect };
}

/* ---------------------------------------------------------------- small print (CR-10) -------------------------- */

const norm = (t: string) => t.replace(/\s+/g, " ").trim();
const HONEST = norm(STEALTH_HONEST);

/** A line's frames on screen as TypeView draws it: [its entrance's start, the first frame it is gone). */
export const drawnSpan = (t: TypeSpec, fps: number, pieceEnd: number): { from: number; landed: number; exitAt: number; until: number } => {
  const ent = t.entrance ?? defaultEntranceOf(t.tier);
  const landed = t.at + enterFramesOf(ent, t.text, fps);
  const exit = t.exit ?? "blur";
  if (t.exitAt === undefined) return { from: t.at, landed, exitAt: pieceEnd, until: pieceEnd };
  if (exit === "camera") return { from: t.at, landed, exitAt: t.exitAt, until: t.exitAt };
  return { from: t.at, landed, exitAt: t.exitAt, until: Math.min(pieceEnd, t.exitAt + exitFramesOf(ent, exit, t.text, fps) + 2) };
};

/**
 * The end card's pages are read (CR-10: page 2 put about 100 words, the honest line among them, on screen for 6 s;
 * smallPrint only checked the wording): the lines of kind "end" and "small" on screen together form a page, held
 * together for at least its reading time (the hold formula over all its words); and any line carrying the Stealth
 * honest line's text, anywhere, is held at least 9 s.
 */
export function smallPrintHolds(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const lines = p.types.filter((t) => t.kind === "end" || t.kind === "small").map((t) => ({ t, ...drawnSpan(t, p.fps, p.duration) }));
  lines.sort((a, b) => a.from - b.from);
  const pages: (typeof lines)[] = [];
  for (const l of lines) {
    const page = pages[pages.length - 1];
    if (page && l.from < Math.max(...page.map((x) => x.until))) page.push(l);
    else pages.push([l]);
  }
  for (const page of pages) {
    const words = page.reduce((n, l) => n + wordCount(l.t.text), 0);
    const honest = page.some((l) => norm(l.t.text).includes(HONEST) || l.t.honest);
    const need = Math.max(requiredHoldS(words), honest ? 9 : 0);
    const together = (Math.min(...page.map((l) => l.exitAt)) - Math.max(...page.map((l) => l.landed))) / p.fps;
    const ids = page.map((l) => l.t.id).join(", ");
    if (together + 1e-9 < need)
      out.push({ check: "smallPrintHolds", level: "error", message: `end-card page (${ids}): ${words} words on screen together for ${Math.max(0, together).toFixed(2)} s; they need ${need.toFixed(1)} s (each page held for its reading time, CR-10)`, frame: Math.min(...page.map((l) => l.from)), to: Math.max(...page.map((l) => l.until)) });
  }
  for (const t of p.types) {
    if (!(norm(t.text).includes(HONEST) || t.honest)) continue;
    const d = drawnSpan(t, p.fps, p.duration);
    const held = (d.exitAt - d.landed) / p.fps;
    if (held + 1e-9 < 9) out.push({ check: "smallPrintHolds", level: "error", message: `${t.id} carries the Stealth honest line but holds it ${held.toFixed(2)} s (at least 9 s wherever it shows, CR-10)`, frame: d.from, to: d.until });
  }
  return out;
}

/* ---------------------------------------------------------------- the ask and the act on one clock (CR-11) ----- */

/** The window a plane shows: its own `place`, else its take view's, its still's or its image's. */
export const placeOf = (pl: PlaneSpec): string | undefined => {
  if (pl.place) return pl.place;
  const c = pl.content;
  if (c.kind === "take") return c.use.manifest.views[c.view]?.place;
  if (c.kind === "standIn") return (c.standIn as StandIn & { place?: string }).place;
  return c.src === COMPANION_PANEL.src ? COMPANION_PANEL.place : undefined;
};

const sameClock = (a: TakeUse, b: TakeUse) => a.manifest.id === b.manifest.id && a.at === b.at && a.inPoint === b.inPoint;

/**
 * A still and a take view standing for the same window never share a frame unless the still is that take's own frame
 * at the shown time (CR-11: Ring 4 showed a still of the held card, with live buttons, above a live take of the run
 * already verified, a state Pebble never shows). Views of one take on one clock are one recording, and pass; two
 * different takes of one window are refused like a still.
 */
export function askActClock(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const s of p.shots) {
    s.planes.forEach((b, ib) => {
      const take = b.content;
      if (take.kind !== "take") return;
      const place = placeOf(b);
      if (!place) return;
      s.planes.forEach((a, ia) => {
        if (a === b || placeOf(a) !== place) return;
        if (a.content.kind === "take" && (sameClock(a.content.use, take.use) || ia > ib)) return;
        const wa = planeWindow(s, a, 16);
        const wb = planeWindow(s, b, 16);
        const from = Math.max(wa.from, wb.from);
        const to = Math.min(wa.to, wb.to);
        if (to <= from) return;
        const what = a.content.kind === "take" ? `${a.content.use.manifest.id}'s ${a.content.view} view, another take of ${place}` : `a still of ${place}`;
        out.push({
          check: "askActClock",
          level: "error",
          message: `${a.id} (${what}) and ${b.id} (${take.use.manifest.id}'s ${take.view} view, a live take of ${place}) share ${((to - from) / p.fps).toFixed(2)} s, frames ${from}–${to}: they can show states that never coexisted; make it a view of the same take, on its clock (CR-11)`,
          frame: from,
          to,
        });
      });
    });
  }
  return out;
}

/* ---------------------------------------------------------------- no line vanishes (CR-03) --------------------- */

/** One line as the ink check sees it (setpieces' half of qa/ink.ts InkTrack): frame px of the plan, local frames. */
export interface TypeTrack {
  id: string;
  text: string;
  rect: Rect;
  color: string;
  from: number;
  landed: number;
  until: number;
  exits: { from: number; to: number; kind: string }[];
  /** set when the line stops being drawn with no drawn exit: why */
  vanishes?: string;
}

/** Every line a plan draws: its film lines, its cascades' fixed lines and items. */
export function typeTracks(p: ScenePlan): TypeTrack[] {
  const out: TypeTrack[] = [];
  const end = p.duration;
  const track = (t: TypeSpec): TypeTrack => {
    const d = drawnSpan(t, p.fps, end);
    const exit = t.exit ?? "blur";
    const exits = t.exitAt !== undefined && exit !== "camera" ? [{ from: t.exitAt, to: d.until, kind: exit }] : [];
    let vanishes: string | undefined;
    if (t.exitAt !== undefined && exit === "camera") vanishes = `its "camera" exit draws nothing (the type layer is fixed to the screen): it vanishes on frame ${t.exitAt}`;
    else if (t.exitAt === undefined && !p.endsFilm) vanishes = `it has no exit and is drawn to the piece's last frame: it vanishes on the cut at ${end}`;
    else if (t.exitAt !== undefined && !p.endsFilm && t.exitAt + exitFramesOf(t.entrance ?? defaultEntranceOf(t.tier), exit, t.text, p.fps) > end) vanishes = `its exit runs past the piece's end (${end}): the cut takes it mid-exit`;
    return { id: t.id, text: t.text, rect: lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5), color: t.color ?? COLOR.ink, from: d.from, landed: d.landed, until: d.until, exits, vanishes };
  };
  for (const t of p.types) out.push(track(t));
  for (const s of p.shots) {
    const c = s.cascade;
    if (!c) continue;
    out.push(track(c.fixed));
    const sched = cascadeSchedule(c.start, c.items, p.fps, c.beats);
    sched.forEach((w, i) => {
      const last = c.holdLast && i === sched.length - 1;
      out.push({
        id: `${s.id}-item${i}`,
        text: w.text,
        rect: lineRect(w.text, "functional", p.frame, c.itemBox),
        color: COLOR.ink,
        from: w.inStart,
        landed: w.inEnd,
        until: last ? end : w.outEnd,
        exits: last ? [] : [{ from: w.outStart, to: w.outEnd, kind: "swap" }],
        vanishes: last && !p.endsFilm ? `the cascade's last item is held to the piece's end with no exit: it vanishes on the cut at ${end}` : undefined,
      });
    });
  }
  return out;
}

/**
 * No line vanishes (CR-03; §5.2's never-list: "text that ... vanishes on a cut"): every line leaves with a drawn exit
 * (a blur, a lift, a swap out) before its piece ends, unless the piece ends the film. A "camera" exit draws nothing,
 * since TypeView draws type in a fixed screen band: "Its own tools." vanished in 2 frames, 6 before the cut. The render's
 * half of this check is qa/ink.ts (the ink in each line's rect).
 */
export function typeExits(p: ScenePlan): Finding[] {
  return typeTracks(p)
    .filter((t) => t.vanishes)
    .map((t) => ({ check: "typeExits", level: "error" as const, message: `${t.id} "${t.text.replace(/\n/g, " ").slice(0, 40)}": ${t.vanishes} (give it a drawn exit that ends by the cut, CR-03)`, frame: Math.min(t.until, p.duration) - 1 }));
}

/** The checks added after the craft review, by name (CR-15). */
export const REVIEW_CHECKS = ["cameraFloor", "irisEase", "groundCoverage", "stoneCount", "planesInFrame", "legibleWords", "hitSync", "smallPrintHolds", "askActClock", "typeExits"] as const;

/** Every check: the foundation's, then the set pieces'. */
export function checkPlan(p: ScenePlan, grid?: MusicGrid, extraMoves: readonly QaMove[] = []): Report {
  const r = checkAll(planQa(p), [...p.moves, ...extraMoves]);
  const more = [
    ...bandContrast(p),
    ...takes(p),
    ...typeSafe(p),
    ...typeOverUi(p),
    ...uiReadSize(p),
    ...music(p, grid),
    ...cues(p),
    ...wallCheck(p),
    ...smallPrint(p),
    ...readInFrame(p),
    ...typeOverPlanes(p),
    // added after the craft review (CR-15)
    ...groundCoverage(p),
    ...stoneCount(p),
    ...planesInFrame(p),
    ...legibleWords(p),
    ...hitSync(p),
    ...smallPrintHolds(p),
    ...askActClock(p),
    ...typeExits(p),
  ];
  const errors = [...r.errors, ...more.filter((x) => x.level === "error")];
  return {
    ...r,
    ok: errors.length === 0,
    errors,
    warnings: [...r.warnings, ...more.filter((x) => x.level === "warn")],
    infos: [...r.infos, ...more.filter((x) => x.level === "info")],
  };
}

/** The colour of the riverbed's mid ground under a grade (for the contrast checks). */
export const groundColor = (g: Grade) => gradeColor(hexToRgb(COLOR.riverbedMid), g, 0.5, true);
