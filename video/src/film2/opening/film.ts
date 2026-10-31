// The whole film ("Ripples", Pebble 2.0.0's launch film) on the score's frames: the opening's four acts (Act I, Rings
// 1–3), the set-pieces reel's pieces (the Drop, Ring 4 with Cascade 4, the Dusk, the climax, the Return with the title
// and the end card) and the post-credit scene, end to end, under the score's master (.work/score2/master/main.web.wav,
// 8802 frames: the main film to 8334, the coda's room tone to 8802).
//
// Each reel piece is placed so its anchor lands on the score's frame (BEAT_SHEET revision 3) and is cut at the score's
// block lines. The reel's pieces were fitted to audition stretches (setpieces/demo/grids.ts), so three of them don't fill
// their blocks exactly; FILM_TRIMS names what that costs, for the set-pieces and edit lanes:
//   the Dusk  ⌘K on 4982 (bar 62); it runs 1080 frames against the quiet passage's 892, so its last 188 (the menu bar's
//             hold and the honest line's exit) are cut by the climax on 5874;
//   the climax  its kept card on 6114 (B2's lift); its first 60 frames (S23's lead-in, before "Its own tools." has
//             landed) are under the Dusk, and its last 120 (the hold's glide) under the Return's pull-back on 6534;
//   the end card  the Return's title lands on 7314 (R720) and its end card on 7554, but its plan ends on 8307, 27 frames
//             before the score's true ending (8334): its last frame is held for those 27 (a still page, room tone).
// The X version is the same to the coda's first frame (8334), with a short fade of the room tone (MASTER_NOTES).
// Pure; no React.
import type { Aspect } from "../tokens";
import type { ScenePlan } from "../setpieces/scene";
import { demoPlans } from "../setpieces/demo/plans";
import { RS9_CREDIT } from "../setpieces/rs9Beat";
import { ACT_ONE } from "./actOne";
import { RING_ONE } from "./ringOne";
import { RING_TWO } from "./ringTwo";
import { RING_THREE } from "./ringThree";
import { actFrames, type ActPlan } from "./kit";

export const ACTS: readonly ActPlan[] = [ACT_ONE, RING_ONE, RING_TWO, RING_THREE];

/** The score's frames the film is held to (BEAT_SHEET.json revision 3; CUE_SHEET §5). */
export const SCORE = {
  drop: 1200,
  ring1: 1680,
  ring3: 3240,
  ring4: 4053,
  cmdK: 4982,
  climax: 5874,
  kept: 6114,
  pullBack: 6534,
  title: 7314,
  endCard: 7554,
  trueEnd: 8334,
  codaEnd: 8802,
} as const;

/** The score's master for each aspect (social for the square and the vertical cuts), under video/public. */
export const MASTER_AUDIO: Record<Aspect, string> = {
  "16:9": "audio/score2/main.web.wav",
  "1:1": "audio/score2/main.social.wav",
  "9:16": "audio/score2/main.social.wav",
};
/** The X cut's fade of the room tone at its end, frames. */
export const X_FADE = 18;

export type FilmSegment =
  | { kind: "act"; id: string; act: ActPlan; at: number; frames: number }
  /** a reel piece's local frames [from, to) on film frames [at, at + to − from) */
  | { kind: "piece"; id: string; plan: ScenePlan; at: number; from: number; to: number; frames: number }
  /** a piece's frame `frame` held still for `frames` */
  | { kind: "hold"; id: string; plan: ScenePlan; at: number; frame: number; frames: number };

const piece = (a: Aspect, id: string): ScenePlan => {
  const e = demoPlans(a).find((x) => x.plan.id === id);
  if (!e) throw new Error(`the reel has no piece "${id}"`);
  return e.plan;
};

/** Each reel piece's anchor, local frames (where its plan puts the event the score places). */
const anchorOf = (p: ScenePlan, event: RegExp): number => {
  const m = p.music.find((x) => event.test(x.event));
  if (!m) throw new Error(`${p.id}: no music event ${event}`);
  return m.frame;
};

