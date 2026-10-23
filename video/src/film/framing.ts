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
//
// Lane v2-film (PHILOSOPHY: "moments sit in hairline frames"; OVERRIDES §14: 9:16; the lead's 34 px floor for the
// square and the vertical):
// - the stage is a hairline frame on the paper ground, no shadow; in the square it now bleeds off the RIGHT edge too
//   (x 24 → 1080, 1,056 px), so a moment magnified to the floor runs off the frame as a screen does. Every square
//   framing keeps its left, right and top edges: m × 1056 / 1032 (the same visible width, 2.3 % larger text) and the
//   centre re-solved for the same top;
// - the vertical's stage (§22) is the square's 1,056 × 744, at (24, 700): framed on the left, top and bottom (a visible
//   hairline at y 1444, above the caption band), bleeding off the right. The two narrow aspects share one set of
//   framings, so each one's bottom must fall in clear space too (the vertical shows it).
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

/** The stage in each aspect at the reference sizes (FILM_SPEC §4, §22; layout.ts scales them by `s`). */
export const STAGE: PerAspect<Rect> = {
  wide: { x: 920, y: 64, w: 1000, h: 952 },
  square: { x: 24, y: 336, w: 1056, h: 744 },
  vertical: { x: 24, y: 700, w: 1056, h: 744 },
};
/** The square's old stage width: framings written for it keep their visible width at m × SQUARE_K. */
const SQUARE_K = 1056 / 1032;

