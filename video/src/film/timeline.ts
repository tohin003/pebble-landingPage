// The launch trailer's timeline as DATA (critic C4): every shot and beat, on-screen line, pebble instance, hop and cue,
// click, sound-effect intent, mix-automation span, seam, source-time map and review frame. No React, no Remotion, no
// path aliases: the scenes, the style frames, the cue exporter (bun) and the checks all read this one module.
//
// The film is a trailer (OVERRIDES §38–§42; the blueprint is scratchpad/research/TRAILER_RESEARCH.md §6 and its .json):
// 76.8 s, 32 bars at 100 BPM, 2,304 frames at 30 fps, in four movements: Tension (bars 1–9), Reveal (10–14), Proof
// (15–25) and Title (26–32). docs/FILM_SPEC.md §24 records it; the sections before §24 record the recut it replaces.
//
// Rules validateTimeline() enforces (each one is the blueprint's or the binding overrides', none looser than the
// recut's):
// - every frame comes from the beat map by INDEX (bar, beat, offset), never by accumulating;
// - shots tile the film on bar lines, beats start on beat frames, the reveal lands on beatmap.reveal.frame (f648);
// - every on-screen line is a copy line (src/content/chapters.ts), at most 6 words a line and 3 words a second, held
//   0.5 s + 0.3 s a word and at least 1.2 s (the last line of a shot at least 2 s; the end card's key lines twice);
// - Pebble's own poses only (D6), pose changes at least 14 frames apart (18 into or out of the "!"), and exactly one
//   celebration, from the app's own completion of the held run (f1725);
// - Pebble's own time at 1× inside a shot: only the person's spans may run faster (at most 2×), only waiting states may
//   run slower or freeze, a jump happens only on a cut, and across the cuts of one recording the film never shows two
//   moments closer than they were (TIME HONESTY below);
// - the breaths (the gaps f63, f639, f1647, f2151 and the dead stop f612–638), the two holds (the app's own hold to the
//   cut or to Run the tests), the tail, at most ten slams, Verified held 36 frames with no cut or camera move.
import beatmap from "../../../tools/audio/beatmap.json";
import captions from "../../../docs/film-captions.json";
import { chapters } from "../../../src/content/chapters";
import { bloubCredit } from "../../../src/content/credits";
import { BODY, VIEWBOX_SIZE } from "../../../shared/pebble/character";
import { checkCues, type PebbleCue } from "../../../shared/pebble/cues";
import { gazeToward, type Gaze } from "../../../shared/pebble/gaze";

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
/** Seconds → frames. */
export const sec = (s: number): number => Math.round(s * FPS);
/** Frames → seconds of composition time (pebble cues are in seconds). */
export const time = (frame: number): number => frame / FPS;
const isBeat = (f: number) => (f - GRID.firstDownbeat) % GRID.framesPerBeat === 0;
const isEighth = (f: number) => (f - GRID.firstDownbeat) % (GRID.framesPerBeat / 2) === 0;
const isBar = (f: number) => (f - GRID.firstDownbeat) % GRID.barFrames === 0;

export const DURATION_FRAMES: number = GRID.frames;
/** The drop (bar 10, f648): the pebble lands as the full stop of `pebble`. */
export const REVEAL_FRAME: number = beatmap.reveal.frame;
export const FINAL_CHORD_FRAME: number = beatmap.cues.final_chord_frame;
/** The dead stop (bar 9 beat 3, f612–638): the drive digitally silent, the bed at most −50 dBFS by the score's own
 *  notes, while the pebble hangs; the gap f639–647 follows, with the suck-back rising into the drop. */
export const DEAD_STOP = { from: at(9, 3), to: at(10, 1, -9) } as const;

export type SectionName = "hook" | "tension" | "reveal" | "proof" | "climax" | "breakdown" | "endcard" | "final";
export const SECTIONS = Object.fromEntries(
  beatmap.sections.map((s) => [s.name, { from: s.start_frame, to: s.end_frame, bars: [s.first_bar, s.last_bar] as const }]),
) as Record<SectionName, { from: number; to: number; bars: readonly [number, number] }>;

/* ================================================================================================================
 * Words: every on-screen line is a copy line
 * ============================================================================================================== */

export type ChapterId = "desktop" | "project" | "tested" | "model" | "pace" | "memory" | "views" | "open-source" | "get";

const problems: string[] = [];
const pending: string[] = [];
const captionLines = new Set(
  (captions.cues as { kind: string; lines: string[] }[]).filter((c) => c.kind !== "sound").flatMap((c) => c.lines.filter((l) => !l.startsWith("["))),
);

/** A line of on-screen text: one of the chapter's `onScreen` lines in src/content/chapters.ts (or the bloub credit).
 *  Anything else is a problem (validateTimeline); it never throws at import. */
export function line(chapter: ChapterId, text: string): string {
  const c = chapters.find((ch) => ch.id === chapter);
  if (c && c.onScreen.includes(text)) return text;
  if (text === bloubCredit) return text; // src/content/credits.ts (OVERRIDES §2, verbatim)
  if (captionLines.has(text)) pending.push(`${chapter}: "${text}"`);
  else problems.push(`"${text}" (chapter ${chapter}) is in neither src/content/chapters.ts nor docs/film-captions.json`);
  return text;
}
/** On-screen lines found only in the captions (they must reach chapters.ts too; LaunchFilm treats them as errors). */
export const pendingCopy = (): readonly string[] => pending;

/* ================================================================================================================
 * Geometry. Frame positions are px at each aspect's reference size; UI regions are CSS px of the captured window;
 * desktop units are the riverbed's 1600 × 1000 points.
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
/** The film's three compositions: 16:9, 1:1 and 9:16. */
export type Aspect = "wide" | "square" | "vertical";
export const ASPECT_IDS: readonly Aspect[] = ["wide", "square", "vertical"];
export interface PerAspect<T> {
  wide: T;
  square: T;
  vertical: T;
}
export const per = <T,>(wide: T, square: T, vertical: T): PerAspect<T> => ({ wide, square, vertical });

/** The pet in the desktop world: its centre on the riverbed, the pebble's centre inside the expanded 384 × 456 chat
 *  panel (pet-live-150's hidden avatar), the collapsed pet window's centre-to-foot, and its size at the desktop's scale
 *  (148 desktop units). The loops read PET and PET_PANEL too. */
export const PET = {
  centre: { x: 1080, y: 750 },
  inPanel: { x: 326.7, y: 397.3 },
  centreToFoot: 38.2,
  size: 148,
} as const;
export const PET_FOOT: Point = { x: PET.centre.x, y: PET.centre.y + PET.centreToFoot };
export const PET_PANEL: Rect = { x: PET.centre.x - PET.inPanel.x, y: PET.centre.y - PET.inPanel.y, w: 384, h: 456 };
export const DESKTOP_RECT: Rect = { x: 0, y: 0, w: 1600, h: 1000 };

/**
 * The desktop world's cameras (magnification m = frame px per desktop unit, and where the pebble's centre sits on the
 * frame). The vertical never zooms out below m 1.92 (the wallpaper is 1,000 units tall, the frame 1,920 px).
 * - COLD (bar 1, f0–71): the extreme close-up on the eyes, the pebble low and right of centre on the dark riverbed;
 * - LAND (bar 11, f774–791): the pebble in its corner of the light riverbed, its size the lockup's (210 / 170 px), so
 *   the hop from the lockup lands at the same scale;
 * - CHAT (bars 12–13, f792–917): the whole quick-chat panel (the recut's C1, edge-checked by lane v2-film);
 * - ANSWER (f918–935): a punch-in on the question and Pebble's answer, the pebble out of frame.
 */
export const DESK_CAMERA = {
  cold: { m: per(7.0, 6.0, 7.5), pebbleAt: per({ x: 1180, y: 640 }, { x: 600, y: 620 }, { x: 560, y: 1000 }) },
  land: { m: per(210 / PET.size, 170 / PET.size, 1.92), pebbleAt: per({ x: 1480, y: 760 }, { x: 790, y: 793 }, { x: 760, y: 1440 }) },
  chat: { m: per(2.35, 2.62, 2.62), pebbleAt: per({ x: 1300, y: 938 }, { x: 900, y: 846 }, { x: 900, y: 1400 }) },
  /** panel coordinates (the 384 × 456 quick chat): 16:9 the header's subtitle and the composer stay out (y 62–262);
   *  1:1 and 9:16 keep the answer whole (334 px wide) with the pebble below the frame (9:16: the answer's last line
   *  reaches into the caption band, where no caption plays in bars 12–13) */
  answer: { m: per(5.4, 3.0, 3.14), centre: per({ x: 192, y: 162 }, { x: 192, y: 146 }, { x: 192, y: 48 }) },
  /** where the cold open's pointer drifts in from, rests beside the face (inside the pet window: the attentive pose)
   *  and slides away to (frame px) */
  coldPointer: {
    from: per({ x: 1990, y: 120 }, { x: 1140, y: 120 }, { x: 1140, y: 640 }),
    rest: per({ x: 1560, y: 330 }, { x: 870, y: 330 }, { x: 860, y: 720 }),
    away: per({ x: 2080, y: 1200 }, { x: 1180, y: 1200 }, { x: 1180, y: 2000 }),
  },
  /** where the star beat's pointer comes from (frame px) */
  landPointerFrom: per({ x: 1990, y: 300 }, { x: 1140, y: 300 }, { x: 1140, y: 900 }),
} as const;

/* ================================================================================================================
 * Shots and beats (the blueprint's beat sheet)
 * ============================================================================================================== */

export type World = "desktop" | "night" | "window" | "sage" | "paper";
export type Transition = "cut" | "hard-cut" | "match-cut" | "carry" | "flood" | "zoom-through" | "object-world" | "camera" | "ramp" | "dawn" | "slide";

