// The footer's hint of the coming feature (src/content/next.ts; D157, OVERRIDES §62; POSTCREDIT_DESIGN §4, checks C13
// and C15). It renders only through its gate and adds nothing else to the footer; it sits right under "Pebble is
// resting." / "No telemetry." and before the colophon; a screen reader meets it as plain text (never aria-hidden, a
// heading, a live region or a control); its only picture is the sleeping pebble, the site engine's still frame of the
// Companion's resting pose; and its styles use the theme's tokens and no motion. Each check fails on a planted canary
// first. The hint's words and its gate logic are checked in src/content/next.test.ts.
// Run: bun test ./src/components/shell
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { footer } from "@/content/copy";
import { comingNext, comingNextShown } from "@/content/next";
import { firstSentence } from "@/components/ui/twoTone";
import { Footer } from "./Footer";

/** Text as React writes it into markup (escaped). */
const html = (text: string) => renderToStaticMarkup(<>{text}</>);
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HINT = `<span>${html(comingNext.lead)}</span> <span>${html(comingNext.limit)}</span>`;
/** The hint's paragraph: a plain <p> (a class at most: no role, no aria) holding exactly the two spans. */
const HINT_P = new RegExp(`<p(?: class="[^"]*")?>${escapeRe(HINT)}</p>`);
/** The colophon's link list, the first thing after the resting block. */
const NAV = new RegExp(`<nav\\b[^>]*\\baria-label="${escapeRe(footer.navLabel)}"`);
const STATEMENT_END = `<span>${html(firstSentence(footer.resting)[1])}</span></p>`;

const open = renderToStaticMarkup(<Footer nextShown />);
const closed = renderToStaticMarkup(<Footer nextShown={false} />);

/** The hint's paragraph follows the statement's directly, ends the resting block, and comes before the colophon. */
function inPlace(markup: string): boolean {
  const at = markup.indexOf(HINT);
  const nav = markup.search(NAV);
  return new RegExp(`${escapeRe(STATEMENT_END)}${HINT_P.source}</div>`).test(markup) && at >= 0 && nav > at;
}

type Element = { name: string; attrs: string };
const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
const TAG = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[^\s"'>\/=]+(?:="[^"]*")?)*)\s*(\/?)>/g;

/** The elements open around the first place `needle` occurs in well-formed static markup (null: it doesn't occur). */
function ancestors(markup: string, needle: string): Element[] | null {
  const at = markup.indexOf(needle);
  if (at < 0) return null;
  const stack: Element[] = [];
  for (const [, closing, name = "", attrs = "", selfClosing] of markup.slice(0, at).matchAll(TAG)) {
    const tag = name.toLowerCase();
    if (closing) {
      const i = stack.map((element) => element.name).lastIndexOf(tag);
      if (i >= 0) stack.length = i;
    } else if (!selfClosing && !VOID.test(tag)) stack.push({ name: tag, attrs });
  }
  return stack;
}

/** What would keep a screen reader from meeting `needle` as plain text in the reading order, or make it more. */
function readingProblems(markup: string, needle: string): string[] {
  const around = ancestors(markup, needle);
  if (!around) return ["not rendered"];
  const problems: string[] = [];
  for (const { name, attrs } of around) {
    if (/\baria-hidden="true"/.test(attrs)) problems.push(`inside an aria-hidden <${name}>`);
    if (/(^|\s)(hidden|inert)(=|\s|$)/.test(attrs)) problems.push(`inside a hidden or inert <${name}>`);
    if (/^h[1-6]$/.test(name) || /\brole="heading"/.test(attrs)) problems.push(`inside a heading <${name}>`);
    if (/\baria-live=|\brole="(status|alert|log|marquee|timer)"/.test(attrs)) problems.push(`inside a live region <${name}>`);
    if (/^(a|button|summary|label|select|textarea)$/.test(name) || /\btabindex=/.test(attrs)) problems.push(`inside a control <${name}>`);
  }
  if (around.at(-1)?.name !== "p") problems.push(`not its own paragraph (in <${around.at(-1)?.name}>)`);
  return problems;
}

/** The resting block: the footer's markup before the colophon's links (the wordmark, the pebble, the statement, the hint). */
const restingBlock = (markup: string) => markup.slice(0, markup.search(NAV));
/** Its visible text: tags out, entities decoded roughly. */
const textOf = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

describe("the gate (C13): only through comingNextShown, and nothing else changes", () => {
  test("closed: no trace of the hint; open: the hint once", () => {
    expect(closed).not.toContain(html(comingNext.lead));
    expect(closed).not.toContain(html(comingNext.limit));
    expect(open.split(HINT).length - 1).toBe(1);
  });

  test("the canary: the page as it stands at 1.5.0 doesn't show it", () => {
    const at150 = renderToStaticMarkup(<Footer nextShown={comingNextShown("1.5.0")} />);
    expect(at150).not.toContain(html(comingNext.lead));
    expect(at150).toBe(closed);
    const at200 = renderToStaticMarkup(<Footer nextShown={comingNextShown("2.0.0")} />);
    expect(at200).toBe(open);
  });

  test("by default the release facts decide", () => {
    expect(renderToStaticMarkup(<Footer />).includes(HINT)).toBe(comingNextShown());
  });

  test("the hint adds one paragraph and nothing else", () => {
    expect(open.match(HINT_P)).not.toBeNull();
    expect(open.replace(HINT_P, "")).toBe(closed);
  });
});

