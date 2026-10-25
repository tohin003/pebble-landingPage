// The launch film's timeline as DATA (critic C4), re-derived from docs/FILM_SPEC.md (lane E, 2026-10-23 03:55): every
// shot and sub-beat, framing, on-screen line, pebble instance, hop and cue, click, sound-effect intent, seam, review
// frame and source-time map. No React, no Remotion, no path aliases: the scenes, the style frames, the cue exporter
// (bun) and the checks all read this one module. Section numbers (§) below are FILM_SPEC's.
//
// Rules validateTimeline() enforces:
// - every frame comes from the beat map by INDEX (bar, beat, offset), never by accumulating (§1, R5 §10.1);
// - shots tile the film on bar lines; cuts and clicks sit on beat frames; the reveal lands on beatmap.reveal.frame;
// - every on-screen line is a copy line: in src/content/chapters.ts (or, until FILM_SPEC §18's deltas land there, in
//   docs/film-captions.json, reported by pendingCopy()); ≤ 6 words; holds per holdFor (§8);
// - pebble cues pass shared/pebble's checks (Pebble's own poses only, D6); exactly one riser, ending on the reveal.
import beatmap from "../../../tools/audio/beatmap.json";
import captions from "../../../docs/film-captions.json";
import { chapters } from "../../../src/content/chapters";
import { bloubCredit } from "../../../src/content/credits";
import { BODY, VIEWBOX_SIZE } from "../../../shared/pebble/character";
import { checkCues, type PebbleCue } from "../../../shared/pebble/cues";
import { gazeToward, type Gaze } from "../../../shared/pebble/gaze";

/* ================================================================================================================
 * §1 The grid (tools/audio/beatmap.json: 100 BPM, 18 frames per beat, 72 per bar, 32 bars = 2,304 frames at 30 fps)
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

export const DURATION_FRAMES: number = GRID.frames;
export const REVEAL_FRAME: number = beatmap.reveal.frame;
export const BREATH_FRAME: number = beatmap.cues.breath_frame;
export const FINAL_CHORD_FRAME: number = beatmap.cues.final_chord_frame;

export type SectionName = "hook" | "tension" | "build" | "reveal" | "proof" | "payoff" | "breakdown" | "endcard" | "final";
export const SECTIONS = Object.fromEntries(
  beatmap.sections.map((s) => [s.name, { from: s.start_frame, to: s.end_frame, bars: [s.first_bar, s.last_bar] as const }]),
) as Record<SectionName, { from: number; to: number; bars: readonly [number, number] }>;

/* ================================================================================================================
 * Words: every on-screen line is a copy line
 * ============================================================================================================== */

export type ChapterId = "desktop" | "project" | "tested" | "model" | "pace" | "memory" | "views" | "open-source" | "get";

const problems: string[] = [];
const pending: string[] = [];
/** Lines of the caption source (lane E), flattened. */
const captionLines = new Set(
  (captions.cues as { kind: string; lines: string[] }[]).filter((c) => c.kind !== "sound").flatMap((c) => c.lines.filter((l) => !l.startsWith("["))),
);

/**
 * A line of on-screen text. It must be one of the chapter's `onScreen` lines in src/content/chapters.ts; until
 * FILM_SPEC §18's copy deltas land there, a line found in docs/film-captions.json (lane E) is accepted and listed by
 * pendingCopy(). Anything else is a problem (validateTimeline). Never throws at import, so a copy change upstream
 * fails the film's check loudly without breaking the project's other compositions.
 */
export function line(chapter: ChapterId, text: string): string {
  const c = chapters.find((ch) => ch.id === chapter);
  if (c && c.onScreen.includes(text)) return text;
  if (text === bloubCredit) return text; // src/content/credits.ts (OVERRIDES §2, verbatim)
  if (captionLines.has(text)) pending.push(`${chapter}: "${text}"`);
  else problems.push(`"${text}" (chapter ${chapter}) is in neither src/content/chapters.ts nor docs/film-captions.json`);
  return text;
}
/** On-screen lines still waiting for FILM_SPEC §18's chapters.ts deltas. */
export const pendingCopy = (): readonly string[] => pending;

/* ================================================================================================================
 * Geometry (§4). Frame positions are px; UI regions are CSS px of the captured window; desktop units are the
 * riverbed's 1600 × 1000 points.
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
/** The film's three compositions (FILM_SPEC §2, §22): 16:9, 1:1 and 9:16. */
export type Aspect = "wide" | "square" | "vertical";
export interface PerAspect<T> {
  wide: T;
  square: T;
  vertical: T;
}
const per = <T,>(wide: T, square: T, vertical: T): PerAspect<T> => ({ wide, square, vertical });

/** The pet in the desktop world (S1). The desktop placement is ours (FILM_SPEC gives frame positions only): its
 *  centre sits where every S1 framing stays inside the wallpaper and frame 0 has the riverbed's lower stones in view. */
export const PET = {
  centre: { x: 1080, y: 750 },
  /** the pebble's centre inside the expanded 384 × 456 chat panel (§7.1; measured on the captures) */
  inPanel: { x: 326.7, y: 397.3 },
  /** the collapsed pet window's pebble: body centre (55.3, 56.8), foot at 95 (pet-collapsed@3x) */
  centreToFoot: 38.2,
  /** PebbleOnFilm size at the desktop's scale (§4: 148 desktop units) */
  size: 148,
} as const;
export const PET_FOOT: Point = { x: PET.centre.x, y: PET.centre.y + PET.centreToFoot };
/** The expanded chat panel's top-left in desktop units. */
export const PET_PANEL: Rect = { x: PET.centre.x - PET.inPanel.x, y: PET.centre.y - PET.inPanel.y, w: 384, h: 456 };
export const DESKTOP_RECT: Rect = { x: 0, y: 0, w: 1600, h: 1000 };

/**
 * S1's camera states: magnification and where the pebble's centre sits in the frame (§6 S1, §22). The stage framings
 * of the window world are film/framing.ts's (edge-checked on the real frames); G1's board-o-matic framings that lived
 * here went with the board (lane v2-film).
 *
 * The energetic recut (ENERGY_SPEC §5, measured on pet-live-error-light-hidden: the panel's header at CSS y 25–61, the
 * greeting 126–204, the composer 263–317, the toolbar 328–351, the pebble's centre at 397.3 and its foot at 435.5; the
 * answer's lines x 26–350.3): C0 stays the thumbnail; the click opens the chat on f18 and a 12-frame ramped move
 * (f19–30) makes room for it (C1, the whole panel, so the question types itself legibly); f72 is a punch-in cut to the
 * conversation, from the bubble to the pebble (C2), held to the dive.
 * The vertical (§22): the wallpaper is 1,000 desktop points tall and the frame 1,920 px, so no 9:16 view may zoom out
 * below m 1.92 and every view's centre sits where the riverbed still fills the frame (frame 0: m 3.4 with the pebble
 * at (540, 1080), the wallpaper's bottom edge 3 px under the frame's); its C1 keeps the whole panel inside the band.
 */
