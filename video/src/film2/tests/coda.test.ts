// The post-credit scene (setpieces/coda.ts, setpieces/codaChecks.ts; POSTCREDIT_DESIGN §5; OVERRIDES §62; D157): the
// coda as planned passes every check in all three aspects, on one timeline, continuing the end card without changing a
// frame of it; and every coda check FAILS on its planted canary: the forbidden words and numbers, a version or a date,
// short reading holds, two stones, a camera that stops, the wrong pose, a mock screen, a flash, the X cut.
import { describe, expect, test } from "bun:test";
import { VelocityCamera, type CamSample } from "../motion/camera";
import type { Aspect } from "../tokens";
import { checkAll, copy, type Finding } from "../qa/checks";
import type { FilmTimelineQa } from "../qa/timeline";
import { checkPlan, groundCoverage, irisOnFrame, planQa, stoneCount } from "../setpieces/qa";
import { groundView } from "../setpieces/ground";
import { demoPlans } from "../setpieces/demo/plans";
import { timelineDiffs } from "../setpieces/align";
import { checkJoins } from "../setpieces/joins";
import { blinkStartsFor, offsetForBlink } from "../setpieces/blink";
import { checkCues } from "../../../../shared/pebble/cues";
import { CODA_CUES } from "../setpieces/coda.cues";
import { CODA_GRID, CODA_TEXT, codaFlashModel, codaIrisIn, codaIrisOut, codaOf, codaPlacement, planCoda, xCutFrames, type CodaExtra, type FilmPiece } from "../setpieces/coda";
import { CODA_CHECKS, codaCamera, codaCaptions, codaChecks, codaHolds, codaLockup, codaNoUi, codaPose, codaSound, codaStone, codaStonesOn, codaWords, forbiddenIn } from "../setpieces/codaChecks";
import type { ScenePlan, ShotSpec, TypeSpec } from "../setpieces/scene";

const ASPECTS: readonly Aspect[] = ["16:9", "1:1", "9:16"];
const SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };
const piece = (a: Aspect, id: string): ScenePlan => demoPlans(a).find((e) => e.plan.id === id)!.plan;
const coda = (a: Aspect) => piece(a, "coda");
const endCard = (a: Aspect) => piece(a, "finale");
const X = (p: ScenePlan): CodaExtra => codaOf(p)!;
const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));
const msgs = (xs: readonly Finding[]) => xs.map((x) => `[${x.check}] ${x.message}`);

/** A copy of a plan with one shot changed. */
const withShot = (p: ScenePlan, id: string, f: (s: ShotSpec) => ShotSpec): ScenePlan => ({ ...p, shots: p.shots.map((s) => (s.id === id ? f(s) : s)) });
/** A copy of a plan with one line changed. */
const withLine = (p: ScenePlan, id: string, f: (t: TypeSpec) => TypeSpec): ScenePlan => ({ ...p, types: p.types.map((t) => (t.id === id ? f(t) : t)) });
/** A copy of a plan with its coda data changed. */
const withCoda = (p: ScenePlan, f: (x: CodaExtra) => CodaExtra): ScenePlan => ({ ...p, extra: { ...p.extra, coda: f(X(p)) } });
/** A coda planned against the demo's end card, with options. */
const plan = (a: Aspect, o: Partial<Parameters<typeof planCoda>[0]> = {}) => planCoda({ ...SIZE[a], fps: 60, endCard: endCard(a), ...o });
/** Where a line lands. */
const landed = (t: TypeSpec) => t.at + 30 + 8 * (t.text.split("\n").length - 1);

/* ---------------------------------------------------------------- as planned ---------------------------------- */

