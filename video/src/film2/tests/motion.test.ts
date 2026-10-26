// The motion foundation's pure parts: eases, the velocity camera, momentum across a cut, blur rules.
// Run: cd <repo> && bun test video/src/film2   (Bun, never node --test)
import { describe, expect, test } from "bun:test";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { CUSTOM_EASES, E_ARRIVE, E_LEAVE, E_MATCH, E_MOVE, CURVE_NAMES, curve, glideDistance, glideVelocity } from "../motion/ease";
import { VelocityCamera, arriveWithMomentum, maxScreenSpeed, screenVelocity, worldToFrame } from "../motion/camera";
import { blurForTravel, blurIsEnough, sigmaForTravel } from "../motion/blur";
import { momentumCut } from "../transitions/momentum";
import { pullBack, pushIn, travelTo } from "../camera/moves";
import { CAMERA, accel60, speed60 } from "../tokens";

gsap.registerPlugin(CustomEase);

describe("eases", () => {
  test("the film's beziers start and end at the speeds CRAFT §3 gives", () => {
    expect(E_ARRIVE.v0).toBeCloseTo(6.25, 6);
    expect(E_ARRIVE.v1).toBe(0);
    expect(E_LEAVE.v0).toBe(0);
    expect(E_LEAVE.v1).toBeCloseTo(4.25, 6);
    expect(E_MOVE.v0).toBe(0);
    expect(E_MOVE.v1).toBe(0);
    expect(E_ARRIVE.slope(0)).toBeCloseTo(6.25, 2);
    expect(E_LEAVE.slope(1)).toBeCloseTo(4.25, 2);
    expect(E_MOVE.slope(0.5)).toBeCloseTo(1.82, 1); // its peak, as CRAFT §3 measures
    expect(E_MATCH.slope(0.5)).toBeGreaterThan(6); // the text match cut's speed peak is at its middle
  });

  test("every curve runs 0 → 1, monotonic, and its slope is the derivative", () => {
    for (const name of CURVE_NAMES) {
      const c = curve(name);
      expect(c(0)).toBe(0);
      expect(c(1)).toBe(1);
      let prev = 0;
      for (let i = 1; i <= 200; i++) {
        const t = i / 200;
        const v = c(t);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
        if (i < 200 && i > 1) {
          const num = (c(t + 1e-4) - c(t - 1e-4)) / 2e-4;
          expect(Math.abs(c.slope(t) - num)).toBeLessThan(0.02 * Math.max(1, Math.abs(num)));
        }
      }
    }
  });

  test("the GSAP names match GSAP 3.15's own eases, and the film's CustomEases match the beziers", () => {
    for (const name of ["power1.in", "power2.out", "power3.inOut", "power4.in", "power4.out", "expo.out", "expo.in", "sine.inOut"]) {
      const g = gsap.parseEase(name);
      for (let i = 0; i <= 20; i++) expect(curve(name)(i / 20)).toBeCloseTo(g(i / 20), 6);
    }
    for (const [name, pts] of Object.entries(CUSTOM_EASES)) {
      const ce = CustomEase.create(`test-${name}`, pts);
      for (let i = 0; i <= 20; i++) expect(Math.abs(curve(name)(i / 20) - ce(i / 20))).toBeLessThan(0.004);
    }
  });

  test("the glide coasts (v0 − v_d)·τ and settles at its drift", () => {
    expect(glideVelocity(0, 10, 1, 20)).toBe(10);
    expect(glideVelocity(200, 10, 1, 20)).toBeCloseTo(1, 3);
    expect(glideDistance(1e6, 10, 0, 20)).toBeCloseTo(200, 6);
  });
});