export const S1_CAMERA = {
  /** C0, f0–18: frame 0, the thumbnail (unchanged) */
  c0: { m: per(2.6, 2.6, 3.4), pebbleAt: per({ x: 1300, y: 640 }, { x: 640, y: 620 }, { x: 540, y: 1080 }) },
  /** C1, f30 → hold to f71: the whole panel, header to toolbar in 16:9 ("pebble." at y 63; UI text 30.6 px) and 9:16
   *  (the header at y 425, inside the band); the square centres the text, its header above the frame. The narrow m is
   *  2.62, not the spec's 2.6, so the app's 13 px text reads at 34.1 px (the narrow floor, 34); the square's pebble
   *  sits at y 846, not 840, so the posted question (CSS y 97.3 from 3.30 s) stays 60 px under the frame's top */
  c1: { m: per(2.35, 2.62, 2.62), pebbleAt: per({ x: 1300, y: 938 }, { x: 900, y: 846 }, { x: 900, y: 1400 }) },
  /**
   * C2, f72 (hard cut, punch-in): the bubble to the pebble, held to the dive. Measured on the recording: at 5.43 s
   * (f127) the feed scrolls up 17 CSS px as the answer takes its second line, so the question's first line moves to
   * CSS y 80.3 (its box to 71). The spec's 16:9 m 2.9 at y 935 and square m 2.95 at y 951 put that line 16 px under
   * the frame's top for f127–134, its box sliced. Here: 16:9 m 2.8 (+19 % on C1, text 36.4 px) and the square m 2.8
   * (+7 %, the most the bubble-to-pebble height allows at 1,080 px; the answer's lines 83 px inside both sides), the
   * pebble at y 945, its foot 28 px above the bottom. The header's status line ("Thinking", "Writing"; its ink ends
   * at CSS y 59) sits wholly above the frame's top (at y 950 its descender showed as a sliver for f72–134), and the
   * question's first line 105 px under the top to f126, 57 px for f127–134 after the app's scroll: 3 px inside the
   * 60 px rule, because the two are 21 CSS px apart and m 2.82 or more would push the pebble's foot off the frame.
   * The vertical keeps the spec's m 2.95: its band starts at y 250, and the line sits at 281 (the answer's lines 62 px
   * inside both sides; its header shows whole in the phone UI's top zone).
   */
  c2: { m: per(2.8, 2.8, 2.95), pebbleAt: per({ x: 1300, y: 945 }, { x: 928, y: 945 }, { x: 949, y: 1216 }) },
  /** where the pointer enters, frame px at C0 (above the frame and a little left of the pebble in 16:9 and 1:1; from
   *  the left inside the band in 9:16) */
  pointerFrom: per({ x: 1150, y: -60 }, { x: 500, y: -60 }, { x: -70, y: 700 }),
  /** f135–143: the zoom through the pebble (the breath's nine frames, at(2, 4, 9)); hook.ts aims and scales it */
  zoomThrough: { from: at(2, 4, 9), to: at(3), aim: { x: -20, y: 25 }, scale: 22 },
} as const;

/* ================================================================================================================
 * §6 Shots
 * ============================================================================================================== */

export type World = "desktop" | "window" | "sage" | "paper";
export type Transition = "cut" | "hard-cut" | "match-cut" | "carry" | "flood" | "zoom-through" | "object-world" | "camera";

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
  /** captured UI it uses */
  ui?: readonly string[];
  beats: readonly Beat[];
}

export const SHOTS: readonly Shot[] = [
  {
    id: "S1",
    chapter: "desktop",
    from: at(1),
    to: at(3),
    world: "desktop",
    transitionIn: "cut",
    ui: ["pet-live-error (record.mjs, 3×, avatar hidden: R1)", "pet-live-01-greeting", "pet-live-02-thinking"],
    beats: [
      { id: "S1a", from: 0, to: 72, note: "the pebble on its desktop (m 2.6); the pointer from the upper left; click f36; the chat opens; C0 → C1 f40–63" },
      { id: "S1b", from: 72, to: 144, note: "hard cut punch-in C2 (m 2.2): the sent question, Thinking; f126–143 zoom through the pebble" },
    ],
  },
  {
    id: "S2",
    chapter: "desktop",
    from: at(3),
    to: at(6),
    world: "sage",
    transitionIn: "zoom-through",
    beats: [{ id: "S2", from: 144, to: 360, note: "three neutral questions, one per bar, (B) ink, centred" }],
  },
  {
    id: "S3",
    chapter: "desktop",
    from: at(6),
    to: at(8),
    world: "sage",
    transitionIn: "cut",
    beats: [{ id: "S3", from: 360, to: 504, note: "T4 the intent line (C); the pebble rises in (H1, dark palette), looks up, leaps (H2)" }],
  },
  {
    id: "S4",
    chapter: "desktop",
    from: at(8),
    to: at(10),
    world: "paper",
    transitionIn: "flood",
    beats: [{ id: "S4", from: 504, to: 648, note: "lands as the full stop; paper floods out f504–517; (W) unroll + tracking settle; T5; roll back f614–628; H3 f634" }],
  },
  {
    id: "S5",
    chapter: "project",
    from: at(10),
    to: at(18),
    world: "window",
    transitionIn: "carry",
    ui: ["main-live-film (record.mjs, 3×: R2)", "held-unverified", "main-done-timeline"],
    beats: [
      { id: "S5a", from: 648, to: 720, note: "reads: the carry lands f652; Reading invoice_kit/dates.py; T6" },
      { id: "S5b", from: 720, to: 864, note: "the approval card; T7 with its verbs; Apply edit f810; match cut f814 to Done + Undo this edit; ring" },
      { id: "S5c", from: 864, to: 1008, note: "hard cut (chapter tested) on the whole run: the reply; AgentGuard holds f890; scrolled in by f914; push-in f954–977; T8 f936; Run the tests f990" },
      { id: "S5d", from: 1008, to: 1152, note: "the Run isolated tests card; T9; Run tests f1080; Requesting isolated tests · 11 s" },
      { id: "S5e", from: 1152, to: 1224, note: "Verified f1152; happy; T10; the check (16:9); pull back f1188–1211; to the gear" },
    ],
  },
  {
    id: "S6",
    chapter: "model",
    from: at(18),
    to: at(23),
    world: "window",
    transitionIn: "match-cut",
    ui: ["settings-models", "settings-permissions", "settings-permissions-auto", "settings-memory", "settings-memory-forgotten"],
    beats: [
      { id: "S6a", from: 1224, to: 1332, note: "Settings › Models; T11 + T11s; Permissions tab f1332" },
      { id: "S6b", from: 1332, to: 1440, note: "Permissions; T12 (C); Auto in project f1404 (match cut); Memory tab f1440" },
      { id: "S6c", from: 1440, to: 1584, note: "the six layers; T13; pan to the records; forget f1530; swap f1542" },
    ],
  },
  {
    id: "S7",
    chapter: "views",
    from: at(23),
    to: at(26),
    world: "window",
    transitionIn: "hard-cut",
    ui: ["main-dashboard", "main-quiz"],
    beats: [
      { id: "S7a", from: 1584, to: 1656, note: "the Lisbon trip budget dashboard (m 1.25); T14" },
      { id: "S7b", from: 1656, to: 1728, note: "object becomes the world: the chart panel to full bleed f1656–1675; hold" },
      { id: "S7c", from: 1728, to: 1800, note: "hard cut to the quiz; f1782–1799 zoom through the A badge" },
    ],
  },
  {
    id: "S8",
    chapter: "open-source",
    from: at(26),
    to: at(29),
    world: "sage",
    transitionIn: "zoom-through",
    beats: [{ id: "S8", from: 1800, to: 2016, note: "T15 + T15s, T16, T17; (B) ink, centred" }],
  },
  {
    id: "S9",
    chapter: "get",
    from: at(29),
    to: GRID.frames,
    world: "paper",
    transitionIn: "flood",
    beats: [{ id: "S9", from: 2016, to: 2304, note: "P-end lands f2016; flood; (W); T18; T19 + T20 on the final chord; T21 + T22" }],
  },
];

/* ================================================================================================================
 * §8 On-screen text
 * ============================================================================================================== */

/** Roles (§3; PHILOSOPHY's three voices): Fraunces 350 for hero/headline/side/tagline lines, Inter for support, cta
 *  and small, Geist Mono with tabular numerals for anything carrying a number ("data": "Apache-2.0"; "mono": the URL). */
export type TextRole = "hero" | "headline" | "side" | "tagline" | "support" | "data" | "cta" | "mono" | "small";
/** (A) blur, (B) ink, (C) rise, fade; and (S) slam, the energetic recut's: the line lands ON its `in` frame, its 3-frame
 *  pre-roll falling before it (in the previous shot when `in` is a cut, so a seam line appears already landed). */
export type Entrance = "blur" | "ink" | "rise" | "fade" | "slam";

export interface TextCue {
  id: string;
  chapter: ChapterId;
  /** the lines as they break on screen (16:9; `squareLines` when the narrow compositions, 1:1 and 9:16, both 1,080 px
   *  wide, break differently) */
  lines: readonly string[];
  squareLines?: readonly string[];
  role: TextRole;
  enter: Entrance;
  /** the first word's frame; for a slam, its landing frame (at rest from here) */
  in: number;
  /** the frame the exit starts (gone 6 frames later); END = held to the end */
  out: number;
  /** explicit word frames (T7 builds with its verbs; for a slam, each word's landing frame) */
  wordStarts?: readonly number[];
  /** where it sits: "centre" (y = the line block's centre), "baseline" (y = the first line's baseline), "column" */
  place: "centre" | "baseline" | "column";
  y?: PerAspect<number>;
  /** a key line (the end card's), readable twice */
  key?: boolean;
  /** column lines that sit under another cue (T11s under T11), by id */
  under?: string;
  /**
   * A list item (lane G-fix, REVIEW-G2 P1-6): the questions (S2) and the facts (S8) build a left-aligned list. `x` is
   * the list's left edge (px at the aspect's reference size; the block is centred on the frame by its widest line);
   * from `dimAt` the line dims to LIST_DIM over 6 frames, as the next item inks in, and it stays until the list leaves.
   */
  x?: PerAspect<number>;
  dimAt?: number;
  /** ink every word of the line together (the list items' (B) ink lands whole on its beat) */
  inkTogether?: boolean;
}

