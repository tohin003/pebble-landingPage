// Settles a suspect from the neighbour scan (master/pop-scan.ts): is the frame in the render the frame the edit draws?
//
//   bun video/src/launch/master/pop-verify.ts <render.mp4> <frame> <still.png>
//
// <still.png> is the same frame rendered again on its own (qa.sh --verify renders it with `remotion still`). Both are
// compared at the scan's 192×108 grey, block by block (12-px blocks): if no block differs by more than 10 grey levels
// the render shows what the code draws (a one-frame gap between two lines of type, say), and it prints "SAME"; if one
// does, the render missed a layer that the code draws (a paint fault), and it prints "DIFFERENT". Exit 0 either way.
import { spawnSync } from "node:child_process";

const [render, frameArg, still] = process.argv.slice(2);
if (!render || !frameArg || !still) {
  console.error("usage: bun pop-verify.ts <render.mp4> <frame> <still.png>");
  process.exit(64);
}
const frame = Number(frameArg);
const W = 192;
const H = 108;
const B = 12;

const grey = (cmd: string[]): Uint8Array => {
  const p = spawnSync(cmd[0], cmd.slice(1), { maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "inherit"] });
  const buf = p.stdout ? new Uint8Array(p.stdout.buffer, p.stdout.byteOffset, p.stdout.byteLength) : new Uint8Array(0);
  if (buf.length < W * H) throw new Error(`no picture from ${cmd.join(" ")}`);
  return buf.subarray(0, W * H);
};
const FF = "/opt/homebrew/bin/ffmpeg";
const scale = `scale=${W}:${H}:flags=area,format=gray`;
const a = grey([FF, "-v", "error", "-i", render, "-vf", `select=eq(n\\,${frame}),${scale}`, "-frames:v", "1", "-f", "rawvideo", "-"]);
const b = grey([FF, "-v", "error", "-i", still, "-vf", scale, "-frames:v", "1", "-f", "rawvideo", "-"]);

let worst = 0;
let at = "";
for (let by = 0; by < H / B; by++)
  for (let bx = 0; bx < W / B; bx++) {
    let sa = 0;
    let sb = 0;
    for (let y = 0; y < B; y++)
      for (let x = 0; x < B; x++) {
        const o = (by * B + y) * W + bx * B + x;
        sa += a[o];
        sb += b[o];
      }
    const dlt = Math.abs(sa - sb) / (B * B);
    if (dlt > worst) {
      worst = dlt;
      at = `block (${bx}, ${by})`;
    }
  }
console.log(`${worst > 10 ? "DIFFERENT" : "SAME"} frame ${frame}: the largest block difference ${worst.toFixed(1)} grey levels at ${at}`);
