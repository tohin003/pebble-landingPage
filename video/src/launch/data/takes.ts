// The launch film's real takes: where each file is, what happens when, where to look, what must never show, and the
// beats the edit plan (docs/launch/EDIT_PLAN.md) cuts from them. Plain data and a few pure helpers; no React.
//
// Units and conventions (read these before using a number):
// - Time is in SOURCE seconds from the file's first frame. Frame k (0-based) is shown at k / 60 s; every take is
//   60 fps CFR. (The old reel's takes.ts used 1-based file frames: its frame n is our (n - 1) / 60 s.)
// - Boxes are in the take's own pixels (device px, top-left origin): 2940×1912 for the Retina takes, 2048×1332 for the
//   "Larger Text" ones (RS4-07 onwards).
// - Every event was read off the picture (frame strips in .work/launch/assets/strips/), not only the agent's log;
//   where the log disagrees, `note` says so. The map for humans: .work/launch/assets/TAKES.md.
// - ROIs are 16:9 (w/h ≈ 1.778) unless the name starts with "isolate-": an isolate ROI is a tight crop meant to be
//   lifted out and floated big on the stage (the treatment's "isolate the action"). `valid` is the window in which
//   the ROI is clean of hazards, apart from those its `masks` name (blur them); its note says when its content shows.
// - A beat's ramps play in order; each segment shows source [s0, s1) at `speed` (1 = real time). A gap between one
//   segment's s1 and the next one's s0 is a jump cut. Speeds ≥ 1 compress waits; 0.75 is the slowest used. In
//   Remotion each segment is one <Sequence> with <OffthreadVideo startFrom={Math.round(s0 * fps)}
//   playbackRate={speed}>, where fps is the composition's own (startFrom counts composition frames, so a 30 fps draft
//   uses s0 × 30).
// - zoomPath keys name the ROI the camera frames by source second `s`. A move is a push of 0.6 s (output) with
//   cubic-bezier(0.16, 1, 0.3, 1), or a pull of 0.7 s, landing before the action (TREATMENT rulings v1.1); a key
//   with `cut: true` is a hard cut to that framing at `s` instead (used where a move would cross a hazard).
// - Hazards list what must be cropped, blurred or avoided (TREATMENT §5); `hazardsIn()` checks a box at a time.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TakeEvent {
  name: string;
  /** source seconds */
  s: number;
  note?: string;
}

export interface TakeRoi extends Box {
  name: string;
  note: string;
  /** source seconds in which this framing is clean of hazards, except the ones `masks` names */
  valid?: readonly [number, number];
  /** hazards (matched against their `what`) that fall inside this box during `valid`: blur them */
  masks?: readonly string[];
}

export type HazardKind =
  | "usage" // token, cost or speed lines
  | "recording-pill" // macOS's purple screen-recording indicator in the menu bar
  | "clock" // the menu bar's real date and time
  | "date" // the real date elsewhere (Dock Calendar icon, widgets)
  | "badge" // a notification badge
  | "identity" // anything personal: real names, accounts, personal calendar events
  | "path" // a local file path or a URL
  | "rival" // Claude Code, Anthropic, the rival ask (the owner removed the rival beat, 1 Nov 12:03)
  | "person" // a real person's face
  | "third-party" // other brands' ads and prices, holiday calendars, widgets
  | "production" // the take machinery: the pebble-takes folder, Dock tooltips, minimised windows
  | "pointer" // a stray real pointer (never retouched)
  | "glitch" // a real rendering glitch to skip
  | "inconsistency" // contradicts the story or another take (dates, numbers)
  | "frame-edge" // black bars at the captured screen's edge
  | "state"; // honest but weak picture (the first-run, unconfigured workspace)

export type HazardFix = "crop" | "blur" | "avoid" | "accept";

export interface Hazard {
  kind: HazardKind;
  s0: number;
  s1: number;
  box: Box;
  what: string;
  fix: HazardFix;
}

export interface Ramp {
  s0: number;
  s1: number;
  speed: number;
  note?: string;
}

export interface ZoomKey {
  /** source second by which the camera frames `roi` */
  s: number;
  roi: string;
  /** a hard cut to this framing at `s` (no camera move) */
  cut?: boolean;
  note?: string;
}

export interface Beat {
  beat: string;
  /** the EDIT_PLAN scene and slot */
  scene: string;
  inS: number;
  outS: number;
  zoomPath: readonly ZoomKey[];
  ramps: readonly Ramp[];
  note: string;
}

export type TakeId = "RS1-03" | "RS15-01" | "RS4-07" | "RS5C-04" | "RS5F-03" | "RS9A-01" | "RS9B-02" | "RS13-03" | "RSW-01" | "RS11-02";

export interface Take {
  id: TakeId;
  /** under video/public, for staticFile() */
  file: string;
  width: number;
  height: number;
  fps: 60;
  durationS: number;
  frames: number;
  summary: string;
  events: readonly TakeEvent[];
  rois: readonly TakeRoi[];
  hazards: readonly Hazard[];
  beats: readonly Beat[];
}

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

const LT = { w: 2048, h: 1332 } as const; // "Larger Text" takes
const RT = { w: 2940, h: 1912 } as const; // Retina takes
/** RS4-07 … RS9B-02 (2048×1332): the menu bar's clock and recording pill, the Dock's "Sat 31" Calendar icon */
const LT_MENU = { clock: box(1750, 0, 298, 54), pill: box(1282, 2, 86, 52), dockDate: box(755, 1190, 105, 110) };
/** RS13-03, RSW-01, RS11-02 (2940×1912): measured pill 2179–2259, clock text from 2652 */
const RT_MENU = { clock: box(2650, 0, 290, 60), pill: box(2177, 8, 84, 52) };

// ---------------------------------------------------------------------------------------------------------------------

const RS1_03: Take = {
  id: "RS1-03",
  file: "launch/takes/RS1-03.mp4",
  width: RT.w,
  height: RT.h,
  fps: 60,
  durationS: 11.616667,
  frames: 697,
  summary:
    "Spaces swipe (⌃→) from the full-screen sample poster ('Open day, Saturday 7 November') to Chrome's sample booking page. The sleeping pebble (z marks) sits lower right on both Spaces at the same screen spot (≈ 2752, 1613). No menu bar or Dock: both Spaces are full screen.",
  events: [
    { name: "pebbleBlink1", s: 1.267, note: "f76: it blinks while asleep" },
    { name: "pebbleHides", s: 3.95, note: "f237: gone one frame before the swipe" },
    { name: "swipeKey", s: 3.967, note: "f238, agent log 3.9715" },
    { name: "slideVisible", s: 4.0, note: "f240; a black gap between the Spaces passes f240–242" },
    { name: "pebbleEnters", s: 4.233, note: "f254: rides in from the right edge with Chrome's Space" },
    { name: "slideSettled", s: 4.3, note: "f258" },
    { name: "pebbleSettled", s: 4.433, note: "f266, back at ≈ (2752, 1613)" },
    { name: "pointerBecomesArrow", s: 4.533, note: "f272: the stray crosshair at (2582, 1493) becomes an arrow" },
    { name: "pebbleBlink2", s: 5.6, note: "f336, on Chrome's Space" },
  ],
  rois: [
    { name: "screen", ...box(0, 0, 2940, 1912), note: "the whole screen (aspect 1.54) for the FloatingWindow establish", valid: [0, 11.617], masks: ["kicker", "address bar", "poster black bars"] },
    { name: "spaceRight", ...box(1650, 1100, 1236, 695), note: "the vase's lower half, its shadow and the pebble on the poster; after the swipe the page's vase foot, the programme's dividers, 'No ticket needed' and the pebble. Clear of the poster's programme text (x < 1640), the dated kicker and the black bar", valid: [0, 11.617] },
    { name: "pebbleClose", ...box(2040, 1300, 846, 476), note: "the pebble with room on its left (it sits 135 px from the picture's right edge)", valid: [0, 11.617] },
    { name: "pebble", ...box(2672, 1533, 160, 160), note: "the pebble itself, centre ≈ (2752, 1613), on both Spaces", valid: [0, 11.617] },
  ],
  hazards: [
    { kind: "inconsistency", s0: 3.98, s1: 11.617, box: box(190, 535, 420, 50), what: "kicker: the booking page says SATURDAY 14 NOVEMBER (the poster says Saturday 7 November)", fix: "crop" },
    { kind: "path", s0: 3.98, s1: 11.617, box: box(230, 165, 900, 55), what: "address bar: file path /Users/studio/Projects/studio-bookings/site/index.html (demo account; allowed by the takes director, reads as a dev setup)", fix: "crop" },
    { kind: "pointer", s0: 0, s1: 11.617, box: box(2560, 1470, 50, 60), what: "stray pointer: a crosshair at (2582, 1493), an arrow from 4.533 s, 200 px up-left of the pebble in every frame", fix: "accept" },
    { kind: "frame-edge", s0: 0, s1: 3.98, box: box(0, 0, 49, 1912), what: "poster black bars: left x < 49", fix: "crop" },
    { kind: "frame-edge", s0: 0, s1: 3.98, box: box(2887, 0, 53, 1912), what: "poster black bars: right x > 2887", fix: "crop" },
  ],
  beats: [
    {
      beat: "S02-spaces",
      scene: "S02 Lives on your Mac, 0.0–4.0 s: 'It lives on your Mac.' / 'On every Space.'",
      inS: 1.8,
      outS: 5.75,
      ramps: [{ s0: 1.8, s1: 5.75, speed: 1, note: "real time; the slide lasts 0.33 s, so 0.75× over 3.95–4.45 is the one slow-down to try if it reads too fast" }],
      zoomPath: [
        { s: 1.8, roi: "screen", note: "the whole screen in the FloatingWindow, tilted then flattening (mask the right black bar)" },
        { s: 3.7, roi: "spaceRight", note: "push before the swipe; the camera holds still while the Spaces move" },
        { s: 5.05, roi: "pebbleClose", note: "push once the pebble has settled (4.433); hold through its blink at 5.60" },
      ],
      note: "Out 3.95 s. The pebble does not stay put during the slide: it hides at 3.95 and rides in with the new Space at 4.23–4.43. Locked on its spot, the camera makes it read as 'there on every Space', which is true; never claim it floats over the slide.",
    },
  ],
};

