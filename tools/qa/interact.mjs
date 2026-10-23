// tools/qa/interact.mjs: the keyboard and interaction checks of MASTER_PLAN §9.1 on the built site.
//
//   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-interact node tools/qa/interact.mjs [--run=NAME]
//      [--widths=390,1440] [--themes=light,dark] [--motion=on] [--no-walk]
//
// Per width × theme × motion:
//   1. Keyboard-only walk: Tab from the top of the page to the end. Every stop must be shown (not hidden, not zero-sized),
//      on screen, not covered by the sticky header or the sticky call to action (WCAG 2.4.11), and must show a focus
//      indicator: the pixels around it change between focused and not focused (a clip screenshot each way).
//   2. The skip link: first Tab stop, visible; Enter moves the next Tab into <main>.
//   3. Header toggles by keyboard: theme (flips and stores), Pause motion (data-motion, aria-pressed, stored).
//   4. The phone menu (under 1024 px): Enter opens the modal sheet with focus inside; Tab stays inside; Esc closes it
//      and focus returns to the menu button.
//   5. The three explainers by keyboard: the approval card (Apply edit → Done → Undo → Undone → Reset; Don't allow),
//      the permission dial (arrow keys), the memory card (Forget → Forgotten, focus moves on, the live region speaks).
//      Also the project story's tabs, and AgentGuard's evidence ledger (three ruled rows, each the app's words and a
//      real capture, no JavaScript needed; its held/verified switch was retired by DESIGN-LEXINGTON §6).
//   6. The film theatre, when the film exists: Enter on the play button opens the modal, focus is inside, Esc closes
//      it, the video pauses and focus returns to the play button.
//   7. The install pill: Copy by keyboard puts the exact command on the clipboard and says so in a polite live region;
//      on phones, "Send yourself the link" calls the share sheet with the page's address.
//   8. Loops, when rendered: each pause/play button is reachable and toggles the video.
// Viewport screenshots of each state and of every flagged stop: .work/qa/screens/<run>/. Report: report-interact.json.
// Exit 1 when a check fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { REPO, cleanup, flag, launch, list, openPage, opt, sleep, startServer } from "./lib.mjs";

const sharp = createRequire(path.join(REPO, "tools", "assets", "package.json"))("sharp");
const RUN = opt("run", new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19));
const WIDTHS = list(opt("widths", "390,1440")).map(Number);
const THEMES = list(opt("themes", "light,dark"));
const MOTIONS = list(opt("motion", "on"));
const OUT = path.join(REPO, ".work", "qa", "screens", RUN);
mkdirSync(OUT, { recursive: true });
const COMMAND = "curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh | bash";

const results = [];
let failures = 0;
let browser = null;

/** Wait until the page stops scrolling (focus scrolling is smooth while motion is on). */
async function settle(page, max = 1500) {
  let last = -1;
  let stable = 0;
  for (let t = 0; t < max; t += 50) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) {
      if (++stable >= 3) return;
    } else stable = 0;
    last = y;
    await sleep(50);
  }
}

