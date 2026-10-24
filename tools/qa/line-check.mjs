// tools/qa/line-check.mjs: does the pebble's ground ever run through text?
//
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-line node tools/qa/line-check.mjs [--run=NAME]
//      [--widths=320,390,768,1024,1440,1920] [--motion=on,reduced] [--paths=/]
//
// The line is local ground now (DESIGN-LEXINGTON §3.9), not one page-wide path: every <Horizon>
// (src/components/ui/Horizon.tsx, svg[data-horizon="line"|"arch"]) is drawn where something stands on it. The check
// takes every horizon the page draws, so a new one is checked without a change here. On the home page they include the
// hero's ground, the project story's rail and the permission dial's arch. The footer's ground is in the root layout, so
// it is on every page.
//
// For each width × motion: load the page and scroll through it (lazy media loads, the reveals finish). Then take every
// horizon that is on screen and sample each of its paths about every 2 px. The points are mapped through the path's
// own screen matrix (getScreenCTM), because a Horizon stretches its viewBox (preserveAspectRatio="none"). Points that
// an ancestor's overflow clips away are skipped, since they are not drawn. Each point is tested against the boxes of
// every line of visible text (Range.getClientRects over the text nodes, 1 px of slack) and, as a softer check, of
// product media (img and video in figures). The faded ends count: a line that fades out over text still crosses it, so
// each hit says where along its horizon it falls. Pebbles and stones are drawings, not text, so the ground may pass
// under them by design. So may the footer's giant wordmark: its letters are generated content (Footer.module.css), with
// no text node, and they stand on that ground. A point inside a text box is a collision. Each is reported with the
// text it hits and a viewport screenshot centred on it (.work/qa/screens/<run>/line-*.png).
//
// Exit 1 on any text collision. Also exit 1 when there is nothing to check: a page with no horizon on screen, no text
// box, or a horizon none of whose points is drawn. A horizon whose screen matrix misses its own box by more than 2 px
// fails too, because its points would be misplaced. A check that finds nothing must not pass.
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
let problems = 0;
const report = [];

