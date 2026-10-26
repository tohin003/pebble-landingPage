// The music grid the set pieces are fitted to (OVERRIDES §52 L3d; TREATMENT §4.7). The track decides every time, so a
// set piece never hard-codes one: it takes the frames of the cue's beats, downbeats and phrase lines and places its
// events on them.
//
// The rule (L3d, "every cut has a musical cause"):
// - the incoming shot's first readable frame lands on a beat, a half bar or a phrase line of the cue under it;
// - a transition starts 2–3 frames early (it completes 2–3 frames before the point, as the cascades' swaps do), or the
//   cut hides inside a momentum cut whose peak lands there;
// - a reading hold is never shortened to make a cut land: an event is only ever pushed LATER, to the next point, and
//   the music is edited at bar lines instead (within §51's Mixkit limits);
// - only hits snap (E-arrive), on accents the cue marks.
//
// Frames are composition frames or a piece's local frames (shiftGrid moves a grid between the two). Pure; no React.
import { f60 } from "../tokens";

export interface MusicGrid {
  /** every beat, ascending */
  beats: readonly number[];
  /** bar starts (a subset of the beats), ascending */
  downbeats: readonly number[];
  /** phrase lines (every 4 or 8 bars, or the sections a person marked), ascending */
  phrases: readonly number[];
  /** beats in a bar (4 in every audition track) */
  beatsPerBar: number;
  /** accents the cue marks as hits (the entrance, the peak, the title's downbeat): only these may snap */
  hits?: readonly number[];
}

export type MusicalLevel = "beat" | "half" | "bar" | "phrase";

/** A steady grid: `bpm` from the downbeat at `firstDownbeat`, from frame `from` (default 0) to frame `to`. */
export function steadyGrid(o: {
  bpm: number;
  fps: number;
  firstDownbeat: number;
  to: number;
  from?: number;
  beatsPerBar?: number;
  barsPerPhrase?: number;
  hits?: readonly number[];
}): MusicGrid {
  const bpb = o.beatsPerBar ?? 4;
  const bpp = o.barsPerPhrase ?? 4;
  const period = (60 / o.bpm) * o.fps;
  const from = o.from ?? 0;
  const beats: number[] = [];
  const downbeats: number[] = [];
  const phrases: number[] = [];
  // index k counts beats from the first downbeat (negative before it)
  const k0 = Math.ceil((from - o.firstDownbeat) / period - 1e-9);
  for (let k = k0; ; k++) {
    const f = Math.round(o.firstDownbeat + k * period);
    if (f >= o.to) break;
    if (f < from) continue;
    beats.push(f);
    const kk = ((k % bpb) + bpb) % bpb;
    if (kk === 0) {
      downbeats.push(f);
      const bar = Math.round(k / bpb);
      if (((bar % bpp) + bpp) % bpp === 0) phrases.push(f);
    }
  }
  return { beats, downbeats, phrases, beatsPerBar: bpb, hits: o.hits ?? [] };
}

/** What a score2 track map (.work/score2/maps/*.map.json) provides, in seconds of the track. */
export interface TrackMapLike {
  beats_s: readonly number[];
  downbeats_s: readonly number[];
  sections?: readonly { start_s: number }[];
}

/**
 * A stretch [inS, outS) of a measured track placed so that its second `inS` plays on frame `at`: its beats, downbeats
 * and phrase lines as frames. Phrase lines are the sections' starts, plus every `phraseBars` bars when given.
 */
export function gridFromMap(map: TrackMapLike, o: { inS: number; outS: number; at: number; fps: number; phraseBars?: number; beatsPerBar?: number; hits_s?: readonly number[] }): MusicGrid {
  const toF = (s: number) => Math.round(o.at + (s - o.inS) * o.fps);
  const inside = (s: number) => s >= o.inS && s < o.outS;
  const beats = map.beats_s.filter(inside).map(toF);
  const downbeats = map.downbeats_s.filter(inside).map(toF);
  const phraseSet = new Set<number>((map.sections ?? []).map((s) => s.start_s).filter(inside).map(toF));
  if (o.phraseBars) {
    const all = map.downbeats_s.map(toF);
    const first = map.downbeats_s.findIndex(inside);
    if (first >= 0) for (let i = first; i < map.downbeats_s.length && inside(map.downbeats_s[i]!); i += o.phraseBars) phraseSet.add(all[i]!);
  }
  return {
    beats,
    downbeats,
    phrases: [...phraseSet].sort((a, b) => a - b),
    beatsPerBar: o.beatsPerBar ?? 4,
    hits: (o.hits_s ?? []).filter(inside).map(toF),
  };
}

