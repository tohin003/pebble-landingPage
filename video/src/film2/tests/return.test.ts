// The Return (MONTAGE_DESIGN revision 2; OVERRIDES §61): its data, plan and checks. Every Return check is proved on a
// planted canary that FAILS on the bad case the design names, and passes the Return as planned in all three aspects
// (one named case is caught elsewhere: the bloom run at twice its speed fails returnSchedule's 30-px travel limit, while
// returnWindows' model gives it IRIS's warning level only, as it gives the design's own bloom in 16:9); cameraFloor,
// stoneCount and groundCoverage are shown to cover the Return's shot; R2's exemption from cutRate, holds and readingLoad
// is shown to hold inside the Return's span only; and the post-credit scene (D157) plans after the Return's end card.
import { describe, expect, test } from "bun:test";
import { VelocityCamera } from "../motion/camera";
import { E_MOVE } from "../motion/ease";
import type { Aspect } from "../tokens";
import { checkPlan } from "../setpieces/qa";
import { planClimax } from "../setpieces/climax";
import { STRETCH, demoGrid } from "../setpieces/demo/grids";
import { halfBars } from "../setpieces/music";
import { alignAspects, timelineDiffs } from "../setpieces/align";
import type { FinaleTiming } from "../setpieces/finale";
import { CODA_GRID, codaOf, codaPlacement, planCoda, type CodaTiming } from "../setpieces/coda";
import { checkJoins } from "../setpieces/joins";
import { BLINK_S, blinkStartsFor, offsetForBlink } from "../setpieces/blink";
import { RETURN_CELLS, RETURN_WAVES, manifestProblems, refuseBadManifest, type ReturnCellSpec } from "../setpieces/returnCells";
import { RETURN_GEOMETRY, RETURN_TIMING, buildReturnField, cellPoseAt, hairlineAt, localOfR, slotOrder, type FieldCell, type ReturnFieldOptions } from "../setpieces/returnField";
import { RETURN_BLINK_R, RETURN_EVENTS, RETURN_FILM_S, RETURN_MUSIC, blinkKeepClear, filmFrameOfR, planReturn, returnCameraAt, returnCameraSpec, returnGrid, type ReturnCameraSpec, type ReturnOptions } from "../setpieces/returnPlan";
import {
  R2_EXEMPT,
  RETURN_CHECKS,
  blinkPlaced,
  cellTextOf,
  joinPose,
  planTrace,
  returnContentOf,
  returnMergeOf,
  returnOf,
  returnRadiusOf,
  returnScheduleOf,
  returnWindowsOf,
  scheduleMetrics,
  traceReturn,
  windowLoads,
  type ReturnTrace,
} from "../setpieces/returnChecks";
import type { Finding } from "../qa/checks";
import type { ScenePlan, TypeSpec } from "../setpieces/scene";

const SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };
const ASPECTS: readonly Aspect[] = ["16:9", "1:1", "9:16"];
const FPS = 60;
const errs = (xs: readonly Finding[] | { errors: readonly Finding[] }, check?: string) => ("errors" in xs ? xs.errors : xs).filter((x) => x.level === "error" && (!check || x.check === check));

/** S24, planned into the Return (it ends on its hold's glide, on the middle of a bar). */
const climaxCache = new Map<Aspect, ScenePlan>();
const climaxFor = (a: Aspect) => {
  if (!climaxCache.has(a)) climaxCache.set(a, planClimax({ ...SIZE[a], fps: FPS, grid: demoGrid(STRETCH.climax, 300, 6000, FPS), peak: 300, into: "return" }));
  return climaxCache.get(a)!;
};
/** The Return joined to S24, with the finale's end card as the demo times it (the track's last strong note 4 s after the title). */
const planFor = (a: Aspect, o: Partial<ReturnOptions> = {}) => planReturn({ ...SIZE[a], fps: FPS, climax: climaxFor(a), lastNote: 780 + 240, decayS: 6.6, roomToneS: 0.75, ...o });
const planCache = new Map<Aspect, ScenePlan>();
const planOf = (a: Aspect) => {
  if (!planCache.has(a)) planCache.set(a, planFor(a));
  return planCache.get(a)!;
};

/** The design's model of a field (no parallax), with its reference camera: what the canaries plant faults in. */
const modelTrace = (a: Aspect, fo: ReturnFieldOptions = {}, camo: Partial<ReturnCameraSpec> = {}): ReturnTrace => {
  const field = buildReturnField(a, { depth: [1, 1, 1], ...fo });
  const cam = returnCameraSpec(a, { geometry: field.geometry, ...camo });
  return traceReturn(
    field,
    (r) => {
      const c = returnCameraAt(cam, r);
      return { x: c.x, y: c.y, zoom: Math.exp(c.L) };
    },
    { to: 720 },
  );
};

