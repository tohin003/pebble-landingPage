// The film's music and sound credits say what the site's film plays: the Pebble 2.0 launch film (since 2 Nov 2026; the
// director's X12): Mixkit's "Your Breath" as a courtesy line, and Kenney's CC0 packs with sounds designed in code. The
// 1.x trailer's score and effects left /credits with the trailer; CREDITS.md keeps their record.
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bloubCredit, creditSections } from "./credits";

const repo = join(import.meta.dir, "..", "..");
const section = (id: string) => creditSections.find((s) => s.id === id)!;

describe("the film's credits", () => {
  test("the film's music is Mixkit's “Your Breath” by Eugenio Mininni, a courtesy line (the director's X12)", () => {
    const music = section("music");
    expect(music.items.map((i) => i.name)).toEqual(["Your Breath"]);
    const track = music.items[0]!;
    expect(track.by).toBe("Eugenio Mininni (Mixkit)");
    expect(track.licence).toBe("Mixkit Stock Music Free License");
    expect(track.use).toContain("Pebble 2.0 launch film");
    expect(track.use).toContain("courtesy");
    for (const s of creditSections) for (const item of s.items) expect(item.name).not.toMatch(/VCSL|VSCO|Versilian/);
  });

  test("the film's effects: Kenney's CC0 packs and sounds designed for this project, and no other entry", () => {
    const sound = section("sound");
    expect(sound.items.map((i) => i.name)).toEqual(["Sound effects of the Pebble 2.0 launch film"]);
    const sfx = sound.items[0]!;
    expect(sfx.licence).toBe("CC0 1.0");
    expect(sfx.by).toContain("Kenney");
    expect(sfx.use).toContain("Pebble itself makes no sounds.");
  });

  test("the retired trailer's score and effects are gone from /credits", () => {
    for (const s of creditSections) {
      for (const item of s.items) {
        expect(item.name).not.toBe("Pebble launch trailer score");
        expect(item.use ?? "").not.toContain("launch trailer");
      }
    }
  });

  test("CREDITS.md says the same as /credits, with the trailer kept as a record and the pebble credited", () => {
    const md = readFileSync(join(repo, "CREDITS.md"), "utf8").replace(/\s+/g, " ");
    expect(md).toContain("**\"Your Breath\"** by Eugenio Mininni (Mixkit)");
    expect(md).toContain("Mixkit Stock Music Free License");
    expect(md).toContain("no credit is required; this line is a courtesy");
    expect(md).toContain("\"Impact Sounds\" and \"Interface Sounds\", CC0 1.0, and sounds designed in code");
    expect(md).toContain("## The 1.x launch trailer (retired from the site)");
    // bloub wherever the pebble appears: the film's end card carries the credit word for word
    expect(md).toContain(`The film's end card credits it: "${bloubCredit}"`);
  });
});
