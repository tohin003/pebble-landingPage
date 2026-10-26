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
}

export type StandIn = StillStandIn | SlotStandIn;

/** The shown size of a stand-in (its crop, or the whole capture). */
export const shownSize = (s: StandIn): { w: number; h: number } => (s.kind === "still" && s.crop ? { w: s.crop.w, h: s.crop.h } : { w: s.w, h: s.h });

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
  /** "Blocked · Pebble's change isn't verified yet" with Run the tests: cropped below its usage line */
  held: still("held", "ui/crop-held@2x.png", 726, 256, "Ring 4's ask: the held card with Run the tests (F11, F12), from the 2.0.0 run", {
    crop: { x: 0, y: 122, w: 726, h: 134 },
    readPx: 13,
  }),
  /** "Run isolated tests" with Don't allow / Run tests */
  testsCard: still("testsCard", "ui/crop-tests-card@2x.png", 495, 344, "Ring 4's act: the test card reading Running, then Done (F3)", { readPx: 15 }),
  /** the done receipt, cropped below its "Worked for …" timing line */
  doneReceipt: still("doneReceipt", "ui/crop-done-receipt@2x.png", 684, 278, "a receipt: Verified (F12), the file receipt (H4)", {
    crop: { x: 0, y: 30, w: 684, h: 248 },
    readPx: 13,
  }),
  /** an ask card with two buttons: Don't allow / Apply edit */
  approvalCard: still("approvalCard", "ui/crop-approval-card@2x.png", 495, 482, "the Workshop's ask: \"Keep this tool in Pebble's Toolbox?\" with Discard and Keep (G4)", { readPx: 15 }),
  /** a card with two buttons: Don't allow / Run command (its first button's place is Remove's) */
  commandCard: still("commandCard", "ui/crop-command-card@2x.png", 495, 474, "the kept card: \"Kept in Pebble's Toolbox · kiln_ramp_time\" with View code and Remove (G3)", { readPx: 15 }),
  /** a site card stand-in: the "Run isolated tests" card again, for the companion's card in the Drop */
  companionCard: still("companionCard", "ui/crop-tests-card@2x.png", 495, 344, "the companion's card \"Use youtube.com\" with Allow (A9, J3), from RS-9", { readPx: 15 }),
  /** Pebble 1.5.0's main window, welcome: a Pebble window in the composed world */
  mainWelcome: still("mainWelcome", "ui/v150/main-welcome@2x.png", 1160, 800, "the project conversation \"studio-bookings\" (Ring 4's place)", { version: "1.5.0" }),
  /** Pebble 1.5.0's Settings */
  settings: still("settings", "ui/v150/settings-permissions@2x.png", 1160, 800, "Pebble's Toolbox in Settings › Skills & connectors (G5)", { version: "1.5.0" }),
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
  browser: slot("browser", "RS-9", "the browser take: Pebble's own tab, at 1×", 1440, 900, "thirdParty", "J2, J1, J6, F14: Pebble's tab, the results, the video starting"),
  calculator: slot("calculator", "RS-4", "Calculator, before \"=\"", 232, 372, "apple", "I1, I8: Ring 2's place"),
  finder: slot("finder", "RS-H", "Finder at Pebble Workbench", 820, 500, "apple", "H1, H2: Ring 3's place"),
  agents: slot("agents", "HS-N", "the agents panel", 520, 360, "pebble", "N1: Agents read and propose"),
  goal: slot("goal", "HS-N", "a goal with its criteria", 520, 360, "pebble", "N2: A goal, with criteria"),
  skills: slot("skills", "HS-O", "Skills & connectors", 520, 360, "pebble", "O1: Skills you review"),
  connector: slot("connector", "HS-O", "a connector's call, asking", 520, 360, "pebble", "O2: Connectors that ask"),
  palette: slot("palette", "HS-B3", "⌘K, typed, Enter", 680, 400, "pebble", "B6: the palette and its row"),
  menuBar: slot("menuBar", "RS-13", "the menu bar: Pebble's icon", 1440, 56, "apple", "L5: a filled pebble in a ring"),
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
