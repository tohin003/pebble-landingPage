// The checks added after the craft review (CR-15; OVERRIDES §55), each proved on a planted canary: it must catch its
// fault and pass the same thing done right. Then the current plans: each check fails where the review said it should,
// on the frames it saw, and the ledger of open findings (setpieces/review-ledger.ts) only shrinks.
import { describe, expect, test } from "bun:test";
import { VelocityCamera, type Pose } from "../motion/camera";
import { momentumCut } from "../transitions/momentum";
import { cameraFloor, checkAll, deadFrames, irisEase, type Finding } from "../qa/checks";
import type { FilmTimelineQa } from "../qa/timeline";
import { analyseLuma, findTilePops } from "../qa/luma";
import { inkIn, judgeInk, type InkTrack } from "../qa/ink";
import { shrink, stoneBlobs } from "../qa/stones";
import { bandHeights, openingStart } from "../qa/bands";
import { frameBox } from "../setpieces/frame";
import { STILL } from "../setpieces/standins";
import { TAKE_HSF } from "../setpieces/take";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { REVIEW_CHECKS, apertureOpenStart, askActClock, checkPlan, groundCoverage, hitSync, legibleWords, planesInFrame, smallPrintHolds, stoneCount, typeExits } from "../setpieces/qa";
import { demoPlans } from "../setpieces/demo/plans";
import { OPEN_FINDINGS, isOpen } from "../setpieces/review-ledger";
import { demoQa, MOVES } from "../demo/timeline";
import type { PlaneSpec, ScenePlan, ShotSpec, TypeSpec } from "../setpieces/scene";
import type { Aspect } from "../tokens";

const W = 1920;
const H = 1080;
const FPS = 60;
const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));

/* ---------------------------------------------------------------- the camera floor and the iris ease ---------- */

/** Two shots: a push-in that keeps drifting, a momentum cut, an arrival gliding into a drift of 0.4 px a frame. */
const clean = (): FilmTimelineQa => {
  const a = new VelocityCamera({ x: 0, y: 0, zoom: 1 }, { lz: 0.0004 });
  a.hermite(120, { x: 0, y: 0, zoom: 1.08 }, { lz: 0.0003 });
  const seam = momentumCut({ out: a, cutFrame: 240, dir: { x: -1, y: 0 }, dPx: 120, leaveFrames: 18, target: { x: 4000, y: 0, zoom: 1 }, inFrames: 50, frameW: W, frameH: H, fps: FPS, mode: "glide", tau: 20 });
  seam.inCam.glide(240, 24, { x: 0.4 });
  return {
    name: "clean",
    fps: FPS,
    width: W,
    height: H,
    durationInFrames: 480,
    shots: [
      { id: "A", from: 0, to: 240, kind: "ui", camera: a },
      { id: "B", from: 240, to: 480, kind: "ui", camera: seam.inCam },
    ],
    seams: [{ at: 240, kind: "momentum", frames: 0, out: "A", in: "B" }],
    texts: [],
  };
};

/** A camera that drifts at `px` a frame (at the frame's centre and corners alike: a pan). */
const drifting = (px: number) => new VelocityCamera({ x: 0, y: 0, zoom: 1 }, { x: px });

describe("the camera floor (CR-04)", () => {
  test("a clean timeline passes", () => {
    expect(cameraFloor(clean()).findings).toEqual([]);
  });
  test("a frozen second is caught even while something else changes, which deadFrames cannot see", () => {
    const t = clean();
    // the stone's idle animation or a slot's ticking clock: something changes on every frame
    t.shots = [{ ...t.shots[0]!, camera: drifting(0), activity: () => true }, t.shots[1]!];
    expect(deadFrames(t).findings).toEqual([]);
    const f = cameraFloor(t);
    expect(f.findings.length).toBe(1);
    expect(f.slowRuns[0]!.from).toBe(0);
    expect(f.slowRuns[0]!.to).toBeGreaterThanOrEqual(240);
  });
  test("a drift of 0.2 px a frame is a freeze; 0.3 px is a glide", () => {
    const t = clean();
    t.shots = [{ ...t.shots[0]!, camera: drifting(0.2) }, t.shots[1]!];
    expect(cameraFloor(t).findings.length).toBe(1);
    t.shots = [{ ...t.shots[0]!, camera: drifting(0.3) }, t.shots[1]!];
    expect(cameraFloor(t).findings).toEqual([]);
  });
  test("a declared waiting state inside a take may hold still", () => {
    const t = clean();
    t.shots = [{ ...t.shots[0]!, camera: drifting(0), waits: [{ from: 0, to: 240 }] }, t.shots[1]!];
    expect(cameraFloor(t).findings).toEqual([]);
  });
  test("it measures at 1080 whatever the render's size", () => {
    const t = { ...clean(), width: 960, height: 540 };
    t.shots = [{ ...t.shots[0]!, camera: drifting(0.15) }, { ...t.shots[1]!, camera: drifting(0.15) }];
    // 0.15 px a frame at 960 × 540 is 0.30 at 1080
    expect(cameraFloor(t).findings).toEqual([]);
  });
});