async function check(base, pagePath, width, motion) {
  const { page } = await openPage(base, pagePath, { width, theme: "light", motion });
  await sleep(800);
  await scrollThrough(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(600);
  const found = await page.evaluate(() => {
    /** An element's box as drawn, in page coordinates: clipped by every ancestor that hides its overflow and by the
     *  page's width. Null when nothing of it is left. */
    const drawnBox = (el) => {
      const r0 = el.getBoundingClientRect();
      let r = { left: r0.left, top: r0.top, right: r0.right, bottom: r0.bottom };
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const c = a.getBoundingClientRect();
        r = { left: Math.max(r.left, c.left), top: Math.max(r.top, c.top), right: Math.min(r.right, c.right), bottom: Math.min(r.bottom, c.bottom) };
      }
      r = { left: Math.max(r.left, 0), top: r.top, right: Math.min(r.right, innerWidth), bottom: r.bottom };
      if (r.right - r.left < 1 || r.bottom - r.top < 1) return null;
      return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY };
    };
    const shown = (el) =>
      el.getClientRects().length > 0 &&
      (typeof el.checkVisibility !== "function" || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));

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
      .map((el) => ({ box: drawnBox(el), text: el.getAttribute("alt")?.slice(0, 50) || el.tagName }))
      .filter((m) => m.box && m.box.r - m.box.l > 4 && m.box.b - m.box.t > 4)
      .map((m) => ({ ...m.box, text: m.text }));

    // the horizons on screen, each sampled along its own paths
    const horizons = [];
    const hits = new Map();
    const soft = new Map();
    for (const svg of document.querySelectorAll("svg[data-horizon]")) {
      if (!shown(svg)) continue;
      const box = drawnBox(svg);
      if (!box) continue; // clipped away entirely: nothing of it is drawn
      const own = svg.getBoundingClientRect();
      const section = svg.closest("section[id]");
      const place = section ? section.id : svg.closest("footer") ? "footer" : svg.closest("header") ? "header" : "page";
      const h = { place, kind: svg.getAttribute("data-horizon"), width: Math.round(own.width), samples: 0, matrixOff: 0 };
      horizons.push(h);
      // the screen matrix must put the viewBox's corner on the box's corner, or every point below is misplaced
      const vb = svg.viewBox.baseVal;
      const svgCtm = svg.getScreenCTM();
      if (vb && svgCtm) {
        const o = new DOMPoint(vb.x, vb.y).matrixTransform(svgCtm);
        h.matrixOff = Math.round(Math.max(Math.abs(o.x - own.left), Math.abs(o.y - own.top)) * 10) / 10;
      }
      // only the text and media near this horizon can be hit
      const near = (b) => b.r >= box.l - 2 && b.l <= box.r + 2 && b.b >= box.t - 2 && b.t <= box.b + 2;
      const nearText = boxes.filter(near);
      const nearMedia = media.filter(near);
      for (const p of svg.querySelectorAll("path")) {
        const len = p.getTotalLength();
        const ctm = p.getScreenCTM();
        if (!ctm || !(len > 0)) continue;
        // about 2 px on screen along the more stretched axis (the viewBox is stretched to the box's size)
        const scale = Math.max(Math.hypot(ctm.a, ctm.b), Math.hypot(ctm.c, ctm.d));
        const step = Math.max(len / 20000, 2 / scale);
        for (let s = 0; s <= len; s += step) {
          const pt = p.getPointAtLength(s);
          const q = new DOMPoint(pt.x, pt.y).matrixTransform(ctm);
          const x = q.x + scrollX;
          const y = q.y + scrollY;
          if (x < box.l || x > box.r || y < box.t || y > box.b) continue; // clipped: not drawn
          h.samples++;
          const along = Math.round(((q.x - own.left) / own.width) * 100);
          for (const b of nearText) {
            if (x >= b.l && x <= b.r && y >= b.t && y <= b.b) {
              const key = `${b.text}@${Math.round(b.t)}`;
              if (!hits.has(key)) hits.set(key, { text: b.text, x: Math.round(x), y: Math.round(y), place, kind: h.kind, along });
            }
          }
          for (const b of nearMedia) {
            if (x >= b.l + 2 && x <= b.r - 2 && y >= b.t + 2 && y <= b.b - 2) {
              const key = `${b.text}@${Math.round(b.t)}`;
              if (!soft.has(key)) soft.set(key, { text: b.text, x: Math.round(x), y: Math.round(y), place });
            }
          }
        }
      }
    }
    return { horizons, textBoxes: boxes.length, hits: [...hits.values()], soft: [...soft.values()] };
  });

  const tag = `${pagePath === "/" ? "home" : pagePath.replace(/\W+/g, "")}-${width}-${motion}`;
  const grounds = found.horizons.map((h) => `${h.place} ${h.kind} ${h.width} px`).join(", ") || "none";
  console.log(
    `${tag}: ${found.horizons.length} horizon(s) (${grounds}), ${found.textBoxes} text boxes, ${found.hits.length} text collision(s), ${found.soft.length} media crossing(s)`,
  );
  // nothing to check is a failure, never a pass
  const empty = [];
  if (found.horizons.length === 0) empty.push("no horizon on screen (svg[data-horizon]): the page has no ground to check");
  if (found.textBoxes === 0) empty.push("no visible text found: the page did not render");
  for (const h of found.horizons) {
    if (h.samples === 0) empty.push(`the ${h.place} ${h.kind} horizon has no drawn point`);
    if (h.matrixOff > 2) empty.push(`the ${h.place} ${h.kind} horizon's screen matrix is ${h.matrixOff} px off its box`);
  }
  for (const e of empty) console.log(`  ERROR ${e}`);
  problems += empty.length;
  for (const [i, h] of found.hits.entries()) {
    console.log(`  TEXT  y=${h.y} x=${h.x}  ${h.place} ${h.kind}, ${h.along} % along it  "${h.text}"`);
    await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - innerHeight / 2), behavior: "instant" }), h.y);
    await sleep(350);
    await page.screenshot({ path: path.join(OUT, `line-${tag}-${String(i + 1).padStart(2, "0")}.png`) });
  }
  for (const s of found.soft) console.log(`  media y=${s.y} x=${s.x}  ${s.place}  ${s.text}`);
  collisions += found.hits.length;
  report.push({ tag, ...found, problems: empty });
  await page.close();
}

try {
  const base = await startServer(`next-start-line-${RUN}.log`);
  await launch();
  for (const p of PATHS) for (const w of WIDTHS) for (const m of MOTIONS) await check(base, p, w, m);
} catch (error) {
  console.error(error);
  problems++;
} finally {
  await cleanup();
}
writeFileSync(path.join(OUT, "report-line.json"), JSON.stringify(report, null, 2));
console.log(`SUMMARY: ${collisions} text collision(s), ${problems} problem(s) → ${OUT}`);
process.exit(collisions || problems ? 1 : 0);
