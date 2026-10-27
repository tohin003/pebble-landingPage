// The craft review's fix round 1 (OVERRIDES §55, §58): the rules the fixes added, each with a planted canary where it
// is a check. The checks added after the review (tests/review-checks.test.ts) and every set-piece check
// (tests/setpieces.test.ts) hold the plans; these hold what the fixes themselves promise.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VelocityCamera } from "../motion/camera";
import { cameraFloor, type Finding } from "../qa/checks";
import { GRADES, deltaE, levels, lightArcProblems, modelArc, groundSample, type Grade } from "../light/grades";
import { checkTakeManifest, TAKE_HSB3, TAKE_HSF, TAKE_HSG, TAKE_RS13, TAKE_RS9, TAKE_RSW, type TakeManifest } from "../setpieces/take";
import { STILL } from "../setpieces/standins";
import { SLOT_LABEL_SWEEP_PX, checkPlan, planQa, slotLabels, takes, typeSafe } from "../setpieces/qa";
import { carriedRect } from "../setpieces/kit";
import { defaultEntranceOf, exitPlanOf, lineRect } from "../setpieces/frame";
import { EXIT, blurTiming, exitOutFrames, wordsIn } from "../type/exits";
import { checkJoins, firstReadableFrame } from "../setpieces/joins";
import { DEMO_JOINS, demoPlans } from "../setpieces/demo/plans";
import { FACT_GAP_EM, PAGE_GLIDE_PX, planFinale } from "../setpieces/finale";
import { planClimax } from "../setpieces/climax";
import { worldToFrame } from "../motion/camera";
import { approxLineWidth, typeSizePx } from "../type/scale";
import type { ScenePlan } from "../setpieces/scene";
import { GAP_INK_SHARE, ReelScan } from "../qa/reel-scan";

const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));
const ASPECTS = ["16:9", "1:1", "9:16"] as const;

/* ---------------------------------------------------------------- CR-03: a long block leaves softly ---------- */

describe("a long block blurs out over 14 frames, each word over 10 on power1.in (CR-03; the 9:16 reel's frame 3352)", () => {
  // GSAP's power1.in is a square, power2.in a cube; the largest one-frame drop of one word's ink, sampled on frames
  const curve: Record<string, (t: number) => number> = { "power1.in": (t) => t * t, "power2.in": (t) => t * t * t };
  const largestStep = (out: number, words: number, long: boolean): number => {
    const { each, stagger, ease } = blurTiming(out, words, long);
    let worst = 0;
    for (let j = 0; j < words; j++)
      for (let f = 1; f <= out + 2; f++) {
        const ink = (g: number) => 1 - curve[ease](Math.min(1, Math.max(0, (g - j * stagger) / each)));
        worst = Math.max(worst, ink(f - 1) - ink(f));
      }
    return worst;
  };
  test("the honest line (27 words) takes 14 frames in every aspect and is gone before its piece ends", () => {
    for (const a of ASPECTS) {
      const dusk = demoPlans(a).find((e) => e.plan.id === "dusk")!.plan;
      const t = dusk.types.find((x) => wordsIn(x.text) >= EXIT.longWords && x.exit !== "camera" && x.exitAt !== undefined)!;
      const plan = exitPlanOf(t.entrance ?? defaultEntranceOf(t.tier), t.exit ?? "blur", t.text, 60);
      expect(plan.total).toBe(EXIT.longFrames);
      expect(t.exitAt! + plan.total).toBeLessThanOrEqual(dusk.duration);
    }
  });
  test("its largest one-frame step is about half the old one; the canary: the old timing let 37 % of a word go at once", () => {
    const old = largestStep(12, 6, false);
    expect(old).toBeGreaterThan(0.36);
    expect(largestStep(EXIT.longFrames, 6, true)).toBeLessThan(old * 0.55);
    expect(largestStep(EXIT.longFrames, 4, true)).toBeLessThan(old * 0.55);
    expect(exitOutFrames(10, 60, 11)).toBe(EXIT.minFrames);
    expect(exitOutFrames(10, 60, 12)).toBe(EXIT.longFrames);
  });
});

/* ---------------------------------------------------------------- PLACEHOLDERS: every slot names itself ------ */

