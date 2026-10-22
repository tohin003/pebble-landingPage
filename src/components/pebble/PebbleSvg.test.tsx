// The site's renderers, server-rendered with react-dom/server (run with `npm run test:engine`).
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { POSES, staticView, type PoseId } from "@pebble/index";
import fixture from "../../../shared/pebble/fixtures/idle-frame-t1.json";
import { Pebble } from "./Pebble";
import { PebbleLive } from "./PebbleLive";
import { PebbleStatic } from "./PebbleStatic";
import { PebbleSvg } from "./PebbleSvg";

const geometry = (html: string) => [...html.matchAll(/ (d|transform|opacity|cx|cy|r)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);

describe("PebbleStatic", () => {
  test("draws the engine's idle frame at 1.0 s, the reference frame, exactly", () => {
    const html = renderToStaticMarkup(<PebbleStatic size={240} />);
    expect(html).toContain(`d="${fixture.bodyPath}"`);
    for (const eye of fixture.eyes) {
      expect(html).toContain(`d="${eye.d}"`);
      expect(html).toContain(`transform="${eye.matrix}"`);
    }
    expect(html).toContain('transform="translate(0.00 0.00) rotate(0.00) scale(1.000 1.000)"');
  });

  test("is decorative, sized, and coloured from the theme", () => {
    const html = renderToStaticMarkup(<PebbleStatic size={240} />);
    expect(html).toMatch(/^<svg viewBox="-110 -110 220 220" width="240" height="240" aria-hidden="true" focusable="false"/);
    expect(html).toContain('data-animated="false"');
    expect(html).toContain("color:var(--pebble, #536b54)");
    expect(html).toContain('fill="var(--pebble-eye, #ffffff)"');
    expect(html).not.toMatch(/<(script|text|title)/);
  });

  test("renders every Pebble pose", () => {
    for (const pose of Object.keys(POSES) as PoseId[]) {
      const html = renderToStaticMarkup(<PebbleStatic pose={pose} size={100} />);
      expect(html).toContain(`data-pose="${pose}"`);
      expect(html).toContain(staticView(pose).frame.bodyPath.slice(0, 40));
    }
  });
});

describe("PebbleLive", () => {
  test("server-renders (and starts on) the static frame, so the swap moves nothing", () => {
    for (const pose of ["idle", "sleepy", "review", "testing"] as const) {
      const live = renderToStaticMarkup(<PebbleLive pose={pose} size={240} />);
      const still = renderToStaticMarkup(<PebbleStatic pose={pose} size={240} />);
      expect(live).toMatch(/^<div aria-hidden="true" data-mode="still"/);
      expect(geometry(live)).toEqual(geometry(still));
    }
  });
});

describe("Pebble", () => {
  test("server-renders the static SVG first (the live pebble arrives after first paint)", () => {
    const html = renderToStaticMarkup(<Pebble size={240} name="hero" />);
    expect(html).toBe(renderToStaticMarkup(<PebbleStatic size={240} />));
    expect(renderToStaticMarkup(<Pebble size={240} live={false} />)).toBe(html);
  });
});

test("PebbleSvg pins the orbit cue on still frames", () => {
  const v = staticView("testing");
  expect(renderToStaticMarkup(<PebbleSvg frame={v.frame} motion={v.motion} still />)).toContain('transform="rotate(-30)"');
});
