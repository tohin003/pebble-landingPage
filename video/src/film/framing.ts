// The trailer's stages and cameras (the blueprint §6.4–§6.6), as pure arithmetic over the measured UI (film/ui.ts) and
// the beat map: the glimpses on the night field (bars 3, 5, 7) and the window world (the montage, bars 15–20, and the
// climax, bars 21–25). The scenes, the pointer-driven gaze cues (film/gaze.ts) and the checks all read this module.
//
// A FRAMING is the region of the captured window a stage shows: its magnification m (frame px per CSS px at the
// aspect's reference size) and its centre (cx, cy). Each one is written as the visible rect it produces (fit()), and
// checkFraming() holds every frame to the rules:
// - the visible rect never leaves the captured window (a still's own size, or the recording's 1160 × 800);
// - no usage line (each shows a cached count and a rate, OVERRIDES §42) and no "Action completed" toast is ever inside
//   it while the recording shows it;
// - across source 675–677 (f1725–1727), where the drawer's cards jump, its bottom stays above the live response;
// - every click target sits at least 60 px inside the frame and above the aspect's caption band.
import type { CamKey, CamPose, Point, Rect } from "../motion/camera";
import { cameraAt } from "../motion/camera";
import { EASE, cursorPathAt, type CursorKey, type Ease } from "../motion/spec";
import { STAR_PAN } from "./desk";
import { ASPECT_IDS, SOURCE_MAPS, sourceFrameAt, validateTimeline, type Aspect, type CameraMove, type PerAspect } from "./timeline";
import { CHALLENGE, PERMS_150, RUN, SETTINGS, TOASTS, centreOf, type Rect as UiRect } from "./ui";
import usage from "./usage-lines.json";

/** The usage line's boxes on a source frame of the held run (usage-lines.json, from the recording's probes). */
export function usageBoxes(src: number): UiRect[] {
  const run = (usage.light as unknown as [number, number, number[][]][]).find(([a, b]) => src >= a && src <= b);
  return run ? run[2].map(([x, y, w, h]) => ({ x: x!, y: y!, w: w!, h: h! })) : [];
}

export interface Framing {
  m: number;
  cx: number;
  cy: number;
}
/** A framing on a stage of w × h px by its magnification and its visible rect's left and top edges (CSS px). */
export const fit = (stage: { w: number; h: number }, m: number, left: number, top: number): Framing => ({ m, cx: left + stage.w / 2 / m, cy: top + stage.h / 2 / m });
/** The visible rect (CSS px) of a pose on a stage of w × h px. */
export const visibleRect = (p: CamPose, stage: { w: number; h: number }): Rect => ({ x: p.x - stage.w / 2 / p.zoom, y: p.y - stage.h / 2 / p.zoom, w: stage.w / p.zoom, h: stage.h / p.zoom });
export const pose = (f: Framing, s: number): CamPose => ({ x: f.cx, y: f.cy, zoom: f.m * s });
const key = (at: number, f: Framing, s: number, dur = 1, ease: Ease = EASE.camera): CamKey => ({ at, x: f.cx, y: f.cy, zoom: f.m * s, dur, path: "direct", ease });

/** Which stage corners are rounded (the others bleed off the frame). */
export type Corners = "left" | "all" | "topLeft";
export interface Stage extends Rect {
  corners: Corners;
}

/* ================================================================================================================
 * The glimpses (bars 3, 5, 7): a hairline-framed moment of Pebble's dark-theme window on the night field, centred in
 * each aspect's band; the UI that matters at ≥ 28 px (16:9) and ≥ 34 px (1:1, 9:16)
 * ============================================================================================================== */