const RS15_01: Take = {
  id: "RS15-01",
  file: "launch/takes/RS15-01.mp4",
  width: RT.w,
  height: RT.h,
  fps: 60,
  durationS: 47.133333,
  frames: 2828,
  summary:
    "The sleeping pebble over the full-screen sample poster; the pointer comes, the pebble watches it, a click opens the quick chat, 'What can you do now?' is typed and sent; Thinking, Writing, Drafting a reply; the reply lands whole at 15.45 s (scrolled to its end) with a usage line. No menu bar or Dock.",
  events: [
    { name: "pebbleAsleep", s: 0, note: "z marks; still until 2.33" },
    { name: "pointerAppears", s: 2.367, note: "f142, a crosshair above the pebble; an arrow from f148" },
    { name: "pointerOnPebble", s: 2.567, note: "f154" },
    { name: "pebbleWatchesPointer", s: 2.667, note: "f160–178: its eyes follow the pointer down" },
    { name: "click", s: 2.867, note: "f172, agent log openChat 2.8612" },
    { name: "glitchFrames", s: 2.983, note: "f179–183: the pebble leaves its spot and is drawn mid-vase while the panel opens; skip them" },
    { name: "panelOpens", s: 3.067, note: "f184: the quick chat pops in whole ('Small companion. Room for big ideas.')" },
    { name: "inputFocused", s: 3.1, note: "f186" },
    { name: "typeW", s: 3.85, note: "f231" },
    { name: "typeCan", s: 4.983, note: "f299" },
    { name: "typeYou", s: 5.85, note: "f351" },
    { name: "typeDo", s: 6.817, note: "f409" },
    { name: "typeNow", s: 7.567, note: "f454" },
    { name: "typeQuestionMark", s: 8.167, note: "f490: 'What can you do now?' complete" },
    { name: "returnKey", s: 8.594, note: "f516, agent log" },
    { name: "sending", s: 8.667, note: "f520: 'Sending', 'Task: queued', input cleared" },
    { name: "thinking", s: 9.0, note: "f540: 'Thinking', 'Waiting for the model'; the pebble looks up" },
    { name: "writing", s: 11.5, note: "f690: 'Writing ~2s'; the pebble squints (working pose)" },
    { name: "draftingReply", s: 14.5, note: "f870" },
    { name: "usageLineAppears", s: 15.383, note: "f923: the usage line shows before the reply's text" },
    { name: "replyLands", s: 15.45, note: "f927: the whole reply, scrolled to its end; its first lines never show" },
    { name: "pebbleHappy", s: 15.5, note: "sparkle pose to 19.7, attentive eyes from 20.17" },
  ],
  rois: [
    { name: "pebbleArea", ...box(1786, 1293, 1100, 619), note: "the sleeping pebble and the vase's foot; the pointer arrives from the top left (2.37)", valid: [0, 47.134] },
    { name: "pebbleInput", ...box(1826, 1250, 1060, 596), note: "the pebble and, from 3.067, the quick chat's input box above it: the click, the panel popping open and the typing in one framing", valid: [0, 15.383] },
    { name: "panelPebble", ...box(1322, 820, 1564, 880), note: "the quick chat (from 3.067) and the pebble under it", valid: [3.067, 15.383] },
    { name: "input", ...box(2100, 1180, 786, 442), note: "the input box (from 3.067), the model chip row and the pebble's head", valid: [0, 15.45] },
    { name: "panelTop", ...box(2100, 820, 786, 442), note: "header status, the question bubble, 'Task: running' (from 8.667)", valid: [3.067, 15.383] },
    { name: "isolate-panel", ...box(2113, 832, 735, 715), note: "the quick chat window alone (corner radius ≈ 44 px)", valid: [3.067, 15.383] },
    { name: "isolate-inputTight", ...box(2113, 1330, 722, 205), note: "input box and send row (from 3.067)", valid: [0, 47.134] },
    { name: "isolate-replyLines", ...box(2110, 950, 740, 240), note: "the reply's last three lines, above the usage line (from 15.45)", valid: [15.45, 47.134] },
    { name: "isolate-modelChip", ...box(2435, 1474, 250, 42), note: "'claude-opus-5-5 · API' (from 3.067)", valid: [0, 47.134] },
    { name: "pebble", ...box(2680, 1550, 150, 150), note: "the pebble, centre ≈ (2755, 1625)", valid: [0, 47.134] },
  ],
  hazards: [
    { kind: "usage", s0: 15.383, s1: 15.45, box: box(2130, 1090, 480, 40), what: "usage line '6,139 in · 485 out · 6.7 s · 119 tok/s' (first position, f923–926)", fix: "crop" },
    { kind: "usage", s0: 15.45, s1: 47.134, box: box(2130, 1195, 480, 45), what: "usage line '6,139 in · 485 out · 6.7 s · 119 tok/s' (under the reply)", fix: "crop" },
    { kind: "glitch", s0: 2.983, s1: 3.06, box: box(1786, 850, 1100, 1062), what: "glitch: f179–183, the pebble leaves its spot and is drawn mid-vase at (2209, 917) as the panel opens", fix: "avoid" },
    { kind: "frame-edge", s0: 0, s1: 47.134, box: box(2887, 0, 53, 1912), what: "poster black bar: right x > 2887", fix: "crop" },
  ],
  beats: [
    {
      beat: "S02-ask",
      scene: "S02 Lives on your Mac, 4.0–7.5 s: 'Click. Ask.'; whip to S03 on the Return",
      inS: 2.3,
      outS: 8.7,
      ramps: [
        { s0: 2.3, s1: 2.975, speed: 1, note: "the pointer arrives, the pebble watches it, the click (2.867); stop on f178" },
        { s0: 3.067, s1: 3.85, speed: 2, note: "jump over the glitch frames f180–183; the panel is open, the input focused" },
        { s0: 3.85, s1: 8.25, speed: 2.4, note: "the typing, ≈ 11 characters a second on screen" },
        { s0: 8.25, s1: 8.7, speed: 1, note: "Return (8.594), 'Sending' (8.667): whip out here" },
      ],
      zoomPath: [
        { s: 2.3, roi: "pebbleInput", note: "tight on the sleeping pebble; the pointer comes in, the click, the panel opens above it and the typing lands in the frame's upper half: no camera move needed, drift only" },
      ],
      note: "Out ≈ 3.37 s. The reply is weak (no streaming, first lines hidden, a usage line under it): end on the send. For a reply shot later: 9.30–15.30 at 12×, then isolate-replyLines from 15.45, never below y 1195.",
    },
  ],
};