describe("the iris ease (CR-21)", () => {
  const withIris = (ease?: "arrive" | "move", hit?: number, hits: number[] = []): FilmTimelineQa => {
    const t = clean();
    return { ...t, seams: [{ at: 240, kind: "ring", frames: 30, out: "A", in: "B", ease, hit }], hits };
  };
  test("an iris that names no ease takes ringIris's default, E-arrive, and is refused without a marked hit", () => {
    expect(errorsOf(irisEase(withIris())).length).toBe(1);
    expect(errorsOf(irisEase(withIris("arrive"))).length).toBe(1);
  });
  test("E-move between places passes; E-arrive passes only on a marked hit inside its seam", () => {
    expect(irisEase(withIris("move"))).toEqual([]);
    expect(irisEase(withIris("arrive", 250, [250]))).toEqual([]);
    expect(errorsOf(irisEase(withIris("arrive", 250, []))).length).toBe(1);
    expect(errorsOf(irisEase(withIris("arrive", 300, [300]))).length).toBe(1);
  });
});

/* ---------------------------------------------------------------- pixel canaries ------------------------------ */

/** Grey frames: a gradient drifting 1 px a frame (a moving camera), with an optional dark block. */
const drift = (n: number, w: number, h: number, block: (f: number) => number) =>
  Array.from({ length: n }, (_, f) => {
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = 60 + Math.round(((x + f) % w) * (160 / w));
    const a = block(f);
    if (a > 0) for (let y = 20; y < 26; y++) for (let x = 20; x < 30; x++) px[y * w + x] = Math.round(px[y * w + x]! * (1 - a) + 30 * a);
    return px;
  });

describe("tile pops (CR-03)", () => {
  test("a small part that vanishes in one frame: the whole-frame rule misses it, its own tile does not", () => {
    const frames = drift(60, 96, 54, (f) => (f < 30 ? 1 : 0));
    const r = analyseLuma(frames, { fps: 60, width: 96, height: 54 });
    expect(r.pops).toEqual([]);
    expect(r.tilePops.map((p) => p.frame)).toEqual([30]);
    expect(r.tilePops[0]!.row).toBe(2);
    expect(r.tilePops[0]!.col).toBe(1);
  });
  test("the same part leaving over 16 frames is not a pop; a cut is not judged", () => {
    expect(analyseLuma(drift(60, 96, 54, (f) => Math.min(1, Math.max(0, (46 - f) / 16))), { fps: 60, width: 96, height: 54 }).tilePops).toEqual([]);
    expect(analyseLuma(drift(60, 96, 54, (f) => (f < 30 ? 1 : 0)), { fps: 60, width: 96, height: 54, cuts: [30] }).tilePops).toEqual([]);
  });
  test("the rule is the whole frame's: above 2 levels and 3× the tile's own neighbours", () => {
    const series = [Array.from({ length: 20 }, (_, f) => (f === 10 ? 2.5 : 0.5)), Array.from({ length: 20 }, (_, f) => (f === 10 ? 1.9 : 0.1))];
    expect(findTilePops(series, 2).map((p) => [p.frame, p.tile])).toEqual([[10, 0]]);
  });
});

/** A light frame with a block of dark strokes (a line of type) in `rect`, at `ink` of full strength. */
const textFrame = (w: number, h: number, rect: { x: number; y: number; w: number; h: number }, ink: number) => {
  const px = new Uint8Array(w * h).fill(220);
  for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) if ((x % 7 < 2 || y % 9 < 2) && ink > 0) px[y * w + x] = Math.round(220 - 180 * ink);
  return px;
};

