// The launch film's timeline as DATA (critic C4): frames for every shot, caption, pebble cue, sound-effect intent,
// camera focus and review frame. No React, no Remotion, no path aliases: the scenes, the style frames, the cue exporter
// (bun) and the checks all read this one module.
//
// Source of truth, in order: docs/FILM_SPEC.md (lane E) > OVERRIDES §2, §7, §9 > MASTER_PLAN §5.1.
// STATUS 2026-10-23 03:40: docs/FILM_SPEC.md had not landed, so this version follows MASTER_PLAN §5.1 with the
// OVERRIDES applied: neutral tension questions; the AgentGuard climax (held → Run the tests → isolated tests →
// Verified); no test counter and no "network off" (C3); never "Any model". Re-derive the shot list from FILM_SPEC when
// it lands; the machinery (bars → frames from the beat map, chapter-checked lines, the checks) stays.
//
// Rules validateTimeline() enforces:
// - every frame comes from the beat map by INDEX (bar, beat, offset), never by accumulating (R5 §10.1);
// - shots tile the film exactly and cut on bar lines; the reveal shot starts on beatmap.reveal.frame;
// - every on-screen line is copied from src/content/chapters.ts (the transcript, captions and chapter list use the
//   same words), has ≤ 6 words, and holds ≥ 0.5 s + 0.3 s per word (the last line of a shot ≥ 2 s; claims and the CTA
//   readable twice: ≥ 2 s and 0.6 s per word);
// - pebble cues pass shared/pebble's checks (Pebble's own poses only, D6);
// - exactly one riser, ending on the reveal.
import beatmap from "../../../tools/audio/beatmap.json";
import { chapters } from "../../../src/content/chapters";
import { checkCues, type PebbleCue } from "../../../shared/pebble/cues";

/* ================================================================================================================
 * The grid (tools/audio/beatmap.json: 100 BPM, 18 frames per beat, 72 per bar, 32 bars = 2,304 frames at 30 fps)
 * ============================================================================================================== */

export const FPS: number = beatmap.fps;
export const GRID = {
  bpm: beatmap.bpm,
  beatsPerBar: beatmap.beats_per_bar,
  framesPerBeat: beatmap.frames_per_beat,
  barFrames: beatmap.bar_frames,
  firstDownbeat: beatmap.first_downbeat_frame,
  bars: beatmap.total_bars,
  frames: beatmap.total_frames,
} as const;

/** The frame of bar `bar` (1-based), beat `beat` (1-based) plus `offset` frames, computed from the beat's index. */
export const at = (bar: number, beat = 1, offset = 0): number =>
  GRID.firstDownbeat + ((bar - 1) * GRID.beatsPerBar + (beat - 1)) * GRID.framesPerBeat + offset;
/** Seconds → frames (the only way to turn a duration into frames). */
export const sec = (s: number): number => Math.round(s * FPS);
/** Frames → seconds of composition time (pebble cues are in seconds). */
export const time = (frame: number): number => frame / FPS;

export const DURATION_FRAMES: number = GRID.frames;
export const REVEAL_FRAME: number = beatmap.reveal.frame;
export const BREATH_FRAME: number = beatmap.cues.breath_frame;
export const FINAL_CHORD_FRAME: number = beatmap.cues.final_chord_frame;

export type SectionName = "hook" | "tension" | "build" | "reveal" | "proof" | "payoff" | "breakdown" | "endcard" | "final";
export const SECTIONS = Object.fromEntries(
  beatmap.sections.map((s) => [s.name, { from: s.start_frame, to: s.end_frame, bars: [s.first_bar, s.last_bar] as const }]),
) as Record<SectionName, { from: number; to: number; bars: readonly [number, number] }>;
/** The musical section a frame falls in. */
export const sectionAt = (frame: number): SectionName | undefined =>
  (Object.keys(SECTIONS) as SectionName[]).find((n) => frame >= SECTIONS[n].from && frame < SECTIONS[n].to);

/* ================================================================================================================
 * Words: every on-screen line comes from src/content/chapters.ts
 * ============================================================================================================== */

