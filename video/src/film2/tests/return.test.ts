// The Return (MONTAGE_DESIGN revision 2; OVERRIDES §61): its data, plan and checks. Every Return check is proved on a
// planted canary that FAILS on the bad case the design names, and passes the Return as planned in all three aspects
// (one named case is caught elsewhere: the bloom run at twice its speed fails returnSchedule's 30-px travel limit, while
// returnWindows' model gives it IRIS's warning level only, as it gives the design's own bloom in 16:9); cameraFloor,
// stoneCount and groundCoverage are shown to cover the Return's shot; R2's exemption from cutRate, holds and readingLoad
// is shown to hold inside the Return's span only; and the post-credit scene (D157) plans after the Return's end card.
import { describe, expect, test } from "bun:test";
import { VelocityCamera, worldToFrame } from "../motion/camera";
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
import { RETURN_CELLS, RETURN_WAVES, SI, manifestProblems, refuseBadManifest, type ReturnCellSpec } from "../setpieces/returnCells";
import { RETURN_LUM } from "../setpieces/returnLum";
import { RETURN_GEOMETRY, RETURN_TIMING, buildReturnField, cellPoseAt, hairlineAt, hungarian, localOfR, pairWave, slotOrder, type FieldCell, type ReturnFieldOptions } from "../setpieces/returnField";
import { RETURN_BLINK_R, RETURN_EVENTS, RETURN_FIELD_SCALE, RETURN_FILM_S, RETURN_MUSIC, blinkKeepClear, filmFrameOfR, planReturn, returnCameraAt, returnCameraSpec, returnGrid, type ReturnCameraSpec, type ReturnOptions } from "../setpieces/returnPlan";
import {
  R2_EXEMPT,
  RETURN_CHECKS,
  blinkPlaced,
  cellTextOf,
  coverageSwings,
  irisExtended,
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
import { cellPoseR, cellReachPx, cellScreenAt, cellsOnScreen, firstContactR, hairlineReturnStart, hairlineScreenAt, rOfLocal, slotXY, swapMarks, tonedMatteK } from "../setpieces/returnField";
import { findTilePops } from "../qa/luma";
import { FlashRgb, flashFails } from "../qa/flash-rgb";
import { ReelScan } from "../qa/reel-scan";
import { RETURN_THUMB_LONG, drawnLive, drawnLumOf, missingReturnThumbs, returnThumbJobs, returnThumbPath, returnThumbSigOf, ringOfWave, thumbSlug } from "../setpieces/returnThumbs";
import { TONED_W_END } from "../setpieces/returnPlan";
import { DEMO_JOINS, demoPlans, demoReturnVariant } from "../setpieces/demo/plans";

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
    // 16: A2's (the pebble itself, RV-01) and F11*'s (the same conversation as F12's Verified, RV-05) are slots now
    expect(RETURN_CELLS.filter((c) => c.standIn.kind === "still").length).toBe(16);
  });
  test("RV-01: the cells whose 2.0.0 captures picture the companion are marked; none is drawn as the pebble now", () => {
    expect(RETURN_CELLS.filter((c) => c.avatar === "expected").map((c) => c.id)).toEqual(["A6", "A3", "A10*", "X3", "A5", "A12", "A13", "A2"]);
    for (const id of ["A2", "A3"]) expect(RETURN_CELLS.find((c) => c.id === id)!.standIn.kind).toBe("slot");
    expect(RETURN_CELLS.some((c) => c.standIn.kind === "engine" || (c.standIn.kind === "still" && !!c.standIn.avatarPx))).toBe(false);
  });
  test("RV-06: no label drawn into a cell's image names Stealth (the canary: B9's label as it was); the models crop leaves out the token window", () => {
    const b9 = RETURN_CELLS.find((c) => c.id === "B9")!;
    const old = { ...b9, standIn: { kind: "slot" as const, captureId: "kit-B9", label: "the Settings sidebar, cropped above Privacy & Stealth", w: 480, h: 360 } };
    expect(() => refuseBadManifest(RETURN_CELLS.map((c) => (c.id === "B9" ? old : c)))).toThrow(/B9's image would draw "Stealth"/);
    expect(manifestProblems([{ ...b9, standIn: { kind: "slot", captureId: "kit-X", label: "a 4,096-token window", w: 480, h: 360 } }])).toEqual([expect.stringMatching(/would draw "token"/)]);
    // B2+C1-C3: the published Settings › Models crop, below the model's row (its details line, "4,096-token window",
    // ends at 97 CSS px) and left of its Rest model button (from 306)
    const ways = RETURN_CELLS.find((c) => c.id === "B2+C1-C3")!.standIn;
    expect(ways.kind === "still" && ways.crop.y >= 97 && ways.crop.x + ways.crop.w <= 306).toBe(true);
  });
  test("the first cell is S24's own last frame; the slices are 6–12 frames at 1× (J6+F14, A5, X5: 8, RV-11)", () => {
    expect(RETURN_CELLS[0]!.id).toBe("G3");
    expect(RETURN_CELLS[0]!.standIn.kind).toBe("frame");
    expect(RETURN_CELLS.filter((c) => c.slice).map((c) => `${c.id}:${c.slice!.frames}`)).toEqual(["J6+F14:12", "X5:8", "A5:12"]);
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
    // in the manifest's order (pairing off, as the design's reference model has it)
    const declared = new Map(buildReturnField("16:9", { pair: false }).cells.map((c) => [c.id, c]));
    expect([declared.get("J1*")!.enter, declared.get("J1*")!.settle, declared.get("J1*")!.slot]).toEqual([120, 160, 0]);
    expect([declared.get("F9")!.enter, declared.get("F9")!.settle]).toEqual([172.5, 212.5]);
    expect(declared.get("A14*")!.swapIn).toBe(240);
    expect(declared.get("I6a")!.swapIn).toBe(321);
    expect(declared.get("X5")!.swapIn).toBe(366 + 12 * 7);
    expect(Math.max(...field.cells.map((c) => c.swapIn ?? -1))).toBe(450);
    // paired by luminance (§2.4), the swaps keep their frames and slots; only which cell takes each changes
    const frames = (f: ReturnType<typeof buildReturnField>) => f.cells.filter((c) => c.swapIn !== null).map((c) => `${c.wave} ${c.ring}:${c.slot}@${c.swapIn}`).sort();
    expect(frames(field)).toEqual(frames(buildReturnField("16:9", { pair: false })));
  });
  test("every image the view draws is measured as made (returnLum.ts holds each one's signature: after a stand-in changes, run return-thumbs.ts --measure)", () => {
    expect(RETURN_CELLS.filter((c) => !drawnLive(c) && drawnLumOf({ spec: c }).mean === undefined).map((c) => c.id)).toEqual([]);
  });
  test("RV-02: each swap wave is paired by luminance within the card rule; the steps fall (largest 0.046 → 0.026), the waves' families mostly stand", () => {
    const step = (f: ReturnType<typeof buildReturnField>) =>
      f.cells
        .filter((c) => c.swapIn !== null)
        .map((c) => {
          const prev = f.cells.find((x) => x.ring === c.ring && x.slot === c.slot && x.swappedOutAt === c.swapIn)!;
          return Math.abs(drawnLumOf(c).mean! - drawnLumOf(prev).mean!);
        });
    const declared = buildReturnField("16:9", { pair: false });
    expect(Math.max(...step(field))).toBeLessThan(Math.max(...step(declared)));
    expect(Math.max(...step(field))).toBeLessThanOrEqual(0.03);
    expect(field.pairing.map((w) => [w.wave, w.paired])).toEqual([["mid2", true], ["mid3", true], ["out2", true]]);
    expect(field.pairing.reduce((a, w) => a + w.moved, 0)).toBeLessThanOrEqual(8);
    // cards only on even slots, so never neighbours
    for (const c of field.cells) if (c.spec.card && c.swapIn !== null) expect(c.slot % 2).toBe(0);
  });
  test("pairWave: the Hungarian assignment keeps the card rule, keeps the manifest's order where steps are within the dead band, and pairs nothing unmeasured", () => {
    expect(hungarian([[4, 1, 3], [2, 0, 5], [3, 2, 2]])).toEqual([1, 0, 2]);
    const mk = (id: string, card: boolean, mean: number) => ({ ...RETURN_CELLS[20]!, id, card, meanLum: mean });
    const out = [mk("o0", false, 0.9), mk("o1", false, 0.8), mk("o2", false, 0.9)];
    const lum = (c: ReturnCellSpec) => c.meanLum;
    // a dark cell goes where a dark cell was; the card stays on its even slot
    const r = pairWave([mk("i0", false, 0.8), mk("i1", true, 0.9), mk("i2", false, 0.9)], out, [0, 1, 2], lum);
    expect(r.paired).toBe(true);
    expect(r.order[1]).toBe(0); // the dark incoming cell (i0) takes slot 1, where the dark o1 was
    expect(r.order.indexOf(1) % 2).toBe(0); // the card (i1) on an even slot
    // within the dead band: the manifest's order
    expect(pairWave([mk("a", false, 0.905), mk("b", false, 0.91)], [mk("x", false, 0.91), mk("y", false, 0.905)], [0, 2], lum).order).toEqual([0, 1]);
    // an unmeasured cell: the manifest's order, named
    expect(pairWave([{ ...mk("u", false, 0.9), meanLum: undefined }], [mk("x", false, 0.9)], [0], lum)).toEqual({ order: [0], paired: false, unmeasured: ["u"] });
  });
  test("the merge: outer from R430 + 3.3j, middle R494 + 3.4j, inner R540 + 4.2j, the kept card on R566 over 90–93 frames", () => {
    const rets = field.cells.filter((c) => c.retStart !== null);
    expect(rets.length).toBe(46);
    expect(Math.min(...rets.map((c) => c.retStart!))).toBe(430);
    // (the kept card's return is 93, 90 and 90 frames in 16:9, 1:1 and 9:16: hidden on R639 in each at the design's size,
    // RV-08; on R640 in the field ×1.1 the film plans, the blink 6.1 frames after)
    expect([byId.get("G3")!.retStart, byId.get("G3")!.retT]).toEqual([566, 93]);
    expect(["1:1", "9:16"].map((a) => buildReturnField(a as Aspect).cells.find((c) => c.spec.hero)!.retT)).toEqual([90, 90]);
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
    expect(hairlineAt(2, localOfR(500, FPS), f)!.a).toBe(f.geometry.ell[2][0]);
    expect(f.geometry.ell[2][0]).toBeCloseTo(RETURN_GEOMETRY["16:9"].ell[2][0] * RETURN_FIELD_SCALE, 9);
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
      // only IRIS's warning level (the model's bloom in 16:9), the 2.0.0 crops not measured yet (red, luminance) and the
      // captures expected to picture the companion (RV-01) warn
      // and the stand-ins cropped from one published conversation at two moments (RV-05: placeholders, the lead's call)
      expect(r.warnings.filter((w) => !((w.check === "returnWindows" && /IRIS's warning level/.test(w.message)) || (w.check === "returnContent" && /not measured|expected to picture the companion|pairs of stand-ins show two moments/.test(w.message))))).toEqual([]);
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
  test("its place in the film is the score lane's beat sheet's (cue sheet revision 3): every mark and bar line on its frame", () => {
    // BEAT_SHEET.json `return` (revision 3, 28 Oct; OVERRIDES §68: 232 frames later than revision 2): the marks R−60 … R720 and the bar lines under the Return, in film frames at 60 fps
    const marks: [number, number][] = [[-60, 6534], [0, 6594], [120, 6714], [240, 6834], [360, 6954], [480, 7074], [600, 7194], [646, 7240], [658, 7252], [690, 7284], [720, 7314]];
    expect(marks.map(([r]) => filmFrameOfR(r, 60))).toEqual(marks.map(([, f]) => f));
    // B2 bars 47–52, then A4 bars 80–83 (J5 on bar 80)
    const bars = [6474, 6594, 6714, 6834, 6954, 7074, 7194, 7314, 7434];
    const start = filmFrameOfR(-60, 60);
    const downbeats = new Set(returnGrid(FPS).downbeats.map((x) => Math.round(x)));
    for (const f of bars) expect(downbeats.has(f - start)).toBe(true);
    // its seconds are the beat sheet's (1:48.90, 1:49.90, 1:57.90, 2:01.90) to within 4 ms, and the R-frames' spans within a fifth of a frame
    expect([RETURN_FILM_S.start, RETURN_FILM_S.r0, RETURN_FILM_S.j5, RETURN_FILM_S.title].map((s, i) => Math.abs(s - [108.90, 109.90, 117.90, 121.90][i]!) < 0.004)).toEqual([true, true, true, true]);
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
      // (86, 81 and 79 frames in the field ×1.1 the film plans; 89, 86 and 84 at the design's size; the rule is 60)
      expect(m.minOnScreen).toBeGreaterThanOrEqual(79);
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
  test("the design passes it in the model, but for its entries that begin inside the frame (RV-02: fitEntries' canary)", () => {
    for (const a of ASPECTS) expect(errs(returnScheduleOf(modelTrace(a))).map((e) => /entries begin inside the frame/.test(e.message))).toEqual([true]);
  });
  test("RV-02: as planned, every entry begins out of frame, its shadow too (1:1's N1 began inside it on R204 and popped 3.3 levels)", () => {
    for (const a of ASPECTS) {
      expect(scheduleMetrics(planTrace(planOf(a))!).entriesInFrame).toEqual([]);
      const unfit = scheduleMetrics(planTrace(planFor(a, { fitEntries: false }))!).entriesInFrame;
      // (5, 4 and 4 entries in the field ×1.1 the film plans; 7, 8 and 7 at the design's size, where the renders showed it)
      expect(unfit.length).toBeGreaterThanOrEqual(4);
      expect(scheduleMetrics(planTrace(planFor(a, { fitEntries: false, fieldScale: 1 }))!).entriesInFrame.length).toBeGreaterThanOrEqual(7);
    }
    expect(scheduleMetrics(planTrace(planFor("1:1", { fitEntries: false }))!).entriesInFrame).toContain("N1 on R204");
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

  // The review's RV-03: the motion path counted a swing only from the window's first value while the coverage stayed
  // within 0.25 of it, so a gradual swing of 0.25–0.5 was never counted; nothing drove the motion path, IRIS's extended
  // rule or a synchronous group to fail; and a slide swap was counted on its incoming cell alone.
  /** A synthetic trace on the model's frames: `rectsAt(r)` are the cells drawn on R-frame r (settled, unhidden). */
  const synthTrace = (rectsAt: (r: number) => { c?: FieldCell; s: { x: number; y: number; w: number; h: number } }[], cells?: FieldCell[]): ReturnTrace => {
    const t = modelTrace("16:9");
    const c0 = t.field.cells[5]!;
    const frames = t.frames.map((fr) => ({
      r: fr.r,
      pose: fr.pose,
      cells: rectsAt(fr.r).map(({ c, s }) => ({ c: c ?? c0, p: { cell: c ?? c0, rect: s, c: { x: 0, y: 0 }, state: "settled" as const, depth: 1, swapBlur: 0, opacity: 1 }, share: 1, s })),
    }));
    return { ...t, field: { ...t.field, cells: cells ?? [{ ...c0, swapIn: null }] }, frames, at: (r) => frames[Math.round(r) + 60] };
  };
  /** A 150 × 112 cell (34 % of a 256 × 192 window) sliding into the window at (40, 40) over `slide` frames, holding, sliding out, every `cycle` frames over [from, to). */
  const sliding = (cycle: number, slide: number, from: number, to: number) => (r: number) => {
    const W = 150;
    const X0 = 40;
    let x = X0 - W - 10;
    if (r >= from && r < to) {
      const k = (r - from) % cycle;
      const hold = Math.floor((cycle - 2 * slide) / 2);
      if (k < slide) x = X0 - W + (W * (k + 1)) / slide;
      else if (k < slide + hold) x = X0;
      else if (k < 2 * slide + hold) x = X0 - (W * (k - slide - hold + 1)) / slide;
    }
    return [{ s: { x, y: 40, w: W, h: 112 } }];
  };
  test("coverageSwings counts a gradual swing of 0.25–0.5 from a window's first value (the old counter missed it)", () => {
    const rise = [0, 0.057, 0.114, 0.171, 0.228, 0.285, 0.342, 0.342];
    expect(coverageSwings(rise)).toEqual([5]);
    // down from a start, then up past it: one swing each way
    expect(coverageSwings([0.3, 0.2, 0.1, 0.04, 0.1, 0.2, 0.31, 0.31])).toEqual([3, 6]);
    // under 0.25 either way: none
    expect(coverageSwings([0.1, 0.0, 0.2, 0.05, 0.24])).toEqual([]);
  });
  test("a cell sliding in and out of a window over 6 frames (and over 3), 4 times a second: 8 transitions, WCAG's fail", () => {
    for (const slide of [6, 3]) {
      const t = synthTrace(sliding(15, slide, 300, 360));
      const w = windowLoads(t).find((x) => x.window === "256x192")!;
      expect(w.motionWorst).toBe(8);
      expect(errs(returnWindowsOf(t)).some((e) => /8 transitions in 60 frames in a 256x192 window/.test(e.message))).toBe(true);
    }
  });
  test("5 transitions a second for 4.5 s: IRIS's extended failure; for 3.5 s: its warning level only", () => {
    const long = synthTrace(sliding(24, 6, 0, 270));
    // (5 or 6 in any 60 frames, by where a window sits: never WCAG's fail; only the extended rule fails it)
    const worst = windowLoads(long).find((x) => x.window === "256x192")!.worst;
    expect(worst >= 5 && worst <= 6).toBe(true);
    expect(errs(returnWindowsOf(long)).map((e) => /IRIS's extended failure in a 256x192 window/.test(e.message))).toEqual([true]);
    const short = synthTrace(sliding(24, 6, 0, 210));
    expect(errs(returnWindowsOf(short))).toEqual([]);
    expect(returnWindowsOf(short).some((x) => x.level === "warn" && /IRIS's warning level/.test(x.message))).toBe(true);
    expect(irisExtended([], 0, 600)).toBe(false);
  });
  test("a synchronous pair: two swaps a frame apart, each under 25 % of a window, together over it, four times in a second", () => {
    const base = modelTrace("16:9").field.cells.filter((c) => c.swapIn !== null);
    // eight swapping cells on eight slots of their own (no predecessor), crossing in pairs at R300/301, R312/313 …
    const cells: FieldCell[] = Array.from({ length: 8 }, (_, k) => ({ ...base[k]!, ring: 1, slot: 100 + k, swapIn: 292 + 12 * Math.floor(k / 2) + (k % 2), swappedOutAt: null }));
    const rect = (k: number) => ({ x: 40 + (k % 2) * 100, y: 60, w: 90, h: 70 }); // 12.8 % of a 256 × 192 window each
    const t = synthTrace((r) => cells.flatMap((c, k) => (r === c.swapIn! + 8 ? [{ c, s: rect(k) }] : [])), cells);
    const w = windowLoads(t).find((x) => x.window === "256x192")!;
    expect(w.motionWorst).toBe(0);
    expect(w.swapWorst).toBe(8);
    expect(errs(returnWindowsOf(t)).some((e) => /8 transitions in 60 frames in a 256x192 window .*swaps 8/.test(e.message))).toBe(true);
  });
  test("a slide swap counts its outgoing and incoming cells together: 22 % each, 29 % as one, four in a second fail", () => {
    const base = modelTrace("16:9").field.cells.filter((c) => c.swapIn !== null);
    const outs: FieldCell[] = Array.from({ length: 4 }, (_, k) => ({ ...base[k]!, id: `out${k}`, ring: 2, slot: 200 + k, swapIn: null, swappedOutAt: 300 + 12 * k }));
    const ins: FieldCell[] = Array.from({ length: 4 }, (_, k) => ({ ...base[4 + k]!, id: `in${k}`, ring: 2, slot: 200 + k, swapIn: 300 + 12 * k, swappedOutAt: null }));
    const at = (dx: number) => ({ x: 60 + dx, y: 60, w: 120, h: 90 }); // 10,800 px²: 22 % of a 256 × 192 window
    const t = synthTrace(
      (r) => [
        ...outs.flatMap((c) => (r === c.swappedOutAt! + 7 ? [{ c, s: at(18) }] : [])),
        ...ins.flatMap((c) => (r === c.swapIn! + 8 ? [{ c, s: at(-18) }] : [])),
      ],
      [...outs, ...ins],
    );
    const w = windowLoads(t).find((x) => x.window === "256x192")!;
    expect(w.swapWorst).toBe(8);
    expect(errs(returnWindowsOf(t)).length).toBeGreaterThan(0);
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
    expect(f.some((e) => /the red cell I6a swaps in on R3\d\d/.test(e.message))).toBe(true);
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
  test("the light-theme rule holds on what is drawn: unmeasured images warn; measured stand-ins hold it; the 2.0.0 crops warn until measured", () => {
    const warned = (fo: ReturnFieldOptions, re: RegExp) => returnContentOf(modelTrace("16:9", fo)).filter((x) => x.level === "warn" && re.test(x.message));
    const declared = /light-theme rule is declared, not measured/;
    const crops = /2\.0\.0 crops are not measured yet/;
    // no image measured: all 84 drawn from an image (the first cell is S24's own frame)
    expect(warned({ lum: {} }, declared).map((x) => /(\d+) of 84 drawn cells/.exec(x.message)?.[1])).toEqual(["84"]);
    // every image measured light: the drawn rule holds; the 2.0.0 crops still warn
    const lightTable = Object.fromEntries(RETURN_CELLS.map((c) => returnThumbSigOf(c)).filter((x): x is string => !!x).map((sig) => [sig, { id: sig, mean: 0.86, red: 0 }]));
    expect(warned({ lum: lightTable }, declared)).toEqual([]);
    expect(warned({ lum: lightTable }, crops).length).toBe(1);
    expect(errs(returnContentOf(modelTrace("16:9", { lum: lightTable })))).toEqual([]);
    // every 2.0.0 crop measured light: neither warns
    const lit = Object.fromEntries(Object.entries(RETURN_WAVES).map(([k, v]) => [k, v.map((c) => ({ ...c, meanLum: 0.86 }))])) as unknown as typeof RETURN_WAVES;
    expect(warned({ waves: lit }, declared)).toEqual([]);
    expect(warned({ waves: lit }, crops)).toEqual([]);
    expect(errs(returnContentOf(modelTrace("16:9", { waves: lit })))).toEqual([]);
  });
  // RV-01: one stone from the climax to the end card; both stone checks were blind to a pebble inside a cell's picture
  test("RV-01: A2's stand-in as it was (the pebble itself, 87 CSS px of its 112-px crop) pictures a second stone", () => {
    for (const a of ASPECTS) {
      const f = errs(returnContentOf(modelTrace(a, { waves: swapCell("out2", "A2", { standIn: SI.gaze }) })));
      expect(f.some((e) => /A2 pictures the pebble (\d+) px wide .*its image shows the companion's avatar/.test(e.message))).toBe(true);
    }
  });
  test("RV-01: A3 as it was (Pebble's engine drawn in the cell, on its own clock) pictures a second stone", () => {
    const f = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("mid1", "A3", { standIn: { kind: "engine", pose: "testing", w: 480, h: 360 } }) })));
    expect(f.some((e) => /A3 pictures the pebble (\d+) px wide .*Pebble's engine drawn in the cell/.test(e.message))).toBe(true);
  });
  test("RV-01: a crop whose avatar stays a speck (6 px or less at 1080 on every frame) passes; the expected ones warn by name", () => {
    // an outer cell is at most 124 px at 1080 (RETURN_THUMB_LONG), so 4 CSS px of a 112-px crop stays under 6 px
    const speck = { ...SI.gaze, avatarPx: 4 };
    expect(errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out2", "A2", { standIn: speck }) }))).filter((e) => /pictures the pebble/.test(e.message))).toEqual([]);
    const w = returnContentOf(modelTrace("16:9")).filter((x) => x.level === "warn" && /expected to picture the companion's avatar/.test(x.message));
    expect(w.length).toBe(1);
    expect(w[0]!.message).toMatch(/8 cells' 2\.0\.0 captures .*\(A6, A3, A10\*, X3, A5, A12, A13, A2\)/);
  });
  test("RV-11: a slice plays at 1×, ending on its moment as its cell settles, wholly while it is drawn (canaries: 2×, X5's 12 frames)", () => {
    for (const a of ASPECTS) {
      const info = returnContentOf(modelTrace(a)).find((x) => x.level === "info" && /the slices at 1×/.test(x.message))!;
      expect(info.message).toMatch(/J6\+F14 R-?\d+–R-?\d+, X5 R459–R466, A5 R224–R235/);
    }
    const twice = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("out1", "A5", { slice: { frames: 12, rate: 2 } }) })));
    expect(twice.some((e) => /A5's slice plays at 2× \(1× only/.test(e.message))).toBe(true);
    const long = errs(returnContentOf(modelTrace("16:9", { waves: swapCell("mid3", "X5", { slice: { frames: 12 } }) })));
    expect(long.some((e) => /X5's slice of 12 frames would start on R455, before the cell is drawn \(R458\).*at most 9 frames fit/.test(e.message))).toBe(true);
  });
  test("RV-02: a swap's luminance step over 0.05 fails: A2's pebble as it was, into B7's slot (the reels' tile pop)", () => {
    const waves = swapCell("out2", "A2", { standIn: SI.gaze });
    const a2 = waves.out2.find((c) => c.id === "A2")!;
    const lum = { ...RETURN_LUM, [returnThumbSigOf(a2)!]: { id: "A2", mean: 0.694, red: 0 } };
    for (const pair of [false, true]) {
      const f = errs(returnContentOf(modelTrace("16:9", { waves, lum, pair })));
      // (in the manifest's order into B7's slot, 0.212; paired, into the darkest outgoing still's, still over 0.16)
      expect(f.some((e) => /A2 swaps in for \S+ on R\d+: a step of 0\.[12]\d\d in mean relative luminance/.test(e.message))).toBe(true);
    }
    // the design as measured passes, paired: its largest step is reported
    const info = returnContentOf(modelTrace("16:9")).find((x) => x.level === "info" && /swaps; the largest step/.test(x.message))!;
    expect(info.message).toMatch(/the largest step in mean relative luminance 0\.0[0-4]\d/);
  });
  test("RV-02: the slots' old darker look (0.84 against the stills' 0.86–0.93) fails it, even paired", () => {
    const old = Object.fromEntries(Object.entries(RETURN_LUM).map(([k, v]) => [k, RETURN_CELLS.find((c) => c.id === v.id)?.standIn.kind === "slot" ? { ...v, mean: 0.8445 } : v]));
    const f = errs(returnContentOf(modelTrace("16:9", { lum: old })));
    expect(f.filter((e) => /a step of 0\.\d+ in mean relative luminance/.test(e.message)).length).toBeGreaterThan(0);
  });
  test("RV-05: CR-11 on what is drawn: F11*'s published held card as it was sits beside F12's Verified, one conversation at two moments", () => {
    const pairs = (fo: ReturnFieldOptions) => returnContentOf(modelTrace("16:9", fo)).find((x) => x.level === "warn" && /pairs of stand-ins show two moments/.test(x.message))?.message ?? "";
    expect(pairs({ waves: swapCell("mid2", "F11*", { standIn: SI.heldCard }) })).toMatch(/F12\+F3\+F1 \(done, verified\) and F11\* \(held, not verified\)/);
    // D3's records as they were (after a forget) beside D1's Settings › Memory (before it)
    const forgotten = { ...SI.forgetRecords, src: "ui/crop-memory-records-forgotten@2x.png", source: { take: SI.forgetRecords.source.take, moment: "a record forgotten" } };
    expect(pairs({ waves: swapCell("out1", "D3", { standIn: forgotten }) })).toMatch(/D3 \(a record forgotten\) and D1 \(before a forget\)|D1 \(before a forget\) and D3 \(a record forgotten\)/);
    // as planned: F11* is a slot and D3 shows the records before the forget: neither is listed
    expect(pairs({})).not.toMatch(/F11\*|D3/);
  });
  test("RV-01/RV-05: A2's stand-in as it was, measured as drawn (0.694 on the page ground), fails the light rule", () => {
    const waves = swapCell("out2", "A2", { standIn: SI.gaze });
    const a2 = waves.out2.find((c) => c.id === "A2")!;
    const lum = { [returnThumbSigOf(a2)!]: { id: "A2", mean: 0.694, red: 0 } };
    expect(errs(returnContentOf(modelTrace("16:9", { waves, lum }))).some((e) => /A2's mean relative luminance is 0\.69 \(its stand-in, as drawn\)/.test(e.message))).toBe(true);
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
  test("RV-08: the kept card's return at the design's 92 frames in every aspect (hidden R638, R641, R641: the blink 8.1 and 5.1 frames after)", () => {
    // (at the design's size, where the review found it)
    const flat = { fieldScale: 1, field: { timing: { returns: { ...RETURN_TIMING.returns, hero: { s0: 566, T: 92 } } } } };
    for (const a of ["1:1", "9:16"] as const) expect(errs(blinkPlaced(planFor(a, flat))).some((e) => /falls 5\.1 frames after the kept card is hidden \(R641\): 6–8/.test(e.message))).toBe(true);
    expect(errs(blinkPlaced(planFor("16:9", flat))).some((e) => /falls 8\.1 frames after the kept card is hidden \(R638\)/.test(e.message))).toBe(true);
    // with its return at 93, 90 and 90 frames: hidden on R639 in every aspect at the design's size, the blink 7.1 frames
    // after; in the field ×1.1 the film plans, its slot is 10 % further out: hidden on R640, the blink 6.1 frames after
    // (inside §2.7's 6–8); the card still the last to return
    for (const a of ASPECTS) {
      expect(errs(blinkPlaced(planFor(a, { fieldScale: 1 })))).toEqual([]);
      expect(blinkPlaced(planFor(a, { fieldScale: 1 })).find((x) => x.level === "info")!.message).toMatch(/the planned blink 7\.1 frames after the kept card is hidden \(R639\)/);
      expect(errs(blinkPlaced(planOf(a)))).toEqual([]);
      expect(blinkPlaced(planOf(a)).find((x) => x.level === "info")!.message).toMatch(/the planned blink 6\.1 frames after the kept card is hidden \(R640\)/);
    }
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
  test("RV-10: a renamed S24 shot (the first cell would draw a shot S24 no longer has)", () => {
    const c = climaxFor("16:9");
    const kiln = c.shots[c.shots.length - 1]!;
    const renamed: ScenePlan = { ...c, shots: [...c.shots.slice(0, -1), { ...kiln, id: "kiln-2" }] };
    expect(errs(joinPose(planFor("16:9", { climax: renamed }))).some((e) => /it draws the shot "kiln", and S24's last shot is "kiln-2"/.test(e.message))).toBe(true);
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

/* ---------------------------------------------------------------- what the view draws (views/ReturnView.tsx) ---- */

describe("the view's model: cells on screen, from thumbnails, the first cell S24's own frame", () => {
  test("the first cell fills the frame on the Return's first frame, in the frame's own px (the view's side of joinPose)", () => {
    for (const a of ASPECTS) {
      const p = planOf(a);
      const field = returnOf(p)!.field;
      const hero = field.cells.find((c) => c.spec.hero)!;
      const s = cellScreenAt(hero, 0, field)!;
      const { w, h } = p.frame;
      expect(Math.max(Math.abs(s.rect.x), Math.abs(s.rect.y), Math.abs(s.rect.x + s.rect.w - w), Math.abs(s.rect.y + s.rect.h - h))).toBeLessThan(1);
      // it is S24's own frame: the view draws S24's plan, whose last frame shows no stone
      expect(returnOf(p)!.join?.source?.id).toBe("climax");
      expect(returnOf(p)!.join?.stonesOnLastFrame).toBe(0);
    }
  });
  test("at most 46 cells are drawn on any frame, back to front by their order, each with a box in the frame", () => {
    for (const a of ASPECTS) {
      const p = planOf(a);
      const field = returnOf(p)!.field;
      let most = 0;
      for (let fr = 0; fr < returnOf(p)!.span.to; fr += 3) {
        const cs = cellsOnScreen(field, fr);
        most = Math.max(most, cs.length);
        for (let i = 1; i < cs.length; i++) expect(cs[i]!.z).toBeGreaterThanOrEqual(cs[i - 1]!.z);
        for (const c of cs) expect(c.rect.w > 0 && c.rect.h > 0 && c.share > 0).toBe(true);
      }
      expect(most).toBeLessThanOrEqual(46);
      expect(most).toBeGreaterThan(40);
    }
  });
  test("RV-04: a hairline moving over 4.6 px a frame where the frame shows it is blurred σ = travel ÷ 7, and its return fades as the carrier's", () => {
    for (const a of ASPECTS) {
      const field = returnOf(planOf(a))!.field;
      const unit = field.view!.unit;
      let blurred = 0;
      for (let f = 0; f < returnOf(planOf(a))!.span.to; f += 2)
        for (const ring of [0, 1, 2]) {
          const h = hairlineScreenAt(ring, f, field);
          if (!h) continue;
          if (h.speed1080 > 4.6) {
            blurred++;
            expect(h.blurPx / unit).toBeCloseTo(h.speed1080 / 7, 6);
          } else expect(h.blurPx).toBe(0);
        }
      expect(blurred).toBeGreaterThan(100);
    }
    // the return's fade: full to 60 % of it, gone by 95 % (it was wholly opaque to 80 %, while moving 30 px a frame and more)
    const field = returnOf(planOf("16:9"))!.field;
    const s = hairlineReturnStart(field, 2);
    const at = (u: number) => hairlineAt(2, localOfR(s + u * RETURN_TIMING.hairlineReturnFrames, FPS), field)!.opacity;
    expect(at(0.5)).toBe(1);
    expect(at(0.8)).toBeLessThan(0.5);
    expect(at(0.95)).toBeCloseTo(0, 6);
  });
  test("RV-02: a cell is drawn while its shadow reaches into the frame, not only its rect (A6 entering 1:1's right edge on R84)", () => {
    // at the design's size, where the reels showed the step (R84), and in the field ×1.1 the film plans (R92)
    for (const [k, r, reach] of [
      [1, 84, 200],
      [RETURN_FIELD_SCALE, 92, 180],
    ] as const) {
      const field = returnOf(planFor("1:1", { fieldScale: k }))!.field;
      const a6 = field.cells.find((c) => c.id === "A6")!;
      let enter = -1;
      for (let f = 0; f < 400 && enter < 0; f++) {
        const s = cellScreenAt(a6, f, field);
        if (s && s.rect.x < field.view!.w) enter = f;
      }
      expect(Math.round(rOfLocal(enter, FPS))).toBe(r);
      // its shadow reaches far into the ground there (216 and 194 px): drawn before its rect enters, so it never steps in
      expect(cellReachPx(cellScreenAt(a6, enter, field)!)).toBeGreaterThan(reach);
      expect(cellsOnScreen(field, enter - 5).some((c) => c.cell.id === "A6")).toBe(true);
      // the canary: culled by its rect alone (as before), A6 and its shadow would appear on that frame at once
      const byRect = (f: number) => field.cells.map((c) => cellScreenAt(c, f, field)).filter((x) => !!x && x.share > 0 && x.rect.x < field.view!.w && x.rect.x + x.rect.w > 0 && x.rect.y < field.view!.h && x.rect.y + x.rect.h > 0);
      expect(byRect(enter - 1).some((c) => c!.cell.id === "A6")).toBe(false);
      expect(byRect(enter).some((c) => c!.cell.id === "A6")).toBe(true);
    }
  });
  test("a cell's blur is the swap's (round) or its own travel's (σ = travel ÷ 7 above 4.6 px a frame), never more", () => {
    const p = planOf("16:9");
    const field = returnOf(p)!.field;
    let swaps = 0;
    let moving = 0;
    for (let fr = 0; fr < returnOf(p)!.span.to; fr += 2)
      for (const c of cellsOnScreen(field, fr)) {
        const speed = Math.hypot(c.vel.x, c.vel.y);
        const sigma = Math.hypot(c.blur.sx, c.blur.sy);
        if (c.state === "swapIn" || c.state === "swapOut") swaps++;
        else if (speed > 4.6) {
          moving++;
          expect(sigma).toBeCloseTo(speed / 7, 6);
        } else expect(sigma).toBe(0);
      }
    expect(swaps).toBeGreaterThan(0);
    expect(moving).toBeGreaterThan(0);
  });
  test("RV-10: every image carries its content's signature; a missing or out-of-date image is named before a render", () => {
    const all = returnThumbJobs().map((j) => j.out);
    expect(missingReturnThumbs(all)).toEqual([]);
    expect(missingReturnThumbs(all.slice(1))).toEqual([all[0]]);
    // the canary: B9's slot label as it was (RV-06): the image made for it is not the one the manifest names now
    const b9 = RETURN_CELLS.find((c) => c.id === "B9")!;
    const before = returnThumbPath({ ...b9, standIn: { kind: "slot", captureId: "kit-B9", label: "the Settings sidebar, cropped above Privacy & Stealth", w: 480, h: 360 } })!;
    expect(before).not.toBe(returnThumbPath(b9));
    expect(missingReturnThumbs(all.map((p) => (p === returnThumbPath(b9) ? before : p)))).toEqual([returnThumbPath(b9)]);
    expect(returnThumbPath(b9)).toMatch(/^ui\/f2-cells\/return\/B9-[0-9a-f]{8}\.jpg$/);
  });
  test("every cell has its image but the one Pebble's code draws (S24's frame), each at its ring's size", () => {
    const jobs = returnThumbJobs();
    expect(jobs.length).toBe(RETURN_CELLS.length - 1);
    expect(RETURN_CELLS.filter((c) => drawnLive(c)).map((c) => c.id)).toEqual(["G3"]);
    for (const c of RETURN_CELLS) expect(returnThumbPath(c) === null).toBe(drawnLive(c));
    expect(new Set(jobs.map((j) => j.out)).size).toBe(jobs.length);
    expect(thumbSlug("J1*")).toBe("J1-kit");
    for (const j of jobs) {
      const c = RETURN_CELLS.find((x) => x.id === j.id)!;
      const L = RETURN_THUMB_LONG[ringOfWave(c.wave)];
      expect(Math.abs(j.h - j.w * 0.75)).toBeLessThanOrEqual(0.5);
      if (j.kind === "slot") expect(j.w).toBe(L);
      // a still never above its capture's own pixels
      else expect(j.w).toBeLessThanOrEqual(Math.min(L, Math.round(Math.max(j.crop.w * j.scale, (j.crop.h * j.scale * 4) / 3))));
    }
  });
  test("each ring's image is at least as large as its slots are ever drawn at 1080 (no slot is drawn above its image)", () => {
    for (const a of ASPECTS) {
      const t = planTrace(planOf(a))!;
      for (const fr of t.frames)
        for (const x of fr.cells) {
          if (x.c.spec.standIn.kind !== "slot") continue;
          if (x.s.x + x.s.w <= 0 || x.s.x >= t.W || x.s.y + x.s.h <= 0 || x.s.y >= t.H) continue;
          expect(x.s.w).toBeLessThanOrEqual(RETURN_THUMB_LONG[x.c.ring]);
        }
    }
  });
});

describe("RV-02: the reel's marks declare each swap over its own cells only", () => {
  test("findTilePops exempts a transition's tiles only: a pop elsewhere on the same frame is still judged", () => {
    const series = (pop: number) => Array.from({ length: 30 }, (_, f) => (f === 15 ? pop : 0.4));
    const tiles = Array.from({ length: 36 }, (_, t) => series(t === 5 || t === 7 ? 6 : 0.4));
    expect(findTilePops(tiles, 6).map((p) => p.tile)).toEqual([5, 7]);
    expect(findTilePops(tiles, 6, [], {}, [{ from: 13, to: 17, tiles: [5] }]).map((p) => p.tile)).toEqual([7]);
    expect(findTilePops(tiles, 6, [], {}, [{ from: 13, to: 17 }])).toEqual([]);
  });
  test("every swap of the Return is marked over its two cells' rects, in each aspect, and the scan maps a rect to its tiles", () => {
    for (const a of ASPECTS) {
      const p = demoPlans(a).find((e) => e.plan.id === "return")!.plan;
      const marks = swapMarks(p.shots[0]!.returnField!);
      expect(marks.length).toBe(39);
      for (const m of marks) {
        expect(m.to - m.from).toBe(16);
        expect(m.rect.w * m.rect.h).toBeLessThan(0.1 * p.frame.w * p.frame.h);
      }
    }
    const scan = new ReelScan(960, 540, { aspect: "16:9", fps: 60, width: 1920, height: 1080, total: 10, cuts: [], waits: [], hits: [], types: [], stones: [], apertures: [] });
    // a rect in the frame's top-left corner, 300 × 150 px of the plans' 1920 × 1080: tile 0 only (tiles are 320 × 180)
    expect(scan.tilesOf({ x: 10, y: 10, w: 300, h: 150 })).toEqual([0]);
    expect(scan.tilesOf({ x: 300, y: 170, w: 40, h: 20 })).toEqual([0, 1, 6, 7]);
  });
});

describe("qa/flash-rgb.ts, the flash verdict (RV-03: a port of research3's flashref.py v2, equal to it on its 18 canaries and the reels)", () => {
  /** A canary on the analysis grid: `colorAt(t, x, y)` gives each cell's sRGB colour on frame t. */
  const canary = (w: number, h: number, n: number, colorAt: (t: number, x: number, y: number) => readonly [number, number, number], aspect?: "16:9" | "1:1" | "9:16") => {
    const scan = new FlashRgb({ w, h, fps: 60, srcW: w * 10, name: "canary", aspect });
    const f = new Uint8Array(w * h * 3);
    for (let t = 0; t < n; t++) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const c = colorAt(t, x, y);
          f.set(c, 3 * (y * w + x));
        }
      scan.push(f);
    }
    return scan.finish();
  };
  const RED = [255, 0, 0] as const;
  const BLACK = [0, 0, 0] as const;
  const six = (t: number) => t % 10 < 5; // 6 Hz: 5 frames on, 5 off (12 transitions a second)
  test("c01 red ↔ black, full frame, 6 Hz: 12 transitions a second, general and red, every window", () => {
    const r = canary(192, 108, 180, (t) => (six(t) ? RED : BLACK));
    for (const k of ["desk27", "css2560", "tv"]) {
      expect([r.general[k]!.maxTransitions1s, r.general[k]!.fail]).toEqual([12, true]);
      expect([r.red[k]!.maxTransitions1s, r.red[k]!.fail]).toEqual([12, true]);
    }
    expect(flashFails(r).length).toBeGreaterThan(0);
  });
  test("c02 red ↔ grey of equal luminance: no general flash, a red flash (luma.ts read it the wrong way round)", () => {
    const r = canary(192, 108, 180, (t) => (six(t) ? RED : ([127, 127, 127] as const)));
    expect(r.general.desk27!.maxTransitions1s).toBe(0);
    expect([r.red.desk27!.maxTransitions1s, r.red.desk27!.fail]).toEqual([12, true]);
  });
  test("c07 5 transitions a second for 6 s: under the count, the extended rule fails; c08's 7 in one second fail", () => {
    const c07 = canary(192, 108, 360, (t) => (t % 24 < 12 ? ([122, 122, 122] as const) : BLACK));
    expect([c07.general.tv!.maxTransitions1s, c07.general.tv!.warn, c07.general.tv!.extended]).toEqual([5, true, true]);
    expect(flashFails(c07).some((x) => /extended/.test(x))).toBe(true);
    const on = (t: number) => (8 <= t && t < 16) || (24 <= t && t < 32) || (40 <= t && t < 48) || t >= 56;
    const c08 = canary(192, 108, 180, (t) => (on(t) ? ([255, 255, 255] as const) : BLACK));
    expect([c08.general.tv!.maxTransitions1s, c08.general.tv!.fail]).toEqual([7, true]);
  });
  test("c17 one 2-frame white frame on the night ground: 2 transitions, no fail (its frame-mean step is reported)", () => {
    const r = canary(192, 108, 180, (t) => (t >= 90 && t < 92 ? ([248, 249, 246] as const) : ([25, 30, 27] as const)));
    expect(r.general.tv!.maxTransitions1s).toBe(2);
    expect(flashFails(r)).toEqual([]);
    expect(r.steps.frameMeanStep1).toBeGreaterThan(0.9);
  });
  test("the windows bind by aspect: a small square at 6 Hz fails the 16:9 CSS reading, not 9:16's (R3 §1.7)", () => {
    // 12 × 12 cells (120 px square): 29 % of the 256 × 192 window, 9 % of 9:16's 400 × 400 and 455 × 341 windows
    const sq = (x0: number, y0: number) => (t: number, x: number, y: number) => (six(t) && x >= x0 && x < x0 + 12 && y >= y0 && y < y0 + 12 ? ([188, 188, 188] as const) : BLACK);
    const wide = canary(192, 108, 180, sq(90, 48));
    expect([wide.binding, wide.general.css2560!.fail]).toEqual([["desk27", "css2560", "tv"], true]);
    expect(flashFails(wide).some((x) => /general css2560/.test(x))).toBe(true);
    const tall = canary(108, 192, 180, sq(48, 90));
    expect(tall.binding).toEqual(["w400", "css9x16", "tv"]);
    expect([tall.general.css2560!.fail, tall.general.w400!.fail, tall.general.css9x16!.fail]).toEqual([true, false, false]);
    expect(flashFails(tall)).toEqual([]);
  });
});

describe("the toned matte (R4's alternative for G1, views/ReturnView.tsx merge \"toned\")", () => {
  const toned = (a: Aspect) => planFor(a, { merge: "toned" });
  test("it plans on the same timeline and passes every check in every aspect; its cells shrink on toward the centre", () => {
    for (const a of ASPECTS) {
      const p = toned(a);
      expect(returnOf(p)!.merge).toBe("toned");
      expect(returnOf(p)!.field.timing.wEnd).toBe(TONED_W_END);
      expect(p.duration).toBe(planOf(a).duration);
      expect(errs(checkPlan(p, returnGrid(FPS))).map((e) => `${a} ${e.check}: ${e.message}`)).toEqual([]);
    }
    expect(returnOf(planOf("16:9"))!.merge).toBe("behind");
  });
  test("a cell's tone is 0 until its first contact and 1 seven frames after it, rising without a step", () => {
    const field = returnOf(toned("16:9"))!.field;
    const c = field.cells.find((x) => x.ring === 2 && x.retStart !== null)!;
    const at = firstContactR(field, c)!;
    expect(at).toBeGreaterThan(c.retStart!);
    expect(tonedMatteK(field, c, at - 1)).toBe(0);
    expect(tonedMatteK(field, c, at + 7)).toBe(1);
    let prev = 0;
    for (let r = at; r <= at + 7; r += 0.5) {
      const k = tonedMatteK(field, c, r);
      expect(k).toBeGreaterThanOrEqual(prev);
      expect(k - prev).toBeLessThan(0.25);
      prev = k;
    }
  });
  test("the demo's toned variant shares the demo Return's climax and timeline", () => {
    const v = demoReturnVariant("16:9", { merge: "toned" });
    const d = demoPlans("16:9").find((e) => e.plan.id === "return")!.plan;
    expect(timelineDiffs({ "16:9": v, "1:1": d, "9:16": d })).toEqual([]);
    expect(returnOf(v)!.join?.source).toBe(returnOf(d)!.join?.source);
  });
});

describe("G1's variants (MONTAGE_DESIGN §9): revision 1's curve, the family labels, the field's size (×1.1 planned, ×1 the design's)", () => {
  const corner = (p: ScenePlan, r0: number, r1: number) => {
    const t = planTrace(p)!;
    const v: number[] = [];
    for (let r = r0; r < r1; r++) {
      const a = t.poseAt(r);
      const b = t.poseAt(r + 1);
      // the zoom's share of the corners' travel (no pan between R260 and R440)
      v.push(Math.abs(Math.log(b.zoom / a.zoom)) * Math.hypot(t.W / 2, t.H / 2));
    }
    return v;
  };
  test("each plans with no error in every aspect, on the demo Return's timeline and climax (at the design's size, as G1 measured them)", () => {
    // (demo/ReturnVariantDemo.tsx RETURN_G1_VARIANTS: each keeps fieldScale 1, so it plays against the unscaled field;
    // revision 1's curve at ×1.1 leaves cells in frame under 60 frames in every aspect, which G1 records)
    for (const o of [{ merge: "toned" as const, fieldScale: 1 }, { curve: "r1" as const, fieldScale: 1 }, { labels: true, fieldScale: 1 }, { fieldScale: 1 }])
      for (const a of ASPECTS) {
        const v = demoReturnVariant(a, o);
        const d = demoPlans(a).find((e) => e.plan.id === "return")!.plan;
        expect(errs(checkPlan(v, returnGrid(FPS))).map((e) => `${JSON.stringify(o)} ${a} ${e.check}: ${e.message}`)).toEqual([]);
        expect(v.duration).toBe(d.duration);
        expect(returnOf(v)!.join?.source).toBe(returnOf(d)!.join?.source);
      }
  });
  test("the design's camera is unchanged: the push from R200 to R480, as before the variants", () => {
    for (const a of ASPECTS) {
      const s = returnCameraSpec(a);
      for (const r of [-60, 0, 120, 200, 250, 300, 400, 480, 600]) {
        const u = Math.max(0, (r + 60) / s.pullFrames);
        const Lc = Math.log(s.zCard);
        const Ll = Math.log(s.zLow);
        expect(returnCameraAt(s, r).L).toBeCloseTo(Lc + (Ll - Lc) * E_MOVE(u ** 1.3) + (0 - Ll) * E_MOVE((r - 200) / 280), 12);
      }
    }
  });
  test("revision 1's curve: orbits of 5, −4 and 3° a second, every swap in place, a 0.33-px pull-back to zoom 1 at R480", () => {
    for (const a of ASPECTS) {
      const p = planFor(a, { curve: "r1" });
      const ret = returnOf(p)!;
      expect(ret.curve).toBe("r1");
      expect(ret.field.options.omega).toEqual([5, -4, 3]);
      expect(ret.field.timing.slidePx).toBe(0);
      // a slide swap's incoming cell sits on its slot just after the crossing (in place); the design's slides it there
      const des = planFor(a);
      const dfield = returnOf(des)!.field;
      const sl = ret.field.cells.find((c) => c.kind === "slide")!;
      const r = sl.swapIn! + 10;
      const q = cellPoseR(ret.field, sl, r)!;
      const s = slotXY(ret.field, sl.ring, sl.slot, r);
      expect(Math.hypot(q.c.x - s.x, q.c.y - s.y)).toBeLessThan(1e-6);
      const dsl = dfield.cells.find((c) => c.id === sl.id)!;
      expect(dsl.kind).toBe("slide");
      const dq = cellPoseR(dfield, dsl, dsl.swapIn! + 10)!;
      const ds = slotXY(dfield, dsl.ring, dsl.slot, dsl.swapIn! + 10);
      expect(Math.hypot(dq.c.x - ds.x, dq.c.y - ds.y)).toBeGreaterThan(1);
      // the zoom falls at 0.33 px a frame at the corners from R260 to R440 (±3 %), and is 1 from R480
      for (const v of corner(p, 262, 438)) expect(Math.abs(v - 0.33) / 0.33).toBeLessThan(0.03);
      expect(returnCameraAt(ret.camera, 480).L).toBeCloseTo(0, 9);
      expect(returnCameraAt(ret.camera, 250).L).toBeGreaterThan(0);
      // against the design's push, whose corners move faster through the gather and the rush
      expect(Math.max(...corner(des, 300, 440))).toBeGreaterThan(Math.max(...corner(p, 300, 440)));
    }
  });
  test("an orbit that turns the other way is refused (a slide and an entry follow each ring's direction)", () => {
    expect(() => buildReturnField("16:9", { omega: [5, 7, 7] })).toThrow(/turn as the design's/);
  });
  test("the labels: three lines in one band, landing on the design's beats, never two at once, the camera at 0.90 or less to R354", () => {
    for (const a of ASPECTS) {
      const p = planFor(a, { labels: true });
      const ls = p.types.filter((t: TypeSpec) => /^RL/.test(t.id));
      expect(ls.map((t) => t.text)).toEqual(["Models", "Memory", "Your workspace"]);
      expect(new Set(ls.map((t) => t.box.top)).size).toBe(1);
      expect(ls[0]!.box.top + 31 * p.frame.unit * 1.3).toBeLessThanOrEqual(p.frame.h - p.frame.safe + 1);
      expect(errs(checkPlan(p, returnGrid(FPS)), "typeOverType")).toEqual([]);
      const t = planTrace(p)!;
      for (let r = 240; r <= 354; r++) expect(t.poseAt(r).zoom).toBeLessThanOrEqual(0.9 + 1e-6);
      expect(t.poseAt(480).zoom).toBeCloseTo(1, 6);
      // the default draws none
      expect(planOf(a).types.some((x) => /^RL/.test(x.id))).toBe(false);
    }
  });
  test("the field ×1.1 is planned (G1, item 7): the rings and cells 10 % larger about the stone than the design's, the first cell and the stone as built; ×1.15 fails cellText and ×1.2 returnSchedule in 16:9", () => {
    expect(RETURN_FIELD_SCALE).toBe(1.1);
    for (const a of ASPECTS) {
      const f = returnOf(planOf(a))!.field;
      const d = returnOf(planFor(a, { fieldScale: 1 }))!.field;
      expect(f.geometry.cell[0]).toBeCloseTo(RETURN_GEOMETRY[a].cell[0] * 1.1, 9);
      expect(f.geometry.ell[2][1]).toBeCloseTo(RETURN_GEOMETRY[a].ell[2][1] * 1.1, 9);
      // the design's own size is RETURN_GEOMETRY (return-sheet --reference compares it with schedule_r2.json)
      expect(d.geometry.cell).toEqual(RETURN_GEOMETRY[a].cell);
      expect(d.geometry.ell).toEqual(RETURN_GEOMETRY[a].ell);
      expect(f.geometry.hero).toEqual(d.geometry.hero);
      expect(f.stone.px).toBe(d.stone.px);
      // the demo plays the planned size; the size test's other side is the unscaled variant
      expect(returnOf(demoPlans(a).find((e) => e.plan.id === "return")!.plan)!.field.geometry.cell[0]).toBeCloseTo(RETURN_GEOMETRY[a].cell[0] * 1.1, 9);
      expect(returnOf(demoReturnVariant(a, { fieldScale: 1 }))!.field.geometry.cell).toEqual(RETURN_GEOMETRY[a].cell);
    }
    // its limits: one step larger, a stand-in's text passes 16 px outside the inner ring; two, cells leave too soon
    expect(errs(checkPlan(planFor("16:9", { fieldScale: 1.15 }), returnGrid(FPS)), "cellText").map((e) => e.message).join(" ")).toMatch(/text reaches 16\.\d px/);
    const big = planFor("16:9", { fieldScale: 1.2 });
    expect(errs(checkPlan(big, returnGrid(FPS)), "returnSchedule").map((e) => e.message).join(" ")).toMatch(/under 60 frames/);
  });
});

describe("the film's sequence: the Return in place of the wall and the convergence (OVERRIDES §61)", () => {
  test("the demo plays the Drop, Ring 4, Dusk, the climax, the Return (with the title and the end card) and the coda", () => {
    for (const a of ASPECTS) expect(demoPlans(a).map((e) => e.plan.id)).toEqual(["drop", "ring4", "dusk", "climax", "return", "coda"]);
    expect(DEMO_JOINS).toEqual(["continue", "cut", "cut", "frame", "continue"]);
  });
  test("the climax ends into the Return, and the Return opens on its last frame: every join holds, joinPose with no error", () => {
    for (const a of ASPECTS) {
      const ps = demoPlans(a).map((e) => e.plan);
      expect(checkJoins(ps, DEMO_JOINS).map((f) => `${a} ${f.message}`)).toEqual([]);
      const c = ps.find((x) => x.id === "climax")!;
      expect((c.extra as { into: string }).into).toBe("return");
      const r = ps.find((x) => x.id === "return")!;
      expect(errs(joinPose(r))).toEqual([]);
      expect(returnOf(r)!.join!.source).toBe(c);
    }
  });
  test("no frame repeats at the join: S24's content moves on the Return's first frame as on S24's last (the camera's lead)", () => {
    for (const a of ASPECTS) {
      const ps = demoPlans(a).map((e) => e.plan);
      const c = ps.find((x) => x.id === "climax")!;
      const r = ps.find((x) => x.id === "return")!;
      const kiln = c.shots[c.shots.length - 1]!;
      const N = c.duration;
      const pose = (f: number) => kiln.camera.pose(f - kiln.from);
      const ctr = pose(N - 1);
      const onS = (f: number) => worldToFrame({ x: ctr.x, y: ctr.y }, pose(f), c.frame.w, c.frame.h);
      const field = returnOf(r)!.field;
      const hero = field.cells.find((x) => x.spec.hero)!;
      const onR = (f: number) => {
        const q = cellScreenAt(hero, f, field)!.rect;
        return { x: q.x + q.w / 2, y: q.y + q.h / 2 };
      };
      const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);
      const last = d(onS(N - 2), onS(N - 1));
      const across = d(onS(N - 1), onR(0));
      expect(last).toBeGreaterThan(0.3);
      expect(Math.abs(across - last) / last).toBeLessThan(0.05);
    }
  });
  test("the canaries: a \"frame\" join into a piece that opens on nothing, or on another piece's frame, fails", () => {
    const ps = demoPlans("16:9").map((e) => e.plan);
    const climax = ps.find((x) => x.id === "climax")!;
    const dusk = ps.find((x) => x.id === "dusk")!;
    const ret = ps.find((x) => x.id === "return")!;
    expect(checkJoins([climax, dusk], ["frame"]).length).toBeGreaterThan(0);
    expect(checkJoins([dusk, ret], ["frame"]).some((f) => /opens? on dusk/.test(f.message) || /continues climax/.test(f.message))).toBe(true);
  });
  test("the demo's Return passes every check in every aspect on its own cue, one timeline", () => {
    const by = Object.fromEntries(ASPECTS.map((a) => [a, demoPlans(a).find((e) => e.plan.id === "return")!])) as Record<Aspect, ReturnType<typeof demoPlans>[number]>;
    for (const a of ASPECTS) expect(errs(checkPlan(by[a].plan, by[a].grid)).map((e) => `${a} ${e.check}: ${e.message}`)).toEqual([]);
    expect(timelineDiffs({ "16:9": by["16:9"].plan, "1:1": by["1:1"].plan, "9:16": by["9:16"].plan })).toEqual([]);
  });
  test("one stone through the iris: the field's stone and the title's share one clock and the film layer", () => {
    for (const a of ASPECTS) {
      const p = demoPlans(a).find((e) => e.plan.id === "return")!.plan;
      const [field, title] = p.shots;
      expect(field!.stone!.layer).toBe("film");
      expect(title!.stone!.layer).toBe("film");
      expect(title!.stone!.clockOffset).toBe(field!.stone!.clockOffset);
      expect(field!.stone!.clockOffset).toBe(710);
      const seam = p.seams.find((x) => x.out === field!.id && x.in === title!.id)!;
      expect(seam.presentation).toBe("iris");
      expect(rOfLocal(seam.at, p.fps)).toBeGreaterThan(RETURN_BLINK_R + 0.18 * 60);
    }
  });
});