const RS4_07: Take = {
  id: "RS4-07",
  file: "launch/takes/RS4-07.mp4",
  width: LT.w,
  height: LT.h,
  fps: 60,
  durationS: 150,
  frames: 9000,
  summary:
    "Pebble's workspace (Larger Text) answering 'What's 48 × 12.5? Press the keys in Calculator.': the 'Open Calculator' card (Open app), the window card 'Use Calculator' (Allow), Calculator brought forward from the Dock, the companion beside it ('On it'), eight real key presses at ≈ 2 a second, then '600'. Static after 66 s.",
  events: [
    { name: "openAppPressed", s: 4.4, note: "f264 picture; agent log openApp 4.361" },
    { name: "usageLineGone", s: 9.633, note: "f578: 'macOS accepted the request to open Calculator…' posts and the earlier usage line goes" },
    { name: "windowCardScrolls", s: 21.317, note: "f1279–1343: the Activity panel scrolls to the card's Allow (agent log card1 21.33)" },
    { name: "allowHover", s: 39.167, note: "f2350" },
    { name: "allowPressed", s: 39.633, note: "f2378 picture: the card collapses to the steps; agent log 39.5555" },
    { name: "pointerToDock", s: 42.933, note: "f2576: the take agent's pointer brings Calculator forward from the Dock (log 43.3377)" },
    { name: "companionAppears", s: 43.433, note: "f2606, where Calculator lands, with an 'On it ~Ns' pill" },
    { name: "calculatorForward", s: 43.55, note: "f2613, display 0" },
    { name: "key4", s: 52.733, note: "f3164: display 0 → 4" },
    { name: "key8", s: 53.283, note: "f3197: 48" },
    { name: "keyTimes", s: 53.783, note: "f3227: 48×" },
    { name: "key1", s: 54.317, note: "f3259: 48×1" },
    { name: "key2", s: 54.85, note: "f3291: 48×12" },
    { name: "keyPoint", s: 55.367, note: "f3322: 48×12." },
    { name: "key5", s: 55.867, note: "f3352: 48×12.5" },
    { name: "equals600", s: 56.433, note: "f3386: '48×12.5' over '600' (the agent log's 238.1 s is wrong)" },
    { name: "conversationUpdates", s: 59.783, note: "f3587" },
    { name: "stepsDone", s: 64.35, note: "f3861; static after ≈ 66 s" },
  ],
  rois: [
    { name: "workspace", ...box(52, 56, 1944, 1094), note: "the Pebble window without menu bar and Dock", valid: [0, 150], masks: ["usage line"] },
    { name: "openAppCard", ...box(1350, 470, 690, 388), note: "'Open Calculator · Needs your review', Don't allow, Open app (0–4.4)", valid: [0, 150] },
    { name: "useCalculatorCard", ...box(1350, 480, 690, 388), note: "'Use Calculator': 'Lets Pebble see and use this one window…', 'Pebble says: To press the keys 4 8 × 1 2 . 5 = …' (4.5–21.3)", valid: [0, 150] },
    { name: "allowCard", ...box(1350, 640, 690, 388), note: "the card's end: 'Only this window. Pebble stops at sign-ins, codes and checks…', Don't allow, Allow (22.4–39.633)", valid: [0, 150] },
    { name: "isolate-allowButton", ...box(1833, 937, 152, 63), note: "Allow (22.4–39.633)", valid: [0, 150] },
    { name: "calculatorWide", ...box(372, 280, 1476, 830), note: "Calculator (from 43.55), the companion beside it with its 'On it' pill, the conversation behind", valid: [9.633, 150] },
    { name: "calculatorTop", ...box(500, 330, 1160, 653), note: "the whole display ('48×12.5' over '600'), four key rows, the companion and its 'On it' pill (from 43.55)", valid: [9.633, 150] },
    { name: "display", ...box(406, 330, 788, 443), note: "the display ('48×12.5' over '600', right-aligned at x ≈ 1008, y ≈ 395–520) and the top two key rows (from 43.55)", valid: [9.633, 150] },
    { name: "isolate-calculator", ...box(572, 290, 457, 810), note: "the Calculator window alone, corner radius ≈ 52 px (from 43.55); keys: 4 (638, 818), 8 (746, 710), × (962, 710), 1 (638, 926), 2 (746, 926), . (855, 1033), 5 (746, 818), = (962, 1033)", valid: [9.633, 150] },
    { name: "companion", ...box(1470, 650, 150, 150), note: "the companion pebble, centre ≈ (1544, 723), from 43.433; its 'On it' pill at (1321, 586, 328, 32)", valid: [9.633, 150] },
  ],
  hazards: [
    { kind: "usage", s0: 0, s1: 9.633, box: box(760, 585, 580, 50), what: "usage line '22,379 in · 14,583 cached · 471 out · 7.9 s'", fix: "crop" },
    { kind: "recording-pill", s0: 9.5, s1: 150, box: LT_MENU.pill, what: "recording pill (seen 10–90, 101–120, 131–149 s)", fix: "crop" },
    { kind: "clock", s0: 0, s1: 150, box: LT_MENU.clock, what: "clock 'Sat 31 Oct 8:42–8:44 PM'", fix: "crop" },
    { kind: "date", s0: 0, s1: 150, box: LT_MENU.dockDate, what: "Dock Calendar icon 'Sat 31'", fix: "crop" },
    { kind: "production", s0: 0, s1: 150, box: box(1688, 1200, 120, 95), what: "Dock: a minimised window's thumbnail (unreadable)", fix: "crop" },
    { kind: "production", s0: 43.2, s1: 150, box: box(339, 1095, 178, 50), what: "Dock tooltip 'Calculator' (the pointer rests on the Dock)", fix: "accept" },
  ],
  beats: [
    {
      beat: "S03-apps",
      scene: "S03 Uses your Mac, 1.5–5.5 s: 'Your apps.' (a key tap on each press, a punch-in and shimmer on 600)",
      inS: 38.95,
      outS: 56.8,
      ramps: [
        { s0: 38.95, s1: 39.72, speed: 1, note: "the pointer on Allow, pressed at 39.633" },
        { s0: 43.55, s1: 52.68, speed: 20, note: "jump cut to Calculator's first frame forward (43.55); the wait: display 0, the companion's 'On it ~Ns' counting" },
        { s0: 52.68, s1: 56.45, speed: 2.2, note: "the eight presses, ≈ 4.7 a second on screen" },
        { s0: 56.45, s1: 56.8, speed: 1, note: "'600' (56.433)" },
      ],
      zoomPath: [
        { s: 38.95, roi: "allowCard" },
        { s: 43.55, roi: "calculatorTop", cut: true, note: "cut on Calculator's arrival; hold (drift) through the wait and the presses" },
      ],
      note: "Out ≈ 3.29 s. The jump skips the take agent's own click on the Dock that raised Calculator (42.93): Pebble opened it in the background. Punch 3–6 % toward 'display' on 600 (56.433) as a hit, not a key. Key taps: one SFX on each display change (52.733, 53.283, 53.783, 54.317, 54.85, 55.367, 55.867, 56.433 source). The keys never light up (Pebble presses through Accessibility): never draw key flashes.",
    },
    {
      beat: "S03-apps-short",
      scene: "S03 alternative: the presses only (no Allow)",
      inS: 52.0,
      outS: 57.2,
      ramps: [
        { s0: 52.0, s1: 52.68, speed: 1 },
        { s0: 52.68, s1: 56.45, speed: 1.5 },
        { s0: 56.45, s1: 57.2, speed: 1 },
      ],
      zoomPath: [
        { s: 52.0, roi: "calculatorWide" },
        { s: 52.6, roi: "display", note: "push to the display (2.6×), landing 0.1 s before the first press: the display is the evidence" },
      ],
      note: "Out ≈ 3.94 s. The companion's 'On it' pill counts in the wide.",
    },
    {
      beat: "S03-limit-window",
      scene: "S03 11.0–12.0 alternative: 'Only the windows and sites you allow.' over the real window card",
      inS: 38.95,
      outS: 39.72,
      ramps: [{ s0: 38.95, s1: 39.72, speed: 1 }],
      zoomPath: [{ s: 38.95, roi: "allowCard", note: "'Only this window. Pebble stops at sign-ins, codes and checks…' and Allow pressed" }],
      note: "0.77 s; pairs with RS9B-02's S03-limit-site.",
    },
  ],
};

