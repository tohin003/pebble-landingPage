// The Return's sheet (MONTAGE_DESIGN §6): the schedule of every cell, and per aspect the camera, the cells on screen,
// the merge and the flash model's load per analysis window, in two modes:
//   reference  the design's model as research3/montage-work/schedule_r2.py runs it (its camera, no parallax, the stone
//              at its title size, the inner ring orbiting from R−60): reproduces schedule_r2.json within tolerance
//   plan       the planned Return (setpieces/returnPlan.ts), joined to S24 (the climax planned into the Return): its
//              camera with the join and the landing, parallax, the stone at the title stone's size on the landing
// Light work (pure arithmetic; no film, no image):
//   bun video/src/film2/setpieces/tools/return-sheet.ts [16:9|1:1|9:16] [--schedule] [--reference <schedule_r2.json>] [--json <out.json>]
// With --reference it compares the reference mode with the JSON and exits 1 when a number is out of its tolerance.
import { readFileSync, writeFileSync } from "node:fs";
import type { Aspect } from "../../tokens";
import { ASPECTS } from "../align";
import { RETURN_GEOMETRY, buildReturnField, slotOrder, type ReturnField } from "../returnField";
import { planReturn, returnCameraAt, returnCameraSpec, type ReturnCameraSpec } from "../returnPlan";
import { cornerSpeedR, mergeMetrics, planTrace, scheduleMetrics, traceReturn, windowLoads, type ReturnTrace } from "../returnChecks";
import { planClimax } from "../climax";
import { STRETCH, demoGrid } from "../demo/grids";
import { offsetForBlink, blinkStartsFor } from "../blink";
import { blinkKeepClear, RETURN_BLINK_R } from "../returnPlan";
import { localOfR } from "../returnField";

const args = process.argv.slice(2);
const only = args.find((a) => /^(16:9|1:1|9:16)$/.test(a)) as Aspect | undefined;
const aspects: readonly Aspect[] = only ? [only] : ASPECTS;
const refPath = args.includes("--reference") ? args[args.indexOf("--reference") + 1] : undefined;
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : undefined;
const showSchedule = args.includes("--schedule");

/** schedule_r2.py's own per-aspect numbers: the hero cell (161 × 91 …), the title pose, the stone. */
const REFERENCE_GEOMETRY: Record<Aspect, { hero: { w: number; h: number }; title: { x: number; y: number } }> = {
  "16:9": { hero: { w: 161, h: 91 }, title: { x: 660, y: 292 } },
  "1:1": { hero: { w: 101, h: 101 }, title: { x: 310, y: 194 } },
  "9:16": { hero: { w: 81, h: 143 }, title: { x: 330, y: 461 } },
};

/** The reference mode's field, camera and trace. */
function referenceTrace(a: Aspect): { field: ReturnField; cam: ReturnCameraSpec; trace: ReturnTrace } {
  const g = { ...RETURN_GEOMETRY[a], ...REFERENCE_GEOMETRY[a] };
  const field = buildReturnField(a, { geometry: g, depth: [1, 1, 1], holdInner: false });
  const cam = returnCameraSpec(a, { geometry: g });
  const poseAt = (r: number) => {
    const c = returnCameraAt(cam, r);
    return { x: c.x, y: c.y, zoom: Math.exp(c.L) };
  };
  return { field, cam, trace: traceReturn(field, poseAt, { to: 720 }) };
}

/** The plan mode's trace (the Return joined to S24, as the tests plan it). */
function planModeTrace(a: Aspect) {
  const size = { "16:9": [1920, 1080], "1:1": [1080, 1080], "9:16": [1080, 1920] }[a]!;
  const cg = demoGrid(STRETCH.climax, 300, 6000, 60);
  const climax = planClimax({ w: size[0]!, h: size[1]!, fps: 60, grid: cg, peak: 300, into: "return" });
  const p = planReturn({ w: size[0]!, h: size[1]!, fps: 60, climax, lastNote: 780 + 240, decayS: 6.6, roomToneS: 0.75 });
  return { p, trace: planTrace(p)! };
}

