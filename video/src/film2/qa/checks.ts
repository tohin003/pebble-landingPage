// The smoothness checks (TREATMENT §5.5), as code that runs over a timeline (qa/timeline.ts). Each check returns
// findings; checkAll() runs them all and says whether the timeline passes. Call it from a Bun test:
//
//   import { checkAll } from "../qa/checks";
//   test("my set piece is smooth", () => { const r = checkAll(myTimeline); expect(r.errors).toEqual([]); });
//
// The checks, each with the rule it enforces:
//   cutRate             at most 18 shot changes a minute in any act
//   holds               every line ≥ max(50 frames at 60 fps, 0.5 s + 0.3 s a word); key lines ≥ 2 s; the honest
//                       line ≥ 9 s; a promise and its limit together ≥ 2.5 s; UI shots ≥ 2 s; the word budget
//   readingLoad         at most 3.14 words a second in any shot (3.0 flags), film lines apportioned over their holds
//                       plus the UI words that must be read
//   velocityContinuity  a speed change of 30 px a frame² or less (at 60 fps) between frames, outside marked hits
//   cutAudit            at every hard cut, speeds within ±25 % and directions within 30°; no cut between two rests
//   blurAudit           applied σ ≥ 0.8 × travel ÷ 7 wherever travel exceeds the reading speed
//   deadFrames          no window of 1 s without change, outside waiting states inside takes (model; the pixel
//                       version is qa/luma.ts on a render)
//   flashes             light changes: at most one large luminance change a second; never more than three flashes
//                       a second (WCAG 2.3.1) (model; the pixel version is qa/luma.ts)
//   rings               one ring chapter in flight at a time; never over a line being read; never around a receipt
//   timing              every seam and move within its kind's frames (§5.1); light changes ≥ 30 frames; a swap
//                       happens while the frame is covered
//   kinds               which of the seven kinds appear (a film uses each more than once)
//   leaks               code light leaks at most twice
//   copy                the never-list on film lines (no "!", no middle dots, no hype words, no "first" or "only")
import { CAMERA, LIMITS, READING, TRANSITION, TRANSITION_KINDS, accel60, f60, speed60, type TransitionKind } from "../tokens";
import { screenVelocity, worldToFrame, type CamSample } from "../motion/camera";
import { blurForTravel, blurIsEnough } from "../motion/blur";
import { angleBetweenDeg, annulusHitsRect, farDistToRect, len, sub, type Rect, type Vec } from "../motion/geometry";
import { allRingStates, ringsInFlight } from "../carrier/ring";
import { checkLightCues, gradeAt, gradeLuminance } from "../light/grades";
import { readingLoad, requiredHoldFrames, wordCount, type TextEvent } from "../type/reading";
import { checkKindFrames } from "../transitions/kinds";
import type { FilmTimelineQa, QaShot } from "./timeline";

export type Level = "error" | "warn" | "info";
export interface Finding {
  check: string;
  level: Level;
  message: string;
  frame?: number;
}
export interface Report {
  name: string;
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
  infos: Finding[];
  metrics: Record<string, number | string>;
}

/** An in-shot move of one of the seven kinds (a push-in, a cascade, a light change, a recorded take, a ring move). */
export interface QaMove {
  kind: TransitionKind;
  at: number;
  frames: number;
  label?: string;
}

const unitOf = (t: FilmTimelineQa) => Math.min(t.width, t.height) / 1080;
const shotById = (t: FilmTimelineQa, id: string): QaShot | undefined => t.shots.find((s) => s.id === id);
export const shotAt = (t: FilmTimelineQa, frame: number): QaShot | undefined => t.shots.find((s) => frame >= s.from && frame < s.to);

const sampleOf = (shot: QaShot, frame: number): CamSample | null => (shot.camera ? shot.camera.sample(frame - shot.from) : null);

/** Screen velocity (px per frame) of the shot's focal point on a composition frame; zero for a still shot. */
export const focalVelocity = (t: FilmTimelineQa, shot: QaShot, frame: number): Vec => {
  const s = sampleOf(shot, frame);
  if (!s) return { x: 0, y: 0 };
  const p = shot.focal ?? { x: t.width / 2, y: t.height / 2 };
  return screenVelocity(s, p, t.width, t.height, shot.depth ?? 1);
};