/** Moves one swap to another frame, keeping the occupancy chain whole (a surgical canary). */
const retimeSwap = (cells: readonly FieldCell[], id: string, swapIn: number) => {
  const c = cells.find((x) => x.id === id)!;
  const prev = cells.find((x) => x.ring === c.ring && x.slot === c.slot && x.swappedOutAt === c.swapIn)!;
  prev.swappedOutAt = swapIn;
  prev.leave = swapIn + RETURN_TIMING.swapFrames / 2;
  c.swapIn = swapIn;
  c.settle = swapIn + RETURN_TIMING.swapFrames;
};

/* ---------------------------------------------------------------- blink.ts ------------------------------------- */

describe("the stone's own idle blink, placed by its clock (blink.ts)", () => {
  const field = buildReturnField("16:9");
  const keep = blinkKeepClear(field, FPS);
  test("offsetForBlink returns 710 for the Return: blinks at R1, R166, R371, R646 and R869", () => {
    const off = offsetForBlink(localOfR(RETURN_BLINK_R, FPS), FPS, keep);
    expect(off).toBe(710);
    const at = blinkStartsFor(off, FPS, 0, 1000).map((x) => Math.round(x - 60));
    expect(at).toEqual([1, 166, 371, 646, 869]);
  });
  test("the keep-clear spans are the drain's first return to J5's first beat and the iris to the title's first second", () => {
    expect(keep.map((k) => [k.from - 60, k.to - 60])).toEqual([
      [430, 496],
      [658, 780],
    ]);
  });
  test("with the design's literal R466–R496 alone the earliest fit is 435, whose blink falls 11 frames into the drain (R441)", () => {
    const literal = [
      { from: localOfR(466, FPS), to: localOfR(496, FPS) },
      { from: localOfR(658, FPS), to: localOfR(780, FPS) },
    ];
    const off = offsetForBlink(localOfR(RETURN_BLINK_R, FPS), FPS, literal);
    expect(off).toBe(435);
    expect(blinkStartsFor(off, FPS, 0, 800).some((x) => x - 60 > 430 && x - 60 < 466)).toBe(true);
  });
  test("a blink lasts 0.18 s, and the planned one ends before the iris starts", () => {
    expect(BLINK_S).toBe(0.18);
    expect(646.1 + BLINK_S * 60).toBeLessThan(658);
  });
});

/* ---------------------------------------------------------------- returnCells.ts -------------------------------- */

describe("the cell manifest (returnCells.ts)", () => {
  test("85 cells: 8 inner, 34 middle, 43 outer; 20 card-type, 2 red, 34 the film shows; 9 * cells, each with its kit take", () => {
    expect(RETURN_CELLS.length).toBe(85);
    expect([RETURN_WAVES.inner.length, RETURN_WAVES.mid1.length + RETURN_WAVES.mid2.length + RETURN_WAVES.mid3.length, RETURN_WAVES.out1.length + RETURN_WAVES.out2.length]).toEqual([8, 34, 43]);
    expect(RETURN_CELLS.filter((c) => c.card).length).toBe(20);
    expect(RETURN_CELLS.filter((c) => c.red).map((c) => c.id)).toEqual(["J1*", "F9"]);
    expect(RETURN_CELLS.filter((c) => c.shown).length).toBe(34);
    const star = RETURN_CELLS.filter((c) => c.id.includes("*"));
    expect(star.length).toBe(9);
    expect(star.every((c) => !!c.kitTake)).toBe(true);
    expect(manifestProblems(RETURN_CELLS)).toEqual([]);
  });
  test("it refuses a Stealth Lockdown cell at load (the canary: an L1 cell)", () => {
    const stealth: ReturnCellSpec = { ...RETURN_CELLS[1]!, id: "L1", features: ["L1"] };
    expect(() => refuseBadManifest([...RETURN_CELLS, stealth])).toThrow(/Stealth Lockdown/);
  });
  test("every stand-in still is a light-theme published capture, cropped inside it, 4:3 where it covers the cell", () => {
    for (const c of RETURN_CELLS) {
      const s = c.standIn;
      if (s.kind !== "still") continue;
      expect(s.src.includes("dark")).toBe(false);
      expect(s.crop.x >= 0 && s.crop.y >= 0 && s.crop.x + s.crop.w <= s.w + 1e-9 && s.crop.y + s.crop.h <= s.h + 1e-9).toBe(true);
      if (s.fit === "cover") expect(Math.abs(s.crop.w / s.crop.h - 4 / 3)).toBeLessThan(0.02);
    }
    expect(RETURN_CELLS.filter((c) => c.standIn.kind === "still").length).toBe(18);
  });
  test("the first cell is S24's own last frame; the slices are 6–12 frames at 1× (J6+F14, A5, X5)", () => {
    expect(RETURN_CELLS[0]!.id).toBe("G3");
    expect(RETURN_CELLS[0]!.standIn.kind).toBe("frame");
    expect(RETURN_CELLS.filter((c) => c.slice).map((c) => `${c.id}:${c.slice!.frames}`)).toEqual(["J6+F14:12", "X5:12", "A5:12"]);
  });
});

