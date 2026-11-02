// src/content/chapters.ts
//
// The film's chapters: the Pebble 2.0 launch film (docs/launch/TREATMENT.md; video/src/launch/master/timeline.ts), one
// chapter a scene, S00 to S11. Used by the film section's chapter index, the theatre's chapter list, the "Watch this in
// the film" chips (D11), film.chapters.vtt, film.descriptions.en.vtt (one cue a chapter, from `description`) and the
// /film transcript. The 1.x trailer's chapters are retired with the trailer (2 Nov 2026, the owner's ask: "put the
// final film into the landing page replacing the older one"); git history keeps them.
//
// - Starts are the master's frames at 30 fps (`at`): each scene's first frame on the master, fr(slot.in) in
//   timeline.ts. FILM_DURATION_SECONDS is the master's length, FILM_S 99.4 s (2,982 frames).
// - `onScreen` and `description` are the page's own text (docs/CLAIMS.md "The launch film on the page"). `onScreen`
//   lists the film's lines in order, word for word as the film sets them (the scenes' strings, the C-FILM2 rows);
//   S10's charts are written out a line a comparison. One line is left out by the owner's ruling of 2 Nov 2026
//   (docs/launch/CHECKPOINT.md): the long-task scene's title. The film keeps it, and so does its caption track
//   (public/media/v3/film.en.vtt, from video/src/launch/master/captions.ts); the page's own words never name it.
// - Descriptions are read aloud by the theatre's audio-description toggle, sentence by sentence (audioDescription.ts:
//   at most 32 words a sentence), and shown on /film as "What you see". Each keeps every one of its chapter's film
//   lines, in order, and adds at most two short sentences of what a listener needs to follow the pictures (the
//   director's answer 8 for phase B), written from the masters' frames.
// - No imports: tools/captions/cues.mjs imports this file with Node's type stripping. The honest line and the bloub
//   credit are therefore literals here; film.test.ts checks them against copy.ts and credits.ts.
// - Text the copy lint would otherwise stop: the rival products' names (this file is in its named scope, as /film is)
//   and S10's "Lower is better." (an exact-match allowance, C-FILM2-38).

export type Chapter = Readonly<{
  /** Stable id, used by the chips (copy.ts `chapterId` fields and the sections' `chip` props) and the chapter track. */
  id: string;
  title: string;
  /** Seconds from the start of the film: the scene's first frame on the master. null: no chip and no cue. */
  startSeconds: number | null;
  /** The master's scene, for reference (video/src/launch/master/timeline.ts); not shown. */
  scene: string;
  /** Page sections (their anchors) that show a chip for this chapter. */
  sectionIds: readonly string[];
  /** The film's lines in this chapter, in order (see the header for the one left out). */
  onScreen: readonly string[];
  /** What you see, for the audio description and the /film transcript. */
  description: string;
}>;

/** The master's frame rate (FILM_FPS in video/src/launch/master/timeline.ts). */
export const FILM_FPS = 30;

/** The film's length in seconds: the master's FILM_S, 2,982 frames at 30 fps. */
export const FILM_DURATION_SECONDS: number | null = 99.4;

/** A master frame's time in seconds, to the millisecond (frame / 30). */
const at = (frame: number): number => Math.round((frame / FILM_FPS) * 1000) / 1000;

/** Stealth Lockdown's honest line, word for word (copy.ts `stealth.honest`; film.test.ts checks). */
const HONEST_LINE =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

/** The bloub credit, word for word (credits.ts `bloubCredit`; film.test.ts checks). */
const BLOUB_CREDIT = "Pebble's character engine: bloub by Jérémy Perret (MIT)";