const rectAt = (r: Rect | ((f: number) => Rect), f: number): Rect => (typeof r === "function" ? r(f) : r);
const inRanges = (f: number, rs?: readonly { from: number; to: number }[]) => !!rs?.some((r) => f >= r.from && f < r.to);

/* ---------------------------------------------------------------- the checks ---------------------------------- */

export function cutRate(t: FilmTimelineQa): { findings: Finding[]; perAct: Record<string, number> } {
  const acts = t.acts && t.acts.length ? t.acts : [{ id: "whole", from: 0, to: t.durationInFrames }];
  const findings: Finding[] = [];
  const perAct: Record<string, number> = {};
  for (const a of acts) {
    const changes = t.seams.filter((s) => s.at >= a.from && s.at < a.to).length;
    const minutes = (a.to - a.from) / t.fps / 60;
    const rate = minutes > 0 ? changes / minutes : 0;
    perAct[a.id] = Math.round(rate * 10) / 10;
    if (rate > LIMITS.maxShotChangesPerMinute + 1e-9) {
      findings.push({ check: "cutRate", level: "error", message: `act ${a.id}: ${changes} shot changes in ${(minutes * 60).toFixed(1)} s = ${rate.toFixed(1)} a minute (at most ${LIMITS.maxShotChangesPerMinute})`, frame: a.from });
    }
  }
  return { findings, perAct };
}

export function holds(t: FilmTimelineQa): Finding[] {
  const out: Finding[] = [];
  for (const x of t.texts) {
    const on = x.to - x.from;
    const req = requiredHoldFrames(wordCount(x.text), t.fps, { key: x.key, honest: x.honest, cascadeItem: x.cascadeItem });
    if (on < req) out.push({ check: "holds", level: "error", message: `"${x.text}" is on screen ${(on / t.fps).toFixed(2)} s; it needs ${(req / t.fps).toFixed(2)} s`, frame: x.from });
    if (x.pairWith) {
      const y = t.texts.find((z) => z.id === x.pairWith);
      if (!y) out.push({ check: "holds", level: "error", message: `"${x.text}" pairs with a line that is not in the timeline (${x.pairWith})`, frame: x.from });
      else {
        const together = Math.max(0, Math.min(x.to, y.to) - Math.max(x.from, y.from));
        if (together / t.fps < READING.pairMinS - 1e-9) out.push({ check: "holds", level: "error", message: `"${x.text}" and "${y.text}" are on screen together ${(together / t.fps).toFixed(2)} s (at least ${READING.pairMinS} s)`, frame: x.from });
      }
    }
  }
  for (const s of t.shots) {
    if (s.kind === "ui" && (s.to - s.from) / t.fps < LIMITS.uiShotMinS - 1e-9) {
      out.push({ check: "holds", level: "error", message: `UI shot ${s.id} lasts ${((s.to - s.from) / t.fps).toFixed(2)} s (UI shots hold at least ${LIMITS.uiShotMinS} s)`, frame: s.from });
    }
  }
  const budget = t.texts.filter((x) => (x.kind ?? "film") === "film").reduce((n, x) => n + wordCount(x.text), 0);
  if (budget > READING.wordBudget) out.push({ check: "holds", level: "error", message: `film lines carry ${budget} words (the budget is ${READING.wordBudget})` });
  return out;
}

export function readingLoads(t: FilmTimelineQa): { findings: Finding[]; max: number; perShot: Record<string, number> } {
  const findings: Finding[] = [];
  const perShot: Record<string, number> = {};
  let max = 0;
  const uiAsText: TextEvent[] = (t.readables ?? [])
    .filter((r) => (r.words ?? 0) > 0)
    .map((r) => ({ id: r.id, text: Array.from({ length: r.words! }, () => "w").join(" "), from: r.from, to: r.to, kind: "ui" as const }));
  const all = [...t.texts.filter((x) => !x.cascadeItem), ...uiAsText];
  for (const s of t.shots) {
    const load = readingLoad({ id: s.id, from: s.from, to: s.to }, all, t.fps);
    perShot[s.id] = Math.round(load * 100) / 100;
    max = Math.max(max, load);
    if (load > READING.maxWordsPerSecond + 1e-9) findings.push({ check: "readingLoad", level: "error", message: `shot ${s.id} asks for ${load.toFixed(2)} words a second (at most ${READING.maxWordsPerSecond})`, frame: s.from });
    else if (load > READING.flagWordsPerSecond + 1e-9) findings.push({ check: "readingLoad", level: "warn", message: `shot ${s.id} asks for ${load.toFixed(2)} words a second (flagged above ${READING.flagWordsPerSecond})`, frame: s.from });
  }
  return { findings, max, perShot };
}

