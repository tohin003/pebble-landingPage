// The light arc measured on a render (CR-14; OVERRIDES §55's targets): the median colour of the GROUND's pixels in each
// section of a set-piece reel (the Drop's pre-roll is Act I's morning, then the Drop's warm, the ring's day, the dusk,
// the climax's evening, the title's page), as the review measured them, then setpieces/../light/grades.ts
// lightArcProblems() on them. The ground's pixels are the frame's minus everything the plan draws over it on that frame
// (every plane with a margin for its shadow, the wall's cells, the cascade's cards, the stone, every line of type, the
// aperture's bands, the slate's strip), so a window or a card never counts as ground.
//
// FFmpeg decodes the sampled frames (a heavy job: run it through heavy.sh):
//   scripts/heavy.sh f2-ground16 /usr/sbin/taskpolicy -c utility \
//     bun video/src/film2/setpieces/tools/ground-light.ts .work/film2/sp3/demo16/F2-SetPieces-Demo.mp4 16:9 --out <report.json>
// Exit 0 when the arc meets the targets, 2 when it does not.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import type { Rect } from "../../motion/geometry";
import { worldToFrame } from "../../motion/camera";
import { apertureRect } from "../../carrier/apertureMath";
import { gradeAt, levels, lightArcProblems, type ArcSection, type RGB } from "../../light/grades";
import { cascadeSchedule } from "../../type/Cascade";
import { demoPlans } from "../demo/plans";
import { lineRect, rectInFrame } from "../frame";
import { carriedRect } from "../kit";
import { drawnSpan, drawnShots, planeRectAt } from "../qa";
import { cellAt } from "../wall";
import type { ScenePlan } from "../scene";

const args = process.argv.slice(2);
const file = args[0];
const aspect = (args.find((x) => /^(16:9|1:1|9:16)$/.test(x)) ?? "16:9") as "16:9" | "1:1" | "9:16";
const outAt = args.indexOf("--out");
const outPath = outAt >= 0 ? args[outAt + 1] : undefined;
if (!file) {
  console.error("usage: bun ground-light.ts <reel.mp4> <16:9|1:1|9:16> [--out report.json]");
  process.exit(64);
}

/** What the plan draws over the ground on a local frame (frame px of the plan), to leave out of the ground's pixels. */
export function overGround(p: ScenePlan, fr: number): Rect[] {
  const out: Rect[] = [];
  const u = p.frame.unit;
  const pad = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });
  for (const d of drawnShots(p, fr)) {
    const s = d.shot;
    const pose = s.camera.pose(fr - s.from);
    for (const pl of s.planes) {
      if (fr < (pl.from ?? -Infinity) || fr >= (pl.to ?? Infinity)) continue;
      // the window and its shadow (DESIGN-LEXINGTON's --shadow-window reaches about 40 px at 1080 below it)
      out.push(pad(planeRectAt(p, s, pl, fr), 44 * u));
    }
    if (s.cascade) {
      const sched = cascadeSchedule(s.cascade.start, s.cascade.items, p.fps, s.cascade.beats, undefined, s.cascade.endAt);
      s.cascade.cards.forEach((c, i) => {
        if (sched[i] && fr >= (i === 0 ? s.from : sched[i]!.inStart)) out.push(pad(planeRectAt(p, s, c, fr), 44 * u));
      });
    }
    if (s.wall) for (const c of s.wall.cells) {
      const cur = cellAt(c, s.wall, fr, p.fps);
      if (cur.opacity > 0.02) out.push(pad(rectInFrame(cur.rect, pose, p.frame), 24 * u));
    }
    if (s.stone) {
      const c = worldToFrame(s.stone.at, pose, p.frame.w, p.frame.h);
      const r = s.stone.r * pose.zoom * 1.8;
      out.push({ x: c.x - r, y: c.y - r, w: 2 * r, h: 2 * r });
    }
    if (s.aperture) {
      const a = apertureRect(p.frame.w, p.frame.h, s.aperture.open(fr), s.aperture.centerY);
      out.push({ x: 0, y: 0, w: p.frame.w, h: a.y + 2 * u }, { x: 0, y: a.y + a.h - 2 * u, w: p.frame.w, h: p.frame.h - (a.y + a.h) + 2 * u });
    }
  }
  for (const t of p.types) {
    const d = drawnSpan(t, p.fps, p.duration);
    if (fr < d.from || fr >= d.until) continue;
    const r = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5);
    out.push(pad(t.carry ? carriedRect(p, t, r, fr) : r, 16 * u));
  }
  for (const s of p.shots) if (s.cascade && fr >= s.from && fr < s.to) {
    const c = s.cascade;
    out.push(pad(lineRect(c.fixed.text, c.fixed.tier, p.frame, c.fixed.box, c.fixed.sizeT ?? 0.5), 16 * u));
    for (const it of c.items) out.push(pad(lineRect(it.text, "functional", p.frame, c.itemBox), 16 * u));
  }
  // the slate's strip at the foot
  out.push({ x: 0, y: p.frame.h - 48 * u, w: p.frame.w, h: 48 * u });
  return out;
}

