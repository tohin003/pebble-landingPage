// tools/captions/build.mjs: the film's text tracks for the site, from the film's own captions and the page's chapters.
//
//   video/out/launch/pebble-2.0-launch.vtt  ->  film.en.vtt: the film's captions (its on-screen type), cue for cue. That
//                                               file is the output of the film's caption source,
//                                               video/src/launch/master/captions.ts (`bun … --write`), which the film's
//                                               director owns; the site copies it and never edits it.
//   src/content/chapters.ts                 ->  film.chapters.vtt (each chapter's title and start) and
//                                               film.descriptions.en.vtt (each chapter's description, one cue a
//                                               chapter, read aloud by the theatre's audio-description toggle)
//
// Usage (repo root, after `source scripts/env.sh`):
//   bun video/src/launch/master/captions.ts --write        first: the film's VTT from its caption source
//   node tools/captions/build.mjs                           the three VTTs into public/media/v3
//   node tools/captions/build.mjs --check                   validate only, write nothing
//   node tools/captions/build.mjs --srt <file.srt>          ... and the film's captions as SRT
// Options: --film-vtt <vtt> (default video/out/launch/pebble-2.0-launch.vtt), --chapters <ts> (default
//          src/content/chapters.ts), --max-wps <n> (reading-rate gate, default 3.5), --out-dir <dir> (default
//          public/media/v3, src/lib/media.ts LAUNCH_MEDIA).
//
// Every cue is validated before anything is written (tools/captions/cues.mjs): time order, no overlaps, one or two lines
// of at most 42 characters, at least 1.2 s on screen, no "!", every time on one of the film's frames, nothing past the
// film's end (chapters.ts FILM_DURATION_SECONDS). The reading rate is at most 3.5 words a second, with this film's
// documented exception (cues.mjs FILM_OWN_PACE): a caption that carries type the film shows faster is a warning, up to
// the exception's ceiling. Any error: exit 1, no file written. Warnings (a fast caption, a description longer than its
// chapter can speak) are printed, exit 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CHAPTERS, DEFAULT_FILM_VTT, FILM_OWN_PACE, REPO, RULES, countWords, filmTracks, toSrt, toVtt, validateCues } from "./cues.mjs";

export const NOTES = {
  captions: (from) =>
    `Pebble 2.0 launch film: captions of its on-screen type (the film has no voice).\nCopied by tools/captions/build.mjs from ${from}, which video/src/launch/master/captions.ts writes; edit the cue list there, not this file.`,
  chapters: "Pebble 2.0 launch film: chapters.\nGenerated from src/content/chapters.ts by tools/captions/build.mjs.",
  descriptions: (from) => `Pebble 2.0 launch film: text descriptions of what the film shows, read aloud by the audio-description toggle.\nGenerated from ${from} by tools/captions/build.mjs.`,
};

/** The file texts build.mjs writes, keyed by file name, and the captions' SRT (verify.mjs compares against these). */
export function filmTrackTexts(tracks) {
  return {
    "film.en.vtt": toVtt(tracks.captions, NOTES.captions(tracks.captionsFrom)),
    "film.chapters.vtt": toVtt(tracks.chapters, NOTES.chapters),
    "film.descriptions.en.vtt": toVtt(tracks.descriptions, NOTES.descriptions(tracks.descriptionsFrom)),
    srt: toSrt(tracks.captions),
  };
}

function parseArgs(argv) {
  const opts = { outDir: path.join(REPO, "public/media/v3"), filmVtt: DEFAULT_FILM_VTT, chapters: DEFAULT_CHAPTERS, check: false, maxWps: RULES.maxWordsPerSecond };
  const value = (i, name) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`${name} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") opts.check = true;
    else if (a === "--srt") opts.srt = path.resolve(value(i++, a));
    else if (a === "--out-dir") opts.outDir = path.resolve(value(i++, a));
    else if (a === "--film-vtt") opts.filmVtt = path.resolve(value(i++, a));
    else if (a === "--chapters") opts.chapters = path.resolve(value(i++, a));
    else if (a === "--max-wps") opts.maxWps = Number(value(i++, a));
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--captions" || a === "--narration" || a === "--narrated-srt" || a === "--cut" || a === "--vtt")
      throw new Error(`${a} was the 1.x trailer's (retired from the site on 2 Nov 2026; git history keeps it)`);
    else throw new Error(`unknown argument ${a}`);
  }
  if (!(opts.maxWps > 0)) throw new Error("--max-wps must be a positive number");
  return opts;
}

/** Writes through a dot-file next to the target and a rename, so a half-written track never sits in public/. */
function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  return file;
}

const rel = (file) => (file.startsWith(REPO + path.sep) ? path.relative(REPO, file) : file);
const maxRate = (cues) => Math.max(0, ...cues.map((c) => countWords(c.lines.join(" ")) / ((c.endMs - c.startMs) / 1000)));

function report(label, result) {
  for (const e of result.errors) console.error(`  ERROR ${label}: ${e}`);
  for (const w of result.warnings) console.error(`  warn  ${label}: ${w}`);
  return result.errors.length;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\nimport ")[0].replace(/^\/\/ ?/gm, ""));
    return 0;
  }
  const rules = { ...RULES, maxWordsPerSecond: opts.maxWps };
  const tracks = await filmTracks({ filmVttPath: opts.filmVtt, chaptersPath: opts.chapters });
  let errors = 0;
  for (const p of tracks.problems) {
    console.error(`  ERROR sources: ${p}`);
    errors++;
  }
  errors += report("captions", validateCues(tracks.captions, { kind: "captions", durationMs: tracks.durationMs, rules, ownPace: FILM_OWN_PACE }));
  errors += report("chapters", validateCues(tracks.chapters, { kind: "chapters", durationMs: tracks.durationMs, rules }));
  errors += report("descriptions", validateCues(tracks.descriptions, { kind: "descriptions", durationMs: tracks.durationMs, rules }));
  console.log(
    `film: ${tracks.totalFrames} frames at ${tracks.fps} fps (${(tracks.durationMs / 1000).toFixed(3)} s); ${tracks.captions.length} captions ` +
      `from ${tracks.captionsFrom} (fastest ${maxRate(tracks.captions).toFixed(2)} words/s), ${tracks.chapters.length} chapters, ` +
      `${tracks.descriptions.length} descriptions from ${tracks.descriptionsFrom}`,
  );
  if (errors) {
    console.error(`build.mjs: ${errors} error(s); nothing written.`);
    return 1;
  }
  if (opts.check) return 0;
  const texts = filmTrackTexts(tracks);
  for (const name of ["film.en.vtt", "film.chapters.vtt", "film.descriptions.en.vtt"]) console.log(`wrote ${rel(writeAtomic(path.join(opts.outDir, name), texts[name]))}`);
  if (opts.srt) console.log(`wrote ${rel(writeAtomic(opts.srt, texts.srt))}`);
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`build.mjs: ${error.message}`);
      process.exit(2);
    },
  );
}
