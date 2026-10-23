// src/content/filmCaptions.ts
//
// The launch film's caption cues, mirrored from docs/film-captions.json (lane E: the single source for film.en.vtt and
// the LinkedIn .srt) so that the /film transcript can use them. A copy is needed because docs/ is not part of the site's
// build on Vercel (.vercelignore). filmCaptions.test.ts checks that this copy equals the JSON, cue for cue, and that
// every on-screen line in it appears in its chapter's `onScreen` list in chapters.ts.
//
// To update: change docs/film-captions.json first, then copy its "cues" here. Not hand-written copy: lane E's words.

export type CaptionCue = Readonly<{
  id: string;
  /** first frame shown, at 30 fps */
  start: number;
  /** first frame after the cue (exclusive) */
  end: number;
  /** a chapter id from chapters.ts */
  chapter: string;
  /** "sound": a sound description in brackets; "line": on-screen text; "mixed": a sound, then a line */
  kind: "sound" | "line" | "mixed";
  lines: readonly string[];
}>;

export const FILM_CAPTION_FPS = 30;

export const filmCaptionCues: readonly CaptionCue[] = [
  { id: "c01", start: 0, end: 36, chapter: "desktop", kind: "sound", lines: ["[Gentle music begins]"] },
  { id: "c02", start: 36, end: 72, chapter: "desktop", kind: "sound", lines: ["[Click]"] },
  { id: "c03", start: 144, end: 216, chapter: "desktop", kind: "line", lines: ["What did it change?"] },
  { id: "c04", start: 216, end: 288, chapter: "desktop", kind: "line", lines: ["Can I undo it?"] },
  { id: "c05", start: 288, end: 360, chapter: "desktop", kind: "line", lines: ["Did it run the tests?"] },
  { id: "c06", start: 360, end: 468, chapter: "desktop", kind: "mixed", lines: ["[Music builds]", "An agent shouldn't grade its own work"] },
  { id: "c07", start: 468, end: 504, chapter: "desktop", kind: "sound", lines: ["[Rising swell]"] },
  { id: "c08", start: 504, end: 612, chapter: "desktop", kind: "mixed", lines: ["[Soft thud]", "A small companion for your Mac"] },
  { id: "c09", start: 612, end: 648, chapter: "desktop", kind: "sound", lines: ["[Music picks up]"] },
  { id: "c10", start: 666, end: 724, chapter: "project", kind: "line", lines: ["It reads your project"] },
  { id: "c11", start: 756, end: 864, chapter: "project", kind: "line", lines: ["Review, apply, undo"] },
  { id: "c12", start: 954, end: 1044, chapter: "tested", kind: "line", lines: ["AgentGuard checks the evidence"] },
  { id: "c13", start: 1044, end: 1146, chapter: "tested", kind: "line", lines: ["Tests run in an isolated copy"] },
  { id: "c14", start: 1152, end: 1218, chapter: "tested", kind: "mixed", lines: ["[Soft shimmer]", "Done means tested"] },
  { id: "c15", start: 1230, end: 1332, chapter: "model", kind: "line", lines: ["Your model, your choice", "Even one on your Mac"] },
  { id: "c16", start: 1350, end: 1434, chapter: "pace", kind: "line", lines: ["You set what it may do"] },
  { id: "c17", start: 1458, end: 1584, chapter: "memory", kind: "line", lines: ["Memory you can read and forget"] },
  { id: "c18", start: 1584, end: 1662, chapter: "views", kind: "mixed", lines: ["[Music swells]", "Views, not just text"] },
  { id: "c19", start: 1800, end: 1872, chapter: "open-source", kind: "line", lines: ["Free and open source", "Apache-2.0"] },
  { id: "c20", start: 1872, end: 1941, chapter: "open-source", kind: "line", lines: ["No telemetry"] },
  { id: "c21", start: 1941, end: 2016, chapter: "open-source", kind: "line", lines: ["Your keys stay in your Keychain"] },
  { id: "c22", start: 2016, end: 2088, chapter: "get", kind: "sound", lines: ["[Soft pop]"] },
  { id: "c23", start: 2088, end: 2160, chapter: "get", kind: "line", lines: ["A little help, right here."] },
  { id: "c24", start: 2160, end: 2304, chapter: "get", kind: "mixed", lines: ["[Final chord rings out]", "Free for Macs with Apple silicon"] },
];

/** A cue line in square brackets is a sound description. */
export function isSoundLine(line: string): boolean {
  return line.startsWith("[") && line.endsWith("]");
}

/** The sound descriptions of one chapter, in order, without their brackets ("Gentle music begins"). */
export function chapterSounds(chapterId: string): readonly string[] {
  return filmCaptionCues
    .filter((cue) => cue.chapter === chapterId)
    .flatMap((cue) => cue.lines.filter(isSoundLine))
    .map((line) => line.slice(1, -1));
}