export const chapters: readonly Chapter[] = [
  {
    id: "opening",
    title: "This is Pebble",
    startSeconds: at(0),
    scene: "S00",
    sectionIds: [],
    onScreen: ["This is Pebble.", "It’s small.", "It just went up against Claude Code and Codex.", "Same model. Same tasks."], // [C-FILM2-01] [C-FILM2-02]
    description:
      "The small sage pebble on a dark green ground. “This is Pebble.” “It’s small.” “It just went up against Claude Code and Codex.” “Same model. Same tasks.”",
  },
  {
    id: "title",
    title: "Pebble 2.0",
    startSeconds: at(242),
    scene: "S01",
    sectionIds: [],
    onScreen: ["Pebble 2.0", "The desktop companion that does real work, and shows its evidence."], // [C-FILM2-03] [C-FILM2-04]
    description:
      "The pebble rises over the name. “Pebble 2.0” “The desktop companion that does real work, and shows its evidence.”",
  },
  {
    id: "desktop",
    title: "On your Mac",
    startSeconds: at(407),
    scene: "S02",
    sectionIds: ["desktop"],
    onScreen: ["It lives on your Mac.", "On every Space.", "Click. Ask."], // [C-FILM2-05] [C-FILM2-06] [C-FILM2-07]
    description:
      "On a Mac’s desktop, the pebble stays put as the desktop slides to another Space. “It lives on your Mac.” “On every Space.” A click on the pebble opens the quick chat. “Click. Ask.”",
  },
  {
    id: "mac",
    title: "Uses your Mac",
    startSeconds: at(602),
    scene: "S03",
    sectionIds: ["mac"],
    onScreen: [
      "Now it can use your Mac.",
      "Your apps.",
      "Your calendar.",
      "Your browser.",
      "The app windows and websites you allow.",
    ], // [C-FILM2-08] to [C-FILM2-12]
    description:
      "“Now it can use your Mac.” Pebble works in Calculator, Calendar and a Chrome tab. “Your apps.” “Your calendar.” “Your browser.” Then its card asks to use one app window. “The app windows and websites you allow.”",
  },
  {
    id: "agentguard",
    title: "AgentGuard",
    startSeconds: at(932),
    scene: "S04",
    sectionIds: ["agentguard", "project"],
    onScreen: [
      "Done means checked.",
      "AgentGuard.",
      "Evidence before “done”.",
      "Tests the host ran, not the model’s word.",
      "Files you asked to keep, kept.",
      "Output matched to its file, byte for byte.",
    ], // [C-FILM2-13] to [C-FILM2-17]
    description:
      "A reply in Pebble is held until the tests run; the pointer runs them, and the check reads Verified. “Done means checked.” “AgentGuard.” “Evidence before ‘done’.” Three ticked lines follow. “Tests the host ran, not the model’s word.” “Files you asked to keep, kept.” “Output matched to its file, byte for byte.”",
  },
  {
    id: "workshop",
    title: "Pebble’s Workshop",
    startSeconds: at(1202),
    scene: "S05",
    sectionIds: ["workshop"],
    onScreen: ["It builds small tools for itself.", "When the check disagrees, it asks you."], // [C-FILM2-18] [C-FILM2-20]
    description:
      "“It builds small tools for itself.” In a drawn diagram, the tool passes its own tests but only 2 of 5 in a blind check, so Pebble’s card asks whether to keep it. “When the check disagrees, it asks you.”",
  },
  {
    id: "memory",
    title: "Memory",
    startSeconds: at(1427),
    scene: "S06",
    sectionIds: ["memory"],
    onScreen: ["It remembers what matters.", "All visible.", "Forget anything."], // [C-FILM2-21] [C-FILM2-23]
    description:
      "“It remembers what matters.” A table of Pebble’s six kinds of memory opens into Settings › Memory. “All visible.” The pointer chooses Forget on one record, and it goes. “Forget anything.”",
  },
  {
    id: "long-tasks",
    title: "Long tasks",
    startSeconds: at(1637),
    scene: "S07",
    sectionIds: ["more"],
    onScreen: ["Long tasks keep a smaller window.", "Older results sealed. Any one returned exactly."], // [C-FILM2-25] [C-FILM2-26]
    description:
      "“Long tasks keep a smaller window.” In a drawn diagram, tool results stack past a line marked “context budget”, and the three oldest are sealed into short stubs. “Older results sealed. Any one returned exactly.” One stub opens again, unchanged.",
  },
  {
    id: "remote",
    title: "Pebble Remote",
    startSeconds: at(1847),
    scene: "S08",
    sectionIds: ["remote"],
    onScreen: ["Pebble, in your pocket.", "Pebble Remote for iPhone.", "Approve with Face ID.", "Open source. Build it with Xcode."], // [C-FILM2-28] to [C-FILM2-31]
    description:
      "The Pebble Remote app on an iPhone screen, in the iOS Simulator. “Pebble, in your pocket.” “Pebble Remote for iPhone.” An edit waiting for review is approved through the Face ID prompt. “Approve with Face ID.” “Open source. Build it with Xcode.”",
  },
  {
    id: "presenting",
    title: "Presenting",
    startSeconds: at(2102),
    scene: "S09",
    sectionIds: ["stealth"],
    onScreen: ["Presenting?", "Stealth Lockdown.", HONEST_LINE], // [C-FILM2-32] [C-FILM2-33]
    description:
      `“Presenting?” In Pebble’s ⌘K palette, Stealth Lockdown is turned on, and Pebble’s window leaves a screen recording. “Stealth Lockdown.” “${HONEST_LINE}” Then the pebble, drawn by Pebble’s own code, wears the Veil.`,
  },
  {
    id: "benchmarks",
    title: "Benchmarks",
    startSeconds: at(2373),
    scene: "S10",
    sectionIds: ["benchmarks"],
    onScreen: [
      "So. How did it do?",
      "Tasks done correctly.",
      "vs Claude Code, both on claude-opus-5-5: Pebble 235 of 255, 92.2 %. Claude Code 213 of 255, 83.5 %.",
      "vs Codex, both on gpt-6.1-sol: Pebble 243 of 255, 95.3 %. Codex 231 of 255, 90.6 %.",
      "Said “done” when it wasn’t.",
      "Lower is better.",
      "vs Claude Code, both on claude-opus-5-5: Pebble 6.3 %. Claude Code 13.7 %.",
      "vs Codex, both on gpt-6.1-sol: Pebble 3.9 %. Codex 7.1 %.",
      "Cost per task.",
      "Lower is better.",
      "vs Claude Code, both on claude-opus-5-5: Pebble $0.091. Claude Code $0.117.",
      "vs Codex, both on gpt-6.1-sol: Pebble $0.042. Codex $0.050.",
      "Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each, 255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Costs at public list prices. Full results, including time, safety and where Pebble trails, in the 2.0.0 release notes.",
    ], // [C-FILM2-34] to [C-FILM2-39]
    description:
      "“So. How did it do?” Three charts follow, the pebble between each chart’s two comparisons. “Tasks done correctly.” “vs Claude Code, both on claude-opus-5-5: Pebble 235 of 255, 92.2 %. Claude Code 213 of 255, 83.5 %.” “vs Codex, both on gpt-6.1-sol: Pebble 243 of 255, 95.3 %. Codex 231 of 255, 90.6 %.” “Said ‘done’ when it wasn’t.” “Lower is better.” “vs Claude Code, both on claude-opus-5-5: Pebble 6.3 %. Claude Code 13.7 %.” “vs Codex, both on gpt-6.1-sol: Pebble 3.9 %. Codex 7.1 %.” “Cost per task.” “Lower is better.” “vs Claude Code, both on claude-opus-5-5: Pebble $0.091. Claude Code $0.117.” “vs Codex, both on gpt-6.1-sol: Pebble $0.042. Codex $0.050.” “Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each, 255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Costs at public list prices. Full results, including time, safety and where Pebble trails, in the 2.0.0 release notes.”",
  },
  {
    id: "get",
    title: "Get Pebble",
    startSeconds: at(2792),
    scene: "S11",
    sectionIds: ["install", "get-pebble"],
    onScreen: [
      "Small pebble.",
      "Real work.",
      "Pebble 2.0",
      "Free and open source, for Macs with Apple silicon.",
      "github.com/tohin003/Pebble",
      "Shown with sample data.",
      BLOUB_CREDIT,
    ], // [C-FILM2-40] to [C-FILM2-43]
    description:
      `On the dark ground: “Small pebble.” “Real work.” Then the end card under the pebble, its last two lines in small type. “Pebble 2.0” “Free and open source, for Macs with Apple silicon.” “github.com/tohin003/Pebble” “Shown with sample data.” “${BLOUB_CREDIT}”`,
  },
];

