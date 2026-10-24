// The release facts as the page lists them (OVERRIDES §16, §20, §21, §23): separate items, never joined into a
// middle-dot string, and the sticky pill's third fact "Not notarized". The facts themselves are releaseFacts.ts's,
// checked against their sources in docs/CLAIMS.md (C-REL-1..6).
// Run: bun test ./src/content
import { describe, expect, test } from "bun:test";
import { releaseFacts as listFacts } from "@/lib/release";
import * as copy from "./copy";
import { formatMegabytes, hero, releaseMeta, stickyCta } from "./copy";
import { releaseFacts } from "./releaseFacts";

describe("the facts under a Download", () => {
  test("are four separate items, the version and the size from releaseFacts.ts", () => {
    const facts = releaseMeta();
    expect([...facts]).toEqual([`v${releaseFacts.version}`, formatMegabytes(releaseFacts.sizeBytes), "Apple silicon", "macOS 12 or later"]);
    expect(listFacts({ version: "9.9.9", sizeLabel: "70 MB" })).toEqual(["v9.9.9", "70 MB", "Apple silicon", "macOS 12 or later"]);
    for (const fact of facts) expect(fact).not.toContain("·");
  });

  test("the sticky pill: the version, the size and “Not notarized”, each its own item", () => {
    expect([...stickyCta.facts("1.2.0", "72 MB")]).toEqual(["v1.2.0", "72 MB", "Not notarized"]);
    expect([...stickyCta.facts()]).toEqual([`v${releaseFacts.version}`, formatMegabytes(releaseFacts.sizeBytes), "Not notarized"]);
  });

  test("the hero's requirements are a list, and no middle-dot meta string is left to render", () => {
    expect(hero.requirements.length).toBe(4);
    expect("requirementsLine" in hero).toBe(false);
    expect("releasePill" in copy).toBe(false);
    for (const item of hero.requirements) expect(item).not.toContain("·");
  });
});
