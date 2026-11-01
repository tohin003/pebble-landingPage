// Scene group e: S08 Pebble Remote (docs/launch/EDIT_PLAN.md "S08"; the real Pebble Remote iPhone app from
// data/remote.ts). scenes/Previews.tsx registers it for 16:9 and 4:5. The scene also exports its SFX cue list (s08Sfx:
// seconds from the scene's start, for the scene's length) for the master's sound lane.
import type { SceneDef } from "../types";
import { S08Remote, S08_MARKS, S08_NOMINAL } from "./S08Remote";

export { s08Sfx, S08_BEATS } from "./S08Remote";

export const GROUP_E: SceneDef[] = [{ id: "S08-Remote", component: S08Remote, nominalS: S08_NOMINAL, marks: S08_MARKS }];
