// The launch film's captions (brief: .work/launch/briefs/captions.md). The film has no voice: its captions carry its
// on-screen type, for people who use captions and for the site's text track. One source, the cue list below; two
// outputs, the SRT (the LinkedIn post) and the VTT (the site).
//
//   bun video/src/launch/master/captions.ts --check   checks every rule below, prints the cue table; exit 1 on a failure
//   bun video/src/launch/master/captions.ts --write   checks, then writes video/out/launch/pebble-2.0-launch.srt and .vtt
//
// Plain TypeScript for Bun: no React and no Remotion. It imports nothing of the film either (timeline.ts and the scenes
// import Remotion): the check reads timeline.ts and the scenes' source as text.
//
// How a cue is timed. Master seconds at 30 fps; a scene's local second t shows on the master at fr(slot.in) / 30 + t.
// - `text.in`: the first frame on which every word of the cue is readable in both aspects: each word's entrance at
//   least 80 % done (its eased progress; a 0-frame set on its own frame), and no seam's blur over it above 2 px.
// - `text.out`: the first frame on which any of them has become unreadable in either aspect: an exit more than half
//   done, a cut, a whip's blur above 2 px, a wipe's solid edge past the middle of the line.
// - `in` is `text.in`, never earlier. It is later only where the cue before still needs its 1.2 s.
// - `out` is `text.out`, or the next cue's start where that comes first. A cue whose text leaves before 1.2 s is held
//   to 1.2 s, never past the next cue's start.
// - Words exactly as on screen (the scenes' strings are the authority); a cue may break the lines differently. Lines
//   that land closer together than 1.2 s share a cue, which starts when the later one is readable. A line that stays
//   while others come and go is captioned once, when it lands. The one exception is S10's comparison headers: they go
//   with each card's numbers, so every number carries the model the screen names.
// - Left out: the words inside Pebble's real interface (the takes, the captures, the phone), the diagrams' labels
//   (S05, S06's table, S07's blocks) and the small print (S10's footnote and its "235 of 255" counts, S11's end card),
//   since none of them fits between the film's lines. The report lists them: .work/launch/captions-report.md.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const OUT_DIR = join(REPO, "video", "out", "launch");
const SRT = join(OUT_DIR, "pebble-2.0-launch.srt");
const VTT = join(OUT_DIR, "pebble-2.0-launch.vtt");

/* ---------- what the cues were timed against ---------- */

/** master/timeline.ts as these cues were timed (FILM_S, FILM_FPS and TIMELINE's slots); --check compares. */
const FPS = 30;
const FILM_S = 99.4;
const SLOTS = {
  "S00-ColdOpen": [0, 8.051],
  "S01-Title": [8.051, 13.551],
  "S02-OnYourMac": [13.551, 20.051],
  "S03-UsesYourMac": [20.051, 31.051],
  "S04-AgentGuard": [31.051, 40.051],
  "S05-Workshop": [40.051, 47.551],
  "S06-Memory": [47.551, 54.551],
  "S07-ContextWarping": [54.551, 61.551],
  "S08-Remote": [61.551, 70.051],
  "S09-Stealth": [70.051, 79.101],
  "S10-Benchmarks": [79.101, 93.055],
  "S11-Outro": [93.055, 99.4],
} as const;
type SceneId = keyof typeof SLOTS;

/** Stealth Lockdown's honest line, word for word (S09Stealth.tsx HONEST_LINE; CLAUDE.md). */
export const HONEST_LINE =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";
/** When the honest line is readable on screen (S09: `line` at 0.08 s in the Sequence from f(M.strip), master f2146; cut at M.typeOut, f2372). */
const HONEST_ON = { in: 71.533, out: 79.067 } as const;

/* ---------- the cues ---------- */

export interface Cue {
  scene: SceneId;
  /** master seconds: the caption's first frame, and the first frame without it */
  in: number;
  out: number;
  /** one or two lines, the screen's own words */
  lines: readonly [string] | readonly [string, string];
  /** when all of the cue's words are readable on screen, and when the first of them no longer is (master s) */
  text: { in: number; out: number };
  /** where the times come from: the scene's constants (T(x) = x × the scene's retime factor k; f = master frame) */
  from: string;
  /** S10's numbers: [metric, panel] of S10_METRICS and PANELS (the check rebuilds the cue from the scene's own data) */
  card?: readonly [number, number];
  /** why it reads faster than 3.5 words a second (the film's own pace; listed in the report) */
  fast?: string;
  /** it continues a block the screen shows whole, split over cues at word boundaries (it starts later by design) */
  split?: true;
}

