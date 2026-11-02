// tools/captions/cues.mjs: the caption rules, readers and writers shared by tools/captions/build.mjs and
// tools/encode/verify.mjs (no dependencies).
//
// - Time: WebVTT and SRT times are milliseconds; the film's cues sit on its 30 fps frames (seconds = frame / 30).
// - Rules: a word is a token with a letter or a digit; a caption is shown for at least 1.2 s, has one or two lines of
//   at most 42 characters and no exclamation mark, and reads at most 3.5 words a second (above 3 is a warning); cues are
//   in time order and never overlap.
// - The film's own pace (FILM_OWN_PACE): the Pebble 2.0 launch film has no voice, and its captions carry its on-screen
//   type for exactly as long as the type is readable. Some of that type reads faster than 3.5 words a second, so for
//   this film a faster cue is a warning, up to FILM_OWN_PACE's ceiling, not an error.
// - The film's sources (filmSpec, filmTracks): its captions are the film's own (video/src/launch/master/captions.ts,
//   whose `--write` writes video/out/launch/pebble-2.0-launch.vtt); its length, chapters and descriptions are
//   src/content/chapters.ts's.
// The 1.x trailer's sources (docs/film-captions.json, the narrated twin's docs/film-narration.json and the x30 cut
// docs/film-cuts/x30.json) were retired from the site with the trailer on 2 Nov 2026; git history keeps the tools'
// support for them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const RULES = Object.freeze({
  maxWordsPerSecond: 3.5,
  sourceWordsPerSecond: 3.0,
  minSeconds: 1.2,
  maxLines: 2,
  maxLineChars: 42,
  /** a speaking rate for the description estimate (150 words a minute; the player does not pause the film) */
  speechWordsPerSecond: 2.5,
});

/**
 * The launch film's documented exception to the reading rate (the director's note for site phase 2;
 * .work/handoffs/2026-11-02-launch-captions.md). Its captions transcribe its own type, and some of that type is on
 * screen for less time than 3.5 words a second would need: the premise in S00, AgentGuard's rows in S04, S08's small
 * line, Stealth Lockdown's honest line in S09 (split over cues at word boundaries, inside its time on screen), S10's
 * cards and S11's end card. video/src/launch/master/captions.ts marks each such cue `fast`, with its reason, and its
 * --check fails an unmarked one. Here a cue above RULES.maxWordsPerSecond is a warning up to this ceiling, and an
 * error above it (the fastest, S00's premise and S04's rows, read about 7 to 8 words a second).
 */
export const FILM_OWN_PACE = Object.freeze({
  maxWordsPerSecond: 10,
  why: "the film's own pace: its type is on screen this long (video/src/launch/master/captions.ts marks the cue `fast`)",
});

export const countWords = (text) => text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
export const lineChars = (line) => [...line].length;
export const frameToMs = (frame, fps) => Math.round((frame * 1000) / fps);

const pad = (n, width = 2) => String(n).padStart(width, "0");

