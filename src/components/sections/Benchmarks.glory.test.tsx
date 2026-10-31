// Golden set 2.0's moment (Benchmarks.scoreboard.tsx), the strip under the hero (BenchmarkStrip.tsx) and their one-time
// grow-in (Benchmarks.motion.ts, Benchmarks.grow.tsx, Benchmarks.glory.module.css): every figure they print is a cell
// or a line of README.md@v2.0.0:390-424 (vendored at docs/benchmarks/), printed whole in the HTML, and nothing moves
// unless motion is on.
// Run: bun test ./src/components/sections/Benchmarks.glory.test.tsx
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { golden, goldenCell } from "@/content/benchmarks";
import { releaseFacts } from "@/content/releaseFacts";
import { BenchmarkStrip, STRIP_ID } from "./BenchmarkStrip";
import { Benchmarks } from "./Benchmarks";
import { DifferenceFigure, LedTrailed, Scoreboard } from "./Benchmarks.scoreboard";
import { GROW_MS, countText, easeOut, growPlan } from "./Benchmarks.motion";

const ROOT = path.join(import.meta.dir, "..", "..", "..");
const README = readFileSync(path.join(ROOT, "docs", "benchmarks", "golden-set-2.0.README-v2.0.0.md"), "utf8");
/** the README's text with its markdown and line wraps out */
const plain = README.replace(/\*\*/g, "").replace(/`/g, "").replace(/\n\s*/g, " ");

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

/** every number printed in a piece of text: "235", "92.2", "+8.6", "$0.091", "−10" … */
const numbers = (s: string) => s.match(/[+−-]?\$?\d+(?:\.\d+)?/g) ?? [];

const board = renderToStaticMarkup(<Scoreboard />);
const diff = renderToStaticMarkup(<DifferenceFigure />);
const pair = renderToStaticMarkup(<LedTrailed />);
const strip = renderToStaticMarkup(<BenchmarkStrip open />);

describe("the scoreboard", () => {
  test("prints each of its measures' cells whole, as the README's tables print them, with each comparison's model", () => {
    const page = text(board);
    for (const table of golden.result.tables) {
      expect(page).toContain(`${table.caption.replace(` (${table.model})`, "")} (${table.model})`);
      for (const row of table.rows.filter((r) => (golden.scoreboard.measures as readonly string[]).includes(r.measure))) {
        expect(README).toContain(`| ${row.measure} | ${row.pebble} | ${row.other} |`);
        expect(page).toContain(`Pebble${row.pebble}`);
        expect(page).toContain(`${table.other}${row.other}`);
      }
    }
    expect(page).toContain("235 of 255 (92.2 %)");
    expect(page).toContain("231 of 255 (90.6 %)");
    expect(page).toContain("$0.050");
    // no time on the scoreboard: time is reported in the ledger, never shown as a win
    expect(page).not.toMatch(/\d s\b/);
  });

  test("its headline and notes are the README's words", () => {
    expect(plain).toContain(`Codex: ${golden.scoreboard.headline.charAt(0).toLowerCase()}${golden.scoreboard.headline.slice(1, -1)}.`);
    // a sentence's first letter may be a capital where the README's clause starts mid-sentence
    for (const note of golden.scoreboard.notes) expect(plain.toLowerCase()).toContain(note.toLowerCase());
    expect(text(board)).toContain(golden.scoreboard.headline);
  });

  test("every number it prints is in the README", () => {
    for (const n of numbers(text(board))) expect({ n, found: plain.includes(n) }).toEqual({ n, found: true });
  });

  test("bars start at zero, a count's at its denominator, both comparisons of a measure on one scale", () => {
    const widths = [...board.matchAll(/--w:([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(12);
    // Tasks done correctly, on 0–255: 235, 213, 243, 231
    expect(widths.slice(0, 4)).toEqual([92.16, 83.53, 95.29, 90.59]);
    // the rate's and the price's longest bar is their measure's largest value
    expect(Math.max(...widths.slice(4, 8))).toBe(100);
    expect(Math.max(...widths.slice(8, 12))).toBe(100);
    expect(widths.every((w) => w > 0 && w <= 100)).toBe(true);
  });

  test("each figure carries its final value for the counter, and the HTML holds the real value, not a zero", () => {
    const counted = [...board.matchAll(/data-count="([^"]+)">([^<]+)</g)].map((m) => [m[1], m[2]]);
    expect(counted).toHaveLength(12);
    for (const [final, shown] of counted) expect(shown).toBe(final);
    expect(board).toContain('data-grow="still"');
    expect(board).not.toContain("data-tick");
  });
});

describe("the paired difference, drawn", () => {
  test("its marks and its caption are the README's figures", () => {
    for (const row of golden.chart.rows) {
      const line = golden.result.differences.find((d) => d.includes(row.against.replace("Against ", "against ")))!;
      expect(line).toBeDefined();
      for (const n of [row.points, ...row.interval]) expect(line).toContain(`+${n.toFixed(1)}`);
      expect(text(diff)).toContain(`+${row.points.toFixed(1)} points`);
      expect(README).toContain(`against ${row.against.replace("Against ", "")}`);
      expect(README).toContain(`\`${row.model}\``);
    }
    for (const line of golden.result.differences) expect(text(diff)).toContain(line);
  });

  test("both intervals sit right of the zero line it draws", () => {
    for (const row of golden.chart.rows) expect(row.interval[0]).toBeGreaterThan(0);
    // the axis runs from −10 to +20, so zero is a third of the way in; every mark lies right of it
    expect(diff).toContain('style="left:33.333%"');
    const lefts = [...diff.matchAll(/style="left:([\d.]+)%/g)].map((m) => Number(m[1]));
    const marks = lefts.filter((x) => x !== 33.333 && x > 0 && x < 100 && ![16.667, 50, 66.667, 83.333].includes(x));
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((x) => x > 33.333)).toBe(true);
  });

  test("the drawing is for the eye; its words are the caption", () => {
    expect(diff).toContain('aria-hidden="true"');
    const caption = text(diff.slice(diff.indexOf("<figcaption")));
    for (const line of golden.result.differences) expect(caption).toContain(line);
  });
});

