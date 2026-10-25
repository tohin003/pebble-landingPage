// src/content/filmCaptions.ts
//
// The launch film's caption cues (the trailer's), mirrored from docs/film-captions.json (the single source for film.en.vtt
// and the social .srt) so that the /film transcript can use them. A copy is needed because docs/ is not part of the site's
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
  { id: "c01", start: 0, end: 72, chapter: "desktop", kind: "sound", lines: ["[A soft pulse and a heartbeat]"] },
  { id: "c02", start: 72, end: 144, chapter: "desktop", kind: "mixed", lines: ["[Hit]", "What did it change?"] },
  { id: "c03", start: 144, end: 216, chapter: "desktop", kind: "sound", lines: ["[A low beat begins]"] },
  { id: "c04", start: 216, end: 288, chapter: "desktop", kind: "mixed", lines: ["[Hit]", "Can I undo it?"] },
  { id: "c05", start: 360, end: 432, chapter: "desktop", kind: "mixed", lines: ["[Hit]", "Did it run the tests?"] },
  { id: "c06", start: 445, end: 504, chapter: "desktop", kind: "sound", lines: ["[The music stops]"] },
  { id: "c07", start: 504, end: 612, chapter: "desktop", kind: "mixed", lines: ["[A riser builds]", "An agent shouldn't grade its own work"] },
  { id: "c08", start: 612, end: 648, chapter: "desktop", kind: "sound", lines: ["[Silence]"] },
  { id: "c09", start: 648, end: 720, chapter: "desktop", kind: "mixed", lines: ["[Impact]", "A small companion for your Mac"] },
  { id: "c10", start: 1008, end: 1080, chapter: "views", kind: "mixed", lines: ["[The beat lifts]", "Views, not just text"] },
  { id: "c11", start: 1080, end: 1152, chapter: "model", kind: "line", lines: ["Your model, your choice"] },
  { id: "c12", start: 1152, end: 1224, chapter: "memory", kind: "line", lines: ["Memory you can read and forget"] },
  { id: "c13", start: 1224, end: 1296, chapter: "pace", kind: "line", lines: ["You set what it may do"] },
  { id: "c14", start: 1296, end: 1368, chapter: "project", kind: "line", lines: ["Your tests stay yours"] },
  { id: "c15", start: 1440, end: 1512, chapter: "tested", kind: "mixed", lines: ["[The music stops]", "AgentGuard checks the evidence"] },
  { id: "c16", start: 1548, end: 1626, chapter: "tested", kind: "line", lines: ["Tests run in an isolated copy"] },
  { id: "c17", start: 1656, end: 1723, chapter: "tested", kind: "sound", lines: ["[A big hit]"] },
  { id: "c18", start: 1723, end: 1788, chapter: "tested", kind: "mixed", lines: ["[The biggest hit]", "Evidence before done"] },
  { id: "c19", start: 1800, end: 1872, chapter: "open-source", kind: "line", lines: ["Free and open source", "Apache-2.0"] },
  { id: "c20", start: 1872, end: 1926, chapter: "open-source", kind: "line", lines: ["No telemetry"] },
  { id: "c21", start: 1926, end: 2016, chapter: "open-source", kind: "line", lines: ["Your keys stay in your Keychain"] },
  { id: "c22", start: 2016, end: 2088, chapter: "get", kind: "sound", lines: ["[The beat returns]"] },
  { id: "c23", start: 2088, end: 2160, chapter: "get", kind: "line", lines: ["A little help, right here."] },
  { id: "c24", start: 2160, end: 2240, chapter: "get", kind: "mixed", lines: ["[Final hit]", "Free for Macs with Apple silicon"] },
  { id: "c25", start: 2240, end: 2304, chapter: "get", kind: "line", lines: ["Not notarized", "Shown with sample data"] },
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
