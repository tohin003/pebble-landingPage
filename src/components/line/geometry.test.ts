// The pebble's path geometry. Run: bun test ./src/components/line
import { describe, expect, test } from "bun:test";
import { buildPath, drawnLength, margins, planWaypoints, type Anchor } from "./geometry";

const floor = (top: number): Anchor => ({ kind: "floor", left: 720, top, width: 1, height: 0 });
const cross = (top: number, padTop = 164): Anchor => ({ kind: "cross", left: 24, top, width: 1392, height: 600, padTop });

describe("planWaypoints", () => {
  test("no floor, no line", () => {
    expect(planWaypoints([cross(900)], 1440).pts).toHaveLength(0);
  });

  test("one floor only (the 404, /credits): a short resting line that fades at both ends", () => {
    const plan = planWaypoints([floor(900)], 1440);
    expect(plan.pts).toHaveLength(4);
    expect(plan.pts.every((p) => Math.abs(p[1] - 900) < 2)).toBe(true);
    expect(plan.fadeIn!.x1).toBeLessThan(720);
    expect(plan.fadeOut!.x0).toBeGreaterThan(720);
  });

  test("starts under the hero pebble and ends under the footer pebble", () => {
    const plan = planWaypoints([floor(300), cross(1200), cross(2400), floor(4000)], 1440);
    const first = plan.pts[0]!;
    const last = plan.pts[plan.pts.length - 1]!;
    expect(Math.abs(first[1] - 301)).toBeLessThan(2);
    expect(Math.abs(last[1] - 4000)).toBeLessThan(2);
    expect(plan.fadeIn).not.toBeNull();
    expect(plan.fadeOut).not.toBeNull();
  });

  test("each cross sweeps to the other margin", () => {
    const { xL, xR } = margins(1440);
    const plan = planWaypoints([floor(300), cross(1200), floor(3000)], 1440);
    // after the hero the line runs down the right margin, after the cross down the left one
    expect(plan.pts.some((p) => p[0] === xR)).toBe(true);
    expect(plan.pts.some((p) => p[0] === xL)).toBe(true);
    // the end comes in from the left, so it fades out to the right
    expect(plan.fadeOut!.x1).toBeGreaterThan(plan.fadeOut!.x0);
  });

  test("a cross too close to the previous feature is skipped", () => {
    const plan = planWaypoints([floor(300), cross(330, 0), floor(3000)], 1440);
    const { xL } = margins(1440);
    expect(plan.pts.some((p) => p[0] === xL)).toBe(false);
  });

  test("phones keep floors and stops only, and run off the screen's edge", () => {
    const stops: Anchor[] = [0, 1, 2, 3].map((i) => ({ kind: "stop", left: 40 + i * 90, top: 1500, width: 20, height: 18 }));
    const plan = planWaypoints([floor(250), cross(900), ...stops, { kind: "arc", left: 20, top: 2200, width: 350, height: 200 }, floor(3500)], 390);
    // every stop centre is on the path
    for (const s of stops) expect(plan.pts.some((p) => p[0] === s.left + s.width / 2 && p[1] === s.top + s.height / 2)).toBe(true);
    // no arch on phones: no point near the arc's top
    expect(plan.pts.some((p) => p[1] > 2100 && p[1] < 2300 && p[0] > 60 && p[0] < 330)).toBe(false);
    // the margins are off the screen
    expect(margins(390).xL).toBeLessThan(0);
  });

  test("an arc anchor's box is the arch's box by default", () => {
    const arc: Anchor = { kind: "arc", left: 488, top: 2000, width: 464, height: 232 }; // R = 232
    const plan = planWaypoints([floor(300), arc, floor(4000)], 1440);
    const top = plan.pts.reduce((best, p) => (Math.abs(p[0] - 720) < 20 && p[1] < best ? p[1] : best), Infinity);
    expect(Math.abs(top - 2000)).toBeLessThan(15);
  });

  test("an arc rises over its centre", () => {
    const arc: Anchor = { kind: "arc", left: 340, top: 2000, width: 760, height: 306, radius: 232, arcCy: 298 };
    const plan = planWaypoints([floor(300), arc, floor(4000)], 1440);
    const cx = 340 + 380;
    const top = plan.pts.reduce((best, p) => (Math.abs(p[0] - cx) < 20 && p[1] < best ? p[1] : best), Infinity);
    expect(Math.abs(top - (2000 + 298 - 232))).toBeLessThan(15);
  });
});

describe("buildPath", () => {
  const anchors = [floor(300), cross(1200), { kind: "gate", left: 100, top: 1900, width: 1, height: 1 } as Anchor, cross(2600), floor(4200)];

  test("pieces: a fade-in, the body split at the gate, a fade-out", () => {
    const geometry = buildPath(anchors, { width: 1440, height: 4400, wobble: true })!;
    expect(geometry).not.toBeNull();
    expect(geometry.pieces[0]!.fade?.kind).toBe("in");
    expect(geometry.pieces[geometry.pieces.length - 1]!.fade?.kind).toBe("out");
    expect(geometry.gates).toHaveLength(1);
    expect(geometry.pieces.length).toBeGreaterThanOrEqual(4);
    for (const piece of geometry.pieces) expect(piece.d.startsWith("M")).toBe(true);
  });

  test("no wobble when motion is off: the same route, a smoother line", () => {
    const wobbly = buildPath(anchors, { width: 1440, height: 4400, wobble: true })!;
    const still = buildPath(anchors, { width: 1440, height: 4400, wobble: false })!;
    expect(Math.abs(wobbly.total - still.total)).toBeLessThan(1);
    expect(wobbly.pieces[1]!.d).not.toBe(still.pieces[1]!.d);
  });

  test("the draw-on grows with the reader and covers everything at the bottom", () => {
    const geometry = buildPath(anchors, { width: 1440, height: 4400, wobble: false })!;
    const a = drawnLength(geometry, 900);
    const b = drawnLength(geometry, 2500);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(drawnLength(geometry, 99999)).toBe(geometry.total);
  });
});
