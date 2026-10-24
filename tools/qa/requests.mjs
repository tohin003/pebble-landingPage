// tools/qa/requests.mjs: privacy, budgets and links on the built site (MASTER_PLAN §9.2, §7.7).
//
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-requests node tools/qa/requests.mjs [--run=NAME]
//      [--widths=390,1440] [--themes=light] [--no-external]
//
// For each width × theme, on the home page:
//   - every request is same-origin (data: and blob: allowed); no cookie is set (document.cookie, the browser's cookie
//     jar and Set-Cookie headers); zero console errors, page errors and failed requests;
//   - before any interaction (load, then 5 s of idle time, which includes the teaser's idle-time start): the transfer
//     size of all JavaScript (gzip, as served by `next start`) ≤ 150 KB target / 200 KB limit, and of everything
//     ≤ 400 KB target / 600 KB limit;
//   - after a slow full scroll (lazy images, posters and loops): everything ≤ 8 MB target / 12 MB limit.
// Then a link crawl over /, /film, /credits, /privacy and the 404 page: every same-origin href/src/srcset answers
// 200, every #fragment exists on its page, and (unless --no-external) every external link answers 2xx/3xx, asked at
// most once a second.
// Report: .work/qa/requests/<run>.json. Exit 1 when a hard limit or a privacy rule fails.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO, cleanup, flag, launch, list, openPage, opt, sleep, startServer } from "./lib.mjs";

const RUN = opt("run", new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19));
const WIDTHS = list(opt("widths", "390,1440")).map(Number);
const THEMES = list(opt("themes", "light"));
const OUT = path.join(REPO, ".work", "qa", "requests");
mkdirSync(OUT, { recursive: true });
const KB = 1024;

const report = { run: RUN, sessions: [], links: [] };
let hardFail = 0;
const line = (s) => console.log(s);

