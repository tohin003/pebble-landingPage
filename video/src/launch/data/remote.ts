// Pebble Remote on iPhone: the Simulator takes for act 8 ("Your Mac, in your pocket."), as files, facts and moments.
// Plain data; no React, no imports.
//
// Source: the Pebble Remote app's own code (github.com/tohin003/pebble-remote at f097140, "Pebble Remote 1.0.0",
// Apache-2.0), a DEBUG build in the iOS 27.0 Simulator on an iPhone 18 Pro, paired over TLS 1.3 with a stand-in Mac:
// the app repository's own reference bridge (bridge-mock) carrying the film's fictional sample world (Clay & Current,
// studio-bookings, "Studio Mac", Pebble 2.0.0, Claude Opus 5.5, Ask for approval). Every screen is the app's own;
// Face ID is the system's own prompt. Shown with sample data. How it was made and how to redo it:
// .work/launch/remote/REMOTE.md (not in git). Files: video/public/launch/remote/ (not in git), for staticFile().
//
// Units and conventions (as in takes.ts):
// - Time is in SOURCE seconds from the file's first frame; every clip is 60 fps CFR, so frame k is shown at k / 60 s.
// - Every event was read off the picture (contact sheets at 0.25 s, boundaries at 0.05 to 0.1 s), not from the test
//   log: treat them as ±0.1 s.
// - Boxes are in the clip's own pixels (top-left origin), 1206 x 2622, the phone's whole screen (3 px a point). The
//   clip is the screen only: no margins, square corners. The recording does include the Dynamic Island's black mask
//   (top centre); round the corners and frame the phone yourself.
// - The Simulator ran under memory pressure: the source is variable frame rate, about 10 to 20 updates a second
//   during animations (repeated frames in the 60 fps file), and waits are longer than on a phone. Speed-ramp the waits.
// - ROIs are zoom targets (push to about 2x on one action, TREATMENT §4); `valid` is when the box shows what the note
//   says.

export interface RemoteBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RemoteEvent {
  name: string;
  /** source seconds */
  s: number;
  note?: string;
}

export interface RemoteRoi extends RemoteBox {
  name: string;
  note: string;
  /** source seconds over which this box shows what the note says */
  valid?: readonly [number, number];
}

export type RemoteHazardKind = "state" | "glitch" | "dead-wait" | "frame-rate";

export interface RemoteHazard {
  kind: RemoteHazardKind;
  s0: number;
  s1: number;
  box: RemoteBox;
  what: string;
  fix: "crop" | "avoid" | "speed-ramp" | "accept";
}

export type RemoteClipId = "approval" | "pebbleTab" | "pairing";

export interface RemoteClip {
  id: RemoteClipId;
  /** under video/public, for staticFile() */
  file: string;
  width: 1206;
  height: 2622;
  fps: 60;
  durationS: number;
  frames: number;
  bytes: number;
  /** the screen content inside the frame: the whole frame */
  screen: RemoteBox;
  summary: string;
  events: readonly RemoteEvent[];
  rois: readonly RemoteRoi[];
  hazards: readonly RemoteHazard[];
}

export interface RemoteStill {
  /** under video/public, for staticFile(); PNG, 1206 x 2622 */
  file: string;
  bytes: number;
  shows: string;
}

const box = (x: number, y: number, w: number, h: number): RemoteBox => ({ x, y, w, h });

const SCREEN = box(0, 0, 1206, 2622);
/** The system's Face ID prompt (a dark rounded square, "Face ID" at its foot; same place in every take). */
const FACE_ID_PROMPT = box(372, 1074, 464, 464);
/** The Pebble tab's hero card (the pebble, what it is doing, the route badge) and its rows. */
const TAB_HERO = box(48, 504, 1110, 357);
const TAB_HERO_REVIEW = box(48, 504, 1110, 417);
const TAB_WORKING_ROW = box(48, 1041, 1110, 285);
const TAB_REVIEW_ROW = box(48, 1101, 1110, 204);
const TAB_REVIEWS_ITEM = box(636, 2385, 216, 168);

// ---------------------------------------------------------------------------------------------------------------------