export const CUES: readonly Cue[] = [
  /* S00 cold open (S00ColdOpen.tsx; slot 0 → 8.051, f0–f241; k = 8.0667 / 8.05) */
  {
    scene: "S00-ColdOpen",
    in: 0,
    out: 1.2,
    lines: ["This is Pebble."],
    text: { in: 0, out: 0.967 },
    from: "landed on frame 0 (at −1); ExitWrap at T(S00_BEATS.thisExit 0.8), 0.17 s, half gone f29; held to 1.2 s",
  },
  {
    scene: "S00-ColdOpen",
    in: 1.2,
    out: 2.4,
    lines: ["It's small."],
    text: { in: 1.167, out: 1.9 },
    from: "blur entrance at T(S00_BEATS.small 1.05), \"small.\" +0.067 s, readable f35; starts f36 so the cue before has its 1.2 s; ExitWrap at T(1.75), half gone f57; held to 1.2 s",
  },
  {
    scene: "S00-ColdOpen",
    in: 2.567,
    out: 3.867,
    lines: ["It just went up against", "Claude Code and Codex."],
    text: { in: 2.567, out: 8.067 },
    from: "\"It just went up against\" blur at T(S00_BEATS.against 1.9), readable f67 (held to the drop since cf6e26f); the names' Monolith slams at T(2.3) f70 and T(2.55) f77; ends where the terms' cue starts",
    fast: "the film sets these 9 words between 1.9 and 2.57 s and its next line lands at 3.6–3.9 s; all of it then stays to the drop",
  },
  {
    scene: "S00-ColdOpen",
    in: 3.867,
    out: 8.067,
    lines: ["Same model. Same tasks."],
    text: { in: 3.867, out: 8.067 },
    from: "SameLine halves at T(S00_BEATS.sameModel 3.55) f109 and T(S00_BEATS.sameTasks 3.8) f116 (0.2 s fade-rise); to the drop, the cut to S01 at f242",
  },

  /* S01 title (S01Title.tsx; slot 8.051 → 13.551, f242–f406; k = 1) */
  {
    scene: "S01-Title",
    in: 8.467,
    out: 9.667,
    lines: ["Pebble 2.0"],
    text: { in: 8.467, out: 13.133 },
    from: "letters from LETTERS_AT −0.15, 0.05 s apart, the \"0\" (letter 9) from 0.30, readable f254; ends where the tagline's cue starts",
  },
  {
    scene: "S01-Title",
    in: 9.667,
    out: 13.133,
    lines: ["The desktop companion that does real work,", "and shows its evidence."],
    text: { in: 9.0, out: 13.133 },
    from: "TAGLINE rise at T(0.5), stagger 0.025, line 0.06, 0.4 s, readable f270; starts f290 so \"Pebble 2.0\" has its 1.2 s; the type's exit at D − PUSH_S + 0.02 (4.92 s), 0.15 s, half gone f394",
  },

  /* S02 lives on your Mac (S02OnYourMac.tsx, working tree; slot 13.551 → 20.051, f407–f601; k = 1) */
  {
    scene: "S02-OnYourMac",
    in: 14.333,
    out: 16.4,
    lines: ["It lives on your Mac."],
    text: { in: 14.333, out: 16.4 },
    from: "caption A, line entrance at PULL_S × 0.82 (0.697 s), readable f430; exit rise at CAPTION_A_EXIT 2.64 s, half gone f492",
  },
  {
    scene: "S02-OnYourMac",
    in: 16.667,
    out: 18.067,
    lines: ["On every Space."],
    text: { in: 16.667, out: 18.067 },
    from: "blur at −0.05 s in the swipe's Sequence from f(AT.b 2.9) (4:5: \"Space.\" on line 2, readable f500); cut when the Sequence ends at f(AT.c 4.5), f542",
  },
  {
    scene: "S02-OnYourMac",
    in: 18.467,
    out: 19.967,
    lines: ["Click. Ask."],
    text: { in: 18.467, out: 19.967 },
    from: "blur in shot C's Sequence from f(4.5): \"Click.\" at the take's click (C_TIME.inv 2.867) − 0.02, f548; \"Ask.\" a stagger later, on the typing (C_TIME.inv 3.85), f554; the whip out (WHIP_S 0.14) blurs it past 2 px at f599",
  },

  /* S03 uses your Mac (S03UsesYourMac.tsx, working tree; slot 20.051 → 31.051, f602–f931; k = 1) */
  {
    scene: "S03-UsesYourMac",
    in: 20.2,
    out: 22.567,
    lines: ["Now it can use your Mac."],
    text: { in: 20.2, out: 22.567 },
    from: "the act card, line entrance at −0.08 s; the whip in (WHIP_IN_S 0.14) is under 2 px from f606; cut at f(AT.apps 2.5), f677",
  },
  {
    scene: "S03-UsesYourMac",
    in: 22.8,
    out: 24.067,
    lines: ["Your apps."],
    text: { in: 22.8, out: 24.067 },
    from: "label, blur at 0.04 s in the Sequence from f(AT.apps 2.5) (16:9: \"apps.\" on line 2), readable f684; cut at f(AT.calendar 4.0), f722",
  },
  {
    scene: "S03-UsesYourMac",
    in: 24.3,
    out: 26.067,
    lines: ["Your calendar."],
    text: { in: 24.3, out: 26.067 },
    from: "label in the Sequence from f(AT.calendar 4.0), readable f729; cut at f(AT.browser 6.0), f782",
  },
  {
    scene: "S03-UsesYourMac",
    in: 26.3,
    out: 27.733,
    lines: ["Your browser."],
    text: { in: 26.3, out: 27.733 },
    from: "label in the Sequence from f(AT.browser 6.0), readable f789; exit rise at limitLine − browser − 0.29 (7.46 s), half gone f832",
  },
  {
    scene: "S03-UsesYourMac",
    in: 27.9,
    out: 30.867,
    lines: ["The app windows and websites you allow."],
    text: { in: 27.9, out: 30.867 },
    from: "the limit line, line entrance in its Sequence from f(AT.limit − LIMIT_LEAD 7.75), readable f837; exit rise at lenS − LIMIT_EXIT (10.57 s), half gone f926",
  },

  /* S04 AgentGuard (S04AgentGuard.tsx; slot 31.051 → 40.051, f932–f1201; k = 1) */
  {
    scene: "S04-AgentGuard",
    in: 31.867,
    out: 34.667,
    lines: ["Done means checked."],
    text: { in: 31.867, out: 34.667 },
    from: "rise at T(B.title 0.45) (4:5: \"checked.\" on line 2), readable f956; TypeExit at T(B.titleOut 3.42), 0.18 s, half gone f1040",
  },
  {
    scene: "S04-AgentGuard",
    in: 35.933,
    out: 37.433,
    lines: ["AgentGuard. Evidence before “done”.", "Tests the host ran, not the model’s word."],
    text: { in: 35.933, out: 39.767 },
    from: "\"AgentGuard.\" letters at T(B.agTitle 4.25) f1077, \"Evidence before “done”.\" ink at T(B.agSub 4.45) f1072, row 1 at T(B.rows[0] 4.75) + 0.06 f1078; ends where rows 2 and 3 start",
    fast: "the film lands its title, subtitle and three rows 0.75 s apart (4.25–6.4 s) and holds all 26 words to 8.52 s: 3.8 s for the lot",
  },
  {
    scene: "S04-AgentGuard",
    in: 37.433,
    out: 39.767,
    lines: ["Files you asked to keep, kept.", "Output matched to its file, byte for byte."],
    text: { in: 37.433, out: 39.767 },
    from: "row 2 at T(B.rows[1] 5.5) + 0.06 f1101, row 3 at T(B.rows[2] 6.25) + 0.06 f1123 (line entrance, 0.2 s); TypeExit at T(B.out 8.52), half gone f1193",
    fast: "as the cue before: the rows land 0.75 s apart and leave together at 8.52 s",
  },

  /* S05 Pebble's Workshop (S05Workshop.tsx; slot 40.051 → 47.551, f1202–f1426; k = 1) */
  {
    scene: "S05-Workshop",
    in: 40.733,
    out: 44.2,
    lines: ["It builds small tools for itself."],
    text: { in: 40.733, out: 44.2 },
    from: "blur at T(B.title 0.2), \"itself.\" on line 2, readable f1222; TypeExit at T(B.titleOut 3.95), half gone f1326",
  },
  {
    scene: "S05-Workshop",
    in: 44.333,
    out: 47.233,
    lines: ["When the check disagrees, it asks you."],
    text: { in: 44.333, out: 47.233 },
    from: "line at T(B.line 4.2), readable f1330; TypeExit at T(B.out 7.0), half gone f1417",
  },

  /* S06 memory (S06Memory.tsx; slot 47.551 → 54.551, f1427–f1636; k = 1) */
  {
    scene: "S06-Memory",
    in: 47.767,
    out: 50.533,
    lines: ["It remembers what matters."],
    text: { in: 47.767, out: 50.533 },
    from: "rise from a(S06_BEATS.headline 0) − 0.2 (4:5: \"what matters.\" on line 2), readable f1433, after the zoom-through's settle (its blur under 2 px from f1431); exit fade at a(S06_BEATS.capture 2.75), half gone f1516",
  },
  {
    scene: "S06-Memory",
    in: 50.7,
    out: 52.567,
    lines: ["All visible."],
    text: { in: 50.7, out: 54.567 },
    from: "blur at a(S06_BEATS.visible 3.0), readable f1521, held to the cut; ends where \"Forget anything.\" starts",
  },
  {
    scene: "S06-Memory",
    in: 52.567,
    out: 54.567,
    lines: ["Forget anything."],
    text: { in: 52.567, out: 54.567 },
    from: "set whole on a(S06_BEATS.forget 5.0), f1577 (line, at −0.01, 0.009 s); held to the cut at f1637",
  },

  /* S07 context warping (S07ContextWarping.tsx; slot 54.551 → 61.551, f1637–f1846; k = 1) */
  {
    scene: "S07-ContextWarping",
    in: 54.567,
    out: 55.833,
    lines: ["Context warping."],
    text: { in: 54.567, out: 61.267 },
    from: "blur together at a(S07_BEATS.title 0) − 0.07, whole on the cut, f1637; held (the soft wipe covers it at f1838); ends where line 1 starts",
  },
  {
    scene: "S07-ContextWarping",
    in: 55.833,
    out: 58.5,
    lines: ["Long tasks keep a smaller window."],
    text: { in: 55.833, out: 58.5 },
    from: "ink at a(S07_BEATS.line1 0.8), the sixth word +0.4, readable f1675; exit fade at a(S07_BEATS.line1Out 3.72), half gone f1755",
  },
  {
    scene: "S07-ContextWarping",
    in: 58.667,
    out: 61.3,
    lines: ["Older results sealed.", "Any one returned exactly."],
    text: { in: 58.667, out: 61.3 },
    from: "line at a(S07_BEATS.line2 4.02), readable f1760; the soft wipe into S08 (0.5 s, down, feather 0.12) is past the line's middle at f1839 (4:5; 16:9 f1840)",
  },

  /* S08 Pebble Remote (S08Remote.tsx; slot 61.551 → 70.051, f1847–f2101; kk = 1) */
  {
    scene: "S08-Remote",
    in: 61.9,
    out: 64.067,
    lines: ["Pebble, in your pocket."],
    text: { in: 61.9, out: 64.067 },
    from: "rise at S08_BEATS.text1 0 (stagger 0.05, line 0.06, 0.4 s), readable f1857; exit at exitBefore(text2 2.6) = 2.31 s, half gone f1922",
  },
  {
    scene: "S08-Remote",
    in: 64.5,
    out: 66.733,
    lines: ["Pebble Remote for iPhone."],
    text: { in: 64.5, out: 66.733 },
    from: "blur at S08_BEATS.text2 2.6, readable f1935; exit at exitBefore(text3 5.25) = 4.96 s, half gone f2002",
  },
  {
    scene: "S08-Remote",
    in: 67.233,
    out: 68.433,
    lines: ["Approve with Face ID."],
    text: { in: 67.233, out: 69.867 },
    from: "rise at S08_BEATS.text3 5.25, readable f2017; ends after 1.2 s, where the small line's cue starts",
  },
  {
    scene: "S08-Remote",
    in: 68.433,
    out: 69.867,
    lines: ["Open source. Build it with Xcode."],
    text: { in: 67.933, out: 69.867 },
    from: "SmallLine, blur at S08_BEATS.smallLine 5.9 (16:9: two lines), readable f2038; starts f2053 so the line before has its 1.2 s; exit at S08_BEATS.textOut 8.1, half gone f2096",
    fast: "the film's two lines land 0.7 s apart and leave together 2.6 s after the first (10 words)",
  },

  /* S09 Stealth Lockdown (S09Stealth.tsx at 9558e1e; slot 70.051 → 79.101, f2102–f2372; k = 9.0333 / 9.05) */
  {
    scene: "S09-Stealth",
    in: 70.2,
    out: 71.4,
    lines: ["Presenting?"],
    text: { in: 70.2, out: 71.267 },
    from: "ink at 0.06 s, readable f2106; exit fade at M.strip − 0.3 (1.0 s), half gone f2138; held to 1.2 s",
  },
  {
    scene: "S09-Stealth",
    in: 71.533,
    out: 73.1,
    lines: ["Stealth Lockdown.", "Hidden from screen capture"],
    text: { in: 71.533, out: 79.067 },
    from: "\"Stealth Lockdown.\" line at 0 in the Sequence from f(M.strip) (f2141), readable f2143; the honest line at 0.08, readable f2146; the honest line split by its words over three cues",
    fast: "the film holds the title and the honest line, 29 words, for 7.5 s (3.85 words a second); each cue keeps that rate",
  },
  {
    scene: "S09-Stealth",
    in: 73.1,
    out: 76.733,
    lines: ["and screen sharing, not from a camera,", "a capture card or a process list."],
    text: { in: 71.533, out: 79.067 },
    from: "the honest line (as above), its second part",
    fast: "as the cue before (3.85 words a second)",
    split: true,
  },
  {
    scene: "S09-Stealth",
    in: 76.733,
    out: 79.067,
    lines: ["Exams and interviews that forbid", "assistants still forbid it."],
    text: { in: 71.533, out: 79.067 },
    from: "the honest line, its end; both lines are cut at M.typeOut (lenS − 2/30), gone on S09's last frame, f2372",
    fast: "as the cue before (3.86 words a second)",
    split: true,
  },

  /* S10 benchmarks (S10Benchmarks.tsx; slot 79.101 → 93.055, f2373–f2791; k = 13.9667 / 13.954) */
  {
    scene: "S10-Benchmarks",
    in: 79.267,
    out: 81.067,
    lines: ["So. How did it do?"],
    text: { in: 79.267, out: 81.067 },
    from: "blur together at a(S10_BEATS.question 0.15) − 0.02, readable f2378 (inside the daylight blob); drawn while t < the impact a(1.95), gone f2432",
  },
  {
    scene: "S10-Benchmarks",
    in: 81.067,
    out: 82.267,
    lines: ["Tasks done correctly."],
    text: { in: 81.067, out: 84.467 },
    from: "metric 1's headline, slammed on the impact a(S10_BEATS.metrics[0] 1.95), f2432; ends after 1.2 s, where panel 1's cue starts",
  },
  {
    scene: "S10-Benchmarks",
    in: 82.267,
    out: 83.467,
    lines: ["vs Claude Code, both on claude-opus-5-5", "Pebble 92.2 %. Claude Code 83.5 %."],
    text: { in: 81.8, out: 84.367 },
    card: [0, 0],
    from: "the header with the scaffold at the impact f2432; the values land with the bars at a(2.7), readable f2454; starts f2468 so the headline has its 1.2 s",
    fast: "each card holds its headline, two headers naming the model and four numbers for about 3.5 s",
  },
  {
    scene: "S10-Benchmarks",
    in: 83.467,
    out: 84.667,
    lines: ["vs Codex, both on gpt-6.1-sol", "Pebble 95.3 %. Codex 90.6 %."],
    text: { in: 82.3, out: 84.367 },
    card: [0, 1],
    from: "the values at a(3.2), readable f2469; they leave at a(S10_BEATS.metrics[1] 5.2), half gone f2531; held to 1.2 s",
    fast: "as the card's cue before",
  },
  {
    scene: "S10-Benchmarks",
    in: 84.933,
    out: 86.133,
    lines: ["Said “done” when it wasn’t.", "Lower is better."],
    text: { in: 84.933, out: 88.233 },
    from: "metric 2's headline, blur at a(5.2) + HEAD_IN 0.22 (4:5: \"when it wasn’t.\" on line 2), readable f2548; \"Lower is better.\" line at the same time, f2538; ends where panel 1's cue starts",
    fast: "as the cards' cues: the headline and \"Lower is better.\" land together, and the numbers follow 0.9 s later",
  },
  {
    scene: "S10-Benchmarks",
    in: 86.133,
    out: 87.333,
    lines: ["vs Claude Code, both on claude-opus-5-5", "Pebble 6.3 %. Claude Code 13.7 %."],
    text: { in: 85.8, out: 88.133 },
    card: [1, 0],
    from: "the values at a(6.7), readable f2574; starts f2584 so the headline has its 1.2 s",
    fast: "as the card's cues",
  },
  {
    scene: "S10-Benchmarks",
    in: 87.333,
    out: 88.533,
    lines: ["vs Codex, both on gpt-6.1-sol", "Pebble 3.9 %. Codex 7.1 %."],
    text: { in: 86.3, out: 88.133 },
    card: [1, 1],
    from: "the values at a(7.2), readable f2589; they leave at a(S10_BEATS.metrics[2] 8.95), half gone f2644; held to 1.2 s",
    fast: "as the card's cues",
  },
  {
    scene: "S10-Benchmarks",
    in: 88.533,
    out: 89.733,
    lines: ["Cost per task."],
    text: { in: 88.467, out: 92.167 },
    from: "metric 3's headline, blur at a(8.95) + HEAD_IN 0.22, readable f2654; starts f2656, where the cue before ends (\"Lower is better.\", still on screen, was captioned when it landed)",
  },
  {
    scene: "S10-Benchmarks",
    in: 89.733,
    out: 90.933,
    lines: ["vs Claude Code, both on claude-opus-5-5", "Pebble $0.091. Claude Code $0.117."],
    text: { in: 89.567, out: 92.167 },
    card: [2, 0],
    from: "the values at a(10.45), readable f2687; starts f2692 so the headline has its 1.2 s",
    fast: "as the card's cues",
  },
  {
    scene: "S10-Benchmarks",
    in: 90.933,
    out: 92.167,
    lines: ["vs Codex, both on gpt-6.1-sol", "Pebble $0.042. Codex $0.050."],
    text: { in: 90.067, out: 92.167 },
    card: [2, 1],
    from: "the values at a(10.95), readable f2702; the chart leaves at a(S10_BEATS.exit 12.9) (0.2 s, squared), half gone f2765",
    fast: "as the card's cues",
  },

  /* S11 outro (S11Outro.tsx; slot 93.055 → 99.4, f2792–f2981; k = 6.3333 / 6.345) */
  {
    scene: "S11-Outro",
    in: 93.333,
    out: 95.967,
    lines: ["Small pebble.", "Real work."],
    text: { in: 93.333, out: 95.967 },
    from: "HitSet sets: \"Small pebble.\" on frame 1 (FIRST_FRAME), f2793; \"Real work.\" at T(0.248), f2800; ExitWrap at T(B.thesisExit 2.76), half gone f2879",
  },
  {
    scene: "S11-Outro",
    in: 96.433,
    out: 97.9,
    lines: ["Pebble 2.0", "Free and open source,"],
    text: { in: 96.433, out: 99.4 },
    from: "the lockup's name, blur at T(3.0) (4:5: T(3.05)), readable f2887; FREE_LINES, line at T(B.free 3.3), readable f2893; held to the end; the end card's lines split over two cues",
    fast: "the end card's three lines, 12 words, land within 0.37 s and hold 3 s",
  },
  {
    scene: "S11-Outro",
    in: 97.9,
    out: 99.4,
    lines: ["for Macs with Apple silicon.", "github.com/tohin003/Pebble"],
    text: { in: 96.6, out: 99.4 },
    from: "FREE_LINES' second line (as above) and the Label at T(B.github 3.42), readable f2898; held to the film's end, 99.4",
    fast: "as the cue before",
    split: true,
  },
];

