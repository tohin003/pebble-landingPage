// src/content/benchmarks.ts
//
// The Benchmarks section, "Measured, not claimed" (PHILOSOPHY "Evidence, presented"; OVERRIDES §11, §16, §18): Pebble
// against Claude Code CLI on the same model. It renders only while releaseFacts.benchmarksPublic is true, and llms.txt
// carries its lines on the same condition.
//
// Sources: the public docs/PEBBLE_V1_BENCHMARKS.md §5b and docs/benchmarks/claude-opus-5-5/analysis.json at Pebble
// commit 26d7b19, which carries the 23 October correction (OVERRIDES §18: cite that commit, never the 13:21 preview),
// and the release session's posts of 20:34 ("1.0.4 published") and 21:29 (the correction). The CLAIMS rows are
// C-BENCH-1 to C-BENCH-18 in docs/CLAIMS.md ("Benchmarks"). A copy of the analysis is vendored at
// docs/benchmarks/claude-opus-5-5.analysis.json, and benchmarks.test.ts derives every number in `run` from it.
//
// Rules, all checked: the H2 is the one headline allowed, word for word; never "beats", "better" or "faster"; no
// clarification figures (the correction withdrew them); every rate with its count; the losses at the same weight and in
// the same type as the lead. Numbers are typed once, in `run`; every sentence that prints one is built from it, and
// renders its numbers as data (<DataText>: Geist Mono, tabular figures).

/** One product's measured results (rates in per cent, to one decimal, as the doc prints them). */
export type ProductRun = Readonly<{
  /** the product's name in the section's sentences */
  name: string;
  /** the build that ran */
  build: string;
  passed: number;
  rate: number;
  /** 95 % task-cluster bootstrap interval of the rate */
  interval: readonly [number, number];
  falseCompletions: number;
  /** "Multi-turn success": the runs with follow-up turns (not the "Multi-turn" family) */
  multiTurn: Readonly<{ passed: number; rate: number }>;
  /** the four compared families where Pebble trailed (§5b's family table; OVERRIDES §28 CL-11), 15 runs each */
  codingFix: Readonly<{ passed: number; rate: number }>;
  codingBuild: Readonly<{ passed: number; rate: number }>;
  research: Readonly<{ passed: number; rate: number }>;
  companion: Readonly<{ passed: number; rate: number }>;
  /** phrasing: the canonical wording and the weakest of the three */
  canonical: number;
  worstPhrasing: number;
  /** wall time per run, seconds: median and 95th percentile */
  timeMedian: number;
  timeP95: number;
  /** cost per task at the plan's prices, US dollars */
  costPerTask: number;
  /** share of input read from the prompt cache, per cent */
  cacheShare: number;
}>;

/** Every number the section prints, typed once (analysis.json and PEBBLE_V1_BENCHMARKS.md §5b at 26d7b19). */
export const run = {
  model: "Claude Opus 5.5",
  modelId: "claude-opus-5-5",
  effort: "medium",
  /** the run's date (PEBBLE_V1_BENCHMARKS.md line 3: "§5b, 2026-10-23") */
  date: "23 October 2026",
  tasks: 45,
  families: 9,
  repetitions: 3,
  runsPerProduct: 135,
  plannedRuns: 270,
  notRun: 0,
  /** the paired difference covers the eight compared families; delegation is reported, not compared */
  pairedRuns: 120,
  familyRuns: 15,
  /** the follow-up-turn runs behind "Multi-turn success", per product */
  multiTurnRuns: 36,
  /** the releases this result speaks for: 1.0.2 was measured; 1.0.3 (never published alone) and 1.0.4 don't change how
   *  a task runs (STATUS 20:34) */
  coveredVersions: ["1.0.2", "1.0.3", "1.0.4"],
  pebble: {
    name: "Pebble",
    build: "1.0.2",
    passed: 107,
    rate: 79.3,
    interval: [68.1, 88.9],
    falseCompletions: 21,
    multiTurn: { passed: 32, rate: 88.9 },
    codingFix: { passed: 12, rate: 80.0 },
    codingBuild: { passed: 14, rate: 93.3 },
    research: { passed: 0, rate: 0.0 },
    companion: { passed: 14, rate: 93.3 },
    canonical: 82.2,
    worstPhrasing: 75.6,
    timeMedian: 10.9,
    timeP95: 39.9,
    costPerTask: 0.085,
    cacheShare: 1.4,
  },
  claudeCode: {
    name: "Claude Code",
    build: "2.1.309",
    passed: 111,
    rate: 82.2,
    interval: [71.9, 91.9],
    falseCompletions: 17,
    multiTurn: { passed: 29, rate: 80.6 },
    codingFix: { passed: 14, rate: 93.3 },
    codingBuild: { passed: 15, rate: 100.0 },
    research: { passed: 3, rate: 20.0 },
    companion: { passed: 15, rate: 100.0 },
    canonical: 80.0,
    worstPhrasing: 80.0,
    timeMedian: 9.7,
    timeP95: 17.6,
    costPerTask: 0.053,
    cacheShare: 87.8,
  },
  /** Pebble minus Claude Code, paired run by run, in points, with its 95 % interval */
  difference: { points: -3.3, interval: [-9.2, 2.5] },
  codingFixDifference: { points: -13.3, interval: [-26.7, 0.0] },
  codingBuildDifference: { points: -6.7, interval: [-20.0, 0.0] },
  researchDifference: { points: -20.0, interval: [-46.7, 0.0] },
  companionDifference: { points: -6.7, interval: [-20.0, 0.0] },
  /** Claude Code's own meter, the API-equivalent cost of its whole run (it ran on a subscription) */
  claudeCodeReportedCost: 11.74,
  /** the correction of 23 October (Pebble commit 26d7b19): Claude Code's overall result with the two runs counted */
  correction: { date: "23 October 2026", claudeCodeAtMost: 83.7, missedQuestions: 2 },
} as const satisfies Readonly<Record<string, unknown>> & { pebble: ProductRun; claudeCode: ProductRun };

