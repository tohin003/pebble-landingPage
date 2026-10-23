// The Benchmarks section's gate and order (Benchmarks.tsx). The numbers and words are checked against Pebble's
// analysis in src/content/benchmarks.test.ts; this checks what the section renders, and that it renders nothing at
// all while releaseFacts.benchmarksPublic is false.
// Run: bun test ./src/components/sections
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { benchmarks, run } from "@/content/benchmarks";
import { infrastructure } from "@/content/copy";
import { releaseFacts } from "@/content/releaseFacts";
import { llmsTxt, llmsTxtFor } from "@/content/seo";
import { benchSegments } from "./Benchmarks.figures";
import { Benchmarks } from "./Benchmarks";
import { Infrastructure } from "./Infrastructure";

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

  test("shows the method, the result, both sides, the cost, the limits and the data, in that order", async () => {
    const html = await render({ open: true, offered: releaseFacts.version });
    expect(html).toContain('id="benchmarks"');
    expect(html).toContain(`>${benchmarks.h2}<`);
    const order = [
      benchmarks.method.title,
      benchmarks.result.title,
      benchmarks.sides.title,
      benchmarks.cost.title,
      benchmarks.limits.title,
      benchmarks.data.title,
    ].map((title) => html.indexOf(`>${title.replace(/'/g, "&#x27;")}</h3>`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
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
    expect(text(await render({ open: true, offered: releaseFacts.version }))).not.toContain("hasn't been measured");
    const later = text(await render({ open: true, offered: "1.0.9" }));
    expect(later).toContain("Pebble 1.0.9, the latest release, hasn't been measured yet.");
    expect(run.coveredVersions).not.toContain("1.0.9");
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
