// The score lane's cue data, as the set pieces' checks read it (fix round 3; OVERRIDES §61: the person chose 35
// readable features at about 2:15, and the score lane cut the music for it, CUE_SHEET.md revision 2). The lengths a
// piece is held to are read from the cue data at check time (setpieces/tools/cue-data.ts reads the file), never typed
// into the code: when the lead rules a flex and the score lane revises the sheet, the checks follow it.
// Pure: the JSON in, the lengths out (no file access here: the Remotion bundle imports setpieces/qa.ts).

/** Where the cue data lives, from the repository's root (gitignored: .work/ never leaves this Mac). */
export const CUE_SHEET_FILE = ".work/score2/CUE_SHEET.json";

/** A block of the main film on the cue sheet: its name and its film times, seconds. */
export interface CueBlock {
  block: string;
  start_s: number;
  end_s: number;
}

/** Ring 4's two parts on the cue sheet: the ring part ("Ring 4") and its cascade ("Cascade 4"), seconds. */
export interface RingCueLengths {
  ringS: number;
  cascadeS: number;
  /** where the numbers came from, for the reports */
  source: string;
}

/** The main film's blocks in a cue sheet's JSON (CUE_SHEET.json `main_film.blocks`), or null when it has none. */
export const cueBlocksOf = (json: unknown): CueBlock[] | null => {
  const blocks = (json as { main_film?: { blocks?: unknown } } | null)?.main_film?.blocks;
  if (!Array.isArray(blocks)) return null;
  return blocks.filter((b): b is CueBlock => !!b && typeof b.block === "string" && typeof b.start_s === "number" && typeof b.end_s === "number");
};

/**
 * Ring 4's ring part and Cascade 4 from a cue sheet's JSON: each block's end less its start. Null when the sheet has
 * no "Ring 4" block (a revision that drops the block); a missing "Cascade 4" (the F5 flex: Cascade 4 out) is 0.
 */
export function ringFourCue(json: unknown, source = CUE_SHEET_FILE): RingCueLengths | null {
  const blocks = cueBlocksOf(json);
  if (!blocks) return null;
  const ring = blocks.find((b) => b.block === "Ring 4");
  if (!ring) return null;
  const cas = blocks.find((b) => b.block === "Cascade 4");
  const version = (json as { version?: string }).version;
  return { ringS: ring.end_s - ring.start_s, cascadeS: cas ? cas.end_s - cas.start_s : 0, source: `${source}${version ? ` (${version.split(":")[0]})` : ""}` };
}
