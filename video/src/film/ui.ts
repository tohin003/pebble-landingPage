// Measured UI geometry for the animated film (lane G2a), as DATA: CSS px of the captured windows, read off the real
// frames with the QA helpers (ink rows, edge scans and full-resolution crops at 3×). Nothing here is drawn as UI; the
// film uses these points to aim the pointer, to draw a press over the real control, to place the one callout ring and
// to aim the zoom-throughs. Re-measure after a re-capture (FILM_SPEC §7: nudge keys, never move the click frames).

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
export const centreOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * `main-live-film` (capture/record.mjs, 3×, R2): the 1160 × 800 window, 690 frames at 30 fps (source 0–22.97 s), in
 * video/public/ui-frames/main-live-film. Source frame index = round(seconds × 30); file = index + 1.
 */
export const LIVE_FILM = {
  dir: "ui-frames/main-live-film",
  width: 1160,
  height: 800,
  frames: 690,
  /** where the sidebar ends and the conversation starts (#F1F3EE → #F8F9F6), and the Details drawer's left border */
  sidebarEdge: 218,
  drawerEdge: 800.5,
  /** Apply edit on the invoice_kit/dates.py card (9.37 s): the green button, radius 6, on the card's white */
  applyEdit: { rect: box(1025, 676, 1128.7, 707.7), radius: 6, ground: "#FFFFFF" },
  /** Undo this edit on the applied card (11.05 s): a text button (icon + label at x 839–934, y 687.7–697); the ring's box */
  undoEdit: { rect: box(833, 681, 941, 704), radius: 6 },
  /** Run the tests in the held run (15.97 s): the white button with its hairline, radius 6, on the conversation ground */
  runTheTests: { rect: box(295, 545.5, 391, 578), radius: 6, ground: "#F8F9F6" },
  /**
   * The held run's other two choices (15.10–15.97 s, static: only the run's avatar animates; lane G-fix, ink scans of
   * idx 453–479): "Ask Pebble to finish" is a bordered button like Run the tests; "Accept as unverified" is a text
   * button (no border), its ink x 541.7–647. The rest of the held block: the avatar x 259.7–273.7, "Blocked" y 453–468,
   * the sentence y 495–536 (x 296–695; 11 css px of ink a line), "Details" x 730–764 (y 510–521). Between Ask's border
   * and Accept's first letter there are only 9 css px, so a framing that keeps Ask whole but leaves Accept out puts
   * its edge in that gap (framing.ts s5cRead).
   */
  askToFinish: { rect: box(400, 545, 532.7, 577.7), radius: 6 },
  acceptUnverified: { rect: box(541.7, 557, 647, 575) },
  /** the held block as a whole: the avatar to the sentence's end, "Blocked" to the buttons' bottom */
  heldBlock: box(259.7, 453, 695, 577.7),
  /** Run tests on the "Run isolated tests" card (17.77 s): the green button on the card's white */
  runTests: { rect: box(1028.8, 497.2, 1128.8, 528.8), radius: 6, ground: "#FFFFFF" },
  /** the window's Settings button (the gear) in the top bar */
  gear: { x: 1035.8, y: 31.9 } as Point,
  /** the drawer's "Verified · pytest 42 passed on current files · 2 s" step (two lines) from 20.60 s, after R2's scroll */
  verifiedStep: box(851.7, 409, 1139, 437),
  /**
   * The drawer's steps above it after R2's scroll (19.0–20.6 s; lane G-fix ink scans): "Not verified · 2 changed files,
   * no tests run" y 269–280 with its "Details" 288.7–296.7, "Verification remains incomplete" 311–322, "You asked
   * Pebble to run the tests" 336–345, "Approved: Requesting isolated tests · 2 s" 360–371. Below Verified, rows move:
   * at 20.70 s "Waiting for the model" is inserted at 453–464 and everything under it moves down 24.7 px.
   */
  notVerifiedStep: box(851, 269, 1090, 296.7),
  incompleteStep: box(851, 311, 1028, 322),
  /** the drawer's "Requesting isolated tests" step after the scroll (18.67–20.6 s) */
  requestingStep: box(834, 385, 1139, 396),
} as const;

/**
 * `pet-live-error` (record.mjs, 3×, R1: --hide=.pet-avatar, light theme): the 384 × 456 companion window, transparent,
 * the avatar laid out but invisible, 270 frames (0–8.97 s) in video/public/ui-frames/pet-live-error-light-hidden. The
 * quick chat opens on the click frame (0.60 s); the question types itself 1.30–2.93 s; Enter at 3.00 s ("Sending",
 * "Task: queued"); "Thinking" from 3.30 s; the answer's first word, "Python", at 4.60 s; the feed scrolls up 17 px at
 * 5.43 s as the answer takes its second line; "Task: completed" at 6.60 s, after the film's dive (ENERGY_SPEC §1, §5).
 * The energetic recut plays it to 5.97 s. The older 140-frame recording (ui-frames/pet-live-error) stays on disk.
 */
export const PET_FILM = {
  dir: "ui-frames/pet-live-error-light-hidden",
  width: 384,
  height: 456,
  frames: 270,
} as const;

/** Settings stills (settings-*@3x, the 1160 × 800 window with the modal open). */
export const SETTINGS = {
  /** the modal's white card */
  modal: box(321, 41, 839, 759),
  /** the content's left edge inside the modal (every row starts here) */
  contentLeft: 346,
  permissionsTab: { x: 510.7, y: 131.4 } as Point,
  memoryTab: { x: 618.4, y: 131.4 } as Point,
  /** "Auto in project": its title (the click lands on the option's label) and its radio */
  autoTitle: { x: 430, y: 363.4 } as Point,
  autoRadio: { x: 361.5, y: 408.5 } as Point,
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
  /** the canvas starts at this border (x 640); the conversation is left of it */
  canvasEdge: 640,
  /** the "Spending by category" panel, radius 12 (it runs past the window's bottom edge) */
  chartPanel: { rect: box(665, 421, 1415, 897), radius: 12 },
  /** the request bubble "Turn my Lisbon trip spending into a dashboard…" (its #EFF2EA ground, lane G-fix) */
  request: box(306, 97, 604.7, 192.7),
} as const;

/** main-quiz@3x (1160 × 800). */
export const QUIZ = {
  /** the canvas panel right of the conversation (its border at x 720; content from x 745) */
  canvas: box(720, 0, 1160, 800),
  /** the quiz itself, under the canvas's toolbar: from the divider (y 199) to the window's edge (ink scans of the 1.0.4
   *  still: the label "QUIZ · CHECKED BY PEBBLE" 221–230, the title 244–265.3, the timer "07:39 left" x 1078–1135.7,
   *  the question 370–415.7, the answers A–D from 437, Back / Next 682–720, the page pills 742–770) */
  body: box(720, 199, 1160, 800),
  /** the selected answer's "A" badge (#506E54) and the white "A" inside it (x 767–775, y 457–466) */
  badge: box(760, 451.2, 782, 471.8),
  badgeColour: "#506E54",
  /** FILM_SPEC §6 S7c: aim inside the badge, below and left of the white "A" */
  aim: { x: 764, y: 469 } as Point,
} as const;