describe("the velocity camera", () => {
  const W = 1920;
  const H = 1080;

  test("Hermite and glide segments hand speed on without a jump (C1)", () => {
    const cam = new VelocityCamera({ x: 0, y: 0, zoom: 1 }, { x: 2 });
    cam.hermite(60, { x: 300, y: 40, zoom: 1.3 }, { x: 3, lz: 0.001 });
    cam.glide(120, 20, { x: 0.5 });
    cam.hermite(180, { x: 700, y: 0, zoom: 1.1 });
    for (const j of [60, 120]) {
      const a = cam.sample(j - 1e-6).vel;
      const b = cam.sample(j + 1e-6).vel;
      expect(Math.abs(a.x - b.x)).toBeLessThan(1e-3);
      expect(Math.abs(a.lz - b.lz)).toBeLessThan(1e-5);
    }
    // its reported velocity is the derivative of its position
    for (const f of [10, 59, 75, 140]) {
      const num = (cam.sample(f + 0.01).state.x - cam.sample(f - 0.01).state.x) / 0.02;
      expect(cam.sample(f).vel.x).toBeCloseTo(num, 3);
    }
  });

  test("screen velocity is the derivative of where a world point lands", () => {
    const cam = new VelocityCamera({ x: 500, y: 300, zoom: 1.2 }, { x: 1.5, y: -0.4, lz: 0.004 });
    cam.glide(100, 30);
    const p = { x: 400, y: 250 };
    const f = 37;
    const world = { x: 500 + (p.x - W / 2) / 1, y: 0 }; // any fixed world point
    const at = (t: number) => worldToFrame(world, cam.pose(t), W, H);
    const s = cam.sample(f);
    const fp = at(f);
    const v = screenVelocity(s, fp, W, H);
    const num = { x: (at(f + 0.01).x - at(f - 0.01).x) / 0.02, y: (at(f + 0.01).y - at(f - 0.01).y) / 0.02 };
    expect(v.x).toBeCloseTo(num.x, 2);
    expect(v.y).toBeCloseTo(num.y, 2);
  });

  test("arriveWithMomentum leaves the cut at the outgoing screen speed and lands on its target", () => {
    for (const mode of ["arrive", "glide"] as const) {
      const target = { x: 1000, y: 800, zoom: 1.4 };
      const cam = arriveWithMomentum({ target, frames: 48, vScreen: { x: -28, y: 0 }, mode, tau: 18 });
      const v0 = screenVelocity(cam.sample(0), { x: W / 2, y: H / 2 }, W, H);
      expect(v0.x).toBeCloseTo(-28, 4);
      expect(v0.y).toBeCloseTo(0, 6);
      const end = cam.pose(48);
      expect(end.x).toBeCloseTo(target.x, 3);
      expect(end.zoom).toBeCloseTo(target.zoom, 6);
    }
  });

  test("momentumCut: E-leave out, matched speed in, within the 12–24-frame window", () => {
    const out = new VelocityCamera({ x: 0, y: 0, zoom: 1 });
    out.glide(100, 20);
    const seam = momentumCut({ out, cutFrame: 120, dir: { x: -1, y: 0 }, dPx: 120, leaveFrames: 18, target: { x: 5000, y: 0, zoom: 1 }, inFrames: 50, frameW: W, frameH: H, fps: 60 });
    expect(Math.hypot(seam.vOut.x - seam.vIn.x, seam.vOut.y - seam.vIn.y)).toBeLessThan(1e-6);
    expect(seam.vOut.x).toBeCloseTo((-120 / 18) * 4.25, 1); // E-leave ends at 4.25 × its mean speed
    expect(() => momentumCut({ out: new VelocityCamera({ x: 0, y: 0, zoom: 1 }), cutFrame: 50, dir: { x: 1, y: 0 }, dPx: 100, leaveFrames: 6, target: { x: 0, y: 0, zoom: 1 }, inFrames: 30, frameW: W, frameH: H, fps: 60 })).toThrow();
  });

  test("moves: a push-in lands on its factor, a pull-back never stops dead, travelTo glides onto its framing", () => {
    const a = pushIn(new VelocityCamera({ x: 0, y: 0, zoom: 1 }), 150, 1.1);
    expect(a.pose(150).zoom).toBeCloseTo(1.1, 6);
    const b = pullBack(new VelocityCamera({ x: 0, y: 0, zoom: 1.4 }), 120, 0.6, 160, 60);
    expect(Math.abs(b.sample(120).vel.lz)).toBeGreaterThan(0); // still moving into its glide
    const c = travelTo(new VelocityCamera({ x: 0, y: 0, zoom: 1 }), 60, { x: 900, y: 200, zoom: 1.2 }, 110, 60);
    const end = c.pose(110);
    expect(end.x).toBeCloseTo(900, 0);
    expect(end.y).toBeCloseTo(200, 0);
    // arrives with momentum: moving at the hand-off, not at rest
    expect(maxScreenSpeed(c.sample(60), W, H, [{ x: W / 2, y: H / 2 }])).toBeGreaterThan(1);
  });
});

describe("blur", () => {
  test("σ = travel ÷ 7 above the reading speed, nothing at or below it", () => {
    expect(sigmaForTravel(70)).toBeCloseTo(10, 6);
    expect(blurForTravel(CAMERA.readMaxPxPerFrame, 60)).toBe(0);
    expect(blurForTravel(30, 60)).toBeCloseTo(30 / 7, 6);
    expect(blurIsEnough(0.8 * (30 / 7), 30, 60)).toBe(true);
    expect(blurIsEnough(0.5, 30, 60)).toBe(false);
  });
  test("60 fps numbers convert for a 30 fps master", () => {
    expect(speed60(4.6, 30)).toBeCloseTo(9.2, 6);
    expect(accel60(30, 30)).toBeCloseTo(120, 6);
  });
});