/** The numbers schedule_r2.py prints, from a trace. */
function summary(t: ReturnTrace, cam?: ReturnCameraSpec) {
  const sm = scheduleMetrics(t);
  const mm = mergeMetrics(t);
  const wl = windowLoads(t);
  let blurredMax = 0;
  for (const fr of t.frames) blurredMax = Math.max(blurredMax, fr.cells.filter((x) => x.p.state === "swapIn" || x.p.state === "swapOut").length);
  const zAt = (r: number) => t.poseAt(r).zoom;
  const out: Record<string, unknown> = {
    stone_px: +t.field.stone.px.toFixed(1),
    body_radius_px: [+t.field.stone.body.min.toFixed(1), +t.field.stone.body.max.toFixed(1)],
    body_width_px: +t.field.stone.body.width.toFixed(1),
    camera: {
      min_1s_corner_px_per_frame: +minCorner1s(t).toFixed(3),
      max_corner_px_per_frame: +sm.maxCornerPx.toFixed(2),
      z_min: +Math.min(...Array.from({ length: 150 }, (_, k) => zAt(150 + k))).toFixed(3),
      z: [-60, 0, 60, 120, 240, 300, 360, 420, 480, 600, 656].map((r) => +zAt(r).toFixed(3)),
      card_text_px_28_at: cam ? [-60, -30, 0, 30, 60, 120, 180].map((r) => [r, +((28 * zAt(r)) / cam.zCard).toFixed(1)]) : undefined,
    },
    onscreen_min_frames: sm.minOnScreen,
    overlap_max_share_of_smaller: +sm.maxOverlap.toFixed(3),
    blurred_cells_max_in_a_frame: blurredMax,
    merge: {
      returns: mm.returns,
      contacts: mm.contacts,
      first_contact: mm.firstContact,
      last_contact: mm.lastContact,
      spread_frames: mm.spread,
      hero_contact: mm.heroContact,
      hero_hidden: mm.heroHidden,
      last_hidden: mm.lastHidden,
      contacts_per_beat: mm.contactsPerBeat,
      width_at_contact_px: { min: +mm.widthAtContactPx.min.toFixed(1), median: +mm.widthAtContactPx.median.toFixed(1), max: +mm.widthAtContactPx.max.toFixed(1) },
      median_width_over_body: +mm.medianWidthOverBody.toFixed(2),
      radius_fall_to_contact: { mean: +mm.radiusFallMean.toFixed(2), min_by_ring: Object.fromEntries(Object.entries(mm.radiusFallMinByRing).map(([k, v]) => [k, +v.toFixed(2)])) },
      frames_contact_to_hidden: mm.contactToHidden,
    },
    windows: Object.fromEntries(wl.map((w) => [w.window, { transitions_60: w.worst, swap_tr_60: w.swapWorst, motion_tr_60: w.motionWorst, extended: w.extended, before_R240: w.beforeR240, from_R240: w.fromR240 }])),
  };
  return { out, sm };
}

function minCorner1s(t: ReturnTrace): number {
  const speeds: number[] = [];
  for (let r = -60; r < 656; r++) speeds.push(cornerSpeedR(t, r));
  let best = Infinity;
  for (let i = 0; i + 60 <= speeds.length; i++) {
    if (-60 + i + 60 > 656) break;
    let s = 0;
    for (let k = i; k < i + 60; k++) s += speeds[k]!;
    best = Math.min(best, s / 60);
  }
  return best;
}

/* ---------------------------------------------------------------- the schedule --------------------------------- */

const ref = refPath ? (JSON.parse(readFileSync(refPath, "utf8")) as { summary: Record<string, any>; schedule: Record<string, any>[] }) : null;
const { field: f169 } = referenceTrace("16:9");
let failures = 0;
const results: Record<string, unknown> = {};