describe("ink presence per type rect (CR-03)", () => {
  const rect = { x: 10, y: 10, w: 100, h: 30 };
  const track = (exits: InkTrack["exits"] = []): InkTrack => ({ id: "L", text: "Its own tools.", rect, polarity: "dark", from: 0, landed: 5, until: 40, exits });
  const series = (strength: (f: number) => number) => Array.from({ length: 60 }, (_, f) => inkIn(textFrame(120, 50, rect, strength(f)), 120, 50, rect, "dark"));
  test("the ink of a line is measured against its own ground", () => {
    const full = series(() => 1)[0]!;
    expect(full).toBeGreaterThan(400);
    expect(series(() => 0)[0]).toBe(0);
  });
  test("a line that vanishes in 2 frames with no exit declared is caught, where it vanished", () => {
    const f = judgeInk(track(), series((f) => (f < 30 ? 1 : f < 31 ? 0.5 : 0)));
    expect(f.length).toBe(1);
    expect(f[0]!.kind).toBe("vanish");
    expect(f[0]!.from).toBe(29);
    expect(f[0]!.to).toBe(31);
  });
  test("the same fall inside a declared exit passes; so does a slow fade", () => {
    expect(judgeInk(track([{ from: 28, to: 34, kind: "blur" }]), series((f) => (f < 30 ? 1 : 0)))).toEqual([]);
    expect(judgeInk(track(), series((f) => Math.max(0, Math.min(1, (40 - f) / 24))))).toEqual([]);
  });
  test("a line still drawn when its piece cuts away vanishes on the cut", () => {
    const f = judgeInk({ ...track(), until: 30 }, series((f) => (f < 30 ? 1 : 0)));
    expect(f.length).toBe(1);
    expect(f[0]!.message).toMatch(/vanishes there/);
  });
});

describe("stone count on a render (CR-01)", () => {
  const disc = (px: Uint8Array, w: number, cx: number, cy: number, r: number) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px[y * w + x] = 92;
  };
  test("two stone-sized blobs are two; glyph strokes and a button are none", () => {
    const w = 240;
    const h = 120;
    const px = new Uint8Array(w * h).fill(222);
    disc(px, w, 60, 60, 14);
    disc(px, w, 170, 60, 14);
    for (let x = 100; x < 140; x++) px[20 * w + x] = 40; // a hairline
    for (let y = 95; y < 105; y++) for (let x = 20; x < 90; x++) px[y * w + x] = 80; // a button, 7:1
    expect(stoneBlobs(px, w, h, { minR: 7, maxR: 22 }).length).toBe(2);
    disc(px, w, 170, 60, 0);
    const one = new Uint8Array(w * h).fill(222);
    disc(one, w, 60, 60, 14);
    expect(stoneBlobs(one, w, h, { minR: 7, maxR: 22 }).length).toBe(1);
  });
  test("shrinking keeps a stone a stone", () => {
    const w = 240;
    const h = 120;
    const px = new Uint8Array(w * h).fill(222);
    disc(px, w, 60, 60, 14);
    const s = shrink(px, w, h, 2);
    expect(stoneBlobs(s.px, s.w, s.h, { minR: 4, maxR: 11 }).length).toBe(1);
  });
});

describe("the aperture's bands on a render (CR-07)", () => {
  /** 100 × 100 frames whose night bands are 20 px until `openAt`, then shrink 2 px a frame. */
  const frames = (openAt: number) =>
    Array.from({ length: 60 }, (_, f) => {
      const band = f < openAt ? 20 : Math.max(0, 20 - 2 * (f - openAt));
      const px = new Uint8Array(100 * 100).fill(210);
      for (let y = 0; y < band; y++) for (let x = 0; x < 100; x++) {
        px[y * 100 + x] = 28;
        px[(99 - y) * 100 + x] = 28;
      }
      return px;
    });
  test("the bands' heights, and the frame they start to open", () => {
    const fr = frames(30).map((px) => bandHeights(px, 100, 100));
    expect(fr[10]!.top).toBe(20);
    expect(fr[10]!.bottom).toBe(20);
    expect(openingStart(fr, { from: 5, to: 25 }, 25)).toBe(31);
    expect(openingStart(frames(99).map((px) => bandHeights(px, 100, 100)), { from: 5, to: 25 }, 25)).toBeNull();
  });
});

/* ---------------------------------------------------------------- plan-level canaries --------------------------- */

const F = frameBox(W, H);
const still = (pose: Pose) => new VelocityCamera(pose, { x: 0.6 });