const SETS: Record<"wide" | "square", Record<string, Framing>> = {
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
     * S5c stage 2 (pushed in f954–977, held to the f1008 cut): m 3.16, x 222–538.5, y 392–693.3. "Blocked", the
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
     * S5d → S5e, tilted f1116–1139 once R2's scroll has settled (REVIEW-G2 P1-5, lane G-fix): m 2.87, x 811.6–1160,
     * y 324–655.7. "Not verified · 2 changed files, no tests run" (269–296.7) and "Verification remains incomplete"
     * (311–322) leave the top before the Verified step arrives (f1152), so the climax frame reads from "You asked Pebble
     * to run the tests" (336) down to "Verified" and what follows. The rows under Verified move twice (20.60 s: the step
     * is inserted; 20.70 s: "Waiting for the model" is), and the bottom edge sits in a gap in all three states (P: 653.7
     * | 690.7, A: 650 | 659, B: 643 | 663); the card's left border (817) stays 15 px inside the stage.
     */
    s5dVerified: fr(2.87, 985.8, 489.85),
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
  // The narrow aspects (lane v2-film). The square and the vertical have the same stage, 1,056 × 744 (the square's
  // bleeds off the frame's right and bottom edges; the vertical's off the right only, its bottom a visible hairline),
  // so they share one set of framings, each written as its visible rect (nr: m, left, top) and checked on the 1.0.4
  // recording and stills with .work/film/v2/stageview.py. Every shot whose text is the point of the shot is at m ≥ 3.0,
  // so the app's 12.5 px text (11.33 CSS px of ink) reads at ≥ 34 px (the lead's floor for 1:1 and 9:16; R5 measures
  // type size × m, here 37.5 px): the status line, the edit card and its buttons, the held sentence, the tests card, the
  // Verified step, Models' ways in and the permission modes; the six memory layers' 12 px names at m 2.85 (34.2 px).
  // Edges: top and left always in clear space; the bottom too wherever it can be (the vertical shows it); a click target
  // ≥ 60 px inside the frame and above the caption band. The documented exceptions (FILM_SPEC §22): the forget click
  // (the records' text and the bin are 451 CSS px apart, so m 2.12 at most: 26.5 px; the action carries it), and the
  // wide transitions (S5c stage 1, the S5e pull-back, the S7a canvas: a picture).
  square: {
    /** S5a: the status line alone, m 3.02, x 328–677.7, y 172–418.4. The request bubble (its box y 97–168, x 448–1034,
     *  too wide to fit at the floor) stays wholly above the top edge (a top at 158 left its bottom as a sliver); the
     *  long status line (f664–700: "Reading · Reading invoice_kit/dates.py · 5 s ›", the avatar at 358.7 to the
     *  chevron at 665.3, ink 41 px) fits, and its Stop button (680–726) stays wholly outside the frame's edge (at 692 it
     *  showed as a sliver with an "S"); the short form's Stop (503–549, f648–663 and f701–719) shows whole */
    s5a: nr(3.02, 328, 172),
    /** S5b, the card's upper part: x 808–1160 (the drawer's border at 800.5 outside, the cards' at 817 inside), y 202–450:
     *  top between NEEDS YOUR REVIEW (ends 197.3) and the card's top border (211); bottom between the diff's rows
     *  (448.7 | 456.7) */
    s5bTop: nr(3.0, 808, 202),
    /**
     * S5b, the card's lower part (REVIEW-G2 P0-2): y 486–734. The bottom sits in the drawer's ground between the cards
     * (716.7–737.3 before the click, 714.7–735.3 after it), so the next card's header ("tests/test_dates.py · Needs your
     * review", 746) and status never show; the top falls in the diff's blank line (468.7 | 517) and, after the f814
     * match cut, under EARLIER ACTIONS (ends 481.3). Apply edit (676–708) at frame y 906–1002 in the square: the pointer
     * clicks its upper part (css y 679, frame y 915 ≤ 918)
     */
    s5bLow: nr(3.0, 808, 486),
    /**
     * S5c stage 1 (f864–953), the held run whole (REVIEW-G2 P0-1, lane G-fix): m 2.25, x 242.7–711.8, y 420.5–751. The
     * avatar (259.7) and the sentence's end (695) both sit 61 px from the frame's sides; the top 4.8 css px under the
     * usage line (ends 415.7), the bottom between the composer's model row (ends 734.3) and its footer (759.7). A
     * transition: stage 2 reads the sentence.
     */
    s5c: sq(2.2, 477.25, 589.6),
    /**
     * S5c stage 2: m 3.36, x 222.6–537.2, y 420.8–642.5: "Blocked", the sentence (ink 38 px; its lines run into the
     * frame's right edge) and Run the tests, Ask Pebble to finish whole and Accept as unverified wholly outside (4.5 css
     * px past the edge). The composer's placeholder (648.7) stays under the bottom edge.
     */
    s5cRead: sq(3.28, 379.9, 534.2),
    /** S5d, the tests card's upper part: y 202–450: its title, the lead (258–290.7, ink 34 px), the sandbox note, the
     *  recipe and the command, the bottom under the command's box */
    s5dTop: nr(3.0, 808, 202),
    /** S5d tilt (f1050–1073) for the click: y 374–622, top between the recipe (ends 370.7) and Command (387), bottom
     *  between the first two steps (612 | 626); Run tests (497–529) at frame y 753 in the square */
    s5dTilt: nr(3.0, 808, 374),
    /**
     * S5d → S5e, after R2's scroll (tilt f1116–1139, as 16:9's): y 380–628, the newest steps down to "Verified · pytest
     * 42 passed on current files · 2 s" (409–437, ink 34 px). The top sits above "Requesting isolated tests" (385) in all
     * three states of the drawer (before 20.60 s, at 20.60 s, after 20.70 s); the bottom in a gap in all three (626 |
     * 645, 619.3 | 639, 625.3 | 633).
     */
    s5dVerified: nr(3.0, 808, 380),
    /** S5e pull-back: x 230–1160, y 0–655 (m 1.14); the gear at frame (918, 371) */
    s5eOut: sq(1.11, 695, 335.15),
    /** S6a, Models' ways in (from the f1224 match cut, T11): y 195–443: YOUR MODELS, the model row, Add a model file,
     *  Connect provider (Rest model bleeds off the frame) and Continue with ChatGPT; the bottom between the note's lines */
    s6aWays: nr(3.0, 340, 195),
    /** S6, the tabs (the Permissions, Memory clicks): y 100–348, the tab row (124–138) to the buttons (bottom 337) */
    s6a: nr(3.0, 340, 100),
    /** S6b tilt (f1338–1361): y 218–466, the Ask and Auto cards ("Auto in project" 357.7–369.3, ink 35 px), the top
     *  under HOW PEBBLE ACTS (ends 214.3), the bottom under Auto's last line (461.3) */
    s6bTilt: nr(3.0, 340, 218),
    /** S6c, the six layers (tilt f1444–1467, held to f1500): m 2.85, x 335–705.5, y 195–456: "Remember useful context",
     *  the six chips and the paragraph under them; the top between the tab bar (ends 185) and the heading (209), the
     *  bottom in the gap after the paragraph (452 | 479.7). All six names show whole inside OVERRIDES §4's 60 px (the
     *  left column's from 357, frame x 87; the right column's end at 683, 64 px from the edge), their 12 px type at 34 px
     *  (at m 3.0 the right column's names ended 27 px from the frame's edge) */
    s6cLayers: nr(2.85, 335, 195),
    /**
     * S6c, the records (the forget click, f1530), square: m 2.12, x 328–826.1, y 455–806. m 2.12 is the most that keeps
     * both the records' text (from 346, frame x 62) and the bin's click (aimed at 796.7, frame x 1018) 60 px inside
     * the frame (at m 2.21 the click sat 47–53 px from the edge); the top is low enough for the click to land above the
     * caption band (frame y 892 ≤ 918; at y 418 it landed at 995, under the captions). Its 12.5 px records read at 26.5
     * px (the documented exception: the action carries the shot). The bottom passes the modal's lower edge (757), so
     * the blurred app behind it shows in the frame's bottom 104 px, inside the caption band (the vertical, whose bottom
     * edge is a visible hairline, has its own framing: VERTICAL_ONLY below).
     */
    s6c: nr(2.12, 328, 455),
    /** S7a: the canvas only, x 643.1–1440, y 66–627.5 (a picture: the line carries the words) */
    s7a: sq(1.295, 1041.55, 353.25),
    /** S7a's ask (REVIEW-G2 P1-7): x 284–637.4, y 76–325, the request at 40 px; the reply's lines at the bottom edge
     *  recede under a veil (S7a's UiStill focus) */
    s7aAsk: sq(2.92, 460.7, 203.4),
  },
};
/**
 * The vertical's own framings, where its visible bottom edge and its caption band (y 1460, below the stage's bottom at
 * 1444) change the answer. S6c, the records: m 2.12, x 328–826.1 (as the square's), y 400–750.9: the bottom in the gap
 * between the last record (ends 738.3) and the modal's lower edge (757.3), so the blurred app behind the modal never
 * shows (REVIEW-G2 P2-10); the top in the description's line gap (396.3 | 404.7); the bin's click at frame (1018, 1373).
 */