async function measure(base, width, theme) {
  const { page, problems } = await openPage(base, "/", { width, theme, motion: "on" });
  // CDP: transfer sizes per request (encodedDataLength), from the very first request (reload with the session open)
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.clearBrowserCache");
  const requests = new Map();
  let phase = "before";
  const setCookies = [];
  cdp.on("Network.requestWillBeSent", (e) => {
    requests.set(e.requestId, { url: e.request.url, type: e.type ?? "", phase, bytes: 0, status: 0 });
  });
  cdp.on("Network.responseReceived", (e) => {
    const r = requests.get(e.requestId);
    if (r) {
      r.status = e.response.status;
      r.type = e.type ?? r.type;
      r.encoding = e.response.headers["content-encoding"] ?? e.response.headers["Content-Encoding"] ?? "";
    }
    const sc = e.response.headers["set-cookie"] ?? e.response.headers["Set-Cookie"];
    if (sc) setCookies.push(`${e.response.url}: ${sc}`);
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = requests.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });
  await page.reload({ waitUntil: "networkidle0", timeout: 90000 });
  await sleep(5000); // idle: no scroll, tap or key
  const before = [...requests.values()];
  phase = "scroll";
  // a slow full scroll, as a reader would
  await page.evaluate(async () => {
    const step = Math.floor(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 450));
    }
  });
  await sleep(3000);
  const all = [...requests.values()];
  const origin = new URL(base).origin;
  const sum = (items, pred = () => true) => items.filter(pred).reduce((n, r) => n + (r.bytes || 0), 0);
  const isJs = (r) => r.type === "Script" || /\.js(\?|$)/.test(r.url);
  const thirdParty = all.filter((r) => !r.url.startsWith("data:") && !r.url.startsWith("blob:") && new URL(r.url).origin !== origin);
  const jar = (await cdp.send("Network.getAllCookies")).cookies ?? [];
  const docCookie = await page.evaluate(() => document.cookie);
  const s = {
    width,
    theme,
    requestsBefore: before.length,
    jsBefore: sum(before, isJs),
    totalBefore: sum(before),
    totalFullScroll: sum(all),
    requestsFullScroll: all.length,
    thirdParty: thirdParty.map((r) => r.url),
    cookies: { document: docCookie, jar: jar.map((c) => `${c.name}@${c.domain}`), setCookie: setCookies },
    problems,
    jsFiles: before.filter(isJs).map((r) => ({ url: r.url.replace(origin, ""), bytes: r.bytes, encoding: r.encoding })),
    biggest: all
      .slice()
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 12)
      .map((r) => ({ url: r.url.replace(origin, ""), bytes: r.bytes, phase: r.phase })),
  };
  report.sessions.push(s);
  const kb = (n) => `${(n / KB).toFixed(1)} KB`;
  line(`${width} ${theme}: before interaction ${s.requestsBefore} requests, JS ${kb(s.jsBefore)}, total ${kb(s.totalBefore)}; full scroll ${s.requestsFullScroll} requests, ${kb(s.totalFullScroll)}`);
  for (const f of s.jsFiles) line(`    js ${f.url} ${kb(f.bytes)} ${f.encoding}`);
  const verdict = (name, value, target, limit) => {
    const ok = value <= limit;
    if (!ok) hardFail++;
    line(`  ${ok ? (value <= target ? "ok  " : "warn") : "FAIL"} ${name}: ${kb(value)} (target ${kb(target)}, limit ${kb(limit)})`);
  };
  verdict("first-load JS (gzip)", s.jsBefore, 150 * KB, 200 * KB);
  verdict("transfer before interaction", s.totalBefore, 400 * KB, 600 * KB);
  verdict("transfer after a full scroll", s.totalFullScroll, 8 * KB * KB, 12 * KB * KB);
  const privacy = [
    ["every request same-origin", thirdParty.length === 0, thirdParty.map((r) => r.url).join(", ")],
    ["no cookies (document.cookie)", docCookie === "", docCookie],
    ["no cookies (browser jar)", jar.length === 0, jar.map((c) => c.name).join(", ")],
    ["no Set-Cookie headers", setCookies.length === 0, setCookies.join(" | ")],
    ["zero console errors", problems.console.filter((c) => c.startsWith("error")).length === 0, problems.console.join(" | ")],
    ["zero page errors", problems.pageErrors.length === 0, problems.pageErrors.join(" | ")],
    ["zero failed requests", problems.failed.length === 0, problems.failed.join(" | ")],
  ];
  for (const [name, ok, detail] of privacy) {
    if (!ok) hardFail++;
    line(`  ${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: ${detail}`}`);
  }
  if (problems.console.length) line(`  console: ${problems.console.join(" | ")}`);
  await cdp.detach();
  await page.close();
}

async function crawl(base) {
  const pages = ["/", "/film", "/credits", "/privacy", "/no-such-page"];
  const origin = new URL(base).origin;
  const seen = new Map(); // url → { from }
  const fragments = [];
  const ids = new Map(); // page path → Set of ids
  for (const p of pages) {
    const { page } = await openPage(base, p, { width: 1440, theme: "light", motion: "paused" });
    const found = await page.evaluate(() => {
      const out = [];
      const add = (u, attr, tag) => u && out.push({ u, attr, tag });
      for (const el of document.querySelectorAll("[href]")) add(el.getAttribute("href"), "href", el.tagName);
      for (const el of document.querySelectorAll("[src]")) add(el.getAttribute("src"), "src", el.tagName);
      for (const el of document.querySelectorAll("[srcset]"))
        for (const part of el.getAttribute("srcset").split(",")) add(part.trim().split(/\s+/)[0], "srcset", el.tagName);
      for (const el of document.querySelectorAll("[poster]")) add(el.getAttribute("poster"), "poster", el.tagName);
      return { links: out, ids: [...document.querySelectorAll("[id]")].map((e) => e.id) };
    });
    ids.set(p, new Set(found.ids));
    for (const { u, attr, tag } of found.links) {
      if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("mailto:")) continue;
      const abs = new URL(u, `${base}${p}`);
      if (abs.hash && abs.origin === origin) fragments.push({ page: abs.pathname, id: decodeURIComponent(abs.hash.slice(1)), from: p, raw: u });
      abs.hash = "";
      const key = abs.href;
      if (!seen.has(key)) seen.set(key, { from: p, attr, tag });
    }
    await page.close();
  }
  // fragments: the id must exist on the target page
  for (const f of fragments) {
    let set = ids.get(f.page);
    if (!set) {
      const { page } = await openPage(base, f.page, { width: 1440, theme: "light", motion: "paused" });
      set = new Set(await page.evaluate(() => [...document.querySelectorAll("[id]")].map((e) => e.id)));
      ids.set(f.page, set);
      await page.close();
    }
    const ok = f.id === "" || set.has(f.id);
    if (!ok) hardFail++;
    report.links.push({ kind: "fragment", url: f.raw, from: f.from, ok });
    if (!ok) line(`  FAIL fragment ${f.raw} (on ${f.from}): no #${f.id} on ${f.page}`);
  }
  for (const [url, meta] of seen) {
    const internal = url.startsWith(origin);
    if (!internal && flag("no-external")) continue;
    // other people's servers get at most one request a second (a burst of HEADs can earn a 429, a false broken link)
    const polite = () => (internal ? Promise.resolve() : sleep(1000));
    let status = 0;
    try {
      await polite();
      let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (res.status === 405 || res.status === 403) {
        await polite();
        res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(20000) });
      }
      status = res.status;
    } catch (e) {
      status = -1;
    }
    const ok = internal ? status === 200 : status >= 200 && status < 400;
    const expected404 = url.endsWith("/no-such-page");
    if (!ok && !expected404) {
      if (internal) hardFail++;
      line(`  ${internal ? "FAIL" : "warn"} ${status} ${url} (${meta.attr} on ${meta.from})`);
    }
    report.links.push({ kind: internal ? "internal" : "external", url, status, ok: ok || expected404, from: meta.from });
  }
  line(`links: ${report.links.filter((l) => l.kind === "internal").length} internal, ${report.links.filter((l) => l.kind === "external").length} external, ${fragments.length} fragments; ${report.links.filter((l) => !l.ok).length} not ok`);
}

try {
  const base = await startServer(`next-start-requests-${RUN}.log`);
  await launch();
  for (const width of WIDTHS) for (const theme of THEMES) await measure(base, width, theme);
  await crawl(base);
} catch (error) {
  console.error(error);
  hardFail++;
} finally {
  await cleanup();
}
writeFileSync(path.join(OUT, `${RUN}.json`), JSON.stringify(report, null, 2));
console.log(`SUMMARY: ${hardFail} hard failure(s) → .work/qa/requests/${RUN}.json`);
process.exit(hardFail ? 1 : 0);
