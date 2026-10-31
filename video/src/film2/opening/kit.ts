// The film's opening (Act I and Rings 1–3, S01–S16): the common model of its four acts. Each act is a PLAN (pure data
// the view draws and the checks read, as the set pieces are): its shots, each one stretch of one real take at 1× (a crop
// of the recording on the page's ground, with the film's one shadow) or a typographic beat (film lines on the page,
// where no take of the shot was kept); its film lines; its marks (where the take's events and the score's marks fall);
// and the score's mutes (RS-9's sarcastic beat). Frames are act-local (0 = the act's first film frame) unless named.
//
// Rules held by checkAct (and tests/opening.test.ts, with canaries):
// - a take shot plays its source at 1× and is cut only between shots, never inside a model's reply;
// - no shot shows a usage or timing line (tokens, cached, seconds, tok/s): each take's forbidden places (FORBIDDEN)
//   stay outside every crop on every source frame shown;
// - RS-9's composite only as DECISION-RS9 decided (Clip A to "Task: running", Clip B from Chrome's clear frame, its
//   adverts never in frame, the score cut out on the punch-in, "Anyway.", a hard cut);
// - every film line has a claim (docs/CLAIMS.md, C-F2O-…), enters and leaves inside its shot (no type vanishes on a
//   cut) and is held long enough to read.
// Pure; no React.
import type { Rect } from "../motion/geometry";
import type { TakeManifest } from "../setpieces/take";
import type { TypeTier } from "../tokens";
import { wordsIn } from "../type/exits";

export interface ActShot {
  id: string;
  /** the matrix's shot this stands for (S01 … S16) */
  stands: string;
  kind: "take" | "type";
  take?: TakeManifest;
  /** a take shot's source frames, [from, to), at 1× */
  from?: number;
  to?: number;
  /** a typographic beat's length, frames */
  frames?: number;
  /** the part of the recording shown, CSS px (undefined: the whole screen) */
  crop?: Rect;
  /** the largest scale of the crop on the frame, frame px per CSS px at 1080 (a small crop is never blown up past it) */
  maxK?: number;
  /**
   * a fast move inside the recording (macOS's Space slide) softened as the Return's first cell is (returnFirstCell.ts):
   * a blur and a veil toward the page, rising on a smoothstep over `ramp` source frames into [from, to) and out of it
   */
  soften?: { from: number; to: number; ramp: number; blurPx: number; veil: number };
  note: string;
}

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** The softening on a source frame of a shot: blur (px at 1080) and veil (0…1). */
export function softenAt(s: ActShot, src: number): { blur: number; veil: number } {
  const o = s.soften;
  if (!o) return { blur: 0, veil: 0 };
  const w = Math.min(smooth((src - (o.from - o.ramp)) / o.ramp), smooth((o.to + o.ramp - src) / o.ramp));
  return { blur: o.blurPx * w, veil: o.veil * w };
}

export interface ActLine {
  id: string;
  text: string;
  tier: TypeTier;
  /** act-local frame its entrance starts */
  at: number;
  /** act-local frame its exit starts (it is gone LINE_EXIT frames later) */
  exitAt: number;
  /** its row in docs/CLAIMS.md ("" for a line that states nothing, such as "Anyway.") */
  claim: string;
  sizeT?: number;
  /** its row in the band (0 the first line, 1 under it …) */
  slot?: number;
  /** it leaves with the act's hard cut, by decision (RS-9's "Anyway.", DECISION-RS9): it may not exit on its own */
  cutOut?: boolean;
}

export interface ActMark {
  frame: number;
  what: string;
  /** the score's frame for it (BEAT_SHEET / layers_main.json), when the score names one */
  score?: number;
}

export interface ActPlan {
  id: "act1" | "ring1" | "ring2" | "ring3";
  name: string;
  /** the act's first film frame */
  start: number;
  shots: readonly ActShot[];
  lines: readonly ActLine[];
  marks: readonly ActMark[];
  /** act-local frames where the score is cut out ([from, to)): the master is muted there */
  mutes: readonly (readonly [number, number])[];
}

/** A line's exit, frames (KineticLine's blur exit, timed here so the checks can hold it inside its shot). */
export const LINE_EXIT = 16;
/** A line's blur-in, frames (TYPE_MOTION.blurIn is shorter: this is the reading model's margin). */
export const LINE_IN = 18;
/** Reading speed, words a second (the set pieces' reading model), and the floor of any line's hold. */
export const WORDS_PER_S = 3.14;
export const MIN_HOLD_S = 2.0;
/** The slow push on every shot of the opening, scale a second (0.8 % a second: the scans read a thin strip held still at 0.4 % as dead). */
export const PUSH_PER_S = 0.008;

