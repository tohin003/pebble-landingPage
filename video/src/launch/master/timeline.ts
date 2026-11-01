// The launch film's master timeline: where each scene sits on the music, and how each seam is carried (TREATMENT
// rulings v1.1 "Seams"; the director's FIXES-1 after REVIEW-1). Pure data and arithmetic: no React, so the scripts and
// tests can read it. Written for music A's landmarks (data/music.ts, locked by the owner); every seam is on a beat.
//
// The acts run 6.5 to 11 s (no 8-s grid). A seam's window is [at − pre, at + post]. Before `at` the outgoing scene
// plays live while the incoming one shows its first frame (frozen); after `at` the incoming scene plays live while the
// outgoing one holds its last frame. So every scene starts exactly on its music mark and keeps its own beats; the
// transition only borrows frozen frames. No seam dissolves one world into another, and none leaves type over type.
import type { Rect } from "../layout";
import { S03_LAST_WINDOW } from "../scenes/b/S03UsesYourMac";
import { S10_PEBBLE_OUT } from "../scenes/d/S10Benchmarks";

export type World = "night" | "desktop" | "daylight";

export interface Slot {
  id: string;
  /** seconds on the master */
  in: number;
  out: number;
  /** the world at the scene's start and end (EDIT_PLAN "Worlds by scene"), used to check the seams */
  worldIn: World;
  worldOut: World;
  note: string;
}

export const FILM_S = 100.0;
/** The owner's ruling (1 Nov 2026): the delivered films are 30 fps (about half the render time of 60 on this Mac). */
export const FILM_FPS = 30;

/**
 * FIXES-1's timeline (the director, 1 Nov ~21:45), with FIXES-2's change (2 Nov ~01:45, REVIEW-2 S-3): S09 ends 0.45 s
 * earlier and S10 starts there, at 79.101, so "So. How did it do?" reads about 1.8 s before the payoff. Music A
 * unchanged; every seam on a beat except that one (the director's ruling: S10 carries it itself, out of the pebble).
 */
export const TIMELINE: readonly Slot[] = [
  { id: "S00-ColdOpen", in: 0, out: 8.051, worldIn: "night", worldOut: "night", note: "the premise by 2.7 s; the drop at 8.051" },
  { id: "S01-Title", in: 8.051, out: 13.551, worldIn: "night", worldOut: "night", note: "the lockup on the drop frame; the tagline held 3.8 s" },
  { id: "S02-OnYourMac", in: 13.551, out: 20.051, worldIn: "desktop", worldOut: "desktop", note: "opens on the real pebble, sharp" },
  { id: "S03-UsesYourMac", in: 20.051, out: 31.051, worldIn: "desktop", worldOut: "desktop", note: "the burst: hard cuts on the bars" },
  { id: "S04-AgentGuard", in: 31.051, out: 40.051, worldIn: "daylight", worldOut: "daylight", note: "three states" },
  { id: "S05-Workshop", in: 40.051, out: 47.551, worldIn: "daylight", worldOut: "daylight", note: "phrase start 40.051" },
  { id: "S06-Memory", in: 47.551, out: 54.551, worldIn: "daylight", worldOut: "daylight", note: "" },
  { id: "S07-ContextWarping", in: 54.551, out: 61.551, worldIn: "daylight", worldOut: "daylight", note: "" },
  { id: "S08-Remote", in: 61.551, out: 70.051, worldIn: "night", worldOut: "night", note: "" },
  { id: "S09-Stealth", in: 70.051, out: 79.101, worldIn: "desktop", worldOut: "night", note: "the breath: the groove thins 72.05, stops 73.07; the honest line about 71.4 to S09's last 2 frames" },
  { id: "S10-Benchmarks", in: 79.101, out: 93.055, worldIn: "night", worldOut: "daylight", note: "opens on S09's dusk; the question whole from about 79.25; the stop 80.35–81.0; the first chart and the impact on 81.051 (S10's 1.95 s)" },
  { id: "S11-Outro", in: 93.055, out: 100.0, worldIn: "night", worldOut: "night", note: "the thesis on the drum hits; the lockup about 2.75 s in" },
];