/* ---------- the rules ---------- */

const RULES = { maxLines: 2, maxChars: 42, minS: 1.2, maxS: 7, maxWps: 3.5 } as const;
/** a millisecond's tolerance: the times are frames rounded to ms */
const EPS = 0.0015;
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const joined = (c: Cue) => c.lines.join(" ");
const dur = (c: Cue) => c.out - c.in;
const wps = (c: Cue) => words(joined(c)) / dur(c);
/** the frame a master second falls on */
const frameOf = (s: number) => Math.round(s * FPS);

/** The scenes' source, with comments removed (strings kept). */
const sceneSources = (): Map<string, string> => {
  const root = join(REPO, "video", "src", "launch", "scenes");
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.set(p, readFileSync(p, "utf8"));
    }
  };
  walk(root);
  return out;
};

/** The string literals of a source ("…", '…' and `…` without its ${…}), comments skipped, unescaped. */
const literals = (src: string): string[] => {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2);
      if (i < 0) break;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      let buf = "";
      while (j < src.length && src[j] !== ch) {
        if (src[j] === "\\") {
          const n = src[j + 1];
          buf += n === "n" ? "\n" : n;
          j += 2;
          continue;
        }
        if (ch === "`" && src[j] === "$" && src[j + 1] === "{") {
          // skip the interpolation; its static parts either side stay separate strings
          let depth = 1;
          j += 2;
          while (j < src.length && depth > 0) {
            if (src[j] === "{") depth++;
            else if (src[j] === "}") depth--;
            j++;
          }
          out.push(buf);
          buf = "";
          continue;
        }
        if (ch !== "`" && src[j] === "\n") break; // not a string (a stray quote in JSX text)
        buf += src[j];
        j++;
      }
      out.push(buf);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
};

