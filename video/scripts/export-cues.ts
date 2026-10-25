// The film's sound-effect cue list (FILM_SPEC §11 and §24, the trailer's), lane G2a. Run with bun from the repo root:
//   bun video/scripts/export-cues.ts            writes tools/audio/cues.json
//   bun video/scripts/export-cues.ts --check    verifies the file on disk is current (exit 1 if not)
// It reads ONLY the pure-data timeline (video/src/film/timeline.ts: SFX, the picture frames and takes) and the kit
// (tools/audio/sfx_kit.json: directory, alignment, gains), and writes the format tools/audio/mix_master.py reads (the
// example is tools/audio/cues.example.json): file (relative to tools/audio/), t (seconds), align, gain_db, pan, duck_db,
// event, plus frame / peak_frame / role / take for people reading it.
//
// Rules (sfx_kit.json, R5 §10): every effect PEAKS one frame after its picture event (t = (frame + 1) / fps, align
// "peak"); an end-aligned take (the trailer's suck-backs) ENDS on its frame, the hit it rises into (t = frame / fps,
// align "end"); the score carries the riser into the dead stop, so the timeline has none (validateTimeline checks
// both); takes rotate as the timeline names them; pans are the timeline's, else the role's. When the kit's WAVs are on
// disk (.work/audio/sfx), it also checks that no more than three effects sound at once.
//
// The energetic recut (ENERGY_SPEC §8.3): after the effects come the mix's automation spans (timeline AUTOMATION: the
// gaps, the hold and the tail) as entries with NO "file", in the kit's format (sfx_kit.json "automation"): role, frame,
// to_frame, release_frame (the hold only), t = frame / fps, t_end = to_frame / fps, event, then the role's params from
// the kit. They are spans, not effects: they never count toward the three-at-once limit.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTOMATION, FPS, SFX, validateTimeline } from "../src/film/timeline";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const audio = join(repo, "tools", "audio");
const out = join(audio, "cues.json");

interface Role {
  takes: string[];
  align: "peak" | "end" | "start";
  gain_db: number;
  duck_db?: number;
  pan: number | string;
}
const kit = JSON.parse(readFileSync(join(audio, "sfx_kit.json"), "utf8")) as {
  dir: string;
  roles: Record<string, Role>;
  automation?: Record<string, Record<string, unknown>>;
};

const problems = validateTimeline();
const r4 = (v: number) => Math.round(v * 10000) / 10000;

const cues = SFX.map((c) => {
  const role = kit.roles[c.role];
  if (!role) throw new Error(`sfx_kit.json has no role "${c.role}"`);
  const file = `${c.take}.wav`;
  if (!role.takes.includes(file)) problems.push(`f${c.frame} ${c.role}: take ${file} is not one of the kit's ${role.takes.join(", ")}`);
  const end = role.align === "end";
  const peakFrame = end ? c.frame : c.frame + 1;
  return {
    file: `${kit.dir}${file}`,
    t: r4(peakFrame / FPS),
    align: role.align,
    gain_db: role.gain_db,
    pan: c.pan ?? (typeof role.pan === "number" ? role.pan : 0),
    duck_db: c.duckDb ?? 0,
    event: c.event,
    frame: c.frame,
    peak_frame: peakFrame,
    role: c.role,
    take: c.take,
  };
});

// the automation spans, each with its role's params from the kit (its prose "when" stays in the kit)
const spans = AUTOMATION.map((a) => {
  const params = kit.automation?.[a.role];
  if (!params || typeof params !== "object") {
    problems.push(`sfx_kit.json has no automation role "${a.role}"`);
    return null;
  }
  const rest = Object.fromEntries(Object.entries(params).filter(([k]) => k !== "when"));
  return {
    role: a.role,
    frame: a.frame,
    to_frame: a.toFrame,
    ...(a.releaseFrame !== undefined ? { release_frame: a.releaseFrame } : {}),
    t: r4(a.frame / FPS),
    t_end: r4(a.toFrame / FPS),
    event: a.event,
    ...rest,
  };
});

/** Seconds of a 16/24/32-bit PCM or float WAV (RIFF header only). */
function wavSeconds(path: string): number | null {
  try {
    const b = readFileSync(path);
    let i = 12;
    let rate = 0;
    let bytesPerFrame = 0;
    while (i + 8 <= b.length) {
      const id = b.toString("ascii", i, i + 4);
      const size = b.readUInt32LE(i + 4);
      if (id === "fmt ") {
        const channels = b.readUInt16LE(i + 10);
        rate = b.readUInt32LE(i + 12);
        bytesPerFrame = channels * (b.readUInt16LE(i + 22) / 8);
      }
      if (id === "data" && rate && bytesPerFrame) return size / bytesPerFrame / rate;
      i += 8 + size + (size % 2);
    }
  } catch {
    return null;
  }
  return null;
}

// at most three at once: each effect sounds from its start to its end (peak alignment: the file's peak is unknown
// here, so an effect is assumed to sound from t − 0.1 s for its whole length; the riser from t − length to t)
const sfxDir = join(audio, kit.dir);
let overlapNote = "kit WAVs not on disk: overlap check skipped";
if (existsSync(sfxDir)) {
  const spans = cues.map((c) => {
    const len = wavSeconds(join(sfxDir, `${c.take}.wav`)) ?? 0.5;
    return c.align === "end" ? { c, a: c.t - len, b: c.t } : { c, a: c.t - 0.1, b: c.t - 0.1 + len };
  });
  let worst = 0;
  for (const s of spans) {
    const n = spans.filter((o) => o.a <= s.a && s.a < o.b).length;
    worst = Math.max(worst, n);
    if (n > 3) problems.push(`more than three effects at once around ${s.c.t.toFixed(2)} s (${s.c.event})`);
  }
  overlapNote = `at most ${worst} effects at once`;
}

if (problems.length) {
  console.error(`export-cues: problems:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
const text = `${JSON.stringify([...cues, ...spans], null, 1)}\n`;
const counts = `${cues.length} effects and ${spans.length} automation spans`;
if (process.argv.includes("--check")) {
  const current = existsSync(out) ? readFileSync(out, "utf8") : "";
  if (current !== text) {
    console.error("export-cues: tools/audio/cues.json is out of date; run bun video/scripts/export-cues.ts");
    process.exit(1);
  }
  console.log(`export-cues: tools/audio/cues.json is current (${counts}; ${overlapNote})`);
} else {
  writeFileSync(out, text);
  console.log(`export-cues: wrote ${counts} to tools/audio/cues.json (${overlapNote})`);
}