const APPROVAL: RemoteClip = {
  id: "approval",
  file: "launch/remote/remote-approval.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 46.65,
  frames: 2799,
  bytes: 4183132,
  screen: SCREEN,
  summary:
    "The hero take. Pebble starts working on the Mac (the person asked there: 'Saturday's wheel tasters are taking one booking too many. Stop a full slot from taking another booking.'); the phone's Pebble tab follows it (the pebble's working face, 'Reading', 'Searching', the Working Now row), the conversation opens on Pebble's diagnosis and the edit to approve ('Project edit / Change slots.py / studio_bookings/slots.py', Don't Allow / Apply Edit with the Face ID glyph), Apply Edit, the system Face ID prompt, the edit Done ('Undo This Edit'), then 'The change is in. Now the tests, in an isolated copy.' and a second card arriving live ('Test recipe plan / Run isolated tests / pytest', Run Tests), Run Tests (no second Face ID: one check covers 30 s, as on a phone), and the reply 'Fixed. A full slot now turns the next booking away, and all 18 tests pass, including test_full_slot_refuses_another_booking, which failed before.'",
  events: [
    { name: "pebbleTabIdle", s: 0, note: "Pebble tab: 'Not working on anything right now', Local network · <1 ms" },
    { name: "workStarts", s: 3.7, note: "hero card turns to Pebble's status words ('Reading closely', 'Reading'), Working Now row appears" },
    { name: "searching", s: 8.5, note: "'Searching project source' (approx.)" },
    { name: "openConversation", s: 14.8, note: "the Working Now row tapped; push to the conversation (approx.)" },
    { name: "conversationLoading", s: 15.2, note: "'Loading conversation'" },
    { name: "editCardShown", s: 16.65, note: "diagnosis text and the edit card on screen (the card arrived during the push)" },
    { name: "applyEditPressed", s: 27.05, note: "Apply Edit greys, the card's spinner shows" },
    { name: "faceIdShown", s: 29.15, note: "the system Face ID prompt over the card" },
    { name: "approved", s: 32.8, note: "Face ID matched: the prompt fades and the transcript re-lays out (a jump)" },
    { name: "faceIdGone", s: 33.0 },
    { name: "testsCardShown", s: 36.8, note: "'Run isolated tests / pytest' card arrives under 'The change is in. Now the tests, in an isolated copy.'" },
    { name: "runTestsPressed", s: 41.1, note: "Run Tests greys; no Face ID (inside the 30 s window)" },
    { name: "fixedReplyStarts", s: 43.4, note: "'Fixed. A full slot now turns the next booking away…' streams in" },
    { name: "fixedReplyDone", s: 45.5, note: "the full reply, with the test's name, on screen to the end" },
  ],
  rois: [
    { name: "tabHero", ...TAB_HERO, note: "the pebble working and its status words", valid: [3.7, 14.8] },
    { name: "tabWorkingRow", ...TAB_WORKING_ROW, note: "Working Now: status pill, timer, 'Wheel taster bookings', the step", valid: [3.7, 14.8] },
    { name: "diagnosis", ...box(48, 534, 1110, 252), note: "Pebble's diagnosis: 'book() … checks booked > places, so a full slot of 12 still takes a 13th…'", valid: [16.65, 32.8] },
    { name: "editCard", ...box(48, 840, 1110, 588), note: "the edit to approve, whole card", valid: [16.65, 32.8] },
    { name: "applyEdit", ...box(661, 1232, 449, 151), note: "Apply Edit (Face ID glyph): the tap target", valid: [16.65, 29.15] },
    { name: "faceIdPrompt", ...FACE_ID_PROMPT, note: "the system Face ID prompt", valid: [29.15, 32.8] },
    { name: "testsCard", ...box(48, 1107, 1110, 591), note: "'Test recipe plan / Run isolated tests / pytest', Don't Allow / Run Tests", valid: [36.8, 41.1] },
    { name: "runTests", ...box(669, 1500, 441, 150), note: "Run Tests: the tap target", valid: [36.8, 41.1] },
    { name: "fixedReply", ...box(48, 1164, 1110, 255), note: "'Fixed. … all 18 tests pass, including test_full_slot_refuses_another_booking, which failed before.'", valid: [45.5, 46.65] },
  ],
  hazards: [
    {
      kind: "state",
      s0: 16.65,
      s1: 32.8,
      box: box(48, 1794, 1110, 240),
      what: "the app's honest C1 lock row: 'Locked. You can read along; Face ID unlocks acting.' with an Unlock button (a second Face ID glyph on screen); it goes once the approval's Face ID unlocks the phone",
      fix: "crop",
    },
    {
      kind: "glitch",
      s0: 32.75,
      s1: 33.1,
      box: SCREEN,
      what: "after Face ID the transcript re-lays out in one jump (the run's steps open above the card); real, but don't cut or zoom across it",
      fix: "avoid",
    },
    {
      kind: "frame-rate",
      s0: 0,
      s1: 46.65,
      box: SCREEN,
      what: "the Simulator painted 10 to 20 updates a second under load: transitions and the Face ID fade step; hold or cut on settled frames",
      fix: "accept",
    },
  ],
};

