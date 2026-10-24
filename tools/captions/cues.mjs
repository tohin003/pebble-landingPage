// tools/captions/cues.mjs: the caption rules, readers and writers shared by tools/captions/build.mjs and
// tools/encode/verify.mjs (no dependencies).
//
// - Time: seconds = frame / fps; WebVTT and SRT times are milliseconds rounded from the frame
//   (docs/film-captions.json "vtt_time" / "srt_time").
// - Rules: lane E's validator (.work/laneE/validate-film-spec.ts) is the reference. A word is a token with a letter or a
//   digit; a caption is shown for at least 1.2 s, has one or two lines and no exclamation mark; cues are in time order
//   and never overlap. On top: at most 42 characters a line and at most 3.5 words a second (the encode lane's gate;
//   the caption file's own convention is 3, reported as a warning above it).
// - Cuts: a cut file lists the film's source frame ranges in the order they play (see readCut). mapCuesToCut moves
//   the film's cues onto the cut's timeline; cutInputs gives encode.sh the frame-exact input seeks.
//
// CLI (for encode.sh): node tools/captions/cues.mjs cut-inputs <cut.json> <source_frames> [fps]
//   prints the cut's frame count, then one "<seek seconds> <frames>" line per range.
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
 * "chapters" (order, no overlap, contiguous from 0 to the end). Returns {errors, warnings}, each a list of strings.
 */