/** The sections of the arc each piece shows, and the local frames its light has settled on. */
function sectionsOf(p: ScenePlan): { section: ArcSection; from: number; to: number }[] {
  const settled = (name: string) => {
    let at = 0;
    for (const c of p.lightCues) if (c.to === name) at = Math.max(at, c.at + c.frames);
    return at;
  };
  switch (p.id) {
    case "drop": {
      const hit = p.hits[0]!;
      return [
        { section: "morning", from: 10, to: hit - 10 },
        { section: "warm", from: settled("warm") + 20, to: p.duration - 10 },
      ];
    }
    case "ring4":
      return [{ section: "day", from: Math.max(settled("day"), 0) + 20, to: p.duration - 10 }];
    case "dusk":
      return [{ section: "dusk", from: settled("dusk") + 20, to: p.duration - 10 }];
    case "climax":
      return [{ section: "evening", from: settled("evening") + 20, to: p.duration - 10 }];
    case "finale": {
      const x = p.extra as Record<string, number>;
      return [{ section: "page", from: x.irisEnd + 20, to: p.duration - 10 }];
    }
    default:
      return [];
  }
}

const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

const entries = demoPlans(aspect);
const plan0 = entries[0]!.plan;
const samples: { frame: number; piece: string; section: ArcSection; local: number; grade: string }[] = [];
let off = 0;
for (const e of entries) {
  for (const sec of sectionsOf(e.plan)) for (let fr = sec.from; fr < sec.to; fr += 24) samples.push({ frame: off + fr, piece: e.plan.id, section: sec.section, local: fr, grade: gradeAt(fr, e.plan.lightInitial, e.plan.lightCues).name });
  off += e.plan.duration;
}
const planById = new Map(entries.map((e) => [e.plan.id, e.plan]));