export interface Beat {
  id: string;
  from: number;
  to: number;
  note: string;
}
export interface Shot {
  id: string;
  chapter: ChapterId;
  /** [from, to) frames, on bar lines */
  from: number;
  to: number;
  world: World;
  transitionIn: Transition;
  ui?: readonly string[];
  beats: readonly Beat[];
}

export const SHOTS: readonly Shot[] = [
  {
    id: "A1",
    chapter: "desktop",
    from: at(1),
    to: at(2),
    world: "desktop",
    transitionIn: "cut",
    beats: [{ id: "LOOK", from: at(1), to: at(2), note: "cold open: the eyes on the dark riverbed follow the pointer, blink near f20, look at the viewer at f54" }],
  },
  {
    id: "A2",
    chapter: "desktop",
    from: at(2),
    to: at(8),
    world: "night",
    transitionIn: "cut",
    ui: ["main-live-film-150-dark (v1.5.0, retake 2b)"],
    beats: [
      { id: "Q1", from: at(2), to: at(3), note: "\"What did it change?\" slammed (landed on the cut)" },
      { id: "G1", from: at(3), to: at(4), note: "glimpse 1: the dates.py diff; Apply edit pressed on f198, the glimpse ends with the press" },
      { id: "Q2", from: at(4), to: at(5), note: "\"Can I undo it?\"" },
      { id: "G2", from: at(5), to: at(6), note: "glimpse 2: Done, the focus on Undo this edit (the card tracked as the drawer moves)" },
      { id: "Q3", from: at(6), to: at(7), note: "\"Did it run the tests?\"" },
      { id: "G3", from: at(7), to: at(8), note: "glimpse 3: the drawer's held state arrives on f445 (Pebble's change isn't verified yet.)" },
    ],
  },
  {
    id: "A3",
    chapter: "desktop",
    from: at(8),
    to: at(10),
    world: "night",
    transitionIn: "cut",
    beats: [
      { id: "TURN", from: at(8), to: at(9), note: "\"An agent shouldn't / grade its own work\" rises, calm" },
      { id: "BUILD", from: at(9), to: at(10), note: "night steps to sage f576–600; the pebble peeks up, looks up, leaps on f612 and hangs through the dead stop" },
    ],
  },
  {
    id: "R1",
    chapter: "desktop",
    from: at(10),
    to: at(12),
    world: "paper",
    transitionIn: "flood",
    beats: [
      { id: "DROP", from: at(10), to: at(11), note: "the drop: the pebble lands as the full stop of `pebble`; paper floods out; \"A small companion for your Mac\"" },
      { id: "STAR", from: at(11), to: at(12), note: "the star beat: the wordmark rolls back, the pebble hops down onto the light desktop (f774) as it slides in" },
    ],
  },
  {
    id: "R2",
    chapter: "desktop",
    from: at(12),
    to: at(14),
    world: "desktop",
    transitionIn: "cut",
    ui: ["pet-live-150-light-hidden (v1.5.0)"],
    beats: [
      { id: "CHAT", from: at(12), to: at(13, 4), note: "the quick chat at 1×: sent on f792, thinking, the answer whole on f898" },
      { id: "ANSWER", from: at(13, 4), to: at(14), note: "punch-in on the question and the answer" },
    ],
  },
  {
    id: "R3",
    chapter: "desktop",
    from: at(14),
    to: at(15),
    world: "window",
    transitionIn: "cut",
    ui: ["main-welcome (v1.5.0, its own pebble hidden)"],
    beats: [{ id: "WHOLE", from: at(14), to: at(15), note: "the whole workspace, \"Good to see you.\", the pebble in its home place" }],
  },
  {
    id: "P1",
    chapter: "views",
    from: at(15),
    to: at(21),
    world: "window",
    transitionIn: "hard-cut",
    ui: ["main-dashboard", "settings-models", "settings-memory", "settings-memory-forgotten", "v150/settings-permissions(-auto)", "main-live-film-150 (the test-file card)", "main-challenge-live"],
    beats: [
      { id: "M1", from: at(15), to: at(16), note: "views: the Lisbon trip budget canvas, then a push into its chart" },
      { id: "M2", from: at(16), to: at(17), note: "your model: the three ways in come forward on beats 1, 2 and 3" },
      { id: "M3", from: at(17), to: at(18), note: "memory: a record is binned on f1170 and dissolves" },
      { id: "M4", from: at(18), to: at(19), note: "permissions: from Ask for approval to Auto in project, chosen on f1260" },
      { id: "M5", from: at(19), to: at(20), note: "your tests stay yours: the waiting test-file card's own reason" },
      { id: "M6", from: at(20), to: at(21), note: "the scope challenge: Details opened on f1386, AgentGuard's evidence check" },
    ],
  },
  {
    id: "P2",
    chapter: "tested",
    from: at(21),
    to: at(26),
    world: "window",
    transitionIn: "hard-cut",
    ui: ["main-live-film-150 (v1.5.0, retake 2b)"],
    beats: [
      { id: "C1", from: at(21), to: at(22), note: "the held run: the hold on f1453 in the drawer; f1494 the conversation's Blocked block" },
      { id: "C2", from: at(22), to: at(23), note: "Run the tests (f1512); the Run isolated tests card; the person reads at 0.74×" },
      { id: "C3", from: at(23), to: at(24), note: "Run tests (f1584); the card reads Running for exactly 2.4 s" },
      { id: "C4", from: at(24), to: at(25), note: "the tests pass (f1656), the Result; Verified (f1723), Evidence before done" },
      { id: "C5", from: at(25), to: at(26), note: "the run completes (f1725): the one celebration; the pull-back to the final reply" },
    ],
  },
  {
    id: "S8",
    chapter: "open-source",
    from: at(26),
    to: at(29),
    world: "sage",
    transitionIn: "hard-cut",
    beats: [{ id: "S8", from: at(26), to: at(29), note: "Free and open source + Apache-2.0, No telemetry, Your keys stay in your Keychain (the recut's)" }],
  },
  {
    id: "S9",
    chapter: "get",
    from: at(29),
    to: GRID.frames,
    world: "paper",
    transitionIn: "flood",
    beats: [{ id: "S9", from: at(29), to: GRID.frames, note: "the title, the final hit with Not notarized beside it, the URL, the small print (the recut's end card)" }],
  },
];

/* ================================================================================================================
 * On-screen text
 * ============================================================================================================== */

/** Roles: Fraunces 350 for hero/headline/side/tagline lines, Inter for support, cta and small, Geist Mono for anything
 *  carrying a number ("data": "Apache-2.0"; "mono": the URL). */
export type TextRole = "hero" | "headline" | "side" | "tagline" | "support" | "data" | "cta" | "mono" | "small";
/** (A) blur, (B) ink, (C) rise, fade; and (S) slam: the line lands ON its `in` frame, its 3-frame pre-roll before it (in
 *  the previous shot when `in` is a cut, so a seam line appears already landed). */
export type Entrance = "blur" | "ink" | "rise" | "fade" | "slam";

export interface TextCue {
  id: string;
  chapter: ChapterId;
  /** the lines as they break on screen (16:9; `squareLines` when the narrow compositions break differently) */
  lines: readonly string[];
  squareLines?: readonly string[];
  role: TextRole;
  enter: Entrance;
  /** the first word's frame; for a slam, its landing frame (at rest from here) */
  in: number;
  /** the frame the exit starts (gone 6 frames later); a frame on a cut means the cut takes it; END = held to the end */
  out: number;
  wordStarts?: readonly number[];
  /** "centre" (y = the block's centre), "baseline" (y = the first line's baseline), "column" (the window world's) */
  place: "centre" | "baseline" | "column";
  y?: PerAspect<number>;
  key?: boolean;
  /** column lines that sit under another cue, by id (none in the trailer) */
  under?: string;
  /** list items (the claims): the list's left edge, and the frame it dims from */
  x?: PerAspect<number>;
  dimAt?: number;
  inkTogether?: boolean;
}

export const SLAM_PREROLL_FRAMES = 3;
export const LIST_DIM = 0.45;
/** The claims list's left edge (the recut's, measured on its renders). */
export const LIST_X = { facts: per(310, 178, 178) } as const;
export const END = GRID.frames + 6;

const t = (c: TextCue): TextCue => {
  line(c.chapter, c.lines.join(" "));
  return c;
};

/** The night cards (bars 2, 4, 6): centred in each aspect's band (9:16's y 250–1670), dead still once landed. */
const CARD_Y = per(540, 540, 960);