export function validateCues(cues, { kind = "captions", durationMs = null, rules = RULES } = {}) {
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
      if (rate > rules.maxWordsPerSecond + 1e-9) errors.push(`${name}: ${words} words in ${seconds.toFixed(2)} s = ${rate.toFixed(2)} words/s (at most ${rules.maxWordsPerSecond})`);
      else if (rate > rules.sourceWordsPerSecond + 1e-9) warnings.push(`${name}: ${rate.toFixed(2)} words/s, above the caption file's own ${rules.sourceWordsPerSecond}`);
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

// ---- film sources -----------------------------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../..");
export const DEFAULT_CAPTIONS = path.join(REPO, "docs/film-captions.json");
export const DEFAULT_CHAPTERS = path.join(REPO, "src/content/chapters.ts");

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
 * The film's three tracks, built from docs/film-captions.json and src/content/chapters.ts:
 * {fps, totalFrames, durationMs, captions, chapters, descriptions, descriptionsFrom, problems}. Cues carry ms times;
 * caption cues also carry their source frames (start, end) and chapter. `problems` lists source-level errors (a
 * caption outside its chapter, a length mismatch between the two files).
 */
export async function filmTracks({ captionsPath = DEFAULT_CAPTIONS, chaptersPath = DEFAULT_CHAPTERS } = {}) {
  const json = JSON.parse(fs.readFileSync(captionsPath, "utf8"));
  const mod = await importChapters(chaptersPath);
  const fps = Number(json.fps);
  const totalFrames = Number(json.total_frames);
  const problems = [];
  if (!(fps > 0) || !Number.isInteger(totalFrames) || totalFrames <= 0) throw new Error(`${path.basename(captionsPath)}: fps and total_frames must be set`);
  const durationMs = frameToMs(totalFrames, fps);
  if (typeof mod.FILM_DURATION_SECONDS === "number" && Math.abs(mod.FILM_DURATION_SECONDS * fps - totalFrames) > 0.5) {
    problems.push(`chapters.ts FILM_DURATION_SECONDS ${mod.FILM_DURATION_SECONDS} s is not total_frames ${totalFrames} / ${fps} fps`);
  }
  const captions = (json.cues ?? []).map((c) => ({
    id: c.id,
    start: c.start,
    end: c.end,
    startMs: frameToMs(c.start, fps),
    endMs: frameToMs(c.end, fps),
    lines: [...c.lines],
    chapter: c.chapter,
  }));
  for (const c of captions) {
    if (!Number.isInteger(c.start) || !Number.isInteger(c.end)) problems.push(`caption ${c.id}: start and end must be whole frames`);
  }
  const timed = typeof mod.timedChapters === "function" ? mod.timedChapters() : (mod.chapters ?? []).filter((c) => typeof c.startSeconds === "number");
  const chapters = timed.map((c, i) => ({
    id: c.id,
    startMs: Math.round(c.startSeconds * 1000),
    endMs: i + 1 < timed.length ? Math.round(timed[i + 1].startSeconds * 1000) : durationMs,
    lines: [c.title],
    description: c.description,
  }));
  if (timed.length !== (mod.chapters ?? []).length) problems.push("a chapter in chapters.ts has no startSeconds, so it is left out of the chapter track");
  const ids = new Set(chapters.map((c) => c.id));
  for (const c of captions) {
    const chapter = chapters.find((ch) => ch.id === c.chapter);
    if (!ids.has(c.chapter)) problems.push(`caption ${c.id}: unknown chapter "${c.chapter}"`);
    else if (c.startMs < chapter.startMs || c.startMs >= chapter.endMs) problems.push(`caption ${c.id}: starts outside its chapter "${c.chapter}"`);
  }
  let descriptions;
  let descriptionsFrom;
  if (Array.isArray(json.descriptions) && json.descriptions.length) {
    descriptionsFrom = `${path.basename(captionsPath)} "descriptions"`;
    descriptions = json.descriptions.map((d, i) => ({
      id: d.id ?? `d${String(i + 1).padStart(2, "0")}`,
      startMs: frameToMs(d.start, fps),
      endMs: frameToMs(d.end, fps),
      lines: [Array.isArray(d.lines) ? d.lines.join(" ") : String(d.text ?? "")],
    }));
  } else {
    // FILM_SPEC §18: each chapter's `description` in chapters.ts is the audio description of what the chapter shows.
    descriptionsFrom = `${path.basename(chaptersPath)} chapter descriptions (one cue a chapter, FILM_SPEC §18)`;
    descriptions = chapters.filter((c) => c.description).map((c) => ({ id: `d-${c.id}`, startMs: c.startMs, endMs: c.endMs, lines: [c.description.replace(/\s+/g, " ").trim()] }));
  }
  return { fps, totalFrames, durationMs, captions, chapters: chapters.map(({ description, ...c }) => c), descriptions, descriptionsFrom, problems };
}

// ---- cuts -------------------------------------------------------------------------------------------------------

/**
 * Reads a cut file:
 *   {
 *     "name": "x-30s",                         optional, for messages
 *     "fps": 30,                               optional; must equal the film's
 *     "ranges": [[0, 144], [504, 648]],        source frames, [first, end) (end exclusive), in playing order;
 *                                              {"from": 0, "to": 144} works too
 *     "include": ["c01", "c08"],               optional: only these caption ids (default: every cue a range reaches)
 *     "exclude": ["c09"],                      optional: never these
 *     "add": [{"id": "x1", "start": 0, "end": 36, "lines": ["[Gentle music begins]"]}]
 *                                              optional: cues of the cut's own (its timeline, frames)
 *   }
 * Returns {name, fps, ranges, frames, include, exclude, add}.
 */
export function readCut(raw, { totalFrames, fps }) {
  const where = raw?.name ? `cut "${raw.name}"` : "cut";
  if (raw?.fps !== undefined && Number(raw.fps) !== fps) throw new Error(`${where}: fps ${raw.fps}, the film runs at ${fps}`);
  if (!Array.isArray(raw?.ranges) || !raw.ranges.length) throw new Error(`${where}: "ranges" must list at least one [first, end) frame range`);
  const ranges = raw.ranges.map((r, i) => {
    const [from, to] = Array.isArray(r) ? r : [r?.from, r?.to];
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from) throw new Error(`${where}: range ${i + 1} must be two whole frames with first < end, got ${JSON.stringify(r)}`);
    if (Number.isInteger(totalFrames) && to > totalFrames) throw new Error(`${where}: range ${i + 1} ends at frame ${to}, after the film's ${totalFrames} frames`);
    return [from, to];
  });
  const add = (raw.add ?? []).map((c, i) => {
    if (!Number.isInteger(c.start) || !Number.isInteger(c.end) || !Array.isArray(c.lines)) throw new Error(`${where}: added cue ${i + 1} needs whole-frame start/end and lines`);
    return { id: c.id ?? `x${i + 1}`, start: c.start, end: c.end, lines: [...c.lines], added: true };
  });
  return {
    name: raw.name ?? "cut",
    fps,
    ranges,
    frames: ranges.reduce((n, [a, b]) => n + (b - a), 0),
    include: Array.isArray(raw.include) ? new Set(raw.include) : null,
    exclude: new Set(raw.exclude ?? []),
    add,
  };
}

