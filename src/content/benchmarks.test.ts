// The benchmark's numbers and words (src/content/benchmarks.ts), checked against their source: the analysis that Pebble
// published at commit 26d7b19 (vendored, byte for byte, at docs/benchmarks/claude-opus-5-5.analysis.json) and the rules
// of OVERRIDES §11, §16 and §18. Every number the section prints is derived here from the analysis, so a typo, a
// rounding slip or a number from the withdrawn clarification comparison fails the site's tests.
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { benchmarkLinks, benchmarkLlmsLines, benchmarks, money, pct, run, signed } from "./benchmarks";
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

  test("coding fixes and research, with counts and paired intervals", () => {
    for (const [key, page, diff] of [
      ["coding_fix", "codingFix", run.codingFixDifference],
      ["research", "research", run.researchDifference],
    ] as const) {
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
  const all = JSON.stringify(benchmarks) + benchmarkLlmsLines.join("\n");

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

  test("the links point at Pebble's main, which carries the correction", () => {
    for (const href of Object.values(benchmarkLinks)) expect(href.startsWith("https://github.com/tohin003/Pebble/")).toBe(true);
    expect(benchmarkLinks.correction).toContain("#corrections-after-publication");
  });

  test("the result speaks for the release the page states", () => {
    expect(run.coveredVersions).toContain(releaseFacts.version);
    expect(run.coveredVersions).toContain(run.pebble.build);
  });
});