/** A small hand-built plan: one or two shots on the riverbed, no type, no rings (each canary adds its fault). */
const mini = (o: Partial<ScenePlan> & { shots?: ShotSpec[] } = {}): ScenePlan => {
  const ref: Pose = { x: 0, y: 0, zoom: 1 };
  const shots: ShotSpec[] = o.shots ?? [{ id: "a", from: 0, to: 600, kind: "ui", camera: still(ref), ref, ground: "riverbed", planes: [], rings: [] }];
  return {
    id: "mini",
    name: "mini",
    aspect: "16:9",
    frame: F,
    fps: FPS,
    duration: shots[shots.length - 1]!.to,
    shots,
    seams: [],
    types: [],
    lightInitial: "day",
    lightCues: [],
    leaks: [],
    hits: [],
    takes: [],
    music: [],
    moves: [],
    ...o,
  };
};

describe("ground coverage (CR-02)", () => {
  test("a shot near its ref is covered; a pull-back to a tenth of the zoom shows the riverbed's edges", () => {
    expect(groundCoverage(mini())).toEqual([]);
    const ref: Pose = { x: 0, y: 0, zoom: 1 };
    const cam = new VelocityCamera(ref);
    cam.hermite(300, { x: 0, y: 0, zoom: 0.1 }, { lz: -0.0005 });
    const f = groundCoverage(mini({ shots: [{ id: "a", from: 0, to: 600, kind: "ui", camera: cam, ref, ground: "riverbed", planes: [], rings: [] }] }));
    expect(f.length).toBe(1);
    expect(f[0]!.message).toMatch(/left and right/);
  });
  test("the page has no edge to show", () => {
    const ref: Pose = { x: 0, y: 0, zoom: 1 };
    const cam = new VelocityCamera(ref);
    cam.hermite(300, { x: 0, y: 0, zoom: 0.1 }, { lz: -0.0005 });
    expect(groundCoverage(mini({ shots: [{ id: "a", from: 0, to: 600, kind: "title", camera: cam, ref, ground: "page", planes: [], rings: [] }] }))).toEqual([]);
  });
});

describe("one stone (CR-01)", () => {
  /** A shot whose stone sits at frame point (x, y) under an identity camera (world = frame px). */
  const shot = (id: string, from: number, to: number, x: number, y: number): ShotSpec => {
    const pose: Pose = { x: W / 2, y: H / 2, zoom: 1 };
    return { id, from, to, kind: "ui", camera: new VelocityCamera(pose), ref: pose, ground: "page", planes: [], rings: [], stone: { at: { x, y }, r: 44, size: 148, cues: [] } };
  };
  const iris = (bx: number) =>
    mini({ shots: [shot("a", 0, 300, 800, 500), shot("b", 300, 600, bx, 500)], seams: [{ at: 300, kind: "ring", frames: 30, out: "a", in: "b", presentation: "iris", ease: "move", irisCenter: { x: bx, y: 500 } }] });
  test("two stones 150 px apart through an iris are caught; one stone landed on the other's pose passes", () => {
    const f = stoneCount(iris(950));
    expect(f.length).toBe(1);
    expect(f[0]!.frame).toBe(300);
    expect(stoneCount(iris(800))).toEqual([]);
  });
  test("a hard cut never shows two at once", () => {
    expect(stoneCount(mini({ shots: [shot("a", 0, 300, 800, 500), shot("b", 300, 600, 950, 500)], seams: [{ at: 300, kind: "momentum", frames: 0, out: "a", in: "b" }] }))).toEqual([]);
  });
});