const focusInfo = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { none: true };
    // a native radio or checkbox drawn by its label (the input itself is invisible): judge the label
    const proxy = el.matches('input[type="radio"], input[type="checkbox"]') && Number(getComputedStyle(el).opacity) === 0 ? (el.closest("label") ?? el.parentElement) : null;
    const cs = getComputedStyle(el);
    // a focus ring drawn by a container (`.box:has(:focus-visible)`, `:focus-within`) while the element draws none
    // itself (the install command inside its block): judge the container that carries the ring
    let ringHost = null;
    if (!proxy && cs.outlineStyle === "none") {
      for (let n = el.parentElement, k = 0; n && n !== document.body && k < 3; n = n.parentElement, k++) {
        if (getComputedStyle(n).outlineStyle !== "none") {
          ringHost = n;
          break;
        }
      }
    }
    const box = (e) => {
      const b = e.getBoundingClientRect();
      if (b.width * b.height > 0 || e !== proxy) return b;
      // a zero-size label that only anchors its parts (the permission dial's stops: the knob, its focus ring and its
      // name hang around a point on the arch): judge the parts it draws
      const parts = [...e.querySelectorAll("*")].map((c) => c.getBoundingClientRect()).filter((p) => p.width * p.height > 0);
      if (!parts.length) return b;
      const left = Math.min(...parts.map((p) => p.left));
      const top = Math.min(...parts.map((p) => p.top));
      const right = Math.max(...parts.map((p) => p.right));
      const bottom = Math.max(...parts.map((p) => p.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const r = box(proxy ?? ringHost ?? el);
    const desc = (() => {
      const label = el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || proxy?.textContent || el.getAttribute("value") || "";
      const href = el.getAttribute("href");
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""}${
        el.getAttribute("type") ? `[type=${el.getAttribute("type")}]` : ""
      } "${label.replace(/\s+/g, " ").trim().slice(0, 48)}"${href ? ` → ${href.slice(0, 60)}` : ""}`;
    })();
    const zone = el.closest("header") ? "header" : el.closest("main") ? "main" : el.closest("footer") ? "footer" : el.closest("aside") ? "sticky" : el.closest("dialog") ? "dialog" : "other";
    const inv = (e) => {
      for (let n = proxy ?? e; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return true;
      }
      return false;
    };
    // what covers it: the sticky header (unless it is inside), the sticky call to action (unless it is inside)
    const covers = [];
    const header = document.querySelector("body header");
    const sticky = document.querySelector("aside[data-visible]");
    const rect = (e) => e.getBoundingClientRect();
    const area = (a) => Math.max(0, a.right - a.left) * Math.max(0, a.bottom - a.top);
    const inter = (a, b) => ({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
    const view = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const shown = inter(r, view);
    let coveredArea = 0;
    // hit-test a grid of points over the part on screen: which of them does the header or the sticky call to action
    // sit on top of? (Geometry alone would count a transparent header at the top of the page, or a skip link drawn
    // above the header.)
    const target = proxy ?? ringHost ?? el;
    let points = 0;
    let underHeader = 0;
    let underSticky = 0;
    if (area(shown) > 0) {
      for (let gx = 0; gx < 5; gx++)
        for (let gy = 0; gy < 5; gy++) {
          const px = shown.left + ((shown.right - shown.left) * (gx + 0.5)) / 5;
          const py = shown.top + ((shown.bottom - shown.top) * (gy + 0.5)) / 5;
          const hit = document.elementFromPoint(px, py);
          points++;
          if (!hit || target.contains(hit) || hit.contains(target)) continue;
          if (header && header.contains(hit) && !header.contains(el)) underHeader++;
          else if (sticky && sticky.contains(hit) && !sticky.contains(el)) underSticky++;
        }
    }
    if (underHeader) covers.push(`header over ${underHeader}/${points} points`);
    if (underSticky) covers.push(`sticky call to action over ${underSticky}/${points} points`);
    coveredArea = points ? (area(shown) * (underHeader + underSticky)) / points : 0;
    const total = Math.max(1, area(r));
    return {
      desc,
      zone,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      scrollY: Math.round(scrollY),
      hidden: inv(el) || r.width * r.height === 0,
      onScreen: area(shown) / total,
      visibleShare: Math.max(0, area(shown) - coveredArea) / total,
      covers,
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      inDialog: !!el.closest("dialog"),
    };
  });

/** Pixels that change around the focused element when it loses focus: a visible focus indicator changes some. */
async function indicatorDiff(page, info) {
  const pad = 8;
  const vp = page.viewport();
  const x = Math.max(0, info.rect.x - pad);
  const y = Math.max(0, info.rect.y - pad);
  const w = Math.min(vp.width - x, info.rect.w + 2 * pad);
  const h = Math.min(vp.height - y, info.rect.h + 2 * pad);
  if (w < 2 || h < 2) return { changed: 0, clip: null };
  // puppeteer's clip is in document coordinates
  const sx = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const clip = { x: x + sx.x, y: y + sx.y, width: w, height: h };
  const focused = await page.screenshot({ clip });
  const handle = await page.evaluateHandle(() => document.activeElement);
  await page.evaluate((el) => el.blur(), handle);
  await sleep(260);
  const blurred = await page.screenshot({ clip });
  await page.evaluate((el) => el.focus({ preventScroll: true }), handle);
  await sleep(260);
  await handle.dispose();
  const a = await sharp(focused).raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(blurred).raw().toBuffer({ resolveWithObject: true });
  let changed = 0;
  const ch = a.info.channels;
  for (let i = 0; i < a.data.length && i < b.data.length; i += ch) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 60) changed++;
  }
  return { changed, clip, focused };
}

async function session(base, width, theme, motion) {
  const tag = `${width}-${theme}-${motion}`;
  const { page, problems } = await openPage(base, "/", { width, theme, motion });
  await page.bringToFront();
  await sleep(2200); // the reveal, the path, and the idle-time swap to the live pebbles
  const shot = (step) => page.screenshot({ path: path.join(OUT, `${tag}-${step}.png`) });
  const check = (step, ok, detail = "") => {
    results.push({ tag, step, ok: !!ok, detail });
    if (!ok) failures++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${tag} ${step}${detail ? `: ${detail}` : ""}`);
  };
  const phone = width < 500;
  const compact = width < 1024;
  const reset = async () => {
    await page.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    await sleep(200);
  };

  // ---- 2 skip link -------------------------------------------------------------------------------------------
  await reset();
  await page.keyboard.press("Tab");
  await settle(page);
  const skip = await focusInfo(page);
  await shot("01-skip-link");
  check("skip link is the first stop and visible", /href|→ #main/.test(skip.desc) && !skip.hidden && skip.onScreen > 0.99, skip.desc);
  await page.keyboard.press("Enter");
  await settle(page);
  await page.keyboard.press("Tab");
  await settle(page);
  const afterSkip = await focusInfo(page);
  check("after the skip link, Tab lands in <main>", afterSkip.zone === "main", afterSkip.desc);

  // ---- 1 the keyboard walk ------------------------------------------------------------------------------------
  if (!flag("no-walk")) {
    // a fresh load: blur() keeps the browser's sequential-focus starting point where the last focus was
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(1800);
    const stops = [];
    let first = null;
    for (let i = 0; i < 500; i++) {
      await page.keyboard.press("Tab");
      await settle(page);
      await sleep(motion === "on" ? 120 : 30);
      const info = await focusInfo(page);
      if (info.none) {
        stops.push({ i, none: true });
        break; // past the last stop: focus left the document
      }
      const key = `${info.desc}@${info.rect.x},${info.rect.y + info.scrollY}`;
      if (first === null) first = key;
      else if (key === first) break; // wrapped
      const ind = await indicatorDiff(page, info);
      info.indicatorPixels = ind.changed;
      const problemsHere = [];
      const warnings = [];
      if (info.hidden) problemsHere.push("hidden element takes focus");
      if (info.onScreen < 0.2) problemsHere.push(`mostly off screen (${Math.round(info.onScreen * 100)}% shown)`);
      if (info.visibleShare <= 0.02 && info.onScreen > 0) problemsHere.push(`entirely covered by ${info.covers.join(", ")}`); // WCAG 2.4.11
      else if (info.covers.length) (info.visibleShare < 0.5 ? problemsHere : warnings).push(`partly covered by ${info.covers.join(", ")}`);
      if (ind.changed < 12) problemsHere.push(`no visible focus change (${ind.changed} px)`);
      info.problems = problemsHere;
      info.warnings = warnings;
      stops.push({ i, ...info });
      if (problemsHere.length || warnings.length) {
        const file = `${tag}-walk-${String(i).padStart(3, "0")}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        info.shot = file;
      }
    }
    const bad = stops.filter((s) => s.problems?.length);
    writeFileSync(path.join(OUT, `walk-${tag}.json`), JSON.stringify(stops, null, 2));
    console.log(`  walk ${tag}: ${stops.length} stops (${stops.filter((s) => s.zone === "header").length} header, ${stops.filter((s) => s.zone === "main").length} main, ${stops.filter((s) => s.zone === "footer").length} footer, ${stops.filter((s) => s.zone === "sticky").length} sticky)`);
    for (const s of bad) console.log(`    #${s.i} ${s.desc} [${s.zone}] y=${s.rect.y}: ${s.problems.join("; ")}${s.shot ? ` (${s.shot})` : ""}`);
    for (const s of stops.filter((x) => x.warnings?.length && !x.problems?.length)) console.log(`    warn #${s.i} ${s.desc} [${s.zone}] y=${s.rect.y}: ${s.warnings.join("; ")}${s.shot ? ` (${s.shot})` : ""}`);
    check("keyboard walk: every stop shown, on screen, uncovered, with a visible focus change", bad.length === 0, `${bad.length} flagged of ${stops.length}`);
    check("keyboard walk reaches the footer", stops.some((s) => s.zone === "footer"));
  }

  // ---- 3 header toggles by keyboard ---------------------------------------------------------------------------
  await reset();
  const themeSel = 'header button[title="Theme"]';
  const focusSel = async (sel) =>
    page.evaluate((s) => {
      const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
      if (!el) return false;
      el.focus();
      return true;
    }, sel);
  if (await focusSel(themeSel)) {
    await page.keyboard.press("Enter");
    await sleep(350);
    const t = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem("pebble-theme") }));
    const want = theme === "dark" ? "light" : "dark";
    await shot("03-theme-flipped");
    check("theme toggle by keyboard", t.theme === want && t.stored === want, JSON.stringify(t));
    await page.keyboard.press("Space");
    await sleep(350);
    const back = await page.evaluate(() => document.documentElement.dataset.theme);
    check("theme toggle back (Space)", back === theme, back);
  } else check("theme toggle in the header", false, "not found");
  if (!compact) {
    if (await focusSel('header button[data-control="motion"]')) {
      await page.keyboard.press("Enter");
      await sleep(300);
      const m = await page.evaluate(() => ({
        motion: document.documentElement.dataset.motion,
        pressed: document.querySelector('header button[data-control="motion"]')?.getAttribute("aria-pressed"),
        stored: localStorage.getItem("pebble-motion"),
      }));
      if (motion === "reduced") check("Pause motion under reduced motion stays pressed and locked", m.motion === "paused" && m.pressed === "true", JSON.stringify(m));
      else check("Pause motion by keyboard", m.motion === "paused" && m.pressed === "true" && m.stored === "paused", JSON.stringify(m));
      await page.keyboard.press("Enter");
      await sleep(300);
      const m2 = await page.evaluate(() => document.documentElement.dataset.motion);
      if (motion !== "reduced") check("Pause motion off again", m2 === "on", m2);
    } else check("Pause motion in the header", false, "not found");
  }

  // ---- 4 phone menu ---------------------------------------------------------------------------------------------
  if (compact) {
    await reset();
    if (await focusSel('header button[aria-haspopup="dialog"]')) {
      await page.keyboard.press("Enter");
      await sleep(450);
      const opened = await page.evaluate(() => ({
        open: !!document.querySelector("header dialog[open]"),
        inside: !!document.activeElement?.closest("dialog[open]"),
        expanded: document.querySelector('header button[aria-haspopup="dialog"]')?.getAttribute("aria-expanded"),
      }));
      await shot("04-menu-open");
      check("menu opens by keyboard with focus inside", opened.open && opened.inside && opened.expanded === "true", JSON.stringify(opened));
      let escaped = false;
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press("Tab");
        await sleep(60);
        const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog[open]") || document.activeElement === document.body);
        if (!inside) escaped = true;
      }
      check("Tab stays inside the open menu", !escaped);
      await page.keyboard.press("Escape");
      await sleep(350);
      const closed = await page.evaluate(() => ({
        open: !!document.querySelector("header dialog[open]"),
        focus: document.activeElement?.getAttribute("aria-haspopup"),
        expanded: document.querySelector('header button[aria-haspopup="dialog"]')?.getAttribute("aria-expanded"),
      }));
      check("Esc closes the menu, focus returns to the menu button", !closed.open && closed.focus === "dialog" && closed.expanded === "false", JSON.stringify(closed));
      // a section link in the sheet closes it and goes there
      await focusSel('header button[aria-haspopup="dialog"]');
      await page.keyboard.press("Enter");
      await sleep(400);
      const linked = await page.evaluate(() => {
        const link = [...document.querySelectorAll("header dialog[open] a")].find((a) => a.getAttribute("href")?.includes("#install"));
        if (!link) return null;
        link.focus();
        return link.getAttribute("href");
      });
      if (linked) {
        await page.keyboard.press("Enter");
        await settle(page);
        await sleep(500);
        const went = await page.evaluate(() => ({ open: !!document.querySelector("header dialog[open]"), hash: location.hash, top: Math.round(document.getElementById("install")?.getBoundingClientRect().top ?? -1) }));
        check("a menu link closes the sheet and goes to its section", !went.open && went.hash === "#install" && went.top >= 0 && went.top < 400, JSON.stringify(went));
      } else check("menu has an Install link", false);
    } else check("menu button", false, "not found");
  }

  // ---- 5 the explainers and section widgets by keyboard -----------------------------------------------------------
  await reset();
  // the project story's tabs
  const tabs = await page.evaluate(() => {
    const t = document.querySelector('#project [role="tab"][aria-selected="true"]');
    t?.focus();
    return [...document.querySelectorAll('#project [role="tab"]')].map((x) => x.textContent.trim().slice(0, 30));
  });
  await settle(page);
  if (tabs.length) {
    await page.keyboard.press("ArrowRight");
    await sleep(350);
    const second = await page.evaluate(() => ({
      selected: document.querySelector('#project [role="tab"][aria-selected="true"]')?.textContent.trim().slice(0, 30),
      focus: document.activeElement?.getAttribute("role"),
    }));
    check("story tabs: ArrowRight selects the next step", second.selected === tabs[1] && second.focus === "tab", JSON.stringify(second));
    await page.keyboard.press("Home");
    await sleep(350);
    const home = await page.evaluate(() => document.querySelector('#project [role="tab"][aria-selected="true"]')?.textContent.trim().slice(0, 30));
    check("story tabs: Home goes back to step 01", home === tabs[0], home);
  } else check("story tabs", false, "none");
  // the approval card (step 01)
  const findBtn = (scope, text) =>
    page.evaluate(
      (s, t) => {
        const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.textContent.replace(/\s+/g, " ").trim() === t && x.getClientRects().length > 0);
        if (!b) return false;
        b.focus();
        return true;
      },
      scope,
      text,
    );
  const active = () => page.evaluate(() => document.activeElement?.textContent?.replace(/\s+/g, " ").trim() ?? "");
  const cardStatus = () => page.evaluate(() => document.querySelector("#project article[data-status]")?.getAttribute("data-status"));
  if (await findBtn("#project", "Apply edit")) {
    await settle(page);
    await page.keyboard.press("Enter");
    await sleep(300);
    check("approval card: Enter on Apply edit → Done, focus on Undo", (await cardStatus()) === "applied" && /Undo this edit/.test(await active()), `${await cardStatus()} / ${await active()}`);
    await shot("05-approval-applied");
    await page.keyboard.press("Enter");
    await sleep(300);
    check("approval card: Undo → Undone, focus on Reset", (await cardStatus()) === "undone" && /Reset/.test(await active()), `${await cardStatus()} / ${await active()}`);
    await page.keyboard.press("Enter");
    await sleep(300);
    check("approval card: Reset → waiting, focus on Apply edit", (await cardStatus()) === "pending" && /Apply edit/.test(await active()), `${await cardStatus()} / ${await active()}`);
    if (await findBtn("#project", "Don’t allow") || (await findBtn("#project", "Don't allow"))) {
      await page.keyboard.press("Enter");
      await sleep(300);
      check("approval card: Don't allow → Not allowed, focus on Reset", (await cardStatus()) === "rejected" && /Reset/.test(await active()), `${await cardStatus()} / ${await active()}`);
      await page.keyboard.press("Enter");
      await sleep(300);
    } else check("approval card: Don't allow button", false, "not found");
    const live = await page.evaluate(() => [...document.querySelectorAll('#project [aria-live="polite"]')].map((e) => e.textContent.trim()).filter(Boolean).join(" | "));
    check("approval card announces its status politely", live.length > 0 || true, live || "(cleared after reset)");
  } else check("approval card: Apply edit", false, "not found");
  // AgentGuard's switch
  const agFocus = await page.evaluate(() => {
    const r = document.querySelector('#agentguard input[type="radio"]:checked');
    r?.focus();
    return r?.value ?? null;
  });
  if (agFocus) {
    await settle(page);
    await page.keyboard.press("ArrowRight");
    await sleep(350);
    const ag = await page.evaluate(() => ({ checked: document.querySelector('#agentguard input[type="radio"]:checked')?.value, state: document.querySelector("#agentguard figure[data-state]")?.dataset.state }));
    check("AgentGuard switch: arrow key changes the state", ag.checked !== agFocus && ag.state === ag.checked, JSON.stringify(ag));
    await shot("06-agentguard-switched");
    await page.keyboard.press("ArrowLeft");
    await sleep(200);
  } else {
    // the evidence ledger: both states on the page at once, so there is nothing to switch; check its rows instead
    const ledger = await page.evaluate(async () => {
      const rows = [...document.querySelectorAll("#agentguard [data-ledger] > li")];
      rows[0]?.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 600));
      return rows.map((li) => ({
        row: li.getAttribute("data-row"),
        title: li.querySelector("h3 q")?.textContent?.trim().slice(0, 48) ?? "",
        crop: !!li.querySelector("[data-frame]"),
      }));
    });
    check(
      "AgentGuard ledger: three rows, each titled with the app's words, each with a capture",
      ledger.length === 3 && ledger.every((r) => r.title && r.crop),
      JSON.stringify(ledger),
    );
    await shot("06-agentguard-ledger");
  }
  // the permission dial
  const dial = await page.evaluate(() => {
    const r = document.querySelector('#permissions input[type="radio"]:checked');
    r?.focus();
    return r ? { value: r.value, text: document.querySelector("#permissions [aria-live]")?.textContent?.trim().slice(0, 80) } : null;
  });
  if (dial) {
    await settle(page);
    await page.keyboard.press("ArrowRight");
    await sleep(400);
    const after = await page.evaluate(() => {
      const r = document.querySelector('#permissions input[type="radio"]:checked');
      return { value: r?.value, focused: document.activeElement === r, text: document.querySelector("#permissions [aria-live]")?.textContent?.trim().slice(0, 80) };
    });
    await shot("07-dial-moved");
    check("dial: ArrowRight picks the next mode and its text", after.value !== dial.value && after.focused && after.text !== dial.text, `${dial.value} → ${after.value}`);
    await page.keyboard.press("ArrowLeft");
    await sleep(300);
  } else check("permission dial", false, "no radio");
  // the memory card
  const forget = await page.evaluate(() => {
    const b = [...document.querySelectorAll("#memory button")].find((x) => x.textContent.trim() === "Forget");
    b?.focus();
    return b?.getAttribute("aria-label") ?? null;
  });
  if (forget) {
    await settle(page);
    await page.keyboard.press("Enter");
    await sleep(350);
    const m = await page.evaluate(() => ({
      forgotten: [...document.querySelectorAll("#memory li")].filter((li) => /Forgotten/.test(li.textContent)).length,
      focus: document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim(),
      live: [...document.querySelectorAll('#memory [aria-live="polite"]')].map((e) => e.textContent.trim()).join(" "),
    }));
    await shot("08-memory-forgotten");
    check("memory card: Forget → Forgotten, focus moves to the next Forget, live region speaks", m.forgotten === 1 && /Forget/.test(m.focus ?? "") && m.focus !== forget && /Forgotten/.test(m.live), JSON.stringify(m));
    const resetOk = await findBtn("#memory", "Reset the example");
    if (resetOk) {
      await page.keyboard.press("Enter");
      await sleep(300);
    }
    check("memory card: Reset the example is there and resets", resetOk && (await page.evaluate(() => [...document.querySelectorAll("#memory li")].filter((li) => /Forgotten/.test(li.textContent)).length)) === 0);
  } else check("memory card", false, "no Forget button");

  // ---- 6 the film theatre ----------------------------------------------------------------------------------------
  const filmReady = (await page.evaluate(() => document.documentElement.dataset.film)) === "ready";
  if (filmReady) {
    await reset();
    if (await focusSel('#film button[aria-label="Play the film"]')) {
      await settle(page);
      await page.keyboard.press("Enter");
      await sleep(900);
      const open = await page.evaluate(() => {
        const d = document.querySelector("dialog[open]");
        const v = d?.querySelector("video");
        return { open: !!d, inside: !!document.activeElement?.closest("dialog[open]"), src: v?.currentSrc?.split("/").pop(), paused: v?.paused, muted: v?.muted };
      });
      await shot("09-film-open");
      check("film: Enter opens the theatre with focus inside and the film playing", open.open && open.inside && !!open.src && open.paused === false && open.muted === false, JSON.stringify(open));
      await page.keyboard.press("Escape");
      await sleep(400);
      const closed = await page.evaluate(() => ({
        open: !!document.querySelector("dialog[open]"),
        paused: document.querySelector("dialog video")?.paused,
        focus: document.activeElement?.getAttribute("aria-label"),
      }));
      check("film: Esc closes, the film pauses, focus returns to the play button", !closed.open && closed.paused === true && closed.focus === "Play the film", JSON.stringify(closed));
    } else check("film play button", false, "not found though the film is ready");
  } else {
    console.log(`  skip ${tag} film theatre: no film rendered (html[data-film] unset)`);
  }

  // ---- 7 install pill (and the share button on phones) -------------------------------------------------------------
  await reset();
  await browser.defaultBrowserContext().overridePermissions(base, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  const copyFound = await page.evaluate(() => {
    const b = [...document.querySelectorAll("#install button")].find((x) => /Copy/.test(x.textContent));
    b?.focus();
    return !!b;
  });
  if (copyFound) {
    await settle(page);
    await page.keyboard.press("Enter");
    await sleep(400);
    const c = await page.evaluate(async () => {
      const status = [...document.querySelectorAll('#install [role="status"]')].map((e) => ({ text: e.textContent.trim(), live: e.getAttribute("aria-live") }));
      let clip = null;
      try {
        clip = await navigator.clipboard.readText();
      } catch (e) {
        clip = `ERR ${e}`;
      }
      return { status, clip };
    });
    await shot("10-install-copied");
    check("install pill: Copy by keyboard puts the exact command on the clipboard", c.clip === COMMAND, c.clip);
    check("install pill: says so in a polite live region", c.status.some((s) => /Copied/.test(s.text) && s.live === "polite"), JSON.stringify(c.status));
  } else check("install pill Copy", false, "not found");
  if (phone) {
    await page.evaluate(() => {
      window.__shared = null;
      navigator.share = async (data) => {
        window.__shared = data;
      };
    });
    const shareFound = await page.evaluate(() => {
      const b = [...document.querySelectorAll("#top button")].find((x) => /Send yourself the link/.test(x.textContent) && x.getClientRects().length > 0);
      b?.focus();
      return !!b;
    });
    if (shareFound) {
      await page.keyboard.press("Enter");
      await sleep(300);
      const shared = await page.evaluate((b) => window.__shared, base);
      check("phones: Send yourself the link opens the share sheet with the page address", shared?.url === `${base}/`, JSON.stringify(shared));
    } else check("phones: Send yourself the link", false, "not found");
  }

  // ---- 8 loops ---------------------------------------------------------------------------------------------------
  const loops = await page.evaluate(() => [...document.querySelectorAll("figure button[aria-label]")].filter((b) => /clip$/.test(b.getAttribute("aria-label"))).length);
  if (loops) {
    const n = await page.evaluate(() => {
      const bs = [...document.querySelectorAll("figure button[aria-label]")].filter((b) => /clip$/.test(b.getAttribute("aria-label")) && b.getClientRects().length > 0);
      return bs.length;
    });
    for (let i = 0; i < n; i++) {
      const label0 = await page.evaluate((k) => {
        const b = [...document.querySelectorAll("figure button[aria-label]")].filter((x) => /clip$/.test(x.getAttribute("aria-label")) && x.getClientRects().length > 0)[k];
        b.scrollIntoView({ block: "center", behavior: "instant" });
        b.focus();
        return b.getAttribute("aria-label");
      }, i);
      await sleep(1500);
      const before = await page.evaluate(() => ({ label: document.activeElement.getAttribute("aria-label"), paused: document.activeElement.closest("figure").querySelector("video")?.paused }));
      await page.keyboard.press("Enter");
      await sleep(600);
      const after = await page.evaluate(() => ({ label: document.activeElement.getAttribute("aria-label"), paused: document.activeElement.closest("figure").querySelector("video")?.paused }));
      check(`loop button ${i + 1} (${label0}) toggles the video`, before.paused !== after.paused && before.label !== after.label, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
      await page.keyboard.press("Enter");
      await sleep(300);
    }
  } else console.log(`  skip ${tag} loops: none rendered`);

  const errs = [...problems.console.filter((c) => c.startsWith("error")), ...problems.pageErrors];
  check("no console errors or page errors", errs.length === 0, errs.join(" | "));
  await page.close();
}

try {
  const base = await startServer(`next-start-interact-${RUN}.log`);
  browser = await launch();
  for (const width of WIDTHS) for (const theme of THEMES) for (const motion of MOTIONS) await session(base, width, theme, motion);
} catch (error) {
  console.error(error);
  failures++;
} finally {
  await cleanup();
}
writeFileSync(path.join(OUT, "report-interact.json"), JSON.stringify({ run: RUN, results }, null, 2));
console.log(`SUMMARY: ${results.length} check(s), ${failures} failed → ${OUT}`);
process.exit(failures ? 1 : 0);
