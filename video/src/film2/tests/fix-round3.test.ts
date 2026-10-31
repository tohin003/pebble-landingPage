// Fix round 3 (28 Oct): the trim to 35 readable features (OVERRIDES §61; MONTAGE_DESIGN §5.4) and verify-2's findings in
// the set-piece lane (VF-03, VF-04, CR-15's last gap, the peak), each held by a check with a planted canary: the fault
// as rendered on r4 (or as planned before) fails, the plan as it is now passes. tests/setpieces.test.ts and
// tests/review-checks.test.ts hold every plan to every check in checkPlan; cueLengths needs the cue data, so it is
// held here with the ledger's OPEN_DATA_FINDINGS and CLOSED_DATA_FINDINGS (TRIM-R4 and TRIM-C4 closed on the cue
// sheet's revision 3, OVERRIDES §68).
import { describe, expect, test } from "bun:test";
import { VelocityCamera } from "../motion/camera";
import type { Finding } from "../qa/checks";
import { cascadeSchedule } from "../type/Cascade";
import { wordCount } from "../type/reading";
import { demoPlans } from "../setpieces/demo/plans";
import { PICTURED_STONE_SHARE, cascadeCards, checkPlan, cueLengths, picturedStonesOnFrame, readEdges, stoneCount, stonesOnFrame, typeOverPlanes } from "../setpieces/qa";
import { planRingBlock } from "../setpieces/ringBlock";
import { ring4 } from "../setpieces/rings";
import { CLOSED_DATA_FINDINGS, OPEN_DATA_FINDINGS } from "../setpieces/review-ledger";
import { loadRingFourCue } from "../setpieces/tools/cue-data";
import { ringFourCue } from "../setpieces/cueSheet";
import { TAKE_HSF, frameOfSource, stillsAt } from "../setpieces/take";
import { STILL } from "../setpieces/standins";
import { lineRect, rectInFrame } from "../setpieces/frame";
import { halfBars } from "../setpieces/music";
import { returnOf } from "../setpieces/returnChecks";
import type { ScenePlan } from "../setpieces/scene";
import { ReelScan } from "../qa/reel-scan";
import { PICTURED_BLOB } from "../qa/stones";

const ASPECTS = ["16:9", "1:1", "9:16"] as const;
const FRAME = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } } as const;
const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));
const entry = (a: (typeof ASPECTS)[number], id: string) => demoPlans(a).find((e) => e.plan.id === id)!;
const piece = (a: (typeof ASPECTS)[number], id: string): ScenePlan => entry(a, id).plan;

/* ---------------------------------------------------------------- the trim (MONTAGE_DESIGN §5.4) ------------------ */

