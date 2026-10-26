// Prints a set-piece reel's marks for the pixel checks and the sheets: each piece's first frame, every seam (a
// transition at its middle), the cuts (both) and the still holds (the title's waits), as JSON. Light work:
//   bun video/src/film2/setpieces/tools/reel-marks.ts 16:9
// then pass `cuts` to render/sheets.sh and qa/luma-scan.ts (--cuts), and `waits` to luma-scan (--waits).
import { demoPlans } from "../demo/plans";

const a = (process.argv[2] ?? "16:9") as "16:9" | "1:1" | "9:16";
let off = 0;
const starts: number[] = [];
const seams: number[] = [];
const waits: string[] = [];
for (const e of demoPlans(a)) {
  starts.push(off);
  for (const s of e.plan.seams) seams.push(off + s.at + (s.frames > 0 ? Math.round(s.frames / 2) : 0));
  for (const s of e.plan.shots) for (const w of s.waits ?? []) waits.push(`${off + w.from}-${off + w.to}`);
  off += e.plan.duration;
}
console.log(JSON.stringify({ aspect: a, starts, seams, cuts: [...starts.slice(1), ...seams].sort((x, y) => x - y), waits, total: off }));
