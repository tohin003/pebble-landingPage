// The set pieces (video/src/film2/setpieces): every piece, in every aspect, passes the foundation's smoothness checks
// and the set pieces' own (setpieces/qa.ts), for the demo's measured music AND for arbitrary music: random tempos and
// hit times, because the track decides the times. Plus the rules each piece carries: takes at 1×, the honest line,
// the label beside the Veil, the wall's cells unread, the title's one sweep, the end card's words.
import { describe, expect, test } from "bun:test";
import { formatReport } from "../qa/checks";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { checkCues } from "../../../../shared/pebble/cues";
import { maxScreenSpeed, worldToFrame } from "../motion/camera";
import { breakLines } from "../setpieces/frame";
import { halfBars, nextPoint, place, pointsOf, prevPoint, shiftGrid, steadyGrid, gridFromMap, type MusicGrid } from "../setpieces/music";
import { checkTakeUse, eventFrame, frameOfSource, solveInPoint, sourceFrameAt, takeFramePath, TAKE_HSF, TAKE_RS9, TAKE_RSW } from "../setpieces/take";
import { checkPlan, planQa } from "../setpieces/qa";
import { isOpen } from "../setpieces/review-ledger";
import { planDrop } from "../setpieces/drop";
import { planRingBlock } from "../setpieces/ringBlock";
import { ring4 } from "../setpieces/rings";
import { cellAt, cellTextPx, planWall, wallCells } from "../setpieces/wall";
import { DUSK_TEXT, planDusk } from "../setpieces/dusk";
import { CLIMAX_TEXT, planClimax } from "../setpieces/climax";
import { FINALE_TEXT, planFinale } from "../setpieces/finale";
import { SAGE_SWEEP, sweepAlphaMax, sweepLift } from "../setpieces/sweep";
import { CELL_SOURCES, STEALTH_FEATURES } from "../setpieces/standins";
import { demoPlans } from "../setpieces/demo/plans";
import { STRETCH, demoGrid } from "../setpieces/demo/grids";
import { alignAspects, timelineDiffs } from "../setpieces/align";
import type { RingTiming } from "../setpieces/ringBlock";
import type { DropTiming } from "../setpieces/drop";

const SIZE = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } } as const;
import { cascadeSchedule } from "../type/Cascade";
import { wordCount } from "../type/reading";
import * as PIECE_CUES from "../setpieces/pieces.cues";
import type { ScenePlan } from "../setpieces/scene";

const SIZES = [
  [1920, 1080],
  [1080, 1080],
  [1080, 1920],
] as const;
const FPS = 60;

/** A deterministic pseudo-random stream (no Math.random in tests). */
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/**
 * Every check passes but the craft review's open findings (setpieces/review-ledger.ts): those are held by
 * tests/review-checks.test.ts, which fails when one stops firing, so the ledger only shrinks as the fix lane fixes them.
 */
const expectClean = (p: ScenePlan, grid?: MusicGrid) => {
  const r = checkPlan(p, grid);
  const rest = r.errors.filter((e) => !isOpen(p.id, e.check));
  if (rest.length) throw new Error(formatReport({ ...r, ok: false, errors: rest }));
  expect(rest).toEqual([]);
};

