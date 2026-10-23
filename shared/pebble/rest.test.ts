// The site's resting gaze (docs/DESIGN.md §9): straight ahead at the visitor instead of the engine's own glance up and
// to the right; the static frame and the live pebble agree, and a settled pebble turns back to it before it holds.
import { describe, expect, test } from "bun:test";
import type { BotFrame } from "./bloub/engine";
import { HOLD_SECONDS, staticView } from "./character";
import { LivePebble } from "./live";

const FPS = 30;
const CENTRE = { x: 0, y: 0 };
const numbers = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** Mean eye centre (the translation of each eye's matrix), in viewBox units. */
function eyes(frame: BotFrame) {
  const centres = frame.eyes.map((e) => numbers(e.matrix)).map((m) => ({ x: m[4]!, y: m[5]! }));
  return { x: centres.reduce((s, c) => s + c.x, 0) / centres.length, y: centres.reduce((s, c) => s + c.y, 0) / centres.length };
}

describe("resting gaze", () => {
  test("without a rest the static frame is unchanged; with the centre the eyes come back toward the middle", () => {
    expect(JSON.stringify(staticView("idle", null))).toBe(JSON.stringify(staticView("idle")));
    const own = eyes(staticView("idle").frame);
    const centred = eyes(staticView("idle", CENTRE).frame);
    // the engine's own resting gaze glances up and to the right (x > 0, y < 0 in the viewBox)
    expect(own.x).toBeGreaterThan(centred.x);
    expect(Math.abs(centred.x)).toBeLessThan(Math.abs(own.x));
  });

  test("the live pebble starts on the same frame as the static one, so the swap moves nothing", () => {
    for (const pose of ["idle", "happy", "review", "testing"] as const) {
      const p = new LivePebble(pose, CENTRE);
      const s = staticView(pose, CENTRE);
      expect(JSON.stringify(p.still())).toBe(JSON.stringify({ frame: s.frame, motion: s.motion, still: true }));
    }
  });

  test("letting go of the gaze returns to rest, not to the pose's own direction", () => {
    const p = new LivePebble("idle", CENTRE);
    expect(p.setGaze({ x: 1, y: 0 })).toBe(true);
    expect(p.setGaze(null)).toBe(true);
    expect(p.setGaze(CENTRE)).toBe(false); // already resting at the centre
  });

  test(`after ${HOLD_SECONDS} s without input it turns back to rest, then holds`, () => {
    const p = new LivePebble("idle", CENTRE);
    p.setGaze({ x: 0.75, y: -0.5 }); // the pointer was up and to the right
    let relaxedAt = -1;
    let heldAt = -1;
    for (let f = 1; f < 30 * FPS; f++) {
      p.advance(1 / FPS);
      if (p.shouldHold()) {
        if (p.relax()) relaxedAt = f / FPS;
        else {
          heldAt = f / FPS;
          break;
        }
      }
    }
    expect(relaxedAt).toBeGreaterThanOrEqual(HOLD_SECONDS);
    expect(heldAt).toBeGreaterThan(relaxedAt);
    expect(heldAt - relaxedAt).toBeLessThan(3);
    const held = eyes(p.view().frame);
    const rest = eyes(staticView("idle", CENTRE).frame);
    expect(Math.abs(held.x - rest.x)).toBeLessThan(2.5);
  });

  test("without a resting gaze, relax() does nothing (the dial pebble and the films are unchanged)", () => {
    const p = new LivePebble("idle");
    p.setGaze({ x: 0.5, y: 0 });
    expect(p.relax()).toBe(false);
  });
});
