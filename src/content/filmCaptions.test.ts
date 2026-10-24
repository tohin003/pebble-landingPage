// The /film transcript's caption cues must equal lane E's docs/film-captions.json, and chapters.ts must list every
// on-screen line the captions carry. Run: bun test ./src/content
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chapters } from "./chapters";
import { chapterSounds, filmCaptionCues, isSoundLine } from "./filmCaptions";

const source = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "docs", "film-captions.json"), "utf8")) as {
  cues: unknown[];
};

test("filmCaptionCues equals docs/film-captions.json, cue for cue", () => {
  expect(filmCaptionCues).toEqual(source.cues as typeof filmCaptionCues);
});

test("every caption cue belongs to a chapter in chapters.ts", () => {
  const ids = new Set(chapters.map((c) => c.id));
  for (const cue of filmCaptionCues) expect(ids.has(cue.chapter)).toBe(true);
});

test("chapters.ts lists every on-screen line of the captions, in its own chapter", () => {
  for (const cue of filmCaptionCues) {
    const chapter = chapters.find((c) => c.id === cue.chapter)!;
    for (const line of cue.lines.filter((l) => !isSoundLine(l))) expect(chapter.onScreen).toContain(line);
  }
});

test("chapterSounds strips the brackets and keeps the order", () => {
  expect(chapterSounds("desktop")[0]).toBe("Gentle music begins");
  expect(chapterSounds("project")).toEqual([]);
  expect(chapterSounds("get")).toEqual(["Soft thud", "Final chord"]);
});