export type ChapterId = "desktop" | "project" | "tested" | "model" | "pace" | "memory" | "views" | "open-source" | "get";

/** Lines the timeline uses that src/content/chapters.ts does not have (reported by validateTimeline, not thrown at
 *  import, so a copy change upstream breaks the film's check loudly without breaking every other composition). */
const unknownLines: string[] = [];

/** A line of on-screen text, checked against the chapter's `onScreen` list (the transcript and captions use it too). */
export function line(chapter: ChapterId, text: string): string {
  const c = chapters.find((ch) => ch.id === chapter);
  if (!c) unknownLines.push(`no chapter "${chapter}" in src/content/chapters.ts (line "${text}")`);
  else if (!c.onScreen.includes(text)) unknownLines.push(`"${text}" is not an on-screen line of chapter "${chapter}" (src/content/chapters.ts)`);
  return text;
}

/* ================================================================================================================
 * The world (units: points of a 1600 × 1000 desktop; one point = one CSS px of the captured UI)
 * ============================================================================================================== */

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

export const WORLD = {
  desktop: { x: 0, y: 0, w: 1600, h: 1000 },
  /** Pebble's main window (tauri.conf.json: 1160 × 800), centred on the desktop */
  mainWindow: { x: 220, y: 100, w: 1160, h: 800 },
  /** the companion's collapsed window (112 × 112 pt), on the open ground just right of the riverbed's lower stones */
  petWindow: { x: 1125, y: 810, w: 112, h: 112 },
  /** its expanded window (384 × 456 pt) grows up and left from the same bottom-right corner */
  petExpanded: { x: 853, y: 466, w: 384, h: 456 },
} as const;

/** The pebble in the collapsed pet window (measured on pet-collapsed@3x: body 86.7 × 76.3 CSS px, centre (55.3,
 *  56.8), bottom at 95) and the PebbleOnFilm size that matches it (body width = BODY.width × size / 220). */
export const PET = {
  foot: { x: WORLD.petWindow.x + 55.3, y: WORLD.petWindow.y + 95 },
  centre: { x: WORLD.petWindow.x + 55.3, y: WORLD.petWindow.y + 56.8 },
  size: 147,
} as const;

const inWindow = (r: Rect): Rect => ({ x: WORLD.mainWindow.x + r.x, y: WORLD.mainWindow.y + r.y, w: r.w, h: r.h });

/** Regions of the main-window captures that shots frame, in WORLD units (measured on the @2x stills). */
export const FOCUS = {
  /** held-unverified: "Blocked", "Pebble's change isn't verified yet. · …" and its three buttons */
  heldPanel: inWindow({ x: 342, y: 470, w: 700, h: 128 }),
  /** held-unverified: the panel's left part (the sentence's start; Run the tests, Ask Pebble to finish) */
  heldPanelLeft: inWindow({ x: 342, y: 470, w: 300, h: 128 }),
  /** held-unverified: the Run the tests button */
  runTests: inWindow({ x: 386, y: 558, w: 96, h: 32 }),
  /** main-done: "Worked for 1 min 12 s · 5 steps · waited 6 s for you" and "Verified · pytest 42 passed on current files" */
  receipt: inWindow({ x: 284, y: 210, w: 334, h: 54 }),
  /** main-done: the same two lines with the reply's avatar, as one card */
  receiptRow: inWindow({ x: 250, y: 207, w: 370, h: 60 }),
  /** main-done: the "Verified · pytest 42 passed on current files" line */
  verifiedLine: inWindow({ x: 295, y: 243, w: 223, h: 14 }),
  /** main-done: that line alone as a card (the square's payoff, where UI text must be ≥ 34 px) */
  verifiedChip: inWindow({ x: 284, y: 235, w: 245, h: 30 }),
  /** main-done: the reply, from the receipt to "42 tests passed in an isolated copy of your project." */
  reply: inWindow({ x: 255, y: 210, w: 470, h: 224 }),
} as const;

/* ================================================================================================================
 * Shots
 * ============================================================================================================== */

