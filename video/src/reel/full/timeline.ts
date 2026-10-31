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
  | { kind: "tease"; from: number; to: number; lines: number[] };

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
  honest: { from: number };
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
  credits: [
    "Music: “Vanguard”, “Starfire” and “Born Of The Sky” by Scott Buckley (edited), CC BY 4.0. www.scottbuckley.com.au",
    "Claude Code launch video: Anthropic, on YouTube. Claude and Claude Code are trademarks of Anthropic.",
    "Pebble's character engine: bloub by Jérémy Perret (MIT)",
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
  const length = map.durationFrames;
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
  flash("spaces", "Every Space.", "C-DESK-1 (“… joins every Space.”)", 2, "deep", [{ crop: "spaces", beats: 2, srcIn: 234 }]);
  flash("apps", "Apps you allow.", "C-200-1, C-MAC-1 (“use the apps … you allow”)", 3, "sage", [{ crop: "calculator", beats: 3, srcIn: 3200, event: { src: 3387, beat: 1 } }]);
  flash("actions", "App actions.", "C-MAC-8 (the row's term “Apps and app actions”)", 2, "clay", [
    { crop: "calendar", beats: 1, srcIn: 6150 },
    { crop: "finder", beats: 1, srcIn: 2790 },
  ]);
  hero("agentguard", "AgentGuard.", "Evidence before “done”.", "C-AG-5, C-200-7, C-200-20", "deep");
  hero("workshop", "Pebble’s\nWorkshop.", "Tools it makes for itself.", "C-WS-1, C-WS-2, C-SYS-20", "sage");
  type("pace", "You set\nthe pace.", "copy.ts pace.h2 (no row needed); the modes' names C-200-8", stepUp - t > at(5) ? 6 : 5, "clay");
  if (t !== stepUp) t = beat(stepUp); // the step-up lands on the next hero, to the frame
  // part 2 (the step-up: bigger, faster)
  hero("visual", "Visual answers.", "Drawn from data only.", "C-200-12; CHANGELOG.md@v2.0.0:230-234, :313", "deep");
  type("memory", "Memory you\ncontrol.", "C-200-1 (“keep memory you control”)", 3, "sage");
  // the lead's name for it; the README's own words ("a long task's older tool results are sealed in large chunks") are
  // the diagram's labels. Never the name D55 keeps unnamed; no cost or speed claim. Needs its CLAIMS row.
  hero("longtasks", "Long tasks\nstay light.", undefined, "README.md@v2.0.0:445 (needs its CLAIMS row)", "clay");
  hero("remote", "Pebble Remote.", "Open source. Build it yourself.", "CHANGELOG.md@v2.0.0:213-221; the lead 03:15 (needs its CLAIMS row)", "deep");
  type("model", "Your model,\nyour choice.", "copy.ts models h2 (“Your model, your choice.”)", 4, "sage");
  type("telemetry", "No telemetry.", "C-PRIV-5", 2, "clay");

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
  hero("stealth", "Stealth\nLockdown.", undefined, "C-200-17, C-200-29; the honest line (CLAUDE.md)", "deep");
  const rushFrom = t;
  const mergeFrom = beat(logo - at(3));
  const flashes: number[] = [];
  for (let f = rushFrom; f < mergeFrom - 2; f += B / 2) flashes.push(Math.round(f));
  segs.push({ kind: "rush", from: rushFrom, to: mergeFrom, flashes });
  const pulls: number[] = [];
  for (let f = mergeFrom + B / 4; f < logo - 2; f += B / 4) pulls.push(Math.round(f));
  segs.push({ kind: "merge", from: mergeFrom, to: logo, pulls });
  const teaseFrom = beat(teaseIn - at(2));
  segs.push({ kind: "logo", from: logo, to: teaseFrom, credits: beat(logo + at(4)) });
  segs.push({ kind: "tease", from: teaseFrom, to: length, lines: [teaseFrom, teaseIn, Math.round(map.downbeats.find((d) => d > teaseIn + 1) ?? teaseIn + at(4))] });

  const cuts = segs.flatMap((s) => {
    const own = [s.from];
    if (s.kind === "flash") own.push(...s.shots.map((x) => x.from), ...s.punches);
    if (s.kind === "reveal") own.push(s.w1, s.w2);
    if (s.kind === "rival") own.push(s.play.from);
    if (s.kind === "hook") own.push(s.send);
    return own;
  });
  return { map, B, length, drop, stepUp, slam, logo, segments: segs, honest: { from: slam + Math.round(B) }, cuts };
}

/** The segment on screen at frame f (the last one starting at or before it). */
export const segmentAt = (p: FullPlan, f: number): Segment | undefined => p.segments.filter((s) => f >= s.from && f < s.to).pop();
