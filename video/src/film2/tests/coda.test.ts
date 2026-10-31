// The post-credit scene (setpieces/coda.ts, setpieces/codaChecks.ts; POSTCREDIT_DESIGN §5; OVERRIDES §62; D157): the
// coda as planned passes every check in all three aspects, on one timeline, continuing the end card without changing a
// frame of it; and every coda check FAILS on its planted canary: the forbidden words and numbers, a version or a date,
// short reading holds, two stones, a camera that stops, the wrong pose, a mock screen, a flash, the X cut; and what the
// stills of 28 Oct showed: an off-centre lockup, a night ground too light, irises that glowed, and the render's stone
// scan, blind to a light stone on a night frame.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { VelocityCamera, type CamSample } from "../motion/camera";
import { RING, type Aspect } from "../tokens";
import { checkAll, copy, type Finding } from "../qa/checks";
import type { FilmTimelineQa } from "../qa/timeline";
import { ReelScan, type ReelMarks } from "../qa/reel-scan";
import { deltaE, hexToRgb, rgbToHex } from "../light/grades";
import { checkPlan, groundCoverage, irisOnFrame, planQa, stoneCount, stonesOnFrame, typeTracks } from "../setpieces/qa";
import { lineRect } from "../setpieces/frame";
import { carriedRect } from "../setpieces/kit";
import { groundView } from "../setpieces/ground";
import { demoPlans } from "../setpieces/demo/plans";
import { timelineDiffs } from "../setpieces/align";
import { checkJoins } from "../setpieces/joins";
import { blinkStartsFor, offsetForBlink } from "../setpieces/blink";
import { checkCues } from "../../../../shared/pebble/cues";
import { BODY, VIEWBOX_SIZE } from "../../../../shared/pebble/character";
import { worldToFrame } from "../motion/camera";
import { CODA_CUES } from "../setpieces/coda.cues";
import { CODA_GRADE, CODA_GRID, CODA_INK_EM_16x9, CODA_LUMA, CODA_PLATE, CODA_PLATE_FRAMING, CODA_TEXT, IRIS_FEATHER_SHARE, codaCut, codaFeather, codaFlashModel, codaHairline, codaIrisIn, codaIrisOut, codaLumaSeries, codaOf, codaOneShots, codaPlacement, irisCover, planCoda, plateRect, plateUnder, xCut, xCutFrames, type CodaExtra, type CodaSoundLayer, type FilmCut, type FilmPiece } from "../setpieces/coda";
import { CODA_CHECKS, CODA_NEVER, CODA_NEVER_PHRASES, clipToFrame, codaCamera, codaCaptions, codaChecks, codaFlashes, codaHolds, codaLight, codaLockup, codaMarkStones, codaNoUi, codaPlate, codaPose, codaSound, codaStillBeforePush, codaStone, codaStonesOn, codaWords, forbiddenIn, joinedWaits, platePebblesOn } from "../setpieces/codaChecks";
import { CODA_PLATE_PEBBLES, PLATE_SOURCE, PLATE_UNITS, platePebbles, platePebblesSource } from "../setpieces/codaPlate";
import { RenderLuma, calibrate, fitInkShare, flashesOf, transitionDiffs, type TileSeries } from "../setpieces/codaCalibrate";
import { finaleThen, planFinale, titleStoneSafe, withThen } from "../setpieces/finale";
import { COMING_NEVER, COMING_NEVER_PHRASES } from "../../../../shared/coming/never";
import type { ScenePlan, ShotSpec, TypeSpec } from "../setpieces/scene";

