// The reel's beat map: the music director's JSON in, the edit's grid out. Pure; no React.
//
// The music lane writes `.work/reel/music/<name>.beatmap.json` "with every beat, downbeat, bar, hit, drop and silence
// edge, in seconds and in frames at 60 fps". Its exact keys aren't fixed, so `normalizeBeatMap` reads the shapes a beat
// map plausibly takes (a list of numbers, or of objects with `s`/`t`/`time`/`seconds` and/or `frame`; one drop or a
// list of them; silences as [start, end] or {start, end}) and turns every time into a frame at the reel's 60 fps.
// Seconds win over frames when both are given (a frame list at another rate can't fool it). Unknown keys are ignored.

export const REEL_FPS = 60;

export interface Span {
  from: number;
  to: number;
}
export interface Section extends Span {
  name: string;
}
export interface Hit {
  frame: number;
  kind: string;
  strength?: number;
}

/** A beat map in reel frames (60 fps), every list sorted. */
export interface BeatMap {
  name: string;
  durationFrames: number;
  bpm: number;
  beats: number[];
  downbeats: number[];
  hits: Hit[];
  /** the reveal's drop (the first drop the map names) */
  drop: number;
  silences: Span[];
  sections: Section[];
  /** where the map came from, for the render's notes */
  source: string;
}

type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: Json): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** One time (seconds or frames) as a reel frame. */
function timeOf(v: Json, fpsIn: number): number | undefined {
  if (num(v) !== undefined) return undefined; // bare numbers are resolved by the list's unit (listTimes)
  if (!isObj(v)) return undefined;
  for (const k of ["s", "t", "time", "time_s", "seconds", "sec", "at_s", "at", "start_s"]) {
    const s = num(v[k]);
    if (s !== undefined) return s * REEL_FPS;
  }
  for (const k of ["frame", "frame60", "f", "frames", "at_frame"]) {
    const f = num(v[k]);
    if (f !== undefined) return (f / fpsIn) * REEL_FPS;
  }
  return undefined;
}

/** A list of times. Bare numbers are seconds unless the key says frames (`beats_frames`) or they are all integers above the map's length in seconds. */
function listTimes(v: Json, fpsIn: number, unit: "s" | "f" | "auto", durationS: number): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  const bare = v.filter((x) => num(x) !== undefined) as number[];
  let asFrames = unit === "f";
  if (unit === "auto" && bare.length > 0) asFrames = bare.every(Number.isInteger) && Math.max(...bare) > durationS + 1;
  for (const x of v) {
    const n = num(x);
    if (n !== undefined) out.push(asFrames ? (n / fpsIn) * REEL_FPS : n * REEL_FPS);
    else {
      const t = timeOf(x, fpsIn);
      if (t !== undefined) out.push(t);
    }
  }
  return out.sort((a, b) => a - b);
}

function spanOf(v: Json, fpsIn: number): Span | undefined {
  if (Array.isArray(v) && v.length === 2 && num(v[0]) !== undefined && num(v[1]) !== undefined) return { from: (v[0] as number) * REEL_FPS, to: (v[1] as number) * REEL_FPS };
  if (!isObj(v)) return undefined;
  const pick = (ks: string[], frameKs: string[]) => {
    for (const k of ks) if (num(v[k]) !== undefined) return (v[k] as number) * REEL_FPS;
    for (const k of frameKs) if (num(v[k]) !== undefined) return ((v[k] as number) / fpsIn) * REEL_FPS;
    return undefined;
  };
  const from = pick(["start_s", "from_s", "start", "from", "in_s", "s0", "t0"], ["start_frame", "from_frame", "in_frame", "f0"]);
  const to = pick(["end_s", "to_s", "end", "to", "out_s", "s1", "t1"], ["end_frame", "to_frame", "out_frame", "f1"]);
  return from !== undefined && to !== undefined ? { from, to } : undefined;
}