/**
 * Moves frame-timed cues ({id, start, end, lines}) onto the cut's timeline. A cue that runs across two consecutive
 * ranges stays one cue; a cue shown twice gets "<id>.2"; a clipped cue is reported. Returns {cues, notes}; cues carry
 * frames (start, end) and ms.
 */
export function mapCuesToCut(cues, cut) {
  const pieces = [];
  let offset = 0;
  for (const [from, to] of cut.ranges) {
    for (const cue of cues) {
      if (cut.include && !cut.include.has(cue.id)) continue;
      if (cut.exclude.has(cue.id)) continue;
      const a = Math.max(cue.start, from);
      const b = Math.min(cue.end, to);
      if (b <= a) continue;
      pieces.push({ id: cue.id, start: offset + (a - from), end: offset + (b - from), lines: cue.lines, shown: b - a, length: cue.end - cue.start });
    }
    offset += to - from;
  }
  pieces.sort((x, y) => x.start - y.start);
  const merged = [];
  for (const piece of pieces) {
    const last = [...merged].reverse().find((m) => m.id === piece.id);
    if (last && last.end === piece.start) {
      last.end = piece.end;
      last.shown += piece.shown;
    } else merged.push({ ...piece });
  }
  const seen = new Map();
  const notes = [];
  for (const m of merged) {
    const n = (seen.get(m.id) ?? 0) + 1;
    seen.set(m.id, n);
    if (n > 1) {
      notes.push(`${m.id} is shown ${n} times in the cut; this copy is ${m.id}.${n}`);
      m.id = `${m.id}.${n}`;
    }
    if (m.shown < m.length) notes.push(`${m.id} is clipped: ${(m.shown / cut.fps).toFixed(2)} s of its ${(m.length / cut.fps).toFixed(2)} s`);
  }
  for (const id of cut.include ?? []) if (!seen.has(id)) notes.push(`${id} is in "include" but no range reaches it`);
  const all = [...merged, ...cut.add].sort((x, y) => x.start - y.start || x.end - y.end);
  for (const c of all) if (c.end > cut.frames) notes.push(`${c.id} ends at frame ${c.end}, after the cut's ${cut.frames} frames`);
  return {
    cues: all.map((c) => ({ id: c.id, start: c.start, end: c.end, startMs: frameToMs(c.start, cut.fps), endMs: frameToMs(c.end, cut.fps), lines: c.lines })),
    notes,
  };
}

/**
 * Frame-exact input seeks for the cut: one entry per range, {seek, frames}. `seek` is the range's first frame time
 * rounded DOWN to the microsecond, so FFmpeg's accurate seek keeps exactly that frame and drops the one before it.
 */
export function cutInputs(cut) {
  return cut.ranges.map(([from, to]) => ({ seek: (Math.floor((from * 1e6) / cut.fps) / 1e6).toFixed(6), frames: to - from }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, file, frames, fps = "30"] = process.argv.slice(2);
  if (command !== "cut-inputs" || !file || !frames) {
    console.error("usage: node tools/captions/cues.mjs cut-inputs <cut.json> <source_frames> [fps]");
    process.exit(2);
  }
  try {
    const cut = readCut(JSON.parse(fs.readFileSync(file, "utf8")), { totalFrames: Number(frames), fps: Number(fps) });
    console.log(cut.frames);
    for (const input of cutInputs(cut)) console.log(`${input.seek} ${input.frames}`);
  } catch (error) {
    console.error(`cues.mjs: ${error.message}`);
    process.exit(1);
  }
}
