// Reads the score lane's cue data from the checkout's .work/ (gitignored) for the checks that hold a piece to the cue
// sheet (setpieces/qa.ts cueLengths; fix round 3). Tools and tests only: the Remotion bundle never reads a file.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CUE_SHEET_FILE, ringFourCue, type RingCueLengths } from "../cueSheet";

/** The repository's root: video/src/film2/setpieces/tools is five levels under it. */
export const REPO_ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));

/** Ring 4's lengths on the cue sheet, or null when the cue data is absent (a clone without .work/) or has no Ring 4. */
export function loadRingFourCue(root = REPO_ROOT): RingCueLengths | null {
  const path = resolve(root, CUE_SHEET_FILE);
  if (!existsSync(path)) return null;
  return ringFourCue(JSON.parse(readFileSync(path, "utf8")), CUE_SHEET_FILE);
}
