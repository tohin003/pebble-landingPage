// Pebble 2.0.0 on the page (.work/page-2.0/PLAN.md): the two new sections as the server renders them (Across your Mac,
// Pebble's Workshop), their place on the page, every feature row with its limit beside it, and the rules that bind the
// release's copy: no comparison, no number for speed, savings or cost, none of the never-words, nothing that still says
// Pebble can't see or operate other apps (1.5.0's claim, false in 2.0.0), and no sentence about seeing a window as a
// picture or using the mouse and keyboard until the tag settles whether it ships on (PLAN.md, "Where the candidate
// sources disagree"). The CLAIMS rows are C-MAC-*, C-WS-* and C-200-* (docs/CLAIMS.md, "Pebble 2.0.0 on the page").
// Run: bun test ./src/components/sections
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { acrossMac, agentGuard, explainers, honestLimits, project, sectionIds, workshop } from "@/content/copy";
import { faq } from "@/content/faq";
import { labels } from "@/content/labels";
import { STEALTH_NEVER } from "@/content/neverWords";
import { llmsTxt } from "@/content/seo";
import { checkTwoTone } from "@/components/ui/twoTone";
import { SECTIONS } from "@/lib/sections";
import { AcrossYourMac } from "./AcrossYourMac";
import { Workshop } from "./Workshop";

const REPO = path.resolve(import.meta.dir, "../../..");

/** the visible text, roughly: tags out, entities decoded, spaces collapsed */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

const macHtml = renderToStaticMarkup(<AcrossYourMac />);
const workshopHtml = renderToStaticMarkup(<Workshop />);

/** Every string of the two sections, the way a visitor reads them. */
const sectionStrings = [acrossMac, workshop].flatMap((block) => [
  block.h2,
  block.lead,
  block.note,
  ...block.rows.flatMap((row) => [row.term, row.text, row.limit]),
  ...("then" in block ? [block.then] : []),
]);

/** The release's new and changed copy outside the two sections. */
const changedStrings = [
  agentGuard.request,
  project.steps[2]!.title,
  project.steps[2]!.body,
  project.steps[2]!.limit,
  explainers.permissionDial.appsNote,
  ...honestLimits.product.map((item) => item.body),
  ...(faq.find((item) => item.id === "faq-apps")?.answer ?? []),
];

describe("Across your Mac", () => {
  test("sits at #mac, right after the project story, with its rail label and H2", () => {
    expect(SECTIONS.mac).toBe(sectionIds.mac);
    expect(macHtml).toContain('id="mac"');
    expect(macHtml).toContain('aria-labelledby="mac-title"');
    expect(text(macHtml)).toContain(acrossMac.h2);
    expect(text(macHtml)).toContain(labels.mac.name);
    expect(text(macHtml)).toContain(labels.mac.fact);
    const page = readFileSync(path.join(REPO, "src/app/page.tsx"), "utf8");
    const order = ["<ProjectStory />", "<AcrossYourMac />", "<Workshop />", "<Models />"].map((tag) => page.indexOf(tag));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("every feature row renders its limit right after it, in the same cell", () => {
    const page = text(macHtml);
    expect(acrossMac.rows.map((row) => row.id)).toEqual(["files", "windows", "web", "apps"]);
    for (const row of acrossMac.rows) {
      expect(row.limit.length).toBeGreaterThan(0);
      expect(page).toContain(`${row.term} ${row.text} ${row.limit}`);
    }
    expect(page).toContain(acrossMac.note);
  });

  test("names Screen control as off until you turn it on, and macOS's own permissions", () => {
    expect(acrossMac.note).toContain("Screen control is off until you turn it on");
    expect(acrossMac.note).toContain("Accessibility");
  });
});

describe("Pebble's Workshop", () => {
  test("sits at #workshop with a two-tone H2", () => {
    expect(SECTIONS.workshop).toBe(sectionIds.workshop);
    expect(workshopHtml).toContain('id="workshop"');
    expect(checkTwoTone(workshop.h2, workshop.then)).toEqual({ ok: true });
    expect(workshopHtml).toMatch(/class="[^"]*two-tone[^"]*"><span>Pebble(&#x27;|'|’)s Workshop\.<\/span> <span>Tools it makes/);
  });

  test("every row renders its limit beside it, and the section's own limit closes it", () => {
    const page = text(workshopHtml);
    expect(workshop.rows.map((row) => row.id)).toEqual(["toolbox", "checked", "code-mode"]);
    for (const row of workshop.rows) expect(page).toContain(`${row.term} ${row.text} ${row.limit}`);
    expect(page).toContain(workshop.note);
  });

  test("Code Mode keeps 1.5.0's own words and lives here now, not in the tour", () => {
    const codeMode = workshop.rows.find((row) => row.id === "code-mode")!;
    expect(codeMode.text).toStartWith("Pebble can run a short script that calls its tools; only what it prints comes back.");
    expect(codeMode.text).toContain("Every call a script makes is checked, approved and recorded exactly like a direct call.");
    const copy = readFileSync(path.join(REPO, "src/content/copy.ts"), "utf8");
    expect(copy.match(/title: "Code Mode"/g)).toBeNull();
  });
});

describe("the release's copy keeps the house rules", () => {
  const all = [...sectionStrings, ...changedStrings];

  test("no comparison, no hype, none of the Stealth never-words", () => {
    const banned = [
      /\b(faster|better|beats?|more reliable|cheaper|smarter)\b/i,
      /\b(Claude Code|Codex|Cursor|Copilot)\b/,
      /\bcontext[\s-]*warp/i,
      /\b(secure|safe(ly|r|st)?|magic(al)?|seamless(ly)?|revolutionary)\b/i,
      ...STEALTH_NEVER,
    ];
    for (const line of all) for (const re of banned) expect({ line, hit: re.test(line) }).toEqual({ line, hit: false });
  });

  test("no number for speed, savings or cost", () => {
    for (const line of all) expect({ line, hit: /\d\s?%|\$\s?\d|\b\d+(\.\d+)?\s?(x|×|times)\b/i.test(line) }).toEqual({ line, hit: false });
  });

  test("nothing still says Pebble can't see or operate other apps (1.5.0's claim, false in 2.0.0)", () => {
    const content = readdirSync(path.join(REPO, "src/content"))
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .map((f) => readFileSync(path.join(REPO, "src/content", f), "utf8"))
      .join("\n")
      // the dead `more` tiles are never rendered (ViewsAndTour renders `orchestration` and `tour`); only live strings count
      .replace(/export const more = \{[\s\S]*?\n\} as const;/, "");
    const live = content.replace(/^\s*(\/\/|\*).*$/gm, ""); // comments may record the old claim
    expect(live).not.toMatch(/can't see or operate other apps/);
    expect(llmsTxt).not.toMatch(/can't see or operate other apps/);
    expect(llmsTxt).not.toMatch(/simulated Chrome/);
  });

  test("no sentence about seeing a window as a picture or using the mouse and keyboard, until the tag settles it", () => {
    for (const line of [...all, llmsTxt]) expect({ line, hit: /\bmouse\b|\bas a picture\b/i.test(line) }).toEqual({ line, hit: false });
  });

  test("Full access is never said to ask for every push or deletion (2.0.0 approves what your messages ask for)", () => {
    expect(project.steps[2]!.title).toStartWith("In the default mode");
    expect(project.steps[2]!.title).not.toMatch(/always/);
  });
});