// ---- number formats: one decimal for rates and points, a true minus sign, three decimals for dollars ------------------

const MINUS = "−";

/** 79.3 → "79.3 %" */
export function pct(n: number): string {
  return `${n.toFixed(1)} %`;
}

/** −3.3 → "−3.3", 2.5 → "+2.5", 0 → "0.0": a difference, always signed except at zero */
export function signed(n: number): string {
  if (n === 0) return "0.0";
  return `${n < 0 ? MINUS : "+"}${Math.abs(n).toFixed(1)}`;
}

/** 0.085 → "$0.085"; 11.74 → "$11.74" */
export function money(n: number, decimals = 3): string {
  return `$${n.toFixed(decimals)}`;
}

/** 107, 135 → "107 of 135" */
export function of(passed: number, total: number): string {
  return `${passed} of ${total}`;
}

/** 10.9 → "10.9 s" */
export function seconds(n: number): string {
  return `${n.toFixed(1)} s`;
}

const P = run.pebble;
const C = run.claudeCode;
const D = run.difference;

/** "Paired difference −6.7 points (−20.0 to 0.0)" */
function paired(d: Readonly<{ points: number; interval: readonly [number, number] }>): string {
  return `Paired difference ${signed(d.points)} points (${signed(d.interval[0])} to ${signed(d.interval[1])})`;
}

/** "79.3 % (95 % interval 68.1 to 88.9)": a rate with its interval, as llms.txt carries it (PHILOSOPHY principle 6) */
function rateWithInterval(p: ProductRun): string {
  return `${pct(p.rate)}, 95 % interval ${p.interval[0].toFixed(1)} to ${p.interval[1].toFixed(1)}`;
}

// ---- links: on Pebble's `main`, which carries the correction (OVERRIDES §18). Checked HTTP 200 on 2026-10-24 ------

const REPO = "https://github.com/tohin003/Pebble";

export const benchmarkLinks = {
  results: `${REPO}/blob/main/docs/PEBBLE_V1_BENCHMARKS.md#5b-pebble-against-claude-code-cli-24a-claude-opus-55`,
  correction: `${REPO}/blob/main/docs/PEBBLE_V1_BENCHMARKS.md#corrections-after-publication`,
  analysis: `${REPO}/blob/main/docs/benchmarks/claude-opus-5-5/analysis.json`,
  charts: `${REPO}/tree/main/docs/benchmarks/claude-opus-5-5`,
  runner: `${REPO}/tree/main/benchmarks`,
} as const;

// ---- the section's words ---------------------------------------------------------------------------------------------