console.log(`THE RETURN — ${f169.cells.length} cells, slots ${slotOrder(8).length}/${slotOrder(14).length}/${slotOrder(24).length} (golden strides 3, 5, 7)`);
if (showSchedule) {
  console.log("id            ring slot wave  kind    enter  settle swapIn leave  return  T");
  for (const c of f169.cells) console.log(`${c.id.padEnd(13)} ${String(c.ring).padStart(4)} ${String(c.slot).padStart(4)} ${c.wave.padEnd(5)} ${c.kind.padEnd(6)} ${String(c.enter ?? "-").padStart(6)} ${String(c.settle).padStart(6)} ${String(c.swapIn ?? "-").padStart(6)} ${String(c.leave ?? "-").padStart(6)} ${String(c.retStart?.toFixed(1) ?? "-").padStart(7)} ${String(c.retT ?? "-").padStart(3)}`);
}
if (ref) {
  // every cell's schedule, exactly
  let bad = 0;
  const byId = new Map(f169.cells.map((c) => [c.id, c]));
  for (const row of ref.schedule) {
    const c = byId.get(row.id);
    const same = (a: unknown, b: unknown) => (a === null || a === undefined ? b === null || b === undefined : typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-6 : a === b);
    if (!c || !same(row.ring, c.ring) || !same(row.slot, c.slot) || !same(row.enter, c.enter) || !same(row.settle, c.settle) || !same(row.swapIn, c.swapIn) || !same(row.leave, c.leave) || !same(row.retStart, c.retStart) || !same(row.retT, c.retT) || !same(row.card, c.spec.card) || !same(row.red, c.spec.red) || !same(row.take, c.spec.take) || !same(row.moment, c.spec.moment)) {
      bad++;
      console.log(`  schedule differs: ${row.id} ${JSON.stringify(row)} vs ${c ? JSON.stringify({ ring: c.ring, slot: c.slot, enter: c.enter, settle: c.settle, swapIn: c.swapIn, leave: c.leave, retStart: c.retStart, retT: c.retT, card: c.spec.card, red: c.spec.red, take: c.spec.take, moment: c.spec.moment }) : "missing"}`);
    }
  }
  console.log(`schedule: ${ref.schedule.length - bad} of ${ref.schedule.length} cells equal to schedule_r2.json (ring, slot, entry, settle, swap, leave, return, card, red, take, moment)`);
  failures += bad;
}

/* ---------------------------------------------------------------- per aspect ----------------------------------- */

type Tol = { path: string; tol: number };
const TOL: Tol[] = [
  { path: "onscreen_min_frames", tol: 2 },
  { path: "overlap_max_share_of_smaller", tol: 0 },
  { path: "blurred_cells_max_in_a_frame", tol: 0 },
  { path: "camera.min_1s_corner_px_per_frame", tol: 0.02 },
  { path: "camera.max_corner_px_per_frame", tol: 0.3 },
  { path: "camera.z_min", tol: 0.005 },
  { path: "merge.contacts", tol: 0 },
  { path: "merge.first_contact", tol: 2 },
  { path: "merge.last_contact", tol: 2 },
  { path: "merge.spread_frames", tol: 3 },
  { path: "merge.hero_contact", tol: 2 },
  { path: "merge.hero_hidden", tol: 2 },
  { path: "merge.width_at_contact_px.min", tol: 1.5 },
  { path: "merge.width_at_contact_px.median", tol: 1.5 },
  { path: "merge.width_at_contact_px.max", tol: 1.5 },
  { path: "merge.median_width_over_body", tol: 0.01 },
  { path: "merge.radius_fall_to_contact.mean", tol: 0.02 },
  { path: "merge.frames_contact_to_hidden.min", tol: 2 },
  { path: "merge.frames_contact_to_hidden.max", tol: 3 },
];
const get = (o: any, path: string): any => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

