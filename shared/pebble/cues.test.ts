// Cue replay (D5) and the "Pebble's own poses only" rule (D6). Run with `npm run test:engine`.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { liveliness } from "./bloub/face";
import { STATES } from "./bloub/states";
import { avatarMotion } from "./avatarMotion";
import { CATALOGUE_STATES, PEBBLE_ENGINE_STATES, applyPose, createPebbleEngine } from "./character";
import { POSES, visualFor, type PoseId } from "./companionState";
import { blinkFreeOffset, blinkStarts, checkCues, pebbleAt, replayAt, snapToBlink, type PebbleCue } from "./cues";
import { lookFor } from "./gaze";

const REPO = join(import.meta.dir, "..", "..");

// A busy 10 s timeline: pose changes closer together than a morph (the engine then freezes the blend it is in),
// the alert "!" and notify states, gaze cues between frames, and a cue exactly on a frame.
const BUSY: PebbleCue[] = [
  { at: 0.4, look: { x: 0.5, y: -0.25 } },
  { at: 0.9, pose: "hover" },
  { at: 1.05, pose: "tap" },
  { at: 1.2, look: { x: -1, y: 0.5 } },
  { at: 2.0, pose: "reading" },
  { at: 2.2, pose: "editing" },
  { at: 2.9, look: null },
  { at: 3.3, pose: "review" },
  { at: 5.5, pose: "testing" },
  { at: 6.0, look: { x: 0.25, y: 0.25 } },
  { at: 7.1, pose: "question" },
  { at: 8.2, pose: "happy" },
  { at: 9.0, pose: "idle" },
  { at: 9.5, look: { x: -0.5, y: -0.5 } },
];

describe("replaying cues on a fresh engine (the film path)", () => {
  test("equals live sampling over 300 frames at 30 fps", () => {
    const live = createPebbleEngine("idle");
    let pose: PoseId = "idle";
    let next = 0;
    let same = 0;
    for (let f = 0; f < 300; f++) {
      const t = f / 30;
      // live: apply each cue once, at its own time, as the clock passes it
      while (next < BUSY.length && BUSY[next]!.at <= t) {
        const c = BUSY[next++]!;
        if (c.pose && c.pose !== pose) {
          pose = c.pose;
          applyPose(live, pose, c.at);
        }
        if (c.look !== undefined) live.setLook(lookFor(c.look), c.at);
      }
      const liveView = JSON.stringify([live.sample(t), avatarMotion(pose, t, false)]);
      const replay = pebbleAt(BUSY, t);
      if (JSON.stringify([replay.frame, replay.motion]) === liveView) same++;
      expect(replay.pose).toBe(pose);
    }
    expect(same).toBe(300);
  });

  test("renders frames in any order", () => {
    const forward = Array.from({ length: 300 }, (_, f) => JSON.stringify(pebbleAt(BUSY, f / 30).frame));
    for (const f of [299, 0, 157, 31, 98, 250, 5]) expect(JSON.stringify(pebbleAt(BUSY, f / 30).frame)).toBe(forward[f]!);
  });

  test("ignores cues after t", () => {
    expect(replayAt(BUSY, 2.1).pose).toBe("reading");
    expect(replayAt(BUSY, 0).pose).toBe("idle");
  });
});

