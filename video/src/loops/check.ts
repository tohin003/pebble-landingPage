// Seam and timing checks for the loops and the teaser, on their data (plans.ts, companion.ts) without rendering.
// Run with bun (not bundled into any composition):   cd video && bun src/loops/check.ts
// It throws (exit 1) on the first list of problems. The rendered checks (seam PSNR, 4×4 sheets) are lane G2b's
// .work/film/loops/tools/loopqa.py.
import { assertCues, blinkStarts } from "../../../shared/pebble";
import { cameraAt, checkCamKeys, type CamPose } from "../motion/camera";
import { cursorPathAt } from "../motion/spec";
import { L1_CURSOR, L1_ENGINE_OFFSET, l1Cues } from "./companion";
import { L1, L3, L4, L6, L7, LOOP_PLANS, T0, type LoopPlan } from "./plans";

const FPS = 30;
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);
const same = (a: CamPose, b: CamPose) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.zoom - b.zoom) < 1e-9;
const visibleAt = (plan: LoopPlan, f: number) => plan.cursorVisible.some(([a, b]) => f >= a && f < b);

for (const plan of LOOP_PLANS as readonly LoopPlan[]) {
  const id = plan.id;
  if (!Number.isInteger(plan.n) || plan.n <= 0) fail(`${id}: n must be a positive integer`);
  for (const aspect of plan.aspects) {
    const keys = plan.camera[aspect];
    if (!keys || keys.length === 0) {
      fail(`${id} ${aspect}: no camera keys`);
      continue;
    }
    for (const p of checkCamKeys(keys, FPS, `${id} ${aspect}`)) fail(p);
    const first = cameraAt(0, keys, FPS, 1600);
    const last = cameraAt(plan.n - 1, keys, FPS, 1600);
    if (!same(first, last)) fail(`${id} ${aspect}: the camera at frame ${plan.n - 1} differs from frame 0`);
    const lastKey = keys[keys.length - 1]!;
    if (keys.length > 1 && lastKey.at > plan.n - 12) fail(`${id} ${aspect}: the return move ends at f${lastKey.at}, < 12 frames before N=${plan.n}`);
  }
  if (visibleAt(plan, 0) || visibleAt(plan, plan.n - 1)) fail(`${id}: the cursor shows at an end of the loop`);
  for (const [a, b] of plan.cursorVisible) if (!(a >= 0 && b <= plan.n && a < b)) fail(`${id}: cursor range [${a}, ${b}) is outside the loop`);
  for (const c of plan.clicks) if (!visibleAt(plan, c)) fail(`${id}: click f${c} happens while the cursor is hidden`);
  for (const [a, b] of plan.dissolves) {
    if (!(a > 0 && b < plan.n && b - a === 12)) fail(`${id}: dissolve [${a}, ${b}) must be 12 frames (0.4 s) inside the loop`);
  }
}

// Source maps never run backwards (FILM_SPEC §7)
const monotone = (name: string, keys: readonly (readonly [number, number])[]) => {
  for (let i = 1; i < keys.length; i++) {
    if (keys[i]![0] < keys[i - 1]![0]) fail(`${name}: frames not sorted at ${i}`);
    if (keys[i]![1] < keys[i - 1]![1]) fail(`${name}: source time runs backwards at ${i}`);
  }
};
monotone("L1 src", L1.src);
monotone("L4 src", L4.src);
monotone("L6 srcA", L6.srcA);
monotone("L6 srcB", L6.srcB);
monotone("T0 src", T0.src);

// Clicks happen where the cursor arrived (after its dwell), never mid-flight
const dwellCheck = (name: string, keys: Parameters<typeof cursorPathAt>[1], clicks: readonly number[]) => {
  for (const c of clicks) {
    const p = cursorPathAt(c, keys, FPS);
    const q = cursorPathAt(c - 4, keys, FPS);
    if (p.moving || Math.hypot(p.x - q.x, p.y - q.y) > 0.5) fail(`${name}: the pointer is still moving at the click f${c}`);
  }
};
dwellCheck("L1", L1_CURSOR, L1.plan.clicks);
dwellCheck("L3", L3.cursor, L3.plan.clicks);
dwellCheck("L4", L4.cursor, L4.plan.clicks);
dwellCheck("L6", L6.cursor, L6.plan.clicks);
dwellCheck("L7", L7.cursor, L7.plan.clicks);
dwellCheck("T0", T0.cursor, T0.plan.clicks);

// L1: the pebble's cues are Pebble poses, sorted; no blink within 0.3 s of the seam; eyes open on frame 0
const { cues, hoverAt, poses } = l1Cues(FPS);
try {
  assertCues(cues, "L1 cues");
} catch (e) {
  fail(String(e));
}
const t0 = L1_ENGINE_OFFSET / FPS;
const tN = (L1_ENGINE_OFFSET + L1.plan.n) / FPS;
for (const b of blinkStarts(t0 - 0.6, tN + 0.6)) {
  // a blink (0.18 s) that shows in the first or the last 0.3 s of the loop would be cut by the seam
  const visibleSpan = [Math.max(b, t0), Math.min(b + 0.18, tN)] as const;
  if (visibleSpan[0] >= visibleSpan[1]) continue;
  if (visibleSpan[0] < t0 + 0.3 || visibleSpan[1] > tN - 0.3) fail(`L1: a blink at ${b.toFixed(2)} s shows within 0.3 s of the seam`);
}
const lastPose = poses[poses.length - 1]!;
if (lastPose[1] !== "idle" || lastPose[0] > L1.plan.n - 20) fail(`L1: the pebble must be idle and settled before the seam (last pose ${lastPose[1]} at f${lastPose[0]})`);
const lastLook = [...cues].reverse().find((c) => c.look !== undefined);
const firstLooks = cues.filter((c) => c.look !== undefined && c.at <= t0);
const look0 = firstLooks[firstLooks.length - 1];
if (!lastLook || !look0 || JSON.stringify(lastLook.look) !== JSON.stringify(look0.look)) fail("L1: the pinned look at the end differs from frame 0's");
if (lastLook && lastLook.at > tN - 0.5) fail("L1: the last look change is less than 0.5 s before the seam");

if (problems.length) throw new Error(`Loop checks failed:\n  ${problems.join("\n  ")}`);
console.log(
  `loops ok: ${LOOP_PLANS.map((p) => `${p.id} ${p.n}`).join(", ")}; L1 hover f${hoverAt}, ${cues.length} cues, poses ${poses.map(([f, p]) => `${p}@${f}`).join(" ")}`,
);
