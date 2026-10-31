// The Benchmarks section's gate and order (Benchmarks.tsx). The numbers and words are checked against Pebble's
// analysis in src/content/benchmarks.test.ts; this checks what the section renders, and that it renders nothing at
// all while releaseFacts.benchmarksPublic is false.
// Run: bun test ./src/components/sections
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { benchmarks, golden, run } from "@/content/benchmarks";
import { footer, infrastructure } from "@/content/copy";
import { releaseFacts } from "@/content/releaseFacts";
import { llmsTxt, llmsTxtFor } from "@/content/seo";
import { benchSegments } from "./Benchmarks.figures";
import { Benchmarks } from "./Benchmarks";
import { Infrastructure } from "./Infrastructure";
import { Footer } from "@/components/shell/Footer";

const render = async (props: Parameters<typeof Benchmarks>[0]) => {
  const element = await Benchmarks(props);
  return element ? renderToStaticMarkup(element) : "";
};

/** the visible text, roughly: tags out (inline spans join their words), entities decoded */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

describe("the Benchmarks section", () => {
  test("renders nothing while the benchmark is not public", async () => {
    expect(await Benchmarks({ open: false, offered: releaseFacts.version })).toBeNull();
    expect(await render({ open: false, offered: releaseFacts.version })).toBe("");
  });

  test("follows the gate in releaseFacts.ts by default", async () => {
    const html = await render({ offered: releaseFacts.version });
    expect(html === "").toBe(!releaseFacts.benchmarksPublic);
  });

  test("leads with golden set 2.0, then shows the 1.0.2 run below, dated, each in the philosophy's order", async () => {
    const html = await render({ open: true, offered: releaseFacts.version });
    expect(html).toContain('id="benchmarks"');
    // the H2 is golden set 2.0's; the 1.0.2 run's headline is a line under its own dated heading
    expect(html).toMatch(/<h2 id="benchmarks-title"[^>]*><span>Pebble 2\.0 against Claude Code and Codex\.<\/span> <span>One model for both/);
    expect(html).toContain(`>${benchmarks.h2}<`);
    const at = (tag: string, title: string) => html.indexOf(`>${title.replace(/'/g, "&#x27;")}</${tag}>`);
    // the moment first (the scoreboard's measures, then led and trailed), then the ledger in the philosophy's order
    const goldenOrder = [
      ...golden.scoreboard.measures,
      golden.pair.led.title,
      golden.pair.trailed.title,
      golden.method.title,
      golden.result.title,
      golden.limits.title,
      golden.data.title,
    ].map((t) => at("h3", t));
    expect(goldenOrder.every((i) => i > 0)).toBe(true);
    expect([...goldenOrder].sort((x, y) => x - y)).toEqual(goldenOrder);
    const earlier = html.indexOf('id="benchmarks-earlier"');
    expect(earlier).toBeGreaterThan(goldenOrder.at(-1)!);
    expect(html.indexOf(`>${benchmarks.h2}<`)).toBeGreaterThan(earlier);
    const order = [
      benchmarks.method.title,
      benchmarks.result.title,
      benchmarks.sides.title,
      benchmarks.cost.title,
      benchmarks.limits.title,
      benchmarks.data.title,
    ].map((title) => at("h4", title));
    expect(order.every((i) => i > earlier)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });

  test("prints golden set 2.0's two tables cell by cell, with the model ids as data", async () => {
    const html = await render({ open: true, offered: releaseFacts.version });
    const page = text(html);
    for (const table of golden.result.tables) {
      expect(page).toContain(table.other);
      for (const row of table.rows) {
        expect(page).toContain(row.measure);
        for (const cell of [row.pebble, row.other]) {
          const counted = /^(.*?) \((.*)\)$/.exec(cell);
          if (counted) {
            expect(page).toContain(counted[1]!);
            expect(page).toContain(`(${counted[2]!})`);
          } else expect(page).toContain(cell);
        }
      }
    }
    expect(html).toContain('<span class="data">claude-opus-5-5</span>');
    expect(html).toContain('<span class="data">gpt-6.1-sol</span>');
    expect(page).not.toMatch(/\b(beats?|better|faster|cheaper)\b/i);
  });

  test("prints every rate with its count, the interval and the correction beside the result", async () => {
    const page = text(await render({ open: true, offered: releaseFacts.version }));
    expect(page).toContain("79.3 % (107 of 135)");
    expect(page).toContain("82.2 % (111 of 135)");
    expect(page).toContain("−3.3 points");
    expect(page).toContain("88.9 % (32 of 36)");
    expect(page).toContain("21 of 135");
    expect(page).toContain("17 of 135");
    expect(page).toContain("$0.085");
    expect(page).toContain("$0.053");
    expect(page).toContain("$11.74");
    expect(page).toContain("at most 83.7 %");
    // the correction comes right after the result, before the table
    expect(page.indexOf("Correction, 23 October 2026.")).toBeGreaterThan(page.indexOf("isn't simply"));
    expect(page.indexOf("Correction, 23 October 2026.")).toBeLessThan(page.indexOf(benchmarks.sides.title));
    // never the withdrawn clarification figures, never a comparison word
    expect(page).not.toMatch(/53\.3|33\.3|\+20\.0/);
    expect(page).not.toMatch(/\b(beats?|better|faster)\b/i);
  });

  test("a later release that this result doesn't cover says so", async () => {
    // a release the result covers (1.0.2 to 1.0.4) gets no line
    expect(text(await render({ open: true, offered: "1.0.4" }))).not.toContain("This run measured");
    // the release the page states (a later release, outside 1.0.2 to 1.0.4) gets it; since 2.0.0 the line says only what
    // this run measured, because 2.0.0's own notes report a later benchmark (C-BENCH-3, C-200-22)
    expect(text(await render({ open: true, offered: releaseFacts.version }))).toContain(
      `This run measured Pebble 1.0.2, not ${releaseFacts.version}, the latest release.`,
    );
    const later = text(await render({ open: true, offered: "2.0.0" }));
    expect(later).toContain("This run measured Pebble 1.0.2, not 2.0.0, the latest release.");
    expect(later).not.toMatch(/hasn't been measured/);
    expect(run.coveredVersions).not.toContain("2.0.0");
  });

  test("numbers are data, the model's name is not", () => {
    const data = (s: string) => benchSegments(s).filter((x) => x.data).map((x) => x.text);
    expect(data("95 % interval 68.1 to 88.9")).toEqual(["95 %", "68.1", "88.9"]);
    expect(data("10.9 s and 39.9 s")).toEqual(["10.9 s", "39.9 s"]);
    expect(data("on Claude Opus 5.5 at medium effort")).toEqual([]);
    expect(data("so it isn't simply 79.3 minus 82.2.")).toEqual(["79.3", "82.2"]);
  });
});

describe("with the gate closed, nothing else on the site mentions the benchmark", () => {
  test("Built like infrastructure links to the benchmark only while it is shown", () => {
    const closed = renderToStaticMarkup(<Infrastructure benchmarkShown={false} />);
    expect(closed).toContain('id="infrastructure"');
    expect(closed).not.toContain('href="/#benchmarks"');
    expect(closed).not.toContain(infrastructure.benchmarkLink);
    const open = renderToStaticMarkup(<Infrastructure benchmarkShown />);
    expect(open).toContain('href="/#benchmarks"');
    // the engineering facts say what they are either way
    expect(closed).toContain(infrastructure.note);
    expect(open).toContain(infrastructure.note);
  });

  test("the footer's Benchmarks link, in the Pebble column, shows only while the section is shown", () => {
    const closed = renderToStaticMarkup(<Footer benchmarkShown={false} />);
    expect(closed).not.toContain('href="/#benchmarks"');
    const open = renderToStaticMarkup(<Footer benchmarkShown />);
    expect(open).toContain(`<a href="/#benchmarks">${footer.benchmarksLink.label}</a>`);
    // after GitHub and Releases, in the column named "Pebble"
    const pebbleColumn = open.slice(open.indexOf('aria-labelledby="footer-pebble"'), open.indexOf('id="footer-site"'));
    expect(pebbleColumn).toContain('href="/#benchmarks"');
    expect(pebbleColumn.indexOf("Releases")).toBeLessThan(pebbleColumn.indexOf('href="/#benchmarks"'));
    expect(renderToStaticMarkup(<Footer />).includes('href="/#benchmarks"')).toBe(releaseFacts.benchmarksPublic);
  });

  test("llms.txt carries the benchmark block only while it is public", () => {
    const closed = llmsTxtFor(false);
    expect(closed).not.toContain("## Benchmark");
    expect(closed).not.toMatch(/Claude Code|79\.3|−3\.3|\$0\.0\d\d/);
    expect(closed).toContain("This site makes no speed or quality comparison with other tools.");
    const open = llmsTxtFor(true);
    expect(open).toContain("## Benchmark");
    expect(open).toContain(benchmarks.h2);
    expect(open).not.toContain("makes no speed or quality comparison");
    expect(llmsTxt).toBe(llmsTxtFor(releaseFacts.benchmarksPublic));
  });
});