export function velocityContinuity(t: FilmTimelineQa): { findings: Finding[]; maxAccel: number } {
  const limit = accel60(LIMITS.maxAccelPxPerFrame2At60, t.fps);
  const near = (f: number) => (t.hits ?? []).some((h) => Math.abs(f - h) <= 2);
  const findings: Finding[] = [];
  let maxAccel = 0;
  for (const s of t.shots) {
    if (!s.camera) continue;
    let worst = 0;
    let worstF = s.from;
    let count = 0;
    for (let f = s.from + 1; f < s.to; f++) {
      const a = len(sub(focalVelocity(t, s, f), focalVelocity(t, s, f - 1)));
      if (near(f)) continue;
      if (a > worst) {
        worst = a;
        worstF = f;
      }
      if (a > limit) count++;
    }
    maxAccel = Math.max(maxAccel, worst);
    if (count > 0) findings.push({ check: "velocityContinuity", level: "error", message: `shot ${s.id}: ${count} frames change speed by more than ${limit.toFixed(1)} px a frame² (worst ${worst.toFixed(1)} on frame ${worstF})`, frame: worstF });
  }
  return { findings, maxAccel };
}

export interface CutRecord {
  at: number;
  out: string;
  in: string;
  vOut: number;
  vIn: number;
  ratio: number;
  angle: number;
}

export function cutAudit(t: FilmTimelineQa): { findings: Finding[]; cuts: CutRecord[] } {
  const findings: Finding[] = [];
  const cuts: CutRecord[] = [];
  const rest = speed60(TRANSITION.momentum.restPxPerFrame, t.fps);
  for (const seam of t.seams) {
    const a = shotById(t, seam.out);
    const b = shotById(t, seam.in);
    if (!a || !b) {
      findings.push({ check: "cutAudit", level: "error", message: `seam at ${seam.at} names a shot that is not in the timeline (${seam.out} → ${seam.in})`, frame: seam.at });
      continue;
    }
    if (seam.frames > 0) {
      // a transition: its swap must happen while the frame is covered
      if (seam.swapAt !== undefined && seam.covered && !(seam.swapAt >= seam.covered.from && seam.swapAt < seam.covered.to)) {
        findings.push({ check: "cutAudit", level: "error", message: `seam at ${seam.at} (${seam.kind}) swaps on ${seam.swapAt}, outside its covered frames ${seam.covered.from}–${seam.covered.to}`, frame: seam.at });
      }
      continue;
    }
    if (seam.kind === "product") {
      findings.push({ check: "cutAudit", level: "info", message: `cut at ${seam.at} is carried by the product's own motion (as recorded)`, frame: seam.at });
      continue;
    }
    const vo = focalVelocity(t, a, seam.at - 1);
    const vi = focalVelocity(t, b, seam.at);
    const so = len(vo);
    const si = len(vi);
    const ratio = so > 1e-9 ? si / so : si > 1e-9 ? Infinity : 1;
    const angle = angleBetweenDeg(vo, vi);
    cuts.push({ at: seam.at, out: seam.out, in: seam.in, vOut: so, vIn: si, ratio, angle });
    if (so < rest && si < rest) {
      if (!seam.punctuation) findings.push({ check: "cutAudit", level: "error", message: `cut at ${seam.at} falls between two rests (${so.toFixed(1)} and ${si.toFixed(1)} px a frame)`, frame: seam.at });
      continue;
    }
    const tol = TRANSITION.momentum.speedTolerance;
    if (!(ratio >= 1 - tol && ratio <= 1 + tol)) findings.push({ check: "cutAudit", level: "error", message: `cut at ${seam.at}: speed ${so.toFixed(1)} → ${si.toFixed(1)} px a frame (×${ratio.toFixed(2)}; within ±${tol * 100} %)`, frame: seam.at });
    if (angle > TRANSITION.momentum.directionToleranceDeg) findings.push({ check: "cutAudit", level: "error", message: `cut at ${seam.at}: direction turns ${angle.toFixed(0)}° (within ${TRANSITION.momentum.directionToleranceDeg}°)`, frame: seam.at });
  }
  return { findings, cuts };
}