export type World = "desktop" | "window" | "sage" | "paper";
export type Transition = "cut" | "match-cut" | "carry" | "flood" | "zoom-through" | "object-world";
export type TextRole = "hero" | "headline" | "support" | "cta" | "mono" | "small";

export interface CaptionCue {
  text: string;
  chapter: ChapterId;
  role: TextRole;
  /** frame the entrance starts */
  in: number;
  /** frame the exit starts (the line is gone 0.2 s later) */
  out: number;
  enter?: "blur" | "ink" | "rise" | "fade";
  /** "stack": part of the end card's stack, may overlap other stacked lines in time */
  place?: "center" | "top" | "bottom" | "stack";
  /** a claim or the CTA: readable twice (≥ 2 s and 0.6 s per word) */
  key?: boolean;
}

export type SfxRole = "click" | "pop" | "tick" | "thud" | "whoosh" | "riser" | "hit" | "shimmer" | "downlifter";
export interface SfxCue {
  /** the PICTURE event's frame; the exporter puts the peak one frame later (the riser's END on the reveal, sfx_kit.json) */
  frame: number;
  role: SfxRole;
  event: string;
  /** −1 left … 1 right */
  pan?: number;
}

export interface Shot {
  id: string;
  chapter: ChapterId;
  /** [from, to) frames, on bar lines */
  from: number;
  to: number;
  world: World;
  /** how the shot begins (R5 §7: 3–5 caused kinds, ≤ 1/3 hard cuts, never a cross-fade between worlds) */
  transitionIn: Transition;
  /** captured UI it uses (lane D stills; record.mjs timelines) */
  ui?: readonly string[];
  /** the world region the camera must show once it has arrived */
  focus?: Rect;
  captions: readonly CaptionCue[];
  sfx: readonly SfxCue[];
  /** what happens (the shot list, for people) */
  note: string;
}

const cap = (chapter: ChapterId, text: string, role: TextRole, inF: number, outF: number, extra: Partial<CaptionCue> = {}): CaptionCue => ({
  text: line(chapter, text),
  chapter,
  role,
  in: inF,
  out: outF,
  ...extra,
});

/** Past the last frame: a line that is still on screen when the film ends. */
const END = GRID.frames + 1;

