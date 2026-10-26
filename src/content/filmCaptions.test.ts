// The /film transcript's caption cues must equal lane E's docs/film-captions.json, and chapters.ts must list every
// on-screen line the captions carry. Run: bun test ./src/content
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chapters } from "./chapters";
import { chapterSounds, filmCaptionCues, screenTextOf, soundOf } from "./filmCaptions";

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
    for (const line of cue.lines.map(screenTextOf).filter((l) => l !== "")) expect(chapter.onScreen).toContain(line);
  }
});

test("chapterSounds strips the brackets and keeps the order", () => {
  expect(chapterSounds("desktop")[0]).toBe("A soft melody and a heartbeat");
  expect(chapterSounds("project")).toEqual([]);
  expect(chapterSounds("tested")).toEqual(["The music stops", "A big hit", "The biggest hit"]);
  expect(chapterSounds("get")).toEqual(["The beat returns", "Hit"]);
});

test("a sound description may lead a line; the rest of the line is on-screen text", () => {
  expect(soundOf("[Hit] Free for Macs with Apple silicon")).toBe("Hit");
  expect(screenTextOf("[Hit] Free for Macs with Apple silicon")).toBe("Free for Macs with Apple silicon");
  expect(soundOf("[The music stops]")).toBe("The music stops");
  expect(screenTextOf("[The music stops]")).toBe("");
  expect(soundOf("Not notarized")).toBeNull();
  expect(screenTextOf("Not notarized")).toBe("Not notarized");
});

test("the end card captions the promise with its limit, and the address (OVERRIDES §46 P2-7)", () => {
  const price = filmCaptionCues.find((c) => c.lines.some((l) => screenTextOf(l) === "Free for Macs with Apple silicon"))!;
  expect(price.lines.map(screenTextOf)).toContain("Not notarized");
  expect(price.start).toBe(2160);
  const last = filmCaptionCues[filmCaptionCues.length - 1]!;
  expect(last.lines).toEqual(["github.com/tohin003/Pebble", "Shown with sample data"]);
  // the held run's stop is captioned when the music stops (f1453), not on the cut's hit
  expect(filmCaptionCues.find((c) => c.id === "c15")!.start).toBe(1453);
});
