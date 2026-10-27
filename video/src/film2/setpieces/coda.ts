// THE POST-CREDIT SCENE, "the coda" (D157, posted by the release session at 16:12 on 27 Oct; OVERRIDES §62; the design
// lane's POSTCREDIT_DESIGN.md): after the end card's TRUE ending (the finale's last frame: page 2 held past the music's
// composed ending and its room tone), a breath of night green, then the same stone asleep on the riverbed at night, and
// three lines, one beat at a time:
//     Pebble rests.
//     Soon, it will learn while it does.
//     Not built yet.
// A coming feature, never part of 2.0.0: no version, no date, no number, no mock screen, no model or company name, and
// none of §62's four phrases (setpieces/codaChecks.ts holds every rule, each with a canary in tests/coda.test.ts). The
// material is the Companion's real resting pose (`sleepy`, priority row 17) drawn by Pebble's own engine (bloub by
// Jérémy Perret, MIT), in the page's dark palette; the words are the pose's own ("resting"), the release session's
// line, and the feature's status. Pebble never speaks: every line is in the third person.
//
// The beats (local frames L at 60 fps, L0 = the end card's true ending; f60() converts for other rates):
//   A  L0–L13    page 2's two lines blur out, each with its own exit (the 14-word method line over 14 frames)
//   B  L4–L33    a ring iris closes onto the end card's stone, night green outside it, the sage hairline on its edge;
//                the stone's face is the last thing seen. It eases on E-move: a closing "leave" ease waits for the
//                lead's ruling (POSTCREDIT_DESIGN §7 item 3), and E-move is the ruling the film already has (§52)
//   C  L34–      the breath: flat night green (COLOR.nightPage, the dark --bg, never black), with no camera: a declared
//                wait. Room tone only
//   D  irisIn    an iris opens from the sleeping stone's face (E-move, 36 frames, the dark sage hairline): the face, the
//                stone, then the riverbed at night. irisIn is the design's L70 unless the flash model needs it later
//                (codaIrisInNeed: no tile the iris-out darkened brightens again within a second, so nothing in the
//                scene makes an opposing pair, POSTCREDIT_DESIGN §5 C8)
//   E  +30       "Pebble rests." rises from its mask; it lands 60 frames after the iris starts
//   G  +100      "Soon, it will learn while it does." lands, with the scene's one sound (the score lane's): the title's
//                own stone tap at a whisper, its peak on this frame
//   H  +8        "Not built yet." lands beneath it, in the dark muted ink: the limit beside the promise
//   I  +170      the lockup holds; the push carries on (0.35 px a frame at the corners, 0.30 in 1:1)
//   J  +18       the push eases to rest (its speed falls linearly to zero)
//   K  +30       the film's last breath: the camera still, the stone still alive (sway, breath, z's); a declared wait
// At L70 that is 456 frames (7.60 s).
//
// What it continues. Frames L0–L33 ARE the end card's page, carried on: its camera (settled in the end card's own last
// breath, the room tone after the music's decay, and left as it is: the X cut ends there, so it cannot change), its
// stone on its engine clock, page 2's lines in its world. The closing ring is the motion there. The plan's `page` shot describes them for the checks; setpieces/views/CodaView.tsx
// draws them by playing the end card's own plan on past its end (`extra.coda.endCard.extended`, built here), so those
// frames are the end card's own picture with only the exits added. Nothing before L0 changes: the end card's plan is
// not touched, and the X version (the main film with the coda is over X's 2:20) is the main master cut at the coda's
// first frame (codaPlacement, xCutFrames).
//
// The main film only: not the tour cut, the 40-s cut or the shorts (POSTCREDIT_DESIGN §3.10; OVERRIDES §62).
// Pure; no React.
import { COLOR, RING, f60, type Aspect } from "../tokens";
import { VelocityCamera, worldToFrame, type CamSample, type Pose } from "../motion/camera";
import { radiusToCorners, type Point, type Rect } from "../motion/geometry";
import { E_ARRIVE, E_MOVE, clamp01 } from "../motion/ease";
import { GRADES, gradeAt, gradeColor, hexToRgb, relLuminance, type Grade, type LightCue } from "../light/grades";
import { IRIS_DRAWN, irisRadius } from "../transitions/kinds";
import type { Finding } from "../qa/checks";
import { luminanceTransitions, maxFlashesPerSecond } from "../qa/luma";
import { approxLineWidth, typeSizePx } from "../type/scale";
import { BODY, VIEWBOX_SIZE } from "../../../../shared/pebble/character";
import { anchored, carriedRect } from "./kit";
import { defaultEntranceOf, enterFramesOf, exitFramesOf, frameBox, glideLz, lineHeightOf, lineRect, type FrameBox, type TypeBox } from "./frame";
import { offsetForBlink, type FrameSpan } from "./blink";
import { CODA_CUES } from "./coda.cues";
import { move, type ScenePlan, type ShotSpec, type StoneSpec, type TypeSpec } from "./scene";
import type { MusicGrid } from "./music";
import type { DemoStretch } from "./demo/grids";

/* ---------------------------------------------------------------- the words ----------------------------------- */

/**
 * The coda's words (POSTCREDIT_DESIGN §3.4, §3.11): the pose's own name as a sentence, the release session's starting
 * line unchanged, and the status; the description and the transcript's closing block go with the main film only.
 */
