// The Stealth Lockdown section as the server renders it (StealthLockdown.tsx): Pebble 1.1.0's words in their places,
// the honest line right under the switch as real text, the switch's semantics, the live region with the app's own
// state line, the capture's two states sharing one frame, and the pebble wearing nothing until the switch is on.
// Privacy's link to it, the section's place on the page, and the never-words (src/content/neverWords.ts) too.
// The words themselves are checked against Pebble's source in src/content/stealth.test.ts.
// Run: bun test ./src/components/sections
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { privacy, sectionIds, stealth } from "@/content/copy";
import { labels } from "@/content/labels";
import { usesNeverWord } from "@/content/neverWords";
import { checkTwoTone } from "@/components/ui/twoTone";
import { uiCropStill, uiStill } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { Privacy } from "./Privacy";
import { StealthLockdown } from "./StealthLockdown";

/** the visible text, roughly: tags out, entities decoded, spaces collapsed */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

const html = renderToStaticMarkup(<StealthLockdown />);
const page = text(html);

describe("the Stealth Lockdown section", () => {
  test("sits at #stealth, labelled by its two-tone H2", () => {
    expect(SECTIONS.stealth).toBe(sectionIds.stealth);
    expect(html).toContain('id="stealth"');
    expect(html).toContain('aria-labelledby="stealth-title"');
    expect(checkTwoTone(stealth.h2, stealth.offByDefault)).toEqual({ ok: true });
    expect(html).toMatch(/<h2 id="stealth-title"[^>]*class="[^"]*two-tone[^"]*"><span>Stealth Lockdown\.<\/span> <span>Off by default\.<\/span><\/h2>/);
    expect(page).toContain(labels.stealth.name);
    expect(page).toContain("New in");
  });

  test("states the setting's description, where to turn it on, both shortcuts and the Veil, in Pebble's words", () => {
    for (const line of [stealth.description, stealth.turnOn, stealth.hideAll, stealth.veil, stealth.renderNote, stealth.captureCaption])
      expect(page).toContain(line);
    expect(page).toContain("⌃⌥⌘S");
    expect(page).toContain("⌃⌥⌘H");
  });

  test("lists the two halves word for word as a definition list", () => {
    for (const half of stealth.halves) {
      expect(html).toContain(`<dt>${half.term}</dt><dd>${half.text.replace(/'/g, "&#x27;")}</dd>`);
    }
    expect(html.indexOf("<dl")).toBeLessThan(html.indexOf('role="switch"'));
  });

  test("the switch is a real switch, labelled with the app's name and “Interactive example”, off at first", () => {
    const button = /<button[^>]*role="switch"[^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-checked="false"');
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(button)?.[1]?.split(" ") ?? [];
    expect(labelledBy.length).toBe(2);
    const named = labelledBy.map((id) => new RegExp(`id="${id}"[^>]*>([^<]*)<`).exec(html)?.[1]);
    expect(named).toEqual([stealth.name, stealth.example.label]);
    const describedBy = /aria-describedby="([^"]+)"/.exec(button)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`<p id="${describedBy}"`);
    expect((html.match(/role="switch"/g) ?? []).length).toBe(1);
  });

  test("the honest line follows the promise in the head's lead, at its size (critic C11)", () => {
    const lead = /<p class="[^"]*\blead\b[^"]*">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
    expect(text(lead).trim()).toBe(`${stealth.description} ${stealth.honest}`.replace(/'/g, "'"));
    expect(html.indexOf(stealth.honest)).toBeLessThan(html.indexOf("<dl"));
  });

  test("the honest line is real text right under the switch: after it, never collapsed or hidden", () => {
    const at = html.indexOf(stealth.honest, html.indexOf('role="switch"'));
    expect(at).toBeGreaterThan(html.indexOf('role="switch"'));
    // twice in the section: after the promise in the head, and under the switch, as in the app
    expect((html.match(new RegExp(stealth.honest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length).toBe(2);
    const paragraph = html.slice(html.lastIndexOf("<p", at), at);
    expect(paragraph).not.toMatch(/hidden|aria-hidden|sr-only/);
    expect(html).not.toContain("<details");
    // its paragraph is the switch's description (aria-describedby), as in the app
    const describedBy = /role="switch"[^>]*aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(paragraph).toContain(`id="${describedBy}"`);
  });

  test("a polite live region holds the app's own state line (off at first); the other line only reserves its height", () => {
    const live = /<p [^>]*aria-live="polite"[^>]*>([\s\S]*?)<\/p>/.exec(html);
    expect(live?.[1]).toBe(`<span>${stealth.stateOff}</span>`);
    // the on line is never text in the page: it is the hidden generated content that keeps the height (data-other)
    expect(live?.[0]).toContain(`data-other="${stealth.stateOn.replace(/'/g, "&#x27;")}"`);
    expect(page).not.toContain(stealth.stateOn);
  });

  test("the capture's off and on stills share one frame; the on one starts hidden from assistive technology", () => {
    expect(html).toContain('data-stealth="off"');
    const layers = html.match(/<div [^>]*data-layer="(off|on)"[^>]*>/g) ?? [];
    expect(layers.length).toBe(2);
    expect(layers[0]).toContain('data-layer="off"');
    expect(layers[0]).not.toContain("aria-hidden");
    expect(layers[1]).toContain('data-layer="on"');
    expect(layers[1]).toContain('aria-hidden="true"');
    // both share one frame: the on layer is the off layer's next sibling
    expect(html).toMatch(/data-layer="off"[^>]*>[\s\S]*?<\/div><div [^>]*data-layer="on"/);
  });

  test("the pebble starts plain, as a render beside the capture (never a recording, never a share view)", () => {
    expect(html).toMatch(/<svg[^>]*data-stealth="off"/);
    expect(html).not.toContain('data-veil="glass"');
    expect(page).toContain("a render, not a screen recording");
    expect(page).not.toMatch(/share view|shared view|what (they|others) see/i);
    expect(page.replace("not a screen recording", "")).not.toMatch(/\brecording\b/);
  });

  test("uses no never-word outside the honest line", () => {
    expect(usesNeverWord(page, [stealth.honest])).toBe(false);
    for (const alt of Object.values(stealth.media)) expect(usesNeverWord(alt, [stealth.honest])).toBe(false);
  });
});

describe("its stills", () => {
  test("the section alone, off and on, at 2400 × 1730 and 1200 × 865, in both themes", () => {
    for (const name of ["settings-privacy-card-off", "settings-privacy-card-on"] as const) {
      const still = uiCropStill(name);
      expect([still.width, still.height]).toEqual([2400, 1730]);
      for (const theme of ["light", "dark"] as const) {
        expect([still.files[theme][1200].width, still.files[theme][1200].height]).toEqual([1200, 865]);
        expect(still.files[theme][2400].avif.src).toBe(`/ui/v1/${name}-${theme}-2400.avif`);
        expect(still.files[theme][1200].webp.src).toBe(`/ui/v1/${name}-${theme}-1200.webp`);
      }
    }
    expect([uiStill("settings-privacy-on").width, uiStill("settings-privacy-on").height]).toEqual([2400, 1500]);
  });

  test("every file the section asks for is in public/ui/v1", () => {
    const repo = path.resolve(import.meta.dir, "../../..");
    for (const name of ["settings-privacy-card-off", "settings-privacy-card-on"] as const) {
      const still = uiCropStill(name);
      for (const theme of ["light", "dark"] as const)
        for (const width of [1200, 2400] as const)
          for (const format of ["avif", "webp"] as const) {
            const src = still.files[theme][width][format].src;
            expect(readFileSync(path.join(repo, "public", src)).length).toBeGreaterThan(10_000);
          }
    }
  });
});

describe("Privacy and the page around it", () => {
  test("Private by default links to the section, by the setting's name", () => {
    const privacyHtml = renderToStaticMarkup(<Privacy />);
    expect(privacyHtml).toContain(`href="/#${sectionIds.stealth}"`);
    expect(text(privacyHtml)).toContain(privacy.stealthLink.label);
    // its only mention of the name is that link
    const mentions = privacyHtml.split(stealth.name).length - 1;
    expect(mentions).toBe(1);
    expect(privacyHtml).toMatch(new RegExp(`<a href="/#${sectionIds.stealth}"[^>]*>${stealth.name}<`));
  });

  test("the home page mounts it right after Private by default", () => {
    const home = readFileSync(path.resolve(import.meta.dir, "../../app/page.tsx"), "utf8");
    expect(home).toMatch(/<Privacy \/>\s*<StealthLockdown \/>\s*<Install \/>/);
  });
});