/** A literal as it reads on screen: line breaks as spaces, the `*accent*` markup gone. */
const onScreen = (lit: string) => lit.replace(/\*/g, "").replace(/\s+/g, " ").trim();

/** Every run of whole words of every literal: a cue must be made of such runs (the screen's words, in its order). */
const wordRuns = (lits: readonly string[]): Set<string> => {
  const runs = new Set<string>();
  for (const lit of lits) {
    const w = onScreen(lit).split(" ").filter(Boolean);
    if (w.length > 40) continue;
    for (let a = 0; a < w.length; a++) for (let b = a + 1; b <= w.length; b++) runs.add(w.slice(a, b).join(" "));
  }
  return runs;
};

/** Can `text` be cut into runs of the screen's own words? Returns the runs, or null. */
const segment = (text: string, runs: Set<string>): string[] | null => {
  const w = text.split(" ");
  const best: (string[] | null)[] = new Array(w.length + 1).fill(null);
  best[0] = [];
  for (let i = 1; i <= w.length; i++) {
    for (let j = 0; j < i; j++) {
      const prev = best[j];
      if (!prev) continue;
      const run = w.slice(j, i).join(" ");
      if (runs.has(run) && (!best[i] || best[i]!.length > prev.length + 1)) best[i] = [...prev, run];
    }
  }
  return best[w.length];
};