export const SHOTS: readonly Shot[] = [
  {
    id: "hook",
    chapter: "desktop",
    from: at(1),
    to: at(3),
    world: "desktop",
    transitionIn: "cut",
    ui: ["pet-live-error (record.mjs)", "pet-collapsed"],
    focus: { x: WORLD.petExpanded.x - 40, y: WORLD.petExpanded.y - 30, w: WORLD.petExpanded.w + 80, h: WORLD.petExpanded.h + 60 },
    captions: [],
    sfx: [{ frame: at(1, 3), role: "click", event: "hook: click on the pebble", pan: 0.35 }],
    note:
      "Frame 0 is the thumbnail: the pebble on the riverbed desktop, close. The pointer enters, the eyes go first; a " +
      "click on beat 3 opens the quick chat (real pet-live-error frames), the question is typed and sent on bar 2 beat 3, " +
      "and the pebble thinks. The camera eases back to frame the chat as it opens.",
  },
  {
    id: "questions",
    chapter: "desktop",
    from: at(3),
    to: at(6),
    world: "sage",
    transitionIn: "carry",
    captions: [
      cap("desktop", "Did it run the tests?", "headline", at(3), at(4, 1, -6)),
      cap("desktop", "What did it change?", "headline", at(4), at(5, 1, -6)),
      cap("desktop", "Can I undo it?", "headline", at(5), at(6, 1, -6)),
    ],
    sfx: [{ frame: at(3), role: "whoosh", event: "into the sage field (the camera passes through the pebble's body)" }],
    note:
      "Neutral questions a careful person asks of any AI helper (OVERRIDES §2), one per bar, white Fraunces on the " +
      "sage field. The world change is caused: the camera passes into the pebble's own sage.",
  },
  {
    id: "build",
    chapter: "desktop",
    from: at(6),
    to: at(8),
    world: "sage",
    transitionIn: "cut",
    captions: [],
    sfx: [{ frame: REVEAL_FRAME, role: "riser", event: "riser over bars 6-7, its end on the reveal downbeat" }],
    note:
      "The riser. The pebble (its dark-mode palette reads on sage) arrives in small hops on the beats; on the breath " +
      "(frame 486) it anticipates, then leaps. FILM_SPEC may place the allowed intent line here (OVERRIDES §2).",
  },
  {
    id: "reveal",
    chapter: "desktop",
    from: at(8),
    to: at(10),
    world: "paper",
    transitionIn: "flood",
    captions: [cap("desktop", "A small companion for your Mac", "support", at(8, 2), at(10, 1, -6))],
    sfx: [
      { frame: REVEAL_FRAME, role: "hit", event: "reveal: the pebble lands as the full stop" },
      { frame: REVEAL_FRAME, role: "thud", event: "reveal: felt texture under the hit" },
    ],
    note:
      "On the bar-8 downbeat the sage floods to paper and the pebble lands as the full stop of \"pebble.\" (landing " +
      "squash); the letters are wiped in behind its last hop. The support line lands one beat later and holds.",
  },
  {
    id: "reads",
    chapter: "project",
    from: at(10),
    to: at(11),
    world: "window",
    transitionIn: "object-world",
    ui: ["main-live-film (record.mjs)", "main-live-02-reading"],
    captions: [cap("project", "It reads your project", "headline", at(10, 1, 6), at(11, 1, -6))],
    sfx: [{ frame: at(10), role: "whoosh", event: "the paper opens onto the desktop and Pebble's window" }],
    note: "Pebble's window on invoice-kit; its status line reads \"Reading invoice_kit/dates.py\" (critic C8 Reading still).",
  },
  {
    id: "asks",
    chapter: "project",
    from: at(11),
    to: at(13),
    world: "window",
    transitionIn: "zoom-through",
    ui: ["main-live-film (record.mjs)", "main-approval", "crop-approval-card", "main-done"],
    captions: [cap("project", "Review, apply, undo", "headline", at(11, 3), at(13, 1, -6))],
    sfx: [
      { frame: at(12), role: "click", event: "Apply edit", pan: 0.25 },
      { frame: at(12, 2), role: "pop", event: "Done and Undo this edit appear" },
    ],
    note: "Punch-in on the approval card and its diff; the pointer arcs to Apply edit; Done; Undo this edit.",
  },
  {
    id: "held",
    chapter: "tested",
    from: at(13),
    to: at(15),
    world: "window",
    transitionIn: "match-cut",
    ui: ["main-live-film (record.mjs)", "held-unverified", "crop-held"],
    focus: FOCUS.heldPanel,
    captions: [],
    sfx: [{ frame: at(14, 3), role: "click", event: "Run the tests", pan: -0.1 }],
    note:
      "AgentGuard holds the run: \"Pebble's change isn't verified yet.\" with Run the tests / Ask Pebble to finish / " +
      "Accept as unverified (verbatim, RunPanel.vue). The held panel rises from its own screen; the pointer goes to " +
      "Run the tests and clicks on bar 14 beat 3. Any caption here is FILM_SPEC's call.",
  },
  {
    id: "tests",
    chapter: "tested",
    from: at(15),
    to: at(16),
    world: "window",
    transitionIn: "match-cut",
    ui: ["main-live-film (record.mjs)", "held-tests-review", "crop-tests-card", "main-done-timeline"],
    captions: [cap("tested", "Tests run in an isolated copy", "headline", at(15), at(16, 1, -3))],
    sfx: [
      { frame: at(15, 2), role: "click", event: "Run tests, on the \"Run isolated tests\" card", pan: 0.2 },
      { frame: at(15, 4), role: "tick", event: "the \"Requesting isolated tests · 11 s\" row" },
    ],
    note:
      "The real \"Run isolated tests\" card (\"Runs the project's tests in a temporary copy. Your project files don't " +
      "change.\") → Run tests → the real row \"Requesting isolated tests · 11 s\". No counter, no invented UI (C3).",
  },
  {
    id: "verified",
    chapter: "tested",
    from: at(16),
    to: at(18),
    world: "window",
    transitionIn: "match-cut",
    ui: ["main-done", "crop-done-receipt"],
    focus: FOCUS.receipt,
    captions: [cap("tested", "Done means tested", "headline", at(16, 2), at(18, 1, -6))],
    sfx: [{ frame: at(16), role: "shimmer", event: "Verified · pytest 42 passed on current files" }],
    note:
      "The payoff of the AgentGuard climax: \"Verified · pytest 42 passed on current files\" lands on the bar-16 " +
      "downbeat and lifts off the window; a check draws on OUTSIDE the UI's bounds (C3); the pebble is happy.",
  },
  {
    id: "models",
    chapter: "model",
    from: at(18),
    to: at(19),
    world: "window",
    transitionIn: "match-cut",
    ui: ["settings-models", "crop-models-ways-in"],
    captions: [cap("model", "Your model, your choice", "headline", at(18, 1, 4), at(19, 1, -6))],
    sfx: [{ frame: at(18), role: "whoosh", event: "into Settings › Models" }],
    note: "Settings › Models: Continue with ChatGPT, Connect provider, Add a model file (On this Mac). Never \"Any model\".",
  },
  {
    id: "pace",
    chapter: "pace",
    from: at(19),
    to: at(21),
    world: "window",
    transitionIn: "match-cut",
    ui: ["settings-permissions", "settings-permissions-auto", "crop-permissions-modes", "crop-permissions-modes-auto"],
    captions: [cap("pace", "You set what it may do", "headline", at(19, 2), at(21, 1, -6))],
    sfx: [{ frame: at(20), role: "click", event: "Auto in project selected (match cut on the click)", pan: 0.1 }],
    note: "Settings › Permissions: the selection moves from Ask for approval to Auto in project (critic C8 capture).",
  },
  {
    id: "memory",
    chapter: "memory",
    from: at(21),
    to: at(23),
    world: "window",
    transitionIn: "match-cut",
    ui: ["settings-memory", "settings-memory-forgotten", "crop-memory-records", "crop-memory-records-forgotten"],
    captions: [cap("memory", "Memory you can read and forget", "headline", at(21, 2), at(23, 1, -6))],
    sfx: [
      { frame: at(22), role: "click", event: "Forget this memory", pan: 0.2 },
      { frame: at(22, 1, 4), role: "pop", event: "the record dissolves" },
    ],
    note: "Settings › Memory: Forget this memory; the record dissolves (cut to settings-memory-forgotten on the click).",
  },
  {
    id: "views",
    chapter: "views",
    from: at(23),
    to: at(26),
    world: "window",
    transitionIn: "object-world",
    ui: ["main-dashboard", "crop-dashboard-chart"],
    captions: [cap("views", "Views, not just text", "headline", at(23, 3), at(26, 1, -6))],
    sfx: [{ frame: at(23), role: "whoosh", event: "the dashboard opens; the chart becomes the world" }],
    note: "The \"Lisbon trip budget\" dashboard; its chart grows past the frame (object becomes the world, 0.65 s).",
  },
  {
    id: "claims",
    chapter: "open-source",
    from: at(26),
    to: at(29),
    world: "sage",
    transitionIn: "flood",
    captions: [
      cap("open-source", "Open source · Apache-2.0", "headline", at(26), at(27, 1, -3)),
      cap("open-source", "No telemetry", "headline", at(27), at(28, 1, -3)),
      cap("open-source", "Your keys stay in your Keychain", "headline", at(28), at(29, 1, -3)),
    ],
    sfx: [{ frame: at(26), role: "downlifter", event: "into the breakdown" }],
    note: "One line per bar on the sage field. (DESIGN.md bans middle-dot strings: FILM_SPEC/lane A may reword line 1.)",
  },
  {
    id: "endcard",
    chapter: "get",
    from: at(29),
    to: GRID.frames,
    world: "paper",
    transitionIn: "flood",
    captions: [
      cap("get", "A little help, right here.", "headline", at(29, 3), END, { key: true, place: "stack" }),
      cap("get", "Free for Macs with Apple silicon", "support", at(30), END, { key: true, place: "stack" }),
      cap("get", "github.com/tohin003/Pebble", "mono", at(30, 2), END, { key: true, place: "stack" }),
      cap("get", "Shown with sample data", "small", at(30, 3), END, { place: "bottom" }),
    ],
    sfx: [{ frame: at(29), role: "hit", event: "end card: the pebble lands in the lockup (the smaller take)" }],
    note:
      "The pebble hops in on the bar-29 downbeat (premium spring) to form the \"pebble.\" lockup; the claim, the CTA " +
      "and the URL land and hold while the back-timed final chord (frame 2160) rings to the end.",
  },
];

