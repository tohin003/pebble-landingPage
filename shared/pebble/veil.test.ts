// The Veil: Pebble 1.1.0's own stealthVeil.test.mjs cases (ported to bun), then the site's driving of the function:
// the frame-exact API, timelines with reversals, the live clock, and the numbers Avatar.vue's template draws.
import { describe, expect, test } from "bun:test";
import { ACTIVATE, FADE, GLASS_OPACITY, OFF, ON, RELEASE, moving, nextVeilId, shimmer, veil, type Veil } from "./stealthVeil";
import {
  LiveVeil,
  SHIMMER_FROM,
  VEIL_DARK,
  VEIL_FINE_PX,
  VEIL_LIGHT,
  veilAt,
  veilDraw,
  veilEnd,
  veilFrame,
  veilVisible,
  type VeilFrame,
  type VeilSwitch,
} from "./veil";

const FPS = 30;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const round = (v: Veil) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "number" ? +x.toFixed(9) : x]));
/** Two frames agree to 1e-9 (a live clock sums 1/30 s steps, a replay divides). */
const same = (a: VeilFrame, b: VeilFrame) =>
  JSON.stringify({ ...a, veil: round(a.veil), shine: a.shine && round(a.shine as unknown as Veil) }) ===
  JSON.stringify({ ...b, veil: round(b.veil), shine: b.shine && round(b.shine as unknown as Veil) });

describe("stealthVeil.ts: Pebble 1.1.0's cases (src/stealthVeil.test.mjs)", () => {
  test("the cast follows the preview's four steps and ends calm, cloaked and glassy", () => {
    expect(ACTIVATE).toBe(1.25);
    let v = veil(true, 0.1); // gather: squash, eyes closing, no colour yet
    expect(v.sy).toBeLessThan(1);
    expect(v.cloak).toBe(0);
    expect(v.eye).toBeLessThan(0.5);
    v = veil(true, 0.4); // cloak: wipe, hem, ping, eyes closed
    expect(v.cloak).toBeGreaterThan(0);
    expect(v.cloak).toBeLessThan(1);
    expect(v.hem).toBeGreaterThan(0);
    expect(v.ping).toBeGreaterThanOrEqual(0);
    expect(v.eye).toBe(0);
    v = veil(true, 0.9); // finale: glass arriving
    expect([v.cloak, v.hem, v.ping < 0, v.rim > 0.9, v.glass > 0]).toEqual([1, 0, true, true, true]);
    v = veil(true, ACTIVATE);
    expect(near(v.cloak, 1) && near(v.rim, 1) && near(v.glass, 1, 1e-3) && near(v.eye, 0.8) && near(v.sy, 1)).toBe(true);
    expect(moving(true, ACTIVATE)).toBe(false);
    expect(moving(true, 1.2)).toBe(true);
    expect(GLASS_OPACITY).toBe(0.7);
  });

  test("the release folds, lifts and hops back to the plain pebble in 0.65 s", () => {
    expect(RELEASE).toBe(0.65);
    let v = veil(false, 0.24, ON); // fold first: glass goes, colour still there
    expect(v.glass).toBeLessThan(0.2);
    expect(v.cloak).toBeGreaterThan(0.5);
    v = veil(false, 0.5, ON); // lift done, hop
    expect(near(v.cloak, 0)).toBe(true);
    expect(v.sy).toBeGreaterThan(1);
    v = veil(false, RELEASE, ON);
    expect({ ...v, sx: Math.round(v.sx * 1e6) / 1e6 }).toEqual({ ...OFF, sx: 1 });
  });

  test("reversing mid-cast starts from where the pebble is, so nothing jumps", () => {
    const mid = veil(true, 0.4);
    const back = veil(false, 0, mid);
    expect([back.cloak, back.rim, back.glass]).toEqual([mid.cloak, mid.rim, mid.glass]);
  });

  test("Reduce Motion is one 0.3 s cross-fade with no squash, wipe, ping or blink", () => {
    expect(FADE).toBe(0.3);
    for (const t of [0, 0.1, 0.2, 0.3, 0.5]) {
      const v = veil(true, t, OFF, true);
      expect([v.fade, v.sy, v.ping, v.hem]).toEqual([true, 1, -1, 0]);
    }
    expect(near(veil(true, FADE, OFF, true).cloak, 1)).toBe(true);
    expect(near(veil(false, FADE, ON, true).cloak, 0)).toBe(true);
    expect(moving(true, FADE, true)).toBe(false);
  });

  test("one 1.1 s shimmer every 6 s while on, and brightness changes stay at 0.25 Hz or slower", () => {
    expect(shimmer(-1)).toBeNull();
    expect(shimmer(0.55)!.opacity).toBeGreaterThan(0.99); // the shimmer peaks mid-band
    expect(shimmer(2)).toBeNull();
    expect(shimmer(6.5)!.x).toBeGreaterThan(0);
    const lit: boolean[] = [];
    for (let t = 0; t < 60; t += 0.05) lit.push(shimmer(t) !== null);
    const starts = lit.filter((on, i) => on && !lit[i - 1]).length;
    expect(starts).toBeLessThanOrEqual(60 / 4); // at most one brightness event every 4 s
  });

  test("every avatar gets its own clip and gradient ids", () => {
    const a = nextVeilId();
    const b = nextVeilId();
    expect(a.body).not.toBe(b.body);
    expect(Object.keys(a).sort()).toEqual(["base", "body", "cloak", "glass", "sheen"]);
  });
});

