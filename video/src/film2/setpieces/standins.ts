// PLACEHOLDERS for the set pieces. Until the 2.0.0 snapshot and the real takes exist (OVERRIDES §49, §50), every
// picture of Pebble in these set pieces is either
// - a STILL: a real capture of a PUBLISHED Pebble release (1.0.x–1.5.0, video/public/ui, gitignored), standing in for a
//   2.0.0 capture; crops never stretch a capture, and never show a usage line (counts, rates, cached tokens) or a
//   timing line ("Worked for …"); or
// - a SLOT: a labelled, hatched panel for what has no published capture yet (the browser take, Apple's apps, the
//   Workshop's cards, ⌘K, the menu bar). A slot draws no interface: it names the capture that fills it.
// Nothing here is drawn Pebble UI, and nothing here may be presented as 2.0.0. The set pieces' demo carries an
// on-frame slate saying so (setpieces/parts.tsx PlaceholderSlate2).
import type { Rect } from "../motion/geometry";

export type WindowKind = "pebble" | "thirdParty" | "apple";

export interface StillStandIn {
  kind: "still";
  id: string;
  /** path under video/public */
  src: string;
  /** the capture's size, CSS px (world units at 1×) */
  w: number;
  h: number;
  /** the part shown, CSS px (default all of it) */
  crop?: Rect;
  /** the size of the smallest text a viewer must read in it, CSS px (for the 28 px reading floor) */
  readPx?: number;
  /**
   * every legible word in the part shown (its crop), counted on the capture, and its body text's size in CSS px,
   * measured on the capture (cap height ÷ Inter's 0.727): the legibility checks (setpieces/qa.ts planesInFrame,
   * legibleWords; CR-05) count every word the frame shows with body text at 20 px or more at 1080, read or not.
   * Measured on 27 Oct, the body text was smaller than some `readPx` values (held 11.7 against 13, the tests card 13.1
   * against 15, the approval card 13.8 against 15, the command card 13.1 against 15); since OVERRIDES §58 ("readPx is
   * the measured truth") each `readPx` is at most its measured body text, so the 28 px floor is checked on what shows
   */
  words?: number;
  textPx?: number;
  /**
   * the real window the capture stands for ("studio-bookings", "companion" …): a still of a window never shares a frame
   * with a live take of the same window unless it is that take's own frame (setpieces/qa.ts askActClock, CR-11)
   */
  place?: string;
  standsFor: string;
  version: string;
  window: WindowKind;
}

export interface SlotStandIn {
  kind: "slot";
  id: string;
  /** the capture that fills it (TREATMENT §6) */
  captureId: string;
  /** what the capture shows, in a few words */
  label: string;
  w: number;
  h: number;
  window: WindowKind;
  standsFor: string;
  /** where its label sits (fractions of the slot): where the shot looks, so a framing of part of it still names it */
  focus?: { x: number; y: number };
  /** the window it shows (CR-11), as StillStandIn.place */
  place?: string;
}

export type StandIn = StillStandIn | SlotStandIn;

/** The shown size of a stand-in (its crop, or the whole capture). */
export const shownSize = (s: StandIn): { w: number; h: number } => (s.kind === "still" && s.crop ? { w: s.crop.w, h: s.crop.h } : { w: s.w, h: s.h });

/** The caption every slot's label carries under its capture's id and label. */
export const SLOT_CAPTION = "placeholder · not captured yet";

/**
 * Where a slot's label sits in a slot drawn `w` × `h` (its plane's units) at `px` frame px a unit: its font size, its
 * corner (at the slot's `focus`, kept inside the slot) and its box, estimated from the advance widths (Geist Mono 0.6
 * em, Inter about 0.56 em a character), wrapping where <SlotPanel> wraps. The view and the checks (setpieces/qa.ts
 * slotLabels) both read it, so a label the check passes is the label drawn.
 */
