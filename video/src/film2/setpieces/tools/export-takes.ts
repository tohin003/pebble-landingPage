// Exports the source frames the reel uses from each kept 2.0.0 take (setpieces/take.ts REAL_TAKES) into
// video/public/ui-frames/real-takes/<take>/<n>.jpg (gitignored, like every capture), named by the 1-based source frame
// (takeFramePath). Only the frames some use of a take can draw, in every aspect, plus 2 frames of margin each side.
// A heavy job: run it through heavy.sh, from the repo's root:
//   scripts/heavy.sh f2-export-takes /usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/export-takes.ts
// `--check` lists the missing frames only (light). The conformed mp4s (60 fps CFR, the first frame at 0 s) are read
// with an input seek to the range's first frame's timestamp, which lands on that frame index exactly.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoPlans } from "../demo/plans";
import { REAL_TAKE_SOURCES, sourceFrameAt, takeFramePath, type TakeManifest } from "../take";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const PUBLIC = join(ROOT, "video/public");
const FF = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
const MARGIN = 2;

/** Every source range of every real take the reel draws (inclusive), merged per take. */
export function usedRanges(): Map<TakeManifest, [number, number][]> {
  const raw = new Map<string, { m: TakeManifest; r: [number, number][] }>();
  for (const a of ["16:9", "1:1", "9:16"] as const) {
    for (const e of demoPlans(a)) {
      for (const u of e.plan.takes ?? []) {
        if (!u.manifest.pattern) continue;
        const lo = Math.max(0, u.inPoint - MARGIN);
        const hi = Math.min(u.manifest.frames - 1, sourceFrameAt(u.until - 1, u.at, e.plan.fps, u.manifest, u.inPoint) + MARGIN);
        const x = raw.get(u.manifest.id) ?? { m: u.manifest, r: [] };
        x.r.push([lo, hi]);
        raw.set(u.manifest.id, x);
      }
    }
  }
  const out = new Map<TakeManifest, [number, number][]>();
  for (const { m, r } of raw.values()) {
    r.sort((p, q) => p[0] - q[0]);
    const merged: [number, number][] = [];
    for (const [lo, hi] of r) {
      const last = merged[merged.length - 1];
      if (last && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
      else merged.push([lo, hi]);
    }
    out.set(m, merged);
  }
  return out;
}

const missing = (m: TakeManifest, [lo, hi]: [number, number]): number[] => {
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) if (!existsSync(join(PUBLIC, takeFramePath(m, n)))) out.push(n);
  return out;
};

const check = process.argv.includes("--check");
let todo = 0;
for (const [m, ranges] of usedRanges()) {
  const src = REAL_TAKE_SOURCES[m.id];
  if (!src) throw new Error(`take ${m.id} has no source mp4 in REAL_TAKE_SOURCES`);
  for (const r of ranges) {
    const miss = missing(m, r);
    console.log(`${m.id}: source frames ${r[0]}–${r[1]} (${r[1] - r[0] + 1}), ${miss.length} missing`);
    todo += miss.length;
    if (check || miss.length === 0) continue;
    const dir = join(PUBLIC, takeFramePath(m, r[0]).replace(/\/[^/]+$/, ""));
    mkdirSync(dir, { recursive: true });
    // (the frame at r[0] ÷ 60 s is source frame r[0]: the conformed mp4 starts at 0 s and is constant-rate)
    execFileSync(FF, ["-v", "error", "-y", "-ss", (r[0] / m.fps).toFixed(6), "-i", join(ROOT, src), "-frames:v", String(r[1] - r[0] + 1), "-start_number", String(r[0] + 1), "-q:v", "3", join(dir, "%05d.jpg")], { stdio: "inherit" });
    const left = missing(m, r);
    if (left.length) throw new Error(`${m.id}: ${left.length} frames still missing after the export (first ${left[0]})`);
    console.log(`  exported into ${dir} (${readdirSync(dir).length} files there)`);
  }
}
if (check) {
  console.log(todo ? `${todo} frames to export` : "every frame the reel uses is exported");
  process.exit(todo ? 1 : 0);
}
