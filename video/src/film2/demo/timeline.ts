// F2-Foundation-Demo's timeline as data (TREATMENT §7.1's `timeline.ts` pattern: pure data that the composition draws
// and the validators read, so the two can never disagree). 1920 × 1080 at 60 fps, 28 s.
//
//   S1  0:00.0–0:05.8  Act I and a Drop: the narrow aperture, morning; the companion take plays at 1× (the person types
//                      and sends); a slow push-in from frame 0; the name rises from its mask in the upper band; a ring
//                      leaves the stone, refracts the ground and the frame opens with it; the light warms; a pull-back
//                      in log space eases into a glide; E-leave into a momentum cut.
//   S2  0:05.8–0:16.6  A ring chapter: the incoming shot lands at the outgoing speed; a ring leaves the stone and leads
//                      the camera to an ask, framing it; the camera dollies in to read; a receipt lands, the ring
//                      returns to the stone; a promise and its limit; warm to day. Rack focus out.
//   S3  0:16.6–0:22.7  A cascade: one fixed line, items swapped in place with their real UI; a push-in with parallax,
//                      a far Pebble window defocused and tilted while the camera travels; day to evening. Ring iris out.
//   S4  0:22.7–0:28.0  The convergence and the title: rings converge into the stone on the page; the name with a light
//                      sweep; "Shown with sample data."; evening to the page.
//
// All UI is PLACEHOLDER (demo/placeholders.ts): real captures of published Pebble releases, standing in for 2.0.0.
import { CAMERA, COLOR, f60 } from "../tokens";
import { VelocityCamera, worldToFrame, type Pose } from "../motion/camera";
import type { Rect } from "../motion/geometry";
import { pullBack, pushInCarried, travelTo } from "../camera/moves";
import { momentumCut } from "../transitions/momentum";
import { ringStates, type RingSpec } from "../carrier/ring";
import { apertureOpenForRing } from "../carrier/apertureMath";
import { E_ARRIVE, clamp01 } from "../motion/ease";
import type { LightCue } from "../light/grades";
import { cascadeSchedule, type CascadeItem } from "../type/Cascade";
import type { TextEvent } from "../type/reading";
import type { FilmTimelineQa, QaReadable, QaSeam, QaShot } from "../qa/timeline";
import type { QaMove } from "../qa/checks";
import { MUST_READ_WORDS, PLACEHOLDER, TAKE } from "./placeholders";

export const FPS = 60;
export const W = 1920;
export const H = 1080;

/* ---------------------------------------------------------------- shots and seams ----------------------------- */

export const S1 = { from: 0, to: 350 };
export const S2 = { from: 350, dur: 680 }; // renders to 1030; the rack overlaps its last 36 frames
export const RACK = { at: 994, frames: 36 };
export const S3 = { from: 994, dur: 400 }; // renders to 1394; the iris overlaps its last 30 frames
export const IRIS = { at: 1364, frames: 30 };
export const S4 = { from: 1364, dur: 316 };
export const DURATION = S4.from + S4.dur; // 1680 frames, 28 s

/* ---------------------------------------------------------------- the world (CSS px of the captures at 1×) ------ */

export const PLACE = {
  companion: { x: 2300, y: 1350, w: PLACEHOLDER.companionTake.w, h: PLACEHOLDER.companionTake.h },
  ask: { x: 2860, y: 1250, w: PLACEHOLDER.ask.w, h: PLACEHOLDER.ask.h },
  receipt: { x: 2860, y: 1640, w: 684, h: 248 },
  main: { x: 700, y: 300, w: PLACEHOLDER.main.w, h: PLACEHOLDER.main.h }, // withheld from Act I: the pull-back reveals it
  // S3's stage, east of everything; its far window sits behind it on a deeper plane
  stage: { x: 5300, y: 1000, w: 640, h: 520 },
  far: { x: 5350, y: 300, w: PLACEHOLDER.main.w, h: PLACEHOLDER.main.h },
} as const satisfies Record<string, Rect>;

/** The stone: the companion's avatar centre (the take hides the avatar; the film pebble is drawn there by its engine). */
export const STONE = { x: PLACE.companion.x + TAKE.stone.x, y: PLACE.companion.y + TAKE.stone.y, r: 44 };

/* ---------------------------------------------------------------- S1: Act I and the Drop ----------------------- */

