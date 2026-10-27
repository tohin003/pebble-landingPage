// THE CODA'S CHECKS (the post-credit scene, setpieces/coda.ts; POSTCREDIT_DESIGN §5; OVERRIDES §62), run by
// setpieces/qa.ts checkPlan() on the coda's plan only, each with a canary in tests/coda.test.ts that fails on the bad
// case:
//   codaWords     C1: the coda's own words carry none of §62's four phrases (and their forms), no number, no version,
//                 no date or time word, nothing that says it is out or part of a release, no comparison, no model or
//                 company name, and nothing from the house never-list. Its captions, description and transcript too
//   codaHolds     C3: each line held for its reading time from its landing (the key line 2 s; the promise and its
//                 limit together 2.5 s and their 10 words' own read); read in order at 3.14 words a second at most (3.0
//                 flags), every line read before the film ends; the lines land one at a time, in order
//   codaStone     C4: one stone. The closing iris closes onto the end card's stone and covers it wholly before the coda's
//                 stone first shows; the coda shows one stone, and never two on one frame (the irises modelled as drawn)
//   codaCamera    C7: the camera never fully stops, except in the two declared waits: the breath (no camera at all, the
//                 frame all night green) and the film's last breath (the end, after the push has eased; at most 0.5 s).
//                 The push moves from the shot's first frame and never arrives and holds before its ease; under the
//                 iris-out the end card's page carries on as it left it (settled in its own last breath), never restarting
//   codaPose      C5: the Companion's resting pose only (sleepy, never the catalogue `sleep`), the engine created in it,
//                 the dark palette; shown for less than the app's 8-s hold; the planned blink where the plan puts it,
//                 none in the keep-clear spans, never mid-blink on the last frame
//   codaNoUi      C6: no mock screen: no planes, takes, cascades, walls, fields or rings; only the ground, the stone, the
//                 lines and the two irises
//   codaLockup    the lines never sit on the stone or its z's while they are on screen
//   codaFlashes   C8: no flash: no tile of the frame (6 × 6, WCAG's area) and not the whole frame makes an opposing pair
//                 of large luminance changes within a second (the iris-out's fall is the one large change)
//   codaSound     C11, the plan's half: one one-shot (the tap, CC0, never Mixkit) within a frame of L-C2's landing, and
//                 room tone over every frame; no music
//   codaCaptions  C12, the plan's half: each caption cue 1.2 s or more, carrying each line's words exactly
//   codaLight     the night ground (POSTCREDIT_DESIGN §3.5, §3.9): the plate's measured median at its exposure, under
//                 the coda's light, within ΔE 5 of the site's dark --bg, which the footer sits on; never black
// The film's half of C10 (the X cut) is coda.ts codaPlacement(), run on the film's pieces (tests/coda.test.ts). For the
// render's stone scan, codaMarkStones() gives reel-marks.ts the stones as CodaView draws them (the closing iris, and the
// sleeping stone light on the night ground, which qa/reel-scan.ts finds on the inverted frame).
// Pure; no React.
import { CAMERA_FLOOR_PX_PER_FRAME_1080, type Finding } from "../qa/checks";
import { COLOR, READING, f60 } from "../tokens";
import { screenVelocity } from "../motion/camera";
import type { Point } from "../motion/geometry";
import { deltaE, gradeAt, hexToRgb, relLuminance, rgbToHex } from "../light/grades";
import { requiredHoldS, wordCount } from "../type/reading";
import { HOLD_SECONDS } from "../../../../shared/pebble/character";
import { checkCues } from "../../../../shared/pebble/cues";
import { BLINK_S, blinkStartsFor, blinkTouches } from "./blink";
import { carriedRect } from "./kit";
import { defaultEntranceOf, enterFramesOf, lineRect } from "./frame";
import { CODA_STONE_COLORS, codaFlashModel, codaIrisIn, codaIrisOut, codaOf, plateUnder, stoneExtent, type CodaExtra } from "./coda";
import type { ScenePlan, ShotSpec, TypeSpec } from "./scene";

/* ---------------------------------------------------------------- C1: the words ------------------------------- */

/** §62's four phrases and their forms (the same expressions as the site's copy lint and src/content/next.ts). */
export const CODA_NEVER_PHRASES: readonly RegExp[] = [/\brewr[io]t\w*\b.{0,20}\bmemor/i, /\bnever forget/i, /\blearn\w*\s+everything/i, /\bsmarter\b/i, /\bevery night\b/i];