export const shotFrames = (s: ActShot): number => (s.kind === "take" ? s.to! - s.from! : s.frames!);
export const actFrames = (p: ActPlan): number => p.shots.reduce((n, s) => n + shotFrames(s), 0);

/** Each shot's act-local start. */
export function shotStarts(p: ActPlan): number[] {
  const out: number[] = [];
  let at = 0;
  for (const s of p.shots) {
    out.push(at);
    at += shotFrames(s);
  }
  return out;
}

/** The shot on act-local frame `f`, its index and its source frame (take shots). */
export function shotAt(p: ActPlan, f: number): { shot: ActShot; index: number; start: number; src?: number } {
  const starts = shotStarts(p);
  for (let i = p.shots.length - 1; i >= 0; i--) {
    if (f >= starts[i]!) {
      const s = p.shots[i]!;
      const local = Math.min(f - starts[i]!, shotFrames(s) - 1);
      return { shot: s, index: i, start: starts[i]!, src: s.kind === "take" ? s.from! + local : undefined };
    }
  }
  const s = p.shots[0]!;
  return { shot: s, index: 0, start: 0, src: s.kind === "take" ? s.from : undefined };
}

/** The act-local frame on which a take's source frame `src` shows in shot `id` (for the marks). */
export function frameOfSource(p: ActPlan, id: string, src: number): number {
  const i = p.shots.findIndex((s) => s.id === id);
  const s = p.shots[i]!;
  return shotStarts(p)[i]! + (src - s.from!);
}

/** A source window of a take where a place must never be in frame (usage lines, step timings, adverts, a prompt). */
export interface Forbidden {
  rect: Rect;
  /** source frames [from, to) it shows on (default: the whole take) */
  from?: number;
  to?: number;
  why: string;
}

/**
 * Every place the opening's takes must never show, read off the pictures (1 Nov; CSS px of each recording). A crop that
 * meets one on a source frame where it shows fails checkAct.
 */
export const FORBIDDEN: Readonly<Record<string, readonly Forbidden[]>> = {
  // RS15-01: the reply's usage line from about 924 (the whole screen ends before it); under the reply in the panel
  "RS15-01": [{ rect: { x: 1040, y: 600, w: 400, h: 20 }, from: 920, why: "the reply's usage line under the panel (from about 924)" }],
  // RS4-07: the workspace's Activity panel and its step timings, right of Calculator
  "RS4-07": [{ rect: { x: 530, y: 0, w: 494, h: 666 }, why: "the Activity panel's step timings" }],
  // RS9A-01: the workspace's usage line, and the stale press card under the companion
  "RS9A-01": [
    { rect: { x: 280, y: 230, w: 340, h: 34 }, why: "the workspace's usage line" },
    { rect: { x: 600, y: 470, w: 424, h: 196 }, why: "the stale press card under the companion" },
    { rect: { x: 0, y: 0, w: 1024, h: 666 }, from: 37 * 60, why: "Pebble's 'which rival?' (never used)" },
  ],
  // RS9B-02: its prompt carries the URL until Chrome's Space clears it; YouTube's adverts fill the player until about
  // 116 s (the tab and address bars above the player may show over them)
  "RS9B-02": [
    { rect: { x: 0, y: 0, w: 640, h: 666 }, to: 3276, why: "Clip B's workspace (its prompt, usage lines and conversations)" },
    { rect: { x: 640, y: 0, w: 384, h: 228 }, to: 3276, why: "Clip B's prompt with the URL, above the card in the companion" },
    { rect: { x: 640, y: 356, w: 384, h: 310 }, to: 3276, why: "the companion below the card" },
    { rect: { x: 640, y: 228, w: 384, h: 128 }, from: 2915, to: 3276, why: "the URL and a usage line, in the card's place once it is allowed" },
    { rect: { x: 0, y: 113, w: 1024, h: 553 }, from: 3276, to: 6960, why: "YouTube's adverts" },
    { rect: { x: 680, y: 113, w: 344, h: 553 }, from: 3276, why: "the sidebar's adverts and thumbnails" },
  ],
  // RS5C-04 and RS5F-03: the chat's usage line until the app's window covers it; the Activity panel's step timings;
  // the run's Done box (tokens)
  "RS5C-04": [
    { rect: { x: 300, y: 270, w: 345, h: 90 }, to: 6100, why: "the chat's usage line" },
    { rect: { x: 950, y: 280, w: 74, h: 386 }, to: 6100, why: "the Activity panel's step timings" },
    { rect: { x: 640, y: 500, w: 384, h: 60 }, to: 6100, why: "the run's Done box" },
  ],
  "RS5F-03": [
    { rect: { x: 300, y: 270, w: 345, h: 90 }, to: 2700, why: "the chat's usage line" },
    { rect: { x: 950, y: 280, w: 74, h: 386 }, why: "the Activity panel's step timings" },
    { rect: { x: 640, y: 500, w: 384, h: 60 }, why: "the run's Done box" },
  ],
  // RS1-03: the booking page's date ("Saturday 14 November", against the poster's 7 November) once the slide settles
  "RS1-03": [{ rect: { x: 60, y: 200, w: 300, h: 80 }, from: 262, why: "the booking page's date (14 November, against the poster's 7)" }],
};

