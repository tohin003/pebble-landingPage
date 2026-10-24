// Stealth Lockdown's words (Pebble 1.1.0; OVERRIDES §21), checked where the site states them:
// - they are Pebble's own: the state lines and the honest line equal the vendored shared/pebble/stealthVeil.ts, which
//   provenance.test.ts pins to the v1.1.0 tag byte for byte;
// - every place that names Stealth Lockdown carries the honest line word for word: the FAQ's answer, llms.txt's line
//   (and the section itself, in src/components/sections/StealthLockdown.test.tsx); the only other mention is Privacy's
//   link to the section, so a new mention anywhere else fails here until it carries the line too;
// - the never-words (neverWords.ts: "undetectable", "invisible", exams, interviews, proctoring, monitoring, cheating,
//   bypassing, evading) appear in no visitor string outside the honest line, and tools/qa/copy-lint.mjs bans the same
//   expressions on the built pages.
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { STEALTH_HONEST, STEALTH_OFF_TEXT, STEALTH_ON_TEXT } from "../../shared/pebble/stealthVeil";
import * as copy from "./copy";
import { privacy, sectionIds, stealth } from "./copy";
import { faq } from "./faq";
import { STEALTH_NEVER, usesNeverWord } from "./neverWords";
import { llmsTxt, llmsTxtFor } from "./seo";

const HERE = import.meta.dir;
const REPO = path.resolve(HERE, "../..");

type Found = { at: string; text: string };

/** Every string reachable from a module's exports (objects, arrays and plain values; functions are skipped). */
function strings(value: unknown, at = "", out: Found[] = [], seen = new Set<unknown>()): Found[] {
  if (typeof value === "string") out.push({ at, text: value });
  else if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const [key, item] of Object.entries(value)) strings(item, at ? `${at}.${key}` : key, out, seen);
  }
  return out;
}

/** The string literals of src/content/*.ts, comments left out (what copy-lint's --src reads). */
function literals(): Found[] {
  const out: Found[] = [];
  for (const file of readdirSync(HERE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    readFileSync(path.join(HERE, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const code = line.replace(/\s\/\/\s.*$/, "");
        for (const m of code.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) out.push({ at: `${file}:${i + 1}`, text: m[1] ?? m[2] ?? "" });
      });
  }
  return out;
}

const neverHits = (items: Found[]) => items.filter(({ text }) => usesNeverWord(text, [stealth.honest])).map(({ at, text }) => `${at}: “${text}”`);

describe("Stealth Lockdown's words are Pebble 1.1.0's own", () => {
  test("the honest line and the state lines equal the vendored stealthVeil.ts", () => {
    expect(stealth.honest).toBe(STEALTH_HONEST);
    expect(stealth.stateOn).toBe(STEALTH_ON_TEXT);
    expect(stealth.stateOff).toBe(STEALTH_OFF_TEXT);
  });

  test("the vendored file is the v1.1.0 one", () => {
    const vendored = readFileSync(path.join(REPO, "shared/pebble/stealthVeil.ts"), "utf8");
    expect(vendored.split("\n")[0]).toContain("Pebble v1.1.0, src/stealthVeil.ts");
  });

  test("the switch's label is the setting's name; the H2 is that name, with its two-tone line", () => {
    expect(stealth.name).toBe("Stealth Lockdown");
    expect(stealth.h2).toBe(`${stealth.name}.`);
    expect(stealth.offByDefault).toBe("Off by default.");
    expect(stealth.summary.startsWith(`${stealth.name} keeps Pebble out of screen shares`)).toBe(true);
    expect(stealth.halves.map((half) => half.term)).toEqual(["Stealth", "Lockdown"]);
  });
});

describe("wherever the site names Stealth Lockdown, the honest line is there word for word", () => {
  test("the FAQ: the answer that names it carries the line as a paragraph of its own", () => {
    const naming = faq.filter((item) => [item.question, ...item.answer].some((text) => text.includes(stealth.name)));
    expect(naming.map((item) => item.id)).toEqual(["faq-screen-share"]);
    for (const item of naming) expect(item.answer).toContain(stealth.honest);
    const share = naming[0]!;
    expect(share.question).toBe("Can people see Pebble when I share my screen?");
    expect(share.links?.map((link) => link.href)).toEqual([`/#${sectionIds.stealth}`]);
  });

  test("llms.txt: its one line that names it carries the line, with the benchmark gate open or closed", () => {
    for (const text of [llmsTxt, llmsTxtFor(true), llmsTxtFor(false)]) {
      const naming = text.split("\n").filter((line) => line.includes(stealth.name));
      expect(naming.length).toBe(1);
      expect(naming[0]).toContain(stealth.honest);
      expect(naming[0]).toContain(stealth.offByDefault);
    }
  });

  test("no other visitor string names it, except Privacy's link to the section", () => {
    const allowed = new Set<string>([
      ...strings(stealth).map((s) => s.text), // the section's own words (StealthLockdown.test.tsx renders them)
      privacy.stealthLink.label, // a link to the section, whose honest line sits right under its switch
      ...faq.flatMap((item) => [item.question, ...item.answer, ...(item.links ?? []).map((link) => link.label)]),
    ]);
    const elsewhere = strings(copy)
      .filter((s) => s.text.includes(stealth.name) && !allowed.has(s.text))
      .map((s) => s.at);
    expect(elsewhere).toEqual([]);
    expect(privacy.stealthLink.href).toBe(`/#${sectionIds.stealth}`);
  });
});

describe("the never-words appear nowhere a visitor reads, outside the honest line", () => {
  test("the rule catches the honest line's own words, and allows the line only whole", () => {
    expect(usesNeverWord(stealth.honest, [])).toBe(true);
    expect(usesNeverWord(stealth.honest, [stealth.honest])).toBe(false);
    expect(usesNeverWord(stealth.honest.replace("still forbid it", "may allow it"), [stealth.honest])).toBe(true);
    expect(usesNeverWord("Pebble is invisible to proctoring tools.", [stealth.honest])).toBe(true);
    expect(usesNeverWord("Interactive example", [stealth.honest])).toBe(false);
  });

  test("every string literal in src/content and every export of copy.ts", () => {
    expect(neverHits(literals())).toEqual([]);
    expect(neverHits(strings(copy))).toEqual([]);
  });

  test("the FAQ and llms.txt", () => {
    expect(neverHits(faq.flatMap((item) => [item.question, ...item.answer].map((text) => ({ at: item.id, text }))))).toEqual([]);
    expect(neverHits([llmsTxtFor(true), llmsTxtFor(false)].map((text, i) => ({ at: `llms.txt (${i})`, text })))).toEqual([]);
  });

  test("tools/qa/copy-lint.mjs bans the same words and lets the honest line through by exact match", () => {
    const lint = readFileSync(path.join(REPO, "tools/qa/copy-lint.mjs"), "utf8");
    for (const re of STEALTH_NEVER) expect(lint).toContain(`[/${re.source}/i,`);
    expect(lint).toContain(JSON.stringify(stealth.honest));
  });
});