export type GlimpseId = "G1" | "G2" | "G3";
export interface Glimpse {
  stage: PerAspect<Stage>;
  framing: PerAspect<Framing>;
  /** a slow push: the framing scales k → kEnd about this point (CSS px) over the glimpse */
  push?: { about: Point; kEnd: number };
  /** the card the camera locks on (G2: the applied card, as the drawer's live response moves it) */
  track?: "datesCard";
  /** [ramp in from, ramp in to] and, if it ends early, [ramp out from, to] (6-frame luminance ramps) */
  rampIn: readonly [number, number];
  rampOut?: readonly [number, number];
  map: "g1" | "g2" | "g3";
}
const g = (x: number, y: number, w: number, h: number): Stage => ({ x, y, w, h, corners: "all" });
export const GLIMPSES: Record<GlimpseId, Glimpse> = {
  /** Glimpse 1, "the change": the dates.py card's diff (its clamp lines) and Don't allow / Apply edit; the pointer
   *  presses Apply edit on f198 and the glimpse ramps out with the press (the card leaves on the click frame). */
  G1: {
    stage: { wide: g(548, 72, 824, 836), square: g(40, 168, 1000, 744), vertical: g(40, 560, 1000, 860) },
    framing: { wide: fit({ w: 824, h: 836 }, 2.34, 808, 354), square: fit({ w: 1000, h: 744 }, 2.85, 808, 452), vertical: fit({ w: 1000, h: 860 }, 2.85, 808, 410) },
    push: { about: { x: 980, y: 640 }, kEnd: 1.04 },
    rampIn: [140, 146],
    rampOut: [198, 204],
    map: "g1",
  },
  /** Glimpse 2, "the undo": the applied card (Done, Undo this edit), the camera locked on it as the drawer's live
   *  response moves it (retake 2b's track), so it stays whole in frame; the focus settles on Undo this edit. */
  G2: {
    stage: { wide: g(432, 177, 1056, 746), square: g(40, 191, 1000, 698), vertical: g(40, 611, 1000, 698) },
    framing: { wide: fit({ w: 1056, h: 746 }, 3.05, 811, 0), square: fit({ w: 1000, h: 698 }, 2.85, 808, 0), vertical: fit({ w: 1000, h: 698 }, 2.85, 808, 0) },
    track: "datesCard",
    rampIn: [284, 290],
    map: "g2",
  },
  /** Glimpse 3, "the hold": the drawer's top, where "Pebble's change isn't verified yet." and its choices arrive on
   *  f445 (before it: "Pebble is working on this." and the live response); the conversation, whose held block arrives
   *  with the person's scroll and the usage line, stays out of frame. */
  G3: {
    stage: { wide: g(432, 162, 1056, 756), square: g(40, 201, 1000, 678), vertical: g(40, 621, 1000, 678) },
    framing: { wide: fit({ w: 1056, h: 756 }, 3.18, 812, 98), square: fit({ w: 1000, h: 678 }, 2.85, 808, 98), vertical: fit({ w: 1000, h: 678 }, 2.85, 808, 98) },
    rampIn: [428, 434],
    map: "g3",
  },
};
/** The glimpse on screen at `frame` (from its ramp-in to the frame before the next bar line's card). */
export const glimpseAt = (frame: number): GlimpseId | null =>
  frame >= 140 && frame < 216 ? "G1" : frame >= 284 && frame < 360 ? "G2" : frame >= 428 && frame < 504 ? "G3" : null;

/** The applied dates card's top (CSS y) on a source frame (retake 2b's track: it holds between the listed frames). */
export function datesCardTop(src: number): number {
  let y = RUN.datesCardTrack[0]![1];
  for (const [f, top] of RUN.datesCardTrack) if (src >= f) y = top;
  return y;
}