export const benchmarks = {
  /** The one headline allowed, word for word (OVERRIDES §11, §16, §18; STATUS 20:34). [C-BENCH-1] */
  h2: "Pebble matches Claude Code on the same model, within the margin.",
  /** [C-BENCH-2] */
  lead: `Pebble ${P.build} and Claude Code CLI ${C.build} ran the same ${run.tasks} tasks, three times each, on ${run.model}. Paired run by run, the difference is ${signed(D.points)} points, and its 95 % interval, from ${signed(D.interval[0])} to ${signed(D.interval[1])}, includes zero: no difference is shown either way.`,
  /** the head's one link */
  resultsLink: "Read the full results",

  /** 1. The method first (PHILOSOPHY "Evidence, presented"). [C-BENCH-3] */
  method: {
    title: "How it was measured",
    items: [
      {
        term: "Model",
        text: `${run.model} at ${run.effort} effort, for both. Claude Code's sub-agents used the same model.`,
      },
      {
        term: "Builds",
        text: `Pebble ${P.build}, its signed release candidate, and Claude Code CLI ${C.build}, one pinned copy for the whole run. Measured on Pebble ${P.build}; Pebble 1.0.4 doesn't change how a task runs.`,
      },
      {
        term: "Tasks",
        text: `${run.tasks} tasks in nine families of five, such as coding fixes, source search, research and documents. Each ran three times, once in each of three phrasings: ${run.runsPerProduct} runs per product.`,
      },
      {
        term: "Conditions",
        text: "The same files, prompts, follow-up turns and 15-minute limit, in a fresh folder for every run. Web tools were off for both; research tasks read saved pages given as files.",
      },
      {
        term: "Autonomy",
        text: "Pebble in Auto in project, approving only each task's in-scope steps. Claude Code with its permission prompts off, inside a macOS sandbox profile that refuses writes outside the run's folder.",
      },
      {
        term: "Grading",
        text: "Automated graders read the replies and the files, never the product's name. A run succeeds only if every check passes.",
      },
      {
        term: "Fixed in advance",
        text: `The plan, its seed and its claim rule were registered before the first run. Every planned run counts once, and none was skipped. A claim needs the whole interval above zero.`,
      },
    ],
    /**
     * Shown only when the release the page offers (src/lib/release.ts) is none of `run.coveredVersions`, so a later
     * release is never taken as this run's result. Until 1.5.0 it said "Pebble {version}, the latest release, hasn't been
     * measured yet."; 2.0.0's own notes report a later benchmark, so the line now says only what is true of this run
     * either way, and makes no claim about the later one (.work/page-2.0/benchmarks-2.0.0.md). [C-BENCH-3] [C-200-22]
     */
    notMeasured: (version: string) => `This run measured Pebble ${run.pebble.build}, not ${version}, the latest release.`,
  },

  /** 2. The overall result, with its interval and counts. [C-BENCH-4] [C-BENCH-5] */
  result: {
    title: "The overall result",
    difference: {
      title: "Paired difference, Pebble minus Claude Code",
      unit: "points",
      value: `${signed(D.points)} points`,
      /** the axis ends say which way a mark leans */
      left: "Claude Code ahead",
      right: "Pebble ahead",
    },
    success: {
      title: `Success, of ${run.runsPerProduct} runs each`,
      interval: (lo: number, hi: number) => `95 % interval ${lo.toFixed(1)} to ${hi.toFixed(1)}`,
    },
    /** The figure's words, for every reader: the chart itself is drawn for the eye only. */
    caption: `Pebble passed ${of(P.passed, run.runsPerProduct)} runs (${pct(P.rate)}, 95 % interval ${P.interval[0].toFixed(1)} to ${P.interval[1].toFixed(1)}) and Claude Code ${of(C.passed, run.runsPerProduct)} (${pct(C.rate)}, ${C.interval[0].toFixed(1)} to ${C.interval[1].toFixed(1)}). The difference pairs each run with its twin over the ${run.pairedRuns} runs of the eight compared families; the five delegation tasks are reported but not compared, so it isn't simply ${P.rate.toFixed(1)} minus ${C.rate.toFixed(1)}.`,
    intervalNote: "Lines show 95 % intervals, from a bootstrap over tasks.",
  },

  /** The correction, beside the results (OVERRIDES §18; STATUS 21:29; PEBBLE_V1_BENCHMARKS.md, Corrections). [C-BENCH-6] */
  correction: {
    title: `Correction, ${run.correction.date}.`,
    body: `The harness missed two clarifying questions that Claude Code asked, and both runs were scored as failures. The clarification comparison is withdrawn. With those two runs counted for Claude Code, its overall result is at most ${pct(run.correction.claudeCodeAtMost)}; the verdict is unchanged.`,
    link: "Read the correction",
  },

  /**
   * 3. Where Pebble led and where it trailed, at equal weight. "Behind" lists every compared family where Pebble
   * trailed (OVERRIDES §28 CL-11; critic C01), each with its rates and counts and its paired difference, then the false
   * completions. [C-BENCH-7..13] [C-BENCH-19] [C-BENCH-20]
   */
  sides: {
    title: "Where Pebble was ahead, and where it was behind",
    columns: { measure: "Measure", pebble: P.name, other: C.name },
    groups: [
      {
        id: "ahead",
        title: "Ahead",
        rows: [
          {
            measure: "Multi-turn success",
            note: `The ${run.multiTurnRuns} runs per product with follow-up turns. No interval is published for this measure.`,
            pebble: `${pct(P.multiTurn.rate)} (${of(P.multiTurn.passed, run.multiTurnRuns)})`,
            other: `${pct(C.multiTurn.rate)} (${of(C.multiTurn.passed, run.multiTurnRuns)})`,
          },
        ],
      },
      {
        id: "behind",
        title: "Behind",
        rows: [
          {
            measure: "Coding fixes",
            note: `${paired(run.codingFixDifference)}.`,
            pebble: `${pct(P.codingFix.rate)} (${of(P.codingFix.passed, run.familyRuns)})`,
            other: `${pct(C.codingFix.rate)} (${of(C.codingFix.passed, run.familyRuns)})`,
          },
          {
            measure: "Coding build and review",
            note: `${paired(run.codingBuildDifference)}.`,
            pebble: `${pct(P.codingBuild.rate)} (${of(P.codingBuild.passed, run.familyRuns)})`,
            other: `${pct(C.codingBuild.rate)} (${of(C.codingBuild.passed, run.familyRuns)})`,
          },
          {
            measure: "Research",
            note: `${paired(run.researchDifference)}, with a strict citation grader.`,
            pebble: `${pct(P.research.rate)} (${of(P.research.passed, run.familyRuns)})`,
            other: `${pct(C.research.rate)} (${of(C.research.passed, run.familyRuns)})`,
          },
          {
            measure: "Everyday companion",
            note: `${paired(run.companionDifference)}.`,
            pebble: `${pct(P.companion.rate)} (${of(P.companion.passed, run.familyRuns)})`,
            other: `${pct(C.companion.rate)} (${of(C.companion.passed, run.familyRuns)})`,
          },
          {
            measure: "False completions",
            note: "Runs that presented a finished result while a substantive check failed.", // CL-10: BENCH:54-56
            pebble: of(P.falseCompletions, run.runsPerProduct),
            other: of(C.falseCompletions, run.runsPerProduct),
          },
        ],
      },
      {
        id: "also",
        title: "Also measured",
        rows: [
          {
            measure: "Phrasing",
            note: "The main wording, then the weakest of the three phrasings.",
            pebble: `${pct(P.canonical)} and ${pct(P.worstPhrasing)}`,
            other: `${pct(C.canonical)} and ${pct(C.worstPhrasing)}`,
          },
          {
            measure: "Time per run",
            note: "The median, then the 95th percentile.",
            pebble: `${seconds(P.timeMedian)} and ${seconds(P.timeP95)}`,
            other: `${seconds(C.timeMedian)} and ${seconds(C.timeP95)}`,
          },
        ],
      },
    ],
    notes: [
      `Each family is ${run.familyRuns} runs, so its interval is wide, and every family's interval reaches zero.`,
      "Research is graded strictly. The grader, fixed before the run, fails a reply that also cites the out-of-date page it set aside, and most misses on both sides were right answers that did. Pebble cites more of what it checked, a habit worth changing.",
      `One of Claude Code's ${C.falseCompletions} false completions asked the right question, then ended with “FINAL: done”; the rule fixed before the run counts that line as a claim that the task was finished.`,
      "Time is a secondary measure: both products ran side by side on one Mac.",
    ],
  },

  /**
   * 4. The cost, printed plainly, its two limits in the same sentence run and at the same size (PHILOSOPHY principle 3;
   * critic C12); the method notes under it stay small. The cache sentence is what was measured on 1.0.2, in the past
   * tense; nothing about later releases' caching (OVERRIDES §25, §28 CL-2). [C-BENCH-14] [C-BENCH-15]
   */
  cost: {
    title: "What it cost",
    line: `Per task, at list prices: Pebble ${money(P.costPerTask)}, Claude Code ${money(C.costPerTask)}. Pebble's figure is an upper bound. Claude Code ran on a subscription; its own API-equivalent figure for the whole run is ${money(run.claudeCodeReportedCost, 2)}.`,
    caveats: [
      `One formula prices both products' tokens at Anthropic's list prices for ${run.model}, read on ${run.date}.`,
      `Pebble sent fewer tokens per task, but only ${pct(P.cacheShare)} of its input came from the prompt cache, against ${pct(C.cacheShare)} for Claude Code: the measured build rebuilt its task notes at the start of the conversation on each step.`,
    ],
    reported: "Cost is reported here, not claimed.",
  },

  /** 5. What this does not prove. [C-BENCH-16] */
  limits: {
    title: "What this doesn't prove",
    items: [
      `Anything beyond these ${run.tasks} tasks. They are the project's own tasks and graders, published for anyone to read; this is not an independent benchmark.`,
      "Anything about other products or models, or about live web search.",
      "The quality of either interface.",
      "Anything about security, or about what AgentGuard adds on its own: it ran in every Pebble run, as it does in the app, and this comparison doesn't isolate it. That test is still to come.",
      "Anything about cost or speed: both are reported, not claimed.",
    ],
  },

  /** 6. The raw data, and how to rerun it. [C-BENCH-17] [C-BENCH-18] */
  data: {
    title: "The data",
    stamp: `Run on ${run.date}, on Pebble ${P.build}.`,
    links: [
      { label: "The full results: the setup, every family, the cost and the harness fixes", href: benchmarkLinks.results },
      { label: "The analysis behind every number: names, counts and timings, no replies or files", href: benchmarkLinks.analysis },
      { label: "The tasks, the graders and the runner, to run it again", href: benchmarkLinks.runner },
      { label: "The charts", href: benchmarkLinks.charts },
    ],
  },
} as const;

