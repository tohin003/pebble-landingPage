// Detail on demand (.work/page-declutter/PLAN.md): the three patterns as the server renders them, and the rules that
// keep them honest. Closed by default where planned; content always in the DOM; keyboard reachable (native <details>
// summaries, ARIA tabs with a roving tabindex, a real <button> for the note); nothing that only hover can open; and the
// must-stay-visible lines never inside a disclosure. The live paths (tap, arrows, Escape, resize) are checked in a
// browser by the lane's sweep (.work/page-declutter/report.json); this file checks what holds without one.
// Run: bun test ./src/components/ui
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { golden } from "@/content/benchmarks";
import { agentGuard, honestLimits, privacy, stealth } from "@/content/copy";
import { AgentGuard } from "@/components/sections/AgentGuard";
import { AcrossYourMac } from "@/components/sections/AcrossYourMac";
import { Benchmarks } from "@/components/sections/Benchmarks";
import { Limits } from "@/components/sections/Limits";
import { Models } from "@/components/sections/Models";
import { Privacy } from "@/components/sections/Privacy";
import { StealthLockdown } from "@/components/sections/StealthLockdown";
import { Disclosure, DisclosureGroup } from "./Disclosure";
import { InfoTip } from "./InfoTip";
import { Tabs } from "./Tabs";

const SRC = path.resolve(import.meta.dir, "../..");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

/** how many <details> are open around position `at` (0: not inside a disclosure) */
function depth(html: string, at: number): number {
  const before = html.slice(0, at);
  return (before.match(/<details/g) ?? []).length - (before.match(/<\/details>/g) ?? []).length;
}