const RS5C_04: Take = {
  id: "RS5C-04",
  file: "launch/takes/RS5C-04.mp4",
  width: LT.w,
  height: LT.h,
  fps: 60,
  durationS: 109.85,
  frames: 6591,
  summary:
    "'Add \"Glaze order\" to my calendar on Monday at 9:00.' typed and sent in the workspace; the app-action card (Title Glaze order, Starts 2026-11-02T09:00, Ends 2026-11-02T10:00, Do it); 'Calendar reported adding…'; much later Calendar comes forward on October 2026 with 'Glaze order 09:00' on Monday 2 November. The month view also carries two personal iCloud events: never show them.",
  events: [
    { name: "browserPanelCloses", s: 3.017, note: "f181" },
    { name: "typingStart", s: 3.617, note: "f217" },
    { name: "send", s: 14.667, note: "f880" },
    { name: "cardLands", s: 19.567, note: "f1174 picture (the agent log's card1 30.49 is its detection time); buttons dimmed" },
    { name: "buttonsActive", s: 22.333, note: "f1340: Do it live; the reply with a usage line posts in the conversation" },
    { name: "panelScrolls", s: 32.667, note: "f1960–1981: Do it moves to the top, the steps below" },
    { name: "doItPressed", s: 48.55, note: "f2913–2914 picture; agent log d1 48.4458" },
    { name: "calendarReported", s: 52.25, note: "f3135: the conversation re-lays out: 'Calendar reported adding \"Glaze order\" from 2026-11…', 'Thinking', toast 'Action completed'" },
    { name: "replyLands", s: 54.517, note: "f3271: 'I added \"Glaze order\" to your Studio calendar on Monday, 2 November…', a usage line, 'Done · 10 s · 14K in · 439 out'" },
    { name: "pointerToDock", s: 98.733, note: "f5924 (agent log appForward 99.0071)" },
    { name: "companionAppears", s: 99.1, note: "f5946" },
    { name: "calendarWindow", s: 101.183, note: "f6071: October 2026, 'Glaze order 09:00' in Monday 2's cell" },
  ],
  rois: [
    { name: "calCardTop", ...box(1350, 440, 690, 388), note: "'Add the event \"Glaze order\" from 2026-11-02T09:00 to 2026-11-02T10:00 (no invitations).', Title, Starts (19.567–32.6)", valid: [0, 101.183] },
    { name: "isolate-calCard", ...box(1364, 455, 653, 480), note: "the card's sentence and its Title / Starts / Ends fields (19.567–32.6)", valid: [0, 101.183] },
    { name: "doIt", ...box(1350, 300, 690, 388), note: "'Pebble asks Calendar through its own scripting…', Don't allow, Do it, the step 'Add \"Glaze order\"…' (32.7–48.55)", valid: [0, 101.183] },
    { name: "isolate-doItButton", ...box(1843, 450, 142, 61), note: "Do it (32.7–48.55)", valid: [0, 101.183] },
    { name: "calendarReported", ...box(430, 265, 920, 518), note: "'Calendar reported adding \"Glaze order\" from 2026-11…', 'Thinking', the steps and the 'Action completed' toast (866–1182 × 696–777)", valid: [52.25, 54.517] },
    { name: "calendarMonth", ...box(395, 190, 1653, 930), note: "the Calendar window from 'October 2026' down to the Monday 2 row with 'Glaze order 09:00' (from 101.183)", valid: [101.183, 109.85], masks: ["personal calendar events"] },
    { name: "calendarLowerLeft", ...box(390, 760, 693, 390), note: "the last weeks' left cells; 'Glaze order 09:00' in Monday 2's cell, 402–690 × 1016–1150 (from 101.183)", valid: [0, 109.85] },
    { name: "isolate-glazeCell", ...box(392, 1012, 312, 148), note: "Monday 2's cell: 'Glaze order 09:00' (from 101.183)", valid: [0, 109.85] },
  ],
  hazards: [
    { kind: "usage", s0: 22.333, s1: 52.25, box: box(760, 585, 590, 50), what: "usage line in the conversation '14,208 in · 6,849 cached · 439 out · 7.6 s'", fix: "crop" },
    { kind: "usage", s0: 54.517, s1: 101.183, box: box(760, 635, 590, 50), what: "usage line in the conversation '22,201 in · 14,202 cached · 503 out · 2.3 s'", fix: "crop" },
    { kind: "usage", s0: 54.517, s1: 101.183, box: box(1364, 995, 653, 116), what: "usage in the Activity panel's 'Done · 10 s · 14K in · 439 out'", fix: "crop" },
    { kind: "identity", s0: 101.183, s1: 109.85, box: box(1570, 795, 478, 48), what: "personal calendar events: 'Agrosso inter… 09:00' (22 Oct) and 'Paad bday' (23 Oct) from the person's iCloud", fix: "blur" },
    { kind: "third-party", s0: 101.183, s1: 109.85, box: box(1285, 1088, 285, 32), what: "holiday calendar: 'Guy Fawkes Night' (5 Nov); 'Halloween' under the pebble at (1880, 935)", fix: "accept" },
    { kind: "production", s0: 99.1, s1: 109.85, box: box(725, 1095, 162, 50), what: "Dock tooltip 'Calendar' just right of the Glaze order cell", fix: "accept" },
    { kind: "rival", s0: 0, s1: 109.85, box: box(40, 835, 240, 110), what: "sidebar recents 'Show me a clip of …' ×2 (the rival ask's conversations)", fix: "crop" },
    { kind: "recording-pill", s0: 10, s1: 109.85, box: LT_MENU.pill, what: "recording pill (seen 11–80, 91–109 s)", fix: "crop" },
    { kind: "clock", s0: 0, s1: 109.85, box: LT_MENU.clock, what: "clock 'Sat 31 Oct 11:17–11:19 PM'", fix: "crop" },
    { kind: "date", s0: 0, s1: 109.85, box: LT_MENU.dockDate, what: "Dock Calendar icon 'Sat 31'", fix: "crop" },
    { kind: "third-party", s0: 0, s1: 109.85, box: box(60, 1150, 1940, 182), what: "a Music mini-player bar behind the Dock (sample track)", fix: "crop" },
  ],
  beats: [
    {
      beat: "S03-calendar",
      scene: "S03 Uses your Mac, 5.5–8.5 s: 'Your calendar.'",
      inS: 47.8,
      outS: 103.1,
      ramps: [
        { s0: 47.8, s1: 48.62, speed: 1, note: "Do it pressed at 48.55" },
        { s0: 52.25, s1: 52.95, speed: 1, note: "cut: 'Calendar reported adding \"Glaze order\"…' and 'Action completed'" },
        { s0: 101.19, s1: 103.1, speed: 1, note: "cut: Calendar has arrived (101.183); 1 s on the event" },
      ],
      zoomPath: [
        { s: 47.8, roi: "doIt" },
        { s: 52.25, roi: "calendarReported", cut: true, note: "a cut, not a pan: until 52.25 the conversation shows a usage line" },
        { s: 101.19, roi: "calendarMonth", cut: true, note: "blur the personal events box" },
        { s: 102.1, roi: "calendarLowerLeft", note: "push ≈ 3× onto 'Glaze order 09:00' after 0.3 s on the month; or lift isolate-glazeCell" },
      ],
      note: "Out ≈ 3.43 s. The event shows in Calendar only 47 s after Do it (the take agent brought Calendar forward at 99 s), hence the cuts. The card's own Title / Starts / Ends (calCardTop, 19.6–32.6 s) is an alternative first shot.",
    },
  ],
};

const RS5F_03: Take = {
  id: "RS5F-03",
  file: "launch/takes/RS5F-03.mp4",
  width: LT.w,
  height: LT.h,
  fps: 60,
  durationS: 107.233333,
  frames: 6434,
  summary:
    "'Show the Open day folder in Documents in Finder.': the Finder card ('Open the folder /Users/studio/Documents/Open day in Finder.', Path, Do it); Do it; Finder opens Documents › Open day within a second (flyer.md, glazes, plan.md, poster-screen.png, poster.pdf, price-list.pdf, tickets.csv). Static from 47 s.",
  events: [
    { name: "browserPanelCloses", s: 2.933, note: "f176" },
    { name: "typingStart", s: 3.55, note: "f213" },
    { name: "send", s: 13.483, note: "f809" },
    { name: "cardLands", s: 16.233, note: "f974" },
    { name: "replyWithUsage", s: 18.1, note: "f1086" },
    { name: "panelScrolls", s: 27.583, note: "f1655–1682" },
    { name: "doItPressed", s: 43.967, note: "f2638 picture; agent log d1 43.8839" },
    { name: "finderOpens", s: 44.95, note: "f2697: the 'Open day' window in one frame, the companion 'Thinking' at its corner" },
    { name: "thumbnailsLoaded", s: 45.833, note: "f2750" },
    { name: "doneRow", s: 46.7, note: "≈ f2800: 'Done · 7 s · 15K in · 203 out' below Finder" },
  ],
  rois: [
    { name: "finderCard", ...box(1350, 440, 690, 388), note: "'Open the folder /Users/studio/Documents/Open day in Finder.' and the card's body (16.233–27.5)", valid: [0, 107.234] },
    { name: "doIt", ...box(1350, 300, 690, 388), note: "'Pebble asks Finder through its own scripting…', Don't allow, Do it (27.7–43.967)", valid: [0, 107.234] },
    { name: "finderFiles", ...box(395, 60, 1340, 754), note: "the 'Open day' window's title, toolbar and its seven items, right of the iCloud sidebar (from 44.95)", valid: [44.95, 107.234] },
    { name: "isolate-finder", ...box(404, 112, 1150, 560), note: "the reel's crop: files area and title bar (from 44.95)", valid: [44.95, 107.234] },
  ],
  hazards: [
    { kind: "usage", s0: 18.1, s1: 44.95, box: box(760, 585, 590, 50), what: "usage line '14,733 in · 7,217 cached · 203 out · 4.6 s'", fix: "crop" },
    { kind: "usage", s0: 46.7, s1: 107.234, box: box(1364, 995, 653, 116), what: "'Done · 7 s · 15K in · 203 out' below the Finder window", fix: "crop" },
    { kind: "identity", s0: 44.95, s1: 107.234, box: box(90, 730, 270, 120), what: "Finder sidebar 'iCloud Drive ⚠' and 'studio' (the demo user was signed in to the person's iCloud)", fix: "crop" },
    { kind: "path", s0: 16.233, s1: 43.967, box: box(1395, 445, 625, 490), what: "card: /Users/studio/Documents/Open day (demo account, allowed)", fix: "accept" },
    { kind: "rival", s0: 0, s1: 44.95, box: box(40, 900, 240, 50), what: "sidebar recents 'Show me a clip of …'", fix: "crop" },
    { kind: "recording-pill", s0: 10, s1: 107.234, box: LT_MENU.pill, what: "recording pill (seen 11–70, 81–100 s)", fix: "crop" },
    { kind: "clock", s0: 0, s1: 107.234, box: LT_MENU.clock, what: "clock 'Sat 31 Oct 11:20–11:22 PM'", fix: "crop" },
    { kind: "date", s0: 0, s1: 107.234, box: LT_MENU.dockDate, what: "Dock Calendar icon 'Sat 31'", fix: "crop" },
    { kind: "production", s0: 44.95, s1: 107.234, box: box(507, 87, 290, 32), what: "a second Finder window 'Documents — Local' behind", fix: "accept" },
  ],
  beats: [
    {
      beat: "S03-finder-alt",
      scene: "S03 spare (not in EDIT_PLAN): an app action that lands at once",
      inS: 43.45,
      outS: 46.2,
      ramps: [
        { s0: 43.45, s1: 44.0, speed: 1, note: "Do it pressed at 43.967" },
        { s0: 44.0, s1: 44.9, speed: 3 },
        { s0: 44.9, s1: 46.2, speed: 1, note: "Finder opens at 44.95, thumbnails fill to 45.83" },
      ],
      zoomPath: [
        { s: 43.45, roi: "doIt" },
        { s: 44.95, roi: "finderFiles", cut: true, note: "cut on the window's arrival: cause and effect" },
      ],
      note: "Out ≈ 2.15 s. The cleanest app action in the takes: one second from Do it to the result.",
    },
  ],
};