/**
 * Everything the coda may never say (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1's list), each with why: the page's hint is
 * held to the same rules (src/content/next.ts NEXT_NEVER), so the film and the page say the coming feature one way.
 */
export const CODA_NEVER: readonly { re: RegExp; why: string }[] = [
  ...CODA_NEVER_PHRASES.map((re) => ({ re, why: "one of §62's four phrases" })),
  { re: /\d/, why: "a number (a version, a date, a price, a rate)" },
  { re: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|double|half|percent)\b/i, why: "a number word" },
  { re: /[%×]/, why: "a number sign" },
  { re: /\bv\d|\bversion\b|\brelease\b|\bupdate\b/i, why: "a version or a release" },
  { re: /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/, why: "a month" },
  { re: /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/, why: "a weekday" },
  { re: /\b(today|tomorrow|tonight|weekend|spring|summer|autumn|fall|winter|quarter)\b/i, why: "a time word" },
  { re: /\b(next|this)\s+(week|month|year|season)\b/i, why: "a date" },
  { re: /\blater this\b|\bcoming (days|weeks|months)\b|\b(in|by) (early|mid|late)\b/i, why: "a window" },
  { re: /\b(available|out now|now|included|includes|ships|shipped|in this release)\b/i, why: "says it is out or part of a release" },
  { re: /\b(better|faster|cheaper|more accurate)\b/i, why: "a comparison" },
  { re: /\b(OpenAI|ChatGPT|GPT|Anthropic|Claude|Codex|Cursor|Copilot|Devin|Windsurf|Aider|Cline|Google|Gemini|Meta|Llama|Mistral|Qwen|DeepSeek|xAI|Grok|Microsoft|Apple)\b/i, why: "a model or company name" },
  { re: /[!·•]/, why: "the never-list's marks" },
  { re: /\b[A-Z]{2,}\b/, why: "a word in capitals" },
  { re: /\p{Extended_Pictographic}/u, why: "an emoji" },
];

/** Why a text breaks the coda's word rules (empty when it passes). */
export const forbiddenIn = (text: string): string[] => CODA_NEVER.filter((x) => x.re.test(text)).map((x) => `"${text.match(x.re)![0]}" (${x.why})`);

/** C1: every line the coda shows besides the end card's carried lines, and its captions, description and transcript. */
export function codaWords(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const carried = new Set(x.carried);
  for (const t of p.types) {
    if (carried.has(t.id)) {
      // the end card's own lines are let through only as they leave: begun before the coda and gone by the iris-out
      if (!(t.at < 0 && t.exitAt !== undefined && t.exitAt <= x.irisOut.at)) out.push({ check: "codaWords", level: "error", message: `${t.id} is carried in from the end card but does not leave with it (it must start before the coda and exit by L${x.irisOut.at})`, frame: Math.max(0, t.at) });
      continue;
    }
    for (const why of forbiddenIn(t.text)) out.push({ check: "codaWords", level: "error", message: `${t.id} "${t.text.replace(/\n/g, " ")}": ${why} (OVERRIDES §62)`, frame: t.at });
  }
  const texts: [string, string][] = [
    ...x.captions.map((c, i) => [`caption ${i + 1}`, c.text.replace(/^\[[^\]]*\]\n?/, "")] as [string, string]),
    ["the description", x.text.description],
    ["the transcript", x.text.transcript],
  ];
  for (const [where, text] of texts) for (const why of forbiddenIn(text)) out.push({ check: "codaWords", level: "error", message: `${where} "${text}": ${why} (OVERRIDES §62)` });
  return out;
}

/* ---------------------------------------------------------------- C3: reading holds --------------------------- */

/** A line's frames: when its entrance starts, when it has landed, when it leaves the screen (the piece's end if held). */
const spanOf = (t: TypeSpec, p: ScenePlan) => {
  const landed = t.at + enterFramesOf(t.entrance ?? defaultEntranceOf(t.tier), t.text, p.fps);
  return { from: t.at, landed, until: t.exitAt ?? p.duration };
};

/**
 * C3: from its landing, each line is held for its reading time (READING's formula; the key line 2 s); the promise and its
 * limit are on screen together for 2.5 s and for their own read; a reader taking the lines in order at 3.14 words a
 * second (3.0 flags) finishes each before it leaves; the lines land one at a time, in order (none on another's frame).
 */
