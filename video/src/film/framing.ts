// The window world's camera and pointer (FILM_SPEC §4, §6 S5–S7, §10), lane G2a. Pure arithmetic over the measured UI
// (film/ui.ts) and the beat-map frames: the scenes, the pointer-driven gaze cues (film/gaze.ts) and the motion audit
// all read this one module, so what the camera does and where the pebble looks always agree.
//
// A FRAMING is the region of the captured window the stage shows: its centre (cx, cy) and the magnification m (frame
// px per UI CSS px). Its visible size is the stage's size / m, so every framing below is written as the visible rect
// it produces and was edge-checked on the real frames (scratchpad tools/edgecheck.py, framescan.py):
// - 16:9: the stage's top, bottom and left edges are visible stage edges and cut no text or border (the right edge is
//   the frame's: the UI bleeds off it); square: the top, left and right edges are clean (the bottom bleeds);
// - nothing past the captured window is ever shown (FILM_SPEC §4: "a ROI never extends past the captured window");
// - click targets stay above the caption band (y ≤ 918) and ≥ 60 px from the frame's edges.
// Where this departs from FILM_SPEC §6's ROIs, the comment at the framing says why (the spec centred ROIs narrower
// than the stage, which showed past the window's right edge or cut the sidebar or the drawer border into a sliver).
import type { CamKey, CamPose, Point, Rect } from "../motion/camera";
import { cameraAt } from "../motion/camera";
import { EASE, SPRING, cursorPathAt, springAt, type CursorKey } from "../motion/spec";
import type { AspectId } from "../motion/layout";
import { DASHBOARD, LIVE_FILM, QUIZ, SETTINGS, centreOf } from "./ui";

export interface Framing {
  m: number;
  cx: number;
  cy: number;
}
const fr = (m: number, cx: number, cy: number): Framing => ({ m, cx, cy });
type PerAspect<T> = Record<AspectId, T>;

/** The stage in each aspect at the reference sizes (FILM_SPEC §4; layout.ts scales them by `s`). */
export const STAGE: PerAspect<Rect> = {
  wide: { x: 920, y: 64, w: 1000, h: 952 },
  square: { x: 24, y: 336, w: 1032, h: 744 },
};

