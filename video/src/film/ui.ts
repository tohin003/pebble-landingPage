// Measured UI geometry for the trailer (CSS px of the captured windows), as DATA. Nothing here is drawn as UI: the film
// uses these boxes to aim the pointer, to draw a press over the real control, to point with the app's own focus veil,
// to frame each moment, and to keep out of frame what must stay out (the usage lines with their rates, the toasts).
//
// Sources: the capture manifests (capture/manifests/*.json: fidelity round 2, and retake 2b for the held run and its
// dark twin; they are the source of truth for every time and box), the recordings' per-frame probes (probes.json
// beside the frames) and ink scans of the frames. A recorded frame f (30 fps) is the file f + 1. Re-measure after a
// re-take.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
const box = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
const xywh = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
export const centreOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** A recording: its frame folder (in video/public), its size in CSS px and the source frames on disk [first, last]. */
export interface Recording {
  dir: string;
  width: number;
  height: number;
  first: number;
  last: number;
}

/**
 * main-live-film-150 (capture/record.mjs on Pebble v1.5.0's frozen frontend, light, 3×, retake 2b): the invoice-kit run
 * at 1×, 825 frames (0–27.47 s). Source frame / s: the send 30 / 1.0; the dates.py card waits until 275, Apply edit
 * 276 / 9.20 (the tests card takes its place); Apply edit (tests) 291 / 9.70; the person's scroll 306–324 puts the
 * applied card's "Undo this edit" at y 546.5 by 324 / 10.80; the hold 421 / 14.033; the person's scroll 435–453 brings
 * "Blocked" into view from 448 / 14.933, still from 453; Run the tests 480 / 16.00; the "Run isolated tests" card
 * 484 / 16.133; Run tests 534 / 17.80 (the card reads Running 534–605, exactly 2.4 s); the tests end 606 / 20.20 (Done,
 * its Result below the fold); the person's scrolls 612–630 (to the Result) and 648–666 (back to the steps); the model
 * responded 672 / 22.40; Verified 673 / 22.433; completion 675 / 22.50 (the drawer's cards jump up on 676–677).
 */
export const LIVE_150: Recording = { dir: "ui-frames/main-live-film-150", width: 1160, height: 800, first: 0, last: 824 };
/** main-live-film-150-dark: the same run in Pebble's dark theme, with the same clocks and geometry, frames 180–498. */
export const DARK_150: Recording = { dir: "ui-frames/main-live-film-150-dark", width: 1160, height: 800, first: 180, last: 498 };
/** main-challenge-live: AgentGuard's scope challenge (Auto in project), frames 150–374 (5.0–12.47 s). */
export const CHALLENGE_150: Recording = { dir: "ui-frames/main-challenge-live", width: 1160, height: 800, first: 150, last: 374 };
/**
 * pet-live-150-light-hidden: the quick chat (384 × 456, transparent, the avatar laid out but hidden), 270 frames
 * (0–8.97 s). Enter 90 / 3.00 s ("Sending"); "Thinking" 97; the answer whole 196 / 6.533 s (v1.5.0 never streams it);
 * the usage line "1,180 in · 52 out · 3.3 s" 197 (no rate, no cached count); "Task: completed" 198 / 6.60 s, when the
 * header grows a line and the feed moves 16 px down; settled 202–234 (the feed 13 px up); the host's idle 216 / 7.20 s,
 * when the app's pebble starts its celebration.
 */
export const PET_150: Recording = { dir: "ui-frames/pet-live-150-light-hidden", width: 384, height: 456, first: 0, last: 269 };

