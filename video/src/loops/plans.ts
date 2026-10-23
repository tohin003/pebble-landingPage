// The loops' timelines as data: lengths, cards, camera framings, cursor paths, clicks, dissolves and source-time maps,
// per aspect. The components in this folder draw them; check.ts (bun) checks the seam rules, the frame contract and the
// reading floor on them without rendering. Lane G2b wrote the timelines (docs/FILM_SPEC.md §15–§16); lane v2-loops moved
// every loop into the design system (docs/PHILOSOPHY.md, docs/DESIGN-LEXINGTON.md §3.8): one card, wholly inside the
// frame, at about the app's own scale.
//
// Units: frames (30 fps); world units = CSS px of the captured UI (for L1: desktop points); cards in frame px.
// Recording times are SOURCE seconds; record.mjs saves frame i at t = i / 30 AFTER the steps due at t ran, so a click
// at t shows its result on the frame at t and its pre-click picture on the frame at t − 1/30.
// Measurements are ink scans of the captures (video/public/ui/*@3x.png, the vclock recordings in public/ui-frames/);
// lane v2-loops re-checks them on Pebble 1.0.4's captures (HANDOFF-v2-loops.md).
import type { CamKey, CamPose, Rect } from "../motion/camera";
import type { CursorKey } from "../motion/spec";

/** "wide": the page's 16:10 loop; "square": a 1:1 tile (the project story, comp lex-A); "tall": the 4:5 phone cut. */
export type LoopAspect = "wide" | "square" | "tall";
export type SrcKey = readonly [frame: number, seconds: number];

/* ================================================================================================================ */
/* The frame contract, as numbers                                                                                  */

/** Video sizes per aspect (px). */
export const FRAME = {
  wide: { w: 1600, h: 1000 },
  square: { w: 1080, h: 1080 },
  tall: { w: 1080, h: 1350 },
} as const satisfies Record<LoopAspect, { w: number; h: number }>;

/**
 * Design slots: the CSS width the page gives each loop (DESIGN-LEXINGTON §6 and comp lex-A at a 1440 px window: a 1280 px
 * container of 12 columns with 32 px gaps, so n columns are 77.33 n + 32 (n − 1) px), and the phone every 4:5 cut is
 * judged on. A slot sets `k`, the video px per page px, which sizes the card's radius and shadow and the reading floor.
 */
export const SLOT = {
  /** On your desktop: the vignette across columns 1–12 */
  companion: 1280,
  /** Models: the picture in columns 4–9 */
  models: 624,
  /** the project story's tile, columns 8–12, square (comp lex-A `.tile`) */
  story: 515,
  /** the evidence ledger's figure, columns 7–12 */
  agentGuard: 624,
  /** Memory: 6 columns. The records are 504 CSS px wide: at 4 columns (405 px) they would render at about 9 px */
  memory: 624,
  /** Views: the main column, columns 4–12. At 5 columns the chart and the quiz are pictures, not text */
  views: 952,
  /**
   * Every 4:5 cut, judged on a 360 px wide phone, where the page's frame is 328 px wide: the system's 16 px phone gutters
   * (--pad) on each side. (Lane v2-loops first judged them at 360 px, as if they ran edge to edge; they never do.)
   */
  phone: 328,
} as const;

/** Video px per page px for a loop shown `slot` CSS px wide. */
export const kOf = (slot: number, frameW: number) => frameW / slot;

/**
 * The least riverbed a card leaves on each side (video px). A card that bleeds off an edge reads as a cropped screenshot;
 * one that sits whole on the ground reads as a moment set down on the page (comp lex-A's tile and film frame). On the
 * 4:5 cuts the sides are 28 px (8.5 page px in a 328 px frame): the card gets the width the phone needs to read it, and
 * the 4:5 frame's extra height keeps the ground above and below it (comp lex-A's phone tile does the same).
 */
export const MARGIN = {
  wide: { x: 64, y: 48 },
  square: { x: 64, y: 48 },
  tall: { x: 28, y: 48 },
} as const satisfies Record<LoopAspect, { x: number; y: number }>;

