// Exports the source frames the opening's acts draw (opening/film.ts ACTS) from each kept take's conformed mp4 into
// video/public/ui-frames/real-takes/<take>/<n>.jpg (gitignored), like setpieces/tools/export-takes.ts does for the reel,
// skipping frames already there. A heavy job: run it through heavy.sh from the repo's root:
//   scripts/heavy.sh f2-export-opening /usr/sbin/taskpolicy -c utility bun video/src/film2/opening/tools/export-frames.ts
// `--check` lists the missing frames only (light).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { REAL_TAKE_SOURCES, takeFramePath, type TakeManifest } from "../../setpieces/take";
import { ACTS } from "../film";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const PUBLIC = join(ROOT, "video/public");
const FF = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
const MARGIN = 2;

const ranges = new Map<string, { m: TakeManifest; r: [number, number][] }>();
for (const act of ACTS)
  for (const s of act.shots) {
    if (s.kind !== "take" || !s.take) continue;
    const x = ranges.get(s.take.id) ?? { m: s.take, r: [] };
    x.r.push([Math.max(0, s.from! - MARGIN), Math.min(s.take.frames - 1, s.to! - 1 + MARGIN)]);
    ranges.set(s.take.id, x);
  }

const check = process.argv.includes("--check");
let todo = 0;
for (const { m, r } of ranges.values()) {
  const src = REAL_TAKE_SOURCES[m.id];
  if (!src) throw new Error(`take ${m.id} has no source mp4`);
  for (const [lo, hi] of r) {
    const miss: number[] = [];
    for (let n = lo; n <= hi; n++) if (!existsSync(join(PUBLIC, takeFramePath(m, n)))) miss.push(n);
    console.log(`${m.id}: ${lo}–${hi}, ${miss.length} missing`);
    todo += miss.length;
    if (check || !miss.length) continue;
    // export each run of missing frames (an input seek to a frame's timestamp lands on that frame: 60 fps CFR from 0 s)
    let i = 0;
    while (i < miss.length) {
      let j = i;
      while (j + 1 < miss.length && miss[j + 1] === miss[j]! + 1) j++;
      const a = miss[i]!;
      const b = miss[j]!;
      const dir = join(PUBLIC, takeFramePath(m, a).replace(/\/[^/]+$/, ""));
      mkdirSync(dir, { recursive: true });
      execFileSync(FF, ["-v", "error", "-y", "-ss", (a / m.fps).toFixed(6), "-i", join(ROOT, src), "-frames:v", String(b - a + 1), "-start_number", String(a + 1), "-q:v", "3", join(dir, "%05d.jpg")], { stdio: "inherit" });
      i = j + 1;
    }
  }
}
if (check) {
  console.log(todo ? `${todo} frames to export` : "every frame the opening uses is exported");
  process.exit(todo ? 1 : 0);
}
