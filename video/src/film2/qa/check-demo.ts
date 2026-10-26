// Runs every smoothness check (qa/checks.ts) over the demo reel's timeline. Light work (pure TypeScript, no media):
//   bun video/src/film2/qa/check-demo.ts [--json]
// Exit status 0 when there are no errors.
import { checkAll, formatReport } from "./checks";
import { MOVES, demoQa } from "../demo/timeline";

const report = checkAll(demoQa(), MOVES);
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 1));
else console.log(formatReport(report));
process.exit(report.ok ? 0 : 1);