export const FRAMINGS: PerAspect<Record<string, Framing>> = {
  wide: {
    /** S5a: x 350–734.6, y 66–432.2 (§6's m 2.6; top moved under the top bar's hairline at y 64, which sat 62 px inside the stage) */
    s5a: fr(2.6, 542.3, 249.1),
    /** S5b, the card's upper part: x 809.1–1160, y 199.5–533.5. m 2.85, not §6's 2.4: at 2.4 the stage shows 417 CSS px,
     *  past the window's right edge (1160) and across the drawer's border (800) */
    s5bTop: fr(2.85, 984.55, 366.5),
    /** S5b, the card's lower part: y 408–742; Apply edit at frame (1683, 873) */
    s5bLow: fr(2.85, 984.55, 575),
    /**
     * S5c stage 1 (f864–953), the held run whole (REVIEW-G2 P0-1, lane G-fix): x 228–720.6, y 324–793, m 2.03. The
     * whole block shows (the avatar at 259.7 to the sentence's end at 695, all three choices) with "Details" (730) just
     * outside; the top edge sits between the reply's last line (311) and the notice (332), the bottom between the
     * composer's footer line (ends 782.7) and the window's edge (800). The old m 2.2 (x 222–676.5) cut the sentence's
     * tail, and no m above 2.03 has a clean top and bottom with the whole sentence in (the footer at 759.7–782.7
     * leaves no gap a taller view can end in). The sentence's ink is 22 px here; stage 2 reads it at 35.
     */
    s5c: fr(2.03, 474.3, 558.5),
    /**
     * S5c stage 2 (pushed in f954–977, held to the f1008 move): m 3.16, x 222–538.5, y 392–693.3. "Blocked", the
     * sentence (ink 34.8 px ≥ 28; it bleeds off the frame's right edge as the UI does) and Run the tests, with Ask
     * Pebble to finish whole (its border 5.8 css px inside the edge) and Accept as unverified wholly outside (its first
     * letter 3.2 css px past the edge): the edge falls in the 9 px between them, so no choice is sliced. Top between
     * the notice (ends 380.7) and the usage line (404); bottom inside the composer, between its placeholder (ends 661.3)
     * and its model row (713.3). Run the tests at frame (1301, 627).
     */
    s5cRead: fr(3.16, 380.2, 542.65),
    /** S5d, the whole "Run isolated tests" card: x 802.9–1160, y 213.5–553.5; Run tests at frame (1693, 903) */
    s5d: fr(2.8, 981.45, 383.5),
    /**
     * S5d → S5e, tilted f1116–1139 once R2's scroll has settled (REVIEW-G2 P1-5, lane G-fix): y 329–669. "Not verified ·
     * 2 changed files, no tests run" (269–296.7) and "Verification remains incomplete" (311–322) leave the top before
     * the Verified step arrives (f1152), so the climax frame reads from "You asked Pebble to run the tests" (336) down
     * to "Verified" and what follows. The bottom edge sits in the gap under the card's lines once "Waiting for the
     * model" moves them (f1155 on); on f1152–1154 it grazes the bottom 0.7 px of one line of the card below.
     */
    s5dVerified: fr(2.8, 981.45, 499),
    /** S5e pull-back: x 245.9–1086.2, y 0–800 (m 1.19 so the gear sits 60 px inside the frame and the left edge in clear
     *  space; §6's ROI cut every reply line at x 340) */
    s5eOut: fr(1.19, 666.05, 400),
    /** S6a/S6b: x 342–835.8, y 94–564.1 (inside the modal, x 321–839; edges clean on all four Settings stills) */
    s6a: fr(2.025, 588.9, 329.05),
    /** S6c, the records: y 328–798.1 (the bin at frame (1845, 851)) */
    s6c: fr(2.025, 588.9, 563.05),
    /** S7a: the canvas only, x 643.2–1440, y 70–828.6 (§6's x 612 showed the canvas border at x 640) */
    s7a: fr(1.255, 1041.6, 449.3),
    /**
     * S7a opens on the ask (REVIEW-G2 P1-7, lane G-fix), main-dashboard@3x's conversation: x 284–637.4, y 84–420.4, m 2.83:
     * "Turn my Lisbon trip spending into a dashboard: what I've spent, by category, and what's left to book." with the
     * reply's first five lines; left edge between the run's avatar (ends 275.7) and the text (295), right edge 2.6 css
     * px before the canvas's border (640), top under the top bar's hairline (64), bottom between the reply's 5th and 6th
     * lines (416.3 | 427.3). f1602–1625 the camera moves to the canvas (s7a).
     */
    s7aAsk: fr(2.83, 460.7, 252.2),
  },
  square: {
    /** S5a: x 336–725.4, y 68–348.8 (top above the request bubble: §6's y 120 cut its first line) */
    s5a: fr(2.65, 530.7, 208.4),
    /** S5b: the drawer only, x 804.1–1160 (m 2.9); upper part y 200–456.6 */
    s5bTop: fr(2.9, 982.05, 328.3),
    /**
     * S5b lower part, y 488.7–745.3 (REVIEW-G2 P0-2, lane G-fix; was cy 662.2, y 533.9–790.5): the next card's header
     * ("tests/test_dates.py · Needs your review", y 749.3 before the click; "· Done", y 747 on the f814 match cut's
     * 11.05 s frame) now stays 5 px below the frame, so no status changes on screen without a visible click. The top
     * edge falls between the diff's rows (469 | 517) and, after the match cut, between EARLIER ACTIONS (481) and the
     * applied card's header (511). Apply edit straddles the caption band (frame y 879–971); the pointer clicks its upper
     * half at css y 689, frame y 917 (≤ 918).
     */
    s5bLow: fr(2.9, 982.05, 617),
    /**
     * S5c stage 1 (f864–953), the held run whole (REVIEW-G2 P0-1, lane G-fix): m 2.2, x 242.7–711.8, y 420.5 → the frame
     * bottom (759.7). The avatar (259.7) and the sentence's end (695) both sit 61 px from the frame's sides, so the
     * whole block and all three choices show inside OVERRIDES §4's 60 px; the top edge is 4.8 css px under the usage
     * line (ends 415.7) and the composer's footer line (from 759.7) stays 2 px under the frame. Ink 24 px (stage 2: 36).
     */
    s5c: fr(2.2, 477.25, 589.6),
    /**
     * S5c stage 2: m 3.28, x 222.6–537.2, y 420.8 → 647.6: "Blocked", the sentence (ink 36 px ≥ 34; its lines run into
     * the stage's right edge) and Run the tests, Ask Pebble to finish whole (its label 82 px from the frame's edge) and
     * Accept as unverified wholly outside (4.5 css px past the edge). The composer's placeholder (648.7) stays under
     * the frame. Run the tests at frame (337, 797).
     */
    s5cRead: fr(3.28, 379.9, 534.2),
    /** S5d upper part: y 200–456.6 */
    s5dTop: fr(2.9, 982.05, 328.3),
    /** S5d tilt (f1050–1073): y 323–579.6; Run tests at frame (815, 886) */
    s5dTilt: fr(2.9, 982.05, 451.3),
    /** S5e pull-back: x 230–1160, y 0–670.3 (m 1.11); the gear at frame (918, 371) */
    s5eOut: fr(1.11, 695, 335.15),
    /** S6a: x 341.5–810.6, y 100–438.2 (m 2.2: the tabs and every row's text fit, §6's 2.27 cut "Skills & connectors") */
    s6a: fr(2.2, 576.05, 269.1),
    /** S6b tilt: y 193–531.2; the Auto in project label at frame (219, 711) */
    s6bTilt: fr(2.2, 576.05, 362.1),
    /** S6c, the records: x 342.3–820.7, y 455–800 (top below the description paragraph; §6's y 442 cut its last line) */
    s6c: fr(2.157, 581.5, 627.45),
    /** S7a: the canvas only, x 643.1–1440, y 66–640.5 */
    s7a: fr(1.295, 1041.55, 353.25),
    /** S7a's ask (REVIEW-G2 P1-7): x 284–637.4, y 76 → the frame bottom (330.8), m 2.92 (the 16:9 crop is too wide for the
     *  square's stage); the request bubble is the card in focus and the rest recedes under a veil, so the reply's lines
     *  at the frame's bottom edge never read as cut text (S7a's UiStill focus) */
    s7aAsk: fr(2.92, 460.7, 203.4),
  },
};