describe("the coda, as planned (POSTCREDIT_DESIGN §3)", () => {
  test("passes every check in every aspect: the foundation's, the set pieces' and the coda's own", () => {
    for (const a of ASPECTS) {
      const r = checkPlan(coda(a), CODA_GRID);
      expect(msgs(r.errors).map((m) => `${a} ${m}`)).toEqual([]);
      expect(msgs(errorsOf(codaChecks(coda(a)))).map((m) => `${a} ${m}`)).toEqual([]);
    }
  });
  test("one timeline: the same frames, seams and timing in 16:9, 1:1 and 9:16 (the tap lands everywhere at once)", () => {
    expect(timelineDiffs({ "16:9": coda("16:9"), "1:1": coda("1:1"), "9:16": coda("9:16") })).toEqual([]);
    const lands = ASPECTS.map((a) => ["L-C1", "L-C2", "L-C3"].map((id) => landed(coda(a).types.find((t) => t.id === id)!)));
    expect(lands[1]).toEqual(lands[0]!);
    expect(lands[2]).toEqual(lands[0]!);
    for (const a of ASPECTS) expect(X(coda(a)).sound.tap.at).toBe(lands[0]![1]!);
  });
  test("the beats: the iris-out L4–L33, a breath of 0.6 s or more, the iris-in from the stone, three lines, the last breath", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      expect([x.irisOut.at, x.irisOut.frames]).toEqual([4, 30]);
      expect(x.breath.from).toBe(34);
      expect(x.irisIn.at).toBeGreaterThanOrEqual(70);
      expect(x.irisIn.at - x.breath.from).toBeGreaterThanOrEqual(36);
      expect(x.irisIn.frames).toBe(36);
      const t = p.extra!.timing as Record<string, number>;
      expect(t.line1).toBe(x.irisIn.at + 60);
      expect(t.line2 - t.line1).toBe(100);
      expect(t.line3 - t.line2).toBe(8);
      expect(t.still - t.ease).toBe(18);
      expect([x.lastBreath.from, x.lastBreath.to]).toEqual([t.end - 30, t.end]);
      expect(p.duration).toBe(t.end);
      // the design's 456 frames, plus what the flash model asked the breath to wait (9 frames at most here)
      expect(p.duration - 456).toBe(x.irisIn.at - 70);
      expect(x.irisIn.at - 70).toBeLessThanOrEqual(12);
    }
  });
  test("its words: the pose's own, the release session's line, the status; L-C2 breaks after \"learn\" in 1:1 and 9:16", () => {
    expect(coda("16:9").types.filter((t) => t.id.startsWith("L-C")).map((t) => t.text)).toEqual([CODA_TEXT.rests, CODA_TEXT.soon, CODA_TEXT.status]);
    for (const a of ["1:1", "9:16"] as const) expect(coda(a).types.find((t) => t.id === "L-C2")!.text).toBe("Soon, it will learn\nwhile it does.");
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(p.types.find((t) => t.id === "L-C1")!.color).toBe("#E8EEE6");
      expect(p.types.find((t) => t.id === "L-C3")!.color).toBe("#ADB9AB");
      expect(p.types.filter((t) => t.id.startsWith("L-C")).every((t) => t.exitAt === undefined && t.carry?.shot === "coda")).toBe(true);
      expect(p.endsFilm).toBe(true);
    }
  });
  test("the engine's cues: the Companion's resting pose only (D6)", () => {
    expect(checkCues(CODA_CUES, "CODA_CUES")).toEqual([]);
    expect(CODA_CUES.map((c) => c.pose)).toEqual(["sleepy"]);
  });
});

/* ---------------------------------------------------------------- the end card, untouched ---------------------- */