export function blurAudit(t: FilmTimelineQa): { findings: Finding[]; minRatio: number } {
  const findings: Finding[] = [];
  let minRatio = Infinity;
  const read = speed60(CAMERA.readMaxPxPerFrame, t.fps);
  for (const s of t.shots) {
    if (!s.camera) continue;
    let bad = 0;
    let first = -1;
    for (let f = s.from; f < s.to; f++) {
      const travel = len(focalVelocity(t, s, f));
      if (travel <= read) continue;
      const applied = s.appliedBlur ? s.appliedBlur(f) : blurForTravel(travel, t.fps);
      minRatio = Math.min(minRatio, applied / (travel / 7));
      if (!blurIsEnough(applied, travel, t.fps)) {
        bad++;
        if (first < 0) first = f;
      }
    }
    if (bad > 0) findings.push({ check: "blurAudit", level: "error", message: `shot ${s.id}: ${bad} frames carry less than 0.8 × travel ÷ 7 of blur (first on ${first})`, frame: first });
  }
  return { findings, minRatio: Number.isFinite(minRatio) ? minRatio : 1 };
}

/** Does anything change on this frame (the dead-frame model)? */
export const changesOn = (t: FilmTimelineQa, f: number): boolean => {
  const s = shotAt(t, f);
  if (s?.camera) {
    const v = focalVelocity(t, s, f);
    const samp = sampleOf(s, f)!;
    if (len(v) > 0.05 || Math.abs(samp.vel.lz) * Math.max(t.width, t.height) > 0.05) return true;
  }
  if (s?.activity?.(f)) return true;
  if (t.seams.some((x) => f >= x.at && f < x.at + Math.max(1, x.frames))) return true;
  for (const x of t.texts) {
    const enter = x.enterFrames ?? 12;
    if ((f >= x.from && f < x.from + enter) || (f >= x.to - 12 && f < x.to)) return true;
  }
  if (t.rings && allRingStates(t.rings, f, t.fps).some((r) => r.opacity > 0.01)) return true;
  if ((t.lightCues ?? []).some((c) => f >= c.at && f < c.at + c.frames)) return true;
  if ((t.leaks ?? []).some((c) => f >= c.at && f < c.at + c.frames)) return true;
  return false;
};

export function deadFrames(t: FilmTimelineQa): { findings: Finding[]; longestS: number } {
  const findings: Finding[] = [];
  const win = Math.round(LIMITS.deadWindowS * t.fps);
  let run = 0;
  let longest = 0;
  let start = 0;
  for (let f = 0; f < t.durationInFrames; f++) {
    const s = shotAt(t, f);
    const still = !changesOn(t, f) && !inRanges(f, s?.waits);
    if (still) {
      if (run === 0) start = f;
      run++;
      longest = Math.max(longest, run);
      if (run === win) findings.push({ check: "deadFrames", level: "error", message: `nothing changes for ${LIMITS.deadWindowS} s from frame ${start} (outside a waiting state)`, frame: start });
    } else run = 0;
  }
  return { findings, longestS: longest / t.fps };
}

