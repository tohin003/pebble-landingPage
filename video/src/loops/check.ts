// Seam, timing, frame-contract and reading checks for the loops and the teaser, on their data (plans.ts, companion.ts)
// without rendering. Run with bun (not bundled into any composition):   cd video && bun src/loops/check.ts
// It throws (exit 1) on the first list of problems. The rendered checks (seam PSNR, sheets, 360 px previews) are lane
// v2-loops' .work/film/loops-v2/tools (HANDOFF-v2-loops.md).
//
// The frame contract (kit.tsx, DESIGN-LEXINGTON §3.8): every card sits wholly inside its frame with at least MARGIN of
// riverbed on each side; the camera never shows past the capture inside a card; the pointer enters and leaves over the
// riverbed, never appearing on a card; every framing's key text renders at READ_FLOOR page px or more at its slot.
import { assertCues, blinkStarts } from "../../../shared/pebble";
import { cameraAt, checkCamKeys, type CamKey, type CamPose, type Rect } from "../motion/camera";
import { cursorPathAt, type CursorKey } from "../motion/spec";
import { L1_CURSOR, L1_ENGINE_OFFSET, l1Cues } from "./companion";
import { FRAME, L1, L2, L3, L4, L6, L7, L8, LOOP_PLANS, MARGIN, READ_FLOOR, T0, pagePx, type LoopAspect, type LoopPlan, type StagePlan } from "./plans";

const FPS = 30;
const problems: string[] = [];
const notes: string[] = [];
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
    const first = cameraAt(0, keys, FPS, FRAME[aspect].w);
    const last = cameraAt(plan.n - 1, keys, FPS, FRAME[aspect].w);
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

  // the frame contract: every card wholly inside its frame, with its margins, on its aspect
  for (const aspect of Object.keys(plan.stages) as LoopAspect[]) {
    if (!plan.aspects.includes(aspect)) fail(`${id}: a card for ${aspect}, which is not one of its aspects`);
    for (const s of plan.stages[aspect] ?? []) {
      const F = FRAME[aspect];
      const M = MARGIN[aspect];
      const r = s.rect;
      if (s.aspect !== aspect) fail(`${id} ${aspect}: a card planned for ${s.aspect}`);
      if (r.x < M.x || r.y < M.y || F.w - (r.x + r.w) < M.x || F.h - (r.y + r.h) < M.y) {
        fail(`${id} ${aspect}: card ${JSON.stringify(r)} leaves less than ${M.x} × ${M.y} px of riverbed (frame ${F.w} × ${F.h})`);
      }
    }
  }

  // the reading floor
  for (const r of plan.reads) {
    const px = pagePx(r);
    const floor = READ_FLOOR[r.aspect];
    if (px + 1e-9 < floor) {
      if (r.waived) notes.push(`${id} ${r.aspect}: ${r.what} at ${px.toFixed(1)} px (floor ${floor}), waived: ${r.waived}`);
      else fail(`${id} ${r.aspect}: ${r.what} renders at ${px.toFixed(1)} page px, under the ${floor} px floor`);
    }
  }
}

// L6's 4:5 cut has its own dissolves (into the drawer right after the click): the same rules
for (const [a, b] of L6.tallDissolves) {
  if (!(a > L6.plan.clicks[0]! && b < L6.plan.n && b - a === 12)) fail(`L6 tall: dissolve [${a}, ${b}) must be 12 frames, after the click, inside the loop`);
}

