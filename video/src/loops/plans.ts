// The loops' timelines as data (lane G2b): lengths, stage rects, camera framings, cursor paths, clicks, dissolves and
// source-time maps, per aspect. The components in this folder draw them; loops.test.ts (bun) checks the seam rules on
// them without rendering. Numbers come from docs/FILM_SPEC.md §15–§16 and were re-measured on the real captures
// (video/public/ui/*@3x.png, the vclock recordings in video/public/ui-frames/); every deviation is commented.
//
// Units: frames (30 fps); world units = CSS px of the captured UI (for L1: desktop points); stage rects in frame px.
// Recording times are SOURCE seconds; record.mjs saves frame i at t = i / 30 AFTER the steps due at t ran, so a click
// at t shows its result on the frame at t and its pre-click picture on the frame at t − 1/30.
import type { CamKey, CamPose, Point, Rect } from "../motion/camera";
import type { CursorKey } from "../motion/spec";

export type LoopAspect = "wide" | "tall";
export type SrcKey = readonly [frame: number, seconds: number];
export type Corners = "all" | "top" | "left" | "topLeft" | "none";

/** Stage = a rounded viewport on the riverbed (frame px). */
export interface StagePlan {
  rect: Rect;
  corners: Corners;
}

/** A loop's checkable skeleton (loops.test.ts). */
export interface LoopPlan {
  id: string;
  /** frames; frame N ≡ frame 0 */
  n: number;
  /** compositions that exist for it */
  aspects: readonly LoopAspect[];
  /** camera keys per aspect (local frames), first and last must be the same pose */
  camera: Partial<Record<LoopAspect, readonly CamKey[]>>;
  /** [from, to) frames when the cursor shows (fades included) */
  cursorVisible: readonly (readonly [number, number])[];
  /** click-down frames */
  clicks: readonly number[];
  /** [start, end) of each time-passage dissolve */
  dissolves: readonly (readonly [number, number])[];
}

