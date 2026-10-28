// Fix round 2's render (28 Oct): what the three set-piece reels showed that no check saw, each held by a check with a
// planted canary (the fault as rendered fails, the plan as it is now passes): a context window drawn over Ring 4's card
// asking (9:16), the honest line sitting on the Veil's render (9:16), and the reel scan reading the post-credit scene's
// iris-out as the end card's last line vanishing (1:1, 9:16).
import { describe, expect, test } from "bun:test";
import type { Finding } from "../qa/checks";
import { INK, judgeInk, type InkTrack } from "../qa/ink";
import { demoPlans } from "../setpieces/demo/plans";
import { subjectsCovered, typeOverStone } from "../setpieces/qa";
import { WORLD } from "../setpieces/world";
import type { ScenePlan } from "../setpieces/scene";

const ASPECTS = ["16:9", "1:1", "9:16"] as const;
const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));
const piece = (a: (typeof ASPECTS)[number], id: string): ScenePlan => demoPlans(a).find((e) => e.plan.id === id)!.plan;

describe("nothing sits in front of the frame's subject (subjectsCovered)", () => {
  test("no plane covers a read or a plane framed whole, in any piece or aspect", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(subjectsCovered(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  // (fix round 3: the lean Ring 4, MONTAGE_DESIGN §5.4's named cut, frames no card asking: its subjects are the act's
  // read and the receipt; the Finder stays at x 1080, out of the frame while the act is read)
  test("the lean Ring 4 frames no card asking: its act is read with nothing in front of it, in every aspect", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "ring4");
      const ask = p.shots[0]!.planes.find((pl) => pl.id === "ring4-ask")!;
      expect(ask.framed).toBeUndefined();
      expect(p.shots[0]!.planes.find((pl) => pl.id === "ring4-act")!.read).toBeDefined();
      expect(errorsOf(subjectsCovered(p))).toEqual([]);
    }
  });
  test("the canary: the 9:16 Finder moved over the act's sentence while it is read is refused", () => {
    const p = piece("9:16", "ring4");
    const act = p.shots[0]!.planes.find((pl) => pl.id === "ring4-act")!;
    const r = act.read!.rect!;
    const old: ScenePlan = { ...p, shots: p.shots.map((s, i) => (i === 0 ? { ...s, planes: s.planes.map((pl) => (pl.id === "finder" ? { ...pl, depth: 1, rect: { ...pl.rect, x: r.x + r.w * 0.6, y: r.y - 20 } } : pl)) } : s)) };
    const found = errorsOf(subjectsCovered(old));
    expect(found.some((f) => /^finder, drawn in front of ring4-act/.test(f.message) && /while it is read/.test(f.message))).toBe(true);
    expect(WORLD["9:16"].finder.x).toBeGreaterThanOrEqual(1080);
  });
  test("the canary: a context window moved over the act's sentence while it is read is refused (16:9)", () => {
    const p = piece("16:9", "ring4");
    const s = p.shots[0]!;
    const act = s.planes.find((pl) => pl.id === "ring4-act")!;
    const r = act.read!.rect!;
    const over: ScenePlan = { ...p, shots: p.shots.map((x, i) => (i === 0 ? { ...x, planes: x.planes.map((pl) => (pl.id === "calculator" ? { ...pl, depth: 1, rect: { x: r.x + r.w * 0.5, y: r.y - 10, w: 232, h: 372 } } : pl)) } : x)) };
    expect(errorsOf(subjectsCovered(over)).some((f) => /^calculator, drawn in front of ring4-act/.test(f.message) && /while it is read/.test(f.message))).toBe(true);
  });
});