// The camera inside a card never shows past the capture (no empty margin inside the card).
const CAPTURE = { live: { w: 1160, h: 800 }, settings: { w: 1160, h: 800 }, dashboard: { w: 1440, h: 900 }, quiz: { w: 1160, h: 800 } } as const;
const viewOf = (pose: CamPose, stage: Rect): Rect => ({
  x: pose.x - stage.w / (2 * pose.zoom),
  y: pose.y - stage.h / (2 * pose.zoom),
  w: stage.w / pose.zoom,
  h: stage.h / pose.zoom,
});
const inside = (name: string, view: Rect, cap: { w: number; h: number }) => {
  const e = 0.01;
  if (view.x < -e || view.y < -e || view.x + view.w > cap.w + e || view.y + view.h > cap.h + e) {
    fail(`${name}: the card shows past the capture (view ${[view.x, view.y, view.x + view.w, view.y + view.h].map((v) => v.toFixed(1)).join(", ")} of ${cap.w} × ${cap.h})`);
  }
};
const everyPose = (keys: readonly CamKey[], n: number, w: number): CamPose[] => Array.from({ length: n }, (_, f) => cameraAt(f, keys, FPS, w));
for (const [name, plan, stage, cap] of [
  ["L2", L2.plan, L2.stage.wide, CAPTURE.settings],
  ["L7", L7.plan, L7.stage.wide, CAPTURE.settings],
] as const) {
  for (const pose of everyPose(plan.camera.wide, plan.n, stage.rect.w)) inside(name, viewOf(pose, stage.rect), cap);
}
for (const aspect of ["square", "tall"] as const) {
  for (const pose of everyPose(L3.plan.camera[aspect], L3.plan.n, L3.stage[aspect].rect.w)) inside(`L3 ${aspect}`, viewOf(pose, L3.stage[aspect].rect), CAPTURE.live);
  for (const pose of everyPose(L4.plan.camera[aspect], L4.plan.n, L4.stage[aspect].rect.w)) inside(`L4 ${aspect}`, viewOf(pose, L4.stage[aspect].rect), CAPTURE.live);
}
for (const aspect of ["wide", "tall"] as const) {
  inside(`L6 ${aspect} A`, viewOf(L6.poses.A[aspect], L6.stage[aspect].rect), CAPTURE.live);
  inside(`L6 ${aspect} B`, viewOf(L6.poses.B[aspect], L6.stage[aspect].rect), CAPTURE.live);
}
inside("L8 chart", viewOf(L8.chart.pose, L8.chart.stage.rect), CAPTURE.dashboard);
inside("L8 quiz", viewOf(L8.quiz.pose, L8.quiz.stage.rect), CAPTURE.quiz);

// The pointer enters and leaves over the riverbed (or off the frame), never popping up on a card.
const toFrame = (p: { x: number; y: number }, pose: CamPose, stage: Rect) => ({
  x: stage.x + stage.w / 2 + (p.x - pose.x) * pose.zoom,
  y: stage.y + stage.h / 2 + (p.y - pose.y) * pose.zoom,
});
const onCard = (p: { x: number; y: number }, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const pointerOffCard = (name: string, plan: LoopPlan, cursor: readonly CursorKey[], stage: StagePlan, keys: readonly CamKey[], overlay?: CamPose) => {
  for (const [a, b] of plan.cursorVisible) {
    for (const f of [a, b - 1]) {
      const pose = overlay ?? cameraAt(f, keys, FPS, stage.rect.w);
      const p = toFrame(cursorPathAt(f, cursor, FPS), pose, stage.rect);
      if (onCard(p, stage.rect)) fail(`${name}: the pointer ${f === a ? "appears" : "disappears"} on the card at f${f} (frame px ${p.x.toFixed(0)}, ${p.y.toFixed(0)})`);
    }
  }
};
for (const aspect of ["square", "tall"] as const) {
  pointerOffCard(`L3 ${aspect}`, L3.plan, L3.cursor, L3.stage[aspect], L3.plan.camera[aspect]);
  pointerOffCard(`L4 ${aspect}`, L4.plan, L4.cursor, L4.stage[aspect], L4.plan.camera[aspect]);
}
for (const aspect of ["wide", "tall"] as const) pointerOffCard(`L6 ${aspect}`, L6.plan, L6.cursor, L6.stage[aspect], L6.plan.camera[aspect], L6.poses.A[aspect]);
// L7's pointer appears over the riverbed; it hides where it clicked (REVIEW-G2 P1-9), so only its entrance is checked
{
  const [a] = L7.plan.cursorVisible[0]!;
  const p = toFrame(cursorPathAt(a, L7.cursor, FPS), L7.plan.camera.wide[0]!, L7.stage.wide.rect);
  if (onCard(p, L7.stage.wide.rect)) fail(`L7: the pointer appears on the card at f${a}`);
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

// The spotlights point and let go inside the loop: nothing is veiled at either end (the seam)
const within = (name: string, a: number, b: number, n: number) => {
  if (!(a > 0 && b < n)) fail(`${name}: [${a}, ${b}) must sit inside the loop (N=${n})`);
};
within("L2 spotlight", L2.spot.in, L2.spot.out + L2.spot.dur, L2.plan.n);
within("L3 applied card", L3.applied.in, L3.applied.out + L3.applied.dur, L3.plan.n);

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
const reads = (LOOP_PLANS as readonly LoopPlan[]).flatMap((p) => p.reads.map((r) => `${p.id} ${r.aspect} ${r.what}: ${pagePx(r).toFixed(1)} px`));
console.log(
  [
    `loops ok: ${LOOP_PLANS.map((p) => `${p.id} ${p.n}`).join(", ")}; L1 hover f${hoverAt}, ${cues.length} cues, poses ${poses.map(([f, p]) => `${p}@${f}`).join(" ")}`,
    `reading floor (page px at each slot):\n  ${reads.join("\n  ")}`,
    ...(notes.length ? [`waived:\n  ${notes.join("\n  ")}`] : []),
  ].join("\n"),
);
