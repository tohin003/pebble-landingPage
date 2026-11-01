// The full reel's edit (50.1 s, 3006 frames at 60 fps), built from the locked score's beat map. Pure; no React.
//
// Every segment starts on a beat of the map; check.ts proves it. The arc follows the score (the lead, 02:55 and 03:35):
//   0–540     tension: the real question typed in the quick chat, echoed huge; light breathing with Starfire's pad,
//             then Vanguard's build (270), the suck-back (378); the send on the pickup (486); the dive into the
//             pebble's eye; a dark breath
//   540       THE DROP: the pebble's burst; "Pebble" and "2.0" on the next two beats
//   648–2160  the montage, Vanguard's driving 133.33 BPM: quick feature flashes (real screens, 2–3 beats) around the
//             tech features' hero beats (6 beats, 2.7 s, each an explainer); the step-up at 1296 lands on a hero
//   2025–2160 the rival set-up (RS-9's composite: the ask, then Pebble's own tab playing the video)
//   2160–2268 true silence: the punch-in on the video's title, the pebble waits, "Anyway." (2214)
//   2268      THE SLAM: Stealth Lockdown, its honest line on screen from here to the end
//   2430–2592 the features flash faster and faster and collapse into the pebble
//   2592      THE LOGO: the aura's warm burst, the lockup; the end card's lines
//   2727–3006 the tease (D157), the pebble sleepy
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
  id: "pace" | "memory" | "model" | "telemetry";
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

export interface Rival {
  kind: "rival";
  from: number;
  to: number;
  /** RS9A-01's ask, then the cut on motion into RS9B-02's own tab playing the video */
  ask: { from: number; to: number; src: Warp };
  play: { from: number; to: number; src: Warp };
}

export type Segment =
  | { kind: "hook"; from: number; to: number; src: Warp; send: number; zoomFrom: number; accents: number[]; pulses: number[] }
  | { kind: "breath"; from: number; to: number }
  | { kind: "reveal"; from: number; to: number; w1: number; w2: number }
  | Flash
  | TypeBeat
  | Hero
  | Rival
  | { kind: "silence"; from: number; to: number; anyway: number }
  | { kind: "rush"; from: number; to: number; flashes: number[] }
  | { kind: "merge"; from: number; to: number; pulls: number[] }
  | { kind: "logo"; from: number; to: number; credits: number }
  | { kind: "tease"; from: number; to: number; lines: number[] }
  | { kind: "credits"; from: number; to: number };

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
  /** the score's last frame (the reel runs on past it into the silent credits tail) */
  scoreEnd: number;
  /** every frame the edit cuts or hits on, for the check */
  cuts: number[];
}

/** The required line, word for word (CLAUDE.md; src/content/neverWords.ts). */
export const STEALTH_HONEST =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

/** The tease (D157; the person's words, as in the first cut's coda), one line per hit. */
export const TEASE_LINES = ["Pebble rests.", "Soon, it may learn while it does.", "Not built yet."] as const;

/** The end card's lines and credits (the lead, 03:35; the music lane's CREDITS; DECISION-RS9; the engine's licence). */
export const END_CARD = {
  // the lead's "Pebble 2.0 · Free and open source · for Mac", set without middle dots (PHILOSOPHY: no middle-dot meta
  // strings): the name is the lockup, the rest one plain line. Open for the lead's ruling.
  tagline: "Free and open source, for Mac.",
  honestSmall: "Shown with sample data. Edited for time.",
  // the tail's billing block (PRO_CHECKLIST's exception, the lead's ruling 3): the music condensed to one line (titles,
  // artist, "edited", licence, link); the full three lines stay in every description and the SRT
  credits: [
    "‘Starfire’, ‘Vanguard’ and ‘Born Of The Sky’ by Scott Buckley (edited), released under CC BY 4.0. scottbuckley.com.au",
    "Claude Code launch video: Anthropic, on YouTube. Claude and Claude Code are trademarks of Anthropic.",
    "Pebble's character engine: bloub by Jérémy Perret (MIT)",
  ],
  /** the music's three CC BY lines in full (the music lane's README), for the SRT and every description */
  musicFull: [
    "‘Vanguard’ by Scott Buckley (edited) – released under CC-BY 4.0. www.scottbuckley.com.au",
    "‘Starfire’ by Scott Buckley (edited) – released under CC-BY 4.0. www.scottbuckley.com.au",
    "‘Born Of The Sky’ by Scott Buckley (edited) – released under CC-BY 4.0. www.scottbuckley.com.au",
  ],
} as const;