const VERTICAL_ONLY: Record<string, Framing> = {
  s6c: nr(2.12, 328, 400),
};
/** Every aspect's stage framings. The vertical's stage is the square's size (§22), so it shares the square's set but
 *  for VERTICAL_ONLY. */
export const FRAMINGS: PerAspect<Record<string, Framing>> = { wide: SETS.wide, square: SETS.square, vertical: { ...SETS.square, ...VERTICAL_ONLY } };

/** A square framing written for the old 1,032 × 744 stage, converted to the 1,056 px stage with the same visible width
 *  and the same top edge (the bottom bleeds off the frame). */
function sq(m: number, cx: number, cy: number): Framing {
  const top = cy - 372 / m;
  const m2 = m * SQUARE_K;
  return fr(m2, cx, top + 372 / m2);
}
/** A narrow framing (the 1,056 × 744 stage of the square and the vertical) by its magnification and its visible rect's
 *  left and top edges, CSS px. */
function nr(m: number, left: number, top: number): Framing {
  return fr(m, left + 528 / m, top + 372 / m);
}

/** S7b's end framing (G1.5, ratified by lane E) and S7c's full-frame quiz: frame-centred poses. */
export const FULL_FRAME = {
  /** the chart as the world: 16:9 m 3.2 on (1059, 661.5); square m 2.55 on (1061.5, 661.5); vertical m 3.7 on
   *  (904, 680), the rows CHART_ROWS_VERTICAL only (below) */
  chart: { wide: fr(3.2, 1059, 661.5), square: fr(2.55, 1061.5, 661.5), vertical: fr(3.7, 904, 680) },
  /** the quiz, full frame. 16:9 m 2.6: x 421.5–1160 (the window's right edge on the frame's, so nothing past the window
   *  shows; the conversation left of the canvas recedes under a veil, S7Quiz), y 190–605.4 (the quiz's label to its
   *  answers; D bleeds off the bottom; §6's y 330–665 left the title out). Square m 2.477: x 724–1160, inside the canvas
   *  (border at x 720), y 188–624. Lane G-fix (REVIEW-G2 P1-8): cy 397.7 / 406, not 445.7 / 454, so the quiz's top text
   *  has ≥ 60 px of headroom: the label "QUIZ · CHECKED BY PEBBLE" (y 221–229.7) sits 81 px under the frame's top and
   *  the title "Python datetime check-in" (244.3) 141 px (the title sat 17 / 21 px under it; the review's cy 425 / 437
   *  would have put the label 10 / 5 px under it). Lane v2-film, the narrow aspects at the 34 px floor (measured on
   *  main-quiz@3x from Pebble 1.0.4): the left edge at x 722, 2 css px inside the canvas's border (720), so the content
   *  starts 69 px inside the frame; the right edge before the timer "07:39 left" (1078–1135.7), which a right edge at
   *  1085 cut to a lone "0"; the question's lines end at 996.3 and the answers' boxes bleed off the right edge.
   *  - Square: m 3.08, x 722–1072.6, y 186–536.6: the top between "Details" (ends 176.3) and the divider (199), so the
   *    label "QUIZ · CHECKED BY PEBBLE" (221) sits 108 px under the frame's top; B's text whole, its box bleeding off
   *    the bottom.
   *  - Vertical: m 3.1, x 722–1070.4, y 120–739.4. A 9:16 view is taller than the canvas under its toolbar, so the top
   *    falls between "Version 1" (ends 115.3) and the toolbar's buttons (126), which show whole in the top 250 px (the
   *    phone's UI zone), and the label lands at frame y 313, inside the central band; the bottom between Back / Next
   *    (ends 720) and the page pills (742). (y 110 cut "Version 1" at the frame's top edge.) */
  quiz: { wide: fr(2.6, 790.75, 397.7), square: fr(3.08, 722 + 540 / 3.08, 186 + 540 / 3.08), vertical: fr(3.1, 722 + 540 / 3.1, 120 + 960 / 3.1) },
} as const;
/**
 * The vertical's chart world (§22): FULL_FRAME.chart.vertical holds Flights, Stay and Food at m 3.7 (x 758–1050: the
 * left edge between the y axis's numbers (end 748.6) and Flights (773), the right in the gap after Food (1018 | 1085);
 * the bar labels at 44 px). A 9:16 frame is 519 CSS px tall there, taller than the panel's bars and labels, so the panel
 * grows only to these rows (Stay's top at 519 to the labels at ≈ 808), and the world around them is the panel's own
 * white: the bars become the world without the panel's title, legend or edges. The labels end at frame y ≈ 1440, above
 * the caption band.
 */