const PEBBLE_TAB: RemoteClip = {
  id: "pebbleTab",
  file: "launch/remote/remote-pebble-tab.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 18,
  frames: 1080,
  bytes: 962176,
  screen: SCREEN,
  summary:
    "An approval arriving, seen from the Pebble tab (an earlier run of the same scene, never opened): idle, Pebble works on the Mac (status words rotate: 'Reasoning it through', 'Reading', 'Scanning for matches', 'Putting it into words', 'Writing', 'Editing'), then 'Needs your review / Waiting for your decision; the reply follows it', a 'Needs your review' row ('1 item needs your review / Change slots.py') and a red 1 on the Reviews tab. Holds 8 s on that.",
  events: [
    { name: "pebbleTabIdle", s: 0, note: "'Not working on anything right now'" },
    { name: "workStarts", s: 4.0, note: "'Reasoning it through', Working Now row appears" },
    { name: "reading", s: 5.6 },
    { name: "scanning", s: 6.1, note: "'Scanning for matches'" },
    { name: "writing", s: 8.3 },
    { name: "editing", s: 9.1, note: "'Editing / Preparing an edit to studio_bookings/slots.py'" },
    { name: "needsReview", s: 9.9, note: "hero 'Needs your review', the review row, Reviews badge 1: the approval has arrived" },
  ],
  rois: [
    { name: "tabHero", ...TAB_HERO, note: "the pebble and its status words while working", valid: [4.0, 9.9] },
    { name: "tabWorkingRow", ...TAB_WORKING_ROW, note: "Working Now row", valid: [4.0, 9.9] },
    { name: "tabHeroReview", ...TAB_HERO_REVIEW, note: "'Needs your review / Waiting for your decision; the reply follows it'", valid: [9.9, 18] },
    { name: "reviewRow", ...TAB_REVIEW_ROW, note: "'1 item needs your review / Change slots.py'", valid: [9.9, 18] },
    { name: "reviewsBadge", ...TAB_REVIEWS_ITEM, note: "the Reviews tab with its red 1", valid: [9.9, 18] },
  ],
  hazards: [],
};

const PAIRING: RemoteClip = {
  id: "pairing",
  file: "launch/remote/remote-pairing.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 31.2,
  frames: 1872,
  bytes: 1550001,
  screen: SCREEN,
  summary:
    "Pairing, from the app's first screen: 'Pair with Your Mac' (the pebble, Paste, Enter the Link, Try the Demo), Paste (the stand-in Mac's link), 'Pairing with your Mac', the system Face ID prompt (pairing signs with the approve key, 'Pair this iPhone with Studio Mac'), then 'Confirm on Your Mac' with the six digits 704 814 while the Mac confirms, then the Pebble tab: 'Not working on anything right now', Local network · 3 ms, Studio Mac 92 %, charging.",
  events: [
    { name: "pairScreen", s: 0, note: "'Pair with Your Mac'" },
    { name: "pasteTapped", s: 2.2, note: "Paste (the system paste button) pressed; 'Pairing with your Mac' follows" },
    { name: "faceIdShown", s: 6.4, note: "the system Face ID prompt over the pairing screen" },
    { name: "faceIdGone", s: 9.75, note: "matched" },
    { name: "codeShown", s: 17.05, note: "'Confirm on Your Mac', 704 814 (a 7.3 s wait before it: see hazards)" },
    { name: "codeGone", s: 23.7, note: "the Mac confirmed; the first screen shows for 0.6 s (the app's own hand-over)" },
    { name: "pebbleTabShown", s: 24.35, note: "the Pebble tab, paired" },
  ],
  rois: [
    { name: "paste", ...box(472, 1248, 262, 103), note: "the Paste button: the tap target", valid: [0, 2.2] },
    { name: "faceIdPrompt", ...FACE_ID_PROMPT, note: "the system Face ID prompt", valid: [6.4, 9.75] },
    { name: "codeTitle", ...box(48, 600, 1110, 111), note: "'Confirm on Your Mac'", valid: [17.05, 23.7] },
    { name: "code", ...box(48, 921, 1110, 297), note: "the six digits, 704 814", valid: [17.05, 23.7] },
    { name: "tabHero", ...TAB_HERO, note: "'Not working on anything right now', Local network · 3 ms", valid: [24.35, 31.2] },
  ],
  hazards: [
    {
      kind: "dead-wait",
      s0: 9.75,
      s1: 17.05,
      box: SCREEN,
      what: "'Pairing with your Mac' spinner: the loaded Simulator took 7 s to show the code the Mac had sent at once",
      fix: "speed-ramp",
    },
    {
      kind: "glitch",
      s0: 23.7,
      s1: 24.35,
      box: SCREEN,
      what: "the first pairing screen shows again for 0.6 s between the code and the tabs (the app's own order)",
      fix: "avoid",
    },
  ],
};

