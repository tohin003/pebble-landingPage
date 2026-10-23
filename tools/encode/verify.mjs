// tools/encode/verify.mjs: checks the delivered media against the plan and prints a table (no dependencies).
//
// usage (repo root, after `source scripts/env.sh`):
//   node tools/encode/verify.mjs [<file or folder> ...] [--json] [--no-public] [--no-analysis] [--no-loudness] [--no-seams]
//
// What it reads: every file under public/media/v1 (unless --no-public), plus the paths given (for example the social
// masters in "~/Desktop/Pebble launch film/"). A file's role comes from its name:
//   film-{1080,720}.{hevc,h264}.mp4   the website film       teaser-720.{hevc,h264}.mp4   the teaser
//   loop-<id>[-phone].{hevc,h264}.mp4 a feature loop         <name>.poster.{avif,webp}    a poster
//   film.en.vtt, film.chapters.vtt, film.descriptions.en.vtt, *.vtt, *.srt                text tracks
//   any other .mp4                    a social master (X, LinkedIn)      anything else: size only
//
// What it checks:
// - Video (ffprobe + the MP4 boxes, tools/encode/mp4.mjs): codec, profile, level and the codecs string against the
//   page's <source type> (src/lib/media.ts: hvc1.1.6.L120.90 / avc1.640028; Safari needs the hvc1 sample entry), the
//   peak bitrate over any second under that level's ceiling (12 Mb/s HEVC Main 4.0, 25 Mb/s H.264 High 4.0; a social
//   file: its own level), yuv420p, BT.709 primaries/transfer/matrix and limited range (stream and colr box), 30 fps
//   (D7), square pixels, frame count and duration (the film: docs/film-captions.json total_frames), moov before mdat.
// - Audio: the film has AAC-LC 48 kHz stereo at about 160 kb/s and lasts as long as the picture; loops and the teaser
//   have no audio track (D11); social masters have AAC-LC 48 kHz stereo at about 192 kb/s (OVERRIDES §4).
// - Size: every file under public/ <= 45 MB and public/ <= 90 MB (D16); the film set <= 45 MB (OVERRIDES §8, critic
//   C6; per-file 12 / 18 / 6 / 9 MB are warnings); teaser <= 1.5 MB; loop HEVC <= 0.9 MB; loop H.264 <= 1.5 MB (over
//   1.2 MB is a warning); poster AVIF <= 60 KB, WebP <= 90 KB (MASTER_PLAN §5.5); social <= 512 MB and 3-140 s (X,
//   LinkedIn; OVERRIDES §14).
// - Loudness (FFmpeg ebur128, true peak, from the encoded AAC): website film -16 LUFS +-1 and <= -1.5 dBTP (D10);
//   social -14 LUFS +-1 and <= -1.0 dBTP (OVERRIDES §4). Outside +-0.5 LU (MASTER_PLAN §6.4's gate) is a warning.
// - Loop and teaser seams (FILM_SPEC §16, the loops lane's loopqa.py rule): PSNR of the last frame against the first
//   >= the median PSNR between neighbouring frames - 3 dB. Measured on the encode at 400 px wide (area scaling), with
//   the median capped at 45 dB: in an encode, static holds give identical frames (infinite PSNR) and the seam's two
//   frames carry different coding noise, so an uncapped rule would fail every loop with a still tail.
// - Text tracks: WebVTT/SRT syntax, then the caption rules (tools/captions/cues.mjs: order, no overlaps, <= 2 lines of
//   <= 42 characters, >= 1.2 s, <= 3.5 words/s); film.*.vtt must equal what tools/captions/build.mjs makes now.
// - Posters: AVIF/WebP size and pixel size, the same aspect as their video, both formats present.
//
// The loudness and seam passes decode every film and loop, so they run as ONE scripts/heavy.sh job: started outside a
// heavy job, this script re-runs itself through heavy.sh. --no-analysis skips both (probe-only, no heavy job).
// Exit: 0 every check passed (warnings allowed); 1 a check failed; 2 usage or a tool error; 73/75 from heavy.sh.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fitsPage, imageInfo, mp4Info, pageCodecs } from "./mp4.mjs";
import { filmTracks, formatTime, parseSrt, parseVtt, validateCues } from "../captions/cues.mjs";
import { filmTrackTexts } from "../captions/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const FF = process.env.FF || "/opt/homebrew/bin/ffmpeg";
const FP = process.env.FP || "/opt/homebrew/bin/ffprobe";
const MB = 1e6;
const KB = 1e3;

export const LIMITS = Object.freeze({
  file: 45 * MB,
  public: 90 * MB,
  filmSet: 45 * MB,
  film: { "1080.hevc": 12 * MB, "1080.h264": 18 * MB, "720.hevc": 6 * MB, "720.h264": 9 * MB },
  teaser: 1.5 * MB,
  loopHevc: 0.9 * MB,
  loopH264Target: 1.2 * MB,
  loopH264: 1.5 * MB,
  posterAvif: 60 * KB,
  posterWebp: 90 * KB,
  social: 512 * MB,
  socialSeconds: [3, 140],
});
export const LOUDNESS = Object.freeze({
  web: { lufs: -16, tolerance: 1, planTolerance: 0.5, truePeak: -1.5, why: "D10" },
  social: { lufs: -14, tolerance: 1, planTolerance: 0.5, truePeak: -1.0, why: "OVERRIDES §4" },
});
export const SEAM = Object.freeze({ width: 400, capDb: 45, marginDb: 3 });
const FRAMES = { film: { "1080": [1920, 1080], "720": [1280, 720] }, teaser: [1280, 720] };
const LOOP_FRAMES = ["1600x1000", "1080x1080", "1080x1350"];
const SOCIAL_FRAMES = ["1920x1080", "1080x1080", "1080x1920"];
const POSTER_FRAMES = { film: "1920x1080", teaser: "1280x720" };