export function codaHolds(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const lines = x.lines.map((id) => p.types.find((t) => t.id === id)).filter((t): t is TypeSpec => !!t);
  if (lines.length !== x.lines.length) out.push({ check: "codaHolds", level: "error", message: `the coda shows ${lines.length} of its ${x.lines.length} lines` });
  const spans = lines.map((t) => ({ t, ...spanOf(t, p), words: wordCount(t.text) }));
  for (const s of spans) {
    const need = requiredHoldS(s.words, { key: s.t.key });
    const held = (s.until - s.landed) / p.fps;
    if (held + 1e-9 < need) out.push({ check: "codaHolds", level: "error", message: `${s.t.id} "${s.t.text.replace(/\n/g, " ")}" is held ${held.toFixed(2)} s from its landing; it needs ${need.toFixed(2)} s`, frame: s.landed, to: s.until });
  }
  for (const s of spans) {
    if (!s.t.pairWith) continue;
    const y = spans.find((z) => z.t.id === s.t.pairWith);
    if (!y) {
      out.push({ check: "codaHolds", level: "error", message: `${s.t.id} pairs with ${s.t.pairWith}, which the coda does not show` });
      continue;
    }
    const together = (Math.min(s.until, y.until) - Math.max(s.landed, y.landed)) / p.fps;
    const need = Math.max(READING.pairMinS, requiredHoldS(s.words + y.words));
    if (together + 1e-9 < need) out.push({ check: "codaHolds", level: "error", message: `the promise ${s.t.id} and its limit ${y.t.id} are on screen together ${together.toFixed(2)} s from their landing; they need ${need.toFixed(2)} s (2.5 s, and their ${s.words + y.words} words' read)`, frame: Math.max(s.landed, y.landed) });
  }
  // the reading queue: each line is read once it has landed and the one before it is read
  const order = [...spans].sort((a, b) => a.landed - b.landed);
  for (const wps of [READING.maxWordsPerSecond, READING.flagWordsPerSecond]) {
    let done = -Infinity;
    for (const s of order) {
      done = Math.max(done, s.landed) + (s.words / wps) * p.fps;
      if (done > s.until + 1e-9) {
        out.push({ check: "codaHolds", level: wps === READING.maxWordsPerSecond ? "error" : "warn", message: `read in order at ${wps} words a second, ${s.t.id} is read by frame ${Math.ceil(done)}, after it leaves (${s.until}): too many words land too late`, frame: s.landed, to: Math.ceil(done) });
        break;
      }
    }
  }
  for (let i = 1; i < order.length; i++) {
    if (order[i]!.t.id !== lines[i]!.id) out.push({ check: "codaHolds", level: "error", message: `the lines land out of order (${order.map((s) => s.t.id).join(", ")})` });
    if (order[i]!.landed - order[i - 1]!.landed < f60(8, p.fps)) out.push({ check: "codaHolds", level: "error", message: `${order[i - 1]!.t.id} and ${order[i]!.t.id} land ${order[i]!.landed - order[i - 1]!.landed} frames apart: one beat at a time (at least 8 frames)`, frame: order[i]!.landed });
  }
  return out;
}

/* ---------------------------------------------------------------- C4: one stone ------------------------------- */

/** The share of a disc (centre c, radius r) inside a circle (centre o, radius e), by sampling. */
const discInside = (c: { x: number; y: number }, r: number, o: { x: number; y: number }, e: number): number => {
  if (e <= 0) return 0;
  const d = Math.hypot(c.x - o.x, c.y - o.y);
  if (d + r <= e) return 1;
  if (d - r >= e) return 0;
  let n = 0;
  let k = 0;
  for (let j = 0; j < 15; j++)
    for (let i = 0; i < 15; i++) {
      const px = c.x - r + ((i + 0.5) * 2 * r) / 15;
      const py = c.y - r + ((j + 0.5) * 2 * r) / 15;
      if (Math.hypot(px - c.x, py - c.y) > r) continue;
      n++;
      if (Math.hypot(px - o.x, py - o.y) <= e) k++;
    }
  return n ? k / n : 0;
};