const RS9A_01: Take = {
  id: "RS9A-01",
  file: "launch/takes/RS9A-01.mp4",
  width: LT.w,
  height: LT.h,
  fps: 60,
  durationS: 59.166667,
  frames: 3550,
  summary:
    "The rival ask: in the companion's quick chat, a new conversation, 'Show me a clip of your rival.' typed and sent; Thinking, Reasoning it through, then 'Pebble needs your answer' (it asks which rival). The workspace behind shows a stale card naming 'Introducing Claude Code' and a usage line throughout. Not recommended: the owner removed the rival beat (1 Nov 12:03).",
  events: [
    { name: "quickChatOpens", s: 2.967, note: "f178 (an old conversation with a usage line)" },
    { name: "newConversation", s: 14.933, note: "f896: 'Small companion. Room for big ideas.'" },
    { name: "typingStart", s: 22.517, note: "f1351" },
    { name: "send", s: 28.75, note: "f1725 picture; agent log 28.68" },
    { name: "needsAnswer", s: 34.883, note: "f2093: 'Pebble needs your answer. Answer in the workspace'" },
  ],
  rois: [{ name: "isolate-quickChat", ...box(1268, 231, 736, 706), note: "the quick chat panel (the ask inside it from 22.5 is the rival beat)", valid: [14.933, 22.517] }],
  hazards: [
    { kind: "rival", s0: 0, s1: 2.967, box: box(1340, 200, 708, 950), what: "stale card 'Press \"Introducing Claude Code 3 minutes, 55 se…\" in Claude Code launch video Anthropic'", fix: "avoid" },
    { kind: "rival", s0: 2.967, s1: 59.167, box: box(1340, 920, 708, 230), what: "stale card's end: 'Pebble will press \"Introducing Claude Code…\"'", fix: "avoid" },
    { kind: "usage", s0: 0, s1: 59.167, box: box(760, 470, 500, 50), what: "workspace usage line '103,959 in · 66,505 cached · 1,594 out'", fix: "crop" },
    { kind: "usage", s0: 2.967, s1: 14.933, box: box(1270, 280, 735, 300), what: "quick chat's old reply about the video and '79,064 in · 43,704 cached · 898 out · 12.5 s'", fix: "avoid" },
    { kind: "rival", s0: 22.517, s1: 59.167, box: box(1285, 300, 705, 550), what: "the ask 'Show me a clip of your rival.' (typed in the input, then the bubble)", fix: "avoid" },
    { kind: "rival", s0: 0, s1: 59.167, box: box(40, 765, 240, 110), what: "sidebar recents 'Play this video in …', 'Show me a clip of …'", fix: "crop" },
    { kind: "recording-pill", s0: 10, s1: 59.167, box: LT_MENU.pill, what: "recording pill", fix: "crop" },
    { kind: "clock", s0: 0, s1: 59.167, box: LT_MENU.clock, what: "clock 'Sat 31 Oct 11:45 PM'", fix: "crop" },
    { kind: "date", s0: 0, s1: 59.167, box: LT_MENU.dockDate, what: "Dock Calendar icon 'Sat 31'", fix: "crop" },
  ],
  beats: [],
};

