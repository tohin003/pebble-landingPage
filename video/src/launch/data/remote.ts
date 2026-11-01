// Pebble Remote on iPhone (act 8): the Simulator takes, as files, events, framings and hazards, plus a suggested beat.
// Plain data and two lookups; no React. Same units and shapes as takes.ts (its own types here, no import).
//
// Source: the Pebble Remote app's own code (github.com/tohin003/pebble-remote at f097140, "Pebble Remote 1.0.0",
// Apache-2.0; its pebble is ported from bloub by Jérémy Perret, MIT), a DEBUG build in the iOS 27.0 Simulator on an
// iPhone 18 Pro, connected over TLS to a stand-in Mac: the app repository's own reference bridge (bridge-mock) run with
// the film's fictional sample world (Clay & Current's open day, studio-bookings, "Studio Mac"). No screen is redrawn.
// The Face ID prompt is the Simulator's own system prompt, answered with BiometricKit's simulated match. Shown with
// sample data. How it was made and how to redo it: .work/launch/remote/REMOTE.md (not in git).
//
// Units and conventions:
// - Time is in SOURCE seconds from the file's first frame; every clip is 60 fps CFR (frame k shows at k / 60 s).
// - Boxes are in the clip's own pixels (1206×2622, top-left origin; 3 px a point). The clip is the phone's whole screen,
//   no margins: the Simulator records the status bar (overridden to 9:41, full battery, Wi-Fi) and the Dynamic Island
//   mask, but square corners and no bezel. Frame the screen yourself (iPhone 18 Pro display corners ≈ 55 pt = 165 px).
// - Event times were read off the encoded clips' frames (0.05 to 0.25 s steps), not taken from the test's log. A note
//   gives the tolerance where it is wider than ±0.1 s.
// - The source screen updated at about 10 to 20 fps (the Mac was under load while recording): motion such as the
//   push into the conversation, the Face ID prompt's fade and the transcript's re-layout is stepped; held frames are
//   repeated to 60 fps. Ease camera moves over them; don't slow them down.

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
  /** source seconds over which this box holds what the note says */
  valid?: readonly [number, number];
}

export type RemoteHazardKind = "state" | "glitch" | "rival" | "inconsistency";

export interface RemoteHazard {
  kind: RemoteHazardKind;
  s0: number;
  s1: number;
  box: RemoteBox;
  what: string;
  fix: "crop" | "avoid" | "accept";
}

export type RemoteClipId = "remote-pebble-tab" | "remote-approval" | "remote-pairing";

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
  /** the screen content inside the frame: the whole frame (no margins) */
  screen: RemoteBox;
  summary: string;
  events: readonly RemoteEvent[];
  rois: readonly RemoteRoi[];
  hazards: readonly RemoteHazard[];
}

export interface RemoteStill {
  /** under video/public, for staticFile(); PNG, 1206×2622 */
  file: string;
  bytes: number;
  shows: string;
}

const box = (x: number, y: number, w: number, h: number): RemoteBox => ({ x, y, w, h });

/** The whole screen of every clip and still. */
export const REMOTE_SCREEN = box(0, 0, 1206, 2622);

// Shared framings (pixels), measured on the clips' own frames.
const PEBBLE_HERO = box(48, 504, 1110, 357); // the Pebble tab's "what Pebble is doing" card (417 tall for "Needs your review")
const WORKING_ROW = box(48, 1041, 1110, 285); // Working Now › Wheel taster bookings (status pill, elapsed time, Stop)
const FACE_ID_PROMPT = box(372, 1074, 464, 464); // the system Face ID prompt: a dark rounded square labelled "Face ID"
const MODEL_CHIPS = box(48, 2064, 600, 72); // "Claude Opus 5.5" and "High" above the composer, in a conversation