/** The stones the coda shows on a frame, with the share of each the irises leave in view (the irises as drawn). */
export function codaStonesOn(p: ScenePlan, x: CodaExtra, fr: number): { shot: string; share: number; c: { x: number; y: number }; r: number }[] {
  const out: { shot: string; share: number; c: { x: number; y: number }; r: number }[] = [];
  const { w, h } = p.frame;
  for (const s of p.shots) {
    if (!s.stone) continue;
    // a shot's stone shows while its shot is drawn: the page through the iris-out, every later shot from its first frame
    const drawn = s.id === "page" ? fr < x.irisOut.at + x.irisOut.frames : fr >= s.from && fr < s.to;
    if (!drawn) continue;
    const pose = s.camera.pose(fr - s.from);
    const c = { x: w / 2 + (s.stone.at.x - pose.x) * pose.zoom, y: h / 2 + (s.stone.at.y - pose.y) * pose.zoom };
    const r = s.stone.r * pose.zoom;
    let share = 1;
    if (s.id === "page") {
      const o = codaIrisOut(p, fr);
      if (o) share = discInside(c, r, o.c, o.edge);
    } else if (s.id === "coda") {
      const i = codaIrisIn(p, fr);
      if (i) share = discInside(c, r, i.c, i.edge);
    } else share = 0; // any other shot is under the night green (codaStone refuses a stone there anyway)
    if (share > 0.01) out.push({ shot: s.id, share, c, r });
  }
  return out;
}

/**
 * C4: one stone. The iris-out closes onto the end card's stone (its centre on the stone's face as it shuts) and the
 * frame is all night green before the coda's stone first shows; the coda's world has exactly one stone, and no frame
 * shows two (the irises modelled as CodaView draws them: setpieces/qa.ts stoneCount models only an opening iris).
 */
export function codaStone(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const page = p.shots.find((s) => s.id === "page");
  const coda = p.shots.find((s) => s.id === "coda");
  if (!page?.stone || !coda?.stone) out.push({ check: "codaStone", level: "error", message: "the coda needs the end card's stone in its page shot and its own stone in its coda shot" });
  for (const s of p.shots) if (s.stone && s.id !== "page" && s.id !== "coda") out.push({ check: "codaStone", level: "error", message: `${s.id} draws a stone of its own: the coda shows one stone (the end card's, then the same stone asleep)` });
  const shut = x.irisOut.at + x.irisOut.frames;
  if (x.irisIn.at < shut) out.push({ check: "codaStone", level: "error", message: `the iris-in starts on L${x.irisIn.at}, before the iris-out has shut (L${shut}): the end card's stone still shows as the coda's opens`, frame: x.irisIn.at, to: shut });
  if (page?.stone) {
    const last = codaIrisOut(p, shut - 1);
    const st = codaStonesOn(p, x, shut - 1).find((s) => s.shot === "page");
    if (last && st && Math.hypot(last.c.x - st.c.x, last.c.y - st.c.y) > st.r * 0.5) out.push({ check: "codaStone", level: "error", message: "the iris-out does not close onto the end card's stone's face", frame: shut - 1 });
  }
  let firstCoda = -1;
  let lastPage = -1;
  for (let fr = 0; fr < p.duration; fr++) {
    const on = codaStonesOn(p, x, fr);
    if (on.some((s) => s.shot === "page")) lastPage = fr;
    if (firstCoda < 0 && on.some((s) => s.shot === "coda")) firstCoda = fr;
    if (on.length > 1) {
      out.push({ check: "codaStone", level: "error", message: `two stones on frame ${fr} (${on.map((s) => `${s.shot} ${Math.round(s.share * 100)} %`).join(", ")}): one stone only`, frame: fr });
      break;
    }
  }
  if (firstCoda >= 0 && lastPage >= firstCoda) out.push({ check: "codaStone", level: "error", message: `the end card's stone shows until L${lastPage}, after the coda's first shows (L${firstCoda})`, frame: firstCoda });
  return out;
}

/**
 * The coda's stones on a frame as CodaView draws them, for the render's stone scan (setpieces/tools/reel-marks.ts): the
 * end card's stone through the closing iris, which setpieces/qa.ts stonesOnFrame() takes for a swap and drops by about
 * L14 while the render shows it to L31; and the sleeping stone through the opening iris and after, marked `light` (the
 * page's dark palette: a light stone on the night ground, which the scan's dark-blob search cannot see, so
 * qa/reel-scan.ts looks for it on the inverted frame). Kept from a quarter shown, as stonesOnFrame() keeps them; null on
 * a plan that is not the coda.
 */
export function codaMarkStones(p: ScenePlan, fr: number, minShare = 0.25): { shot: string; c: Point; r: number; share: number; light: boolean }[] | null {
  const x = codaOf(p);
  if (!x) return null;
  return codaStonesOn(p, x, fr)
    .filter((s) => s.share >= minShare)
    .map((s) => ({ ...s, light: s.shot === "coda" && x.stone.palette === "dark" }));
}

/* ---------------------------------------------------------------- C7: the camera ------------------------------ */

