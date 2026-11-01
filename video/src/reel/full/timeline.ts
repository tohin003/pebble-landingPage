// The full reel's edit (the locked 50.1-s score, 3006 frames at 60 fps, and the last card past it), built from the
// score's beat map. Pure; no React.
//
// Every segment starts on a beat of the map; check.ts proves it. Round 3 (the person, 1 Nov 12:03 and 12:05; the lead):
//   0–270     the title on Starfire's pad: "Introducing Pebble 2.0" on the first hit, "A better companion / with
//             superior agentic capabilities." on the next beats
//   270–540   the hook: Vanguard's drums bring in the real quick chat (RS15-01), the question typed and echoed huge, a
//             cut closer on the suck-back (378), the send on the pickup (486), the dive into the pebble's eye; a breath
//   540       THE DROP: the pebble's burst, the pebble alone (its name waits for the logo)
//   621–2160  the montage, Vanguard's driving 133.33 BPM: quick flashes over real screens (Spaces, apps, app actions,
//             browser actions) around the tech features' heroes (7 beats each); the step-up at 1296 lands on a hero
//   2160–2268 true silence: the pebble alone, its aura drawing in, no words
//   2268      THE SLAM: Stealth Lockdown, its honest line on screen from here to the score's end
//   2430–2592 the features fly into the pebble
//   2592      THE LOGO: the lockup and its tagline, through the tease (D157)
//   2961      the last card, on the score's fade: the lockup, "Open source under Apache 2.0.", the GitHub address
import { type BeatMap, beatPeriod } from "../beats";
import type { CropId } from "../takes";
import { ramp, warp, type Warp } from "../warp";

export type HeroId = "agentguard" | "workshop" | "visual" | "longtasks" | "remote" | "stealth";
export type Tint = "sage" | "clay" | "deep";

export interface Flash {
  kind: "flash";
  id: string;
  from: number;
  to: number;
  /** the feature's line (≤ 3 words for a flash: 0.4 s a word) and its CLAIMS source */
  line: string;
  claim: string;
  /** the real screens, each with its own shot window and source warp */
  shots: { crop: CropId; from: number; to: number; src: Warp }[];
  /** absolute frames of camera punches (beats inside the flash) */
  punches: number[];
  tint: Tint;
  side: "left" | "right";
}

export interface TypeBeat {
  kind: "type";
  id: "pace" | "memory";
  from: number;
  to: number;
  line: string;
  claim: string;
  tint: Tint;
}

export interface Hero {
  kind: "hero";
  id: HeroId;
  from: number;
  to: number;
  /** the feature's name (the page's or the release's) and its muted second line */
  name: string;
  sub?: string;
  claim: string;
  tint: Tint;
}

export type Segment =
  | { kind: "title"; from: number; to: number; lines: number[] }
  | { kind: "hook"; from: number; to: number; src: Warp; send: number; zoomFrom: number; accents: number[]; pulses: number[] }
  | { kind: "breath"; from: number; to: number }
  | { kind: "reveal"; from: number; to: number; w1: number; w2: number }
  | Flash
  | TypeBeat
  | Hero
  | { kind: "silence"; from: number; to: number }
  | { kind: "merge"; from: number; to: number; pulls: number[] }
  | { kind: "logo"; from: number; to: number }
  | { kind: "tease"; from: number; to: number; lines: number[] }
  | { kind: "card"; from: number; to: number };

export interface FullPlan {
  map: BeatMap;
  B: number;
  length: number;
  drop: number;
  stepUp: number;
  slam: number;
  logo: number;
  segments: Segment[];
  /** Stealth Lockdown's honest line: on screen from `from` to the end */
  honest: { from: number; to: number };
  /** the score's last frame (the last card runs on past it) */
  scoreEnd: number;
  /** every frame the edit cuts or hits on, for the check */
  cuts: number[];
}

/** Visual answers' on-screen name, one swappable string (the lead may switch it to the README's "Interactive views"). */
export const VISUAL_NAME = "Visual\nanswers.";