describe("it continues the end card, which does not change (C10's half: nothing before L0 changes)", () => {
  test("the join is the end card's own next frame: one world, one camera, one parallax ref (checkJoins: continue)", () => {
    for (const a of ASPECTS) expect(checkJoins([endCard(a), coda(a)], ["continue"]).map((f) => `${a} ${f.message}`)).toEqual([]);
  });
  /** Every way the end card the view plays on differs from the end card before the end card's own end (none, as built). */
  const changesBeforeEnd = (ec: ScenePlan, ext: ScenePlan): string[] => {
    const out: string[] = [];
    const end = ec.duration;
    ec.shots.forEach((s, i) => {
      const e = ext.shots[i];
      if (!e || e.id !== s.id || e.from !== s.from) return void out.push(`shot ${s.id} is not where it was`);
      for (let fr = s.from; fr < Math.min(s.to, end); fr++) {
        const A = s.camera.sample(fr - s.from).pose;
        const B = e.camera.sample(fr - e.from).pose;
        if (Math.abs(A.zoom - B.zoom) + Math.abs(A.x - B.x) + Math.abs(A.y - B.y) > 1e-9) return void out.push(`shot ${s.id}'s camera moves differently on ${fr}`);
      }
    });
    if (ext.types.length !== ec.types.length) out.push("the lines differ");
    ec.types.forEach((t, i) => {
      const e = ext.types[i]!;
      const { exitAt: a, exit: _x, ...restT } = t;
      const { exitAt: b, exit: _y, ...restE } = e;
      if (JSON.stringify(restT) !== JSON.stringify(restE)) out.push(`${t.id} changed`);
      // only a line the end card held to its end may gain an exit, and only from its end
      if (a === undefined ? b !== undefined && b < end : a !== b) out.push(`${t.id} leaves on ${b} (it left on ${a ?? "the end"})`);
    });
    return out;
  };
  test("the end card the view plays on is the end card itself on every frame before its end", () => {
    for (const a of ASPECTS) {
      const ec = endCard(a);
      const x = X(coda(a));
      expect(x.endCard.end).toBe(ec.duration);
      expect(changesBeforeEnd(ec, x.endCard.extended).map((m) => `${a} ${m}`)).toEqual([]);
      // its stone keeps its clock: the page's stone runs on (local + clockOffset) with the end card's own frames
      const st0 = ec.shots[ec.shots.length - 1]!.stone!;
      const st1 = coda(a).shots[0]!.stone!;
      expect((st1.clockOffset ?? 0) - (st0.clockOffset ?? 0)).toBe(ec.duration);
    }
  });
  test("the canaries: page 2 leaving a frame before the end, or a page that settles differently, change the X cut", () => {
    const ec = endCard("16:9");
    const ext = X(coda("16:9")).endCard.extended;
    const early = { ...ext, types: ext.types.map((t) => (t.exitAt === ec.duration ? { ...t, exitAt: ec.duration - 1 } : t)) };
    expect(changesBeforeEnd(ec, early).length).toBeGreaterThan(0);
    const title = ext.shots[ext.shots.length - 1]!;
    const glides = { ...ext, shots: ext.shots.map((s) => (s === title ? { ...s, camera: new VelocityCamera(s.camera.pose(0), s.camera.sample(0).vel) } : s)) };
    expect(changesBeforeEnd(ec, glides).length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- C1: forbidden words and numbers -------------- */

const CANARIES = [
  "Pebble never forgets.",
  "It rewrites its memory while it rests.",
  "Pebble learns everything.",
  "Smarter every night.",
  "Coming in 2.1.",
  "Coming this winter.",
  "Twice as good at repeated work.",
  "Learns on a small Qwen model.",
  "Now available.",
];

describe("C1: the coda never says §62's four phrases, a number, a name or that it is out", () => {
  test("every canary is refused, word by word", () => {
    for (const c of CANARIES) expect(forbiddenIn(c).length).toBeGreaterThan(0);
  });
  test("each canary as a line of the coda fails checkPlan, in every aspect", () => {
    for (const a of ASPECTS)
      for (const c of CANARIES) {
        const p = plan(a, { text: { status: c } });
        expect(errorsOf(codaWords(p, X(p))).length).toBeGreaterThan(0);
        expect(checkPlan(p, CODA_GRID).ok).toBe(false);
      }
  });
  test("what the coda and the page say passes: the three lines, the page's two sentences, the description", () => {
    for (const s of [CODA_TEXT.rests, CODA_TEXT.soon, CODA_TEXT.status, CODA_TEXT.description, CODA_TEXT.transcript, "Coming next: learning while resting.", "Not built yet. It comes only if measurement shows it helps."]) expect(forbiddenIn(s)).toEqual([]);
  });
  test("the description and the captions are held to it too (a canary in each)", () => {
    const p = coda("16:9");
    const desc = withCoda(p, (x) => ({ ...x, text: { ...x.text, description: "Coming soon: Pebble never forgets." } as never }));
    expect(errorsOf(codaWords(desc, X(desc)))).not.toEqual([]);
    const cap = withCoda(p, (x) => ({ ...x, captions: [...x.captions.slice(0, 2), { ...x.captions[2]!, text: "[A soft tap]\nSmarter every night." }] }));
    expect(errorsOf(codaWords(cap, X(cap)))).not.toEqual([]);
  });
  test("the film's own never-list carries the four phrases, for every line of the film (qa/checks.ts copy)", () => {
    const t = (text: string) => ({ texts: [{ id: "x", text, from: 0, to: 100, kind: "film" as const }] }) as unknown as FilmTimelineQa;
    for (const c of CANARIES.slice(0, 4)) expect(copy(t(c)).length).toBeGreaterThan(0);
    expect(copy(t(CODA_TEXT.soon))).toEqual([]);
  });
  test("the end card's lines carried in pass only as they leave (they start before the coda and are gone by the iris-out)", () => {
    const p = coda("16:9");
    const id = X(p).carried[0]!;
    const stays = withLine(p, id, (t) => ({ ...t, exitAt: 40 }));
    expect(errorsOf(codaWords(stays, X(stays))).some((f) => f.message.includes(id))).toBe(true);
  });
});

describe("C1: no version and no date", () => {
  test("versions, release words, months, seasons, quarters, years and windows are refused", () => {
    for (const s of ["Coming in 2.1.", "Coming in version two.", "Coming in the next release.", "Coming in March.", "Coming next spring.", "Coming this year.", "Coming in Q1.", "Out in 2027.", "Coming later this month.", "In the coming weeks.", "Coming in early autumn.", "Coming on Monday."]) expect(forbiddenIn(s).length).toBeGreaterThan(0);
  });
  test("a version in the coda's line fails checkPlan in every aspect", () => {
    for (const a of ASPECTS) {
      const p = plan(a, { text: { rests: "Pebble 2.1 rests." } });
      expect(errorsOf(checkPlan(p, CODA_GRID).errors, "codaWords").length).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------------- C3: reading holds -------------------------- */

describe("C3: every line is held for its reading time", () => {
  const lineAt = (p: ScenePlan, id: string, land: number) => withLine(p, id, (t) => ({ ...t, at: land - (landed(t) - t.at) }));
  test("the canary: L-C2 held 2.0 s (it needs 2.6) fails", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const bad = lineAt(p, "L-C2", p.duration - 120);
      expect(errorsOf(codaHolds(bad, X(bad))).some((f) => f.message.startsWith("L-C2"))).toBe(true);
      expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
    }
  });
  test("the canary: L-C3 landing 1.0 s before the end fails (its own hold, and the promise with its limit)", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const bad = lineAt(p, "L-C3", p.duration - 60);
      const xs = errorsOf(codaHolds(bad, X(bad)));
      expect(xs.some((f) => f.message.startsWith("L-C3"))).toBe(true);
      expect(xs.some((f) => f.message.includes("together"))).toBe(true);
    }
  });
  test("the canary: all three lines landing together fails (one beat at a time; read in order at 3.14 words a second)", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const at = landed(p.types.find((t) => t.id === "L-C2")!);
      const bad = lineAt(lineAt(p, "L-C1", at), "L-C3", at);
      const xs = errorsOf(codaHolds(bad, X(bad)));
      expect(xs.some((f) => f.message.includes("one beat at a time"))).toBe(true);
      expect(xs.some((f) => f.message.includes("words a second"))).toBe(true);
    }
  });
  test("as planned: L-C1 holds 2 s or more, L-C2 2.6 s, L-C3 1.4 s, the pair 3.5 s, and the reader is done before the end", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const held = (id: string) => (p.duration - landed(p.types.find((t) => t.id === id)!)) / 60;
      expect(held("L-C1")).toBeGreaterThanOrEqual(2);
      expect(held("L-C2")).toBeGreaterThanOrEqual(2.6);
      expect(held("L-C3")).toBeGreaterThanOrEqual(3.5);
    }
  });
});

/* ---------------------------------------------------------------- C4: one stone ------------------------------- */

describe("C4: one stone", () => {
  test("as planned: the end card's stone is wholly covered before the coda's first shows, and no frame shows two", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      let lastPage = -1;
      let firstCoda = -1;
      for (let fr = 0; fr < p.duration; fr++) {
        const on = codaStonesOn(p, x, fr);
        expect(on.length).toBeLessThanOrEqual(1);
        if (on.some((s) => s.shot === "page")) lastPage = fr;
        if (firstCoda < 0 && on.some((s) => s.shot === "coda")) firstCoda = fr;
      }
      expect(lastPage).toBeLessThan(x.irisOut.at + x.irisOut.frames);
      expect(firstCoda).toBe(x.irisIn.at);
      // the iris-out closes onto the stone's face; the iris-in opens from the coda stone's face
      const out = codaIrisOut(p, x.irisOut.at + x.irisOut.frames - 1)!;
      const st = codaStonesOn(p, x, 0)[0]!;
      expect(Math.hypot(out.c.x - st.c.x, out.c.y - st.c.y)).toBeLessThan(st.r * 0.1);
      expect(out.R).toBeLessThan(st.r * 0.1);
    }
  });
  test("the opening iris is the one setpieces/qa.ts models (and ringIris() draws)", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const seam = p.seams.find((s) => s.in === "coda")!;
      for (let fr = seam.at; fr < seam.at + seam.frames; fr += 5) {
        const mine = codaIrisIn(p, fr)!;
        const theirs = irisOnFrame(p, seam, fr);
        expect(Math.abs(mine.R - theirs.R) + Math.abs(mine.c.x - theirs.c.x) + Math.abs(mine.c.y - theirs.c.y)).toBeLessThan(1e-6);
      }
    }
  });
  test("the canary: an iris-in that starts on L30, while the iris-out still shows the end card's stone, fails", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      const early = 30;
      const bad: ScenePlan = {
        ...withCoda(p, (y) => ({ ...y, irisIn: { ...y.irisIn, at: early }, breath: { from: y.breath.from, to: early } })),
        shots: p.shots.map((s) => (s.id === "breath" ? { ...s, to: early, waits: [] } : s.id === "coda" ? { ...s, from: early } : s)),
        seams: p.seams.map((s) => (s.in === "coda" ? { ...s, at: early, swapAt: early + 18, covered: { from: early, to: early + s.frames } } : s)),
      };
      const xs = errorsOf(codaStone(bad, X(bad)));
      expect(xs.some((f) => /before the iris-out has shut/.test(f.message))).toBe(true);
      expect(xs.some((f) => /two stones/.test(f.message))).toBe(true);
      expect(x.irisIn.at).toBeGreaterThan(early);
    }
  });
  test("the canary: a second stone in the coda fails (the coda's own check and the set pieces' stoneCount)", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const st = p.shots.find((s) => s.id === "coda")!.stone!;
      const bad = withShot(p, "breath", (s) => ({ ...s, stone: { ...st, at: { x: st.at.x + 400, y: st.at.y } } }));
      expect(errorsOf(codaStone(bad, X(bad)))).not.toEqual([]);
      expect(errorsOf(stoneCount(bad))).not.toEqual([]);
      expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------- C7: the camera ------------------------------ */

/** A camera that holds still on [a, b) (local frames) and then moves on as before, from where it stopped. */
class HeldCamera extends VelocityCamera {
  constructor(
    private readonly base: VelocityCamera,
    private readonly a: number,
    private readonly b: number,
  ) {
    super(base.pose(0), base.sample(0).vel, 0);
  }
  override sample(f: number): CamSample {
    if (f < this.a) return this.base.sample(f);
    if (f < this.b) return { ...this.base.sample(this.a), frame: f, vel: { x: 0, y: 0, lz: 0 } };
    return { ...this.base.sample(f - (this.b - this.a)), frame: f };
  }
}

/** A camera that is `base` until `at` and then sets off at a push of its own (a settled page starting again). */
class RestartCamera extends VelocityCamera {
  constructor(
    private readonly base: VelocityCamera,
    private readonly at: number,
  ) {
    super(base.pose(at), { lz: 0.0004 }, at);
  }
  override sample(f: number): CamSample {
    return f < this.at ? this.base.sample(f) : super.sample(f);
  }
}

describe("C7: the camera never fully stops, but for the breath and the film's last breath", () => {
  test("as planned: moving from the coda's first frame, at the floor or more until its ease, dead still in the last breath", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(errorsOf(codaCamera(p, X(p)))).toEqual([]);
      expect(errorsOf(checkAll(planQa(p)).errors, "cameraFloor")).toEqual([]);
    }
  });
  const held = (p: ScenePlan) => withShot(p, "coda", (s) => ({ ...s, camera: new HeldCamera(s.camera, 240 - s.from, 330 - s.from) }));
  test("the canary: an arrive-and-hold at L240–L330 fails (the coda's check and the foundation's camera floor)", () => {
    for (const a of ASPECTS) {
      const bad = held(coda(a));
      expect(errorsOf(codaCamera(bad, X(bad))).some((f) => /arrive and hold/.test(f.message))).toBe(true);
      expect(errorsOf(checkAll(planQa(bad)).errors, "cameraFloor")).not.toEqual([]);
    }
  });
  test("the canary: the same hold declared as a third wait still fails (exactly two waits)", () => {
    for (const a of ASPECTS) {
      const h = held(coda(a));
      const bad = withShot(h, "coda", (s) => ({ ...s, waits: [...(s.waits ?? []), { from: 240, to: 330 }] }));
      expect(errorsOf(checkAll(planQa(bad)).errors, "cameraFloor")).toEqual([]);
      expect(errorsOf(codaCamera(bad, X(bad))).some((f) => /exactly two/.test(f.message))).toBe(true);
    }
  });
  test("the canary: a still last breath in the middle of the scene fails (only the film's last breath)", () => {
    const p = coda("16:9");
    const bad = withCoda(p, (x) => ({ ...x, lastBreath: { from: 300, to: 330 } }));
    expect(errorsOf(codaCamera(bad, X(bad)))).not.toEqual([]);
  });
  test("the canary: a push that starts late (the coda opens on a still camera) fails", () => {
    const p = coda("16:9");
    const bad = withShot(p, "coda", (s) => ({ ...s, camera: new HeldCamera(s.camera, 0, 40) }));
    expect(errorsOf(codaCamera(bad, X(bad))).some((f) => /first frame/.test(f.message))).toBe(true);
  });
  test("the canary: the end card's page starting to move again under the iris-out fails", () => {
    const p = coda("16:9");
    const bad = withShot(p, "page", (s) => ({ ...s, camera: new RestartCamera(s.camera, 10) }));
    expect(errorsOf(codaCamera(bad, X(bad))).some((f) => /starts moving again/.test(f.message))).toBe(true);
  });
});

