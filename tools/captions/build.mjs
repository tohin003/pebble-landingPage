// tools/captions/build.mjs: the film's text tracks from their two sources (MASTER_PLAN §5.5, FILM_SPEC §13, OVERRIDES §4).
//
//   docs/film-captions.json  ->  film.en.vtt (captions: sound descriptions and on-screen lines) and the social .srt
//   src/content/chapters.ts  ->  film.chapters.vtt, and film.descriptions.en.vtt (from the chapters' `description`,
//                                one cue a chapter, unless the JSON carries its own "descriptions" list)
//
// Usage (repo root, after `source scripts/env.sh`):
//   node tools/captions/build.mjs [--srt <file.srt>] [--out-dir <dir>]      the three VTTs (and the SRT if asked)
//   node tools/captions/build.mjs --cut <cut.json> --srt <file.srt> [--vtt <file.vtt>]
//                                                                         a cut's captions on the cut's own timeline
//   node tools/captions/build.mjs --check [--cut <cut.json>]                validate only, write nothing
// Options: --captions <json> (default docs/film-captions.json), --chapters <ts> (default src/content/chapters.ts),
//          --max-wps <n> (reading-rate gate, default 3.5), --out-dir <dir> (default public/media/v1).
//
// Every cue is validated before anything is written (tools/captions/cues.mjs): time order, no overlaps, one or two lines
// of at most 42 characters, at least 1.2 s on screen, at most 3.5 words a second, no "!". Any error: exit 1, no file
// written. Warnings (a clipped cue in a cut, a description longer than its chapter can speak) are printed, exit 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CAPTIONS, DEFAULT_CHAPTERS, REPO, RULES, countWords, filmTracks, mapCuesToCut, readCut, toSrt, toVtt, validateCues } from "./cues.mjs";

export const NOTES = {
  captions: "Pebble launch film: captions (sound descriptions and the on-screen lines).\nGenerated from docs/film-captions.json by tools/captions/build.mjs; edit the JSON, not this file.",
  chapters: "Pebble launch film: chapters.\nGenerated from src/content/chapters.ts by tools/captions/build.mjs.",
  descriptions: (from) => `Pebble launch film: text descriptions of what the film shows, read aloud by the audio-description toggle.\nGenerated from ${from} by tools/captions/build.mjs.`,
  cut: (name) => `Pebble launch film, cut "${name}": captions.\nGenerated from docs/film-captions.json and the cut file by tools/captions/build.mjs.`,
};

/** The file texts build.mjs writes for the full film, keyed by file name (verify.mjs compares against these). */
export function filmTrackTexts(tracks) {
  return {
    "film.en.vtt": toVtt(tracks.captions, NOTES.captions),
    "film.chapters.vtt": toVtt(tracks.chapters, NOTES.chapters),
    "film.descriptions.en.vtt": toVtt(tracks.descriptions, NOTES.descriptions(tracks.descriptionsFrom)),
    srt: toSrt(tracks.captions),
  };
}

function parseArgs(argv) {
  const opts = { outDir: path.join(REPO, "public/media/v1"), captions: DEFAULT_CAPTIONS, chapters: DEFAULT_CHAPTERS, check: false, maxWps: RULES.maxWordsPerSecond };
  const value = (i, name) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`${name} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") opts.check = true;
    else if (a === "--srt") opts.srt = path.resolve(value(i++, a));
    else if (a === "--vtt") opts.vtt = path.resolve(value(i++, a));
    else if (a === "--cut") opts.cut = path.resolve(value(i++, a));
    else if (a === "--out-dir") opts.outDir = path.resolve(value(i++, a));
    else if (a === "--captions") opts.captions = path.resolve(value(i++, a));
    else if (a === "--chapters") opts.chapters = path.resolve(value(i++, a));
    else if (a === "--max-wps") opts.maxWps = Number(value(i++, a));
    else if (a === "-h" || a === "--help") opts.help = true;
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
  const tracks = await filmTracks({ captionsPath: opts.captions, chaptersPath: opts.chapters });
  let errors = 0;

  if (opts.cut) {
    if (!opts.check && !opts.srt && !opts.vtt) throw new Error("--cut writes only what you name: add --srt <file> and/or --vtt <file>");
    const cut = readCut(JSON.parse(fs.readFileSync(opts.cut, "utf8")), { totalFrames: tracks.totalFrames, fps: tracks.fps });
    const mapped = mapCuesToCut(tracks.captions, cut);
    const durationMs = Math.round((cut.frames * 1000) / cut.fps);
    console.log(`cut "${cut.name}": ${cut.ranges.length} ranges, ${cut.frames} frames (${(cut.frames / cut.fps).toFixed(2)} s); ${mapped.cues.length} captions`);
    for (const note of mapped.notes) console.error(`  note  ${note}`);
    errors += report("cut captions", validateCues(mapped.cues, { kind: "captions", durationMs, rules }));
    if (errors) {
      console.error(`build.mjs: ${errors} error(s); nothing written. Fix the cut's ranges, or list cue ids in its "exclude".`);
      return 1;
    }
    if (opts.check) return 0;
    if (opts.srt) console.log(`wrote ${rel(writeAtomic(opts.srt, toSrt(mapped.cues)))}`);
    if (opts.vtt) console.log(`wrote ${rel(writeAtomic(opts.vtt, toVtt(mapped.cues, NOTES.cut(cut.name))))}`);
    return 0;
  }

  for (const p of tracks.problems) {
    console.error(`  ERROR sources: ${p}`);
    errors++;
  }
  errors += report("captions", validateCues(tracks.captions, { kind: "captions", durationMs: tracks.durationMs, rules }));
  errors += report("chapters", validateCues(tracks.chapters, { kind: "chapters", durationMs: tracks.durationMs, rules }));
  errors += report("descriptions", validateCues(tracks.descriptions, { kind: "descriptions", durationMs: tracks.durationMs, rules }));
  console.log(
    `film: ${tracks.totalFrames} frames at ${tracks.fps} fps (${(tracks.durationMs / 1000).toFixed(3)} s); ${tracks.captions.length} captions ` +
      `(fastest ${maxRate(tracks.captions).toFixed(2)} words/s), ${tracks.chapters.length} chapters, ${tracks.descriptions.length} descriptions ` +
      `from ${tracks.descriptionsFrom}`,
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