/** The slam's pre-roll, frames at 30 fps (motion/spec.ts SLAM.preRollS, 0.1 s): the frames before a slam lands. */
export const SLAM_PREROLL_FRAMES = 3;
/** The hook's Enter (ENERGY_SPEC §5): the question is sent on beat 4 of bar 1; Pebble's own time runs at 1× from here. */
export const HOOK_ENTER_FRAME = at(1, 4);

/** A list's earlier items dim to 45 % (REVIEW-G2 P1-6); the current one stays at full contrast (lead addendum). */
export const LIST_DIM = 0.45;
/** Each list's left edge (px at the reference size), so that its widest line sits centred on the frame (measured on the
 *  renders: "What did it change?" 809 / 673 px wide, "Your keys stay in your Keychain" 1,297 px, "Free and open source"
 *  719 px in the square; the vertical is 1,080 px wide with the square's type, so its edges are the square's). */
export const LIST_X = { questions: per(554, 202, 202), facts: per(310, 178, 178) } as const;

export const END = GRID.frames + 6;

/** A text cue, its words checked as one copy line. */
const t = (c: TextCue): TextCue => {
  line(c.chapter, c.lines.join(" "));
  return c;
};

export const TEXT: readonly TextCue[] = [
  // S2, lane G-fix (REVIEW-G2 P1-6 and the lead's addendum): the three questions build a list, the checklist the film
  // goes on to answer; the one before dims to 45 % as the next arrives; all three leave together f348–354.
  // The energetic recut (ENERGY_SPEC §6, §7): each SLAMS onto its downbeat (in = the landing frame; its pre-roll is the
  // 3 frames before, so the dims at f213 and f285 still start with it). T1 lands on the seam frame f144 already at
  // rest: its pre-roll falls in the hook. T3 holds exactly 2.0 s, the last line of S2.
  // The vertical (§22) centres each type world in the central band (y 250–1670): the questions on y 960, T4 above the
  // pebble's rise, the lockup's baseline on y 830 with its lines under it, all above the caption band (y 1460).
  t({ id: "T1", chapter: "desktop", lines: ["What did it change?"], role: "headline", enter: "slam", in: 144, out: 348, dimAt: 213, place: "centre", y: per(325, 350, 840), x: LIST_X.questions }),
  t({ id: "T2", chapter: "desktop", lines: ["Can I undo it?"], role: "headline", enter: "slam", in: 216, out: 348, dimAt: 285, place: "centre", y: per(470, 470, 960), x: LIST_X.questions }),
  t({ id: "T3", chapter: "desktop", lines: ["Did it run the tests?"], role: "headline", enter: "slam", in: 288, out: 348, place: "centre", y: per(615, 590, 1080), x: LIST_X.questions }),
  t({ id: "T4", chapter: "desktop", lines: ["An agent shouldn't", "grade its own work"], role: "headline", enter: "rise", in: 360, out: 462, place: "centre", y: per(420, 420, 820) }),
  t({ id: "T5", chapter: "desktop", lines: ["A small companion for your Mac"], role: "support", enter: "blur", in: 522, out: 612, place: "baseline", y: per(560, 530, 960) }),
  t({ id: "T6", chapter: "project", lines: ["It reads", "your project"], role: "side", enter: "blur", in: 666, out: 718, place: "column" }),
  // the energetic recut: T7 slams word by word with its verbs: "Review," with the review pose on the still frame after
  // the camera move (f756), "apply," on the Apply edit click (f810), "undo" on the beat (f828, was f830)
  t({ id: "T7", chapter: "project", lines: ["Review, apply,", "undo"], role: "side", enter: "slam", in: 756, out: 858, wordStarts: [756, 810, 828], place: "column" }),
  // lane G-fix (REVIEW-G2 P0-1): T8 lands on the bar-14 downbeat (f936), after the held run is in view, not mid-scroll
  t({ id: "T8", chapter: "tested", lines: ["AgentGuard checks", "the evidence"], role: "side", enter: "blur", in: 936, out: 1038, place: "column" }),
  t({ id: "T9", chapter: "tested", lines: ["Tests run in", "an isolated copy"], role: "side", enter: "blur", in: 1044, out: 1140, place: "column" }),
  // lane v2-film: in 16:9 T10 breaks after "Evidence", as the column's other statements do, so the check beside the
  // Verified step (frame x 860, at the step's y, which the tilt puts level with the column's first line) stands clear
  // of the words: on one line, "done" ended 6 px from the check and read as "done✓". The narrow aspects keep one line.
  // the energetic recut: T10 slams onto Verified (f1152; its pre-roll f1149–1151 in the breath's last three frames)
  t({ id: "T10", chapter: "tested", lines: ["Evidence", "before done"], squareLines: ["Evidence before done"], role: "side", enter: "slam", in: 1152, out: 1212, place: "column" }),
  t({ id: "T11", chapter: "model", lines: ["Your model,", "your choice"], role: "side", enter: "blur", in: 1242, out: 1320, place: "column" }),
  t({ id: "T11s", chapter: "model", lines: ["Even one on your Mac"], role: "support", enter: "blur", in: 1260, out: 1320, place: "column", under: "T11" }),
  t({ id: "T12", chapter: "pace", lines: ["You set what", "it may do"], role: "side", enter: "rise", in: 1350, out: 1428, place: "column" }),
  t({ id: "T13", chapter: "memory", lines: ["Memory you can", "read and forget"], role: "side", enter: "blur", in: 1458, out: 1578, place: "column" }),
  // the energetic recut: T14 appears already landed on the second lift's hard cut (a slam on the cut frame)
  t({ id: "T14", chapter: "views", lines: ["Views,", "not just text"], role: "side", enter: "slam", in: 1584, out: 1656, place: "column" }),
  // S8, lane G-fix (REVIEW-G2 P1-6, P1-3): the facts build a list the same way; T16 lands on bar 27 (f1872), T17 on
  // beat 107 (f1926); the list leaves together f1998–2004, before the end card's pebble enters the frame (≈ f2005).
  // The energetic recut: T15 (already landed on the seam), T16 and T17 slam; "Apache-2.0" keeps its calm ink.
  // T17 holds 2.4 s, the last line of S8.
  // "Apache-2.0" keeps G2a's clearance under "open" (its capitals touched the "p" at §8's distance). Lane v2-film: it is
  // set in Geist Mono (role "data"), the system's voice for anything that carries a number (PHILOSOPHY, "Type").
  t({ id: "T15", chapter: "open-source", lines: ["Free and open source"], role: "headline", enter: "slam", in: 1800, out: 1998, dimAt: 1869, place: "centre", y: per(290, 285, 735), x: LIST_X.facts }),
  t({ id: "T15s", chapter: "open-source", lines: ["Apache-2.0"], role: "data", enter: "ink", in: 1806, out: 1998, dimAt: 1869, inkTogether: true, place: "baseline", y: per(425, 400, 850), x: LIST_X.facts }),
  t({ id: "T16", chapter: "open-source", lines: ["No telemetry"], role: "headline", enter: "slam", in: 1872, out: 1998, dimAt: 1923, place: "centre", y: per(530, 505, 955), x: LIST_X.facts }),
  t({ id: "T17", chapter: "open-source", lines: ["Your keys stay in your Keychain"], squareLines: ["Your keys stay", "in your Keychain"], role: "headline", enter: "slam", in: 1926, out: 1998, place: "centre", y: per(690, 690, 1140), x: LIST_X.facts }),
  t({ id: "T18", chapter: "get", lines: ["A little help, right here."], role: "tagline", enter: "blur", in: 2088, out: END, place: "baseline", y: per(560, 520, 950), key: true }),
  // the energetic recut: T19 slams onto the final hit (centred; its pre-roll fills the last breath's last three frames)
  t({ id: "T19", chapter: "get", lines: ["Free for Macs with Apple silicon"], role: "cta", enter: "slam", in: 2160, out: END, place: "baseline", y: per(690, 630, 1060), key: true }),
  t({ id: "T20", chapter: "get", lines: ["github.com/tohin003/Pebble"], role: "mono", enter: "rise", in: 2164, out: END, place: "baseline", y: per(770, 700, 1130), key: true }),
  t({ id: "T21", chapter: "get", lines: ["Shown with sample data"], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: per(852, 820, 1250) }),
  t({ id: "T22", chapter: "get", lines: [bloubCredit], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: per(892, 860, 1290) }),
];