/** The required line, word for word (CLAUDE.md; src/content/neverWords.ts). */
export const STEALTH_HONEST =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

/** The opening (the person, 1 Nov 12:05: "introducing Pebble 2.0- a better companion with superior agentic
 * capabilities"): two lines, the break replacing the comma. Narrow frames wrap the second line once more, never leaving a
 * word alone. */
export const TITLE = {
  intro: "Introducing",
  name: "Pebble 2.0",
  line: ["A better companion", "with superior agentic capabilities."],
  lineNarrow: ["A better companion", "with superior", "agentic capabilities."],
} as const;

/** The tease (D157; the person's words, as in the first cut's coda), one line per hit. */
export const TEASE_LINES = ["Pebble rests.", "Soon, it may learn while it does.", "Not built yet."] as const;

/** The end card (the lead, 03:35; B5) and the last card (the person, 1 Nov 12:03: "just write pebble 2.0 open sourced
 * with apace 2.0 and show the github link"). The credits are in the descriptions (.work/reel/full/DESCRIPTION.txt). */
export const END_CARD = {
  // the lead's "Pebble 2.0 · Free and open source · for Mac", set without middle dots (PHILOSOPHY): the name is the
  // lockup, the rest one plain line
  tagline: "Free and open source, for Mac.",
  licence: "Open source under Apache 2.0.",
  repo: "github.com/tohin003/Pebble",
} as const;

/** The real screens that fly into the pebble before the logo: dark crops only (bright ones flickered: round 1's scan). */
export const CONVERGE: readonly CropId[] = ["calculator", "keepAsk", "browserCard", "calCard", "stealthPalette", "reply", "calendar", "modelRow", "calculator", "keepAsk", "browserCard", "calCard", "reply"];
export const CONVERGE_SRC: Partial<Record<CropId, number>> = { calculator: 3420, keepAsk: 5500, browserCard: 2880, calCard: 2880, stealthPalette: 420, reply: 1000, calendar: 6250, modelRow: 960 };

const hit = (m: BeatMap, name: RegExp, fallback: number) => Math.round(m.hits.find((h) => name.test(h.kind))?.frame ?? fallback);

