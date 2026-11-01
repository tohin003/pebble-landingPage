// The launch film's scene contract (docs/launch/EDIT_PLAN.md). Owned by the director.
//
// Each scene group (scenes/a … scenes/e) is owned by one worker and exports a SceneDef[] from its index.tsx.
// scenes/Previews.tsx registers every scene as `Launch-<id>-16x9` and `Launch-<id>-4x5`; the master timeline places
// the same components and passes the length it chose. Scenes choreograph in seconds from their own start for
// `nominalS`, and keep their slack in holds so they still work when the director retimes them by about ±15 %.
import type React from "react";

export interface SceneProps {
  /** The scene's length on the master timeline (defaults to nominalS × fps in the previews). */
  durationInFrames?: number;
}

export interface SceneDef {
  /** e.g. "S00-ColdOpen": the preview ids become `Launch-S00-ColdOpen-16x9` and `-4x5`. */
  id: string;
  component: React.FC<SceneProps>;
  /** The length in seconds this scene is choreographed for (EDIT_PLAN's running order). */
  nominalS: number;
  /** Optional: the moments the director snaps to the music, in seconds from the scene's start. */
  marks?: readonly { name: string; s: number }[];
}
