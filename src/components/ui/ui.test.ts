// The system's pure rules: the two-tone heading check, numbers as data, the horizon's path data, the rail labels, and
// the colour roles' fills (no ink buttons or pills).
// Run: bun test ./src/components/ui
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { agentGuard, finalCta, footer, honestLimits, install, openSource, pace, privacy } from "@/content/copy";
import { labels } from "@/content/labels";
import { splitData } from "./numbers";
import { ARCH, ARCH_FROM_DEG, ARCH_TO_DEG, LINES, archPoint } from "./groundPaths";
import { TWO_TONE_MAX, checkTwoTone, firstSentence } from "./twoTone";

describe("two-tone headings (DESIGN-LEXINGTON §3.6)", () => {
  test("the approved pairs pass", () => {
    const pairs: [string, string][] = [
      [agentGuard.heading, agentGuard.intent],
      [finalCta.h2, finalCta.lead],
      [pace.h2, firstSentence(pace.lead)[0]],
      [privacy.h2, firstSentence(privacy.lead)[0]],
      [install.h2, firstSentence(install.lead)[0]],
      [honestLimits.heading, firstSentence(honestLimits.lead)[0]],
      [openSource.h2, firstSentence(openSource.lead)[0]],
      firstSentence(footer.resting),
    ];
    for (const [title, then] of pairs) {
      expect({ title, then, check: checkTwoTone(title, then) }).toEqual({ title, then, check: { ok: true } });
    }
  });

  test("a long second line, a fragment or an empty line fails", () => {
    expect(checkTwoTone("Install Pebble.", "x".repeat(TWO_TONE_MAX) + ".").ok).toBe(false);
    expect(checkTwoTone("Evidence before", "done, every time.").ok).toBe(false); // a split sentence
    expect(checkTwoTone("Install Pebble.", "One line in Terminal").ok).toBe(false); // no full stop
    expect(checkTwoTone("", "No telemetry.").ok).toBe(false);
    expect(checkTwoTone("Pebble is resting.", " ").ok).toBe(false);
  });

  test("firstSentence cuts after the first full stop and keeps the rest whole", () => {
    expect(firstSentence("Pebble is resting. No telemetry.")).toEqual(["Pebble is resting.", "No telemetry."]);
    expect(firstSentence("One line in Terminal, or the zip by hand. Both install the same app from the GitHub release.")).toEqual([
      "One line in Terminal, or the zip by hand.",
      "Both install the same app from the GitHub release.",
    ]);
    expect(firstSentence("Only one sentence.")).toEqual(["Only one sentence.", ""]);
    expect(firstSentence("Settings › Permissions. “Ask” first.")).toEqual(["Settings › Permissions.", "“Ask” first."]);
  });
});

describe("numbers as data", () => {
  const data = (text: string, counts?: string[]) =>
    splitData(text, counts)
      .filter((s) => s.data)
      .map((s) => s.text);

  test("versions, sizes, counts, rates, times", () => {
    expect(data("v1.0.1")).toEqual(["v1.0.1"]);
    expect(data("72 MB")).toEqual(["72 MB"]);
    expect(data("8,421 automated tests at v1.0.1, none skipped.")).toEqual(["8,421", "v1.0.1"]);
    expect(data("success 79.3 % (107 of 135) vs 82.2 %")).toEqual(["79.3 %", "107 of 135", "82.2 %"]);
    expect(data("−3.3 points (95 % CI −9.2 to +2.5)")).toEqual(["−3.3 points", "95 %", "−9.2", "+2.5"]);
    expect(data("about $0.085 a task")).toEqual(["$0.085"]);
    expect(data("Plays at 1:16, from 0:28.")).toEqual(["1:16", "0:28"]);
  });

  test("bare small numbers and names with numbers stay words", () => {
    expect(data("macOS 12 or later")).toEqual([]);
    expect(data("Apache-2.0")).toEqual([]);
    expect(data("under the Apache License 2.0. Pebble 1.0 doesn't check for updates")).toEqual([]);
    expect(data("Version 1.0.1")).toEqual(["1.0.1"]);
    expect(data("1,772 service checks across 40 validator suites")).toEqual(["1,772"]);
    expect(data("1,772 service checks across 40 validator suites", ["validator suites"])).toEqual(["1,772", "40"]);
  });

  test("the segments rebuild the text exactly", () => {
    const text = "8,421 tests, 1,772 checks, 40 suites, v1.0.1, 72 MB, 79.3 % (107 of 135).";
    expect(
      splitData(text, ["suites"])
        .map((s) => s.text)
        .join(""),
    ).toBe(text);
  });
});