export function flashes(t: FilmTimelineQa): { findings: Finding[]; maxChangesPerSecond: number; maxFlashesPerSecond: number } {
  const findings: Finding[] = [];
  if (!t.lightInitial) return { findings, maxChangesPerSecond: 0, maxFlashesPerSecond: 0 };
  const cues = t.lightCues ?? [];
  findings.push(...checkLightCues(cues, t.fps).map((m) => ({ check: "flashes", level: "error" as const, message: m })));
  const L: number[] = [];
  for (let f = 0; f < t.durationInFrames; f++) L.push(gradeLuminance(gradeAt(f, t.lightInitial, cues)));
  // large changes: a monotonic run that moves the luminance by ≥ 0.1 with its darker end below 0.8
  const changes: { frame: number; dir: number }[] = [];
  let runStart = 0;
  let dir = 0;
  for (let f = 1; f < L.length; f++) {
    const d = Math.sign(L[f]! - L[f - 1]!);
    if (d !== 0 && d !== dir) {
      runStart = f - 1;
      dir = d;
    }
    if (dir !== 0 && Math.abs(L[f]! - L[runStart]!) >= LIMITS.flashDeltaL && Math.min(L[f]!, L[runStart]!) < LIMITS.flashDarkerBelow) {
      changes.push({ frame: f, dir });
      runStart = f;
    }
  }
  let maxC = 0;
  let maxF = 0;
  for (let f = 0; f < L.length; f++) {
    const inWin = changes.filter((c) => c.frame >= f && c.frame < f + t.fps);
    maxC = Math.max(maxC, inWin.length);
    let pairs = 0;
    for (let i = 1; i < inWin.length; i++) if (inWin[i]!.dir !== inWin[i - 1]!.dir) pairs++;
    maxF = Math.max(maxF, pairs);
  }
  if (maxC > TRANSITION.light.maxLargeChangesPerSecond) findings.push({ check: "flashes", level: "error", message: `${maxC} large luminance changes within one second (the film allows ${TRANSITION.light.maxLargeChangesPerSecond})` });
  if (maxF > LIMITS.wcagFlashesPerSecond) findings.push({ check: "flashes", level: "error", message: `${maxF} flashes within one second (WCAG 2.3.1 allows ${LIMITS.wcagFlashesPerSecond})` });
  return { findings, maxChangesPerSecond: maxC, maxFlashesPerSecond: maxF };
}

export function rings(t: FilmTimelineQa): { findings: Finding[]; overlaps: number } {
  const findings: Finding[] = [];
  if (!t.rings || t.rings.length === 0) return { findings, overlaps: 0 };
  if (!t.ringPose) {
    findings.push({ check: "rings", level: "error", message: "the timeline has rings but no ringPose: their overlap with readable text cannot be checked" });
    return { findings, overlaps: 0 };
  }
  const unit = unitOf(t);
  const margin = 6 * unit;
  let overlaps = 0;
  let flightReported = false;
  const reported = new Set<string>();
  for (let f = 0; f < t.durationInFrames; f++) {
    if (!flightReported && ringsInFlight(t.rings, f) > 1) {
      findings.push({ check: "rings", level: "error", message: `${ringsInFlight(t.rings, f)} ring chapters in flight on frame ${f} (one at a time)`, frame: f });
      flightReported = true;
    }
    const pose = t.ringPose(f);
    const states = allRingStates(t.rings, f, t.fps).filter((r) => r.opacity > 0.05);
    if (states.length === 0) continue;
    // film lines being read (entrance done, exit not begun), and UI being read for rings drawn in front
    const lines = t.texts.filter((x) => x.rect && f >= x.from + (x.enterFrames ?? 0) && f < x.to);
    const uis = (t.readables ?? []).filter((r) => f >= r.from && f < r.to);
    for (const r of states) {
      const c = worldToFrame(r.c, pose, t.width, t.height);
      const R = r.r * pose.zoom;
      const w = r.widthPx * unit;
      for (const x of lines) {
        const rect = rectAt(x.rect!, f);
        if (annulusHitsRect(c, R, w, rect, margin)) {
          overlaps++;
          const key = `${r.id}:${x.id}`;
          if (!reported.has(key)) {
            reported.add(key);
            findings.push({ check: "rings", level: "error", message: `ring ${r.id} crosses the line "${x.text}" while it is read (frame ${f})`, frame: f });
          }
        }
      }
      for (const u of uis) {
        const rect = rectAt(u.rect, f);
        if (r.layer === "front" && annulusHitsRect(c, R, w, rect, margin)) {
          overlaps++;
          const key = `${r.id}:${u.id}`;
          if (!reported.has(key)) {
            reported.add(key);
            findings.push({ check: "rings", level: "error", message: `ring ${r.id} (drawn in front) crosses readable UI ${u.id} (frame ${f})`, frame: f });
          }
        }
        if (u.receipt && (r.phase === "frame" || r.phase === "hold") && farDistToRect(c, rect) <= R) {
          const key = `${r.id}:receipt:${u.id}`;
          if (!reported.has(key)) {
            reported.add(key);
            findings.push({ check: "rings", level: "error", message: `ring ${r.id} is drawn around the receipt ${u.id} (frame ${f}): never`, frame: f });
          }
        }
      }
    }
  }
  return { findings, overlaps };
}

