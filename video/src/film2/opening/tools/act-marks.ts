// The marks luma-scan --marks needs for an act's render (qa/reel-scan.ts ReelMarks), from the act's plan: its cuts, its
// lines' entrances and exits, and each take shot as a recording (the recording's own changes, a window opening or a
// Space sliding, are Pebble's and macOS's, not the edit's: tile pops are not judged inside them; flashes still are).
//   bun video/src/film2/opening/tools/act-marks.ts <act1|ring1|ring2|ring3> <16:9|1:1|9:16> --out marks.json
import { writeFileSync } from "node:fs";
const DEMO_SIZE = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } } as const;
import { ACTS } from "../film";
import { LINE_EXIT, LINE_IN, actFrames, shotFrames, shotStarts } from "../kit";

const [id, aspect] = process.argv.slice(2) as [string, "16:9" | "1:1" | "9:16"];
const out = process.argv[process.argv.indexOf("--out") + 1]!;
const act = ACTS.find((a) => a.id === id);
if (!act) throw new Error(`no act ${id}`);
const starts = shotStarts(act);
const marks = {
  aspect,
  fps: 60,
  width: DEMO_SIZE[aspect].w,
  height: DEMO_SIZE[aspect].h,
  total: actFrames(act),
  cuts: starts.slice(1),
  transitions: [
    ...act.shots.flatMap((s, i) => (s.kind === "take" ? [{ from: starts[i]!, to: starts[i]! + shotFrames(s), id: `recording ${s.id}` }] : [])),
    ...act.lines.flatMap((l) => [
      { from: l.at, to: l.at + LINE_IN + 6, id: `${l.id} in` },
      ...(l.cutOut ? [] : [{ from: l.exitAt, to: l.exitAt + LINE_EXIT + 2, id: `${l.id} out` }]),
    ]),
  ],
  waits: [],
  hits: [],
  types: [],
  stones: [],
  apertures: [],
};
writeFileSync(out, JSON.stringify(marks, null, 1));
console.log(`${id} ${aspect}: ${marks.cuts.length} cuts, ${marks.transitions.length} transitions → ${out}`);