const meets = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Every rule an act's plan must hold (empty: it holds them all). */
export function checkAct(p: ActPlan, expectStart?: number, expectFrames?: number): string[] {
  const out: string[] = [];
  const n = actFrames(p);
  if (expectStart !== undefined && p.start !== expectStart) out.push(`${p.id}: starts on ${p.start}, not ${expectStart}`);
  if (expectFrames !== undefined && n !== expectFrames) out.push(`${p.id}: runs ${n} frames, not ${expectFrames}`);
  const starts = shotStarts(p);
  p.shots.forEach((s, i) => {
    const tag = `${p.id}/${s.id}`;
    if (s.kind === "type") {
      if (!s.frames || s.frames < 60) out.push(`${tag}: a typographic beat under a second`);
      if (s.take || s.crop) out.push(`${tag}: a typographic beat carries no take`);
      return;
    }
    const m = s.take;
    if (!m) return void out.push(`${tag}: a take shot with no take`);
    if (m.placeholder || !m.pattern) out.push(`${tag}: ${m.id} is not a real recorded take`);
    if (s.from === undefined || s.to === undefined || s.from < 0 || s.to > m.frames || s.to <= s.from) return void out.push(`${tag}: source ${s.from}–${s.to} outside ${m.id}`);
    const shown = s.crop ?? { x: 0, y: 0, w: m.w, h: m.h };
    if (shown.x < 0 || shown.y < 0 || shown.x + shown.w > m.w || shown.y + shown.h > m.h) out.push(`${tag}: its crop leaves the recording`);
    const bad = FORBIDDEN[m.id];
    if (bad === undefined) out.push(`${tag}: ${m.id} has no forbidden places recorded (look at it first)`);
    for (const b of bad ?? []) {
      const lo = Math.max(s.from, b.from ?? 0);
      const hi = Math.min(s.to, b.to ?? Infinity);
      if (lo < hi && meets(shown, b.rect)) out.push(`${tag}: shows ${b.why} (source ${lo}–${hi})`);
    }
    void starts[i];
  });
  // a take continued in the next shot is never cut backwards (no replay) and, inside a reply, never cut at all
  for (let i = 1; i < p.shots.length; i++) {
    const a = p.shots[i - 1]!;
    const b = p.shots[i]!;
    if (a.kind === "take" && b.kind === "take" && a.take === b.take && b.from! < a.to!) out.push(`${p.id}/${b.id}: replays ${a.take!.id} (${b.from} before ${a.to})`);
  }
  for (const l of p.lines) {
    const tag = `${p.id}/${l.id}`;
    const { start, shot } = shotAt(p, l.at);
    const end = start + shotFrames(shot);
    if (l.cutOut) {
      if (end !== actFrames(p) || l.exitAt < end) out.push(`${tag}: only a line on the act's last shot may leave with the hard cut`);
    } else if (l.exitAt + LINE_EXIT > end) out.push(`${tag}: still on screen at the cut on ${end} (type never vanishes on a cut)`);
    if (l.at < start) out.push(`${tag}: enters before its shot`);
    const words = wordsIn(l.text);
    const need = Math.round(Math.max(MIN_HOLD_S, words / WORDS_PER_S) * 60);
    if (l.text !== "Anyway." && l.exitAt - (l.at + LINE_IN) < need) out.push(`${tag}: held ${l.exitAt - l.at - LINE_IN} frames, ${words} words need ${need}`);
    if (l.text !== "Anyway." && !/^C-[A-Z0-9-]+$/.test(l.claim)) out.push(`${tag}: no claim row`);
  }
  for (const [a, b] of p.mutes) if (!(a >= 0 && b > a && b <= n)) out.push(`${p.id}: a mute ${a}–${b} outside the act`);
  return out;
}