describe("the horizon (DESIGN-LEXINGTON §3.9)", () => {
  test("every ground line spans its box and stays within about 1.5 px of its middle", () => {
    for (const d of LINES) {
      expect(d.startsWith("M0 ")).toBe(true);
      const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const ys = numbers.filter((_, i) => i % 2 === 1);
      const xs = numbers.filter((_, i) => i % 2 === 0);
      expect(Math.max(...xs)).toBe(1000);
      for (const y of ys) expect(Math.abs(y - 6)).toBeLessThanOrEqual(1.5);
    }
  });

  test("the arch joins the dial's circle where the knobs can sit, and lands on its baseline", () => {
    const [lx, ly] = archPoint(ARCH_FROM_DEG);
    const [rx, ry] = archPoint(ARCH_TO_DEG);
    expect(lx).toBeCloseTo(-99.03, 1);
    expect(ly).toBeCloseTo(86.08, 1);
    expect(rx).toBeCloseTo(99.03, 1);
    expect(ry).toBeCloseTo(86.08, 1);
    expect(ARCH).toContain(`A100 100 0 0 1 ${rx} ${ry}`);
    expect(ARCH.startsWith("M-152 100.4")).toBe(true);
    // the knobs' angles (PermissionDial.module.css: 152°, 90°, 28°; phones 155° and 25°) lie on the drawn circle
    for (const deg of [152, 90, 28, 155, 25]) expect(deg < ARCH_FROM_DEG && deg > ARCH_TO_DEG).toBe(true);
  });
});

describe("rail labels (DESIGN-LEXINGTON §11)", () => {
  test("a name and a fact, sentence case, never all caps, short enough for the rail", () => {
    const all = [
      ...Object.values(labels).filter((l): l is { name: string; fact: string } => typeof l === "object"),
      labels.install("1.0.1"),
      labels.getPebble("72 MB"),
    ];
    for (const { name, fact } of all) {
      expect(name.length).toBeGreaterThan(0);
      expect(fact.length).toBeGreaterThan(0);
      expect(name).not.toBe(name.toUpperCase());
      expect((name + fact).length).toBeLessThanOrEqual(48);
      expect(/^[A-Z]/.test(name)).toBe(true);
    }
  });
});

describe("colour roles (OVERRIDES §17, PHILOSOPHY: the pebble's world is sage, never monochrome)", () => {
  // Ink is for text, headings and hairline outlines. A filled black button or pill is another product's look: the
  // primary Download and Copy are sage, the header's Download is an ink outline, everything else is a text link.
  test("nothing on the site is filled with ink", () => {
    const src = path.resolve(import.meta.dir, "../..");
    const inkFill = new RegExp(String.raw`background(?:-color)?\s*:\s*var\(--ink\)`);
    const inkClass = new RegExp(String.raw`\bbg-ink(?![-\w])`); // Tailwind's bg-ink (bg-ink-2 is a different role)
    const found: string[] = [];
    for (const file of readdirSync(src, { recursive: true }) as string[]) {
      if (!/\.(css|tsx?)$/.test(file) || file.endsWith(".test.ts")) continue;
      readFileSync(path.join(src, file), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (inkFill.test(line) || inkClass.test(line)) found.push(`src/${file}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(found).toEqual([]);
  });
});
