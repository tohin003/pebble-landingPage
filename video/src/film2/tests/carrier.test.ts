// The ring carrier and the aperture: deterministic, born at the stone, never across the ask it frames, back to the stone.
import { describe, expect, test } from "bun:test";
import { phaseWindows, ringEnd, ringStates, ringsInFlight, rippleStates, type RingSpec } from "../carrier/ring";
import { apertureOpenForRing, apertureRect } from "../carrier/apertureMath";
import { distToRect, rectHalfDiagonal } from "../motion/geometry";
import { TRANSITION } from "../tokens";

const ask = { x: 600, y: 200, w: 495, h: 344 };
const spec: RingSpec = {
  id: "t",
  start: 100,
  source: { x: 200, y: 500 },
  stoneRadius: 44,
  phases: [
    { kind: "emit", frames: 36, radius: 130 },
    { kind: "frame", frames: 60, rect: ask, clearance: 40 },
    { kind: "hold", frames: 50 },
    { kind: "return", frames: 42 },
  ],
  echoes: 2,
};

describe("the ring", () => {
  test("is a pure function of the frame", () => {
    for (const f of [100, 117.5, 140, 199, 260]) expect(ringStates(spec, f, 60)).toEqual(ringStates(spec, f, 60));
  });

  test("leaves the stone: born at the stone's edge, invisible on its first frame", () => {
    const [r] = ringStates(spec, 100, 60);
    expect(r!.r).toBeCloseTo(44, 6);
    expect(r!.opacity).toBe(0);
    expect(ringStates(spec, 99, 60)).toEqual([]);
  });

  test("frames the ask without ever crossing it, and returns to the stone, gone on contact", () => {
    const wins = phaseWindows(spec);
    const frame = wins.find((w) => w.kind === "frame")!;
    expect(frame.to.r).toBeCloseTo(rectHalfDiagonal(ask) + 40, 6);
    for (let f = frame.f1; f < frame.f1 + 50; f++) {
      const r = ringStates(spec, f, 60).find((x) => x.echo === 0)!;
      // the whole rect lies inside the circle, clear of the hairline
      const far = Math.max(...[[ask.x, ask.y], [ask.x + ask.w, ask.y], [ask.x, ask.y + ask.h], [ask.x + ask.w, ask.y + ask.h]].map(([x, y]) => Math.hypot(x! - r.c.x, y! - r.c.y)));
      expect(far).toBeLessThan(r.r - 30);
      expect(distToRect(r.c, ask)).toBe(0);
    }
    const end = ringEnd(spec);
    // it accelerates into the stone (E-leave) and has faded by its last frame; its path ends on the stone's edge
    const last = ringStates(spec, end - 1, 60).find((x) => x.echo === 0)!;
    expect(last.opacity).toBeLessThan(0.01);
    expect(phaseWindows(spec).at(-1)!.to.r).toBe(44);
    let prevR = Infinity;
    for (let f = phaseWindows(spec).at(-1)!.f0; f < end; f++) {
      const r = ringStates(spec, f, 60).find((x) => x.echo === 0)!.r;
      expect(r).toBeLessThanOrEqual(prevR);
      prevR = r;
    }
    expect(ringStates(spec, end, 60).filter((x) => x.echo === 0)).toEqual([]);
  });

  test("its echoes are ripples: fainter, later, gone after the emit", () => {
    const at = ringStates(spec, 118, 60);
    const echo = at.find((x) => x.echo === 1)!;
    const main = at.find((x) => x.echo === 0)!;
    expect(echo.r).toBeLessThan(main.r);
    expect(echo.opacity).toBeLessThan(main.opacity);
    expect(ringStates(spec, 100 + 2 * 10 + 36 + 18 + 1, 60).some((x) => x.echo > 0)).toBe(false);
  });

  test("the ground ripple starts at 6 px or less and is gone 30 frames after its birth", () => {
    for (let f = 100; f < 200; f++) for (const r of rippleStates(spec, f, 60)) expect(r.amplitudePx).toBeLessThanOrEqual(TRANSITION.ring.rippleMaxPx + 1e-9);
    expect(rippleStates(spec, 100 + 30, 60).filter((r) => r.id === "t:0")).toEqual([]);
  });

  test("one ring chapter in flight at a time is countable", () => {
    const other: RingSpec = { ...spec, id: "u", start: 150 };
    expect(ringsInFlight([spec, other], 120)).toBe(1);
    expect(ringsInFlight([spec, other], 160)).toBe(2);
  });
});

describe("the aperture", () => {
  test("16:9 starts at 2.39:1 and opens to full bleed", () => {
    const a = apertureRect(1920, 1080, 0);
    expect(a.w / a.h).toBeCloseTo(2.39, 2);
    const b = apertureRect(1920, 1080, 1);
    expect(b).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(apertureRect(1080, 1920, 0).w / apertureRect(1080, 1920, 0).h).toBeCloseTo(0.8, 3);
    expect(apertureRect(1080, 1080, 0).w / apertureRect(1080, 1080, 0).h).toBeCloseTo(16 / 9, 3);
  });
  test("opens with the ring: shut while the ring is inside, open once it reaches the frame's half height", () => {
    expect(apertureOpenForRing(1920, 1080, 540, 100)).toBe(0);
    expect(apertureOpenForRing(1920, 1080, 540, 540)).toBeCloseTo(1, 6);
    const mid = apertureOpenForRing(1920, 1080, 540, 470);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
