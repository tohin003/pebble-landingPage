// The benchmark's numbers and words (src/content/benchmarks.ts), checked against their source: the analysis that Pebble
// published at commit 26d7b19 (vendored, byte for byte, at docs/benchmarks/claude-opus-5-5.analysis.json) and the rules
// of OVERRIDES §11, §16 and §18. Every number the section prints is derived here from the analysis, so a typo, a
// rounding slip or a number from the withdrawn clarification comparison fails the site's tests.
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { benchmarkLinks, benchmarkLlmsLinesFor, benchmarks, golden, goldenLlmsLines, money, pct, run, signed } from "./benchmarks";
import { releaseFacts } from "./releaseFacts";

const FILE = path.join(import.meta.dir, "..", "..", "docs", "benchmarks", "claude-opus-5-5.analysis.json");
/** sha256 of docs/benchmarks/claude-opus-5-5/analysis.json at Pebble commit 26d7b19 (raw.githubusercontent.com) */
const PINNED = "63e688d314c2279c36f57bb1a403f8f57ef77b9defbb00c741968d5928c0382b";

const raw = readFileSync(FILE);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a: any = JSON.parse(raw.toString("utf8"));

/** a share (0.7925…) as the page prints a rate: per cent, one decimal */
const asRate = (share: number) => Number((share * 100).toFixed(1));

describe("the vendored analysis", () => {
  test("is the published file at 26d7b19, byte for byte", () => {
    expect(createHash("sha256").update(raw).digest("hex")).toBe(PINNED);
    expect(a.schema).toBe("pebble.bench_analysis/1");
    expect(a.kind).toBe("claude");
  });
});