/** Act I's aperture: 2.39:1, pushed down so the upper band holds the name (220 px tall; text 60 px from the edge). */
export const APERTURE_CENTER_Y = 621.5;
const panelCentre = { x: PLACE.companion.x + PLACE.companion.w / 2, y: PLACE.companion.y + PLACE.companion.h / 2 };
const s1Zoom0 = 1.3;
const s1Pose0: Pose = { x: panelCentre.x + 40, y: panelCentre.y - (APERTURE_CENTER_Y - 540) / s1Zoom0, zoom: s1Zoom0 };

export const S1_CAMERA = (() => {
  // the push-in is already moving on frame 0 (it starts with the shot, never late) and is carried into the Drop
  const cam = new VelocityCamera(s1Pose0, { lz: 0.0004 });
  pushInCarried(cam, 160, 1.08, 0.00025, { x: s1Pose0.x, y: panelCentre.y - (APERTURE_CENTER_Y - 540) / (s1Zoom0 * 1.08) });
  // the Drop: a pull-back in log space that eases into a glide, revealing the world west of the companion
  // ... drifting east (the picture moves left), toward the cut's direction, so the shot never rests before its E-leave
  pullBack(cam, 300, 0.74 / (s1Zoom0 * 1.08), 330, FPS, { x: 2250, y: 1380 }, { x: 0.6 });
  return cam;
})();

/** The momentum cut S1 → S2: E-leave over 18 frames (the picture leaves left), the incoming lands on E-arrive. */
const s2Land: Pose = { x: 2950, y: 1560, zoom: 1.0 };
export const CUT_1 = momentumCut({
  out: S1_CAMERA,
  cutFrame: S1.to,
  dir: { x: -1, y: 0 },
  dPx: 120,
  leaveFrames: 18,
  target: s2Land,
  inFrames: 50,
  frameW: W,
  frameH: H,
  fps: FPS,
});

/** The burst: a ring leaves the stone as Pebble starts working, reaches the aperture's edges and opens the frame. */
export const RING_BURST: RingSpec = {
  id: "burst",
  start: 170,
  source: { x: STONE.x, y: STONE.y },
  stoneRadius: STONE.r,
  phases: [
    { kind: "emit", frames: 18, radius: 220 },
    { kind: "burst", frames: 60, radius: "edge" },
    { kind: "fade", frames: 12 },
  ],
  echoes: 2,
  layer: "ground",
};

/** The world radius from the burst's centre to the frame's farthest corner (resolves its "edge" burst). */
export const s1EdgeRadius = (f: number, c: { x: number; y: number }): number => {
  const pose = S1_CAMERA.pose(f);
  const p = worldToFrame(c, pose, W, H);
  return Math.max(Math.hypot(p.x, p.y), Math.hypot(W - p.x, p.y), Math.hypot(p.x, H - p.y), Math.hypot(W - p.x, H - p.y)) / pose.zoom;
};

/**
 * The aperture: the frame opens with the ring. It starts on the first frame the burst's ring reaches one of the
 * aperture's edges and opens over 33 frames (TREATMENT S06: 30–36) on E-arrive, so the ring leads and the frame follows.
 */
export const APERTURE_TOUCH = (() => {
  for (let f = RING_BURST.start; f < RING_BURST.start + 120; f++) {
    const r = ringStates(RING_BURST, f, FPS, s1EdgeRadius).find((x) => x.echo === 0);
    if (!r) continue;
    const pose = S1_CAMERA.pose(f);
    const c = worldToFrame(r.c, pose, W, H);
    if (apertureOpenForRing(W, H, c.y, r.r * pose.zoom, APERTURE_CENTER_Y) > 0) return f;
  }
  return RING_BURST.start;
})();
export const APERTURE_FRAMES = 33;
export const apertureOpenAt = (f: number): number => E_ARRIVE(clamp01((f - APERTURE_TOUCH) / APERTURE_FRAMES));

/* ---------------------------------------------------------------- S2: a ring chapter ------------------------- */

const askCentre = { x: PLACE.ask.x + PLACE.ask.w / 2, y: PLACE.ask.y + PLACE.ask.h / 2 };
/** local frames of S2 (0 = composition frame 350) */
export const S2_BEATS = {
  ringStart: 50,
  askIn: 70,
  ringFramed: 146,
  travelFrom: 100,
  travelTo: 160,
  dollyFrom: 200,
  dollyTo: 270,
  receiptIn: 390,
  ringReturn: 420,
  toReceipt: 400,
  receiptFramed: 470,
  pairIn: 456,
  pairOut: 626,
} as const;