const PEBBLE_TAB: RemoteClip = {
  id: "remote-pebble-tab",
  file: "launch/remote/remote-pebble-tab.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 18.0,
  frames: 1080,
  bytes: 962176,
  screen: REMOTE_SCREEN,
  summary:
    "The Pebble tab while Pebble works on the Mac, nobody touching the phone: 'Not working on anything right now', then the person's request (asked on the Mac) starts and the pebble works through Pebble's own status words (Reasoning it through, Reading, Scanning for matches, Writing, Editing) in the hero card and the Working Now row, then the approval arrives: the hero card turns to 'Needs your review', the row becomes '1 item needs your review · Change slots.py' and the Reviews tab gets a red 1 badge (9.9 s). 'Your Mac' below: Studio Mac, 92%, charging; Keep Awake on.",
  events: [
    { name: "idle", s: 0, note: "'Not working on anything right now', Local network · <1 ms" },
    { name: "workStarts", s: 4.0, note: "hero: 'Reasoning it through'; the Working Now row appears" },
    { name: "reading", s: 5.55, note: "status words rotate every 0.25 to 1 s (Reading, Weighing options, Scanning for matches)" },
    { name: "writing", s: 8.05, note: "'Putting it into words', then 'Writing' at 8.3" },
    { name: "editing", s: 9.05, note: "'Editing · Preparing an edit to studio_bookings/slots.py'" },
    { name: "approvalArrives", s: 9.9, note: "hero 'Needs your review · Waiting for your decision; the reply follows it'; review row; Reviews badge 1" },
  ],
  rois: [
    { name: "hero", ...PEBBLE_HERO, note: "the pebble and what it is doing; the route badge under it", valid: [0, 18.0] },
    { name: "workingRow", ...WORKING_ROW, note: "Working Now: status pill, elapsed seconds, Stop", valid: [4.0, 9.9] },
    { name: "reviewRow", ...box(48, 1101, 1110, 204), note: "'1 item needs your review · Change slots.py'", valid: [9.9, 18.0] },
    { name: "reviewsBadge", ...box(636, 2385, 216, 168), note: "the Reviews tab with its red 1 badge", valid: [9.9, 18.0] },
    {
      name: "isolateTop",
      ...box(0, 0, 1206, 1400),
      note: "isolate: status bar, mode chip 'Ask for approval', the hero and the row below it",
      valid: [0, 18.0],
    },
  ],
  hazards: [
    {
      kind: "inconsistency",
      s0: 9.9,
      s1: 18.0,
      box: box(330, 785, 545, 66),
      what: "route badge reads 'Local network · 28 ms' (measured; it read <1 ms before): honest, just a different number",
      fix: "accept",
    },
  ],
};