/** S7b's end framing (G1.5, ratified by lane E) and S7c's full-frame quiz: frame-centred poses. */
export const FULL_FRAME = {
  /** the chart as the world: 16:9 m 3.2 on (1059, 661.5); square m 2.55 on (1061.5, 661.5) */
  chart: { wide: fr(3.2, 1059, 661.5), square: fr(2.55, 1061.5, 661.5) },
  /** the quiz, full frame. 16:9 m 2.6: x 421.5–1160 (the window's right edge on the frame's, so nothing past the window
   *  shows; the conversation left of the canvas recedes under a veil, S7Quiz), y 217.3–632.7 (the quiz's title to its
   *  answer D, which may bleed off the bottom; §6's y 330–665 left the title out). Square m 2.477: x 724–1160, inside
   *  the canvas (border at x 720), y 219–655. Lane G-fix (REVIEW-G2 P1-8): cy 425 / 437, not 445.7 / 454, so the title
   *  "Python datetime check-in" has ≥ 64 px of headroom (it sat 17 / 21 px under the frame's top edge) */
  quiz: { wide: fr(2.6, 790.75, 425), square: fr(2.477, 942, 437) },
} as const;

/** A camera pose for a framing at layout scale `s`. */
export const pose = (f: Framing, s: number): CamPose => ({ x: f.cx, y: f.cy, zoom: f.m * s });
const key = (at: number, f: Framing, s: number, dur?: number, path: "direct" | "smooth" = "direct"): CamKey => ({ at, x: f.cx, y: f.cy, zoom: f.m * s, dur, path, ease: EASE.camera });

/**
 * The stage camera from f648 to f1655 (S5, S6, S7a). Cuts are one-frame moves (the pose jumps on the cut's frame).
 * Moves: f720–753 into the drawer; f774–797 tilt down to Apply edit; f864 hard cut to the whole held run, f954–977
 * push-in to read it; f1008 hard cut to the tests card (square: tilt f1050–1073); f1188–1211 pull-back; f1224 match cut
 * to Settings (square: tilt f1338–1361 and back f1408–1431); f1476–1499 pan to the records; f1584 hard cut to the
 * dashboard.
 */