export const S2_CAMERA = (() => {
  const b = S2_BEATS;
  const cam = CUT_1.inCam; // E-arrive over 50 frames at the outgoing speed, landing on s2Land
  cam.glide(b.travelFrom, f60(24, FPS), { x: 0.05 });
  // the ring leads; the camera follows it 14 frames behind and arrives with momentum, then glides
  travelTo(cam, b.travelTo, { x: askCentre.x, y: askCentre.y, zoom: 1.15 }, b.dollyFrom, FPS, { arriveSpeedPxPerFrame: 7 });
  // the dolly in to reading magnification (UI text ≥ 28 px at 1080): a move with velocity at both ends
  cam.hermite(b.dollyTo, { x: askCentre.x, y: askCentre.y + 10, zoom: 2.0 }, { y: 0.02, lz: 0.0003 });
  cam.glide(b.toReceipt, f60(30, FPS), { lz: 0.00008 });
  // down to the receipt, which lands below the ask: its first lines read at 28 px or more (zoom 2.15), framed right
  // and bleeding off the frame's edge, so the stone and the type sit at the left
  travelTo(cam, b.receiptFramed, { x: 2888, y: 1714, zoom: 2.15 }, 560, FPS, { arriveSpeedPxPerFrame: 6 });
  cam.glide(S2.dur, f60(30, FPS), { x: 0.06, lz: 0.00006 });
  return cam;
})();

export const RING_ASK: RingSpec = {
  id: "ask",
  start: S2.from + S2_BEATS.ringStart,
  source: { x: STONE.x, y: STONE.y },
  stoneRadius: STONE.r,
  phases: [
    { kind: "emit", frames: 36, radius: 130 },
    { kind: "frame", frames: S2_BEATS.ringFramed - S2_BEATS.ringStart - 36, rect: PLACE.ask, clearance: 40, ease: "E-move" },
    { kind: "hold", frames: S2_BEATS.ringReturn - S2_BEATS.ringFramed },
    { kind: "return", frames: 42 },
  ],
  echoes: 2,
  layer: "ground",
};

/* ---------------------------------------------------------------- S3: a cascade ------------------------------ */

export const S3_ITEMS: CascadeItem[] = [
  { text: "Remember that …", holdS: 1.1 },
  { text: "Six kinds, six switches", holdS: 1.05 },
  { text: "Forget this memory", holdS: 1.05 },
];
/** local frames of S3 (0 = composition frame 994, the rack's first frame) */
export const S3_BEATS = { fixedIn: 52, itemsFrom: 84, fixedOut: 330 } as const;
export const S3_SCHEDULE = cascadeSchedule(S3_BEATS.itemsFrom, S3_ITEMS, FPS);

/** S3's opening framing: the stage in the right half (the type owns the left), the far window peeking top right. */
export const S3_REF: Pose = { x: 5150, y: 1260, zoom: 1.12 };
export const S3_CAMERA = (() => {
  // it opens already drifting east (the rack's incoming side is never a rest), then a push-in carries the shot
  const cam = new VelocityCamera(S3_REF, { x: 0.3, lz: 0.0002 });
  pushInCarried(cam, 240, 1.09, 0.00012, { x: 5230, y: 1260 });
  cam.glide(S3.dur, f60(30, FPS), { x: 0.25, lz: 0.0001 });
  return cam;
})();

/** The far window's tilt while the camera travels (a Pebble window only), flattening as the push settles. */
export const S3_FAR_TILT = { ry: [-12, 0] as const, rx: [5, 0] as const, flattenFrom: 150, flattenTo: 216 };

/* ---------------------------------------------------------------- S4: convergence and title ------------------- */

/** S4 is the page: world units are frame px under an identity camera with a slow drift. */
export const S4_STONE = { x: 724, y: 540, r: 62 }; // the stone drawn at 210 px: larger than the title beside it
export const S4_CAMERA = (() => {
  const cam = new VelocityCamera({ x: W / 2, y: H / 2, zoom: 1 }, { lz: 0.00012 });
  cam.glide(S4.dur, f60(60, FPS), { lz: 0.00009 });
  return cam;
})();
export const S4_BEATS = { converge: 30, titleIn: 104, sweepAt: 134, smallIn: 150 } as const;