const APPROVAL: RemoteClip = {
  id: "remote-approval",
  file: "launch/remote/remote-approval.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 46.65,
  frames: 2799,
  bytes: 4183132,
  screen: REMOTE_SCREEN,
  summary:
    "The whole approval, live: the Pebble tab idle, Pebble starts working on the Mac (3.7 s), the phone opens the conversation from Working Now (15.2 s), Pebble's diagnosis ('book() in studio_bookings/slots.py checks booked > places, so a full slot of 12 still takes a 13th…') and the edit card 'Project edit · Change slots.py · studio_bookings/slots.py · Don't Allow · Apply Edit' (16.65 s); Apply Edit is pressed (27.05 s), the system Face ID prompt shows over the card (29.15 to 33.0 s) and is answered; the edit is done ('Undo This Edit'), Pebble streams 'The change is in. Now the tests, in an isolated copy.' and a second card arrives live: 'Test recipe plan · Run isolated tests · pytest · Run Tests' (36.8 s); Run Tests is pressed (41.1 s; inside the 30 s that one Face ID covers, so no second prompt, as on an iPhone); the reply streams: 'Fixed. A full slot now turns the next booking away, and all 18 tests pass, including test_full_slot_refuses_another_booking, which failed before.' (43.4 to 45.5 s).",
  events: [
    { name: "pebbleTabIdle", s: 0, note: "Pebble tab, 'Not working on anything right now'" },
    { name: "workStarts", s: 3.7, note: "hero 'Reasoning it through' / 'Reading closely'; Working Now row appears" },
    { name: "searching", s: 8.5, note: "'Searching project source' (±0.5)" },
    { name: "tapWorkingRow", s: 14.9, note: "the push into the conversation starts (±0.3; stepped)" },
    { name: "conversationLoading", s: 15.2, note: "'Loading conversation' under the title 'Wheel taster bookings · studio-bookings'" },
    { name: "editCardShown", s: 16.65, note: "diagnosis text + edit card with Apply Edit; the card arrived during the push" },
    { name: "applyEditPressed", s: 27.05, note: "button greys, the card's spinner shows" },
    { name: "faceIdShown", s: 29.15, note: "system Face ID prompt over the card (a plain dark square, 'Face ID'; the Simulator draws no glyph animation)" },
    { name: "approved", s: 32.8, note: "the prompt fades (gone 33.0) and the transcript re-lays out: the person's request, the steps, the edit 'Done'" },
    { name: "faceIdGone", s: 33.0 },
    { name: "testsCardShown", s: 36.8, note: "'Run isolated tests · pytest · Run Tests' arrives under 'The change is in. Now the tests…'" },
    { name: "runTestsPressed", s: 41.1 },
    { name: "fixedReplyStarts", s: 43.4, note: "'Fixed. A full slot now turns…' streams in" },
    { name: "fixedReplyDone", s: 45.5, note: "complete; the clip ends at 46.65 (hold by drifting, not by freezing)" },
  ],
  rois: [
    { name: "hero", ...PEBBLE_HERO, note: "Pebble tab: what Pebble is doing", valid: [0, 14.8] },
    { name: "workingRow", ...WORKING_ROW, note: "Working Now › Wheel taster bookings", valid: [3.7, 14.8] },
    { name: "diagnosis", ...box(48, 534, 1110, 252), note: "Pebble's diagnosis above the card", valid: [16.65, 32.8] },
    { name: "editCard", ...box(48, 840, 1110, 588), note: "Project edit · Change slots.py · studio_bookings/slots.py · Don't Allow · Apply Edit", valid: [16.65, 32.8] },
    { name: "applyEdit", ...box(661, 1232, 449, 151), note: "the approve button, with the Face ID glyph", valid: [16.65, 27.05] },
    { name: "faceIdPrompt", ...FACE_ID_PROMPT, note: "the system prompt over the card", valid: [29.15, 32.9] },
    { name: "changeIsIn", ...box(48, 366, 1110, 129), note: "'The change is in. Now the tests, in an isolated copy.'", valid: [36.8, 41.1] },
    { name: "testsCard", ...box(48, 1110, 1110, 588), note: "Test recipe plan · Run isolated tests · pytest · Run Tests", valid: [36.8, 41.1] },
    { name: "runTests", ...box(669, 1503, 441, 150), note: "the second approve button", valid: [36.8, 41.1] },
    { name: "fixedReply", ...box(48, 1158, 1110, 264), note: "'Fixed. … all 18 tests pass …'", valid: [45.5, 46.65] },
    {
      name: "isolateCard",
      ...box(0, 480, 1206, 1000),
      note: "isolate: diagnosis + edit card, the Face ID prompt sits inside it; keeps the Locked row (y 1794) out",
      valid: [16.65, 32.8],
    },
  ],
  hazards: [
    {
      kind: "state",
      s0: 15.2,
      s1: 32.8,
      box: box(48, 1794, 1110, 240),
      what: "'Locked. You can read along; Face ID unlocks acting. [Unlock]' under the card: the app's real C1 lock before the first proof; a second Face ID button on screen",
      fix: "crop",
    },
    {
      kind: "rival",
      s0: 15.2,
      s1: 46.65,
      box: MODEL_CHIPS,
      what: "model chip 'Claude Opus 5.5 · High': the model Pebble runs, as in the real Mac takes (claude-opus-5-5, High)",
      fix: "accept",
    },
    {
      kind: "glitch",
      s0: 32.8,
      s1: 33.1,
      box: REMOTE_SCREEN,
      what: "after the approval the transcript jumps (re-layout) while the prompt fades: real, but don't cut into its middle",
      fix: "avoid",
    },
    {
      kind: "glitch",
      s0: 14.8,
      s1: 16.65,
      box: REMOTE_SCREEN,
      what: "the push into the conversation is stepped and shows 'Loading conversation' for 1.4 s",
      fix: "avoid",
    },
  ],
};

const PAIRING: RemoteClip = {
  id: "remote-pairing",
  file: "launch/remote/remote-pairing.mp4",
  width: 1206,
  height: 2622,
  fps: 60,
  durationS: 31.2,
  frames: 1872,
  bytes: 1550001,
  screen: REMOTE_SCREEN,
  summary:
    "Pairing, first run: 'Pair with Your Mac' (the pebble, Paste, Enter the Link, Try the Demo); Paste (the stand-in Mac's link was on the phone's pasteboard) → 'Pairing with your Mac' → the system Face ID prompt (pairing signs with the approve key: 'Pair this iPhone with Studio Mac') → 'Confirm on Your Mac' with the six digits '704 814', the pebble, 'Waiting for you to confirm on your Mac · Your Mac waits for 2 minutes.' → confirmed on the Mac (the stand-in confirms after 4 s) → the Pebble tab: 'Not working on anything right now', Local network · 3 ms, Studio Mac.",
  events: [
    { name: "pairScreen", s: 0, note: "idle 'Pair with Your Mac'" },
    { name: "pasteTapped", s: 2.2, note: "Paste highlights; the spinner follows" },
    { name: "faceIdShown", s: 6.4 },
    { name: "faceIdGone", s: 9.75 },
    { name: "sixDigitsShown", s: 17.05, note: "the 7.3 s spinner before it is load lag (the Mac answered at once): cut it" },
    { name: "sixDigitsGone", s: 23.7, note: "the pairing screen shows for 0.6 s as the panel closes (real), then the tabs" },
    { name: "pebbleTabShown", s: 24.35 },
  ],
  rois: [
    { name: "paste", ...box(472, 1248, 262, 103), note: "the Paste button", valid: [0, 2.2] },
    { name: "faceIdPrompt", ...box(370, 1075, 466, 466), note: "the system prompt over the pairing screen", valid: [6.4, 9.7] },
    { name: "codeTitle", ...box(48, 600, 1110, 120), note: "'Confirm on Your Mac'", valid: [17.05, 23.7] },
    { name: "sixDigits", ...box(48, 921, 1110, 294), note: "'704 814'", valid: [17.05, 23.7] },
    { name: "hero", ...PEBBLE_HERO, note: "Pebble tab after pairing", valid: [24.35, 31.2] },
  ],
  hazards: [
    {
      kind: "state",
      s0: 9.75,
      s1: 17.05,
      box: REMOTE_SCREEN,
      what: "'Pairing with your Mac' spinner for 7.3 s between Face ID and the digits: the Simulator was slow under load",
      fix: "avoid",
    },
    {
      kind: "state",
      s0: 23.7,
      s1: 24.35,
      box: REMOTE_SCREEN,
      what: "the pairing screen flashes back for 0.6 s before the tabs: real app behaviour",
      fix: "avoid",
    },
  ],
};