/* ================================================================================================================
 * The character (absolute composition seconds; Pebble's own poses only, D6)
 * ============================================================================================================== */

export const FILM_PEBBLE_CUES: readonly PebbleCue[] = [
  { at: -0.5, look: { x: -0.5, y: 0.25 }, note: "before frame 0, so the eyes have already moved: glancing at the pointer, lower left" },
  { at: time(at(1, 2)), look: { x: -0.375, y: 0.375 }, note: "the pointer enters lower left: the eyes go first" },
  { at: time(at(1, 3, -6)), pose: "hover", note: "the pointer reaches the pebble" },
  { at: time(at(1, 3)), pose: "tap", note: "click" },
  { at: time(at(1, 3, 12)), look: null },
  { at: time(at(2, 3)), pose: "sending", note: "the question is sent" },
  { at: time(at(2, 4)), pose: "thinking" },
  { at: time(REVEAL_FRAME - 6), look: { x: 0, y: 0.125 }, note: "lands looking at us" },
  { at: time(REVEAL_FRAME), pose: "tap", note: "lands as the full stop" },
  { at: time(at(10)), pose: "idle" },
  { at: time(at(10)), look: null },
  { at: time(at(11, 2)), pose: "review", note: "the approval card arrives (the \"!\" only here, MASTER_PLAN §4.4)" },
  { at: time(at(12, 2)), pose: "idle" },
  { at: time(at(15, 2)), pose: "testing", note: "tests run in the isolated copy" },
  { at: time(at(16, 1, -3)), look: { x: -0.625, y: -0.25 }, note: "looking at the Verified line (up and to its left)" },
  { at: time(at(16)), pose: "happy", note: "Verified lands" },
  { at: time(at(18)), pose: "idle" },
  { at: time(at(18)), look: null },
  { at: time(at(29)), pose: "tap", note: "end card: lands in the lockup" },
  { at: time(at(30)), pose: "idle" },
  { at: time(at(30)), look: { x: -0.125, y: 0.25 }, note: "looking down at the claim" },
];

