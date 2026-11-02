// tools/encode/loops.mjs: the Pebble 2.0 loops, cut from the launch film's own masters (tools/encode/launch-loops.json).
//
//   node tools/encode/loops.mjs --dry-run [--only desk,guard]   check the plan and print what each cut does (light)
//   node tools/encode/loops.mjs [--only desk,guard]             cut, review strip, posters and encodes, one heavy job
//                                                                a loop (scripts/heavy.sh), one loop after another
//   node tools/encode/loops.mjs --cut-only [--only …]            the loop masters and review strips only
//
// For each loop and each of its cuts (`main` -> loop-<id>, `phone` -> loop-<id>-phone), from the master the cut names:
// 1. The loop master (.work/launch/site/loops/loop-<id>[-phone].mp4: H.264 CRF 12, yuv420p, BT.709, 30 fps, silent).
//    The cycle is the film's frames first .. first + frames, whose last `blend` frames dissolve into the first `blend`
//    (source first + frames .. first + frames + blend fading into first .. first + blend), started on `poster`:
//      A = F[poster, first + frames)   B = xfade(F[first + frames, + blend) -> F[first, + blend))   C = F[first + blend, poster)
//    each piece lossless (FFV1) from the master, then joined: no piece waits on frames far from it, so ffmpeg holds at
//    most `blend` frames. Every piece gets the plan's prefilter, then the cut's crop (W:H:X:Y, master pixels) and
//    scale (W:H). The result has the frame src/lib/media.ts gives the slot (LAUNCH_LOOP_FRAMES, LOOP_PHONE_FRAME).
// 2. A review strip (.work/launch/site/loops/review/loop-<id>[-phone].png): frames 0, a quarter, a half, the blend's
//    start, its middle and the last, for the eye (the posters and the blend are provisional until looked at).
// 3. The poster: frame 0 as a PNG (encode.sh still), then AVIF and WebP into public/media/v3 (encode.sh poster).
// 4. The encode: encode.sh loop <id> <main> [<phone>] with the plan's budgets (LOOP_*_BUDGET), then verify.mjs.
// Inside a heavy job (heavy.sh runs `loops.mjs --one <id>`), encode.sh runs without queueing again.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pageFrames } from "./verify.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const FF = process.env.FF || "/opt/homebrew/bin/ffmpeg";
const FP = process.env.FP || "/opt/homebrew/bin/ffprobe";
const PLAN = path.join(HERE, "launch-loops.json");
const ENCODE = path.join(HERE, "encode.sh");
const TAG709 = "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv";
const MASTER_SIZE = { "16x9": [1920, 1080], "4x5": [1080, 1350] };