export const CODA_TEXT = {
  rests: "Pebble rests.",
  soon: "Soon, it will learn while it does.",
  /** 1:1 and 9:16 break it after "learn" */
  soonBroken: "Soon, it will learn\nwhile it does.",
  status: "Not built yet.",
  /** the description of every post with the main film and of the site's film page (never X's: the X cut has no coda) */
  description: "After the end card: a planned feature, learning while resting. It isn't built yet, and it comes only if measurement shows it helps.",
  /** the /film transcript's closing block, "After the end card" (not a chapter) */
  transcript: "This scene shows a planned feature. It isn't built yet, and it comes only if measurement shows it helps.",
} as const;

/** The coda's own lines, by id. */
export const CODA_LINES = ["L-C1", "L-C2", "L-C3"] as const;

/** The dark --ink-2 (src/app/globals.css): the site's second tone for a limit, 8.3:1 on the night green. */
export const NIGHT_INK2 = "#ADB9AB";

/** The page's dark-theme pebble (src/app/globals.css --pebble and --pebble-eye; the film's PEBBLE_DARK). */
export const CODA_STONE_COLORS = { body: "#B4CDA6", eye: "#23351F" } as const;

/* ---------------------------------------------------------------- the beats ----------------------------------- */

/** The schedule, frames at 60 fps (POSTCREDIT_DESIGN §3.2). */
export const CODA_BEATS = {
  /** the iris-out (B) */
  irisOutAt: 4,
  irisOutFrames: 30,
  /** the design's iris-in (D): the breath is L34–L69 */
  irisInMin: 70,
  irisInFrames: 36,
  /** L-C1 starts rising this long after the iris-in starts */
  line1After: 30,
  /** L-C2 lands this long after L-C1 lands (line 1 alone, its blink in the middle) */
  line2After: 100,
  /** L-C3 lands this long after L-C2 (the end card's fact rows rise 8 frames apart) */
  line3After: 8,
  /** the lockup's hold, from L-C3's landing to the ease */
  hold: 170,
  ease: 18,
  /** the film's last breath: the one still the film may hold (OVERRIDES §58) */
  lastBreath: 30,
  /** the planned blink, after L-C1 lands; and the spans kept clear of any blink */
  blinkAfterLine1: 35,
} as const;

/** The push's speed at the frame's corners, px a frame at 1080 (POSTCREDIT_DESIGN §3.6). */
export const CODA_PUSH_PX: Record<Aspect, number> = { "16:9": 0.35, "1:1": 0.3, "9:16": 0.35 };

/** The frames the coda's timeline is made of (the same in every aspect once aligned). */
export interface CodaTiming {
  irisIn: number;
  line1: number;
  line2: number;
  line3: number;
  ease: number;
  still: number;
  end: number;
}

/* ---------------------------------------------------------------- the light, the ground, the sound -------------- */

/**
 * The coda's light: the night riverbed as the site draws it, neutral gains on the dark plate (POSTCREDIT_DESIGN §3.5;
 * the night grade would darken the plate toward black), no key light of the film's own (the plate's own pool, from
 * above left, is the only light) and the night grade's shade-green vignette. The measurement that confirms it (the
 * ground's median within ΔE 5 of the site's dark footer ground) waits for a render.
 */
export const CODA_GRADE: Grade = { ...GRADES.page, name: "night riverbed", keyLight: 0, vignette: GRADES.night.vignette };

/**
 * The ground: the site's own night wallpaper (tools/assets/wallpaper/wallpaper-dark.svg) without its vignette, as
 * capture/riverbed-plate.mjs renders it (video/public/desktop/riverbed-dark@3x.png, gitignored), then a 2400-px JPEG
 * beside the light one (`sips -s format jpeg -s formatOptions 88 -Z 2400 …`). Until it exists the view draws the
 * wallpaper's own mid tone (#1D2520, the site's dark --wallpaper-tint), never black.
 */
export const CODA_PLATE = { src: "desktop/riverbed-dark-2400.jpg", fallback: "#1D2520" } as const;

/** The sound layer the score lane builds (POSTCREDIT_DESIGN §3.7): room tone throughout, one CC0 tap; no music. */
export const CODA_SOUND = {
  roomTone: { take: "room_tone_b", licence: "ours (designed air, .work/sfx2/KIT.md)", lufs: -52 },
  tap: { take: "standin_tap_a", licence: "CC0 (Kenney impactWood_light_002)", lufs: -30, note: "the title's own stone tap; its peak on L-C2's landing" },
} as const;

/** The coda has no music: an empty grid (the end card's ending is the music's real ending). */
export const CODA_GRID: MusicGrid = { beats: [], downbeats: [], phrases: [], beatsPerBar: 4, hits: [] };

/** What the demo reel says about the coda's "music" (it has none): for check-setpieces' report line. */
export const CODA_STRETCH: DemoStretch = { track: "room tone, no music", label: "—", licence: "the kit's designed air and one CC0 tap", bpm: 0, anchorS: 0, anchor: "the end card's true ending" };

/* ---------------------------------------------------------------- cameras ------------------------------------- */

/**
 * A camera that is `base` up to frame `from` and then keeps the velocity it had there: the end card's page carried past
 * the end card's own frames as it left them (settled), whatever segments the end card's camera may add past its end.
 */
export class ContinuedCamera extends VelocityCamera {
  constructor(
    private readonly base: VelocityCamera,
    private readonly from: number,
  ) {
    const s = base.sample(from);
    super(s.pose, s.vel, from);
  }
  override sample(frame: number): CamSample {
    return frame < this.from ? this.base.sample(frame) : super.sample(frame);
  }
}

/** A camera seen from another origin: frame f here is frame f + `offset` of `base`. */
export class ShiftedCamera extends VelocityCamera {
  constructor(
    private readonly base: VelocityCamera,
    private readonly offset: number,
  ) {
    const s = base.sample(offset);
    super(s.pose, s.vel, 0);
  }
  override sample(frame: number): CamSample {
    return { ...this.base.sample(frame + this.offset), frame };
  }
}

