// The Pebble 2.0 launch page's film-independent work (.work/launch/site/SITE_AUDIT.md; docs/CLAIMS.md, "Launch page,
// Pebble 2.0.1"): the new Pebble Remote section as the server renders it, its place on the page and its words' limits;
// long tasks; and the 2.0 loop slots (src/components/media/FeatureLoop.tsx), which render nothing at all until their
// file exists in /media/v3, so every section stays exactly as it was, and render the loop's frame, its text alternative
// and its caption once it does. The "with files" cases run in their own Bun process, because src/lib/media.ts reads the
// build's file list (PEBBLE_MEDIA_FILES) once.
// Run: bun test ./src/components/sections
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { common, media, orchestration, remote, sectionIds, stealth } from "@/content/copy";
import { labels } from "@/content/labels";
import { STEALTH_NEVER } from "@/content/neverWords";
import { llmsTxt } from "@/content/seo";
import { checkTwoTone } from "@/components/ui/twoTone";
import { SECTIONS } from "@/lib/sections";
import { AcrossYourMac } from "./AcrossYourMac";
import { AgentGuard } from "./AgentGuard";
import { Remote } from "./Remote";
import { StealthLockdown } from "./StealthLockdown";
import { ViewsAndTour } from "./ViewsAndTour";
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

const remoteHtml = renderToStaticMarkup(<Remote />);
const remotePage = text(remoteHtml);
const remoteStrings = [
  remote.h2,
  remote.then,
  remote.lead,
  remote.sourceOnly,
  remote.note,
  ...remote.rows.flatMap((row) => [row.term, row.text, row.limit]),
  ...remote.links.map((link) => link.label),
];

describe("Pebble Remote", () => {
  test("sits at #remote, between the Workshop and Your model, with its rail label and two-tone H2", () => {
    expect(SECTIONS.remote).toBe(sectionIds.remote);
    expect(sectionIds.remote).toBe("remote");
    expect(remoteHtml).toContain('id="remote"');
    expect(remoteHtml).toContain('aria-labelledby="remote-title"');
    expect(checkTwoTone(remote.h2, remote.then)).toEqual({ ok: true });
    expect(remotePage).toContain(labels.remote.name);
    expect(remotePage).toContain(labels.remote.fact);
    const page = readFileSync(path.join(REPO, "src/app/page.tsx"), "utf8");
    const at = (name: string) => page.indexOf(`<${name} />`);
    expect(at("Workshop")).toBeGreaterThan(-1);
    expect(at("Workshop")).toBeLessThan(at("Remote"));
    expect(at("Remote")).toBeLessThan(at("Models"));
  });

  test("the lead is followed at once by its limit: source only, built with Xcode, not on the App Store", () => {
    expect(remotePage).toContain(`${remote.lead} ${remote.sourceOnly}`);
    expect(remote.sourceOnly).toContain("Xcode");
    expect(remote.sourceOnly).toContain("not on the App Store");
  });

  test("every row renders its limit right after it, in the same cell; the note and both links follow", () => {
    for (const row of remote.rows) {
      expect(remotePage).toContain(row.term);
      expect(remotePage).toContain(`${row.text} ${row.limit}`);
    }
    expect(remotePage).toContain(remote.note);
    for (const link of remote.links) {
      expect(remotePage).toContain(link.label);
      expect(remoteHtml).toContain(`href="${link.href}"`);
    }
    expect(remote.links[0]!.href).toBe("https://github.com/tohin003/pebble-remote");
  });

  test("states the four limits the director named: off by default, six digits once, Face ID to widen, source only", () => {
    const all = remoteStrings.join(" ");
    expect(all).toContain("Off by default");
    expect(all).toContain("opens no network port at all");
    expect(all).toContain("pairs once, at home, with six digits you confirm on the Mac");
    expect(all).toContain("A setting that widens what Pebble may do needs Face ID.");
    expect(all).toContain("build it with Xcode");
  });

  test("never copies the 2.0.0 notes' history lines, and keeps the house rules", () => {
    const banned = [
      /not published yet/i,
      /no phone to pair with/i,
      /\b(faster|better|beats?|cheaper|smarter)\b/i,
      /\b(secure(ly)?|safe(ly|r|st)?|magic(al)?|seamless(ly)?|revolutionary|private by design)\b/i,
      /!/,
      ...STEALTH_NEVER,
    ];
    for (const line of remoteStrings) for (const re of banned) expect({ line, hit: re.test(line) }).toEqual({ line, hit: false });
  });

  test("llms.txt has one line for it, with the same limits", () => {
    const lines = llmsTxt.split("\n").filter((line) => line.includes("Pebble Remote"));
    expect(lines.length).toBe(1);
    for (const words of ["off by default", "six digits", "Face ID", "source code", "Xcode", "not on the App Store", "https://github.com/tohin003/pebble-remote"])
      expect(lines[0]).toContain(words);
  });
});

describe("long tasks", () => {
  const views = text(renderToStaticMarkup(<ViewsAndTour />));

  test("keep a smaller window, with the limit right after it, and no saving claimed (the director's X9)", () => {
    const { title, text: body, limit } = orchestration.longTasks;
    expect(title).toBe("Long tasks keep a smaller window.");
    expect(views).toContain(`${title} ${body} ${limit}`);
    for (const line of [title, body, limit]) {
      expect(line).not.toMatch(/\blight(er)?\b|\bfaster\b|\bcheaper\b|\d\s?%|\$\s?\d/i);
      expect(line).not.toMatch(/context[\s-]*warp/i);
    }
    expect(limit).toMatch(/No saving/);
    expect(llmsTxt).toContain("Long tasks keep a smaller window");
  });
});