/** The glimpse camera on `frame` at layout scale `s`. */
export function glimpsePose(id: GlimpseId, a: Aspect, s: number, frame: number): CamPose {
  const gl = GLIMPSES[id];
  const st = gl.stage[a];
  const f = gl.framing[a];
  let p = pose(f, s);
  if (gl.track === "datesCard") {
    const src = sourceFrameAt(SOURCE_MAPS[gl.map], frame) ?? 324;
    // the visible rect: 12 css px above the card (EARLIER ACTIONS ends 13 px above it), the card, and what's left below
    const top = datesCardTop(src) - 12;
    p = { ...p, y: top + st.h / 2 / (f.m * 1) / 1 };
    p = { x: p.x, y: top + st.h / 2 / f.m, zoom: f.m * s };
  }
  if (gl.push) {
    const span = gl.rampOut ? [gl.rampIn[0], gl.rampOut[0]] : [gl.rampIn[0], gl.rampIn[0] + 76];
    const u = Math.min(1, Math.max(0, (frame - span[0]!) / (span[1]! - span[0]!)));
    const k = 1 + (gl.push.kEnd - 1) * EASE.move(u);
    const P = gl.push.about;
    p = { x: P.x - (P.x - p.x) / k, y: P.y - (P.y - p.y) / k, zoom: p.zoom * k };
  }
  return p;
}

/* ================================================================================================================
 * The window world (bars 15–25): the text column (16:9) or band (1:1, 9:16) and the stage, a hairline-framed moment
 * on the paper ground. Every stage ends above its aspect's caption band, so nothing in it is ever under a caption.
 * ============================================================================================================== */

export const WIN_STAGE: PerAspect<Stage> = {
  wide: { x: 920, y: 64, w: 1000, h: 854, corners: "left" },
  square: { x: 24, y: 336, w: 1056, h: 582, corners: "left" },
  vertical: { x: 24, y: 700, w: 1056, h: 744, corners: "left" },
};
const W = WIN_STAGE.wide;
const Q = WIN_STAGE.square;
const V = WIN_STAGE.vertical;
const per3 = <T,>(wide: T, square: T, vertical: T): PerAspect<T> => ({ wide, square, vertical });

