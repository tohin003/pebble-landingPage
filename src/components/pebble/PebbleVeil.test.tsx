// The Veil on the site's renderers (run with `npm run test:engine`): Pebble 1.1.0's Avatar.test.mjs Veil cases, ported
// to server renders, plus the layer order, the ids and the colours.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { OFF, SHIMMER_FROM, VEIL_DARK, VEIL_LIGHT, staticView, veilEnd, veilFrame, type VeilFrame } from "@pebble/index";
import { Pebble } from "./Pebble";
import { PebbleLive } from "./PebbleLive";
import { PebbleStatic } from "./PebbleStatic";
import { PebbleSvg } from "./PebbleSvg";
import { VEIL_PAINT } from "./PebbleVeil";
import { SITE_REST } from "./rest";

interface El {
  tag: string;
  attrs: Record<string, string>;
  children: El[];
  parent: El | null;
}
/** React's SVG markup as a tree (well-formed: quoted attributes, self-closing empty elements). */
function parse(html: string): El {
  const root: El = { tag: "#root", attrs: {}, children: [], parent: null };
  let at = root;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (m[1]) {
      at = at.parent!;
      continue;
    }
    const attrs = Object.fromEntries([...m[3]!.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1]!, a[2]!]));
    const el: El = { tag: m[2]!, attrs, children: [], parent: at };
    at.children.push(el);
    if (!m[4]) at = el;
  }
  return root;
}
const all = (el: El): El[] => [el, ...el.children.flatMap(all)];
const find = (el: El, test: (e: El) => boolean) => all(el).find(test);
const layer = (el: El, name: string) => find(el, (e) => e.attrs["data-veil"] === name);
const rim = (el: El) => find(el, (e) => e.tag === "path" && e.attrs.stroke === VEIL_PAINT.rim);
const ring = (el: El) => find(el, (e) => e.tag === "circle" && e.attrs.stroke === VEIL_PAINT.glow);
const clipRect = (el: El, name: string) =>
  find(el, (e) => e.tag === "rect" && e.parent?.tag === "clipPath" && (e.parent.attrs.id ?? "").startsWith(`veil-${name}`));
