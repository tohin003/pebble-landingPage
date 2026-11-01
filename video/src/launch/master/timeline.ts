// The launch film's master timeline: where each scene sits on the music, and how each seam is carried (TREATMENT
// rulings v1.1 "Seams"; EDIT_PLAN "Worlds by scene"). Pure data and arithmetic: no React, so the scripts and tests can
// read it. Written for music A's landmarks (data/music.ts); if the owner picks B or C, retime IN here.
//
// A seam's window is [at − pre, at + post]. Before `at` the outgoing scene plays live while the incoming one shows its
// first frame (frozen); after `at` the incoming scene plays live while the outgoing one holds its last frame. So every
// scene starts exactly on its music mark and keeps its own beats; the transition only borrows frozen frames.
import type { Rect } from "../layout";

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
export const FILM_FPS = 60;

export const TIMELINE: readonly Slot[] = [
  { id: "S00-ColdOpen", in: 0, out: 8.051, worldIn: "night", worldOut: "night", note: "the drop at 8.051" },
  { id: "S01-Title", in: 8.051, out: 12.551, worldIn: "night", worldOut: "night", note: "ends on a full sage fill" },
  { id: "S02-OnYourMac", in: 12.551, out: 20.051, worldIn: "desktop", worldOut: "desktop", note: "opens on a sage-dominant crop" },
  { id: "S03-UsesYourMac", in: 20.051, out: 32.051, worldIn: "desktop", worldOut: "desktop", note: "the burst; the phrase lift at 24.051" },
  { id: "S04-AgentGuard", in: 32.051, out: 40.051, worldIn: "daylight", worldOut: "daylight", note: "the card carries in from S03" },
  { id: "S05-Workshop", in: 40.051, out: 48.051, worldIn: "daylight", worldOut: "daylight", note: "phrase start 40.051" },
  { id: "S06-Memory", in: 48.051, out: 56.051, worldIn: "daylight", worldOut: "daylight", note: "" },
  { id: "S07-ContextWarping", in: 56.051, out: 63.051, worldIn: "daylight", worldOut: "daylight", note: "its title on the 56.051 phrase" },
  { id: "S08-Remote", in: 63.051, out: 72.051, worldIn: "night", worldOut: "night", note: "the light drains in from S07" },
  { id: "S09-Stealth", in: 72.051, out: 79.551, worldIn: "desktop", worldOut: "night", note: "the breath: groove thins 72.05, stops 73.07" },
  { id: "S10-Benchmarks", in: 79.551, out: 93.055, worldIn: "night", worldOut: "daylight", note: "first chart slams on 81.051" },
  { id: "S11-Outro", in: 93.055, out: 100.0, worldIn: "night", worldOut: "night", note: "lines on 93.055 and 93.303; lockup 95.055; rest 97.055" },
];

export type SeamKind = "cut" | "in-scene" | "whip" | "scaleThrough" | "softWipe";
export type Direction = "left" | "right" | "up" | "down";

export interface Seam {
  /** the outgoing scene's id; the incoming one is the next slot */
  from: string;
  kind: SeamKind;
  /** seconds before and after the cut point (the boundary between the two slots) */
  pre: number;
  post: number;
  direction?: Direction;
  /** scaleThrough: the outgoing scene's element that becomes the next scene, as a function of the frame size */
  rect?: (W: number, H: number) => Rect;
  /** the whoosh that carries it (null: none) */
  whoosh: "short" | "medium" | null;
  why: string;
}

/** S03's last frame: its window shrunk to a centred card, 60 % of the width at 1.6:1 (scenes/b/kit.ts seamCard). */
const s03Card = (W: number, H: number): Rect => {
  const w = W * 0.6;
  const h = w / 1.6;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
};
/** A centred block (S06's last capture → S07's first block). */
const centreBlock = (W: number, H: number): Rect =>
  W > H ? { x: W * 0.3, y: H * 0.25, w: W * 0.4, h: H * 0.5 } : { x: W * 0.12, y: H * 0.3, w: W * 0.76, h: H * 0.4 };