describe("the music grid", () => {
  const g = steadyGrid({ bpm: 120, fps: 60, firstDownbeat: 30, from: 0, to: 2000 });
  test("beats every 30 frames at 120 BPM, bars every 4, phrases every 4 bars, from the first downbeat", () => {
    expect(g.beats.slice(0, 4)).toEqual([0, 30, 60, 90]);
    expect(g.downbeats.slice(0, 3)).toEqual([30, 150, 270]);
    expect(g.phrases.slice(0, 2)).toEqual([30, 510]);
    expect(halfBars(g).slice(0, 3)).toEqual([30, 90, 150]);
  });
  test("an event is never placed early: a hold is never shortened to make a cut land", () => {
    const r = rng(7);
    for (let i = 0; i < 300; i++) {
      const earliest = Math.round(r() * 1800);
      for (const level of ["beat", "half", "bar", "phrase"] as const) {
        const p = place(earliest, g, { level });
        if (p.point === null) continue;
        expect(p.at).toBeGreaterThanOrEqual(earliest);
        expect(p.waited).toBeGreaterThanOrEqual(0);
        expect(pointsOf(g, level)).toContain(p.point);
      }
    }
  });
  test("a transition completes its lead frames before the point (2–3 frames at 60 fps)", () => {
    const p = place(100, g, { level: "beat", frames: 16, lead: 3 });
    expect(p.point! - p.at).toBe(19);
    expect(p.at + 16 + 3).toBe(p.point!);
  });
  test("past maxWait (or the grid's end) it falls back to the earliest frame", () => {
    expect(place(100, g, { level: "phrase", maxWait: 10 }).point).toBeNull();
    expect(place(5000, g, { level: "beat" }).at).toBe(5000);
  });
  test("prevPoint, nextPoint and shiftGrid", () => {
    expect(nextPoint(g, 31)).toBe(60);
    expect(prevPoint(g, 59)).toBe(30);
    expect(shiftGrid(g, -30).downbeats[0]).toBe(0);
  });
  test("a measured map's stretch lands on composition frames", () => {
    const map = { beats_s: [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14], downbeats_s: [10, 12, 14], sections: [{ start_s: 12 }] };
    const m = gridFromMap(map, { inS: 10, outS: 14, at: 600, fps: 60 });
    expect(m.beats).toEqual([600, 630, 660, 690, 720, 750, 780, 810]);
    expect(m.downbeats).toEqual([600, 720]);
    expect(m.phrases).toEqual([720]);
  });
});

describe("line breaks", () => {
  test("the fewest lines, as even as they can be: no orphan word", () => {
    const f = { w: 1920, h: 1080, aspect: "16:9" as const, unit: 1, safe: 60 };
    const t = breakLines("AgentGuard, built in.", "expressive", f, 700, 0.15);
    expect(t.split("\n").length).toBe(2);
    // the even split, never a lone short word: "AgentGuard," / "built in.", not "AgentGuard, built" / "in."
    expect(t).toBe("AgentGuard,\nbuilt in.");
    expect(t.split("\n").some((l) => l.length <= 3)).toBe(false);
    const h = breakLines(STEALTH_HONEST, "functional", f, 1680, 0.15).split("\n");
    expect(h.length).toBeLessThanOrEqual(3);
    expect(h.join(" ")).toBe(STEALTH_HONEST);
    expect(breakLines("Its own tools.", "expressive", f, 1800, 0.3)).toBe("Its own tools.");
  });
});

describe("takes at 1×", () => {
  test("the solved in-point lands the event exactly, at 60 and at 30 fps", () => {
    for (const fps of [60, 30]) {
      for (const land of [90, 181, 260]) {
        const u = solveInPoint(TAKE_RS9, "allow", land, 0, land + 300, fps);
        expect(eventFrame(u, "allow", fps)).toBe(land);
        expect(checkTakeUse(u, fps)).toEqual([]);
        // 1×: a second of film is a second of the take
        expect(sourceFrameAt(land + fps, 0, fps, TAKE_RS9, u.inPoint) - sourceFrameAt(land, 0, fps, TAKE_RS9, u.inPoint)).toBe(TAKE_RS9.fps);
      }
    }
  });
  test("a take is never sped up to fit: an event too early in it cannot land late", () => {
    // "running" is 15 s into HS-F: it cannot land 16.7 s after the take starts showing without a speed-up
    expect(() => solveInPoint(TAKE_HSF, "running", 1000, 0, 1100, 60)).toThrow(/start the take later/);
  });
  test("a take never runs past its last frame", () => {
    expect(() => solveInPoint(TAKE_RSW, "cardLands", 100, 0, 100000, 60)).toThrow(/ends/);
  });
  test("a real take's frames are read from its sequence, 1-based, clamped to the take", () => {
    const real = { ...TAKE_RSW, pattern: "takes/rs-w/{n}.png" };
    expect(takeFramePath(real, 0)).toBe("takes/rs-w/00001.png");
    expect(takeFramePath(real, 449)).toBe("takes/rs-w/00450.png");
    expect(takeFramePath(real, 99999)).toBe(`takes/rs-w/${String(TAKE_RSW.frames).padStart(5, "0")}.png`);
    expect(() => takeFramePath(TAKE_RSW, 0)).toThrow(/placeholder/);
  });
  test("the check catches a hand-made use that runs past the take", () => {
    expect(checkTakeUse({ manifest: TAKE_HSF, at: 0, inPoint: TAKE_HSF.frames - 300, until: 400 }, 60).join()).toContain("past its last frame");
    expect(frameOfSource(278, 0, 60, TAKE_HSF, 0)).toBe(278);
  });
});

