// The film on the page is the Pebble 2.0 launch film (2 Nov 2026: it replaced the 1.x trailer at the owner's ask).
// Its words, its chapters and its transcript are checked here against their sources: the CLAIMS rows (C-FILM3-*), the
// master's timeline (frames at 30 fps), the caption track built from the film's own captions
// (public/media/v3/film.en.vtt, tools/captions/build.mjs) and the approved description (docs/launch/LINKEDIN_POST.md).
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { chapters, FILM_DURATION_SECONDS, FILM_FPS, filmDurationLabel, filmNotes, timedChapters } from "./chapters";
import { desktop, film, filmPage, finalCta, memory, project, stealth } from "./copy";
import { bloubCredit } from "./credits";

const REPO = join(import.meta.dir, "..", "..");
const claims = readFileSync(join(REPO, "docs", "CLAIMS.md"), "utf8");
/** The claim cell of a CLAIMS row, without a leading "(…, date)" note. */
function claim(id: string): string {
  const row = claims.split("\n").find((l) => l.startsWith(`| ${id} |`));
  if (!row) throw new Error(`docs/CLAIMS.md has no row ${id}`);
  return row.split(" | ")[1]!.replace(/^\([^)]*\)\s*/, "");
}

/** The long-task scene's title, which the page's own words never use (the owner's ruling, 2 Nov 2026). */
const TITLE_NAME = /context[\s-]*warp/i;

/** Every string a chapter shows or reads: its title, its lines and its description. */
const chapterText = (c: (typeof chapters)[number]) => [c.title, ...c.onScreen, c.description];

describe("the film's words", () => {
  test("the lead says film, word for word as C-FILM3-1", () => {
    expect(claim("C-FILM3-1")).toContain(`"${film.lead}"`);
    expect(film.lead).toStartWith("The Pebble 2.0 launch film");
    expect(film.lead).not.toMatch(/trailer/i);
  });

  test("the poster's alt is C-FILM3-2's, and the /film lead C-FILM3-3's", () => {
    expect(claim("C-FILM3-2")).toContain(`"${film.posterAlt}"`);
    expect(claim("C-FILM3-3")).toContain(`"${filmPage.lead}"`);
    for (const text of [film.posterAlt, filmPage.lead]) expect(text).not.toMatch(/trailer/i);
  });

  test("the film's notes are the approved description's sentences (docs/launch/LINKEDIN_POST.md)", () => {
    const post = readFileSync(join(REPO, "docs", "launch", "LINKEDIN_POST.md"), "utf8");
    const block = post.slice(post.indexOf("## The video's description"), post.indexOf("## Notes for the owner"));
    const flat = (s: string) => s.replace(/^> ?/gm, "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");
    const approved = flat(block);
    for (const note of filmNotes) for (const sentence of note.split(/(?<=[.;]) (?=[A-Z])/)) expect(approved).toContain(flat(sentence));
    // the benchmark's method stands beside the comparisons the transcript quotes
    expect(filmNotes.join(" ")).toContain("one model for both products in each comparison");
  });
});