/**
 * The film's notes, under the /film transcript: the approved wording of the film's description
 * (docs/launch/LINKEDIN_POST.md, "The video's description"), with the benchmark's method beside the comparisons the
 * film shows and the music's courtesy line. [C-FILM3-5] to [C-FILM3-9]
 */
export const filmNotes: readonly string[] = [
  "Shown with sample data. Edited for time.",
  "Pebble’s interface is real: recordings of Pebble 2.0 on a Mac, Pebble 2.0.1’s own interface running with sample data, and the Pebble Remote app (open source) in the iOS Simulator against a stand-in Mac. Personal and production details in the recordings are masked; Pebble’s own windows are never altered.",
  "Benchmark: golden set 2.0’s held-out split, 255 runs per product, one model for both products in each comparison; full results in the 2.0.0 release notes.",
  "Pebble isn’t affiliated with Anthropic or OpenAI; Claude Code and Codex are their products.",
  "Music: “Your Breath” by Eugenio Mininni (Mixkit).",
];

/** "1:17" from seconds (rounded down to the whole second). */
export function formatTimecode(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** The film's length as "1:39", or null while it is unknown. */
export function filmDurationLabel(): string | null {
  return FILM_DURATION_SECONDS === null ? null : formatTimecode(FILM_DURATION_SECONDS);
}

/** Chapters that have a start time, in order: the only ones that may get a chip or a VTT cue. */
export function timedChapters(): readonly Chapter[] {
  return chapters.filter((chapter) => typeof chapter.startSeconds === "number");
}
