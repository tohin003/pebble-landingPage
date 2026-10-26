// Light (grades, the LUT) and type (reading time, the cascade's swaps, the scale per aspect).
import { describe, expect, test } from "bun:test";
import { GRADES, checkLightCues, gradeAt, gradeColor, gradeLuminance, hexToRgb, type GradeName } from "../light/grades";
import { FILM_LOOK, filmCube, filmLook, maxLookShift } from "../light/lut";
import { leakEnvelope } from "../light/LightLeak";
import { earliestExit, readingLoad, requiredHoldS, wordCount } from "../type/reading";
import { cascadeSchedule, checkCascade, swapLook } from "../type/Cascade";
import { safeMarginPx, typeSizePx } from "../type/scale";
import { COLOR, TRANSITION } from "../tokens";

describe("grades", () => {
  test("a light change is continuous: no frame-to-frame jump bigger than a smooth ramp allows", () => {
    const cues = [{ at: 100, to: "warm" as const, frames: 60 }, { at: 300, to: "dusk" as const, frames: 60 }];
    let prev = gradeLuminance(gradeAt(0, "morning", cues));
    for (let f = 1; f < 420; f++) {
      const l = gradeLuminance(gradeAt(f, "morning", cues));
      expect(Math.abs(l - prev)).toBeLessThan(0.01);
      prev = l;
    }
    expect(checkLightCues(cues, 60)).toEqual([]);
    expect(checkLightCues([{ at: 0, to: "day", frames: 10 }], 60).length).toBe(1);
  });

  test("grades stay subtle on the real UI: the page, the panel, the ink and the accent keep their character", () => {
    for (const name of Object.keys(GRADES) as GradeName[]) {
      if (name === "dusk" || name === "night") continue; // the passage greys: judged by eye, by the lead
      for (const hex of [COLOR.page, COLOR.fill, COLOR.ink, COLOR.accent]) {
        const a = hexToRgb(hex);
        const b = gradeColor(a, GRADES[name], 0.5);
        for (let i = 0; i < 3; i++) expect(Math.abs(b[i]! - a[i]!)).toBeLessThan(0.08);
      }
    }
  });

  test("no light grade clips the page to white", () => {
    for (const name of ["morning", "warm", "day", "evening", "page"] as GradeName[]) expect(GRADES[name].brightness).toBeLessThanOrEqual(1);
  });
});

describe("the LUT", () => {
  test("a 33³ .cube, red fastest, values in range", () => {
    const text = filmCube(33);
    const rows = text.trim().split("\n").filter((l) => /^[0-9.]+ [0-9.]+ [0-9.]+$/.test(l));
    expect(rows.length).toBe(33 ** 3);
    expect(text).toContain("LUT_3D_SIZE 33");
    for (const r of rows.slice(0, 50)) for (const v of r.split(" ").map(Number)) expect(v >= 0 && v <= 1).toBe(true);
  });
  test("it is subtle: the brand's colours move by under 4 % per channel, white stays white", () => {
    expect(maxLookShift([COLOR.page, COLOR.fill, COLOR.accent, COLOR.pebble, "#FFFFFF"].map(hexToRgb))).toBeLessThan(0.04);
    expect(filmLook([1, 1, 1], FILM_LOOK).every((v) => v > 0.97)).toBe(true);
    const black = filmLook([0, 0, 0]);
    expect(black[1]).toBeGreaterThan(black[0]); // lifted toward the shade green, not grey
  });
});

describe("light leaks", () => {
  test("rise and fall inside their window, never a step", () => {
    const t = { at: 100, frames: 54 };
    expect(leakEnvelope(99, t)).toBe(0);
    expect(leakEnvelope(154, t)).toBe(0);
    let prev = 0;
    for (let f = 100; f <= 154; f++) {
      const e = leakEnvelope(f, t);
      expect(Math.abs(e - prev)).toBeLessThan(0.12);
      prev = e;
    }
  });
});

describe("reading", () => {
  test("words, holds, key lines, the honest line", () => {
    expect(wordCount("Memory you control · Remember that …")).toBe(5);
    expect(requiredHoldS(1)).toBeCloseTo(50 / 60, 6);
    expect(requiredHoldS(4)).toBeCloseTo(1.7, 6);
    expect(requiredHoldS(3, { key: true })).toBe(2);
    expect(requiredHoldS(27)).toBeCloseTo(8.6, 6);
    expect(requiredHoldS(27, { honest: true })).toBe(9);
    expect(requiredHoldS(5, { honest: true })).toBe(9);
    expect(earliestExit(100, "AgentGuard, built in.", 60, { key: true })).toBe(220);
    expect(readingLoad({ id: "s", from: 0, to: 120 }, [{ id: "a", text: "one two three", from: 0, to: 120 }], 60)).toBeCloseTo(1.5, 6);
  });
});

describe("the cascade (kind 5)", () => {
  const items = [{ text: "Remember that …", holdS: 1.1 }, { text: "Six kinds, six switches", holdS: 1.05 }, { text: "Forget this memory", holdS: 1.05 }];
  test("one stage, no gap: each item swaps in as the last swaps out, 8 frames each", () => {
    const s = cascadeSchedule(50, items, 60);
    for (let i = 1; i < s.length; i++) expect(s[i]!.inStart).toBe(s[i - 1]!.outEnd);
    for (const w of s) {
      expect(w.inEnd - w.inStart).toBe(TRANSITION.swap.inFrames);
      expect(w.outEnd - w.outStart).toBe(TRANSITION.swap.outFrames);
    }
    expect(checkCascade(items, s, 60)).toEqual([]);
  });
  test("with beats, each swap lands 2–3 frames before one", () => {
    const beats = Array.from({ length: 40 }, (_, k) => 30 + k * 30);
    const s = cascadeSchedule(50, items, 60, beats);
    for (const w of s) {
      const next = beats.find((b) => b >= w.inEnd)!;
      expect(next - w.inEnd).toBeGreaterThanOrEqual(2);
      expect(next - w.inEnd).toBeLessThanOrEqual(3);
    }
  });
  test("a long item is refused", () => {
    expect(checkCascade([{ text: "Connectors that ask you every time" }], cascadeSchedule(0, [{ text: "Connectors that ask you every time" }], 60), 60).length).toBeGreaterThan(0);
  });
  test("the swap blurs out to 8 px and back from 8 px", () => {
    const [w] = cascadeSchedule(0, items, 60);
    expect(swapLook(w!, w!.inStart, false)!.blur).toBeCloseTo(8, 6);
    expect(swapLook(w!, w!.inEnd, false)).toEqual({ opacity: 1, blur: 0 });
    expect(swapLook(w!, w!.outEnd - 1e-6, false)!.opacity).toBeLessThan(0.01);
  });
});

describe("the type scale", () => {
  test("sizes per aspect at 1080, and halved in a half-size proxy", () => {
    expect(typeSizePx("expressive", 1920, 1080, 0)).toBe(72);
    expect(typeSizePx("expressive", 1080, 1080, 1)).toBe(84);
    expect(typeSizePx("functional", 1080, 1920, 1)).toBe(60);
    expect(typeSizePx("expressive", 960, 540, 1)).toBe(48);
    expect(safeMarginPx(1920, 1080)).toBe(60);
  });
});
