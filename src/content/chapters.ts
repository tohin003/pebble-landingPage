// src/content/chapters.ts
//
// The launch film's chapters (MASTER_PLAN §5.1), used by the chapter list, the "Watch this in the film" chips
// (D11), film.chapters.vtt and the /film transcript.
//
// Status: the trailer (OVERRIDES §38–§41; docs/FILM_SPEC.md §24): the same nine ids at the blueprint's new starts, in
// time order (desktop 0, views 33.6, model 36.0, memory 38.4, pace 40.8, project 43.2, tested 48.0, open-source 60.0,
// get 67.2 s). On-screen lines are the trailer's, word for word; the film no longer shows "It reads your project",
// "Review, apply, undo" or "Even one on your Mac". `sounds` stays empty: docs/film-captions.json is the single caption
// source. A chapter with `startSeconds: null` must not get a chip.
//
// Deliberate changes from MASTER_PLAN §5.1 (see docs/CLAIMS.md, "Rewritten or removed"):
// - Tension beat: three neutral questions a careful person asks of any AI helper (OVERRIDES §2). The statements in
//   the plan's first draft must never be used.
// - Chapter "model" is "Your model", not "Any model": Pebble works with the ways in listed in Settings › Models, not
//   with every model there is. Its on-screen line follows the page ("Your model, your choice").

export type Chapter = Readonly<{
  /** Stable id, used in URLs (#t=…) and by copy.ts `chapterId` fields. */
  id: string;
  title: string;
  /** Seconds from the start of the film. TODO(Lane E). */
  startSeconds: number | null;
  /** The plan's bars at 100 BPM, for Lane E's reference only. Not shown. */
  bars: string;
  /** Page sections that show a chip for this chapter (ids from copy.ts `sectionIds`). */
  sectionIds: readonly string[];
  /** Every line of on-screen text, in order. */
  onScreen: readonly string[];
  /** Audio description: what you see, for the /film transcript. */
  description: string;
  /** Sound descriptions for the captions, e.g. "[Soft music begins]". TODO(Lane C and E). */
  sounds: readonly string[];
}>;

/** The film's length in seconds. TODO(Lane E): from the final render (the plan's grid is 76.8 s). */
export const FILM_DURATION_SECONDS: number | null = 76.8; // Lane E: 2,304 frames at 30 fps (docs/FILM_SPEC.md §1)