export const SEAMS: readonly Seam[] = [
  { from: "S00-ColdOpen", kind: "cut", pre: 0, post: 0, whoosh: null, why: "the drop: a hard cut on 8.051 (S00 darkens its last 3 frames; night to night)" },
  { from: "S01-Title", kind: "cut", pre: 0, post: 0, whoosh: null, why: "match cut: S01 ends on a full sage fill, S02 opens on a sage-dominant crop of the pebble" },
  { from: "S02-OnYourMac", kind: "in-scene", pre: 0, post: 0, whoosh: "short", why: "the whip is split across the scenes: S02 plays its out half, S03 its in half; desktop to desktop" },
  {
    from: "S03-UsesYourMac",
    kind: "scaleThrough",
    pre: 0.25,
    post: 0.25,
    rect: s03Card,
    whoosh: "medium",
    why: "desktop to daylight: S03's last window becomes the card S04 opens on; the ground changes behind it",
  },
  { from: "S04-AgentGuard", kind: "whip", pre: 0.15, post: 0.15, direction: "up", whoosh: "short", why: "daylight to daylight on the 40.051 phrase" },
  { from: "S05-Workshop", kind: "whip", pre: 0.15, post: 0.15, direction: "left", whoosh: "short", why: "daylight to daylight on the 48.051 downbeat" },
  {
    from: "S06-Memory",
    kind: "scaleThrough",
    pre: 0.25,
    post: 0.25,
    rect: centreBlock,
    whoosh: "medium",
    why: "daylight to daylight: the memory block becomes the context column",
  },
  { from: "S07-ContextWarping", kind: "softWipe", pre: 0.25, post: 0.25, direction: "down", whoosh: null, why: "daylight to night: the light drains from the top (a wipe, never a cut); no whoosh: S08's phone rises on its own 0.45 s later" },
  { from: "S08-Remote", kind: "softWipe", pre: 0.25, post: 0.25, direction: "left", whoosh: null, why: "night to desktop on the breath: no whoosh, the music thins" },
  { from: "S09-Stealth", kind: "cut", pre: 0, post: 0, whoosh: null, why: "the Veil's night to the question's night: the frames match, a straight cut" },
  {
    from: "S10-Benchmarks",
    kind: "softWipe",
    pre: 0.5,
    post: 0,
    direction: "up",
    whoosh: "medium",
    why: "daylight to night: the light drains before the drum hit, so S11's first line lands clean on 93.055",
  },
];

/** The seam at the end of slot i (undefined for the last). */
export const seamAfter = (i: number): Seam | undefined => SEAMS[i];
/** The seam at the start of slot i (undefined for the first). */
export const seamBefore = (i: number): Seam | undefined => (i > 0 ? SEAMS[i - 1] : undefined);

/** Seconds → frames on the master (rounded: every boundary lands on a whole frame). */
export const fr = (sec: number, fps = FILM_FPS) => Math.round(sec * fps);

/** Checks the plan's invariants; returns the problems (empty = fine). Run by master/check.ts. */
export const checkTimeline = (): string[] => {
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
      if (worlds.has("night") && worlds.has("daylight") && (seam.kind === "cut" || seam.kind === "in-scene")) out.push(`${s.id} → ${next.id}: a cut between night and daylight`);
      const len = seam.pre + seam.post;
      if (seam.kind !== "cut" && seam.kind !== "in-scene" && (len < 0.2 - 1e-9 || len > 0.5 + 1e-9)) out.push(`${s.id}: seam ${len.toFixed(2)} s, outside 0.2–0.5`);
      if (seam.pre > s.out - s.in || seam.post > next.out - next.in) out.push(`${s.id}: the seam is longer than a scene`);
    }
  });
  if (Math.abs(TIMELINE[TIMELINE.length - 1].out - FILM_S) > 1e-9) out.push("the last scene doesn't end at the film's end");
  const kinds = new Set(SEAMS.filter((x) => x.kind !== "cut").map((x) => x.kind));
  if (kinds.size + (SEAMS.some((x) => x.kind === "cut") ? 1 : 0) < 3) out.push("fewer than 3 seam kinds");
  const cuts = SEAMS.filter((x) => x.kind === "cut").length;
  if (cuts > Math.ceil(SEAMS.length / 3)) out.push(`${cuts} hard cuts of ${SEAMS.length} seams (at most a third)`);
  return out;
};