export const slotLabelLayout = (slot: SlotStandIn, w: number, h: number, px: number, state?: string, timecode?: string): { fs: number; left: number; top: number; rect: Rect } => {
  const u = 1 / Math.max(0.05, px); // units per frame px
  const fs = Math.min(Math.max(13 * u, 10), Math.min(w, h) / (state ? 7.5 : 6));
  const f = slot.focus ?? { x: 0, y: 0 };
  const left = Math.max(fs * 0.9, Math.min(w - fs * 16, f.x * w));
  const top = Math.max(fs * 0.8, Math.min(h - fs * 5.6, f.y * h));
  const avail = Math.max(fs, w - fs * 0.9 - left);
  const lines = [
    { chars: slot.captureId.length, size: fs, em: 0.6, gap: 0 },
    { chars: slot.label.length, size: fs * 0.92, em: 0.56, gap: 0 },
    ...(state ? [{ chars: state.length, size: fs * 0.92, em: 0.56, gap: 0 }] : []),
    { chars: SLOT_CAPTION.length, size: fs * 0.78, em: 0.6, gap: fs * 0.3 },
    ...(timecode ? [{ chars: `src ${timecode} · 1×`.length, size: fs * 0.9, em: 0.6, gap: fs * 0.3 }] : []),
  ];
  let width = 0;
  let height = 0;
  for (const l of lines) {
    const lw = l.chars * l.size * l.em;
    width = Math.max(width, Math.min(lw, avail));
    height += l.gap + Math.max(1, Math.ceil(lw / avail)) * l.size * 1.35;
  }
  return { fs, left, top, rect: { x: left, y: top, w: width, h: height } };
};

/* ---------------------------------------------------------------- stills (published captures) ------------------ */

const still = (id: string, src: string, w: number, h: number, standsFor: string, extra: Partial<StillStandIn> = {}): StillStandIn => ({
  kind: "still",
  id,
  src,
  w,
  h,
  standsFor,
  version: extra.version ?? "1.0.x",
  window: extra.window ?? "pebble",
  ...extra,
});

export const STILL = {
  /**
   * "Blocked · Pebble's change isn't verified yet" with Run the tests: cropped below its usage line. Ring 4's ask while
   * it asks (fix round 2, NF-01), framed whole: every text in it (the body, "Blocked", the buttons) has a cap height of
   * 8.0 CSS px on the 3× capture, so it is all one size
   */
  held: still("held", "ui/crop-held@3x.png", 726, 256, "Ring 4's ask: the held card with Run the tests (F11, F12), from the 2.0.0 run", {
    crop: { x: 0, y: 122, w: 726, h: 134 },
    readPx: 11.7,
    words: 43,
    textPx: 11.7,
    place: "studio-bookings",
  }),
  /** "Run isolated tests" with Don't allow / Run tests */
  testsCard: still("testsCard", "ui/crop-tests-card@2x.png", 495, 344, "Ring 4's act: the test card reading Running, then Done (F3)", { readPx: 13.1, words: 47, textPx: 13.1, place: "studio-bookings" }),
  /** the done receipt, cropped below its "Worked for …" timing line */
  doneReceipt: still("doneReceipt", "ui/crop-done-receipt@2x.png", 684, 278, "a receipt: Verified (F12), the file receipt (H4)", {
    crop: { x: 0, y: 30, w: 684, h: 248 },
    readPx: 13,
    words: 72,
    textPx: 13.8,
  }),
  /** an ask card with two buttons: Don't allow / Apply edit */
  approvalCard: still("approvalCard", "ui/crop-approval-card@2x.png", 495, 482, "the Workshop's ask: \"Keep this tool in Pebble's Toolbox?\" with Discard and Keep (G4)", { readPx: 13.8, words: 82, textPx: 13.8, place: "glaze" }),
  /** a card with two buttons: Don't allow / Run command (its first button's place is Remove's) */
  commandCard: still("commandCard", "ui/crop-command-card@2x.png", 495, 474, "the kept card: \"Kept in Pebble's Toolbox · kiln_ramp_time\" with View code and Remove (G3)", { readPx: 13.1, words: 78, textPx: 13.1, place: "kiln" }),
  /** a site card stand-in: the "Run isolated tests" card again, for the companion's card in the Drop */
  companionCard: still("companionCard", "ui/crop-tests-card@2x.png", 495, 344, "the companion's card \"Use youtube.com\" with Allow (A9, J3), from RS-9", { readPx: 13.1, words: 47, textPx: 13.1, place: "companion" }),
  /** Pebble 1.5.0's main window, welcome: a Pebble window in the composed world */
  mainWelcome: still("mainWelcome", "ui/v150/main-welcome@2x.png", 1160, 800, "the project conversation \"studio-bookings\" (Ring 4's place)", { version: "1.5.0", words: 140, textPx: 12.4, place: "studio-bookings" }),
  /** Pebble 1.5.0's Settings */
  settings: still("settings", "ui/v150/settings-permissions@2x.png", 1160, 800, "Pebble's Toolbox in Settings › Skills & connectors (G5)", { version: "1.5.0", words: 205, textPx: 11.0, place: "settings" }),
  /**
   * Ring 4's ask, cropped to what persists in the conversation's history whatever the person clicks (CR-05, CR-11):
   * "Blocked" and "Pebble's change isn't verified yet.", cut at the sentence's end (before "· 2 file(s) …") and above
   * the second line and the buttons, so it never shows a live button beside a run (measured 27 Oct on the 2× capture:
   * "yet." ends at 250 CSS px, the separator starts at 255; the first line's foot at 187, the second's head at 191).
   * Ring 4's three crops are drawn from the 3× captures: they are read at up to 3× (16:9)
   */
  heldNote: still("heldNote", "ui/crop-held@3x.png", 726, 256, "Ring 4's ask in the history: \"Pebble's change isn't verified yet.\" (F11, F12), from the 2.0.0 run", {
    crop: { x: 0, y: 124, w: 253, h: 66 },
    readPx: 11.7,
    words: 6,
    textPx: 11.7,
    place: "studio-bookings",
  }),
  /**
   * Ring 4's act: the test card's sentence (the treatment's own words for it, S18), without its title row's review
   * badge or its buttons, which are a 1.0.x approval state (the 2.0.0 card reads Running, then Done): 13 words, cap
   * height 9 CSS px (12.4 px type)
   */
  testsLine: still("testsLine", "ui/crop-tests-card@3x.png", 495, 344, "Ring 4's act: the test card reading Running, \"Runs the project's tests in a temporary copy. Your project files don't change.\" (F3)", {
    crop: { x: 24, y: 47, w: 424, h: 43 },
    readPx: 12.4,
    words: 13,
    textPx: 12.4,
    place: "studio-bookings",
  }),
  /**
   * Ring 4's receipt: "Verified · pytest 42 passed on current files", the line the treatment names (H6, S18), below the
   * timing line and above the reply (fix round 2, NF-01: the crop ended on "Done, and verified:" with its list cut away;
   * measured 27 Oct on the 3× capture: the timing line's ink ends at 27.7 CSS px, the Verified line runs 42.7–52.7, the
   * reply's "Done, and verified:" starts at 68.7). The reply's list is not read here: its 41 words at reading size
   * would take the ring shot past 3.14 words a second
   */
  verifiedTop: still("verifiedTop", "ui/crop-done-receipt@3x.png", 684, 278, "Ring 4's receipt: \"Verified · pytest … passed on current files\" (F12)", {
    crop: { x: 12, y: 33, w: 250, h: 28 },
    readPx: 11.0,
    words: 7,
    textPx: 11.0,
    place: "studio-bookings",
  }),
  /** the companion at work: a real 1.0.x harness frame ("Thinking", "Task: running"; avatar hidden: the stone is drawn there) */
  companionWorking: still("companionWorking", "ui-frames/pet-live-error-light-hidden/00120.png", 384, 456, "the companion working after the Allow (A3, A9), from RS-9", { readPx: 13.3, words: 27, textPx: 13.3, place: "companion" }),
} as const satisfies Record<string, StillStandIn>;