/** The window world's framings, each per aspect (see the module comment; numbers are fit()'s m, left, top). */
export const WIN: Record<string, PerAspect<Framing>> = {
  // The edges, measured on each capture's ink rows and columns: the top and bottom edges fall between lines; a side
  // edge never cuts into a line's start, never slices a control, and lets a line run off the right edge only where
  // §2's floor (the UI text a viewer must read at ≥ 28 px in 16:9 and ≥ 34 px in 1:1 and 9:16) leaves no room for it
  // (v2's held block, FILM_SPEC §6 S5c); where 16:9 can show a moment whole at about v2's m 2.0, it does.
  /** M1 views: the "Lisbon trip budget" canvas (main-dashboard@3x), then the chart panel: its heading (ink from 438.7)
   *  and its bars, the right edge between two categories' bars */
  m1Canvas: per3(fit(W, 1.255, 643.2, 70), fit(Q, 1.325, 643, 66), fit(V, 1.325, 643, 66)),
  m1Chart: per3(fit(W, 2.0, 670, 408), fit(Q, 1.85, 670, 420), fit(V, 1.72, 670, 404)),
  /** M2 your model: YOUR MODELS, the model row and the three ways in (settings-models@3x): 16:9 with the notes under
   *  them whole; 1:1 and 9:16 at 36 px, the ways in whole, the row's text whole (its bin past the right edge) */
  m2: per3(fit(W, 2.083, 339, 190), fit(Q, 2.7, 340, 197), fit(V, 2.7, 340, 145)),
  /** M3 memory: the records and their bins (settings-memory@3x); the bin's click 60 px inside the frame */
  m3: per3(fit(W, 2.025, 342, 330), fit(Q, 2.12, 330, 468), fit(V, 2.05, 323, 378)),
  /** M4 permissions (1.5.0): the modes' cards (16:9 all three whole, at v2's m 2.0; 1:1 and 9:16 Ask for approval and
   *  Auto in project at 36 px, their titles whole); after the click the focus settles on Auto's card (WindowWorld),
   *  and in 1:1 and 9:16 the camera punches in on it (the radio whole). 16:9 keeps its framing: closer, with Auto's
   *  lines whole, its tall stage takes in the paragraph under the cards (ink 345–806) cut at a side. */
  m4: per3(fit(W, 1.96, 324, 196), fit(Q, 2.8, 340, 221), fit(V, 2.8, 340, 221)),
  m4Auto: per3(fit(W, 1.96, 324, 196), fit(Q, 3.0, 354, 326), fit(V, 3.0, 354, 332)),
  /** M5 your tests stay yours: the waiting test-file card (main-live-film-150 at 9.50 s), pushing in on its lead */
  m5: per3(fit(W, 2.84, 808, 205), fit(Q, 3.0, 808, 214), fit(V, 3.0, 808, 210)),
  m5Lead: per3(fit(W, 3.1, 815, 214), fit(Q, 3.2, 814, 222), fit(V, 3.2, 814, 220)),
  /** M6 the scope challenge: the refused (red) step and its details, locked on the step through the person's scroll
   *  (251 px). "AgentGuard — evidence check" and "5 file(s) changed that the task does not reach" (12 px) at the floor;
   *  every line starts whole, the steps' times and Pause stay wholly past the right edge, the details' longest lines
   *  run off it */
  m6: per3(fit(W, 2.33, 650, 425), fit(Q, 2.72, 649, 520), fit(V, 2.72, 649, 520)),
  /** C1 the held run: the drawer's held state (from f1440), then the conversation's held block (from f1494) */
  c1Drawer: per3(fit(W, 2.84, 808, 98), fit(Q, 3.0, 808, 104), fit(V, 3.0, 808, 100)),
  c1Held: per3(fit(W, 3.4, 243, 432), fit(Q, 3.6, 244, 440), fit(V, 3.6, 244, 436)),
  /** C2 the "Run isolated tests" card: its upper part, then the tilt to Run tests */
  c2Top: per3(fit(W, 2.84, 808, 180), fit(Q, 3.0, 808, 206), fit(V, 3.0, 808, 206)),
  c2Click: per3(fit(W, 2.84, 808, 260), fit(Q, 3.0, 808, 380), fit(V, 3.0, 808, 340)),
  /** C3 the card reading Running, where the person's scroll puts it (and the Result scrolls into it) */
  c3: per3(fit(W, 2.84, 808, 440), fit(Q, 3.0, 808, 444), fit(V, 3.0, 808, 444)),
  /** C4 the newest steps, Verified at the bottom, above the drawer's "Done." and its jumping cards */
  c4: per3(fit(W, 2.81, 804, 136.5), fit(Q, 3.0, 808, 227), fit(V, 3.15, 808, 202.7)),
  /** C5 the final reply (its last paragraph's ink ends at 492.7; the usage line's starts at 510) */
  c5: per3(fit(W, 1.9, 243, 52), fit(Q, 2.21, 289, 242), fit(V, 2.0, 243, 129)),
};

/**
 * The window world's camera keys (f1008–1799). A one-frame key is a cut. Moves: f1034–1058 into the chart (its fastest
 * frame f1046, under the whoosh's peak); f1266–1290
 * the punch-in on Auto's words (1:1 and 9:16); f1300–1366 the slow push on the test-file card's lead; f1554–1577 the
 * tilt to Run tests; f1586–1606 down to where the Running card settles; f1698–1716 up to the steps, with the person's
 * scroll; and f1760–1783 the pull-back to the final reply (EASE.ramp), after Verified's 36 frames. Nothing moves in the
 * breath before the tests pass (f1647–1655) or while Verified is held (f1723–1758). A move whose framing is the one
 * already on screen is left out (16:9's M4).
 */
