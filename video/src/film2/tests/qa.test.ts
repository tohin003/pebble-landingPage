// The smoothness checks, proved on planted faults (each check must catch its canary and pass a clean timeline), and
// the demo reel's own timeline. This is the pattern the set-piece lanes copy for their own shots.
import { describe, expect, test } from "bun:test";
import { checkAll, cutAudit, blurAudit, copy, deadFrames, flashes, holds, readingLoads, rings, velocityContinuity, type QaMove } from "../qa/checks";
import { analyseLuma } from "../qa/luma";
import type { FilmTimelineQa, QaShot } from "../qa/timeline";
import { VelocityCamera, arriveWithMomentum } from "../motion/camera";
import { momentumCut } from "../transitions/momentum";
import { MOVES, demoQa } from "../demo/timeline";
import type { RingSpec } from "../carrier/ring";

const W = 1920;
const H = 1080;

/** A clean two-shot timeline: a push-in, a momentum cut, an arrival; one line; one light change. */
const clean = (): FilmTimelineQa => {
  // a push-in that keeps drifting (about 20 px a second at the corners), a momentum cut, an arrival that glides into a
  // drift: alive in every second, as §5.3 asks ("arrive, glide, leave")
  const a = new VelocityCamera({ x: 0, y: 0, zoom: 1 }, { lz: 0.0004 });
  a.hermite(120, { x: 0, y: 0, zoom: 1.08 }, { lz: 0.0003 });
  const seam = momentumCut({ out: a, cutFrame: 240, dir: { x: -1, y: 0 }, dPx: 120, leaveFrames: 18, target: { x: 4000, y: 0, zoom: 1 }, inFrames: 50, frameW: W, frameH: H, fps: 60, mode: "glide", tau: 20 });
  seam.inCam.glide(240, 24, { x: 0.4 });
  return {
    name: "clean",
    fps: 60,
    width: W,
    height: H,
    durationInFrames: 480,
    shots: [
      { id: "A", from: 0, to: 240, kind: "ui", camera: a },
      { id: "B", from: 240, to: 480, kind: "ui", camera: seam.inCam },
    ],
    seams: [{ at: 240, kind: "momentum", frames: 0, out: "A", in: "B" }],
    texts: [{ id: "l", text: "Memory you control", from: 30, to: 200, enterFrames: 30, rect: { x: 120, y: 260, w: 800, h: 110 } }],
    lightInitial: "morning",
    lightCues: [{ at: 200, to: "day", frames: 60 }],
  };
};

describe("a clean timeline passes", () => {
  test("no errors", () => {
    const r = checkAll(clean());
    expect(r.errors).toEqual([]);
  });
});