export const REMOTE_CLIPS: Readonly<Record<RemoteClipId, RemoteClip>> = {
  approval: APPROVAL,
  pebbleTab: PEBBLE_TAB,
  pairing: PAIRING,
};

/** Lossless PNG stills, 1206 x 2622 (XCUITest screenshots, except needs-review: a frame of the take's H.264). */
export const REMOTE_STILLS: readonly RemoteStill[] = [
  { file: "launch/remote/stills/remote-pair-screen.png", bytes: 201432, shows: "'Pair with Your Mac': the pebble, Paste, Enter the Link, Try the Demo" },
  { file: "launch/remote/stills/remote-pair-face-id.png", bytes: 316108, shows: "the Face ID prompt while pairing" },
  { file: "launch/remote/stills/remote-pair-six-digits.png", bytes: 154774, shows: "'Confirm on Your Mac', 704 814" },
  { file: "launch/remote/stills/remote-pebble-tab.png", bytes: 299632, shows: "the Pebble tab, idle: Ask for approval, Local network · 3 ms, Studio Mac" },
  { file: "launch/remote/stills/remote-pebble-tab-working.png", bytes: 313459, shows: "the Pebble tab while Pebble works: 'Reading', Working Now · Wheel taster bookings" },
  { file: "launch/remote/stills/remote-pebble-tab-needs-review.png", bytes: 369445, shows: "the Pebble tab: 'Needs your review', '1 item needs your review / Change slots.py', Reviews badge 1" },
  { file: "launch/remote/stills/remote-edit-to-approve.png", bytes: 754526, shows: "the conversation: diagnosis and the edit card, Apply Edit" },
  { file: "launch/remote/stills/remote-approve-face-id.png", bytes: 906097, shows: "the Face ID prompt over the edit card" },
  { file: "launch/remote/stills/remote-tests-to-approve.png", bytes: 752069, shows: "edit Done, 'Run isolated tests / pytest', Run Tests" },
  { file: "launch/remote/stills/remote-fixed-and-verified.png", bytes: 685999, shows: "'Fixed. … all 18 tests pass…'" },
];

/** For the description and the end card (TREATMENT §5). */
export const REMOTE_CREDITS = {
  app: "Pebble Remote (github.com/tohin003/pebble-remote), Apache-2.0",
  pebble: "Pebble's character engine: bloub by Jérémy Perret (MIT)",
  sample: "Shown with sample data.",
} as const;

export function remoteEventS(id: RemoteClipId, name: string): number {
  const event = REMOTE_CLIPS[id].events.find((e) => e.name === name);
  if (!event) throw new Error(`remote.ts: no event ${name} in ${id}`);
  return event.s;
}

export function remoteRoi(id: RemoteClipId, name: string): RemoteRoi {
  const roi = REMOTE_CLIPS[id].rois.find((r) => r.name === name);
  if (!roi) throw new Error(`remote.ts: no ROI ${name} in ${id}`);
  return roi;
}