describe("veilFrame: the frame-exact Veil for films and stills", () => {
  test("the cast at its key times: gather, cloak, wake, finale", () => {
    const at = (s: number) => veilFrame(true, s).veil;
    expect(round(at(0))).toEqual(round(OFF)); // the switch itself moves nothing
    expect(at(0.15)).toMatchObject({ cloak: 0, eye: 0, ping: 0 }); // gathered: squashed to 92 %, eyes shut, the ring leaves
    expect(near(at(0.15).sy, 0.92)).toBe(true);
    const cloak = at(0.45); // the wipe under way behind the hem, stretched to 104 %
    expect(cloak.cloak).toBeGreaterThan(0.8);
    expect(cloak.cloak).toBeLessThan(0.9);
    expect(cloak.hem).toBeGreaterThan(0.8);
    expect(near(cloak.sy, 1.04)).toBe(true);
    const covered = at(0.6); // covered; the eyes about to open, the rim about to light
    expect(round(covered)).toMatchObject({ cloak: 1, hem: 0, rim: 0, eye: 0, glass: 0 });
    expect(round(at(0.85))).toMatchObject({ cloak: 1, rim: 1, eye: 0.8, glass: 0, ping: -1, sy: 1 }); // awake, calm, rim on
    expect(at(ACTIVATE)).toEqual(ON);
    expect(veilFrame(true, 30).veil).toEqual(ON);
  });

  test("the release at its key times: folded by 0.3 s, the plain pebble at 0.65 s", () => {
    const v = veilFrame(false, 0.3).veil;
    expect([v.glass, v.rim]).toEqual([0, 0]);
    expect(near(v.cloak, 0.5)).toBe(true); // the colour lifting back up behind the hem
    expect(near(v.hem, 1)).toBe(true);
    expect(veilFrame(false, RELEASE).veil).toEqual(OFF);
  });

  test("before the switch it is where it started; after it, the end state exactly", () => {
    const mid = veil(true, 0.4);
    expect(veilFrame(false, -0.1, mid)).toEqual({ on: true, veil: mid, shine: null });
    expect(veilFrame(true, -1)).toEqual({ on: false, veil: OFF, shine: null });
    expect(veilFrame(true, ACTIVATE + 0.01).veil).toEqual(ON);
    expect(veilFrame(false, RELEASE + 0.01, mid).veil).toEqual(OFF);
  });

  test(`the shimmer runs from ${SHIMMER_FROM} s after the switch, every 6 s, only while on and not reduced`, () => {
    expect(veilFrame(true, SHIMMER_FROM - 0.01).shine).toBeNull();
    expect(veilFrame(true, SHIMMER_FROM + 0.55).shine!.opacity).toBeGreaterThan(0.99);
    expect(veilFrame(true, SHIMMER_FROM + 2).shine).toBeNull();
    expect(veilFrame(true, SHIMMER_FROM + 6.2).shine).not.toBeNull();
    expect(veilFrame(true, SHIMMER_FROM + 0.5, OFF, true).shine).toBeNull();
    expect(veilFrame(false, SHIMMER_FROM + 0.5).shine).toBeNull();
  });

  test("Reduce Motion: a 0.3 s cross-fade each way with the eyes easing to 80 %, no squash, ping or hem", () => {
    for (let s = 0; s <= 0.3; s += 0.05) {
      const v = veilFrame(true, s, OFF, true).veil;
      expect(v.fade || s >= FADE).toBe(true);
      expect([v.sy, v.sx, v.ping, v.hem]).toEqual([1, 1, -1, 0]);
      expect(v.rim).toBe(v.cloak);
      expect(v.glass).toBe(v.cloak);
      expect(near(v.eye, 1 - 0.2 * v.cloak)).toBe(true);
    }
    expect(veilFrame(true, FADE, OFF, true).veil).toEqual(ON);
    expect(veilFrame(false, FADE, ON, true).veil).toEqual(OFF);
  });

  test("Pebble 1.1.0's app starts a cast from ON and a release from OFF: the colour changes at once", () => {
    // Avatar.vue computes `from` after the prop has flipped (see veil.ts); this is what its README GIFs show.
    expect(veilFrame(true, 0.033, ON).veil).toMatchObject({ cloak: 1, rim: 1, glass: 1 });
    expect(veilFrame(false, 0.033, OFF).veil).toMatchObject({ cloak: 0, rim: 0, glass: 0 });
    expect(veilFrame(true, 0.4, ON).veil.ping).toBeGreaterThan(0); // the ring and the blink still play
  });
});