export function timing(t: FilmTimelineQa, moves: readonly QaMove[]): Finding[] {
  const out: Finding[] = [];
  for (const s of t.seams) if (s.frames > 0) out.push(...checkKindFrames(s.kind, s.frames, t.fps, `seam at ${s.at}`).map((m) => ({ check: "timing", level: "error" as const, message: m, frame: s.at })));
  for (const m of moves) out.push(...checkKindFrames(m.kind, m.frames, t.fps, m.label ?? `${m.kind} at ${m.at}`).map((msg) => ({ check: "timing", level: "error" as const, message: msg, frame: m.at })));
  return out;
}

export function kinds(t: FilmTimelineQa, moves: readonly QaMove[]): { findings: Finding[]; counts: Record<TransitionKind, number> } {
  const counts = Object.fromEntries(TRANSITION_KINDS.map((k) => [k, 0])) as Record<TransitionKind, number>;
  for (const s of t.seams) counts[s.kind]++;
  for (const m of moves) counts[m.kind]++;
  for (const c of t.lightCues ?? []) if (!moves.some((m) => m.kind === "light" && m.at === c.at)) counts.light++;
  const findings: Finding[] = [];
  for (const k of TRANSITION_KINDS) {
    if (counts[k] === 0) findings.push({ check: "kinds", level: t.isFilm ? "warn" : "info", message: `kind "${k}" is not used` });
    else if (t.isFilm && counts[k] < 2) findings.push({ check: "kinds", level: "warn", message: `kind "${k}" is used once (each kind more than once, §5.1)` });
  }
  return { findings, counts };
}

export function leaks(t: FilmTimelineQa): Finding[] {
  const n = (t.leaks ?? []).length;
  return n > 2 ? [{ check: "leaks", level: "warn", message: `${n} light leaks (at most once or twice, and only where light motivates it)` }] : [];
}

const NEVER = [
  /\bmagic\b/i,
  /\bseamless(ly)?\b/i,
  /\brevolutionary\b/i,
  /\bsecure\b/i,
  /\bprivate by design\b/i,
  /\bundetectable\b/i,
  /\binvisible\b/i,
  /\bbeats?\b/i,
  /\bfirst\b/i,
  /\bonly\b/i,
  /\bunique\b/i,
  /\bcontext warping\b/i,
  /\bnever takes focus\b/i,
];

export function copy(t: FilmTimelineQa): Finding[] {
  const out: Finding[] = [];
  for (const x of t.texts) {
    if ((x.kind ?? "film") === "ui") continue;
    if (/!/.test(x.text)) out.push({ check: "copy", level: "error", message: `"${x.text}": no exclamation marks`, frame: x.from });
    if (/·/.test(x.text) && x.kind !== "cascade") out.push({ check: "copy", level: "error", message: `"${x.text}": no middle dots in film type`, frame: x.from });
    for (const re of NEVER) if (re.test(x.text)) out.push({ check: "copy", level: "error", message: `"${x.text}": "${x.text.match(re)![0]}" is on the never-list`, frame: x.from });
    for (const w of x.text.split(/\s+/)) if (/^[A-Z]{4,}[.,]?$/.test(w)) out.push({ check: "copy", level: "error", message: `"${x.text}": no all caps ("${w}")`, frame: x.from });
    if (/\p{Extended_Pictographic}/u.test(x.text)) out.push({ check: "copy", level: "error", message: `"${x.text}": no emoji`, frame: x.from });
  }
  return out;
}

/* ---------------------------------------------------------------- everything ----------------------------------- */