export function windowKeys(a: AspectId, s: number): CamKey[] {
  const F = FRAMINGS[a]!;
  const keys: CamKey[] = [
    key(648, F.s5a!, s),
    // the two cross-panel moves take 33 and 32 frames (R5's cross-world camera, 1.1 s), not §6's 23: at 23 frames the
    // UI travelled up to 250 px a frame; they still land before the lines they serve (T7 at f756, T9 at f1044)
    key(753, F.s5bTop!, s, 33),
    key(797, F.s5bLow!, s, 23),
    // S5c in two stages (REVIEW-G2 P0-1): the hard cut lands on the whole held run (stage 1), which the app has scrolled
    // into view by f914; f954–977 the camera pushes in to read it (stage 2) and holds through the click (f990)
    key(864, F.s5c!, s, 1),
    key(977, F.s5cRead!, s, 23),
  ];
  // f1008 (bar 15): a hard cut to the "Run isolated tests" card the click put in the drawer (REVIEW-G2 P2-1: from the
  // read framing the old 32-frame move travelled 202 px a frame in 16:9 and 214 in the square, 10× R5's blur limit)
  if (a === "wide") keys.push(key(1008, F.s5d!, s, 1), key(1139, F.s5dVerified!, s, 23));
  else keys.push(key(1008, F.s5dTop!, s, 1), key(1073, F.s5dTilt!, s, 23));
  keys.push(key(1211, F.s5eOut!, s, 23), key(1224, F.s6a!, s, 1));
  if (a === "square") keys.push(key(1361, F.s6bTilt!, s, 23), key(1431, F.s6a!, s, 23));
  // S7a: the hard cut lands on the ask; f1602–1625 the camera moves to the canvas on van Wijk's path (it pulls back as
  // it pans, so the view never travels faster than it widens)
  keys.push(key(1499, F.s6c!, s, 23), key(1584, F.s7aAsk!, s, 1), key(1625, F.s7a!, s, 24, "smooth"));
  return keys;
}

/** Frames where the stage's picture is CUT (hard cuts and match cuts): no motion blur there, whatever the jump. */
export const STAGE_CUTS: readonly number[] = [814, 864, 1008, 1224, 1584];

/** Match cuts on a click (f814 Done, f1224 Settings): the new picture arrives at 1.04× and settles on SPRING.calm. */
export const SETTLES: readonly { at: number; pivot: "click" }[] = [
  { at: 814, pivot: "click" },
  { at: 1224, pivot: "click" },
];
export const settleScale = (frame: number, fps: number): { k: number; at: number | null } => {
  for (const sItem of SETTLES) {
    if (frame >= sItem.at && frame < sItem.at + 24) return { k: 1 + 0.04 * (1 - springAt(frame, fps, sItem.at, SPRING.calm)), at: sItem.at };
  }
  return { k: 1, at: null };
};

/** Scale a pose by k about a world pivot (the pivot keeps its frame position). */
export const scaleAbout = (p: CamPose, pivot: Point, k: number): CamPose =>
  k === 1 ? p : { x: pivot.x - (pivot.x - p.x) / k, y: pivot.y - (pivot.y - p.y) / k, zoom: p.zoom * k };

/* ================================================================================================================
 * The pointer in the window world (FILM_SPEC §10): keys in the STAGE's own frame px (its top-left at 0, 0), as a
 * pointer moves on a screen, never riding the virtual camera: so a click's match cut keeps it exactly where it
 * clicked, and a camera move under a travelling pointer does not bend its path. Each target is the control's frame
 * position in the framing the camera has settled on by the arrival. It fades 0.15 s in and out and hides whenever
 * it is not acting.
 * ============================================================================================================== */

export interface PointerSpan {
  id: string;
  /** stage-local frame px */
  keys: readonly CursorKey[];
  clicks: readonly number[];
  /** [from, to) frames on screen */
  visible: readonly [number, number];
}

const C = {
  apply: centreOf(LIVE_FILM.applyEdit.rect),
  runTheTests: centreOf(LIVE_FILM.runTheTests.rect),
  runTests: centreOf(LIVE_FILM.runTests.rect),
  gear: LIVE_FILM.gear,
  perms: SETTINGS.permissionsTab,
  auto: SETTINGS.autoTitle,
  memory: SETTINGS.memoryTab,
  bin: SETTINGS.forgetBin,
};
/** The hotspot lands a hair left of and above a target's centre, as a hand does. */
const aim = (p: Point, dx = -3, dy = 2): Point => ({ x: p.x + dx, y: p.y + dy });

/** A UI point's stage-local frame position under a framing. */
export function framePoint(p: Point, f: Framing, a: AspectId, s: number): Point {
  const st = STAGE[a]!;
  return { x: (st.w * s) / 2 + (p.x - f.cx) * f.m * s, y: (st.h * s) / 2 + (p.y - f.cy) * f.m * s };
}

