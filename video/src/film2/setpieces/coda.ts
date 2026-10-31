// THE POST-CREDIT SCENE, "the coda" (D157, posted by the release session at 16:12 on 27 Oct; OVERRIDES §62; the design
// lane's POSTCREDIT_DESIGN.md): after the end card's TRUE ending (the finale's last frame: page 2 held past the music's
// composed ending and its room tone), a breath of night green, then the same stone asleep on the riverbed at night, and
// three lines, one beat at a time:
//     Pebble rests.
//     Soon, it may learn while it does.
//     Not built yet.
// ("may", not §62's starting "will": the feature comes only if measurement shows it helps (D157), and the page says so
// beside its hint (src/content/next.ts), so the film's promise carries the same condition; the post-credit review's
// P1-2, 28 Oct, within §62's "the lead may change them", which the lead's brief hands this lane.)
// A coming feature, never part of 2.0.0: no version, no date, no number, no mock screen, no model or company name, and
// none of §62's four phrases (setpieces/codaChecks.ts holds every rule, each with a canary in tests/coda.test.ts). The
// material is the Companion's real resting pose (`sleepy`, priority row 17) drawn by Pebble's own engine (bloub by
// Jérémy Perret, MIT), in the page's dark palette; the words are the pose's own ("resting"), the release session's
// line, and the feature's status. Pebble never speaks: every line is in the third person.
//
// The beats (local frames L at 60 fps, L0 = the end card's true ending; f60() converts for other rates):
//   A  L0–       page 2's two lines stay: in the main cut they have no exit of their own, and the closing iris takes
//                them with the page (OVERRIDES §65 on the post-credit review's P2-1: leaving first, they lifted the middle
//                tiles just before the iris darkened them, a rise before the fall: one flash on the 16:9 and 1:1 renders)
//   B  L4–L33    a ring iris closes onto the end card's stone, night green outside it, the sage hairline on its edge;
//                the stone's face is the last thing seen. It eases on E-move (the lead kept it, §65)
//   C  L34–      the breath: flat night green (COLOR.nightPage, the dark --bg, never black), with no camera. Room tone only
//   L0 to the iris-in is §62's one breath of silence (§65, the lead's ruling (a) on the review's P1-4): the real ending,
//   then a dark beat, declared as ONE wait (`silence`, on the two shots it spans); the end card keeps its own declared
//   last breath before it, and the camera floor applies from the iris-in on
//   D  irisIn    an iris opens from the sleeping stone's face (E-move, 36 frames, with NO hairline: in this film a ring
//                means Pebble is acting, and a sage ring opening from the sleeping stone read as the unbuilt feature at
//                work, POSTCREDIT_DESIGN §6; the review's P1-1): the stone comes out of the dark through the feathered
//                mask alone, then the riverbed at night. irisIn is the design's L70 unless the flash model needs it later
//                (codaIrisInNeed: no tile the iris-out darkened brightens again within a second, so nothing in the
//                scene makes an opposing pair, POSTCREDIT_DESIGN §5 C8)
//   E  +30       "Pebble rests." rises from its mask; it lands 60 frames after the iris starts
//   G  +100      "Soon, it may learn while it does." lands, with the scene's one sound: the title's own stone tap at a
//                whisper, its peak on this frame (CODA_SOUND: the layer is planned here and not built yet; who builds it
//                is the lead's to assign, the review's P1-3)
//   H  +8        "Not built yet." lands beneath it, in the dark muted ink: the limit beside the promise
//   I  +170      the lockup holds; the push carries on (0.35 px a frame at the corners, 0.30 in 1:1)
//   J  +18       the push eases to rest (its speed falls linearly to zero)
//   K  +30       the film's last breath: the camera still, the stone still alive (sway, breath, z's); a declared wait
// From the design's L70 that is 456 frames (7.60 s); the flash model opens the iris-in on L82, so it is 468 (7.80 s).
//
// What it continues. Frames L0–L33 ARE the end card's page, carried on: its camera (settled in the end card's own last
// breath, the room tone after the music's decay, and left as it is: the X cut ends there, so it cannot change), its
// stone on its engine clock, page 2's lines in its world. The closing ring is the motion there. The plan's `page` shot
// describes them for the checks (page 2's lines `covered` by the closing iris: TypeSpec.covered); CodaView draws them by
// playing the end card's own plan on past its end (`extra.coda.endCard.extended`, built here), so those frames are the
// end card's own picture, nothing added. Nothing before L0 changes: the end card's plan is not touched, and the X
// version (the main film with the coda is over X's 2:20) is the main master cut at the coda's first frame, page 2 held to
// its last frame there (codaPlacement, xCutFrames).
//
// The main film only: not the X cut, the tour cut, the 40-s cut or the shorts (POSTCREDIT_DESIGN §3.10; OVERRIDES §62,
// §65). The main composition plays it after an end card planned with finale.ts's `then: "coda"` (codaCut holds a cut to
// it).
// Pure; no React.
import { COLOR, RING, f60, type Aspect } from "../tokens";
import { VelocityCamera, worldToFrame, type CamSample, type Pose } from "../motion/camera";
import { radiusToCorners, type Point, type Rect } from "../motion/geometry";
import { E_ARRIVE, E_MOVE, clamp01, smoothstep } from "../motion/ease";
import { GRADES, applyGroundLight, gradeAt, gradeColor, hexToRgb, relLuminance, type Grade, type LightCue, type RGB } from "../light/grades";
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
import { finaleThen } from "./finale";
import type { MusicGrid } from "./music";
import type { DemoStretch } from "./demo/grids";