/**
 * The reading floor (DESIGN-LEXINGTON §3.8: text in a picture renders at 12 px or more): the key text of every framing,
 * in page px at the slot. Pebble's own text is 12–13 px (RunPanel 13, ActionReview 12, the drawer's steps 12), so a
 * card at about the app's own scale meets it. The 4:5 cuts are judged in a 360 px phone's 328 px frame, where the page's
 * own phone crop of the story's steps (ProjectStory STEPS: 330 CSS px at 92 % of the frame) renders the app's 12 px at
 * 11 px: their floor is 11 px there, and the same cuts render 12 px on a 390 px phone (358 px frame).
 */
export const READ_FLOOR = { wide: 12, square: 12, tall: 11 } as const satisfies Record<LoopAspect, number>;

/** A card: where the real UI sits on the riverbed (frame px), and how it is drawn (kit.tsx LoopStage). */
export interface StagePlan {
  rect: Rect;
  /** video px per page px at the loop's slot */
  k: number;
  aspect: LoopAspect;
}

/** One line a framing must make readable: its CSS size in the app and the magnification it is seen at. */
export interface Read {
  aspect: LoopAspect;
  what: string;
  /** the app's font size, CSS px */
  css: number;
  /** the camera's magnification in that framing */
  m: number;
  k: number;
  /** a known shortfall, explained in HANDOFF-v2-loops.md (check.ts reports it instead of failing) */
  waived?: string;
}
/** The size `read` renders at on the page, px. */
export const pagePx = (r: Read) => (r.css * r.m) / r.k;