describe("the trim to 35: Ring 4 by MONTAGE_DESIGN §5.4's named cut, Cascade 4's four features kept", () => {
  test("Ring 4 keeps the ring-led arrival, the ask (shown), one 1× take, the receipt and two lines, in every aspect", () => {
    for (const a of ASPECTS) {
      const { plan: p, grid } = entry(a, "ring4");
      const ring = p.shots[0]!;
      const x = p.extra as Record<string, number>;
      // one take, entered after the person's click: the held card answered from its first shown frame (chain 9)
      expect(p.takes.length).toBe(1);
      const u = p.takes[0]!;
      expect(frameOfSource(TAKE_HSF.events.click!, u.at, p.fps, u.manifest, u.inPoint)).toBeLessThanOrEqual(u.at);
      expect(stillsAt(TAKE_HSF.views.held!, u.inPoint).map((s) => s.standIn.id)).toEqual(["heldNote"]);
      // the ask shown, not read; the act and the receipt read; the chapter line and its limit
      const reads = [...ring.planes.filter((pl) => pl.read).map((pl) => pl.id), ...(ring.reads ?? []).map((r) => r.id)];
      expect(reads.sort()).toEqual(["ring4-act", "ring4-receipt"]);
      expect(p.types.map((t) => t.id).sort()).toEqual(["ring4-chapter", "ring4-limit"]);
      // the lines land during the ring's travel (before the camera lands on the act) and leave before the receipt lands
      expect(x.chapterLand ?? (p.extra as { timing: { chapterLand: number } }).timing.chapterLand).toBeLessThan(x.arriveAt);
      expect((p.extra as { timing: { linesGone: number } }).timing.linesGone).toBeLessThanOrEqual(x.receiptAt);
      // the cut to the cascade on a half bar; the cascade's four features, each swap 2–3 frames before a beat
      expect(halfBars(grid)).toContain(x.cut);
      const c = p.shots[1]!.cascade!;
      expect(c.items.map((i) => i.text)).toEqual(["Agents read and propose", "A goal, with criteria", "Skills you review", "Connectors that ask"]);
      const sched = cascadeSchedule(c.start, c.items, p.fps, c.beats, undefined, c.endAt);
      sched.forEach((w, i) => {
        const hold = (w.outStart - w.inEnd) / p.fps;
        expect(hold).toBeGreaterThanOrEqual(i === 0 ? 0.95 : 0.65);
        const b = grid.beats.find((y) => y >= w.inEnd)!;
        expect(b - w.inEnd).toBeGreaterThanOrEqual(2);
        expect(b - w.inEnd).toBeLessThanOrEqual(3);
      });
      // as built: the ring part 5.5 bars (639 frames), the cascade 2.5 (290), one timeline in every aspect
      expect([x.ringPart, x.cascadePart]).toEqual([639, 290]);
    }
  });
  test("its readable words need more than the cue's phrase: 26 words at 3.14 a second are 8.28 s, the phrase 7.74 s", () => {
    const p = piece("16:9", "ring4");
    const ring = p.shots[0]!;
    const words = p.types.reduce((n, t) => n + wordCount(t.text), 0) + ring.planes.reduce((n, pl) => n + (pl.read?.words ?? 0), 0) + (ring.reads ?? []).reduce((n, r) => n + r.words, 0);
    expect(words).toBe(26);
    expect((words / 3.14) * p.fps).toBeGreaterThan(7.742 * p.fps);
    // the act and the receipt cannot share a framing in 1:1 and 9:16: the act's sentence at the 28 px floor fills the
    // width with the 60-px margin, and the Verified line's 11-px text needs 2.55× (the sentence would be 1,079 px wide)
    const act = STILL.testsLine;
    const rec = STILL.verifiedTop;
    expect(act.crop!.w * (28 / rec.textPx!)).toBeGreaterThan(1080 - 2 * 60);
    expect(act.crop!.w * (28 / act.textPx!)).toBeLessThanOrEqual(1080 - 2 * 60);
  });
  test("OVERRIDES §67's take entered at Done, measured: the same 639 frames, its receipt under the lines in 16:9 and 1:1", () => {
    // the reads set the ring part's length, not the take: the act is legible only once the arrival from the Drop's whole
    // Mac has zoomed in (frame 148–153), then its read (13 words at 3.1 a second), the glide to the receipt's framing, the
    // receipt's hold and the leave, cut on the next half bar. Entered at Done, Verified lands 110 source frames after it,
    // during the ring's travel (R87), and sits under the lines' band in 16:9 and 1:1 before they leave
    for (const a of ASPECTS) {
      const ex = piece(a, "drop").exit!;
      const { grid } = entry(a, "ring4");
      const content = ring4(a);
      const plan = (after: string): ScenePlan => planRingBlock({ ...FRAME[a], fps: 60, content: { ...content, ask: { ...content.ask, shownOnly: { after } } }, grid, entry: { pose: ex.pose, vel: ex.vel, ref: ex.ref, grade: ex.grade } });
      const click = plan("click");
      const done = plan("done");
      const x = done.extra as Record<string, number>;
      expect(`${a} ${(click.extra as Record<string, number>).ringPart} ${x.ringPart}`).toBe(`${a} 639 639`);
      // Done in the take's history, Verified at 1× from it
      expect(done.takes[0]!.inPoint).toBeGreaterThanOrEqual(TAKE_HSF.events.done!);
      expect(x.receiptAt).toBeLessThanOrEqual(TAKE_HSF.events.verified! - TAKE_HSF.events.done!);
      const under = errorsOf(typeOverPlanes(done)).filter((f) => /ring4-act:verifiedTop/.test(f.message));
      expect(`${a} ${under.length > 0}`).toBe(`${a} ${a !== "9:16"}`);
      expect(errorsOf(typeOverPlanes(click)).map((f) => `${a} ${f.message}`)).toEqual([]);
    }
  });
  test("cueLengths: the cue's own lengths pass, a part a frame and a half off them fails (the canary)", () => {
    const cue = ringFourCue({ main_film: { blocks: [{ block: "Ring 4", start_s: 10, end_s: 17.742 }, { block: "Cascade 4", start_s: 17.742, end_s: 21.613 }] } }, "a cue sheet")!;
    expect(cue.ringS).toBeCloseTo(7.742, 6);
    const p = piece("16:9", "ring4");
    const at = (ring: number, cas: number): ScenePlan => ({ ...p, extra: { ...p.extra, ringPart: ring, cascadePart: cas } });
    expect(cueLengths(at(Math.round(cue.ringS * 60), Math.round(cue.cascadeS * 60)), cue)).toEqual([]);
    expect(errorsOf(cueLengths(at(Math.round(cue.ringS * 60) + 2, Math.round(cue.cascadeS * 60)), cue)).map((f) => f.message).join()).toMatch(/the ring part runs .* over by/);
    expect(errorsOf(cueLengths(at(Math.round(cue.ringS * 60), Math.round(cue.cascadeS * 60) - 2), cue)).map((f) => f.message).join()).toMatch(/the cascade runs .* under by/);
    // a sheet with no Ring 4 block gives no lengths; Cascade 4 out (the F5 flex) is a cascade of 0
    expect(ringFourCue({ main_film: { blocks: [] } })).toBeNull();
    expect(ringFourCue({ main_film: { blocks: [{ block: "Ring 4", start_s: 0, end_s: 11.61 }] } })!.cascadeS).toBe(0);
  });
  test("the open findings fire on the current plans with the cue data, the ring part and the cascade (OPEN_DATA_FINDINGS)", () => {
    const cue = loadRingFourCue();
    // (a checkout without the score lane's .work/ has no cue data: check-setpieces.ts reports it NOT MEASURED)
    if (!cue) return;
    for (const o of OPEN_DATA_FINDINGS) {
      const part = o.cr === "TRIM-R4" ? /the ring part/ : /the cascade/;
      // fixed? take it out of setpieces/review-ledger.ts (the ledger only shrinks)
      for (const a of ASPECTS) expect(errorsOf(cueLengths(piece(a, o.piece), cue), o.check).some((f) => part.test(f.message))).toBe(true);
    }
  });
  test("the closed findings stay closed: Ring 4's ring part and Cascade 4 hold the cue sheet's lengths in every aspect (CLOSED_DATA_FINDINGS)", () => {
    const cue = loadRingFourCue();
    if (!cue) return;
    expect(CLOSED_DATA_FINDINGS.map((c) => c.cr)).toEqual(["TRIM-R4", "TRIM-C4"]);
    for (const c of CLOSED_DATA_FINDINGS) for (const a of ASPECTS) expect(errorsOf(cueLengths(piece(a, c.piece), cue), c.check).map((f) => `${a} ${f.message}`)).toEqual([]);
    // (OVERRIDES §68: Ring 4 5.5 bars, Cascade 4 2.5 bars, nothing sped up; the plans did not move to meet the sheet)
    for (const a of ASPECTS) {
      const x = piece(a, "ring4").extra as Record<string, number>;
      expect(`${a} ${x.ringPart} ${x.cascadePart}`).toBe(`${a} 639 290`);
    }
  });
});

