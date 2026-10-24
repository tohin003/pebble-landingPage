// The site's live clock: continuity with the static frame, the hold rule, and the blink-schedule restart.
import { describe, expect, test } from "bun:test";
import type { BotFrame } from "./bloub/engine";
import { liveliness } from "./bloub/face";
import { HOLD_SECONDS, staticView } from "./character";
import type { Gaze } from "./gaze";
import { LivePebble, MAX_STEP, RESTART_BY } from "./live";

const FPS = 30;
const numbers = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** Largest movement between two frames, in viewBox units: body outline points and eye centres. */
function jump(a: BotFrame, b: BotFrame) {
  const pa = numbers(a.bodyPath);
  const pb = numbers(b.bodyPath);
  let body = 0;
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) body = Math.max(body, Math.abs(pa[i]! - pb[i]!));
  let eye = 0;
  for (let i = 0; i < Math.min(a.eyes.length, b.eyes.length); i++) {
    const ma = numbers(a.eyes[i]!.matrix);
    const mb = numbers(b.eyes[i]!.matrix);
    eye = Math.max(eye, Math.hypot(ma[4]! - mb[4]!, ma[5]! - mb[5]!));
  }
  return { body, eye };
}

describe("LivePebble", () => {
  test("its first frame is the static frame, so hydration does not move the pebble", () => {
    for (const pose of ["idle", "sleepy", "review", "testing"] as const) {
      const p = new LivePebble(pose);
      expect(JSON.stringify(p.still())).toBe(JSON.stringify({ frame: staticView(pose).frame, motion: staticView(pose).motion, still: true }));
    }
    const p = new LivePebble("idle");
    expect(JSON.stringify(p.view().frame)).toBe(JSON.stringify(staticView("idle").frame));
    expect(p.view().motion.transform).toBe(staticView("idle").motion.transform);
  });

  test(`settles after ${HOLD_SECONDS} s without input, on an open-eyed calm frame, and wakes on input`, () => {
    const p = new LivePebble("idle");
    let held = -1;
    for (let f = 1; f < 20 * FPS; f++) {
      p.advance(1 / FPS);
      if (p.shouldHold()) {
        held = f / FPS;
        break;
      }
    }
    expect(held).toBeGreaterThanOrEqual(HOLD_SECONDS);
    expect(held).toBeLessThan(HOLD_SECONDS + 3);
    expect(liveliness(p.time).lid).toBe(1);
    p.setGaze({ x: 0.5, y: 0 });
    expect(p.shouldHold()).toBe(false);
    expect(p.setGaze({ x: 0.5, y: 0 })).toBe(false); // the same quantised gaze is not a change
  });

  test("work poses never settle; the clock step is clamped", () => {
    const p = new LivePebble("testing");
    for (let f = 0; f < 15 * FPS; f++) p.advance(1 / FPS);
    expect(p.shouldHold()).toBe(false);
    const before = p.time;
    p.advance(5);
    expect(p.time - before).toBeCloseTo(MAX_STEP, 9);
  });

  test("the blink schedule restarts before 840 s, and blinks never stop", () => {
    for (const scenario of ["still pointer", "moving pointer"] as const) {
      const p = new LivePebble("idle");
      const gazes: Gaze[] = [{ x: 0.5, y: -0.25 }, { x: -0.25, y: 0.5 }, { x: 0.875, y: 0 }];
      let maxTime = 0;
      let lastBlink = 0;
      let longestGap = 0;
      let open = true;
      const seconds = 3000;
      for (let f = 1; f <= seconds * FPS; f++) {
        if (scenario === "moving pointer" && f % 45 === 0) p.setGaze(gazes[(f / 45) % 3]!);
        p.advance(1 / FPS);
        maxTime = Math.max(maxTime, p.time);
        const nowOpen = liveliness(p.time).lid >= 0.999;
        if (open && !nowOpen) {
          longestGap = Math.max(longestGap, f / FPS - lastBlink);
          lastBlink = f / FPS;
        }
        open = nowOpen;
      }
      longestGap = Math.max(longestGap, seconds - lastBlink);
      expect(maxTime).toBeLessThan(840);
      expect(maxTime).toBeLessThan(RESTART_BY + MAX_STEP);
      expect(p.restarts).toBeGreaterThanOrEqual(3);
      expect(longestGap).toBeLessThan(5); // the schedule's gaps are 1.9–4.6 s; without restarts it ends at ~902 s
    }
  });

  // Its own timeout: it plays two restarts for each of two gazes, about 800 s of engine time each at 30 fps (about
  // 100,000 frames in all). That takes about 3.5 s on a quiet machine and about 7 s while a render shares the CPU,
  // past bun's 5 s default. 30 s still stops a real hang.
  test("a restart moves the pebble by about a pixel at most", () => {
    for (const gaze of [null, { x: 0.5, y: -0.25 }]) {
      const p = new LivePebble("idle");
      if (gaze) p.setGaze(gaze);
      let worst = { body: 0, eye: 0 };
      let previous = p.view().frame;
      let restarts = 0;
      while (restarts < 2) {
        p.advance(1 / FPS);
        const frame = p.view().frame;
        if (p.restarts > restarts) {
          restarts = p.restarts;
          const j = jump(previous, frame);
          worst = { body: Math.max(worst.body, j.body), eye: Math.max(worst.eye, j.eye) };
          expect(p.time).toBeLessThan(100);
        }
        previous = frame;
      }
      // viewBox units; the hero draws the 220-unit box at 240 px, so 1 unit is about 1.1 px
      expect(worst.body).toBeLessThan(1);
      expect(worst.eye).toBeLessThan(1.5);
    }
  }, 30_000);
});
