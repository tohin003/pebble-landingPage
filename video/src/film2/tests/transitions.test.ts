// The seam presentations' looks (pure parts of transitions/presentations.tsx), the take at 1×, and the ring's speed.
import { describe, expect, test } from "bun:test";
import { irisRadius, rackLook, swapPresentationLook } from "../transitions/presentations";
import { takeFrame, askCardLook } from "../transitions/entrances";
import { KINDS, checkKindFrames } from "../transitions/kinds";
import { cutTheCurveNumbers, whipNumbers } from "../transitions/ports";
import { matchCutNumbers } from "../type/TextMatchCut";
import { phaseWindows, ringEnd, type RingSpec } from "../carrier/ring";
import { focusPull } from "../camera/moves";
import { TRANSITION_KINDS } from "../tokens";

describe("kind 1: the ring iris", () => {
  test("opens from the stone past the farthest corner, fast then slow (E-arrive)", () => {
    expect(irisRadius(0, 44, 2300)).toBe(44);
    expect(irisRadius(1, 44, 2300)).toBe(2300);
    const early = irisRadius(0.2, 44, 2300) - 44;
    const late = 2300 - irisRadius(0.8, 44, 2300);
    expect(early).toBeGreaterThan(late * 5);
  });
});

describe("kind 5: the swap in place", () => {
  test("the outgoing is gone at the middle, the incoming lands sharp at the end", () => {
    expect(swapPresentationLook(0, "exiting", 8)).toEqual({ opacity: 1, blur: 0 });
    expect(swapPresentationLook(0.5, "exiting", 8).opacity).toBeCloseTo(0, 6);
    expect(swapPresentationLook(0.5, "entering", 8).opacity).toBeCloseTo(0, 6);
    expect(swapPresentationLook(1, "entering", 8)).toEqual({ opacity: 1, blur: 0 });
  });
});

describe("kind 6: rack focus", () => {
  test("the outgoing stays opaque (no dip) and is fully defocused before the incoming appears", () => {
    for (let p = 0; p <= 1; p += 0.01) expect(rackLook(p, "exiting", 13).opacity).toBe(1);
    expect(rackLook(0.36, "entering", 13).opacity).toBeCloseTo(0, 6);
    // wherever the cross is visible, both shots are at 85 % of full defocus or more: nothing readable crosses
    for (let p = 0.36; p <= 0.64; p += 0.005) {
      const o = rackLook(p, "entering", 13).opacity;
      if (o < 0.05 || o > 0.95) continue;
      expect(rackLook(p, "exiting", 13).blur).toBeGreaterThanOrEqual(0.85 * 13);
      expect(rackLook(p, "entering", 13).blur).toBeGreaterThanOrEqual(0.85 * 13);
    }
    expect(rackLook(1, "entering", 13)).toEqual({ opacity: 1, blur: 0, scale: 1 });
  });
});

describe("kind 3: the product's own motion", () => {
  test("a take plays at 1×: a 30 fps take advances one frame every two frames of a 60 fps film, never faster", () => {
    const seq = Array.from({ length: 120 }, (_, f) => takeFrame(f, 0, 60, 30, 22));
    expect(seq[0]).toBe(22);
    expect(seq[119]).toBe(22 + 59);
    for (let i = 1; i < seq.length; i++) expect(seq[i]! - seq[i - 1]!).toBeLessThanOrEqual(1);
  });
  test("the ask card's shared entrance: 24 px rise, 8 px blur, 24 frames on E-arrive", () => {
    expect(askCardLook(99, 100, 60).opacity).toBe(0);
    const a = askCardLook(100, 100, 60);
    expect(a.dy).toBeCloseTo(24, 6);
    expect(a.blur).toBeCloseTo(8, 6);
    expect(askCardLook(124, 100, 60)).toEqual({ dy: 0, blur: 0, opacity: 1 });
  });
});

describe("the kinds table and the ports", () => {
  test("every kind has a builder and limits; a seam outside its kind's frames is refused", () => {
    for (const k of TRANSITION_KINDS) expect(KINDS[k].build.length).toBeGreaterThan(10);
    expect(checkKindFrames("rack", 36, 60)).toEqual([]);
    expect(checkKindFrames("rack", 12, 60).length).toBe(1);
    expect(checkKindFrames("light", 20, 60).length).toBe(1);
    expect(checkKindFrames("product", 3, 60)).toEqual([]);
  });
  test("cut-the-curve matches speed at the cut by construction; the whip's blur is travel ÷ 7 at its peak", () => {
    const c = cutTheCurveNumbers(60, 0.33, 650);
    // power4.in ends at 5 × D_out/T_out; power4.out starts at 5 × D_in/T_in: equal
    expect((5 * c.dIn) / c.entry).toBeCloseTo(c.vCut, 6);
    const w = whipNumbers(1920, 33);
    expect(w.peakTravel).toBeCloseTo((1920 * 4) / 33, 1); // power3.inOut peaks at 4 × its mean speed
    expect(w.peakSigma).toBeCloseTo(w.peakTravel / 7, 6);
    const m = matchCutNumbers("scale-down", 120, 700, 1920, 1080);
    expect(m.cutFrame).toBe(60);
    expect(m.peakSigma).toBeGreaterThan(0);
  });
});

describe("the ring's speed parameter", () => {
  test("speed 1.25 shortens every phase and keeps the shape", () => {
    const base: RingSpec = { id: "s", start: 0, source: { x: 0, y: 0 }, stoneRadius: 40, phases: [{ kind: "emit", frames: 60, radius: 200 }, { kind: "return", frames: 40 }] };
    expect(ringEnd(base)).toBe(100);
    expect(ringEnd({ ...base, speed: 1.25 })).toBe(80);
    const w = phaseWindows({ ...base, speed: 2 });
    expect(w.map((x) => x.f1 - x.f0)).toEqual([30, 20]);
  });
});

describe("kind 6 inside a shot: the focus pull", () => {
  test("moves the focus in dioptres from one plane to another, holding outside its window", () => {
    const f = focusPull(1.15, 0.7, 100, 36);
    expect(f(90)).toBe(1.15);
    expect(f(118)).toBeCloseTo((1.15 + 0.7) / 2, 6);
    expect(f(200)).toBeCloseTo(0.7, 6);
  });
});