/**
 * llms.txt's benchmark lines (seo.ts), from the same sentences and numbers as the section, so search engines and
 * assistants quote what the page says (S2 §6.6): every rate with its count and its interval, every family where Pebble
 * trailed, and the "hasn't been measured yet" line for the release on offer. Only while releaseFacts.benchmarksPublic is
 * true. [C-BENCH-*]
 */
export function benchmarkLlmsLinesFor(offered: string): readonly string[] {
  return [
    benchmarks.h2,
    benchmarks.lead,
    // the release the page offers, unless the result covers it (claims audit CL-9: never tie the headline to it)
    ...(run.coveredVersions.some((v) => v === offered) ? [] : [benchmarks.method.notMeasured(offered)]),
    `Pebble passed ${of(P.passed, run.runsPerProduct)} runs (${rateWithInterval(P)}) and Claude Code ${of(C.passed, run.runsPerProduct)} (${rateWithInterval(C)}).`,
    `Pebble was ahead on multi-turn success (${of(P.multiTurn.passed, run.multiTurnRuns)} runs with follow-up turns, against ${of(C.multiTurn.passed, run.multiTurnRuns)}; no interval is published for this measure). It was behind on coding fixes (${of(P.codingFix.passed, run.familyRuns)}, against ${of(C.codingFix.passed, run.familyRuns)}; ${paired(run.codingFixDifference).toLowerCase()}), coding build and review (${of(P.codingBuild.passed, run.familyRuns)}, against ${of(C.codingBuild.passed, run.familyRuns)}; ${paired(run.codingBuildDifference).toLowerCase()}), research (${of(P.research.passed, run.familyRuns)}, against ${of(C.research.passed, run.familyRuns)}, with a strict citation grader; ${paired(run.researchDifference).toLowerCase()}) and everyday companion (${of(P.companion.passed, run.familyRuns)}, against ${of(C.companion.passed, run.familyRuns)}; ${paired(run.companionDifference).toLowerCase()}). Every family's interval reaches zero. False completions: ${P.falseCompletions} for Pebble and ${C.falseCompletions} for Claude Code, of ${run.runsPerProduct} runs each.`,
    `Cost per task at list prices: ${money(P.costPerTask)} for Pebble, an upper bound, and ${money(C.costPerTask)} for Claude Code, which ran on a subscription. Cost and time are reported, not claimed.`,
    `${benchmarks.correction.title} ${benchmarks.correction.body}`,
  ];
}