export const TEXT: readonly TextCue[] = [
  // The three questions (C-CH-1, word for word): each slams onto its bar's downbeat, appearing already landed on the
  // cut, stays dead still and blurs out over its last 6 frames (the blueprint: "blurs out over its last 6 frames").
  t({ id: "Q1", chapter: "desktop", lines: ["What did it change?"], role: "headline", enter: "slam", in: at(2), out: at(3, 1, -6), place: "centre", y: CARD_Y }),
  t({ id: "Q2", chapter: "desktop", lines: ["Can I undo it?"], role: "headline", enter: "slam", in: at(4), out: at(5, 1, -6), place: "centre", y: CARD_Y }),
  t({ id: "Q3", chapter: "desktop", lines: ["Did it run the tests?"], role: "headline", enter: "slam", in: at(6), out: at(7, 1, -6), place: "centre", y: CARD_Y }),
  // The turn (C-CH-16, the one allowed intent framing): calm, mask rise, lines 4 frames apart; it stays while the
  // pebble peeks up and looks at it, and leaves before the leap (7 words: 2.6 s needed, 3.2 s given).
  t({ id: "T4", chapter: "desktop", lines: ["An agent shouldn't", "grade its own work"], role: "headline", enter: "rise", in: at(8), out: at(9, 2, 6), place: "centre", y: per(420, 420, 820) }),
  // The drop's line (C-CH-2), calm: the pebble is the loud thing. It blurs in word by word as the wordmark unrolls
  // (f650) and leaves on bar 11's downbeat, so the 30-s cut, whose range ends there, shows it whole (2.33 s, 6 words).
  t({ id: "T5", chapter: "desktop", lines: ["A small companion for your Mac"], role: "support", enter: "blur", in: at(10, 1, 2), out: at(11), place: "baseline", y: per(560, 530, 960) }),
  // The montage (bars 15–19): one line a bar in the window world's column, each taken by the next bar's cut.
  t({ id: "MV", chapter: "views", lines: ["Views,", "not just text"], role: "side", enter: "slam", in: at(15), out: at(16), place: "column" }),
  t({ id: "MM", chapter: "model", lines: ["Your model,", "your choice"], role: "side", enter: "blur", in: at(16), out: at(16, 4, 12), place: "column" }),
  t({ id: "MMEM", chapter: "memory", lines: ["Memory you can", "read and forget"], role: "side", enter: "blur", in: at(17), out: at(18), place: "column" }),
  t({ id: "MP", chapter: "pace", lines: ["You set what", "it may do"], role: "side", enter: "rise", in: at(18), out: at(19), place: "column" }),
  t({ id: "MT", chapter: "project", lines: ["Your tests", "stay yours"], role: "side", enter: "slam", in: at(19), out: at(20), place: "column" }),
  // The climax (C-CH-17, C-CH-5, C-AG-5). "Evidence before done" lands with Verified on f1723 (OVERRIDES §41: the 16th
  // push into bar 25), not on an eighth; it holds through the pull-back.
  // "AgentGuard checks the evidence" comes with the cut to the held run (the stopdown follows on f1453) and leaves before
  // Run the tests, so the 30-s cut, which joins there, never shows it in part.
  t({ id: "AG", chapter: "tested", lines: ["AgentGuard checks", "the evidence"], role: "side", enter: "blur", in: at(21), out: at(21, 4, 6), place: "column" }),
  t({ id: "ISO", chapter: "tested", lines: ["Tests run in", "an isolated copy"], role: "side", enter: "blur", in: at(22, 3), out: at(23, 3, 6), place: "column" }),
  t({ id: "EVD", chapter: "tested", lines: ["Evidence", "before done"], squareLines: ["Evidence before done"], role: "side", enter: "slam", in: 1723, out: at(25, 4, 6), place: "column" }),
  // The breakdown and the end card: the recut's, frame for frame (lane v2-film, the energetic recut).
  t({ id: "T15", chapter: "open-source", lines: ["Free and open source"], role: "headline", enter: "slam", in: 1800, out: 1998, dimAt: 1869, place: "centre", y: per(290, 285, 735), x: LIST_X.facts }),
  t({ id: "T15s", chapter: "open-source", lines: ["Apache-2.0"], role: "data", enter: "ink", in: 1806, out: 1998, dimAt: 1869, inkTogether: true, place: "baseline", y: per(425, 400, 850), x: LIST_X.facts }),
  t({ id: "T16", chapter: "open-source", lines: ["No telemetry"], role: "headline", enter: "slam", in: 1872, out: 1998, dimAt: 1923, place: "centre", y: per(530, 505, 955), x: LIST_X.facts }),
  t({ id: "T17", chapter: "open-source", lines: ["Your keys stay in your Keychain"], squareLines: ["Your keys stay", "in your Keychain"], role: "headline", enter: "slam", in: 1926, out: 1998, place: "centre", y: per(690, 690, 1140), x: LIST_X.facts }),
  t({ id: "T18", chapter: "get", lines: ["A little help, right here."], role: "tagline", enter: "blur", in: 2088, out: END, place: "baseline", y: per(560, 520, 950), key: true }),
  // The final hit: "Free for Macs with Apple silicon" slams, and its limit sits right under it in the same voice and
  // size (OVERRIDES §39: "Not notarized" beside the price line; C-F1-3, C-LIM-2). The URL and the small print move
  // down to make room, still above every caption band.
  t({ id: "T19", chapter: "get", lines: ["Free for Macs with Apple silicon"], role: "cta", enter: "slam", in: 2160, out: END, place: "baseline", y: per(676, 618, 1050), key: true }),
  t({ id: "NN", chapter: "get", lines: ["Not notarized"], role: "cta", enter: "blur", in: 2160, out: END, place: "baseline", y: per(740, 676, 1110), key: true }),
  t({ id: "T20", chapter: "get", lines: ["github.com/tohin003/Pebble"], role: "mono", enter: "rise", in: 2164, out: END, place: "baseline", y: per(814, 746, 1186), key: true }),
  t({ id: "T21", chapter: "get", lines: ["Shown with sample data"], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: per(866, 826, 1266) }),
  t({ id: "T22", chapter: "get", lines: [bloubCredit], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: per(902, 866, 1306) }),
];

