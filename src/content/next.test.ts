// The coming feature's hint (src/content/next.ts; D157, OVERRIDES §62; POSTCREDIT_DESIGN §4 and §5): its words, its
// gate, and the places it must never reach. Each rule is first shown failing on planted canaries, then passing on the
// hint. The footer's own render (the gate in the markup, the place, what a screen reader meets) is checked in
// src/components/shell/Footer.test.tsx.
// Run: bun test ./src/content/next.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { checkTwoTone } from "@/components/ui/twoTone";
import { NEXT_NEVER, NEXT_NEVER_PHRASES, comingNext, comingNextShown, versionAtLeast } from "./next";
import { releaseFacts } from "./releaseFacts";
import { jsonLdString, llmsTxt, llmsTxtFor, openGraphFor, seo, softwareApplicationJsonLd, twitterCard } from "./seo";

const HERE = import.meta.dir;
const SRC = path.resolve(HERE, "..");
const REPO = path.resolve(SRC, "..");

/** The never-rules a text breaks, by their source (empty: it passes). */
const breaks = (text: string) => NEXT_NEVER.filter((re) => re.test(text)).map((re) => re.source);

/** Words that would carry the hint somewhere it must not go. */
const HINT_MARKS = [/learning while resting/i, /learn while it (rests|does)/i, /coming next/i, /not built yet/i, /measurement shows it helps/i];
const carriesHint = (text: string) => HINT_MARKS.some((re) => re.test(text));

/** Every .ts and .tsx file under src/, tests left out. */
function sources(): { file: string; text: string }[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => ({ file: `src/${file}`, text: readFileSync(path.join(SRC, file), "utf8") }));
}

describe("the hint says what it is: coming, and not built", () => {
  test("a promise, then its limit in the same voice", () => {
    expect(comingNext.lead).toBe("Coming next: learning while resting.");
    expect(comingNext.limit).toBe("Not built yet. It comes only if measurement shows it helps.");
    expect(comingNext.lead.startsWith("Coming next: ")).toBe(true);
    expect(comingNext.limit.startsWith("Not built yet. ")).toBe(true);
    expect(comingNext.limit).toContain("only if measurement shows it helps");
  });

  test("the limit could stand as a heading's second tone: one whole sentence pair of 60 characters or fewer", () => {
    expect(checkTwoTone(comingNext.lead, comingNext.limit)).toEqual({ ok: true });
  });
});

describe("the never-rules (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1 and C2)", () => {
  test("they catch every canary", () => {
    const canaries = [
      // the design's canaries
      "Pebble never forgets.",
      "It rewrites its memory while it rests.",
      "Pebble learns everything.",
      "Smarter every night.",
      "Coming in 2.1.",
      "Coming this winter.",
      "Twice as good at repeated work.",
      "Learns on a small Qwen model.",
      "Now available.",
      // and the ways a hint could read as part of a release
      "Coming next: learning while resting, in Pebble 2.0.0.",
      "Learning while resting is included.",
      "Coming in the next release.",
      "Coming in a future update.",
      "Coming next month.",
      "Coming later this year.",
      "Coming in the coming weeks.",
      "Coming in early spring.",
      "Coming in October.",
      "It learns half as slowly.",
      "Five lessons a night.",
      "Lessons come cheaper and faster.",
      "It runs on GPT models.",
      "Built with Anthropic.",
      "Coming soon!",
      "Coming next · learning while resting",
      "COMING NEXT: learning while resting.",
      "Coming next: learning while resting 🌙",
      "Learning while resting ships with Pebble.",
    ];
    expect(canaries.filter((text) => breaks(text).length === 0)).toEqual([]);
  });

  test("each of §62's four phrases fails on its own rule", () => {
    const phrase = (text: string) => NEXT_NEVER_PHRASES.some((re) => re.test(text));
    expect(phrase("It rewrites its memory overnight.")).toBe(true);
    expect(phrase("It rewrote what it had in memory.")).toBe(true);
    expect(phrase("Pebble never forgets a task.")).toBe(true);
    expect(phrase("Pebble learns everything you do.")).toBe(true);
    expect(phrase("Pebble gets smarter.")).toBe(true);
    expect(phrase("It learns every night.")).toBe(true);
    expect(phrase("Pebble rests.")).toBe(false);
  });

  test("the hint passes, and so do the film's lines and the house words beside it", () => {
    for (const text of [
      comingNext.lead,
      comingNext.limit,
      "Pebble rests.",
      "Soon, it will learn while it does.",
      "Not built yet.",
      "Soon",
      "Coming next",
      "Pebble is resting.",
    ])
      expect({ text, breaks: breaks(text) }).toEqual({ text, breaks: [] });
  });

  test("tools/qa/copy-lint.mjs bans the four phrases on every page, with the same expressions", () => {
    const lint = readFileSync(path.join(REPO, "tools/qa/copy-lint.mjs"), "utf8");
    for (const re of NEXT_NEVER_PHRASES) {
      expect(re.flags).toBe("i");
      expect(lint).toContain(`[/${re.source}/i,`);
    }
  });
});

