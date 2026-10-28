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
//   codaCamera    C7: the camera never fully stops, except in the two declared waits: §62's one breath of silence (L0 to
//                 the iris-in: the iris-out over the settled page and the night-green breath, one wait, the lead's ruling
//                 (a), OVERRIDES §65) and the film's last breath (the end, after the push has eased; at most 0.5 s); a
//                 still frame before the push that no wait declares fails. The push moves from the shot's first frame and
//                 never arrives and holds before its ease; under the iris-out the end card's page carries on as it left it
//                 (settled in its own last breath), never restarting
//   codaPose      C5: the Companion's resting pose only (sleepy, never the catalogue `sleep`), the engine created in it,
//                 the dark palette; shown for less than the app's 8-s hold; the planned blink where the plan puts it,
//                 none in the keep-clear spans, never mid-blink on the last frame
//   codaNoUi      C6: no mock screen: no planes, takes, cascades, walls, fields or rings; only the ground, the stone, the
//                 lines and the two irises; and no hairline the view draws round the sleeping stone (a ring leaving it)
//   codaLockup    the lines never sit on the stone or its z's while they are on screen
//   codaFlashes   C8: no flash: no tile of the frame (6 × 6, WCAG's area) and not the whole frame makes an opposing pair
//                 of large luminance changes within a second (the iris-out's fall is the one large change); and no rise
//                 before that fall: the end card's lines have no exit of their own, the closing iris takes them (§65, P2-1)
//   codaSound     C11, the plan's half: one one-shot (the tap, CC0, never Mixkit) within a frame of L-C2's landing, and
//                 room tone over every frame; no music; a warning while no lane builds the layer (the review's P1-3)
//   codaCaptions  C12, the plan's half: each caption cue 1.2 s or more, carrying each line's words exactly
//   codaLight     the night ground (POSTCREDIT_DESIGN §3.5, §3.9): the plate's measured median at its exposure, under
//                 the coda's light, within ΔE 5 of the site's dark --bg, which the footer sits on; never black
//   codaPlate     no riverbed pebble on the night plate reads larger than the sleeping stone, on any frame (§65 on P2-9:
//                 the plate's own pebble outlines, codaPlate.ts, as the frame shows them, against the stone's body)
// The film's half of C10 (the X cut) is coda.ts codaPlacement(), run on the film's pieces (tests/coda.test.ts). For the
// render's stone scan, codaMarkStones() gives reel-marks.ts the stones as CodaView draws them (the closing iris, and the
// sleeping stone light on the night ground, which qa/reel-scan.ts finds on the inverted frame).
// Pure; no React.
import { CAMERA_FLOOR_PX_PER_FRAME_1080, type Finding } from "../qa/checks";
import { COLOR, READING, RING, f60 } from "../tokens";
import { planePose, screenVelocity, worldToFrame } from "../motion/camera";
import type { Point } from "../motion/geometry";
import { deltaE, gradeAt, hexToRgb, relLuminance, rgbToHex } from "../light/grades";
import { requiredHoldS, wordCount } from "../type/reading";
import { COMING_NEVER, COMING_NEVER_PHRASES } from "../../../../shared/coming/never";
import { BODY, HOLD_SECONDS, VIEWBOX_SIZE } from "../../../../shared/pebble/character";
import { checkCues } from "../../../../shared/pebble/cues";
import { BLINK_S, blinkStartsFor, blinkTouches } from "./blink";
import { carriedRect } from "./kit";
import { defaultEntranceOf, enterFramesOf, lineRect } from "./frame";
import { CODA_STONE_COLORS, codaFlashModel, codaHairline, codaIrisIn, codaIrisOut, codaOf, codaOneShots, plateUnder, stoneExtent, type CodaExtra } from "./coda";
import { shotOf, type ScenePlan, type ShotSpec, type TypeSpec } from "./scene";
import { RIVERBED, groundRectOf } from "./ground";
import { CODA_PLATE_PEBBLES, PLATE_UNITS } from "./codaPlate";

/* ---------------------------------------------------------------- C1: the words ------------------------------- */

/** §62's four phrases and their forms (the same expressions as the site's copy lint and src/content/next.ts). */
export const CODA_NEVER_PHRASES: readonly RegExp[] = COMING_NEVER_PHRASES;