/* ================================================================================================================
 * Review frames: gate G1.5's style frames (critic H11) and one frame per bar for contact sheets
 * ============================================================================================================== */

export interface ReviewFrame {
  id: string;
  shot: string;
  frame: number;
  note: string;
}

export const STYLE_FRAMES: readonly ReviewFrame[] = [
  { id: "01-frame0", shot: "hook", frame: 0, note: "frame 0, the thumbnail: the pebble on its desktop" },
  { id: "02-reveal", shot: "reveal", frame: REVEAL_FRAME, note: "the reveal lockup on the bar-8 downbeat (landing squash)" },
  { id: "03-punch-in", shot: "held", frame: at(14, 2), note: "punch-in: AgentGuard's held run, the pointer on its way to Run the tests" },
  { id: "04-payoff", shot: "verified", frame: at(16, 4), note: "the AgentGuard payoff: Verified lifted, the check drawn, the pebble happy" },
  { id: "05-endcard", shot: "endcard", frame: at(32), note: "the end card, everything landed, the final chord ringing" },
];

/** Every downbeat, for contact sheets (MASTER_PLAN §9.4: one frame per bar). */
export const BAR_FRAMES: readonly number[] = Array.from({ length: GRID.bars }, (_, i) => at(i + 1));

export const shotAt = (frame: number): Shot | undefined => SHOTS.find((s) => frame >= s.from && frame < s.to);
export const shotById = (id: string): Shot => {
  const s = SHOTS.find((x) => x.id === id);
  if (!s) throw new Error(`timeline: no shot "${id}"`);
  return s;
};
export const allSfx = (): SfxCue[] => SHOTS.flatMap((s) => s.sfx).sort((a, b) => a.frame - b.frame);
export const allCaptions = (): CaptionCue[] => SHOTS.flatMap((s) => s.captions).sort((a, b) => a.in - b.in);