describe("the Drop works for any music hit", () => {
  test("the demo's measured stretch, in every aspect", () => {
    for (const a of ["16:9", "1:1", "9:16"] as const) {
      const e = demoPlans(a)[0]!;
      expectClean(e.plan, e.grid);
    }
  });
  test("random tempos and hit frames: every check passes, the Allow lands on the hit, the frame opens with the ring", () => {
    const r = rng(42);
    for (let i = 0; i < 5; i++) {
      const bpm = 84 + Math.round(r() * 46);
      const hit = 160 + Math.round(r() * 200);
      const grid = steadyGrid({ bpm, fps: FPS, firstDownbeat: hit, from: 0, to: 3000 });
      for (const [w, h] of SIZES) {
        const p = planDrop({ w, h, fps: FPS, hit, grid });
        expectClean(p, grid);
        expect(eventFrame(p.takes[0]!, "allow", FPS)).toBe(hit);
        const x = p.extra as Record<string, number>;
        expect(x.apertureFrames).toBeGreaterThanOrEqual(30);
        expect(x.apertureFrames).toBeLessThanOrEqual(36);
        expect(p.duration - hit).toBeGreaterThanOrEqual(7.5 * FPS);
        expect(p.duration - hit).toBeLessThanOrEqual(11.6 * FPS + 1);
        // the end lands on a phrase line or a bar line
        expect(grid.downbeats).toContain(p.duration);
        // light leaks: one (the warming), never more than two in a film
        expect(p.leaks.length).toBe(1);
      }
    }
  });
  test("with no grid it still holds every rule (the earliest frames)", () => {
    for (const [w, h] of SIZES) expectClean(planDrop({ w, h, fps: FPS, hit: 200 }));
  });
});

