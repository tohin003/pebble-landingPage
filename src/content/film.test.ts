// The film section's words describe the trailer (OVERRIDES §46 P2-8): the lead is CLAIMS row C-FILM-2 word for word,
// the /film page's lead is its first sentence, and the poster's alt is C-ALT-1's. Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { film, filmPage } from "./copy";

const claims = readFileSync(join(import.meta.dir, "..", "..", "docs", "CLAIMS.md"), "utf8");
/** The claim cell of a CLAIMS row, without a leading "(…, date)" note. */
function claim(id: string): string {
  const row = claims.split("\n").find((l) => l.startsWith(`| ${id} |`));
  if (!row) throw new Error(`docs/CLAIMS.md has no row ${id}`);
  return row.split(" | ")[1]!.replace(/^\([^)]*\)\s*/, "");
}

describe("the film's words", () => {
  test("the lead is C-FILM-2, word for word", () => {
    expect(claim("C-FILM-2").startsWith(film.lead)).toBe(true);
    expect(film.lead).toBe(
      "A short trailer with music and no voiceover: three questions, Pebble's own answers, a quick tour, and one bug fix carried through to a tested change.",
    );
  });

  test("the /film page's lead opens with C-FILM-2's first sentence", () => {
    expect(filmPage.lead.startsWith("A short trailer with music and no voiceover.")).toBe(true);
  });

  test("the first film's description is gone from the copy", () => {
    const copy = readFileSync(join(import.meta.dir, "copy.ts"), "utf8");
    expect(copy).not.toContain("one small bug fix, from a question to a tested change");
    expect(copy).not.toContain("[C-FILM-1]");
    expect(copy).not.toMatch(/teaser/i);
  });

  test("these words stay the trailer's only while the page plays the trailer (src/lib/media.ts filmMedia)", () => {
    // The page plays the 2.0 launch film as soon as one of its 16:9 files is in public/media/v3. From then on the
    // trailer's lead, poster alt and chapters would describe the wrong film: the film lane changes them in the same
    // change (SITE_AUDIT §4.1, §4.5; C-FILM-2, C-ALT-1, C-CH-* retire then).
    const v3 = join(import.meta.dir, "..", "..", "public", "media", "v3");
    const launch = existsSync(v3) && readdirSync(v3).some((f) => /^film-(1080|720)\.(hevc|h264)\.mp4$/.test(f));
    if (launch) {
      expect(film.lead).not.toBe(claim("C-FILM-2"));
      expect(film.lead).not.toContain("trailer");
      expect(filmPage.lead).not.toContain("trailer");
    } else {
      expect(film.lead).toContain("trailer");
    }
  });

  test("the poster's alt is C-ALT-1's", () => {
    expect(claim("C-ALT-1 (alt)")).toContain(`\`film.posterAlt\`: "${film.posterAlt}"`);
  });
});