/* ---------------------------------------------------------------- VF-04: read UI keeps the safe margin ------------ */

describe("read UI keeps 60 px from every edge (readEdges; the verifier's VF-04)", () => {
  test("every read in every piece and aspect keeps the margin", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(readEdges(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("the canary: Ring 4's act framed as on r4 in 1:1 (its floor × 1.03: 986 px of 1080) is refused", () => {
    const p = piece("1:1", "ring4");
    const ring = p.shots[0]!;
    const act = ring.planes.find((pl) => pl.id === "ring4-act")!;
    const r = act.read!.rect!;
    const zoom = ((28 * p.frame.unit) / STILL.testsLine.textPx!) * 1.03;
    const cam = new VelocityCamera({ x: r.x + r.w / 2, y: r.y + r.h / 2, zoom }, { x: 0, y: 0.4 / zoom, lz: 0 });
    const old: ScenePlan = { ...p, shots: p.shots.map((s, i) => (i === 0 ? { ...s, camera: cam } : s)) };
    const found = errorsOf(readEdges(old)).filter((f) => /^ring4-act/.test(f.message));
    expect(found.length).toBe(1);
    expect(found[0]!.message).toMatch(/read 4[0-9] px from the frame's (left|right)/);
  });
  test("the lean act is read at the 28 px floor with the margin in 1:1 and 9:16, and the receipt in a framing of its own", () => {
    for (const a of ["1:1", "9:16"] as const) {
      const p = piece(a, "ring4");
      const ring = p.shots[0]!;
      const x = p.extra as Record<string, number>;
      const act = ring.planes.find((pl) => pl.id === "ring4-act")!;
      for (let fr = act.read!.from; fr < act.read!.to; fr += 5) {
        const z = ring.camera.pose(fr).zoom;
        expect((STILL.testsLine.textPx! * z) / p.frame.unit).toBeGreaterThanOrEqual(28);
        expect((STILL.testsLine.textPx! * z) / p.frame.unit).toBeLessThan(28.2);
      }
      expect((STILL.verifiedTop.textPx! * ring.camera.pose(x.receiptArrive).zoom) / p.frame.unit).toBeGreaterThanOrEqual(28);
    }
  });
});

/* ---------------------------------------------------------------- VF-03: the cascade's cards ---------------------- */

describe("a cascade's cards keep 60 px inside the frame and their labels drawn (cascadeCards; the verifier's VF-03)", () => {
  test("every cascade in every aspect passes", () => {
    for (const a of ASPECTS) expect(errorsOf(cascadeCards(piece(a, "ring4"))).map((f) => `${a}: ${f.message}`)).toEqual([]);
  });
  test("the canary: the 9:16 card where r4 showed it (its left edge 13 px from the frame's, then out) is refused, margin and label", () => {
    const p = piece("9:16", "ring4");
    const s = p.shots[1]!;
    const c = s.cascade!;
    // every card 300 px further left on screen at the stage's zoom: its left edge near or past the frame's
    const dx = 300 / s.camera.pose(0).zoom;
    const moved: ScenePlan = { ...p, shots: p.shots.map((x) => (x.cascade ? { ...x, cascade: { ...c, cards: c.cards.map((k) => ({ ...k, rect: { ...k.rect, x: k.rect.x - dx } })) } } : x)) };
    const found = errorsOf(cascadeCards(moved)).map((f) => f.message);
    expect(found.some((m) => /comes -?\d+ px from the frame's edge/.test(m))).toBe(true);
    expect(found.some((m) => /label is not drawn/.test(m))).toBe(true);
  });
});

/* ---------------------------------------------------------------- CR-15's last gap: a pictured pebble ------------- */

describe("a pebble pictured in a Return cell counts as a stone (stoneCount; the verifier's VF-01, CR-15)", () => {
  test("the current plans pass: the Return lane's RV-01 made A2 and A3 slots (a247656)", () => {
    for (const a of ASPECTS) expect(errorsOf(stoneCount(piece(a, "return")))).toEqual([]);
  });
  test("the canary: A3 drawn as Pebble's engine, as on r4, is a second stone beside the stone at 10 % of its area or more", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "return");
      const ret = returnOf(p)!;
      const cells = ret.field.cells.map((c) => (c.spec.id === "A3" ? { ...c, spec: { ...c.spec, standIn: { kind: "engine" as const, pose: "testing" as const, w: 4, h: 3 } } } : c));
      const old: ScenePlan = { ...p, extra: { ...p.extra, return: { ...ret, field: { ...ret.field, cells } } } };
      const found = errorsOf(stoneCount(old));
      expect(found.length).toBeGreaterThan(0);
      expect(found[0]!.message).toMatch(/pictured in a cell beside the stone/);
      // the share it was seen at: over the floor (r4: about 15 % at the merge)
      const fr = found[0]!.frame!;
      const xs = picturedStonesOnFrame(old, fr);
      expect(xs.length).toBeGreaterThan(0);
      expect(xs[0]!.share).toBeGreaterThanOrEqual(PICTURED_STONE_SHARE);
      expect(stonesOnFrame(old, fr).length).toBeGreaterThan(0);
    }
  });
});

describe("the stones scan counts a pebble from 10 % of the stone's area, inside the Return's cells too (qa/reel-scan.ts; VF-01)", () => {
  // a synthetic reel at half size (the plans' px are twice the render's): the stone, r 40 plan px, at (500, 240), as large
  // as the Return's stone at half size (about 47 px across)
  const W = 320;
  const H = 180;
  const run = (draw: (px: Uint8Array, f: number) => void, cells: boolean) => {
    const stoneAt: Record<number, number[][]> = {};
    const cellsAt: Record<number, number[][]> = {};
    for (let f = 0; f < 60; f++) {
      stoneAt[f] = [[500, 240, 40]];
      if (cells) cellsAt[f] = [[40, 40, 160, 120], [220, 220, 120, 90]];
    }
    const marks = { aspect: "16:9", fps: 60, width: 640, height: 360, total: 60, cuts: [], waits: [], hits: [], types: [], stones: [{ from: 0, to: 60, count: 1, rMin: 40, rMax: 40 }], stoneAt, ...(cells ? { cellsAt } : {}), apertures: [] };
    const scan = new ReelScan(W, H, marks);
    for (let f = 0; f < 60; f++) {
      const px = new Uint8Array(W * H).fill(214);
      const disc = (cx: number, cy: number, r: number) => {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px[y * W + x] = 92;
      };
      disc(250, 120, 20); // the stone (render px)
      draw(px, f);
      scan.push(px);
    }
    return scan.finish().stones.twoStoneRuns;
  };
  const disc = (px: Uint8Array, cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px[y * W + x] = 92;
  };
  test("a pebble of 15 % of the stone's area inside a cell far from the stone is a second stone (A3 in the field on r4)", () => {
    expect(run((px, f) => f >= 20 && f < 30 && disc(px, 60, 50, 20 * Math.sqrt(0.15)), true)).toEqual([{ from: 20, to: 30, most: 2 }]);
  });
  test("the same pebble beside the stone at the merge is a second stone without the cells too (r4 4818–4830)", () => {
    expect(run((px, f) => f >= 20 && f < 30 && disc(px, 200, 120, 20 * Math.sqrt(0.15)), false)).toEqual([{ from: 20, to: 30, most: 2 }]);
  });
  test("under 10 % of the stone's area, or a bar (a button), is not a pebble; the scan as it was passed the 15 % pebble", () => {
    expect(run((px, f) => f >= 20 && f < 30 && disc(px, 60, 50, 20 * Math.sqrt(0.06)), true)).toEqual([]);
    expect(run((px) => {
      for (let y = 45; y < 52; y++) for (let x = 40; x < 80; x++) px[y * W + x] = 80;
    }, true)).toEqual([]);
    // the old floor: blobs from half the stone's radius (25 % of its area)
    const s15 = 20 * Math.sqrt(0.15);
    expect(s15).toBeLessThan(20 * 0.5);
    expect(Math.sqrt(PICTURED_BLOB.share)).toBeLessThan(Math.sqrt(0.15));
  });
});

/* ---------------------------------------------------------------- the peak ----------------------------------------- */

/** The share of the frame that shows the ground: outside Kiln's window (the kept card lies inside it). */
const groundShare = (p: ScenePlan, fr: number): number => {
  const k = p.shots.find((s) => s.id === "kiln")!;
  const w = rectInFrame(k.planes.find((pl) => pl.id === "kiln")!.rect, k.camera.pose(fr - k.from), p.frame);
  const ix = Math.max(0, Math.min(w.x + w.w, p.frame.w) - Math.max(w.x, 0));
  const iy = Math.max(0, Math.min(w.y + w.h, p.frame.h) - Math.max(w.y, 0));
  return 1 - (ix * iy) / (p.frame.w * p.frame.h);
};

describe("the peak: the kept card on the evening riverbed (verify-2: the film's lowest-contrast section)", () => {
  test("as the card lands, the frame shows the window's corner, the ground and the stone, in every aspect", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "climax");
      const x = p.extra as Record<string, number>;
      expect(stonesOnFrame(p, x.peak).length).toBe(1);
      expect(groundShare(p, x.peak)).toBeGreaterThan(0.35);
      // the stone turns happy on the take's own event, in frame
      expect(stonesOnFrame(p, x.happyAt).length).toBe(1);
    }
  });
  test("the card is read at 28 px with its text 60 px inside the frame, the ground beside it in 16:9 and 9:16, and S24 ends with no stone", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "climax");
      const k = p.shots.find((s) => s.id === "kiln")!;
      const kept = k.planes.find((pl) => pl.id === "kept")!;
      expect(errorsOf(checkPlan(p, entry(a, "climax").grid).errors).filter((f) => ["uiReadSize", "readEdges", "planesInFrame"].includes(f.check))).toEqual([]);
      // the evening ground in frame through the read: the window's left edge (16:9) or its foot (9:16)
      if (a !== "1:1") for (let fr = kept.read!.from; fr < kept.read!.to; fr += 10) expect(`${a} ${fr} ${groundShare(p, fr) > (a === "16:9" ? 0.3 : 0.18)}`).toBe(`${a} ${fr} true`);
      // the Return's first cell is S24's last frame: no stone in it (joinPose)
      expect(stonesOnFrame(p, p.duration - 1).length).toBe(0);
    }
  });
  test("the check line sits on the ground, not over Kiln's conversation, in 16:9 and 9:16", () => {
    for (const a of ["16:9", "9:16"] as const) {
      const p = piece(a, "climax");
      const k = p.shots.find((s) => s.id === "kiln")!;
      const t = p.types.find((x) => x.id === "L25")!;
      const r = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT);
      for (let fr = Math.max(t.at, k.from); fr < (t.exitAt ?? p.duration); fr += 10) {
        const w = rectInFrame(k.planes.find((pl) => pl.id === "kiln")!.rect, k.camera.pose(fr - k.from), p.frame);
        const over = r.x < w.x + w.w && r.x + r.w > w.x && r.y < w.y + w.h && r.y + r.h > w.y;
        expect(`${a} ${fr} ${over}`).toBe(`${a} ${fr} false`);
      }
    }
  });
});