describe("a frame of slots always shows a slot's label, and a read slot shows its own (slotLabels)", () => {
  test("the demo's pieces pass in every aspect", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(slotLabels(plan).map((x) => `${a} ${plan.id}: ${x.message}`)).toEqual([]);
  });
  test("the canary: the Dusk's slots with their labels at the top left (as rendered before) fail in 1:1 and 9:16", () => {
    // the plan as it was: the workspace's and the palette's labels at their top left corner
    const unfocused = (plan: ScenePlan): ScenePlan => ({
      ...plan,
      shots: plan.shots.map((s) => ({
        ...s,
        planes: s.planes.map((pl) => {
          if (pl.content.kind !== "take" || pl.content.use.manifest.id !== "HS-B3") return pl;
          const m = pl.content.use.manifest;
          const views = Object.fromEntries(
            Object.entries(m.views).map(([k, v]) => [k, { ...v, slot: v.slot ? { ...v.slot, focus: undefined } : undefined, stills: v.stills?.map((x) => (x.standIn.kind === "slot" ? { ...x, standIn: { ...x.standIn, focus: undefined } } : x)) }]),
          );
          return { ...pl, content: { ...pl.content, use: { ...pl.content.use, manifest: { ...m, views } } } };
        }),
      })),
    });
    for (const a of ["1:1", "9:16"] as const) {
      const dusk = demoPlans(a).find((e) => e.plan.id === "dusk")!.plan;
      const found = slotLabels(unfocused(dusk)).map((x) => x.message);
      expect(found.some((m) => m.startsWith("dusk-palette: slots fill the frame (workspace:workspace) with no slot's label"))).toBe(true);
      expect(found.some((m) => m.startsWith("dusk-palette/palette:palette: read with its label cut"))).toBe(true);
    }
    // a camera sweep is not judged, nor is a frame with something else to read
    expect(SLOT_LABEL_SWEEP_PX).toBe(4);
  });
});

/* ---------------------------------------------------------------- CR-12: the conform, by timestamps only ------ */