/* ---------------------------------------------------------------- the words ----------------------------------- */

/**
 * The coda's words (POSTCREDIT_DESIGN §3.4, §3.11): the pose's own name as a sentence, the release session's starting
 * line unchanged, and the status; the description and the transcript's closing block go with the main film only.
 */
export const CODA_TEXT = {
  rests: "Pebble rests.",
  soon: "Soon, it may learn while it does.",
  /** 1:1 and 9:16 break it after "learn" */
  soonBroken: "Soon, it may learn\nwhile it does.",
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
 * The coda's light: the night riverbed as the site draws it, neutral on the dark plate (POSTCREDIT_DESIGN §3.5; the
 * night grade would darken the stone with it, and its cool wash would tint the page's dark palette), no key light of the
 * film's own (the plate's own pool, from above left, is the only light) and the night grade's shade-green vignette.
 */
export const CODA_GRADE: Grade = { ...GRADES.page, name: "night riverbed", keyLight: 0, vignette: GRADES.night.vignette };

/**
 * The ground: the site's own night wallpaper (tools/assets/wallpaper/wallpaper-dark.svg) without its vignette, as
 * capture/riverbed-plate.mjs renders it (video/public/desktop/riverbed-dark@3x.png, gitignored), then a 2400-px JPEG
 * beside the light one (`sips -s format jpeg -s formatOptions 88 -Z 2400 …`). Until it exists the view draws the
 * wallpaper's own mid tone (#1D2520, the site's dark --wallpaper-tint), never black.
 *   median    the plate's measured median (a 160 × 100 area-scaled sample of the JPEG, 28 Oct): the light check and
 *             the flash model read it
 *   exposure  the plate's exposure, a neutral linear-light gain the view multiplies into the ground's light, constant
 *             through the shot, by measurement: the renders of 28 Oct drew the plate as it comes and left the last
 *             frame's ground median #272F2A–#29322D, ΔE 8.0–9.4 from the dark --bg (#191E1B) the site's footer sits on;
 *             at 0.55 the plate's median becomes #1D2520, exactly the site's dark --wallpaper-tint (its riverbed's
 *             ground), and the ground's within ΔE 5 of the --bg (codaChecks.ts codaLight)
 */
export const CODA_PLATE = { src: "desktop/riverbed-dark-2400.jpg", fallback: "#1D2520", median: "#29332D", exposure: 0.55, units: { w: 1600, h: 1000 } } as const;

/** Where the night plate sits in a frame: `scale` world px of the ground's plane a plate unit, and the plate's point (its units) on the ground's centre at the shot's ref pose. */
export interface PlateFraming {
  scale: number;
  centre: Point;
}

/**
 * The night plate's framing per aspect (OVERRIDES §65 on the post-credit review's P2-9, second half: no riverbed pebble
 * on the night plate may read larger than the sleeping stone; codaChecks.ts codaPlate holds it on every frame, against
 * the plate's own pebbles, codaPlate.ts). null: the ground is sized from the shot's own widest pose as every shot's is
 * (setpieces/ground.ts), 2.125 world px a plate unit here: 16:9 shows the plate's middle, with two pebbles' rims at its
 * corners, 1:1 a middle no pebble reaches. The tall 9:16 frame showed four of the plate's pebbles, the largest drawn
 * 1,105 × 607 px against the stone's body of 263 × 232; and at any scale that covers its height, every pebble of the plate
 * is larger than the stone. So 9:16 shows a stretch of the plate between its pebbles instead: 3 world px a plate unit
 * (×1.41), the plate's point (1060, 480) on the frame's centre, 32 units clear of every pebble's outline at the iris-in,
 * where the ground is seen widest (the push only narrows it). Its median there is #232C27 (the plate's 160 × 100 sample;
 * #181F1B under the coda's light, ΔE 1.3 from the dark --bg, where the whole plate's #29332D gives #1D2520, ΔE 3.3).
 */
export const CODA_PLATE_FRAMING: Readonly<Record<Aspect, PlateFraming | null>> = {
  "16:9": null,
  "1:1": null,
  "9:16": { scale: 3, centre: { x: 1060, y: 480 } },
};