export const RING_CONVERGE: RingSpec = {
  id: "converge",
  start: S4.from + S4_BEATS.converge,
  source: { x: S4_STONE.x, y: S4_STONE.y },
  stoneRadius: S4_STONE.r,
  phases: [
    { kind: "appear", frames: 14, radius: 760 },
    { kind: "return", frames: 48 },
  ],
  echoes: 2,
  echoGap: 8,
  echoFade: 0.6,
  echoMode: "all",
  ripple: false,
  layer: "ground",
};

/* ---------------------------------------------------------------- light -------------------------------------- */

export const LIGHT_INITIAL = "morning" as const;
export const LIGHT_CUES: LightCue[] = [
  { at: 170, to: "warm", frames: 60 }, // the Drop: it warms as the frame opens
  { at: 360, to: "day", frames: 60 }, // the rings: bright day
  { at: 1240, to: "evening", frames: 60 }, // toward the convergence
  { at: S4.from + 30, to: "page", frames: 60 }, // the page again, neutral
];

/* ---------------------------------------------------------------- type (frame px) ----------------------------- */

export const TYPE_POS = {
  name: { x: 0, y: 72, w: W, align: "center" as const },
  pairA: { x: 120, y: 756 },
  pairB: { x: 120, y: 864 },
  fixed: { x: 120, y: 268 },
  item: { x: 122, y: 398 },
  title: { x: S4_STONE.x + 112, y: S4_STONE.y - 78 },
  small: { x: S4_STONE.x + 116, y: S4_STONE.y + 78 },
};

/** Every line on screen (composition frames), for the reading checks and the ring overlap check. */
export const TEXTS: TextEvent[] = [
  { id: "name", text: "Pebble", from: 40, to: 181, enterFrames: 30, key: true, kind: "name", rect: { x: 820, y: 72, w: 280, h: 110 } },
  {
    id: "pairA",
    text: "AgentGuard, built in.",
    from: S2.from + S2_BEATS.pairIn,
    to: S2.from + S2_BEATS.pairOut + 16,
    enterFrames: 30,
    key: true,
    pairWith: "pairB",
    rect: { x: 120, y: 756, w: 790, h: 100 },
  },
  { id: "pairB", text: "Reliability, not security.", from: S2.from + S2_BEATS.pairIn + 16, to: S2.from + S2_BEATS.pairOut + 16, enterFrames: 8, rect: { x: 120, y: 864, w: 600, h: 62 } },
  { id: "fixed", text: "Memory you control", from: S3.from + S3_BEATS.fixedIn, to: S3.from + S3_BEATS.fixedOut + 16, enterFrames: 30, kind: "cascade", rect: { x: 120, y: 268, w: 820, h: 110 } },
  ...S3_SCHEDULE.map(
    (w): TextEvent => ({
      id: `item${w.index}`,
      text: w.text,
      from: S3.from + w.inStart,
      to: S3.from + w.outEnd,
      enterFrames: w.inEnd - w.inStart,
      cascadeItem: true,
      kind: "cascade",
      rect: { x: 122, y: 398, w: 640, h: 62 },
    }),
  ),
  { id: "title", text: "Pebble", from: S4.from + S4_BEATS.titleIn, to: DURATION, enterFrames: 30, key: true, kind: "title", rect: { x: 836, y: 462, w: 380, h: 130 } },
  { id: "small", text: "Shown with sample data.", from: S4.from + S4_BEATS.smallIn, to: DURATION, enterFrames: 8, kind: "end", rect: { x: 840, y: 618, w: 540, h: 56 } },
];

/* ---------------------------------------------------------------- QA model ------------------------------------- */

const s2Rect = (r: Rect) => (f: number): Rect => {
  const pose = S2_CAMERA.pose(f - S2.from);
  const p = worldToFrame(r, pose, W, H);
  return { x: p.x, y: p.y, w: r.w * pose.zoom, h: r.h * pose.zoom };
};

