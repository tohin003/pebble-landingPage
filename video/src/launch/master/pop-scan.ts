// The neighbour scan (REVIEW-1 M1: the critic's .work/launch/critic/pop-scan.py, ported as is, plus a verdict), the
// gate that finds a frame drawn with a layer missing: a take's window shown empty, or a whole frame unpainted, for one
// frame.
//
//   bun video/src/launch/master/pop-scan.ts <render.mp4> <out.txt> [--fps 30]
//
// The scan (unchanged from the critic's): the render decoded at 192×108 grey (area scaling); 12-px blocks (a 16 × 9
// grid); a frame POPS when at least 2 of its blocks jump ≥ 18 grey levels from BOTH neighbours while the neighbours
// agree (their difference under 40 % of the smaller jump). It also lists whole-frame luma steps over 12 levels,
// freezes (frame difference under 0.20 for ≥ 0.8 s) and quiet runs (under 0.45 for ≥ 1.5 s).
//
// The verdict: fast real motion pops too (a whip's middle, a push through a high-contrast edge), so a pop is SUSPECT
// only when it looks like a missing layer: its flagged blocks all jump the same way (coherence ≥ 0.9) AND either they
// lost their detail for that frame (block deviation ≤ 0.5 × the smaller of the neighbours': an empty window where text
// was) or at least 20 blocks went at once (a whole window or frame). On draft 2 that finds the critic's frames (12.567,
// 32.067, 32.333, 47.933, 56.067, 71.833, 72.067, 72.333 s) and leaves every whip and push alone; it also flags a
// one-frame gap between two lines of type, which `qa.sh --verify` settles by rendering the frame again (a paint fault
// doesn't reproduce; a frame the edit really draws does). Exit 1 when a suspect remains (`--verified` lists the frames
// already re-rendered and found to be the edit's own).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const [render, out] = args;
if (!render || !out) {
  console.error("usage: bun pop-scan.ts <render.mp4> <out.txt> [--fps 30] [--verified f1,f2,…]");
  process.exit(64);
}
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const FPS = Number(opt("--fps") ?? 30);
const verified = new Set((opt("--verified") ?? "").split(",").filter(Boolean).map(Number));
const W = 192;
const H = 108;
const B = 12;
const GW = W / B;
const GH = H / B;
const NB = GW * GH;

const ff = spawnSync("/opt/homebrew/bin/ffmpeg", ["-v", "error", "-i", render, "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], {
  maxBuffer: 1 << 30,
  stdio: ["ignore", "pipe", "inherit"],
});
if (ff.status !== 0 || !ff.stdout) {
  console.error(`pop-scan: ffmpeg could not decode ${render}`);
  process.exit(2);
}
const raw = new Uint8Array(ff.stdout.buffer, ff.stdout.byteOffset, ff.stdout.byteLength);
const n = Math.floor(raw.length / (W * H));

// per frame: block means and deviations, the whole frame's luma
const mean = new Float64Array(n * NB);
const dev = new Float64Array(n * NB);
const lum = new Float64Array(n);
for (let i = 0; i < n; i++) {
  const o = i * W * H;
  let sum = 0;
  for (let p = 0; p < W * H; p++) sum += raw[o + p];
  lum[i] = sum / (W * H);
  for (let by = 0; by < GH; by++)
    for (let bx = 0; bx < GW; bx++) {
      let s = 0;
      let s2 = 0;
      for (let y = 0; y < B; y++)
        for (let x = 0; x < B; x++) {
          const v = raw[o + (by * B + y) * W + bx * B + x];
          s += v;
          s2 += v * v;
        }
      const m = s / (B * B);
      mean[i * NB + by * GW + bx] = m;
      dev[i * NB + by * GW + bx] = Math.sqrt(Math.max(0, s2 / (B * B) - m * m));
    }
}
const d = new Float64Array(n);
for (let i = 1; i < n; i++) {
  let s = 0;
  const o = i * W * H;
  const q = (i - 1) * W * H;
  for (let p = 0; p < W * H; p++) s += Math.abs(raw[o + p] - raw[q + p]);
  d[i] = s / (W * H);
}