describe("veilAt: timelines of switches, replayed for every frame", () => {
  const timeline: VeilSwitch[] = [
    { at: 1, on: true },
    { at: 1.4, on: false }, // reversed mid-cast
    { at: 1.6, on: true }, // and again mid-release
    { at: 5, on: false },
    { at: 5, on: false }, // a repeat changes nothing
  ];

  test("replay equals a live Veil driven at 30 fps, frame for frame", () => {
    const live = new LiveVeil(false);
    let next = 0;
    for (let f = 0; f <= 8 * FPS; f++) {
      const t = f / FPS;
      while (next < timeline.length && timeline[next]!.at <= t + 1e-9) live.set(timeline[next++]!.on, "animate");
      const replay = veilAt(timeline, t);
      const shown = live.frame("animate");
      if (!same(replay, shown)) expect({ t, shown }).toEqual({ t, shown: replay });
      live.advance(1 / FPS);
    }
  });

  test("a reversal starts from wherever the Veil had got to: cloak, rim and glass never jump", () => {
    let prev: VeilFrame | null = null;
    for (let ms = 900; ms <= 6000; ms += 5) {
      const now = veilAt(timeline, ms / 1000);
      if (prev) {
        for (const k of ["cloak", "rim", "glass"] as const) expect(Math.abs(now.veil[k] - prev.veil[k])).toBeLessThan(0.08);
      }
      prev = now;
    }
  });

  test("a timeline that starts on: settled, shimmering from t = 0", () => {
    expect(veilAt([], 0.55, { initial: true })).toEqual({ on: true, veil: ON, shine: shimmer(0.55) });
    expect(veilAt([], 3, { initial: true }).shine).toBeNull();
    expect(veilAt([], 0.55, { initial: true, reduced: true }).shine).toBeNull();
    expect(veilAt([{ at: 2, on: false }], 2 + RELEASE + 0.01, { initial: true })).toEqual(veilEnd(false));
  });
});