/** Where the pointer comes from (stage-local px): 16:9, past the frame's right edge; square, past its bottom edge. */
function entry(a: AspectId, s: number, side: "lowerRight" | "right"): Point {
  const st = STAGE[a]!;
  const w = st.w * s;
  const h = st.h * s;
  if (a === "wide") return side === "right" ? { x: w + 50 * s, y: h * 0.3 } : { x: w + 50 * s, y: h * 0.85 };
  return side === "right" ? { x: w * 0.92, y: h + 50 * s } : { x: w * 0.8, y: h + 50 * s };
}
const off = (p: Point, dx: number, dy: number, s: number): Point => ({ x: p.x + dx * s, y: p.y + dy * s });

/** The window world's pointer spans. Arrival frames: FILM_SPEC §6 (each ≥ 5 frames before its click, §10). */
export function pointerSpans(a: AspectId, s: number): PointerSpan[] {
  const F = FRAMINGS[a]!;
  const wide = a === "wide";
  const fp = (p: Point, f: Framing) => framePoint(p, f, a, s);
  const out: PointerSpan[] = [];
  // S5b: in from the lower right f780, on Apply edit by f803 (the tilt has landed by f797), click f810; the match cut
  // keeps it there; it drifts away and fades f826–830. The square clicks the button's upper half (css y 689), so the
  // click stays above the caption band with the next card's header kept out of frame (s5bLow)
  const pA = fp(wide ? aim(C.apply) : { x: C.apply.x - 3, y: 689 }, F.s5bLow!);
  out.push({
    id: "apply",
    keys: [
      { at: 780, ...entry(a, s, "lowerRight") },
      { at: 803, ...pA, travel: 23, seed: "apply" },
      { at: 829, ...off(pA, 70, 46, s), travel: 16, seed: "apply-off" },
    ],
    clicks: [810],
    visible: [780, 830],
  });
  // S5c: in f960, on Run the tests by f985 (the push-in to stage 2 has landed by f977), click f990, then it leaves
  // (fades f1000–1005)
  const pR = fp(aim(C.runTheTests), F.s5cRead!);
  out.push({
    id: "run-the-tests",
    keys: [
      { at: 960, ...entry(a, s, "lowerRight") },
      { at: 985, ...pR, travel: 25, seed: "held" },
      { at: 1005, ...off(pR, 90, 70, s), travel: 12, seed: "held-off" },
    ],
    clicks: [990],
    visible: [960, 1005],
  });
  // S5d: in f1050, on Run tests by f1075 (the square's tilt lands f1073), click f1080, then it leaves (fades f1092–1097)
  const pT = fp(aim(C.runTests), wide ? F.s5d! : F.s5dTilt!);
  out.push({
    id: "run-tests",
    keys: [
      { at: 1050, ...entry(a, s, "lowerRight") },
      { at: 1075, ...pT, travel: 25, seed: "tests" },
      { at: 1097, ...off(pT, -80, 60, s), travel: 14, seed: "tests-off" },
    ],
    clicks: [1080],
    visible: [1050, 1097],
  });
  // S5e: in from the right f1196, on the gear by f1219 (the pull-back has landed by f1211), click f1224: the match cut
  // to Settings happens under it; hidden f1227–1232
  const pG = fp(aim(C.gear, -2, 2), F.s5eOut!);
  out.push({
    id: "gear",
    keys: [
      { at: 1196, ...entry(a, s, "right") },
      { at: 1219, ...pG, travel: 23, seed: "gear" },
    ],
    clicks: [1224],
    visible: [1196, 1232],
  });
  // S6a–S6b: back at f1290 over the content, to the Permissions tab (f1300–1326, click f1332); to Auto in project
  // (f1370–1398, click f1404; the square's tilt lands f1361); to the Memory tab (f1412–1434, click f1440; the square
  // tilts back by f1431); hidden f1446–1451 before the camera pans to the records
  const pP = fp(aim(C.perms), F.s6a!);
  const pAu = fp(aim(C.auto), wide ? F.s6a! : F.s6bTilt!);
  const pM = fp(aim(C.memory), F.s6a!);
  const rest = fp({ x: F.s6a!.cx + 60, y: F.s6a!.cy + 110 }, F.s6a!);
  out.push({
    id: "settings",
    keys: [
      { at: 1295, ...rest },
      { at: 1326, ...pP, travel: 26, seed: "perms" },
      { at: 1398, ...pAu, travel: 28, seed: "auto" },
      { at: 1434, ...pM, travel: 22, seed: "memory" },
    ],
    clicks: [1332, 1404, 1440],
    visible: [1290, 1451],
  });
  // S6c: in from the lower right f1500, on the bin by f1525, click f1530; it moves off and fades f1550–1555
  const pB = fp(aim(C.bin, -2, 1), F.s6c!);
  out.push({
    id: "forget",
    keys: [
      { at: 1500, ...entry(a, s, "lowerRight") },
      { at: 1525, ...pB, travel: 25, seed: "bin" },
      { at: 1555, ...off(pB, -120, 50, s), travel: 18, seed: "bin-off" },
    ],
    clicks: [1530],
    visible: [1500, 1555],
  });
  return out;
}