describe("film type never sits on the stone (typeOverStone)", () => {
  test("no line sits on a stone's body in any piece or aspect", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(typeOverStone(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("the canary: the 9:16 Veil where it was rendered (its centre at 0.44 of the height) sits under the honest line", () => {
    const p = piece("9:16", "dusk");
    // the render 0.095 of the height (182 px) higher on screen, as rendered on 28 Oct: its world's stone moved up by that
    // over the shot's zoom (about 1 through the hold)
    const up = 0.095 * p.frame.h;
    const old: ScenePlan = { ...p, shots: p.shots.map((s) => (s.stone?.veil ? { ...s, stone: { ...s.stone, at: { x: s.stone.at.x, y: s.stone.at.y - up / s.camera.pose(0).zoom } } } : s)) };
    const found = errorsOf(typeOverStone(old));
    expect(found.some((f) => /^"Hidden from screen capture/.test(f.message))).toBe(true);
  });
  test("the title's wordmark sits beside its stone, not on it (the check sees the stone's own bounds)", () => {
    // (the piece that sets the title: the finale, or the Return that replaces the wall and the convergence before it)
    for (const a of ASPECTS) expect(errorsOf(typeOverStone(demoPlans(a).find((e) => e.plan.types.some((t) => t.id === "L26"))!.plan))).toEqual([]);
  });
});

describe("Ring 4 reaches its receipt on one frame in every aspect (RingTiming.receiptArrive)", () => {
  // the reads above the receipt at the reading pace or slower (fix round 3, the lean ring: the act alone, 13 words; round
  // 2 read the answer too, 19), and the receipt (7 words) held no more than a second past its reading time (0.5 + 0.3 s
  // a word): the lean ring's cut waits for a half bar
  const pace = (words: number, readsS: number, receiptS: number): string[] => [
    ...(words / readsS > 3.14 ? [`the reads at ${(words / readsS).toFixed(2)} words a second`] : []),
    ...(receiptS > 0.5 + 0.3 * 7 + 1.0 ? [`the receipt held ${receiptS.toFixed(2)} s`] : []),
  ];
  const spans = (p: ScenePlan) => {
    const x = p.extra as Record<string, number>;
    return { arrive: x.receiptArrive, words: x.lean ? 13 : 19, readsS: (x.glideStart - x.readsFrom) / p.fps, receiptS: (x.cut - 19 - x.receiptArrive) / p.fps };
  };
  test("one arrival, the reads at the reading pace, the receipt held for its own time, in every aspect", () => {
    const all = ASPECTS.map((a) => spans(piece(a, "ring4")));
    expect(new Set(all.map((s) => s.arrive)).size).toBe(1);
    for (const [i, s] of all.entries()) expect(`${ASPECTS[i]} ${pace(s.words, s.readsS, s.receiptS).join("; ")}`).toBe(`${ASPECTS[i]} `);
  });
  test("the canary: 16:9 as rendered on 28 Oct (reads 510–760, receipt 836–1142) fails both ways", () => {
    expect(pace(19, (760 - 510) / 60, (1142 - 836) / 60).length).toBe(2);
  });
});

describe("the reel scan judges a line's own ink only (qa/ink.ts)", () => {
  const track: InkTrack = { id: "coda/L29b", text: "Real Pebble 2.0 screens,", rect: { x: 0, y: 0, w: 100, h: 30 }, polarity: "dark", from: 0, landed: 8, until: 40, exits: [{ from: 24, to: 40, kind: "blur" }] };
  // held at 1000 ink px, blurred out over the declared exit (gone by 36), then an iris-out's dark ground filling the rect
  // (its "ink" rising to 6.4 × the held level) and reading 0 once it covers the rect: the 1:1 and 9:16 reels' frames
  // 5799–5821 on 28 Oct
  const coda = Array.from({ length: 60 }, (_, f) => (f < 24 ? 1000 : f < 36 ? 1000 * (1 - (f - 24) / 12) : f < 41 ? 0 : f < 46 ? 6400 * ((f - 40) / 5) : 0));
  test("an iris filling the rect after the line has gone is not the line vanishing", () => {
    expect(judgeInk(track, coda)).toEqual([]);
    expect(INK.notOwnAfterUntil).toBeGreaterThan(1);
  });
  test("the canary: a line still drawn past its last frame at its own ink level, then gone in a frame, still vanishes", () => {
    const late = coda.map((v, f) => (f >= 24 && f < 44 ? 1000 : f >= 44 ? 0 : v));
    const found = judgeInk({ ...track, exits: [] }, late);
    expect(found.length).toBe(1);
    expect(found[0]!.kind).toBe("vanish");
    expect(found[0]!.from).toBe(43);
  });
  test("the same iris fill over a line that never left (no exit, its ink at full on its last frame) still vanishes on the cut", () => {
    const cut = Array.from({ length: 60 }, (_, f) => (f < 40 ? 1000 : f < 45 ? 6400 * ((f - 39) / 5) : 0));
    const found = judgeInk({ ...track, exits: [] }, cut);
    expect(found.some((x) => x.kind === "vanish")).toBe(true);
  });
});