/* ---------------------------------------------------------------- C5: the pose -------------------------------- */

describe("C5: the Companion's resting pose, its hold and its blink", () => {
  test("as planned: sleepy, created asleep, dark; shown under 8 s; one blink where planned, none in the kept-clear spans", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      expect(errorsOf(codaPose(p, x))).toEqual([]);
      expect((p.duration - x.irisIn.at) / 60).toBeLessThan(8);
      const blinks = blinkStartsFor(x.stone.blink.clockOffset, 60, x.irisIn.at, p.duration);
      expect(blinks.some((b) => Math.abs(b - x.stone.blink.target) <= 1)).toBe(true);
      // the planned blink comes alone: no double blink round it
      expect(blinks.filter((b) => Math.abs(b - x.stone.blink.target) < 40).length).toBe(1);
    }
  });
  test("the canary: the engine's catalogue `sleep` state fails (D6)", () => {
    const p = coda("16:9");
    const bad = withShot(p, "coda", (s) => ({ ...s, stone: { ...s.stone!, cues: [{ at: 0, pose: "sleep" as never }] } }));
    expect(errorsOf(codaPose(bad, X(bad)))).not.toEqual([]);
    expect(errorsOf(checkPlan(bad, CODA_GRID).errors, "cues")).not.toEqual([]);
  });
  test("the canary: a 9-s visible span fails (the app holds a calm pose still after 8 s)", () => {
    // the hold that makes the stone show for 9 s: 60 + 100 + 8 + hold + 18 + 30 frames = 540
    const bad = plan("16:9", { hold: 324 });
    expect((bad.duration - X(bad).irisIn.at) / 60).toBe(9);
    expect(errorsOf(codaPose(bad, X(bad))).some((f) => /8 s/.test(f.message))).toBe(true);
  });
  test("the canary: a blink on L-C2's landing (L230 in the design) fails", () => {
    const p = coda("16:9");
    const land = landed(p.types.find((t) => t.id === "L-C2")!);
    const off = offsetForBlink(land, 60, []);
    const bad = plan("16:9", { clockOffset: off, irisIn: X(p).irisIn.at });
    expect(blinkStartsFor(off, 60, 0, bad.duration).some((b) => Math.abs(b - land) <= 1)).toBe(true);
    expect(errorsOf(codaPose(bad, X(bad)))).not.toEqual([]);
  });
  test("the canaries: the light palette, and an engine started awake (a morph into the pose) fail", () => {
    const p = coda("16:9");
    const light = withCoda(p, (x) => ({ ...x, stone: { ...x.stone, colors: { body: "#536B54", eye: "#FFFFFF" } as never } }));
    expect(errorsOf(codaPose(light, X(light)))).not.toEqual([]);
    const awake = withCoda(p, (x) => ({ ...x, stone: { ...x.stone, initialPose: "idle" as never } }));
    expect(errorsOf(codaPose(awake, X(awake)))).not.toEqual([]);
  });
});