describe("LiveVeil: the live switch and clock", () => {
  const run = (v: LiveVeil, seconds: number, motion: "animate" | "reduced" = "animate") => {
    const frames: VeilFrame[] = [];
    for (let f = 0; f < Math.round(seconds * FPS); f++) {
      v.advance(1 / FPS);
      frames.push(v.frame(motion));
    }
    return frames;
  };

  test("starts settled on the end state, without a shimmer on a still frame", () => {
    expect(new LiveVeil(true).frame("still")).toEqual(veilEnd(true));
    expect(new LiveVeil(false).frame("animate")).toEqual(veilEnd(false));
    expect(new LiveVeil(true).moving("animate")).toBe(false);
  });

  test("the cast plays for 1.25 s, then holds ON; the release takes 0.65 s", () => {
    const until = (v: LiveVeil) => {
      for (let f = 1; f <= 3 * FPS; f++) {
        v.advance(1 / FPS);
        if (!v.moving("animate")) return f / FPS;
      }
      return Infinity;
    };
    const v = new LiveVeil(false);
    expect(v.set(false, "animate")).toBe(false);
    expect(v.set(true, "animate")).toBe(true);
    expect(v.moving("animate")).toBe(true);
    expect(Math.abs(until(v) - ACTIVATE)).toBeLessThanOrEqual(1 / FPS);
    expect(v.frame("animate").veil).toEqual(ON);
    v.set(false, "animate");
    expect(Math.abs(until(v) - RELEASE)).toBeLessThanOrEqual(1 / FPS);
    expect(v.frame("animate")).toEqual(veilEnd(false));
    v.set(true, "animate");
    expect(run(v, 0.4).at(-1)!.veil.ping).toBeGreaterThan(0); // the ring is on its way at 0.4 s
  });

  test("a reversal mid-cast continues from the frame on screen", () => {
    const v = new LiveVeil(false);
    v.set(true, "animate");
    run(v, 0.4);
    const shown = v.frame("animate").veil;
    v.set(false, "animate");
    const after = v.frame("animate").veil;
    expect([after.cloak, after.rim, after.glass, after.eye]).toEqual([shown.cloak, shown.rim, shown.glass, shown.eye]);
  });

  test("a pebble that isn't the animated one shows the end state at once (Avatar.vue)", () => {
    const v = new LiveVeil(false);
    v.set(true, "still");
    expect(v.frame("still")).toEqual(veilEnd(true));
    expect(v.frame("animate").veil).toEqual(ON); // nothing left to play when it becomes the animated one
    v.set(false, "animate");
    run(v, 0.2);
    v.settle(); // outshone mid-release
    expect(v.frame("animate")).toEqual(veilEnd(false));
  });

  test("reduced: one 0.3 s cross-fade, no shimmer", () => {
    const v = new LiveVeil(false);
    v.set(true, "reduced");
    const fade = run(v, 0.4, "reduced");
    expect(fade.slice(0, 8).every((f) => f.veil.fade && f.shine === null && f.veil.sy === 1 && f.veil.ping === -1)).toBe(true);
    expect(fade.at(-1)).toEqual(veilEnd(true));
    expect(v.moving("reduced")).toBe(false);
    v.advance(0.55);
    expect(v.frame("reduced").shine).toBeNull();
  });

  test("a transition belongs to the motion it started under", () => {
    const v = new LiveVeil(true);
    v.set(false, "reduced");
    run(v, 0.35, "reduced"); // the cross-fade is over...
    expect(v.moving("reduced")).toBe(false);
    expect(v.moving("animate")).toBe(false);
    expect(v.frame("animate")).toEqual(veilEnd(false)); // ...and never comes back as an unfinished release
    v.set(true, "animate");
    run(v, 0.3);
    expect(v.frame("reduced").veil).toEqual(ON); // paused mid-cast: the settled look, no wipe or ring
    expect(v.frame("reduced").shine).toBeNull();
    expect(Number.isNaN(v.frame("animate").veil.cloak)).toBe(false);
  });

  test("busy through the cast and every shimmer band, so an animated pebble never settles on one", () => {
    const v = new LiveVeil(false);
    v.set(true, "animate");
    const busy: boolean[] = [];
    for (let f = 0; f < 9 * FPS; f++) {
      v.advance(1 / FPS);
      busy.push(v.busy("animate"));
    }
    const at = (s: number) => busy[Math.round(s * FPS) - 1];
    expect([at(0.5), at(1.2), at(2.0), at(2.2), at(5), at(7.5), at(8.5)]).toEqual([true, true, true, false, false, true, false]);
    expect(new LiveVeil(false).busy("animate")).toBe(false);
  });

  test("on from the start: the shimmer counts from the clock's start", () => {
    const v = new LiveVeil(true);
    v.advance(0.25);
    v.advance(0.25);
    v.advance(0.05);
    expect(near(v.time, 0.55)).toBe(true);
    expect(v.frame("animate").shine).toEqual(shimmer(v.time));
    expect(v.frame("animate").shine!.opacity).toBeGreaterThan(0.99);
    expect(v.frame("still").shine).toBeNull();
  });

  test("the clock ignores bad steps and clamps long stalls", () => {
    const v = new LiveVeil();
    v.advance(Number.NaN);
    v.advance(-1);
    expect(v.time).toBe(0);
    v.advance(3);
    expect(v.time).toBe(0.25);
  });
});