/** The frame position of a world point seen by the stage camera (stage-local camera, offset by the stage's corner). */
export const stageToFrame = (p: Point, cam: CamPose, stage: Rect): Point => ({
  x: stage.x + stage.w / 2 + (p.x - cam.x) * cam.zoom,
  y: stage.y + stage.h / 2 + (p.y - cam.y) * cam.zoom,
});

/**
 * The stage-local frame point a match cut's settle pivots on: the stage's left edge at mid-height. Growing from there,
 * the new picture only ever moves out of the stage's far side (the frame's right edge in 16:9) and its top and
 * bottom, so the clean left margin never cuts a line while it settles (a pivot at the click, far right, pushed the
 * Settings rows' first letters out of the stage's left edge for 15 frames).
 */
function settlePivot(_at: number, a: AspectId, s: number): Point {
  const st = STAGE[a]!;
  return { x: 0, y: (st.h * s) / 2 };
}

/** The stage camera pose on a frame, including the 1.04 → 1 settle of a match cut about the click's point. */
export function stagePoseAt(frame: number, a: AspectId, s: number, fps: number): CamPose {
  const st = STAGE[a]!;
  const base = cameraAt(frame, windowKeys(a, s), fps, st.w * s);
  const { k, at } = settleScale(frame, fps);
  if (at === null || k === 1) return base;
  const pf = settlePivot(at, a, s);
  // the world point under the pivot's frame position at the unscaled pose
  const pivot = { x: base.x + (pf.x - (st.w * s) / 2) / base.zoom, y: base.y + (pf.y - (st.h * s) / 2) / base.zoom };
  return scaleAbout(base, pivot, k);
}

/** The pointer's frame position on `frame`, or null when it is off screen. */
export function pointerFrameAt(frame: number, a: AspectId, s: number, fps: number): Point | null {
  const st = STAGE[a]!;
  for (const sp of pointerSpans(a, s)) {
    if (frame < sp.visible[0] || frame >= sp.visible[1]) continue;
    const p = cursorPathAt(frame, sp.keys, fps);
    return { x: st.x * s + p.x, y: st.y * s + p.y };
  }
  return null;
}

/**
 * Motion blur for a stage camera move: the largest per-frame travel of the content at the stage's centre and corners
 * since the previous frame, as an axis-aligned stdDeviation (travel / 16, capped at 10 px, so the blur's visible
 * reach stays within R5's 20 px). A cut (travel over 400 px in one frame) and a near-still frame (under 4 px) get none.
 */
export function stageMotionBlur(p: CamPose, q: CamPose, rect: Rect): { x: number; y: number } {
  const pts = [
    { x: 0, y: 0 },
    { x: -rect.w / 2, y: -rect.h / 2 },
    { x: rect.w / 2, y: -rect.h / 2 },
    { x: -rect.w / 2, y: rect.h / 2 },
    { x: rect.w / 2, y: rect.h / 2 },
  ];
  let dx = 0;
  let dy = 0;
  for (const o of pts) {
    // the world point under this stage point now, and where it was on the previous frame
    const wx = p.x + o.x / p.zoom;
    const wy = p.y + o.y / p.zoom;
    const px = (wx - q.x) * q.zoom - o.x;
    const py = (wy - q.y) * q.zoom - o.y;
    dx = Math.max(dx, Math.abs(px));
    dy = Math.max(dy, Math.abs(py));
  }
  if (dx > 400 || dy > 400 || Math.max(dx, dy) < 4) return { x: 0, y: 0 };
  return { x: Math.min(10, dx / 16), y: Math.min(10, dy / 16) };
}

/** Quiz zoom-through aim and the chart panel, re-exported for the S7 scene. */
export const VIEWS = { chartPanel: DASHBOARD.chartPanel, quizAim: QUIZ.aim, quizBadge: QUIZ.badge } as const;