/* ---------------------------------------------------------------- C6: no mock screen -------------------------- */

describe("C6: no mock screen", () => {
  test("as planned: no planes, takes, cascades or rings", () => {
    for (const a of ASPECTS) expect(errorsOf(codaNoUi(coda(a)))).toEqual([]);
  });
  test("the canary: a coda with one plane (a screen of the feature) fails", () => {
    const p = coda("16:9");
    const bad = withShot(p, "coda", (s) => ({ ...s, planes: [{ id: "lessons", kind: "pebble", rect: { x: 900, y: 300, w: 600, h: 400 }, content: { kind: "image", src: "ui/lessons.png", w: 600, h: 400, note: "a made-up screen" } }] }));
    expect(errorsOf(codaNoUi(bad))).not.toEqual([]);
    expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
  });
  test("the canary: a ring in the coda (the feature at work) fails", () => {
    const p = coda("16:9");
    const bad = withShot(p, "coda", (s) => ({ ...s, rings: [{ id: "learn", start: 200, source: s.stone!.at, stoneRadius: 40, phases: [{ kind: "emit", frames: 36, radius: 300 }] }] }));
    expect(errorsOf(codaNoUi(bad))).not.toEqual([]);
  });
});

/* ---------------------------------------------------------------- the lockup, the flashes ---------------------- */