/**
 * Everything the coda may never say (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1's list), each with why: ONE rule set with
 * the page's hint (shared/coming/never.ts, which src/content/next.ts NEXT_NEVER reads too), so the film and the page say
 * the coming feature one way. (The two lists differed until the post-credit review's P2-3: plurals, "shipping", "a
 * build", the month abbreviations and "season" on one side or the other, and overclaims of memory on neither.)
 */
export const CODA_NEVER: readonly { re: RegExp; why: string }[] = COMING_NEVER;

/** Why a text breaks the coda's word rules (empty when it passes). */
export const forbiddenIn = (text: string): string[] => CODA_NEVER.filter((x) => x.re.test(text)).map((x) => `"${text.match(x.re)![0]}" (${x.why})`);

/** C1: every line the coda shows besides the end card's carried lines, and its captions, description and transcript. */
export function codaWords(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const carried = new Set(x.carried);
  const shut = x.irisOut.at + x.irisOut.frames;
  for (const t of p.types) {
    if (carried.has(t.id)) {
      // the end card's own lines are let through only as they leave with its page: begun before the coda, and taken by
      // the closing iris by its end (TypeSpec.covered; their own exits are codaFlashes', P2-1)
      if (!(t.at < 0 && t.covered && t.covered.to <= shut)) out.push({ check: "codaWords", level: "error", message: `${t.id} is carried in from the end card but does not leave with its page (it must start before the coda and be taken by the closing iris by L${shut})`, frame: Math.max(0, t.at) });
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
 * The waits a plan declares as the foundation's camera floor reads them (each shot's own waits, on the frames that shot
 * covers: setpieces/qa.ts planQa), joined where one shot's wait runs on into the next shot's: piece-local [from, to).
 */
export const joinedWaits = (p: ScenePlan): { from: number; to: number }[] => {
  const parts = p.shots
    .flatMap((s) => (s.waits ?? []).map((w) => ({ from: Math.max(w.from, s.from), to: Math.min(w.to, s.to) })))
    .filter((w) => w.to > w.from)
    .sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  for (const w of parts) {
    const last = out[out.length - 1];
    if (last && w.from <= last.to) last.to = Math.max(last.to, w.to);
    else out.push({ ...w });
  }
  return out;
};

/**
 * C7: the camera never fully stops (OVERRIDES §52, §58), outside exactly two declared waits: §62's one breath of
 * silence and the film's last breath (the end, at most 0.5 s, after the push has eased, the camera dead still). The
 * silence is the lead's ruling (a) on the post-credit review's P1-4 (OVERRIDES §65): the end card's true ending, then a
 * dark beat, L0 to the iris-in (the iris-out over the end card's page, settled, and the night-green breath), declared as
 * ONE wait; the end card keeps its own declared last breath before it, and the floor applies from the iris-in on. So a
 * still frame before the push that no wait declares fails: the main cut's span there (2.12 s as planned) passed the
 * foundation's floor unjudged, every one-second window in it overlapping a declared wait, until the review saw it. The
 * coda's push moves from its first frame and never drops under the floor before its ease (no arrive and hold), and the
 * ease only slows. The end card's page carries on under the iris-out exactly as the end card left it: settled in its own
 * declared last breath (finale.ts: the X cut ends there, so nothing before L0 may change), it never starts moving again.
 */
export function codaCamera(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const floor = CAMERA_FLOOR_PX_PER_FRAME_1080;
  const spans = joinedWaits(p);
  const want = [x.silence, x.lastBreath];
  const span = (w: { from: number; to: number }) => `L${w.from}–L${w.to - 1}`;
  const same = spans.length === want.length && want.every((w, i) => spans[i]!.from === w.from && spans[i]!.to === w.to);
  if (!same) out.push({ check: "codaCamera", level: "error", message: `the coda declares waits ${spans.map(span).join(", ") || "none"}: exactly two are allowed, §62's one breath of silence (${span(x.silence)}) and the film's last breath (${span(x.lastBreath)})` });
  if (x.silence.from !== 0 || x.silence.to !== x.irisIn.at) out.push({ check: "codaCamera", level: "error", message: `§62's one breath of silence is ${span(x.silence)}: it runs from the end card's true ending (L0) to the iris-in (L${x.irisIn.at}), the iris-out and the night-green breath as one wait, and the camera floor applies from the iris-in on (OVERRIDES §65, ruling (a))` });
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
  // before the push: a still frame no wait declares fails (the review's P1-4); the span as declared is reported
  const still = codaStillBeforePush(p, x);
  for (const u of still.undeclared) out.push({ check: "codaCamera", level: "error", message: `an undeclared still span, ${span(u)}: the picture holds still there (its camera under ${floor} px a frame at the corners, or the breath's flat night green) and no wait declares it; before the coda's push only §62's one breath of silence (L0 to the iris-in) may be still (OVERRIDES §58, §65)`, frame: u.from, to: u.to });
  if (!still.undeclared.length && still.frames > 0) {
    const parts = [still.endCard ? `the end card's own declared last breath (${(still.endCard / p.fps).toFixed(2)} s)` : "", still.coda ? `§62's one breath of silence, ${span({ from: 0, to: still.coda })}, declared (the iris-out over the settled page, then the breath)` : ""].filter(Boolean);
    out.push({ check: "codaCamera", level: "info", message: `in the main cut the picture holds still for ${(still.frames / p.fps).toFixed(2)} s before the coda's push: ${parts.join(", then ")}; the lead's ruling (a) on P1-4 (OVERRIDES §65)`, frame: 0, to: still.coda });
  }
  return out;
}

/**
 * The main cut's still span before the coda's push: the end card's own declared still at its end (`endCard` frames),
 * then the coda's frames from L0 while the picture holds still (`coda`: the carried page with its corners under the
 * floor through the iris-out, `page` of them, then the breath's flat night green, `breath`), to the iris-in at most;
 * and the runs of the coda's still frames before the iris-in that no wait declares (`undeclared`, as the foundation
 * reads a wait: the shot a frame falls in, its own waits).
 */
export function codaStillBeforePush(p: ScenePlan, x: CodaExtra): { frames: number; endCard: number; coda: number; page: number; breath: number; undeclared: { from: number; to: number }[] } {
  const page = p.shots.find((s) => s.id === "page");
  const shut = x.irisOut.at + x.irisOut.frames;
  const lb = x.endCard.lastBreath;
  const endCard = lb && lb.to >= x.endCard.end ? x.endCard.end - lb.from : 0;
  const stillOn = (fr: number) => (fr < shut && page ? cornerPx(p, page, fr) < CAMERA_FLOOR_PX_PER_FRAME_1080 : true);
  const declared = (fr: number) => {
    const s = shotOf(p, fr);
    return !!s && (s.waits ?? []).some((w) => fr >= w.from && fr < w.to);
  };
  let lead = 0;
  while (lead < x.irisIn.at && stillOn(lead)) lead++;
  const undeclared: { from: number; to: number }[] = [];
  for (let fr = 0; fr < x.irisIn.at; fr++) {
    if (!stillOn(fr) || declared(fr)) continue;
    const last = undeclared[undeclared.length - 1];
    if (last && last.to === fr) last.to = fr + 1;
    else undeclared.push({ from: fr, to: fr + 1 });
  }
  // a span counts from the join only if it touches it: a page moving on L0 breaks it there
  return { frames: lead > 0 ? endCard + lead : endCard, endCard, coda: lead, page: Math.min(lead, shut), breath: Math.max(0, lead - shut), undeclared };
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

/**
 * C6: the coda draws no interface at all: no planes, takes, cascades, walls, fields or rings; and no ring drawn as a seam:
 * no stroke the view draws (coda.ts codaHairline) is concentric with the sleeping stone (its centre on the stone's disc)
 * on any frame of the coda's shot. In this film a ring means Pebble is acting, so a ring opening from the sleeping stone
 * would show the unbuilt feature at work (POSTCREDIT_DESIGN §6). The shots' rings alone missed one: the opening iris's
 * sage hairline (the film's ring colour and width, over a ring's 36 emit frames) read as a ring leaving the stone on the
 * renders of 28 Oct (the post-credit review's P1-1).
 */
export function codaNoUi(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  if (p.takes.length) out.push({ check: "codaNoUi", level: "error", message: `the coda uses ${p.takes.length} take(s): no screen of the feature (§62: its interface isn't designed yet)` });
  for (const s of p.shots) {
    const what = [s.planes.length ? `${s.planes.length} plane(s)` : "", s.cascade ? "a cascade" : "", s.wall ? "a wall" : "", s.returnField ? "a field of screens" : "", s.rings.length ? `${s.rings.length} ring(s)` : "", s.reads?.length ? "reads" : "", s.aperture ? "an aperture" : ""].filter(Boolean);
    if (what.length) out.push({ check: "codaNoUi", level: "error", message: `${s.id} draws ${what.join(", ")}: the coda shows only the ground, the stone, its lines and the two irises (no mock screen, §62)`, frame: s.from });
  }
  const coda = p.shots.find((s) => s.id === "coda");
  if (coda?.stone && codaOf(p)) {
    const ringColours = new Set([RING.color.light, RING.color.dark].map((c) => c.toUpperCase()));
    for (let fr = coda.from; fr < p.duration; fr++) {
      const line = codaHairline(p, fr);
      if (!line) continue;
      const pose = coda.camera.pose(fr - coda.from);
      const c = worldToFrame(coda.stone.at, pose, p.frame.w, p.frame.h);
      if (Math.hypot(line.c.x - c.x, line.c.y - c.y) > coda.stone.r * pose.zoom) continue;
      const what = `${ringColours.has(line.color.toUpperCase()) ? "a ring-coloured" : "a"} hairline (${line.color}, ${(line.widthPx / p.frame.unit).toFixed(2)} px at 1080)`;
      out.push({ check: "codaNoUi", level: "error", message: `the ${line.iris === "in" ? "opening" : "closing"} iris draws ${what} round the sleeping stone from L${fr}: a ring opening from the sleeping stone is the film's ring, Pebble acting, so it shows the unbuilt feature at work (POSTCREDIT_DESIGN §6); the stone comes out of the dark through the feathered mask alone`, frame: fr });
      break;
    }
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

/**
 * C8: no flash anywhere in the coda (coda.ts codaFlashModel: the irises and the scene, tile by tile), and no rise
 * before the fall: the end card's lines carried in have no exit of their own, the closing iris takes them with the page
 * (OVERRIDES §65 on the post-credit review's P2-1: page 2's lines leaving first lifted the middle tiles by 0.10–0.15
 * just before the iris darkened them, one flash on the 16:9 and 1:1 renders that the model, reading a line's ink at a
 * fifth of its box, did not see; codaCalibrate.ts measures that share on a render).
 */
export function codaFlashes(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  for (const id of x.carried) {
    const t = p.types.find((y) => y.id === id);
    if (!t) continue;
    const own = (t.exit ?? "blur") !== "camera" || !t.covered;
    if (own) out.push({ check: "codaFlashes", level: "error", message: `${t.id} "${t.text.replace(/\n/g, " ").slice(0, 40)}" ${t.exitAt !== undefined && (t.exit ?? "blur") !== "camera" ? `leaves on its own (a ${t.exit ?? "blur"} from L${t.exitAt})` : "is not taken by the closing iris"}: in the main cut page 2's lines have no exit, the iris takes them with the page; leaving first, they lift its tiles just before the iris darkens them, a rise before the fall (one flash, OVERRIDES §65 on P2-1; C8: no opposing pair)`, frame: Math.max(0, t.exitAt ?? 0) });
  }
  return [...out, ...codaFlashModel(p).findings];
}

/**
 * C11, the plan's half (the mix's half needs the layer built: see CODA_SOUND), over every layer the plan hands on: room
 * tone (the beds) under every frame, never digital silence; exactly one one-shot, the tap, within a frame of L-C2's
 * landing (a second one-shot is a second sound, and §62 asks for the scene's one small sound); no Mixkit take and every
 * licence CC0 or ours; no music. A warning while no lane builds the layer (CODA_SOUND.builtBy: the review's P1-3).
 */
export function codaSound(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const layers = x.sound.layers;
  const beds = layers.filter((l) => l.kind === "bed");
  // the frames no bed covers, as runs
  const covered = new Uint8Array(p.duration);
  for (const b of beds) for (let fr = Math.max(0, b.from); fr < Math.min(p.duration, b.to); fr++) covered[fr] = 1;
  const gaps: string[] = [];
  for (let fr = 0; fr < p.duration; fr++) {
    if (covered[fr]) continue;
    const from = fr;
    while (fr < p.duration && !covered[fr]) fr++;
    gaps.push(`L${from}–L${fr}`);
  }
  if (gaps.length) out.push({ check: "codaSound", level: "error", message: `no room tone under ${gaps.join(", ")} (${beds.map((b) => `${b.take} L${b.from}–L${b.to}`).join(", ") || "no bed"}): every frame has room tone, never digital silence` });
  const shots = codaOneShots(x);
  if (shots.length !== 1) out.push({ check: "codaSound", level: "error", message: `the coda's sound has ${shots.length} one-shot${shots.length === 1 ? "" : "s"} (${shots.map((s) => `${s.take} on L${s.at}`).join(", ") || "none"}): one, the tap, the scene's one small sound (§62; POSTCREDIT_DESIGN §3.7)` });
  const l2 = p.types.find((t) => t.id === "L-C2");
  for (const s of shots) if (l2 && Math.abs(s.at - spanOf(l2, p).landed) > 1) out.push({ check: "codaSound", level: "error", message: `the tap (${s.take}) peaks on L${s.at}, not within a frame of L-C2's landing (L${spanOf(l2, p).landed})` });
  for (const l of layers) {
    if (/mixkit/i.test(`${l.take} ${l.licence}`)) out.push({ check: "codaSound", level: "error", message: `a Mixkit take (${l.take}, "${l.licence}"): the coda's sound is CC0 or ours (OVERRIDES §55, §60)` });
    else if (!/\bCC0\b|\bours\b/.test(l.licence)) out.push({ check: "codaSound", level: "error", message: `${l.take}'s licence is "${l.licence}": CC0 or ours only` });
  }
  if (p.music.length || p.hits.length) out.push({ check: "codaSound", level: "error", message: "the coda places music events: the music's ending is a real ending (§62)" });
  if (!x.sound.builtBy) out.push({ check: "codaSound", level: "warn", message: "the coda's sound is planned here and built by no lane: the master's room tone stops at its end, so the coda would play digital silence; the lead assigns the layer (the post-credit review's P1-3), with this plan's timing (the room tone to the last frame, the tap's peak on L-C2's landing)" });
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

/* ---------------------------------------------------------------- the night plate's pebbles ------------------- */

/** A polygon clipped to the frame [0, w] × [0, h] (Sutherland–Hodgman): the part of it the frame shows. */
export const clipToFrame = (pts: readonly Point[], w: number, h: number): Point[] => {
  let poly: Point[] = [...pts];
  const edges: [(q: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(q) => q.x >= 0, (a, b) => ({ x: 0, y: a.y + ((b.y - a.y) * (0 - a.x)) / (b.x - a.x) })],
    [(q) => q.x <= w, (a, b) => ({ x: w, y: a.y + ((b.y - a.y) * (w - a.x)) / (b.x - a.x) })],
    [(q) => q.y >= 0, (a, b) => ({ x: a.x + ((b.x - a.x) * (0 - a.y)) / (b.y - a.y), y: 0 })],
    [(q) => q.y <= h, (a, b) => ({ x: a.x + ((b.x - a.x) * (h - a.y)) / (b.y - a.y), y: h })],
  ];
  for (const [inside, cut] of edges) {
    const next: Point[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      if (inside(a)) {
        next.push(a);
        if (!inside(b)) next.push(cut(a, b));
      } else if (inside(b)) next.push(cut(a, b));
    }
    poly = next;
    if (!poly.length) break;
  }
  return poly;
};

/** A polygon's area (the shoelace), px². */
const areaOf = (pts: readonly Point[]): number => Math.abs(pts.reduce((s, a, i) => s + a.x * pts[(i + 1) % pts.length]!.y - pts[(i + 1) % pts.length]!.x * a.y, 0)) / 2;

/** The part of each of the night plate's pebbles the frame shows on a local frame of the coda's shot: its extent, px. */
export function platePebblesOn(p: ScenePlan, fr: number): { id: string; w: number; h: number }[] {
  const shot = p.shots.find((s) => s.id === "coda");
  if (!shot) return [];
  const { w, h } = p.frame;
  const bed = groundRectOf(shot, w, h, 0);
  const k = bed.w / PLATE_UNITS.w;
  const gp = planePose(shot.camera.pose(fr - shot.from), shot.ref, RIVERBED.depth);
  const out: { id: string; w: number; h: number }[] = [];
  for (const pb of CODA_PLATE_PEBBLES) {
    const vis = clipToFrame(
      pb.outline.map(([u, v]) => ({ x: (bed.x + u * k - gp.x) * gp.zoom + w / 2, y: (bed.y + v * k - gp.y) * gp.zoom + h / 2 })),
      w,
      h,
    );
    if (vis.length < 3 || areaOf(vis) < 1) continue;
    const xs = vis.map((q) => q.x);
    const ys = vis.map((q) => q.y);
    out.push({ id: pb.id, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
  }
  return out;
}

/**
 * No riverbed pebble on the night plate reads larger than the sleeping stone (OVERRIDES §65 on the post-credit review's
 * P2-9, second half: in 9:16 the plate's own pebbles were drawn up to 1,105 × 607 px beside a stone of 263 × 232, so
 * the stone no longer read as the riverbed's own): on every frame of the coda's shot, the part of each of the plate's
 * pebbles (their outlines from the plate's source, codaPlate.ts) that the frame shows is no wider and no taller than
 * the stone's drawn body (the pebble's own bounds at its drawn size). The plate is drawn over the shot's ground rect,
 * at the ground's depth, never stretched (coda.ts CODA_PLATE_FRAMING places it).
 */
export function codaPlate(p: ScenePlan, x: CodaExtra): Finding[] {
  const out: Finding[] = [];
  const shot = p.shots.find((s) => s.id === "coda");
  if (!shot?.stone) return out;
  const bed = groundRectOf(shot, p.frame.w, p.frame.h, 0);
  if (Math.abs(bed.h * PLATE_UNITS.w - bed.w * PLATE_UNITS.h) > 1e-6 * bed.w * PLATE_UNITS.h) out.push({ check: "codaPlate", level: "error", message: `the night plate is drawn ${bed.w.toFixed(0)} × ${bed.h.toFixed(0)}: stretched (it is ${PLATE_UNITS.w} × ${PLATE_UNITS.h})`, frame: shot.from });
  const seen = new Set<string>();
  for (let fr = shot.from; fr < shot.to; fr++) {
    const k = (shot.stone.size / VIEWBOX_SIZE) * shot.camera.pose(fr - shot.from).zoom;
    const sw = BODY.width * k;
    const sh = BODY.height * k;
    for (const pb of platePebblesOn(p, fr)) {
      if (seen.has(pb.id) || (pb.w <= sw && pb.h <= sh)) continue;
      seen.add(pb.id);
      out.push({ check: "codaPlate", level: "error", message: `the night plate's pebble ${pb.id} reads larger than the sleeping stone from L${fr}: the frame shows ${Math.round(pb.w)} × ${Math.round(pb.h)} px of it, the stone's body is ${Math.round(sw)} × ${Math.round(sh)}; no riverbed pebble may read larger than the stone (OVERRIDES §65 on P2-9: frame the plate, coda.ts CODA_PLATE_FRAMING${x.plateFraming ? `, here ×${x.plateFraming.scale} about (${x.plateFraming.centre.x}, ${x.plateFraming.centre.y})` : ""})`, frame: fr });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- all of them --------------------------------- */

/** The coda's checks, by name (for reports). */
export const CODA_CHECKS = ["codaWords", "codaHolds", "codaStone", "codaCamera", "codaPose", "codaNoUi", "codaLockup", "codaFlashes", "codaSound", "codaCaptions", "codaLight", "codaPlate"] as const;

/** Every coda check on a plan (none on a plan that is not the coda). */
export function codaChecks(p: ScenePlan): Finding[] {
  const x = codaOf(p);
  if (!x) return [];
  return [...codaWords(p, x), ...codaHolds(p, x), ...codaStone(p, x), ...codaCamera(p, x), ...codaPose(p, x), ...codaNoUi(p), ...codaLockup(p, x), ...codaFlashes(p, x), ...codaSound(p, x), ...codaCaptions(p, x), ...codaLight(p, x), ...codaPlate(p, x)];
}