describe("its place: right under the statement, before the colophon (POSTCREDIT_DESIGN §4.1)", () => {
  test("the canaries: the hint before the statement, or in the colophon, is out of place", () => {
    const hint = open.match(HINT_P)![0];
    const statement = open.match(/<p class="display-3 two-tone[^"]*">[\s\S]*?<\/p>/)![0];
    const before = open.replace(hint, "").replace(statement, `${hint}${statement}`);
    expect(inPlace(before)).toBe(false);
    const nav = open.match(NAV)![0];
    const inColophon = open.replace(hint, "").replace(nav, `${hint}${nav}`);
    expect(inColophon).toContain(HINT);
    expect(inPlace(inColophon)).toBe(false);
  });

  test("the hint is in its place", () => {
    expect(open.search(NAV)).toBeGreaterThan(0);
    expect(inPlace(open)).toBe(true);
  });

  test("no number, version or date in the resting block's text, which is the statement and the hint", () => {
    const text = textOf(restingBlock(open));
    expect(text).toBe(`${footer.resting} ${comingNext.lead} ${comingNext.limit}`);
    expect(text).not.toMatch(/\d/);
  });
});

describe("what a screen reader meets (C15): the hint as plain text", () => {
  test("the canaries: hidden, a heading, a live region or a link are caught", () => {
    const hint = open.match(HINT_P)![0];
    const wrap = (before: string, after: string) => open.replace(hint, `${before}${hint}${after}`);
    expect(readingProblems(wrap('<div aria-hidden="true">', "</div>"), HINT).length).toBeGreaterThan(0);
    expect(readingProblems(wrap("<div hidden>", "</div>"), HINT).length).toBeGreaterThan(0);
    expect(readingProblems(wrap("<h2>", "</h2>"), HINT).length).toBeGreaterThan(0);
    expect(readingProblems(wrap('<div aria-live="polite">', "</div>"), HINT).length).toBeGreaterThan(0);
    expect(readingProblems(wrap('<a href="/next">', "</a>"), HINT).length).toBeGreaterThan(0);
    expect(readingProblems(closed, HINT)).toEqual(["not rendered"]);
  });

  test("the hint passes: in the footer, in the resting block, in its own paragraph", () => {
    expect(readingProblems(open, HINT)).toEqual([]);
    expect(ancestors(open, HINT)!.map((element) => element.name)).toEqual(["footer", "div", "div", "p"]);
  });

  test("the wordmark and the sleeping pebble stay decoration, outside the hint", () => {
    expect(readingProblems(open, 'data-pose="sleepy"')).toContain('inside an aria-hidden <div>');
  });
});

describe("the only picture is the sleeping pebble: the engine's resting pose, as a still", () => {
  test("one pebble, in the resting pose, with its z's, a still frame in the theme's colours", () => {
    expect(open.match(/data-pose="/g)?.length).toBe(1);
    expect(open).toContain('data-pose="sleepy"');
    expect(open).toContain('data-animated="false"');
    // the resting pose's cue: the two small z's (shared/pebble avatarMotion, cue "sleep"), drawn as PebbleSvg draws it
    expect(open).toContain('d="M 39 -65 h 9 l -9 9 h 9 M 52 -77 h 7 l -7 7 h 7"');
    expect(open).toContain("color:var(--pebble, #536b54)");
    expect(open).toContain('fill="var(--pebble-eye, #ffffff)"');
  });

  test("no mock screen: no image, video, canvas or frame in the resting block", () => {
    expect(restingBlock(open)).not.toMatch(/<(img|picture|video|canvas|iframe|object|embed)\b/);
    expect(restingBlock(`${open}`.replace(HINT, `${HINT}<img src="/next.png" alt="">`))).toMatch(/<img\b/); // the canary
  });
});

/** Problems with the hint's rules in a CSS text: colours from the theme's tokens only, no motion, not display type. */
function cssProblems(css: string): string[] {
  const problems: string[] = [];
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector = "", body = ""] of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\.coming\b/.test(selector)) continue;
    for (const [, property = "", value = ""] of body.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)) {
      if (/color|background|border|fill|stroke|shadow/.test(property) && !/^var\(--ink(-2)?\)$/.test(value.trim()))
        problems.push(`${selector.trim()} ${property}: ${value.trim()} (not --ink or --ink-2)`);
      if (/#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i.test(value)) problems.push(`${property}: a colour that isn't a token`);
      if (/^(animation|transition)/.test(property)) problems.push(`${property}: motion`);
      if (property === "font-family") problems.push("font-family: the hint is in the body voice");
      if (property === "font-weight" && !/^(400|500)$/.test(value.trim())) problems.push(`font-weight: ${value.trim()}`);
    }
  }
  return problems;
}

describe("its styles: the theme's tokens, the body voice, no motion (POSTCREDIT_DESIGN §4.4)", () => {
  const css = readFileSync(path.join(import.meta.dir, "Footer.module.css"), "utf8");

  test("the canaries: a raw colour, a transition, display type or a heavy weight are caught", () => {
    expect(cssProblems(".coming { color: #1d2520; }").length).toBeGreaterThan(0);
    expect(cssProblems(".coming > span { color: rgb(29, 37, 32); }").length).toBeGreaterThan(0);
    expect(cssProblems(".coming { transition: opacity 0.3s; }").length).toBeGreaterThan(0);
    expect(cssProblems(".coming { animation: rise 1s; }").length).toBeGreaterThan(0);
    expect(cssProblems(".coming { font-family: var(--font-display); }").length).toBeGreaterThan(0);
    expect(cssProblems(".coming span { font-weight: 650; }").length).toBeGreaterThan(0);
  });

  test("the hint's rules pass, and they exist", () => {
    expect(css).toMatch(/\.coming\s*\{/);
    expect(css).toMatch(/\.coming > span:first-child\s*\{/);
    expect(cssProblems(css)).toEqual([]);
    expect(css).not.toMatch(/@keyframes/);
  });
});