describe("the lockup: no line on the stone or its z's", () => {
  test("as planned, on every frame; the canary (L-C1 moved onto the stone) fails", () => {
    for (const a of ASPECTS) expect(errorsOf(codaLockup(coda(a), X(coda(a))))).toEqual([]);
    const p = coda("16:9");
    const st = p.shots.find((s) => s.id === "coda")!.stone!;
    const bad = withLine(p, "L-C1", (t) => ({ ...t, box: { ...t.box, left: st.at.x - 40, top: st.at.y - 30 } }));
    expect(errorsOf(codaLockup(bad, X(bad)))).not.toEqual([]);
  });
});

describe("C8: no flash (no opposing pair of large luminance changes within a second, in any tile or the whole frame)", () => {
  test("as planned: none, in every aspect; the iris-out's fall is the one large change", () => {
    for (const a of ASPECTS) {
      const m = codaFlashModel(coda(a));
      expect(msgs(m.findings).map((s) => `${a} ${s}`)).toEqual([]);
      expect(m.transitions).toBeGreaterThan(0);
    }
  });
  test("the canary: the design's iris-in at L70 in the tall frame brightens the stone's tiles within a second of their fall", () => {
    const bad = plan("9:16", { irisIn: 70 });
    expect(errorsOf(codaFlashModel(bad).findings)).not.toEqual([]);
    expect(X(coda("9:16")).irisIn.at).toBeGreaterThan(70);
  });
});