/**
 * How a seam is carried:
 * - cut: a hard cut on the beat (the frames either side are the scenes' own);
 * - dipCut: a hard cut on the beat whose outgoing frames dip about 40 % darker over its last 3 frames (`pre`: 4), so it
 *   reads as meant (the craft's dip cut; REVIEW-2 M-3: no whip, no blur samples, no layer edge);
 * - in-scene: the scenes carry it themselves (S02's whip out, S03's whip in): a cut on the master;
 * - whip: both pictures travel together with a directional blur (0.2–0.3 s);
 * - zoomThrough: the outgoing scene's last window scales up through the frame, the incoming scene's first window comes
 *   out of the frame and settles, so the new ground comes in behind it (the content swaps at full scale, under blur);
 * - softWipe: the new world sweeps in behind a moving edge (narrow: a wipe, never a dissolve);
 * - pebbleWipe: the new ground opens out of the pebble, which the scenes draw at the same place on both sides.
 */
export type SeamKind = "cut" | "dipCut" | "in-scene" | "whip" | "zoomThrough" | "softWipe" | "pebbleWipe";
export type Direction = "left" | "right" | "up" | "down";

/** A rect as fractions of the frame (x, w of the width; y, h of the height), so one value serves 16:9 and 4:5. */
export interface FracRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** A rect per aspect, as fractions of the frame. */
export type AspectRects = Record<"16x9" | "4x5", FracRect>;

export interface Seam {
  /** the outgoing scene's id; the incoming one is the next slot */
  from: string;
  kind: SeamKind;
  /** seconds before and after the cut point (the boundary between the two slots) */
  pre: number;
  post: number;
  direction?: Direction;
  /** zoomThrough: the outgoing scene's last window and the incoming scene's first window */
  outRect?: AspectRects;
  inRect?: AspectRects;
  /** zoomThrough: how far past covering the frame each window goes (default 1.35 out, 1.25 in) */
  over?: { out: number; in: number };
  /** softWipe: the edge's width as a fraction of the frame (narrow: 0.08–0.15) */
  feather?: number;
  /** pebbleWipe: the pebble's body centre (fractions of the frame) and its body height (a fraction of the frame's height) */
  pebble?: { x: number; y: number; h: number };
  /** the whoosh that carries it (null: none) */
  whoosh: "short" | "medium" | null;
  /** a seam deliberately off the beat grid: why (the beat check skips it) */
  offBeat?: string;
  why: string;
}

/** Fractions → px. */
export const toPx = (r: FracRect, W: number, H: number): Rect => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H });
/** The rect for this frame (16:9 when wider than tall). */
export const rectFor = (rs: AspectRects, W: number, H: number): Rect => toPx(W >= H ? rs["16x9"] : rs["4x5"], W, H);

/**
 * The zoom-through's windows: S03's last window (its builder's export: the RS4-07 card the scene ends on) and S04's
 * first (FIX1-C's values, which S04 draws its frame 0 to: on 4:5 the window fills the frame's lower half).
 */
const S03_LAST: AspectRects = S03_LAST_WINDOW;
const S04_FIRST: AspectRects = {
  "16x9": { x: 0.1458, y: 0.2944, w: 0.7083, h: 0.6044 },
  "4x5": { x: 0.037, y: 0.2963, w: 0.9259, h: 0.5926 },
};
/** The whole frame: a zoom-through on it is a camera punch through the ground itself. */
const FULL: AspectRects = { "16x9": { x: 0, y: 0, w: 1, h: 1 }, "4x5": { x: 0, y: 0, w: 1, h: 1 } };