describe("veilDraw: the numbers Avatar.vue's template draws", () => {
  test("off: nothing to draw", () => {
    const d = veilDraw(veilEnd(false), 220);
    expect([d.show, veilVisible(OFF), d.squash, d.eyeScale, d.ping, d.hem, d.shimmer]).toEqual([false, false, undefined, "", null, null, null]);
  });

  test("on: covered, 70 % glass, the highlight, the light rim, calm eyes", () => {
    const d = veilDraw(veilEnd(true), 220);
    expect(d).toMatchObject({ show: true, fade: false, fine: true, edge: 78, squash: undefined, eyeScale: " scale(1 0.800)" });
    expect(d.baseClip).toEqual({ y: 78, height: 32 });
    expect(d.cloakClip).toEqual({ y: -110, height: 188 });
    expect(near(d.fillOpacity, 0.7)).toBe(true);
    expect(near(d.highlightOpacity, 0.2)).toBe(true);
    expect([d.rimWidth, d.rimOpacity, d.ping, d.hem, d.shimmer]).toEqual([5, 0.95, null, null, null]);
  });

  test("mid-cast: the squash about the bottom, the hem on the edge, the ring", () => {
    const f = veilFrame(true, 0.4);
    const d = veilDraw(f, 220);
    const v = f.veil;
    expect(d.squash).toBe(`translate(0 ${(66 * (1 - v.sy)).toFixed(2)}) scale(${v.sx.toFixed(4)} ${v.sy.toFixed(4)})`);
    expect(d.squash).toMatch(/^translate\(0 -?\d+\.\d{2}\) scale\(\d\.\d{4} \d\.\d{4}\)$/);
    expect(d.edge).toBe(-78 + 156 * v.cloak);
    expect(d.hem).toEqual({ y: d.edge - 0.9, opacity: 0.95 * v.hem });
    expect(d.ping).toEqual({
      transform: `scale(${(1 + (16 / 66) * (1 - (1 - v.ping) ** 5)).toFixed(4)})`,
      strokeWidth: (3.5 - 2.8 * v.ping).toFixed(2),
      opacity: (0.85 * (1 - v.ping)).toFixed(3),
    });
    expect(d.eyeScale).toBe(" scale(1 0.060)"); // shut eyes keep a sliver (Avatar.vue's 0.06 floor)
  });

  test("the shimmer band sweeps across at 22 degrees, as strong as the glass", () => {
    const f = veilFrame(true, SHIMMER_FROM + 0.55);
    const d = veilDraw(f, 220);
    expect(d.shimmer).toEqual({ transform: `translate(${(-130 + 260 * f.shine!.x).toFixed(1)} 0) rotate(22)`, opacity: f.shine!.opacity });
    expect(veilDraw(f, 48).shimmer).toBeNull();
  });

  test(`under ${VEIL_FINE_PX} px: a flat dusk fill and a rim about 1.3 px wide, no glass, shimmer or ring`, () => {
    const d = veilDraw(veilFrame(true, 0.4), 24);
    expect([d.fine, d.fillOpacity, d.ping, d.shimmer]).toEqual([false, 1, null, null]);
    expect(d.rimWidth).toBe((2 * 1.3 * 220) / 24);
    expect(veilDraw(veilEnd(true)).fine).toBe(true); // sized by CSS: taken as large
  });

  test("reduced: the layers cross-fade (opacity), never wipe", () => {
    const d = veilDraw(veilFrame(true, 0.15, OFF, true), 220);
    const c = veilFrame(true, 0.15, OFF, true).veil.cloak;
    expect([d.fade, d.baseOpacity, d.veilOpacity]).toEqual([true, 1 - c, c]);
  });
});

test("the dusk family is Pebble 1.1.0's src/tokens.css, light and dark", () => {
  expect(VEIL_LIGHT).toEqual({ veil: "#44528c", hi: "#7684c6", eye: "#fff", rim: "#d6ddff", glow: "#7d8df2" });
  expect(VEIL_DARK).toEqual({ veil: "#a3aeea", hi: "#ccd4fb", eye: "#1c2246", rim: "#fff", glow: "#8494f7" });
});