/* ---------------------------------------------------------------- slots (not captured yet) ---------------------- */

const slot = (id: string, captureId: string, label: string, w: number, h: number, window: WindowKind, standsFor: string): SlotStandIn => ({
  kind: "slot",
  id,
  captureId,
  label,
  w,
  h,
  window,
  standsFor,
});

export const SLOT = {
  // (its label right of its middle: whole in the whole Mac's framings, wholly off-frame as Ring 4 reads the project
  // left of it; at its top left corner it sat cut by the frame's edge for 2–4 s: the verifier's NF-08)
  browser: { ...slot("browser", "RS-9", "the browser take: Pebble's own tab, at 1×", 1440, 900, "thirdParty", "J2, J1, J6, F14: Pebble's tab, the results, the video starting"), focus: { x: 0.62, y: 0.5 } },
  /** no published capture shows the companion holding a card: its card and its sites, before the Allow (CR-18) */
  companionCard: { ...slot("companionCard", "RS-9", "the companion's card \"Use youtube.com\": its sites, Allow", 384, 456, "pebble", "A9, J3: the card answered in the companion"), focus: { x: 0.08, y: 0.18 }, place: "companion" },
  /** Ring 4's conversation window: the take's full frame, around the views the film reads */
  // (its label between the held card's answered sentence and the run, where Ring 4 reads: until HS-F exists the frame
  // says what fills it while it is read; the card asking covers it until the click: the verifier's NF-01)
  project: { ...slot("project", "HS-F", "the conversation \"studio-bookings\"", 1160, 800, "pebble", "F1, F11: the project conversation"), focus: { x: 0.285, y: 0.285 }, place: "studio-bookings" },
  /** the Workshop's cards (1.7.0, never published): the ask and the kept card, at the sizes the 2.0.0 cards take */
  glazeCard: { ...slot("glazeCard", "HS-G", "\"Keep this tool in Pebble's Toolbox?\" Discard · Keep", 440, 220, "pebble", "G4: the Workshop's ask"), place: "glaze" },
  keptCard: { ...slot("keptCard", "RS-W", "\"Kept in Pebble's Toolbox · kiln_ramp_time\" View code · Remove", 440, 240, "pebble", "G3: the kept tool, told"), place: "kiln" },
  calculator: slot("calculator", "RS-4", "Calculator, before \"=\"", 232, 372, "apple", "I1, I8: Ring 2's place"),
  finder: slot("finder", "RS-H", "Finder at Pebble Workbench", 820, 500, "apple", "H1, H2: Ring 3's place"),
  agents: slot("agents", "HS-N", "the agents panel", 520, 360, "pebble", "N1: Agents read and propose"),
  goal: slot("goal", "HS-N", "a goal with its criteria", 520, 360, "pebble", "N2: A goal, with criteria"),
  skills: slot("skills", "HS-O", "Skills & connectors", 520, 360, "pebble", "O1: Skills you review"),
  connector: slot("connector", "HS-O", "a connector's call, asking", 520, 360, "pebble", "O2: Connectors that ask"),
  // (the palette and the workspace name themselves where the Dusk reads the palette's middle row: in 1:1 and 9:16 the
  // camera shows the palette's 13–88 % and the workspace's 27–73 % across, and their labels at the top left were cut by
  // the frame's left edge for the passage's first 3.8 s; setpieces/qa.ts slotLabels)
  palette: { ...slot("palette", "HS-B3", "⌘K, typed, Enter", 680, 400, "pebble", "B6: the palette and its row"), focus: { x: 0.2, y: 0.1 }, place: "workspace" },
  /** the workspace ⌘K opens over (the take's full frame; Pebble 1.5.0's own window stands for it where it shows whole) */
  workspace: { ...slot("workspace", "HS-B3", "the workspace, before ⌘K", 1160, 800, "pebble", "B6: the workspace"), focus: { x: 0.32, y: 0.12 }, place: "workspace" },
  // (its label beside where Pebble's icon sits, so the 3.5× framing of 1:1 and 9:16 shows it whole)
  menuBar: { ...slot("menuBar", "RS-13", "the menu bar: Pebble's icon", 1440, 56, "apple", "L5: a filled pebble in a ring"), focus: { x: 0.7, y: 0.05 } },
  dock: slot("dock", "RS-13", "the Dock: Pebble's icon leaves", 900, 104, "apple", "L4: leaves the Dock"),
} as const satisfies Record<string, SlotStandIn>;