/* ---------------------------------------------------------------- the plan's data ----------------------------- */

export interface CodaIris {
  at: number;
  frames: number;
  /** px (frame), the feather the view draws */
  feather: number;
  /** the hairline on its edge */
  hairline: string;
  ease: "move";
}

export interface CodaExtra {
  /** the end card it follows: its id, its true ending (this piece's L0, in its own frames) and the plan the view plays */
  endCard: { id: string; end: number; shot: string; extended: ScenePlan };
  /** the end card's lines carried in and leaving on L0 (page 2's) */
  carried: readonly string[];
  /** the coda's own lines */
  lines: readonly string[];
  /** the iris that closes onto the end card's stone (B) and the iris that opens from the coda's stone (D) */
  irisOut: CodaIris;
  irisIn: CodaIris & { startRadius: number };
  breath: { from: number; to: number };
  lastBreath: { from: number; to: number };
  push: { px: number; lz: number; from: number; ease: number; still: number };
  stone: { palette: "dark"; initialPose: "sleepy"; colors: typeof CODA_STONE_COLORS; blink: { target: number; keepClear: FrameSpan[]; clockOffset: number } };
  ground: typeof CODA_PLATE;
  grade: Grade;
  sound: { roomTone: { from: number; to: number } & (typeof CODA_SOUND)["roomTone"]; tap: { at: number } & (typeof CODA_SOUND)["tap"] };
  /** the main film's captions for the coda (local frames; X's captions carry none) */
  captions: readonly { from: number; to: number; text: string }[];
  text: typeof CODA_TEXT;
  /** the one intended dip of the scene, for the render's seam scan: the iris-out to the end of the iris-in */
  dip: { from: number; to: number };
  /** the frames the flash model asked the iris-in to wait past the design's L70 (0: none) */
  flashWait: number;
}

/** The coda's data on a plan (null when the plan is not the coda). */
export const codaOf = (p: ScenePlan): CodaExtra | null => ((p.extra?.coda as CodaExtra | undefined) ?? null);

export interface CodaOptions {
  w: number;
  h: number;
  fps: number;
  /** the end card it follows (planFinale or planReturn): its last frame is this piece's frame −1 */
  endCard: ScenePlan;
  /** one timeline for every aspect (setpieces/align.ts) */
  align?: Partial<CodaTiming>;
  /** canaries and tests: the iris-in's frame as given (no flash wait), the stone's clock, the hold, the lines */
  irisIn?: number;
  clockOffset?: number;
  hold?: number;
  text?: Partial<Pick<typeof CODA_TEXT, "rests" | "soon" | "soonBroken" | "status">>;
}

/* ---------------------------------------------------------------- the layout ---------------------------------- */

interface CodaLayout {
  /** the stone's drawn size (the 220-unit viewBox), px at 1080 */
  stonePx: number;
  /** the gap between the stone and the lines, px at 1080 */
  gap: number;
  /** 16:9: the lines beside the stone, left-aligned (the title's stone beside the wordmark); else stacked, centred */
  side: boolean;
}

const LAYOUT: Record<Aspect, CodaLayout> = {
  "16:9": { stonePx: 300, gap: 64, side: true },
  "1:1": { stonePx: 300, gap: 40, side: false },
  "9:16": { stonePx: 400, gap: 56, side: false },
};

/** The z's top, viewBox units (avatarMotion's sleep cue: `M 52 −77 …`, drawn outside the body's lean). */
const Z_TOP = -77;
/** The film pebble's foot below the stone's centre at 148 px (setpieces/views/PieceView.tsx, video/src/film/timeline.ts PET). */
export const CENTRE_TO_FOOT_148 = 38.2;

