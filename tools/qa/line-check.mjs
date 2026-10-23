// tools/qa/line-check.mjs: does the pebble's path (docs/DESIGN.md §2) ever run through text?
//
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-line node tools/qa/line-check.mjs [--run=NAME]
//      [--widths=320,390,768,1024,1440,1920] [--motion=on,reduced] [--paths=/]
//
// For each width × motion: load the page, scroll through it (lazy images load, the line is rebuilt from the final
// layout), then sample every piece of the line every 2 px (SVG getPointAtLength, in page coordinates) and test each
// point against the boxes of every line of visible text (Range.getClientRects over the text nodes, 1 px of slack) and,
// as a softer check, of product media (img, video, svg pictures in figures). Decorative pebbles are not obstacles: the
// line passes under them by design. A point inside a text box is a collision; each is reported with the text it hits
// and a viewport screenshot centred on it (.work/qa/screens/<run>/line-*.png). Exit 1 on any text collision.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO, cleanup, launch, list, openPage, opt, scrollThrough, sleep, startServer } from "./lib.mjs";

const RUN = opt("run", new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19));
const WIDTHS = list(opt("widths", "320,390,768,1024,1440,1920")).map(Number);
const MOTIONS = list(opt("motion", "on,reduced"));
const PATHS = list(opt("paths", "/"));
const OUT = path.join(REPO, ".work", "qa", "screens", RUN);
mkdirSync(OUT, { recursive: true });

let collisions = 0;
const report = [];

async function check(base, pagePath, width, motion) {
  const { page } = await openPage(base, pagePath, { width, theme: "light", motion });
  await sleep(800);
  await scrollThrough(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(900); // the path rebuilds 140 ms after the last resize or load
  const found = await page.evaluate(() => {
    const svg = document.querySelector("svg[data-pebble-path]");
    if (!svg || svg.getAttribute("data-pebble-path") !== "ready") return { state: svg?.getAttribute("data-pebble-path") ?? "missing", hits: [], soft: [] };
    const host = svg.parentElement.getBoundingClientRect();
    const ox = host.left + scrollX;
    const oy = host.top + scrollY;
    // every visible line of text, in page coordinates
    const boxes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const el = node.parentElement;
        if (!el || el.closest("svg, script, style, noscript, template, dialog:not([open])")) return NodeFilter.FILTER_REJECT;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return NodeFilter.FILTER_REJECT;
        if (el.closest(".sr-only") || el.closest('[class*="sr-only"]')) return NodeFilter.FILTER_REJECT;
        // a closed <details> shows only its summary
        const details = el.closest("details");
        if (details && !details.open && !el.closest("summary")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(n);
      // inside a fixed or sticky ancestor (header, sticky call to action): not part of the page's flow; and the
      // boxes of ancestors that clip their overflow (a scrolling command or diff shows only part of its text)
      const el = n.parentElement;
      let fixed = false;
      const clips = [];
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === "fixed" || cs.position === "sticky") {
          fixed = true;
          break;
        }
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") clips.push(a.getBoundingClientRect());
      }
      if (fixed) continue;
      for (const r0 of range.getClientRects()) {
        let r = { left: r0.left, top: r0.top, right: r0.right, bottom: r0.bottom };
        for (const c of clips) r = { left: Math.max(r.left, c.left), top: Math.max(r.top, c.top), right: Math.min(r.right, c.right), bottom: Math.min(r.bottom, c.bottom) };
        r = { left: Math.max(r.left, 0), top: r.top, right: Math.min(r.right, innerWidth), bottom: r.bottom }; // on the page
        if (r.right - r.left < 2 || r.bottom - r.top < 2) continue;
        boxes.push({ l: r.left + scrollX - 1, t: r.top + scrollY - 1, r: r.right + scrollX + 1, b: r.bottom + scrollY + 1, text: n.nodeValue.trim().slice(0, 60) });
      }
    }
    // product media: pictures and videos in figures (soft)
    const media = [...document.querySelectorAll("main figure img, main figure video, main picture img")]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
      .map((el) => {
        // what is actually shown: clipped by ancestors that hide their overflow (crops) and by the page's width
        let r = el.getBoundingClientRect();
        r = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const c = a.getBoundingClientRect();
          r = { left: Math.max(r.left, c.left), top: Math.max(r.top, c.top), right: Math.min(r.right, c.right), bottom: Math.min(r.bottom, c.bottom) };
        }
        r = { left: Math.max(r.left, 0), top: r.top, right: Math.min(r.right, innerWidth), bottom: r.bottom };
        return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, text: el.getAttribute("alt")?.slice(0, 50) || el.tagName };
      })
      .filter((b) => b.r - b.l > 4 && b.b - b.t > 4);
    const hits = new Map();
    const soft = new Map();
    for (const p of svg.querySelectorAll("path")) {
      const len = p.getTotalLength();
      for (let s = 0; s <= len; s += 2) {
        const pt = p.getPointAtLength(s);
        const x = pt.x + ox;
        const y = pt.y + oy;
        for (const b of boxes) {
          if (x >= b.l && x <= b.r && y >= b.t && y <= b.b) {
            const key = `${b.text}@${Math.round(b.t)}`;
            if (!hits.has(key)) hits.set(key, { text: b.text, x: Math.round(x), y: Math.round(y) });
          }
        }
        for (const b of media) {
          if (x >= b.l + 2 && x <= b.r - 2 && y >= b.t + 2 && y <= b.b - 2) {
            const key = `${b.text}@${Math.round(b.t)}`;
            if (!soft.has(key)) soft.set(key, { text: b.text, x: Math.round(x), y: Math.round(y) });
          }
        }
      }
    }
    return { state: "ready", textBoxes: boxes.length, hits: [...hits.values()], soft: [...soft.values()] };
  });
  const tag = `${pagePath === "/" ? "home" : pagePath.replace(/\W+/g, "")}-${width}-${motion}`;
  console.log(`${tag}: path ${found.state}, ${found.textBoxes ?? 0} text boxes, ${found.hits.length} text collision(s), ${found.soft.length} media crossing(s)`);
  for (const [i, h] of found.hits.entries()) {
    console.log(`  TEXT  y=${h.y} x=${h.x}  "${h.text}"`);
    await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - innerHeight / 2), behavior: "instant" }), h.y);
    await sleep(350);
    await page.screenshot({ path: path.join(OUT, `line-${tag}-${String(i + 1).padStart(2, "0")}.png`) });
  }
  for (const s of found.soft) console.log(`  media y=${s.y} x=${s.x}  ${s.text}`);
  collisions += found.hits.length;
  report.push({ tag, ...found });
  await page.close();
}

try {
  const base = await startServer(`next-start-line-${RUN}.log`);
  await launch();
  for (const p of PATHS) for (const w of WIDTHS) for (const m of MOTIONS) await check(base, p, w, m);
} catch (error) {
  console.error(error);
  collisions++;
} finally {
  await cleanup();
}
writeFileSync(path.join(OUT, "report-line.json"), JSON.stringify(report, null, 2));
console.log(`SUMMARY: ${collisions} text collision(s) → ${OUT}`);
process.exit(collisions ? 1 : 0);