/* ---------------------------------------------------------------- returnField.ts -------------------------------- */

describe("the field's schedule (returnField.ts)", () => {
  const field = buildReturnField("16:9");
  const byId = new Map(field.cells.map((c) => [c.id, c]));
  test("the golden interleave: item i goes to slot (i × 3, 5, 7) mod n, so the field changes everywhere at once", () => {
    expect(slotOrder(8)).toEqual([0, 3, 6, 1, 4, 7, 2, 5]);
    expect(slotOrder(14).slice(0, 4)).toEqual([0, 5, 10, 1]);
    expect(slotOrder(24).slice(0, 4)).toEqual([0, 7, 14, 21]);
  });
  test("the waves' frames: M1 R120 + 7i, O1 R150 + 7.5i, M2 R240 + 7i, O2 R321 + 6i, M3 R366 + 12i", () => {
    expect([byId.get("J1*")!.enter, byId.get("J1*")!.settle, byId.get("J1*")!.slot]).toEqual([120, 160, 0]);
    expect([byId.get("F9")!.enter, byId.get("F9")!.settle]).toEqual([172.5, 212.5]);
    expect(byId.get("A14*")!.swapIn).toBe(240);
    expect(byId.get("I6a")!.swapIn).toBe(321);
    expect(byId.get("X5")!.swapIn).toBe(366 + 12 * 7);
    expect(Math.max(...field.cells.map((c) => c.swapIn ?? -1))).toBe(450);
  });
  test("the merge: outer from R430 + 3.3j, middle R494 + 3.4j, inner R540 + 4.2j, the kept card on R566 over 92 frames", () => {
    const rets = field.cells.filter((c) => c.retStart !== null);
    expect(rets.length).toBe(46);
    expect(Math.min(...rets.map((c) => c.retStart!))).toBe(430);
    expect([byId.get("G3")!.retStart, byId.get("G3")!.retT]).toEqual([566, 92]);
    expect(Math.max(...rets.filter((c) => !c.spec.hero).map((c) => c.retStart!))).toBeCloseTo(540 + 4.2 * 6, 6);
  });
  test("cellPoseAt: opacity 1, visibility from the stone's silhouette, the swap's blur at its crossing, a draw order", () => {
    const p = planOf("16:9");
    const f = returnOf(p)!.field;
    const a14 = f.cells.find((c) => c.id === "A14*")!;
    expect(cellPoseAt(a14, localOfR(240, FPS), f)).toBeNull(); // drawn from its crossing
    const crossing = cellPoseAt(a14, localOfR(248, FPS), f)!;
    expect(crossing.blurPx).toBeCloseTo(8, 6);
    expect(crossing.opacity).toBe(1);
    expect(crossing.visible).toBe(true);
    const settled = cellPoseAt(a14, localOfR(300, FPS), f)!;
    expect(settled.blurPx).toBe(0);
    expect(settled.depth).toBe(1.025);
    // every drawn cell on every frame: opacity 1 until it is wholly behind the stone
    for (let r = -60; r <= 656; r += 3)
      for (const c of f.cells) {
        const q = cellPoseAt(c, localOfR(r, FPS), f);
        if (q) expect(q.opacity).toBe(1);
      }
    const hero = f.cells.find((c) => c.spec.hero)!;
    expect(cellPoseAt(hero, localOfR(645, FPS), f)?.visible ?? false).toBe(false);
    expect(cellPoseAt(hero, localOfR(-60, FPS), f)!.z).toBeGreaterThan(cellPoseAt(f.cells.find((c) => c.id === "A6")!, localOfR(-60, FPS), f)!.z);
  });
  test("the hairlines draw on from R0 and return into the stone after their ring's last cell has gone home", () => {
    const f = returnOf(planOf("16:9"))!.field;
    expect(hairlineAt(2, localOfR(-1, FPS), f)).toBeNull();
    expect(hairlineAt(2, localOfR(15, FPS), f)!.drawn).toBeGreaterThan(0);
    expect(hairlineAt(2, localOfR(500, FPS), f)!.a).toBe(RETURN_GEOMETRY["16:9"].ell[2][0]);
    expect(hairlineAt(2, localOfR(546, FPS), f)).toBeNull();
    expect(hairlineAt(0, localOfR(600, FPS), f)).not.toBeNull();
    expect(hairlineAt(0, localOfR(606, FPS), f)).toBeNull();
  });
});

/* ---------------------------------------------------------------- the plan, in every aspect -------------------- */