/* ---------------------------------------------------------------- the wall's cells ------------------------------ */

/**
 * The wall's 28 cells (TREATMENT §3.8): placeholders cut from published captures, one per feature the 2.0.0 wall will
 * show in the same place (inner ring 8, middle 8, outer 12; no Stealth cell anywhere). The thumbnails are made once
 * with setpieces/tools/make-cells.ts into video/public/ui/f2-cells (gitignored): the 2× PNGs decoded whole would put
 * 28 × 15 MB into every render tab. Inner cells were chosen with no usage or timing line, since the pull-back passes
 * them at sizes where a number could be read.
 */
export interface CellSource {
  id: string;
  /** the feature it stands for (FEATURES_2_0 ID) */
  feature: string;
  ring: 0 | 1 | 2;
  /** the source capture (2×), and the crop in CSS px */
  from: string;
  crop: Rect;
}

export const CELL_SOURCES: readonly CellSource[] = [
  // inner ring: the film's heroes (the kept card first: the climax's card is the wall's first cell)
  { id: "g3", feature: "G3", ring: 0, from: "ui/crop-command-card@2x.png", crop: { x: 0, y: 0, w: 495, h: 474 } },
  { id: "a6", feature: "A6", ring: 0, from: "ui/pet-live-01-greeting@2x.png", crop: { x: 0, y: 0, w: 384, h: 360 } },
  { id: "a9", feature: "A9", ring: 0, from: "ui/crop-approval-card@2x.png", crop: { x: 0, y: 0, w: 495, h: 330 } },
  { id: "j2", feature: "J2", ring: 0, from: "ui/main-dashboard@2x.png", crop: { x: 640, y: 40, w: 760, h: 520 } },
  { id: "i8", feature: "I8", ring: 0, from: "ui/crop-models-ways-in@2x.png", crop: { x: 0, y: 0, w: 504, h: 227 } },
  { id: "h1", feature: "H1", ring: 0, from: "ui/crop-done-receipt@2x.png", crop: { x: 0, y: 30, w: 684, h: 248 } },
  { id: "h4", feature: "H4", ring: 0, from: "ui/crop-tests-card@2x.png", crop: { x: 0, y: 0, w: 495, h: 344 } },
  { id: "f12", feature: "F12", ring: 0, from: "ui/crop-held@2x.png", crop: { x: 0, y: 122, w: 726, h: 134 } },
  // middle ring
  { id: "c4", feature: "C4", ring: 1, from: "ui/settings-models@2x.png", crop: { x: 280, y: 40, w: 600, h: 520 } },
  { id: "d1", feature: "D1", ring: 1, from: "ui/crop-memory-records@2x.png", crop: { x: 0, y: 0, w: 504, h: 265 } },
  { id: "e4", feature: "E4", ring: 1, from: "ui/crop-permissions-modes@2x.png", crop: { x: 0, y: 0, w: 504, h: 300 } },
  { id: "e9", feature: "E9", ring: 1, from: "ui/v150/settings-permissions@2x.png", crop: { x: 280, y: 40, w: 600, h: 520 } },
  { id: "b6", feature: "B6", ring: 1, from: "ui/v150/main-welcome@2x.png", crop: { x: 300, y: 100, w: 720, h: 420 } },
  { id: "b9", feature: "B9", ring: 1, from: "ui/settings-memory@2x.png", crop: { x: 280, y: 40, w: 600, h: 520 } },
  { id: "g4", feature: "G4", ring: 1, from: "ui/crop-approval-card@2x.png", crop: { x: 0, y: 140, w: 495, h: 342 } },
  { id: "i6", feature: "I6", ring: 1, from: "ui/main-quiz@2x.png", crop: { x: 620, y: 60, w: 520, h: 420 } },
  // outer ring
  { id: "b7", feature: "B7", ring: 2, from: "ui/main-live-01-empty@2x.png", crop: { x: 0, y: 0, w: 640, h: 440 } },
  { id: "b13", feature: "B13", ring: 2, from: "ui/crop-memory-records-forgotten@2x.png", crop: { x: 0, y: 0, w: 504, h: 360 } },
  { id: "m1", feature: "M1", ring: 2, from: "ui/crop-dashboard-chart@2x.png", crop: { x: 0, y: 0, w: 783, h: 493 } },
  { id: "m2", feature: "M2", ring: 2, from: "ui/main-quiz@2x.png", crop: { x: 640, y: 160, w: 500, h: 420 } },
  { id: "k3", feature: "K3", ring: 2, from: "ui/crop-challenge-step@2x.png", crop: { x: 0, y: 24, w: 497, h: 305 } },
  { id: "n1", feature: "N1", ring: 2, from: "ui/git-plan@2x.png", crop: { x: 820, y: 80, w: 560, h: 420 } },
  { id: "n2", feature: "N2", ring: 2, from: "ui/main-forget@2x.png", crop: { x: 240, y: 40, w: 600, h: 420 } },
  { id: "n3", feature: "N3", ring: 2, from: "ui/command-review@2x.png", crop: { x: 820, y: 60, w: 560, h: 420 } },
  { id: "o1", feature: "O1", ring: 2, from: "ui/crop-git-card@2x.png", crop: { x: 0, y: 0, w: 495, h: 420 } },
  { id: "c6", feature: "C6", ring: 2, from: "ui/pet-live-02-thinking@2x.png", crop: { x: 0, y: 64, w: 384, h: 300 } },
  { id: "f2", feature: "F2", ring: 2, from: "ui/main-approval@2x.png", crop: { x: 820, y: 60, w: 340, h: 420 } },
  { id: "p1", feature: "P1", ring: 2, from: "ui/main-forget-card@2x.png", crop: { x: 380, y: 300, w: 660, h: 240 } },
];

/** Features the wall must never hold: every Stealth Lockdown feature (the honest line is never on the wall). */
export const STEALTH_FEATURES = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;

/** The thumbnail of a cell (made by tools/make-cells.ts): the long side in px for its ring. */
export const CELL_THUMB_LONG_SIDE = [760, 560, 480] as const;
export const cellThumbPath = (id: string): string => `ui/f2-cells/${id}.jpg`;
