// Scene group a, the bookends (S00 cold open, S01 title, S11 outro): owned by its worker (docs/launch/EDIT_PLAN.md).
// scenes/Previews.tsx registers them for 16:9 and 4:5. SFX are suggestions only (A_SFX): the director places them.
import type { SceneDef } from "../types";
import { S00ColdOpen, S00_MARKS, S00_NOMINAL, S00_SFX } from "./S00ColdOpen";
import { S01Title, S01_MARKS, S01_NOMINAL, S01_SFX } from "./S01Title";
import { S11Outro, S11_MARKS, S11_NOMINAL, S11_SFX } from "./S11Outro";

export const GROUP_A: SceneDef[] = [
  { id: "S00-ColdOpen", component: S00ColdOpen, nominalS: S00_NOMINAL, marks: S00_MARKS },
  { id: "S01-Title", component: S01Title, nominalS: S01_NOMINAL, marks: S01_MARKS },
  { id: "S11-Outro", component: S11Outro, nominalS: S11_NOMINAL, marks: S11_MARKS },
];

export const A_SFX = [...S00_SFX, ...S01_SFX, ...S11_SFX];