describe("each check catches its canary", () => {
  test("a cut between two rests", () => {
    const t = clean();
    const still = (id: string, from: number, to: number): QaShot => ({ id, from, to, camera: new VelocityCamera({ x: 0, y: 0, zoom: 1 }) });
    t.shots = [still("A", 0, 240), still("B", 240, 480)];
    expect(cutAudit(t).findings.some((f) => f.level === "error" && /two rests/.test(f.message))).toBe(true);
    t.seams = [{ ...t.seams[0]!, punctuation: true }];
    expect(cutAudit(t).findings.filter((f) => f.level === "error")).toEqual([]);
  });

  test("a speed mismatch and a direction change at a hard cut", () => {
    const t = clean();
    const b = arriveWithMomentum({ target: { x: 0, y: 0, zoom: 1 }, frames: 50, vScreen: { x: -12, y: 0 } }); // too slow
    t.shots = [t.shots[0]!, { ...t.shots[1]!, camera: b }];
    expect(cutAudit(t).findings.some((f) => /within ±25/.test(f.message))).toBe(true);
    const c = arriveWithMomentum({ target: { x: 0, y: 0, zoom: 1 }, frames: 50, vScreen: { x: 0, y: -28.3 } }); // turns 90°
    t.shots = [t.shots[0]!, { ...t.shots[1]!, camera: c }];
    expect(cutAudit(t).findings.some((f) => /direction turns/.test(f.message))).toBe(true);
  });

  test("a velocity jump inside a shot", () => {
    const t = clean();
    const cam = new VelocityCamera({ x: 0, y: 0, zoom: 1 });
    cam.ease(60, { x: -2000, y: 0, zoom: 1 }, "power4.in"); // ends at 167 px a frame, then stops dead
    cam.glide(240, 0.0001);
    t.shots = [{ ...t.shots[0]!, camera: cam }, t.shots[1]!];
    expect(velocityContinuity(t).findings.length).toBeGreaterThan(0);
  });

  test("a fast move without its blur", () => {
    const t = clean();
    t.shots = [{ ...t.shots[0]!, appliedBlur: () => 0 }, t.shots[1]!];
    expect(blurAudit(t).findings.length).toBeGreaterThan(0);
  });

  test("short holds: a line, the honest line, a promise and its limit, a UI shot", () => {
    const t = clean();
    t.texts = [
      { id: "a", text: "Reliability, not security.", from: 10, to: 50 },
      { id: "h", text: "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.", from: 10, to: 400, honest: true },
      { id: "p", text: "Now it works across your Mac.", from: 100, to: 300, pairWith: "q" },
      { id: "q", text: "Where you allow it.", from: 200, to: 300 },
    ];
    t.shots = [{ ...t.shots[0]!, to: 100 }, { ...t.shots[1]!, from: 100 }];
    t.seams = [{ ...t.seams[0]!, at: 100 }];
    const msgs = holds(t).map((f) => f.message).join("\n");
    expect(msgs).toMatch(/Reliability/);
    expect(msgs).toMatch(/Hidden from screen capture/);
    expect(msgs).toMatch(/together/);
    expect(msgs).toMatch(/UI shot A/);
  });

  test("too many words a second", () => {
    const t = clean();
    t.texts = [{ id: "x", text: "one two three four five six seven eight nine ten eleven twelve", from: 0, to: 240 }];
    t.readables = [{ id: "ui", from: 0, to: 240, rect: { x: 0, y: 0, w: 10, h: 10 }, words: 4 }];
    expect(readingLoads(t).findings.some((f) => f.level === "error")).toBe(true);
  });

  test("a dead second", () => {
    const t = clean();
    const still = new VelocityCamera({ x: 0, y: 0, zoom: 1 });
    t.shots = [{ ...t.shots[0]!, camera: still }, t.shots[1]!];
    t.texts = [];
    t.lightCues = [];
    expect(deadFrames(t).findings.length).toBeGreaterThan(0);
    t.shots = [{ ...t.shots[0]!, waits: [{ from: 0, to: 240 }] }, t.shots[1]!];
    expect(deadFrames(t).findings.length).toBe(0);
  });

  test("a light step and a strobe", () => {
    const t = clean();
    t.lightCues = [{ at: 100, to: "night", frames: 4 }];
    expect(flashes(t).findings.some((f) => /never a step/.test(f.message))).toBe(true);
    t.lightCues = [
      { at: 60, to: "night", frames: 30 },
      { at: 90, to: "page", frames: 30 },
      { at: 120, to: "night", frames: 30 },
    ];
    expect(flashes(t).findings.some((f) => /large luminance changes/.test(f.message))).toBe(true);
  });

  test("a ring across a line being read, around a receipt, and two in flight", () => {
    const t = clean();
    const across: RingSpec = { id: "r", start: 60, source: { x: 0, y: 0 }, stoneRadius: 40, phases: [{ kind: "emit", frames: 30, radius: 600 }, { kind: "hold", frames: 60 }] };
    t.rings = [across];
    t.ringPose = () => ({ x: 960, y: 540, zoom: 1 }); // world = frame px
    t.texts = [{ id: "l", text: "Memory you control", from: 0, to: 200, rect: { x: 300, y: 0, w: 900, h: 120 } }];
    expect(rings(t).findings.some((f) => /crosses the line/.test(f.message))).toBe(true);
    const around: RingSpec = { id: "a", start: 300, source: { x: 0, y: 0 }, stoneRadius: 40, phases: [{ kind: "emit", frames: 20, radius: 80 }, { kind: "frame", frames: 30, rect: { x: 400, y: 400, w: 200, h: 100 } }, { kind: "hold", frames: 30 }] };
    t.rings = [around];
    t.texts = [];
    t.readables = [{ id: "rc", from: 300, to: 400, rect: { x: 400, y: 400, w: 200, h: 100 }, receipt: true }];
    expect(rings(t).findings.some((f) => /around the receipt/.test(f.message))).toBe(true);
    t.rings = [across, { ...across, id: "b", start: 80 }];
    t.readables = [];
    expect(rings(t).findings.some((f) => /in flight/.test(f.message))).toBe(true);
  });

  test("the never-list on film lines", () => {
    const t = clean();
    t.texts = [
      { id: "1", text: "The first seamless agent!", from: 0, to: 300 },
      { id: "2", text: "Pebble · 2.0", from: 0, to: 300 },
      { id: "3", text: "UNDETECTABLE", from: 0, to: 300 },
    ];
    const msgs = copy(t).map((f) => f.message).join("\n");
    expect(msgs).toMatch(/exclamation/);
    expect(msgs).toMatch(/middle dots/);
    expect(msgs).toMatch(/"first"/);
    expect(msgs).toMatch(/all caps/);
  });
});

describe("the pixel checks (qa/luma.ts)", () => {
  const frames = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => new Uint8Array(96 * 54).fill(f(i)));
  test("a smooth fade passes; a strobe, a dead second, a pop and a dip are caught", () => {
    expect(analyseLuma(frames(120, (i) => 120 + i / 2), { fps: 60, width: 96, height: 54 }).ok).toBe(true);
    const strobe = analyseLuma(frames(60, (i) => (Math.floor(i / 5) % 2 ? 230 : 40)), { fps: 60, width: 96, height: 54 });
    expect(strobe.maxFlashesPerSecond).toBeGreaterThan(3);
    const dead = analyseLuma(frames(90, () => 128), { fps: 60, width: 96, height: 54 });
    expect(dead.deadRuns.length).toBe(1);
    const pop = analyseLuma(frames(60, (i) => (i === 30 ? 200 : 100 + i * 0.2)), { fps: 60, width: 96, height: 54 });
    expect(pop.pops.length).toBeGreaterThan(0);
    const dip = analyseLuma(frames(60, (i) => (i >= 28 && i <= 32 ? 150 : 160 + 0.3 * i)), { fps: 60, width: 96, height: 54, cuts: [28] });
    expect(dip.dips.length).toBe(1);
  });
});

describe("the demo reel", () => {
  test("F2-Foundation-Demo's timeline passes every check", () => {
    const moves: readonly QaMove[] = MOVES;
    const r = checkAll(demoQa(), moves);
    if (!r.ok) console.log(r.errors);
    expect(r.errors).toEqual([]);
    // it shows each of the seven kinds
    for (const k of ["ring", "momentum", "product", "push", "swap", "rack", "light"]) expect(Number(r.metrics[`kind.${k}`])).toBeGreaterThan(0);
  });
});