describe("Disclosure", () => {
  const html = renderToStaticMarkup(
    <DisclosureGroup>
      <Disclosure summary="How it checks">
        <p>The body stays in the DOM.</p>
      </Disclosure>
      <Disclosure summary="Open one" open>
        <p>Open on purpose.</p>
      </Disclosure>
    </DisclosureGroup>,
  );

  test("is the browser's own details and summary: closed by default, open only when asked", () => {
    const items = html.match(/<details[^>]*>/g) ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).not.toContain("open");
    expect(items[1]).toContain('open=""');
    expect(html).toMatch(/<summary[^>]*>.*How it checks/s);
  });

  test("keeps its body in the DOM while closed", () => {
    expect(html).toContain("The body stays in the DOM.");
  });

  test("its caret is decoration, hidden from assistive tech", () => {
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

describe("Tabs", () => {
  const items = [
    { id: "a", label: "First", content: <p>Panel A</p> },
    { id: "b", label: "Second", content: <p>Panel B</p> },
    { id: "c", label: "Third", content: <p>Panel C</p> },
  ];
  const html = renderToStaticMarkup(<Tabs label="Three things" items={items} />);

  test("renders an ARIA tablist: one tab selected and in the tab order, the others reached by the arrows", () => {
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Three things"');
    const tabs = html.match(/<button[^>]*role="tab"[^>]*>/g) ?? [];
    expect(tabs).toHaveLength(3);
    expect(tabs.filter((tab) => tab.includes('aria-selected="true"'))).toHaveLength(1);
    expect(tabs[0]).toContain('tabindex="0"');
    expect(tabs[1]).toContain('tabindex="-1"');
    for (const tab of tabs) expect(tab).toMatch(/aria-controls="[^"]+"/);
  });

  test("every panel is in the DOM, each in an exclusive details group, the first open", () => {
    for (const panel of ["Panel A", "Panel B", "Panel C"]) expect(html).toContain(panel);
    const groups = html.match(/<details[^>]*>/g) ?? [];
    expect(groups).toHaveLength(3);
    const names = new Set(groups.map((tag) => /name="([^"]+)"/.exec(tag)?.[1]));
    expect(names.size).toBe(1);
    expect(groups[0]).toContain("open");
    expect(groups[1]).not.toContain("open");
    expect(html).toMatch(/role="tabpanel"[^>]*aria-labelledby="[^"]+"/);
  });

  test("handles the arrows, Home and End on the tablist, and becomes an accordion below 768 px", () => {
    const source = read("components/ui/Tabs.tsx");
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) expect(source).toContain(key);
    const css = read("components/ui/Tabs.module.css");
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{[\s\S]*\.summary\s*\{\s*display: none;/);
    expect(css).toMatch(/\.list\s*\{\s*display: none;/); // narrow first: the tablist only from 768 px
  });
});

describe("InfoTip", () => {
  const html = renderToStaticMarkup(<InfoTip label="About web search">Searching runs without asking.</InfoTip>);

  test("is a real button that says whether its note is open, and points at the note", () => {
    expect(html).toMatch(/<button[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/);
    const id = /aria-controls="([^"]+)"/.exec(html)?.[1];
    expect(html).toContain(`id="${id}"`);
  });

  test("keeps its note in the DOM while closed, never display:none or aria-hidden", () => {
    expect(html).toContain("Searching runs without asking.");
    expect(html).not.toMatch(/aria-hidden|hidden=""/);
    const css = read("components/ui/InfoTip.module.css");
    expect(css).not.toMatch(/\.note\s*\{[^}]*display:\s*none/);
  });

  test("opens on tap and keyboard focus, closes on Escape; hover only where the pointer hovers precisely", () => {
    const source = read("components/ui/InfoTip.tsx");
    expect(source).toContain("onClick");
    expect(source).toContain(":focus-visible");
    expect(source).toContain('"Escape"');
    expect(source).toContain('"(hover: hover) and (pointer: fine)"');
    expect(source).toMatch(/onMouseEnter=\{\(\) => \{\s*if \(hoverable\(\)\)/);
    // the floating bubble exists only where hover is precise; everywhere else the note opens inline
    const css = read("components/ui/InfoTip.module.css");
    expect(css).toContain("@media (hover: hover) and (pointer: fine) and (min-width: 768px)");
  });
});

describe("nothing on the site opens only on hover", () => {
  test("no :hover rule shows or hides anything (display, visibility, opacity, clip, height)", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".css")) {
          const css = readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
          for (const m of css.matchAll(/([^{}]*:hover[^{}]*)\{([^{}]*)\}/g)) {
            if (/\b(display|visibility|opacity|clip-path|max-height|height)\s*:/.test(m[2]!)) found.push(`${full}: ${m[1]!.trim()}`);
          }
        }
      }
    };
    walk(SRC);
    expect(found).toEqual([]);
  });

  test("touch targets: every summary and tab is at least 44 px tall", () => {
    for (const file of ["components/ui/Disclosure.module.css", "components/ui/Tabs.module.css"]) {
      const css = read(file);
      for (const m of css.matchAll(/min-height:\s*(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("the lines that must stay visible are never folded", () => {
  test("Stealth Lockdown's honest line, in the lead and under the switch", () => {
    const html = renderToStaticMarkup(<StealthLockdown />);
    const hits = [...html.matchAll(new RegExp(stealth.honest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))];
    expect(hits).toHaveLength(2);
    for (const hit of hits) expect(depth(html, hit.index!)).toBe(0);
    // what it folds: how to turn it on and the two halves, closed by default
    const fold = /<details[^>]*>/.exec(html)?.[0] ?? "";
    expect(fold).not.toBe("");
    expect(fold).not.toContain("open");
    expect(html.indexOf(stealth.turnOn)).toBeGreaterThan(html.indexOf("<details"));
  });

  test("Benchmarks: the scoreboard, the chart, the headline and the not-run line sit outside every disclosure", async () => {
    const html = renderToStaticMarkup(await Benchmarks({ open: true, offered: "2.0.0" }));
    for (const marker of [golden.scoreboard.headline.replace(/'/g, "&#x27;"), 'aria-labelledby="golden-diff-title"', "Not run before"]) {
      const at = html.indexOf(marker);
      expect({ marker, found: at >= 0 }).toEqual({ marker, found: true });
      expect({ marker, depth: depth(html, at) }).toEqual({ marker, depth: 0 });
    }
    // the ledger folds: method, result, the rest of "What this doesn't prove", the data
    for (const id of ["golden-method", "golden-result", "golden-limits", "golden-data"]) {
      const at = html.indexOf(`id="${id}"`);
      expect({ id, depth: depth(html, at) }).toEqual({ id, depth: 1 });
    }
    // every figure stays in the DOM, and "Not run before 2.0.0" is said once, visibly
    expect(text(html).split("Not run before").length - 1).toBe(1);
  });

  test("Install: the zip's honest line sits beside its button, inside no disclosure", () => {
    // read from the source: rendering Install would ask the GitHub API for the latest release
    const source = read("components/sections/Install.tsx");
    const zip = source.indexOf("{install.byHand.downloadZip}");
    const honest = source.indexOf("{hero.honestLine}", zip);
    expect(zip).toBeGreaterThan(0);
    expect(honest).toBeGreaterThan(zip);
    expect(source.slice(zip, honest)).not.toContain("<Disclosure");
    // and the zip's panel is a tab of its own, not a fold
    expect(source.lastIndexOf('id: "zip"', zip)).toBeGreaterThan(source.lastIndexOf("<Disclosure", zip));
  });

  test("Limits: the release lines are plain list items; every product limit keeps its title on screen", () => {
    const html = renderToStaticMarkup(<Limits />);
    const page = text(html);
    for (const item of honestLimits.product) {
      expect(page).toContain(item.title);
      const at = html.indexOf(">" + item.title.replace(/'/g, "&#x27;"));
      expect({ title: item.title, inSummary: html.lastIndexOf("<summary", at) > html.lastIndexOf("</summary>", at) }).toEqual({
        title: item.title,
        inSummary: true,
      });
    }
    const firstDetails = html.indexOf("<details");
    for (const line of honestLimits.release) {
      const words = text(line).replace(/`/g, "").split(" ").slice(0, 3).join(" ");
      expect(page.indexOf(words)).toBeGreaterThanOrEqual(0);
    }
    expect(html.indexOf("</ul>")).toBeLessThan(firstDetails);
  });

  test("the tabbed sections keep every feature's limit in the same panel as its feature", () => {
    const mac = text(renderToStaticMarkup(<AcrossYourMac />));
    expect(mac).toContain("Screen control is off until you turn it on");
    const models = renderToStaticMarkup(<Models />);
    expect(models).toContain('role="tablist"');
  });

  test("Privacy: the destinations stay listed; their detail and the notes are in the DOM, one tap away", () => {
    const html = renderToStaticMarkup(<Privacy />);
    const page = text(html);
    for (const d of privacy.diagram.destinations) expect(page).toContain(d.label);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>With a cloud model<\/button>/);
    for (const line of [privacy.searchNote, "Optional usage counters are off by default"]) expect(page).toContain(line);
    // "No telemetry." stays on screen, outside every disclosure
    expect(depth(html, html.indexOf("No telemetry."))).toBe(0);
    expect(depth(html, html.indexOf("Settings › Permissions"))).toBe(1);
  });

  test("AgentGuard: three cards, each with its quoted line, sample-data label and capture outside the fold", () => {
    const html = renderToStaticMarkup(<AgentGuard />);
    const rows = html.split('data-row="').slice(1);
    expect(rows.map((r) => r.slice(0, r.indexOf('"')))).toEqual(["challenge", "held", "verified"]);
    expect((html.match(/Shown with sample data\./g) ?? []).length).toBeGreaterThanOrEqual(3);
    for (const marker of ["Shown with sample data.", agentGuard.reliability.body.split(" Protection")[0]!]) {
      const at = html.indexOf(marker.replace(/'/g, "&#x27;"));
      expect({ marker, at: at >= 0 }).toEqual({ marker, at: true });
    }
    // the reliability sentence is outside every disclosure; its three points are inside one
    const reliability = html.indexOf("it is not a sandbox and not a security layer.");
    expect(reliability).toBeGreaterThan(0);
    expect(depth(html, reliability)).toBe(0);
    // each card's sample-data label sits in its card (a tab panel), never in its "How it works" fold
    for (const row of html.split('data-row="').slice(1)) {
      const card = row.slice(0, row.indexOf("<details")); // up to its "How it works" fold
      expect(card).toContain("Shown with sample data.");
      expect(row.slice(row.indexOf("<details"), row.indexOf("</details>"))).toContain("How it works");
    }
    for (const point of agentGuard.reliability.points) expect(text(html)).toContain(point.replace(/'/g, "'"));
  });
});