const ASPECTS: readonly Aspect[] = ["16:9", "1:1", "9:16"];
const SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };
const piece = (a: Aspect, id: string): ScenePlan => demoPlans(a).find((e) => e.plan.id === id)!.plan;
const coda = (a: Aspect) => piece(a, "coda");
// the end card: the Return's (OVERRIDES §61: the Return, the title and the end card replace the wall and the convergence)
const endCard = (a: Aspect) => piece(a, "return");
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
    for (const a of ASPECTS) expect(codaOneShots(X(coda(a))).map((s) => s.at)).toEqual([lands[0]![1]!]);
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
    for (const a of ["1:1", "9:16"] as const) expect(coda(a).types.find((t) => t.id === "L-C2")!.text).toBe("Soon, it may learn\nwhile it does.");
    // the promise carries the feature's condition, as the page's hint does (D157: it comes only if measurement shows it
    // helps; the review's P1-2): "may", never §62's unconditional starting "will"
    expect(CODA_TEXT.soon).toBe("Soon, it may learn while it does.");
    expect(CODA_TEXT.soon).not.toMatch(/\bwill\b/);
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
  test("page 2 stays to the end card's last frame in every cut (the X prefix), and the view adds no exit past it: the closing iris takes the lines (OVERRIDES §65 on P2-1)", () => {
    for (const a of ASPECTS) {
      const ec = endCard(a);
      const ext = X(coda(a)).endCard.extended;
      const page2 = ec.types.filter((t) => t.exitAt === undefined);
      expect(page2.map((t) => t.id).sort()).toEqual(["L29a", "L29b"]);
      expect(ec.endsFilm).toBe(true);
      for (const t of page2) expect(ext.types.find((y) => y.id === t.id)!.exitAt).toBeUndefined();
      // drawn on past the end to the iris-out's end, where the night has covered them
      expect(ext.duration).toBe(ec.duration + X(coda(a)).irisOut.at + X(coda(a)).irisOut.frames);
    }
  });
  test("the canaries: page 2 leaving a frame before the end, or a page that settles differently, change the X cut", () => {
    const ec = endCard("16:9");
    const ext = X(coda("16:9")).endCard.extended;
    const early = { ...ext, types: ext.types.map((t) => (t.exitAt === undefined ? { ...t, exitAt: ec.duration - 1, exit: "blur" as const } : t)) };
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
    for (const s of [CODA_TEXT.rests, CODA_TEXT.soon, CODA_TEXT.soonBroken, CODA_TEXT.status, CODA_TEXT.description, CODA_TEXT.transcript, "Coming next: learning while resting.", "Not built yet. It comes only if measurement shows it helps."]) expect(forbiddenIn(s)).toEqual([]);
  });
  test("one rule set with the page's hint (shared/coming/never.ts, which src/content/next.ts reads too), and the gaps the review's probe passed now fail", () => {
    expect(CODA_NEVER).toBe(COMING_NEVER);
    expect(CODA_NEVER_PHRASES).toBe(COMING_NEVER_PHRASES);
    const gaps = ["Coming in future releases.", "Coming with the next updates.", "Coming in later versions.", "Learning while resting, shipping soon.", "Shipping soon.", "Coming in a future build.", "It learns from all your work.", "It remembers everything.", "It always learns.", "Coming in Oct.", "Coming next season."];
    expect(gaps.filter((s) => forbiddenIn(s).length === 0)).toEqual([]);
    // and as a line of the coda, in every aspect
    for (const a of ASPECTS) {
      const p = plan(a, { text: { status: "It remembers everything." } });
      expect(errorsOf(codaWords(p, X(p))).some((f) => /overclaim/.test(f.message))).toBe(true);
    }
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
  test("the end card's lines carried in pass only as they leave with its page (they start before the coda and the closing iris takes them by its end)", () => {
    const p = coda("16:9");
    const id = X(p).carried[0]!;
    expect(errorsOf(codaWords(p, X(p)))).toEqual([]);
    // the canaries: a line held past the iris (no iris takes it), and one the iris would still show after its end
    const stays = withLine(p, id, (t) => ({ ...t, exitAt: undefined, covered: undefined }));
    expect(errorsOf(codaWords(stays, X(stays))).some((f) => f.message.includes(id))).toBe(true);
    const late = withLine(p, id, (t) => ({ ...t, covered: { ...t.covered!, to: 40 } }));
    expect(errorsOf(codaWords(late, X(late))).some((f) => f.message.includes(id))).toBe(true);
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
  test("the opening iris is the one setpieces/qa.ts models (and ringIris() draws): its centre and radius, and its feather from 120 px on", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const seam = p.seams.find((s) => s.in === "coda")!;
      for (let fr = seam.at; fr < seam.at + seam.frames; fr += 5) {
        const mine = codaIrisIn(p, fr)!;
        const theirs = irisOnFrame(p, seam, fr);
        expect(Math.abs(mine.R - theirs.R) + Math.abs(mine.c.x - theirs.c.x) + Math.abs(mine.c.y - theirs.c.y)).toBeLessThan(1e-6);
        if (mine.R >= 120 * p.frame.unit) expect(mine.feather).toBeCloseTo(theirs.feather, 9);
        else expect(mine.feather).toBeLessThan(theirs.feather);
      }
    }
  });
  test("the irises show the stone's face: the feather narrows to 30 % of a small hole; the canary (the film's fixed 36 px) leaves the iris-in's first hole a halo and the iris-out's last a blur", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      const clear = (i: { R: number; feather: number }) => (i.R - i.feather) / i.R;
      const fixed = (i: { R: number }) => Math.max(0, i.R - x.irisIn.feather) / i.R;
      const first = codaIrisIn(p, x.irisIn.at)!;
      const last = codaIrisOut(p, x.irisOut.at + x.irisOut.frames - 3)!;
      for (const i of [first, last]) {
        expect(clear(i)).toBeGreaterThanOrEqual(1 - IRIS_FEATHER_SHARE - 1e-9);
        // the hairline rides the half-opaque radius
        expect(i.edge).toBeCloseTo(i.R - i.feather / 2, 9);
      }
      expect(fixed(first)).toBeLessThan(0.25);
      expect(fixed(last)).toBe(0);
      expect(codaFeather(120 * p.frame.unit, x.irisIn.feather)).toBeCloseTo(x.irisIn.feather, 9);
      expect(codaFeather(400 * p.frame.unit, x.irisIn.feather)).toBe(x.irisIn.feather);
      expect(codaFeather(0, x.irisIn.feather)).toBe(0);
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
  test("§62's one breath of silence (the lead's ruling (a) on P1-4, OVERRIDES §65): L0 to the iris-in, the iris-out and the breath, declared as one wait; the end card keeps its own last breath; the floor applies from the iris-in on", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      expect(x.silence).toEqual({ from: 0, to: x.irisIn.at });
      // one wait, on the two shots it spans (as the foundation reads a wait: the shot a frame falls in), and the last breath
      expect(joinedWaits(p)).toEqual([x.silence, x.lastBreath]);
      expect(p.shots.find((s) => s.id === "page")!.waits).toEqual([{ from: 0, to: x.irisOut.at }]);
      expect(p.shots.find((s) => s.id === "breath")!.waits).toEqual([{ from: x.irisOut.at, to: x.irisIn.at }]);
      const s = codaStillBeforePush(p, x);
      // the end card declares its last 0.75 s still, the page carried on settled to the iris-out's end, then the breath:
      // 2.12 s in all, every still frame of it declared
      expect(x.endCard.lastBreath).not.toBeNull();
      expect(s.endCard).toBe(x.endCard.end - x.endCard.lastBreath!.from);
      expect([s.coda, s.page, s.breath]).toEqual([x.irisIn.at, x.irisOut.at + x.irisOut.frames, x.breath.to - x.breath.from]);
      expect(s.frames).toBe(s.endCard + s.coda);
      expect(s.frames / 60).toBeGreaterThan(2);
      expect(s.undeclared).toEqual([]);
      expect(errorsOf(checkAll(planQa(p)).errors, "cameraFloor")).toEqual([]);
      const found = codaCamera(p, x);
      expect(found.filter((f) => f.level !== "info")).toEqual([]);
      expect(found.some((f) => f.level === "info" && /holds still for 2\.\d\d s before the coda's push/.test(f.message) && /ruling \(a\)/.test(f.message))).toBe(true);
      // from the iris-in on, nothing is declared until the last breath: the push carries the floor (the canaries above)
      expect(joinedWaits(p).some((w) => w.from < x.lastBreath.from && w.to > x.irisIn.at)).toBe(false);
    }
  });
  test("the canary: an undeclared still span fails (the page's frames, the breath, or a silence that stops short of the iris-in)", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      const noPage = withShot(p, "page", (s) => ({ ...s, waits: [] }));
      const noBreath = withShot(p, "breath", (s) => ({ ...s, waits: [] }));
      const short = withShot(p, "breath", (s) => ({ ...s, waits: [{ from: x.irisOut.at, to: x.irisIn.at - 20 }] }));
      for (const [bad, from, to] of [
        [noPage, 0, x.irisOut.at - 1],
        [noBreath, x.irisOut.at, x.irisIn.at - 1],
        [short, x.irisIn.at - 20, x.irisIn.at - 1],
      ] as const) {
        const msgs_ = errorsOf(codaCamera(bad, X(bad))).map((f) => f.message);
        expect(msgs_.some((m) => m.includes(`an undeclared still span, L${from}–L${to}`))).toBe(true);
        expect(codaStillBeforePush(bad, X(bad)).undeclared).toEqual([{ from, to: to + 1 }]);
        expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
      }
      // the foundation's floor alone passed every one of them (each second there overlaps a declared wait): the review's P1-4
      expect(errorsOf(checkAll(planQa(noPage)).errors, "cameraFloor")).toEqual([]);
      // a silence declared past the iris-in fails too (the floor applies from the iris-in on)
      const long = withCoda(withShot(p, "coda", (s) => ({ ...s, waits: [{ from: s.from, to: s.from + 30 }, ...(s.waits ?? [])] })), (y) => ({ ...y, silence: { from: 0, to: y.irisIn.at + 30 } }));
      expect(errorsOf(codaCamera(long, X(long))).some((f) => /runs from the end card's true ending \(L0\) to the iris-in/.test(f.message))).toBe(true);
    }
  });
  test("an end card that glides to its last frame (the review's option (b), not the ruling): the page moves on L0, so no still span leads into the coda", () => {
    const p = coda("16:9");
    const glides = withCoda(
      withShot(p, "page", (s) => ({ ...s, camera: new VelocityCamera(s.camera.pose(0), { x: 0, y: 0, lz: 0.0004 }) })),
      (x) => ({ ...x, endCard: { ...x.endCard, lastBreath: null } }),
    );
    const s = codaStillBeforePush(glides, X(glides));
    expect([s.frames, s.undeclared.length]).toEqual([0, 0]);
    expect(codaCamera(glides, X(glides))).toEqual([]);
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
  test("as planned: no hairline round the sleeping stone (the opening iris has none); the closing iris keeps the film's", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      expect(x.irisIn.hairline).toBeNull();
      for (let fr = x.irisIn.at; fr < p.duration; fr++) expect(codaHairline(p, fr)).toBeNull();
      // the closing iris: the sage hairline round the end card's stone, in flight on L4–L33
      const drawn = Array.from({ length: x.irisOut.frames }, (_, i) => codaHairline(p, x.irisOut.at + i)).filter((s) => s !== null);
      expect(drawn.length).toBeGreaterThan(x.irisOut.frames / 2);
      expect(drawn.every((s) => s!.iris === "out" && s!.color === RING.color.light)).toBe(true);
    }
  });
  test("the canary, the view as it was (a dark sage hairline on the opening iris): a ring leaving the sleeping stone fails, in every aspect", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const was = withCoda(p, (x) => ({ ...x, irisIn: { ...x.irisIn, hairline: RING.color.dark } }));
      const xs = errorsOf(codaNoUi(was));
      expect(xs.some((f) => /ring-coloured hairline .* round the sleeping stone/.test(f.message))).toBe(true);
      expect(checkPlan(was, CODA_GRID).ok).toBe(false);
      // the stroke the old view drew: on the iris's half-opaque radius, the ring's width, centred on the stone
      const s = codaHairline(was, X(was).irisIn.at + 10)!;
      const i = codaIrisIn(was, X(was).irisIn.at + 10)!;
      expect([s.iris, s.color, s.r, s.c.x, s.c.y]).toEqual(["in", RING.color.dark, i.edge, i.c.x, i.c.y]);
      expect(s.widthPx).toBeCloseTo(RING.hairlinePx * p.frame.unit, 9);
      // any colour round it is refused too (it is still a ring there); one off the stone is not this check's
      const grey = withCoda(p, (x) => ({ ...x, irisIn: { ...x.irisIn, hairline: "#888888" } }));
      expect(errorsOf(codaNoUi(grey)).some((f) => /hairline \(#888888/.test(f.message))).toBe(true);
    }
  });
  test("the view draws no stroke but codaHairline's (so what codaNoUi reads is what is drawn)", () => {
    const src = readFileSync(path.join(import.meta.dir, "../setpieces/views/CodaView.tsx"), "utf8");
    expect(src.match(/<circle\b/g)?.length).toBe(1);
    expect(src).toContain("const line = codaHairline(plan, fr);");
    expect(src).toMatch(/<circle cx=\{line\.c\.x\} cy=\{line\.c\.y\} r=\{line\.r\} fill="none" stroke=\{line\.color\} strokeWidth=\{line\.widthPx\} opacity=\{line\.opacity\} \/>/);
    // the view as it was drew the iris's own hairline colour, whichever iris was in flight
    expect(src).not.toContain("stroke={iris.");
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
  test("centred on the frame, the 16:9 lines at the widths the browser draws (measured on the 28 Oct renders); the canary (the lockup 150 px left, where the 0.48-em estimate set it) fails", () => {
    const p = coda("16:9");
    const x = X(p);
    // the layout and the checks read the measured widths, not approxLineWidth's (L-C2: 1,140 px estimated, 906 drawn)
    for (const id of x.lines) {
      const t = p.types.find((y) => y.id === id)!;
      expect(t.box.inkWidth).toBeCloseTo(CODA_INK_EM_16x9[t.text]! * 72, 6);
      expect(lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5).w).toBe(t.box.inkWidth!);
    }
    expect(lineRect(CODA_TEXT.soon, "expressive", p.frame, { left: 0, top: 0, align: "left" }, 0).w).toBeGreaterThan(1.2 * CODA_INK_EM_16x9[CODA_TEXT.soon]! * 72);
    // every 16:9 line has its measured width: a changed line without one falls back to the estimate, which sets the
    // lockup off centre in the render while the checks (reading the same estimate) pass, so the table must follow
    for (const t of [CODA_TEXT.rests, CODA_TEXT.soon, CODA_TEXT.status]) expect(CODA_INK_EM_16x9[t]).toBeGreaterThan(0);
    // 1:1 and 9:16 centre their lines across the frame (the browser does), so they keep the estimate
    for (const a of ["1:1", "9:16"] as const) for (const t of coda(a).types.filter((y) => X(coda(a)).lines.includes(y.id))) expect(t.box.inkWidth).toBeUndefined();
    const shift = 150;
    const bad: ScenePlan = {
      ...withShot(p, "coda", (s) => ({ ...s, stone: { ...s.stone!, at: { x: s.stone!.at.x - shift, y: s.stone!.at.y } } })),
      types: p.types.map((t) => (x.lines.includes(t.id) ? { ...t, box: { ...t.box, left: t.box.left - shift } } : t)),
    };
    const xs = errorsOf(codaLockup(bad, X(bad)));
    expect(xs.some((f) => /left of the frame's centre/.test(f.message))).toBe(true);
    expect(xs.some((f) => /sits on the stone/.test(f.message))).toBe(false);
  });
});

describe("the night ground's light (codaLight)", () => {
  test("as planned: the plate's measured median at its exposure, under the coda's light, is within ΔE 5 of the dark --bg, in every aspect", () => {
    for (const a of ASPECTS) expect(msgs(errorsOf(codaLight(coda(a), X(coda(a))))).map((m) => `${a} ${m}`)).toEqual([]);
    const c = plateUnder(CODA_GRADE);
    expect(deltaE(c, hexToRgb("#191E1B"))).toBeLessThanOrEqual(5);
    // the site's own dark --wallpaper-tint, its riverbed's ground
    expect(rgbToHex(c)).toBe("#1D2520");
    // the exposure is the plate's, constant: the light cue under the breath stays the neutral one it was
    expect(CODA_GRADE.ground).toEqual([1, 1, 1]);
  });
  test("the canaries: the plate as it comes (as the 28 Oct renders drew it, ΔE 9.9) fails; a ground exposed toward black fails", () => {
    const p = coda("16:9");
    const exposed = (e: number) => withCoda(p, (x) => ({ ...x, ground: { ...x.ground, exposure: e } }));
    for (const [e, re] of [[1, /lighter/], [0.1, /toward black/]] as const) {
      const bad = exposed(e);
      expect(errorsOf(codaLight(bad, X(bad))).some((f) => re.test(f.message))).toBe(true);
      expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
    }
    expect(deltaE(plateUnder(CODA_GRADE, { ...CODA_PLATE, exposure: 1 }), hexToRgb("#191E1B"))).toBeGreaterThan(9);
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

describe("the one flash (P2-1, OVERRIDES §65): page 2's lines have no exit in the main cut; the closing iris takes them, so nothing rises before the fall", () => {
  test("as planned: each carried line has no drawn exit, the iris covers it within the iris-out, and its frames are what the iris draws", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      const shut = x.irisOut.at + x.irisOut.frames;
      expect(x.carried).toEqual(["L29a", "L29b"]);
      for (const id of x.carried) {
        const t = p.types.find((y) => y.id === id)!;
        expect([t.exit, t.exitAt]).toEqual(["camera", t.covered!.from]);
        expect(t.covered!.by).toBe("iris");
        expect(t.covered!.from).toBeGreaterThan(x.irisOut.at);
        expect(t.covered!.to).toBeLessThanOrEqual(shut);
        expect(irisCover(p, t)).toEqual({ from: t.covered!.from, to: t.covered!.to });
        // on its last covered frame some of it is still in the hole; from `to` the night has it all
        const r0 = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5);
        const near = (fr: number) => {
          const o = codaIrisOut(p, fr)!;
          const r = carriedRect(p, t, r0, fr);
          const nx = Math.max(r.x, Math.min(o.c.x, r.x + r.w));
          const ny = Math.max(r.y, Math.min(o.c.y, r.y + r.h));
          return Math.hypot(nx - o.c.x, ny - o.c.y) - o.R;
        };
        if (t.covered!.to < shut) expect(near(t.covered!.to)).toBeGreaterThanOrEqual(-1);
        expect(near(t.covered!.to - 1)).toBeLessThan(0);
      }
      expect(errorsOf(codaFlashes(p, x))).toEqual([]);
    }
  });
  test("the render's marks declare the iris as each line's exit, so its ink may fall there (qa/ink.ts), and the line is drawn until the iris has passed it", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      for (const tr of typeTracks(p).filter((y) => x.carried.includes(y.id))) {
        const t = p.types.find((y) => y.id === tr.id)!;
        expect(tr.until).toBe(t.covered!.to);
        expect(tr.exits).toEqual([{ from: t.covered!.from, to: t.covered!.to, kind: "iris" }]);
        expect(tr.vanishes).toBeUndefined();
        expect(tr.rects?.[0]).toBeDefined();
      }
    }
  });
  test("the canary: page 2's exits as they were (a blur from L0, the rise before the fall the 16:9 and 1:1 renders showed) fail codaFlashes, which the model alone missed", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      let bad = p;
      for (const id of X(p).carried) bad = withLine(bad, id, (t) => ({ ...t, exit: "blur", exitAt: 0, covered: undefined }));
      const xs = errorsOf(codaFlashes(bad, X(bad)));
      expect(xs.some((f) => /leaves on its own \(a blur from L0\)/.test(f.message) && /rise before the fall/.test(f.message))).toBe(true);
      expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
      // the model as planned reads a line's ink at 0.22 of its box and sees no flash in it (codaCalibrate.ts measures the share)
      expect(errorsOf(codaFlashModel(bad).findings)).toEqual([]);
    }
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
  // the score lane's cue sheet, revision 2 (F4 on): the master runs 8,102 frames, 2:15.03 (it was 8,334, 2:18.90, on
  // the 22:13 sheet the coda was designed against); with the coda the main film runs 8,570 frames, 2:22.83
  test("the cue sheet's film: 8,102 frames before the coda is 2:15.03 on X (under 2:20), and the main film with the coda 8,570", () => {
    const r = codaPlacement(film(8102));
    expect(errorsOf(r.findings)).toEqual([]);
    expect(r.xFrames).toBe(8102);
    expect(r.findings.map((f) => f.message).join("\n")).toContain("the main film runs 8570");
    // within 4.97 s of X's cap: no warning (the warning starts past 139.5 s)
    expect(r.findings.filter((f) => f.level === "warn")).toEqual([]);
  });
  test("past 139.5 s the warning leaves what gives to the lead (F4, the cue sheet's one shortening splice, is already on)", () => {
    const w = codaPlacement(film(8380)).findings.filter((f) => f.level === "warn");
    expect(w.length).toBe(1);
    expect(w[0]!.message).toMatch(/the lead's call/);
    expect(w[0]!.message).not.toMatch(/F4 comes first/);
  });
  test("the canary: an X version of 8,401 frames fails", () => {
    expect(errorsOf(codaPlacement(film(8401)).findings).some((f) => /over X's/.test(f.message))).toBe(true);
  });
  test("the canary: a coda that does not start on the end card's true ending fails (an X cut ending at end + 1)", () => {
    const end = X(coda("16:9")).endCard.end;
    expect(errorsOf(codaPlacement(film(8102, { endCardEnd: end + 1 })).findings)).not.toEqual([]);
    expect(errorsOf(codaPlacement(film(8102, { endCardEnd: end - 1 })).findings)).not.toEqual([]);
  });
  test("the canary: anything after the coda, or a coda after a piece that is not its end card, fails", () => {
    expect(errorsOf(codaPlacement([...film(8102), fake("tail", 60)]).findings)).not.toEqual([]);
    const f = film(8102);
    expect(errorsOf(codaPlacement([f[0]!, f[2]!]).findings)).not.toEqual([]);
  });
});

/* ---------------------------------------------------------------- C11, C12 (the plan's halves) ----------------- */

describe("C11 and C12: the sound layer and the captions the plan hands on", () => {
  /** A copy of a plan with its sound layers changed. */
  const withLayers = (p: ScenePlan, f: (ls: readonly CodaSoundLayer[]) => CodaSoundLayer[]) => withCoda(p, (x) => ({ ...x, sound: { ...x.sound, layers: f(x.sound.layers) } }));
  test("as planned: room tone on every frame, one CC0 tap on L-C2's landing; captions of 1.2 s or more carrying every line", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(errorsOf(codaSound(p, X(p)))).toEqual([]);
      expect(errorsOf(codaCaptions(p, X(p)))).toEqual([]);
      expect(X(p).sound.layers.map((l) => `${l.kind} ${l.take}`)).toEqual(["bed room_tone_b", "oneShot standin_tap_a"]);
    }
  });
  test("the score lane builds the layer (OVERRIDES §65), so codaSound passes; a plan whose layer no lane builds says so (a warning: the coda would play digital silence)", () => {
    const p = coda("16:9");
    expect(X(p).sound.builtBy).toMatch(/score lane/);
    expect(codaSound(p, X(p))).toEqual([]);
    const none = withCoda(p, (x) => ({ ...x, sound: { ...x.sound, builtBy: null } }));
    expect(codaSound(none, X(none)).filter((f) => f.level === "warn").map((f) => f.message).join("\n")).toMatch(/built by no lane.*digital silence/);
  });
  test("the canaries the review's probe passed: a second one-shot, a room tone that stops before the end, a Mixkit bed", () => {
    const p = coda("16:9");
    const tap = codaOneShots(X(p))[0]!;
    const two = withLayers(p, (ls) => [...ls, { ...tap, take: "standin_tap_b", at: tap.at + 90 }]);
    expect(errorsOf(codaSound(two, X(two))).some((f) => /2 one-shots/.test(f.message))).toBe(true);
    expect(checkPlan(two, CODA_GRID).ok).toBe(false);
    const none = withLayers(p, (ls) => ls.filter((l) => l.kind !== "oneShot"));
    expect(errorsOf(codaSound(none, X(none))).some((f) => /0 one-shots/.test(f.message))).toBe(true);
    const short = withLayers(p, (ls) => ls.map((l) => (l.kind === "bed" ? { ...l, to: l.to - 60 } : l)));
    expect(errorsOf(codaSound(short, X(short))).some((f) => /no room tone under L408–L468/.test(f.message))).toBe(true);
    const mixBed = withLayers(p, (ls) => ls.map((l) => (l.kind === "bed" ? { ...l, take: "mixkit_room_air", licence: "Mixkit Sound Effects Free License" } : l)));
    expect(errorsOf(codaSound(mixBed, X(mixBed))).some((f) => /Mixkit/.test(f.message))).toBe(true);
  });
  test("the canaries: a Mixkit tap, a tap off its line, a short caption, a caption missing the limit", () => {
    const p = coda("16:9");
    const mix = withLayers(p, (ls) => ls.map((l) => (l.kind === "oneShot" ? { ...l, take: "standin_plunk_b", licence: "Mixkit Sound Effects Free License" } : l)));
    expect(errorsOf(codaSound(mix, X(mix)))).not.toEqual([]);
    const off = withLayers(p, (ls) => ls.map((l) => (l.kind === "oneShot" ? { ...l, at: l.at + 6 } : l)));
    expect(errorsOf(codaSound(off, X(off)))).not.toEqual([]);
    const short = withCoda(p, (x) => ({ ...x, captions: [{ ...x.captions[0]!, to: 40 }, ...x.captions.slice(1)] }));
    expect(errorsOf(codaCaptions(short, X(short)))).not.toEqual([]);
    const noLimit = withCoda(p, (x) => ({ ...x, captions: [...x.captions.slice(0, 2), { ...x.captions[2]!, text: `[A soft tap]\n${CODA_TEXT.soon}` }] }));
    expect(errorsOf(codaCaptions(noLimit, X(noLimit)))).not.toEqual([]);
  });
});

describe("the registry", () => {
  test("checkPlan runs every coda check on the coda only", () => {
    expect(CODA_CHECKS.length).toBe(12);
    for (const id of ["drop", "return"]) expect(codaChecks(piece("16:9", id))).toEqual([]);
  });
});

/* ---------------------------------------------------------------- the night plate's pebbles (P2-9, 9:16) -------- */

describe("no riverbed pebble on the night plate reads larger than the sleeping stone (OVERRIDES §65 on P2-9)", () => {
  test("the plate's pebbles are the wallpaper's own (codaPlate.ts is generated from it; a change prints the new constant)", () => {
    const svg = readFileSync(path.join(import.meta.dir, "../../../..", PLATE_SOURCE), "utf8");
    const now = platePebbles(svg);
    if (JSON.stringify(now) !== JSON.stringify(CODA_PLATE_PEBBLES)) throw new Error(`the plate's source changed: paste into setpieces/codaPlate.ts\n${platePebblesSource(now)}`);
    expect(now.map((p) => p.id)).toEqual(["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]);
    expect(PLATE_UNITS).toEqual(CODA_PLATE.units);
    expect(svg).toContain(`viewBox="0 0 ${PLATE_UNITS.w} ${PLATE_UNITS.h}"`);
  });
  test("as planned, in every aspect: the frame shows no pebble's part wider or taller than the stone's body; 9:16 none at all, 1:1 none, 16:9 one rim at a corner", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      expect(msgs(errorsOf(codaPlate(p, X(p)))).map((m) => `${a} ${m}`)).toEqual([]);
      const shot = p.shots.find((s) => s.id === "coda")!;
      const seen = new Map<string, number>();
      for (let fr = shot.from; fr < shot.to; fr++) for (const pb of platePebblesOn(p, fr)) seen.set(pb.id, Math.max(seen.get(pb.id) ?? 0, pb.w, pb.h));
      if (a === "16:9") {
        expect([...seen.keys()]).toEqual(["c0"]);
        expect(seen.get("c0")!).toBeLessThan((BODY.height * shot.stone!.size) / VIEWBOX_SIZE);
      } else expect([...seen.keys()]).toEqual([]);
    }
  });
  test("9:16 shows the plate between its pebbles: ×3 about its point (1060, 480), unstretched, the ground still covering every frame", () => {
    const p = coda("9:16");
    const shot = p.shots.find((s) => s.id === "coda")!;
    expect(X(p).plateFraming).toEqual(CODA_PLATE_FRAMING["9:16"]);
    expect(shot.groundRect).toEqual(plateRect(shot.ref, CODA_PLATE_FRAMING["9:16"]!));
    expect(shot.groundRect!.w / shot.groundRect!.h).toBeCloseTo(PLATE_UNITS.w / PLATE_UNITS.h, 9);
    expect(errorsOf(groundCoverage(p))).toEqual([]);
    for (const a of ["16:9", "1:1"] as const) expect(coda(a).shots.find((s) => s.id === "coda")!.groundRect).toBeUndefined();
  });
  test("the canary: 9:16 with the plate as every shot frames it (as the renders of 28 Oct drew it) fails, the largest pebbles named", () => {
    const p = coda("9:16");
    const bad = withShot(p, "coda", (s) => {
      const { groundRect: _g, ...rest } = s;
      return rest;
    });
    const xs = errorsOf(codaPlate(bad, X(bad)));
    for (const id of ["c1", "c8"]) expect(xs.some((f) => f.message.includes(`pebble ${id} reads larger than the sleeping stone`))).toBe(true);
    expect(checkPlan(bad, CODA_GRID).ok).toBe(false);
  });
  test("the canaries: 16:9's plate scaled so a pebble comes into frame whole, and a stretched plate, fail", () => {
    const p = coda("16:9");
    const shot = p.shots.find((s) => s.id === "coda")!;
    // the plate at its own scale, moved up so its pebble c8 (230 × 194 units: about 490 × 410 px) comes into frame
    const up = withShot(p, "coda", (s) => ({ ...s, groundRect: plateRect(s.ref, { scale: 2.125, centre: { x: 600, y: 300 } }) }));
    expect(errorsOf(codaPlate(up, X(up))).some((f) => f.message.includes("pebble c8 reads larger than the sleeping stone"))).toBe(true);
    const r = plateRect(shot.ref, { scale: 2.5, centre: { x: 800, y: 500 } });
    const stretched = withShot(p, "coda", (s) => ({ ...s, groundRect: { ...r, h: r.h * 1.2 } }));
    expect(errorsOf(codaPlate(stretched, X(stretched))).some((f) => /stretched/.test(f.message))).toBe(true);
  });
  test("clipToFrame keeps what the frame shows of a polygon", () => {
    const sq = [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 },
    ];
    const c = clipToFrame(sq, 100, 100);
    expect([Math.min(...c.map((q) => q.x)), Math.max(...c.map((q) => q.x)), Math.min(...c.map((q) => q.y)), Math.max(...c.map((q) => q.y))]).toEqual([0, 10, 0, 10]);
    expect(clipToFrame(sq.map((q) => ({ x: q.x + 200, y: q.y })), 100, 100)).toEqual([]);
  });
});

/* ---------------------------------------------------------------- the end card's stone (P2-9, 1:1) ------------- */

describe("the end card's stone keeps the safe margin to its last frame, and the coda's first frames with it (OVERRIDES §65, §67 on P2-9)", () => {
  /** The stone's least distance to the frame's edges on a title shot's frame (its own bounds, with 6 % for its lean or breath). */
  const margin = (p: ScenePlan, shotId: string, fr: number) => {
    const s = p.shots.find((y) => y.id === shotId)!;
    const pose = s.camera.pose(fr - s.from);
    const c = worldToFrame(s.stone!.at, pose, p.frame.w, p.frame.h);
    const k = ((s.stone!.size * pose.zoom) / VIEWBOX_SIZE) * 1.06;
    return Math.min(c.y + BODY.top * k, c.x + BODY.left * k, p.frame.w - c.x - BODY.right * k, p.frame.h - c.y - BODY.bottom * k);
  };
  test("as planned: the end card's stone in every aspect, and the coda's page carrying it on, stay 60 px or more inside the frame; the 1:1 stone ends about 73 px from the top", () => {
    for (const a of ASPECTS) {
      const ec = endCard(a);
      expect(msgs(titleStoneSafe(ec)).map((m) => `${a} ${m}`)).toEqual([]);
      expect(msgs(titleStoneSafe(coda(a))).map((m) => `${a} ${m}`)).toEqual([]);
      expect(margin(ec, "title", ec.duration - 1)).toBeGreaterThanOrEqual(60);
      // the coda's first frame is the end card's next: the same place
      expect(Math.abs(margin(coda(a), "page", 0) - margin(ec, "title", ec.duration - 1))).toBeLessThan(0.5);
    }
    const ec = endCard("1:1");
    expect(margin(ec, "title", ec.duration - 1)).toBeGreaterThan(70);
    expect(margin(ec, "title", ec.duration - 1)).toBeLessThan(76);
  });
  test("the canaries: the 1:1 stone where it was (0.18 of the height) fails on the end card and on the coda's page", () => {
    const at = (p: ScenePlan, shotId: string): ScenePlan => withShot(p, shotId, (s) => ({ ...s, stone: { ...s.stone!, at: { x: s.stone!.at.x, y: 1080 * 0.18 } } }));
    const ec = at(endCard("1:1"), "title");
    expect(titleStoneSafe(ec).some((f) => /from the frame's top edge/.test(f.message))).toBe(true);
    expect(margin(ec, "title", ec.duration - 1)).toBeLessThan(40);
    expect(titleStoneSafe(at(coda("1:1"), "page")).length).toBe(1);
  });
  test("its holds and page timings are fix round 2's (CR-10, CR-20), untouched: one timeline in every aspect", () => {
    const keys = ["factsLand", "factsHoldEnd", "page2", "end", "breathFrom", "irisAt"] as const;
    const of = (a: Aspect) => keys.map((k) => (endCard(a).extra as Record<string, number>)[k]);
    expect(of("1:1")).toEqual(of("16:9"));
    expect(of("9:16")).toEqual(of("16:9"));
    expect((endCard("1:1").extra as { anchors: unknown }).anchors).toEqual((endCard("16:9").extra as { anchors: unknown }).anchors);
  });
});

/* ---------------------------------------------------------------- the wiring (design item 14) ------------------ */

describe("the wiring: finale.ts's then: \"coda\" in the main composition, the coda in the main cut only (OVERRIDES §62, §65)", () => {
  const main = (a: Aspect) => demoPlans(a).map((e) => e.plan);
  test("the main reel plays the coda right after the end card planned with then: \"coda\", from its true ending, on one timeline", () => {
    const joins: number[] = [];
    for (const a of ASPECTS) {
      const ps = main(a);
      const ec = ps.find((p) => p.id === "return")!;
      const c = ps[ps.length - 1]!;
      expect(finaleThen(ec)).toBe("coda");
      expect(c.id).toBe("coda");
      expect(ps[ps.length - 2]).toBe(ec);
      expect(msgs(codaCut(ps, "main"))).toEqual([]);
      // the join: the coda's first frame is the end card's true ending, the same reel frame in every aspect
      const join = ps.slice(0, -1).reduce((n, p) => n + p.duration, 0);
      joins.push(join);
      expect(join).toBe(xCutFrames(ps));
      expect(X(c).endCard.end).toBe(ec.duration);
      expect(checkJoins([ec, c], ["continue"])).toEqual([]);
      // its timing is the plan's (aligned across the aspects), never typed in
      expect(c.extra!.timing).toEqual(coda("16:9").extra!.timing);
      // stoneCount and the coda's checks still pass on the plan
      expect(errorsOf(stoneCount(c))).toEqual([]);
      expect(errorsOf(codaChecks(c))).toEqual([]);
      expect(checkPlan(c, CODA_GRID).ok).toBe(true);
    }
    expect(new Set(joins).size).toBe(1);
    expect(timelineDiffs({ "16:9": coda("16:9"), "1:1": coda("1:1"), "9:16": coda("9:16") })).toEqual([]);
  });
  test("then: \"coda\" changes no frame of the end card: planFinale with it and without it differ only in what it records", () => {
    for (const [w, h] of [
      [1920, 1080],
      [1080, 1080],
      [1080, 1920],
    ] as const) {
      const a = planFinale({ w, h, fps: 60, hit: 300 });
      const b = planFinale({ w, h, fps: 60, hit: 300, then: "coda" });
      expect([finaleThen(a), finaleThen(b)]).toEqual([null, "coda"]);
      expect(b.duration).toBe(a.duration);
      expect(JSON.stringify(b.types)).toBe(JSON.stringify(a.types));
      expect(b.endsFilm).toBe(true);
      for (const [i, s] of a.shots.entries()) for (let fr = s.from; fr < s.to; fr += 7) expect(b.shots[i]!.camera.pose(fr - s.from)).toEqual(s.camera.pose(fr - s.from));
      const { then: _t, ...ra } = a.extra as Record<string, unknown>;
      const { then: _u, ...rb } = b.extra as Record<string, unknown>;
      expect(Object.keys(rb)).toEqual(Object.keys(ra));
      expect(finaleThen(withThen(a, "coda"))).toBe("coda");
    }
    expect(() => withThen({ ...endCard("16:9"), endsFilm: false }, "coda")).toThrow(/not an end card/);
  });
  test("every other cut ends on the end card: the X version is the main reel to the coda's first frame, with page 2 held to its last frame", () => {
    for (const a of ASPECTS) {
      const ps = main(a);
      const x = xCut(ps);
      expect(x.map((p) => p.id)).toEqual(["drop", "ring4", "dusk", "climax", "return"]);
      expect(msgs(codaCut(x, "x"))).toEqual([]);
      const ec = x[x.length - 1]!;
      expect(ec.endsFilm).toBe(true);
      expect(ec.types.filter((t) => t.kind === "end" && t.exitAt === undefined).map((t) => t.id).sort()).toEqual(["L29a", "L29b"]);
    }
  });
  test("the canaries: the coda in the X cut, the tour, the 40-s cut or a short; a main cut without it after its end card; the coda after an end card not planned with then: \"coda\"", () => {
    const ps = main("16:9");
    for (const cut of ["x", "tour", "40s", "short"] as FilmCut[]) expect(errorsOf(codaCut(ps, cut)).some((f) => /plays the post-credit scene: only the main film does/.test(f.message))).toBe(true);
    expect(errorsOf(codaCut(xCut(ps), "main")).some((f) => /planned with then: "coda", but the main cut does not play/.test(f.message))).toBe(true);
    const unmarked = ps.map((p) => (p.id === "return" ? { ...p, extra: { ...p.extra, then: null } } : p));
    expect(errorsOf(codaCut(unmarked, "main")).some((f) => /not planned with then: "coda"/.test(f.message))).toBe(true);
  });
});

/* ---------------------------------------------------------------- the flash model's calibration (P2-1) ---------- */

describe("the flash model's calibration against a render (codaCalibrate.ts; prepared for the evening, OVERRIDES §65 on P2-1)", () => {
  const model = (share: number): TileSeries => {
    const p = coda("16:9");
    return codaLumaSeries(p, 0, p.duration, { ...CODA_LUMA, inkShare: share });
  };
  test("a render that is the model itself: the fitted share is the plan's, no flash, no disagreement, nothing to recommend", () => {
    const r = calibrate(coda("16:9"), model(CODA_LUMA.inkShare));
    expect(r.ok).toBe(true);
    expect(r.fit.page.share!).toBeCloseTo(CODA_LUMA.inkShare, 6);
    expect(r.fit.night.share!).toBeCloseTo(CODA_LUMA.inkShare, 6);
    expect([r.flashes.render.worst, r.flashes.planned.worst, r.flashes.fitted.worst]).toEqual([0, 0, 0]);
    expect(r.transitions).toEqual([]);
    expect(r.recommend).toEqual([]);
    expect(r.levels.page.ratio!).toBeCloseTo(1, 9);
    expect(r.levels.plate.ratio!).toBeCloseTo(1, 9);
  });
  test("a render whose glyphs cover more of their boxes: the fit finds the share, and the report says what to set", () => {
    const r = calibrate(coda("16:9"), model(0.45));
    expect(r.fit.page.share!).toBeCloseTo(0.45, 6);
    expect(r.fit.night.share!).toBeCloseTo(0.45, 6);
    expect(r.recommend.some((m) => /fits an ink share of 0\.450/.test(m))).toBe(true);
    expect(fitInkShare(coda("16:9"), model(0.45), [0, 1, 2, 3]).rmsFitted).toBeLessThan(1e-9);
  });
  test("the canary: a render with the rise before the fall (page 2 leaving before the iris, as on 28 Oct) fails, and the model as planned is named as missing it", () => {
    const r0 = model(CODA_LUMA.inkShare);
    const k = 2 * 6 + 2;
    // tile 2,2 of the 16:9 render of 28 Oct (postcredit/runs/tileflash-16x9.txt): 0.792 on L0, 0.899 on L10 and 0.922 on
    // L20 as page 2's lines left, then the closing iris: 0.010 by L30; the model's own values after
    const at = (f: number, a: number, b: number, f0: number) => a + ((b - a) * (f - f0)) / 10;
    const tile = r0.tiles[k]!.map((v, f) => (f <= 10 ? at(f, 0.792, 0.899, 0) : f <= 20 ? at(f, 0.899, 0.922, 10) : f <= 30 ? at(f, 0.922, 0.01, 20) : v));
    const render: TileSeries = { tiles: r0.tiles.map((s, i) => (i === k ? tile : s)), whole: r0.whole };
    const r = calibrate(coda("16:9"), render);
    expect(r.ok).toBe(false);
    expect(r.flashes.render.worst).toBe(1);
    expect(r.problems.some((m) => /the render flashes: tile 2,2/.test(m))).toBe(true);
    expect(r.recommend.some((m) => /the model misses it/.test(m))).toBe(true);
    expect(transitionDiffs(r0, render).some((d) => d.where === "tile 2,2")).toBe(true);
    expect(flashesOf(render, 60).flashing.map((f) => f.where)).toEqual(["tile 2,2"]);
  });
  test("RenderLuma measures as the reel scan does: K-fold box averages, the sRGB curve, 6 × 6 tiles", () => {
    const W = 960;
    const H = 540;
    const rl = new RenderLuma(W, H);
    expect([rl.K, rl.w, rl.h]).toEqual([5, 192, 108]);
    const f = new Uint8Array(W * H).fill(128);
    for (let y = 0; y < H / 6; y++) for (let x = 0; x < W / 6; x++) f[y * W + x] = 255;
    rl.push(f);
    const lin = (v: number) => ((v / 255 + 0.055) / 1.055) ** 2.4;
    expect(rl.series.tiles[0]![0]!).toBeCloseTo(1, 9);
    expect(rl.series.tiles[1]![0]!).toBeCloseTo(lin(128), 9);
    expect(rl.series.whole[0]!).toBeCloseTo((1 + 35 * lin(128)) / 36, 9);
  });
});

/* ---------------------------------------------------------------- the render's stone scan on a night frame ------ */

describe("the stones reel-marks.ts hands the render's scan (codaMarkStones)", () => {
  test("the end card's stone through the closing iris until it is three-quarters gone, then the sleeping stone, marked light; never both", () => {
    for (const a of ASPECTS) {
      const p = coda(a);
      const x = X(p);
      const shut = x.irisOut.at + x.irisOut.frames;
      let lastPage = -1;
      for (let fr = 0; fr < p.duration; fr++) {
        const st = codaMarkStones(p, fr)!;
        expect(st.length).toBeLessThanOrEqual(1);
        for (const s of st) expect(s.light).toBe(s.shot === "coda");
        if (st.some((s) => s.shot === "page")) lastPage = fr;
        if (fr >= x.irisIn.at + 12) expect(st.map((s) => s.shot)).toEqual(["coda"]);
      }
      // the set pieces' model takes the closing iris for a swap and drops the stone by about L14; the view shows it longer
      expect(lastPage).toBeGreaterThan(20);
      expect(lastPage).toBeLessThan(shut);
      expect(stonesOnFrame(p, 20).length).toBe(0);
      expect(codaMarkStones(piece(a, "return"), 0)).toBeNull();
    }
  });
});

describe("the render's stone scan on a night frame (qa/reel-scan.ts)", () => {
  // a half-size render of a 640 × 360 plan: the night ground and the sleeping stone, light (the page's dark palette), its two eyes dark
  const w = 320;
  const h = 180;
  const frames = 40;
  const marksOf = (light: boolean): ReelMarks => ({
    aspect: "16:9",
    fps: 60,
    width: 640,
    height: 360,
    total: frames,
    cuts: [],
    waits: [],
    hits: [],
    types: [],
    apertures: [],
    stones: [{ from: 0, to: frames, count: 1, rMin: 20, rMax: 20 }],
    stoneAt: Object.fromEntries(Array.from({ length: frames }, (_, f) => [f, [[500, 240, 20, ...(light ? [1] : [])]]])),
  });
  const reel = (marks: ReelMarks, second: (f: number) => boolean) => {
    const scan = new ReelScan(w, h, marks);
    for (let f = 0; f < frames; f++) {
      const px = new Uint8Array(w * h).fill(30);
      const stone = (cx: number, cy: number) => {
        for (let y = cy - 10; y <= cy + 10; y++) for (let x = cx - 10; x <= cx + 10; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= 100) px[y * w + x] = 193;
        for (const ex of [cx - 3, cx + 2]) for (let y = cy - 1; y < cy + 1; y++) for (let x = ex; x < ex + 2; x++) px[y * w + x] = 45;
      };
      stone(250, 120);
      if (second(f)) stone(280, 120);
      scan.push(px);
    }
    return scan.finish();
  };
  test("marked light, as reel-marks.ts marks the coda's stone: the one stone is found on every frame; the canary, a second stone beside it, is reported", () => {
    const one = reel(marksOf(true), () => false);
    expect(one.stones.frames.length).toBe(frames);
    expect(one.stones.frames.every((s) => s.blobs === 1)).toBe(true);
    expect(one.stones.twoStoneRuns).toEqual([]);
    const two = reel(marksOf(true), (f) => f >= 20 && f < 26);
    expect(two.stones.twoStoneRuns).toEqual([{ from: 20, to: 26, most: 2 }]);
    expect(two.problems.some((p) => /^stones: 2 stone-sized/.test(p))).toBe(true);
  });
  test("marked as before (every stone a dark blob): the scan saw no stone on a night frame, and so missed the second", () => {
    const blind = reel(marksOf(false), (f) => f >= 20 && f < 26);
    expect(blind.stones.frames.every((s) => s.blobs === 0)).toBe(true);
    expect(blind.stones.twoStoneRuns).toEqual([]);
  });
});