describe("the chapters are the master's scenes", () => {
  test("twelve chapters, S00 to S11, in time order from 0, each on a master frame", () => {
    expect(chapters.map((c) => c.scene)).toEqual(Array.from({ length: 12 }, (_, i) => `S${String(i).padStart(2, "0")}`));
    expect(timedChapters().length).toBe(chapters.length);
    expect(chapters[0]!.startSeconds).toBe(0);
    let last = -1;
    for (const c of chapters) {
      const s = c.startSeconds!;
      expect(s).toBeGreaterThan(last);
      expect(Math.abs(s * FILM_FPS - Math.round(s * FILM_FPS))).toBeLessThan(0.05); // a frame, to the millisecond
      last = s;
    }
    expect(last).toBeLessThan(FILM_DURATION_SECONDS!);
  });

  test("the film is the master's 99.4 s, 2,982 frames, shown as 1:39", () => {
    expect(FILM_DURATION_SECONDS).toBe(99.4);
    expect(Math.round(FILM_DURATION_SECONDS! * FILM_FPS)).toBe(2982);
    expect(filmDurationLabel()).toBe("1:39");
  });

  test("the scenes start where the master's timeline puts them (video/src/launch/master/timeline.ts, read as text)", () => {
    const timeline = readFileSync(join(REPO, "video", "src", "launch", "master", "timeline.ts"), "utf8");
    const slots = [...timeline.matchAll(/\{ id: "(S\d\d)-[A-Za-z]+", in: ([\d.]+), out: ([\d.]+)/g)].map((m) => ({ scene: m[1], in: Number(m[2]) }));
    expect(slots.length).toBe(12);
    for (const slot of slots) {
      const chapter = chapters.find((c) => c.scene === slot.scene)!;
      expect({ scene: slot.scene, frame: Math.round(chapter.startSeconds! * FILM_FPS) }).toEqual({ scene: slot.scene, frame: Math.round(slot.in * FILM_FPS) });
    }
    expect(timeline).toContain(`export const FILM_S = ${FILM_DURATION_SECONDS};`);
  });
});

describe("the page's own words for the film keep the house rules", () => {
  test("no chapter, line, description or note uses the long-task scene's title, and none says trailer", () => {
    for (const c of chapters) for (const text of chapterText(c)) expect({ id: c.id, hit: TITLE_NAME.test(text) || /trailer/i.test(text) }).toEqual({ id: c.id, hit: false });
    for (const note of filmNotes) expect(TITLE_NAME.test(note)).toBe(false);
    expect(chapters.find((c) => c.id === "long-tasks")!.title).toBe("Long tasks");
  });

  test("Stealth Lockdown is named only beside its honest line, word for word, and no chapter title names it", () => {
    for (const c of chapters) {
      expect(c.title).not.toContain(stealth.name);
      for (const text of [...c.onScreen, c.description]) {
        if (text.includes(stealth.name)) {
          expect({ id: c.id, honest: c.description.includes(stealth.honest) && c.onScreen.includes(stealth.honest) }).toEqual({ id: c.id, honest: true });
        }
      }
    }
    const presenting = chapters.find((c) => c.id === "presenting")!;
    expect(presenting.onScreen).toEqual(["Presenting?", "Stealth Lockdown.", stealth.honest]);
  });

  test("the end card's bloub credit is credits.ts's, word for word", () => {
    const get = chapters.find((c) => c.id === "get")!;
    expect(get.onScreen).toContain(bloubCredit);
    expect(get.description).toContain(bloubCredit);
  });

  test("each description reads in sentences of at most 32 words (the audio description's line limit)", () => {
    for (const c of chapters) {
      for (const sentence of c.description.split(/(?<=[.!?…][”’"')\]]?)\s+(?=[A-Z0-9“‘"(])/u)) {
        expect({ id: c.id, sentence, ok: sentence.split(/\s+/).filter(Boolean).length <= 32 }).toEqual({ id: c.id, sentence, ok: true });
      }
    }
  });
});

describe("the chips open chapters that exist", () => {
  test("every chip the sections pass, and every chapterId in copy.ts, is a timed chapter", () => {
    const ids = new Set(timedChapters().map((c) => c.id));
    const dir = join(REPO, "src", "components", "sections");
    const literal = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/\bchip="([a-z0-9-]+)"/g)].map((m) => m[1]!));
    expect(literal.sort()).toEqual(["agentguard", "benchmarks", "get", "mac", "presenting", "remote", "workshop"]);
    for (const id of [...literal, desktop.chapterId, project.chapterId, memory.chapterId, finalCta.chapterId]) expect({ id, known: ids.has(id) }).toEqual({ id, known: true });
  });
});

describe("the transcript carries the caption track's words", () => {
  // public/media/v3/film.en.vtt is built from the film's own captions (video/src/launch/master/captions.ts, through
  // tools/captions/build.mjs); its cues carry the film's on-screen type. The transcript (chapters.ts `onScreen`) is the
  // page's own text, so it carries every word of every cue, in the chapter the cue starts in, but one: the long-task
  // scene's title, which the track keeps and the page's words leave out (the owner's ruling, 2 Nov 2026).
  const vttPath = join(REPO, "public", "media", "v3", "film.en.vtt");
  const words = (text: string) =>
    text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/^[.,:;!?“”"‘’()]+|[.,:;!?“”"‘’()]+$/g, ""))
      .filter((w) => /[\p{L}\p{N}]/u.test(w));
  const cues = () =>
    readFileSync(vttPath, "utf8")
      .split(/\n\s*\n/)
      .map((block) => block.split("\n"))
      .filter((lines) => lines.some((l) => l.includes("-->")))
      .map((lines) => {
        const at = lines.findIndex((l) => l.includes("-->"));
        const [h, m, s] = lines[at]!.split("-->")[0]!.trim().split(":").map(Number);
        return { start: h! * 3600 + m! * 60 + s!, text: lines.slice(at + 1).join(" ") };
      });

  test("the track exists beside the film", () => {
    expect(existsSync(vttPath)).toBe(true);
  });

  test("every cue's words are in its chapter's lines, but the long-task title's", () => {
    const list = cues();
    expect(list.length).toBeGreaterThan(30);
    const titled = list.filter((cue) => TITLE_NAME.test(cue.text));
    expect(titled.length).toBe(1); // the track keeps the film's words
    for (const cue of list) {
      if (TITLE_NAME.test(cue.text)) continue;
      const chapter = [...timedChapters()].reverse().find((c) => c.startSeconds! <= cue.start + 0.0005)!;
      const have = new Set(chapter.onScreen.flatMap(words));
      const missing = words(cue.text).filter((w) => !have.has(w));
      expect({ cue: cue.text, chapter: chapter.id, missing }).toEqual({ cue: cue.text, chapter: chapter.id, missing: [] });
    }
  });
});