describe("D6: only Pebble's own poses", () => {
  test("every Pebble pose maps to one of the three engine states Pebble ships", () => {
    for (const pose of Object.keys(POSES)) {
      expect(PEBBLE_ENGINE_STATES as readonly string[]).toContain(visualFor(pose).engine);
      expect(CATALOGUE_STATES as readonly string[]).not.toContain(visualFor(pose).engine);
    }
    // the catalogue list covers every engine state that is not Pebble's
    const others = STATES.map((s) => s.id).filter((id) => !(PEBBLE_ENGINE_STATES as readonly string[]).includes(id));
    expect([...others].sort()).toEqual([...CATALOGUE_STATES].sort());
  });

  test("checkCues rejects catalogue states, unknown poses, aliases, stray keys and bad times", () => {
    expect(checkCues(BUSY)).toEqual([]);
    for (const state of CATALOGUE_STATES) {
      if (state === "thinking") continue; // also a Pebble pose (idle engine state + thought dots): allowed
      expect(checkCues([{ at: 1, pose: state }]).join()).toContain("D6");
    }
    expect(checkCues([{ at: 1, pose: "thinking" }])).toEqual([]);
    expect(checkCues([{ at: 1, pose: "smile" }]).join()).toContain("unknown pose");
    expect(checkCues([{ at: 1, pose: "success" }]).join()).toContain('write "happy"');
    expect(checkCues([{ at: 1, state: "wink" }]).join()).toContain('unknown key "state"');
    expect(checkCues([{ at: 2, pose: "idle" }, { at: 1, pose: "tap" }]).join()).toContain("not sorted");
    expect(checkCues([{ at: Number.NaN, pose: "idle" }]).join()).toContain("finite");
    expect(checkCues([{ at: 1, look: { x: 2, y: 0 } }]).join()).toContain("look");
    expect(checkCues([{ at: 1 }]).join()).toContain("needs a pose or a look");
    expect(checkCues("idle").join()).toContain("not an array");
  });

  test("every cue list in the repo (*.cues.ts) passes", async () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".cues.ts")) files.push(p);
      }
    };
    for (const root of ["shared", "src", "video/src"]) {
      try {
        walk(join(REPO, root));
      } catch {
        /* a missing folder holds no cue lists */
      }
    }
    // Convention: in a *.cues.ts file, every export whose name ends in "cues" (any case) is a cue list, or an object
    // whose values are cue lists. Other exports (hops, positions) are not cues and are skipped.
    let lists = 0;
    for (const file of files) {
      const mod = (await import(file)) as Record<string, unknown>;
      for (const [name, value] of Object.entries(mod)) {
        if (!/cues$/i.test(name)) continue;
        const named: [string, unknown][] = Array.isArray(value)
          ? [[name, value]]
          : value && typeof value === "object"
            ? Object.entries(value).map(([k, v]) => [`${name}.${k}`, v])
            : [[name, value]];
        for (const [label, list] of named) {
          lists++;
          expect(checkCues(list, `${relative(REPO, file)}:${label}`)).toEqual([]);
        }
      }
    }
    expect(files.length).toBeGreaterThan(0); // at least video/src/pebble/demo.cues.ts
    expect(lists).toBeGreaterThan(0);
  });

  test("no code drives the engine into a catalogue state directly", () => {
    const offenders: string[] = [];
    const pattern = new RegExp(`\\.(setState|reset)\\(\\s*["'](${CATALOGUE_STATES.join("|")})["']`);
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "bloub" || name.startsWith(".")) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|mjs|js)$/.test(name) && !name.endsWith(".test.ts") && pattern.test(readFileSync(p, "utf8"))) {
          offenders.push(relative(REPO, p));
        }
      }
    };
    for (const root of ["shared", "src", "video/src"]) {
      try {
        walk(join(REPO, root));
      } catch {
        /* missing folder */
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("authoring helpers", () => {
  test("blinkStarts finds the schedule (first blink at 1.4 s)", () => {
    const starts = blinkStarts(0, 30);
    expect(starts[0]).toBeCloseTo(1.4, 2);
    expect(starts.length).toBeGreaterThan(5);
  });

  test("snapToBlink lands on a shut eye, or leaves t alone", () => {
    const shut = snapToBlink(5.0);
    expect(liveliness(shut).lid).toBeLessThan(0.05);
    expect(Math.abs(shut - 5.0)).toBeLessThan(0.6);
    expect(snapToBlink(3.0, 0.2, 0.2)).toBe(3.0); // no blink between 2.8 and 3.2 s
  });

  test("blinkFreeOffset keeps blinks away from both ends of a loop", () => {
    for (const d of [6, 8, 10]) {
      const o = blinkFreeOffset(d);
      for (const b of blinkStarts(o - 1, o + d + 1)) {
        expect(b + 0.18 < o - 0.3 || b > o + 0.3).toBe(true);
        expect(b + 0.18 < o + d - 0.3 || b > o + d + 0.3).toBe(true);
      }
    }
  });
});
