// Where the Pebble checkout is (READ-ONLY). No local path is committed: PEBBLE_REPO comes from the environment
// (scripts/env.sh exports it), else from the gitignored ../.work/local.env (a line PEBBLE_REPO=/path/to/the/checkout).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function pebbleRepo() {
  if (process.env.PEBBLE_REPO) return process.env.PEBBLE_REPO;
  try {
    const env = fs.readFileSync(path.join(HERE, "..", ".work", "local.env"), "utf8");
    const match = env.match(/^PEBBLE_REPO=(.*)$/m);
    if (match) return match[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  } catch {
    // no local.env: fall through to the error below
  }
  throw new Error("PEBBLE_REPO is not set: run `source scripts/env.sh` first, or add PEBBLE_REPO=/path/to/pebble to .work/local.env");
}