const noIds = (html: string) => html.replace(/(veil-(?:body|base|cloak|glass|sheen))[^")\s]*/g, "$1");

const still = staticView("idle", SITE_REST);
const svg = (veil: VeilFrame | undefined, size: number | undefined = 220) =>
  renderToStaticMarkup(<PebbleSvg frame={still.frame} motion={still.motion} still size={size} veil={veil} />);
const draw = (veil: VeilFrame | undefined, size?: number) => parse(svg(veil, size));

describe("PebbleSvg with the Veil, layer for layer as Avatar.vue 1.1.0 draws it", () => {
  test("off: no Veil layers at all, and the plain pebble's markup", () => {
    const off = svg(veilEnd(false));
    expect(off).toContain('data-stealth="off"');
    expect(off).not.toMatch(/<defs|clip-path|data-veil/);
    expect(off.replace(' data-stealth="off"', "")).toBe(svg(undefined));
    expect(svg(veilFrame(false, 0.7))).toBe(off); // the release leaves the plain pebble
  });

  test("the cast at 0.4 s wipes the dusk colour down behind the hem and sends one ring", () => {
    const t = draw(veilFrame(true, 0.4));
    expect(find(t, (e) => e.tag === "svg")!.attrs["data-stealth"]).toBe("on");
    expect(layer(t, "base")!.attrs["clip-path"]).toMatch(/^url\(#veil-base/);
    expect(layer(t, "glass")!.attrs["clip-path"]).toMatch(/^url\(#veil-cloak/);
    const cloak = Number(clipRect(t, "cloak")!.attrs.height);
    expect(cloak).toBeGreaterThan(20);
    expect(cloak).toBeLessThan(188);
    expect(Number(clipRect(t, "base")!.attrs.y)).toBeCloseTo(cloak - 110, 9); // the two clips meet at the wipe edge
    const hem = find(layer(t, "rim")!, (e) => e.tag === "rect")!;
    expect(Number(hem.attrs.y)).toBeCloseTo(cloak - 110 - 0.9, 9);
    expect(ring(t)!.attrs.transform).toMatch(/^scale\(1\.\d{4}\)$/);
    expect(find(t, (e) => (e.attrs.transform ?? "").startsWith("translate(0 "))!.attrs.transform).toMatch(/ scale\(\d\.\d{4} \d\.\d{4}\)$/);
  });

  test("the rendered layers at the key times of the cast, the release and the cross-fade", () => {
    const at = (veil: VeilFrame) => {
      const t = draw(veil);
      const glass = layer(t, "glass");
      const body = glass && find(glass, (e) => e.tag === "path");
      return {
        cloak: clipRect(t, "cloak") ? +Number(clipRect(t, "cloak")!.attrs.height).toFixed(3) : null, // 32 bare ... 188 covered
        hem: !!(layer(t, "rim") && find(layer(t, "rim")!, (e) => e.tag === "rect")),
        ring: !!ring(t),
        rim: rim(t) ? +Number(rim(t)!.attrs.opacity).toFixed(3) : null,
        glass: body ? +Number(body.attrs["fill-opacity"]).toFixed(3) : null, // 1 flat ... 0.7 glass
        eyes: find(t, (e) => e.tag === "path" && (e.attrs.transform ?? "").includes(" scale(1 "))?.attrs.transform.split(" scale(1 ")[1] ?? "open",
        fade: glass ? glass.attrs.opacity !== undefined : null,
        fadeIn: glass?.attrs.opacity !== undefined ? +Number(glass.attrs.opacity).toFixed(3) : null,
      };
    };
    expect(svg(veilFrame(true, 0))).toBe(svg(veilEnd(false)).replace('data-stealth="off"', 'data-stealth="on"')); // nothing moves yet
    const plain = { hem: false, fade: false, fadeIn: null };
    expect(at(veilFrame(true, 0.15))).toEqual({ ...plain, cloak: 32, ring: true, rim: 0, glass: 1, eyes: "0.060)" }); // gathered
    const wiping = at(veilFrame(true, 0.45));
    expect(wiping).toMatchObject({ hem: true, ring: true, rim: 0, glass: 1, eyes: "0.060)" });
    expect(wiping.cloak).toBeGreaterThan(150);
    expect(wiping.cloak).toBeLessThan(188);
    expect(at(veilFrame(true, 0.6))).toMatchObject({ cloak: 188, hem: false, ring: true, rim: 0, glass: 1 }); // covered
    expect(at(veilFrame(true, 0.85))).toEqual({ ...plain, cloak: 188, ring: false, rim: 0.95, glass: 1, eyes: "0.800)" });
    expect(at(veilFrame(true, 1.25))).toEqual({ ...plain, cloak: 188, ring: false, rim: 0.95, glass: 0.7, eyes: "0.800)" });
    const lifting = at(veilFrame(false, 0.3));
    expect(lifting).toMatchObject({ hem: true, ring: false, rim: 0, glass: 1, eyes: "0.800)" });
    expect(lifting.cloak! - 32).toBeCloseTo(78, 6); // halfway back up
    expect(svg(veilFrame(false, 0.65))).toBe(svg(veilEnd(false)));
    const fading = at(veilFrame(true, 0.15, OFF, true)); // Reduce Motion, halfway
    expect(fading).toMatchObject({ hem: false, ring: false, fade: true, fadeIn: 0.5, eyes: "0.900)" });
    expect(fading.rim).toBeCloseTo(0.95 * 0.5, 3);
  });

  test("the layers come in Avatar.vue's order", () => {
    const t = draw(veilFrame(true, SHIMMER_FROM + 0.3)); // the finale, with the shimmer band
    const outline = (el: El): string =>
      el.children.length ? `${el.tag}[${el.children.map(outline).join(",")}]` : el.tag;
    const motion = find(t, (e) => e.tag === "g" && e.attrs.transform === still.motion.transform)!;
    expect(outline(motion)).toBe(
      "g[g[g[path,path,path],g[path,g[ellipse,rect],path,path],g[path]]]", // squash > base, glass (highlight, band), rim
    );
    const defs = find(t, (e) => e.tag === "defs")!;
    expect(outline(defs)).toBe("defs[clipPath[path],clipPath[rect],clipPath[rect],linearGradient[stop,stop],linearGradient[stop,stop,stop]]");
    expect(t.children[0]!.children.map((e) => e.tag)).toEqual(["g"]); // svg > the Veil's group (defs, then the body)
  });

  test("on: fully cloaked, the light rim, no ring, the glass at 70 %, calm eyes", () => {
    const t = draw(veilEnd(true));
    expect(Number(clipRect(t, "cloak")!.attrs.height)).toBeGreaterThanOrEqual(188);
    expect(Number(rim(t)!.attrs.opacity)).toBeGreaterThan(0.9);
    expect(rim(t)!.attrs["stroke-width"]).toBe("5");
    expect(ring(t)).toBeUndefined();
    const glass = find(layer(t, "glass")!, (e) => e.tag === "path" && (e.attrs.fill ?? "").startsWith("url(#veil-glass"))!;
    expect(Number(glass.attrs["fill-opacity"])).toBeCloseTo(0.7, 9);
    const eyes = all(layer(t, "glass")!).filter((e) => e.tag === "path" && e.attrs.fill === VEIL_PAINT.eye);
    expect(eyes.length).toBe(still.frame.eyes.length);
    for (const e of eyes) expect(e.attrs.transform).toEndWith(" scale(1 0.800)");
  });

  test("Reduce Motion: the layers fade, never wipe, and no ring", () => {
    const t = draw(veilFrame(true, 0.1, OFF, true));
    const glass = layer(t, "glass")!;
    expect(glass.attrs["clip-path"]).toBeUndefined();
    expect(layer(t, "base")!.attrs["clip-path"]).toBeUndefined();
    expect(Number(glass.attrs.opacity) + Number(layer(t, "base")!.attrs.opacity)).toBeCloseTo(1, 9);
    expect(ring(t)).toBeUndefined();
    expect(find(t, (e) => (e.attrs.transform ?? "").startsWith("translate(0 "))).toBeUndefined(); // no squash
  });

  test("under 64 px: the tint and a rim about 1.3 px wide carry the state; no glass or highlight", () => {
    const t = draw(veilEnd(true), 24);
    expect(Number(rim(t)!.attrs["stroke-width"])).toBeCloseTo((2 * 1.3 * 220) / 24, 9);
    expect(find(t, (e) => e.tag === "ellipse")).toBeUndefined();
    expect(find(t, (e) => (e.attrs.fill ?? "").startsWith("url(#veil-glass"))).toBeUndefined();
    expect(find(layer(t, "glass")!, (e) => e.tag === "path")!.attrs.fill).toBe(VEIL_PAINT.veil);
  });

  test("the release's hop and blink draw without the dusk layers", () => {
    const t = draw(veilFrame(false, 0.5));
    expect(find(t, (e) => e.tag === "defs")).toBeUndefined();
    expect(layer(t, "glass")).toBeUndefined();
    expect(find(t, (e) => (e.attrs.transform ?? "").startsWith("translate(0 -"))).toBeDefined(); // stretched up 3.5 %
  });

  test("every reference resolves inside its own SVG, and two pebbles never share ids", () => {
    const html = renderToStaticMarkup(
      <div>
        <PebbleStatic stealth size={240} />
        <PebbleSvg frame={still.frame} motion={still.motion} size={240} veil={veilFrame(true, 0.4)} />
      </div>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const one of html.split("</svg>").slice(0, 2)) {
      const own = new Set([...one.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!));
      const refs = [...one.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!);
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) expect(own.has(r)).toBe(true);
    }
  });

  test("colours: the page's tokens first, then the theme's defaults, then Pebble's light values", () => {
    expect(VEIL_PAINT).toEqual({
      veil: "var(--pebble-veil, var(--_pebble-veil, #44528c))",
      hi: "var(--pebble-veil-hi, var(--_pebble-veil-hi, #7684c6))",
      eye: "var(--pebble-veil-eye, var(--_pebble-veil-eye, #fff))",
      rim: "var(--pebble-veil-rim, var(--_pebble-veil-rim, #d6ddff))",
      glow: "var(--pebble-veil-glow, var(--_pebble-veil-glow, #7d8df2))",
    });
    const html = svg(veilFrame(true, 0.4));
    expect(html).toContain(`stop-color="${VEIL_PAINT.hi}"`);
    expect(html).toContain(`stop-color="${VEIL_PAINT.veil}"`);
    expect(html).toContain('fill="var(--pebble-eye, #ffffff)"'); // the plain pebble below the edge keeps the site's eye
  });

  test("PebbleVeil.module.css carries Pebble 1.1.0's tokens for both themes", () => {
    const css = readFileSync(join(import.meta.dir, "PebbleVeil.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: m[1]!.replace(/@media[^{]*\{/, "").trim(),
      vars: Object.fromEntries([...m[2]!.matchAll(/--_pebble-veil(-\w+)?:\s*([^;]+);/g)].map((v) => [v[1] ?? "", v[2]!.trim()])),
    }));
    const as = (c: typeof VEIL_LIGHT) => ({ "": c.veil, "-hi": c.hi, "-eye": c.eye, "-rim": c.rim, "-glow": c.glow });
    expect(blocks.map((b) => b.selector)).toEqual([
      ".veil",
      ':global(:root[data-theme="dark"]) .veil',
      ":global(:root:not([data-theme])) .veil",
    ]);
    expect(blocks[0]!.vars).toEqual(as(VEIL_LIGHT));
    expect(blocks[1]!.vars).toEqual(as(VEIL_DARK));
    expect(blocks[2]!.vars).toEqual(as(VEIL_DARK));
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:global\(:root:not\(\[data-theme\]\)\) \.veil/);
  });
});

describe("the site's pebbles with `stealth`", () => {
  test("PebbleStatic wears the settled look: a still frame carries ON", () => {
    const t = parse(renderToStaticMarkup(<PebbleStatic stealth size={240} />));
    expect(find(t, (e) => e.tag === "svg")!.attrs).toMatchObject({ "data-stealth": "on", "data-animated": "false" });
    expect(Number(clipRect(t, "cloak")!.attrs.height)).toBeGreaterThanOrEqual(188);
    expect(Number(rim(t)!.attrs.opacity)).toBeGreaterThan(0.9);
    expect(noIds(renderToStaticMarkup(<PebbleStatic stealth size={240} />))).toBe(
      noIds(renderToStaticMarkup(<PebbleSvg frame={still.frame} motion={still.motion} still size={240} pose="idle" veil={veilEnd(true)} />)),
    );
  });

  test("PebbleLive starts on the same static frame, Veil included, so the swap moves nothing", () => {
    for (const stealth of [true, false]) {
      const live = renderToStaticMarkup(<PebbleLive stealth={stealth} size={240} />);
      const fixed = renderToStaticMarkup(<PebbleStatic stealth={stealth} size={240} />);
      expect(live).toMatch(/^<div aria-hidden="true" data-mode="still"/);
      const inner = live.replace(/^<div[^>]*>/, "").replace(/<\/div>$/, "");
      expect(noIds(inner).replace(/ width="100%" height="100%"/, "")).toBe(noIds(fixed).replace(/ width="240" height="240"/, ""));
    }
  });

  test("Pebble server-renders the static frame with the Veil; without `stealth`, nothing changes", () => {
    expect(noIds(renderToStaticMarkup(<Pebble stealth size={240} name="stealth" />))).toBe(
      noIds(renderToStaticMarkup(<PebbleStatic stealth size={240} />)),
    );
    expect(renderToStaticMarkup(<Pebble size={240} />)).not.toContain("data-stealth");
    expect(renderToStaticMarkup(<PebbleLive size={240} />)).not.toContain("data-stealth");
  });
});