for (const a of aspects) {
  const { trace: rt, cam } = referenceTrace(a);
  const R = summary(rt, cam);
  const { p, trace: pt } = planModeTrace(a);
  const P = summary(pt);
  const ex = (p.extra as any).return;
  const keep = blinkKeepClear(ex.field, 60);
  const off = offsetForBlink(localOfR(RETURN_BLINK_R, 60), 60, keep);
  results[a] = { reference: R.out, plan: { ...P.out, clockOffset: ex.blink.clockOffset, landing: ex.landing } };
  console.log(`\n${a}  reference (schedule_r2.py's model) | plan (the Return joined to S24)`);
  const line = (label: string, r: unknown, q: unknown) => console.log(`  ${label.padEnd(34)} ${String(typeof r === "object" ? JSON.stringify(r) : r).padEnd(30)} ${typeof q === "object" ? JSON.stringify(q) : q}`);
  line("stone px (body width)", `${R.out.stone_px} (${R.out.body_width_px})`, `${P.out.stone_px} (${P.out.body_width_px})`);
  line("camera z at R−60…R656", (R.out.camera as any).z.join(" "), (P.out.camera as any).z.join(" "));
  line("corners: min over 1 s, max", `${(R.out.camera as any).min_1s_corner_px_per_frame}, ${(R.out.camera as any).max_corner_px_per_frame}`, `${(P.out.camera as any).min_1s_corner_px_per_frame}, ${(P.out.camera as any).max_corner_px_per_frame}`);
  line("the kept card's 28 px text at R…", (R.out.camera as any).card_text_px_28_at.map((x: number[]) => `${x[0]}:${x[1]}`).join(" "), "");
  line("cells on screen ≥ (frames)", R.out.onscreen_min_frames, P.out.onscreen_min_frames);
  line("settled overlap", R.out.overlap_max_share_of_smaller, P.out.overlap_max_share_of_smaller);
  line("cells mid-swap in a frame ≤", R.out.blurred_cells_max_in_a_frame, P.out.blurred_cells_max_in_a_frame);
  line("slot changes ≥ / settled ≥", `${R.sm.minChangeGap} / ${R.sm.minSettled.toFixed(1)}`, `${P.sm.minChangeGap} / ${P.sm.minSettled.toFixed(1)}`);
  line("new images a half bar", Object.values(R.sm.newImagesPerHalfBar).join(","), Object.values(P.sm.newImagesPerHalfBar).join(","));
  const rm = R.out.merge as any;
  const pm = P.out.merge as any;
  line("contacts (first–last, spread)", `${rm.contacts} R${rm.first_contact}–R${rm.last_contact} (${rm.spread_frames})`, `${pm.contacts} R${pm.first_contact}–R${pm.last_contact} (${pm.spread_frames})`);
  line("contacts a beat from R480", rm.contacts_per_beat.join(","), pm.contacts_per_beat.join(","));
  line("width at contact px (÷ body)", `${rm.width_at_contact_px.min}–${rm.width_at_contact_px.max} (${rm.median_width_over_body})`, `${pm.width_at_contact_px.min}–${pm.width_at_contact_px.max} (${pm.median_width_over_body})`);
  line("kept card contact / hidden", `R${rm.hero_contact} / R${rm.hero_hidden}`, `R${pm.hero_contact} / R${pm.hero_hidden}`);
  line("radius fall to contact (by ring)", `${rm.radius_fall_to_contact.mean} ${JSON.stringify(rm.radius_fall_to_contact.min_by_ring)}`, `${pm.radius_fall_to_contact.mean} ${JSON.stringify(pm.radius_fall_to_contact.min_by_ring)}`);
  line("contact to hidden (frames)", `${rm.frames_contact_to_hidden.min}–${rm.frames_contact_to_hidden.max}`, `${pm.frames_contact_to_hidden.min}–${pm.frames_contact_to_hidden.max}`);
  for (const [k, w] of Object.entries(R.out.windows as Record<string, any>)) {
    const q = (P.out.windows as Record<string, any>)[k];
    line(`window ${k}: worst / <R240 / ≥R240`, `${w.transitions_60} / ${w.before_R240} / ${w.from_R240}${w.extended ? " EXT" : ""}`, `${q.transitions_60} / ${q.before_R240} / ${q.from_R240}${q.extended ? " EXT" : ""}`);
  }
  line("blink: clock offset, blinks", `${off}`, `${ex.blink.clockOffset}: ${blinkStartsFor(ex.blink.clockOffset, 60, 0, 900).map((x) => `R${(x - 60).toFixed(1)}`).join(" ")}`);
  if (ref) {
    const ra = ref.summary.aspects[a];
    const bad: string[] = [];
    for (const t of TOL) {
      const want = get(ra, t.path);
      const got = get(R.out, t.path);
      if (typeof want !== "number" || typeof got !== "number" || Math.abs(want - got) > t.tol + 1e-9) bad.push(`${t.path}: ${got} vs ${want} (±${t.tol})`);
    }
    for (const [i, z] of (ra.camera.z as number[]).entries()) if (Math.abs((R.out.camera as any).z[i] - z) / z > 0.005) bad.push(`camera.z[${i}]: ${(R.out.camera as any).z[i]} vs ${z} (±0.5 %)`);
    for (const [k, v] of Object.entries(ra.merge.contacts_per_beat as number[])) if (Math.abs(rm.contacts_per_beat[+k] - v) > 1) bad.push(`merge.contacts_per_beat[${k}]: ${rm.contacts_per_beat[+k]} vs ${v} (±1)`);
    for (const [k, v] of Object.entries(ra.merge.radius_fall_to_contact.min_by_ring as Record<string, number>)) if (Math.abs(rm.radius_fall_to_contact.min_by_ring[k] - v) > 0.03) bad.push(`merge.radius_fall_to_contact.min_by_ring.${k}: ${rm.radius_fall_to_contact.min_by_ring[k]} vs ${v} (±0.03)`);
    for (const [k, w] of Object.entries(ra.windows as Record<string, any>)) {
      const g = (R.out.windows as Record<string, any>)[k];
      for (const key of ["transitions_60", "swap_tr_60", "motion_tr_60", "before_R240", "from_R240"]) if (g[key] !== w[key]) bad.push(`windows.${k}.${key}: ${g[key]} vs ${w[key]} (exact)`);
      if (g.extended !== w.extended) bad.push(`windows.${k}.extended: ${g.extended} vs ${w.extended}`);
    }
    for (const [i, x] of (ra.camera.card_text_px_28_at as [number, number][]).entries()) if (Math.abs((R.out.camera as any).card_text_px_28_at[i][1] - x[1]) > 0.2) bad.push(`camera.card_text_px_28_at[${x[0]}]: ${(R.out.camera as any).card_text_px_28_at[i][1]} vs ${x[1]} (±0.2)`);
    const hl = ra.hairline_returns as Record<string, [number, number]>;
    const field = rt.field;
    for (const [name, ring] of [["inner", 0], ["middle", 1], ["outer", 2]] as const) {
      const s = Math.round(Math.max(...field.cells.filter((c) => c.ring === ring && c.retStart !== null).map((c) => c.retStart!)));
      if (s !== hl[name]![0]) bad.push(`hairline_returns.${name}: R${s} vs R${hl[name]![0]}`);
    }
    console.log(`  reference: ${bad.length ? `${bad.length} numbers out of tolerance:\n    ${bad.join("\n    ")}` : `every compared number within tolerance (${TOL.length + 11 + Object.keys(ra.windows).length * 6} numbers)`}`);
    failures += bad.length;
  }
}
if (ref) {
  const rs = ref.summary.schedule;
  const s169 = scheduleMetrics(referenceTrace("16:9").trace);
  const bad: string[] = [];
  if (s169.minChangeGap !== rs.min_frames_between_changes_in_a_slot) bad.push(`min_frames_between_changes_in_a_slot ${s169.minChangeGap} vs ${rs.min_frames_between_changes_in_a_slot}`);
  if (Math.abs(s169.minSettled - rs.min_frames_settled_before_next_move) > 0.01) bad.push(`min_frames_settled_before_next_move ${s169.minSettled} vs ${rs.min_frames_settled_before_next_move}`);
  if (s169.lastSwapEnd - 16 !== rs.last_swap_start) bad.push(`last_swap_start ${s169.lastSwapEnd - 16} vs ${rs.last_swap_start}`);
  for (const [k, v] of Object.entries(rs.new_images_per_half_bar as Record<string, number>)) if (s169.newImagesPerHalfBar[k] !== v) bad.push(`new_images_per_half_bar.${k} ${s169.newImagesPerHalfBar[k]} vs ${v}`);
  const shown = f169.cells.filter((c) => c.spec.shown).length;
  if (shown !== rs.shown_cells) bad.push(`shown_cells ${shown} vs ${rs.shown_cells}`);
  const blinks = (ref.summary.blinks_offset_710 as number[]).map((x) => +x.toFixed(1));
  const ours = blinkStartsFor(710, 60, 0, 1000).map((x) => +(x - 60).toFixed(1));
  if (blinks.some((b, i) => Math.abs(b - ours[i]!) > 0.15)) bad.push(`blinks at offset 710: ${ours.join(" ")} vs ${blinks.join(" ")}`);
  console.log(`\nschedule numbers: ${bad.length ? `out of tolerance:\n  ${bad.join("\n  ")}` : "min change gap, settle, last swap, new images per half bar, shown cells and the blinks at offset 710 equal the reference"}`);
  failures += bad.length;
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1));
if (ref) console.log(failures ? `\nFAIL: ${failures} differences from the reference` : "\nPASS: the reference mode reproduces schedule_r2.json within tolerance");
process.exit(ref && failures ? 1 : 0);