export const READABLES: QaReadable[] = [
  { id: "ask", from: S2.from + S2_BEATS.dollyTo, to: S2.from + S2_BEATS.toReceipt, rect: s2Rect(PLACE.ask), words: MUST_READ_WORDS.askTitle + MUST_READ_WORDS.askLine },
  { id: "receipt", from: S2.from + S2_BEATS.receiptFramed, to: S2.from + S2_BEATS.pairOut, rect: s2Rect(PLACE.receipt), words: MUST_READ_WORDS.receiptTop, receipt: true },
  // the typed question in the take (the person's own words, read as they are typed)
  { id: "question", from: 20, to: 170, rect: { x: 700, y: 600, w: 560, h: 60 }, words: 8 },
];

/** The camera pose of the ring plane on a composition frame (S1 and S2 share the world; S3 is east of it; S4 is the page). */
export const ringPoseAt = (f: number): Pose => {
  if (f < S2.from) return S1_CAMERA.pose(f);
  if (f < S3.from) return S2_CAMERA.pose(f - S2.from);
  if (f < S4.from) return S3_CAMERA.pose(f - S3.from);
  return S4_CAMERA.pose(f - S4.from);
};

export const SHOTS: QaShot[] = [
  { id: "S1", from: S1.from, to: S1.to, act: "demo", kind: "ui", camera: S1_CAMERA },
  // QaShot cameras run on frames local to their shot, as these do
  { id: "S2", from: S2.from, to: RACK.at, act: "demo", kind: "ui", camera: S2_CAMERA },
  { id: "S3", from: S3.from, to: IRIS.at, act: "demo", kind: "ui", camera: S3_CAMERA },
  { id: "S4", from: S4.from, to: DURATION, act: "demo", kind: "title", camera: S4_CAMERA },
];

export const SEAMS: QaSeam[] = [
  { at: S1.to, kind: "momentum", frames: 0, out: "S1", in: "S2" },
  { at: RACK.at, kind: "rack", frames: RACK.frames, out: "S2", in: "S3", swapAt: RACK.at + RACK.frames / 2, covered: { from: RACK.at + Math.round(RACK.frames * 0.3), to: RACK.at + Math.round(RACK.frames * 0.7) } },
  { at: IRIS.at, kind: "ring", frames: IRIS.frames, out: "S3", in: "S4" },
];

export const MOVES: QaMove[] = [
  { kind: "product", at: 0, frames: S1.to, label: "S1: the companion take at 1×" },
  { kind: "push", at: 0, frames: 160, label: "S1: the push-in from frame 0" },
  { kind: "push", at: 160, frames: 140, label: "S1: the pull-back into a glide" },
  { kind: "ring", at: RING_BURST.start, frames: 78, label: "S1: the burst to the frame's edge" },
  { kind: "ring", at: RING_ASK.start + 36, frames: 60, label: "S2: the ring leads to the ask and frames it" },
  { kind: "product", at: S2.from + S2_BEATS.askIn, frames: 24, label: "S2: the ask card's entrance (placeholder of the recorded one)" },
  { kind: "swap", at: S3.from + S3_SCHEDULE[1]!.inStart - 8, frames: 16, label: "S3: swap 1" },
  { kind: "swap", at: S3.from + S3_SCHEDULE[2]!.inStart - 8, frames: 16, label: "S3: swap 2" },
  { kind: "push", at: S3.from, frames: 240, label: "S3: the push-in with parallax" },
  { kind: "ring", at: RING_CONVERGE.start, frames: 62, label: "S4: the convergence" },
  ...LIGHT_CUES.map((c): QaMove => ({ kind: "light", at: c.at, frames: c.frames, label: `light to ${typeof c.to === "string" ? c.to : c.to.name}` })),
];

export const demoQa = (): FilmTimelineQa => ({
  name: "F2-Foundation-Demo",
  fps: FPS,
  width: W,
  height: H,
  durationInFrames: DURATION,
  shots: SHOTS,
  seams: SEAMS,
  texts: TEXTS,
  readables: READABLES,
  rings: [RING_BURST, RING_ASK, RING_CONVERGE],
  ringPose: ringPoseAt,
  lightInitial: LIGHT_INITIAL,
  lightCues: LIGHT_CUES,
  acts: [{ id: "demo", from: 0, to: DURATION }],
  isFilm: false,
});

/** The colour the frame shows where no layer is drawn (never black). */
export const BACKGROUND = COLOR.riverbedMid;
export const READ_MIN_PX = CAMERA.uiReadMinPx;