function parseArgs(argv) {
  const opts = { dry: false, cutOnly: false, only: null, one: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dry = true;
    else if (a === "--cut-only") opts.cutOnly = true;
    else if (a === "--only") opts.only = new Set((argv[++i] ?? "").split(",").filter(Boolean));
    else if (a === "--one") opts.one = argv[++i];
    else if (a === "-h" || a === "--help") opts.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

/** The plan, checked: every loop's frames inside its `within`, its poster inside the cycle, its cuts' sizes the page's. */
export function readPlan(text = fs.readFileSync(PLAN, "utf8"), mediaTs = fs.readFileSync(path.join(REPO, "src/lib/media.ts"), "utf8")) {
  const plan = JSON.parse(text);
  const frames = pageFrames(mediaTs);
  const problems = [];
  const K = plan.blend;
  if (!(Number.isInteger(K) && K >= 2)) problems.push(`blend must be a whole number of frames, at least 2 (${K})`);
  for (const loop of plan.loops) {
    const { id, first, frames: n, poster, within } = loop;
    const where = `loop ${id}`;
    if (![first, n, poster].every(Number.isInteger)) problems.push(`${where}: first, frames and poster are whole frames`);
    if (first < within[0] || first + n + K > within[1]) problems.push(`${where}: uses frames ${first}..${first + n + K - 1}, outside ${within[0]}..${within[1] - 1}`);
    if (poster < first + K || poster >= first + n) problems.push(`${where}: the poster ${poster} must be in ${first + K}..${first + n - 1}`);
    if (n / plan.fps < 6 - 1e-9 || n / plan.fps > 10 + 1e-9) problems.push(`${where}: ${(n / plan.fps).toFixed(2)} s, outside 6 to 10 s`);
    if (!loop.cuts?.main) problems.push(`${where}: no main cut`);
    for (const [kind, cut] of Object.entries(loop.cuts ?? {})) {
      const [mw, mh] = MASTER_SIZE[cut.master] ?? [];
      if (!mw) {
        problems.push(`${where} ${kind}: unknown master ${cut.master}`);
        continue;
      }
      let [w, h] = [mw, mh];
      if (cut.crop) {
        const [cw, ch, cx, cy] = cut.crop.split(":").map(Number);
        if (!(cw > 0 && ch > 0 && cx >= 0 && cy >= 0 && cx + cw <= mw && cy + ch <= mh)) problems.push(`${where} ${kind}: crop ${cut.crop} is outside the ${mw}x${mh} master`);
        [w, h] = [cw, ch];
      }
      if (cut.scale) [w, h] = cut.scale.split(":").map(Number);
      const want = kind === "phone" ? frames.phone : frames.launchLoops.get(id);
      if (!want) problems.push(`${where} ${kind}: src/lib/media.ts gives no frame for it`);
      else if (`${w}x${h}` !== want) problems.push(`${where} ${kind}: makes ${w}x${h}, and src/lib/media.ts lays it out at ${want}`);
      if (kind === "phone" && cut.master !== "4x5") problems.push(`${where} phone: a phone cut comes from the 4:5 master`);
    }
  }
  const ids = plan.loops.map((l) => l.id);
  if (new Set(ids).size !== ids.length) problems.push("a loop id is listed twice");
  for (const id of ids) if (!frames.launchLoops.has(id)) problems.push(`loop ${id}: not a LaunchLoopId in src/lib/media.ts`);
  return { plan, problems };
}

/** The three pieces of a cut's cycle, in playing order: [kind, fromFrame, toFrame) (B blends two ranges). */
export function pieces(loop, K) {
  const end = loop.first + loop.frames;
  const out = [{ piece: "A", from: loop.poster, to: end }, { piece: "B", tail: [end, end + K], head: [loop.first, loop.first + K] }];
  if (loop.poster > loop.first + K) out.push({ piece: "C", from: loop.first + K, to: loop.poster });
  return out;
}

const run = (cmd, args, label) => {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`${label}: ${path.basename(cmd)} exited ${r.status}`);
};

/** The filter after the cut's pieces are in hand: the plan's prefilter, the crop, the scale, the BT.709 tags. */
const chain = (plan, cut) => [plan.prefilter || null, cut.crop ? `crop=${cut.crop}` : null, cut.scale ? `scale=${cut.scale}:flags=lanczos` : null, "format=yuv420p", TAG709].filter(Boolean).join(",");

function cutLoop(plan, loop, kind, cut, workDir) {
  const K = plan.blend;
  const master = path.join(REPO, plan.masters[cut.master]);
  if (!fs.existsSync(master)) throw new Error(`no master ${path.relative(REPO, master)} (the director's video/src/launch/master/final.sh)`);
  const name = kind === "phone" ? `loop-${loop.id}-phone` : `loop-${loop.id}`;
  const tmp = fs.mkdtempSync(path.join(workDir, `.${name}.`));
  const vf = chain(plan, cut);
  const ffv1 = ["-c:v", "ffv1", "-level", "3", "-pix_fmt", "yuv420p", "-an"];
  const list = [];
  try {
    for (const p of pieces(loop, K)) {
      const out = path.join(tmp, `${p.piece}.mkv`);
      if (p.piece === "B") {
        const graph = `[0:v]split=2[t][h];[t]trim=start_frame=${p.tail[0]}:end_frame=${p.tail[1]},setpts=PTS-STARTPTS[tail];[h]trim=start_frame=${p.head[0]}:end_frame=${p.head[1]},setpts=PTS-STARTPTS[head];[tail][head]xfade=transition=fade:duration=${K / plan.fps}:offset=0,${vf}[v]`;
        run(FF, ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", master, "-filter_complex", graph, "-map", "[v]", "-frames:v", String(K), ...ffv1, out], `${name} ${p.piece}`);
      } else {
        run(FF, ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", master, "-vf", `trim=start_frame=${p.from}:end_frame=${p.to},setpts=PTS-STARTPTS,${vf}`, ...ffv1, out], `${name} ${p.piece}`);
      }
      list.push(`file '${out.replace(/'/g, "'\\''")}'`);
    }
    fs.writeFileSync(path.join(tmp, "list.txt"), `${list.join("\n")}\n`);
    const loopMaster = path.join(workDir, `${name}.mp4`);
    run(FF, ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-map", "0:v:0", "-an", "-map_metadata", "-1", "-vf", TAG709, "-r", String(plan.fps), "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart", loopMaster], `${name} join`);
    const got = Number(spawnSync(FP, ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", loopMaster], { encoding: "utf8" }).stdout.trim());
    if (got !== loop.frames) throw new Error(`${name}: the loop master has ${got} frames, the plan ${loop.frames}`);
    // the review strip: frame 0, a quarter, a half, the blend's start, its middle and the last frame
    const blendAt = loop.first + loop.frames - loop.poster;
    const picks = [0, Math.round(loop.frames / 4), Math.round(loop.frames / 2), blendAt, blendAt + Math.floor(K / 2), loop.frames - 1];
    const review = path.join(workDir, "review", `${name}.png`);
    fs.mkdirSync(path.dirname(review), { recursive: true });
    const select = picks.map((f) => `eq(n\\,${f})`).join("+");
    run(FF, ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", loopMaster, "-vf", `select=${select},scale=480:-2,tile=6x1`, "-frames:v", "1", "-update", "1", review], `${name} review`);
    console.log(`loops.mjs: ${path.relative(REPO, loopMaster)} (${loop.frames} frames, from ${loop.first} in the ${cut.master} master, poster ${loop.poster}); review ${path.relative(REPO, review)}`);
    return loopMaster;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function oneLoop(plan, loop, opts) {
  const workDir = path.join(REPO, plan.work);
  fs.mkdirSync(workDir, { recursive: true });
  const made = {};
  for (const [kind, cut] of Object.entries(loop.cuts)) made[kind] = cutLoop(plan, loop, kind, cut, workDir);
  if (opts.cutOnly) return;
  const frames = pageFrames(fs.readFileSync(path.join(REPO, "src/lib/media.ts"), "utf8"));
  for (const [kind, master] of Object.entries(made)) {
    const name = kind === "phone" ? `loop-${loop.id}-phone` : `loop-${loop.id}`;
    const png = path.join(workDir, `${name}.poster.png`);
    const [w, h] = (kind === "phone" ? frames.phone : frames.launchLoops.get(loop.id)).split("x");
    run(ENCODE, ["still", master, "0", png], `${name} poster still`);
    run(ENCODE, ["poster", png, path.join(REPO, "public/media/v3", `${name}.poster`), w, h, "--no-verify"], `${name} poster`);
  }
  const env = { LOOP_HEVC_BUDGET: String(plan.budgets.hevc), LOOP_H264_BUDGET: String(plan.budgets.h264), LOOP_H264_HARD: String(plan.budgets.h264Hard) };
  const args = ["loop", loop.id, made.main, ...(made.phone ? [made.phone] : []), "--out-dir", path.join(REPO, "public/media/v3")];
  const r = spawnSync(ENCODE, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`loop ${loop.id}: encode.sh loop exited ${r.status}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\nimport ")[0].replace(/^\/\/ ?/gm, ""));
    return 0;
  }
  const { plan, problems } = readPlan();
  if (problems.length) {
    console.error(`loops.mjs: the plan has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    return 1;
  }
  const loops = plan.loops.filter((l) => (opts.one ? l.id === opts.one : !opts.only || opts.only.has(l.id)));
  if (!loops.length) throw new Error("no loop to make");
  if (opts.dry) {
    for (const loop of loops) {
      const p = pieces(loop, plan.blend);
      console.log(`${loop.id} (${loop.scene}): ${loop.frames} frames, ${(loop.frames / plan.fps).toFixed(2)} s, from master frame ${loop.first}; starts on ${loop.poster}`);
      for (const x of p) console.log(`  ${x.piece}: ${x.piece === "B" ? `[${x.tail}] fades into [${x.head}], ${plan.blend} frames` : `[${x.from}, ${x.to}), ${x.to - x.from} frames`}`);
      for (const [kind, cut] of Object.entries(loop.cuts)) console.log(`  ${kind}: ${plan.masters[cut.master]} -> ${chain(plan, cut)}`);
    }
    return 0;
  }
  if (opts.one) {
    oneLoop(plan, loops[0], opts);
    return 0;
  }
  // one heavy job a loop, in turn, so another session's job can take the lock in between
  for (const loop of loops) {
    const r = spawnSync(path.join(REPO, "scripts/heavy.sh"), [`loop-${loop.id}`, process.execPath, fileURLToPath(import.meta.url), "--one", loop.id, ...(opts.cutOnly ? ["--cut-only"] : [])], { stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`loops.mjs: loop ${loop.id} stopped (exit ${r.status}${r.status === 73 ? ": heavy.sh refused, a hold or too little disk or memory" : ""}); run again with --only for the rest`);
      return r.status ?? 1;
    }
  }
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`loops.mjs: ${error.message}`);
    process.exit(2);
  }
}