/** The film's segments in one aspect, in order. */
export function filmSegments(a: Aspect): FilmSegment[] {
  const out: FilmSegment[] = [];
  const act = (p: ActPlan) => out.push({ kind: "act", id: p.id, act: p, at: p.start, frames: actFrames(p) });
  const put = (id: string, at: number, from: number, to: number) => {
    const plan = piece(a, id);
    out.push({ kind: "piece", id, plan, at, from, to, frames: to - from });
  };
  act(ACT_ONE);
  const drop = piece(a, "drop");
  const hit = drop.hits[0]!;
  put("drop", SCORE.drop - hit, 0, SCORE.ring1 - (SCORE.drop - hit));
  act(RING_ONE);
  act(RING_TWO);
  act(RING_THREE);
  const ring = piece(a, "ring4");
  put("ring4", SCORE.ring4, 0, Math.min(ring.duration, SCORE.cmdK - SCORE.ring4));
  put("dusk", SCORE.cmdK, 0, SCORE.climax - SCORE.cmdK);
  const climax = piece(a, "climax");
  const peak = anchorOf(climax, /kept card lands/);
  const c0 = SCORE.climax - (SCORE.kept - peak);
  put("climax", SCORE.climax, c0, c0 + (SCORE.pullBack - SCORE.climax));
  const ret = piece(a, "return");
  put("return", SCORE.pullBack, 0, ret.duration);
  const after = SCORE.pullBack + ret.duration;
  if (after < SCORE.trueEnd) out.push({ kind: "hold", id: "end-card-hold", plan: ret, at: after, frame: ret.duration - 1, frames: SCORE.trueEnd - after });
  const coda = piece(a, "coda");
  put("coda", SCORE.trueEnd, 0, coda.duration);
  return out;
}

export const filmFrames = (segs: readonly FilmSegment[]): number => segs.reduce((n, s) => n + s.frames, 0);

/** The X version: the main film to the coda's first frame. */
export const xSegments = (a: Aspect): FilmSegment[] => filmSegments(a).filter((s) => s.at < SCORE.trueEnd);

/** The pieces' trims against their own plans (the report's FILM_TRIMS), frames. */
export function filmTrims(a: Aspect): { id: string; head: number; tail: number; held: number }[] {
  return filmSegments(a)
    .filter((s) => s.kind !== "act")
    .map((s) => (s.kind === "hold" ? { id: s.id, head: 0, tail: 0, held: s.frames } : s.kind === "piece" ? { id: s.id, head: s.from, tail: s.plan.duration - s.to, held: 0 } : { id: "", head: 0, tail: 0, held: 0 }));
}

/** The film's own rules: end to end on the score's frames, every anchor on its mark, the credits' RS-9 line. */
export function checkFilm(a: Aspect): string[] {
  const out: string[] = [];
  const segs = filmSegments(a);
  let at = 0;
  for (const s of segs) {
    if (s.at !== at) out.push(`${s.id}: starts on ${s.at}, the previous segment ends on ${at}`);
    if (s.frames <= 0) out.push(`${s.id}: no frames`);
    if (s.kind === "piece" && (s.from < 0 || s.to > s.plan.duration)) out.push(`${s.id}: local ${s.from}–${s.to} outside its plan (${s.plan.duration})`);
    at = s.at + s.frames;
  }
  if (at !== SCORE.codaEnd) out.push(`the film runs ${at} frames, the score ${SCORE.codaEnd}`);
  const seg = (id: string) => segs.find((s) => s.id === id) as Extract<FilmSegment, { kind: "piece" }>;
  const film = (id: string, local: number) => seg(id).at + (local - seg(id).from);
  if (film("drop", seg("drop").plan.hits[0]!) !== SCORE.drop) out.push("the Drop's hit is off the score's 1200");
  if (seg("ring4").at !== SCORE.ring4) out.push("Ring 4 is off 4053");
  if (seg("dusk").at !== SCORE.cmdK) out.push("⌘K is off 4982");
  if (film("climax", anchorOf(seg("climax").plan, /kept card lands/)) !== SCORE.kept) out.push("the kept card is off 6114");
  if (film("return", anchorOf(seg("return").plan, /title's downbeat/)) !== SCORE.title) out.push("the title is off 7314");
  if (film("return", anchorOf(seg("return").plan, /facts land/)) !== SCORE.endCard) out.push("the end card is off 7554");
  if (seg("coda").at !== SCORE.trueEnd) out.push("the coda is off the end card's true ending, 8334");
  if (filmFrames(xSegments(a)) !== SCORE.trueEnd) out.push("the X cut doesn't end on the coda's first frame");
  const ret = seg("return").plan;
  const credits = JSON.stringify(ret.types.map((t) => t.text)) + JSON.stringify(ret.extra ?? {});
  if (!credits.includes(RS9_CREDIT)) out.push("the end credits don't carry RS-9's line");
  return out;
}

const EDGE = 2;

/** The master's gain on film frame `f`: 0 inside the acts' mutes (ramped over EDGE frames), and the X cut's fade. */
export function masterGain(segs: readonly FilmSegment[], f: number, xEnd?: number): number {
  let g = 1;
  for (const s of segs) {
    if (s.kind !== "act") continue;
    for (const [a, b] of s.act.mutes) {
      const A = s.at + a;
      const B = s.at + b;
      if (f >= A - EDGE && f < B) g = Math.min(g, f < A ? (A - f) / EDGE : 0);
      else if (f >= B && f < B + EDGE) g = Math.min(g, (f - B + 1) / (EDGE + 1));
    }
  }
  if (xEnd !== undefined && f >= xEnd - X_FADE) g = Math.min(g, Math.max(0, (xEnd - 1 - f) / X_FADE));
  return g;
}