describe("where Pebble led and where it trailed", () => {
  test("a pair at the same weight, in the README's words", () => {
    expect(pair).toContain(`>${golden.pair.led.title}</h3>`);
    expect(pair).toContain(`>${golden.pair.trailed.title}</h3>`);
    expect(plain).toContain("Against Claude Code: answers from saved web pages and repeated computations.");
    expect(plain).toContain("Against Codex: no single family.");
    expect(plain).toContain("Where Pebble trails, by one task each: remembering across sessions against Claude Code, and long tasks against Codex.");
    expect(plain).toContain("only where the 95 % lower bound is above zero");
    expect(text(pair)).not.toMatch(/\bbeats?\b/i);
  });
});

describe("the strip under the hero", () => {
  test("renders only while the benchmark is public", () => {
    expect(BenchmarkStrip({ open: false })).toBeNull();
    expect(renderToStaticMarkup(<BenchmarkStrip />) === "").toBe(!releaseFacts.benchmarksPublic);
  });

  test("the README's bold line whole, the two Tasks done correctly rows, and a link to the section", () => {
    const page = text(strip);
    expect(plain).toContain(golden.strip.headline);
    expect(page).toContain(golden.strip.headline);
    expect(plain).toContain(golden.strip.note);
    for (const table of golden.result.tables) {
      const row = table.rows[0]!;
      expect(row.measure).toBe(golden.strip.measure);
      expect(page).toContain(`Pebble${row.pebble.replace(/ \(.*\)$/, "")}`);
      expect(page).toContain(`${table.other}${row.other.replace(/ \(.*\)$/, "")}`);
      expect(page).toContain(`(${table.model})`);
    }
    for (const n of numbers(page)) expect({ n, found: plain.includes(n) }).toEqual({ n, found: true });
    expect(strip).toContain(`<aside id="${STRIP_ID}"`);
    expect(strip).toContain('href="/#benchmarks"');
  });

  test("the copy lint lets the product names through inside the strip only", () => {
    const lint = readFileSync(path.join(ROOT, "tools", "qa", "copy-lint.mjs"), "utf8");
    expect(lint).toContain(`splitRegion(rest, "aside", "${STRIP_ID}")`);
  });
});

describe("the grow-in moves once, and only with motion on", () => {
  test("it arms only when motion is on and the block is still below the fold", () => {
    expect(growPlan("on", false)).toBe("armed");
    expect(growPlan("on", true)).toBe("still");
    expect(growPlan("paused", false)).toBe("still"); // Pause motion, and the system's Reduce motion
    expect(growPlan(undefined, false)).toBe("still"); // no script
    expect(growPlan(null, false)).toBe("still");
  });

  test("the counters keep each figure's form and land on the exact value", () => {
    expect(countText("235", 0)).toBe("0");
    expect(countText("6.3 %", 0)).toBe("0.0 %");
    expect(countText("$0.091", 0)).toBe("$0.000");
    expect(countText("$0.091", 0.5)).toMatch(/^\$0\.0\d\d$/);
    for (const cell of golden.result.tables.flatMap((t) => t.rows.slice(0, 3).flatMap((r) => [r.pebble, r.other]))) {
      const { figure } = goldenCell(cell);
      expect(countText(figure, easeOut(1))).toBe(figure);
      expect(countText(figure, 0.3).length).toBeLessThanOrEqual(figure.length);
    }
    expect(GROW_MS).toBeLessThanOrEqual(1000);
  });

  test("every transition in the moment's styles sits under motion on and a playing block", () => {
    const css = readFileSync(path.join(import.meta.dir, "Benchmarks.glory.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const moving = rules.filter(([, , body]) => /\b(transition|animation)\s*:/.test(body!));
    expect(moving.length).toBeGreaterThan(0);
    for (const [, selector] of moving) expect(selector).toMatch(/:root\[data-motion="on"\]\) \[data-grow="play"\]/);
    // the armed (zero) state also needs motion on, so paused or reduced motion never hides a bar
    for (const [, selector, body] of rules) if (/scaleX\(0\)/.test(body!)) expect(selector).toContain('data-motion="on"');
    expect(css).not.toMatch(/@keyframes/);
  });

  test("the section renders the moment still, every figure at its value", async () => {
    const element = await Benchmarks({ open: true, offered: releaseFacts.version });
    const html = element ? renderToStaticMarkup(element) : "";
    expect(html).toContain(board.slice(0, 200));
    expect(html.indexOf("golden-score-tasks-done-correctly")).toBeLessThan(html.indexOf('id="golden-method"'));
    expect(html).toMatch(/<details[^>]*>.*<summary[^>]*>Show the 1\.0\.2 run<\/summary>/s);
  });
});