/** The fastest corner of the frame under a shot's camera on a local frame, px a frame at 1080. */
const cornerPx = (p: ScenePlan, s: ShotSpec, fr: number): number => {
  const smp = s.camera.sample(fr - s.from);
  const { w, h, unit } = p.frame;
  let m = 0;
  for (const q of [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ]) {
    const v = screenVelocity(smp, q, w, h);
    m = Math.max(m, Math.hypot(v.x, v.y));
  }
  return m / unit / (60 / p.fps);
};

/**
 * C7: the camera never fully stops (OVERRIDES §52, §58), outside exactly two declared waits: the breath (no camera, the
 * frame all night green: no picture to move) and the film's last breath (the end, at most 0.5 s, after the push has
 * eased, the camera dead still). The coda's push moves from its first frame and never drops under the floor before its
 * ease (no arrive and hold), and the ease only slows. The end card's page carries on under the iris-out exactly as the
 * end card left it: settled in its own declared last breath (finale.ts: the X cut ends there, so nothing before L0 may
 * change), it never starts moving again (every second there overlaps the breath, so the floor does not judge it).
 */
export function codaCamera(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const floor = CAMERA_FLOOR_PX_PER_FRAME_1080;
  const waits = p.shots.flatMap((s) => (s.waits ?? []).map((w) => ({ ...w, shot: s.id })));
  const want = [
    { ...x.breath, shot: "breath" },
    { ...x.lastBreath, shot: "coda" },
  ];
  const same = waits.length === want.length && want.every((w) => waits.some((v) => v.shot === w.shot && v.from === w.from && v.to === w.to));
  if (!same) out.push({ check: "codaCamera", level: "error", message: `the coda declares waits ${waits.map((w) => `${w.shot} ${w.from}–${w.to}`).join(", ") || "none"}: exactly two are allowed, the breath (${x.breath.from}–${x.breath.to}) and the last breath (${x.lastBreath.from}–${x.lastBreath.to})` });
  if (x.lastBreath.to !== p.duration) out.push({ check: "codaCamera", level: "error", message: `the last breath ends on ${x.lastBreath.to}, not the film's end (${p.duration}): only the film's last breath may be still (§58)` });
  if (x.lastBreath.to - x.lastBreath.from > f60(30, p.fps)) out.push({ check: "codaCamera", level: "error", message: `the last breath lasts ${((x.lastBreath.to - x.lastBreath.from) / p.fps).toFixed(2)} s (at most 0.5 s)` });
  const breath = p.shots.find((s) => s.id === "breath");
  if (breath) {
    if (breath.planes.length || breath.stone) out.push({ check: "codaCamera", level: "error", message: "the breath shows something: it is all night green, so its still camera shows nothing still" });
    for (const t of p.types) {
      const sp = spanOf(t, p);
      if (sp.from < x.breath.to && sp.until > x.breath.from && !x.carried.includes(t.id)) out.push({ check: "codaCamera", level: "error", message: `${t.id} is on screen in the breath: a line would sit still on the night green`, frame: Math.max(sp.from, x.breath.from) });
    }
  }
  const coda = p.shots.find((s) => s.id === "coda");
  if (coda) {
    if (cornerPx(p, coda, coda.from) < floor) out.push({ check: "codaCamera", level: "error", message: `the coda's camera is not moving on its first frame (${cornerPx(p, coda, coda.from).toFixed(3)} px a frame): the push starts with the shot`, frame: coda.from });
    let stopped = -1;
    for (let fr = coda.from; fr < x.push.ease; fr++) {
      const v = cornerPx(p, coda, fr);
      if (v < floor - 1e-9) {
        if (stopped < 0) stopped = fr;
      } else if (stopped >= 0) {
        out.push({ check: "codaCamera", level: "error", message: `the coda's camera drops under ${floor} px a frame at its corners on L${stopped}–L${fr} and moves again: never arrive and hold before the film's last breath`, frame: stopped, to: fr });
        stopped = -1;
      }
    }
    if (stopped >= 0) out.push({ check: "codaCamera", level: "error", message: `the coda's camera stops on L${stopped}, before its ease (L${x.push.ease}): never arrive and hold`, frame: stopped, to: x.push.ease });
    let prev = Infinity;
    for (let fr = x.push.ease; fr < x.push.still; fr++) {
      const v = cornerPx(p, coda, fr);
      if (v > prev + 1e-6) {
        out.push({ check: "codaCamera", level: "error", message: `the push speeds up again in its ease (L${fr})`, frame: fr });
        break;
      }
      prev = v;
    }
    for (let fr = x.lastBreath.from; fr < x.lastBreath.to; fr++) {
      const v = cornerPx(p, coda, fr);
      if (v > 0.01) {
        out.push({ check: "codaCamera", level: "error", message: `the camera still moves in the declared last breath (${v.toFixed(3)} px a frame on L${fr}): a declared wait is still`, frame: fr });
        break;
      }
    }
  }
  // the page is the end card's own camera carried on (the joins check holds the join): it settled in the end card's own
  // declared last breath, which every cut shows (the X cut ends there), so under the iris-out it never starts again
  const page = p.shots.find((s) => s.id === "page");
  if (page) {
    const settled = cornerPx(p, page, 0);
    for (let fr = 1; fr < x.irisOut.at + x.irisOut.frames; fr++)
      if (cornerPx(p, page, fr) > settled + 0.01) {
        out.push({ check: "codaCamera", level: "error", message: `the end card's page starts moving again under the iris-out (L${fr}: ${cornerPx(p, page, fr).toFixed(3)} px a frame, from ${settled.toFixed(3)}): it carries on as the end card left it`, frame: fr });
        break;
      }
  }
  return out;
}