// ---- arguments and the heavy job -----------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { json: false, includePublic: true, loudness: true, seams: true, paths: [] };
  for (const a of argv) {
    if (a === "--json") opts.json = true;
    else if (a === "--no-public") opts.includePublic = false;
    else if (a === "--no-analysis") opts.loudness = opts.seams = false;
    else if (a === "--no-loudness") opts.loudness = false;
    else if (a === "--no-seams") opts.seams = false;
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else opts.paths.push(path.resolve(a));
  }
  return opts;
}

/** True when an ancestor of this process is the heavy.sh runner holding the lock. */
function insideHeavyJob() {
  let runner;
  try {
    runner = fs.readFileSync(path.join(REPO, ".work/heavy.lock/pid"), "utf8").trim();
  } catch {
    return false;
  }
  if (!runner) return false;
  let pid = process.pid;
  for (let i = 0; i < 100 && pid > 1; i++) {
    if (String(pid) === runner) return true;
    const r = spawnSync("ps", ["-o", "ppid=", "-p", String(pid)], { encoding: "utf8" });
    pid = Number.parseInt((r.stdout || "").trim(), 10);
    if (!Number.isFinite(pid)) return false;
  }
  return false;
}

// ---- files --------------------------------------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile()) out.push(full);
  }
  return out;
}

function classify(file) {
  const name = path.basename(file);
  let m;
  if ((m = /^film-(1080|720)\.(hevc|h264)\.mp4$/.exec(name))) return { kind: "film", res: m[1], codec: m[2], web: true };
  if ((m = /^teaser-720\.(hevc|h264)\.mp4$/.exec(name))) return { kind: "teaser", codec: m[1], web: true };
  if ((m = /^loop-([a-z0-9-]+?)(-phone)?\.(hevc|h264)\.mp4$/.exec(name))) return { kind: "loop", id: m[1], phone: Boolean(m[2]), codec: m[3], web: true };
  if ((m = /^(.+)\.poster\.(avif|webp)$/.exec(name))) return { kind: "poster", base: m[1], format: m[2], web: true };
  if (name === "film.en.vtt") return { kind: "vtt", track: "captions", film: true };
  if (name === "film.chapters.vtt") return { kind: "vtt", track: "chapters", film: true };
  if (name === "film.descriptions.en.vtt") return { kind: "vtt", track: "descriptions", film: true };
  if (/\.vtt$/i.test(name)) return { kind: "vtt", track: "captions", film: false };
  if (/\.srt$/i.test(name)) return { kind: "srt", track: "captions" };
  if (/\.mp4$/i.test(name)) return { kind: "social" };
  if (/\.(avif|webp|png|jpe?g|gif|svg)$/i.test(name)) return { kind: "image" };
  return { kind: "other" };
}

/** Names the page can use (src/lib/media.ts), so a stray file in public/media/v1 is reported. */
function pageKnows(name, loopIds) {
  const loop = /^loop-([a-z0-9-]+?)(-phone)?\.(hevc\.mp4|h264\.mp4|poster\.avif|poster\.webp)$/.exec(name);
  if (loop) return loopIds.size === 0 || loopIds.has(loop[1]);
  return (
    /^film-(1080|720)\.(hevc|h264)\.mp4$/.test(name) ||
    /^teaser-720\.(hevc|h264)\.mp4$/.test(name) ||
    /^(film|teaser)\.poster\.(avif|webp)$/.test(name) ||
    /^film\.(en|chapters|descriptions\.en)\.vtt$/.test(name) ||
    /^wallpaper-(light|dark)-(1600|3200)\.(avif|webp)$/.test(name)
  );
}