describe("C8's light and C9's ground", () => {
  test("the canary: a 6-frame light cue (a step of light under the breath) fails the film's flash rule", () => {
    const p = coda("16:9");
    const bad = { ...p, lightCues: p.lightCues.map((c) => ({ ...c, frames: 6 })) };
    expect(errorsOf(checkPlan(bad, CODA_GRID).errors, "flashes")).not.toEqual([]);
  });
  test("the night riverbed covers the frame's corners on every frame; the canary (sized from the push's last pose only) fails", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(errorsOf(groundCoverage(p))).toEqual([]);
      const bad = withShot(p, "coda", (s) => ({ ...s, groundRect: groundView(s.camera, s.ref, s.to - s.from - 1, p.frame.w, p.frame.h) }));
      expect(errorsOf(groundCoverage(bad))).not.toEqual([]);
    }
  });
});

/* ---------------------------------------------------------------- C10: the X cut ------------------------------ */

const fake = (id: string, duration: number, o: Partial<FilmPiece> = {}): FilmPiece => ({ id, duration, fps: 60, ...o });

describe("C10: the X version is the main master cut at the coda's first frame, under X's 140 s", () => {
  test("the demo reel: the coda last, right after its end card, and the X cut is everything before it", () => {
    for (const a of ASPECTS) {
      const pieces = demoPlans(a).map((e) => e.plan);
      const r = codaPlacement(pieces);
      expect(msgs(errorsOf(r.findings))).toEqual([]);
      expect(r.xFrames).toBe(pieces.reduce((n, p) => n + p.duration, 0) - coda(a).duration);
      expect(xCutFrames(pieces)).toBe(r.xFrames);
    }
  });
  const film = (before: number, o: { coda?: Partial<FilmPiece>; endCardEnd?: number } = {}) => {
    const c = coda("16:9");
    const x = X(c);
    return [
      fake("body", before - x.endCard.end),
      fake(x.endCard.id, o.endCardEnd ?? x.endCard.end, { endsFilm: true }),
      fake("coda", c.duration, { extra: c.extra, ...(o.coda ?? {}) }),
    ];
  };
  test("the cue sheet's film: 8,334 frames before the coda is 2:18.90 on X (under 2:20)", () => {
    const r = codaPlacement(film(8334));
    expect(errorsOf(r.findings)).toEqual([]);
    expect(r.xFrames).toBe(8334);
  });
  test("the canary: an X version of 8,401 frames fails", () => {
    expect(errorsOf(codaPlacement(film(8401)).findings).some((f) => /over X's/.test(f.message))).toBe(true);
  });
  test("the canary: a coda that does not start on the end card's true ending fails (an X cut ending at end + 1)", () => {
    const end = X(coda("16:9")).endCard.end;
    expect(errorsOf(codaPlacement(film(8334, { endCardEnd: end + 1 })).findings)).not.toEqual([]);
    expect(errorsOf(codaPlacement(film(8334, { endCardEnd: end - 1 })).findings)).not.toEqual([]);
  });
  test("the canary: anything after the coda, or a coda after a piece that is not its end card, fails", () => {
    expect(errorsOf(codaPlacement([...film(8334), fake("tail", 60)]).findings)).not.toEqual([]);
    const f = film(8334);
    expect(errorsOf(codaPlacement([f[0]!, f[2]!]).findings)).not.toEqual([]);
  });
});

/* ---------------------------------------------------------------- C11, C12 (the plan's halves) ----------------- */

describe("C11 and C12: the sound layer and the captions the plan hands on", () => {
  test("as planned: room tone on every frame, one CC0 tap on L-C2's landing; captions of 1.2 s or more carrying every line", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(errorsOf(codaSound(p, X(p)))).toEqual([]);
      expect(errorsOf(codaCaptions(p, X(p)))).toEqual([]);
    }
  });
  test("the canaries: a Mixkit tap, a tap off its line, a short caption, a caption missing the limit", () => {
    const p = coda("16:9");
    const mix = withCoda(p, (x) => ({ ...x, sound: { ...x.sound, tap: { ...x.sound.tap, take: "standin_plunk_b", licence: "Mixkit Sound Effects Free License" as never } } }));
    expect(errorsOf(codaSound(mix, X(mix)))).not.toEqual([]);
    const off = withCoda(p, (x) => ({ ...x, sound: { ...x.sound, tap: { ...x.sound.tap, at: x.sound.tap.at + 6 } } }));
    expect(errorsOf(codaSound(off, X(off)))).not.toEqual([]);
    const short = withCoda(p, (x) => ({ ...x, captions: [{ ...x.captions[0]!, to: 40 }, ...x.captions.slice(1)] }));
    expect(errorsOf(codaCaptions(short, X(short)))).not.toEqual([]);
    const noLimit = withCoda(p, (x) => ({ ...x, captions: [...x.captions.slice(0, 2), { ...x.captions[2]!, text: `[A soft tap]\n${CODA_TEXT.soon}` }] }));
    expect(errorsOf(codaCaptions(noLimit, X(noLimit)))).not.toEqual([]);
  });
});

describe("the registry", () => {
  test("checkPlan runs every coda check on the coda only", () => {
    expect(CODA_CHECKS.length).toBe(10);
    for (const id of ["drop", "finale"]) expect(codaChecks(piece("16:9", id))).toEqual([]);
  });
});