const RS9B_02: Take = {
  id: "RS9B-02",
  file: "launch/takes/RS9B-02.mp4",
  width: LT.w,
  height: LT.h,
  fps: 60,
  durationS: 125.683333,
  frames: 7541,
  summary:
    "A scripted browser take (the prompt holds a YouTube URL: never show it): the 'Use youtube.com' card in the quick chat and its Allow; Chrome's full-screen Space slides in with Pebble's own tab group and the pill 'Pebble is working in this tab · Stop'. From 55.15 s the tab, then the page, show the Claude Code launch video, ads and real faces: nothing after ≈ 55.95 s is usable.",
  events: [
    { name: "quickChatOpens", s: 3.217, note: "f193 (an old conversation with a usage line)" },
    { name: "newConversation", s: 16.667, note: "f1000" },
    { name: "typingStart", s: 24.4, note: "f1464: the prompt with the URL" },
    { name: "send", s: 39.833, note: "f2390" },
    { name: "cardLands", s: 43.4, note: "f2604 picture: 'Use youtube.com … Deny, Allow' (the agent log's card1 46.49 is its detection time)" },
    { name: "cardShifts", s: 46.683, note: "f2801: the card moves up ≈ 32 px" },
    { name: "allowPressed", s: 48.583, note: "the card shows through f2914 (48.567) and is gone at f2915; agent log allow1 48.5044" },
    { name: "adImage", s: 55.05, note: "f3303: an advert's picture fills the player" },
    { name: "spaceSlideToChrome", s: 54.567, note: "f3274: the outgoing Space shows the stale rival card as it slides" },
    { name: "chromeInPlace", s: 54.767, note: "f3286: the green 'Pebble' tab group, a green frame round the page, the pill" },
    { name: "tabTitleRival", s: 55.15, note: "f3309: the tab reads 'Introducing Claude Code'" },
    { name: "sidebarLoads", s: 55.9, note: "f3354: suggestion titles and durations appear round the pill" },
    { name: "videoTitleRival", s: 55.967, note: "f3358: the title under the player; thumbnails with faces" },
    { name: "pillChanges", s: 62.267, note: "f3736: 'Pebble opened this tab for a task · Stop'" },
    { name: "videoPlays", s: 116.5, note: "to the end; real people on screen" },
  ],
  rois: [
    { name: "browserCard", ...box(1285, 466, 705, 397), note: "'Use youtube.com — Pebble uses these sites in its own tab in your browser in this conversation, for up to 15 minutes. Sending, buying or deleting still asks you.' Details, Deny, Allow; the empty input below. Starts just under the prompt's URL line (y ≈ 448–458). Before 46.683 everything sits 32 px lower: use y + 32", valid: [46.7, 48.575] },
    { name: "isolate-allowButton", ...box(1835, 622, 120, 78), note: "Allow (after the shift; 32 px lower before 46.683)", valid: [46.7, 48.575] },
    { name: "chromeWide", ...box(24, 210, 2000, 1122), note: "Chrome below the address bar: the default-browser infobar, the page in Pebble's green frame, the black player, the pill", valid: [54.767, 55.05], masks: ["advertiser label"] },
    { name: "pill", ...box(1345, 910, 703, 395), note: "'● Pebble is working in this tab · Stop' (1507–2014 × 1225–1298) on the empty sidebar, right of the player", valid: [54.767, 55.9] },
    { name: "isolate-pill", ...box(1495, 1215, 530, 95), note: "the pill alone", valid: [54.767, 55.9] },
    { name: "isolate-tabGroup", ...box(180, 50, 1220, 95), note: "tab strip: 'Open day – Clay & Current', the green 'Pebble' group, 'YouTube'", valid: [54.767, 55.15] },
  ],
  hazards: [
    { kind: "path", s0: 24.4, s1: 39.833, box: box(1285, 700, 705, 150), what: "the prompt with the URL, typed in the input", fix: "avoid" },
    { kind: "path", s0: 39.833, s1: 43.4, box: box(1350, 440, 615, 170), what: "the prompt bubble 'Play this video in Chrome: https://www.youtube.com/watch?v=…'", fix: "avoid" },
    { kind: "path", s0: 43.4, s1: 46.7, box: box(1350, 400, 615, 98), what: "the prompt bubble's lines just above the card (before its 32 px shift)", fix: "avoid" },
    { kind: "path", s0: 46.7, s1: 48.575, box: box(1350, 400, 615, 64), what: "the prompt bubble's URL line just above the card (y ≈ 448–458)", fix: "avoid" },
    { kind: "path", s0: 48.575, s1: 54.567, box: box(1350, 425, 615, 180), what: "the prompt bubble with the URL, whole again once the card goes", fix: "avoid" },
    { kind: "rival", s0: 0, s1: 3.217, box: box(1340, 200, 708, 950), what: "stale card naming 'Introducing Claude Code' and Anthropic", fix: "avoid" },
    { kind: "rival", s0: 3.217, s1: 54.567, box: box(1340, 920, 708, 230), what: "stale card's end 'Pebble will press \"Introducing Claude Code…\"'", fix: "avoid" },
    { kind: "usage", s0: 0, s1: 54.567, box: box(760, 470, 500, 50), what: "workspace usage line '103,959 in · 66,505 cached · 1,594 out'", fix: "crop" },
    { kind: "usage", s0: 3.217, s1: 16.667, box: box(1295, 355, 580, 80), what: "quick chat usage line '103,959 in · 66,505 cached · 1,594 out · 20.5 s · 275 tok/s'", fix: "avoid" },
    { kind: "usage", s0: 48.575, s1: 49.833, box: box(1285, 650, 520, 75), what: "quick chat usage line '14,161 in · 6,866 cached · 339 out · 5.1 s'", fix: "avoid" },
    { kind: "path", s0: 54.567, s1: 125.684, box: box(300, 160, 540, 40), what: "address bar 'youtube.com/watch?v=AJpK3YTTKZ4'", fix: "crop" },
    { kind: "third-party", s0: 54.767, s1: 55.05, box: box(300, 1020, 130, 40), what: "the ad's advertiser label 'Adobe' in the black player", fix: "blur" },
    { kind: "rival", s0: 55.15, s1: 125.684, box: box(855, 60, 495, 80), what: "tab title 'Introducing Claude Code'", fix: "avoid" },
    { kind: "rival", s0: 55.967, s1: 125.684, box: box(25, 1240, 500, 60), what: "video title 'Introducing Claude Code' ('Anthropic' cut by the screen's edge)", fix: "avoid" },
    { kind: "person", s0: 55.9, s1: 125.684, box: box(1390, 340, 658, 990), what: "sidebar suggestions (titles from f3354), then thumbnails with real faces and 'Claude' text", fix: "avoid" },
    { kind: "third-party", s0: 55.05, s1: 116.5, box: box(34, 476, 1310, 740), what: "ads in the player (Adobe Acrobat from f3303; Google AI Plus '₹399' from ≈ 94 s)", fix: "avoid" },
    { kind: "person", s0: 116.5, s1: 125.684, box: box(34, 476, 1310, 740), what: "the Claude Code launch video playing, with real people", fix: "avoid" },
    { kind: "rival", s0: 0, s1: 54.567, box: box(40, 765, 240, 110), what: "sidebar recents 'Play this video in …', 'Show me a clip of …'", fix: "crop" },
    { kind: "recording-pill", s0: 10, s1: 54.567, box: LT_MENU.pill, what: "recording pill", fix: "crop" },
    { kind: "clock", s0: 0, s1: 54.567, box: LT_MENU.clock, what: "clock 'Sat 31 Oct 11:38–11:39 PM'", fix: "crop" },
    { kind: "date", s0: 0, s1: 54.567, box: LT_MENU.dockDate, what: "Dock Calendar icon 'Sat 31'", fix: "crop" },
  ],
  beats: [
    {
      beat: "S03-browser",
      scene: "S03 Uses your Mac, 8.5–11.0 s: 'Your browser.'; the limit line sits under its end",
      inS: 47.85,
      outS: 55.883,
      ramps: [
        { s0: 47.85, s1: 48.575, speed: 1, note: "the card and Allow; stop on f2914, the last frame with the card" },
        { s0: 54.767, s1: 55.05, speed: 0.5, note: "cut to Chrome in place (skip the slide: its outgoing half shows the rival card); a still page, so 0.5× reads as a hold" },
        { s0: 55.05, s1: 55.883, speed: 0.75, note: "the pill; the advert plays outside the frame; clean through f3352" },
      ],
      zoomPath: [
        { s: 47.85, roi: "browserCard" },
        { s: 54.767, roi: "chromeWide", cut: true, note: "mask the 'Adobe' label; the green group and frame say 'its own tab'" },
        { s: 55.05, roi: "pill", cut: true, note: "punch in on the pill on f3303, the frame the advert's picture fills the player (outside this framing)" },
      ],
      note: "Out ≈ 2.40 s. If the limit line needs longer under it, hold the last clean pill frame (55.867, f3352) with a drift rather than play on: suggestions load round the pill from f3354.",
    },
    {
      beat: "S03-limit-site",
      scene: "S03 11.0–12.0 alternative: the site card beside RS4-07's window card",
      inS: 47.85,
      outS: 48.575,
      ramps: [{ s0: 47.85, s1: 48.575, speed: 1 }],
      zoomPath: [{ s: 47.85, roi: "browserCard" }],
      note: "0.73 s.",
    },
  ],
};