export function checkAll(t: FilmTimelineQa, moves: readonly QaMove[] = []): Report {
  const all: Finding[] = [];
  const metrics: Record<string, number | string> = {
    durationS: Math.round((t.durationInFrames / t.fps) * 100) / 100,
    fps: t.fps,
    shots: t.shots.length,
    seams: t.seams.length,
  };
  // the shots tile the timeline, in order, with no gaps or overlaps
  const sorted = [...t.shots].sort((a, b) => a.from - b.from);
  sorted.forEach((s, i) => {
    if (i === 0 && s.from !== 0) all.push({ check: "structure", level: "error", message: `the first shot starts on ${s.from}, not 0` });
    const next = sorted[i + 1];
    if (next && next.from !== s.to) all.push({ check: "structure", level: "error", message: `shots ${s.id} and ${next.id} leave a gap or overlap (${s.to} → ${next.from})` });
    if (!next && s.to !== t.durationInFrames) all.push({ check: "structure", level: "error", message: `the last shot ends on ${s.to}, not ${t.durationInFrames}` });
  });
  const cr = cutRate(t);
  all.push(...cr.findings);
  for (const [k, v] of Object.entries(cr.perAct)) metrics[`cutsPerMinute.${k}`] = v;
  all.push(...holds(t));
  const rl = readingLoads(t);
  all.push(...rl.findings);
  metrics.maxReadingLoad = Math.round(rl.max * 100) / 100;
  const vc = velocityContinuity(t);
  all.push(...vc.findings);
  metrics.maxAccelPxPerFrame2 = Math.round(vc.maxAccel * 100) / 100;
  metrics.accelLimit = Math.round(accel60(LIMITS.maxAccelPxPerFrame2At60, t.fps) * 100) / 100;
  const ca = cutAudit(t);
  all.push(...ca.findings);
  metrics.hardCuts = ca.cuts.length;
  if (ca.cuts.length) {
    metrics.worstCutSpeedRatio = Math.round(Math.max(...ca.cuts.map((c) => Math.abs(Math.log(c.ratio)))) * 1000) / 1000;
    metrics.worstCutAngleDeg = Math.round(Math.max(...ca.cuts.map((c) => c.angle)) * 10) / 10;
  }
  const ba = blurAudit(t);
  all.push(...ba.findings);
  metrics.minBlurRatio = Math.round(ba.minRatio * 1000) / 1000;
  const df = deadFrames(t);
  all.push(...df.findings);
  metrics.longestStillS = Math.round(df.longestS * 100) / 100;
  const fl = flashes(t);
  all.push(...fl.findings);
  metrics.maxLargeLightChangesPerSecond = fl.maxChangesPerSecond;
  metrics.maxFlashesPerSecond = fl.maxFlashesPerSecond;
  const rg = rings(t);
  all.push(...rg.findings);
  metrics.ringOverlapFrames = rg.overlaps;
  all.push(...timing(t, moves));
  const kd = kinds(t, moves);
  all.push(...kd.findings);
  for (const [k, v] of Object.entries(kd.counts)) metrics[`kind.${k}`] = v;
  all.push(...leaks(t));
  all.push(...copy(t));
  metrics.lightLeaks = (t.leaks ?? []).length;
  metrics.frameRateNote = t.fps === 60 ? "60 fps (TREATMENT reference)" : `${t.fps} fps (limits converted from 60)`;
  const errors = all.filter((x) => x.level === "error");
  return { name: t.name, ok: errors.length === 0, errors, warnings: all.filter((x) => x.level === "warn"), infos: all.filter((x) => x.level === "info"), metrics };
}

/** A readable summary of a report (for the CLI and test failures). */
export const formatReport = (r: Report): string => {
  const lines = [`${r.name}: ${r.ok ? "PASS" : "FAIL"} (${r.errors.length} errors, ${r.warnings.length} warnings)`];
  for (const [k, v] of Object.entries(r.metrics)) lines.push(`  ${k}: ${v}`);
  for (const e of r.errors) lines.push(`  ERROR [${e.check}] ${e.message}`);
  for (const w of r.warnings) lines.push(`  warn  [${w.check}] ${w.message}`);
  for (const i of r.infos) lines.push(`  info  [${i.check}] ${i.message}`);
  return lines.join("\n");
};

/** f60 re-exported for timelines written in 60 fps numbers. */
export { f60 };