describe("every number in `run` comes from the analysis", () => {
  const sp = a.summary.pebble;
  const sc = a.summary.claude_code;

  test("cells, tasks and counting", () => {
    expect(sp.cells).toBe(run.runsPerProduct);
    expect(sc.cells).toBe(run.runsPerProduct);
    expect(run.tasks * run.repetitions).toBe(run.runsPerProduct);
    expect(Object.keys(a.families)).toHaveLength(run.families);
    expect(run.tasks).toBe(run.families * 5);
    expect(a.counting.planned_cells).toBe(run.plannedRuns);
    expect(a.counting.not_run).toBe(run.notRun);
    expect(a.paired.pairs).toBe(run.pairedRuns);
    // the pairs leave out the descriptive family (delegation): 135 − 15
    expect(a.claims.descriptive).toEqual(["delegation"]);
    expect(run.runsPerProduct - run.familyRuns).toBe(run.pairedRuns);
  });

  test("success with counts and intervals", () => {
    expect(sp.passed).toBe(run.pebble.passed);
    expect(sc.passed).toBe(run.claudeCode.passed);
    expect(asRate(sp.success)).toBe(run.pebble.rate);
    expect(asRate(sc.success)).toBe(run.claudeCode.rate);
    expect(sp.success_cluster95.map(asRate)).toEqual([...run.pebble.interval]);
    expect(sc.success_cluster95.map(asRate)).toEqual([...run.claudeCode.interval]);
  });

  test("the paired difference and its interval", () => {
    expect(asRate(a.paired.delta)).toBe(run.difference.points);
    expect(a.paired.cluster95.map(asRate)).toEqual([...run.difference.interval]);
    // the interval includes zero: "no difference shown"
    expect(run.difference.interval[0] < 0 && run.difference.interval[1] > 0).toBe(true);
    expect(a.claims.scopes.overall.better).toBe(false);
  });

  test("multi-turn success is the follow-up-turn measure (R2), not the family", () => {
    expect(sp.R2.multi_turn_cells).toBe(run.multiTurnRuns);
    expect(sc.R2.multi_turn_cells).toBe(run.multiTurnRuns);
    expect(asRate(sp.R2.success)).toBe(run.pebble.multiTurn.rate);
    expect(asRate(sc.R2.success)).toBe(run.claudeCode.multiTurn.rate);
    expect(Math.round(sp.R2.success * run.multiTurnRuns)).toBe(run.pebble.multiTurn.passed);
    expect(Math.round(sc.R2.success * run.multiTurnRuns)).toBe(run.claudeCode.multiTurn.passed);
    // the family is level (15 of 15 each): its numbers must never stand for the lead
    expect(a.families.multi_turn.products.pebble.success).toBe(1);
    expect(a.families.multi_turn.products.claude_code.success).toBe(1);
  });

  test("every family where Pebble trailed, with counts and paired intervals (OVERRIDES §28 CL-11)", () => {
    const behind = [
      ["coding_fix", "codingFix", run.codingFixDifference],
      ["coding_build_review", "codingBuild", run.codingBuildDifference],
      ["research", "research", run.researchDifference],
      ["companion", "companion", run.companionDifference],
    ] as const;
    // these four are every compared family where Pebble's rate was lower: none is left out of "Behind"
    const trailing = Object.entries(a.families as Record<string, { products: Record<string, { success: number }> }>)
      .filter(([key, f]) => !a.claims.descriptive.includes(key) && f.products.pebble!.success < f.products.claude_code!.success)
      .map(([key]) => key)
      .sort();
    expect(trailing).toEqual(behind.map(([key]) => key).sort());
    for (const [key, page, diff] of behind) {
      const f = a.families[key];
      expect(f.products.pebble.cells).toBe(run.familyRuns);
      expect(asRate(f.products.pebble.success)).toBe(run.pebble[page].rate);
      expect(asRate(f.products.claude_code.success)).toBe(run.claudeCode[page].rate);
      expect(Math.round(f.products.pebble.success * run.familyRuns)).toBe(run.pebble[page].passed);
      expect(Math.round(f.products.claude_code.success * run.familyRuns)).toBe(run.claudeCode[page].passed);
      expect(asRate(f.paired.delta)).toBe(diff.points);
      expect(f.paired.cluster95.map(asRate)).toEqual([...diff.interval]);
    }
  });

  test("every family's interval reaches zero (the note under the table)", () => {
    for (const f of Object.values(a.families) as { paired: { cluster95: [number, number] } }[]) {
      const [lo, hi] = f.paired.cluster95;
      expect(lo <= 0 && hi >= 0).toBe(true);
    }
  });

  test("false completions, phrasing and time", () => {
    expect(sp.false_completions).toBe(run.pebble.falseCompletions);
    expect(sc.false_completions).toBe(run.claudeCode.falseCompletions);
    expect(asRate(sp.R1.canonical)).toBe(run.pebble.canonical);
    expect(asRate(sp.R1.worst_paraphrase)).toBe(run.pebble.worstPhrasing);
    expect(asRate(sc.R1.canonical)).toBe(run.claudeCode.canonical);
    expect(asRate(sc.R1.worst_paraphrase)).toBe(run.claudeCode.worstPhrasing);
    expect(Number(sp.R3.wall_median.toFixed(1))).toBe(run.pebble.timeMedian);
    expect(Number(sp.R3.wall_p95.toFixed(1))).toBe(run.pebble.timeP95);
    expect(Number(sc.R3.wall_median.toFixed(1))).toBe(run.claudeCode.timeMedian);
    expect(Number(sc.R3.wall_p95.toFixed(1))).toBe(run.claudeCode.timeP95);
  });

  test("cost per task, the cache and Claude Code's own meter", () => {
    expect(Number((a.cost_usd.pebble / run.runsPerProduct).toFixed(3))).toBe(run.pebble.costPerTask);
    expect(Number((a.cost_usd.claude_code / run.runsPerProduct).toFixed(3))).toBe(run.claudeCode.costPerTask);
    expect(asRate(sp.R4.cached_input_share)).toBe(run.pebble.cacheShare);
    expect(asRate(sc.R4.cached_input_share)).toBe(run.claudeCode.cacheShare);
    const reported = Object.values(a.versions as Record<string, { reported_cost_usd?: number }>)
      .map((v) => v.reported_cost_usd ?? 0)
      .reduce((sum, v) => sum + v, 0);
    expect(Number(reported.toFixed(2))).toBe(run.claudeCodeReportedCost);
  });

  test("the builds and the model", () => {
    const versions = Object.values(a.versions as Record<string, Record<string, string>>);
    expect(new Set(versions.map((v) => v.model))).toEqual(new Set([run.modelId]));
    expect(new Set(versions.map((v) => v.effort))).toEqual(new Set([run.effort]));
    expect(new Set(versions.filter((v) => v.pebble).map((v) => v.pebble))).toEqual(new Set([run.pebble.build]));
    expect(new Set(versions.filter((v) => v.claude_code).map((v) => v.claude_code))).toEqual(new Set([run.claudeCode.build]));
  });

  test("the correction's bound: Claude Code with the two missed runs counted", () => {
    const atMost = asRate((sc.passed + run.correction.missedQuestions) / sc.cells);
    expect(atMost).toBe(run.correction.claudeCodeAtMost);
  });
});