const RS13_03: Take = {
  id: "RS13-03",
  file: "launch/takes/RS13-03.mp4",
  width: RT.w,
  height: RT.h,
  fps: 60,
  durationS: 19.75,
  frames: 1185,
  summary:
    "Stealth Lockdown, recorded with screencapture (so Pebble's windows really leave the recording): the workspace in its first-run 'Welcome to Pebble / Connect a model' state, ⌘K, 'stealth' typed, 'Turn Stealth Lockdown on — Hidden from screen capture and screen sharing', Return; the workspace leaves the recording in one frame, the menu-bar icon fills, the Dock icon shrinks away. Behind the workspace waits the take agent's 'pebble-takes' Finder window.",
  events: [
    { name: "paletteOpens", s: 4.4, note: "f264 (agent log 4.3679)" },
    { name: "typeS", s: 5.2, note: "f312 (agent log typed 5.2304)" },
    { name: "typeT", s: 5.4, note: "f324" },
    { name: "typeE", s: 5.6, note: "f336" },
    { name: "typeA", s: 5.8, note: "f348; 'Turn Stealth Lockdown on' becomes the lit first row" },
    { name: "typeL", s: 6.0, note: "f360" },
    { name: "typeT2", s: 6.167, note: "f370" },
    { name: "typeH", s: 6.433, note: "f386: 'stealth'" },
    { name: "returnKey", s: 7.2, note: "f432 (agent log switchOn 7.2062)" },
    { name: "windowsLeave", s: 7.233, note: "f434: the whole workspace and the palette leave in one frame" },
    { name: "menuIconFills", s: 7.233, note: "f434: the outline pebble becomes the filled pebble in a ring" },
    { name: "dockIconShrinks", s: 7.4, note: "f444" },
    { name: "dockIconGone", s: 7.6, note: "f456" },
    { name: "dockClosed", s: 7.633, note: "f458: the Dock re-centres (icons shift right ≈ 50 px)" },
  ],
  rois: [
    { name: "palette", ...box(1100, 240, 1250, 703), note: "the ⌘K palette (4.4–7.233) and its rows over the dimmed first-run workspace", valid: [0, 7.233] },
    { name: "paletteRow", ...box(1150, 280, 1000, 562), note: "'stealth' and the lit row 'Turn Stealth Lockdown on / Hidden from screen capture and screen sharing' (5.8–7.233)", valid: [0, 7.233] },
    { name: "isolate-palette", ...box(1150, 290, 1150, 330), note: "the reel's crop: input and two rows (5.8–7.233)", valid: [0, 7.233] },
    { name: "desktopWide", ...box(0, 70, 2940, 1654), note: "everything between the menu bar and the Dock: the workspace, then the desktop", valid: [0, 19.75], masks: ["desktop calendar widget", "the pebble-takes Finder window"] },
    { name: "vanishComposer", ...box(1600, 1133, 1060, 596), note: "the composer's right half ('…something… Type / for commands', send), the iCloud storage note's end and the footer 'Pebble can make mistakes. Check the evidence.'; bare wallpaper from 7.233. Below the pebble-takes Finder window (ends y 1131) and above the Dock", valid: [0, 19.75] },
    { name: "isolate-vanishBand", ...box(316, 1133, 2624, 596), note: "the whole clean band under the Finder window: composer, footer, Settings; bare wallpaper from 7.233 (aspect 4.4)", valid: [0, 19.75] },
    { name: "vanishDock", ...box(1500, 1133, 1385, 779), note: "the composer's right part and the footer, the Dock's right end (System Settings, Terminal, Pebble's icon 2140–2230 × 1775–1870, Trash): the workspace leaves at 7.233, Pebble's icon shrinks 7.4–7.6, the Dock closes up at 7.633. Below the pebble-takes Finder window; the Settings badge is inside", valid: [0, 19.75], masks: ["System Settings red badge"] },
    { name: "dockRight", ...box(2046, 1500, 730, 411), note: "the Dock's right end: Terminal, Pebble's icon (2140–2230 × 1775–1870), Trash; right of the Settings badge before and after the Dock re-centres", valid: [0, 19.75] },
    { name: "menuIconNoPill", ...box(2262, 0, 384, 216), note: "Pebble's menu-bar icon (2286–2316 × 10–50) between the recording pill (ends 2259) and the clock (starts 2652); 5× source, soft", valid: [0, 19.75] },
  ],
  hazards: [
    { kind: "recording-pill", s0: 0, s1: 19.75, box: RT_MENU.pill, what: "recording pill, 27 px left of Pebble's menu-bar icon", fix: "crop" },
    { kind: "clock", s0: 0, s1: 19.75, box: RT_MENU.clock, what: "clock 'Sat 31 Oct 5:25 PM'", fix: "crop" },
    { kind: "badge", s0: 0, s1: 19.75, box: box(1930, 1750, 115, 55), what: "System Settings red badge '2' in the Dock (x 1943–1987, then 1991–2035 after 7.633); the old reel accepted it on a small crop", fix: "blur" },
    { kind: "date", s0: 0, s1: 19.75, box: box(1180, 1755, 170, 115), what: "Dock Calendar icon '31'", fix: "crop" },
    { kind: "date", s0: 0, s1: 19.75, box: box(20, 140, 335, 295), what: "desktop calendar widget: October, the 31st marked", fix: "blur" },
    { kind: "production", s0: 7.233, s1: 19.75, box: box(543, 266, 1854, 865), what: "the pebble-takes Finder window (agent, conformed, raw, results…; sidebar iCloud Drive, studio)", fix: "blur" },
    { kind: "state", s0: 0, s1: 7.233, box: box(316, 120, 2624, 1640), what: "the workspace's first-run 'Welcome to Pebble. / Connect a model' state (honest, weak)", fix: "accept" },
    { kind: "third-party", s0: 0, s1: 19.75, box: box(20, 450, 525, 350), what: "Photos widget placeholder", fix: "accept" },
  ],
  beats: [
    {
      beat: "S09-stealth",
      scene: "S09 Stealth Lockdown, 1.0–4.5 s: ⌘K, 'stealth', Return, the windows leave; hold on the Dock without Pebble",
      inS: 4.3,
      outS: 8.7,
      ramps: [
        { s0: 4.3, s1: 5.3, speed: 2.5, note: "the palette opens (4.4)" },
        { s0: 5.3, s1: 6.5, speed: 1.5, note: "'stealth' typed; the row lights at 5.8" },
        { s0: 6.5, s1: 7.38, speed: 1, note: "hold on the lit row; Return 7.2; the windows leave 7.233" },
        { s0: 7.38, s1: 8.7, speed: 1, note: "the Dock icon shrinks 7.4–7.6; the Dock without Pebble" },
      ],
      zoomPath: [
        { s: 4.3, roi: "palette" },
        { s: 5.75, roi: "paletteRow", note: "push as the row lights" },
        { s: 6.6, roi: "vanishDock", cut: true, note: "cut once the row is lit and 'stealth' typed; 0.6 s later the workspace leaves, then the Dock icon shrinks away, all in one framing" },
      ],
      note: "Out ≈ 3.40 s. Never slow this take below 1×: it is a screencapture conform (raw 36 fps average) and repeats frames. Alternatives for the 6.6 cut: desktopWide (the whole window leaves in one frame, the strongest read; blur the calendar widget and, from 7.233, the pebble-takes Finder window) or vanishComposer (no Dock, no badge).",
    },
  ],
};

const RSW_01: Take = {
  id: "RSW-01",
  file: "launch/takes/RSW-01.mp4",
  width: RT.w,
  height: RT.h,
  fps: 60,
  durationS: 495.583333,
  frames: 29735,
  summary:
    "The kiln request typed in a new workspace conversation (5–60 s) and sent at 61.47 s; 'Running a script: Create, test, keep and use a kiln_ramp_time tool…' (71.70), 'Fix tool spec, make, keep and use kiln_ramp_time' (79.33); the Keep card 'Keep this tool in Pebble's Toolbox? · kiln_ramp_time … Pebble asks because the independent check disagreed (2 of 5 tests passed).' (89.43); the answer '10 hours 10 minutes (610 minutes)' (96.65). Static to the end. No usage line anywhere.",
  events: [
    { name: "typingVisible", s: 5.5, note: "the brief is typed into the composer until ≈ 60 s" },
    { name: "send", s: 61.467, note: "f3688 picture (the agent log's 62.77 is uncalibrated)" },
    { name: "recalledMemory", s: 61.533, note: "f3692" },
    { name: "workingItOut", s: 71.6, note: "f4296" },
    { name: "scriptCreateTestKeep", s: 71.7, note: "≈ f4302: 'Running a script: Create, test, keep and use a kiln_ramp_time tool for…' (clay) in the status and the steps" },
    { name: "weighingOptions", s: 79.133, note: "f4748" },
    { name: "scriptFixSpec", s: 79.333, note: "f4760: 'Running a script: Fix tool spec, make, keep and use kiln_ramp_time'" },
    { name: "keepCardLands", s: 89.433, note: "f5366 (the report's 89.5)" },
    { name: "answerLands", s: 96.65, note: "f5799: 'Worked for 35 s · 3 steps'; the answer replaces the view (the card goes below)" },
  ],
  rois: [
    { name: "workspace", ...box(55, 133, 2817, 1585), note: "the Pebble window without menu bar and Dock", valid: [0, 96.65] },
    { name: "request", ...box(640, 240, 1380, 776), note: "the request bubble, the status line, the first steps (from 61.467)", valid: [0, 495.584] },
    { name: "scriptLine", ...box(620, 640, 1100, 619), note: "status and steps: 'Running a script: Create, test, keep and use a kiln_ramp_time tool for…' at 673–1474 × ≈ 915–935 (from 71.70)", valid: [0, 96.65] },
    { name: "keepCardWide", ...box(560, 480, 1600, 900), note: "the Keep card (714–2009 × 677–1048, from 89.433) with the bubble's foot above and 'Thinking' below", valid: [0, 96.65] },
    { name: "keepLine", ...box(700, 536, 1170, 658), note: "the card's question (from x 752), its description (cut at the right), the bullet 'Pebble asks because the independent check disagreed (2 of 5 tests passed).' (752–1819 × ≈ 913), View code / Discard / Keep, 'Thinking' below (89.433–96.583)", valid: [0, 495.584] },
    { name: "isolate-keepAsk", ...box(705, 715, 1130, 320), note: "question, description, bullet and buttons (89.433–96.583)", valid: [0, 495.584] },
    { name: "isolate-keepButtons", ...box(880, 940, 300, 90), note: "Discard, Keep (89.433–96.583)", valid: [0, 495.584] },
    { name: "answer", ...box(700, 680, 1300, 731), note: "the whole answer, including 'it passed my 3 tests' at y ≈ 1240–1330 (from 96.65)", valid: [0, 495.584], masks: ["it passed my 3 tests"] },
    { name: "isolate-answerHeadline", ...box(700, 690, 1000, 300), note: "'Friday's bisque firing will take about 10 hours 10 minutes (610 minutes).' and the three bullets (from 96.65)", valid: [0, 495.584] },
  ],
  hazards: [
    { kind: "recording-pill", s0: 10.5, s1: 495.584, box: RT_MENU.pill, what: "recording pill (seen 11–495 s, at times absent)", fix: "crop" },
    { kind: "clock", s0: 0, s1: 495.584, box: RT_MENU.clock, what: "clock 'Sat 31 Oct 6:43–6:52 PM'", fix: "crop" },
    { kind: "badge", s0: 0, s1: 495.584, box: box(1855, 1745, 65, 60), what: "System Settings red badge '2' in the Dock", fix: "crop" },
    { kind: "date", s0: 0, s1: 495.584, box: box(1115, 1765, 110, 110), what: "Dock Calendar icon '31'", fix: "crop" },
    { kind: "production", s0: 0, s1: 495.584, box: box(2250, 1765, 145, 120), what: "Dock: a minimised window's thumbnail", fix: "crop" },
    { kind: "inconsistency", s0: 96.65, s1: 495.584, box: box(700, 1235, 1300, 100), what: "the answer's 'it passed my 3 tests' (Pebble's own tests) beside the card's '2 of 5' (the blind check) confuses in a 2 s shot", fix: "avoid" },
  ],
  beats: [
    {
      beat: "S05-request",
      scene: "S05 Pebble's Workshop, 1.0–3.0 s: the kiln request, then 'Running a script: Create, test, keep and use…'",
      inS: 61.35,
      outS: 72.85,
      ramps: [
        { s0: 61.35, s1: 61.95, speed: 1, note: "the bubble lands (61.467)" },
        { s0: 61.95, s1: 71.62, speed: 25, note: "Sending, Thinking, Reasoning it through, Weighing options, Working it out" },
        { s0: 71.62, s1: 72.85, speed: 1, note: "the clay line appears (71.70)" },
      ],
      zoomPath: [
        { s: 61.35, roi: "request" },
        { s: 71.62, roi: "scriptLine", note: "push during the 25× stretch, settled as the line lands" },
      ],
      note: "Out ≈ 2.22 s. Optional extension: 72.85–79.20 at 16×, then 79.20–79.90 at 1× for 'Fix tool spec, make, keep and use kiln_ramp_time' (+1.1 s).",
    },
    {
      beat: "S05-keep",
      scene: "S05 Pebble's Workshop, 5.5–8.0 s: 'When the check disagrees, it asks you.'",
      inS: 89.25,
      outS: 91.75,
      ramps: [{ s0: 89.25, s1: 91.75, speed: 1, note: "the card lands at 89.433; static after, so the camera carries the life" }],
      zoomPath: [
        { s: 89.25, roi: "keepCardWide" },
        { s: 90.35, roi: "keepLine", note: "push 0.3 s after the landing onto the '2 of 5' line; hold 1.4 s" },
      ],
      note: "Out 2.5 s. The take shows the ask branch only: the tool was never kept (the card can't be clicked any more). Pair it with the explainer, never with the answer's '3 tests'.",
    },
    {
      beat: "S05-answer-alt",
      scene: "S05 spare: the result '10 hours 10 minutes'",
      inS: 96.65,
      outS: 98.65,
      ramps: [{ s0: 96.65, s1: 98.65, speed: 1 }],
      zoomPath: [{ s: 96.65, roi: "isolate-answerHeadline" }],
      note: "2.0 s; keep above y 1235 (the '3 tests' paragraph).",
    },
  ],
};

