// Fix round 2 (27 Oct): the verifier's findings after fix round 1 (CR-04's Drop hold, CR-15's blind spots, NF-01 to
// NF-08), each held by the check that sees it, with a planted canary: the same fault the reels showed fails, the plan as
// it is now passes. tests/setpieces.test.ts and tests/review-checks.test.ts hold every plan to every check.
import { describe, expect, test } from "bun:test";
import { VelocityCamera, worldToFrame } from "../motion/camera";
import type { Finding } from "../qa/checks";
import { cascadeSchedule, swapLook } from "../type/Cascade";
import { BODY } from "../../../../shared/pebble";
import { demoPlans } from "../setpieces/demo/plans";
import { CONTENT_FLOOR_PX, READ_AFTER_CUT_60, contentFloor, cutsReadable, slotLabels, sway, typeExitKind, typeExits, typeOverPlanes, typeOverType, typeTracks } from "../setpieces/qa";
import { contentMotion } from "../setpieces/motion-qa";
import { LABEL_FADE_FRAMES, drawnSlots, labelClear, labelOpacityOn } from "../setpieces/labels";
// (drawnSlots expands a slot's label copies, SlotStandIn.alsoAt, each keyed "<key>@<i>")
import { carriedRect, planesClearFrame } from "../setpieces/kit";
import { glideLz, lineRect, rectInFrame, zoomAbout } from "../setpieces/frame";
import { HSF_VIEWS, TAKE_HSB3, TAKE_HSF, frameOfSource, stillsAt } from "../setpieces/take";
import { STILL } from "../setpieces/standins";
import { WORLD } from "../setpieces/world";
import { HOLD_PAN_PX } from "../setpieces/drop";
import { KEPT_PAN_PX } from "../setpieces/climax";
import { SEEN_TEXT_PX } from "../setpieces/ringBlock";
import type { ScenePlan, ShotSpec } from "../setpieces/scene";

const ASPECTS = ["16:9", "1:1", "9:16"] as const;
const errorsOf = (xs: readonly Finding[], check?: string) => xs.filter((x) => x.level === "error" && (!check || x.check === check));
const piece = (a: (typeof ASPECTS)[number], id: string): ScenePlan => demoPlans(a).find((e) => e.plan.id === id)!.plan;
/** A plan with one shot's camera replaced. */
const withCamera = (p: ScenePlan, shotId: string, cam: VelocityCamera): ScenePlan => ({ ...p, shots: p.shots.map((s) => (s.id === shotId ? ({ ...s, camera: cam } as ShotSpec) : s)) });

/* ---------------------------------------------------------------- CR-04: the content keeps moving ------------- */

describe("the content floor: what the viewer looks at glides, not only the frame's corners (CR-04, the verifier)", () => {
  test("the Drop's hold moves its content at the floor or more in every aspect", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "drop");
      expect(errorsOf(contentFloor(p))).toEqual([]);
      const x = p.extra as Record<string, number>;
      for (let fr = x.apertureOpen + 100; fr < x.revealStart; fr += 10) expect(contentMotion(p, fr).median!).toBeGreaterThan(CONTENT_FLOOR_PX);
    }
    expect(HOLD_PAN_PX).toBeGreaterThanOrEqual(0.3);
  });
  test("the canary: the round-1 hold (a pull-back about the companion, no pan) is refused, though its corners move 0.4", () => {
    const p = piece("16:9", "drop");
    const s = p.shots[0]!;
    const x = p.extra as Record<string, number>;
    const at = x.apertureOpen + 90;
    const pose = s.camera.pose(at);
    // the old drift: zoomAbout(opened, the companion, −1.1 × lzHold): the companion, the frame's subject, stays put
    const v = zoomAbout(pose, { x: 0.74 * p.frame.w, y: p.frame.h / 2 }, -glideLz(p.frame) * 1.1, p.frame);
    const old = new VelocityCamera(s.camera.pose(0), s.camera.sample(0).vel);
    old.hermite(at, pose, v);
    old.glide(p.duration, 1e9, v);
    const q = withCamera(p, s.id, old);
    const found = errorsOf(contentFloor(q));
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((f) => f.frame! <= at + 60 && f.to! >= at + 120)).toBe(true);
    // the corners move at the floor or more all along: the old check passed it
    expect(contentMotion(q, at + 60).corner).toBeGreaterThan(0.25);
  });
  test("title pages keep the corners' floor (OVERRIDES §58) and are not judged on their content", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "finale");
      const title = p.shots.find((s) => s.id === "title")!;
      expect(errorsOf(contentFloor(p)).filter((f) => f.frame! >= title.from)).toEqual([]);
    }
  });
});