describe("the words follow the rules", () => {
  // the 1.0.2 run's words: its section block and its llms.txt lines (those after golden set 2.0's and the "Earlier" line)
  const all = JSON.stringify(benchmarks) + benchmarkLlmsLinesFor(releaseFacts.version).slice(goldenLlmsLines().length + 1).join("\n");

  test("the headline is the one allowed, word for word", () => {
    expect(benchmarks.h2).toBe("Pebble matches Claude Code on the same model, within the margin.");
  });

  test("no comparison words, no withdrawn figures, no unpublished run", () => {
    expect(all).not.toMatch(/\b(beats?|better|faster|outperform\w*|wins?|superior)\b/i);
    expect(all).not.toMatch(/\bCodex\b|gpt-6/i);
    // the clarification comparison is withdrawn (OVERRIDES §18): none of its figures
    expect(all).not.toMatch(/53\.3|33\.3|46\.7 %|\+20\.0/);
    expect(all).not.toMatch(/clarification (lead|result)/i);
  });

  test("numbers print as the doc prints them", () => {
    expect(pct(run.pebble.rate)).toBe("79.3 %");
    expect(signed(run.difference.points)).toBe("−3.3");
    expect(signed(run.difference.interval[1])).toBe("+2.5");
    expect(signed(0)).toBe("0.0");
    expect(money(run.pebble.costPerTask)).toBe("$0.085");
    expect(money(run.claudeCodeReportedCost, 2)).toBe("$11.74");
    expect(benchmarks.lead).toContain("−3.3 points");
    expect(benchmarks.lead).toContain("from −9.2 to +2.5");
  });

  test("Behind lists every family where Pebble trailed, at equal weight, then the false completions", () => {
    const behind = benchmarks.sides.groups.find((g) => g.id === "behind")!;
    expect(behind.rows.map((r) => r.measure)).toEqual([
      "Coding fixes",
      "Coding build and review",
      "Research",
      "Everyday companion",
      "False completions",
    ]);
    for (const row of behind.rows.slice(0, 4)) expect(row.note.startsWith("Paired difference ")).toBe(true);
    const build = behind.rows[1]!;
    expect([build.pebble, build.other, build.note]).toEqual([
      "93.3 % (14 of 15)",
      "100.0 % (15 of 15)",
      "Paired difference −6.7 points (−20.0 to 0.0).",
    ]);
    expect(behind.rows[3]!.note).toBe(build.note);
    expect(behind.rows[4]!.note).toContain("a substantive check failed");
  });

  test("the cost line carries its two limits at its own size; nothing promises a next change", () => {
    expect(benchmarks.cost.line).toContain("Pebble's figure is an upper bound.");
    expect(benchmarks.cost.line).toContain("Claude Code ran on a subscription");
    expect(benchmarks.cost.line).toContain("$11.74");
    expect(JSON.stringify(benchmarks)).not.toMatch(/next change/i);
  });

  test("llms.txt's lines carry the intervals, every trailing family, and the release on offer as not this run's", () => {
    const lines = benchmarkLlmsLinesFor("2.0.0").join("\n");
    // 2.0.0's notes report a later benchmark, so the line says only what this run measured (C-BENCH-3, C-200-22)
    expect(lines).toContain("This run measured Pebble 1.0.2, not 2.0.0, the latest release.");
    expect(lines).not.toMatch(/hasn't been measured/);
    expect(lines).toContain("79.3 %, 95 % interval 68.1 to 88.9");
    expect(lines).toContain("82.2 %, 95 % interval 71.9 to 91.9");
    for (const family of ["coding fixes", "coding build and review", "research", "everyday companion"]) expect(lines).toContain(family);
    expect(benchmarkLlmsLinesFor("1.0.4").join("\n")).not.toContain("This run measured");
  });

  test("the links point at Pebble's main, which carries the correction", () => {
    for (const href of Object.values(benchmarkLinks)) expect(href.startsWith("https://github.com/tohin003/Pebble/")).toBe(true);
    expect(benchmarkLinks.correction).toContain("#corrections-after-publication");
  });

  test("the result speaks for 1.0.2 to 1.0.4, not for the release the page states, and the section says so", () => {
    // measured on 1.0.2; 1.0.3 and 1.0.4 don't change how a task runs (STATUS 20:34). Later releases weren't measured
    // (OVERRIDES §21 to §32), so the method block adds benchmarks.method's notMeasured line for the release on offer.
    expect([...run.coveredVersions]).toEqual(["1.0.2", "1.0.3", "1.0.4"]);
    expect(run.coveredVersions).toContain(run.pebble.build);
    expect(run.coveredVersions).not.toContain(releaseFacts.version);
  });
});

// ---- golden set 2.0 (Pebble 2.0.0): the latest run, public with the "2.0.0 published" post (STATUS 2026-10-31 14:53) ----
describe("golden set 2.0", () => {
  // README.md@v2.0.0:390-424, copied byte for byte from the tag (the file's first line says so)
  const README = readFileSync(path.join(import.meta.dir, "..", "..", "docs", "benchmarks", "golden-set-2.0.README-v2.0.0.md"), "utf8");
  const words = JSON.stringify(golden) + goldenLlmsLines().join("\n");

  test("the vendored lines are the tag's Benchmarks section", () => {
    expect(README.split("\n")[0]).toContain("README.md@v2.0.0:390-424");
    expect(README).toContain("## Benchmarks: measured, not claimed");
    expect(README).toContain("| Against Claude Code (`claude-opus-5-5`) | Pebble | Claude Code |");
    expect(README).toContain("| Against Codex (`gpt-6.1-sol`) | Pebble | Codex |");
  });

  test("every cell is the README table's own, character for character, in its row", () => {
    for (const table of golden.result.tables) {
      expect(README).toContain(`| ${table.caption.replace(`(${table.model})`, `(\`${table.model}\`)`)} | Pebble | ${table.other} |`);
      for (const row of table.rows) expect(README).toContain(`| ${row.measure} | ${row.pebble} | ${row.other} |`);
    }
    expect(golden.result.tables.flatMap((t) => t.rows)).toHaveLength(8);
  });

  test("the paired differences, the gates, the sides and what wasn't run are the README's words", () => {
    expect(README).toContain("+8.6 points (95 % interval +3.1 to +14.9) against Claude Code;");
    expect(README).toContain("+4.7 points (+0.4 to +9.4) against Codex.");
    expect(golden.result.differences).toEqual(["+8.6 points (95 % interval +3.1 to +14.9) against Claude Code.", "+4.7 points (+0.4 to +9.4) against Codex."]);
    expect(README).toContain(golden.result.gates);
    expect(README.replace(/\n  /g, " ")).toContain(golden.sides.trailed.replace("Where Pebble trails,", "**Where Pebble trails**,"));
    expect(README).toContain("Against Claude Code: answers from saved web pages and repeated computations.");
    expect(README).toContain("Against Codex: no single family.");
    expect(golden.sides.led).toContain("answers from saved web pages and repeated computations");
    expect(golden.sides.led).toContain("against Codex, no single family");
    expect(README).toContain("**Not run before 2.0.0:** the plan's sixth gate (no regression on the older corpus 24a) and the 32 held-out probes.");
    expect(golden.limits.items[0]).toBe("Not run before 2.0.0: the plan's sixth gate (no regression on the older corpus 24a) and the held-out probes.");
  });

  test("the framing states the held-out split, 255 runs per product, one model for both, and the plan fixed first", () => {
    const flat = README.replace(/\n/g, " ");
    expect(flat).toContain(golden.lead.split(" Each comparison")[0]!);
    expect(flat).toContain("Each comparison used one model for both products.");
    expect(flat).toContain("The tasks were written before the runs and kept sealed from development");
    expect(flat).toContain("the plan (its gates, graders, prices and budgets) was registered before the first run");
    expect(flat).toContain("Pebble ran as 1.9.29, the build whose source 2.0.0 is, apart from its version number and notes.");
    expect(golden.lead).toContain("held-out split");
    expect(golden.lead).toContain("255 runs per product");
  });

  test("no figure that isn't in the README's Benchmarks section", () => {
    const flat = README.replace(/\n/g, " ");
    // the "Earlier" heading names the 1.0.2 run (README.md@v2.0.0:426, after the vendored lines); everything else counts
    const latest = JSON.stringify({ ...golden, earlier: null }) + goldenLlmsLines().join("\n");
    const figures = latest.match(/[+−-]?\$?\d+(?:\.\d+)?(?:\s?%)?/g) ?? [];
    for (const figure of figures) expect({ figure, inReadme: flat.includes(figure.replace(/^[+−-]/, "")) }).toEqual({ figure, inReadme: true });
  });

  test("no 'beats', 'better', 'faster', 'cheaper' or 'saves', and no speed claim", () => {
    expect(words).not.toMatch(/\b(beats?|better|faster|quicker|cheaper|saves?|savings|outperform\w*|wins?|superior)\b/i);
    expect(words).toContain("Time is reported, not claimed");
    expect(words).toContain("Cost is reported here, not claimed.");
  });

  test("the 1.0.2 run stays below as dated history, and its not-covered line stays true", () => {
    expect(golden.earlier.title).toContain("1.0.2");
    expect(golden.earlier.title).toContain("23 October 2026");
    const lines = benchmarkLlmsLinesFor("2.0.0");
    const at = lines.indexOf(`${golden.earlier.title}:`);
    expect(at).toBe(goldenLlmsLines().length);
    expect(lines.slice(at)).toContain("This run measured Pebble 1.0.2, not 2.0.0, the latest release.");
  });

  test("the release notes link is the tag's", () => {
    expect(benchmarkLinks.releaseNotes200).toBe("https://github.com/tohin003/Pebble/blob/v2.0.0/CHANGELOG.md#200");
  });
});