const RS11_02: Take = {
  id: "RS11-02",
  file: "launch/takes/RS11-02.mp4",
  width: RT.w,
  height: RT.h,
  fps: 60,
  durationS: 9.466667,
  frames: 568,
  summary:
    "A still tour shot: Finder on Documents › Pebble (Artifacts, Attachments, Conversations, Downloads, Exports, Logs, Memory, README.md) over the workspace; the pointer rests on README.md. Optional B-roll for 'All visible.' (S06).",
  events: [
    { name: "pointerMoves", s: 1.8, note: "f108–120, small" },
    { name: "pointerMoves2", s: 4.0, note: "f240–250, small; otherwise still" },
  ],
  rois: [
    { name: "pebbleFolderFiles", ...box(930, 340, 1513, 851), note: "the 'Pebble' window's toolbar and its eight items, right of the sidebar", valid: [0, 9.467] },
    { name: "memoryFolder", ...box(930, 560, 760, 428), note: "the Memory folder (1001–1120 × 690–794) and README.md, the first row's labels above", valid: [0, 9.467] },
    { name: "isolate-pebbleFolder", ...box(611, 328, 1832, 867), note: "the whole Finder window, sidebar included", valid: [0, 9.467], masks: ["Finder sidebar", "title bar of the pebble-takes"] },
  ],
  hazards: [
    { kind: "clock", s0: 0, s1: 9.467, box: RT_MENU.clock, what: "clock 'Sat 31 Oct 7:29 PM' (no recording pill in this take)", fix: "crop" },
    { kind: "badge", s0: 0, s1: 9.467, box: box(1855, 1745, 65, 60), what: "System Settings red badge '2' in the Dock", fix: "crop" },
    { kind: "date", s0: 0, s1: 9.467, box: box(1115, 1765, 110, 110), what: "Dock Calendar icon '31'", fix: "crop" },
    { kind: "production", s0: 0, s1: 9.467, box: box(550, 270, 1900, 65), what: "title bar of the pebble-takes Finder window behind", fix: "crop" },
    { kind: "identity", s0: 0, s1: 9.467, box: box(630, 950, 300, 230), what: "Finder sidebar 'iCloud Drive ⚠', 'studio', 'On My Mac'", fix: "crop" },
  ],
  beats: [
    {
      beat: "S06-files-alt",
      scene: "S06 Memory spare: Pebble's own folder on disk",
      inS: 0.5,
      outS: 3.5,
      ramps: [{ s0: 0.5, s1: 3.5, speed: 1 }],
      zoomPath: [
        { s: 0.5, roi: "pebbleFolderFiles" },
        { s: 1.4, roi: "memoryFolder", note: "slow push: the picture is still, the camera carries it" },
      ],
      note: "3.0 s of a still picture: a quiet insert only; by itself it proves nothing about the six layers.",
    },
  ],
};

export const TAKES: Readonly<Record<TakeId, Take>> = {
  "RS1-03": RS1_03,
  "RS15-01": RS15_01,
  "RS4-07": RS4_07,
  "RS5C-04": RS5C_04,
  "RS5F-03": RS5F_03,
  "RS9A-01": RS9A_01,
  "RS9B-02": RS9B_02,
  "RS13-03": RS13_03,
  "RSW-01": RSW_01,
  "RS11-02": RS11_02,
};

export const TAKE_IDS = Object.keys(TAKES) as TakeId[];

// ---- helpers (pure) --------------------------------------------------------------------------------------------------

/** A take's event time by name; throws on a typo so a scene never silently uses 0. */
export function eventS(id: TakeId, name: string): number {
  const e = TAKES[id].events.find((v) => v.name === name);
  if (!e) throw new Error(`takes: ${id} has no event "${name}"`);
  return e.s;
}

/** A take's ROI by name. */
export function roiOf(id: TakeId, name: string): TakeRoi {
  const r = TAKES[id].rois.find((v) => v.name === name);
  if (!r) throw new Error(`takes: ${id} has no roi "${name}"`);
  return r;
}

/** A beat by name, searched across all takes. */
export function beatOf(name: string): { take: Take; beat: Beat } {
  for (const take of Object.values(TAKES)) {
    const beat = take.beats.find((b) => b.beat === name);
    if (beat) return { take, beat };
  }
  throw new Error(`takes: no beat "${name}"`);
}

/**
 * A beat's zoom path as camera keys for components/ScreenZoom with keyTime="source" (camera.ts `ZoomKey`): t in source
 * seconds, the ROI's box, and dur 0 on a cut (camera.ts cuts when a move has no duration).
 */
export function zoomKeys(id: TakeId, b: Beat): { t: number; box: Box; dur?: number }[] {
  return b.zoomPath.map((k) => {
    const r = roiOf(id, k.roi);
    return { t: k.s, box: { x: r.x, y: r.y, w: r.w, h: r.h }, ...(k.cut ? { dur: 0 } : {}) };
  });
}

/** Output length of a beat in seconds: its ramp segments at their speeds. */
export function beatLengthS(b: Beat): number {
  return b.ramps.reduce((t, r) => t + (r.s1 - r.s0) / r.speed, 0);
}

/** The source second shown at output second `t` of beat `b` (clamped to the beat). */
export function sourceAt(b: Beat, t: number): number {
  let acc = 0;
  for (const r of b.ramps) {
    const len = (r.s1 - r.s0) / r.speed;
    if (t < acc + len) return r.s0 + Math.max(0, t - acc) * r.speed;
    acc += len;
  }
  return b.ramps[b.ramps.length - 1].s1;
}

/** The output second at which source second `s` is first shown in beat `b`, or null when the beat skips it. */
export function outputAt(b: Beat, s: number): number | null {
  let acc = 0;
  for (const r of b.ramps) {
    if (s >= r.s0 && s < r.s1) return acc + (s - r.s0) / r.speed;
    acc += (r.s1 - r.s0) / r.speed;
  }
  return null;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Hazards active at source second `s` (inside `area` when given): what a frame at that time must crop, blur or avoid. */
export function hazardsIn(id: TakeId, s: number, area?: Box): Hazard[] {
  return TAKES[id].hazards.filter((h) => s >= h.s0 && s < h.s1 && (!area || overlaps(h.box, area)));
}