/** S10's panels and metrics, read from the scene's source (what the screen draws). */
const s10Data = (src: string) => {
  const panels = [...src.matchAll(/\{\s*lead:\s*"([^"]*)",\s*rest:\s*"([^"]*)",\s*rival:\s*"([^"]*)"\s*\}/g)].map((m) => ({ lead: m[1], rest: m[2], rival: m[3] }));
  const start = src.indexOf("export const S10_METRICS");
  const end = src.indexOf("\n];", start);
  const block = start >= 0 && end > start ? src.slice(start, end) : "";
  const metrics = block
    .split(/\n {2}\{\n/)
    .slice(1)
    .map((b) => {
      const title = /title:\s*"([^"]*)"/.exec(b)?.[1];
      const decimals = Number(/decimals:\s*(\d+)/.exec(b)?.[1]);
      const unit = /unit:\s*"([^"]*)"/.exec(b)?.[1];
      const prefix = /prefix:\s*"([^"]*)"/.exec(b)?.[1];
      const v = /values:\s*\[\s*\[([\d.]+),\s*([\d.]+)\],\s*\[([\d.]+),\s*([\d.]+)\],?\s*\]/.exec(b);
      const values = v ? [[Number(v[1]), Number(v[2])], [Number(v[3]), Number(v[4])]] : [];
      return { title, decimals, unit, prefix, values };
    });
  return { panels, metrics };
};