export const SEAMS: readonly Seam[] = [
  { from: "S00-ColdOpen", kind: "cut", pre: 0, post: 0, whoosh: null, why: "the drop: a hard cut on 8.051 with the lockup on the drop frame (night to night)" },
  {
    from: "S01-Title",
    kind: "cut",
    pre: 0,
    post: 0,
    whoosh: null,
    why: "a plain match cut on 13.551 (REVIEW-2 S-8, no sage flash): S01's push ends with its pebble's body at the frame's centre, about 208 px wide, as S02's frame 0 shows its take pebble; the world changes under a pebble that doesn't move",
  },
  {
    from: "S02-OnYourMac",
    kind: "in-scene",
    pre: 0,
    post: 0,
    whoosh: "short",
    why: "the whip is split across the scenes on the bar (S02 plays its out half, S03 its in half); it never lands on black and S03's headline enters blurred from it",
  },
  {
    from: "S03-UsesYourMac",
    kind: "zoomThrough",
    pre: 0.2,
    post: 0.42,
    outRect: S03_LAST,
    inRect: S04_FIRST,
    whoosh: "medium",
    why: "desktop to daylight, carried by the window: S03's last window scales up through the frame, the content swaps at full scale under the blur, and S04's first window settles out of it while the stone ground comes in behind over 12 frames",
  },
  {
    from: "S04-AgentGuard",
    kind: "dipCut",
    // 4 frames at 30 fps: the first is the scene's own, the last 3 dip
    pre: 0.133,
    post: 0,
    whoosh: null,
    why: "daylight to daylight on the 40.051 phrase: a hard cut, S04's last 3 frames dipped about 40 % (REVIEW-2 M-3: the whip drew blur samples and a stone layer's edge); the music's phrase hit carries it",
  },
  {
    from: "S05-Workshop",
    kind: "zoomThrough",
    pre: 0.2,
    post: 0.33,
    outRect: FULL,
    inRect: FULL,
    over: { out: 1.22, in: 1.14 },
    whoosh: "short",
    why: "daylight to daylight, carried by the camera: a punch through the stone ground (S05's type has left before it), the swap under the blur, Memory settling out of it",
  },
  { from: "S06-Memory", kind: "cut", pre: 0, post: 0, whoosh: null, why: "a cut on the 54.551 beat: daylight to daylight, no dissolve" },
  {
    from: "S07-ContextWarping",
    kind: "softWipe",
    pre: 0.5,
    post: 0,
    direction: "down",
    feather: 0.12,
    whoosh: null,
    why: "daylight to night: the light drains from the top behind a narrow edge (a wipe, never a dissolve), over S08's first frame, so S08's type only arrives after it",
  },
  { from: "S08-Remote", kind: "cut", pre: 0, post: 0, whoosh: null, why: "a hard cut on the 70.051 bar: night to the desktop's palette" },
  {
    from: "S09-Stealth",
    kind: "in-scene",
    pre: 0,
    post: 0,
    whoosh: null,
    offBeat: "FIXES-2 (S-3): 0.45 s earlier than the 79.551 beat, taken from the Veil-only stretch, so the question reads about 1.8 s; S10 opens on S09's last frame and the cut is invisible",
    why: "dusk to daylight, carried in S10 itself: S10 opens on S09's last frame (the Veil pebble at the frame's centre, 12 % of its height); at once the daylight opens in a pebble-shaped blob centred on the question's line, and the pebble sheds the Veil inside it",
  },
  {
    from: "S10-Benchmarks",
    kind: "pebbleWipe",
    pre: 0.5,
    post: 0,
    pebble: S10_PEBBLE_OUT,
    whoosh: null,
    why: "daylight to night, the pebble the anchor: night opens out of the pebble's outline (its colours change only where the wipe has passed) and has filled the frame by the drum hit at 93.055, where S11's thesis lands",
  },
];

/** The seam at the end of slot i (undefined for the last). */
export const seamAfter = (i: number): Seam | undefined => SEAMS[i];
/** The seam at the start of slot i (undefined for the first). */
export const seamBefore = (i: number): Seam | undefined => (i > 0 ? SEAMS[i - 1] : undefined);
/** A seam the master carries with a layer (cuts and in-scene seams are plain cuts here). */
export const isCarried = (s: Seam) => s.kind !== "cut" && s.kind !== "in-scene";