/* ---------------------------------------------------------------- layout -------------------------------------- */

/** A type measure: a line's size (typeSizePx) and its advance width (approxLineWidth), passed in from type/scale.ts. */
export interface TypeMeasure {
  size: (tier: TypeTier, w: number, h: number, t?: number) => number;
  width: (text: string, tier: TypeTier, w: number, h: number, t?: number) => number;
}

/** A line broken into rows that fit `maxW` (greedy, at spaces): the film's lines are never re-flowed by the browser. */
export function wrapLine(l: ActLine, maxW: number, W: number, H: number, m: TypeMeasure): string[] {
  const rows: string[] = [];
  let cur = "";
  for (const word of l.text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && m.width(next, l.tier, W, H, l.sizeT ?? 0.5) > maxW) {
      rows.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) rows.push(cur);
  return rows;
}

/** One line's row height in the band, px (its tier's size at its sizeT, with the line's leading). */
const rowPx = (l: ActLine, W: number, H: number, size: (tier: TypeTier, w: number, h: number, t?: number) => number): number =>
  size(l.tier, W, H, l.sizeT ?? 0.5) * (l.tier === "expressive" ? 1.25 : 1.3) + 0.012 * H;

/** The lines that enter during a shot (they leave inside it: checkAct). */
export const linesOfShot = (p: ActPlan, index: number): ActLine[] => {
  const start = shotStarts(p)[index]!;
  const end = start + shotFrames(p.shots[index]!);
  return p.lines.filter((l) => l.at >= start && l.at < end);
};

export interface ShotLayout {
  /** the recording's box on the frame, px (take shots) */
  box?: { left: number; top: number; w: number; h: number; k: number };
  /** each line's top, px, by its id */
  lineTop: Record<string, number>;
  /** each line's rows (a long line wrapped to the frame's safe width), by its id */
  rows: Record<string, string[]>;
  /** a row's height, px, by the line's id */
  rowH: Record<string, number>;
}

/**
 * Where a shot's recording and its lines sit on a W × H frame: the recording (its crop, or the whole screen) as large
 * as fits inside the safe margin, above a band that holds the shot's lines in their slots; a typographic beat's lines
 * centred as one block. `size` is type/scale.ts typeSizePx (passed in so this stays free of the type module's CSS).
 */
export function shotLayout(p: ActPlan, index: number, W: number, H: number, safe: number, m: TypeMeasure): ShotLayout {
  const shot = p.shots[index]!;
  const lines = linesOfShot(p, index);
  const rows: Record<string, string[]> = {};
  const rowH: Record<string, number> = {};
  for (const l of lines) {
    rows[l.id] = wrapLine(l, W - 2 * safe, W, H, m);
    rowH[l.id] = rowPx(l, W, H, m.size);
  }
  const slots = [...new Set(lines.map((l) => l.slot ?? 0))].sort((a, b) => a - b);
  const slotH = slots.map((s) => Math.max(...lines.filter((l) => (l.slot ?? 0) === s).map((l) => rowH[l.id]! * rows[l.id]!.length)));
  const bandH = slotH.reduce((n, h) => n + h, 0);
  const gap = lines.length ? 0.035 * H : 0;
  const lineTop: Record<string, number> = {};
  const place = (top0: number) => {
    let y = top0;
    slots.forEach((s, i) => {
      for (const l of lines.filter((x) => (x.slot ?? 0) === s)) lineTop[l.id] = y;
      y += slotH[i]!;
    });
  };
  if (shot.kind === "type") {
    place((H - bandH) / 2);
    return { lineTop, rows, rowH };
  }
  const take = shot.take!;
  const c = shot.crop ?? { x: 0, y: 0, w: take.w, h: take.h };
  const regionW = W - 2 * safe;
  const regionH = H - 2 * safe - bandH - gap;
  const k = Math.min(regionW / c.w, regionH / c.h, shot.maxK ? shot.maxK * (H / 1080) : Infinity);
  const w = c.w * k;
  const h = c.h * k;
  // the box and the band as one block, centred on the frame
  const top = (H - (h + gap + bandH)) / 2;
  place(top + h + gap);
  return { box: { left: (W - w) / 2, top, w, h, k }, lineTop, rows, rowH };
}