describe("the Return, planned and joined to S24, passes every check in every aspect", () => {
  for (const a of ASPECTS) {
    test(`${a}: checkPlan has no errors, and every Return check ran`, () => {
      const p = planOf(a);
      const r = checkPlan(p, returnGrid(FPS));
      if (r.errors.length) throw new Error(r.errors.map((e) => `[${e.check}] ${e.message}`).join("\n"));
      expect(r.errors).toEqual([]);
      for (const c of RETURN_CHECKS) expect(r.infos.some((x) => x.check === c)).toBe(true);
      // only IRIS's warning level (the model's bloom in 16:9), the unmeasured red shares and the unmeasured luminance warn
      expect(r.warnings.every((w) => (w.check === "returnWindows" && /IRIS's warning level/.test(w.message)) || (w.check === "returnContent" && /not measured/.test(w.message)))).toBe(true);
    });
  }
  test("every music event lands on the point the design gives it (no event waited)", () => {
    const p = planOf("16:9");
    for (const e of RETURN_EVENTS) {
      const m = p.music.find((x) => x.event === e.event)!;
      expect(m.frame).toBe(Math.round(localOfR(e.r, FPS)));
      expect(m.waited).toBe(0);
    }
    expect(p.hits).toEqual([780]);
    expect(halfBars(returnGrid(FPS))).toContain(0);
  });
  test("one timeline in all three aspects (§2.11): planned through alignAspects, every cut, music event and end lands on one frame", () => {
    const plans = alignAspects<FinaleTiming>((a, align) => planFor(a, { align }));
    expect(timelineDiffs(plans)).toEqual([]);
    for (const a of ASPECTS) expect(errs(checkPlan(plans[a], returnGrid(FPS)))).toEqual([]);
    // the field's own frames do not depend on the aspect: its span, the landing, the blink and the stone's clock
    expect(new Set(ASPECTS.map((a) => returnOf(plans[a])!).map((x) => `${x.span.from}-${x.span.to} ${x.landing.landAt} ${x.blink.at} ${x.blink.clockOffset}`)).size).toBe(1);
  });
  test("its place in the film is the score lane's revised beat sheet's (CUE_SHEET.md revision 2): every mark and bar line on its frame", () => {
    // BEAT_SHEET.json `return` (28 Oct 04:30): the marks R−60 … R720 and the bar lines under the Return, in film frames at 60 fps
    const marks: [number, number][] = [[-60, 6302], [0, 6362], [120, 6482], [240, 6602], [360, 6722], [480, 6842], [600, 6962], [646, 7008], [658, 7020], [690, 7052], [720, 7082]];
    expect(marks.map(([r]) => filmFrameOfR(r, 60))).toEqual(marks.map(([, f]) => f));
    // B2 bars 47–52, then A4 bars 80–83 (J5 on bar 80)
    const bars = [6242, 6362, 6482, 6602, 6722, 6842, 6962, 7082, 7202];
    const start = filmFrameOfR(-60, 60);
    const downbeats = new Set(returnGrid(FPS).downbeats.map((x) => Math.round(x)));
    for (const f of bars) expect(downbeats.has(f - start)).toBe(true);
    // its seconds are MONTAGE_DESIGN §5.2's to within 4 ms, and the R-frames' spans within a fifth of a frame
    expect([RETURN_FILM_S.start, RETURN_FILM_S.r0, RETURN_FILM_S.j5, RETURN_FILM_S.title].map((s, i) => Math.abs(s - [105.03, 106.03, 114.03, 118.03][i]!) < 0.004)).toEqual([true, true, true, true]);
    expect(Math.abs((RETURN_FILM_S.r0 - RETURN_FILM_S.start) * 60 - 60)).toBeLessThan(0.2);
    expect(Math.abs((RETURN_FILM_S.j5 - RETURN_FILM_S.r0) * 60 - RETURN_MUSIC.j5R)).toBeLessThan(0.2);
    expect(Math.abs((RETURN_FILM_S.title - RETURN_FILM_S.r0) * 60 - RETURN_MUSIC.titleR)).toBeLessThan(0.2);
    expect(filmFrameOfR(720, 30)).toBe(Math.round(RETURN_FILM_S.title * 30));
  });
  test("one stone: the clock offset 710 and the film layer on the field's stone and the title's, landing on it through the iris", () => {
    for (const a of ASPECTS) {
      const p = planOf(a);
      expect(p.shots.map((s) => s.id)).toEqual(["return", "title"]);
      for (const s of p.shots) expect([s.stone?.clockOffset, s.stone?.layer]).toEqual([710, "film"]);
      expect(errs(checkPlan(p), "stoneCount")).toEqual([]);
    }
  });
  test("the schedule's numbers hold in every aspect (MONTAGE_DESIGN §2.3, §2.6)", () => {
    for (const a of ASPECTS) {
      const m = scheduleMetrics(planTrace(planOf(a))!);
      expect(m.minChangeGap).toBe(73);
      expect(m.minSettled).toBeGreaterThanOrEqual(60);
      expect(m.lastSwapEnd).toBe(466);
      expect(m.minOnScreen).toBeGreaterThanOrEqual(84);
      expect(m.maxOverlap).toBe(0);
      expect(m.maxCornerPx).toBeLessThanOrEqual(30);
      expect(m.minCornerPx1s).toBeGreaterThanOrEqual(0.25);
      expect(Object.values(m.newImagesPerHalfBar)).toEqual([0, 0, 13, 13, 17, 14, 15, 5, 0, 0, 0, 0]);
    }
  });
  test("the post-credit scene (D157) follows the Return's end card as it follows the finale's: one timeline, every check, the join, its place", () => {
    const rets = alignAspects<FinaleTiming>((a, align) => planFor(a, { align }));
    const codas = alignAspects<CodaTiming>((a, align) => planCoda({ ...SIZE[a], fps: FPS, endCard: rets[a], align }));
    expect(timelineDiffs(codas)).toEqual([]);
    for (const a of ASPECTS) {
      const x = codaOf(codas[a])!;
      expect([x.endCard.id, x.endCard.end, x.endCard.shot]).toEqual(["return", rets[a].duration, "title"]);
      expect(errs(checkPlan(codas[a], CODA_GRID)).map((e) => `${a} [${e.check}] ${e.message}`)).toEqual([]);
      expect(checkJoins([rets[a], codas[a]], ["continue"]).map((f) => `${a} ${f.message}`)).toEqual([]);
      expect(errs(codaPlacement([climaxFor(a), rets[a], codas[a]]).findings).map((f) => `${a} ${f.message}`)).toEqual([]);
    }
  });
});

/* ---------------------------------------------------------------- the canaries --------------------------------- */

describe("returnSchedule: its canaries fail", () => {
  test("the design passes it in the model", () => {
    for (const a of ASPECTS) expect(errs(returnScheduleOf(modelTrace(a)))).toEqual([]);
  });
  test("a slot changing twice in 20 frames", () => {
    const t = modelTrace("16:9");
    retimeSwap(t.field.cells, "B8", 260); // A14* swapped into this slot on R240
    const t2 = traceReturn(t.field, t.poseAt, { to: 720 });
    expect(errs(returnScheduleOf(t2)).some((e) => /a slot changes twice within 20 frames/.test(e.message))).toBe(true);
  });
  test("a cell parked in an off-frame sector (the outer ring pushed past the frame's sides)", () => {
    const g = RETURN_GEOMETRY["16:9"];
    const f = errs(returnScheduleOf(modelTrace("16:9", { geometry: { ell: [g.ell[0], g.ell[1], [1060, 480]] } })));
    expect(f.some((e) => /under 60 frames: .*D6\+P1 \(0\)/.test(e.message))).toBe(true);
  });
  test("two rings' cells touching at 45° (revision 1's circles and cells)", () => {
    const f = errs(returnScheduleOf(modelTrace("16:9", { geometry: { ell: [[259, 259], [400, 400], [562, 562]], cell: [180, 150, 120] } })));
    expect(f.some((e) => /two settled cells overlap/.test(e.message))).toBe(true);
  });
  test("the bloom run at twice its speed: the frame's corners pass the 30 px travel limit", () => {
    for (const a of ASPECTS) {
      const f = errs(returnScheduleOf(modelTrace(a, {}, { pullFrames: 155, panFrames: 150 })));
      expect(f.some((e) => /corners travel .* px a frame \(at most 30/.test(e.message))).toBe(true);
    }
  });
});

describe("returnWindows: its canaries fail", () => {
  test("the design stays at or under IRIS's warning level in the model (16:9: 4 in 60 frames in the bloom, 3 from R240)", () => {
    for (const a of ASPECTS) expect(errs(returnWindowsOf(modelTrace(a)))).toEqual([]);
    const w = windowLoads(modelTrace("16:9"));
    expect(w.map((x) => [x.window, x.worst, x.fromR240])).toEqual([
      ["300x300", 4, 2],
      ["256x192", 4, 3],
    ]);
  });
  test("five swaps in one window within 60 frames", () => {
    const t = modelTrace("16:9");
    // five cells swapping in one place, 12 frames apart, each covering a third of a 256 × 192 window
    const five = t.field.cells.filter((c) => c.swapIn !== null).slice(0, 5).map((c, k) => ({ ...c, swapIn: 300 + 12 * k }));
    const field = { ...t.field, cells: five };
    const rect = { x: 40, y: 40, w: 150, h: 112 };
    const frames = t.frames.map((fr) => ({
      r: fr.r,
      pose: fr.pose,
      cells: five
        .filter((c, k) => fr.r >= c.swapIn! + 8 && (k === 4 || fr.r < five[k + 1]!.swapIn! + 8))
        .map((c) => ({ c, p: { cell: c, rect, c: { x: 0, y: 0 }, state: "settled" as const, depth: 1, swapBlur: 0, opacity: 1 }, share: 1, s: rect })),
    }));
    const synth: ReturnTrace = { ...t, field, frames, at: (r) => frames[Math.round(r) + 60] };
    const f = errs(returnWindowsOf(synth));
    expect(f.some((e) => /1[0-9] transitions in 60 frames in a 256x192 window/.test(e.message))).toBe(true);
  });
  test("the bloom run at twice its speed reaches IRIS's warning level, not WCAG's fail: the same few swings in one second", () => {
    const fast = windowLoads(modelTrace("16:9", {}, { pullFrames: 155, panFrames: 150 }));
    expect(Math.max(...fast.map((w) => w.worst))).toBe(4);
    expect(returnWindowsOf(modelTrace("16:9", {}, { pullFrames: 155, panFrames: 150 })).some((x) => x.level === "warn")).toBe(true);
  });
});

describe("returnContent: its canaries fail", () => {
  const swapCell = (wave: keyof typeof RETURN_WAVES, id: string, patch: Partial<ReturnCellSpec>) => ({ ...RETURN_WAVES, [wave]: RETURN_WAVES[wave].map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  test("the design passes it in every aspect", () => {
    for (const a of ASPECTS) expect(errs(returnContentOf(modelTrace(a)))).toEqual([]);
  });
  test("a Stealth cell", () => {
    const f = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out1", "B15", { id: "L1", features: ["L1"] }) })));
    expect(f.some((e) => /Stealth Lockdown/.test(e.message))).toBe(true);
  });
  test("a dark cell", () => {
    expect(errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out1", "B15", { theme: "dark" }) }))).some((e) => /dark-theme cell/.test(e.message))).toBe(true);
    expect(errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out1", "M1", { meanLum: 0.31 }) }))).some((e) => /mean relative luminance is 0.31/.test(e.message))).toBe(true);
  });
  test("a red cell swapping in the rush", () => {
    const f = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out2", "I6a", { red: true }) })));
    expect(f.some((e) => /the red cell I6a swaps in on R321/.test(e.message))).toBe(true);
  });
  test("too much saturated red: J1* measured at 90 % red passes 0.5 % of the 16:9 frame and 1 % of the 1:1", () => {
    for (const a of ["16:9", "1:1"] as const) {
      const f = errs(returnContentOf(modelTrace(a, { waves: swapCell("mid1", "J1*", { redShare: 0.9 }) })));
      expect(f.some((e) => /J1\*'s saturated red reaches/.test(e.message))).toBe(true);
    }
  });
  test("F11's held card beside F12's Verified (two moments of HS-F)", () => {
    const f = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("mid2", "F11*", { take: "HS-F studio-bookings", moment: "held" }) })));
    expect(f.some((e) => /F12\+F3\+F1 \(verified\) and F11\* \(held\)|F11\* \(held\) and F12\+F3\+F1/.test(e.message))).toBe(true);
  });
  test("two cards side by side", () => {
    const f = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("inner", "A6", { card: true }) })));
    expect(f.some((e) => /two card-type cells sit side by side: G3 and A6|A6 and G3/.test(e.message))).toBe(true);
  });
  test("the light-theme rule warns while it is declared, not measured; measured light crops clear the warning", () => {
    const warned = (fo: ReturnFieldOptions) => returnContentOf(modelTrace("16:9", fo)).filter((x) => x.level === "warn" && /light-theme rule is declared, not measured/.test(x.message));
    expect(warned({}).map((x) => /(\d+) of 85 crops/.exec(x.message)?.[1])).toEqual(["84"]);
    const lit = Object.fromEntries(Object.entries(RETURN_WAVES).map(([k, v]) => [k, v.map((c) => ({ ...c, meanLum: 0.86 }))])) as unknown as typeof RETURN_WAVES;
    expect(warned({ waves: lit })).toEqual([]);
    expect(errs(returnContentOf(modelTrace("16:9", { waves: lit })))).toEqual([]);
  });
});

describe("returnMerge and returnRadius: their canaries fail", () => {
  test("the design passes both in every aspect", () => {
    for (const a of ASPECTS) {
      expect(errs(returnMergeOf(modelTrace(a)))).toEqual([]);
      expect(errs(returnRadiusOf(modelTrace(a)))).toEqual([]);
    }
  });
  test("revision 1's uniform contraction: every cell at once, shrinking with its radius", () => {
    const all = { s0: 500, ds: 0, T: 110 };
    const f = errs(returnMergeOf(modelTrace("16:9", { sizeLaw: "radius", timing: { returns: { outer: all, middle: all, inner: all, hero: { s0: 500, T: 110 } } } })));
    expect(f.some((e) => /the contacts spread over 2\d frames/.test(e.message))).toBe(true);
    expect(f.some((e) => /the median cell reaches the stone .* (0\.[0-4]\d) of the body's width/.test(e.message))).toBe(true);
  });
  test("a 40° twist that reverses the middle ring", () => {
    const f = errs(returnMergeOf(modelTrace("16:9", { twistDeg: [0, 40, 0] })));
    expect(f.some((e) => /angular velocity changes sign/.test(e.message))).toBe(true);
  });
  test("today's cellAt fade (opacity 1 → 0 over u 0.82–0.96)", () => {
    const f = errs(returnMergeOf(modelTrace("16:9", { fade: { from: 0.82, to: 0.96 } })));
    expect(f.some((e) => /cells fade before the stone hides them/.test(e.message))).toBe(true);
  });
  test("returnRadius: a push that cancels the cells' inward travel (CR-08)", () => {
    const field = buildReturnField("16:9", { depth: [1, 1, 1] });
    const cam = returnCameraSpec("16:9", { geometry: field.geometry });
    // the camera pushes in on the stone ×10 through the merge (R430–R630, E-move), the stone held where it is
    const t = traceReturn(
      field,
      (r) => {
        const c = returnCameraAt(cam, r);
        const k = Math.exp(Math.log(10) * E_MOVE(Math.min(1, Math.max(0, (r - 430) / 200))));
        return { x: c.x / k, y: c.y / k, zoom: Math.exp(c.L) * k };
      },
      { to: 720 },
    );
    expect(errs(returnRadiusOf(t)).some((e) => /falls .* on average to first contact \(70 %/.test(e.message))).toBe(true);
  });
});

describe("cellText: its canary fails", () => {
  const tight: ReturnCellSpec = { ...RETURN_WAVES.out1[0]!, id: "C6-tight", standIn: { kind: "slot", captureId: "kit-C6", label: "a card's title row, cropped tight", w: 160, h: 120 }, textPx: 18 };
  const waves = { ...RETURN_WAVES, out1: [tight, ...RETURN_WAVES.out1.slice(1)] };
  test("the design passes it in every aspect; the same tight crop at the outer ring's size passes", () => {
    for (const a of ASPECTS) {
      expect(errs(cellTextOf(modelTrace(a)))).toEqual([]);
      expect(errs(cellTextOf(modelTrace(a, { waves })))).toEqual([]);
    }
  });
  test("an inner-size cell at the outer ring's zoom (a tight crop of a card at 144 px on the outer ring)", () => {
    for (const a of ASPECTS) {
      const cell = RETURN_GEOMETRY[a].cell;
      const f = errs(cellTextOf(modelTrace(a, { waves, geometry: { cell: [cell[0], cell[1], cell[0]] } })));
      expect(f.some((e) => /C6-tight's text reaches (1[6-9]|2\d)\.\d px/.test(e.message))).toBe(true);
    }
  });
});

describe("blinkPlaced: its canaries fail", () => {
  test("revision 1's offset of 230 (a blink on R481, as the merge begins)", () => {
    const f = errs(blinkPlaced(planFor("16:9", { clockOffset: 230 })));
    expect(f.some((e) => /a blink on R48[01]\.\d falls in R430–R496/.test(e.message))).toBe(true);
  });
  test("an offset of 0 (no blink on R646)", () => {
    expect(errs(blinkPlaced(planFor("16:9", { clockOffset: 0 }))).some((e) => /no blink starts within a frame of R646/.test(e.message))).toBe(true);
  });
});

describe("joinPose: its canaries fail", () => {
  test("a cut into a fresh field", () => {
    const f = errs(joinPose(planFor("16:9", { fresh: true })));
    expect(f.some((e) => /off the frame's edges/.test(e.message))).toBe(true);
  });
  test("an avatar inside the first cell (S24's stone on its last frame)", () => {
    const c = climaxFor("16:9");
    const kiln = c.shots[1]!;
    const at = c.exit!.pose;
    const withStone: ScenePlan = { ...c, shots: [c.shots[0]!, { ...kiln, stone: { ...kiln.stone!, at: { x: at.x, y: at.y } } }] };
    expect(errs(joinPose(planFor("16:9", { climax: withStone }))).some((e) => /a second stone/.test(e.message))).toBe(true);
  });
  test("a Return planned with no S24 to continue", () => {
    expect(errs(joinPose(planFor("16:9", { climax: undefined }))).some((e) => /continues no S24/.test(e.message))).toBe(true);
  });
  test("S24 ends on its hold's glide, on the middle of a bar, into the Return; the default still leaves on an E-leave", () => {
    const c = climaxFor("16:9");
    const g = demoGrid(STRETCH.climax, 300, 6000, FPS);
    expect(halfBars(g)).toContain(c.duration);
    expect(g.downbeats).not.toContain(c.duration);
    const cut = planClimax({ ...SIZE["16:9"], fps: FPS, grid: g, peak: 300 });
    expect(g.downbeats).toContain(cut.duration);
    const vHold = Math.hypot(c.exit!.vel.x, c.exit!.vel.y) * c.exit!.pose.zoom;
    const vLeave = Math.hypot(cut.exit!.vel.x, cut.exit!.vel.y) * cut.exit!.pose.zoom;
    expect(vHold).toBeLessThan(1);
    expect(vLeave).toBeGreaterThan(5);
  });
});

/* ---------------------------------------------------------------- existing checks cover the Return ------------ */

describe("cameraFloor, stoneCount and groundCoverage cover the Return's shot", () => {
  const p = planOf("16:9");
  const field = p.shots[0]!;
  test("cameraFloor: a Return whose camera stops fails inside the Return's span", () => {
    const frozen: ScenePlan = { ...p, shots: [{ ...field, camera: new VelocityCamera(field.camera.pose(300)) }, p.shots[1]!] };
    const f = errs(checkPlan(frozen), "cameraFloor");
    expect(f.length).toBeGreaterThan(0);
    expect(f.some((e) => (e.frame ?? Infinity) < field.to)).toBe(true);
  });
  test("stoneCount: a field whose stone is not the title stone's size fails through the iris", () => {
    // (a stone larger than the title's: the iris opens from 26 px, so a smaller one is already inside it)
    const f = errs(checkPlan(planFor("16:9", { field: { stonePx: 260 } })), "stoneCount");
    expect(f.length).toBeGreaterThan(0);
    expect(f[0]!.frame).toBeGreaterThanOrEqual(field.to);
  });
  test("groundCoverage: a riverbed too small for the pull-back's widest pose fails", () => {
    const small: ScenePlan = { ...p, shots: [{ ...field, groundRect: { x: -900, y: -600, w: 1800, h: 1125 } }, p.shots[1]!] };
    expect(errs(checkPlan(small), "groundCoverage").length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- R2: the montage act's exemption ------------- */

describe("R2: the Return's span is exempt from cutRate, holds and readingLoad, and nothing else is", () => {
  const p = planOf("16:9");
  const span = returnOf(p)!.span;
  const field = p.shots[0]!;
  const title = p.shots[1]!;
  const box = { left: 200, top: 900, align: "left" as const };
  const line = (id: string, at: number, exitAt: number): TypeSpec => ({ id, text: "Three short words", tier: "functional", at, exitAt, box, kind: "film", exit: "blur" });
  const seams = (from: number) => Array.from({ length: 30 }, (_, k) => ({ at: from + 10 * k, kind: "momentum" as const, frames: 0, out: "x", in: "y" }));
  test("the exemption names exactly the three checks", () => {
    expect([...R2_EXEMPT]).toEqual(["cutRate", "holds", "readingLoad"]);
  });
  test("cutRate: 30 cuts inside the span are exempt; the same 30 after it are not", () => {
    expect(errs(checkPlan({ ...p, seams: [...p.seams, ...seams(span.from + 100)] }), "cutRate")).toEqual([]);
    expect(errs(checkPlan({ ...p, seams: [...p.seams, ...seams(span.to + 100)] }), "cutRate").length).toBeGreaterThan(0);
  });
  test("holds: a line on screen too briefly is exempt inside the span; after it, or straddling its end, it is not", () => {
    expect(errs(checkPlan({ ...p, types: [...p.types, line("X", 200, 205)] }), "holds")).toEqual([]);
    expect(errs(checkPlan({ ...p, types: [...p.types, line("X", 1300, 1305)] }), "holds").some((e) => /Three short words/.test(e.message))).toBe(true);
    expect(errs(checkPlan({ ...p, types: [...p.types, line("X", span.to - 4, span.to + 1)] }), "holds").some((e) => /Three short words/.test(e.message))).toBe(true);
  });
  test("readingLoad: 40 words in a second are exempt in the Return's shot, not in the title's", () => {
    const read = (from: number) => ({ id: "R", rect: { x: 0, y: 0, w: 400, h: 100 }, from, to: from + 60, words: 40, textPx: 14 });
    expect(errs(checkPlan({ ...p, shots: [{ ...field, reads: [read(200)] }, title] }), "readingLoad")).toEqual([]);
    expect(errs(checkPlan({ ...p, shots: [field, { ...title, reads: [read(1300)] }] }), "readingLoad").length).toBeGreaterThan(0);
  });
  test("a plan with no Return keeps every rule (the climax with 30 extra cuts fails cutRate)", () => {
    const c = climaxFor("16:9");
    expect(errs(checkPlan({ ...c, seams: [...c.seams, ...seams(100)] }), "cutRate").length).toBeGreaterThan(0);
  });
});