/** A ROI given as x0–x1, y0–y1, in UI CSS px. */
const box = (x0: number, x1: number, y0: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
/** The pose that puts world point (x0, y0) at the stage's top-left corner, magnified m. */
export const topLeftPose = (x0: number, y0: number, m: number, stage: Rect): CamPose => ({
  x: x0 + stage.w / (2 * m),
  y: y0 + stage.h / (2 * m),
  zoom: m,
});
/** A camera arrival key; "direct" for tilts and small push-ins (the smooth path would pull back on the way). */
const key = (at: number, pose: CamPose, dur?: number, path?: "direct"): CamKey => ({ ...pose, at, ...(dur ? { dur } : {}), ...(path ? { path } : {}) });

/** Wide stages: inset 64 px from the riverbed's edges. */
export const STAGE = {
  /** inset left, right and top; bleeds off the bottom */
  top: { rect: { x: 64, y: 64, w: 1472, h: 936 }, corners: "top" },
  /** inset left and top; bleeds off the right and the bottom */
  topLeft: { rect: { x: 64, y: 64, w: 1536, h: 936 }, corners: "topLeft" },
  /** 4:5: inset left and top; bleeds off the right and the bottom */
  tallTopLeft: { rect: { x: 40, y: 64, w: 1040, h: 1286 }, corners: "topLeft" },
} as const satisfies Record<string, StagePlan>;

/**
 * The Details drawer's own stage (L3, L4): exactly the drawer's width (CSS x 801–1160: its left border line is at 800, the
 * window's right edge at 1160) at
 * magnification m, centred on the riverbed, bleeding off the bottom. A wider stage would show the conversation's
 * cut-off lines on one side and nothing past the window on the other.
 */
export const DRAWER = { x0: 801, x1: 1160 } as const;
export const drawerStage = (m: number, frameW: number, frameH: number, top = 64): StagePlan => {
  const w = Math.round((DRAWER.x1 - DRAWER.x0) * m);
  return { rect: { x: Math.round((frameW - w) / 2), y: top, w, h: frameH - top }, corners: "top" };
};

/* ================================================================================================================ */
/* L2 loop-models (6 s): Settings › Models, the three ways in, a ring on Add a model file.                          */
/* settings-models@3x, measured by ink scan (CSS px): the modal's white x 320–840, its content x 346–814; the        */
/* "Settings" title ends y ≈ 93; tabs box y 112–195; "YOUR MODELS" y 206–214; the model row y 228–306; the buttons    */
/* y 318.5–351.5 (Add a model file x 346–478, Connect provider 487–625, Rest model 634–721); Continue with ChatGPT     */
/* x 346–542, y 382–425; the explanation from y 425.                                                                 */

export const L2 = (() => {
  const stage = STAGE.top;
  // A (poster): the modal's full width at m 2.83 (its white edges on the stage's edges), the tabs (Models selected)
  // down to Continue with ChatGPT; buttons 14 px → 40 px. B: the view moves onto the three ways in (m 3.3, buttons
  // 46 px) while everything else recedes under a light veil (spotlight, R5 §5.3), so the lines cut by the stage's
  // edges never compete; then a ring on Add a model file.
  const A = topLeftPose(320, 96, 2.83, stage.rect);
  const B = topLeftPose(320, 229.5, 3.3, stage.rect);
  const plan = {
    id: "LoopModels",
    n: 180,
    aspects: ["wide"],
    camera: { wide: [key(0, A), key(50, B, 35, "direct"), key(156, A, 30, "direct")] },
    cursorVisible: [],
    clicks: [],
    dissolves: [],
  } satisfies LoopPlan;
  return {
    plan,
    stage,
    /** "Add a model file", the ring's target (FILM_SPEC §16: Even one on your Mac) */
    ring: { rect: box(346, 478, 318.5, 351.5), radius: 8, drawAt: 50, outAt: 120 },
    /** the three ways in and Continue with ChatGPT: what stays sharp under the spotlight (the explanation below
     *  starts at y 429) */
    ways: box(338, 730, 310, 428),
  };
})();

/* ================================================================================================================ */
/* L7 loop-memory (8 s): Settings › Memory, the records; the pointer forgets one.                                  */
/* settings-memory@3x, measured by ink scan: the paragraph above ends y 452; the layer header and its switch y 480–509 */
/* (the switch and the Search button reach x 830); search text y 531–542; records: meta y 579–592 / 644–657 / 710–723, */
/* text 599–609 / 664–674 / 730–738; bins x 793.7–804.3 at y 581–592 / 646–657 / 712–723; the modal ends y ≈ 758.     */
/* settings-memory-forgotten@3x has the next record in the third slot, same positions.                               */

export const L7 = (() => {
  // One framing, m 3.1 (record text 13 px → 40 px; FILM_SPEC said m 2.8): the layer's header and switch, the search
  // box and the three records, down to the modal's bottom edge. The stage bleeds off the right so the switch and the
  // Search button (to x 830) stay whole.
  const stage = STAGE.topLeft;
  const P = topLeftPose(335, 455, 3.1, stage.rect);
  const bin = { x: 799, y: 717.5 };
  const plan = {
    id: "LoopMemory",
    n: 240,
    aspects: ["wide"],
    camera: { wide: [key(0, P)] },
    cursorVisible: [[18, 158]],
    clicks: [60],
    dissolves: [[186, 198]],
  } satisfies LoopPlan;
  return {
    plan,
    stage,
    cursor: [
      { at: 18, x: 852, y: 790, travel: 1 }, // just off the frame's lower right
      { at: 53, x: bin.x + 1, y: bin.y + 1, travel: 35, seed: "l7-in" },
      { at: 96, x: 772, y: 752, travel: 24, seed: "l7-away" }, // off the next record's bin; fades f153–158
    ] satisfies CursorKey[],
    bin: { at: bin, rect: box(791, 807, 709, 726) },
    /** the forgotten record (meta, text and its bin) */
    record: box(340, 812, 702, 744),
    fadeAt: 60,
    fadeFrames: 12,
    swapAt: 72,
  };
})();

/* ================================================================================================================ */
/* L3 loop-approve-undo (10 s): the edit card → Apply edit → Done + Undo this edit (ring) → reset.                  */
/* Source: main-live-film. 9.367 s = the last frame before the 9.40 click (the invoice_kit/dates.py card waiting,    */
/* Apply edit active); 11.067 s = the card applied, the drawer scrolled by the person so "Undo this edit" sits on   */
/* the row where Apply edit was (record.mjs 10.45–10.95 s, lane G2a). Measured by ink scan: card border y 211–721;    */
/* header 227–242; lead 258–288; "Proposed source edit" 308–339; View diff 358–367; diff rows 396–469 and 517–653;     */
/* Apply edit x 1025–1129, y 676–708; at 11.067 "Undo this edit" x 839–935, y 688–697, the next card from y 747.       */
/* (R3 crop-approval-card-done was never captured; FILM_SPEC's fallback.)                                            */

export const L3 = (() => {
  const m = 3.1; // body 13 px → 40 px
  const stage = drawerStage(m, 1600, 1000);
  const U = topLeftPose(DRAWER.x0, 202, m, stage.rect); // the card's top border, header, lead, the diff's first rows
  const L = topLeftPose(DRAWER.x0, 430, m, stage.rect); // the diff and the button row, down to the card's bottom border
  const apply = { x: 1077, y: 692 };
  const plan = {
    id: "LoopApproveUndo",
    n: 300,
    aspects: ["wide"],
    camera: { wide: [key(0, U), key(44, L, 30, "direct"), key(240, U, 30, "direct")] },
    cursorVisible: [[26, 104]],
    clicks: [57],
    dissolves: [[190, 202]],
  } satisfies LoopPlan;
  return {
    plan,
    stage,
    waiting: 9.367,
    applied: 11.067,
    cursor: [
      { at: 26, x: 1210, y: 790, travel: 1 }, // off the stage's lower right
      { at: 51, x: apply.x + 8, y: apply.y + 3, target: 30, seed: "l3-in" },
      { at: 98, x: 1205, y: 800, travel: 26, seed: "l3-out" },
    ] satisfies CursorKey[],
    applyRect: box(1025, 1129, 676, 708),
    clickPoint: apply,
    cutAt: 61,
    undoRing: { rect: box(832, 941, 681, 704), radius: 6, drawAt: 76, outAt: 180 },
  };
})();

/* ================================================================================================================ */
/* L4 loop-isolated-tests (8 s): the real "Run isolated tests" card → Run tests → "Requesting isolated tests · 11 s" */
/* → "Verified · pytest 42 passed on current files" → reset (critic C3: no counter, nothing invented).              */
/* Source: main-live-film, measured by ink scan. The card (16.6 s, static until the 17.80 click): border y 211–542,  */
/* text rows y 227–529, Run tests x 1029–1129, y 497–529. After the click the drawer shows STEPS; the person scrolls   */
/* it 18.4–19.0 s (R2): "Verification remains incomplete" y 311–322, "You asked Pebble to run the tests" 336–345,      */
/* "Approved: Requesting isolated tests · 2 s" 360–371, "Requesting isolated tests" 385–396 (" · 11 s" at 20.40),     */
/* then at 20.60 "Verified · pytest 42 passed on current files / · 2 s" y 409–437 ("Pebble is working on this." moves */
/* from 440 to 489). "Waiting for the model" is added at 20.70 (the hold freezes on 20.65).                          */

export const L4 = (() => {
  const m = { wide: 3.0, tall: 2.9 };
  const stage = { wide: drawerStage(m.wide, 1600, 1000), tall: drawerStage(m.tall, 1080, 1350) };
  // One framing (the camera holds while the UI acts): C, the card's title to its buttons (y 221–533 at m 3.0; the tall
  // cut adds STEPS below). After the click the same region shows the drawer's steps: the newest rows (y 311–437),
  // "Pebble is working on this." and EARLIER ACTIONS all land inside it. (R, the rows framing, is kept for reference.)
  const C = { wide: topLeftPose(DRAWER.x0, 221, m.wide, stage.wide.rect), tall: topLeftPose(DRAWER.x0, 200, m.tall, stage.tall.rect) };
  const R = { wide: topLeftPose(DRAWER.x0, 300, m.wide, stage.wide.rect), tall: topLeftPose(DRAWER.x0, 300, m.tall, stage.tall.rect) };
  const run = { x: 1079, y: 513 };
  const click = 39;
  const plan = {
    id: "LoopIsolatedTests",
    n: 240,
    aspects: ["wide", "tall"],
    camera: { wide: [key(0, C.wide)], tall: [key(0, C.tall)] },
    cursorVisible: [[12, 62]],
    clicks: [click],
    dissolves: [[186, 198]],
  } satisfies LoopPlan;
  // The source: the card holds (16.60) until the click; the press is drawn over the pre-click frame (17.767); from
  // f43 the drawer plays from 17.80 at 1×, 19.0 → 20.35 at 1.5× (the tests run; nothing else changes), then 1× so
  // "· 11 s" lands at f107 and Verified at f114; the hold freezes on 20.65.
  const src: SrcKey[] = [
    [0, 16.6],
    [click - 1, 16.6],
    [click, 17.767],
    [click + 3, 17.767],
    [click + 4, 17.8],
    [click + 40, 19.0],
    [click + 67, 20.35],
    [click + 75, 20.617],
    [click + 76, 20.65],
  ];
  return {
    plan,
    stage,
    poses: { C, R },
    src,
    resetSrc: 16.6,
    cursor: [
      { at: 12, x: 1215, y: 640, travel: 1 },
      { at: click - 6, x: run.x + 6, y: run.y + 2, target: 30, seed: "l4-in" },
      { at: 58, x: 1215, y: 700, travel: 16, seed: "l4-out" },
    ] satisfies CursorKey[],
    runRect: box(1029, 1129, 497, 529),
  };
})();

/* ================================================================================================================ */
/* L6 loop-agentguard (8 s): "Pebble's change isn't verified yet." → Run the tests → Verified.                      */
/* Source: main-live-film, measured by ink scan. The held run in the conversation (15.10 s, static until the 16.00    */
/* click): the reply's last line ends y 311; its notice "Verification remains incomplete: …" y 332–381 (x 295–688);   */
/* the usage line 404–416; the avatar and "Blocked" 453–468 (from x 260); the sentence 495–536 (to x 695), "Details"   */
/* x 730–764; the buttons' text y 557–566 (Run the tests ≈ x 297–391, y 547–577); the composer from y 648. After the  */
/* click (16.0) the conversation moves down 44 px and shows "Needs your review" (497–509) and the banner "1 action     */
/* needs your review / Nothing changes until you approve." (536–596, x 295–765): Pebble asks to run the tests in an    */
/* isolated copy. Then a time-passage dissolve (the person approves; the tests run) to the Details drawer, where       */
/* AgentGuard's check lands: "Verified · pytest 42 passed on current files · 2 s" (20.60, y 409–437; see L4).         */

export const L6 = (() => {
  const stage = { wide: STAGE.topLeft, tall: STAGE.tallTopLeft };
  // Shot A, the hold: m 3.1 (13 px → 40 px), x 232–727 (the avatar at 260; the right edge falls just before the
  // "Details" link at 730, so the poster frame has no cut word; after the click the banner's right end bleeds off),
  // y 318–620 (the notice to the buttons; the reply line above ends at 311, the composer starts at 648).
  // Shot B, the check: the drawer alone fills the stage (m = stage width / 359 = 4.28; 56 px rows).
  // Tall (4:5): A at m 2.6 (13 px → 34 px; y 262–757), the sentence's tail bleeding off the right edge, the three
  // buttons whole; B at the drawer's width (m 2.9).
  const A = { wide: topLeftPose(232, 318, 3.1, stage.wide.rect), tall: topLeftPose(252, 262, 2.6, stage.tall.rect) };
  const mB = { wide: stage.wide.rect.w / (DRAWER.x1 - DRAWER.x0), tall: stage.tall.rect.w / (DRAWER.x1 - DRAWER.x0) };
  const B = { wide: topLeftPose(DRAWER.x0, 300, mB.wide, stage.wide.rect), tall: topLeftPose(DRAWER.x0, 300, mB.tall, stage.tall.rect) };
  const runTheTests = { x: 344, y: 562 };
  const click = 41;
  const plan = {
    id: "LoopAgentGuard",
    n: 240,
    aspects: ["wide", "tall"],
    camera: { wide: [key(0, A.wide)], tall: [key(0, A.tall)] },
    cursorVisible: [[12, 62]],
    clicks: [click],
    dissolves: [
      [84, 96],
      [190, 202],
    ],
  } satisfies LoopPlan;
  const srcA: SrcKey[] = [
    [0, 15.1],
    [click - 1, 15.1],
    [click, 15.967],
    [click + 3, 15.967],
    [click + 4, 16.0],
    [click + 22, 16.6],
  ];
  // Shot B starts mid-dissolve on "Requesting isolated tests" (running), "· 11 s" lands at 20.40 (f103) and
  // Verified at 20.60 (f109); the hold freezes on 20.65.
  const srcB: SrcKey[] = [
    [84, 20.0],
    [96, 20.2],
    [102, 20.4],
    [108, 20.6],
    [110, 20.65],
  ];
  return {
    plan,
    stage,
    poses: { A, B },
    srcA,
    srcB,
    resetSrc: 15.1,
    cursor: [
      { at: 12, x: 560, y: 720, travel: 1 }, // off the stage's lower right (wide); the tall frame starts it lower
      { at: click - 6, x: runTheTests.x + 6, y: runTheTests.y + 2, target: 30, seed: "l6-in" },
      { at: 58, x: 520, y: 720, travel: 16, seed: "l6-out" },
    ] satisfies CursorKey[],
    runRect: box(297, 391, 547, 577),
  };
})();

/* ================================================================================================================ */
/* L1 loop-companion (12 s): the pebble on its desktop → the pointer → click → the quick chat → the reply → close.   */
/* Desktop points; the pet as in the film (film/timeline.ts PET: centre (1080, 750), its panel 384 × 456 at          */
/* (753.3, 352.7)). The recording (petLive, the pebble hidden): click 0.60 s (panel on the 0.60 frame), typing        */
/* 1.30–2.90, Enter 3.00, queued 3.15, running 3.30, the reply streams 4.60–6.40, completed 6.60.                    */
/* Measured in the panel (CSS): card x 9–375, y 9–361; "Minimize to pebble" × at (347, 42), its button ±12; the      */
/* composer x 17–369, y 263–315; greeting 19 px; feed text 13 px.                                                   */
/*                                                                                                                  */
/* N = 360, not FILM_SPEC's 300: the app keeps the pebble happy for 4.5 s after a completed reply (companionState.ts */
/* COMPLETED_MS; the pose wins over tap and hover), and minimizing the chat doesn't end it, so the truthful loop      */
/* closes the chat while the pebble still celebrates and lets it settle to idle on the desktop before the seam.      */
/* Typing plays at 2× and the queued-to-first-token wait at 1.5× (the clock in the panel's status runs faster too).   */

export const L1 = (() => {
  const n = 360;
  const click = 46;
  const close = 254;
  // the source map: click → panel (0.60) on the click frame
  const src: SrcKey[] = [
    [click, 0.6],
    [click + 21, 1.3], // greeting held at 1×
    [click + 45, 2.9], // typing at 2×
    [click + 53, 3.15], // Enter, Sending
    [click + 82, 4.6], // Thinking at 1.5×
    [click + 142, 6.6], // the reply streams at 1×; completed (f188)
    [close, 8.53],
  ];
  const completed = click + 142; // 6.60 s
  const happyEnds = completed + 135; // + 4.5 s (COMPLETED_MS)
  const plan = {
    id: "LoopCompanion",
    n,
    aspects: ["wide", "tall"],
    camera: {
      // W: the pebble on its desktop (m 1.8, as FILM_SPEC; the panel's room above and to its left). P: the open chat,
      // m 2.1 (the greeting 19 px → 40 px). Tall: one framing, m 2.75, the whole panel and the pebble.
      wide: [key(0, { x: 808.4, y: 583.4, zoom: 1.8 }), key(76, { x: 945.3, y: 576.7, zoom: 2.1 }, 26), key(238, { x: 808.4, y: 583.4, zoom: 1.8 }, 26)],
      tall: [key(0, { x: 945.3, y: 594, zoom: 2.75 })],
    },
    cursorVisible: [
      [12, 70],
      [214, 292],
    ],
    clicks: [click, close],
    dissolves: [],
  } satisfies LoopPlan;
  return {
    plan,
    src,
    click,
    close,
    completed,
    happyEnds,
    /** the hidden avatar's centre in the panel (FILM_SPEC §7.1, film/timeline.ts PET.inPanel) */
    avatarInPanel: { x: 326.7, y: 397.3 } satisfies Point,
    /** "Minimize to pebble" in the panel */
    minimize: { at: { x: 347, y: 42 }, rect: box(335, 359, 30, 54) },
  };
})();

/* ================================================================================================================ */
/* L8 loop-views (10 s): the Lisbon trip budget dashboard → into its chart → the quiz → back.                       */
/* main-dashboard@3x (1440 × 900): the canvas's chart panel x 680–1405, y 435–900 (bars, labels, legend);           */
/* main-quiz@3x (1160 × 800): the quiz card x 740–1130, y 215–750, the question y 372–400 (22 px).                   */
/* Both are windows on the riverbed desktop (world = desktop px; the dashboard window at (80, 50)).                  */

export const L8 = (() => {
  const dash = { x: 80, y: 50, w: 1440, h: 900 };
  const quiz = { x: 220, y: 100, w: 1160, h: 800 };
  const wide: CamPose = { x: 800, y: 500, zoom: 1 };
  const chart: CamPose = { x: dash.x + 1040, y: dash.y + 668, zoom: 2.0 }; // the window's right edge on the frame's
  const quizPose: CamPose = { x: quiz.x + 935, y: quiz.y + 438, zoom: 2.4 };
  const plan = {
    id: "LoopViews",
    n: 300,
    aspects: ["wide"],
    camera: { wide: [key(0, wide), key(42, chart, 24), key(234, wide, 24)] },
    cursorVisible: [],
    clicks: [],
    dissolves: [],
  } satisfies LoopPlan;
  // three holds of 2.8 s (wide across the seam, chart, quiz) and two 0.8 s moves: nothing static for more than 3 s
  return { plan, dash, quiz, poses: { wide, chart, quiz: quizPose }, cutToQuiz: 126, cutBack: 210 };
})();

/* ================================================================================================================ */
/* T0 FilmTeaser (8 s, 1280 × 720): approve → test → Verified, in the film poster's frame (FILM_SPEC §15).          */
/* Window world: world = the main window's CSS px; the window at m 0.75 (870 × 600) centred, on the riverbed.        */

export const T0 = (() => {
  const wide: CamPose = { x: 580, y: 400, zoom: 0.75 };
  // the card's lower half at m 1.9 (the window's right edge 34 units inside the frame); the tests card at m 1.8
  const card: CamPose = { x: 857, y: 545, zoom: 1.9 };
  const tests: CamPose = { x: 905, y: 395, zoom: 1.8 };
  const plan = {
    id: "FilmTeaser",
    n: 240,
    aspects: ["wide"],
    camera: { wide: [key(0, wide), key(38, card, 24), key(96, tests, 1), key(209, wide, 24)] },
    cursorVisible: [
      [36, 92],
      [98, 194],
    ],
    clicks: [60, 126],
    dissolves: [[210, 222]],
  } satisfies LoopPlan;
  const src: SrcKey[] = [
    [0, 8.3],
    [38, 8.3],
    [56, 9.3],
    [59, 9.367],
    [63, 9.367], // the press is drawn over the last frame before the click
    [64, 11.067], // the match cut: the card applied, Undo this edit on the same row
    [95, 11.067],
    [96, 16.6], // hard cut: the "Run isolated tests" card
    [120, 17.4],
    [125, 17.767],
    [129, 17.767], // press
    [130, 17.8],
    [149, 20.55], // the drawer's newest steps, ≈3.7× (FILM_SPEC §15)
    [150, 20.6], // Verified
    [186, 21.8],
    [209, 22.9],
    [222, 22.9],
  ];
  return {
    plan,
    src,
    poster: 8.3,
    cursor: [
      { at: 36, x: 1290, y: 760, travel: 1 },
      { at: 55, x: 1085, y: 695, target: 30, seed: "t0-apply" },
      { at: 90, x: 1290, y: 820, travel: 24, seed: "t0-away" },
      { at: 98, x: 1290, y: 600, travel: 1 },
      { at: 120, x: 1086, y: 514, target: 30, seed: "t0-run" },
      { at: 152, x: 1186, y: 468, travel: 20, seed: "t0-out" }, // off the window, onto the desktop; fades f189–194
    ] satisfies CursorKey[],
    applyRect: box(1025, 1129, 676, 708),
    runRect: box(1029, 1129, 497, 529),
    clickPoint: { x: 1077, y: 692 },
  };
})();

export const LOOP_PLANS = [L1.plan, L2.plan, L3.plan, L4.plan, L6.plan, L7.plan, L8.plan, T0.plan] as const;