export function formatTime(ms, separator) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms % 1000, 3)}`;
}

/** "00:01:02.345", "01:02.345" (WebVTT) or "00:01:02,345" (SRT) to milliseconds, or NaN. */
export function parseTime(text) {
  const m = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(text.trim());
  if (!m) return NaN;
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Number(m[4]);
}

const escapeVtt = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeVtt = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

/** cues: [{id, startMs, endMs, lines}]; note: an optional NOTE block (no "-->" in it). */
export function toVtt(cues, note) {
  const blocks = ["WEBVTT"];
  if (note) blocks.push(`NOTE\n${note.replace(/-->/g, "->")}`);
  for (const cue of cues) {
    blocks.push([cue.id, `${formatTime(cue.startMs, ".")} --> ${formatTime(cue.endMs, ".")}`, ...cue.lines.map(escapeVtt)].filter(Boolean).join("\n"));
  }
  return blocks.join("\n\n") + "\n";
}

export function toSrt(cues) {
  return cues.map((cue, i) => [String(i + 1), `${formatTime(cue.startMs, ",")} --> ${formatTime(cue.endMs, ",")}`, ...cue.lines].join("\n")).join("\n\n") + "\n";
}

const blocksOf = (text) =>
  text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((b) => b.replace(/^\n+|\n+$/g, "").split("\n"))
    .filter((b) => b.some((l) => l.trim()));

/** Parses a WebVTT file: {cues, errors}. NOTE, STYLE and REGION blocks are skipped. */
export function parseVtt(text) {
  const errors = [];
  const blocks = blocksOf(text);
  if (!blocks.length || !/^WEBVTT(?:[ \t].*)?$/.test(blocks[0][0])) errors.push('the file does not start with "WEBVTT"');
  const cues = [];
  for (const block of blocks.slice(1)) {
    if (/^(NOTE|STYLE|REGION)(\s|$)/.test(block[0])) continue;
    const at = block.findIndex((l) => l.includes("-->"));
    if (at < 0 || at > 1) {
      errors.push(`a block without a cue timing: "${block[0].slice(0, 40)}"`);
      continue;
    }
    const [a, rest] = block[at].split("-->");
    const startMs = parseTime(a);
    const endMs = parseTime(rest.trim().split(/\s+/)[0]);
    const id = at === 1 ? block[0].trim() : "";
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) errors.push(`cue ${id || cues.length + 1}: bad timing "${block[at]}"`);
    cues.push({ id, startMs, endMs, lines: block.slice(at + 1).map(unescapeVtt) });
  }
  return { cues, errors };
}

/** Parses an SRT file: {cues, errors}; cue numbers must count from 1. */
export function parseSrt(text) {
  const errors = [];
  const cues = [];
  for (const block of blocksOf(text)) {
    const n = Number(block[0].trim());
    if (!Number.isInteger(n)) errors.push(`a block without a cue number: "${block[0].slice(0, 40)}"`);
    else if (n !== cues.length + 1) errors.push(`cue number ${n} where ${cues.length + 1} was expected`);
    const timing = block[1] ?? "";
    const [a, b] = timing.split("-->");
    const startMs = parseTime(a ?? "");
    const endMs = parseTime((b ?? "").trim().split(/\s+/)[0] ?? "");
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || !timing.includes(",")) errors.push(`cue ${n}: bad timing "${timing}"`);
    cues.push({ id: String(n), startMs, endMs, lines: block.slice(2) });
  }
  return { cues, errors };
}

/**
 * Checks a cue list. kind: "captions" (the full rule set), "descriptions" (order, no overlap, a speech-time warning) or
 * "chapters" (order, no overlap, contiguous from 0 to the end). With `ownPace` (FILM_OWN_PACE), a caption that reads
 * faster than the rules allow is a warning up to its ceiling. Returns {errors, warnings}, each a list of strings.
 */
export function validateCues(cues, { kind = "captions", durationMs = null, rules = RULES, ownPace = null } = {}) {
  const errors = [];
  const warnings = [];
  let prev = null;
  if (!cues.length) errors.push("no cues");
  for (const cue of cues) {
    const name = `${kind === "chapters" ? "chapter" : "cue"} ${cue.id || "?"}`;
    if (!(cue.endMs > cue.startMs)) errors.push(`${name}: ends at or before its start`);
    if (cue.startMs < 0) errors.push(`${name}: starts before 0`);
    if (durationMs !== null && cue.endMs > durationMs) errors.push(`${name}: ends at ${formatTime(cue.endMs, ".")}, after the film (${formatTime(durationMs, ".")})`);
    if (prev) {
      if (cue.startMs < prev.startMs) errors.push(`${name}: out of time order (starts before ${prev.id})`);
      else if (cue.startMs < prev.endMs) errors.push(`${name}: overlaps ${prev.id}`);
      else if (kind === "chapters" && cue.startMs > prev.endMs) warnings.push(`${name}: a gap after ${prev.id}`);
    } else if (kind === "chapters" && cue.startMs !== 0) warnings.push(`${name}: the first chapter starts after 0`);
    const text = cue.lines.join(" ");
    if (!cue.lines.length || cue.lines.some((l) => !l.trim())) errors.push(`${name}: an empty line`);
    if (kind === "captions") {
      const seconds = (cue.endMs - cue.startMs) / 1000;
      const words = countWords(text);
      const rate = seconds > 0 ? words / seconds : Infinity;
      if (cue.lines.length > rules.maxLines) errors.push(`${name}: ${cue.lines.length} lines (at most ${rules.maxLines})`);
      for (const line of cue.lines) {
        if (lineChars(line) > rules.maxLineChars) errors.push(`${name}: "${line}" is ${lineChars(line)} characters (at most ${rules.maxLineChars})`);
      }
      if (text.includes("!")) errors.push(`${name}: an exclamation mark`);
      if (seconds < rules.minSeconds - 1e-9) errors.push(`${name}: shown ${seconds.toFixed(2)} s (at least ${rules.minSeconds} s)`);
      const fast = `${name}: ${words} words in ${seconds.toFixed(2)} s = ${rate.toFixed(2)} words/s`;
      if (rate > rules.maxWordsPerSecond + 1e-9) {
        if (ownPace && rate <= ownPace.maxWordsPerSecond + 1e-9) warnings.push(`${fast}, above ${rules.maxWordsPerSecond}: ${ownPace.why}`);
        else errors.push(`${fast} (at most ${ownPace ? ownPace.maxWordsPerSecond : rules.maxWordsPerSecond})`);
      } else if (rate > rules.sourceWordsPerSecond + 1e-9) warnings.push(`${name}: ${rate.toFixed(2)} words/s, above the caption file's own ${rules.sourceWordsPerSecond}`);
    }
    if (kind === "descriptions") {
      const seconds = (cue.endMs - cue.startMs) / 1000;
      const needs = countWords(text) / rules.speechWordsPerSecond;
      if (needs > seconds) warnings.push(`${name}: about ${needs.toFixed(0)} s of speech at ${rules.speechWordsPerSecond} words/s in a ${seconds.toFixed(1)} s cue; the film player holds the film on the cue's last frame until the voice is done (extended description)`);
      if (/[<&>]/.test(text)) warnings.push(`${name}: "<", ">" or "&" is escaped in the file, and VTTCue.text returns it escaped`);
    }
    if (kind === "chapters" && cue.lines.length !== 1) errors.push(`${name}: a chapter title is one line`);
    prev = cue;
  }
  if (kind === "chapters" && prev && durationMs !== null && prev.endMs !== durationMs) warnings.push(`chapter ${prev.id}: ends at ${formatTime(prev.endMs, ".")}, not at the end of the film`);
  return { errors, warnings };
}