export const REMOTE_CLIPS: Readonly<Record<RemoteClipId, RemoteClip>> = {
  "remote-pebble-tab": PEBBLE_TAB,
  "remote-approval": APPROVAL,
  "remote-pairing": PAIRING,
};

/** Still screens at device resolution, lossless (XCUITest screenshots), except where `shows` says otherwise. */
export const REMOTE_STILLS: Readonly<Record<string, RemoteStill>> = {
  pairScreen: { file: "launch/remote/stills/remote-pair-screen.png", bytes: 201432, shows: "'Pair with Your Mac', Paste, Enter the Link, Try the Demo" },
  pairFaceId: { file: "launch/remote/stills/remote-pair-face-id.png", bytes: 316108, shows: "the Face ID prompt over 'Pairing with your Mac'" },
  pairSixDigits: { file: "launch/remote/stills/remote-pair-six-digits.png", bytes: 154774, shows: "'Confirm on Your Mac', 704 814" },
  pebbleTab: { file: "launch/remote/stills/remote-pebble-tab.png", bytes: 299632, shows: "Pebble tab idle: Local network · 3 ms, Studio Mac, Keep Awake" },
  pebbleTabWorking: { file: "launch/remote/stills/remote-pebble-tab-working.png", bytes: 313459, shows: "Pebble tab: 'Reading studio_bookings/slots.py', Working Now · Wheel taster bookings" },
  pebbleTabNeedsReview: {
    file: "launch/remote/stills/remote-pebble-tab-needs-review.png",
    bytes: 369445,
    shows: "Pebble tab: 'Needs your review', '1 item needs your review · Change slots.py', Reviews badge 1 (a frame of the raw take, not lossless)",
  },
  editToApprove: { file: "launch/remote/stills/remote-edit-to-approve.png", bytes: 754526, shows: "the conversation with the edit card and Apply Edit" },
  approveFaceId: { file: "launch/remote/stills/remote-approve-face-id.png", bytes: 906097, shows: "the Face ID prompt over the edit card" },
  testsToApprove: { file: "launch/remote/stills/remote-tests-to-approve.png", bytes: 752069, shows: "'Run isolated tests · pytest · Run Tests'" },
  fixedAndVerified: { file: "launch/remote/stills/remote-fixed-and-verified.png", bytes: 685999, shows: "'Fixed. … all 18 tests pass …'" },
};

/**
 * A suggested 8.5 s Remote beat (the director's to change): an approval arriving, the card, approve with Face ID.
 * Each segment shows source [s0, s1) of `clip` at `speed`; `roi` names the framing to hold (or push to) by its end.
 */
export const REMOTE_BEAT: readonly { clip: RemoteClipId; s0: number; s1: number; speed: number; roi: string; note: string }[] = [
  { clip: "remote-pebble-tab", s0: 8.4, s1: 11.2, speed: 1, roi: "isolateTop", note: "Pebble works on the Mac; the approval arrives (9.9 s, badge)" },
  { clip: "remote-approval", s0: 16.65, s1: 18.9, speed: 1, roi: "isolateCard", note: "the card: Change slots.py · Apply Edit" },
  { clip: "remote-approval", s0: 26.7, s1: 30.6, speed: 1.15, roi: "faceIdPrompt", note: "Apply Edit 27.05, the Face ID prompt 29.15" },
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

export function remoteRoiOf(id: RemoteClipId, name: string): RemoteRoi {
  const roi = REMOTE_CLIPS[id].rois.find((r) => r.name === name);
  if (!roi) throw new Error(`remote.ts: no ROI ${name} in ${id}`);
  return roi;
}
