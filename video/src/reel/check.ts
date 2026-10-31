// The style test's plan check (light: no browser, no render): every source frame a shot shows exists on disk and lies
// inside its crop's allowed window (the privacy and honesty windows of takes.ts), every cut and hit sits on a beat of
// the map within a frame, and the scenes cover the test end to end with no gap.
//   cd video && bun src/reel/check.ts [path/to/beatmap.json]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBeatMap } from "./beats";
import { STYLE_TEST_MAP } from "./maps/current";
import { buildPlan } from "./plan";
import { CROPS, framePath, hasFrame, type CropId } from "./takes";

const arg = process.argv[2];
const map = arg ? normalizeBeatMap(JSON.parse(readFileSync(arg, "utf8")), arg) : STYLE_TEST_MAP;
const plan = buildPlan(map);
const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const problems: string[] = [];

const useFrames = (label: string, crop: CropId, frames: number[]) => {
  const c = CROPS[crop];
  for (const n of frames) {
    if (n < c.allowed[0] || n > c.allowed[1]) problems.push(`${label}: ${crop} shows source ${n}, outside its allowed ${c.allowed[0]}–${c.allowed[1]}`);
    if (!hasFrame(c.take, n)) problems.push(`${label}: ${c.take} has no frame ${n} in its runs`);
    else if (!existsSync(join(pub, framePath(c.take, n)))) problems.push(`${label}: missing file ${framePath(c.take, n)}`);
  }
};

// the hook
const hookFrames: number[] = [];
for (let f = plan.hook.from; f < plan.hook.to; f++) hookFrames.push(Math.round(plan.hook.src.at(f)));
useFrames("hook", "askHook", hookFrames);
// the montage
for (const s of plan.montage) {
  const fr: number[] = [];
  for (let f = 0; f < s.to - s.from; f++) fr.push(Math.round(s.src.at(f)));
  useFrames(s.id, s.crop, fr);
}
// the merge's flights show one frame of each crop
if (plan.merge) for (const crop of ["calculator", "calendar", "finder", "keepCard", "reply", "spaces"] as CropId[]) {
  const c = CROPS[crop];
  useFrames("merge", crop, [c.allowed[0] + Math.round((c.allowed[1] - c.allowed[0]) * 0.6)]);
}

// cuts on beats
for (const c of plan.cuts) {
  const off = Math.min(...map.beats.map((b) => Math.abs(b - c)));
  if (off > 1.01) problems.push(`cut or hit at ${c} is ${off.toFixed(1)} frames off the nearest beat`);
}
// coverage
const spans: [string, number, number][] = [
  ["hook", plan.hook.from, plan.hook.to],
  ["breath", plan.breath.from, plan.breath.to],
  ["reveal", plan.reveal.from, plan.reveal.to],
  ...plan.montage.map((s) => [s.id, s.from, s.to] as [string, number, number]),
  ...(plan.merge ? [["merge", plan.merge.from, plan.merge.to] as [string, number, number]] : []),
];
for (let i = 1; i < spans.length; i++) if (spans[i][1] !== spans[i - 1][2]) problems.push(`gap or overlap between ${spans[i - 1][0]} (to ${spans[i - 1][2]}) and ${spans[i][0]} (from ${spans[i][1]})`);
if (spans[spans.length - 1][2] !== plan.length) problems.push(`the last scene ends on ${spans[spans.length - 1][2]}, the test on ${plan.length}`);

console.log(`map: ${map.name} (${map.source}), ${map.bpm.toFixed(2)} BPM, beat ${plan.B.toFixed(2)} f, drop ${plan.D} (${(plan.D / 60).toFixed(3)} s), ${plan.length} frames`);
for (const [n, a, b] of spans) console.log(`  ${String(a).padStart(4)}–${String(b).padEnd(4)} ${(a / 60).toFixed(2).padStart(6)} s  ${n}`);
console.log(`  hook: send on ${plan.hook.send}, dive from ${plan.hook.zoomFrom}; source ${hookFrames[0]}→${hookFrames[hookFrames.length - 1]}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ${[...new Set(problems)].slice(0, 40).join("\n  ")}`);
  process.exit(1);
}
console.log("\nok: every source frame exists and is allowed; every cut is on a beat; no gaps");
