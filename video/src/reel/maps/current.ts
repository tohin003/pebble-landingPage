// The beat map the style test is cut to: the music lane's style-test.beatmap.json (styleTest.map.ts), read by
// normalizeBeatMap. TEMP_MAP is the grid the system was built on before it landed (133.33 BPM, the drop at 5.4 s).
import { gridBeatMap, normalizeBeatMap, type BeatMap } from "../beats";
import { STYLE_TEST_RAW } from "./styleTest.map";

export const TEMP_MAP: BeatMap = gridBeatMap({ bpm: 400 / 3, durationS: 15, dropS: 5.4, name: "temporary grid (133.33 BPM, drop 5.4 s)" });
export const STYLE_TEST_MAP: BeatMap = normalizeBeatMap(STYLE_TEST_RAW, "style-test.beatmap.json");
