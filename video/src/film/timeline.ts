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
import { checkCues, type PebbleCue } from "../../../shared/pebble/cues";

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
export interface PerAspect<T> {
  wide: T;
  square: T;
}
const both = <T,>(wide: T, square: T): PerAspect<T> => ({ wide, square });
/** A ROI given as x0–x1, y0–y1 (FILM_SPEC's notation). */
const roi = (x0: number, x1: number, y0: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

/** A framing inside the stage: magnification m and the region of interest (its centre at the stage's centre). */
export interface Framing {
  m: number;
  roi: Rect;
}
const fr = (m: number, r: Rect): Framing => ({ m, roi: r });

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

/** S1's camera states: magnification and where the pebble's centre sits in the frame (§6 S1). */
export const S1_CAMERA = {
  /** C0, f0–39: frame 0, the thumbnail */
  c0: { m: 2.6, pebbleAt: both({ x: 1300, y: 640 }, { x: 640, y: 620 }) },
  /** C1, f40–63 → hold to f71: the open chat */
  c1: { m: 1.5, pebbleAt: both({ x: 1430, y: 746 }, { x: 742, y: 746 }) },
  /** C2, f72 (hard cut, punch-in): the sent question. Lane G-fix (REVIEW-G2 P1-8): the pebble at y 921, not §6's 866,
   *  so the quick chat's top edge sits 65 px under the frame's top and its header 104 px (OVERRIDES §4's 60 px); the
   *  pebble may sit in the caption band, it is not text */
  c2: { m: 2.2, pebbleAt: both({ x: 1379, y: 921 }, { x: 837, y: 921 }) },
  /** f131–143: the zoom through the pebble, aimed at a body point (−20, +25) viewBox units from its centre. Lane G-fix
   *  (REVIEW-G2 P1-2): it starts on f131, not f126, so the body fills the frame ON f143 and the world changes on the
   *  bar line (f144), where the whoosh peaks */
  zoomThrough: { from: at(2, 4, 5), to: at(3), aim: { x: -20, y: 25 }, scale: 22 },
} as const;

/** The stage framings of the window world (§6 S5–S7), as G1 drew them on lane D's stills for the board-o-matic. The
 *  animated film frames the REAL recording with film/framing.ts (lane G2a), edge-checked frame by frame. */
export const FRAMING = {
  s5a: both(fr(2.6, roi(350, 735, 40, 406)), fr(2.65, roi(350, 712, 120, 401))),
  s5bTop: both(fr(2.4, roi(810, 1150, 205, 602)), fr(2.65, roi(817, 1143, 205, 486))),
  s5bLow: both(fr(2.4, roi(810, 1150, 404, 800)), fr(2.65, roi(817, 1143, 519, 800))),
  /**
   * 16:9 ROI y 313–745, not §6's 300–733: on the held-unverified still that puts Run the tests at §6's frame y ≈ 640 (the
   * spec's ROI gives 668) and both stage edges in clear space (the spec's top edge halves the "tests/test_dates.py"
   * bullet and its bottom edge halves the composer's model row). Re-check against the R-recording when G2 has it.
   */
  s5c: both(fr(2.2, roi(215, 670, 313, 745)), fr(2.65, roi(220, 582, 380, 661))),
  s5d: both(fr(2.6, roi(812, 1150, 200, 566)), fr(2.65, roi(817, 1143, 205, 486))),
  s5dSquareTilt: fr(2.65, roi(817, 1143, 300, 581)),
  /**
   * the S5d fallback (no R2 recording): main-done-timeline@3x on the conversation's run block, the Verified row. Edges
   * measured on the still: the run's avatar spans x 258.5–275.2 and the pill starts at 288; the rows end by x 645; the
   * user's bubble ends at y 266, the pill starts at 325, "Done, and verified:" ends at 605.7 and the composer starts at
   * 627. 16:9 keeps the avatar 12 css px inside the stage; the square (m 2.5) holds the avatar, the whole pill (with air
   * above it) and the rows down to Details.
   */
  s5eRows: both(fr(2.4, roi(246, 662, 225, 622)), fr(2.5, roi(248, 661, 282, 580))),
  s5eOut: both(fr(1.3, roi(340, 1110, 0, 732)), fr(1.3, roi(366, 1160, 0, 572))),
  /** §6 S6 (G2a: back to the spec's 16:9 m 2.0, ROI x 336–836, from G1's 2.1; at 2.1 the bins sat 55 px from the
   *  frame's right edge, at 2.0 they sit 80 px inside, as §6 asks) */
  s6a: both(fr(2.0, roi(336, 836, 96, 572)), fr(2.27, roi(346, 769, 100, 428))),
  s6bSquareTilt: fr(2.27, roi(346, 769, 200, 528)),
  s6cRecords: both(fr(2.0, roi(336, 836, 324, 800)), fr(2.08, roi(343, 805, 442, 800))),
  s7a: both(fr(1.25, roi(612, 1412, 70, 832)), fr(1.25, roi(640, 1408, 62, 657))),
  /**
   * S7b's end framing: full bleed, m and the CSS point at the frame's centre. A G1.5 deviation from §6 (16:9 m 2.56 on
   * (1041, 640), square m 2.26 on (1041, 661)), measured on main-dashboard@3x: the spec's 16:9 crop shows the panel's
   * right border as a 1 px line and cuts the legend through its middle, and its square crop cuts Flights mid-bar and
   * leaves "…ry" / "…st spent" title fragments top left. These crops make the bars and their labels the world (as §6
   * words it) and keep every edge in clear space: 16:9 holds all six groups between the subtitle (ends y 480.3) and the
   * legend (starts y 842), with the y-axis numbers (end x 748.6) outside and the gridlines (x 758.2–1381) bleeding off
   * both sides; the square holds Stay → Transit with its side edges in the bar gaps (x 848–877, 1246–1292). The 16:9
   * m 3.2 upsamples the @3x still by 7 %. Lane E to ratify.
   */
  s7b: both({ m: 3.2, centre: { x: 1059, y: 661.5 } }, { m: 2.55, centre: { x: 1061.5, y: 661.5 } }),
  s7c: both(fr(2.6, roi(735, 1145, 330, 665)), fr(2.4, roi(735, 1135, 330, 640))),
} as const;

/** UI points the film touches, CSS px of the captured window (measured on the @2x stills). */
export const UI_POINTS = {
  /** held-unverified: the held panel ("Blocked" through the three buttons) and Run the tests */
  heldPanel: { x: 342, y: 470, w: 700, h: 128 } as Rect,
  runTests: { x: 386, y: 558, w: 96, h: 32 } as Rect,
  /** main-done-timeline: the conversation's "Verified · pytest 42 passed on current files · 2 s" row */
  verifiedRow: { x: 310, y: 506, w: 420, h: 22 } as Rect,
  /** main-done-timeline: the run block (the receipt line and the timeline rows) */
  runBlock: { x: 255, y: 325, w: 470, h: 245 } as Rect,
  /** the window's Settings button (the gear) */
  gear: { x: 1036, y: 32 } as Point,
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

export type TextRole = "hero" | "headline" | "side" | "tagline" | "support" | "cta" | "mono" | "small";
export type Entrance = "blur" | "ink" | "rise" | "fade";

export interface TextCue {
  id: string;
  chapter: ChapterId;
  /** the lines as they break on screen (16:9; `squareLines` when the square breaks differently) */
  lines: readonly string[];
  squareLines?: readonly string[];
  role: TextRole;
  enter: Entrance;
  /** the first word's frame */
  in: number;
  /** the frame the exit starts (gone 6 frames later); END = held to the end */
  out: number;
  /** explicit word frames (T7 builds with its verbs) */
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

/** A list's earlier items dim to 45 % (REVIEW-G2 P1-6); the current one stays at full contrast (lead addendum). */
export const LIST_DIM = 0.45;
/** Each list's left edge (px at the reference size), so that its widest line sits centred on the frame. */
export const LIST_X = { questions: both(572, 222), facts: both(388, 236) } as const;

export const END = GRID.frames + 6;

/** A text cue, its words checked as one copy line. */
const t = (c: TextCue): TextCue => {
  line(c.chapter, c.lines.join(" "));
  return c;
};

export const TEXT: readonly TextCue[] = [
  // S2, lane G-fix (REVIEW-G2 P1-6 and the lead's addendum): the three questions build a list, the checklist the film
  // goes on to answer. Each inks in whole, starting 3 frames before its downbeat (FILM_SPEC §1) so it reads at full
  // contrast on the beat; the one before it dims to 45 % as it arrives; all three leave together f348–354.
  t({ id: "T1", chapter: "desktop", lines: ["What did it change?"], role: "headline", enter: "ink", in: 144, out: 348, dimAt: 213, inkTogether: true, place: "centre", y: both(350, 360), x: LIST_X.questions }),
  t({ id: "T2", chapter: "desktop", lines: ["Can I undo it?"], role: "headline", enter: "ink", in: 213, out: 348, dimAt: 285, inkTogether: true, place: "centre", y: both(470, 470), x: LIST_X.questions }),
  t({ id: "T3", chapter: "desktop", lines: ["Did it run the tests?"], role: "headline", enter: "ink", in: 285, out: 348, inkTogether: true, place: "centre", y: both(590, 580), x: LIST_X.questions }),
  t({ id: "T4", chapter: "desktop", lines: ["An agent shouldn't", "grade its own work"], role: "headline", enter: "rise", in: 360, out: 462, place: "centre", y: both(420, 420) }),
  t({ id: "T5", chapter: "desktop", lines: ["A small companion for your Mac"], role: "support", enter: "blur", in: 522, out: 612, place: "baseline", y: both(560, 530) }),
  t({ id: "T6", chapter: "project", lines: ["It reads", "your project"], role: "side", enter: "blur", in: 666, out: 718, place: "column" }),
  t({ id: "T7", chapter: "project", lines: ["Review, apply,", "undo"], role: "side", enter: "blur", in: 756, out: 858, wordStarts: [756, 811, 830], place: "column" }),
  // lane G-fix (REVIEW-G2 P0-1): T8 lands on the bar-14 downbeat (f936), after the held run is in view, not mid-scroll
  t({ id: "T8", chapter: "tested", lines: ["AgentGuard checks", "the evidence"], role: "side", enter: "blur", in: 936, out: 1038, place: "column" }),
  t({ id: "T9", chapter: "tested", lines: ["Tests run in", "an isolated copy"], role: "side", enter: "blur", in: 1044, out: 1140, place: "column" }),
  t({ id: "T10", chapter: "tested", lines: ["Done means tested"], role: "side", enter: "ink", in: 1152, out: 1212, place: "column" }),
  t({ id: "T11", chapter: "model", lines: ["Your model,", "your choice"], role: "side", enter: "blur", in: 1242, out: 1320, place: "column" }),
  t({ id: "T11s", chapter: "model", lines: ["Even one on your Mac"], role: "support", enter: "blur", in: 1260, out: 1320, place: "column", under: "T11" }),
  t({ id: "T12", chapter: "pace", lines: ["You set what", "it may do"], role: "side", enter: "rise", in: 1350, out: 1428, place: "column" }),
  t({ id: "T13", chapter: "memory", lines: ["Memory you can", "read and forget"], role: "side", enter: "blur", in: 1458, out: 1578, place: "column" }),
  t({ id: "T14", chapter: "views", lines: ["Views,", "not just text"], role: "side", enter: "blur", in: 1584, out: 1656, place: "column" }),
  // S8, lane G-fix (REVIEW-G2 P1-6, P1-3): the facts build a list the same way; T16 lands on bar 27 (f1872), T17 on
  // beat 107 (f1926); the list leaves together f1998–2004, before the end card's pebble enters the frame (≈ f2005).
  // "Apache-2.0" keeps G2a's clearance under "open" (its capitals touched the "p" at §8's distance).
  t({ id: "T15", chapter: "open-source", lines: ["Free and open source"], role: "headline", enter: "ink", in: 1800, out: 1998, dimAt: 1869, inkTogether: true, place: "centre", y: both(300, 280), x: LIST_X.facts }),
  t({ id: "T15s", chapter: "open-source", lines: ["Apache-2.0"], role: "support", enter: "ink", in: 1806, out: 1998, dimAt: 1869, inkTogether: true, place: "baseline", y: both(435, 395), x: LIST_X.facts }),
  t({ id: "T16", chapter: "open-source", lines: ["No telemetry"], role: "headline", enter: "ink", in: 1869, out: 1998, dimAt: 1923, inkTogether: true, place: "centre", y: both(545, 500), x: LIST_X.facts }),
  t({ id: "T17", chapter: "open-source", lines: ["Your keys stay in your Keychain"], squareLines: ["Your keys stay", "in your Keychain"], role: "headline", enter: "ink", in: 1923, out: 1998, inkTogether: true, place: "centre", y: both(685, 680), x: LIST_X.facts }),
  t({ id: "T18", chapter: "get", lines: ["A little help, right here."], role: "tagline", enter: "blur", in: 2088, out: END, place: "baseline", y: both(560, 520), key: true }),
  t({ id: "T19", chapter: "get", lines: ["Free for Macs with Apple silicon"], role: "cta", enter: "rise", in: 2160, out: END, place: "baseline", y: both(690, 630), key: true }),
  t({ id: "T20", chapter: "get", lines: ["github.com/tohin003/Pebble"], role: "mono", enter: "rise", in: 2164, out: END, place: "baseline", y: both(770, 700), key: true }),
  t({ id: "T21", chapter: "get", lines: ["Shown with sample data"], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: both(852, 820) }),
  t({ id: "T22", chapter: "get", lines: [bloubCredit], role: "small", enter: "fade", in: 2196, out: END, place: "baseline", y: both(892, 860) }),
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
}
/** G2a: H1 starts at y 1200, not §9.2's 1150: at 1150 the 210 px pebble's top (y 1041) showed at the frame's bottom
 *  edge through S3's first bar; at 1200 it is fully below the frame until it rises. */
export const HOPS: readonly HopSpec[] = [
  { id: "H1", at: 14.4, duration: 0.5, from: both({ x: 960, y: 1200 }, { x: 540, y: 1200 }), to: both({ x: 960, y: 880 }, { x: 540, y: 880 }) },
  { id: "H2", at: time(490), duration: 0.467, from: both({ x: 960, y: 880 }, { x: 540, y: 880 }), to: both({ x: 1295, y: 422 }, { x: 806, y: 402 }) },
  { id: "H3", at: time(634), duration: 0.6, from: both({ x: 1295, y: 422 }, { x: 806, y: 402 }), to: both({ x: 330, y: 900 }, { x: 940, y: 300 }) },
  { id: "H4", at: time(2002), duration: 0.467, from: both({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }), to: both({ x: 1295, y: 422 }, { x: 806, y: 402 }) },
];

export const PEBBLE_INSTANCES = {
  /** inside the desktop world at the pet's place, scaled by the camera, light palette */
  desk: { from: 0, to: 144 },
  /** off-frame below, rises in (H1), leaps (H2), carries (H3); dark until the reveal flood (f504), then light */
  main: { from: 432, to: 1666, start: both({ x: 960, y: 1200 }, { x: 540, y: 1200 }), hops: ["H1", "H2", "H3"], lightFrom: 504 },
  /** the end card's: off-frame lower right, H4; dark until f2016, then light */
  end: { from: 1999, to: GRID.frames, start: both({ x: 2050, y: 1180 }, { x: 1180, y: 1180 }), hops: ["H4"], lightFrom: 2016 },
} as const;

/** §9.3, the static cues (the pointer-driven look cues of f8–30, 780–826, 960–1000, 1050–1090 and 1196–1555 are computed
 *  by the scenes from the cursor with gazeToward and merged in). Square variants differ only in four looks. */
const cue = (frame: number, c: Omit<PebbleCue, "at">): PebbleCue => ({ at: time(frame), ...c });
function cuesFor(square: boolean): PebbleCue[] {
  return [
    cue(-15, { look: { x: -0.625, y: -0.375 }, note: "G1.5: before frame 0 the eyes turn to where the pointer will enter (upper left), so the thumbnail looks somewhere" }),
    cue(22, { pose: "hover", note: "the pointer enters the pet window" }),
    cue(36, { pose: "tap", note: "click" }),
    cue(48, { look: null, note: "the pointer has faded" }),
    cue(72, { pose: "thinking", note: "the run has started" }),
    cue(144, { pose: "idle" }),
    cue(440, { look: { x: 0, y: -0.75 }, note: "looks up at T4" }),
    cue(481, { look: square ? { x: 0.5, y: -0.875 } : { x: 0.625, y: -0.75 }, note: "eyes lead the leap" }),
    cue(504, { pose: "tap", note: "lands: the reveal" }),
    cue(520, { look: null }),
    cue(540, { pose: "idle", note: "tap ends (1.2 s)" }),
    cue(624, { look: square ? { x: 0.75, y: -0.625 } : { x: -0.875, y: 0.5 }, note: "eyes lead the carry" }),
    cue(652, { pose: "reading", note: "lands in the window world" }),
    cue(660, { look: square ? { x: -0.875, y: 0.5 } : { x: 0.875, y: -0.375 }, note: "toward the status line" }),
    cue(711, { pose: "editing", note: "inside the f708–714 blink" }),
    cue(756, { pose: "review", note: "the edit card waits (\"!\"); on f756, with \"Review,\", after the f720–753 camera move, so the morph plays on a still frame (REVIEW-G2 P1-4)" }),
    cue(864, { pose: "thinking" }),
    cue(890, { pose: "blocked", note: "verification required (the hold lands at f890 on the re-keyed S5c, REVIEW-G2 P0-1)" }),
    cue(995, { pose: "review", note: "the Run isolated tests card waits" }),
    cue(1094, { pose: "testing" }),
    cue(1161, { pose: "writing", note: "after Verified, Pebble writes its final reply" }),
    cue(1204, { pose: "happy", note: "the verified run completes (the one celebration)" }),
    cue(1339, { pose: "idle", note: "happy ends after 4.5 s, as in the app" }),
    cue(1584, { look: square ? { x: -0.875, y: 0.5 } : { x: 0.875, y: -0.375 }, note: "the dashboard" }),
    cue(1999, { look: square ? { x: -0.375, y: -0.875 } : { x: -0.75, y: -0.75 }, note: "P-end: eyes lead the landing" }),
    cue(2016, { pose: "tap", note: "lands in the end-card lockup" }),
    cue(2030, { look: null }),
    cue(2052, { pose: "idle" }),
    cue(2166, { look: { x: -0.625, y: 0.75 }, note: "glances at the URL" }),
    cue(2214, { look: { x: 0, y: 0 }, note: "looks at the viewer to the end" }),
  ];
}
export const FILM_PEBBLE_CUES: PerAspect<readonly PebbleCue[]> = both(cuesFor(false), cuesFor(true));

/* ================================================================================================================
 * §10 Clicks, §11 sound effects, §12 seams
 * ============================================================================================================== */

export interface Click {
  frame: number;
  target: string;
  shot: string;
}
export const CLICKS: readonly Click[] = [
  { frame: 36, target: "the pebble", shot: "S1a" },
  { frame: 810, target: "Apply edit", shot: "S5b" },
  { frame: 990, target: "Run the tests", shot: "S5c" },
  { frame: 1080, target: "Run tests", shot: "S5d" },
  { frame: 1224, target: "Settings (the gear)", shot: "S5e" },
  { frame: 1332, target: "Permissions tab", shot: "S6a" },
  { frame: 1404, target: "Auto in project", shot: "S6b" },
  { frame: 1440, target: "Memory tab", shot: "S6b" },
  { frame: 1530, target: "the bin (Forget this memory)", shot: "S6c" },
];

export type SfxRole = "click" | "pop" | "tick" | "thud" | "whoosh" | "riser" | "hit" | "shimmer";
export interface SfxCue {
  /** the PICTURE frame; the exporter puts the peak one frame later (the riser's END on the reveal, sfx_kit.json) */
  frame: number;
  role: SfxRole;
  take: string;
  event: string;
  pan?: number;
  duckDb?: number;
}
/** G2a: every click's pan is §11's 0.4 × (x − W/2)/(W/2) at the pointer's 16:9 frame x on its click-down frame, as the
 *  animated film places it (film/framing.ts pointerSpans, film/hook.ts); §11 had estimates for five of the nine. */
export const SFX: readonly SfxCue[] = [
  { frame: 36, role: "click", take: "click_a", event: "the pebble is clicked", pan: 0.13 },
  // lane G-fix (REVIEW-G2 P1-2): the dives now fill the frame on f143 / f1799, so each whoosh peaks on the world change
  { frame: 143, role: "whoosh", take: "whoosh_b", event: "into the sage field (zoom through the pebble)" },
  { frame: 504, role: "riser", take: "riser", event: "bars 6–7, its end on the reveal" },
  { frame: 504, role: "hit", take: "soft_hit_b", event: "the reveal landing", duckDb: 2.5 },
  { frame: 504, role: "thud", take: "thud_a", event: "texture under the hit" },
  { frame: 648, role: "whoosh", take: "whoosh_a", event: "the carry into the window world" },
  { frame: 810, role: "click", take: "click_b", event: "Apply edit", pan: 0.3 },
  { frame: 814, role: "pop", take: "pop_a", event: "Done" },
  { frame: 990, role: "click", take: "click_c", event: "Run the tests", pan: 0.09 },
  { frame: 1080, role: "click", take: "click_a", event: "Run tests", pan: 0.3 },
  { frame: 1094, role: "tick", take: "tick_a", event: "\"Requesting isolated tests\" row" },
  { frame: 1152, role: "shimmer", take: "shimmer_a", event: "Verified" },
  { frame: 1224, role: "click", take: "click_b", event: "Settings", pan: 0.37 },
  { frame: 1332, role: "click", take: "click_c", event: "Permissions tab", pan: 0.12 },
  { frame: 1404, role: "click", take: "click_a", event: "Auto in project", pan: 0.06 },
  { frame: 1440, role: "click", take: "click_b", event: "Memory tab", pan: 0.21 },
  { frame: 1530, role: "click", take: "click_c", event: "the bin", pan: 0.37 },
  { frame: 1542, role: "pop", take: "pop_c", event: "the record dissolves" },
  { frame: 1665, role: "whoosh", take: "whoosh_c", event: "the chart becomes the world (its fastest frame)" },
  { frame: 1799, role: "whoosh", take: "whoosh_a", event: "into the sage field (zoom through the badge)" },
  { frame: 2016, role: "pop", take: "pop_b", event: "the end-card landing" },
  { frame: 2016, role: "thud", take: "thud_b", event: "landing texture", duckDb: 1.5 },
];

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
  "pet-live-error": [
    { frame: 36, s: 0.6 },
    { frame: 71, s: 1.28 },
    { frame: 72, s: 3.35, hold: true },
    { frame: 143, s: 4.5 },
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
  { id: "SF2", shot: "S4", frame: 540, note: "the reveal lockup with T5 (paper, pool of light, the period pebble)" },
  { id: "SF3", shot: "S5", frame: 985, note: "a punch-in: the held run, the pointer on Run the tests, T8 in the column" },
  { id: "SF4", shot: "S5", frame: 1170, note: "the climax: the Verified row, the check, the happy pebble, T10" },
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

/** Every problem in the timeline (an empty list means it is valid). Copy still waiting for chapters.ts is not a
 *  problem: see pendingCopy(). */
export function validateTimeline(): string[] {
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
  out.push(...checkCues(FILM_PEBBLE_CUES.wide, "FILM_PEBBLE_CUES.wide"), ...checkCues(FILM_PEBBLE_CUES.square, "FILM_PEBBLE_CUES.square"));
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
  return out;
}