/** The ground's rect (world units of the ground's plane) that puts the plate where `framing` says, about the shot's ref pose. */
export const plateRect = (ref: Pose, framing: PlateFraming, units: { w: number; h: number } = CODA_PLATE.units): Rect => ({
  x: ref.x - framing.centre.x * framing.scale,
  y: ref.y - framing.centre.y * framing.scale,
  w: units.w * framing.scale,
  h: units.h * framing.scale,
});

/** The night plate's median as a frame shows it: its exposure, then the light `g` (the ground's gains, the filter, the washes). */
export const plateUnder = (g: Grade, plate: { median: string; exposure: number } = CODA_PLATE): RGB =>
  gradeColor(applyGroundLight(hexToRgb(plate.median), { ground: [plate.exposure, plate.exposure, plate.exposure] }), g, 0.5, true);

/**
 * The scene's own small sound (§62; POSTCREDIT_DESIGN §3.7): room tone throughout, one CC0 tap; no music. Built by the
 * score lane (OVERRIDES §65; CUE_SHEET.md revision 3 §13.3): tools/audio/score2/coda_timing.ts reads this plan's timing
 * at build time, score_layers.py lays the end card's room tone on without a restart to the coda's last frame
 * (extra.timing.end) and the tap with its peak on L-C2's landing (extra.timing.line2) at these levels, score_build.py
 * builds them into the main master, and score_coda.py checks them on it, each check with a planted canary.
 */
export const CODA_SOUND = {
  builtBy: "the score lane (tools/audio/score2: score_layers.py lays it, score_build.py builds it, score_coda.py checks it)" as string | null,
  roomTone: { kind: "bed", take: "room_tone_b", licence: "ours (designed air, .work/sfx2/KIT.md)", lufs: -52, note: "the end card's room tone carried on without a restart, to the coda's last frame" },
  tap: { kind: "oneShot", take: "standin_tap_a", licence: "CC0 (Kenney impactWood_light_002)", lufs: -30, note: "the title's own stone tap; its peak on L-C2's landing" },
} as const;

/** One layer of the coda's sound, local frames: a bed under frames [from, to), or a one-shot whose peak is on `at`. */
export type CodaSoundLayer =
  | { kind: "bed"; take: string; licence: string; lufs: number; note: string; from: number; to: number }
  | { kind: "oneShot"; take: string; licence: string; lufs: number; note: string; at: number };

/** The coda's one-shots (the plan has one: the tap). */
export const codaOneShots = (x: CodaExtra): Extract<CodaSoundLayer, { kind: "oneShot" }>[] => x.sound.layers.filter((l): l is Extract<CodaSoundLayer, { kind: "oneShot" }> => l.kind === "oneShot");

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
  /**
   * the hairline on its edge, or null for none: the closing iris keeps the film's (the night green coming in round the
   * end card's stone, the film's iris grammar); the opening one has none, since a ring-coloured circle opening from the
   * sleeping stone is the film's ring, Pebble acting (codaChecks.ts codaNoUi refuses it)
   */
  hairline: string | null;
  ease: "move";
}

