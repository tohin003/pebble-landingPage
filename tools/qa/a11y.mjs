// tools/qa/a11y.mjs: axe-core (pinned in tools/qa/package.json) on the built site, MASTER_PLAN §9.2 / §7.7:
// 0 violations in light and dark, at the top of the page, mid-page (the sticky call to action showing) and after a full
// scroll, plus the open states: the phone menu, the download notice, an open FAQ answer, the honesty stamp's details
// and, when the film exists, the film theatre.
//
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-a11y node tools/qa/a11y.mjs [--run=NAME]
//      [--paths=/,/film,/credits,/privacy,/no-such-page] [--widths=320,390,1024,1440] [--themes=light,dark]
//      [--motion=on,reduced]
//
// Uses the last `next build` (tools/qa/shot.mjs builds). Rules: the WCAG 2.0/2.1/2.2 A and AA tags plus axe's
// best-practice set. "incomplete" results (axe couldn't decide, usually text over an image) are listed for a human
// look but don't fail the run. Report: .work/qa/a11y/<run>.json. Exit 1 when any violation is found.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { HERE, REPO, cleanup, launch, list, openPage, opt, scrollThrough, sleep, startServer } from "./lib.mjs";

const AXE = readFileSync(path.join(HERE, "node_modules", "axe-core", "axe.min.js"), "utf8");
const RUN = opt("run", new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19));
const PATHS = list(opt("paths", "/,/film,/credits,/privacy,/no-such-page"));
const WIDTHS = list(opt("widths", "390,1440")).map(Number);
const THEMES = list(opt("themes", "light,dark"));
const MOTIONS = list(opt("motion", "on"));
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];
const OUT = path.join(REPO, ".work", "qa", "a11y");
mkdirSync(OUT, { recursive: true });

async function axe(page) {
  await page.evaluate(AXE); // CDP evaluation: the page's CSP doesn't apply
  return page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
    const slim = (items) =>
      items.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 240), summary: (n.failureSummary || "").slice(0, 400) })),
      }));
    return { violations: slim(r.violations), incomplete: slim(r.incomplete) };
  }, TAGS);
}

/**
 * Text contrast with the decorative layers set aside. The pebble's path is one SVG behind the whole page, and the hero
 * has a grain and glow backdrop: axe sees "an image node" behind every text and leaves contrast undecided
 * ("incomplete"). Both are aria-hidden decoration (a 1.35 px line, a 0.5-opacity grain), so this pass hides them, runs
 * only the color-contrast rule, and puts them back.
 */
async function contrast(page) {
  await page.evaluate(() => {
    window.__hidden = [];
    const hide = (el) => {
      window.__hidden.push([el, el.style.visibility]);
      el.style.visibility = "hidden";
    };
    const path = document.querySelector("svg[data-pebble-path]");
    if (path) hide(path);
    for (const el of document.querySelectorAll('[aria-hidden="true"]')) {
      const cs = getComputedStyle(el);
      if ((cs.position === "absolute" || cs.position === "fixed") && !el.textContent.trim() && !el.querySelector("svg[data-pose], img")) hide(el);
    }
  });
  const r = await page.evaluate(async () => {
    const out = await window.axe.run(document, { runOnly: { type: "rule", values: ["color-contrast"] }, resultTypes: ["violations", "incomplete"] });
    const slim = (items) =>
      items.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 240), summary: (n.failureSummary || "").slice(0, 400) })),
      }));
    return { violations: slim(out.violations), incomplete: slim(out.incomplete) };
  });
  await page.evaluate(() => {
    for (const [el, v] of window.__hidden ?? []) el.style.visibility = v;
    window.__hidden = [];
  });
  return r;
}

const report = [];
let violations = 0;

async function scan(page, label, meta) {
  const r = await axe(page);
  const c = await contrast(page);
  r.contrast = c;
  // the contrast pass decides what the full pass left undecided
  r.violations.push(...c.violations.map((v) => ({ ...v, id: `${v.id} (decoration hidden)` })));
  r.incomplete = r.incomplete.filter((v) => v.id !== "color-contrast").concat(c.incomplete.map((v) => ({ ...v, id: `${v.id} (decoration hidden)` })));
  const count = r.violations.reduce((n, v) => n + v.nodes.length, 0);
  violations += count;
  report.push({ ...meta, state: label, ...r });
  const undecided = r.incomplete.reduce((n, v) => n + v.nodes.length, 0);
  console.log(`${meta.path} ${meta.width} ${meta.theme} ${meta.motion} ${label}: ${count ? `${count} VIOLATION node(s)` : "0 violations"}, ${undecided} undecided node(s)`);
  for (const v of r.incomplete) for (const n of v.nodes.slice(0, 4)) console.log(`  ? ${v.id}: ${n.target}  ${n.summary.split("\n").slice(-1)[0].slice(0, 110)}`);
  for (const v of r.violations) {
    console.log(`  ${v.impact} ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 6)) console.log(`    ${n.target}  ${n.html.slice(0, 120)}`);
  }
}

const clickFirstVisible = (page, selector) =>
  page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    el.click();
    return true;
  }, selector);

try {
  const base = await startServer(`next-start-a11y-${RUN}.log`);
  await launch();
  for (const pagePath of PATHS)
    for (const width of WIDTHS)
      for (const theme of THEMES)
        for (const motion of MOTIONS) {
          const meta = { path: pagePath, width, theme, motion };
          const { page, problems } = await openPage(base, pagePath, { width, theme, motion });
          await sleep(1500);
          await scan(page, "top", meta);
          if (pagePath === "/") {
            // mid-page: the sticky call to action is showing
            await page.evaluate(() => document.getElementById("project")?.scrollIntoView({ block: "start", behavior: "instant" }));
            await sleep(700);
            await scan(page, "mid-page (sticky CTA)", meta);
            // open states
            if (width < 1024 && (await clickFirstVisible(page, 'header button[aria-haspopup="dialog"]'))) {
              await sleep(400);
              await scan(page, "phone menu open", meta);
              await page.keyboard.press("Escape");
              await sleep(300);
            }
            if (await clickFirstVisible(page, '#top a[data-cta="download"]')) {
              await sleep(400);
              await scan(page, "download notice open", meta);
            }
            await page.evaluate(() => {
              const d = document.querySelector("#faq details");
              if (d) d.open = true;
            });
            await sleep(300);
            await scan(page, "FAQ answer open", meta);
            if ((await page.evaluate(() => document.documentElement.dataset.film)) === "ready") {
              if (await clickFirstVisible(page, '#film button[aria-label="Play the film"]')) {
                await sleep(800);
                await scan(page, "film theatre open", meta);
                await page.keyboard.press("Escape");
                await sleep(300);
              }
            }
          }
          await scrollThrough(page);
          await sleep(600);
          await page.evaluate(() => {
            for (const d of document.querySelectorAll("footer details")) d.open = true;
          });
          await sleep(300);
          await scan(page, "after a full scroll (footer details open)", meta);
          const errs = [...problems.console.filter((c) => c.startsWith("error")), ...problems.pageErrors, ...problems.failed];
          if (errs.length) console.log(`  page problems: ${errs.join(" | ")}`);
          await page.close();
        }
} catch (error) {
  console.error(error);
  violations = Math.max(violations, 1);
} finally {
  await cleanup();
}
writeFileSync(path.join(OUT, `${RUN}.json`), JSON.stringify(report, null, 2));
console.log(`SUMMARY: ${report.length} scan(s), ${violations} violation node(s) → .work/qa/a11y/${RUN}.json`);
process.exit(violations ? 1 : 0);