export const CHART_ROWS_VERTICAL = { y0: 500, y1: 815 } as const;

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
    // the cross-panel move takes 33 frames (R5's cross-world camera, 1.1 s), not §6's 23: at 23 frames the UI travelled
    // up to 250 px a frame; it still lands before the line it serves (T7 at f756). (The second, f1008–1040, is a cut now.)
    key(753, F.s5bTop!, s, 33),
    key(797, F.s5bLow!, s, 23),
    // S5c in two stages (REVIEW-G2 P0-1): the hard cut lands on the whole held run (stage 1), which the app has scrolled
    // into view by f914; f954–977 the camera pushes in to read it (stage 2) and holds through the click (f990)
    key(864, F.s5c!, s, 1),
    key(977, F.s5cRead!, s, 23),
  ];
  // f1008 (bar 15): a hard cut to the "Run isolated tests" card the click put in the drawer (REVIEW-G2 P2-1: from the
  // read framing the old 32-frame move travelled 202 px a frame in 16:9 and 214 in the square, 10× R5's blur limit)
  if (a === "wide") {
    keys.push(key(1008, F.s5d!, s, 1), key(1139, F.s5dVerified!, s, 23));
    keys.push(key(1211, F.s5eOut!, s, 23), key(1224, F.s6a!, s, 1));
    keys.push(key(1499, F.s6c!, s, 23));
  } else {
    // the narrow aspects (lane v2-film): the tests card's top, the tilt to Run tests (f1050–1073), and once R2's scroll
    // has settled the tilt to the newest steps (f1116–1139, as 16:9 does), so Verified lands at 34 px
    keys.push(key(1008, F.s5dTop!, s, 1), key(1073, F.s5dTilt!, s, 23), key(1139, F.s5dVerified!, s, 23));
    // S6 at the 34 px floor: the match cut lands on Models' ways in (T11), the camera tilts up to the tabs f1290–1313
    // before the pointer leaves for Permissions; Auto in project f1338–1361 and back f1408–1431 (as before); after the
    // Memory click (f1440), f1444–1467 to the six layers, held 1.1 s (an OVERRIDES §10 headline fact: REVIEW-G2 P2-18
    // asked for about 1.2 s), then f1500–1523 out to the records; the pointer comes in from f1500 and reaches the bin by
    // f1525, after the camera has landed
    keys.push(key(1211, F.s5eOut!, s, 23), key(1224, F.s6aWays!, s, 1), key(1313, F.s6a!, s, 23));
    keys.push(key(1361, F.s6bTilt!, s, 23), key(1431, F.s6a!, s, 23), key(1467, F.s6cLayers!, s, 23), key(1523, F.s6c!, s, 23));
  }
  // S7a: the hard cut lands on the ask; f1602–1625 the camera moves to the canvas on van Wijk's path (it pulls back as
  // it pans, so the view never travels faster than it widens)
  keys.push(key(1584, F.s7aAsk!, s, 1), key(1625, F.s7a!, s, 24, "smooth"));
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

