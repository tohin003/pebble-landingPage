// The loop posters (MASTER_PLAN §5.3–§5.5): each poster IS its loop's frame 0, rendered from the loop composition
// itself (`remotion still <Composition> --frame=0`), so the poster the page shows first and the video's first frame
// are the same picture. Files follow src/lib/media.ts: loop-<id>.poster and loop-<id>-phone.poster (the 4:5 cut for
// phones, critic H2); tools/assets/posters.mjs encodes AVIF and WebP. Sizes follow the loops' aspects (loops/plans.ts
// FRAME): 16:10 for the wide slots, square for the project story's tile (comp lex-A, lane v2-loops), 4:5 for phones.
// The film poster is FilmPoster (= T0's frame 0) and the teaser's poster is the same picture.

export interface LoopPoster {
  /** the Remotion composition */
  composition: string;
  /** the page's media name (src/lib/media.ts LoopId), with -phone for the 4:5 cut */
  file: string;
  width: number;
  height: number;
}

export const LOOP_POSTERS: readonly LoopPoster[] = [
  { composition: "LoopCompanion", file: "loop-companion.poster", width: 1600, height: 1000 },
  { composition: "LoopCompanionPhone", file: "loop-companion-phone.poster", width: 1080, height: 1350 },
  { composition: "LoopModels", file: "loop-models.poster", width: 1600, height: 1000 },
  { composition: "LoopApproveUndo", file: "loop-approve-undo.poster", width: 1080, height: 1080 },
  { composition: "LoopApproveUndoPhone", file: "loop-approve-undo-phone.poster", width: 1080, height: 1350 },
  { composition: "LoopIsolatedTests", file: "loop-isolated-tests.poster", width: 1080, height: 1080 },
  { composition: "LoopIsolatedTestsPhone", file: "loop-isolated-tests-phone.poster", width: 1080, height: 1350 },
  { composition: "LoopAgentGuard", file: "loop-agentguard.poster", width: 1600, height: 1000 },
  { composition: "LoopAgentGuardPhone", file: "loop-agentguard-phone.poster", width: 1080, height: 1350 },
  { composition: "LoopMemory", file: "loop-memory.poster", width: 1600, height: 1000 },
  { composition: "LoopViews", file: "loop-views.poster", width: 1600, height: 1000 },
  { composition: "FilmTeaser", file: "teaser.poster", width: 1280, height: 720 },
];