describe("legible planes in frame, and their words read (CR-05, CR-09)", () => {
  /** One shot at a reading zoom of 2.2 with the test card (13.1 px body text → 28.8 px) at world x. */
  const card = (x: number, read?: PlaneSpec["read"]) => {
    const pose: Pose = { x: 0, y: 0, zoom: 2.2 };
    const pl: PlaneSpec = { id: "card", kind: "pebble", rect: { x, y: -150, w: 495, h: 344 }, content: { kind: "standIn", standIn: STILL.testsCard }, read };
    return mini({ shots: [{ id: "a", from: 0, to: 1800, kind: "ui", camera: new VelocityCamera(pose, { x: 0.05 }), ref: pose, ground: "riverbed", planes: [pl], rings: [] }] });
  };
  test("a card at reading size cut by the frame's edge is caught; the same card in frame passes", () => {
    const f = planesInFrame(card(200));
    expect(f.length).toBe(1);
    expect(f[0]!.message).toMatch(/right/);
    expect(planesInFrame(card(-250))).toEqual([]);
  });
  test("its 47 legible words must be counted; counted, at an easy pace, it passes", () => {
    expect(errorsOf(legibleWords(card(-250, { from: 0, to: 1800, words: 8 }))).length).toBeGreaterThan(0);
    expect(legibleWords(card(-250, { from: 0, to: 1800, words: 47 }))).toEqual([]);
  });
  test("a read declared with 0 words is refused", () => {
    expect(legibleWords(card(-250, { from: 0, to: 1800, words: 0 })).some((x) => /0 words/.test(x.message))).toBe(true);
  });
  test("text under 20 px is not legible: nothing to frame or count", () => {
    const p = card(200);
    const small = { ...p, shots: p.shots.map((s) => ({ ...s, camera: new VelocityCamera({ x: 0, y: 0, zoom: 1.2 }, { x: 0.3 }) })) };
    expect(planesInFrame(small)).toEqual([]);
    expect(legibleWords(small)).toEqual([]);
  });
});

describe("the hit in every aspect (CR-07)", () => {
  const withAperture = (openAt: number, leak?: { at: number; frames: number }) => {
    const p = mini({ hits: [180], leaks: leak ? [leak] : [] });
    const s = { ...p.shots[0]!, aperture: { centerY: H / 2, band: "#191E1B", open: (fr: number) => Math.min(1, Math.max(0, (fr - openAt) / 34)) } };
    return { ...p, shots: [s] };
  };
  test("bands that open 20 frames after the hit are caught; on the hit they pass", () => {
    expect(errorsOf(hitSync(withAperture(200))).length).toBe(1);
    expect(errorsOf(hitSync(withAperture(180)))).toEqual([]);
  });
  test("a light leak over the bands is caught; once they have cleared it passes", () => {
    expect(errorsOf(hitSync(withAperture(180, { at: 182, frames: 48 }))).some((x) => /leak/.test(x.message))).toBe(true);
    expect(errorsOf(hitSync(withAperture(180, { at: 215, frames: 48 })))).toEqual([]);
  });
});

describe("small print holds (CR-10)", () => {
  const box = { left: 0, top: 600, width: W, align: "center" as const };
  const line = (id: string, text: string, at: number, kind: TypeSpec["kind"]): TypeSpec => ({ id, text, tier: kind === "small" ? "small" : "functional", at, box, kind });
  test("a page of about 100 words for 6 s is caught, and the honest line in it under 9 s", () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const p = mini({ endsFilm: true, types: [line("a", "Shown with sample data.", 240, "end"), line("s", `${words} ${STEALTH_HONEST}`, 250, "small")] });
    const f = smallPrintHolds(p);
    expect(f.some((x) => /page/.test(x.message))).toBe(true);
    expect(f.some((x) => /honest/.test(x.message))).toBe(true);
  });
  test("a page held for its reading time passes", () => {
    expect(smallPrintHolds(mini({ endsFilm: true, types: [line("a", "Shown with sample data.", 0, "end"), line("b", "Real Pebble 2.0 screens, composed in one space. Nothing Pebble does is sped up.", 10, "end")] }))).toEqual([]);
  });
});

describe("the ask and the act on one clock (CR-11)", () => {
  const use = { manifest: TAKE_HSF, at: 0, inPoint: 0, until: 600 };
  const planes = (askPlace: string): PlaneSpec[] => [
    { id: "ask", kind: "pebble", rect: { x: 0, y: 0, w: 726, h: 134 }, content: { kind: "standIn", standIn: STILL.held }, place: askPlace },
    { id: "act", kind: "pebble", rect: { x: 0, y: 170, w: 726, h: 640 }, content: { kind: "take", use, view: "run" } },
  ];
  const plan = (askPlace: string) => {
    const p = mini();
    return { ...p, shots: [{ ...p.shots[0]!, planes: planes(askPlace) }] };
  };
  test("a still of a window beside a live take of the same window is caught", () => {
    const f = askActClock(plan("studio-bookings"));
    expect(f.length).toBe(1);
    expect(f[0]!.frame).toBe(0);
  });
  test("a still of another window passes, and so do two views of one take on one clock", () => {
    expect(askActClock(plan("glaze"))).toEqual([]);
    const p = plan("studio-bookings");
    const twoViews = { ...p, shots: [{ ...p.shots[0]!, planes: [p.shots[0]!.planes[1]!, { ...p.shots[0]!.planes[1]!, id: "act2" }] }] };
    expect(askActClock(twoViews)).toEqual([]);
  });
});