/** The sentence that names a number the way the screen sets it: "92.2 %", "$0.050". */
const figure = (v: number, m: { decimals: number; unit?: string; prefix?: string }) => `${m.prefix ?? ""}${v.toFixed(m.decimals)}${m.unit ? ` ${m.unit}` : ""}`;

/** The film's never-words (CLAUDE.md "Never", the Stealth Lockdown rule) and the comparatives the brief bans. */
const BANNED: readonly RegExp[] = [
  /\b(beats?|beat|better|best|more|most|wins?|won|faster|cheaper|outperform\w*|ahead)\b/i,
  /\b(undetectable|invisible|magic|seamless|revolutionary|secure|proctor\w*|cheat\w*|bypass\w*|evad\w*|monitor\w*)\b/i,
  /private by design/i,
  /\b(exams?|interviews?)\b/i,
  /!/,
  /"/,
];
/** American spellings the film never uses (British spelling). */
const AMERICAN = /\b(color\w*|behavior\w*|center\w*|gray|favorite\w*|analyze\w*|catalog|dialog|fulfill|toward|modeling|labeled|traveled|canceled|program(?!me))\b/i;

/** Checks the cue list against the brief's rules and the film's source; returns the problems (empty: fine). */
export const checkCues = (cues: readonly Cue[] = CUES): string[] => {
  const problems: string[] = [];
  const name = (i: number) => `cue ${i + 1} (${cues[i].lines.join(" / ")})`;

  // the timeline these cues were timed against
  const tl = readFileSync(join(HERE, "timeline.ts"), "utf8");
  const filmS = Number(/export const FILM_S = ([\d.]+);/.exec(tl)?.[1]);
  const fps = Number(/export const FILM_FPS = (\d+);/.exec(tl)?.[1]);
  if (filmS !== FILM_S) problems.push(`timeline.ts: FILM_S is ${filmS}, the captions were timed for ${FILM_S}`);
  if (fps !== FPS) problems.push(`timeline.ts: FILM_FPS is ${fps}, the captions were timed for ${FPS}`);
  const slots = [...tl.matchAll(/\{ id: "(S\d\d-[A-Za-z]+)", in: ([\d.]+), out: ([\d.]+)/g)].map((m) => ({ id: m[1], in: Number(m[2]), out: Number(m[3]) }));
  const ids = Object.keys(SLOTS) as SceneId[];
  if (slots.length !== ids.length) problems.push(`timeline.ts: read ${slots.length} slots, expected ${ids.length}`);
  for (const id of ids) {
    const s = slots.find((x) => x.id === id);
    if (!s) problems.push(`timeline.ts: no slot ${id}`);
    else if (s.in !== SLOTS[id][0] || s.out !== SLOTS[id][1]) problems.push(`timeline.ts: ${id} is ${s.in}–${s.out}, the captions were timed for ${SLOTS[id][0]}–${SLOTS[id][1]}: re-time its cues`);
  }

  // one cue at a time
  cues.forEach((c, i) => {
    const n = name(i);
    if (c.lines.length < 1 || c.lines.length > RULES.maxLines) problems.push(`${n}: ${c.lines.length} lines`);
    for (const l of c.lines) {
      if ([...l].length > RULES.maxChars) problems.push(`${n}: a line of ${[...l].length} characters ("${l}")`);
      if (l !== l.trim() || !l.length || /\s{2}/.test(l)) problems.push(`${n}: a line with stray spaces ("${l}")`);
    }
    if (!(c.out > c.in)) problems.push(`${n}: ends before it starts`);
    if (dur(c) < RULES.minS - EPS) problems.push(`${n}: ${dur(c).toFixed(3)} s on screen (at least ${RULES.minS})`);
    if (dur(c) > RULES.maxS + EPS) problems.push(`${n}: ${dur(c).toFixed(3)} s on screen (at most ${RULES.maxS})`);
    if (c.in < c.text.in - EPS) problems.push(`${n}: starts at ${c.in}, before its words are readable (${c.text.in})`);
    if (c.text.out <= c.text.in) problems.push(`${n}: its text window is empty`);
    if (c.out > Math.max(c.text.out, c.in + RULES.minS) + EPS) problems.push(`${n}: outlasts its text (${c.text.out}) past 1.2 s`);
    const slot = SLOTS[c.scene];
    if (c.in < frameOf(slot[0]) / FPS - EPS || c.out > frameOf(slot[1]) / FPS + EPS) problems.push(`${n}: outside ${c.scene}'s slot`);
    for (const t of [c.in, c.out, c.text.in, c.text.out]) if (Math.abs(t * 1000 - Math.round(frameOf(t) * (1000 / FPS))) > 0.5) problems.push(`${n}: ${t} is not on a frame (30 fps, to the ms)`);
    const r = wps(c);
    if (r > RULES.maxWps + 1e-9 && !c.fast) problems.push(`${n}: ${r.toFixed(2)} words a second, and no note on why`);
    if (c.fast && r <= RULES.maxWps) problems.push(`${n}: marked fast but reads ${r.toFixed(2)} words a second`);
    const prev = cues[i - 1];
    if (c.split && (!prev || prev.scene !== c.scene || Math.abs(c.in - prev.out) > EPS)) problems.push(`${n}: marked split, but it doesn't continue the cue before`);
    if (prev && c.in < prev.out - EPS) problems.push(`${n}: overlaps the cue before (${prev.out})`);
    if (prev && c.in < prev.in) problems.push(`${n}: out of order`);
  });
  if (cues.length && cues[0].in < 0) problems.push("the first cue starts before 0");
  if (cues.length && cues[cues.length - 1].out > FILM_S + EPS) problems.push(`the last cue ends after ${FILM_S} s`);

  // the words: the screen's own (the scenes' strings), never a paraphrase; S10's numbers from the scene's own data
  const sources = sceneSources();
  const allLits = [...sources.values()].flatMap(literals);
  const runs = wordRuns(allLits);
  const s10Src = [...sources.entries()].find(([p]) => p.endsWith("S10Benchmarks.tsx"))?.[1] ?? "";
  const s10 = s10Data(s10Src);
  if (s10.panels.length !== 2 || s10.metrics.length !== 3 || s10.metrics.some((m) => m.values.length !== 2 || !m.title)) problems.push("S10Benchmarks.tsx: couldn't read PANELS and S10_METRICS");
  cues.forEach((c, i) => {
    if (c.card) {
      const [m, p] = c.card;
      const metric = s10.metrics[m];
      const panel = s10.panels[p];
      if (!metric || !panel) return;
      const [ours, theirs] = metric.values[p];
      const want = [`${panel.lead} ${panel.rest}`, `Pebble ${figure(ours, metric)}. ${panel.rival} ${figure(theirs, metric)}.`];
      if (c.lines.join("\n") !== want.join("\n")) problems.push(`${name(i)}: S10 sets "${want.join(" / ")}"`);
      return;
    }
    for (const l of c.lines) if (!segment(l, runs)) problems.push(`${name(i)}: "${l}" isn't made of the screen's own words (scenes/**)`);
  });
  // every S10 card, in order: its headline (metric 2's with "Lower is better."), then panel 1, then panel 2
  s10.metrics.forEach((metric, m) => {
    const head = cues.findIndex((c) => c.scene === "S10-Benchmarks" && c.lines[0] === metric.title);
    if (head < 0) problems.push(`S10: no cue for "${metric.title}"`);
    else if (cues[head + 1]?.card?.join() !== `${m},0` || cues[head + 2]?.card?.join() !== `${m},1`) problems.push(`S10: "${metric.title}" isn't followed by its two panels`);
  });

  // the honest line: complete, word for word, over consecutive cues inside the time it's on screen
  const s09 = [...sources.entries()].find(([p]) => p.endsWith("S09Stealth.tsx"))?.[1] ?? "";
  const s09Line = /export const HONEST_LINE =\s*"([^"]*)"/.exec(s09)?.[1];
  if (s09Line !== HONEST_LINE) problems.push("the honest line differs from S09Stealth.tsx's HONEST_LINE");
  const claude = readFileSync(join(REPO, "CLAUDE.md"), "utf8").replace(/\s+/g, " ");
  if (!claude.includes(HONEST_LINE)) problems.push("the honest line differs from CLAUDE.md's");
  // the track is the cues' text joined by spaces, so a cue boundary inside the line is always a word boundary
  const track = cues.map(joined).join(" ");
  const at = track.indexOf(HONEST_LINE);
  if (at < 0) problems.push("the cues' joined text doesn't contain the honest line word for word");
  else {
    // the cues the line runs through: consecutive by construction; they must lie inside its time on screen
    let pos = 0;
    const span: number[] = [];
    cues.forEach((c, i) => {
      const end = pos + joined(c).length;
      if (end > at && pos < at + HONEST_LINE.length) span.push(i);
      pos = end + 1;
    });
    const a = cues[span[0]];
    const b = cues[span[span.length - 1]];
    if (a.in < HONEST_ON.in - EPS || b.out > HONEST_ON.out + EPS) problems.push(`the honest line's cues (${span.map((i) => i + 1).join(", ")}) run ${a.in}–${b.out}, outside its time on screen (${HONEST_ON.in}–${HONEST_ON.out})`);
    if (track.indexOf(HONEST_LINE, at + 1) >= 0) problems.push("the honest line appears twice");
  }

  // the film's words: no comparative but "Lower is better.", no never-word, British spelling, its punctuation
  const plain = track.replace(HONEST_LINE, " ").replace(/Lower is better\./g, " ");
  for (const re of BANNED) {
    const m = re.exec(plain);
    if (m) problems.push(`a banned word or mark: "${m[0]}"`);
  }
  const us = AMERICAN.exec(track);
  if (us) problems.push(`an American spelling: "${us[0]}"`);
  if (cues.some((c) => c.lines.some((l) => /Lower is better/.test(l)) && c.scene !== "S10-Benchmarks")) problems.push('"Lower is better." outside S10');
  return problems;
};