const hit = (m: BeatMap, name: RegExp, fallback: number) => Math.round(m.hits.find((h) => name.test(h.kind))?.frame ?? fallback);

export function buildFullPlan(map: BeatMap): FullPlan {
  const B = beatPeriod(map);
  const beat = (f: number) => Math.round(map.beats.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a), map.beats[0]));
  const drop = hit(map, /drop/i, 540);
  const stepUp = hit(map, /splice|lift|step/i, 1296);
  const stops = hit(map, /stops|silence/i, 2160);
  const anyway = hit(map, /anyway/i, 2214);
  const slam = hit(map, /slam/i, 2268);
  const logo = hit(map, /logo/i, 2592);
  const teaseIn = hit(map, /tease/i, 2781);
  // the lead, 04:10: a 3–4 s credits tail after the score's last note, in silence, so the reel is about 54 s
  const scoreEnd = map.durationFrames;
  const TAIL = 240; // 4.0 s
  const length = scoreEnd + TAIL;
  const segs: Segment[] = [];
  const at = (n: number) => Math.round(n * B); // n beats

  // ---- tension: the hook card, the send on the pickup, the dive, the breath
  const vanguardIn = hit(map, /vanguard_in|build/i, 270);
  const suck = hit(map, /suck/i, 378);
  const send = hit(map, /pickup/i, 486);
  const breathFrom = drop - 6;
  // the typing at about real time (0.85×) from the first letter, then the finished question held to the send
  const hookSrc = warp([
    [0, 241],
    [300, 495],
    [send, 517],
    [breathFrom, 517],
  ]);
  segs.push({
    kind: "hook",
    from: 0,
    to: breathFrom,
    src: hookSrc,
    send,
    zoomFrom: Math.round(send + B * 0.5),
    accents: [vanguardIn, suck],
    pulses: map.beats.filter((b) => b >= vanguardIn - 0.5 && b < send - 0.5).map(Math.round),
  });
  segs.push({ kind: "breath", from: breathFrom, to: drop });
  segs.push({ kind: "reveal", from: drop, to: drop + at(4), w1: drop + at(1), w2: drop + at(2) });

  // ---- the montage
  let t = drop + at(4);
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

  // part 1 (to the step-up)
  flash("spaces", "Every Space.", "C-REEL-3", 2, "deep", [{ crop: "spaces", beats: 2, srcIn: 266 }]);
  flash("apps", "Apps you allow.", "C-REEL-4", 3, "sage", [{ crop: "calculator", beats: 3, srcIn: 3200, event: { src: 3387, beat: 1 } }]);
  // one screen for both beats: three hard cuts inside a second (Calculator, Calendar, Finder, AgentGuard) flickered
  // past the photosensitivity limit (flash scan, 1 Nov); Finder still appears in the rush and the merge
  flash("actions", "App actions.", "C-REEL-5", 2, "clay", [{ crop: "calendar", beats: 2, srcIn: 6150 }]);
  hero("agentguard", "AgentGuard.", "Evidence before “done”.", "C-REEL-6", "deep");
  hero("workshop", "Pebble’s\nWorkshop.", "Tools it makes for itself.", "C-REEL-7", "sage");
  type("pace", "You set\nthe pace.", "C-REEL-8", stepUp - t > at(5) ? 6 : 5, "clay");
  if (t !== stepUp) t = beat(stepUp); // the step-up lands on the next hero, to the frame
  // part 2 (the step-up: bigger, faster)
  hero("visual", "Visual\nanswers.", "Drawn from data only.", "C-REEL-9", "deep");
  type("memory", "Memory you\ncontrol.", "C-REEL-10", 3, "sage");
  // the README's own words (README.md@v2.0.0:445: "a long task's older tool results are sealed in large chunks"),
  // shortened; "stay light" was dropped (no source says it, and it leans toward a cost claim). Never the name D55 keeps
  // unnamed. C-REEL-14.
  hero("longtasks", "Long\ntasks.", "Older tool results,\nsealed.", "C-REEL-14", "clay");
  hero("remote", "Pebble\nRemote.", "Open source.\nBuild it yourself.", "C-REEL-11, C-REEL-12", "deep");
  type("model", "Your model,\nyour choice.", "C-REEL-13", 4, "sage");
  type("telemetry", "No telemetry.", "C-REEL-15", 2, "clay");

  // the rival set-up: the last five beats before the music stops
  const rivalFrom = beat(stops - at(5));
  t = rivalFrom;
  const askLen = at(2);
  segs.push({
    kind: "rival",
    from: rivalFrom,
    to: stops,
    // the ask: "Show me a clip of your rival." typed and sent (RS9A-01 1621 → the send on 1721, "Task: running" 1726)
    ask: { from: rivalFrom, to: rivalFrom + askLen, src: ramp({ srcIn: 1640, srcEvent: 1722, outEvent: askLen - 10, outEnd: askLen, landFrames: 6 }) },
    // the play: Pebble's own tab, the video playing (RS9B-02 from 6995, past the adverts), real time
    play: { from: rivalFrom + askLen, to: stops, src: warp([[0, 6995], [stops - rivalFrom - askLen, 6995 + stops - rivalFrom - askLen]]) },
  });
  segs.push({ kind: "silence", from: stops, to: slam, anyway });

  // ---- the return: the slam, Stealth Lockdown, the rush, the merge into the logo
  t = slam;
  hero("stealth", "Stealth\nLockdown.", undefined, "C-REEL-16", "deep");
  const rushFrom = t;
  const mergeFrom = beat(logo - at(3));
  const flashes: number[] = [];
  // on the beats: then the merge's eighths carry the acceleration (eighth-note cuts here flickered past the limit)
  for (let f = rushFrom; f < mergeFrom - 2; f += B) flashes.push(Math.round(f));
  segs.push({ kind: "rush", from: rushFrom, to: mergeFrom, flashes });
  const pulls: number[] = [];
  // on the eighths (the sixteenths flickered the frame's centre past the photosensitivity limit, flash scan 1 Nov)
  for (let f = mergeFrom + B / 2; f < logo - 2; f += B / 2) pulls.push(Math.round(f));
  segs.push({ kind: "merge", from: mergeFrom, to: logo, pulls });
  const teaseFrom = beat(teaseIn - at(2));
  segs.push({ kind: "logo", from: logo, to: teaseFrom, credits: beat(logo + at(4)) });
  segs.push({ kind: "tease", from: teaseFrom, to: scoreEnd, lines: [teaseFrom, teaseIn, Math.round(map.downbeats.find((d) => d > teaseIn + 1) ?? teaseIn + at(4))] });

  const cuts = segs.flatMap((s) => {
    const own = [s.from];
    if (s.kind === "flash") own.push(...s.shots.map((x) => x.from), ...s.punches);
    if (s.kind === "reveal") own.push(s.w1, s.w2);
    if (s.kind === "rival") own.push(s.play.from);
    if (s.kind === "hook") own.push(s.send);
    return own;
  });
  segs.push({ kind: "credits", from: scoreEnd, to: length });
  // the honest line: on screen from the slam's next beat to the score's end, 11.85 s for its 21 words, so the tail
  // doesn't repeat it (the lead's ruling 4)
  return { map, B, length, scoreEnd, drop, stepUp, slam, logo, segments: segs, honest: { from: slam + Math.round(B), to: scoreEnd }, cuts };
}

/** The segment on screen at frame f (the last one starting at or before it). */
export const segmentAt = (p: FullPlan, f: number): Segment | undefined => p.segments.filter((s) => f >= s.from && f < s.to).pop();