/* ---------------------------------------------------------------- NF-02: no sway -------------------------------- */

describe("no hold sways through a stop (NF-02)", () => {
  test("the climax's content travels one way from Glaze's leave to Kiln's, in every aspect", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "climax");
      expect(errorsOf(sway(p))).toEqual([]);
      const kiln = p.shots.find((s) => s.id === "kiln")!;
      const x = p.extra as Record<string, number>;
      // the kept card's trailing edge keeps moving the climax's way from the landing to the leave (the verifier
      // measured the left edge: 835, 813, 883, 875, 736 at 1080: it turned back twice)
      const kept = kiln.planes.find((pl) => pl.id === "kept")!;
      const edge = (fr: number) => {
        const r = rectInFrame(kept.rect, kiln.camera.pose(fr - kiln.from), p.frame);
        return a === "16:9" ? r.x : r.y;
      };
      for (let fr = x.peak; fr + 10 < p.duration; fr += 10) expect(edge(fr + 10) - edge(fr)).toBeGreaterThan(0);
    }
    expect(KEPT_PAN_PX).toBeGreaterThanOrEqual(0.3);
  });
  test("the canary: a hold that pans left, stops, drifts right, stops and pans left again is refused", () => {
    const p = piece("16:9", "climax");
    const kiln = p.shots.find((s) => s.id === "kiln")!;
    const p0 = kiln.camera.pose(80);
    const z = p0.zoom;
    const cam = new VelocityCamera(p0, { x: 0.74 / z, y: 0, lz: 0 });
    cam.hermite(140, { x: p0.x + 40 / z, y: p0.y, zoom: z }, { x: 0 });
    cam.hermite(270, { x: p0.x - 30 / z, y: p0.y, zoom: z }, { x: 0 });
    cam.hermite(420, { x: p0.x + 40 / z, y: p0.y, zoom: z }, { x: 0.42 / z });
    cam.glide(p.duration, 1e9, { x: 0.42 / z });
    const found = errorsOf(sway(withCamera(p, "kiln", cam)));
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]!.message).toMatch(/turns back on itself/);
  });
});

/* ---------------------------------------------------------------- NF-07: every cut reads at once ---------------- */

describe("every hard cut reads within 6 frames, inside a piece as between pieces (NF-07)", () => {
  test("the demo's internal cuts pass in every aspect (the cut into Kiln shows its slot's label at once)", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(cutsReadable(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
    expect(READ_AFTER_CUT_60).toBe(6);
  });
  test("the canary: the Kiln slot's label at its top left corner (as rendered before) leaves the cut unread for 60 frames", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "climax");
      const unfocused: ScenePlan = {
        ...p,
        shots: p.shots.map((s) => ({
          ...s,
          planes: s.planes.map((pl) => {
            if (pl.content.kind !== "take" || pl.id !== "kiln") return pl;
            const m = pl.content.use.manifest;
            const views = { ...m.views, conversation: { ...m.views.conversation!, slot: { ...m.views.conversation!.slot!, focus: undefined } } };
            return { ...pl, content: { ...pl.content, use: { ...pl.content.use, manifest: { ...m, views } } } };
          }),
        })),
      };
      const found = errorsOf(cutsReadable(unfocused));
      expect(found.length).toBe(1);
      expect(found[0]!.message).toMatch(/glaze → kiln/);
    }
  });
});