export const textById = (id: string): TextCue => {
  const c = TEXT.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no text "${id}"`);
  return c;
};

/** The wordmark (W1, W2): the unroll and, on the reveal, the tracking settle (§3, §6 S4, S9). */
export const WORDMARK = {
  w1: { unroll: { at: 506, dur: 15 }, settle: { at: 506, to: 529, from: "0.04em", toTracking: "-0.035em" }, rollBack: { at: 614, dur: 15 } },
  w2: { unroll: { at: 2018, dur: 15 } },
} as const;

/* ================================================================================================================
 * §9 The pebble: instances, hops, cues
 * ============================================================================================================== */

export interface HopSpec {
  id: string;
  /** take-off, seconds of composition time */
  at: number;
  duration: number;
  from: PerAspect<Point>;
  to: PerAspect<Point>;
  /** the flight's timing (pebble/acting.ts Hop.timing): linear progress → the progress the flight uses; identity if unset */
  timing?: (u: number) => number;
}

/** A CSS cubic-bezier(x1, y1, x2, y2) easing as pure arithmetic (this module stays free of Remotion): Newton steps on
 *  x(t) from t = x, bisection when they stall. */
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
/** EASE.enter (motion/spec.ts, bezier(0.16, 1, 0.3, 1)) as pure arithmetic. */
const EASE_ENTER = cubicBezier(0.16, 1, 0.3, 1);

/**
 * H2's hang (ENERGY_SPEC §6): the leap's 18 frames, re-timed. It covers 45 % of its path by frame 8 (EASE.enter, the
 * take-off's burst), hangs at the apex through frames 8–14 covering only 10 % (linear), then darts the last 45 % in
 * frames 14–18 on t², landing on the drop at full speed. Take-off and landing keep their frames (0 → 0, 1 → 1).
 */
export const HANG = (u: number): number => {
  const a = 8 / 18;
  const b = 14 / 18;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < a) return 0.45 * EASE_ENTER(u / a);
  if (u < b) return 0.45 + (0.1 * (u - a)) / (b - a);
  const w = (u - b) / (1 - b);
  return 0.55 + 0.45 * w * w;
};
/** G2a: H1 starts at y 1200, not §9.2's 1150: at 1150 the 210 px pebble's top (y 1041) showed at the frame's bottom
 *  edge through S3's first bar; at 1200 it is fully below the frame until it rises. The vertical's (§22) rise starts
 *  under the frame (y 2050) and lands at y 1300, above the caption band; its lockup foot is (806, 832) and its spot in
 *  the window world (930, 660), on its line at the text band's right end. */
export const HOPS: readonly HopSpec[] = [
  { id: "H1", at: 14.4, duration: 0.5, from: per({ x: 960, y: 1200 }, { x: 540, y: 1200 }, { x: 540, y: 2050 }), to: per({ x: 960, y: 880 }, { x: 540, y: 880 }, { x: 540, y: 1300 }) },
  // the energetic recut: H2 takes off on f486 for 0.6 s (was f490 for 0.467 s) and hangs through the composed breath,
  // landing on the drop (f504; validateTimeline's rule)
  { id: "H2", at: time(486), duration: 0.6, timing: HANG, from: per({ x: 960, y: 880 }, { x: 540, y: 880 }, { x: 540, y: 1300 }), to: per({ x: 1295, y: 422 }, { x: 806, y: 402 }, { x: 806, y: 832 }) },
  { id: "H3", at: time(634), duration: 0.6, from: per({ x: 1295, y: 422 }, { x: 806, y: 402 }, { x: 806, y: 832 }), to: per({ x: 330, y: 900 }, { x: 940, y: 300 }, { x: 930, y: 660 }) },
  { id: "H4", at: time(2002), duration: 0.467, from: per({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }, { x: 1180, y: 2010 }), to: per({ x: 1295, y: 422 }, { x: 806, y: 402 }, { x: 806, y: 832 }) },
];

export const PEBBLE_INSTANCES = {
  /** inside the desktop world at the pet's place, scaled by the camera, light palette */
  desk: { from: 0, to: 144 },
  /** off-frame below, rises in (H1), leaps (H2), carries (H3); dark until the reveal flood (f504), then light */
  main: { from: 432, to: 1666, start: per({ x: 960, y: 1200 }, { x: 540, y: 1200 }, { x: 540, y: 2050 }), hops: ["H1", "H2", "H3"], lightFrom: 504 },
  /** the end card's: off-frame lower right, H4; dark until f2016, then light */
  end: { from: 1999, to: GRID.frames, start: per({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }, { x: 1180, y: 2010 }), hops: ["H4"], lightFrom: 2016 },
} as const;

/** §9.3, the static cues (the pointer-driven look cues of f8–30, 780–826, 960–1000, 1050–1090 and 1196–1555 are computed
 *  by the scenes from the cursor with gazeToward and merged in). The square and the vertical differ only in looks,
 *  each pointing where its own frame puts the target (quantised to 1/8). */
const cue = (frame: number, c: Omit<PebbleCue, "at">): PebbleCue => ({ at: time(frame), ...c });
type Look = { x: number; y: number };
const look = (a: Aspect, wide: Look, square: Look, vertical: Look): Look => per(wide, square, vertical)[a];
/**
 * Where the eyes look before frame 0 (the f−15 cue): toward the pointer's entry point, as the app's gaze rule computes
 * it (gazeToward from the pebble's box at C0, reach 200 desktop points × m; film/gaze.ts does the same for the pointer
 * on screen), so the thumbnail looks somewhere and the eyes are already turned where the pointer comes from.
 */
export function entryLook(a: Aspect): Gaze {
  const m = S1_CAMERA.c0.m[a];
  const centre = S1_CAMERA.c0.pebbleAt[a];
  const unit = (PET.size * m) / VIEWBOX_SIZE;
  const foot = { x: centre.x, y: centre.y + PET.centreToFoot * m };
  const w = BODY.width * unit;
  const h = BODY.height * unit;
  const box = { left: foot.x - w / 2, top: foot.y - BODY.bottom * unit - h / 2, width: w, height: h };
  const from = S1_CAMERA.pointerFrom[a];
  return gazeToward(from.x, from.y, box, 200 * m) ?? { x: 0, y: 0 };
}
function cuesFor(a: Aspect): PebbleCue[] {
  return [
    // the hook (ENERGY_SPEC §5), as the app's reducer poses it: tap on the click, then sending, thinking, writing. No
    // hover: the pointer is in the pet window under 14 frames before the tap (the engine's 0.45 s morph), so the
    // app's tap supersedes it. The pointer-driven looks of f1–27 come from film/gaze.ts.
    cue(-15, { look: entryLook(a), note: "before frame 0 the eyes turn to where the pointer will enter, so the thumbnail looks somewhere" }),
    cue(18, { pose: "tap", note: "the click opens the quick chat (tap lasts 1.2 s, to f54)" }),
    cue(30, { look: null, note: "the pointer has faded" }),
    cue(54, { pose: "sending", note: "Enter: the message is sent (3.00 s)" }),
    cue(72, { pose: "thinking", note: "queued at 3.15 s, Thinking from 3.30 s; on the cut" }),
    cue(102, { pose: "writing", note: "the answer's first word (4.60 s)" }),
    cue(144, { pose: "idle", note: "not drawn until f432" }),
    cue(440, { look: { x: 0, y: -0.75 }, note: "looks up at T4" }),
    // the energetic recut: H2 takes off on f486 (was f490), so the eyes lead it from f477 (was f481)
    cue(477, { look: look(a, { x: 0.625, y: -0.75 }, { x: 0.5, y: -0.875 }, { x: 0.5, y: -0.875 }), note: "eyes lead the leap" }),
    cue(504, { pose: "tap", note: "lands: the reveal" }),
    cue(520, { look: null }),
    cue(540, { pose: "idle", note: "tap ends (1.2 s)" }),
    cue(624, { look: look(a, { x: -0.875, y: 0.5 }, { x: 0.75, y: -0.625 }, { x: 0.625, y: -0.75 }), note: "eyes lead the carry" }),
    cue(652, { pose: "reading", note: "lands in the window world" }),
    cue(660, { look: look(a, { x: 0.875, y: -0.375 }, { x: -0.875, y: 0.5 }, { x: -0.625, y: 0.75 }), note: "toward the status line" }),
    cue(711, { pose: "editing", note: "inside the f708–714 blink" }),
    cue(756, { pose: "review", note: "the edit card waits (\"!\"); on f756, with \"Review,\", after the f720–753 camera move, so the morph plays on a still frame (REVIEW-G2 P1-4)" }),
    cue(864, { pose: "thinking" }),
    cue(890, { pose: "blocked", note: "verification required (the hold lands at f890 on the re-keyed S5c, REVIEW-G2 P0-1)" }),
    cue(995, { pose: "review", note: "the Run isolated tests card waits" }),
    cue(1094, { pose: "testing" }),
    cue(1161, { pose: "writing", note: "after Verified, Pebble writes its final reply" }),
    cue(1204, { pose: "happy", note: "the verified run completes (the one celebration)" }),
    cue(1339, { pose: "idle", note: "happy ends after 4.5 s, as in the app" }),
    cue(1584, { look: look(a, { x: 0.875, y: -0.375 }, { x: -0.875, y: 0.5 }, { x: -0.75, y: 0.625 }), note: "the dashboard" }),
    cue(1999, { look: look(a, { x: -0.75, y: -0.75 }, { x: -0.375, y: -0.875 }, { x: -0.25, y: -0.875 }), note: "P-end: eyes lead the landing" }),
    cue(2016, { pose: "tap", note: "lands in the end-card lockup" }),
    cue(2030, { look: null }),
    cue(2052, { pose: "idle" }),
    cue(2166, { look: { x: -0.625, y: 0.75 }, note: "glances at the URL" }),
    cue(2214, { look: { x: 0, y: 0 }, note: "looks at the viewer to the end" }),
  ];
}
export const FILM_PEBBLE_CUES: PerAspect<readonly PebbleCue[]> = per(cuesFor("wide"), cuesFor("square"), cuesFor("vertical"));

/* ================================================================================================================
 * §10 Clicks, §11 sound effects, §12 seams
 * ============================================================================================================== */

export interface Click {
  frame: number;
  target: string;
  shot: string;
}
/** The energetic recut (ENERGY_SPEC §3, §5): the hook's click moves from f36 to f18 (beat 2) by design, and the
 *  recording's click time (0.60 s) is still drawn on the click frame; every other click frame stays. */
export const CLICKS: readonly Click[] = [
  { frame: 18, target: "the pebble", shot: "S1a" },
  { frame: 810, target: "Apply edit", shot: "S5b" },
  { frame: 990, target: "Run the tests", shot: "S5c" },
  { frame: 1080, target: "Run tests", shot: "S5d" },
  { frame: 1224, target: "Settings (the gear)", shot: "S5e" },
  { frame: 1332, target: "Permissions tab", shot: "S6a" },
  { frame: 1404, target: "Auto in project", shot: "S6b" },
  { frame: 1440, target: "Memory tab", shot: "S6b" },
  { frame: 1530, target: "the bin (Forget this memory)", shot: "S6c" },
];

/** Roles of tools/audio/sfx_kit.json. The energetic recut adds impact, ui, rim, key and thump; pop, hit and shimmer
 *  stay in the kit, unused (the pitched pops, the reveal's soft hit and the shimmer left the film). */
export type SfxRole = "click" | "pop" | "tick" | "thud" | "whoosh" | "riser" | "hit" | "shimmer" | "impact" | "ui" | "rim" | "key" | "thump";
export interface SfxCue {
  /** the PICTURE frame; the exporter puts the peak one frame later (the riser's END on the reveal, sfx_kit.json) */
  frame: number;
  role: SfxRole;
  take: string;
  event: string;
  pan?: number;
  duckDb?: number;
}
/**
 * The energetic recut's effects (ENERGY_SPEC §8.4): designed UI sounds on real events, impacts on the hits, the one
 * riser. G2a: every click's pan is §11's 0.4 × (x − W/2)/(W/2) at the pointer's 16:9 frame x on its click-down frame,
 * as the animated film places it (film/framing.ts pointerSpans, film/hook.ts). Each effect peaks at picture + 1 (the
 * exporter's job), except the riser, whose end sits on the reveal. At most three sound at once (export-cues.ts).
 * - Unpitched only: ui_done replaces the tuned pop_a (f814), ui_forget the pop_c plip (it sat on f1542, it now runs
 *   under the dissolve from the click), impact_a the reveal's soft_hit_b, ui_verified the shimmer.
 * - The hold's clock (OVERRIDES §35 decision 3, §36): a rim tick on every beat, f900–972, alternating a and b, as
 *   §8.4 has it. The ladder started on beats 1 and 3 only and went to every beat because the classifier stayed clean
 *   (the score lane, part 2, on the final masters: the hold window 29–34 s reads phone 0.166 web / 0.171 social /
 *   0.164 x30, against 0.109 / 0.109 / 0.0 on beats 1 and 3; no voice or alarm label). 36 effects.
 * - Lane fin-audio (OVERRIDES §19): no pop on the end-card landing; its thud keeps the weight, now with impact_b.
 */
export const SFX: readonly SfxCue[] = [
  { frame: 18, role: "click", take: "click_a", event: "the pebble is clicked", pan: 0.13 },
  { frame: 54, role: "key", take: "tick_c", event: "the message is sent (Enter)" },
  // lane G-fix (REVIEW-G2 P1-2): the dives fill the frame on f143 / f1799, so each whoosh peaks on the world change
  { frame: 143, role: "whoosh", take: "whoosh_b", event: "into the sage field (zoom through the pebble)" },
  { frame: 504, role: "riser", take: "riser", event: "bars 6–7, its end on the reveal" },
  { frame: 504, role: "impact", take: "impact_a", event: "the drop: the pebble lands as the full stop", duckDb: 2.5 },
  { frame: 504, role: "thud", take: "thud_a", event: "texture under the drop" },
  { frame: 648, role: "whoosh", take: "whoosh_a", event: "the carry into the window world" },
  { frame: 722, role: "ui", take: "ui_card", event: "the Details drawer opens with the edit card" },
  { frame: 810, role: "click", take: "click_b", event: "Apply edit", pan: 0.3 },
  { frame: 814, role: "ui", take: "ui_done", event: "Done" },
  { frame: 890, role: "ui", take: "ui_lock", event: "AgentGuard holds the task" },
  { frame: 900, role: "rim", take: "rim_a", event: "the hold's clock (bar 13, beat 3)" },
  { frame: 918, role: "rim", take: "rim_b", event: "the hold's clock (bar 13, beat 4)" },
  { frame: 936, role: "rim", take: "rim_a", event: "the hold's clock (bar 14, beat 1)" },
  { frame: 936, role: "thump", take: "soft_hit_a", event: "T8 lands in the hold" },
  { frame: 954, role: "rim", take: "rim_b", event: "the hold's clock (bar 14, beat 2)" },
  { frame: 972, role: "rim", take: "rim_a", event: "the hold's clock (bar 14, beat 3)" },
  { frame: 990, role: "click", take: "click_c", event: "Run the tests", pan: 0.09 },
  { frame: 1080, role: "click", take: "click_a", event: "Run tests", pan: 0.3 },
  { frame: 1094, role: "tick", take: "tick_a", event: "\"Requesting isolated tests\" row" },
  { frame: 1146, role: "tick", take: "tick_b", event: "the app's own \"· 11 s\", alone in the breath" },
  { frame: 1152, role: "impact", take: "impact_b", event: "Verified", duckDb: 1.5 },
  { frame: 1152, role: "ui", take: "ui_verified", event: "Verified" },
  { frame: 1224, role: "click", take: "click_b", event: "Settings", pan: 0.37 },
  { frame: 1332, role: "click", take: "click_c", event: "Permissions tab", pan: 0.12 },
  { frame: 1404, role: "click", take: "click_a", event: "Auto in project", pan: 0.06 },
  { frame: 1440, role: "click", take: "click_b", event: "Memory tab", pan: 0.21 },
  { frame: 1530, role: "click", take: "click_c", event: "the bin", pan: 0.37 },
  { frame: 1530, role: "ui", take: "ui_forget", event: "the record dissolves" },
  { frame: 1584, role: "impact", take: "impact_a", event: "the second lift", duckDb: 1.5 },
  { frame: 1665, role: "whoosh", take: "whoosh_c", event: "the chart becomes the world (its fastest frame)" },
  { frame: 1799, role: "whoosh", take: "whoosh_a", event: "into the sage field (zoom through the badge)" },
  { frame: 1800, role: "impact", take: "impact_b", event: "the breakdown's one hit" },
  { frame: 2016, role: "thud", take: "thud_b", event: "the end-card landing", duckDb: 1.5 },
  { frame: 2016, role: "impact", take: "impact_b", event: "the end-card landing" },
  { frame: 2160, role: "impact", take: "impact_a", event: "the final hit", duckDb: 2 },
];

/**
 * Mix automation (ENERGY_SPEC §8.3; tools/audio/sfx_kit.json "automation"): spans, not effects. The exporter writes
 * each into tools/audio/cues.json as an entry with no file; tools/audio/mix_master.py applies it, cut_cues.py clips it
 * to a cut's ranges, and it never counts toward the three-effects limit. Effects are never gapped.
 * - gap: the bed and the drive −24 dB from `frame` to `toFrame`, the hit frame (each 9 frames, the last eighth before a
 *   bar line); the bed's own pickup on the "and" of 4 is swallowed: that is the breath;
 * - hold: from f891 (the "and" of beat 2, one frame after the app holds the task at f890) the drive is muted and the
 *   bed sinks behind a low-pass; the Run the tests click (`toFrame`, f990) releases it, back by `releaseFrame` (f1008);
 * - tail: the master fades from `frame` and is digital silence from `toFrame` (f2250) to the end;
 * - ride: the hook's level (OVERRIDES §36: at most 2 dB on the bed and the drive over bars 1–2, the bed file
 *   unchanged): from f0 the bed and the drive sit the kit's ride level down, and come back on the first slam's hit
 *   (`toFrame`, f144) with the hook's gap, so bars 1–2 sit 4–8 LU under the master (ENERGY_SPEC §8.5). A level, not a
 *   breath: the gap rules don't apply to it.
 * The composed breath f486–503 has no automation: the bed and the drive are silent there by their own notes.
 */
export type AutomationRole = "gap" | "hold" | "tail" | "ride";
export interface AutomationCue {
  role: AutomationRole;
  /** the span's first frame */
  frame: number;
  /** the frame it ends on: a gap's or the ride's hit, the hold's releasing click, the tail's first silent frame */
  toFrame: number;
  /** the hold only: the bar line its release ends on */
  releaseFrame?: number;
  event: string;
}
export const AUTOMATION: readonly AutomationCue[] = [
  { role: "ride", frame: at(1), toFrame: at(3), event: "the hook's ride: the quiet open, back on the first slam" },
  { role: "gap", frame: at(2, 4, 9), toFrame: at(3), event: "the breath before the first slam; the dive into the pebble" },
  { role: "hold", frame: at(13, 2, 9), toFrame: at(14, 4), releaseFrame: at(15), event: "AgentGuard holds the task; Run the tests releases it" },
  { role: "gap", frame: at(16, 4, 9), toFrame: at(17), event: "the breath before Verified; the app's own \"· 11 s\" lands in it" },
  { role: "gap", frame: at(22, 4, 9), toFrame: at(23), event: "the breath before the second lift" },
  { role: "gap", frame: at(30, 4, 9), toFrame: at(31), event: "the last breath before the final hit" },
  { role: "tail", frame: at(31, 4), toFrame: at(32, 2), event: "the master fades, then digital silence to the end" },
];
/** The composed breath before the drop (ENERGY_SPEC §6): an empty beat by composition, H2 hanging through it. */
export const COMPOSED_BREATH = { from: at(7, 4), to: at(8) } as const;

export interface Seam {
  frame: number;
  kind: Transition;
  cause: string;
}
export const SEAMS: readonly Seam[] = [
  { frame: 144, kind: "zoom-through", cause: "the camera passes into the thinking pebble's sage body" },
  { frame: 504, kind: "flood", cause: "the pebble's landing pushes paper out from where it lands" },
  { frame: 648, kind: "carry", cause: "the pebble's leap continues across the cut at u = 0.78" },
  { frame: 720, kind: "camera", cause: "the drawer opens; the camera follows Preparing an edit" },
  { frame: 864, kind: "hard-cut", cause: "chapter change on the bar" },
  // lane G-fix (REVIEW-G2 P2-1): a hard cut on the bar, not a whip pan (the move from the read framing ran 202 px/frame)
  { frame: 1008, kind: "hard-cut", cause: "the Run the tests click puts the Run isolated tests card in the drawer; cut to it on the bar" },
  { frame: 1152, kind: "camera", cause: "the Verified row appears (R2) / punch-in cut (fallback)" },
  { frame: 1224, kind: "match-cut", cause: "the Settings button" },
  { frame: 1332, kind: "match-cut", cause: "the Permissions tab" },
  { frame: 1440, kind: "match-cut", cause: "the Memory tab" },
  { frame: 1584, kind: "hard-cut", cause: "the payoff, on the motif downbeat" },
  { frame: 1656, kind: "object-world", cause: "the chart panel grows past the frame" },
  { frame: 1728, kind: "hard-cut", cause: "the next view, on the bar" },
  { frame: 1800, kind: "zoom-through", cause: "the camera passes into the chosen answer's badge" },
  { frame: 2016, kind: "flood", cause: "the pebble lands; paper spreads from it" },
];

/* ================================================================================================================
 * §7 Source-time maps (film frame → source seconds of the vclock recordings; linear between keys)
 * ============================================================================================================== */

export interface SourceKey {
  frame: number;
  s: number;
  /** a jump (allowed only on a cut) or a freeze starts here */
  hold?: boolean;
}
export const SOURCE_MAPS = {
  /**
   * The energetic recut (ENERGY_SPEC §5, OVERRIDES §35 decision 2): no jump and no skip of Pebble's time. The person's
   * part, click to Enter, plays at 2× (0.60 → 3.00 s over f18–54: the question types itself f29–53); from Enter on,
   * Pebble's part plays at 1× (3.00 s on f54, exactly 1/30 s a frame, to 5.9667 s on f143): "Sending", "Thinking"
   * from 3.30 s (f63), the answer's first word at 4.60 s (f102). "Task: completed" (6.60 s) comes after the dive.
   */
  "pet-live-error": [
    { frame: 18, s: 0.6 },
    { frame: 54, s: 3.0 },
    { frame: 143, s: 3.0 + (143 - 54) / 30 },
  ],
  /**
   * Re-keyed by G2a on the R2 recording (3×, 690 frames; source frame index = round(s × 30)), within §7's ± 3 frames
   * except where §7 assumed timings the app does not have:
   * - the status line coalesces "Reading invoice_kit/dates.py" to source 4.50–4.67 s (idx 135–140), so S5a crawls
   *   over those six frames for 1.2 s (f664–700) instead of §7's 0.5× from 3.85 s;
   * - every click re-renders on its own frame (idx 282 at 9.40 s, 480 at 16.00 s, 534 at 17.80 s already show the
   *   change), so each press (f810–813, f990–993, f1080–1083) is drawn over the frame BEFORE the click, and the next
   *   segment catches up at > 1× (no jump without a cut);
   * - f1094 ↔ 18.35 s ("Requesting isolated tests", pose testing) and f1146 ↔ 20.40 s ("· 11 s") are pinned.
   * S5c re-keyed by lane G-fix (REVIEW-G2 P0-1) so the held run is on screen and still long enough to read: 2.5×
   * through the streaming reply (11.80 → 14.50 s: the notice lands at f888, the hold at f890), the app's own scroll at
   * 1× (14.50 → 15.10 s, f896–914), then 0.35× over the settled run (15.10 → 15.97 s, f914–989: only the run's small
   * avatar animates there). The click frames do not move.
   */
  "main-live-film": [
    { frame: 648, s: 3.85 },
    { frame: 664, s: 4.5 },
    { frame: 700, s: 4.6667 },
    { frame: 701, s: 4.7 },
    { frame: 719, s: 5.93 },
    { frame: 791, s: 8.3 },
    { frame: 809, s: 9.3667 },
    { frame: 813, s: 9.3667 },
    { frame: 814, s: 11.05, hold: true },
    { frame: 863, s: 11.05 },
    { frame: 864, s: 11.8, hold: true },
    { frame: 896, s: 14.5 },
    { frame: 914, s: 15.1 },
    { frame: 989, s: 15.9667 },
    { frame: 993, s: 15.9667 },
    { frame: 994, s: 16.0 },
    { frame: 1008, s: 16.5667 },
    { frame: 1031, s: 17.3333 },
    { frame: 1079, s: 17.7667 },
    { frame: 1083, s: 17.7667 },
    { frame: 1084, s: 17.8 },
    { frame: 1094, s: 18.35 },
    { frame: 1146, s: 20.4 },
    { frame: 1151, s: 20.5667 },
    { frame: 1152, s: 20.6 },
    { frame: 1223, s: 22.9667 },
  ],
} as const satisfies Record<string, readonly SourceKey[]>;

/** Source seconds shown on film frame `frame` (linear between keys; a `hold` key starts a new segment). */
export function sourceAt(map: readonly SourceKey[], frame: number): number | null {
  if (!map.length || frame < map[0]!.frame) return null;
  for (let i = map.length - 1; i >= 0; i--) {
    const a = map[i]!;
    if (frame >= a.frame) {
      const b = map[i + 1];
      if (!b || b.hold) return a.s;
      return a.s + ((b.s - a.s) * (frame - a.frame)) / (b.frame - a.frame);
    }
  }
  return null;
}

/* ================================================================================================================
 * §14 Review frames
 * ============================================================================================================== */

export interface ReviewFrame {
  id: string;
  shot: string;
  frame: number;
  note: string;
}
/** Gate G1.5's style frames (critic H11), both aspects, full resolution. */
export const STYLE_FRAMES: readonly ReviewFrame[] = [
  { id: "SF1", shot: "S1", frame: 0, note: "the thumbnail: the pebble on its desktop, eyes open" },
  { id: "SF0b", shot: "S1", frame: 60, note: "the 2 s muted check: the posted question legible in the open quick chat (ENERGY_SPEC §5)" },
  { id: "SF2", shot: "S4", frame: 540, note: "the reveal lockup with T5 (flat paper, the pebble as the full stop on its line)" },
  { id: "SF3", shot: "S5", frame: 985, note: "a punch-in: the held run, the pointer on Run the tests, T8 in the column" },
  { id: "SF4", shot: "S5", frame: 1170, note: "the climax: the focus on the Verified row (the rest receded), the check, T10, the pebble writing" },
  { id: "SF5", shot: "S9", frame: 2280, note: "the end card, everything landed" },
  { id: "SF6", shot: "S7", frame: 1700, note: "(extra) the chart as the world" },
];
/** Every downbeat, for contact sheets (one frame per bar, each checked at 360 px wide). */
export const BAR_FRAMES: readonly number[] = Array.from({ length: GRID.bars }, (_, i) => at(i + 1));

export const shotAt = (frame: number): Shot | undefined => SHOTS.find((s) => frame >= s.from && frame < s.to);
export const beatAt = (frame: number): Beat | undefined => shotAt(frame)?.beats.find((b) => frame >= b.from && frame < b.to);
export const shotById = (id: string): Shot => {
  const s = SHOTS.find((x) => x.id === id);
  if (!s) throw new Error(`timeline: no shot "${id}"`);
  return s;
};

/* ================================================================================================================
 * Checks
 * ============================================================================================================== */

const wordsIn = (s: string) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** §8: 0.5 s + 0.3 s per word, ≥ 1.2 s (the last line of a shot ≥ 2 s); the end card's key lines readable twice. */
export const minHoldFrames = (c: TextCue, last = false): number => {
  const n = wordsIn(c.lines.join(" "));
  const read = Math.max(last ? 2 : 1.2, 0.5 + 0.3 * n);
  return sec(c.key ? Math.max(read, 2, 0.6 * n) : read);
};

/** A camera move's span on one aspect's frames ([from, to): it starts moving after `from`, arrives on `to`). The
 *  scenes' camera keys live outside this pure module (film/hook.ts, film/framing.ts); LaunchFilm passes them in. */
export interface CameraMove {
  aspect: Aspect;
  from: number;
  to: number;
  what: string;
}

/** The breaths (ENERGY_SPEC §2, §8.3): the four gaps and the composed breath before the drop, [from, to) with the hit
 *  on `to`. */
export const breaths = (): { from: number; to: number; what: string }[] => [
  ...AUTOMATION.filter((a) => a.role === "gap").map((g) => ({ from: g.frame, to: g.toFrame, what: `the gap f${g.frame}–${g.toFrame - 1}` })),
  { from: COMPOSED_BREATH.from, to: COMPOSED_BREATH.to, what: `the composed breath f${COMPOSED_BREATH.from}–${COMPOSED_BREATH.to - 1}` },
];
/** Verified is held 36 frames (ENERGY_SPEC §6, Avoid 5): no cut and no camera move from its frame to the pull-back. */
export const VERIFIED_HOLD = { from: 1152, to: 1188 } as const;
/** At most ten lines slam (ENERGY_SPEC §2 rule 4, §7). */
export const MAX_SLAMS = 10;

/** Every problem in the timeline (an empty list means it is valid). Copy still waiting for chapters.ts is not a
 *  problem: see pendingCopy(). `camera`: the scenes' camera moves, when the caller has them (LaunchFilm does; the cue
 *  exporter, which stays free of Remotion, checks everything else). */
export function validateTimeline(camera: readonly CameraMove[] = []): string[] {
  const out: string[] = [...problems];
  if (GRID.framesPerBeat * GRID.beatsPerBar !== GRID.barFrames) out.push("beat map: frames per bar ≠ beats × frames per beat");
  if (at(GRID.bars + 1) !== GRID.frames) out.push(`beat map: ${GRID.bars} bars end on frame ${at(GRID.bars + 1)}, not ${GRID.frames}`);
  let cursor = 0;
  for (const s of SHOTS) {
    if (s.from !== cursor) out.push(`shot ${s.id}: starts on ${s.from}, expected ${cursor} (shots tile the film)`);
    if ((s.from - GRID.firstDownbeat) % GRID.barFrames !== 0) out.push(`shot ${s.id}: not on a bar line (${s.from})`);
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
  if (shotById("S4").from !== REVEAL_FRAME) out.push(`S4 must start on the reveal, frame ${REVEAL_FRAME}`);
  // text: ≤ 6 words a line, holds, inside the film
  const byShot = new Map<string, TextCue[]>();
  for (const c of TEXT) {
    const sh = shotAt(c.in);
    if (!sh) {
      out.push(`${c.id}: enters outside the film`);
      continue;
    }
    byShot.set(sh.id, [...(byShot.get(sh.id) ?? []), c]);
    // small print (T21, T22) is not a read-aloud line (§8 notes)
    if (c.role !== "small") for (const l of [...c.lines, ...(c.squareLines ?? [])]) if (wordsIn(l) > 6) out.push(`${c.id}: "${l}" has more than 6 words`);
  }
  for (const [, cs] of byShot) {
    const solo = cs.filter((c) => c.role !== "small");
    solo.forEach((c, i) => {
      const last = i === solo.length - 1;
      const need = minHoldFrames(c, last);
      if (c.out < END && c.out - c.in < need) out.push(`${c.id}: holds ${c.out - c.in} frames, needs ${need}`);
    });
  }
  // the character
  for (const a of ["wide", "square", "vertical"] as const) out.push(...checkCues(FILM_PEBBLE_CUES[a], `FILM_PEBBLE_CUES.${a}`));
  for (const h of HOPS) {
    const landing = sec(h.at + h.duration);
    if (h.id === "H2" && landing !== REVEAL_FRAME) out.push(`H2 lands on ${landing}, not the reveal ${REVEAL_FRAME}`);
    if (h.id === "H4" && landing !== at(29)) out.push(`H4 lands on ${landing}, not bar 29 (${at(29)})`);
  }
  // clicks on beats
  for (const c of CLICKS) if (!isBeat(c.frame)) out.push(`click on ${c.target} (f${c.frame}) is not on a beat`);
  // one riser, ending on the reveal
  const risers = SFX.filter((f) => f.role === "riser");
  if (risers.length !== 1 || risers[0]!.frame !== REVEAL_FRAME) out.push("there must be exactly one riser, ending on the reveal frame");
  for (const r of STYLE_FRAMES) {
    const s = shotById(r.shot);
    if (r.frame < s.from || r.frame >= s.to) out.push(`style frame ${r.id}: frame ${r.frame} is outside shot ${s.id}`);
  }
  out.push(...checkRecut(camera));
  return out;
}

/** The energetic recut's rules (ENERGY_SPEC §2, §5–§8; tasks.json visual task 11). */
function checkRecut(camera: readonly CameraMove[]): string[] {
  const out: string[] = [];
  const isEighth = (f: number) => (f - GRID.firstDownbeat) % (GRID.framesPerBeat / 2) === 0;
  const isBar = (f: number) => (f - GRID.firstDownbeat) % GRID.barFrames === 0;
  // the gaps: nine frames each, ending the frame before a bar line
  const gaps = AUTOMATION.filter((a) => a.role === "gap");
  for (const g of gaps) {
    if (g.toFrame - g.frame !== 9) out.push(`gap f${g.frame}: ${g.toFrame - g.frame} frames, not 9`);
    if (!isBar(g.toFrame)) out.push(`gap f${g.frame}: ends on f${g.toFrame}, not a bar line`);
  }
  // the hits after the breaths (the gaps' and the composed breath's) are at least 4 bars apart
  const landings = breaths()
    .map((b) => b.to)
    .sort((x, y) => x - y);
  for (let i = 1; i < landings.length; i++) {
    if (landings[i]! - landings[i - 1]! < 4 * GRID.barFrames) out.push(`breath landings f${landings[i - 1]} and f${landings[i]} are under 4 bars apart`);
  }
  if (COMPOSED_BREATH.to !== REVEAL_FRAME) out.push(`the composed breath must land on the reveal (f${REVEAL_FRAME})`);
  // the hold: from an eighth to the Run the tests click, released to a bar line
  const holds = AUTOMATION.filter((a) => a.role === "hold");
  if (holds.length !== 1) out.push(`there must be exactly one hold, not ${holds.length}`);
  for (const h of holds) {
    if (!isEighth(h.frame)) out.push(`the hold starts on f${h.frame}, not an eighth`);
    const click = CLICKS.find((c) => c.frame === h.toFrame);
    if (!click || click.target !== "Run the tests") out.push(`the hold must end on the Run the tests click, not f${h.toFrame}`);
    if (h.releaseFrame === undefined || !isBar(h.releaseFrame) || h.releaseFrame <= h.toFrame) out.push(`the hold's release must end on a bar line after f${h.toFrame}`);
  }
  const tails = AUTOMATION.filter((a) => a.role === "tail");
  if (tails.length !== 1 || tails[0]!.toFrame >= GRID.frames) out.push("there must be one tail, its silence starting inside the film");
  // inside a breath: no cut, no camera move starting, no pose cue, no line landing, no hop taking off. Exceptions: the
  // hook's dive (from f135), H2's take-off (f486), slam pre-rolls in a gap's last 3 frames (the line lands on the hit)
  const n = SLAM_PREROLL_FRAMES;
  for (const b of breaths()) {
    const inside = (f: number) => f >= b.from && f < b.to;
    for (const sm of SEAMS) if (inside(sm.frame)) out.push(`${b.what}: the ${sm.kind} at f${sm.frame} falls inside it`);
    for (const sh of SHOTS) if (inside(sh.from)) out.push(`${b.what}: shot ${sh.id} starts inside it`);
    for (const m of camera) {
      if (!inside(m.from + 1)) continue;
      if (m.from === S1_CAMERA.zoomThrough.from && m.what.includes("dive")) continue; // the hook's dive, from f135
      out.push(`${b.what}: ${m.aspect} ${m.what} starts moving on f${m.from + 1}`);
    }
    for (const a of ["wide", "square", "vertical"] as const) {
      for (const c of FILM_PEBBLE_CUES[a]) if (c.pose && inside(Math.round(c.at * FPS))) out.push(`${b.what}: pose ${c.pose} (${a}) on f${Math.round(c.at * FPS)}`);
    }
    for (const h of HOPS) {
      const f = sec(h.at);
      if (inside(f) && !(h.id === "H2" && f === COMPOSED_BREATH.from)) out.push(`${b.what}: hop ${h.id} takes off on f${f}`);
    }
    for (const c of TEXT) {
      for (const land of c.enter === "slam" && c.wordStarts ? c.wordStarts : [c.in]) {
        if (inside(land)) out.push(`${b.what}: ${c.id} lands on f${land}`);
        if (c.enter === "slam" && land - n < b.to && land > b.from && land !== b.to) out.push(`${b.what}: ${c.id}'s slam pre-roll reaches into it without landing on its hit`);
      }
    }
  }
  // slams: at most ten; each lands on an eighth unless on its shot's first frame
  const slams = TEXT.filter((c) => c.enter === "slam");
  if (slams.length > MAX_SLAMS) out.push(`${slams.length} slam cues; at most ${MAX_SLAMS}`);
  for (const c of slams) {
    const first = shotAt(c.in)?.from;
    for (const land of c.wordStarts ?? [c.in]) if (!isEighth(land) && land !== first) out.push(`${c.id}: its slam lands on f${land}, not an eighth`);
    if (c.wordStarts && c.wordStarts[0] !== c.in) out.push(`${c.id}: its first word must land on its in (f${c.in})`);
  }
  // the hook's honest time: the person's part at 2×, Pebble's part at exactly 1× from Enter (f54), no jump
  const hook = SOURCE_MAPS["pet-live-error"] as readonly SourceKey[];
  for (let i = 1; i < hook.length; i++) {
    const a = hook[i - 1]!;
    const b = hook[i]!;
    if (b.hold) out.push(`pet-live-error: a jump at f${b.frame}; the hook plays without one`);
    const slope = (b.s - a.s) / (b.frame - a.frame);
    if (a.frame >= HOOK_ENTER_FRAME && Math.abs(slope - 1 / FPS) > 1e-9) out.push(`pet-live-error: f${a.frame}–${b.frame} plays at ${(slope * FPS).toFixed(4)}×, not 1× (Pebble's own time)`);
    if (b.frame <= HOOK_ENTER_FRAME && Math.abs(slope - 2 / FPS) > 1e-9) out.push(`pet-live-error: f${a.frame}–${b.frame} plays at ${(slope * FPS).toFixed(4)}×, not 2× (the person's part)`);
  }
  if (hook[0]?.frame !== CLICKS[0]!.frame) out.push(`pet-live-error: the chat must open on the click frame (f${CLICKS[0]!.frame})`);
  // pose spacing (FILM_SPEC §9.3): ≥ 14 frames between pose changes, ≥ 18 into or out of review
  for (const a of ["wide", "square", "vertical"] as const) {
    let prev: { f: number; pose: string } | null = null;
    for (const c of FILM_PEBBLE_CUES[a]) {
      if (!c.pose) continue;
      const f = Math.round(c.at * FPS);
      if (prev && prev.pose !== c.pose) {
        const need = prev.pose === "review" || c.pose === "review" ? 18 : 14;
        if (f - prev.f < need) out.push(`FILM_PEBBLE_CUES.${a}: ${prev.pose} → ${c.pose} at f${f} is ${f - prev.f} frames after the last change (needs ${need})`);
      }
      prev = { f, pose: c.pose };
    }
  }
  // Verified is held: no cut and no camera move inside it
  for (const sm of SEAMS) if (sm.frame > VERIFIED_HOLD.from && sm.frame < VERIFIED_HOLD.to) out.push(`the Verified hold: the ${sm.kind} at f${sm.frame} falls inside it`);
  for (const m of camera) if (m.to > VERIFIED_HOLD.from && m.from + 1 < VERIFIED_HOLD.to) out.push(`the Verified hold: ${m.aspect} ${m.what} moves f${m.from + 1}–${m.to}`);
  return out;
}
