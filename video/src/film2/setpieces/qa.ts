// The set pieces' checks: a plan becomes the foundation's FilmTimelineQa (so every smoothness check in qa/checks.ts runs
// on it unchanged), plus the checks only set pieces need:
//   bandContrast     the Drop's aperture bands against the picture's edge, at least 3:1 (lead ruling §52)
//   takes            every take at 1×: in-point, length, and every shown span equal to its real span (§3.6)
//   typeSafe         every film line inside the frame, 60 px (at 1080) from every edge (§3.12)
//   typeOverUi       film type never over UI the viewer reads (§5.2 "never over the UI's own text")
//   uiReadSize       UI text a viewer must read is at least 28 px at 1080 while it is read (§5.3)
//   music            every placed event sits on a point of its level, and nothing waited a negative time
//   cues             the stone's cue lists pass the engine's own checkCues (D6)
// Pure; no React. setpieces/tests run checkPlan() on every piece, every aspect and many music grids.
import { CAMERA, COLOR } from "../tokens";
import { checkAll, type Finding, type QaMove, type Report } from "../qa/checks";
import type { FilmTimelineQa, QaReadable, QaShot } from "../qa/timeline";
import { GRADES, gradeColor, gradeLuminance, hexToRgb, relLuminance, type Grade } from "../light/grades";
import { rectsIntersect, type Rect } from "../motion/geometry";
import type { TextEvent } from "../type/reading";
import { cascadeSchedule } from "../type/Cascade";
import { checkCues } from "../../../../shared/pebble/cues";
import { insideFrame, lineRect, rectInFrame } from "./frame";
import { typeEvent } from "./kit";
import { onGrid, pointsOf, type MusicGrid } from "./music";
import { STEALTH_FEATURES, shownSize } from "./standins";
import { cellTextPx } from "./wall";
import { checkTakeUse, sourceFrameAt, stillsAt } from "./take";
import type { PlaneSpec, ScenePlan, ShotSpec } from "./scene";

const at = (p: ScenePlan, s: ShotSpec, fr: number) => s.camera.pose(fr - s.from);

/** Where a plane's rect (or its read rect) is in the frame on a local frame. */
export const planeRectAt = (p: ScenePlan, s: ShotSpec, pl: PlaneSpec, fr: number, r: Rect = pl.rect): Rect => rectInFrame(r, at(p, s, fr), p.frame);

const visible = (pl: PlaneSpec, fr: number) => fr >= (pl.from ?? -Infinity) && fr < (pl.to ?? Infinity);

/** Is anything other than the camera changing on a frame of this shot (a take plays, a still swaps, a place lifts)? */
const activityOf = (p: ScenePlan, s: ShotSpec) => (fr: number): boolean => {
  for (const pl of s.planes) {
    if (!visible(pl, fr)) continue;
    if (pl.enterAt !== undefined && fr >= pl.enterAt && fr < pl.enterAt + 24) return true;
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

/** The wall: no Stealth cell, ever; and the cells are seen, not read (their text far under the 28 px floor). */
export function wallCheck(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  for (const s of p.shots) {
    if (!s.wall) continue;
    for (const c of s.wall.cells) if ((STEALTH_FEATURES as readonly string[]).includes(c.feature)) out.push({ check: "wall", level: "error", message: `cell ${c.id} shows Stealth Lockdown (${c.feature}): the wall never does` });
    let worst = 0;
    for (let fr = s.from; fr < s.to; fr += 6) {
      const z = at(p, s, fr).zoom;
      for (const c of s.wall.cells) worst = Math.max(worst, cellTextPx(c, z, p.frame));
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

/** Every check: the foundation's, then the set pieces'. */
export function checkPlan(p: ScenePlan, grid?: MusicGrid, extraMoves: readonly QaMove[] = []): Report {
  const r = checkAll(planQa(p), [...p.moves, ...extraMoves]);
  const more = [...bandContrast(p), ...takes(p), ...typeSafe(p), ...typeOverUi(p), ...uiReadSize(p), ...music(p, grid), ...cues(p), ...wallCheck(p), ...smallPrint(p)];
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