/** Same cue times and text (ids ignored when `ids` is false). */
export function sameCues(a, b, { ids = true } = {}) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.startMs === b[i].startMs && x.endMs === b[i].endMs && x.lines.join("\n") === b[i].lines.join("\n") && (!ids || x.id === b[i].id));
}

// ---- the film's sources ------------------------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../..");
/** The film's captions as its own source writes them: `bun video/src/launch/master/captions.ts --write` (gitignored). */
export const DEFAULT_FILM_VTT = path.join(REPO, "video/out/launch/pebble-2.0-launch.vtt");
export const DEFAULT_CHAPTERS = path.join(REPO, "src/content/chapters.ts");
/** The command that writes DEFAULT_FILM_VTT, for messages. */
export const FILM_VTT_COMMAND = "bun video/src/launch/master/captions.ts --write";

/** Imports chapters.ts with Node's built-in type stripping, without its "typeless package.json" warning. */
async function importChapters(file) {
  const emit = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
    if (code === "MODULE_TYPELESS_PACKAGE_JSON" || String(warning).includes("Type Stripping")) return;
    return emit.call(process, warning, ...rest);
  };
  try {
    return await import(pathToFileURL(file).href);
  } catch (error) {
    throw new Error(`cannot import ${path.relative(REPO, file)} (Node ${process.version} strips its types): ${error.message}`);
  } finally {
    process.emitWarning = emit;
  }
}