export function buildFullPlan(map: BeatMap): FullPlan {
  const B = beatPeriod(map);
  const beat = (f: number) => Math.round(map.beats.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a), map.beats[0]));
  const drop = hit(map, /drop/i, 540);
  const stepUp = hit(map, /splice|lift|step/i, 1296);
  const stops = hit(map, /stops|silence/i, 2160);
  const slam = hit(map, /slam/i, 2268);
  const logo = hit(map, /logo/i, 2592);
  const teaseIn = hit(map, /tease/i, 2781);
  const scoreEnd = map.durationFrames;
  const segs: Segment[] = [];
  const at = (n: number) => Math.round(n * B); // n beats

  // ---- the title on Starfire's pad: the first line on its first hit (readable in the first second, sound off), the
  // second line's two halves on the pad's next beats; held to Vanguard's drums
  const vanguardIn = hit(map, /vanguard_in|build/i, 270);
  const suck = hit(map, /suck/i, 378);
  const send = hit(map, /pickup/i, 486);
  const padBeats = map.beats.filter((b) => b > 0.5 && b < vanguardIn - 0.5).map(Math.round);
  segs.push({ kind: "title", from: 0, to: vanguardIn, lines: [0, padBeats[1] ?? 89, padBeats[2] ?? 134] });

  // ---- the hook: the card on the drums, the question typed (edited for time, about 1.5×), held, sent on the pickup;
  // the dive; the breath
  const breathFrom = drop - 6;
  const hookSrc = warp([
    [vanguardIn, 241],
    [vanguardIn + 170, 495],
    [send, 517],
    [breathFrom, 517],
  ]);
  segs.push({
    kind: "hook",
    from: vanguardIn,
    to: breathFrom,
    src: hookSrc,
    send,
    zoomFrom: Math.round(send + B * 0.5),
    accents: [vanguardIn, suck],
    pulses: map.beats.filter((b) => b >= vanguardIn - 0.5 && b < send - 0.5).map(Math.round),
  });
  segs.push({ kind: "breath", from: breathFrom, to: drop });
  // the drop: the pebble alone (its name waits for the logo: "Pebble 2.0" is said at the title and the logo only)
  segs.push({ kind: "reveal", from: drop, to: drop + at(3), w1: drop + at(1), w2: drop + at(2) });

  // ---- the montage
  let t = drop + at(3);
  let side: "left" | "right" = "right";
  const flip = () => (side = side === "right" ? "left" : "right");
  const flash = (id: string, line: string, claim: string, beats: number, tint: Tint, shots: { crop: CropId; beats: number; srcIn: number; event?: { src: number; beat: number } }[]) => {
    const from = t;
    const to = t + at(beats);
    let s = from;
    const out = shots.map((sh) => {
      const len = at(sh.beats);
      const src = sh.event ? ramp({ srcIn: sh.srcIn, srcEvent: sh.event.src, outEvent: at(sh.event.beat), outEnd: len, landFrames: 6 }) : warp([[0, sh.srcIn], [len, sh.srcIn + len]]);
      const o = { crop: sh.crop, from: s, to: s + len, src };
      s += len;
      return o;
    });
    segs.push({ kind: "flash", id, from, to, line, claim, shots: out, punches: Array.from({ length: beats - 1 }, (_, i) => from + at(i + 1)), tint, side });
    flip();
    t = to;
  };
  const type = (id: TypeBeat["id"], line: string, claim: string, beats: number, tint: Tint) => {
    segs.push({ kind: "type", id, from: t, to: t + at(beats), line, claim, tint });
    t += at(beats);
  };
  const hero = (id: HeroId, name: string, sub: string | undefined, claim: string, tint: Tint, beats = 6) => {
    segs.push({ kind: "hero", id, from: t, to: t + at(beats), name, sub, claim, tint });
    t += at(beats);
  };

  // part 1 (to the step-up, 25 beats): four flashes held to the reading floor, then AgentGuard and the Workshop; the
  // rival beat's time went to the heroes (the lead, round 3)
  // "Every Space.": a hard match cut on its second beat from the poster's Space to Chrome's (the crop stops left of the
  // take's pointer, REVIEW-v2 S12; the companion holds its place across the cut)
  flash("spaces", "Every Space.", "C-REEL-3", 2, "deep", [
    { crop: "spaces", beats: 1, srcIn: 200 },
    { crop: "spaces", beats: 1, srcIn: 300 },
  ]);
  flash("apps", "Apps you allow.", "C-REEL-4", 3, "sage", [{ crop: "calculator", beats: 3, srcIn: 3200, event: { src: 3387, beat: 1 } }]);
  // "App actions.": the action itself (Calendar's card, before "Do it" is pressed on 2908), then the event in Calendar
  flash("actions", "App actions.", "C-REEL-5", 3, "clay", [
    { crop: "calCard", beats: 2, srcIn: 2853 },
    { crop: "calendar", beats: 1, srcIn: 6200 },
  ]);
  // "Browser actions." (the person, 12:03: "just write that pebble handles browser actions and move to next"): RS9B-02's
  // website approval, Allow pressed on its last frames, then Pebble's own tab at work; nothing names the video
  flash("browser", "Browser actions.", "C-REEL-23", 3, "deep", [
    { crop: "browserCard", beats: 2, srcIn: 2857 },
    { crop: "browserWorking", beats: 1, srcIn: 3310 },
  ]);
  hero("agentguard", "AgentGuard.", "Evidence before “done”.", "C-REEL-6", "deep", 7);
  hero("workshop", "Pebble’s\nWorkshop.", undefined, "C-REEL-7", "sage", 7);
  if (t !== stepUp) t = beat(stepUp); // the step-up lands on the next hero, to the frame
  // part 2 (32 beats; the step-up: bigger, faster, brighter; builds on eighths): heroes and quick lines alternate
  hero("visual", VISUAL_NAME, undefined, "C-REEL-9", "deep", 7);
  type("memory", "Memory\nyou control.", "C-REEL-10", 3, "sage");
  hero("longtasks", "Long tasks.", undefined, "C-REEL-14, C-REEL-21", "clay", 7);
  // "Your model, your choice." over the real model chip in the quick chat (RS15-01's send row)
  flash("model", "Your model,\nyour choice.", "C-REEL-13", 4, "deep", [{ crop: "modelRow", beats: 4, srcIn: 940 }]);
  hero("remote", "Pebble\nRemote.", "Open source.", "C-REEL-11, C-REEL-12", "deep", 7);
  // the three modes as kinetic type on the eighths (no drawn control: "real UI only" means no look-alikes, N5)
  type("pace", "You set\nthe pace.", "C-REEL-8", 4, "clay");
  if (t !== stops) throw new Error(`reel: the montage ends on ${t}, the music stops on ${stops}`);
  // the silence: a breath before the slam, the pebble alone (the rival beat is out: the person, 12:03)
  segs.push({ kind: "silence", from: stops, to: slam });

  // ---- the return: the slam, Stealth Lockdown, the rush, the merge into the logo
  t = slam;
  hero("stealth", "Stealth\nLockdown.", undefined, "C-REEL-16", "deep");
  // the features converge into the pebble (REVIEW S3): cards fly in on curved paths, arriving on the beats, then the
  // eighths, then the sixteenths of the last beat, into the logo chord
  const convergeFrom = t;
  const arrivals: number[] = [];
  for (let f = convergeFrom + B; f < convergeFrom + 3 * B + 1; f += B) arrivals.push(Math.round(f));
  for (let f = convergeFrom + 3.5 * B; f < logo - B + 1; f += B / 2) arrivals.push(Math.round(f));
  for (let f = logo - 0.75 * B; f < logo - 1; f += B / 4) arrivals.push(Math.round(f));
  segs.push({ kind: "merge", from: convergeFrom, to: logo, pulls: arrivals });
  const teaseFrom = beat(teaseIn - at(2));
  segs.push({ kind: "logo", from: logo, to: teaseFrom });
  // the tease's lines on its beats; the last card on the beat inside Born Of The Sky's fade-out (48.75–49.95 s), so it
  // arrives with the score's last breath rather than in dead silence; 5 s: a 1.5-s settle to the centre, then 3 s a still
  const cardFrom = beat(teaseIn + at(6.6));
  segs.push({ kind: "tease", from: teaseFrom, to: cardFrom, lines: [teaseFrom, teaseIn, beat(teaseIn + at(2.2))] });
  const length = cardFrom + 300;
  segs.push({ kind: "card", from: cardFrom, to: length });

  const cuts = segs.flatMap((s) => {
    const own = [s.from];
    if (s.kind === "flash") own.push(...s.shots.map((x) => x.from), ...s.punches);
    if (s.kind === "reveal") own.push(s.w1, s.w2);
    if (s.kind === "title") own.push(...s.lines);
    if (s.kind === "tease") own.push(...s.lines);
    if (s.kind === "hook") own.push(s.send, ...s.accents);
    return own;
  });
  // the honest line: on screen from the slam (where Stealth first appears, REVIEW S8) to the score's end, 12.3 s for its
  // 21 words (as in round 2: the lead, round 3, "exactly as now")
  return { map, B, length, scoreEnd, drop, stepUp, slam, logo, segments: segs, honest: { from: slam, to: scoreEnd }, cuts };
}

/** The segment on screen at frame f (the last one starting at or before it). */
export const segmentAt = (p: FullPlan, f: number): Segment | undefined => p.segments.filter((s) => f >= s.from && f < s.to).pop();