/* ---------- the files ---------- */

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const stamp = (s: number, sep: "," | ".") => {
  const ms = Math.round(s * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}${sep}${pad(ms % 1000, 3)}`;
};
const escapeVtt = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const toSrt = (cues: readonly Cue[] = CUES): string =>
  cues.map((c, i) => [String(i + 1), `${stamp(c.in, ",")} --> ${stamp(c.out, ",")}`, ...c.lines].join("\n")).join("\n\n") + "\n";

export const toVtt = (cues: readonly Cue[] = CUES): string =>
  [
    "WEBVTT",
    "NOTE\nPebble 2.0 launch film: captions of its on-screen type (the film has no voice).\nGenerated by video/src/launch/master/captions.ts; edit the cue list there, not this file.",
    ...cues.map((c, i) => [`c${pad(i + 1)}`, `${stamp(c.in, ".")} --> ${stamp(c.out, ".")}`, ...c.lines.map(escapeVtt)].join("\n")),
  ].join("\n\n") + "\n";

/* ---------- the command ---------- */

const printTable = (cues: readonly Cue[]) => {
  console.log("  #  scene               in        out       dur   words  w/s   late   text");
  cues.forEach((c, i) => {
    const late = c.in - c.text.in;
    const lateCol = c.split ? "split" : late > EPS ? late.toFixed(3) : "     ";
    console.log(
      `${String(i + 1).padStart(3)}  ${c.scene.padEnd(18)} ${c.in.toFixed(3).padStart(7)} → ${c.out.toFixed(3).padStart(7)}  ${dur(c).toFixed(3)}  ${String(words(joined(c))).padStart(4)}  ${wps(c).toFixed(2).padStart(5)}${c.fast ? "*" : " "} ${lateCol}   ${c.lines.join(" / ")}`,
    );
  });
  const fast = cues.filter((c) => c.fast).length;
  const late = cues.filter((c) => !c.split && c.in - c.text.in > EPS).length;
  console.log(
    `${cues.length} cues, ${cues.reduce((a, c) => a + words(joined(c)), 0)} words. * over ${RULES.maxWps} words a second (the film's own pace): ${fast}. ` +
      `late: started after its words were readable, while the cue before held its 1.2 s (s): ${late}. split: the rest of a block shown whole.`,
  );
};

/** Run as a script (bun …/captions.ts), not imported. */
const isMain = (() => {
  try {
    return resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isMain) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const check = args.includes("--check") || !write;
  const problems = checkCues();
  if (check) printTable(CUES);
  if (problems.length) {
    console.log(`PROBLEMS (${problems.length}):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  if (check) console.log("check: every rule passes");
  if (write) {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(SRT, toSrt());
    writeFileSync(VTT, toVtt());
    console.log(`wrote ${SRT}\nwrote ${VTT}`);
  }
}