/** The held run, light and dark (retake 2b; the two takes share every box from 6.0 s). */
export const RUN = {
  /** the Details drawer's left border; the window's right edge is 1160 */
  drawerEdge: 800.5,
  /** the invoice_kit/dates.py card waiting (source 129–275): its header y 225–245, the lead 263–284, "View diff" 362,
   *  the diff box 382–662 (its clamp lines, "- return date(…)" and "+ last_day = …", at 615–656), the buttons 676–708 */
  datesCard: xywh(817, 211, 327, 509.9),
  datesDiff: box(831, 382, 1131, 662),
  applyEdit: { rect: xywh(1024.9, 675.9, 104.1, 32), radius: 6, ground: "#FFFFFF" },
  /** the tests/test_dates.py card waiting (276–290), in the same place: its reason, the 1.2.0+ lead, at y 263–345 */
  testsCard: xywh(817, 211, 327, 512.2),
  testsLead: box(831, 255, 1131, 347),
  /** the applied dates card's track (manifest dates_card_track): [source frame, card top y]; still between rows */
  datesCardTrack: [
    [324, 363.6],
    [328, 378.6],
    [333, 408.6],
    [343, 453.6],
    [353, 468.6],
    [358, 483.6],
    [361, 484.2],
    [363, 483.8],
    [364, 260.8],
    [371, 318.8],
    [376, 333.8],
    [381, 348.8],
    [384, 349.5],
    [386, 349.1],
    [387, 261.1],
    [394, 304.1],
    [413, 319.1],
    [418, 318.7],
    [421, 290.3],
    [480, 225.3],
  ] as readonly (readonly [number, number])[],
  /** the applied card's height and "Undo this edit" inside it (its box [832, top + 182.9, 109.3, 28]) */
  cardH: 223.9,
  undo: { dx: 15, dy: 182.9, w: 109.3, h: 28, radius: 6 },
  /**
   * The drawer at the hold (14.033–15.967 s): "Pebble's change isn't verified yet." at its top (y 116.3–132.3), Run the
   * tests and Ask Pebble to finish (y 141–172), "Accept as unverified" and the issue text (to y 252), EARLIER ACTIONS
   * (267–277) and the dates card from y 290.3. Before the hold (13.60–14.00 s) the same region shows "Pebble is working
   * on this. · Pause", "Receiving model response" and the live response streaming the repair reply.
   */
  drawerHeld: box(817, 116.3, 1144, 252),
  /** the held run in the conversation after the person's scroll (453–479): the avatar from x 259, "Blocked" 451–466,
   *  the sentence 491.8–536.8 (to x 765), the three choices 544.8–577.8, "Details" at x 733–768 */
  heldBlock: box(259, 449, 768, 577.8),
  runTheTests: { rect: xywh(295, 544.8, 97.4, 33), radius: 6, ground: "#F8F9F6" },
  /** the "Run isolated tests" card waiting (484–533) and its Run tests button */
  isoCard: xywh(817, 211, 327, 331.2),
  runTests: { rect: xywh(1029.2, 497.2, 99.8, 32), radius: 6, ground: "#FFFFFF" },
  /** the card reading Running after the person's scroll (555–605); Done from 606 (530.3 tall, its Result below) */
  runningCard: xywh(817, 449.5, 327, 295.2),
  /** the Done card after the scroll to its Result (630–648): Outcome passed, Tests passed 42 …, "42 passed in 1.84s" */
  resultCard: xywh(817, 215.1, 327, 530.3),
  /** the newest steps, still from 666: "Verification remains incomplete" from y 202.7 to "The model responded · 2 s"
   *  (367.3) and, from 673, "Verified · pytest 42 passed on current files" (391.9–416.5); "Done." at 442.5 from 675 */
  stepsTop: 202.7,
  verifiedRow: xywh(831, 391.9, 309, 24.6),
  drawerDone: 442.5,
  /** the final reply after completion (675+): its last paragraph y 425–494 (x 253–765), the quote above it 360–410 */
  finalReply: box(253, 425, 765, 494),
} as const;

/** Every usage line of the held run: each shows a cached count and a rate, so none is ever in frame (OVERRIDES §42).
 *  Source frames [from, to] and the union of the line's boxes over them (RECAPTURE_REPORTS, round 2b). */