// decode only the sampled frames, at the render's own size
const probe = spawn("/opt/homebrew/bin/ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]);
let probeOut = "";
probe.stdout.on("data", (d) => (probeOut += d));
await new Promise((r) => probe.on("close", r));
const [W, H] = probeOut.trim().split(",").map(Number) as [number, number];
const S = W / plan0.frame.w;
// every frame is decoded (a long select expression overflows FFmpeg's parser) and the sampled ones are kept
const ff = spawn("/opt/homebrew/bin/ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { stdio: ["ignore", "pipe", "inherit"] });
const frameBytes = W * H * 3;
const wanted = new Set(samples.map((s) => s.frame));
let buf = Buffer.alloc(0);
let k = 0;
let n = 0;
const results: { frame: number; piece: string; section: ArcSection; grade: string; rgb: RGB; groundShare: number }[] = [];
const take = (px: Buffer) => {
  const s = samples[k++]!;
  const p = planById.get(s.piece)!;
  const rects = overGround(p, s.local).map((r) => ({ x0: Math.floor(r.x * S), y0: Math.floor(r.y * S), x1: Math.ceil((r.x + r.w) * S), y1: Math.ceil((r.y + r.h) * S) }));
  const mask = new Uint8Array(W * H);
  for (const r of rects) for (let y = Math.max(0, r.y0); y < Math.min(H, r.y1); y++) mask.fill(1, y * W + Math.max(0, r.x0), y * W + Math.min(W, Math.max(0, r.x1)));
  const R: number[] = [];
  const G: number[] = [];
  const B: number[] = [];
  // every 2nd pixel of every 2nd row is plenty for a median
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = y * W + x;
    if (mask[i]) continue;
    R.push(px[i * 3]!);
    G.push(px[i * 3 + 1]!);
    B.push(px[i * 3 + 2]!);
  }
  const share = R.length / ((W * H) / 4);
  results.push({ frame: s.frame, piece: s.piece, section: s.section, grade: s.grade, rgb: [median(R) / 255, median(G) / 255, median(B) / 255], groundShare: Math.round(share * 1000) / 1000 });
};
ff.stdout.on("data", (d: Buffer) => {
  buf = Buffer.concat([buf, d]);
  while (buf.length >= frameBytes) {
    if (wanted.has(n)) take(buf.subarray(0, frameBytes));
    n++;
    buf = buf.subarray(frameBytes);
  }
});
await new Promise((r) => ff.on("close", r));
if (k !== samples.length) {
  console.error(`ground-light: decoded ${k} of ${samples.length} sampled frames`);
  process.exit(1);
}

// a section's sample: the median over its frames that show enough ground (2 % of the frame or more)
const sections: Partial<Record<ArcSection, RGB>> = {};
const table: Record<string, unknown> = {};
for (const sec of ["morning", "warm", "day", "dusk", "evening", "page"] as ArcSection[]) {
  const rs = results.filter((r) => r.section === sec && r.groundShare >= 0.02);
  if (!rs.length) {
    // said, not skipped (28 Oct: the 16:9 and 1:1 reels' climax showed no ground on any sampled frame, all window and
    // card, and the section simply went missing from the report): a section with no ground in frame is not judged
    const all = results.filter((r) => r.section === sec);
    if (all.length) {
      const most = Math.max(...all.map((r) => r.groundShare));
      table[sec] = { frames: all.map((r) => r.frame), unmeasured: true, mostGroundShare: most };
      console.log(`${sec.padEnd(8)} not measured: none of its ${all.length} sampled frames shows 2 % of ground (at most ${(100 * most).toFixed(1)} %: the frame is window and card)`);
    }
    continue;
  }
  const rgb: RGB = [median(rs.map((r) => r.rgb[0])), median(rs.map((r) => r.rgb[1])), median(rs.map((r) => r.rgb[2]))];
  sections[sec] = rgb;
  const l = levels(rgb);
  table[sec] = { frames: rs.map((r) => r.frame), rgb8: rgb.map((v) => Math.round(v * 255)), rMinusB: Math.round(l.rMinusB * 10) / 10, luma: Math.round(l.luma * 10) / 10, groundShare: median(rs.map((r) => r.groundShare)) };
  console.log(`${sec.padEnd(8)} ${rgb.map((v) => Math.round(v * 255)).join("/").padEnd(12)} R − B ${l.rMinusB.toFixed(1).padStart(6)}  luma ${l.luma.toFixed(1)}  (${rs.length} frames, ground ${(100 * median(rs.map((r) => r.groundShare))).toFixed(0)} % of the frame)`);
}
const problems = lightArcProblems(sections);
for (const x of problems) console.log(`  PROBLEM ${x}`);
if (outPath) writeFileSync(outPath, JSON.stringify({ file, aspect, width: W, height: H, sections: table, problems, frames: results }, null, 1));
process.exit(problems.length ? 2 : 0);