/** Seconds → frames on the master (rounded: every boundary lands on a whole frame). */
export const fr = (sec: number, fps = FILM_FPS) => Math.round(sec * fps);

/** The longest a carried seam may take, by kind (s). */
const MAX_LEN: Partial<Record<SeamKind, number>> = { whip: 0.3, zoomThrough: 0.7, softWipe: 0.8, pebbleWipe: 0.8, dipCut: 0.15 };
/** the shortest, by kind (default 0.2 s) */
const MIN_LEN: Partial<Record<SeamKind, number>> = { dipCut: 0.08 };

/** Checks the plan's invariants; returns the problems (empty = fine). Run by master/check.ts. */
export const checkTimeline = (beats: readonly number[] = []): string[] => {
  const out: string[] = [];
  if (SEAMS.length !== TIMELINE.length - 1) out.push(`seams: ${SEAMS.length}, expected ${TIMELINE.length - 1}`);
  TIMELINE.forEach((s, i) => {
    if (i === 0 && s.in !== 0) out.push(`${s.id} starts at ${s.in}`);
    if (i > 0 && Math.abs(s.in - TIMELINE[i - 1].out) > 1e-9) out.push(`${s.id} doesn't start where ${TIMELINE[i - 1].id} ends`);
    if (s.out <= s.in) out.push(`${s.id} is empty`);
    const seam = SEAMS[i];
    if (seam && seam.from !== s.id) out.push(`seam ${i} is from ${seam.from}, not ${s.id}`);
    if (seam) {
      const next = TIMELINE[i + 1];
      const worlds = new Set([s.worldOut, next.worldIn]);
      if (worlds.has("night") && worlds.has("daylight") && !["softWipe", "pebbleWipe", "zoomThrough"].includes(seam.kind))
        out.push(`${s.id} → ${next.id}: night to daylight needs a wipe or a carried object, not a ${seam.kind}`);
      const len = seam.pre + seam.post;
      const max = MAX_LEN[seam.kind];
      if (isCarried(seam) && (len < (MIN_LEN[seam.kind] ?? 0.2) - 1e-9 || (max !== undefined && len > max + 1e-9))) out.push(`${s.id}: a ${seam.kind} of ${len.toFixed(2)} s`);
      if (seam.kind === "dipCut" && seam.post !== 0) out.push(`${s.id}: a dip cut darkens the outgoing frames only (post must be 0)`);
      if (seam.pre > s.out - s.in || seam.post > next.out - next.in) out.push(`${s.id}: the seam is longer than a scene`);
      if (seam.kind === "zoomThrough" && (!seam.outRect || !seam.inRect)) out.push(`${s.id}: a zoom-through without its windows`);
      if (seam.kind === "pebbleWipe" && !seam.pebble) out.push(`${s.id}: a pebble wipe without the pebble`);
      if (beats.length && !seam.offBeat && !beats.some((b) => Math.abs(b - s.out) < 0.01)) out.push(`${s.id} → ${next.id}: the seam at ${s.out} is not on a beat`);
    }
  });
  if (Math.abs(TIMELINE[TIMELINE.length - 1].out - FILM_S) > 1e-9) out.push("the last scene doesn't end at the film's end");
  const kinds = new Set(SEAMS.map((x) => (x.kind === "in-scene" ? "whip" : x.kind)));
  if (kinds.size < 3) out.push("fewer than 3 seam kinds");
  const cuts = SEAMS.filter((x) => x.kind === "cut").length;
  if (cuts > Math.ceil(SEAMS.length / 3)) out.push(`${cuts} hard cuts of ${SEAMS.length} seams (at most a third)`);
  const lens = TIMELINE.slice(2, -2).map((s) => +(s.out - s.in).toFixed(2));
  if (new Set(lens).size < 4) out.push(`the middle acts run to a grid (${lens.join(", ")} s)`);
  return out;
};