describe("the ring block (Ring 4 and Cascade 4)", () => {
  test("every aspect, the demo's groove and other tempos", () => {
    for (const bpm of [96, 123.995, 128]) {
      const grid = steadyGrid({ bpm, fps: FPS, firstDownbeat: 0, from: 0, to: 4000 });
      for (const [w, h] of SIZES) {
        const p = planRingBlock({ w, h, fps: FPS, content: ring4(w > h ? "16:9" : w === h ? "1:1" : "9:16"), grid });
        expectClean(p, grid);
        const x = p.extra as Record<string, number>;
        // the take's receipt event IS the receipt's beat
        expect(eventFrame(p.takes[0]!, "verified", FPS)).toBe(x.receiptAt);
        expect(grid.beats).toContain(x.receiptAt);
        // (fix round 3, the lean ring: MONTAGE_DESIGN §5.4) the ring returns once it has framed the ask, as the camera
        // flies in, so no held ring grows across the lines with the reading zoom
        const ring = p.shots[0]!.rings[0]!;
        const returnAt = ring.start + ring.phases.slice(0, 3).reduce((s, ph) => s + ph.frames, 0);
        expect(returnAt).toBe(ring.phases[0]!.frames + ring.phases[1]!.frames + 1);
        // the cut to the cascade is on a half bar (a bar line would hold the receipt up to 2 s longer); every swap lands
        // 2–3 frames before a beat
        expect(halfBars(grid)).toContain(x.cut);
        const c = p.shots[1]!.cascade!;
        for (const sw of cascadeSchedule(c.start, c.items, FPS, c.beats).slice(1)) {
          const b = grid.beats.find((y) => y >= sw.inEnd)!;
          expect(b - sw.inEnd).toBeGreaterThanOrEqual(2);
          expect(b - sw.inEnd).toBeLessThanOrEqual(3);
        }
        for (const it of c.items) expect(wordCount(it.text)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("travel speed", () => {
  test("no camera in any demo piece moves the picture faster than 30 px a frame at 60 fps (centre and corners)", () => {
    for (const a of ["16:9", "1:1", "9:16"] as const) {
      for (const e of demoPlans(a)) {
        const p = e.plan;
        for (const s of p.shots) {
          let worst = 0;
          // a momentum cut's last E-leave frames are the one place a shot may run faster (they carry the cut)
          const leaveFrom = p.seams.some((x) => x.out === s.id && x.frames === 0) ? s.to - s.from - 19 : Infinity;
          for (let f = 0; f < Math.min(s.to - s.from, leaveFrom); f++) worst = Math.max(worst, maxScreenSpeed(s.camera.sample(f), p.frame.w, p.frame.h));
          expect(worst).toBeLessThanOrEqual(30 * p.frame.unit + 1e-6);
        }
      }
    }
  });
});

describe("the wall", () => {
  test("28 cells on three rings (8, 8, 12), and never a Stealth cell", () => {
    const cells = wallCells();
    expect(cells.length).toBe(28);
    expect([0, 1, 2].map((r) => cells.filter((c) => c.ring === r).length)).toEqual([8, 8, 12]);
    for (const c of CELL_SOURCES) expect((STEALTH_FEATURES as readonly string[]).includes(c.feature)).toBe(false);
  });
  test("every aspect passes; the cells are seen, not read", () => {
    for (const [w, h] of SIZES) {
      const grid = steadyGrid({ bpm: 120, fps: FPS, firstDownbeat: 0, from: 0, to: 3000 });
      const p = planWall({ w, h, fps: FPS, grid });
      expectClean(p, grid);
      const s = p.shots[0]!;
      let worst = 0;
      for (let f = 0; f < p.duration; f += 5) for (const c of s.wall!.cells) worst = Math.max(worst, cellTextPx(c, s.camera.pose(f).zoom, p.frame));
      expect(worst).toBeLessThan(16);
    }
  });
  test("the convergence carries every cell into the stone, gone before contact", () => {
    const cells = wallCells();
    const spec = { centre: { x: 0, y: 0 }, cells, radii: [640, 1100, 1580] as const, orbit: [1.6, -1.1, 0.8] as const, depth: [1, 1, 1] as const, converge: { at: 0, frames: 120, turnDeg: 50 } };
    for (const c of cells) {
      const end = cellAt(c, spec, 120, FPS);
      expect(end.opacity).toBe(0);
      expect(Math.hypot(end.rect.x + end.rect.w / 2, end.rect.y + end.rect.h / 2)).toBeLessThan(40);
    }
  });
});

describe("the Dusk passage", () => {
  test("every aspect passes; the honest line is word for word, held ≥ 12 s, through the rack and the cut", () => {
    for (const bpm of [80, 96]) {
      const grid = steadyGrid({ bpm, fps: FPS, firstDownbeat: 0, from: 0, to: 4000 });
      for (const [w, h] of SIZES) {
        const p = planDusk({ w, h, fps: FPS, grid });
        expectClean(p, grid);
        const honest = p.types.find((t) => t.id === "L21")!;
        expect(honest.text.replace(/\n/g, " ")).toBe(STEALTH_HONEST);
        expect(honest.honest).toBe(true);
        expect((honest.exitAt! - honest.at) / FPS).toBeGreaterThanOrEqual(12);
        // it spans every seam of the passage
        for (const s of p.seams) {
          expect(honest.at).toBeLessThanOrEqual(s.at);
          expect(honest.exitAt!).toBeGreaterThan(s.at + s.frames);
        }
        // the label sits beside the render on every frame it shows (from the rack's cross to the cut)
        const label = p.types.find((t) => t.id === "L22")!;
        expect(label.text.replace(/\n/g, " ")).toBe(DUSK_TEXT.label);
        const rack = p.seams.find((s) => s.kind === "rack")!;
        const veilShot = p.shots.find((s) => s.stone?.veil)!;
        expect(label.at).toBeLessThanOrEqual(rack.at + Math.round(rack.frames * 0.36));
        expect(label.exitAt!).toBeGreaterThanOrEqual(veilShot.to - 10);
        // nothing that glows: no leak in the passage, and no focus line by default
        expect(p.leaks.length).toBe(0);
        expect(p.types.some((t) => t.id === "L23")).toBe(false);
        for (const t of p.types) expect(/undetectable|invisible|focus/i.test(t.text)).toBe(false);
      }
    }
  });
});

describe("the climax shell", () => {
  test("the kept card lands on the peak in one 1× take; the camera never stops through the landing", () => {
    const r = rng(3);
    for (let i = 0; i < 3; i++) {
      const bpm = 96 + Math.round(r() * 34);
      const peak = 280 + Math.round(r() * 120);
      const grid = steadyGrid({ bpm, fps: FPS, firstDownbeat: peak, from: 0, to: 3000 });
      for (const [w, h] of SIZES) {
        const p = planClimax({ w, h, fps: FPS, grid, peak });
        expectClean(p, grid);
        const u = p.takes.find((x) => x.manifest.id === "RS-W")!;
        expect(eventFrame(u, "cardLands", FPS)).toBe(peak);
        const x = p.extra as Record<string, number>;
        // the take begins 0.75–1.25 s before the card lands (§3.6 chain 11: about 1.0 s)
        expect(peak - x.cut).toBeGreaterThanOrEqual(0.75 * FPS);
        expect(peak - x.cut).toBeLessThanOrEqual(1.25 * FPS + 1);
        const kiln = p.shots[1]!;
        for (let f = peak - 20; f < peak + 60; f++) expect(maxScreenSpeed(kiln.camera.sample(f - kiln.from), p.frame.w, p.frame.h)).toBeGreaterThan(0.05);
        expect(p.types.find((t) => t.id === "L25")!.text.replace(/\n/g, " ")).toBe(CLIMAX_TEXT.check);
      }
    }
  });
});

describe("the convergence, the title and the end card", () => {
  test("every aspect passes; the wordmark lands on the downbeat; one sage sweep 1 frame after it", () => {
    for (const hit of [260, 300, 377]) {
      const grid = steadyGrid({ bpm: 120, fps: FPS, firstDownbeat: hit, from: 0, to: 3000 });
      for (const [w, h] of SIZES) {
        const p = planFinale({ w, h, fps: FPS, grid, hit });
        expectClean(p, grid);
        const mark = p.types.find((t) => t.id === "L26")!;
        expect(mark.at + 30).toBe(hit);
        const sweeps = p.types.filter((t) => t.sweep);
        expect(sweeps.length).toBe(1);
        expect(sweeps[0]!.sweep!.at - hit).toBeGreaterThanOrEqual(0);
        expect(sweeps[0]!.sweep!.at - hit).toBeLessThanOrEqual(2);
        expect(sweeps[0]!.sweep!.frames).toBeGreaterThanOrEqual(SAGE_SWEEP.frames[0]);
        expect(sweeps[0]!.sweep!.frames).toBeLessThanOrEqual(SAGE_SWEEP.frames[1]);
        // the end card: every fact once at one size, "Shown with sample data." and the method line word for word
        const facts = p.types.filter((t) => t.id.startsWith("L28-"));
        expect(new Set(facts.map((t) => `${t.tier}:${t.sizeT}`)).size).toBe(1);
        for (const fact of FINALE_TEXT.facts.flat()) expect(facts.some((t) => t.text.includes(fact))).toBe(true);
        expect(p.types.find((t) => t.id === "L29a")!.text).toBe("Shown with sample data.");
        expect(p.types.find((t) => t.id === "L29b")!.text.replace(/\n/g, " ")).toBe("Real Pebble 2.0 screens, composed in one space. Nothing Pebble does is sped up.");
        // the decay and the room tone fit before the end
        const x = p.extra as Record<string, number>;
        expect(p.duration).toBeGreaterThanOrEqual(x.decayEnd + 0.5 * FPS);
      }
    }
  });
  test("one stone through the iris: the Return lands its stone where, and as large as, the title's", () => {
    for (const a of ["16:9", "1:1", "9:16"] as const) {
      const p = demoPlans(a).find((e) => e.plan.id === "return")!.plan;
      const conv = p.shots[0]!;
      const title = p.shots[1]!;
      const seam = p.seams[0]!;
      const end = seam.at + seam.frames; // the iris is fully open
      const pose = conv.camera.pose(end - conv.from);
      const at = worldToFrame(conv.stone!.at, pose, p.frame.w, p.frame.h);
      const page = worldToFrame(title.stone!.at, title.camera.pose(end - title.from), p.frame.w, p.frame.h);
      expect(Math.hypot(at.x - page.x, at.y - page.y)).toBeLessThan(6);
      const sizeConv = conv.stone!.size * pose.zoom;
      const sizePage = title.stone!.size * title.camera.pose(end - title.from).zoom;
      expect(Math.abs(Math.log(sizeConv / sizePage))).toBeLessThan(0.04);
    }
  });
  test("the sweep lightens the glyphs by at most 15 (L*), inside them only", () => {
    const a = sweepAlphaMax();
    expect(sweepLift(a)).toBeLessThanOrEqual(15 + 1e-6);
    expect(sweepLift(a)).toBeGreaterThan(14.5);
    expect(a).toBeGreaterThan(0.2);
  });
});

describe("one timeline for all three aspects (§3.12)", () => {
  test("every demo piece has the same duration, seams, takes, music events and timing in 16:9, 1:1 and 9:16", () => {
    const by = (a: "16:9" | "1:1" | "9:16") => demoPlans(a);
    for (let i = 0; i < by("16:9").length; i++) {
      const plans = { "16:9": by("16:9")[i]!.plan, "1:1": by("1:1")[i]!.plan, "9:16": by("9:16")[i]!.plan };
      expect(timelineDiffs(plans)).toEqual([]);
    }
  });
  test("aligning random grids gives one timeline too", () => {
    const r = rng(11);
    for (let i = 0; i < 2; i++) {
      const bpm = 90 + Math.round(r() * 40);
      const grid = steadyGrid({ bpm, fps: FPS, firstDownbeat: 0, from: 0, to: 4000 });
      const plans = alignAspects<RingTiming>((a, align) => planRingBlock({ ...SIZE[a], fps: FPS, content: ring4(a), grid, align }));
      expect(timelineDiffs(plans)).toEqual([]);
      const hit = 170 + Math.round(r() * 150);
      const g2 = steadyGrid({ bpm, fps: FPS, firstDownbeat: hit, from: 0, to: 4000 });
      expect(timelineDiffs(alignAspects<DropTiming>((a, align) => planDrop({ ...SIZE[a], fps: FPS, hit, grid: g2, align })))).toEqual([]);
    }
  });
});

describe("hand-offs between pieces", () => {
  test("the wall hands the convergence its camera, its parallax ref and its orbit clock: nothing jumps at the join", () => {
    // the two pieces left the demo on 28 Oct (OVERRIDES §61: the Return replaces them); planned here as the demo had them
    for (const a of ["16:9", "1:1", "9:16"] as const) {
      const wall = planWall({ ...SIZE[a], fps: FPS, grid: demoGrid(STRETCH.wall, 0, 6000, FPS), cutIn: { vScreen: { x: 3, y: 0 } } });
      const ex = wall.exit!;
      const fin = planFinale({ ...SIZE[a], fps: FPS, grid: demoGrid(STRETCH.finale, 300, 6000, FPS), hit: 300, lastNote: 540, decayS: 6.6, roomToneS: 0.75, entry: { pose: ex.pose, vel: ex.vel, ref: ex.ref }, wallElapsed: wall.duration });
      const ws = wall.shots[0]!;
      const fs = fin.shots[0]!;
      const pw = ws.camera.pose(wall.duration - 1);
      const pf = fs.camera.pose(0);
      expect(Math.abs(pf.x - pw.x)).toBeLessThan(2 / pw.zoom);
      expect(Math.abs(Math.log(pf.zoom / pw.zoom))).toBeLessThan(0.002);
      expect(fs.ref).toEqual(ws.ref);
      for (const c of ws.wall!.cells) {
        const before = cellAt(c, ws.wall!, wall.duration - 1, FPS).rect;
        const after = cellAt(c, fs.wall!, 0, FPS).rect;
        expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(2);
      }
    }
  });
});

describe("cues", () => {
  test("the cue templates pass the engine's own checks (D6)", () => {
    for (const [name, list] of Object.entries(PIECE_CUES)) expect(checkCues(list, name)).toEqual([]);
  });
  test("every demo plan's QA model tiles its frames", () => {
    for (const a of ["16:9", "1:1", "9:16"] as const) {
      for (const e of demoPlans(a)) {
        const q = planQa(e.plan);
        expect(q.shots[0]!.from).toBe(0);
        expect(q.shots[q.shots.length - 1]!.to).toBe(e.plan.duration);
      }
    }
  });
});