describe("the gate: the hint shows only from 2.0.0's page on, while the feature is planned (C13)", () => {
  test("hidden before 2.0.0, for a pre-release or a malformed version, and once withdrawn", () => {
    for (const version of ["1.5.0", "1.9.20", "1.10.0", "1.99.99", "2.0.0-rc.1", "v2.0.0", "2.0", "2", "", "two"])
      expect({ version, shown: comingNextShown(version) }).toEqual({ version, shown: false });
    expect(comingNextShown("2.0.0", false)).toBe(false);
    expect(comingNextShown("3.0.0", false)).toBe(false);
  });

  test("shown from 2.0.0 on, compared as numbers (10.0.0 is later than 2.0.0)", () => {
    for (const version of ["2.0.0", " 2.0.0 ", "2.0.1", "2.1.0", "3.0.0", "10.0.0"])
      expect({ version, shown: comingNextShown(version) }).toEqual({ version, shown: true });
    expect(versionAtLeast("1.10.0", "1.9.0")).toBe(true);
    expect(versionAtLeast("1.9.0", "1.10.0")).toBe(false);
  });

  test("by default it follows the release facts, which it never changes", () => {
    expect(comingNext.from).toBe("2.0.0");
    expect(comingNext.planned).toBe(true);
    expect(comingNextShown()).toBe(versionAtLeast(releaseFacts.version, comingNext.from));
    // the gate only reads the facts: nothing in next.ts writes to them
    expect(readFileSync(path.join(HERE, "next.ts"), "utf8")).not.toMatch(/releaseFacts\.\w+\s*=[^=]/);
  });
});

describe("only the footer carries the hint (POSTCREDIT_DESIGN §4.5)", () => {
  test("no source imports it but the footer", () => {
    const importers = sources()
      .filter(({ text }) => /from\s+["'](@\/content\/next|\.\/next|\.\.\/content\/next)["']/.test(text))
      .map(({ file }) => file);
    expect(importers).toEqual(["src/components/shell/Footer.tsx"]);
  });

  test("its words live in one file: no other source says them", () => {
    const elsewhere = sources()
      .filter(({ file }) => file !== "src/content/next.ts" && carriesHint(sourceText(file)))
      .map(({ file }) => file);
    expect(elsewhere).toEqual([]);
  });

  test("llms.txt, with the benchmark gate open or closed", () => {
    for (const text of [llmsTxt, llmsTxtFor(true), llmsTxtFor(false)]) expect(carriesHint(text)).toBe(false);
  });

  test("the metadata, Open Graph, the X card and the JSON-LD record", () => {
    expect(carriesHint(JSON.stringify(seo))).toBe(false);
    for (const page of ["/", "/film", "/credits", "/privacy"]) expect(carriesHint(JSON.stringify(openGraphFor(page)))).toBe(false);
    expect(carriesHint(JSON.stringify(twitterCard()))).toBe(false);
    const record = { version: "2.0.0", sizeBytes: 1, datePublished: "2026-11-01", live: true };
    expect(carriesHint(jsonLdString(softwareApplicationJsonLd()))).toBe(false);
    expect(carriesHint(jsonLdString(softwareApplicationJsonLd(record)))).toBe(false);
  });

  test("the canary: a mark in llms.txt would be caught", () => {
    expect(carriesHint(`${llmsTxt}\n- Coming next: learning while resting.`)).toBe(true);
    expect(carriesHint("Soon, Pebble will learn while it rests.")).toBe(true);
  });
});

/** A source file's comments left out, so a file may explain the hint without carrying its words to a visitor. */
function sourceText(file: string): string {
  return readFileSync(path.join(REPO, file), "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .map((line) => line.replace(/\s\/\/\s.*$/, ""))
    .join("\n");
}
