// The kept 2.0.0 takes in the film (31 Oct): their manifests pass the time-honesty validator (CR-12), and the reel's
// uses of them never show what the film must not: RS13-03's workspace or palette once Pebble's windows have left the
// recording, or RSW-01 before its ask card is in place (where the column shows the steps' timings).
import { describe, expect, test } from "bun:test";
import { REAL_TAKES, REAL_TAKE_SOURCES, RSW_01_FIRST, STEALTH_GONE_FROM, checkTakeManifest, checkTakeUse, sourceFrameAt, takeFramePath } from "../setpieces/take";
import { demoPlans } from "../setpieces/demo/plans";

const ASPECTS = ["16:9", "1:1", "9:16"] as const;

describe("the real 2.0.0 takes", () => {
  test("every manifest passes the conform validator, with a source and a frame path", () => {
    for (const m of REAL_TAKES) {
      expect(checkTakeManifest(m)).toEqual([]);
      expect(m.placeholder).toBe(false);
      expect(REAL_TAKE_SOURCES[m.id]).toBeDefined();
      expect(takeFramePath(m, 0)).toBe(`ui-frames/real-takes/${m.id}/00001.jpg`);
    }
  });

  test("the canary: an event moved by two frames off its clock is refused", () => {
    const m = REAL_TAKES[0]!;
    const moved = { ...m, events: { ...m.events, enter: m.events.enter! + 2 } };
    expect(checkTakeManifest(moved).some((x) => x.includes('event "enter"'))).toBe(true);
  });

  test("the reel shows RS13-03's palette only before Pebble leaves the recording, and RSW-01 only from its card", () => {
    let seen = 0;
    for (const a of ASPECTS) {
      for (const e of demoPlans(a)) {
        for (const s of e.plan.shots) {
          for (const pl of s.planes) {
            if (pl.content.kind !== "take" || !pl.content.use.manifest.pattern) continue;
            const u = pl.content.use;
            expect(checkTakeUse(u, e.plan.fps)).toEqual([]);
            const out = e.plan.seams.find((x) => x.out === s.id);
            // a rack's outgoing shot shows until its incoming one is opaque, at 64 % of it (rackLook)
            const lastShown = Math.min(out && out.frames > 0 ? out.at + Math.floor(out.frames * 0.64) : s.to - 1, u.until - 1);
            const first = Math.max(s.from, pl.from ?? s.from, u.at);
            if (u.manifest.id === "RS13-03" && (pl.content.view === "palette" || pl.content.view === "workspace")) {
              expect(sourceFrameAt(lastShown, u.at, e.plan.fps, u.manifest, u.inPoint)).toBeLessThan(STEALTH_GONE_FROM);
              seen++;
            }
            if (u.manifest.id === "RSW-01") {
              expect(sourceFrameAt(first, u.at, e.plan.fps, u.manifest, u.inPoint)).toBeGreaterThanOrEqual(RSW_01_FIRST);
              seen++;
            }
          }
        }
      }
    }
    expect(seen).toBe(6);
  });
});