/** The stone's drawn extent (its body, its lean and its z's), frame px about its centre `c` drawn at `px`. */
export const stoneExtent = (c: Point, px: number): Rect => {
  const k = px / VIEWBOX_SIZE;
  // the lean (12° ± 2) turns the body about its centre: 6 % covers it
  const x0 = c.x + BODY.left * k * 1.06;
  const x1 = c.x + BODY.right * k * 1.06;
  const y0 = c.y + Math.min(BODY.top, Z_TOP) * k * 1.06;
  const y1 = c.y + BODY.bottom * k * 1.06;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** Where the stone and the lines sit in one aspect, frame px at the coda shot's first frame (world units there). */
export function codaLayout(f: FrameBox, texts: { rests: string; soon: string; status: string }): { stone: Point; stonePx: number; boxes: [TypeBox, TypeBox, TypeBox]; lockup: Rect } {
  const L = LAYOUT[f.aspect];
  const px = L.stonePx * f.unit;
  const size = typeSizePx("expressive", f.w, f.h, 0);
  const lh = size * lineHeightOf("expressive");
  const lines = [texts.rests, texts.soon, texts.status];
  const counts = lines.map((t) => t.split("\n").length);
  const blockH = counts.reduce((a, b) => a + b, 0) * lh;
  const blockW = Math.max(...lines.flatMap((t) => t.split("\n")).map((l) => approxLineWidth(l, "expressive", f.w, f.h, 0)));
  const ext = stoneExtent({ x: 0, y: 0 }, px);
  const gap = L.gap * f.unit;
  if (L.side) {
    // the lockup centred on the frame: the stone left, the lines right, the block's middle on the stone's middle
    const W = ext.w + gap + blockW;
    const left = f.w / 2 - W / 2;
    const stone = { x: left - ext.x, y: f.h / 2 - (BODY.top + BODY.bottom) * 0.5 * (px / VIEWBOX_SIZE) };
    const linesLeft = left + ext.w + gap;
    const top = f.h / 2 - blockH / 2;
    const tops = [top, top + counts[0]! * lh, top + (counts[0]! + counts[1]!) * lh];
    const boxes = tops.map((t) => ({ left: linesLeft, top: t, align: "left" as const })) as [TypeBox, TypeBox, TypeBox];
    return { stone, stonePx: px, boxes, lockup: { x: left, y: Math.min(top, stone.y + ext.y), w: W, h: Math.max(top + blockH, stone.y + ext.y + ext.h) - Math.min(top, stone.y + ext.y) } };
  }
  // stacked: the stone above, the lines centred beneath, the whole lockup centred on the frame
  const H = ext.h + gap + blockH;
  const top0 = f.h / 2 - H / 2;
  const stone = { x: f.w / 2 - (BODY.left + BODY.right) * 0.5 * (px / VIEWBOX_SIZE), y: top0 - ext.y };
  const linesTop = top0 + ext.h + gap;
  const tops = [linesTop, linesTop + counts[0]! * lh, linesTop + (counts[0]! + counts[1]!) * lh];
  const boxes = tops.map((t) => ({ left: 0, top: t, width: f.w, align: "center" as const })) as [TypeBox, TypeBox, TypeBox];
  const W = Math.max(ext.w, blockW);
  return { stone, stonePx: px, boxes, lockup: { x: f.w / 2 - W / 2, y: top0, w: W, h: H } };
}

/* ---------------------------------------------------------------- the irises, as the view draws them ---------- */

/** The half-opaque radius of a feathered hole of radius R (the mask is clear inside max(0, R − feather), opaque at R). */
const halfRadius = (R: number, feather: number) => (R >= feather ? R - feather / 2 : R / 2);

/**
 * The closing iris on a local frame (B): centred on the end card's stone where the page's camera has it on that frame,
 * its radius falling on E-move from past the frame's farthest corner to nothing; null outside it. `edge` is the
 * half-opaque radius (the checks' boundary); the view draws R and the feather.
 */
export function codaIrisOut(p: ScenePlan, fr: number): { c: Point; R: number; edge: number; u: number } | null {
  const x = codaOf(p);
  if (!x) return null;
  const o = x.irisOut;
  if (fr < o.at || fr >= o.at + o.frames) return null;
  const page = p.shots[0]!;
  const st = page.stone!;
  const c = worldToFrame(st.at, page.camera.pose(fr - page.from), p.frame.w, p.frame.h);
  const c0 = worldToFrame(st.at, page.camera.pose(o.at - page.from), p.frame.w, p.frame.h);
  const Rmax = radiusToCorners(c0, p.frame.w, p.frame.h) + o.feather;
  const u = (fr - o.at) / o.frames;
  const R = Rmax * (1 - E_MOVE(clamp01(u)));
  return { c, R, edge: halfRadius(R, o.feather), u };
}

/**
 * The opening iris on a local frame (D), exactly as transitions/presentations.tsx ringIris() draws it and
 * setpieces/qa.ts irisOnFrame() models it: centred where the coda's stone is on the shot's first frame, from the
 * stone's face (IRIS_DRAWN's start radius) past the farthest corner on E-move; null outside it.
 */
export function codaIrisIn(p: ScenePlan, fr: number): { c: Point; R: number; edge: number; u: number } | null {
  const x = codaOf(p);
  if (!x) return null;
  const o = x.irisIn;
  if (fr < o.at || fr >= o.at + o.frames) return null;
  const shot = p.shots.find((s) => s.id === "coda")!;
  const c = worldToFrame(shot.stone!.at, shot.camera.pose(0), p.frame.w, p.frame.h);
  const Rmax = radiusToCorners(c, p.frame.w, p.frame.h) + o.feather;
  const u = (fr - o.at) / o.frames;
  const R = irisRadius(u, o.startRadius, Rmax, o.ease);
  return { c, R, edge: halfRadius(R, o.feather), u };
}

/* ---------------------------------------------------------------- the plan ------------------------------------ */

/** The coda, for one aspect. */
export function planCoda(o: CodaOptions): ScenePlan {
  const first = buildCoda(o, o.irisIn ?? Math.max(f60(CODA_BEATS.irisInMin, o.fps), o.align?.irisIn ?? 0), 0);
  if (o.irisIn !== undefined) return first;
  // the flash model: no tile the iris-out darkened may brighten again within a second (C8); if one would, the breath
  // lasts longer by exactly what that tile needs (everything after the iris-in moves with it)
  const wait = codaIrisInNeed(first);
  return wait > 0 ? buildCoda(o, codaOf(first)!.irisIn.at + wait, wait) : first;
}

function buildCoda(o: CodaOptions, irisInAt: number, flashWait: number): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const B = CODA_BEATS;
  const al = o.align ?? {};
  const ec = o.endCard;
  if (!ec.endsFilm) throw new Error(`the coda follows the film's end card: ${ec.id} does not end the film`);
  const end0 = ec.duration;
  const title = ec.shots[ec.shots.length - 1]!;
  if (!title.stone) throw new Error(`the coda closes onto the end card's stone: ${ec.id}'s last shot (${title.id}) has none`);

  /* ------------------------------------------------ the schedule ------------------------------------------------ */
  const irisOutAt = f60(B.irisOutAt, fps);
  const irisOutF = f60(B.irisOutFrames, fps);
  const irisOutEnd = irisOutAt + irisOutF;
  const irisIn = Math.max(irisInAt, irisOutEnd + f60(30, fps));
  const irisInF = f60(B.irisInFrames, fps);
  const texts = {
    rests: o.text?.rests ?? CODA_TEXT.rests,
    soon: LAYOUT[A].side ? (o.text?.soon ?? CODA_TEXT.soon) : (o.text?.soonBroken ?? CODA_TEXT.soonBroken),
    status: o.text?.status ?? CODA_TEXT.status,
  };
  const rise = (t: string) => enterFramesOf("lineRise", t, fps);
  const line1 = Math.max(irisIn + f60(B.line1After, fps) + rise(texts.rests), al.line1 ?? 0);
  const line2 = Math.max(line1 + f60(B.line2After, fps), al.line2 ?? 0);
  const line3 = Math.max(line2 + f60(B.line3After, fps), al.line3 ?? 0);
  const ease = Math.max(line3 + (o.hold ?? f60(B.hold, fps)), al.ease ?? 0);
  const still = Math.max(ease + f60(B.ease, fps), al.still ?? 0);
  const end = Math.max(still + f60(B.lastBreath, fps), al.end ?? 0);

  /* ------------------------------------------------ L0–L33: the end card's page, carried on ---------------------- */
  // the page's camera: the end card's own up to its end, then its glide's velocity (no settle); frame 0 here is its `end`
  const continued = new ContinuedCamera(title.camera, end0 - title.from);
  const pageCam = new ShiftedCamera(continued, end0 - title.from);
  const st0 = title.stone;
  // one stone on one clock across the join: engine time is (local + clockOffset) ÷ fps, and the cues shift with it
  const pageStone: StoneSpec = { ...st0, cues: st0.cues.map((c) => ({ ...c, at: Math.round((c.at - end0 / fps) * 1000) / 1000 })), clockOffset: (st0.clockOffset ?? 0) + end0 };
  // the lines the end card holds to its last frame (page 2's), leaving now, each the way it came
  const held = ec.types.filter((t) => t.exitAt === undefined);
  for (const t of held) if (t.carry && t.carry.shot !== title.id) throw new Error(`the end card's ${t.id} is set in ${t.carry.shot}, not its last shot`);
  const exitOf = (t: TypeSpec) => {
    const ent = t.entrance ?? defaultEntranceOf(t.tier);
    return ent === "lineRise" || ent === "wordRise" ? ("lift" as const) : ("blur" as const);
  };
  const carried: TypeSpec[] = held.map((t) => ({
    ...t,
    at: t.at - end0,
    exitAt: 0,
    exit: exitOf(t),
    ...(t.carry ? { carry: { shot: "page", at: t.carry.at - end0, ...(t.carry.outFrom !== undefined ? { outFrom: t.carry.outFrom - end0 } : {}) } } : {}),
  }));
  for (const t of carried) if (exitFramesOf(t.entrance ?? defaultEntranceOf(t.tier), t.exit!, t.text, fps) + 2 > irisOutEnd) throw new Error(`${t.id}'s exit outlasts the iris-out`);
  // the end card's own plan played on past its end, for the view: its last shot to the iris-out's end on the carried
  // camera, its held lines leaving on its `end` (nothing before `end` changes: the exits start there)
  const extended: ScenePlan = {
    ...ec,
    duration: end0 + irisOutEnd,
    shots: ec.shots.map((s) => (s === title ? { ...s, to: end0 + irisOutEnd, camera: continued, waits: [] } : s)),
    types: ec.types.map((t) => (held.includes(t) ? { ...t, exitAt: end0, exit: exitOf(t) } : t)),
    endsFilm: false,
  };

  /* ------------------------------------------------ the coda's world: the night riverbed, the stone, the lines ---- */
  const lay = codaLayout(f, texts);
  const lz = glideLz(f, CODA_PUSH_PX[A]);
  const pose0: Pose = { x: f.w / 2, y: f.h / 2, zoom: 1 };
  const cam = new VelocityCamera(pose0, { x: 0, y: 0, lz });
  cam.glide(ease - irisIn, 1e9, { x: 0, y: 0, lz });
  // the ease: a cubic Hermite to rest whose travel is the trapezoid's, so the speed falls linearly to zero
  const zEase = Math.exp(lz * (ease - irisIn));
  cam.hermite(still - irisIn, { ...pose0, zoom: zEase * Math.exp((lz * (still - ease)) / 2) }, { x: 0, y: 0, lz: 0 });

  // the stone's clock: one of the engine's own blinks in line 1's solo hold, none where a line lands, none in the iris
  // or the last breath (setpieces/blink.ts: the engine does nothing it does not do in the product)
  const blinkTarget = line1 + f60(B.blinkAfterLine1, fps);
  const keepClear: FrameSpan[] = [
    { from: irisIn - f60(10, fps), to: blinkTarget - f60(2, fps), why: "the iris-in, the first look and line 1's landing; the planned blink comes alone" },
    { from: blinkTarget + f60(12, fps), to: line3 + f60(24, fps), why: "no double blink; lines 2 and 3 landing (no blink reads as a reaction)" },
    { from: ease - f60(8, fps), to: end - 1, why: "the last breath (the film never ends mid-blink)" },
  ];
  const clockOffset = o.clockOffset ?? offsetForBlink(blinkTarget, fps, keepClear);
  const codaStone: StoneSpec = { at: lay.stone, r: lay.stonePx * 0.3, size: lay.stonePx, cues: anchored(CODA_CUES, 0, "the coda's cues"), clockOffset };

  const ink = COLOR.nightInk;
  const types: TypeSpec[] = [...carried];
  const carry = { shot: "coda", at: irisIn };
  types.push({ id: "L-C1", text: texts.rests, tier: "expressive", at: line1 - rise(texts.rests), sizeT: 0, color: ink, box: lay.boxes[0], kind: "film", key: true, carry });
  types.push({ id: "L-C2", text: texts.soon, tier: "expressive", at: line2 - rise(texts.soon), sizeT: 0, color: ink, box: lay.boxes[1], kind: "film", pairWith: "L-C3", carry });
  types.push({ id: "L-C3", text: texts.status, tier: "expressive", at: line3 - rise(texts.status), sizeT: 0, color: NIGHT_INK2, box: lay.boxes[2], kind: "film", carry });

  /* ------------------------------------------------ shots, seams, light ------------------------------------------ */
  const shots: ShotSpec[] = [
    { id: "page", from: 0, to: irisOutAt, kind: "title", camera: pageCam, ref: title.ref, ground: "page", planes: [], stone: pageStone, rings: [] },
    // flat night green (the page's ground at night); its camera is still and nothing in it moves: the declared wait
    { id: "breath", from: irisOutAt, to: irisIn, kind: "cutscene", camera: new VelocityCamera(pose0), ref: pose0, ground: "page", planes: [], rings: [], waits: [{ from: irisOutEnd, to: irisIn }] },
    { id: "coda", from: irisIn, to: end, kind: "title", camera: cam, ref: pose0, ground: "riverbed", planes: [], stone: codaStone, rings: [], waits: [{ from: still, to: end }], dofScale: 8 },
  ];
  const endGrade = gradeAt(end0 - 1, ec.lightInitial, ec.lightCues);
  const lightCues: LightCue[] = [{ at: irisOutEnd, to: CODA_GRADE, frames: irisIn - irisOutEnd }];
  const feather = IRIS_DRAWN.featherPx * f.unit;

  const extra: CodaExtra = {
    endCard: { id: ec.id, end: end0, shot: title.id, extended },
    carried: carried.map((t) => t.id),
    lines: [...CODA_LINES],
    irisOut: { at: irisOutAt, frames: irisOutF, feather, hairline: RING.color.light, ease: "move" },
    irisIn: { at: irisIn, frames: irisInF, feather, hairline: RING.color.dark, ease: "move", startRadius: IRIS_DRAWN.startRadiusPx * f.unit },
    breath: { from: irisOutEnd, to: irisIn },
    lastBreath: { from: still, to: end },
    push: { px: CODA_PUSH_PX[A], lz, from: irisIn, ease, still },
    stone: { palette: "dark", initialPose: "sleepy", colors: CODA_STONE_COLORS, blink: { target: blinkTarget, keepClear, clockOffset } },
    ground: CODA_PLATE,
    grade: CODA_GRADE,
    sound: { roomTone: { from: 0, to: end, ...CODA_SOUND.roomTone }, tap: { at: line2, ...CODA_SOUND.tap } },
    captions: [
      { from: 0, to: line1 - rise(texts.rests), text: "[Silence]" },
      { from: line1 - rise(texts.rests), to: line2, text: CODA_TEXT.rests },
      { from: line2, to: end, text: `[A soft tap]\n${CODA_TEXT.soon} ${CODA_TEXT.status}` },
    ],
    text: CODA_TEXT,
    dip: { from: irisOutAt, to: irisIn + irisInF },
    flashWait,
  };

  return {
    id: "coda",
    name: `Coda (after the end card) ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots,
    seams: [
      // B: the closing iris. It is drawn by CodaView (codaIrisOut), not by ringIris(): the page stays inside the circle
      // and the night green comes in from the edges, so it names no presentation (setpieces/qa.ts models the opening
      // iris only); the checks that need it read codaIrisOut()
      { at: irisOutAt, kind: "ring", frames: irisOutF, out: "page", in: "breath", ease: "move", swapAt: irisOutEnd - 1, covered: { from: irisOutAt, to: irisOutEnd } },
      // D: the opening iris, from the sleeping stone's face, as ringIris() draws it
      { at: irisIn, kind: "ring", frames: irisInF, out: "breath", in: "coda", presentation: "iris", ease: "move", irisCenter: lay.stone, swapAt: irisIn + Math.round(irisInF / 2), covered: { from: irisIn, to: irisIn + irisInF } },
    ],
    types,
    lightInitial: endGrade,
    lightCues,
    leaks: [],
    hits: [],
    takes: [],
    music: [],
    moves: [move("light", irisOutEnd, irisIn - irisOutEnd, "the end card's light to the night riverbed's, under the breath's night green")],
    // the coda now ends the main film: its lines stay to the last frame (the end card still ends the X cut)
    endsFilm: true,
    extra: { timing: { irisIn, line1, line2, line3, ease, still, end } satisfies CodaTiming, coda: extra },
  };
}

/* ---------------------------------------------------------------- the flash model (C8) -------------------------- */

/**
 * The relative luminances the model uses (WCAG), from the palette: the page under its grade, the night green, the
 * night plate (its mid tone until a render measures it), the two stones, the two inks. A line's glyphs cover about a
 * fifth of its box.
 */
export const CODA_LUMA = {
  page: relLuminance(gradeColor(hexToRgb(COLOR.page), GRADES.page)),
  night: relLuminance(hexToRgb(COLOR.nightPage)),
  plate: relLuminance(hexToRgb(CODA_PLATE.fallback)),
  endStone: relLuminance(hexToRgb(COLOR.pebble)),
  stone: relLuminance(hexToRgb(CODA_STONE_COLORS.body)),
  inkOnPage: relLuminance(hexToRgb(COLOR.ink)),
  inkOnNight: relLuminance(hexToRgb(COLOR.nightInk)),
  ink2OnNight: relLuminance(hexToRgb(NIGHT_INK2)),
  inkShare: 0.22,
} as const;

/** The flash model's grid: WCAG's quarter of a 10° field is about 2.8 % of the screen, so 6 × 6 tiles (qa/luma.ts). */
export const FLASH_GRID = 6;
const SAMPLES = 6;

interface LineShape {
  rect: Rect;
  /** the share of its ink drawn on this frame (0 … 1) */
  shown: number;
  L: number;
  ground: number;
}

/** What one frame of the coda shows, as shapes the model samples. */
function frameShapes(p: ScenePlan, fr: number) {
  const x = codaOf(p)!;
  const { w, h } = p.frame;
  const page = p.shots[0]!;
  const coda = p.shots.find((s) => s.id === "coda")!;
  const lines = (layer: "page" | "coda"): LineShape[] => {
    const out: LineShape[] = [];
    for (const t of p.types) {
      const own = (x.lines as readonly string[]).includes(t.id);
      if ((layer === "coda") !== own) continue;
      const ent = t.entrance ?? defaultEntranceOf(t.tier);
      const enter = enterFramesOf(ent, t.text, p.fps);
      let shown = 1;
      if (fr < t.at) continue;
      if (fr < t.at + enter) shown = ent === "lineRise" ? clamp01(1 - 1.12 * (1 - E_ARRIVE(clamp01((fr - t.at) / f60(30, p.fps))))) : clamp01((fr - t.at) / enter);
      if (t.exitAt !== undefined && fr >= t.exitAt) {
        const out_ = exitFramesOf(ent, t.exit ?? "blur", t.text, p.fps);
        shown *= 1 - clamp01((fr - t.exitAt) / Math.max(1, out_));
      }
      if (shown <= 0) continue;
      const rect = carriedRect(p, t, lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5), fr);
      out.push({ rect, shown, L: layer === "page" ? CODA_LUMA.inkOnPage : t.color === NIGHT_INK2 ? CODA_LUMA.ink2OnNight : CODA_LUMA.inkOnNight, ground: layer === "page" ? CODA_LUMA.page : CODA_LUMA.plate });
    }
    return out;
  };
  const disc = (s: ShotSpec, local: number) => {
    const pose = s.camera.pose(local);
    return { c: worldToFrame(s.stone!.at, pose, w, h), r: s.stone!.r * pose.zoom };
  };
  const out = codaIrisOut(p, fr);
  const inn = codaIrisIn(p, fr);
  const showPage = fr < x.irisOut.at + x.irisOut.frames;
  const showCoda = fr >= x.irisIn.at;
  return {
    page: showPage ? { stone: disc(page, fr - page.from), lines: lines("page") } : null,
    coda: showCoda ? { stone: disc(coda, fr - coda.from), lines: lines("coda") } : null,
    // the night cover: everything outside the closing iris, everything in the breath, everything outside the opening iris
    hole: out ? { c: out.c, r: out.edge, keep: "page" as const } : inn ? { c: inn.c, r: inn.edge, keep: "coda" as const } : null,
    covered: !out && !inn && fr >= x.irisOut.at + x.irisOut.frames && fr < x.irisIn.at,
  };
}

const inRect = (r: Rect, px: number, py: number) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;

/** The relative luminance the model gives a frame point. */
function lumaAt(s: ReturnType<typeof frameShapes>, px: number, py: number): number {
  const layer = (which: "page" | "coda"): number => {
    const l = which === "page" ? s.page : s.coda;
    if (!l) return CODA_LUMA.night;
    if (Math.hypot(px - l.stone.c.x, py - l.stone.c.y) <= l.stone.r) return which === "page" ? CODA_LUMA.endStone : CODA_LUMA.stone;
    for (const ln of l.lines) if (inRect(ln.rect, px, py)) return ln.ground + (ln.L - ln.ground) * CODA_LUMA.inkShare * ln.shown;
    return which === "page" ? CODA_LUMA.page : CODA_LUMA.plate;
  };
  if (s.covered) return CODA_LUMA.night;
  if (s.hole) return Math.hypot(px - s.hole.c.x, py - s.hole.c.y) <= s.hole.r ? layer(s.hole.keep) : CODA_LUMA.night;
  return layer(s.page ? "page" : "coda");
}

/** Every tile's mean relative luminance on every frame of the plan, and the whole frame's (the model of qa/luma.ts's frames). */
export function codaLumaSeries(p: ScenePlan, from = 0, to = p.duration): { tiles: number[][]; whole: number[] } {
  const { w, h } = p.frame;
  const G = FLASH_GRID;
  const tiles: number[][] = Array.from({ length: G * G }, () => []);
  const whole: number[] = [];
  for (let fr = from; fr < to; fr++) {
    const s = frameShapes(p, fr);
    let sum = 0;
    for (let ty = 0; ty < G; ty++)
      for (let tx = 0; tx < G; tx++) {
        let t = 0;
        for (let j = 0; j < SAMPLES; j++)
          for (let i = 0; i < SAMPLES; i++) t += lumaAt(s, ((tx + (i + 0.5) / SAMPLES) * w) / G, ((ty + (j + 0.5) / SAMPLES) * h) / G);
        const m = t / (SAMPLES * SAMPLES);
        tiles[ty * G + tx]!.push(m);
        sum += m;
      }
    whole.push(sum / (G * G));
  }
  return { tiles, whole };
}

/** Flashes (pairs of opposing transitions of 0.1 or more, the darker below 0.8) per tile and for the whole frame. */
export function codaFlashModel(p: ScenePlan): { worst: { where: string; flashes: number; at: number }; findings: Finding[]; transitions: number } {
  const { tiles, whole } = codaLumaSeries(p);
  let worst = { where: "none", flashes: 0, at: -1 };
  let transitions = 0;
  const findings: Finding[] = [];
  const judge = (series: number[], where: string) => {
    const tr = luminanceTransitions(series);
    transitions += tr.length;
    const m = maxFlashesPerSecond(tr, p.fps);
    if (m.max > worst.flashes) worst = { where, flashes: m.max, at: m.at };
    if (m.max > 0) findings.push({ check: "codaFlashes", level: "error", message: `${where}: ${m.max} flash${m.max > 1 ? "es" : ""} (an opposing pair of large luminance changes within a second) from frame ${m.at}: the coda's one large change is the iris-out's fall (POSTCREDIT_DESIGN §5 C8)`, frame: m.at });
  };
  tiles.forEach((s, i) => judge(s, `tile ${Math.floor(i / FLASH_GRID)},${i % FLASH_GRID}`));
  judge(whole, "the whole frame");
  return { worst, findings, transitions };
}

/**
 * How many frames later the iris-in must start so that no tile the iris-out darkened brightens again within a second:
 * per tile, its last falling transition before the iris-in and its first rising one after it (POSTCREDIT_DESIGN §5 C8).
 * Everything after the iris-in moves with it, so the need does not depend on where it starts.
 */
export function codaIrisInNeed(p: ScenePlan): number {
  const x = codaOf(p)!;
  const at = x.irisIn.at;
  const { tiles, whole } = codaLumaSeries(p, 0, Math.min(p.duration, at + p.fps * 2));
  let need = 0;
  for (const s of [...tiles, whole]) {
    const tr = luminanceTransitions(s);
    const fall = tr.filter((t) => t.dir < 0 && t.frame < at).pop();
    const rise = tr.find((t) => t.dir > 0 && t.frame >= at);
    if (fall && rise) need = Math.max(need, fall.frame + p.fps - rise.frame);
  }
  return need;
}

/* ---------------------------------------------------------------- the film: the X cut (C10) --------------------- */

/** X's cap for a standard account: 140 s (help.x.com; OVERRIDES §14), 8,400 frames at 60 fps; past 8,370 the score's flex rule F4 comes first. */
export const X_CAP_S = 140;
export const X_AIM_S = 139.5;

/** A piece of the film as the placement check reads it. */
export type FilmPiece = Pick<ScenePlan, "id" | "duration" | "fps" | "endsFilm" | "extra">;

/** The X version's length in frames: the main master to the coda's first frame (the whole film when it has no coda). */
export const xCutFrames = (pieces: readonly FilmPiece[]): number => {
  let n = 0;
  for (const p of pieces) {
    if ((p.extra as { coda?: unknown } | undefined)?.coda) break;
    n += p.duration;
  }
  return n;
};

/**
 * The coda's place in a film (POSTCREDIT_DESIGN §3.10, C10): it is the film's last piece, right after the end card it
 * was planned against and starting on that end card's true ending (so the X version, the master cut there, holds no
 * coda frame), and the X version fits X's 140 s (8,400 frames at 60 fps; a warning past 139.5 s, where F4 comes first).
 */
export function codaPlacement(pieces: readonly FilmPiece[]): { findings: Finding[]; xFrames: number } {
  const out: Finding[] = [];
  const at = pieces.findIndex((p) => (p.extra as { coda?: unknown } | undefined)?.coda);
  const xFrames = xCutFrames(pieces);
  if (at < 0) return { findings: [{ check: "codaPlacement", level: "info", message: "this cut has no coda" }], xFrames };
  const coda = pieces[at]!;
  const x = (coda.extra as { coda: CodaExtra }).coda;
  const fps = coda.fps;
  if (pieces.filter((p) => (p.extra as { coda?: unknown } | undefined)?.coda).length > 1) out.push({ check: "codaPlacement", level: "error", message: "the film has more than one coda" });
  if (at !== pieces.length - 1) out.push({ check: "codaPlacement", level: "error", message: `the coda is piece ${at + 1} of ${pieces.length}: it ends the main film, so nothing follows it (${pieces.slice(at + 1).map((p) => p.id).join(", ")})` });
  const before = pieces[at - 1];
  if (!before || before.id !== x.endCard.id) out.push({ check: "codaPlacement", level: "error", message: `the coda follows ${before?.id ?? "nothing"}, not the end card it was planned against (${x.endCard.id})` });
  else {
    if (!before.endsFilm) out.push({ check: "codaPlacement", level: "error", message: `${before.id} is not an end card (it does not end the X cut)` });
    if (before.duration !== x.endCard.end) out.push({ check: "codaPlacement", level: "error", message: `the coda starts on frame ${x.endCard.end} of ${before.id}, which ends on ${before.duration}: the X cut at the coda's first frame would ${before.duration > x.endCard.end ? "lose the end card's last frames" : "carry a frame of the coda"}` });
  }
  const cap = Math.round(X_CAP_S * fps);
  const aim = Math.round(X_AIM_S * fps);
  if (xFrames > cap) out.push({ check: "codaPlacement", level: "error", message: `the X version runs ${xFrames} frames (${(xFrames / fps).toFixed(2)} s): over X's ${X_CAP_S} s (${cap} frames)` });
  else if (xFrames > aim) out.push({ check: "codaPlacement", level: "warn", message: `the X version runs ${(xFrames / fps).toFixed(2)} s, within ${((cap - xFrames) / fps).toFixed(2)} s of X's cap: the score's flex rule F4 comes first` });
  else out.push({ check: "codaPlacement", level: "info", message: `the X version is the master's first ${xFrames} frames (${(xFrames / fps).toFixed(2)} s); the main film runs ${pieces.reduce((n, p) => n + p.duration, 0)}` });
  return { findings: out, xFrames };
}