export const textById = (id: string): TextCue => {
  const c = TEXT.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no text "${id}"`);
  return c;
};

/** The wordmark: the drop's unroll (with the tracking settle) and roll-back, and the title's unroll. */
export const WORDMARK = {
  w1: { unroll: { at: 650, dur: 15 }, settle: { at: 650, to: 673, from: "0.04em", toTracking: "-0.035em" }, rollBack: { at: 738, dur: 15 } },
  w2: { unroll: { at: 2018, dur: 15 } },
} as const;

/* ================================================================================================================
 * The pebble: instances, hops, cues
 * ============================================================================================================== */

export interface HopSpec {
  id: string;
  /** take-off, seconds of composition time */
  at: number;
  duration: number;
  from: PerAspect<Point>;
  to: PerAspect<Point>;
  /** the flight's timing (pebble/acting.ts Hop.timing): linear progress → the progress the flight uses */
  timing?: (u: number) => number;
  /** apex height above the straight line between the feet, px (default 0.45 × the body's height) */
  height?: number;
}

/** A CSS cubic-bezier(x1, y1, x2, y2) easing as pure arithmetic (this module stays free of Remotion). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const poly = (t: number, a1: number, a2: number) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
  const slope = (t: number, a1: number, a2: number) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = poly(t, x1, x2) - x;
      if (Math.abs(dx) < 1e-9) return poly(t, y1, y2);
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - dx / d));
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 60; i++) {
      const v = poly(t, x1, x2);
      if (Math.abs(v - x) < 1e-9) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return poly(t, y1, y2);
  };
}
const EASE_ENTER = cubicBezier(0.16, 1, 0.3, 1);

/**
 * The leap's hang through the dead stop (bar 9): 36 frames from take-off (f612) to the drop (f648). It covers 45 % of
 * its path by f618 (EASE.enter, the take-off's burst), hangs at the apex over f618–642 covering only 10 % (linear),
 * then darts the last 45 % in f642–648 on t², landing on the drop at full speed (0 → 0 and 1 → 1 keep the frames).
 */
export const HANG = (u: number): number => {
  const a = 6 / 36;
  const b = 30 / 36;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < a) return 0.45 * EASE_ENTER(u / a);
  if (u < b) return 0.45 + (0.1 * (u - a)) / (b - a);
  const w = (u - b) / (1 - b);
  return 0.55 + 0.45 * w * w;
};

/** The lockup's foot (the reveal and the end card) and the pebble's size in the type worlds. */
export const LOCKUP_FOOT = per({ x: 1295, y: 422 }, { x: 806, y: 402 }, { x: 806, y: 832 });
export const TYPE_PEBBLE = per(210, 170, 170);
/** The pebble's body height in frame px at a viewBox box of `size` px. */
export const bodyPx = (size: number) => (BODY.height * size) / VIEWBOX_SIZE;
/** Bar 9's peek: the foot below the frame's bottom edge so that the eyes just clear it (the body's lower 40 %). */
export const PEEK_FOOT = per(
  { x: 960, y: 1080 + 0.4 * bodyPx(210) },
  { x: 540, y: 1080 + 0.4 * bodyPx(170) },
  { x: 540, y: 1670 + 0.4 * bodyPx(170) },
);
/** Where the star beat's hop lands: the desktop pet's foot under the LAND camera (frame px). */
export const landFoot = (a: Aspect): Point => {
  const c = DESK_CAMERA.land;
  return { x: c.pebbleAt[a].x, y: c.pebbleAt[a].y + PET.centreToFoot * c.m[a] };
};

export const HOPS: readonly HopSpec[] = [
  // H1, the peek (bar 9): the crown rises out of the frame's bottom edge from f576; the eyes clear it by f582
  { id: "H1", at: time(576), duration: 0.2, height: 10, from: per({ x: 960, y: 1240 }, { x: 540, y: 1200 }, { x: 540, y: 1790 }), to: PEEK_FOOT },
  // H2, the leap: take-off on the dead stop's first frame (f612), the hang, the landing on the drop (f648)
  { id: "H2", at: time(at(9, 3)), duration: 1.2, timing: HANG, from: PEEK_FOOT, to: LOCKUP_FOOT },
  // H3, the star beat: from the lockup down onto the light desktop as it slides in (take-off f756, lands f774)
  { id: "H3", at: time(756), duration: 0.6, from: LOCKUP_FOOT, to: per(landFoot("wide"), landFoot("square"), landFoot("vertical")) },
  // H4, into the end card (the recut's): lands on bar 29 as the full stop of `pebble.`
  { id: "H4", at: time(2002), duration: 0.467, from: per({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }, { x: 1180, y: 2010 }), to: LOCKUP_FOOT },
];

/**
 * The pebble instances. `offset` shifts an instance's engine clock (and its cues with it), so its natural blink
 * schedule falls where the beat wants one: the cold open's near f20, the star beat's near f785. Poses and looks keep
 * their film frames.
 */
export const PEBBLE_INSTANCES = {
  /** bar 1: in the dark desktop world at the pet's place, the dark theme's colours (tokens.css@v1.5.0: #b4cda6, #23351f) */
  open: { from: 0, to: 72, offset: 22 },
  /** bars 9–11: peeks up (H1), leaps (H2) to the lockup, hops down onto the desktop (H3); dark until the flood reaches it */
  main: { from: 576, to: at(12), start: per({ x: 960, y: 1240 }, { x: 540, y: 1200 }, { x: 540, y: 1790 }), hops: ["H1", "H2", "H3"], lightFrom: REVEAL_FRAME, offset: 36 },
  /** bars 12–13: in the light desktop world at the pet's place (the same engine clock as `main`) */
  desk: { from: at(12), to: at(13, 4), offset: 36 },
  /** bar 14: in the home pebble's place of the whole window */
  whole: { from: 936, to: 1008, offset: 0 },
  /** bars 21–25: on its line at the window world's spot */
  climax: { from: 1440, to: 1800, offset: 0 },
  /** the end card's: off frame lower right, H4; dark until f2016, then light */
  end: { from: 1999, to: GRID.frames, start: per({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }, { x: 1180, y: 2010 }), hops: ["H4"], lightFrom: 2016, offset: 0 },
} as const;

const cue = (frame: number, c: Omit<PebbleCue, "at">): PebbleCue => ({ at: time(frame), ...c });
type Look = { x: number; y: number };
const look = (a: Aspect, wide: Look, square: Look, vertical: Look): Look => per(wide, square, vertical)[a];

/** The cold open's first look (before frame 0): toward the pointer's entry point, as the app's gaze rule computes it
 *  (gazeToward from the pebble's box under COLD, reach 200 desktop units × m). */
export function entryLook(a: Aspect): Gaze {
  const m = DESK_CAMERA.cold.m[a];
  const centre = DESK_CAMERA.cold.pebbleAt[a];
  const unit = (PET.size * m) / VIEWBOX_SIZE;
  const foot = { x: centre.x, y: centre.y + PET.centreToFoot * m };
  const w = BODY.width * unit;
  const h = BODY.height * unit;
  const box = { left: foot.x - w / 2, top: foot.y - BODY.bottom * unit - h / 2, width: w, height: h };
  const from = DESK_CAMERA.coldPointer.from[a];
  return gazeToward(from.x, from.y, box, 200 * m) ?? { x: 0, y: 0 };
}

/**
 * The static cues, as the app's reducer (companionState.ts@v1.5.0) poses each moment the film shows (the pointer-driven
 * looks are computed by film/gaze.ts and merged in):
 * - bar 1: idle; hover (the "attentive" pose) while the pointer is in the pet window; the look at the viewer on f54;
 * - bars 9–11: idle while it peeks and looks up; tap as it lands as the full stop (the recut's reveal); idle;
 * - bars 12–13 (pet-live-150, 1×): sending on the send (f792); thinking (the app from f799; 14 frames later so the
 *   engine's 0.45 s morph shows it); the 3-frame writing before the run completes is left out (the app's own morph
 *   never reaches it); idle when the task completes (f900). The app turns happy at the host's idle (f918, 7.20 s):
 *   the film punches in on the answer on that beat, with the pebble out of frame, so the trailer keeps one celebration;
 * - bar 14: idle (the home pebble the capture shows);
 * - bars 21–25: writing while the repair reply streams (from before the cut), blocked at the hold (f1453), the "!" of
 *   review while the tests card waits and while its tests run (the run stays waiting_approval), thinking when the run
 *   resumes (f1656), happy from the app's own completion and idle (f1725): the film's one celebration;
 * - the end card: the recut's.
 */
function cuesFor(a: Aspect): PebbleCue[] {
  return [
    cue(-15, { look: entryLook(a), note: "before frame 0 the eyes turn to where the pointer will enter, so the thumbnail looks somewhere" }),
    cue(0, { pose: "idle" }),
    cue(14, { pose: "hover", note: "the pointer is in the pet window (the app's attentive pose)" }),
    cue(40, { pose: "idle", note: "the pointer has left the pet window" }),
    cue(54, { look: { x: 0, y: 0 }, note: "looks straight at the viewer" }),
    cue(72, { look: null }),
    cue(594, { look: { x: 0, y: -0.875 }, note: "the peek: looks up at the line" }),
    cue(603, { look: look(a, { x: 0.375, y: -1 }, { x: 0.375, y: -1 }, { x: 0.375, y: -1 }), note: "eyes lead the leap toward the lockup" }),
    cue(REVEAL_FRAME, { pose: "tap", note: "lands as the full stop: the drop" }),
    cue(REVEAL_FRAME + 12, { look: null }),
    cue(684, { pose: "idle", note: "tap ends (1.2 s)" }),
    cue(744, { look: look(a, { x: 0.25, y: 0.875 }, { x: 0, y: 0.875 }, { x: 0, y: 0.875 }), note: "eyes lead the hop down" }),
    cue(780, { look: null }),
    cue(at(12), { pose: "sending", note: "the question is sent (Enter, 3.00 s)" }),
    cue(806, { pose: "thinking", note: "Thinking (3.233 s on f799)" }),
    cue(900, { pose: "idle", note: "the task completes (6.60 s)" }),
    cue(at(14), { pose: "idle", note: "the home pebble (main-welcome@v1.5.0)" }),
    cue(1436, { pose: "writing", note: "the repair reply streams into the drawer (13.47–13.90 s)" }),
    cue(1453, { pose: "blocked", note: "verification required (14.033 s): AgentGuard holds the task" }),
    cue(1517, { pose: "review", note: "the Run isolated tests card waits (16.133 s); its tests run inside the approval" }),
    cue(1656, { pose: "thinking", note: "the tests end (20.20 s); the run is queued and running again" }),
    cue(1725, { pose: "happy", note: "the run completes (22.50 s), the host's idle on the same frame: the one celebration" }),
    cue(1800, { pose: "idle", note: "not drawn until the end card" }),
    cue(1999, { look: look(a, { x: -0.75, y: -0.75 }, { x: -0.375, y: -0.875 }, { x: -0.25, y: -0.875 }), note: "P-end: eyes lead the landing" }),
    cue(2016, { pose: "tap", note: "lands in the end-card lockup" }),
    cue(2030, { look: null }),
    cue(2052, { pose: "idle" }),
    cue(2166, { look: { x: -0.625, y: 0.75 }, note: "glances at the URL" }),
    cue(2214, { look: { x: 0, y: 0 }, note: "looks at the viewer to the end" }),
  ];
}
export const FILM_PEBBLE_CUES: PerAspect<readonly PebbleCue[]> = per(cuesFor("wide"), cuesFor("square"), cuesFor("vertical"));
/** The one celebration: the app's own completion of the held run (source 22.50 s on f1725). */
export const CELEBRATION_FRAME = 1725;

/* ================================================================================================================
 * Clicks, sound effects, mix automation, seams
 * ============================================================================================================== */

export interface Click {
  frame: number;
  target: string;
  shot: string;
  /** the recording's own click time (seconds) and which map shows it, when the click is the app's real one */
  source?: { map: SourceMapId; s: number };
}
export const CLICKS: readonly Click[] = [
  { frame: at(3, 4), target: "Apply edit (invoice_kit/dates.py)", shot: "G1", source: { map: "g1", s: 276 / 30 } },
  { frame: at(17, 2), target: "the bin (Forget this memory)", shot: "M3" },
  { frame: at(18, 3), target: "Auto in project", shot: "M4" },
  { frame: at(20, 2), target: "Details (the refused step)", shot: "M6", source: { map: "m6", s: 270 / 30 } },
  { frame: at(22), target: "Run the tests", shot: "C1", source: { map: "climax", s: 480 / 30 } },
  { frame: at(23), target: "Run tests", shot: "C2", source: { map: "climax", s: 534 / 30 } },
];

/** Roles of tools/audio/sfx_kit.json. `suck`: the reverse swell that ends on a hit inside a breath gap (the trailer's;
 *  the score's own stems carry the other suck-backs, which a gap would swallow). */
export type SfxRole = "click" | "pop" | "tick" | "thud" | "whoosh" | "riser" | "hit" | "shimmer" | "impact" | "ui" | "rim" | "key" | "thump" | "suck";
export interface SfxCue {
  /** the PICTURE frame; the exporter puts the peak one frame later (a suck-back's END sits on its frame) */
  frame: number;
  role: SfxRole;
  take: string;
  event: string;
  pan?: number;
  duckDb?: number;
}
/**
 * The trailer's effects (the blueprint's music §11 and beat sheet, OVERRIDES §41): designed UI sounds on the real
 * events, the kit's impacts on the hits the score doesn't carry alone, the suck-backs that live inside the breath gaps,
 * the rim ticks that keep the beat in both holds, and a whoosh on each montage cut. Pebble 1.5.0 makes no sounds: these
 * are the film's sound design (the description says so). The score carries the question hits, the riser into the dead
 * stop, the crashes and the downlifter. Each effect peaks at picture + 1 (the exporter's job); at most three at once.
 */
export const SFX: readonly SfxCue[] = [
  { frame: at(2), role: "suck", take: "suck_a", event: "the suck-back into the first question (inside the f63 gap)" },
  { frame: at(3, 4), role: "click", take: "click_b", event: "Apply edit (glimpse 1)", pan: 0.18 },
  { frame: at(5), role: "ui", take: "ui_done", event: "Done, with Undo this edit, on the cut" },
  { frame: 445, role: "ui", take: "ui_lock", event: "AgentGuard holds the task (glimpse 3): the music stops with it" },
  { frame: at(7, 2), role: "rim", take: "rim_a", event: "the hold's clock (bar 7, beat 2)" },
  { frame: at(7, 3), role: "rim", take: "rim_b", event: "the hold's clock (bar 7, beat 3)" },
  { frame: at(7, 4), role: "rim", take: "rim_a", event: "the hold's clock (bar 7, beat 4)" },
  { frame: REVEAL_FRAME, role: "suck", take: "suck_a", event: "the suck-back into the drop (inside the f639 gap)" },
  { frame: REVEAL_FRAME, role: "impact", take: "impact_a", event: "the drop: the pebble lands as the full stop", duckDb: 2.5 },
  { frame: REVEAL_FRAME, role: "thud", take: "thud_a", event: "texture under the drop" },
  { frame: 774, role: "whoosh", take: "whoosh_a", event: "the pebble lands on the desktop as it slides in" },
  { frame: at(12), role: "key", take: "tick_c", event: "the question is sent (Enter)" },
  { frame: at(14, 1, -1), role: "whoosh", take: "whoosh_b", event: "the cut to the whole workspace" },
  { frame: at(14), role: "impact", take: "impact_b", event: "the whole workspace (bar 14)" },
  { frame: at(15), role: "impact", take: "impact_a", event: "the montage lift", duckDb: 1.5 },
  { frame: at(15, 3, 2), role: "whoosh", take: "whoosh_c", event: "the chart grows to fill the stage (its fastest frame)" },
  { frame: at(16, 1, -1), role: "whoosh", take: "whoosh_a", event: "the montage cut to Models" },
  { frame: at(17, 1, -1), role: "whoosh", take: "whoosh_b", event: "the montage cut to Memory" },
  { frame: at(17, 2), role: "click", take: "click_c", event: "the bin (Forget this memory)", pan: 0.3 },
  { frame: at(17, 2), role: "ui", take: "ui_forget", event: "the record dissolves" },
  { frame: at(18, 1, -1), role: "whoosh", take: "whoosh_c", event: "the montage cut to Permissions" },
  { frame: at(18, 3), role: "click", take: "click_a", event: "Auto in project", pan: 0.1 },
  { frame: at(19, 1, -1), role: "whoosh", take: "whoosh_a", event: "the montage cut to the test-file card" },
  { frame: at(19), role: "ui", take: "ui_card", event: "the test-file card waiting for you" },
  { frame: at(20, 1, -1), role: "whoosh", take: "whoosh_b", event: "the montage cut to the scope challenge" },
  { frame: at(20, 2), role: "click", take: "click_b", event: "Details (the refused step)", pan: 0.3 },
  { frame: 1453, role: "ui", take: "ui_lock", event: "AgentGuard holds the task (the held run): the stopdown" },
  { frame: at(21, 2), role: "rim", take: "rim_b", event: "the hold's clock (bar 21, beat 2)" },
  { frame: at(21, 3), role: "rim", take: "rim_a", event: "the hold's clock (bar 21, beat 3)" },
  { frame: at(21, 4), role: "rim", take: "rim_b", event: "the hold's clock (bar 21, beat 4)" },
  { frame: at(22), role: "click", take: "click_c", event: "Run the tests: it releases the hold", pan: -0.25 },
  { frame: at(23), role: "click", take: "click_a", event: "Run tests: the groove returns", pan: 0.3 },
  { frame: at(24, 1, -5), role: "tick", take: "tick_b", event: "a soft tick alone in the breath before the tests pass" },
  { frame: at(24), role: "impact", take: "impact_b", event: "the tests pass: the card reads Done (the score's first big hit)", duckDb: 1.5 },
  { frame: at(24), role: "ui", take: "ui_done", event: "the tests card reads Done" },
  { frame: 1723, role: "impact", take: "impact_a", event: "Verified: the climax's peak, the 16th push into bar 25", duckDb: 1.5 },
  { frame: 1723, role: "ui", take: "ui_verified", event: "Verified · pytest 42 passed on current files" },
  { frame: at(26), role: "impact", take: "impact_b", event: "the breakdown's one hit" },
  { frame: at(29), role: "thud", take: "thud_b", event: "the title: the end-card landing", duckDb: 1.5 },
  { frame: at(29), role: "impact", take: "impact_b", event: "the title: the end-card landing" },
  { frame: FINAL_CHORD_FRAME, role: "impact", take: "impact_a", event: "the final hit", duckDb: 2 },
];

/**
 * Mix automation (tools/audio/sfx_kit.json "automation"): spans, not effects; the exporter writes each into
 * tools/audio/cues.json with no file, mix_master.py applies it, cut_cues.py clips it to a cut's ranges.
 * - gap: the bed and the drive −24 dB from `frame` to `toFrame`, the hit frame (9 frames each, ending the frame before
 *   a bar line): f63 (into the first question), f639 (inside the dead stop, into the drop), f1647 (into the tests
 *   passing) and f2151 (into the final hit);
 * - hold: from the frame the app holds the task (the drive muted, the bed −6 dB behind a 1.2 kHz low-pass) to
 *   `toFrame`, released to `releaseFrame`: glimpse 3's from f445 to the cut to the turn (f504), released over the turn
 *   to bar 9 (f576); the held run's from f1453 to the Run the tests click (f1512), released across bar 22 to f1584;
 * - tail: the master fades from f2214 on an equal-power curve, then digital silence from f2250 to the end.
 * The dead stop (f612–638) has no automation: the score is silent there by its own notes.
 */
export type AutomationRole = "gap" | "hold" | "tail" | "ride";
export interface AutomationCue {
  role: AutomationRole;
  frame: number;
  toFrame: number;
  releaseFrame?: number;
  event: string;
}
export const AUTOMATION: readonly AutomationCue[] = [
  { role: "gap", frame: at(1, 4, 9), toFrame: at(2), event: "the breath before the first question's hit" },
  { role: "hold", frame: 445, toFrame: at(8), releaseFrame: at(9), event: "Pebble's hold in glimpse 3: the music stops with it; released over the turn" },
  { role: "gap", frame: at(9, 4, 9), toFrame: at(10), event: "inside the dead stop, before the drop" },
  { role: "hold", frame: 1453, toFrame: at(22), releaseFrame: at(23), event: "the held run: the stopdown; Run the tests releases it and the filter opens across bar 22" },
  { role: "gap", frame: at(23, 4, 9), toFrame: at(24), event: "the breath before the tests pass" },
  { role: "gap", frame: at(30, 4, 9), toFrame: at(31), event: "the breath before the final hit" },
  { role: "tail", frame: at(31, 4), toFrame: at(32, 2), event: "the master fades, then digital silence to the end" },
];

export interface Seam {
  frame: number;
  kind: Transition;
  cause: string;
}
export const SEAMS: readonly Seam[] = [
  { frame: at(2), kind: "hard-cut", cause: "the first question, on the hit" },
  { frame: at(3), kind: "ramp", cause: "glimpse 1 rises out of the night over f140–146" },
  { frame: at(4), kind: "hard-cut", cause: "the second question, on the hit" },
  { frame: at(5), kind: "ramp", cause: "glimpse 2 rises over f284–290; Done arrives on the cut" },
  { frame: at(6), kind: "hard-cut", cause: "the third question, on the biggest of the three hits" },
  { frame: at(7), kind: "ramp", cause: "glimpse 3 rises over f428–434" },
  { frame: at(8), kind: "hard-cut", cause: "the turn: the hold gives way to the intent line" },
  { frame: at(9), kind: "dawn", cause: "the field steps from night to sage as the pebble peeks up" },
  { frame: REVEAL_FRAME, kind: "flood", cause: "the pebble's landing pushes paper out from where it lands" },
  { frame: 756, kind: "slide", cause: "the pebble hops down; the light desktop slides in under it" },
  { frame: at(12), kind: "hard-cut", cause: "a punch-in cut to the quick chat as the question is sent" },
  { frame: at(13, 4), kind: "hard-cut", cause: "a punch-in on the answer (the pebble out of frame)" },
  { frame: at(14), kind: "hard-cut", cause: "the whole workspace, on the bar" },
  { frame: at(15), kind: "hard-cut", cause: "the montage lift" },
  { frame: at(16), kind: "hard-cut", cause: "montage: your model" },
  { frame: at(17), kind: "hard-cut", cause: "montage: memory" },
  { frame: at(18), kind: "hard-cut", cause: "montage: permissions" },
  { frame: at(19), kind: "hard-cut", cause: "montage: your tests stay yours" },
  { frame: at(20), kind: "hard-cut", cause: "montage: the scope challenge" },
  { frame: at(21), kind: "hard-cut", cause: "the held run, whole: the callback to glimpse 3" },
  { frame: at(21, 4), kind: "hard-cut", cause: "the conversation's held run, after the person's scroll" },
  { frame: at(22, 1, 4), kind: "match-cut", cause: "on the Run the tests click's rebound: the Run isolated tests card it put in the drawer" },
  { frame: at(26), kind: "hard-cut", cause: "the breakdown, on the downbeat" },
  { frame: at(29), kind: "flood", cause: "the pebble lands; paper spreads from it" },
];

/* ================================================================================================================
 * Source-time maps (film frame → source seconds of the recordings; linear between keys) and TIME HONESTY
 * ============================================================================================================== */

/**
 * A key: the source time shown on film frame `frame`. The segment from a key to the next is linear, and `kind` says
 * whose time it is: "pebble" (Pebble's own: exactly 1×), "person" (the person's span: faster, at most 2×), "waiting"
 * (the app waits for the person: slower than 1×, or a freeze). `cut: true` starts a new segment (a jump), allowed only
 * on a seam.
 */
export interface SourceKey {
  frame: number;
  s: number;
  kind?: "pebble" | "person" | "waiting";
  cut?: boolean;
}
export type SourceMapId = "g1" | "g2" | "g3" | "chat" | "m5" | "m6" | "climax";
/** Which recording each map plays. */
export const MAP_RECORDING: Record<SourceMapId, "dark" | "light" | "pet" | "challenge" | "still"> = {
  g1: "dark",
  g2: "dark",
  g3: "dark",
  chat: "pet",
  // bar 19 shows one frame of the run (the test-file card waiting) as a montage moment, a freeze on a waiting state
  // like the montage's other stills: it is not a shot of the run's continuity, so the across-cuts rule leaves it out
  m5: "still",
  m6: "challenge",
  climax: "light",
};
const s30 = (f: number) => f / 30;
export const SOURCE_MAPS: Record<SourceMapId, readonly SourceKey[]> = {
  /** glimpse 1 (bar 3, f = source − 78): the dates.py card waiting at 1×; on f198 the press is drawn over the last
   *  frame before the click (9.167 s, the card still waiting), and the glimpse ramps out with it (f198–203) */
  g1: [
    { frame: 140, s: s30(218), kind: "pebble" },
    { frame: 197, s: s30(275), kind: "waiting" },
    { frame: 203, s: s30(275) },
  ],
  /** glimpse 2 (bar 5, f = source − 36): Done in place on the cut (10.80 s on f288), to 13.167 s at 1× */
  g2: [
    { frame: 284, s: s30(320), kind: "pebble" },
    { frame: 359, s: s30(395) },
  ],
  /** glimpse 3 (bar 7, f = source + 24): 13.47–16.0 s at 1×; the hold on f445 (14.033 s) */
  g3: [
    { frame: 428, s: s30(404), kind: "pebble" },
    { frame: 503, s: s30(479) },
  ],
  /** the quick chat (bars 12–13, f = source + 702): the send on f792 (3.00 s), the answer whole on f898 (6.533 s),
   *  "Task: completed" on f900, held to f935 (7.767 s), all at 1× */
  chat: [
    { frame: at(12), s: s30(90), kind: "pebble" },
    { frame: at(14, 1, -1), s: s30(233) },
  ],
  /** your tests stay yours (bar 19): the tests/test_dates.py card waiting for the person (9.50 s), a freeze on a
   *  waiting state: it waits for Apply edit until 9.70 s */
  m5: [
    { frame: at(19), s: s30(285), kind: "waiting" },
    { frame: at(20, 1, -1), s: s30(285) },
  ],
  /** the scope challenge (bar 20, f = source + 1116): the red refused step (since 7.733 s), the person opens Details on
   *  f1386 (9.00 s), their scroll f1398–1413, still to f1439 (10.767 s), all at 1× */
  m6: [
    { frame: at(20), s: s30(252), kind: "pebble" },
    { frame: at(21, 1, -1), s: s30(323) },
  ],
  /**
   * The climax (light): bar 21 at 1× (f = source + 1032: 13.60–15.967 s; the hold on f1453); Run the tests on f1512
   * (16.00 s) and Pebble's answer at 1× to the card's arrival (f1516, 16.133 s); the person reads the card at 0.74×
   * (a waiting state) to Run tests on f1584 (17.80 s); then 1× (f = source + 1050): Running to f1655, Done on f1656
   * (20.20 s), the Result in view by f1680, Verified on f1723 (22.433 s), completion on f1725 (22.50 s), to f1799.
   */
  climax: [
    { frame: at(21), s: s30(408), kind: "pebble" },
    { frame: at(22), s: s30(480), kind: "pebble" },
    { frame: at(22, 1, 4), s: s30(484), kind: "waiting" },
    { frame: at(23), s: s30(534), kind: "pebble" },
    { frame: at(26, 1, -1), s: s30(749) },
  ],
};

/** Source seconds shown on film frame `frame` (linear between keys; a `cut` key starts a new segment), or null. */
export function sourceAt(map: readonly SourceKey[], frame: number): number | null {
  if (!map.length || frame < map[0]!.frame || frame > map[map.length - 1]!.frame) return null;
  for (let i = map.length - 1; i >= 0; i--) {
    const a = map[i]!;
    if (frame >= a.frame) {
      const b = map[i + 1];
      if (!b || b.cut) return a.s;
      return a.s + ((b.s - a.s) * (frame - a.frame)) / (b.frame - a.frame);
    }
  }
  return null;
}
/** The recorded frame index shown on film frame `frame` (round(s × 30)). */
export const sourceFrameAt = (map: readonly SourceKey[], frame: number): number | null => {
  const s = sourceAt(map, frame);
  return s === null ? null : Math.round(s * 30 + 1e-6);
};

/** The trailer's anchor moments, from the maps (OVERRIDES §41): checked against the manifests' source times. */
export const MOMENTS = {
  /** glimpse 3's and the held run's hold (14.033 s) */
  hold: { g3: 445, climax: 1453, s: 421 / 30 },
  /** the tests end: the card reads Done (20.20 s) */
  testsPass: { frame: at(24), s: 606 / 30 },
  /** Verified (22.433 s) and completion (22.50 s) */
  verified: { frame: 1723, s: 673 / 30 },
  completion: { frame: CELEBRATION_FRAME, s: 675 / 30 },
  /** the quick chat's answer whole (6.533 s) and "Task: completed" (6.60 s) */
  answer: { frame: 898, s: 196 / 30 },
} as const;

/* ================================================================================================================
 * Review frames
 * ============================================================================================================== */

export interface ReviewFrame {
  id: string;
  shot: string;
  frame: number;
  note: string;
}
/** Style frames: every beat's key frame (rendered in all three aspects through StyleFrames*). */
export const STYLE_FRAMES: readonly ReviewFrame[] = [
  { id: "SF01", shot: "A1", frame: 0, note: "the thumbnail: the eyes on the dark riverbed, turned toward the pointer's entry" },
  { id: "SF02", shot: "A1", frame: 28, note: "the pointer beside the face, the eyes on it (attentive)" },
  { id: "SF03", shot: "A2", frame: 100, note: "Q1 on the night field" },
  { id: "SF04", shot: "A2", frame: 190, note: "glimpse 1: the diff and Apply edit, the pointer arriving" },
  { id: "SF05", shot: "A2", frame: 198, note: "glimpse 1: the press" },
  { id: "SF06", shot: "A2", frame: 250, note: "Q2" },
  { id: "SF07", shot: "A2", frame: 330, note: "glimpse 2: Done, the focus on Undo this edit" },
  { id: "SF08", shot: "A2", frame: 400, note: "Q3" },
  { id: "SF09", shot: "A2", frame: 470, note: "glimpse 3: Pebble's change isn't verified yet." },
  { id: "SF10", shot: "A3", frame: 540, note: "the turn" },
  { id: "SF11", shot: "A3", frame: 596, note: "the peek: the pebble looks up at the line, sage" },
  { id: "SF12", shot: "A3", frame: 630, note: "the hang through the dead stop" },
  { id: "SF13", shot: "R1", frame: 690, note: "the drop's lockup with A small companion for your Mac" },
  { id: "SF14", shot: "R1", frame: 764, note: "the star beat: the hop down, the desktop sliding in" },
  { id: "SF15", shot: "R1", frame: 788, note: "the pebble on the light desktop, the pointer arriving" },
  { id: "SF16", shot: "R2", frame: 850, note: "the quick chat: thinking" },
  { id: "SF17", shot: "R2", frame: 910, note: "the answer whole, Task: completed" },
  { id: "SF18", shot: "R2", frame: 926, note: "the punch-in on the answer" },
  { id: "SF19", shot: "R3", frame: 980, note: "the whole workspace, the pebble in its home place" },
  { id: "SF20", shot: "P1", frame: 1060, note: "views: the push into the chart, landed" },
  { id: "SF21", shot: "P1", frame: 1124, note: "your model: Continue with ChatGPT comes forward" },
  { id: "SF22", shot: "P1", frame: 1200, note: "memory: the record forgotten" },
  { id: "SF23", shot: "P1", frame: 1280, note: "permissions: Auto in project chosen" },
  { id: "SF24", shot: "P1", frame: 1350, note: "your tests stay yours" },
  { id: "SF25", shot: "P1", frame: 1425, note: "the scope challenge's evidence check" },
  { id: "SF26", shot: "P2", frame: 1470, note: "the held run: the drawer's held state, AgentGuard checks the evidence" },
  { id: "SF27", shot: "P2", frame: 1508, note: "the conversation's Blocked block, the pointer on Run the tests" },
  { id: "SF28", shot: "P2", frame: 1566, note: "the Run isolated tests card, Tests run in an isolated copy" },
  { id: "SF29", shot: "P2", frame: 1640, note: "the card reads Running" },
  { id: "SF30", shot: "P2", frame: 1690, note: "the Result: 42 passed" },
  { id: "SF31", shot: "P2", frame: 1740, note: "Verified in focus, Evidence before done, the pebble happy" },
  { id: "SF32", shot: "P2", frame: 1795, note: "the final reply after the pull-back, the celebration" },
  { id: "SF33", shot: "S8", frame: 1960, note: "the claims list" },
  { id: "SF34", shot: "S9", frame: 2120, note: "the title with A little help, right here." },
  { id: "SF35", shot: "S9", frame: 2280, note: "the end card, everything landed" },
];
/** Every downbeat, for contact sheets (one frame per bar). */
export const BAR_FRAMES: readonly number[] = Array.from({ length: GRID.bars }, (_, i) => at(i + 1));

export const shotAt = (frame: number): Shot | undefined => SHOTS.find((s) => frame >= s.from && frame < s.to);
export const beatAt = (frame: number): Beat | undefined => shotAt(frame)?.beats.find((b) => frame >= b.from && frame < b.to);
export const shotById = (id: string): Shot => {
  const s = SHOTS.find((x) => x.id === id);
  if (!s) throw new Error(`timeline: no shot "${id}"`);
  return s;
};
/** Every frame something is cut (seams that are not camera moves, plus every beat boundary inside a shot). */
export const CUT_FRAMES: readonly number[] = SEAMS.filter((s) => s.kind !== "camera").map((s) => s.frame);

/* ================================================================================================================
 * Checks
 * ============================================================================================================== */

const wordsIn = (s: string) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** 0.5 s + 0.3 s per word, at least 1.2 s (the last line of a shot at least 2 s); the end card's key lines readable
 *  twice (at least 2 s and 0.6 s a word). */
export const minHoldFrames = (c: TextCue, last = false): number => {
  const n = wordsIn(c.lines.join(" "));
  const read = Math.max(last ? 2 : 1.2, 0.5 + 0.3 * n);
  return sec(c.key ? Math.max(read, 2, 0.6 * n) : read);
};

/** A camera move's span on one aspect's frames ([from, to): it starts moving after `from`, arrives on `to`). */
export interface CameraMove {
  aspect: Aspect;
  from: number;
  to: number;
  what: string;
}

/** The breaths: the four gaps and the dead stop, [from, to) with the hit on `to`. */
export const breaths = (): { from: number; to: number; what: string }[] => [
  ...AUTOMATION.filter((a) => a.role === "gap").map((g) => ({ from: g.frame, to: g.toFrame, what: `the gap f${g.frame}–${g.toFrame - 1}` })),
  { from: DEAD_STOP.from, to: DEAD_STOP.to, what: `the dead stop f${DEAD_STOP.from}–${DEAD_STOP.to - 1}` },
];
/** The blueprint's breath gaps (and nothing else). */
export const GAP_FRAMES = [63, 639, 1647, 2151] as const;
/** Verified is held 36 frames (1.2 s): no cut and no camera move from its frame. */
export const VERIFIED_HOLD = { from: MOMENTS.verified.frame, to: MOMENTS.verified.frame + 36 } as const;
export const MAX_SLAMS = 10;

/** Every problem in the timeline (an empty list means it is valid). `camera`: the scenes' camera moves, when the
 *  caller has them (LaunchFilm does; the cue exporter, free of Remotion, checks everything else). */
export function validateTimeline(camera: readonly CameraMove[] = []): string[] {
  const out: string[] = [...problems, ...pending.map((p) => `copy only in the captions, not in chapters.ts: ${p}`)];
  if (GRID.framesPerBeat * GRID.beatsPerBar !== GRID.barFrames) out.push("beat map: frames per bar ≠ beats × frames per beat");
  if (at(GRID.bars + 1) !== GRID.frames) out.push(`beat map: ${GRID.bars} bars end on frame ${at(GRID.bars + 1)}, not ${GRID.frames}`);
  if (REVEAL_FRAME !== at(10)) out.push(`the reveal is bar 10's downbeat (f${at(10)}), not f${REVEAL_FRAME}`);
  // shots tile the film on bar lines; beats on beat frames
  let cursor = 0;
  for (const s of SHOTS) {
    if (s.from !== cursor) out.push(`shot ${s.id}: starts on ${s.from}, expected ${cursor} (shots tile the film)`);
    if (!isBar(s.from)) out.push(`shot ${s.id}: not on a bar line (${s.from})`);
    let b0 = s.from;
    for (const b of s.beats) {
      if (b.from !== b0) out.push(`beat ${b.id}: starts on ${b.from}, expected ${b0}`);
      if (!isBeat(b.from)) out.push(`beat ${b.id}: not on a beat (${b.from})`);
      b0 = b.to;
    }
    if (b0 !== s.to) out.push(`shot ${s.id}: its beats end on ${b0}, the shot on ${s.to}`);
    cursor = s.to;
  }
  if (cursor !== GRID.frames) out.push(`shots end on ${cursor}; the film is ${GRID.frames} frames`);
  if (shotById("R1").from !== REVEAL_FRAME) out.push(`the reveal shot must start on the reveal, frame ${REVEAL_FRAME}`);
  // text: ≤ 6 words a line, ≤ 3 words a second, holds, inside the film
  const byShot = new Map<string, TextCue[]>();
  for (const c of TEXT) {
    const sh = shotAt(c.in);
    if (!sh) {
      out.push(`${c.id}: enters outside the film`);
      continue;
    }
    byShot.set(sh.id, [...(byShot.get(sh.id) ?? []), c]);
    if (c.role !== "small") for (const l of [...c.lines, ...(c.squareLines ?? [])]) if (wordsIn(l) > 6) out.push(`${c.id}: "${l}" has more than 6 words`);
  }
  for (const [, cs] of byShot) {
    const solo = cs.filter((c) => c.role !== "small");
    solo.forEach((c, i) => {
      const last = i === solo.length - 1;
      const need = minHoldFrames(c, last);
      const shown = (c.out < END ? c.out : GRID.frames) - c.in;
      if (shown < need) out.push(`${c.id}: holds ${shown} frames, needs ${need}`);
      const rate = wordsIn(c.lines.join(" ")) / (shown / FPS);
      if (rate > 3 + 1e-9) out.push(`${c.id}: ${rate.toFixed(2)} words a second (at most 3)`);
    });
  }
  // the character: Pebble's own poses only, spaced, one celebration at the app's completion
  for (const a of ASPECT_IDS) out.push(...checkCues(FILM_PEBBLE_CUES[a], `FILM_PEBBLE_CUES.${a}`));
  for (const a of ASPECT_IDS) {
    let prev: { f: number; pose: string } | null = null;
    const happy: number[] = [];
    for (const c of FILM_PEBBLE_CUES[a]) {
      if (!c.pose) continue;
      const f = Math.round(c.at * FPS);
      if (c.pose === "happy") happy.push(f);
      if (prev && prev.pose !== c.pose) {
        const need = prev.pose === "review" || c.pose === "review" ? 18 : 14;
        if (f - prev.f < need) out.push(`FILM_PEBBLE_CUES.${a}: ${prev.pose} → ${c.pose} at f${f} is ${f - prev.f} frames after the last change (needs ${need})`);
      }
      prev = { f, pose: c.pose };
    }
    if (happy.length !== 1 || happy[0] !== MOMENTS.completion.frame) out.push(`FILM_PEBBLE_CUES.${a}: exactly one celebration, on the held run's completion (f${MOMENTS.completion.frame}); found ${happy.join(", ") || "none"}`);
  }
  const climaxMap = SOURCE_MAPS.climax;
  for (const [name, m] of [["completion", MOMENTS.completion], ["verified", MOMENTS.verified], ["testsPass", MOMENTS.testsPass]] as const) {
    const s = sourceAt(climaxMap, m.frame);
    if (s === null || Math.abs(s - m.s) > 0.5 / 30) out.push(`the ${name} frame f${m.frame} shows source ${s?.toFixed(3)} s, not ${m.s.toFixed(3)} s`);
  }
  if (Math.abs((sourceAt(SOURCE_MAPS.g3, MOMENTS.hold.g3) ?? 0) - MOMENTS.hold.s) > 0.5 / 30) out.push(`glimpse 3's hold frame f${MOMENTS.hold.g3} does not show 14.033 s`);
  if (Math.abs((sourceAt(climaxMap, MOMENTS.hold.climax) ?? 0) - MOMENTS.hold.s) > 0.5 / 30) out.push(`the held run's hold frame f${MOMENTS.hold.climax} does not show 14.033 s`);
  // hops
  for (const h of HOPS) {
    const takeOff = sec(h.at);
    const landing = sec(h.at + h.duration);
    if (h.id === "H2" && (landing !== REVEAL_FRAME || takeOff !== DEAD_STOP.from)) out.push(`H2 takes off on f${takeOff} and lands on f${landing}: it must leap on the dead stop (f${DEAD_STOP.from}) and land on the drop (f${REVEAL_FRAME})`);
    if (h.id === "H4" && landing !== at(29)) out.push(`H4 lands on ${landing}, not bar 29 (${at(29)})`);
  }
  // clicks on beats, each on the recording's own click when it is one
  for (const c of CLICKS) {
    if (!isBeat(c.frame)) out.push(`click on ${c.target} (f${c.frame}) is not on a beat`);
    if (c.source) {
      const map = SOURCE_MAPS[c.source.map];
      const shown = sourceFrameAt(map, c.frame);
      const want = Math.round(c.source.s * 30);
      if (shown === null || (shown !== want && shown !== want - 1)) out.push(`click on ${c.target} (f${c.frame}) shows source frame ${shown}, not the recording's click (${want}) or the frame before it`);
    }
  }
  // sound: no kit riser (the score's riser ends on the dead stop); two suck-backs, ending on the first question and
  // on the drop; the effects named in OVERRIDES §41 on Verified
  if (SFX.some((f) => f.role === "riser")) out.push("the score carries the riser into the dead stop: no kit riser in the timeline");
  if (beatmap.cues.riser_end_frame !== DEAD_STOP.from) out.push(`beatmap.json: the riser must end on the dead stop (f${DEAD_STOP.from}), not f${beatmap.cues.riser_end_frame}`);
  const sucks = SFX.filter((f) => f.role === "suck").map((f) => f.frame);
  if (sucks.join() !== [at(2), REVEAL_FRAME].join()) out.push(`two suck-backs, ending on the first question (f${at(2)}) and on the drop (f${REVEAL_FRAME}); found ${sucks.join(", ")}`);
  for (const take of ["ui_verified", "impact_a"]) if (!SFX.some((f) => f.frame === MOMENTS.verified.frame && f.take === take)) out.push(`OVERRIDES §41: ${take} on Verified (f${MOMENTS.verified.frame})`);
  for (const r of STYLE_FRAMES) {
    const s = shotById(r.shot);
    if (r.frame < s.from || r.frame >= s.to) out.push(`style frame ${r.id}: frame ${r.frame} is outside shot ${s.id}`);
  }
  out.push(...checkTrailer(camera));
  out.push(...checkTimeHonesty());
  return out;
}