/* ================================================================================================================
 * Checks
 * ============================================================================================================== */

const wordsIn = (s: string) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** R5 §3: 0.5 s + 0.3 s per word, ≥ 1.2 s (the last line of a shot ≥ 2 s); claims and the CTA readable twice. */
export const minHoldFrames = (c: CaptionCue, last = false): number => {
  const n = wordsIn(c.text);
  const read = Math.max(last ? 2 : 1.2, 0.5 + 0.3 * n);
  return sec(c.key ? Math.max(read, 2, 0.6 * n) : read);
};

/** Every problem in the timeline (an empty list means it is valid). */
export function validateTimeline(): string[] {
  const out: string[] = [...unknownLines];
  if (GRID.framesPerBeat * GRID.beatsPerBar !== GRID.barFrames) out.push("beat map: frames per bar ≠ beats × frames per beat");
  if (at(GRID.bars + 1) !== GRID.frames) out.push(`beat map: ${GRID.bars} bars end on frame ${at(GRID.bars + 1)}, not ${GRID.frames}`);
  let cursor = 0;
  for (const s of SHOTS) {
    if (s.from !== cursor) out.push(`shot ${s.id}: starts on ${s.from}, expected ${cursor} (shots must tile the film)`);
    if (s.to <= s.from) out.push(`shot ${s.id}: empty`);
    if ((s.from - GRID.firstDownbeat) % GRID.barFrames !== 0) out.push(`shot ${s.id}: does not start on a bar line (${s.from})`);
    const solo = s.captions.filter((c) => c.place !== "stack" && c.place !== "bottom");
    s.captions.forEach((c) => {
      if (c.in < s.from || c.in >= s.to) out.push(`shot ${s.id}: "${c.text}" enters outside the shot`);
      if (c.out < END && c.out + sec(0.2) > s.to + 3) out.push(`shot ${s.id}: "${c.text}" is still leaving after the cut`);
      const last = solo[solo.length - 1] === c;
      const need = minHoldFrames(c, last);
      if (c.out - c.in < need) out.push(`shot ${s.id}: "${c.text}" holds ${c.out - c.in} frames, needs ${need}`);
      if (wordsIn(c.text) > 6) out.push(`shot ${s.id}: "${c.text}" has more than 6 words`);
    });
    for (let i = 1; i < solo.length; i++) {
      if (solo[i]!.in < solo[i - 1]!.out) out.push(`shot ${s.id}: "${solo[i]!.text}" enters before "${solo[i - 1]!.text}" leaves`);
    }
    for (const f of s.sfx) if (f.frame < 0 || f.frame > GRID.frames) out.push(`shot ${s.id}: sfx "${f.event}" is outside the film`);
    cursor = s.to;
  }
  if (cursor !== GRID.frames) out.push(`shots end on ${cursor}; the film is ${GRID.frames} frames`);
  if (!SHOTS.some((s) => s.from === REVEAL_FRAME && s.id === "reveal")) out.push(`the reveal shot must start on frame ${REVEAL_FRAME}`);
  out.push(...checkCues(FILM_PEBBLE_CUES, "FILM_PEBBLE_CUES"));
  for (const r of STYLE_FRAMES) {
    const s = SHOTS.find((x) => x.id === r.shot);
    if (!s) out.push(`style frame ${r.id}: unknown shot ${r.shot}`);
    else if (r.frame < s.from || r.frame >= s.to) out.push(`style frame ${r.id}: frame ${r.frame} is outside shot ${s.id}`);
  }
  const risers = allSfx().filter((f) => f.role === "riser");
  if (risers.length !== 1 || risers[0]!.frame !== REVEAL_FRAME) out.push("there must be exactly one riser, ending on the reveal frame");
  return out;
}
