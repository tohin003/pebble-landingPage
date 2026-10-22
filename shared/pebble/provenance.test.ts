// The copies stay honest: unchanged files match the Pebble v1.0.1 sources byte for byte, changed ones say so, the MIT
// notice travels with bloub, and nothing here imports from outside shared/pebble.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const HERE = import.meta.dir;
const sources = JSON.parse(readFileSync(join(HERE, "SOURCES.json"), "utf8")) as {
  files: { path: string; sha256: string; change: string; headerLines?: number }[];
};
const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

describe("provenance", () => {
  test("unchanged copies match the Pebble v1.0.1 files", () => {
    for (const f of sources.files) {
      const body = readFileSync(join(HERE, f.path));
      if (f.change === "none") expect(`${f.path} ${sha256(body)}`).toBe(`${f.path} ${f.sha256}`);
      else if (f.headerLines) {
        const rest = body.toString("utf8").split("\n").slice(f.headerLines).join("\n");
        expect(`${f.path} ${sha256(rest)}`).toBe(`${f.path} ${f.sha256}`);
      } else {
        expect(body.toString("utf8").slice(0, 400)).toContain("Modified for the Pebble site");
      }
    }
  });

  test("bloub's MIT notice is kept with the engine", () => {
    const license = readFileSync(join(HERE, "bloub", "LICENSE"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 Jérémy Perret");
    expect(license).toContain("The above copyright notice and this permission notice shall be included");
    const provenance = JSON.parse(readFileSync(join(HERE, "bloub", "PROVENANCE.json"), "utf8"));
    expect(provenance.project).toBe("https://github.com/jeremy-prt/bloub");
  });

  test("every .ts file imports only from inside shared/pebble", () => {
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
          const src = readFileSync(p, "utf8");
          for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)\b[^"']*?from\s*["']([^"']+)["']/g)) {
            const spec = m[1]!;
            const target = resolve(dirname(p), spec);
            if (!spec.startsWith(".") || relative(HERE, target).startsWith("..")) bad.push(`${relative(HERE, p)} -> ${spec}`);
          }
        }
      }
    };
    walk(HERE);
    expect(bad).toEqual([]);
  });
});