const lines: string[] = [`frames ${n} at ${FPS} fps (${render})`];
const suspects: { i: number; line: string }[] = [];
lines.push("# single-frame block pops (frame i differs from both neighbours, neighbours agree): t, frame, blocks, max block jump, detail before/now/after, coherence, verdict");
for (let i = 1; i < n - 1; i++) {
  let k = 0;
  let jump = 0;
  let up = 0;
  let down = 0;
  let sdPrev = 0;
  let sdNow = 0;
  let sdNext = 0;
  for (let b = 0; b < NB; b++) {
    const g0 = mean[(i - 1) * NB + b];
    const g1 = mean[i * NB + b];
    const g2 = mean[(i + 1) * NB + b];
    const a = Math.abs(g1 - g0);
    const bb = Math.abs(g2 - g1);
    const c = Math.abs(g2 - g0);
    if (a > 18 && bb > 18 && c < 0.4 * Math.min(a, bb)) {
      k++;
      jump = Math.max(jump, Math.min(a, bb));
      if (g1 > g0 && g1 > g2) up++;
      if (g1 < g0 && g1 < g2) down++;
      sdPrev += dev[(i - 1) * NB + b];
      sdNow += dev[i * NB + b];
      sdNext += dev[(i + 1) * NB + b];
    }
  }
  if (k < 2) continue;
  const coh = Math.max(up, down) / k;
  const ratio = sdNow / Math.max(1e-3, Math.min(sdPrev, sdNext));
  const suspect = coh >= 0.9 && (ratio <= 0.5 || k >= 20);
  const verdict = !suspect ? "motion" : verified.has(i) ? "verified: the edit draws it" : "SUSPECT";
  const line = `pop t=${(i / FPS).toFixed(3).padStart(7)} f=${String(i).padStart(5)} blocks=${String(k).padStart(3)} jump=${jump.toFixed(1).padStart(5)} detail=${(sdPrev / k).toFixed(1)}/${(sdNow / k).toFixed(1)}/${(sdNext / k).toFixed(1)} coh=${coh.toFixed(2)} lum=${lum[i].toFixed(1)} (prev ${lum[i - 1].toFixed(1)}, next ${lum[i + 1].toFixed(1)})  ${verdict}`;
  lines.push(line);
  if (suspect && !verified.has(i)) suspects.push({ i, line });
}
lines.push("# whole-frame luminance steps > 12 levels in one frame: t, frame, lum before -> after");
for (let i = 1; i < n; i++) if (Math.abs(lum[i] - lum[i - 1]) > 12) lines.push(`step t=${(i / FPS).toFixed(3).padStart(7)} f=${String(i).padStart(5)} ${lum[i - 1].toFixed(1)} -> ${lum[i].toFixed(1)}`);
const runs = (limit: number, minS: number, tag: string) => {
  let run = 0;
  let start = 0;
  for (let i = 1; i <= n; i++) {
    const still = i < n && d[i] < limit;
    if (still) {
      if (run === 0) start = i - 1;
      run++;
    } else {
      if (run + 1 >= Math.floor(minS * FPS)) lines.push(`${tag} ${(start / FPS).toFixed(3).padStart(7)} -> ${((i - 1) / FPS).toFixed(3).padStart(7)}  (${((i - 1 - start) / FPS).toFixed(2)} s)`);
      run = 0;
    }
  }
};
lines.push("# freezes: runs where mean frame diff < 0.20 for >= 0.8 s");
runs(0.2, 0.8, "freeze");
lines.push("# near-freezes: runs where mean frame diff < 0.45 for >= 1.5 s");
runs(0.45, 1.5, "quiet");
lines.push(suspects.length ? `GATE: FAIL, ${suspects.length} suspect frame(s): ${suspects.map((s) => s.i).join(" ")}` : "GATE: PASS (no frame with a missing layer)");
writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.filter((l) => l.startsWith("pop") || l.startsWith("GATE")).join("\n"));
process.exit(suspects.length ? 1 : 0);