export function windowKeys(a: Aspect, s: number): CamKey[] {
  const F = (n: string) => WIN[n]![a];
  const same = (k: CamKey, j: CamKey) => k.x === j.x && k.y === j.y && k.zoom === j.zoom;
  return [
    key(1008, F("m1Canvas"), s),
    key(1058, F("m1Chart"), s, 24),
    key(1080, F("m2"), s),
    key(1152, F("m3"), s),
    key(1224, F("m4"), s),
    key(1290, F("m4Auto"), s, 24),
    key(1296, F("m5"), s),
    key(1366, F("m5Lead"), s, 66, EASE.move),
    key(1368, F("m6"), s),
    key(1440, F("c1Drawer"), s),
    key(1494, F("c1Held"), s),
    key(1516, F("c2Top"), s),
    key(1577, F("c2Click"), s, 23),
    key(1606, F("c3"), s, 20),
    key(1716, F("c4"), s, 18),
    key(1783, F("c5"), s, 23, EASE.ramp),
  ].filter((k, i, all) => i === 0 || (k.dur ?? 1) === 1 || !same(k, all[i - 1]!));
}
/** Frames where the stage's picture is cut: no motion blur there. */
export const STAGE_CUTS: readonly number[] = [1008, 1080, 1152, 1224, 1296, 1368, 1440, 1494, 1516];

/** The scope challenge's refused row (CSS y) on a source frame: the person's scroll 282–297 (probes.json). */
const CHALLENGE_ROW_Y: readonly (readonly [number, number])[] = [
  [282, 521.2], [283, 519.2], [284, 512.2], [285, 501.2], [286, 485.2], [287, 465.2], [288, 441.2], [289, 412.2], [290, 412.2],
  [291, 379.2], [292, 350.2], [293, 305.2], [294, 290.2], [295, 279.2], [296, 272.2], [297, 270.2],
];
export function challengeRowY(src: number): number {
  let y = 521.2;
  for (const [f, v] of CHALLENGE_ROW_Y) if (src >= f) y = v;
  return y;
}

/** The window world's camera on `frame` (with M6 locked on the refused step through the person's scroll). */
export function stagePoseAt(frame: number, a: Aspect, s: number, fps: number): CamPose {
  const st = WIN_STAGE[a];
  const base = cameraAt(frame, windowKeys(a, s), fps, st.w * s);
  if (frame >= 1368 && frame < 1440) {
    const src = sourceFrameAt(SOURCE_MAPS.m6, frame) ?? 252;
    return { ...base, y: base.y + (challengeRowY(src) - CHALLENGE.row.y) };
  }
  return base;
}

/* ================================================================================================================
 * Pointers (stage-local frame px, never riding the camera: a match cut keeps the pointer where it clicked)
 * ============================================================================================================== */

export interface PointerSpan {
  id: string;
  keys: readonly CursorKey[];
  clicks: readonly number[];
  visible: readonly [number, number];
}
/** A UI point's stage-local frame position under a framing on a stage. */
export function framePoint(p: Point, f: Framing, stage: { w: number; h: number }, s: number): Point {
  return { x: (stage.w * s) / 2 + (p.x - f.cx) * f.m * s, y: (stage.h * s) / 2 + (p.y - f.cy) * f.m * s };
}
const aim = (p: Point, dx = -3, dy = 2): Point => ({ x: p.x + dx, y: p.y + dy });
const off = (p: Point, dx: number, dy: number, s: number): Point => ({ x: p.x + dx * s, y: p.y + dy * s });

/** Glimpse 1's pointer: in from the stage's lower right, on Apply edit by f190, the press on f198 (it fades with the
 *  glimpse's ramp-out). */
export function glimpsePointer(a: Aspect, s: number): PointerSpan {
  const gl = GLIMPSES.G1;
  const st = gl.stage[a];
  const target = framePoint(aim(centreOf(RUN.applyEdit.rect)), gl.framing[a], st, s);
  // the push moves the button a little by f198: aim where it is then
  const k = 1 + (gl.push!.kEnd - 1) * EASE.move((198 - gl.rampIn[0]) / (gl.rampOut![0] - gl.rampIn[0]));
  const P = framePoint(gl.push!.about, gl.framing[a], st, s);
  const t = { x: P.x + (target.x - P.x) * k, y: P.y + (target.y - P.y) * k };
  return {
    id: "apply",
    keys: [
      { at: 166, x: st.w * s + 60 * s, y: st.h * s * 0.92 },
      { at: 190, ...t, travel: 24, seed: "apply" },
    ],
    clicks: [198],
    visible: [166, 204],
  };
}