/** Where the pointer comes from (stage-local px): 16:9 and the vertical, past the frame's right edge (the stage bleeds
 *  off it, so the pointer never crosses the hairline frame); the square, past its bottom edge. */
function entry(a: AspectId, s: number, side: "lowerRight" | "right"): Point {
  const st = STAGE[a]!;
  const w = st.w * s;
  const h = st.h * s;
  if (a !== "square") return side === "right" ? { x: w + 50 * s, y: h * 0.3 } : { x: w + 50 * s, y: h * 0.85 };
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
  // keeps it there; it drifts away and fades f826–830. The square clicks the button's upper part (css y 679, frame
  // y 915), so the click stays above the caption band with the next card's header kept out of frame (s5bLow); the
  // vertical's stage ends above its caption band, so it clicks the button's centre
  const pA = fp(a === "square" ? { x: C.apply.x - 3, y: 679 } : aim(C.apply), F.s5bLow!);
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
 * Motion blur for a stage camera move: the largest per-frame travel of the content at the stage's centre and at four
 * points halfway to its corners since the previous frame, as an axis-aligned stdDeviation (travel / 16, capped at 10 px,
 * so the blur's visible reach stays within R5's 20 px). A cut (travel over 400 px in one frame) and a near-still frame
 * (under 4 px) get none. Lane G-fix: the inner points, not the corners, so a push-in (S5c's read, f954–977), whose
 * travel is radial and near zero where the eye is, keeps its text sharp; a pan blurs as before (its travel is the same
 * everywhere).
 */
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