/** The same grid `by` frames later (a composition grid into a piece's local frames: shiftGrid(g, −start)). */
export const shiftGrid = (g: MusicGrid, by: number): MusicGrid => ({
  beats: g.beats.map((x) => x + by),
  downbeats: g.downbeats.map((x) => x + by),
  phrases: g.phrases.map((x) => x + by),
  beatsPerBar: g.beatsPerBar,
  hits: (g.hits ?? []).map((x) => x + by),
});

/** The half-bar points: every downbeat and the beat in the middle of each bar. */
export const halfBars = (g: MusicGrid): number[] => {
  const half = Math.floor(g.beatsPerBar / 2);
  const out = new Set<number>(g.downbeats);
  for (const d of g.downbeats) {
    const i = g.beats.indexOf(d);
    if (i >= 0 && i + half < g.beats.length) out.add(g.beats[i + half]!);
  }
  return [...out].sort((a, b) => a - b);
};

/** The points of a level: beats ⊇ half bars ⊇ bars ⊇ phrase lines. */
export const pointsOf = (g: MusicGrid, level: MusicalLevel): readonly number[] =>
  level === "beat" ? g.beats : level === "half" ? halfBars(g) : level === "bar" ? g.downbeats : g.phrases.length ? g.phrases : g.downbeats;

/** The first point of `level` at or after `frame`, or undefined past the grid's end. */
export const nextPoint = (g: MusicGrid, frame: number, level: MusicalLevel = "beat"): number | undefined => pointsOf(g, level).find((p) => p >= frame - 1e-9);

/** The last point of `level` at or before `frame`. */
export const prevPoint = (g: MusicGrid, frame: number, level: MusicalLevel = "beat"): number | undefined => {
  const pts = pointsOf(g, level);
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i]! <= frame + 1e-9) return pts[i];
  return undefined;
};

export interface Placement {
  /** the frame the event starts (a transition starts `frames + lead` before the point) */
  at: number;
  /** the musical point its first readable frame lands on, or null without a grid (or past its end) */
  point: number | null;
  level: MusicalLevel | null;
  /** frames it waited past its earliest start (never negative: holds are never shortened) */
  waited: number;
}

/**
 * Places an event whose first readable frame may come no earlier than `earliest`: on the first point of `level` at or
 * after it. A transition of `frames` frames completes `lead` frames before the point (2–3 at 60 fps, as the cascades'
 * swaps): it starts on point − lead − frames, and never before `earliest − frames − lead`. A hard cut (frames 0, lead
 * 0) puts the incoming shot's first frame on the point. Without a grid, or past its end, it starts at the earliest.
 */
export function place(earliest: number, g: MusicGrid | undefined, o: { level?: MusicalLevel; frames?: number; lead?: number; maxWait?: number } = {}): Placement {
  const frames = o.frames ?? 0;
  const lead = o.lead ?? 0;
  const level = o.level ?? "beat";
  const startEarliest = earliest - frames - lead;
  if (!g) return { at: Math.ceil(startEarliest), point: null, level: null, waited: 0 };
  const p = nextPoint(g, earliest + lead, level);
  if (p === undefined || (o.maxWait !== undefined && p - lead - frames - startEarliest > o.maxWait)) {
    return { at: Math.ceil(startEarliest), point: null, level: null, waited: 0 };
  }
  const at = p - lead - frames;
  return { at, point: p, level, waited: at - startEarliest };
}

/** The 2–3 frames (60 fps) a transition or a swap completes before its beat, at `fps`. */
export const leadFrames = (fps: number): number => Math.max(1, f60(2.5, fps));

/** Is `frame` within `tol` frames of a point of `level`? */
export const onGrid = (g: MusicGrid, frame: number, level: MusicalLevel = "beat", tol = 0.5): boolean => pointsOf(g, level).some((p) => Math.abs(p - frame) <= tol);

/** The nearest marked hit to `frame` within `tol` frames (only hits may snap). */
export const hitNear = (g: MusicGrid | undefined, frame: number, tol = 2): number | undefined => (g?.hits ?? []).find((h) => Math.abs(h - frame) <= tol);