/**
 * The film's length, chapters and descriptions, from src/content/chapters.ts (no film file needed):
 * {fps, totalFrames, durationMs, chapters, descriptions, descriptionsFrom, problems}. Cues carry ms times. The
 * descriptions are one cue a chapter, each chapter's `description` (read aloud by the theatre's audio-description
 * toggle).
 */
export async function filmSpec({ chaptersPath = DEFAULT_CHAPTERS } = {}) {
  const mod = await importChapters(chaptersPath);
  const fps = Number(mod.FILM_FPS);
  const seconds = Number(mod.FILM_DURATION_SECONDS);
  if (!(fps > 0) || !(seconds > 0)) throw new Error(`${path.basename(chaptersPath)}: FILM_FPS and FILM_DURATION_SECONDS must be set`);
  const totalFrames = Math.round(seconds * fps);
  const durationMs = frameToMs(totalFrames, fps);
  const problems = [];
  if (Math.abs(seconds * fps - totalFrames) > 1e-6) problems.push(`chapters.ts FILM_DURATION_SECONDS ${seconds} s is not a whole number of frames at ${fps} fps`);
  const timed = typeof mod.timedChapters === "function" ? mod.timedChapters() : (mod.chapters ?? []).filter((c) => typeof c.startSeconds === "number");
  if (timed.length !== (mod.chapters ?? []).length) problems.push("a chapter in chapters.ts has no startSeconds, so it is left out of the chapter track");
  const chapters = timed.map((c, i) => ({
    id: c.id,
    startMs: Math.round(c.startSeconds * 1000),
    endMs: i + 1 < timed.length ? Math.round(timed[i + 1].startSeconds * 1000) : durationMs,
    lines: [c.title],
    description: c.description,
  }));
  for (const c of chapters) {
    const frame = (c.startMs / 1000) * fps;
    if (Math.abs(frame - Math.round(frame)) > 0.05) problems.push(`chapter ${c.id}: starts at ${c.startMs} ms, between two frames at ${fps} fps`);
  }
  const descriptionsFrom = `${path.basename(chaptersPath)} chapter descriptions (one cue a chapter)`;
  const descriptions = chapters.filter((c) => c.description).map((c) => ({ id: `d-${c.id}`, startMs: c.startMs, endMs: c.endMs, lines: [c.description.replace(/\s+/g, " ").trim()] }));
  return { fps, totalFrames, durationMs, chapters: chapters.map(({ description, ...c }) => c), descriptions, descriptionsFrom, problems };
}

/**
 * The film's three tracks: filmSpec, plus its captions from the film's own VTT (DEFAULT_FILM_VTT, written by
 * FILM_VTT_COMMAND): {...filmSpec, captions, captionsFrom, problems}. Throws when the VTT is missing or unreadable.
 * `problems` adds source-level errors: a cue off the film's frames, or the film's VTT out of the film.
 */
export async function filmTracks({ filmVttPath = DEFAULT_FILM_VTT, chaptersPath = DEFAULT_CHAPTERS } = {}) {
  const spec = await filmSpec({ chaptersPath });
  if (!fs.existsSync(filmVttPath)) throw new Error(`no film captions at ${path.relative(REPO, filmVttPath)}: run \`${FILM_VTT_COMMAND}\` first`);
  const parsed = parseVtt(fs.readFileSync(filmVttPath, "utf8"));
  const problems = [...spec.problems, ...parsed.errors.map((e) => `${path.basename(filmVttPath)}: ${e}`)];
  const captions = parsed.cues.map((c, i) => ({ ...c, id: c.id || `c${String(i + 1).padStart(2, "0")}` }));
  for (const c of captions) {
    for (const ms of [c.startMs, c.endMs]) {
      const frame = (ms / 1000) * spec.fps;
      if (Math.abs(frame - Math.round(frame)) > 0.05) problems.push(`caption ${c.id}: ${formatTime(ms, ".")} is between two frames at ${spec.fps} fps`);
    }
  }
  return { ...spec, captions, captionsFrom: path.relative(REPO, filmVttPath), problems };
}