/* ---------------------------------------------------------------- NF-08: slot labels whole or not drawn --------- */

describe("a slot's label is whole or not drawn (NF-08)", () => {
  test("the demo's pieces pass in every aspect", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(slotLabels(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("a label is drawn only while it is clear of the frame's edges, fading over 10 frames before it would reach one", () => {
    // the 9:16 Ring 4: the browser slot's label (the verifier saw "n tab, at 1×" at the left edge for 4 s)
    const p = piece("9:16", "ring4");
    const s = p.shots[0]!;
    const browser = s.planes.find((pl) => pl.id === "browser")!;
    const d = drawnSlots(p, s, browser)[0]!;
    let cutFrames = 0;
    for (let fr = s.from; fr < s.to; fr++) {
      const o = labelOpacityOn(p, s, d, fr);
      if (!labelClear(p, s, d, fr)) {
        expect(o).toBe(0);
        cutFrames++;
      }
      // and it never jumps: at most one fade step a frame
      if (fr > s.from) expect(Math.abs(o - labelOpacityOn(p, s, d, fr - 1))).toBeLessThanOrEqual(1 / LABEL_FADE_FRAMES + 1e-9);
    }
    expect(cutFrames).toBeGreaterThan(0);
  });
  test("the workspace hands its label to the palette as the palette opens over it (they were drawn one over the other)", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "dusk");
      const s = p.shots[0]!;
      const ws = drawnSlots(p, s, s.planes.find((pl) => pl.id === "workspace")!)[0]!;
      const opens = (p.extra as Record<string, number>).paletteAt;
      expect(labelOpacityOn(p, s, ws, opens - 2)).toBeGreaterThan(0.99);
      expect(labelOpacityOn(p, s, ws, opens + 10)).toBe(0);
    }
    expect(TAKE_HSB3.views.workspace!.labelOut).toBe(TAKE_HSB3.events.opens);
  });
});

/* ---------------------------------------------------------------- NF-05: type never over a capture's text ------- */