/* ---------------------------------------------------------------- C5: the pose -------------------------------- */

/**
 * C5: the Companion's resting pose only, never the engine's catalogue `sleep` (D6), the engine created in it (no morph:
 * found asleep), in the dark palette; shown for less than the app's own 8-s hold (Avatar.vue HOLD_SECONDS: a calm pose
 * settles to a still frame after it, so the film never shows motion the app would have stopped); the planned blink
 * where the plan puts it (within a frame), no blink in the keep-clear spans, and never mid-blink on the film's last frame.
 */
export function codaPose(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const coda = p.shots.find((s) => s.id === "coda");
  const st = coda?.stone;
  if (!coda || !st) return out;
  for (const m of checkCues(st.cues, "the coda's cues")) out.push({ check: "codaPose", level: "error", message: m });
  for (const c of st.cues) if (c.pose !== undefined && c.pose !== "sleepy") out.push({ check: "codaPose", level: "error", message: `the coda's stone takes the pose "${c.pose}": only the Companion's resting pose (sleepy, row 17) is the material (§62)` });
  if (x.stone.initialPose !== "sleepy") out.push({ check: "codaPose", level: "error", message: `the coda's engine starts in "${x.stone.initialPose}": it is created asleep, so no morph plays` });
  if (x.stone.palette !== "dark" || x.stone.colors.body !== CODA_STONE_COLORS.body || x.stone.colors.eye !== CODA_STONE_COLORS.eye) out.push({ check: "codaPose", level: "error", message: "the coda's stone is not in the page's dark palette (#B4CDA6, eyes #23351F)" });
  const shown = (p.duration - x.irisIn.at) / p.fps;
  if (shown + 1e-9 >= HOLD_SECONDS) out.push({ check: "codaPose", level: "error", message: `the sleeping stone is shown ${shown.toFixed(2)} s: the app holds a calm pose still after ${HOLD_SECONDS} s, so the film shows it for less` });
  const off = st.clockOffset ?? 0;
  const blinks = blinkStartsFor(off, p.fps, x.irisIn.at, p.duration);
  if (!blinks.some((b) => Math.abs(b - x.stone.blink.target) <= 1)) out.push({ check: "codaPose", level: "error", message: `no engine blink starts on L${x.stone.blink.target} (the plan's blink); its blinks start on ${blinks.map((b) => `L${b.toFixed(1)}`).join(", ") || "none"}` });
  for (const b of blinks) for (const k of x.stone.blink.keepClear) if (blinkTouches(b, p.fps, k)) out.push({ check: "codaPose", level: "error", message: `a blink on L${b.toFixed(1)} falls in L${k.from}–L${k.to} (${k.why ?? "kept clear"})`, frame: Math.floor(b) });
  const lastStart = blinks.filter((b) => b <= p.duration - 1).pop();
  if (lastStart !== undefined && lastStart + BLINK_S * p.fps > p.duration - 1) out.push({ check: "codaPose", level: "error", message: `the film ends mid-blink (a blink starts on L${lastStart.toFixed(1)})`, frame: p.duration - 1 });
  return out;
}

/* ---------------------------------------------------------------- C6: no mock screen -------------------------- */

