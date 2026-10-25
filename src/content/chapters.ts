// src/content/chapters.ts
//
// The launch film's chapters (MASTER_PLAN §5.1), used by the chapter list, the "Watch this in the film" chips
// (D11), film.chapters.vtt and the /film transcript.
//
// Status: timings from Lane E (docs/FILM_SPEC.md §13). On-screen lines and descriptions follow FILM_SPEC §18, applied
// by the claims review on 2026-10-23, which removed the withdrawn test counter and "network off" (critic C3).
// `sounds` stays empty: docs/film-captions.json is the single caption source. A chapter with `startSeconds: null` must
// not get a chip.
//
// Deliberate changes from MASTER_PLAN §5.1 (see docs/CLAIMS.md, "Rewritten or removed"):
// - Tension beat: three neutral questions a careful person asks of any AI helper (OVERRIDES §2). The statements in
//   the plan's first draft must never be used.
// - Chapter 4 is "Your model", not "Any model": Pebble works with the ways in listed in Settings › Models, not with
//   every model there is. Its on-screen line follows the page ("Your model, your choice").

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
    bars: "1–9 (hook, questions, intent line, reveal)",
    sectionIds: ["desktop"],
    onScreen: [
      "What did it change?",
      "Can I undo it?",
      "Did it run the tests?",
      "An agent shouldn't grade its own work",
      "A small companion for your Mac",
    ], // [C-CH-1] [C-CH-16] [C-CH-2]
    description:
      "A calm sage-green desktop with the pebble in its lower-right corner. The pointer moves in and the pebble's eyes follow it. A click opens the quick chat. The question “What does ‘day is out of range for month’ mean?” types itself and is sent. Pebble thinks, then its answer starts to appear: “Python is being asked for a date that doesn't exist, like 31 February.” The camera moves into the pebble. Three questions appear one at a time on a sage background, then the line “An agent shouldn't grade its own work”. The pebble hops in, leaps, hangs for a moment and lands as the full stop of the word “pebble.”, and the screen turns light.",
    sounds: [],
  },
  {
    id: "project",
    title: "Works in your project",
    startSeconds: 21.6, // frame 648
    bars: "10–12",
    sectionIds: ["project"],
    onScreen: ["It reads your project", "Review, apply, undo"], // [C-CH-3] [C-CH-4]
    description:
      "The pebble hops into Pebble's window on the invoice-kit project; the status line reads “Reading invoice_kit/dates.py”. An approval card for invoice_kit/dates.py shows the change. The pointer clicks Apply edit, and the card shows Done, with Undo this edit.",
    sounds: [],
  },
  {
    id: "tested",
    title: "Evidence before done", // was "Done means tested": withdrawn after Pebble 1.0.3's Corrections (AgentGuard holds only covered code)
    startSeconds: 28.8, // frame 864
    bars: "13–17",
    sectionIds: ["project"],
    onScreen: ["AgentGuard checks the evidence", "Tests run in an isolated copy", "Evidence before done"], // [C-CH-17] [C-CH-5] [C-CH-6]
    description:
      "Pebble's reply says both edits are in, but the task is held: “Blocked” and “Pebble's change isn't verified yet.”, with Run the tests, Ask Pebble to finish and Accept as unverified. The pointer clicks Run the tests. A “Run isolated tests” card reads “Runs the project's tests in a temporary copy. Your project files don't change.” The pointer clicks Run tests; the steps show “Requesting isolated tests · 11 s”, then “Verified · pytest 42 passed on current files”, which comes forward as the other steps fade back. Pebble's final reply says the tests ran in an isolated copy and both edits are verified, and the pebble celebrates.",
    sounds: [],
  },
  {
    id: "model",
    title: "Your model",
    startSeconds: 40.8, // frame 1224
    bars: "18 – 19 beat 2",
    sectionIds: ["models"],
    onScreen: ["Your model, your choice", "Even one on your Mac"], // [C-CH-7] [C-CH-8]
    description:
      "Settings › Models: the model on this Mac, and the ways to add one: Add a model file, Connect provider and Continue with ChatGPT.",
    sounds: [],
  },
  {
    id: "pace",
    title: "You set the pace",
    startSeconds: 44.4, // frame 1332
    bars: "19 beat 3 – 20",
    sectionIds: ["permissions"],
    onScreen: ["You set what it may do"], // [C-CH-9]
    description:
      "Settings › Permissions. The pointer chooses Auto in project instead of Ask for approval, with each mode's own words on screen.",
    sounds: [],
  },
  {
    id: "memory",
    title: "Memory",
    startSeconds: 48, // frame 1440
    bars: "21–22",
    sectionIds: ["memory"],
    onScreen: ["Memory you can read and forget"], // [C-CH-10]
    description:
      "Settings › Memory shows the six kinds of memory and the saved records. The pointer clicks the bin next to “Uses metric units and 24-hour times.”, and the record disappears.",
    sounds: [],
  },
  {
    id: "views",
    title: "Views",
    startSeconds: 52.8, // frame 1584
    bars: "23–25",
    sectionIds: ["views"],
    onScreen: ["Views, not just text"], // [C-CH-11]
    description:
      "A “Lisbon trip budget” dashboard. Its spending chart grows until it fills the screen. Then a quiz asks “What does date(2026, 1, 31) + timedelta(days=1) return?”",
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
      "github.com/tohin003/Pebble",
      "Shown with sample data",
      "Pebble's character engine: bloub by Jérémy Perret (MIT)", // OVERRIDES §2, verbatim (FILM_SPEC T22)
    ],
    description:
      "The pebble hops in and becomes the full stop of the “pebble.” wordmark. The film ends on the project's GitHub address.",
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