export interface CodaExtra {
  /**
   * the end card it follows: its id, its true ending (this piece's L0, in its own frames), the plan the view plays, and
   * the still wait it declares at its end (its own frames; the film's last breath in the X cut, not in the main cut)
   */
  endCard: { id: string; end: number; shot: string; extended: ScenePlan; lastBreath: { from: number; to: number } | null };
  /**
   * the end card's lines carried in (page 2's): no exit of their own in the main cut, the closing iris takes them with
   * the page (TypeSpec.covered: the frames its edge crosses each)
   */
  carried: readonly string[];
  /** the coda's own lines */
  lines: readonly string[];
  /** the iris that closes onto the end card's stone (B) and the iris that opens from the coda's stone (D) */
  irisOut: CodaIris;
  irisIn: CodaIris & { startRadius: number };
  /** the flat night green between the irises: no camera, nothing drawn */
  breath: { from: number; to: number };
  /**
   * §62's one breath of silence (OVERRIDES §65, the lead's ruling (a) on the post-credit review's P1-4): the end card's
   * true ending, then a dark beat, from L0 to the iris-in (the iris-out and the breath), ONE declared wait on the two
   * shots it spans (the page's frames, the breath's); the end card's own declared last breath comes before it, and the
   * camera floor applies from the iris-in on
   */
  silence: { from: number; to: number };
  lastBreath: { from: number; to: number };
  push: { px: number; lz: number; from: number; ease: number; still: number };
  stone: { palette: "dark"; initialPose: "sleepy"; colors: typeof CODA_STONE_COLORS; blink: { target: number; keepClear: FrameSpan[]; clockOffset: number } };
  ground: { src: string; fallback: string; median: string; exposure: number };
  /** where the night plate sits in this aspect (CODA_PLATE_FRAMING; null: the ground sized from the shot's own poses) */
  plateFraming: PlateFraming | null;
  grade: Grade;
  /** the scene's sound as layers (codaSound counts them: one bed under every frame, one one-shot), and who builds it */
  sound: { builtBy: string | null; layers: readonly CodaSoundLayer[] };
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
  text?: Partial<Record<"rests" | "soon" | "soonBroken" | "status", string>>;
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

/**
 * The coda's lines as the browser sets them (Fraunces 350, SOFT 100, WONK 0, −0.022 em, the bundled variable font, in
 * Chrome 145's headless shell), measured on the 16:9 renders of 28 Oct (L257 and L464 agree within 2 px): the distance
 * from a line's box edge to its ink's far edge, in em of the 16:9 size (72 px). approxLineWidth's 0.48 em a character
 * is 24–33 % wider for them (L-C2 as "will": 1,175 px estimated, 884 drawn), which set the 16:9 lockup 150 px left of
 * the frame's centre. L-C2 as "may" was measured the same way on a full-size still of L467 (28 Oct 05:38: 1,011 px of
 * ink from its box's edge at zoom 1.117, so 12.58 em; L-C1 and L-C3 on that still agree with the rows below within
 * 1.3 px; the estimate is 1,140 px, 26 % wider). Used where the layout depends on a width (16:9, the lines beside the
 * stone) and by the checks there (TypeBox.inkWidth); a text not in the table falls back to the estimate. Re-measure if
 * the lines or the font change.
 */
export const CODA_INK_EM_16x9: Readonly<Record<string, number>> = {
  "Pebble rests.": 5.03,
  "Soon, it may learn while it does.": 12.58,
  "Not built yet.": 5.13,
};

/** A coda line's width for the 16:9 layout: measured when the table has it, else approxLineWidth's estimate. */
const sideLineWidth = (text: string, f: FrameBox): number => {
  const em = CODA_INK_EM_16x9[text];
  return em !== undefined ? em * typeSizePx("expressive", f.w, f.h, 0) : approxLineWidth(text, "expressive", f.w, f.h, 0);
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
    // the lockup centred on the frame: the stone left, the lines right, the block's middle on the stone's middle; the
    // lines' widths are the ones the browser draws (CODA_INK_EM_16x9), so the drawn lockup is centred, not an estimate
    // of it, and the checks read the same widths (TypeBox.inkWidth)
    const widths = lines.map((t) => sideLineWidth(t, f));
    const W = ext.w + gap + Math.max(...widths);
    const left = f.w / 2 - W / 2;
    const stone = { x: left - ext.x, y: f.h / 2 - (BODY.top + BODY.bottom) * 0.5 * (px / VIEWBOX_SIZE) };
    const linesLeft = left + ext.w + gap;
    const top = f.h / 2 - blockH / 2;
    const tops = [top, top + counts[0]! * lh, top + (counts[0]! + counts[1]!) * lh];
    const boxes = tops.map((t, i) => ({ left: linesLeft, top: t, align: "left" as const, ...(CODA_INK_EM_16x9[lines[i]!] !== undefined ? { inkWidth: widths[i]! } : {}) })) as [TypeBox, TypeBox, TypeBox];
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

/**
 * The share of its radius a coda iris's feather may take. The film's iris is feathered 36 px at 1080 (IRIS_DRAWN), which
 * no other seam shows (it opens light on light); on the night green the feather is the coda's whole look at a small
 * hole, and the renders of 28 Oct showed it: a hole no wider than its feather read as a glowing dot (the closing iris
 * on L31) and a halo round the hairline (the opening iris's first frames), not as a face. So the feather narrows to
 * this share of the radius while the hole is small, and is the film's 36 px from 120 px on.
 */
export const IRIS_FEATHER_SHARE = 0.3;

/** The feather a coda iris draws at radius R (px of the frame): the film's feather, narrowed while the hole is small. */
export const codaFeather = (R: number, feather: number): number => Math.max(0, Math.min(feather, IRIS_FEATHER_SHARE * R));

/** A coda iris on a frame: its centre, radius, feather (the mask is clear inside R − feather, opaque at R), half-opaque radius (the checks' boundary and the hairline's) and progress. */
export interface CodaIrisFrame {
  c: Point;
  R: number;
  feather: number;
  edge: number;
  u: number;
}

const irisFrame = (c: Point, R: number, featherMax: number, u: number): CodaIrisFrame => {
  const feather = codaFeather(R, featherMax);
  return { c, R, feather, edge: R - feather / 2, u };
};

/**
 * The closing iris on a local frame (B): centred on the end card's stone where the page's camera has it on that frame,
 * its radius falling on E-move from past the frame's farthest corner to nothing; null outside it. The view draws R and
 * the feather; `edge` is the half-opaque radius.
 */
export function codaIrisOut(p: ScenePlan, fr: number): CodaIrisFrame | null {
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
  return irisFrame(c, R, o.feather, u);
}

/**
 * The opening iris on a local frame (D), with the centre and radius transitions/presentations.tsx ringIris() draws and
 * setpieces/qa.ts irisOnFrame() models: centred where the coda's stone is on the shot's first frame, from the stone's
 * face (IRIS_DRAWN's start radius) past the farthest corner on E-move; its feather narrowed while the hole is small
 * (codaFeather; the same as ringIris's from 120 px on); null outside it.
 */
export function codaIrisIn(p: ScenePlan, fr: number): CodaIrisFrame | null {
  const x = codaOf(p);
  if (!x) return null;
  const o = x.irisIn;
  if (fr < o.at || fr >= o.at + o.frames) return null;
  const shot = p.shots.find((s) => s.id === "coda")!;
  const c = worldToFrame(shot.stone!.at, shot.camera.pose(0), p.frame.w, p.frame.h);
  const Rmax = radiusToCorners(c, p.frame.w, p.frame.h) + o.feather;
  const u = (fr - o.at) / o.frames;
  const R = irisRadius(u, o.startRadius, Rmax, o.ease);
  return irisFrame(c, R, o.feather, u);
}

/** A stroke the coda draws on a frame: a circle (frame px) in `color` at `opacity`, `widthPx` wide. */
export interface CodaStroke {
  iris: "out" | "in";
  c: Point;
  r: number;
  color: string;
  opacity: number;
  widthPx: number;
}

/**
 * The hairline the view (CodaView's NightCover) draws on a local frame, exactly: on the half-opaque radius of the iris
 * in flight, in its colour, fading in over its first 8 % and out over its last 15 %; null when that iris has none (the
 * opening one: CodaIris.hairline) or none is in flight. The checks read this, so what they judge is what is drawn.
 */
export function codaHairline(p: ScenePlan, fr: number): CodaStroke | null {
  const x = codaOf(p);
  if (!x) return null;
  const out = codaIrisOut(p, fr);
  const inn = out ? null : codaIrisIn(p, fr);
  const hole = out ?? inn;
  const iris = out ? x.irisOut : x.irisIn;
  if (!hole || !iris.hairline) return null;
  const opacity = smoothstep(0, 0.08, hole.u) * (1 - smoothstep(0.85, 1, hole.u));
  if (opacity <= 0.002) return null;
  return { iris: out ? "out" : "in", c: hole.c, r: Math.max(0.5, hole.edge), color: iris.hairline, opacity, widthPx: RING.hairlinePx * p.frame.unit };
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
  // the lines the end card holds to its last frame (page 2's): in the main cut they have no exit of their own, and the
  // closing iris takes them with the page (OVERRIDES §65 on the post-credit review's P2-1: their exits lifted the
  // middle tiles just before the iris darkened them, a rise before the fall, one flash on the 16:9 and 1:1 renders).
  // `exit: "camera"`: no drawn exit, the line leaves with the world that carries it; once the plan exists, `covered`
  // gives the frames the iris's edge crosses each (its declared exit) and `exitAt` the first of them
  const held = ec.types.filter((t) => t.exitAt === undefined);
  for (const t of held) if (t.carry && t.carry.shot !== title.id) throw new Error(`the end card's ${t.id} is set in ${t.carry.shot}, not its last shot`);
  const carried: TypeSpec[] = held.map((t) => ({
    ...t,
    at: t.at - end0,
    exit: "camera" as const,
    ...(t.carry ? { carry: { shot: "page", at: t.carry.at - end0, ...(t.carry.outFrom !== undefined ? { outFrom: t.carry.outFrom - end0 } : {}) } } : {}),
  }));
  // the end card's own plan played on past its end, for the view: its last shot to the iris-out's end on the carried
  // camera, its held lines held on with it (the night cover takes them); nothing before `end` changes, nothing is added
  const extended: ScenePlan = {
    ...ec,
    duration: end0 + irisOutEnd,
    shots: ec.shots.map((s) => (s === title ? { ...s, to: end0 + irisOutEnd, camera: continued, waits: [] } : s)),
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
  // §62's one breath of silence (OVERRIDES §65, ruling (a)): L0 to the iris-in, one wait, declared on the two shots it
  // spans as the foundation reads a wait (the shot a frame falls in): the page's frames, then the breath's
  const silence = { from: 0, to: irisIn };
  // the night plate, framed for this aspect (CODA_PLATE_FRAMING: in 9:16, between the plate's pebbles)
  const framing = CODA_PLATE_FRAMING[A];
  const shots: ShotSpec[] = [
    { id: "page", from: 0, to: irisOutAt, kind: "title", camera: pageCam, ref: title.ref, ground: "page", planes: [], stone: pageStone, rings: [], waits: [{ from: silence.from, to: irisOutAt }] },
    // flat night green (the page's ground at night): its camera is still and nothing in it moves
    { id: "breath", from: irisOutAt, to: irisIn, kind: "cutscene", camera: new VelocityCamera(pose0), ref: pose0, ground: "page", planes: [], rings: [], waits: [{ from: irisOutAt, to: silence.to }] },
    { id: "coda", from: irisIn, to: end, kind: "title", camera: cam, ref: pose0, ground: "riverbed", ...(framing ? { groundRect: plateRect(pose0, framing) } : {}), planes: [], stone: codaStone, rings: [], waits: [{ from: still, to: end }], dofScale: 8 },
  ];
  const endGrade = gradeAt(end0 - 1, ec.lightInitial, ec.lightCues);
  const lightCues: LightCue[] = [{ at: irisOutEnd, to: CODA_GRADE, frames: irisIn - irisOutEnd }];
  const feather = IRIS_DRAWN.featherPx * f.unit;

  const extra: CodaExtra = {
    endCard: { id: ec.id, end: end0, shot: title.id, extended, lastBreath: (title.waits ?? []).find((w) => w.to >= end0) ?? null },
    carried: carried.map((t) => t.id),
    lines: [...CODA_LINES],
    irisOut: { at: irisOutAt, frames: irisOutF, feather, hairline: RING.color.light, ease: "move" },
    // no hairline on the opening iris: the renders of 28 Oct showed a lone sage ring (the film's ring colour and width,
    // over the 36 frames of a ring's emit) leaving the sleeping stone, since the plate's inside sits within ΔE 2–4 of
    // the night green outside and the hairline was the only edge; the design rules that image out (§6)
    irisIn: { at: irisIn, frames: irisInF, feather, hairline: null, ease: "move", startRadius: IRIS_DRAWN.startRadiusPx * f.unit },
    breath: { from: irisOutEnd, to: irisIn },
    silence,
    lastBreath: { from: still, to: end },
    push: { px: CODA_PUSH_PX[A], lz, from: irisIn, ease, still },
    stone: { palette: "dark", initialPose: "sleepy", colors: CODA_STONE_COLORS, blink: { target: blinkTarget, keepClear, clockOffset } },
    ground: CODA_PLATE,
    plateFraming: framing,
    grade: CODA_GRADE,
    sound: { builtBy: CODA_SOUND.builtBy, layers: [{ ...CODA_SOUND.roomTone, from: 0, to: end }, { ...CODA_SOUND.tap, at: line2 }] },
    captions: [
      { from: 0, to: line1 - rise(texts.rests), text: "[Silence]" },
      { from: line1 - rise(texts.rests), to: line2, text: CODA_TEXT.rests },
      { from: line2, to: end, text: `[A soft tap]\n${CODA_TEXT.soon} ${CODA_TEXT.status}` },
    ],
    text: CODA_TEXT,
    dip: { from: irisOutAt, to: irisIn + irisInF },
    flashWait,
  };

  const plan: ScenePlan = {
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
  // page 2's lines, taken by the closing iris: the frames its edge crosses each (their declared exit), and the reading
  // model reads each until the iris reaches it (TypeSpec.covered, exitAt)
  const ids = new Set(carried.map((t) => t.id));
  return {
    ...plan,
    types: plan.types.map((t) => {
      if (!ids.has(t.id)) return t;
      const c = irisCover(plan, t);
      return { ...t, exitAt: c.from, covered: { ...c, by: "iris" } };
    }),
  };
}

/**
 * The frames the closing iris crosses a line on the end card's page (the line's rect as its world carries it, the
 * iris as CodaView draws it): from the first frame its feathered edge reaches the line (the line no longer wholly in
 * the clear) to the first frame the night covers it wholly; the iris-out's end at most (the page is not drawn after).
 */
export function irisCover(p: ScenePlan, t: TypeSpec): { from: number; to: number } {
  const x = codaOf(p)!;
  const shut = x.irisOut.at + x.irisOut.frames;
  const r0 = lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5);
  let from = shut;
  for (let fr = x.irisOut.at; fr < shut; fr++) {
    const o = codaIrisOut(p, fr)!;
    const r = carriedRect(p, t, r0, fr);
    const far = Math.max(...[r.x, r.x + r.w].flatMap((px) => [r.y, r.y + r.h].map((py) => Math.hypot(px - o.c.x, py - o.c.y))));
    const near = Math.hypot(Math.max(r.x, Math.min(o.c.x, r.x + r.w)) - o.c.x, Math.max(r.y, Math.min(o.c.y, r.y + r.h)) - o.c.y);
    if (from === shut && far > o.R - o.feather) from = fr;
    if (near >= o.R) return { from: Math.min(from, fr), to: fr };
  }
  return { from, to: shut };
}

/* ---------------------------------------------------------------- the flash model (C8) -------------------------- */

/** The relative luminances the flash model draws with (CODA_LUMA; a calibration against a render varies them: codaCalibrate.ts). */
export interface CodaLuma {
  page: number;
  night: number;
  plate: number;
  endStone: number;
  stone: number;
  inkOnPage: number;
  inkOnNight: number;
  ink2OnNight: number;
  /** the share of a line's box its glyphs cover */
  inkShare: number;
}

/**
 * The relative luminances the model uses (WCAG), from the palette: the page under its grade, the night green, the
 * night plate (its measured median at its exposure), the two stones, the two inks. A line's glyphs cover about a fifth
 * of its box (an estimate: codaCalibrate.ts measures it on a render).
 */
export const CODA_LUMA: Readonly<CodaLuma> = {
  page: relLuminance(gradeColor(hexToRgb(COLOR.page), GRADES.page)),
  night: relLuminance(hexToRgb(COLOR.nightPage)),
  /** the plate's measured median at its exposure, under the coda's light */
  plate: relLuminance(plateUnder(CODA_GRADE)),
  endStone: relLuminance(hexToRgb(COLOR.pebble)),
  stone: relLuminance(hexToRgb(CODA_STONE_COLORS.body)),
  inkOnPage: relLuminance(hexToRgb(COLOR.ink)),
  inkOnNight: relLuminance(hexToRgb(COLOR.nightInk)),
  ink2OnNight: relLuminance(hexToRgb(NIGHT_INK2)),
  inkShare: 0.22,
};

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
function frameShapes(p: ScenePlan, fr: number, luma: Readonly<CodaLuma> = CODA_LUMA) {
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
      if (t.covered) {
        // no exit of its own (page 2's lines in the main cut): drawn whole until the iris has passed it; the closing
        // iris's hole (below) covers it as CodaView draws it
        if (fr >= t.covered.to) continue;
      } else if (t.exitAt !== undefined && fr >= t.exitAt) {
        const out_ = exitFramesOf(ent, t.exit ?? "blur", t.text, p.fps);
        shown *= 1 - clamp01((fr - t.exitAt) / Math.max(1, out_));
      }
      if (shown <= 0) continue;
      const rect = carriedRect(p, t, lineRect(t.text, t.tier, p.frame, t.box, t.sizeT ?? 0.5), fr);
      out.push({ rect, shown, L: layer === "page" ? luma.inkOnPage : t.color === NIGHT_INK2 ? luma.ink2OnNight : luma.inkOnNight, ground: layer === "page" ? luma.page : luma.plate });
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
function lumaAt(s: ReturnType<typeof frameShapes>, px: number, py: number, luma: Readonly<CodaLuma> = CODA_LUMA): number {
  const layer = (which: "page" | "coda"): number => {
    const l = which === "page" ? s.page : s.coda;
    if (!l) return luma.night;
    if (Math.hypot(px - l.stone.c.x, py - l.stone.c.y) <= l.stone.r) return which === "page" ? luma.endStone : luma.stone;
    for (const ln of l.lines) if (inRect(ln.rect, px, py)) return ln.ground + (ln.L - ln.ground) * luma.inkShare * ln.shown;
    return which === "page" ? luma.page : luma.plate;
  };
  if (s.covered) return luma.night;
  if (s.hole) return Math.hypot(px - s.hole.c.x, py - s.hole.c.y) <= s.hole.r ? layer(s.hole.keep) : luma.night;
  return layer(s.page ? "page" : "coda");
}

/** Every tile's mean relative luminance on every frame of the plan, and the whole frame's (the model of qa/luma.ts's frames). */
export function codaLumaSeries(p: ScenePlan, from = 0, to = p.duration, luma: Readonly<CodaLuma> = CODA_LUMA): { tiles: number[][]; whole: number[] } {
  const { w, h } = p.frame;
  const G = FLASH_GRID;
  const tiles: number[][] = Array.from({ length: G * G }, () => []);
  const whole: number[] = [];
  for (let fr = from; fr < to; fr++) {
    const s = frameShapes(p, fr, luma);
    let sum = 0;
    for (let ty = 0; ty < G; ty++)
      for (let tx = 0; tx < G; tx++) {
        let t = 0;
        for (let j = 0; j < SAMPLES; j++)
          for (let i = 0; i < SAMPLES; i++) t += lumaAt(s, ((tx + (i + 0.5) / SAMPLES) * w) / G, ((ty + (j + 0.5) / SAMPLES) * h) / G, luma);
        const m = t / (SAMPLES * SAMPLES);
        tiles[ty * G + tx]!.push(m);
        sum += m;
      }
    whole.push(sum / (G * G));
  }
  return { tiles, whole };
}

/** Flashes (pairs of opposing transitions of 0.1 or more, the darker below 0.8) per tile and for the whole frame. */
export function codaFlashModel(p: ScenePlan, luma: Readonly<CodaLuma> = CODA_LUMA): { worst: { where: string; flashes: number; at: number }; findings: Finding[]; transitions: number } {
  const { tiles, whole } = codaLumaSeries(p, 0, p.duration, luma);
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

/**
 * X's cap for a standard account: 140 s (help.x.com; OVERRIDES §14), 8,400 frames at 60 fps. The master runs 8,102
 * frames (2:15.03) on the score lane's cue sheet, revision 2, whose flex rule F4 (its one shortening splice) is already on,
 * so past 139.5 s what gives is the lead's call.
 */
export const X_CAP_S = 140;
export const X_AIM_S = 139.5;

/** A piece of the film as the placement check reads it. */
export type FilmPiece = Pick<ScenePlan, "id" | "duration" | "fps" | "endsFilm" | "extra">;

/** Whether a piece is the post-credit scene. */
const isCoda = (p: FilmPiece): boolean => !!(p.extra as { coda?: unknown } | undefined)?.coda;

/** The X version's length in frames: the main master to the coda's first frame (the whole film when it has no coda). */
export const xCutFrames = (pieces: readonly FilmPiece[]): number => {
  let n = 0;
  for (const p of pieces) {
    if (isCoda(p)) break;
    n += p.duration;
  }
  return n;
};

/** The X version's pieces: the main cut's, up to the coda's first frame (frames 0 to xCutFrames − 1 of the master). */
export const xCut = <P extends FilmPiece>(pieces: readonly P[]): P[] => {
  const at = pieces.findIndex(isCoda);
  return at < 0 ? [...pieces] : pieces.slice(0, at);
};

/** The film's cuts (OVERRIDES §50, §62): the main film, its X version, the tour cut, the 40-s cut, a short per feature area. */
export type FilmCut = "main" | "x" | "tour" | "40s" | "short";

/** The cuts that play the post-credit scene: the main film only (OVERRIDES §62, §65; POSTCREDIT_DESIGN §3.10). */
export const CODA_CUTS: readonly FilmCut[] = ["main"];

/**
 * A cut's pieces against the coda's wiring (POSTCREDIT_DESIGN item 14; OVERRIDES §62, §65): the main cut plays the
 * coda after an end card planned with finale.ts's `then: "coda"`, placed as codaPlacement places it (the last piece,
 * from that end card's true ending), and an end card planned so is followed by it there; no other cut plays it (the X
 * version is the main master to the coda's first frame, xCut; the tour, the 40-s cut and the shorts end on their own
 * end cards, page 2 held to its last frame).
 */
export function codaCut(pieces: readonly FilmPiece[], cut: FilmCut): Finding[] {
  const out: Finding[] = [];
  const codas = pieces.filter(isCoda);
  if (!CODA_CUTS.includes(cut)) {
    if (codas.length) out.push({ check: "codaCut", level: "error", message: `the ${cut} cut plays the post-credit scene: only the main film does (OVERRIDES §62; the X version ends at the end card's true ending)` });
    return out;
  }
  pieces.forEach((p, i) => {
    const next = pieces[i + 1];
    if (finaleThen(p) === "coda" && !(next && isCoda(next) && (next.extra as { coda: CodaExtra }).coda.endCard.id === p.id)) out.push({ check: "codaCut", level: "error", message: `${p.id} is planned with then: "coda", but the ${cut} cut does not play the post-credit scene after its true ending${next ? ` (${next.id} follows it)` : ""}` });
    if (isCoda(p) && (i === 0 || finaleThen(pieces[i - 1]!) !== "coda")) out.push({ check: "codaCut", level: "error", message: `the post-credit scene follows ${pieces[i - 1]?.id ?? "nothing"}, which is not planned with then: "coda" (finale.ts): the main composition plays it only after the end card that says so` });
  });
  if (codas.length) out.push(...codaPlacement(pieces).findings.filter((f) => f.level !== "info"));
  return out;
}

/**
 * The coda's place in a film (POSTCREDIT_DESIGN §3.10, C10): it is the film's last piece, right after the end card it
 * was planned against and starting on that end card's true ending (so the X version, the master cut there, holds no
 * coda frame), and the X version fits X's 140 s (8,400 frames at 60 fps; a warning past 139.5 s, the lead's call).
 */
export function codaPlacement(pieces: readonly FilmPiece[]): { findings: Finding[]; xFrames: number } {
  const out: Finding[] = [];
  const at = pieces.findIndex(isCoda);
  const xFrames = xCutFrames(pieces);
  if (at < 0) return { findings: [{ check: "codaPlacement", level: "info", message: "this cut has no coda" }], xFrames };
  const coda = pieces[at]!;
  const x = (coda.extra as { coda: CodaExtra }).coda;
  const fps = coda.fps;
  if (pieces.filter(isCoda).length > 1) out.push({ check: "codaPlacement", level: "error", message: "the film has more than one coda" });
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
  else if (xFrames > aim) out.push({ check: "codaPlacement", level: "warn", message: `the X version runs ${(xFrames / fps).toFixed(2)} s, within ${((cap - xFrames) / fps).toFixed(2)} s of X's cap: what gives is the lead's call (the score's flex rule F4, its one shortening splice, is already on)` });
  else out.push({ check: "codaPlacement", level: "info", message: `the X version is the master's first ${xFrames} frames (${(xFrames / fps).toFixed(2)} s); the main film runs ${pieces.reduce((n, p) => n + p.duration, 0)}` });
  return { findings: out, xFrames };
}