describe("no line vanishes (CR-03)", () => {
  const box = { left: 120, top: 400, align: "left" as const };
  const l = (o: Partial<TypeSpec>): TypeSpec => ({ id: "L", text: "Its own tools.", tier: "expressive", at: 0, box, kind: "film", ...o });
  test("a 'camera' exit and a line held to a piece's end are caught", () => {
    expect(typeExits(mini({ types: [l({ exitAt: 300, exit: "camera" })] })).length).toBe(1);
    expect(typeExits(mini({ types: [l({})] })).length).toBe(1);
  });
  test("a drawn exit passes; a line held to the film's end passes", () => {
    expect(typeExits(mini({ types: [l({ exitAt: 300, exit: "blur" })] }))).toEqual([]);
    expect(typeExits(mini({ endsFilm: true, types: [l({})] }))).toEqual([]);
  });
});

/* ---------------------------------------------------------------- on the current plans ------------------------- */

const ASPECTS: readonly Aspect[] = ["16:9", "1:1", "9:16"];
const reportOf = (a: Aspect, piece: string) => {
  const e = demoPlans(a).find((x) => x.plan.id === piece)!;
  return checkPlan(e.plan, e.grid);
};
const foundationErrors = () => checkAll(demoQa(), MOVES).errors;

describe("the craft review's findings, caught on the current plans (CR-15)", () => {
  for (const o of OPEN_FINDINGS) {
    test(`${o.cr}: ${o.check} fires on ${o.piece}${o.saw ? ", on the frames the review saw" : ""}`, () => {
      if (o.piece === "F2-Foundation-Demo") {
        expect(errorsOf(foundationErrors(), o.check).length).toBeGreaterThan(0);
        return;
      }
      const fired = ASPECTS.some((a) => errorsOf(reportOf(a, o.piece).errors, o.check).length > 0);
      // fixed? take it out of setpieces/review-ledger.ts (the ledger only shrinks)
      expect(fired).toBe(true);
      for (const s of o.saw ?? []) {
        const xs = errorsOf(reportOf(s.aspect, o.piece).errors, o.check);
        for (let fr = s.from; fr < s.to; fr++) {
          const covered = xs.some((x) => (x.to !== undefined ? fr >= x.frame! && fr < x.to : Math.abs(fr - x.frame!) <= 3));
          if (!covered) throw new Error(`${o.cr} ${o.piece} ${o.check} (${s.aspect}): frame ${fr} of the review's ${s.from}–${s.to} is not covered by ${xs.map((x) => `${x.frame}–${x.to ?? "·"}`).join(", ") || "any finding"}`);
        }
      }
    });
  }
  test("the 9:16 bands open 22 frames later than 16:9's and 1:1's, as the review measured (about 202 against 181)", () => {
    const open = (a: Aspect) => apertureOpenStart(demoPlans(a)[0]!.plan);
    expect(open("16:9")).toBe(182);
    expect(open("1:1")).toBe(182);
    expect(open("9:16")).toBe(204);
    expect(errorsOf(hitSync(demoPlans("16:9")[0]!.plan)).some((x) => /starts to open/.test(x.message))).toBe(false);
    expect(errorsOf(hitSync(demoPlans("9:16")[0]!.plan)).some((x) => /24 frames after the hit/.test(x.message))).toBe(true);
  });
  test("the whole-frame checks the review cited still pass these plans: the new checks are what sees the defects", () => {
    for (const a of ASPECTS)
      for (const e of demoPlans(a)) {
        const old = checkPlan(e.plan, e.grid).errors.filter((x) => !(REVIEW_CHECKS as readonly string[]).includes(x.check));
        expect(old).toEqual([]);
      }
  });
  test("every error on the current plans is an open finding in the ledger", () => {
    for (const a of ASPECTS)
      for (const e of demoPlans(a)) {
        const rest = checkPlan(e.plan, e.grid).errors.filter((x) => !isOpen(e.plan.id, x.check));
        expect(rest).toEqual([]);
      }
    expect(foundationErrors().filter((x) => !isOpen("F2-Foundation-Demo", x.check))).toEqual([]);
  });
});
