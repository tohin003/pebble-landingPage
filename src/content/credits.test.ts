// The film's music and sound credits say what the launch trailer plays (OVERRIDES §45): a score synthesised in code
// with no samples, the synthesised effects the final cue list uses, and Kenney's entry only for its takes still in it.
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { creditSections } from "./credits";

const repo = join(import.meta.dir, "..", "..");
const section = (id: string) => creditSections.find((s) => s.id === id)!;
type Cue = { file?: string; role?: string; take?: string };
const cues = JSON.parse(readFileSync(join(repo, "tools", "audio", "cues.json"), "utf8")) as Cue[];
const kit = JSON.parse(readFileSync(join(repo, "tools", "audio", "sfx_kit.json"), "utf8")) as { roles: Record<string, { origin?: string }> };
const rolesInUse = new Set(cues.filter((c) => c.file && c.role).map((c) => c.role!));

describe("the film's credits", () => {
  test("the trailer's music is one score, synthesised in code, with no samples and no third-party music", () => {
    const music = section("music");
    expect(music.items.length).toBe(2);
    const score = music.items[0]!;
    expect(score.name).toBe("Pebble launch trailer score");
    expect(score.use).toContain("synthesised in code");
    expect(score.use).toContain("no samples");
    expect(score.use).toContain("no third-party music");
    for (const s of creditSections) for (const item of s.items) expect(item.name).not.toMatch(/VCSL|VSCO|Versilian/);
  });

  test("the synthesised effects named are the ones the cue list plays, and no retired one", () => {
    const original = section("sound").items.find((i) => i.name === "Original sound effects")!;
    const words: Record<string, string> = { whoosh: "whooshes", impact: "impacts", ui: "interface's events", rim: "rim clicks", suck: "suck-backs" };
    for (const role of rolesInUse) {
      if (!/^synthesised/.test(kit.roles[role]?.origin ?? "")) continue;
      expect(words[role]).toBeDefined();
      expect(original.use).toContain(words[role]!);
    }
    for (const retired of ["riser", "shimmer", "soft hit", "downlifter"]) expect(original.use).not.toContain(retired);
    for (const role of ["riser", "shimmer", "hit"]) expect(rolesInUse.has(role)).toBe(false);
  });

  test("the launch film's music is Mixkit's “Your Breath” by Eugenio Mininni, a courtesy line (the director's X12)", () => {
    const track = section("music").items.find((i) => i.name === "Your Breath")!;
    expect(track.by).toBe("Eugenio Mininni (Mixkit)");
    expect(track.licence).toBe("Mixkit Stock Music Free License");
    expect(track.use).toContain("courtesy");
    const sfx = section("sound").items.find((i) => i.name === "Sound effects of the Pebble 2.0 launch film")!;
    expect(sfx.licence).toBe("CC0 1.0");
    expect(sfx.by).toContain("Kenney");
  });

  test("CREDITS.md says the same as /credits", () => {
    const md = readFileSync(join(repo, "CREDITS.md"), "utf8").replace(/\s+/g, " ");
    expect(md).toContain("**\"Your Breath\"** by Eugenio Mininni (Mixkit)");
    expect(md).toContain("Mixkit Stock Music Free License");
    expect(md).toContain("no credit is required; this line is a courtesy");
    expect(md).toContain("\"Impact Sounds\" and \"Interface Sounds\", CC0 1.0, and sounds designed in code");
  });

  test("Kenney's entry stays while the cue list plays its takes, and names only what they are", () => {
    const kenneyRoles = [...rolesInUse].filter((r) => /Kenney/.test(kit.roles[r]?.origin ?? "")).sort();
    expect(kenneyRoles).toEqual(["click", "key", "thud", "tick"]);
    const kenney = section("sound").items.find((i) => i.by === "Kenney")!;
    expect(kenney.use).toBe("Recorded clicks, ticks and soft thuds, trimmed and tuned for the launch trailer.");
  });
});
