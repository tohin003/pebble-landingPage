// Scene group C (S04 AgentGuard, S05 Pebble's Workshop): owned by its worker (docs/launch/EDIT_PLAN.md).
// scenes/Previews.tsx registers them for 16:9 and 4:5. C_SFX lists the scene-local SFX each scene places itself.
import type { SceneDef } from "../types";
import { S04AgentGuard, S04_MARKS, S04_NOMINAL, S04_SFX } from "./S04AgentGuard";
import { S05Workshop, S05_MARKS, S05_NOMINAL, S05_SFX } from "./S05Workshop";

export const GROUP_C: SceneDef[] = [
  { id: "S04-AgentGuard", component: S04AgentGuard, nominalS: S04_NOMINAL, marks: S04_MARKS },
  { id: "S05-Workshop", component: S05Workshop, nominalS: S05_NOMINAL, marks: S05_MARKS },
];

export const C_SFX = [...S04_SFX, ...S05_SFX];