export const USAGE_LINES: readonly { from: number; to: number; rect: Rect }[] = [
  { from: 178, to: 359, rect: xywh(333, 411.3, 331, 50.6) },
  { from: 446, to: 671, rect: xywh(333, 400.5, 334.4, 221.6) },
  { from: 672, to: 673, rect: xywh(333, 423.8, 304.4, 17.6) },
  { from: 674, to: 824, rect: xywh(333, 423.8, 334.4, 100.8) },
];
/** The "Action completed" toasts (bottom centre), source frames [from, to]. */
export const TOASTS: readonly { from: number; to: number; rect: Rect }[] = [
  { from: 278, to: 396, rect: xywh(500.8, 731, 158.3, 42) },
  { from: 608, to: 712, rect: xywh(500.8, 731, 158.3, 42) },
];

/**
 * main-challenge-live: the refused step turns red at 232 / 7.733 s ("Preparing an edit to
 * invoice_kit/templates/statement.html", its row [671, 521.2, 469, 41.6], the text's ink at y 527–539, "▸ Details" at
 * x 693–738, y 547–558); the person opens Details at 270 / 9.00 s (the row grows to 320.4 tall: "AgentGuard: AgentGuard
 * — evidence check", "5 file(s) changed that the task does not reach", the request, the evidence, "Either explain what
 * connects these to the task, or split them into a separate change."); the person's scroll 282–297 moves it up 251 px
 * (the row at y 270.2); still from 297 to the end.
 */
export const CHALLENGE = {
  row: xywh(671, 521.2, 469, 41.6),
  details: box(690, 545, 741, 560),
  detailsAt: 270,
  scroll: [282, 297] as const,
  scrollShift: 251,
} as const;

/** The quick chat (pet-live-150): the hidden avatar's centre in the panel, and the settled rows (202–234). */
export const PET_PANEL_ROWS = {
  avatarCentre: { x: 326.7, y: 397.3 } as Point,
  question: xywh(53, 103, 306, 56.3),
  answer: xywh(25, 158.3, 334, 93.6),
  composerTop: 263,
} as const;

/** The 1.5.0 home (main-welcome, its own pebble hidden at opacity 0, still laid out): the home pebble's box. */
export const WELCOME_150 = {
  src: "ui/v150/avatar-hidden/main-welcome@3x.png",
  width: 1160,
  height: 800,
  homePebble: xywh(624, 107, 130, 130),
} as const;

/** Settings › Permissions from 1.5.0 (Ask selected, then Auto in project by a real click on its radio). */
export const PERMS_150 = {
  ask: "ui/v150/settings-permissions@3x.png",
  auto: "ui/v150/settings-permissions-auto@3x.png",
  width: 1160,
  height: 800,
  modal: xywh(320, 40, 520, 720),
  askCard: xywh(346, 228, 468, 103.8),
  autoCard: xywh(346, 339.8, 468, 139),
  autoTitle: { x: 430.2, y: 362.3 } as Point,
  autoRadio: { x: 366.5, y: 409.3 } as Point,
} as const;

/** Settings stills (settings-*@3x: the 1160 × 800 window with the modal open; the same layout at 1.5.0). */
export const SETTINGS = {
  modal: box(321, 41, 839, 759),
  /** Models' ways in (ink scans of settings-models@3x): Add a model file, Connect provider, Continue with ChatGPT */
  addModelFile: box(346, 302.5, 478.5, 335.5),
  connectProvider: box(487.5, 302.5, 625.5, 335.5),
  continueChatGPT: box(346, 366, 542, 409.5),
  /** the bin next to "Uses metric units and 24-hour times." (accessible label "Forget this memory") */
  forgetBin: { x: 798.7, y: 716.4 } as Point,
  /** that record (its meta line, text and bin), which dissolves on the click; the modal's white is under it */
  forgetRecord: box(340, 703, 812, 744),
  modalGround: "#FFFFFF",
} as const;

/** main-dashboard@3x (the 1440 × 900 window with the canvas widened). */
export const DASHBOARD = {
  width: 1440,
  height: 900,
  /** the "Spending by category" panel, radius 12 (it runs past the window's bottom edge) */
  chartPanel: { rect: box(665, 421, 1415, 897), radius: 12 },
} as const;