describe("the 2.0 loop slots, before their files exist", () => {
  test("render nothing: no frame, no player, no caption, so each section is as it was", () => {
    for (const html of [
      renderToStaticMarkup(<AcrossYourMac />),
      renderToStaticMarkup(<Workshop />),
      remoteHtml,
      renderToStaticMarkup(<StealthLockdown />),
      renderToStaticMarkup(<ViewsAndTour />),
    ]) {
      expect(html).not.toContain("data-loop-id");
      expect(html).not.toContain("/media/v3/");
    }
  });

  test("AgentGuard renders no 2.0 clip either", async () => {
    const html = renderToStaticMarkup(await AgentGuard());
    expect(html).not.toContain("data-loop-id");
    expect(html).not.toContain("/media/v3/");
  });

  test("every 2.0 loop has its words: a name, a text alternative and what it was recorded from", () => {
    for (const [id, words] of Object.entries(media.launchLoops)) {
      expect({ id, name: words.name.length > 0 }).toEqual({ id, name: true });
      expect({ id, label: /\.$/.test(words.label) }).toEqual({ id, label: true });
      expect({ id, source: /\.$/.test(words.source) }).toEqual({ id, source: true });
    }
    // the diagram says it is one
    expect(media.launchLoops["long-tasks"].label).toStartWith("Diagram.");
  });
});

/** a string as React writes it in an attribute */
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

/** Renders `jsx` (a function body returning an element, with React and the sections in scope) in a fresh Bun process
 *  whose build lists `files`. */
function renderWith(files: readonly string[], body: string): string {
  const code = `
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { FeatureLoop } = await import("@/components/media/FeatureLoop");
const { Memory } = await import("@/components/sections/Memory");
const { OnYourDesktop } = await import("@/components/sections/OnYourDesktop");
const h = React.createElement;
const el = (() => { ${body} })();
console.log(JSON.stringify(renderToStaticMarkup(el)));`;
  const run = Bun.spawnSync([process.execPath, "-e", code], { cwd: REPO, env: { ...process.env, PEBBLE_MEDIA_FILES: JSON.stringify(files) } });
  if (run.exitCode !== 0) throw new Error(run.stderr.toString());
  return JSON.parse(run.stdout.toString().trim().split("\n").at(-1)!) as string;
}

describe("the 2.0 loop slots, once their files exist", () => {
  test("a loop's poster alone brings its frame, its text alternative and its caption", () => {
    const html = renderWith(["/media/v3/loop-workshop.poster.avif", "/media/v3/loop-workshop.poster.webp"], `return h(FeatureLoop, { id: "workshop" });`);
    expect(html).toContain('data-loop-id="workshop"');
    expect(html).toContain(`aria-label="${attr(media.launchLoops.workshop.label)}"`);
    expect(text(html)).toContain(`${common.sampleData} ${media.launchLoops.workshop.source}`);
    expect(html).toContain("/media/v3/loop-workshop.poster.avif");
    expect(html).not.toContain("<video"); // no video file: the poster only, never a broken player
  });

  test("a loop's video brings its slot (the player mounts in the browser), and Pebble Remote's frame is 4:5", () => {
    const html = renderWith(["/media/v3/loop-remote.h264.mp4", "/media/v3/loop-remote.poster.webp"], `return h(FeatureLoop, { id: "remote" });`);
    expect(html).toContain('data-loop-id="remote"');
    expect(html).toContain(`aria-label="${attr(media.launchLoops.remote.label)}"`);
    expect(html).toContain("data-portrait");
    expect(html).toContain("--feature-loop-wide:1080 / 1350");
  });

  test("the diagram is captioned as one, on the panel, without the sample-data line", () => {
    const html = renderWith(["/media/v3/loop-long-tasks.poster.webp"], `return h(FeatureLoop, { id: "long-tasks" });`);
    expect(text(html)).toContain(media.launchLoops["long-tasks"].source);
    expect(text(html)).not.toContain(common.sampleData);
    expect(html).toContain('data-variant="panel"');
  });

  test("Stealth Lockdown's clip carries the honest line, word for word, under it", () => {
    const html = renderWith(["/media/v3/loop-stealth.poster.webp"], `return h(FeatureLoop, { id: "stealth", note: ${JSON.stringify(stealth.honest)} });`);
    expect(text(html)).toContain(stealth.honest);
  });

  test("the desk and memory loops take the 1.x loops' places once their videos exist, with their own words", () => {
    const desk = renderWith(["/media/v3/loop-desk.hevc.mp4", "/media/v3/loop-desk.h264.mp4"], `return h(OnYourDesktop);`);
    expect(desk).toContain(`aria-label="${attr(media.launchLoops.desk.label)}"`);
    expect(desk).not.toContain(attr(media.loops.companion.label));
    expect(text(desk)).toContain(media.launchLoops.desk.source);
    const mem = renderWith(["/media/v3/loop-memory.h264.mp4", "/media/v1/loop-memory.h264.mp4"], `return h(Memory);`);
    expect(mem).toContain(`aria-label="${attr(media.launchLoops.memory.label)}"`);
    expect(text(mem)).toContain(media.launchLoops.memory.source);
    expect(mem).not.toContain("/media/v1/loop-memory");
    // without the v3 file, the 1.x loop stays, with its 1.0.4 caption
    const old = renderWith(["/media/v1/loop-memory.h264.mp4"], `return h(Memory);`);
    expect(old).toContain(`aria-label="${attr(media.loops.memory.label)}"`);
    expect(text(old)).toContain("captured from Pebble 1.0.4");
  });
});