/** The window world's pointer spans: the bin (M3), Auto in project (M4), Details (M6), Run the tests (C1), Run tests
 *  (C2). Each arrives at least 5 frames before its click and hides when it isn't acting. */
export function pointerSpans(a: Aspect, s: number): PointerSpan[] {
  const st = WIN_STAGE[a];
  const fp = (p: Point, f: Framing) => framePoint(p, f, st, s);
  const w = st.w * s;
  const h = st.h * s;
  const from = (fx: number, fy: number): Point => ({ x: w * fx, y: h * fy });
  const out: PointerSpan[] = [];
  const pBin = fp(aim(SETTINGS.forgetBin, -2, 1), WIN.m3![a]);
  out.push({ id: "bin", keys: [{ at: 1153, ...off(pBin, -150, -40, s) }, { at: 1165, ...pBin, travel: 12, seed: "bin" }, { at: 1192, ...off(pBin, -110, 50, s), travel: 16, seed: "bin-off" }], clicks: [1170], visible: [1153, 1196] });
  const pAuto = fp(aim(PERMS_150.autoRadio, 0, 0), WIN.m4![a]);
  out.push({ id: "auto", keys: [{ at: 1232, ...from(0.92, 1.08) }, { at: 1254, ...pAuto, travel: 22, seed: "auto" }, { at: 1270, ...off(pAuto, 80, 60, s), travel: 12, seed: "auto-off" }], clicks: [1260], visible: [1232, 1272] });
  const pDetails = fp(aim(centreOf(CHALLENGE.details), -6, 1), WIN.m6![a]);
  out.push({ id: "details", keys: [{ at: 1368, ...off(pDetails, 120, 90, s) }, { at: 1380, ...pDetails, travel: 12, seed: "details" }, { at: 1398, ...off(pDetails, 140, 80, s), travel: 12, seed: "details-off" }], clicks: [1386], visible: [1368, 1400] });
  const pRun = fp(aim(centreOf(RUN.runTheTests.rect)), WIN.c1Held![a]);
  out.push({ id: "run-the-tests", keys: [{ at: 1494, ...from(0.95, 0.9) }, { at: 1506, ...pRun, travel: 12, seed: "held" }], clicks: [1512], visible: [1494, 1516] });
  const pTests = fp(aim(centreOf(RUN.runTests.rect)), WIN.c2Click![a]);
  out.push({ id: "run-tests", keys: [{ at: 1556, ...from(1.04, 0.95) }, { at: 1578, ...pTests, travel: 22, seed: "tests" }, { at: 1598, ...off(pTests, -90, 50, s), travel: 14, seed: "tests-off" }], clicks: [1584], visible: [1556, 1600] });
  return out;
}

/** The frame position of a world point seen by a stage camera. */
export const stageToFrame = (p: Point, cam: CamPose, stage: Rect): Point => ({
  x: stage.x + stage.w / 2 + (p.x - cam.x) * cam.zoom,
  y: stage.y + stage.h / 2 + (p.y - cam.y) * cam.zoom,
});

/** Motion blur for a stage camera move: the content's largest travel since the last frame at the centre and four
 *  inner points, as an axis-aligned stdDeviation (travel / 16, at most 10 px); none on a cut or a near-still frame. */
