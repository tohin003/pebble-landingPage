// bloub's MIT notice on /credits must be the shipped LICENSE, byte for byte. Run: bun test ./src/content
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOUB_MIT_LICENCE } from "./licences";

test("BLOUB_MIT_LICENCE equals shared/pebble/bloub/LICENSE", () => {
  const file = readFileSync(join(import.meta.dir, "..", "..", "shared", "pebble", "bloub", "LICENSE"), "utf8");
  expect(BLOUB_MIT_LICENCE).toBe(file);
});