/** C6: the coda draws no interface at all: no planes, takes, cascades, walls, fields or rings. */
export function codaNoUi(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  if (p.takes.length) out.push({ check: "codaNoUi", level: "error", message: `the coda uses ${p.takes.length} take(s): no screen of the feature (§62: its interface isn't designed yet)` });
  for (const s of p.shots) {
    const what = [s.planes.length ? `${s.planes.length} plane(s)` : "", s.cascade ? "a cascade" : "", s.wall ? "a wall" : "", s.returnField ? "a field of screens" : "", s.rings.length ? `${s.rings.length} ring(s)` : "", s.reads?.length ? "reads" : "", s.aperture ? "an aperture" : ""].filter(Boolean);
    if (what.length) out.push({ check: "codaNoUi", level: "error", message: `${s.id} draws ${what.join(", ")}: the coda shows only the ground, the stone, its lines and the two irises (no mock screen, §62)`, frame: s.from });
  }
  return out;
}

/* ---------------------------------------------------------------- the lockup ---------------------------------- */

/** The lockup's centre may sit this share of its width off the frame's centre. */
export const CODA_LOCKUP_CENTRE_SHARE = 0.02;

/**
 * The lockup: the lines never sit on the stone or its z's (POSTCREDIT_DESIGN §3.4), on any frame they are on screen; and
 * the lockup (the stone's extent with the lines' rects, measured where the layout depends on their widths: coda.ts
 * CODA_INK_EM_16x9) is centred across the frame, within 2 % of its width, once every line has landed (the push zooms
 * about the frame's centre, so it stays centred). The 16:9 lines placed by approxLineWidth's estimate left the drawn
 * lockup 150 px left of centre (the renders of 28 Oct).
 */