describe("a recorded take is conformed by timestamps, never by frame count (CR-12)", () => {
  const good = (): TakeManifest => ({
    ...TAKE_RSW,
    placeholder: false,
    pattern: "takes/rs-w/{n}.png",
    frames: 1500,
    conform: {
      method: "fps-filter-cfr",
      command: "/opt/homebrew/bin/ffmpeg -hide_banner -i raw/RSW-01.mov -vf fps=60 -fps_mode cfr -an -c:v libx264 -crf 16 conformed/RSW-01.mp4",
      sourceDurationS: 25.004,
      outputDurationS: 25.0,
      events: { rowsComplete: { wallS: 2.0 }, cardLands: { wallS: 7.5 }, happy: { wallS: 7.7 } },
    },
  });
  test("every placeholder manifest passes (it has no frames yet), and so does a take conformed by timestamps", () => {
    for (const m of [TAKE_RS9, TAKE_HSF, TAKE_RSW, TAKE_HSG, TAKE_HSB3, TAKE_RS13]) expect(checkTakeManifest(m)).toEqual([]);
    expect(checkTakeManifest(good())).toEqual([]);
  });
  test("a recorded take with no conform record is refused", () => {
    const m = good();
    delete (m as { conform?: unknown }).conform;
    expect(checkTakeManifest(m).join()).toMatch(/no conform record/);
  });
  test("the canaries: an input-side -r, setpts, and another method are refused", () => {
    const withCmd = (command: string) => ({ ...good(), conform: { ...good().conform!, command } });
    expect(checkTakeManifest(withCmd("ffmpeg -r 60 -i raw/RSW-01.mov -c:v libx264 out.mp4")).join()).toMatch(/input's frame rate/);
    expect(checkTakeManifest(withCmd("ffmpeg -i raw.mov -vf setpts=N/60/TB,fps=60 -fps_mode cfr out.mp4")).join()).toMatch(/setpts/);
    expect(checkTakeManifest({ ...good(), conform: { ...good().conform!, method: "frame-count" as "fps-filter-cfr" } }).join()).toMatch(/only the timestamp conform/);
  });
  test("a variable-rate take conformed by frame count is caught by its durations and its events", () => {
    // a 25 s recording with 1,320 frames (an average 52.8 fps), read as 60 fps: 22 s, every wait shorter
    const m: TakeManifest = { ...good(), frames: 1320, conform: { ...good().conform!, outputDurationS: 22.0, events: { rowsComplete: { wallS: 2.27 }, cardLands: { wallS: 8.52 }, happy: { wallS: 8.75 } } } };
    const x = checkTakeManifest(m).join("\n");
    expect(x).toMatch(/more than a frame apart/);
    expect(x).toMatch(/re-timed by/);
  });
  test("a frame count that disagrees with the conformed duration is caught", () => {
    expect(checkTakeManifest({ ...good(), frames: 1490 }).join()).toMatch(/frames at 60 fps/);
  });
  test("an event with no wall-clock time is caught", () => {
    const m = good();
    expect(checkTakeManifest({ ...m, conform: { ...m.conform!, events: { cardLands: { wallS: 7.5 }, happy: { wallS: 7.7 } } } }).join()).toMatch(/rowsComplete/);
  });
  test("checkPlan refuses a plan that uses a take conformed by frame count", () => {
    const bad: TakeManifest = { ...good(), conform: { ...good().conform!, command: "ffmpeg -r 60 -i raw.mov out.mp4" } };
    const p = planClimax({ w: 1920, h: 1080, fps: 60, peak: 300, take: bad });
    expect(errorsOf(takes(p), "takes").some((x) => /input's frame rate/.test(x.message))).toBe(true);
    expect(errorsOf(checkPlan(p).errors, "takes").length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- CR-23: the Apache-2.0 notices --------------- */

describe("every HyperFrames port carries its notice (CR-23)", () => {
  const root = join(import.meta.dir, "..");
  const notices = readFileSync(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  const files = [...notices.matchAll(/^\| `([^`]+)`/gm)].map((m) => m[1]!.split(" ")[0]!);
  test("THIRD_PARTY_NOTICES.md lists the ports, with the copyright, the licence and the changes", () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
    expect(notices).toMatch(/Copyright 2026 HeyGen, Inc\./);
    expect(notices).toMatch(/Apache License, Version 2\.0/);
    expect(notices).toMatch(/modified for Pebble's film/);
  });
  test("each listed file says so in its header", () => {
    for (const f of files) {
      const head = readFileSync(join(root, f), "utf8").split("\n").slice(0, 3).join("\n");
      expect(`${f}: ${head}`).toContain("Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's film");
    }
  });
});

/* ---------------------------------------------------------------- §58: readPx is the measured truth ----------- */

describe("readPx is the measured truth (OVERRIDES §58)", () => {
  test("no still claims a reading size larger than its measured body text", () => {
    for (const s of Object.values(STILL)) if (s.readPx !== undefined && s.textPx !== undefined) expect(`${s.id} ${s.readPx}`).toBe(`${s.id} ${Math.min(s.readPx, s.textPx)}`);
  });
  test("the four the checks lane measured are their measured sizes", () => {
    expect(STILL.held.readPx).toBe(11.7);
    expect(STILL.testsCard.readPx).toBe(13.1);
    expect(STILL.approvalCard.readPx).toBe(13.8);
    expect(STILL.commandCard.readPx).toBe(13.1);
  });
});

/* ---------------------------------------------------------------- §58: the title and the end card glide -------- */

describe("the title and the end card glide; only the last breath is still (OVERRIDES §58)", () => {
  for (const a of ASPECTS) {
    test(`${a}: one rigid page pushing in at the floor or more from the iris to the last breath, which follows the decay`, () => {
      const p = demoPlans(a).find((e) => e.plan.id === "finale")!.plan;
      const x = p.extra as Record<string, number>;
      const title = p.shots.find((s) => s.id === "title")!;
      // the only declared wait is the room tone at the very end, after the music's decay
      expect(title.waits).toEqual([{ from: x.breathFrom, to: p.duration }]);
      expect(x.breathFrom).toBeGreaterThanOrEqual(x.decayEnd);
      expect((p.duration - x.breathFrom) / p.fps).toBeLessThanOrEqual(1.0);
      // the camera floor passes the whole piece (the waits are the breath alone)
      expect(errorsOf(cameraFloor(planQa(p)).findings)).toEqual([]);
      // and the page's corners move at PAGE_GLIDE_PX or more on every frame from the iris's end to the breath
      const half = Math.hypot(p.frame.w, p.frame.h) / 2;
      for (let fr = x.irisEnd; fr < x.breathFrom; fr += 5) {
        const v = title.camera.sample(fr - title.from).vel.lz * half;
        expect(v / p.frame.unit).toBeGreaterThanOrEqual(PAGE_GLIDE_PX - 1e-9);
      }
      // every line of the page is set in it, so the stone and the wordmark stay in register while they grow
      for (const t of p.types) expect(t.carry?.shot).toBe("title");
      const mark = p.types.find((t) => t.id === "L26")!;
      const r0 = lineRect(mark.text, mark.tier, p.frame, mark.box, mark.sizeT);
      const gap = (fr: number) => {
        const st = worldToFrame(title.stone!.at, title.camera.pose(fr - title.from), p.frame.w, p.frame.h);
        const m = carriedRect(p, mark, r0, fr);
        const k = title.camera.pose(fr - title.from).zoom;
        return (m.x - st.x) / k;
      };
      expect(Math.abs(gap(x.irisEnd + 40) - gap(x.factsHoldEnd - 10))).toBeLessThan(0.5);
      // and every line stays in the safe area while it is read
      expect(typeSafe(p)).toEqual([]);
    });
  }
  test("the canary: the old title (a breath of 0.08 px a frame, declared a wait to the end) is what the floor refuses", () => {
    const p = demoPlans("16:9").find((e) => e.plan.id === "finale")!.plan;
    const title = p.shots.find((s) => s.id === "title")!;
    const old = new VelocityCamera({ x: p.frame.w / 2, y: p.frame.h / 2, zoom: 1 }, { lz: 0.00007 });
    const q = planQa({ ...p, shots: p.shots.map((s) => (s === title ? { ...s, camera: old, waits: [{ from: p.duration - 45, to: p.duration }] } : s)) } as ScenePlan);
    expect(errorsOf(cameraFloor(q).findings).length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- CR-14: a light arc you can see -------------- */

describe("the light arc reads on the ground (CR-14)", () => {
  test("the model meets the lead's targets: warm and evening +10 R − B on day, dusk 10 % darker and bluer, evening slightly darker, ΔE 5", () => {
    expect(lightArcProblems(modelArc())).toEqual([]);
    const s = modelArc();
    expect(levels(s.warm).rMinusB - levels(s.day).rMinusB).toBeGreaterThanOrEqual(10);
    expect(levels(s.evening).rMinusB - levels(s.day).rMinusB).toBeGreaterThanOrEqual(10);
    expect(levels(s.dusk).luma).toBeLessThanOrEqual(0.9 * levels(s.day).luma);
  });
  test("the canary: the old 14 % soft-light wash with no ground light measures no arc", () => {
    const old = (g: Grade): Grade => ({ ...g, ground: [1, 1, 1], ui: [1, 1, 1] });
    const s = { ...modelArc(), warm: groundSample(old(GRADES.warm)), day: groundSample(old(GRADES.day)), dusk: groundSample(old(GRADES.dusk)), evening: groundSample(old(GRADES.evening)) };
    const p = lightArcProblems(s);
    expect(p.some((x) => /warm's ground/.test(x))).toBe(true);
    expect(p.some((x) => /dusk's ground/.test(x))).toBe(true);
  });
  test("the UI planes stay nearly neutral: white moves by under 8 levels a channel under every light grade", () => {
    for (const g of [GRADES.warm, GRADES.day, GRADES.evening, GRADES.morning]) for (let i = 0; i < 3; i++) expect(Math.abs(1 - g.ui[i]!)).toBeLessThan(0.08);
    expect(deltaE([1, 1, 1], [1, 1, 1])).toBe(0);
  });
});

/* ---------------------------------------------------------------- CR-06: designed joins ----------------------- */

describe("every join between the pieces is designed (CR-06)", () => {
  test("the demo's joins pass in every aspect: continued worlds continuous, cuts matched, each piece readable at once", () => {
    for (const a of ASPECTS) expect(checkJoins(demoPlans(a).map((e) => e.plan), DEMO_JOINS).map((f) => `${a} ${f.message}`)).toEqual([]);
  });
  test("the canaries: a cut between two rests, a continued world that jumps, a piece that opens on blank ground", () => {
    const ps = demoPlans("16:9").map((e) => e.plan);
    const ring = ps[1]!;
    const dusk = ps[2]!;
    const still = (p: ScenePlan, i: number) => ({ ...p, shots: p.shots.map((s, k) => (k === i ? { ...s, camera: new VelocityCamera(s.camera.pose(0)) } : s)) }) as ScenePlan;
    // both sides at rest
    const rests = checkJoins([still(ring, ring.shots.length - 1), still(dusk, 0)], ["cut"]);
    expect(rests.some((f) => /two rests/.test(f.message))).toBe(true);
    // the Drop's world continued from another pose
    const drop = ps[0]!;
    const moved = { ...ring, shots: ring.shots.map((s, k) => (k === 0 ? { ...s, camera: new VelocityCamera({ ...s.camera.pose(0), x: s.camera.pose(0).x + 300 }, s.camera.sample(0).vel) } : s)) } as ScenePlan;
    expect(checkJoins([drop, moved], ["continue"]).some((f) => /jumps/.test(f.message))).toBe(true);
    // the Dusk with its workspace and palette taken out opens on bare ground
    const bare = { ...dusk, shots: dusk.shots.map((s, k) => (k === 0 ? { ...s, planes: [] } : s)), types: dusk.types.filter((t) => t.id !== "L21") } as ScenePlan;
    expect(firstReadableFrame(bare)).toBeNull();
    expect(checkJoins([ring, bare], ["cut"]).some((f) => /nothing to read/.test(f.message))).toBe(true);
  });
});

/* ---------------------------------------------------------------- CR-20: the facts are separate spans --------- */

describe("the end card's facts are separate spans with a margin (CR-20)", () => {
  test("never one string with spaces: each fact its own line, rows with FACT_GAP_EM between their facts", () => {
    for (const a of ASPECTS) {
      const p = demoPlans(a).find((e) => e.plan.id === "finale")!.plan;
      const facts = p.types.filter((t) => /^L28-\d/.test(t.id));
      for (const t of facts) expect(t.text).not.toMatch(/\s{2,}/);
      const byRow = new Map<number, typeof facts>();
      for (const t of facts) byRow.set(t.box.top, [...(byRow.get(t.box.top) ?? []), t]);
      for (const row of byRow.values()) {
        const sorted = [...row].sort((x, y) => x.box.left - y.box.left);
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1]!;
          const size = typeSizePx("functional", p.frame.w, p.frame.h, prev.sizeT ?? 0.5);
          const gap = sorted[i]!.box.left - (prev.box.left + approxLineWidth(prev.text, "functional", p.frame.w, p.frame.h, prev.sizeT ?? 0.5));
          expect(gap / size).toBeCloseTo(FACT_GAP_EM, 6);
        }
      }
      // and the plan names each gap, for the render's check (9:16 sets one fact a line: no gaps)
      const gaps = ((p.extra as { factGaps: unknown[] }).factGaps ?? []).length;
      const multi = [...byRow.values()].filter((r) => r.length > 1).reduce((n, r) => n + r.length - 1, 0);
      expect(gaps).toBe(multi);
      if (a !== "9:16") expect(gaps).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------------- CR-18: no dissolves between placeholder states */

describe("placeholder states switch with a hard cut (CR-18)", () => {
  test("no placeholder view fades a still out (a dissolve), and the drop's companion is RS-9's own view", () => {
    for (const m of [TAKE_RS9, TAKE_HSF, TAKE_RSW, TAKE_HSG, TAKE_HSB3, TAKE_RS13])
      for (const v of Object.values(m.views)) for (const s of v.stills ?? []) expect(Object.keys(s)).not.toContain("fadeOut");
    for (const a of ASPECTS) {
      const drop = demoPlans(a)[0]!.plan;
      const comp = drop.shots[0]!.planes.find((x) => x.id === "companion")!;
      expect(comp.content.kind).toBe("take");
    }
  });
});

/* ---------------------------------------------------------------- the finale for any title downbeat ----------- */

describe("the finale's glide holds for other music", () => {
  test("titles on other downbeats and other decays still glide, and the breath stays at the very end", () => {
    for (const [hit, decayS] of [
      [260, 4],
      [377, 9],
    ] as const) {
      for (const [w, h] of [
        [1920, 1080],
        [1080, 1080],
        [1080, 1920],
      ] as const) {
        const p = planFinale({ w, h, fps: 60, hit, decayS });
        const x = p.extra as Record<string, number>;
        expect(errorsOf(cameraFloor(planQa(p)).findings)).toEqual([]);
        expect(x.breathFrom).toBeGreaterThanOrEqual(x.decayEnd);
        expect(typeSafe(p)).toEqual([]);
      }
    }
  });
});

/* ---------------------------------------------------------------- the render checks the fixes added ------------- */

describe("the reel scan's checks for the fixes (CR-18, CR-20, carried type)", () => {
  const w = 320;
  const h = 180;
  const base = { aspect: "16:9", fps: 60, width: 640, height: 360, total: 60, cuts: [], waits: [], hits: [], stones: [], apertures: [] };
  const ground = () => {
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = 214 + ((x * 7 + y * 3) % 9);
    return px;
  };
  test("CR-20: two facts that run into their margin are caught; an empty margin passes", () => {
    const marks = { ...base, types: [], gaps: [{ id: "finale/L28-0-1-gap", from: 10, to: 50, rect: { x: 300, y: 100, w: 24, h: 30 }, inkLuma: 40 }] };
    const run = (ink: boolean) => {
      const scan = new ReelScan(w, h, marks);
      for (let f = 0; f < 60; f++) {
        const px = ground();
        // the right-hand fact's first glyph 6 px into the margin (half size: the gap is 150–162 × 50–65)
        if (ink) for (let y = 52; y < 64; y++) for (let x = 150; x < 156; x++) px[y * w + x] = 40;
        scan.push(px);
      }
      return scan.finish();
    };
    // (a still synthetic reel is a dead second too: only the gap's own finding is looked at here)
    expect(run(false).problems.filter((p) => p.startsWith("gap:"))).toEqual([]);
    expect(run(false).gaps[0]!.worstShare).toBe(0);
    const bad = run(true);
    expect(bad.problems.filter((p) => p.startsWith("gap:")).some((p) => /two facts run together/.test(p))).toBe(true);
    expect(bad.gaps[0]!.worstShare).toBeGreaterThan(GAP_INK_SHARE);
  });
  test("CR-18: a placeholder's hard cut on its event frame is listed as the take's state change, not judged as a pop", () => {
    const run = (states?: { frame: number; id: string }[]) => {
      const scan = new ReelScan(w, h, { ...base, types: [], ...(states ? { states } : {}) });
      for (let f = 0; f < 60; f++) {
        const px = ground();
        // a big panel switching from a slot to a real frame on frame 30
        if (f >= 30) for (let y = 20; y < 160; y++) for (let x = 180; x < 300; x++) px[y * w + x] = 120;
        scan.push(px);
      }
      return scan.finish();
    };
    const pops = (r: ReturnType<typeof run>) => r.problems.filter((p) => /pop/.test(p));
    expect(pops(run()).length).toBeGreaterThan(0);
    expect(pops(run([{ frame: 30, id: "drop/companion:companionWorking" }]))).toEqual([]);
  });
  test("a line set in the world is measured where its world carries it, so its ink holds while the page moves", () => {
    const rectAt: Record<number, [number, number, number, number]> = {};
    for (let f = 0; f < 60; f++) rectAt[f] = [40 + 2 * f, 140, 200, 40];
    const track = { id: "finale/L27", text: "The desktop companion", rect: { x: 40, y: 140, w: 200, h: 40 }, polarity: "dark" as const, inkLuma: 40, from: 0, landed: 4, until: 60, exits: [] };
    const run = (moving: boolean) => {
      const scan = new ReelScan(w, h, { ...base, types: [{ ...track, ...(moving ? { rectAt } : {}) }] });
      for (let f = 0; f < 60; f++) {
        const px = ground();
        // the line drifts right 1 px a frame at half size (the page pushing in), wholly inside its moving rect
        for (let y = 75; y < 88; y++) for (let x = 22 + f; x < 118 + f; x++) if (x % 5 < 2) px[y * w + x] = 40;
        scan.push(px);
      }
      return scan.finish();
    };
    // measured in the fixed rect, the drifting line slides out of it; in its moving rect it holds its ink
    const ink = (r: ReturnType<typeof run>) => r.inkSeries["finale/L27"]!;
    const fixed = ink(run(false));
    const moving = ink(run(true));
    expect(fixed[59]! / fixed[5]!).toBeLessThan(0.5);
    expect(moving[59]! / moving[5]!).toBeGreaterThan(0.9);
    expect(run(true).ink.filter((x) => x.kind === "vanish")).toEqual([]);
  });
});