export const chapters: readonly Chapter[] = [
  {
    id: "desktop",
    title: "On your desktop",
    startSeconds: 0, // frame 0
    bars: "1–14 (the look, the three questions and their glimpses, the turn, the drop, the quick chat, the whole window)",
    sectionIds: ["desktop"],
    onScreen: [
      "What did it change?",
      "Can I undo it?",
      "Did it run the tests?",
      "An agent shouldn't grade its own work",
      "A small companion for your Mac",
    ], // [C-CH-1] [C-CH-16] [C-CH-2]
    description:
      "On a dark desktop, a close-up of the pebble: its eyes follow the pointer, then look at you. Three questions appear one at a time on a dark background, each followed by a glimpse of Pebble's window. First an edit to invoice_kit/dates.py waits for review, and the pointer applies it. Then the applied card shows Undo this edit. Then the task is held: “Pebble's change isn't verified yet.” Then the line “An agent shouldn't grade its own work”. The background turns sage, and the pebble peeks up, leaps and hangs in silence. It lands as the full stop of the word “pebble.”, and the screen turns light. The pebble hops down onto a Mac desktop. In the quick chat, the question “What does ‘day is out of range for month’ mean?” is sent. Pebble answers: “Python is being asked for a date that doesn't exist, like 31 February.” Then the whole Pebble window: “Good to see you.”",
    sounds: [],
  },
  {
    id: "views",
    title: "Views",
    startSeconds: 33.6, // frame 1008
    bars: "15",
    sectionIds: ["views"],
    onScreen: ["Views, not just text"], // [C-CH-11]
    description: "A “Lisbon trip budget” dashboard. Its spending chart grows until it fills the frame.",
    sounds: [],
  },
  {
    id: "model",
    title: "Your model",
    startSeconds: 36, // frame 1080
    bars: "16",
    sectionIds: ["models"],
    onScreen: ["Your model, your choice"], // [C-CH-7]
    description:
      "Settings › Models: the model on this Mac, and the ways to add one come forward one at a time: Add a model file, Connect provider and Continue with ChatGPT.",
    sounds: [],
  },
  {
    id: "memory",
    title: "Memory",
    startSeconds: 38.4, // frame 1152
    bars: "17",
    sectionIds: ["memory"],
    onScreen: ["Memory you can read and forget"], // [C-CH-10]
    description:
      "Settings › Memory shows the saved records. The pointer clicks the bin next to “Uses metric units and 24-hour times.”, and the record disappears.",
    sounds: [],
  },
  {
    id: "pace",
    title: "You set the pace",
    startSeconds: 40.8, // frame 1224
    bars: "18",
    sectionIds: ["permissions"],
    onScreen: ["You set what it may do"], // [C-CH-9]
    description:
      "Settings › Permissions. The pointer chooses Auto in project instead of Ask for approval, with each mode's own words on screen.",
    sounds: [],
  },
  {
    id: "project",
    title: "Works in your project",
    startSeconds: 43.2, // frame 1296
    bars: "19–20",
    sectionIds: ["project"],
    onScreen: ["Your tests stay yours"], // [C-CH-18]
    description:
      "A card for tests/test_dates.py: “Pebble wants to change a test file, and your request didn't ask for test changes. Tests are your evidence that the code works, so this change waits for you.” Then, in another task, a step turns red and the pointer opens its details: “AgentGuard — evidence check” and “5 file(s) changed that the task does not reach”.",
    sounds: [],
  },
  {
    id: "tested",
    title: "Evidence before done", // was "Done means tested": withdrawn after Pebble 1.0.3's Corrections (AgentGuard holds only covered code)
    startSeconds: 48, // frame 1440
    bars: "21–25",
    sectionIds: ["project"],
    onScreen: ["AgentGuard checks the evidence", "Tests run in an isolated copy", "Evidence before done"], // [C-CH-17] [C-CH-5] [C-AG-5]
    description:
      "The held task again: “Pebble's change isn't verified yet.”, then “Blocked” with Run the tests, Ask Pebble to finish and Accept as unverified. The pointer clicks Run the tests. A “Run isolated tests” card reads “Runs the project's tests in a temporary copy. Your project files don't change.” The pointer clicks Run tests; the card reads Running, then Done, with 42 passed. The steps show “Verified · pytest 42 passed on current files”, which comes forward as the other steps fade back. Pebble's final reply says the tests ran in an isolated copy and both edits are verified, and the pebble celebrates.",
    sounds: [],
  },
  {
    id: "open-source",
    title: "Open source",
    startSeconds: 60, // frame 1800
    bars: "26–28",
    sectionIds: ["privacy", "open-source"],
    onScreen: ["Free and open source", "Apache-2.0", "No telemetry", "Your keys stay in your Keychain"], // [C-CH-12..14]
    description: "Lines appear one at a time on a sage background.",
    sounds: [],
  },
  {
    id: "get",
    title: "Get Pebble",
    startSeconds: 67.2, // frame 2016
    bars: "29–32",
    sectionIds: ["install", "get-pebble"],
    onScreen: [
      "A little help, right here.",
      "Free for Macs with Apple silicon", // [C-CH-15]
      "Not notarized", // [C-CH-19] (the limit beside the promise, OVERRIDES §39; C-LIM-2)
      "github.com/tohin003/Pebble",
      "Shown with sample data",
      "Pebble's character engine: bloub by Jérémy Perret (MIT)", // OVERRIDES §2, verbatim (FILM_SPEC T22)
    ],
    description:
      "The pebble lands as the full stop of the “pebble.” wordmark, above the price, its limit and the GitHub address.",
    sounds: [],
  },
];

/** "1:17" from seconds (rounded down to the whole second). */
export function formatTimecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** The film's length as "1:17", or null until Lane E sets it. */
export function filmDurationLabel(): string | null {
  return FILM_DURATION_SECONDS === null ? null : formatTimecode(FILM_DURATION_SECONDS);
}

/** Chapters that have a start time, in order: the only ones that may get a chip or a VTT cue. */
export function timedChapters(): readonly Chapter[] {
  return chapters.filter((chapter) => typeof chapter.startSeconds === "number");
}