function loopIdsFromMedia() {
  try {
    const text = fs.readFileSync(path.join(REPO, "src/lib/media.ts"), "utf8");
    const block = /export type LoopId =([^;]*);/.exec(text)?.[1] ?? "";
    return new Set([...block.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}

/**
 * The frame sizes src/lib/media.ts gives the loops (LOOP_FRAMES, LOOP_PHONE_FRAME) and the film and teaser posters, as
 * "WxH" strings: {loops: Map(id -> size), phone, film, teaser}. Missing entries stay null (older media.ts).
 */
export function pageFrames(text) {
  const loops = new Map();
  const block = /const LOOP_FRAMES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(text)?.[1];
  if (block) for (const m of block.matchAll(/"?([a-z0-9-]+)"?\s*:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/g)) loops.set(m[1], `${m[2]}x${m[3]}`);
  const phone = /LOOP_PHONE_FRAME\s*=\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/.exec(text);
  const poster = (name) => {
    const m = new RegExp(`imageSet\\(\`\\$\\{MEDIA\\}/${name}\\.poster\`,\\s*(\\d+),\\s*(\\d+)\\)`).exec(text);
    return m ? `${m[1]}x${m[2]}` : null;
  };
  return { loops, phone: phone ? `${phone[1]}x${phone[2]}` : null, film: poster("film"), teaser: poster("teaser") };
}

function pageFramesFromMedia() {
  try {
    return pageFrames(fs.readFileSync(path.join(REPO, "src/lib/media.ts"), "utf8"));
  } catch {
    return { loops: new Map(), phone: null, film: null, teaser: null };
  }
}

// ---- measurements -------------------------------------------------------------------------------------------------

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(`${path.basename(cmd)}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${path.basename(cmd)} exited ${r.status}: ${(r.stderr || "").trim().split("\n").slice(-3).join(" / ")}`);
  return r.stdout;
}

const ffprobe = (file) => JSON.parse(run(FP, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]));

/** Integrated loudness, loudness range and true peak of the first audio stream (ebur128, full precision). */
export function loudness(file) {
  const out = run(FF, ["-hide_banner", "-nostats", "-nostdin", "-loglevel", "error", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true:framelog=quiet:metadata=1,ametadata=mode=print:file=-", "-f", "null", "-"]);
  let integrated = null;
  let range = null;
  let peak = 0;
  for (const line of out.split("\n")) {
    const m = /^lavfi\.r128\.(I|LRA|true_peak)=(-?[\d.]+|-?inf|nan)/.exec(line);
    if (!m) continue;
    const v = Number(m[2]);
    if (m[1] === "I") integrated = v;
    else if (m[1] === "LRA") range = v;
    else if (Number.isFinite(v)) peak = Math.max(peak, v);
  }
  if (integrated === null) throw new Error("ebur128 gave no reading");
  return { integrated, range, truePeak: peak > 0 ? 20 * Math.log10(peak) : -Infinity };
}

function psnrSeries(file, graph) {
  const out = run(FF, ["-hide_banner", "-nostats", "-nostdin", "-loglevel", "error", "-i", file, "-i", file, "-filter_complex", graph, "-f", "null", "-"]);
  return out
    .split("\n")
    .map((l) => /psnr_avg:(\S+)/.exec(l)?.[1])
    .filter(Boolean)
    .map((x) => (x === "inf" ? 99 : Math.min(99, Number(x))));
}

// Video bitrate ceilings by level (kbit/s): H.264 MaxBR (x1.25 for High, cpbBrVclFactor 1250) and HEVC Main tier.
const H264_MAXBR = { 10: 64, 11: 192, 12: 384, 13: 768, 20: 2000, 21: 4000, 22: 4000, 30: 10000, 31: 14000, 32: 20000, 40: 20000, 41: 50000, 42: 50000, 50: 135000, 51: 240000, 52: 240000 };
const HEVC_MAXBR_MAIN = { 30: 128, 60: 1500, 63: 3000, 90: 6000, 93: 10000, 120: 12000, 123: 20000, 150: 25000, 153: 40000, 156: 60000, 180: 60000, 183: 120000, 186: 240000 };

/** The bitrate ceiling (kbit/s) of the level a codecs string declares, or null. */
export function levelCeilingKbps(codecs) {
  let m = /^(?:hvc1|hev1)\.[ABC]?\d+\.[0-9A-F]+\.L(\d+)/i.exec(codecs ?? "");
  if (m) return HEVC_MAXBR_MAIN[Number(m[1])] ?? null;
  m = /^avc[13]\.([0-9a-f]{2})[0-9a-f]{2}([0-9a-f]{2})$/i.exec(codecs ?? "");
  if (!m) return null;
  const base = H264_MAXBR[parseInt(m[2], 16)];
  return base ? base * (parseInt(m[1], 16) >= 100 ? 1.25 : 1) : null;
}

/** The highest video bitrate over any one-second window (decode order, from packet sizes), in kbit/s. */
export function peakVideoKbps(file) {
  const out = JSON.parse(run(FP, ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=dts_time,pts_time,size", "-of", "json", file]));
  const packets = (out.packets ?? [])
    .map((p) => ({ t: Number(p.dts_time ?? p.pts_time), size: Number(p.size) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.size))
    .sort((a, b) => a.t - b.t);
  let best = 0;
  let sum = 0;
  let j = 0;
  for (let i = 0; i < packets.length; i++) {
    sum += packets[i].size;
    while (packets[i].t - packets[j].t >= 1 - 1e-6) sum -= packets[j++].size;
    best = Math.max(best, sum);
  }
  return (best * 8) / 1000;
}

/** The seam rule on the encode: PSNR(last, first) >= min(median neighbour PSNR, 45) - 3 dB, at 400 px wide. */
export function seam(file, frames) {
  const scale = `scale=${SEAM.width}:-2:flags=area,format=gbrp`;
  const steps = psnrSeries(file, `[0:v]trim=end_frame=${frames - 1},setpts=PTS-STARTPTS,${scale}[a];[1:v]trim=start_frame=1,setpts=PTS-STARTPTS,${scale}[b];[a][b]psnr=stats_file=-`);
  const wrap = psnrSeries(file, `[0:v]trim=start_frame=${frames - 1},setpts=PTS-STARTPTS,${scale}[a];[1:v]trim=end_frame=1,setpts=PTS-STARTPTS,${scale}[b];[a][b]psnr=stats_file=-`);
  if (!steps.length || wrap.length !== 1) throw new Error(`PSNR pass returned ${steps.length} steps and ${wrap.length} seam values`);
  const sorted = [...steps].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const threshold = Math.min(median, SEAM.capDb) - SEAM.marginDb;
  return { seamDb: wrap[0], medianDb: median, minStepDb: sorted[0], threshold, ok: wrap[0] >= threshold };
}

// ---- checks -------------------------------------------------------------------------------------------------------

const fmtSize = (b) => (b >= MB ? `${(b / MB).toFixed(2)} MB` : `${(b / KB).toFixed(1)} KB`);
const fmtDb = (v) => (v >= 99 ? "same" : `${v.toFixed(1)}`);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function checkVideo(rec, cls, ctx) {
  const probe = ffprobe(rec.file);
  const box = mp4Info(rec.file);
  const v = probe.streams.find((s) => s.codec_type === "video");
  const audio = probe.streams.filter((s) => s.codec_type === "audio");
  const { fail, warn, facts } = rec;
  if (!v) return fail("no video stream");
  const frames = Number(v.nb_frames);
  const duration = Number(v.duration ?? probe.format?.duration);
  Object.assign(facts, {
    codec: v.codec_name,
    profile: v.profile,
    level: v.level,
    codecs: box.video?.codecs ?? null,
    sampleEntry: box.video?.sampleEntry ?? null,
    width: v.width,
    height: v.height,
    pixFmt: v.pix_fmt,
    colour: { primaries: v.color_primaries, transfer: v.color_transfer, matrix: v.color_space, range: v.color_range, colr: box.video?.colr ?? null },
    fps: v.r_frame_rate,
    avgFps: v.avg_frame_rate,
    frames: Number.isFinite(frames) ? frames : null,
    duration,
    faststart: box.faststart,
    topLevel: box.order,
    audio: audio.map((a) => ({ codec: a.codec_name, profile: a.profile, sampleRate: Number(a.sample_rate), channels: a.channels, bitRate: Number(a.bit_rate), duration: Number(a.duration) })),
  });
  rec.cells.video = `${facts.codecs ?? v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate === "30/1" ? "30fps" : v.r_frame_rate} ${Number.isFinite(frames) ? `${frames}f` : ""}`.trim();

  // container
  if (box.truncated) fail("the file is truncated");
  if (!box.faststart) fail(`not faststart: moov comes after mdat (${box.order.join(" ")})`);
  // codec and the page's <source type>
  if (cls.codec && v.codec_name !== cls.codec) fail(`the name says ${cls.codec}, the stream is ${v.codec_name}`);
  if (cls.web) {
    const fit = fitsPage(box);
    if (!fit.ok) fail(`codecs ${fit.actual ?? "?"} does not fit the page's ${fit.declared ?? "?"}: ${fit.why}`);
    else if (fit.constraintsDiffer) warn(`codecs ${fit.actual}: constraint flags differ from the declared ${fit.declared} (decoders ignore them)`);
  } else {
    if (v.codec_name !== "h264") fail(`social masters are H.264, this is ${v.codec_name} (OVERRIDES §4)`);
    if (v.profile !== "High") fail(`profile ${v.profile}, not High (OVERRIDES §4)`);
    if (Number(v.level) > 42) fail(`level ${v.level / 10}, above 4.2`);
  }
  // picture format and colour
  if (v.pix_fmt !== "yuv420p") fail(`pix_fmt ${v.pix_fmt}, not yuv420p`);
  for (const [key, label] of [["color_primaries", "primaries"], ["color_transfer", "transfer"], ["color_space", "matrix"]]) {
    if (v[key] !== "bt709") fail(`colour ${label} ${v[key] ?? "unset"}, not bt709`);
  }
  if (v.color_range !== "tv") fail(`colour range ${v.color_range ?? "unset"}, not limited (tv)`);
  const colr = box.video?.colr;
  if (!colr) warn("no colr box in the MP4 (players fall back to the stream's VUI)");
  else if (colr.primaries !== 1 || colr.transfer !== 1 || colr.matrix !== 1 || colr.fullRange) fail(`colr box ${colr.primaries}/${colr.transfer}/${colr.matrix}${colr.fullRange ? " full range" : ""}, not BT.709 1/1/1 limited`);
  if (v.sample_aspect_ratio && !["1:1", "0:1", "N/A"].includes(v.sample_aspect_ratio)) fail(`sample aspect ratio ${v.sample_aspect_ratio}, not square pixels`);
  // a level is a promise about bitrate too: the page's <source type> (or a social file's own level) must hold it
  const declared = cls.web ? pageCodecs()[cls.codec] : box.video?.codecs;
  const ceiling = levelCeilingKbps(declared);
  if (ceiling) {
    const peak = peakVideoKbps(rec.file);
    facts.peakKbps = Math.round(peak);
    facts.levelCeilingKbps = ceiling;
    if (peak > ceiling) fail(`video peaks at ${(peak / 1000).toFixed(1)} Mb/s over one second, above the ${(ceiling / 1000).toFixed(1)} Mb/s that ${declared}'s level allows`);
    else if (peak > 0.8 * ceiling) warn(`video peaks at ${(peak / 1000).toFixed(1)} Mb/s over one second, near the ${(ceiling / 1000).toFixed(1)} Mb/s that ${declared}'s level allows`);
  }
  // time
  if (v.r_frame_rate !== "30/1" || v.avg_frame_rate !== "30/1") fail(`frame rate ${v.r_frame_rate} (average ${v.avg_frame_rate}), not 30 (D7)`);
  if (!Number.isFinite(frames) || frames <= 0) warn("the container gives no frame count");
  else if (Number.isFinite(duration) && !near(frames / 30, duration, 1 / 30 + 0.002)) warn(`${frames} frames but ${duration.toFixed(3)} s`);

  // per role
  const size = rec.size;
  const dims = `${v.width}x${v.height}`;
  if (cls.kind === "film") {
    const [w, h] = FRAMES.film[cls.res];
    if (v.width !== w || v.height !== h) fail(`${dims}, film-${cls.res} is ${w}x${h}`);
    if (ctx.totalFrames && frames !== ctx.totalFrames) fail(`${frames} frames; docs/film-captions.json times the captions for ${ctx.totalFrames}`);
    const target = LIMITS.film[`${cls.res}.${cls.codec}`];
    rec.budget = target;
    if (size > target) warn(`${fmtSize(size)} is over its ${fmtSize(target)} share of the 45 MB film set (critic C6)`);
    checkAudioTrack(rec, audio, { bitRate: 160000, why: "MASTER_PLAN §5.5" }, duration);
    if (ctx.loudness && audio.length) checkLoudness(rec, LOUDNESS.web);
  } else if (cls.kind === "teaser" || cls.kind === "loop") {
    if (audio.length) fail(`${audio.length} audio track(s); loops and the teaser are silent (-an, D11)`);
    rec.cells.audio = audio.length ? "AUDIO" : "none";
    if (cls.kind === "teaser") {
      const [w, h] = FRAMES.teaser;
      if (v.width !== w || v.height !== h) fail(`${dims}, the teaser is ${w}x${h}`);
      if (frames !== 240) warn(`${frames} frames; FILM_SPEC §15 times the teaser at 240`);
      rec.budget = LIMITS.teaser;
      if (size > LIMITS.teaser) fail(`${fmtSize(size)}, over the teaser's ${fmtSize(LIMITS.teaser)}`);
    } else {
      const page = cls.phone ? ctx.frames.phone : ctx.frames.loops.get(cls.id);
      if (page) {
        if (dims !== page) fail(`${dims}; src/lib/media.ts lays out loop-${cls.id}${cls.phone ? "-phone" : ""} at ${page}`);
      } else {
        if (!LOOP_FRAMES.includes(dims)) warn(`${dims} is none of the loop frames (${LOOP_FRAMES.join(", ")})`);
        if (cls.phone && dims !== "1080x1350") warn(`${dims}; the phone cuts are 4:5, 1080x1350`);
      }
      if (!ctx.loopIds.has(cls.id) && ctx.loopIds.size) warn(`loop id "${cls.id}" is not a LoopId in src/lib/media.ts`);
      if (cls.codec === "hevc") {
        rec.budget = LIMITS.loopHevc;
        if (size > LIMITS.loopHevc) fail(`${fmtSize(size)}, over the HEVC loop budget ${fmtSize(LIMITS.loopHevc)}`);
      } else {
        rec.budget = LIMITS.loopH264Target;
        if (size > LIMITS.loopH264) fail(`${fmtSize(size)}, over the H.264 loop limit ${fmtSize(LIMITS.loopH264)}`);
        else if (size > LIMITS.loopH264Target) warn(`${fmtSize(size)}, over the ${fmtSize(LIMITS.loopH264Target)} target (under the ${fmtSize(LIMITS.loopH264)} limit)`);
      }
    }
    if (ctx.seams && Number.isFinite(frames) && frames >= 3) {
      const s = seam(rec.file, frames);
      facts.seam = s;
      rec.cells.seam = `${fmtDb(s.seamDb)} / ${fmtDb(s.medianDb)}`;
      if (!s.ok) fail(`seam: last -> first frame ${fmtDb(s.seamDb)} dB, below ${s.threshold.toFixed(1)} dB (median step ${fmtDb(s.medianDb)} dB, capped at ${SEAM.capDb}, minus ${SEAM.marginDb}); the loop jumps`);
    }
  } else if (cls.kind === "social") {
    if (!SOCIAL_FRAMES.includes(dims)) warn(`${dims} is none of 1920x1080, 1080x1080, 1080x1920 (OVERRIDES §14)`);
    rec.budget = LIMITS.social;
    if (size > LIMITS.social) fail(`${fmtSize(size)}, over X's ${fmtSize(LIMITS.social)}`);
    const [lo, hi] = LIMITS.socialSeconds;
    if (Number.isFinite(duration) && (duration < lo || duration > hi)) fail(`${duration.toFixed(1)} s; LinkedIn needs >= ${lo} s and X allows <= ${hi} s (2 min 20 s)`);
    checkAudioTrack(rec, audio, { bitRate: 192000, why: "OVERRIDES §4" }, duration);
    if (ctx.loudness && audio.length) checkLoudness(rec, LOUDNESS.social);
  }
}

function checkAudioTrack(rec, audio, want, videoDuration) {
  const { fail, warn } = rec;
  if (audio.length !== 1) {
    rec.cells.audio = audio.length ? `${audio.length} tracks` : "NONE";
    return fail(`${audio.length} audio tracks; one AAC track is expected`);
  }
  const a = audio[0];
  const rate = Number(a.sample_rate);
  const bitRate = Number(a.bit_rate);
  rec.cells.audio = `${a.codec_name} ${rate / 1000}k ${a.channels}ch ${Number.isFinite(bitRate) ? `${Math.round(bitRate / 1000)}k` : "?"}`;
  if (a.codec_name !== "aac" || a.profile !== "LC") fail(`audio ${a.codec_name} ${a.profile ?? ""}, not AAC-LC (${want.why})`);
  if (rate !== 48000) fail(`audio at ${rate} Hz, not 48 kHz (${want.why})`);
  if (a.channels !== 2) fail(`${a.channels} audio channel(s), not stereo`);
  if (Number.isFinite(bitRate) && Math.abs(bitRate - want.bitRate) > want.bitRate * 0.15) warn(`audio at ${Math.round(bitRate / 1000)} kb/s, expected about ${want.bitRate / 1000} (${want.why})`);
  const d = Number(a.duration);
  if (Number.isFinite(d) && Number.isFinite(videoDuration)) {
    const gap = Math.abs(d - videoDuration);
    if (gap > 0.25) fail(`audio lasts ${d.toFixed(3)} s, the picture ${videoDuration.toFixed(3)} s`);
    else if (gap > 0.05) warn(`audio lasts ${d.toFixed(3)} s, the picture ${videoDuration.toFixed(3)} s`);
  }
}

function checkLoudness(rec, gate) {
  const l = loudness(rec.file);
  rec.facts.loudness = l;
  rec.cells.loud = `${l.integrated.toFixed(1)} / ${l.truePeak.toFixed(1)}`;
  if (!near(l.integrated, gate.lufs, gate.tolerance)) rec.fail(`${l.integrated.toFixed(2)} LUFS integrated, outside ${gate.lufs} +-${gate.tolerance} (${gate.why})`);
  else if (!near(l.integrated, gate.lufs, gate.planTolerance)) rec.warn(`${l.integrated.toFixed(2)} LUFS, outside MASTER_PLAN §6.4's tighter +-${gate.planTolerance}`);
  if (l.truePeak > gate.truePeak) rec.fail(`true peak ${l.truePeak.toFixed(2)} dBTP, above ${gate.truePeak} (${gate.why})`);
}

/** The size src/lib/media.ts gives a poster ("loop-models", "loop-models-phone", "film", "teaser"), or null. */
function pagePosterSize(base, frames) {
  if (base === "film" || base === "teaser") return frames[base];
  const m = /^loop-([a-z0-9-]+?)(-phone)?$/.exec(base);
  if (!m) return null;
  return m[2] ? frames.phone : frames.loops.get(m[1]) ?? null;
}

function checkPoster(rec, cls, videos, frames) {
  const info = imageInfo(rec.file);
  rec.facts.image = info;
  if (info.error) return rec.fail(info.error);
  if (info.format !== cls.format) rec.fail(`the name says ${cls.format}, the file is ${info.format}`);
  rec.cells.video = `${info.format} ${info.width}x${info.height}`;
  const budget = cls.format === "avif" ? LIMITS.posterAvif : LIMITS.posterWebp;
  rec.budget = budget;
  if (rec.size > budget) rec.fail(`${fmtSize(rec.size)}, over the ${fmtSize(budget)} poster budget (MASTER_PLAN §5.5)`);
  const size = `${info.width}x${info.height}`;
  const aspect = (s) => {
    const [w, h] = s.split("x").map(Number);
    return w / h;
  };
  const sameAspect = (s) => Math.abs(aspect(size) - aspect(s)) <= 0.01 * aspect(s);
  const video = videos.get(cls.base);
  const videoSize = video ? `${video.width}x${video.height}` : null;
  const page = pagePosterSize(cls.base, frames);
  if (videoSize && !sameAspect(videoSize)) rec.fail(`${size} does not have its video's aspect (${videoSize})`);
  if (page && !sameAspect(page)) rec.fail(`${size} does not have the aspect src/lib/media.ts gives it (${page})`);
  else if (page && size !== page) rec.warn(`${size}; src/lib/media.ts declares ${page} for its srcset`);
  if (!videoSize && !page) {
    const want = POSTER_FRAMES[cls.base] ?? (cls.base.endsWith("-phone") ? "1080x1350" : null);
    if (want && !sameAspect(want)) rec.fail(`${size} does not have the expected aspect (${want})`);
  }
}

function checkTrack(rec, cls, ctx) {
  const text = fs.readFileSync(rec.file, "utf8");
  const parsed = cls.kind === "srt" ? parseSrt(text) : parseVtt(text);
  for (const e of parsed.errors) rec.fail(e);
  const durationMs = cls.film ? ctx.tracks?.durationMs ?? null : null;
  const result = validateCues(parsed.cues, { kind: cls.track, durationMs });
  for (const e of result.errors) rec.fail(e);
  if (cls.track === "descriptions" && result.warnings.length) {
    rec.warn(`${result.warnings.length} of ${parsed.cues.length} descriptions need more speech time than their cue lasts; the player moves on at the next cue`);
  } else for (const w of result.warnings) rec.warn(w);
  rec.cells.video = `${cls.kind} ${parsed.cues.length} ${cls.track === "chapters" ? "chapters" : "cues"}`;
  const last = parsed.cues.at(-1);
  if (last) rec.cells.audio = `to ${formatTime(last.endMs, ".")}`;
  rec.facts.cues = parsed.cues.length;
  if (!ctx.tracks) return;
  const texts = ctx.texts;
  const name = path.basename(rec.file);
  if (cls.film && texts[name] !== undefined && texts[name] !== text) rec.fail("stale: differs from what tools/captions/build.mjs makes from docs/film-captions.json and chapters.ts; rebuild it");
  if (cls.kind === "srt" && parsed.cues.length === ctx.tracks.captions.length && text.replace(/\r\n?/g, "\n") !== texts.srt) {
    rec.fail("stale: the full-film SRT differs from what tools/captions/build.mjs makes now; rebuild it");
  }
}

// ---- report -------------------------------------------------------------------------------------------------------

function displayPath(file) {
  if (file.startsWith(REPO + path.sep)) {
    const rel = path.relative(REPO, file);
    return rel.startsWith("public/media/v1/") ? rel.slice("public/media/v1/".length) : rel;
  }
  const home = os.homedir();
  return file.startsWith(home + path.sep) ? `~/${path.relative(home, file)}` : file;
}

/** The deepest folder holding every file outside public/media/v1 (shown once, so the table keeps short names). */
function commonFolder(records) {
  const outside = records.map((r) => r.file).filter((f) => !f.startsWith(path.join(REPO, "public/media/v1") + path.sep));
  if (outside.length < 2) return null;
  let dir = path.dirname(outside[0]);
  while (!outside.every((f) => f.startsWith(dir + path.sep))) dir = path.dirname(dir);
  return dir === path.parse(dir).root ? null : dir;
}

function printTable(records, totals) {
  const base = commonFolder(records);
  const shown = (file) => (base && file.startsWith(base + path.sep) ? path.relative(base, file) : displayPath(file));
  if (base) console.log(`(files outside public/media/v1 are shown relative to ${displayPath(base)}/)\n`);
  const cols = [
    ["", (r) => (r.fails.length ? "FAIL" : r.warns.length ? "warn" : "ok")],
    ["file", (r) => shown(r.file)],
    ["size", (r) => fmtSize(r.size)],
    ["budget", (r) => (r.budget ? fmtSize(r.budget) : "")],
    ["video / track", (r) => r.cells.video ?? ""],
    ["audio", (r) => r.cells.audio ?? ""],
    ["LUFS / dBTP", (r) => r.cells.loud ?? ""],
    ["seam / median dB", (r) => r.cells.seam ?? ""],
  ];
  const rows = records.map((r) => cols.map(([, f]) => String(f(r))));
  const widths = cols.map(([h], i) => Math.min(48, Math.max(h.length, ...rows.map((row) => row[i].length))));
  const line = (cells) => cells.map((c, i) => (c.length > widths[i] ? `${c.slice(0, widths[i] - 1)}~` : c.padEnd(widths[i]))).join("  ").trimEnd();
  console.log(line(cols.map(([h]) => h)));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) console.log(line(row));
  const fails = records.flatMap((r) => r.fails.map((m) => `${displayPath(r.file)}: ${m}`)).concat(totals.fails);
  const warns = records.flatMap((r) => r.warns.map((m) => `${displayPath(r.file)}: ${m}`)).concat(totals.warns);
  if (fails.length) console.log(`\nFailures (${fails.length}):\n${fails.map((m) => `  - ${m}`).join("\n")}`);
  if (warns.length) console.log(`\nWarnings (${warns.length}):\n${warns.map((m) => `  - ${m}`).join("\n")}`);
  console.log(`\n${totals.summary.join("; ")}`);
}

// ---- main ---------------------------------------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\nimport ")[0].replace(/^\/\/ ?/gm, ""));
    return 0;
  }
  if ((opts.loudness || opts.seams) && !insideHeavyJob()) {
    console.error("verify.mjs: the loudness and seam passes run as one heavy job; queueing through scripts/heavy.sh (--no-analysis skips them)");
    const r = spawnSync(path.join(REPO, "scripts/heavy.sh"), ["verify-media", process.execPath, fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: "inherit" });
    if (r.status === 73) console.error("verify.mjs: heavy.sh refused (disk, memory or a hold); retry later, or run with --no-analysis for the probe-only checks");
    return r.status ?? 2;
  }

  const publicDir = path.join(REPO, "public");
  const mediaDir = path.join(publicDir, "media/v1");
  const files = new Set();
  if (opts.includePublic && fs.existsSync(mediaDir)) for (const f of walk(mediaDir)) files.add(f);
  for (const p of opts.paths) {
    if (!fs.existsSync(p)) throw new Error(`no such file or folder: ${p}`);
    if (fs.statSync(p).isDirectory()) for (const f of walk(p)) files.add(f);
    else files.add(p);
  }

  const loopIds = loopIdsFromMedia();
  let tracks = null;
  let texts = {};
  try {
    tracks = await filmTracks();
    texts = filmTrackTexts(tracks);
  } catch (error) {
    console.error(`verify.mjs: cannot build the reference tracks (${error.message}); text tracks are checked for syntax and rules only`);
  }
  const frames = pageFramesFromMedia();
  const ctx = { loudness: opts.loudness, seams: opts.seams, loopIds, frames, tracks, texts, totalFrames: tracks?.totalFrames ?? null };

  const records = [...files].sort().map((file) => {
    const rec = { file, kind: "", size: fs.statSync(file).size, budget: null, facts: {}, fails: [], warns: [], cells: {} };
    rec.fail = (m) => rec.fails.push(m);
    rec.warn = (m) => rec.warns.push(m);
    return rec;
  });
  const videos = new Map();
  for (const rec of records) {
    const cls = classify(rec.file);
    rec.kind = cls.kind;
    rec.inPublic = rec.file.startsWith(publicDir + path.sep);
    try {
      if (["film", "teaser", "loop", "social"].includes(cls.kind)) {
        checkVideo(rec, cls, ctx);
        if (rec.facts.width) {
          const base = cls.kind === "film" ? "film" : cls.kind === "teaser" ? "teaser" : cls.kind === "loop" ? `loop-${cls.id}${cls.phone ? "-phone" : ""}` : null;
          if (base && !videos.has(base)) videos.set(base, { width: rec.facts.width, height: rec.facts.height });
        }
      }
    } catch (error) {
      rec.fail(`could not be checked: ${error.message}`);
    }
    if ((cls.web || rec.inPublic) && rec.size > LIMITS.file) rec.fail(`${fmtSize(rec.size)}, over the ${fmtSize(LIMITS.file)} per-file limit (D16)`);
    if (rec.inPublic && rec.file.startsWith(mediaDir + path.sep) && !pageKnows(path.basename(rec.file), loopIds)) rec.warn("src/lib/media.ts does not use a file of this name");
  }
  for (const rec of records) {
    const cls = classify(rec.file);
    try {
      if (cls.kind === "poster") checkPoster(rec, cls, videos, frames);
      else if (cls.kind === "vtt" || cls.kind === "srt") checkTrack(rec, cls, ctx);
      else if (cls.kind === "image" && /\.(avif|webp)$/i.test(rec.file)) {
        const info = imageInfo(rec.file);
        if (info.error) rec.fail(info.error);
        else rec.cells.video = `${info.format} ${info.width}x${info.height}`;
      }
    } catch (error) {
      rec.fail(`could not be checked: ${error.message}`);
    }
  }

  // set-level rules
  const totals = { fails: [], warns: [], summary: [] };
  const film = records.filter((r) => r.kind === "film");
  if (film.length) {
    const sum = film.reduce((n, r) => n + r.size, 0);
    totals.summary.push(`film set ${fmtSize(sum)} of ${fmtSize(LIMITS.filmSet)}`);
    if (sum > LIMITS.filmSet) totals.fails.push(`the film set is ${fmtSize(sum)}, over ${fmtSize(LIMITS.filmSet)} (OVERRIDES §8, critic C6)`);
  }
  const posters = records.filter((r) => r.kind === "poster");
  for (const rec of posters) {
    const cls = classify(rec.file);
    const other = rec.file.replace(/\.(avif|webp)$/, cls.format === "avif" ? ".webp" : ".avif");
    if (!files.has(other) && !fs.existsSync(other)) rec.warn(`no ${cls.format === "avif" ? "WebP" : "AVIF"} twin`);
  }
  if (opts.includePublic && fs.existsSync(publicDir)) {
    let sum = 0;
    for (const f of walk(publicDir)) {
      const size = fs.statSync(f).size;
      sum += size;
      if (size > LIMITS.file && !files.has(f)) totals.fails.push(`${path.relative(REPO, f)} is ${fmtSize(size)}, over the ${fmtSize(LIMITS.file)} per-file limit (D16)`);
    }
    totals.summary.push(`public/ ${fmtSize(sum)} of ${fmtSize(LIMITS.public)}`);
    if (sum > LIMITS.public) totals.fails.push(`public/ holds ${fmtSize(sum)}, over ${fmtSize(LIMITS.public)} (D16)`);
  }
  const failed = records.filter((r) => r.fails.length).length + totals.fails.length;
  const warned = records.filter((r) => r.warns.length).length + totals.warns.length;
  const skipped = [!opts.loudness && "loudness", !opts.seams && "seams"].filter(Boolean);
  totals.summary.unshift(`${records.length} file(s): ${failed ? `${failed} FAILED` : "all passed"}${warned ? `, ${warned} with warnings` : ""}`);
  if (skipped.length) totals.summary.push(`skipped: ${skipped.join(", ")}`);
  totals.summary.push(`page codecs from ${pageCodecs().from}`);

  if (opts.json) {
    const out = {
      ok: failed === 0,
      checked: new Date().toISOString(),
      limits: LIMITS,
      loudness: LOUDNESS,
      seam: SEAM,
      files: records.map(({ fail, warn, cells, ...r }) => ({ ...r, file: r.file, status: r.fails.length ? "fail" : r.warns.length ? "warn" : "ok" })),
      set: totals,
    };
    console.log(JSON.stringify(out, null, 2));
  } else if (records.length) printTable(records, totals);
  else console.log(`no files to check\n${totals.summary.join("; ")}`);
  return failed ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`verify.mjs: ${error.message}`);
      process.exit(2);
    },
  );
}
