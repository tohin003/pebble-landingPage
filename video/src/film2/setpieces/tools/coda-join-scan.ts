// The coda's join on a render (the post-credit review's F2, 1 Nov): the end card's last frame into the coda's L0 must
// look like every other pair of still frames around it. A second PieceView mounted at L0 re-rasterised page 2's type
// (thousands of pixels changed on a still page); one component tree across L0 changes none (views/CodaView.tsx
// EndCardCarriedOn). The plan's checks cannot see it, so this reads the render.
//
//   bun video/src/film2/setpieces/tools/coda-join-scan.ts <dir of PNG frames, in order> <index of L0 in that order>
//     [--out report.json]
//
// Render the frames from the reel itself, with the end card on screen well before L0 (the jump grew with how long the
// end card's layers had lived: 60 frames before L0 showed it, 4 did not), e.g. F2-SetPieces-Demo frames L0−60 … L0+3 as
// a PNG sequence at half size, one tab. Each frame is decoded to 8-bit grey; for each pair of consecutive frames it
// counts the pixels that changed by more than CHANGE levels. The verdict: the pair (L0−1, L0) may change at most
// max(2 × the busiest other pair, FLOOR) pixels. Exit 0 when it holds, 2 when the join jumps, 1 on an error.
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** A pixel counts as changed past this many grey levels (codec-free PNGs; the stone's breath moves a few dozen pixels). */
export const CHANGE = 12;
/** The join may always change this many pixels (the stone's breath on its engine clock). */
export const FLOOR = 200;

export interface JoinScan {
  frames: number;
  l0: number;
  pairs: { from: number; changed: number; meanAbs: number }[];
  join: number;
  others: number;
  limit: number;
  ok: boolean;
}

/** The verdict on the per-pair counts: `pairs[k]` is frames k → k + 1; the join is l0 − 1 → l0. Pure. */
export function judgeJoin(pairs: JoinScan["pairs"], l0: number, frames: number): JoinScan {
  const join = pairs.find((p) => p.from === l0 - 1);
  if (!join) throw new Error(`no pair ${l0 - 1} → ${l0} among ${frames} frames`);
  const others = Math.max(0, ...pairs.filter((p) => p !== join).map((p) => p.changed));
  const limit = Math.max(2 * others, FLOOR);
  return { frames, l0, pairs, join: join.changed, others, limit, ok: join.changed <= limit };
}

/** Pixel changes between two grey frames. Pure. */
export function changeOf(a: Uint8Array, b: Uint8Array): { changed: number; meanAbs: number } {
  let changed = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i]! - b[i]!);
    sum += d;
    if (d > CHANGE) changed++;
  }
  return { changed, meanAbs: sum / a.length };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dir = args[0];
  const l0 = Number(args[1]);
  const outAt = args.indexOf("--out");
  const out = outAt >= 0 ? args[outAt + 1] : undefined;
  if (!dir || !Number.isInteger(l0)) {
    console.error("usage: bun coda-join-scan.ts <dir of PNG frames> <index of L0> [--out report.json]");
    process.exit(64);
  }
  const ff = process.env.FF ?? "/opt/homebrew/bin/ffmpeg";
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const grey = (f: string): Uint8Array => {
    const r = spawnSync(ff, ["-v", "error", "-i", path.join(dir, f), "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`ffmpeg could not read ${f}: ${r.stderr}`);
    return new Uint8Array(r.stdout);
  };
  if (files.length < l0 + 1) {
    console.error(`${files.length} frames in ${dir}: L0 at ${l0} is not among them`);
    process.exit(1);
  }
  const pairs: JoinScan["pairs"] = [];
  let prev = grey(files[0]!);
  for (let k = 1; k < files.length; k++) {
    const cur = grey(files[k]!);
    if (cur.length !== prev.length) throw new Error(`${files[k]} differs in size from ${files[k - 1]}`);
    pairs.push({ from: k - 1, ...changeOf(prev, cur) });
    prev = cur;
  }
  const r = judgeJoin(pairs, l0, files.length);
  if (out) writeFileSync(out, JSON.stringify({ dir, ...r }, null, 1));
  console.log(JSON.stringify({ dir, frames: r.frames, l0: r.l0, join: r.join, others: r.others, limit: r.limit, ok: r.ok }));
  process.exit(r.ok ? 0 : 2);
}