export function stageMotionBlur(p: CamPose, q: CamPose, rect: Rect): { x: number; y: number } {
  const pts = [
    { x: 0, y: 0 },
    { x: -rect.w / 4, y: -rect.h / 4 },
    { x: rect.w / 4, y: -rect.h / 4 },
    { x: -rect.w / 4, y: rect.h / 4 },
    { x: rect.w / 4, y: rect.h / 4 },
  ];
  let dx = 0;
  let dy = 0;
  for (const o of pts) {
    const wx = p.x + o.x / p.zoom;
    const wy = p.y + o.y / p.zoom;
    dx = Math.max(dx, Math.abs((wx - q.x) * q.zoom - o.x));
    dy = Math.max(dy, Math.abs((wy - q.y) * q.zoom - o.y));
  }
  if (dx > 400 || dy > 400 || Math.max(dx, dy) < 4) return { x: 0, y: 0 };
  return { x: Math.min(10, dx / 16), y: Math.min(10, dy / 16) };
}

/* ================================================================================================================
 * The checks
 * ============================================================================================================== */

const inter = (a: UiRect, b: UiRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** What the window world's stage shows on `frame`: the recording (and the source frame it shows) or a still's size. */
export function windowContent(frame: number): { rec: "light" | "challenge" | null; src: number | null; width: number; height: number } {
  if (frame < 1080) return { rec: null, src: null, width: 1440, height: 900 };
  if (frame < 1296) return { rec: null, src: null, width: 1160, height: 800 };
  if (frame < 1368) return { rec: "light", src: sourceFrameAt(SOURCE_MAPS.m5, frame), width: 1160, height: 800 };
  if (frame < 1440) return { rec: "challenge", src: sourceFrameAt(SOURCE_MAPS.m6, frame), width: 1160, height: 800 };
  // the press on Run the tests (f1512–1515) is drawn over the last frame before the click (479), as the scene draws it
  if (frame >= PRESS_RUN_THE_TESTS.from && frame < PRESS_RUN_THE_TESTS.to) return { rec: "light", src: PRESS_RUN_THE_TESTS.src, width: 1160, height: 800 };
  return { rec: "light", src: sourceFrameAt(SOURCE_MAPS.climax, frame), width: 1160, height: 800 };
}
/** The press on Run the tests: drawn over source frame 479 on f1512–1515, then a match cut on its rebound (f1516). */
export const PRESS_RUN_THE_TESTS = { from: 1512, to: 1516, src: 479 } as const;
const CAPTION_Y: PerAspect<number> = { wide: 918, square: 918, vertical: 1460 };
const FRAME: PerAspect<{ w: number; h: number }> = { wide: { w: 1920, h: 1080 }, square: { w: 1080, h: 1080 }, vertical: { w: 1080, h: 1920 } };

/** Every framing problem over the glimpses and the window world, at the reference size (s = 1). */
export function checkFraming(): string[] {
  const out: string[] = [];
  const fps = 30;
  const shown = (src: number | null, r: UiRect, rect: Rect) => src !== null && inter(r, rect);
  for (const a of ASPECT_IDS) {
    // the glimpses (the dark twin shows the same usage lines and the first toast on the same frames)
    for (const id of ["G1", "G2", "G3"] as const) {
      const gl = GLIMPSES[id];
      const end = gl.rampOut ? gl.rampOut[1] : gl.rampIn[0] + 76;
      for (let f = gl.rampIn[0]; f < end; f++) {
        const p = glimpsePose(id, a, 1, f);
        const r = visibleRect(p, gl.stage[a]);
        const src = sourceFrameAt(SOURCE_MAPS[gl.map], f);
        if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > 1160.5 || r.y + r.h > 800.5) out.push(`${a} ${id} f${f}: the view leaves the window (${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${(r.x + r.w).toFixed(1)}, ${(r.y + r.h).toFixed(1)})`);
        if (src !== null) for (const u of usageBoxes(src)) if (shown(src, u, r)) out.push(`${a} ${id} f${f}: a usage line (rate, cached) is in frame (source ${src})`);
        for (const t of TOASTS) if (src !== null && src >= t.from && src <= t.to && shown(src, t.rect, r)) out.push(`${a} ${id} f${f}: the toast is in frame`);
      }
      if (id === "G1") {
        const sp = glimpsePointer(a, 1);
        const st = gl.stage[a];
        const pt = cursorPathAt(198, sp.keys, fps);
        const fx = st.x + pt.x;
        const fy = st.y + pt.y;
        const F = FRAME[a];
        if (fx < 60 || fx > F.w - 60 || fy < 60 || fy > F.h - 60 || fy > CAPTION_Y[a]) out.push(`${a} G1: the Apply edit click at (${fx.toFixed(0)}, ${fy.toFixed(0)}) is under 60 px from an edge or in the caption band`);
      }
    }
    // the window world
    const st = WIN_STAGE[a];
    for (let f = 1008; f < 1800; f++) {
      const p = stagePoseAt(f, a, 1, fps);
      const r = visibleRect(p, st);
      const c = windowContent(f);
      if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > c.width + 0.5 || r.y + r.h > c.height + 0.5) out.push(`${a} f${f}: the view leaves the window (${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${(r.x + r.w).toFixed(1)}, ${(r.y + r.h).toFixed(1)})`);
      if (c.rec === "light") {
        if (c.src !== null) for (const u of usageBoxes(c.src)) if (inter(u, r)) out.push(`${a} f${f}: a usage line (rate, cached) is in frame (source ${c.src})`);
        for (const t of TOASTS) if (c.src !== null && c.src >= t.from && c.src <= t.to && inter(t.rect, r)) out.push(`${a} f${f}: the toast is in frame (source ${c.src})`);
        if (c.src !== null && c.src >= 675 && c.src <= 677 && r.x + r.w > RUN.drawerEdge && r.y + r.h > RUN.drawerDone + 16) out.push(`${a} f${f}: the drawer's lower half (its jumping cards) is in frame`);
      }
    }
    for (const sp of pointerSpans(a, 1)) {
      for (const cf of sp.clicks) {
        const pt = cursorPathAt(cf, sp.keys, fps);
        const fx = st.x + pt.x;
        const fy = st.y + pt.y;
        const F = FRAME[a];
        if (fx < 60 || fx > F.w - 60 || fy < 60 || fy > F.h - 60) out.push(`${a} ${sp.id} click f${cf}: at (${fx.toFixed(0)}, ${fy.toFixed(0)}), under 60 px from an edge`);
        if (fy > CAPTION_Y[a]) out.push(`${a} ${sp.id} click f${cf}: in the caption band (y ${fy.toFixed(0)})`);
        if (fx > st.x + st.w || fy > st.y + st.h) out.push(`${a} ${sp.id} click f${cf}: outside the stage`);
      }
    }
  }
  return out;
}

/** Every camera move of the film, per aspect, as [from, to) spans (a one-frame key is a cut, not a move): glimpse 1's
 *  push, the star beat's tilt, the whole window's pull-back and the window world's moves. */
export function filmCameraMoves(): CameraMove[] {
  return ASPECT_IDS.flatMap((a) => [
    { aspect: a, from: GLIMPSES.G1.rampIn[0], to: GLIMPSES.G1.rampOut![0], what: "glimpse 1's slow push" },
    { aspect: a, from: STAR_PAN.from, to: STAR_PAN.from + STAR_PAN.dur, what: "the star beat's tilt to the desktop" },
    { aspect: a, from: 936, to: 1008, what: "the whole window's pull-back" },
    ...windowKeys(a, 1)
      .slice(1)
      .filter((k) => (k.dur ?? 1) > 1)
      .map((k) => ({ aspect: a, from: k.at - (k.dur ?? 1), to: k.at, what: `the stage camera into f${k.at}` })),
  ]);
}

/** The whole film's checks: the timeline's rules with the scenes' camera moves, and the framing rules. */
export const checkAll = (): string[] => [...validateTimeline(filmCameraMoves()), ...checkFraming()];
