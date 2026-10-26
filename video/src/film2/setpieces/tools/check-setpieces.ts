// Runs every check (setpieces/qa.ts checkPlan: the foundation's smoothness checks plus the set pieces' own, the checks
// added after the craft review among them) over the demo's plans, in one aspect or all three, and prints where each
// piece's events landed on its music. Light work:
//   bun video/src/film2/setpieces/tools/check-setpieces.ts [16:9|1:1|9:16] [--verbose] [--summary]
// With all three aspects it also holds each piece's hit to one timeline across them (hitSyncAcross, CR-07).
// --summary prints one line per piece and check instead of every finding. Exit status 0 only when every piece passes.
import { formatReport, type Finding } from "../../qa/checks";
import { REVIEW_CHECKS, checkPlan, hitSyncAcross } from "../qa";
import { demoPlans } from "../demo/plans";
import type { ScenePlan } from "../scene";

const only = process.argv.slice(2).find((a) => /^(16:9|1:1|9:16)$/.test(a)) as "16:9" | "1:1" | "9:16" | undefined;
const verbose = process.argv.includes("--verbose");
const summary = process.argv.includes("--summary");
const aspects = only ? [only] : (["16:9", "1:1", "9:16"] as const);
let ok = true;
const counts: Record<string, number> = {};
for (const a of aspects) {
  for (const e of demoPlans(a)) {
    const r = checkPlan(e.plan, e.grid);
    ok &&= r.ok;
    console.log(`${a.padEnd(5)} ${e.plan.id.padEnd(7)} ${r.ok ? "PASS" : "FAIL"} ${(e.plan.duration / e.plan.fps).toFixed(2)} s · ${e.stretch.label} "${e.stretch.track}" ${e.stretch.bpm} BPM`);
    if (summary) {
      const by = new Map<string, Finding[]>();
      for (const x of r.errors) by.set(x.check, [...(by.get(x.check) ?? []), x]);
      for (const [check, xs] of by) {
        counts[check] = (counts[check] ?? 0) + xs.length;
        console.log(`    ${(REVIEW_CHECKS as readonly string[]).includes(check) ? "new " : "    "}${check.padEnd(16)} ${xs.length} × first at frame ${xs[0]!.frame ?? "-"}`);
      }
    } else if (verbose || !r.ok) console.log(formatReport(r));
    if (verbose) for (const m of e.plan.music) console.log(`    ${m.event}: frame ${m.frame}${m.point !== null ? ` on a ${m.level}` : " (no grid point)"}${m.waited ? `, waited ${m.waited}` : ""}`);
  }
}
if (!only) {
  // one timeline: the Drop's hit in all three aspects
  const byPiece = new Map<string, Record<string, ScenePlan>>();
  for (const a of aspects) for (const e of demoPlans(a)) byPiece.set(e.plan.id, { ...(byPiece.get(e.plan.id) ?? {}), [a]: e.plan });
  for (const [id, plans] of byPiece) {
    const x = hitSyncAcross(plans);
    if (Object.values(x.byAspect).every((v) => v.open === null)) continue;
    console.log(`all   ${id.padEnd(7)} ${x.findings.length ? "FAIL" : "PASS"} the aperture opens on ${Object.entries(x.byAspect).map(([a, v]) => `${a} ${v.open} (hit ${v.hit})`).join(", ")}`);
    for (const f of x.findings) console.log(`  ERROR [${f.check}] ${f.message}`);
    if (x.findings.length) ok = false;
  }
}
if (summary) console.log(`errors by check: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
process.exit(ok ? 0 : 1);