/** The trailer's breath, hold, slam and Verified rules. */
function checkTrailer(camera: readonly CameraMove[]): string[] {
  const out: string[] = [];
  const gaps = AUTOMATION.filter((a) => a.role === "gap");
  if (gaps.map((g) => g.frame).join() !== GAP_FRAMES.join()) out.push(`the breath gaps are f${GAP_FRAMES.join(", f")}; found f${gaps.map((g) => g.frame).join(", f")}`);
  for (const g of gaps) {
    if (g.toFrame - g.frame !== 9) out.push(`gap f${g.frame}: ${g.toFrame - g.frame} frames, not 9`);
    if (!isBar(g.toFrame)) out.push(`gap f${g.frame}: ends on f${g.toFrame}, not a bar line`);
  }
  const landings = gaps.map((g) => g.toFrame).sort((x, y) => x - y);
  for (let i = 1; i < landings.length; i++) if (landings[i]! - landings[i - 1]! < 4 * GRID.barFrames) out.push(`gap hits f${landings[i - 1]} and f${landings[i]} are under 4 bars apart`);
  // the holds: from the app's own hold frame; glimpse 3's to the cut to the turn, the held run's to the Run the tests
  // click; each released to a bar line
  const holds = AUTOMATION.filter((a) => a.role === "hold");
  if (holds.length !== 2) out.push(`there must be exactly two holds (glimpse 3 and the held run), not ${holds.length}`);
  const [h1, h2] = holds;
  if (h1) {
    if (h1.frame !== MOMENTS.hold.g3) out.push(`the first hold starts on f${h1.frame}, not on glimpse 3's hold (f${MOMENTS.hold.g3})`);
    if (h1.toFrame !== at(8)) out.push(`the first hold must last to the cut to the turn (f${at(8)}), not f${h1.toFrame}`);
    if (h1.releaseFrame === undefined || !isBar(h1.releaseFrame) || h1.releaseFrame <= h1.toFrame) out.push("the first hold's release must end on a bar line after the cut");
  }
  if (h2) {
    if (h2.frame !== MOMENTS.hold.climax) out.push(`the second hold starts on f${h2.frame}, not on the held run's hold (f${MOMENTS.hold.climax})`);
    const click = CLICKS.find((c) => c.frame === h2.toFrame);
    if (!click || click.target !== "Run the tests") out.push(`the second hold must end on the Run the tests click, not f${h2.toFrame}`);
    if (h2.releaseFrame === undefined || !isBar(h2.releaseFrame) || h2.releaseFrame <= h2.toFrame) out.push("the second hold's release must end on a bar line after the click");
  }
  const tails = AUTOMATION.filter((a) => a.role === "tail");
  if (tails.length !== 1 || tails[0]!.toFrame >= GRID.frames || tails[0]!.toFrame !== at(32, 2)) out.push("there must be one tail, its digital silence from f2250 (1.8 s)");
  // inside a breath: no cut, no camera move starting, no pose cue, no line landing, no hop taking off (H2 takes off on
  // the dead stop's first frame; slam pre-rolls may fill a gap's last 3 frames to land on its hit)
  const n = SLAM_PREROLL_FRAMES;
  for (const b of breaths()) {
    const inside = (f: number) => f >= b.from && f < b.to;
    for (const sm of SEAMS) if (inside(sm.frame)) out.push(`${b.what}: the ${sm.kind} at f${sm.frame} falls inside it`);
    for (const sh of SHOTS) for (const bt of sh.beats) if (inside(bt.from)) out.push(`${b.what}: beat ${bt.id} starts inside it`);
    for (const m of camera) if (inside(m.from + 1)) out.push(`${b.what}: ${m.aspect} ${m.what} starts moving on f${m.from + 1}`);
    for (const a of ASPECT_IDS) for (const c of FILM_PEBBLE_CUES[a]) if (c.pose && inside(Math.round(c.at * FPS))) out.push(`${b.what}: pose ${c.pose} (${a}) on f${Math.round(c.at * FPS)}`);
    for (const h of HOPS) {
      const f = sec(h.at);
      if (inside(f) && !(h.id === "H2" && f === DEAD_STOP.from)) out.push(`${b.what}: hop ${h.id} takes off on f${f}`);
    }
    for (const c of TEXT) {
      for (const land of c.enter === "slam" && c.wordStarts ? c.wordStarts : [c.in]) {
        if (inside(land)) out.push(`${b.what}: ${c.id} lands on f${land}`);
        if (c.enter === "slam" && land - n < b.to && land > b.from && land !== b.to) out.push(`${b.what}: ${c.id}'s slam pre-roll reaches into it without landing on its hit`);
      }
    }
  }
  // slams: at most ten; each lands on an eighth, on its shot's first frame, or (Evidence before done) on Verified
  const slams = TEXT.filter((c) => c.enter === "slam");
  if (slams.length > MAX_SLAMS) out.push(`${slams.length} slam cues; at most ${MAX_SLAMS}`);
  for (const c of slams) {
    const first = shotAt(c.in)?.from;
    for (const land of c.wordStarts ?? [c.in]) {
      if (!isEighth(land) && land !== first && !(c.id === "EVD" && land === MOMENTS.verified.frame)) out.push(`${c.id}: its slam lands on f${land}, not an eighth`);
    }
  }
  // every seam on a beat, except a match cut on a click's rebound (4 frames after it, the recut's f814 rule)
  for (const sm of SEAMS) {
    const rebound = sm.kind === "match-cut" && CLICKS.some((c) => c.frame === sm.frame - 4);
    if (!isBeat(sm.frame) && !rebound) out.push(`the ${sm.kind} at f${sm.frame} is not on a beat`);
  }
  // Verified is held: no cut and no camera move inside its first 36 frames
  for (const f of CUT_FRAMES) if (f > VERIFIED_HOLD.from && f < VERIFIED_HOLD.to) out.push(`the Verified hold: a cut at f${f} falls inside it`);
  for (const m of camera) if (m.to > VERIFIED_HOLD.from && m.from + 1 < VERIFIED_HOLD.to) out.push(`the Verified hold: ${m.aspect} ${m.what} moves f${m.from + 1}–${m.to}`);
  return out;
}