describe("type never sits over a capture with text (NF-05)", () => {
  test("the demo's pieces have no such line in any aspect (it is an error now; over a slot it is noted for G4)", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(typeOverPlanes(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("the canary: the 9:16 Toolbox where it was puts its Settings still under L05 and L06 for the hold", () => {
    const p = piece("9:16", "drop");
    const old: ScenePlan = { ...p, shots: p.shots.map((s) => ({ ...s, planes: s.planes.map((pl) => (pl.id === "toolbox" ? { ...pl, rect: { ...pl.rect, y: 1180 } } : pl)) })) };
    const found = errorsOf(typeOverPlanes(old));
    expect(found.some((f) => /Now it works/.test(f.message) && /toolbox/.test(f.message))).toBe(true);
    expect(WORLD["9:16"].toolbox.y).toBeGreaterThanOrEqual(1560);
  });
  test("what the aperture's bands cover is not under the type (L04 sits in the band, the companion behind it)", () => {
    for (const a of ["16:9", "1:1"] as const) {
      const p = piece(a, "drop");
      expect(typeOverPlanes(p).filter((f) => /Allow it right where you are/.test(f.message) && /companion/.test(f.message))).toEqual([]);
    }
  });
  test("a line in a fixed band lands once no capture with text is under it for its whole hold", () => {
    const p = piece("9:16", "ring4");
    const s = p.shots[0]!;
    const chapter = p.types.find((t) => t.id === "ring4-chapter")!;
    const r = lineRect(chapter.text, chapter.tier, p.frame, chapter.box, chapter.sizeT);
    const poseAt = (fr: number) => s.camera.pose(fr);
    const context = s.planes.filter((pl) => pl.content.kind === "standIn");
    expect(planesClearFrame(context, r, poseAt, s.ref, p.frame, chapter.at, s.to, 60)).toBe(chapter.at);
    // the canary: a still parked under the band holds the line back
    const under = { ...context[0]!, id: "under", rect: { x: -10000, y: -10000, w: 20000, h: 20000 } };
    expect(planesClearFrame([...context, under], r, poseAt, s.ref, p.frame, chapter.at, s.to, 60)).toBe(s.to);
  });
});

describe("type never sits on type", () => {
  test("no two lines overlap in any piece or aspect (the 1:1 Veil's label ran into the honest line's band)", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(typeOverType(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("the canary: the honest line moved up onto the Veil's label is refused", () => {
    const p = piece("1:1", "dusk");
    const label = p.types.find((t) => t.id === "L22")!;
    const moved: ScenePlan = { ...p, types: p.types.map((t) => (t.id === "L21" ? { ...t, box: { ...t.box, top: label.box.top } } : t)) };
    expect(errorsOf(typeOverType(moved)).length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- type leaves the way it came ------------------- */

describe("type leaves the way it came: a rise through a mask lifts out through it, a blur-in blurs out", () => {
  test("every line in every piece and aspect leaves with its entrance's own kind", () => {
    for (const a of ASPECTS) for (const { plan } of demoPlans(a)) expect(errorsOf(typeExitKind(plan)).map((f) => `${a} ${plan.id}: ${f.message}`)).toEqual([]);
  });
  test("the lines that rose and blurred away (round 2 as the verifier saw it) are lifts now, gone before their cuts", () => {
    for (const a of ASPECTS) {
      const lines = [...piece(a, "drop").types.filter((t) => t.id === "L05" || t.id === "L06"), piece(a, "ring4").types.find((t) => t.id === "ring4-chapter")!, piece(a, "climax").types.find((t) => t.id === "L24")!];
      const fixed = piece(a, "ring4").shots.find((s) => s.cascade)!.cascade!.fixed;
      for (const t of [...lines, fixed]) expect(`${a} ${t.id} ${t.exit}`).toBe(`${a} ${t.id} lift`);
      for (const p of [piece(a, "ring4"), piece(a, "climax")]) expect(errorsOf(typeExits(p)).map((f) => `${a} ${f.message}`)).toEqual([]);
    }
  });
  test("the canary: a rise that blurs out, and a blur-in that lifts out, are refused; a line carried by its world is not judged", () => {
    const p = piece("16:9", "climax");
    const blurred: ScenePlan = { ...p, types: p.types.map((t) => (t.id === "L24" ? { ...t, exit: "blur" as const } : t)) };
    expect(errorsOf(typeExitKind(blurred)).map((f) => f.message).join()).toMatch(/L24 .* lineRise .* blur/);
    const lifted: ScenePlan = { ...p, types: p.types.map((t) => (t.id === "L25" ? { ...t, exit: "lift" as const } : t)) };
    expect(errorsOf(typeExitKind(lifted)).map((f) => f.message).join()).toMatch(/L25 .* lineBlur .* lift/);
    const ring = piece("9:16", "ring4");
    const fixedBlur: ScenePlan = { ...ring, shots: ring.shots.map((s) => (s.cascade ? { ...s, cascade: { ...s.cascade, fixed: { ...s.cascade.fixed, exit: "blur" as const } } } : s)) };
    expect(errorsOf(typeExitKind(fixedBlur)).map((f) => f.message).join()).toMatch(/ring4-fixed/);
    // the Veil's label blurs in and leaves with the render's world ("camera"): not this check's
    expect(piece("16:9", "dusk").types.find((t) => t.id === "L22")!.exit).toBe("camera");
    expect(errorsOf(typeExitKind(piece("16:9", "dusk")))).toEqual([]);
  });
});

/* ---------------------------------------------------------------- NF-06: the marks are what the view draws ------ */

describe("every type rect's frames and exits are what the view draws (NF-06)", () => {
  test("each cascade item's track matches <Cascade>'s own schedule, the cascade's end included", () => {
    for (const a of ASPECTS)
      for (const { plan } of demoPlans(a))
        for (const s of plan.shots) {
          const c = s.cascade;
          if (!c) continue;
          const sched = cascadeSchedule(c.start, c.items, plan.fps, c.beats, undefined, c.endAt);
          const tracks = typeTracks(plan).filter((t) => t.id.startsWith(`${s.id}-item`));
          expect(tracks.length).toBe(sched.length);
          sched.forEach((w, i) => {
            const t = tracks[i]!;
            const held = c.endAt === undefined && c.holdLast && i === sched.length - 1;
            for (let fr = s.from; fr < s.to; fr++) {
              const look = swapLook(w, fr, held);
              const drawn = !!look && look.opacity > 0;
              const tracked = fr >= t.from && fr < t.until;
              if (drawn !== tracked && !(look && look.opacity === 0)) throw new Error(`${a} ${t.id}: frame ${fr} drawn ${drawn}, tracked ${tracked} (until ${t.until})`);
            }
            if (!held) expect(t.exits).toEqual([{ from: w.outStart, to: w.outEnd, kind: i === sched.length - 1 && c.endAt !== undefined ? "blur" : "swap" }]);
          });
        }
  });
});

/* ---------------------------------------------------------------- NF-01: Ring 4 frames a decision --------------- */

describe("Ring 4 frames the held card asking, then reads its answer (NF-01)", () => {
  test("HS-F rolls from the card asking: the whole card with its buttons until the click, its sentence after, on one clock", () => {
    const held = TAKE_HSF.views.held!;
    const click = TAKE_HSF.events.click!;
    expect(stillsAt(held, click - 1).map((x) => x.standIn.id)).toEqual(["held"]);
    expect(stillsAt(held, click).map((x) => x.standIn.id)).toEqual(["heldNote"]);
    expect(TAKE_HSF.events.running! - click).toBeGreaterThanOrEqual(0);
    // the 1.5.0 span from the click to Verified (4.63 s) is kept within a placeholder's tenth of a second
    expect(Math.abs((TAKE_HSF.events.verified! - click) / TAKE_HSF.fps - 4.63)).toBeLessThan(0.2);
    expect(HSF_VIEWS.held.w).toBe(STILL.held.crop!.w);
  });
  test("in every aspect the asking card is framed whole, its text under the legibility size; its answer is read at 28 px", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "ring4");
      const s = p.shots[0]!;
      const x = p.extra as Record<string, number>;
      const ask = s.planes.find((pl) => pl.id === "ring4-ask")!;
      const u = ask.content.kind === "take" ? ask.content.use : null;
      const clickAt = frameOfSource(TAKE_HSF.events.click!, u!.at, p.fps, u!.manifest, u!.inPoint);
      expect(clickAt).toBe(x.clickAt);
      // framed whole for at least a second before the click, its text at most SEEN_TEXT_PX
      for (let fr = x.dolly1To; fr < clickAt; fr += 4) {
        const r = rectInFrame(ask.rect, s.camera.pose(fr), p.frame);
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= p.frame.w && r.y + r.h <= p.frame.h).toBe(true);
        expect((STILL.held.textPx! * s.camera.pose(fr).zoom) / p.frame.unit).toBeLessThanOrEqual(SEEN_TEXT_PX + 1e-6);
      }
      expect(clickAt - x.dolly1To).toBeGreaterThanOrEqual(60);
      // its answer read at 28 px or more
      expect((STILL.heldNote.textPx! * s.camera.pose(x.dollyTo).zoom) / p.frame.unit).toBeGreaterThanOrEqual(28);
    }
  });
  test("the receipt is its Verified line, cropped at line boundaries: no timing line above it, no half-cut reply below", () => {
    const c = STILL.verifiedTop.crop!;
    // measured on the 3× capture: the timing line's ink ends at 27.7 CSS px, the Verified line runs 42.7–52.7, the reply's
    // first line starts at 68.7
    expect(c.y).toBeGreaterThan(27.7);
    expect(c.y).toBeLessThan(42.7);
    expect(c.y + c.h).toBeGreaterThan(52.7);
    expect(c.y + c.h).toBeLessThan(68.7);
    expect(STILL.verifiedTop.words).toBe(7);
  });
  test("the conversation names itself through the receipt too, one label at a time (its copy above the receipt)", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "ring4");
      const s = p.shots[0]!;
      const x = p.extra as Record<string, number>;
      const win = s.planes.find((pl) => pl.id === "ring4-window")!;
      const labels = drawnSlots(p, s, win);
      expect(labels.map((d) => d.key)).toEqual(["self", "self@1"]);
      // from the receipt's arrival to the camera's leave, a label of the conversation is drawn whole on every frame
      for (let fr = x.receiptArrive; fr < x.cut - 19; fr++) expect(`${a} ${fr} ${Math.max(...labels.map((d) => labelOpacityOn(p, s, d, fr))) >= 0.99}`).toBe(`${a} ${fr} true`);
      // and never two at once: the copy gives way while the first label shows
      for (let fr = s.from; fr < s.to; fr += 2) {
        const [o0, o1] = labels.map((d) => labelOpacityOn(p, s, d, fr)) as [number, number];
        expect(o0 * o1 <= 0.25 + 1e-9 && o0 + o1 <= 1 + 1e-9).toBe(true);
      }
    }
  });
  test("the canary: without its copy, the receipt sat on the conversation's hatching with no label in frame", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "ring4");
      const s = p.shots[0]!;
      const x = p.extra as Record<string, number>;
      const win = s.planes.find((pl) => pl.id === "ring4-window")!;
      const one = drawnSlots(p, s, win).filter((d) => d.key === "self");
      const shown = (fr: number) => one.some((d) => labelOpacityOn(p, s, d, fr) >= 0.99);
      let unnamed = 0;
      for (let fr = x.receiptArrive; fr < x.cut - 19; fr++) if (!shown(fr)) unnamed++;
      expect(unnamed / p.fps).toBeGreaterThan(2.0);
    }
  });
});

/* ---------------------------------------------------------------- NF-03: the Veil's label leaves with it ---------- */

describe("the Veil's label leaves the frame with the render, and the cut follows at once (NF-03, CR-19)", () => {
  test("in every aspect the render's last pixel and the label's leave together, the cut within 3 frames", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "dusk");
      const s = p.shots.find((x) => x.id === "dusk-veil")!;
      const t = p.types.find((x) => x.id === "L22")!;
      const r0 = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT);
      const gone = (inside: (fr: number) => boolean) => {
        for (let fr = s.from; fr < s.to; fr++) if (!inside(fr)) return fr;
        return s.to;
      };
      const body = gone((fr) => {
        const pose = s.camera.pose(fr - s.from);
        const c = worldToFrame(s.stone!.at, pose, p.frame.w, p.frame.h);
        const k = (s.stone!.size * pose.zoom) / 220;
        return c.x + BODY.right * k > 0 && c.x + BODY.left * k < p.frame.w && c.y + BODY.bottom * k > 0 && c.y + BODY.top * k < p.frame.h;
      });
      const label = gone((fr) => {
        const r = carriedRect(p, t, r0, fr);
        return r.x + r.w > 0 && r.x < p.frame.w && r.y + r.h > 0 && r.y < p.frame.h;
      });
      expect(Math.abs(label - body)).toBeLessThanOrEqual(1);
      expect(s.to - Math.max(label, body)).toBeLessThanOrEqual(3);
    }
  });
  test("the render's body is 40–55 % of the frame's height through its hold in every aspect, and pushes in (CR-19)", () => {
    for (const a of ASPECTS) {
      const p = piece(a, "dusk");
      const s = p.shots.find((x) => x.id === "dusk-veil")!;
      const share = (fr: number) => (BODY.height * s.stone!.size * s.camera.pose(fr - s.from).zoom) / 220 / p.frame.h;
      const mid = Math.round((s.from + s.to) / 2);
      expect(share(s.from)).toBeGreaterThanOrEqual(0.398);
      expect(share(mid)).toBeGreaterThanOrEqual(0.4);
      expect(share(mid)).toBeLessThanOrEqual(0.55);
      expect(share(mid)).toBeGreaterThan(share(s.from));
    }
  });
});