export function codaLockup(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const coda = p.shots.find((s) => s.id === "coda");
  if (!coda?.stone) return out;
  const shown = x.lines.map((id) => p.types.find((y) => y.id === id)).filter((t): t is TypeSpec => !!t);
  if (shown.length) {
    const fr = Math.min(p.duration - 1, Math.max(...shown.map((t) => spanOf(t, p).landed)));
    const pose = coda.camera.pose(fr - coda.from);
    const c = { x: p.frame.w / 2 + (coda.stone.at.x - pose.x) * pose.zoom, y: p.frame.h / 2 + (coda.stone.at.y - pose.y) * pose.zoom };
    const e = stoneExtent(c, coda.stone.size * pose.zoom);
    let x0 = e.x;
    let x1 = e.x + e.w;
    for (const t of shown) {
      const r = carriedRect(p, t, lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5), fr);
      x0 = Math.min(x0, r.x);
      x1 = Math.max(x1, r.x + r.w);
    }
    const off = (x0 + x1) / 2 - p.frame.w / 2;
    if (Math.abs(off) > CODA_LOCKUP_CENTRE_SHARE * (x1 - x0)) out.push({ check: "codaLockup", level: "error", message: `the lockup (the stone and its lines, ${Math.round(x0)}–${Math.round(x1)} px on frame ${fr}) sits ${Math.abs(off).toFixed(0)} px ${off < 0 ? "left" : "right"} of the frame's centre: centred within ${CODA_LOCKUP_CENTRE_SHARE * 100} % of its width`, frame: fr });
  }
  for (const id of x.lines) {
    const t = p.types.find((y) => y.id === id);
    if (!t) continue;
    const r0 = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5);
    const sp = spanOf(t, p);
    for (let fr = Math.max(sp.from, coda.from); fr < sp.until; fr += 3) {
      const r = carriedRect(p, t, r0, fr);
      const pose = coda.camera.pose(fr - coda.from);
      const c = { x: p.frame.w / 2 + (coda.stone.at.x - pose.x) * pose.zoom, y: p.frame.h / 2 + (coda.stone.at.y - pose.y) * pose.zoom };
      const e = stoneExtent(c, coda.stone.size * pose.zoom);
      if (r.x < e.x + e.w && e.x < r.x + r.w && r.y < e.y + e.h && e.y < r.y + r.h) {
        out.push({ check: "codaLockup", level: "error", message: `${t.id} "${t.text.replace(/\n/g, " ")}" sits on the stone or its z's on frame ${fr}`, frame: fr });
        break;
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- C8, C11, C12 -------------------------------- */

/** C8: no flash anywhere in the coda (coda.ts codaFlashModel: the irises and the scene, tile by tile). */
export const codaFlashes = (p: ScenePlan): Finding[] => codaFlashModel(p).findings;

/** C11, the plan's half (the score lane's layer check measures the mix): room tone everywhere, one CC0 tap on L-C2. */
export function codaSound(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const s = x.sound;
  if (s.roomTone.from > 0 || s.roomTone.to < p.duration) out.push({ check: "codaSound", level: "error", message: `room tone covers ${s.roomTone.from}–${s.roomTone.to}, not every frame (never digital silence)` });
  const l2 = p.types.find((t) => t.id === "L-C2");
  if (l2 && Math.abs(s.tap.at - spanOf(l2, p).landed) > 1) out.push({ check: "codaSound", level: "error", message: `the tap peaks on L${s.tap.at}, not within a frame of L-C2's landing (L${spanOf(l2, p).landed})` });
  if (/mixkit/i.test(`${s.tap.take} ${s.tap.licence} ${s.roomTone.take} ${s.roomTone.licence}`)) out.push({ check: "codaSound", level: "error", message: "a Mixkit take: the coda's sound is CC0 or ours (OVERRIDES §55, §60)" });
  if (!/\bCC0\b|\bours\b/.test(s.tap.licence)) out.push({ check: "codaSound", level: "error", message: `the tap's licence is "${s.tap.licence}": CC0 or ours only` });
  if (p.music.length || p.hits.length) out.push({ check: "codaSound", level: "error", message: "the coda places music events: the music's ending is a real ending (§62)" });
  return out;
}

/** C12, the plan's half: each caption cue holds 1.2 s or more and the cues carry the coda's lines word for word. */
export function codaCaptions(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  for (const [i, c] of x.captions.entries()) if ((c.to - c.from) / p.fps + 1e-9 < 1.2) out.push({ check: "codaCaptions", level: "error", message: `caption ${i + 1} "${c.text}" holds ${((c.to - c.from) / p.fps).toFixed(2)} s (at least 1.2 s)` });
  const all = x.captions.map((c) => c.text).join(" ");
  for (const id of x.lines) {
    const t = p.types.find((y) => y.id === id);
    if (t && !all.includes(t.text.replace(/\n/g, " "))) out.push({ check: "codaCaptions", level: "error", message: `the captions do not carry ${id} "${t.text.replace(/\n/g, " ")}" word for word` });
  }
  return out;
}

/* ---------------------------------------------------------------- the light ----------------------------------- */

/** The night ground sits within this ΔE (CIE76) of the site's dark --bg (POSTCREDIT_DESIGN §3.5). */
export const CODA_LIGHT_MAX_DE = 5;

/**
 * The night ground's light: the plate's measured median (coda.ts CODA_PLATE.median) at its exposure, under the light the
 * coda's shot is drawn in (its light cue, under the breath), sits within ΔE 5 of the dark --bg (#191E1B) the site's
 * footer sits on, so the film's last frame is the site's footer at night (POSTCREDIT_DESIGN §3.9); never black. The
 * renders of 28 Oct drew the plate as it comes, and the last frame's ground measured ΔE 8.0–9.4 away.
 */
export function codaLight(p: ScenePlan, x: CodaExtra): Finding[] {
  const coda = p.shots.find((s) => s.id === "coda");
  if (!coda) return [];
  const c = plateUnder(gradeAt(coda.from, p.lightInitial, p.lightCues), x.ground);
  const bg = hexToRgb(COLOR.nightPage);
  const dE = deltaE(c, bg);
  if (dE <= CODA_LIGHT_MAX_DE) return [];
  const how = relLuminance(c) < relLuminance(bg) ? "darker, toward black (night green, never black)" : "lighter";
  return [{ check: "codaLight", level: "error", message: `the night ground's median under the coda's light is ${rgbToHex(c)}, ΔE ${dE.toFixed(1)} from the dark --bg ${COLOR.nightPage} the site's footer sits on, ${how}: at most ${CODA_LIGHT_MAX_DE}`, frame: coda.from }];
}

/* ---------------------------------------------------------------- all of them --------------------------------- */

/** The coda's checks, by name (for reports). */
export const CODA_CHECKS = ["codaWords", "codaHolds", "codaStone", "codaCamera", "codaPose", "codaNoUi", "codaLockup", "codaFlashes", "codaSound", "codaCaptions", "codaLight"] as const;

/** Every coda check on a plan (none on a plan that is not the coda). */
export function codaChecks(p: ScenePlan): Finding[] {
  const x = codaOf(p);
  if (!x) return [];
  return [...codaWords(p, x), ...codaHolds(p, x), ...codaStone(p, x), ...codaCamera(p, x), ...codaPose(p, x), ...codaNoUi(p), ...codaLockup(p, x), ...codaFlashes(p), ...codaSound(p, x), ...codaCaptions(p, x), ...codaLight(p, x)];
}