/** Reads a music-lane beat map (any of the shapes above) into reel frames. Throws if it has no beats. */
export function normalizeBeatMap(raw: Json, source = "beatmap"): BeatMap {
  if (!isObj(raw)) throw new Error(`${source}: not a JSON object`);
  const fpsIn = num(raw.fps) ?? num(raw.frame_rate) ?? REEL_FPS;
  const durationS =
    num(raw.duration_s) ?? num(raw.durationS) ?? num(raw.duration) ?? (num(raw.duration_frames) !== undefined ? (raw.duration_frames as number) / fpsIn : undefined) ?? 0;
  const pickList = (keys: string[]): number[] => {
    for (const k of keys) {
      if (raw[k] !== undefined) return listTimes(raw[k], fpsIn, k.endsWith("_frames") ? "f" : k.endsWith("_s") ? "s" : "auto", durationS);
    }
    return [];
  };
  const beats = pickList(["beats", "beats_s", "beats_frames", "beat"]);
  if (beats.length < 2) throw new Error(`${source}: fewer than two beats`);
  const downbeats = pickList(["downbeats", "downbeats_s", "downbeats_frames", "bars", "bars_s", "bars_frames"]);

  const hits: Hit[] = [];
  const hitList = raw.hits ?? raw.hits_s ?? raw.accents;
  if (Array.isArray(hitList)) {
    for (const h of hitList) {
      const f = num(h) !== undefined ? (h as number) * REEL_FPS : timeOf(h, fpsIn);
      if (f === undefined) continue;
      const kind = isObj(h) && typeof (h.kind ?? h.type ?? h.name) === "string" ? String(h.kind ?? h.type ?? h.name) : "hit";
      const strength = isObj(h) ? num(h.strength ?? h.level ?? h.weight) : undefined;
      hits.push({ frame: f, kind, strength });
    }
  }
  let drop: number | undefined;
  for (const k of ["drop", "drop_s", "reveal", "drops"]) {
    const v = raw[k];
    if (v === undefined) continue;
    if (num(v) !== undefined) drop = (v as number) * (k === "drop" || k === "reveal" || k === "drop_s" ? REEL_FPS : 1);
    else if (Array.isArray(v) && v.length) drop = num(v[0]) !== undefined ? (v[0] as number) * REEL_FPS : timeOf(v[0], fpsIn);
    else drop = timeOf(v, fpsIn);
    if (drop !== undefined) break;
  }
  if (drop === undefined) drop = hits.find((h) => /drop|reveal/i.test(h.kind))?.frame;
  if (drop === undefined) throw new Error(`${source}: no drop (keys drop, drops, reveal, or a hit of kind "drop")`);
  for (const h of hits) if (/drop/i.test(h.kind) && Math.abs(h.frame - drop) < 1) h.kind = "drop";

  const silences: Span[] = [];
  const sil = raw.silences ?? raw.silence ?? raw.silence_edges;
  if (Array.isArray(sil)) for (const s of sil) {
    const sp = spanOf(s, fpsIn);
    if (sp) silences.push(sp);
  }
  const sections: Section[] = [];
  const secs = raw.sections;
  if (Array.isArray(secs)) for (const s of secs) {
    const sp = spanOf(s, fpsIn);
    const name = isObj(s) ? String(s.name ?? s.label ?? s.id ?? "section") : "section";
    if (sp) sections.push({ name, ...sp });
  } else if (isObj(secs)) {
    for (const [name, v] of Object.entries(secs)) {
      const sp = spanOf(v, fpsIn);
      if (sp) sections.push({ name, ...sp });
    }
  }
  const durationFrames = Math.round((durationS || beats[beats.length - 1] / REEL_FPS + 0.5) * REEL_FPS);
  const period = medianInterval(beats);
  const bpm = num(raw.bpm) ?? num(raw.tempo_bpm) ?? num(raw.tempo) ?? (isObj(raw.tempo) ? num(raw.tempo.bpm) : undefined) ?? (60 * REEL_FPS) / period;
  return {
    name: String(raw.name ?? source),
    durationFrames,
    bpm,
    beats,
    downbeats: downbeats.length ? downbeats : beats.filter((_, i) => i % 4 === 0),
    hits: hits.sort((a, b) => a.frame - b.frame),
    drop,
    silences,
    sections,
    source,
  };
}

export function medianInterval(xs: readonly number[]): number {
  const d = xs.slice(1).map((x, i) => x - xs[i]).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : REEL_FPS / 2;
}

/** The beat period in frames (the median beat-to-beat interval). */
export const beatPeriod = (m: BeatMap): number => medianInterval(m.beats);

/** The beat nearest `f`. */
export function nearestBeat(m: BeatMap, f: number): number {
  let best = m.beats[0];
  for (const b of m.beats) if (Math.abs(b - f) < Math.abs(best - f)) best = b;
  return best;
}

/** Beats in [from, to). */
export const beatsIn = (m: BeatMap, from: number, to: number): number[] => m.beats.filter((b) => b >= from - 0.5 && b < to - 0.5);

/** The i-th beat at or after `f` (i = 0 is the first one at or after it); extrapolates past the map's end on its period. */
export function beatAfter(m: BeatMap, f: number, i = 0): number {
  const after = m.beats.filter((b) => b >= f - 0.5);
  if (i < after.length) return after[i];
  const p = beatPeriod(m);
  const last = after.length ? after[after.length - 1] : m.beats[m.beats.length - 1];
  return last + p * (i - Math.max(0, after.length - 1));
}

/**
 * A temporary beat map for building before the music lands: a constant grid, a drop and four-beat bars. Same shape as
 * the music lane's file once normalized.
 */
export function gridBeatMap(o: { bpm: number; durationS: number; dropS: number; phaseS?: number; name?: string }): BeatMap {
  const period = (60 / o.bpm) * REEL_FPS;
  const phase = (o.phaseS ?? 0) * REEL_FPS;
  const beats: number[] = [];
  for (let f = phase; f <= o.durationS * REEL_FPS + 0.5; f += period) beats.push(f);
  const dropIdx = beats.findIndex((b) => Math.abs(b - o.dropS * REEL_FPS) < period / 2);
  const downbeats = beats.filter((_, i) => (i - dropIdx) % 4 === 0);
  return {
    name: o.name ?? "temporary grid",
    durationFrames: Math.round(o.durationS * REEL_FPS),
    bpm: o.bpm,
    beats,
    downbeats,
    hits: [{ frame: o.dropS * REEL_FPS, kind: "drop", strength: 1 }],
    drop: o.dropS * REEL_FPS,
    silences: [],
    sections: [
      { name: "tension", from: 0, to: o.dropS * REEL_FPS },
      { name: "drop", from: o.dropS * REEL_FPS, to: o.dropS * REEL_FPS + period * 4 },
      { name: "montage", from: o.dropS * REEL_FPS + period * 4, to: o.durationS * REEL_FPS },
    ],
    source: "gridBeatMap",
  };
}
