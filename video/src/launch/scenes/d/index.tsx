// Scene group d: the Daylight explainers and the payoff (S06 Memory, S07 Context warping, S10 Benchmarks). Owned by
// its worker (docs/launch/EDIT_PLAN.md, .work/launch/briefs/scenes-d.md); scenes/Previews.tsx registers them for 16:9
// and 4:5. Each scene also exports its SFX cue list (s06Sfx, s07Sfx, s10Sfx: seconds from the scene's start, for a
// retime factor k) for the master's sound lane.
import type { SceneDef } from "../types";
import { S06Memory, S06_MARKS, S06_NOMINAL } from "./S06Memory";
import { S07ContextWarping, S07_MARKS, S07_NOMINAL } from "./S07ContextWarping";
import { S10Benchmarks, S10_MARKS, S10_NOMINAL } from "./S10Benchmarks";

export { s06Sfx } from "./S06Memory";
export { s07Sfx } from "./S07ContextWarping";
export { s10Sfx } from "./S10Benchmarks";

export const GROUP_D: SceneDef[] = [
  { id: "S06-Memory", component: S06Memory, nominalS: S06_NOMINAL, marks: S06_MARKS },
  { id: "S07-ContextWarping", component: S07ContextWarping, nominalS: S07_NOMINAL, marks: S07_MARKS },
  { id: "S10-Benchmarks", component: S10Benchmarks, nominalS: S10_NOMINAL, marks: S10_MARKS },
];