/** A loop's checkable skeleton (check.ts). */
export interface LoopPlan {
  id: string;
  /** frames; frame N ≡ frame 0 */
  n: number;
  /** compositions that exist for it */
  aspects: readonly LoopAspect[];
  /** camera keys per aspect (local frames), first and last must be the same pose */
  camera: Partial<Record<LoopAspect, readonly CamKey[]>>;
  /** the cards per aspect (none for L1 and T0: their scene is the desktop itself) */
  stages: Partial<Record<LoopAspect, readonly StagePlan[]>>;
  /** what must be readable, per aspect */
  reads: readonly Read[];
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

/**
 * A card centred in the frame that shows `region` (CSS px) at about magnification m. The card's width is rounded to whole
 * px and the magnification follows it exactly, so the region's left and right edges are the card's.
 */
export const card = (region: Rect, m: number, aspect: LoopAspect, slot: number): { stage: StagePlan; m: number; pose: CamPose } => {
  const F = FRAME[aspect];
  const w = Math.round(region.w * m);
  const mm = w / region.w;
  const h = Math.round(region.h * mm);
  const rect = { x: Math.round((F.w - w) / 2), y: Math.round((F.h - h) / 2), w, h };
  return { stage: { rect, k: kOf(slot, F.w), aspect }, m: mm, pose: topLeftPose(region.x, region.y, mm, rect) };
};

/**
 * The Details drawer (L3, L4, L6's second shot): CSS x 801–1160 (its left border line is at 800, the window's right
 * edge at 1160). Its cards fill the drawer's width, so a drawer card's left and right edges are the drawer's.
 */
export const DRAWER = { x0: 801, x1: 1160 } as const;

/* ================================================================================================================ */
/* L2 loop-models (6 s): Settings › Models, the three ways in.                                                      */
/* settings-models@3x (Pebble 1.0.4), measured by ink scan (CSS px): the modal's white x 321–839, its content          */
/* x 346–814; "YOUR MODELS" y 206–214.3; the model row y 228–290 (one line since 1.0.4: the duplicated "4,096-token    */
/* window" of 1.0.1 is gone, REVIEW-G2 P2-13); the buttons y 302–336 (Add a model file x 346–479, Connect provider    */
/* 487–626, Rest model 634–721); Continue with ChatGPT x 346–542, y 366–410; its qualifier ("Use an eligible Plus or  */
/* Pro plan through OpenAI's preview …") x 346.7–801, two lines y 425.7–455; the next paragraph from y 473.7.         */

export const L2 = (() => {
  // One card, one framing, at the app's own scale on the Models slot (k 2.56 → m 2.6): the models list, the three
  // ways in and the ChatGPT qualifier (OVERRIDES §8 H14; REVIEW-G2 P2-16: the qualifier never recedes). The tabs stay
  // out: with them the card could not keep the app's scale. The loop is a spotlight, no camera move: the three ways
  // come forward (the models list recedes), hold, and go back. Lane G2b's push-in and accent ring are gone (the ring
  // pointed in the accent, which has three other jobs).
  const wide = card(box(336, 824, 198, 464), 2.6, "wide", SLOT.models);
  const plan = {
    id: "LoopModels",
    n: 180,
    aspects: ["wide"],
    camera: { wide: [key(0, wide.pose)] },
    stages: { wide: [wide.stage] },
    reads: [
      { aspect: "wide", what: "Add a model file, Connect provider, Rest model", css: 13, m: wide.m, k: wide.stage.k },
      { aspect: "wide", what: "the ChatGPT qualifier", css: 12, m: wide.m, k: wide.stage.k },
    ],
    cursorVisible: [],
    clicks: [],
    dissolves: [],
  } satisfies LoopPlan;
  return {
    plan,
    stage: { wide: wide.stage },
    /** the three ways in, Continue with ChatGPT and its qualifier: what stays sharp under the spotlight */
    ways: box(338, 822, 294, 464),
    /**
     * the spotlight: in over 12 frames from f30, held f42–126 (2.8 s), out over 12 frames from f126. Nothing is still for
     * more than 3 s (R5): with the way out at f132 the hold measured 3.03 s on the review render (lane v2-loops)
     */
    spot: { in: 30, out: 126, dur: 12 },
  };
})();

/* ================================================================================================================ */
/* L7 loop-memory (7 s): Settings › Memory, the records; the pointer forgets one.                                  */
/* settings-memory@3x (Pebble 1.0.4; the tab now opens on "Remember useful context" and the six layers' tiles, the   */
/* records below), measured by ink scan: the layer header and its switch y 479.7–509; the search box and Search      */
/* y 519–552 (both to x 814); records: meta y 578.7–592.3 / 643.3–657.3 / 709.3–723.3, text 598.7–609 / 663.7–674 /   */
/* 729.7–738.3, dividers 626 and 692; bins x 793.7–804.3; the modal's white ends at x 839 and y 757.7.                */
/* settings-memory-forgotten@3x has the next record in the third slot, same positions (the layer's tile reads 5).    */

export const L7 = (() => {
  // One card: the layer's header ("Learning and recall in this layer / Your preferences") and switch, the search box
  // and the three records, down to just above the modal's bottom edge (757.7: below it the app's blurred backdrop would
  // show as a grey band, REVIEW-G2 P2-10), at the app's own scale on a 6-column slot (m 2.6), with the sheet's own
  // 10 px either side of its content (x 346–814), as L2's card.
  const wide = card(box(336, 824, 466, 756), 2.6, "wide", SLOT.memory);
  const bin = { x: 799, y: 717.5 };
  // lane G-fix (REVIEW-G2 P2-19): N 210, not 240: the forgotten state held still for 3.9 s (f72–187, R5: nothing static
  // for more than 3 s); it now holds f84–156 (2.4 s) before the time-passage dissolve
  const plan = {
    id: "LoopMemory",
    n: 210,
    aspects: ["wide"],
    camera: { wide: [key(0, wide.pose)] },
    stages: { wide: [wide.stage] },
    reads: [{ aspect: "wide", what: "the records", css: 13, m: wide.m, k: wide.stage.k }],
    // lane G-fix (REVIEW-G2 P1-9): the pointer hides once it has acted (FILM_SPEC §10), fading f79–84 where it clicked
    cursorVisible: [[18, 84]],
    clicks: [60],
    dissolves: [[156, 168]],
  } satisfies LoopPlan;
  return {
    plan,
    stage: { wide: wide.stage },
    cursor: [
      { at: 18, x: 852, y: 790, travel: 1 }, // on the riverbed, off the card's lower right
      { at: 53, x: bin.x + 1, y: bin.y + 1, travel: 35, seed: "l7-in" },
    ] satisfies CursorKey[],
    bin: { at: bin, rect: box(791, 807, 709, 726) },
    /** the forgotten record (meta, text and its bin) */
    record: box(340, 812, 702, 744),
    fadeAt: 60,
    fadeFrames: 12,
    swapAt: 72,
    /**
     * The next record arrives in the emptied slot as a 200 ms opacity change (the system's "the world snaps"), not in a
     * single frame: after the 0.4 s fade a pop of new words read as a text swap (REVIEW-G2 P2-19). The app re-renders
     * the list at once; the pixels are the forgotten still's own.
     */
    arriveFrames: 6,
  };
})();

/* ================================================================================================================ */
/* L3 loop-approve-undo (9 s): the edit card → Apply edit → Done + Undo this edit → reset.                          */
/* Source: main-live-film. 9.367 s = the last frame before the 9.40 click (the invoice_kit/dates.py card waiting,    */
/* Apply edit active); 11.067 s = the card applied, the drawer scrolled by the person so "Undo this edit" sits on   */
/* the row where Apply edit was (record.mjs 10.45–10.95 s, lane G2a). Measured by ink scan: card border y 211–721;    */
/* header 227–242; lead 258–288; "Proposed source edit" 308–339; View diff 358–367; diff rows 396–469 and 517–653     */
/* (a gap between rows at 406.7 | 415.7); Apply edit x 1025–1129, y 676–708; at 11.067 "Undo this edit" x 839–935,     */
/* y 688–697, the drawer's Pause button y 425–457.7 and the next card from y 747 (its status must never show: that    */
/* would be a second edit applied without a click, REVIEW-G2 P0-2).                                                  */

/**
 * The project story's card (L3 and L4 share it, so switching steps keeps the same card on the same ground). Each
 * framing's edges fall between rows on every frame the loops hold still (Pebble 1.0.4, ink scans of main-live-film at
 * 9.367, 11.067, 16.6, 17.8–18.4, 19.0–20.4 and 20.65 s). `x0` is the framings' left edge, `U` and `L` their tops.
 * - Square, the 515 px tile: the drawer's full width (801–1160) and 433 CSS px of it at m 2.2, so the app's 12 px
 *   renders at 12.6 px (the card 73 % of the tile; comp lex-A's is 76 %). U 205–638 (the card's top border at 211; the
 *   diff row 619–631.7 whole, the next from 640), L 296–729 (the lead ends 288.3, "Proposed source edit" from 308; on
 *   the applied frame the steps row 299–310.3 whole, Undo this edit 688–697.3, the next card's header from 749); L4
 *   205–638 (on the card frame the last step 626–637.3 whole; at the payoff the rows 609.3–619.3 and 639 straddle the
 *   edge cleanly).
 * - Tall, the 4:5 phone cut in a 360 px phone's 328 px frame: the drawer's content only (x 811–1150; its cards span
 *   815.3–1145.7) and 376.5 CSS px of it at m 3.02 (the card 95 % of the frame's width), so the app's 12 px renders at
 *   11.0 px (12.1 px on a 390 px phone). U and L4 201–577.4 (above: the "Needs your review" label ends 197.3, the next
 *   row starts 203 after the scroll; below: rows end 571.3–576.3 and the next start 578.7–584 on every held frame), L
 *   354–730.4 ("Proposed source edit" ends 339.3 and View diff starts 358; on the applied frame a step ends 351.3 and
 *   the next starts 359.7; the card's bottom border is at 721 and the next card's edge at 733).
 */
const STORY = {
  square: { ...card(box(DRAWER.x0, DRAWER.x1, 205, 638), 2.2, "square", SLOT.story), x0: DRAWER.x0, U: 205, L: 296 },
  tall: { ...card(box(811, 1150, 201, 577.5), 1024 / 339, "tall", SLOT.phone), x0: 811, U: 201, L: 354 },
} as const;

export const L3 = (() => {
  // Two framings in one card: U, the card's top (its file name, "Changes this file in your project. You can undo it
  // afterwards." and the diff's first rows); L, from "Proposed source edit" (square; View diff on the 4:5 cut) down to
  // the buttons (Apply edit 676–708), ending before the next card (733). The view tilts U → L as a reader's eye would,
  // and back for the seam.
  const at = (aspect: "square" | "tall") => {
    const s = STORY[aspect];
    return { U: topLeftPose(s.x0, s.U, s.m, s.stage.rect), L: topLeftPose(s.x0, s.L, s.m, s.stage.rect) };
  };
  const P = { square: at("square"), tall: at("tall") };
  const apply = { x: 1077, y: 692 };
  // lane G-fix (REVIEW-G2 P2-19): N 270, not 300 (the applied card held still 3.3 s): the dissolve runs f160–172 and
  // the view tilts back f180–210
  const plan = {
    id: "LoopApproveUndo",
    n: 270,
    aspects: ["square", "tall"],
    camera: {
      square: [key(0, P.square.U), key(44, P.square.L, 30, "direct"), key(210, P.square.U, 30, "direct")],
      tall: [key(0, P.tall.U), key(44, P.tall.L, 30, "direct"), key(210, P.tall.U, 30, "direct")],
    },
    stages: { square: [STORY.square.stage], tall: [STORY.tall.stage] },
    reads: [
      { aspect: "square", what: "the card's lead, the diff and the buttons", css: 12, m: STORY.square.m, k: STORY.square.stage.k },
      { aspect: "tall", what: "the card's lead, the diff and the buttons", css: 12, m: STORY.tall.m, k: STORY.tall.stage.k },
    ],
    cursorVisible: [[26, 104]],
    clicks: [57],
    dissolves: [[160, 172]],
  } satisfies LoopPlan;
  return {
    plan,
    stage: { square: STORY.square.stage, tall: STORY.tall.stage },
    poses: P,
    waiting: 9.367,
    appliedAt: 11.067,
    cursor: [
      { at: 26, x: 1210, y: 790, travel: 1 }, // on the riverbed, off the card's lower right
      { at: 51, x: apply.x + 8, y: apply.y + 3, target: 30, seed: "l3-in" },
      { at: 98, x: 1205, y: 800, travel: 26, seed: "l3-out" },
    ] satisfies CursorKey[],
    applyRect: box(1025, 1129, 676, 708),
    clickPoint: apply,
    cutAt: 61,
    /**
     * The applied card (11.067 s: its borders x 817–1145, y 495–719; "invoice_kit/dates.py · Done" in its header at
     * 512.7–525.7, "Undo this edit" x 838.7–934.7, y 688–697.3): after the match cut it comes forward and the steps
     * above it recede (the spotlight, in the window's own colour: what lane G2b's accent ring did for the Undo row
     * alone), so the frame reads "Done", then "Undo this edit", until the dissolve.
     */
    applied: { rect: box(816, 1146, 494, 720), radius: 12, in: 76, out: 150, dur: 12 },
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
  // One framing, the story's card (shared with L3): the card whole from its title to Run tests, with the drawer's
  // ground below it; after the click the newest steps, "Pebble is working on this." and EARLIER ACTIONS land in the
  // same card. The camera holds while the UI acts.
  const C = {
    square: topLeftPose(STORY.square.x0, STORY.square.U, STORY.square.m, STORY.square.stage.rect),
    tall: topLeftPose(STORY.tall.x0, STORY.tall.U, STORY.tall.m, STORY.tall.stage.rect),
  };
  const run = { x: 1079, y: 513 };
  const click = 39;
  const plan = {
    id: "LoopIsolatedTests",
    n: 240,
    aspects: ["square", "tall"],
    camera: { square: [key(0, C.square)], tall: [key(0, C.tall)] },
    stages: { square: [STORY.square.stage], tall: [STORY.tall.stage] },
    reads: [
      { aspect: "square", what: "the card and the drawer's steps", css: 12, m: STORY.square.m, k: STORY.square.stage.k },
      { aspect: "tall", what: "the card and the drawer's steps", css: 12, m: STORY.tall.m, k: STORY.tall.stage.k },
    ],
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
    stage: { square: STORY.square.stage, tall: STORY.tall.stage },
    poses: { C },
    src,
    resetSrc: 16.6,
    cursor: [
      { at: 12, x: 1215, y: 700, travel: 1 }, // on the riverbed, off the card's lower right
      { at: click - 6, x: run.x + 6, y: run.y + 2, target: 30, seed: "l4-in" },
      { at: 58, x: 1215, y: 760, travel: 16, seed: "l4-out" },
    ] satisfies CursorKey[],
    runRect: box(1029, 1129, 497, 529),
    /**
     * The payoff's spotlight (lane G-fix, REVIEW-G2 P1-9): as "Verified · pytest 42 passed on current files" lands
     * (f114), the drawer's rows above "Requesting isolated tests" (y < 378: "Not verified · 2 changed files, no tests
     * run", "Verification remains incomplete", …) recede under the veil, so on the page the loop never reads as "Not
     * verified". f110–122 in, held through the dissolve; nothing at either end of the loop.
     */
    payoff: { rect: box(DRAWER.x0, DRAWER.x1, 378, 800), at: 110, dur: 12 },
  };
})();

/* ================================================================================================================ */
/* L6 loop-agentguard (8 s): "Pebble's change isn't verified yet." → Run the tests → Verified.                      */
/* Source: main-live-film (Pebble 1.0.4), measured by ink scan. The held run in the conversation (15.10 s, static     */
/* until the 16.00 click): the reply's last line ends y 311.3; its notice "Verification remains incomplete: …"         */
/* y 332–381; the usage line 404–416; the avatar and "Blocked" 453–468.3 (from x 265); the sentence 495–536.3 (x 295–  */
/* 697, three lines), "Details" x 754–764; the buttons y 545–578 (Run the tests x 295–394.7); the composer from y 627. */
/* After the click the conversation scrolls (16.0–16.3) and settles with "Needs your review" (497–508.7) and the       */
/* banner "1 action needs your review / Nothing changes until you approve." (536–596, x 295–765), the reply's line     */
/* 319.3–332.7 just inside the card's top: Pebble asks to run the tests in an isolated copy. Then a time-passage       */
/* dissolve (the person approves; the tests run) to the Details drawer, where AgentGuard's check lands: "Verified ·   */
/* pytest 42 passed on current files · 2 s" (20.60, y 409–437.3; see L4), EARLIER ACTIONS 520–528.3 below it.         */

export const L6 = (() => {
  // Shot A, the hold, one card at the app's own scale on the ledger's slot (k 2.56, m 2.564): x 232–770 (the avatar at
  // 260, "Details" ends 764, the banner after the click 765), y 318–620 (the notice to the buttons; the reply's line
  // above ends at 311.3, the composer starts at 627). Shot B, the check, in the same card: the drawer fills its width
  // (m 3.84), from "You asked Pebble to run the tests" (336) down to EARLIER ACTIONS (528.3), so "Verification remains
  // incomplete" (311–322.3) is out and Verified is the newest row. Tall (4:5): A at m 2.25, the block whole, B at the
  // drawer's width (m 2.81, 330–572.2: the card header at 558.7–571.7 whole). The banner that follows the click is
  // 470 CSS px wide and the phone card shows 448, so the tall cut goes from the click straight into its time-passage
  // dissolve (`tallDissolves`): the approval it elides is the one the wide cut elides too.
  const A = {
    wide: card(box(232, 770, 318, 620), 2.564, "wide", SLOT.agentGuard),
    tall: card(box(252, 700, 318, 620), 2.25, "tall", SLOT.phone),
  };
  const mB = { wide: A.wide.stage.rect.w / (DRAWER.x1 - DRAWER.x0), tall: A.tall.stage.rect.w / (DRAWER.x1 - DRAWER.x0) };
  const B = {
    wide: topLeftPose(DRAWER.x0, 330, mB.wide, A.wide.stage.rect),
    tall: topLeftPose(DRAWER.x0, 330, mB.tall, A.tall.stage.rect),
  };
  const runTheTests = { x: 344, y: 562 };
  const click = 41;
  const plan = {
    id: "LoopAgentGuard",
    n: 240,
    aspects: ["wide", "tall"],
    camera: { wide: [key(0, A.wide.pose)], tall: [key(0, A.tall.pose)] },
    stages: { wide: [A.wide.stage], tall: [A.tall.stage] },
    reads: [
      { aspect: "wide", what: "Blocked, the sentence and the three choices", css: 13, m: A.wide.m, k: A.wide.stage.k },
      { aspect: "wide", what: "the drawer's steps and Verified", css: 12, m: mB.wide, k: A.wide.stage.k },
      {
        aspect: "tall",
        what: "Blocked, the sentence and the three choices",
        css: 13,
        m: A.tall.m,
        k: A.tall.stage.k,
        waived:
          "L6 is not on the page (the AgentGuard section shows static phone crops). The held block is 448 CSS px wide and the app wraps it there: whole, it renders at 8.9 px in a 360 px phone's 328 px frame",
      },
      {
        aspect: "tall",
        what: "the drawer's steps and Verified",
        css: 12,
        m: mB.tall,
        k: A.tall.stage.k,
        waived: "L6 is not on the page; shot B fills the held block's card, so the drawer renders at 10.2 px in a 328 px frame (11.2 px on a 390 px phone)",
      },
    ],
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
    stage: { wide: A.wide.stage, tall: A.tall.stage },
    poses: { A: { wide: A.wide.pose, tall: A.tall.pose }, B },
    srcA,
    srcB,
    resetSrc: 15.1,
    cursor: [
      { at: 12, x: 560, y: 720, travel: 1 }, // on the riverbed, below the card
      { at: click - 6, x: runTheTests.x + 6, y: runTheTests.y + 2, target: 30, seed: "l6-in" },
      { at: 58, x: 520, y: 720, travel: 16, seed: "l6-out" },
    ] satisfies CursorKey[],
    runRect: box(297, 391, 547, 577),
    /** the 4:5 cut's dissolves: into the drawer as the click's press ends (f44–56, so the conversation's jump at f45
     *  is under it), back to the hold as in the wide cut */
    tallDissolves: [
      [44, 56],
      [190, 202],
    ] as const,
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
/* L1 is the one loop with no card: its scene IS the desktop (DESIGN-LEXINGTON §3.8, "a desktop … sits on the         */
/* riverbed"). The quick chat is the app's own panel with its own shadow; the pebble casts the only other one.        */

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
  const k = { wide: kOf(SLOT.companion, FRAME.wide.w), tall: kOf(SLOT.phone, FRAME.tall.w) };
  const plan = {
    id: "LoopCompanion",
    n,
    aspects: ["wide", "tall"],
    camera: {
      // W: the pebble on its desktop (m 1.8, as FILM_SPEC; the panel's room above and to its left). P: the open chat,
      // m 2.1. Tall: one framing, m 2.79, the whole panel and the pebble, the panel's card centred in the frame's height
      // (y 580: 66 px of ground above the card, 62 px below it); the reply's 13 px renders at 11.0 px in a 360 px phone's
      // 328 px frame (12.0 px on a 390 px phone).
      wide: [key(0, { x: 808.4, y: 583.4, zoom: 1.8 }), key(76, { x: 945.3, y: 576.7, zoom: 2.1 }, 26), key(238, { x: 808.4, y: 583.4, zoom: 1.8 }, 26)],
      tall: [key(0, { x: 945.3, y: 580, zoom: 2.79 })],
    },
    stages: {},
    reads: [
      { aspect: "wide", what: "the reply", css: 13, m: 2.1, k: k.wide },
      { aspect: "tall", what: "the reply", css: 13, m: 2.79, k: k.tall },
    ],
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
    avatarInPanel: { x: 326.7, y: 397.3 },
    /** "Minimize to pebble" in the panel */
    minimize: { at: { x: 347, y: 42 }, rect: box(335, 359, 30, 54) },
  };
})();

/* ================================================================================================================ */
/* L8 loop-views (6.8 s): two views Pebble built, each one card: the "Spending by category" chart of the Lisbon     */
/* trip budget dashboard, then the Python datetime quiz.                                                            */
/* main-dashboard@3x (1440 × 900, Pebble 1.0.4): the canvas is white from x 641; the chart panel's border x 665–666   */
/* and 1415–1416, y 421–422, its bottom at the capture's edge (898); "Spending by category" y 436–454, "Chart data"    */
/* y 872–881. main-quiz@3x (1160 × 800): the canvas is white from x 721, its header's rule at y 199–200; the quiz       */
/* x 745–1136, "QUIZ · CHECKED BY PEBBLE" y 221–230 to the page buttons y 742–770; the question (22 px) y 370–416.     */

export const L8 = (() => {
  // DESIGN-LEXINGTON §3.8: one moment per frame, no full-window screenshot outside the film poster. Lane G2b's L8 opened
  // on the whole dashboard window; now each view is its own card at the views slot (the main column, k 1.68): the
  // chart panel (its own white; the card's edges fall just inside the panel's border, so the card IS the panel) and
  // the quiz (on the canvas's own white). A 0.4 s dissolve between the two, each held 3 s. The data never animates.
  const chart = card(box(668, 1413, 424, 896), 1.915, "wide", SLOT.views);
  const quiz = card(box(733, 1148, 207, 782), 1.572, "wide", SLOT.views);
  const plan = {
    id: "LoopViews",
    n: 204,
    aspects: ["wide"],
    camera: { wide: [key(0, chart.pose)] },
    stages: { wide: [chart.stage, quiz.stage] },
    reads: [
      { aspect: "wide", what: "the chart's title and labels", css: 12, m: chart.m, k: chart.stage.k },
      { aspect: "wide", what: "the quiz's question and answers", css: 13, m: quiz.m, k: quiz.stage.k },
    ],
    cursorVisible: [],
    clicks: [],
    dissolves: [
      [84, 96],
      [186, 198],
    ],
  } satisfies LoopPlan;
  return { plan, chart, quiz };
})();

/* ================================================================================================================ */
/* T0 FilmTeaser (8 s, 1280 × 720): approve → test → Verified, in the film poster's frame (FILM_SPEC §15).          */
/* Window world: world = the main window's CSS px; the window at m 0.75 (870 × 600) centred, on the riverbed. The   */
/* film frame is the one place a whole window is shown (DESIGN-LEXINGTON §3.8); it plays at the container's width,  */
/* 1280 px, so a page px is a video px and the window's radius and shadow are 10 and --shadow-window at m 0.75.      */

export const T0 = (() => {
  const wide: CamPose = { x: 580, y: 400, zoom: 0.75 };
  // the card's lower half at m 1.9 (the window's right edge 34 units inside the frame); the tests card at m 1.8
  const cardPose: CamPose = { x: 857, y: 545, zoom: 1.9 };
  const tests: CamPose = { x: 905, y: 395, zoom: 1.8 };
  const plan = {
    id: "FilmTeaser",
    n: 240,
    aspects: ["wide"],
    camera: { wide: [key(0, wide), key(38, cardPose, 24), key(96, tests, 1), key(209, wide, 24)] },
    stages: {},
    reads: [],
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
    /** world units per page px for the window: it is seen at m 0.75 in a 1280 px teaser shown 1280 px wide */
    windowK: 1 / wide.zoom,
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
    /**
     * Lane G-fix (REVIEW-G2 P1-9): in the close framings the conversation left of the drawer recedes under the veil
     * (60 % of the window's colour, 10 px blur; its amount follows the camera's zoom, 0 at the wide m 0.75, 1 from
     * m 1.8), so its chopped lines never compete with the drawer in the page's most-seen motion; and as "Verified"
     * lands (f150) the drawer's rows above "Requesting isolated tests" recede too, so the payoff never reads as "Not
     * verified".
     */
    drawer: box(DRAWER.x0, DRAWER.x1, 0, 800),
    payoff: { rect: box(DRAWER.x0, DRAWER.x1, 378, 800), at: 150, dur: 12 },
  };
})();

export const LOOP_PLANS = [L1.plan, L2.plan, L3.plan, L4.plan, L6.plan, L7.plan, L8.plan, T0.plan] as const;
