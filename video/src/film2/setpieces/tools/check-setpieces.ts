// Runs every check (setpieces/qa.ts checkPlan: the foundation's smoothness checks plus the set pieces' own) over the
// demo's plans, in one aspect or all three, and prints where each piece's events landed on its music. Light work:
//   bun video/src/film2/setpieces/tools/check-setpieces.ts [16:9|1:1|9:16] [--verbose]
// Exit status 0 when every piece passes.
import { formatReport } from "../../qa/checks";
import { checkPlan } from "../qa";
import { demoPlans } from "../demo/plans";

const only = process.argv.slice(2).find((a) => /^(16:9|1:1|9:16)$/.test(a)) as "16:9" | "1:1" | "9:16" | undefined;
const verbose = process.argv.includes("--verbose");
let ok = true;
for (const a of only ? [only] : (["16:9", "1:1", "9:16"] as const)) {
  for (const e of demoPlans(a)) {
    const r = checkPlan(e.plan, e.grid);
    ok &&= r.ok;
    console.log(`${a.padEnd(5)} ${e.plan.id.padEnd(7)} ${r.ok ? "PASS" : "FAIL"} ${(e.plan.duration / e.plan.fps).toFixed(2)} s · ${e.stretch.label} "${e.stretch.track}" ${e.stretch.bpm} BPM`);
    if (verbose || !r.ok) console.log(formatReport(r));
    if (verbose) for (const m of e.plan.music) console.log(`    ${m.event}: frame ${m.frame}${m.point !== null ? ` on a ${m.level}` : " (no grid point)"}${m.waited ? `, waited ${m.waited}` : ""}`);
  }
}
process.exit(ok ? 0 : 1);