/**
 * TIME HONESTY (the blueprint's source map): inside a shot Pebble's time runs at exactly 1×; only the person's spans
 * run faster (at most 2×); only waiting states run slower or freeze; a jump (a `cut` key) only on a seam; and across
 * the cuts of one recording, film time between two shown moments is never shorter than their source time.
 */
export function checkTimeHonesty(): string[] {
  const out: string[] = [];
  const cuts = new Set(CUT_FRAMES);
  const shown: { rec: string; f0: number; f1: number; s0: number; s1: number; map: string }[] = [];
  for (const [id, map] of Object.entries(SOURCE_MAPS) as [SourceMapId, readonly SourceKey[]][]) {
    for (let i = 1; i < map.length; i++) {
      const a = map[i - 1]!;
      const b = map[i]!;
      if (b.frame <= a.frame) out.push(`${id}: keys out of order at f${b.frame}`);
      if (b.cut) {
        if (!cuts.has(b.frame)) out.push(`${id}: a jump at f${b.frame}, which is not a cut`);
        continue;
      }
      const speed = ((b.s - a.s) * FPS) / (b.frame - a.frame);
      const kind = a.kind ?? "pebble";
      if (speed < -1e-9) out.push(`${id}: plays backwards over f${a.frame}–${b.frame}`);
      if (kind === "pebble" && Math.abs(speed - 1) > 1e-6) out.push(`${id}: Pebble's time over f${a.frame}–${b.frame} plays at ${speed.toFixed(4)}×, not 1×`);
      if (kind === "person" && (speed < 1 - 1e-6 || speed > 2 + 1e-6)) out.push(`${id}: the person's span over f${a.frame}–${b.frame} plays at ${speed.toFixed(4)}× (1× to 2×)`);
      if (kind === "waiting" && speed > 1 + 1e-6) out.push(`${id}: a waiting state over f${a.frame}–${b.frame} plays at ${speed.toFixed(4)}× (at most 1×)`);
    }
    shown.push({ rec: MAP_RECORDING[id], f0: map[0]!.frame, f1: map[map.length - 1]!.frame, s0: map[0]!.s, s1: map[map.length - 1]!.s, map: id });
  }
  // the dark twin and the light take are the same run (the same clocks), so they count as one recording here
  const run = (r: string) => (r === "dark" || r === "light" ? "run" : r);
  const spans = [...shown].sort((x, y) => x.f0 - y.f0);
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i]!;
      const b = spans[j]!;
      if (a.rec === "still" || b.rec === "still") continue; // a montage still is not part of the run's continuity
      if (run(a.rec) !== run(b.rec) || b.s0 < a.s1) continue; // a repeat (bar 21 replays glimpse 3's span) is allowed
      if ((b.f0 - a.f1) / FPS + 1e-9 < b.s0 - a.s1) out.push(`${a.map} → ${b.map}: ${(b.f0 - a.f1) / FPS} s of film between source ${a.s1.toFixed(3)} and ${b.s0.toFixed(3)} s (shorter than the source)`);
    }
  }
  return out;
}
