// Engine tests (run with `npm run test:engine`, which is `bun test ./shared/pebble`).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BotEngine } from "./bloub/engine";
import { EXPRESSION_BY_ID } from "./bloub/expressions";
import { decalageDesYeux } from "./bloub/eyefit";
import { liveliness } from "./bloub/face";
import { SHAPES } from "./bloub/skins";
import { GALET, STATIC_AT, createPebbleEngine, staticTime, staticView } from "./character";
import { POSES, type PoseId } from "./companionState";

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "idle-frame-t1.json"), "utf8"));

describe("the copied engine", () => {
  test("reproduces Pebble's idle frame at 1.0 s (the reference SVG's frame) exactly", () => {
    expect(createPebbleEngine("idle").sample(1.0)).toEqual(fixture);
    // ...also when set up the way Avatar.vue and the research sandbox did it
    const app = new BotEngine(65, "idle", GALET);
    app.setExpression(EXPRESSION_BY_ID.get("neutre")!, 0);
    expect(app.sample(1.0)).toEqual(fixture);
  });

  test("keeps only the cercle and galet shapes", () => {
    expect(SHAPES.map((s) => s.id)).toEqual(["cercle", "galet"]);
  });

  test("the eye offset needs the GALET array itself, not a copy", () => {
    const own = decalageDesYeux(GALET, "idle", "neutre");
    expect(Math.hypot(own.x, own.y)).toBeGreaterThan(0);
    expect(decalageDesYeux([...GALET], "idle", "neutre")).toEqual({ x: 0, y: 0 });
  });
});

describe("sample(1.0)", () => {
  test("is stable: re-sampling, sampling out of order and fresh engines all agree", () => {
    const e = createPebbleEngine("idle");
    const first = JSON.stringify(e.sample(STATIC_AT));
    for (const t of [12.3, 0, 900, 0.5, 1.4, 3, 1.0]) e.sample(t);
    expect(JSON.stringify(e.sample(STATIC_AT))).toBe(first);
    for (let i = 0; i < 5; i++) expect(JSON.stringify(createPebbleEngine("idle").sample(STATIC_AT))).toBe(first);
  });

  test("has the eyes open, before the first blink", () => {
    expect(liveliness(STATIC_AT).lid).toBe(1);
    const firstClosing = Array.from({ length: 2000 }, (_, i) => i / 1000).find((t) => liveliness(t).lid < 1);
    expect(firstClosing).toBeGreaterThan(1.39);
    expect(firstClosing).toBeLessThan(1.41);
    for (const eye of fixture.eyes) {
      // matrix(a,b,c,d,e,f): the blink squashes b and d; at 1.0 s the outer eye's d is the open value
      expect(Number(String(eye.matrix).split(/[(,)]/)[4])).toBeGreaterThan(0.8);
    }
  });

  test("every pose has a static frame with open eyes, after its morphs", () => {
    for (const pose of Object.keys(POSES) as PoseId[]) {
      const t = staticTime(pose);
      expect(liveliness(t).lid).toBeGreaterThanOrEqual(0.99);
      const v = staticView(pose);
      expect(v.still).toBe(true);
      expect(v.frame.bodyPath.length).toBeGreaterThan(100);
      expect(JSON.stringify(staticView(pose))).toBe(JSON.stringify(v));
    }
  });
});
