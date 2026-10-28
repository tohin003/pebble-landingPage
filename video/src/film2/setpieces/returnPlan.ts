// THE RETURN (MONTAGE_DESIGN revision 2; OVERRIDES §61: the person chose it, at the end only, in place of the wall and
// the convergence): the plan. After the kept card, the camera pulls back from S24's last frame (the first cell) to the
// whole field; real Pebble 2.0 screens rush in on three rings around the stone, swap in place or slide along their
// rings, then each returns along its own radius into the stone's own outline, the kept card last; the stone's own idle
// blink falls 6–8 frames after the last cell has gone; the finale's iris opens the page from the one stone and the
// title lands on A4's bar 82. 12.0 s from R0, 13.0 s with the lead-in.
//
//   returnGrid()        the music: B2 "Your Breath" run on in its own order from 1:36.53 (bar 48, R0) to the J5 beat cut
//                       at 1:44.53 (R480) into A4 "Born Of The Sky" 2:40.52 (bar 80), bar 81 (R600), bar 82 (R720, the
//                       title's hit), on the score lane's revised beat sheet (CUE_SHEET.md revision 2, "the Return";
//                       BEAT_SHEET.json of 28 Oct), whose marks and bar lines all fall on the plan's frames
//   returnCameraAt()    the camera of §2.6 on an R-frame: a log-space pull-back from S24's last frame to the whole field
//                       (slow at first, E-move on u^1.3), panning from the kept card to the stone; a 12 % push from R200
//                       to R480 overlapping it; a pan that lands the stone on the title stone's pose on R656 (with the
//                       page's own glide, so one stone goes through the iris)
//   planReturn()        the piece: the field's shot (setpieces/returnField.ts; its rings and cells at RETURN_FIELD_SCALE,
//                       ×1.1 about the stone, G1's choice), then the finale's iris, title and end card
//                       (setpieces/finale.ts through its `head`), one stone through the iris (StoneSpec.layer and
//                       clockOffset: setpieces/blink.ts puts the engine's own blink on R646)
// The Return is a montage act (lead ruling R2): its span is exempt from cutRate, holds and readingLoad and is held to
// returnSchedule, returnWindows, returnContent, returnMerge with returnRadius, cellText, blinkPlaced, joinPose,
// cameraFloor, stoneCount and groundCoverage (setpieces/returnChecks.ts). Its camera is the montage's one continuous
// move (R1: "all in one continuous shot"), declared to no §5.1 push range; it is held to the camera floor and to the
// travel limit (30 px a frame at the corners) instead.
// Pure; no React.
import { COLOR, f60 } from "../tokens";
import { typeSizePx } from "../type/scale";
import { lineHeightOf } from "./frame";
import { E_MOVE, smoothstep } from "../motion/ease";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import type { Point } from "../motion/geometry";
import type { LightCue } from "../light/grades";
import type { PebbleCue } from "../../../../shared/pebble/cues";
import { place, steadyGrid, type MusicGrid, type MusicalLevel } from "./music";
import { anchored, landFrames, musicHit } from "./kit";
import { move, type MusicHit, type ScenePlan, type ShotSpec, type TypeSpec } from "./scene";
import { planFinale, type FinaleHead, type FinaleHeadContext, type FinaleTiming } from "./finale";
import { stonesOnFrame } from "./qa";
import { offsetForBlink, type FrameSpan } from "./blink";
import { RETURN_GEOMETRY, RETURN_OMEGA_R1, buildReturnField, fitEntries, localOfR, rOfLocal, type ReturnField, type ReturnFieldOptions, type ReturnGeometry } from "./returnField";
import type { Aspect } from "../tokens";
import type { DemoStretch } from "./demo/grids";

/* ---------------------------------------------------------------- the music (§2.10, §5.2) ---------------------- */

/** The Return's music, measured (the score lane's maps; source times as the revised beat sheet gives its bar lines): B2 run on, then J5 into A4 bars 80–82. */
export const RETURN_MUSIC = {
  /** B2 "Your Breath" (Mixkit): 119.994 BPM; R0 is its bar 48 at 1:36.5306 */
  b2: { bpm: 119.994, r0S: 96.5306 },
  /** A4 "Born Of The Sky" (Scott Buckley, CC BY 4.0): 120.014 BPM; J5 lands on bar 80 at 2:40.5249, the title on bar 82 at 2:44.5244 */
  a4: { bpm: 120.014, j5S: 160.5249, titleS: 164.5244 },
  /** R-frames */
  j5R: 480,
  titleR: 720,
} as const;

/**
 * Where the Return sits in the main film, seconds of film time, from the timing source: the score lane's revised beat
 * sheet (CUE_SHEET.md revision 2 of 27–28 Oct, "the Return"; BEAT_SHEET.json's `return`, 28 Oct 04:30): the piece from
 * 1:45.0333 (R−60), R0 on B2's bar 48 at 1:46.0333, J5 on A4's bar 80 at 1:54.0337, the title on A4's bar 82 at
 * 1:58.0332. These are MONTAGE_DESIGN §5.2's 1:45.03, 1:46.03, 1:54.03 and 1:58.03 to within 4 ms. At 60 fps R−60, R0,
 * R480 and R720 fall on film frames 6302, 6362, 6842 and 7082, as the beat sheet's do; J5 is 0.4 ms past R0 + 8 s
 * (B2's bar is 120.006 frames), which rounds to the same frame.
 */
export const RETURN_FILM_S = { start: 105.0333, r0: 106.0333, j5: 114.0337, title: 118.0332 } as const;

/** The Return's music, as the demo reel names a piece's stretch (setpieces/demo/grids.ts): the real cue, not an audition stretch. */
export const RETURN_STRETCH: DemoStretch = {
  track: "Your Breath, run on, then Born Of The Sky",
  label: "B2 → A4",
  licence: "Mixkit Stock Music Free License (B2); CC BY 4.0 (A4)",
  bpm: RETURN_MUSIC.b2.bpm,
  anchorS: RETURN_MUSIC.b2.r0S,
  anchor: "R0 on B2's bar 48; J5 onto A4's bar 80 at R480; the title on bar 82 at R720",
};

/** The film frame of an R-frame at `fps` (the piece's local frame 0 is R−60, on RETURN_FILM_S.start). */
export const filmFrameOfR = (r: number, fps: number): number => Math.round(RETURN_FILM_S.start * fps) + localOfR(r, fps);

/** The R-frames the plan places on the music, with their level (MONTAGE_DESIGN §2.3, §2.10). */
export const RETURN_EVENTS: readonly { r: number; level: MusicalLevel; event: string }[] = [
  { r: -60, level: "half", event: "the pull-back starts from S24's last frame (B2 1:35.53)" },
  { r: 0, level: "bar", event: "the release: B2 bar 48 runs on (1:36.53)" },
  { r: 120, level: "bar", event: "the gather: the middle ring's first wave (B2 bar 49)" },
  { r: 240, level: "bar", event: "the swaps begin (B2 bar 50)" },
  { r: 360, level: "bar", event: "the rush (B2 bar 51)" },
  { r: 480, level: "phrase", event: "J5: the merge on A4 bar 80 (B2 1:44.53 → A4 2:40.52)" },
  { r: 600, level: "bar", event: "the inner ring returns; the reverse swell (A4 bar 81)" },
];

/**
 * The Return's grid in its piece's local frames (R−60 is frame 0): B2's beats to J5, A4's from it; phrase lines on R0
 * (a four-bar line of B2's lift), R480 (J5, the lift's first eight-bar phrase ends) and every four bars of A4 after; the
 * title's downbeat (R720) is the marked hit.
 */
export function returnGrid(fps = 60, to = Math.round(fps * 40)): MusicGrid {
  const j5 = Math.round(localOfR(RETURN_MUSIC.j5R, fps));
  // from the bar before R0, so the lead-in's start (R−60, local 0) is a half bar of the grid
  const b2 = steadyGrid({ bpm: RETURN_MUSIC.b2.bpm, fps, firstDownbeat: Math.round(localOfR(0, fps)), from: Math.floor(localOfR(-121, fps)), to: j5 });
  const a4 = steadyGrid({ bpm: RETURN_MUSIC.a4.bpm, fps, firstDownbeat: j5, from: j5, to, barsPerPhrase: 4 });
  const hit = Math.round(localOfR(RETURN_MUSIC.titleR, fps));
  return {
    beats: [...b2.beats, ...a4.beats],
    downbeats: [...b2.downbeats, ...a4.downbeats],
    phrases: [Math.round(localOfR(0, fps)), ...a4.phrases],
    beatsPerBar: 4,
    hits: [hit],
  };
}

/* ---------------------------------------------------------------- the camera (§2.6) ----------------------------- */

export interface ReturnCameraSpec {
  geometry: ReturnGeometry;
  /** the zoom that fills the frame with the first cell (S24's last frame) at R−60 */
  zCard: number;
  /** the pull-back's target (the push overlaps it, so the camera never stops) */
  zLow: number;
  /** where the stone lands, frame px at 1080 */
  title: Point;
  /** the R-frame it lands (the finale's landAt) */
  landR: number;
  /** S24's exit velocity carried into the pull-back (world px and log zoom per R-frame), decaying over `tau` R-frames */
  entry?: { x: number; y: number; lz: number; tau: number; lead?: number };
  /** the title page's glide (log zoom per R-frame), matched from `landBlendFrom` to `landR` */
  landLz: number;
  landBlendFrom: number;
  /** the pull-back's length and the pan from the kept card to the stone, R-frames (310 and 300; canaries run them faster) */
  pullFrames: number;
  panFrames: number;
  /** canary only: a cut into a fresh field (no pull-back from S24's frame) */
  fresh?: boolean;
  /**
   * What follows the pull-back (G1's A/Bs, MONTAGE_DESIGN §9): "push" (the design: a 12 % push from R200 to R480);
   * "pullback" (revision 1's travel, item 2: the pull-back ends tighter and a slow pull-back at `pullCornerPx` a frame at
   * the frame's corners carries the zoom to 1 at R480); "labels" (item 3, §2.8: the zoom held at 0.90 or less until R354,
   * then the push)
   */
  after?: "push" | "pullback" | "labels";
  /** revision 1's slow pull-back, px a frame at the frame's corners (0.33, MONTAGE_DESIGN.r1 §2.6) */
  pullCornerPx?: number;
}

/** ∫ smoothstep(a, b, t) dt from −∞ to q: 0 before a, (b − a)(x³ − x⁴ ⁄ 2) across it, then (b − a) ⁄ 2 + (q − b). */
export const rampInt = (q: number, a: number, b: number): number => {
  if (q <= a) return 0;
  if (q >= b) return (b - a) / 2 + (q - b);
  const x = (q - a) / (b - a);
  return (b - a) * (x ** 3 - x ** 4 / 2);
};

/** G1's labels variant (MONTAGE_DESIGN §2.8): the zoom stays at or under this until R354 (so the band clears the outer ring). */
export const LABELS_MAX_Z = 0.9;
export const LABELS_HOLD_R = 354;

/**
 * The zoom (log) the camera adds after the pull-back, on an R-frame (the pull-back's target `Ll` is the field's
 * framing it ends on): the design's push; revision 1's slow pull-back; or the labels variant's held push.
 */
function afterBloom(s: ReturnCameraSpec, r: number, Ll: number): number {
  const { W, H } = s.geometry;
  if (s.after === "pullback") {
    // a constant rate (eased in over R200–R260, out over R440–R480), so the zoom reaches 1 at R480 as the push's does
    const rate = (s.pullCornerPx ?? 0.33) / Math.hypot(W / 2, H / 2);
    return -rate * (rampInt(r, 200, 260) - rampInt(r, 440, 480));
  }
  if (s.after === "labels") {
    // a slow push at a constant rate (eased in over R200–R260) reaching LABELS_MAX_Z on R354, then the push to 1 by R480
    // on E-move, the slow rate fading over its first 30 frames, so the velocity never jumps
    const L90 = Math.log(LABELS_MAX_Z);
    const h = LABELS_HOLD_R;
    const A = (L90 - Ll) / rampInt(h, 200, 260);
    if (r <= h) return A * rampInt(r, 200, 260);
    // the slow rate after R354 fades as 1 − smoothstep(h, h + 30): it carries A × 15 more in all
    const carried = A * (r - h - rampInt(r, h, h + 30));
    return L90 - Ll + carried + (0 - L90 - A * 15) * E_MOVE((r - h) / (480 - h));
  }
  return (0 - Ll) * E_MOVE((r - 200) / 280);
}

/** The bloom's target zoom (log) for a camera: the design's zLow, or what the variant's after-bloom move needs to end on 1 at R480. */
const bloomTarget = (s: ReturnCameraSpec): number => {
  const Ll = Math.log(s.zLow);
  if (s.after === "pullback") return -afterBloom(s, 480, Ll);
  return Ll;
};

/** The camera spec for an aspect, as MONTAGE_DESIGN §2.6 and schedule_r2.py have it (`o` adds the plan's join and landing). */
export function returnCameraSpec(aspect: Aspect, o: Partial<ReturnCameraSpec> = {}): ReturnCameraSpec {
  const geometry = o.geometry ?? RETURN_GEOMETRY[aspect];
  const zCard = Math.min(geometry.W / geometry.hero.w, geometry.H / geometry.hero.h);
  return { geometry, zCard, zLow: 0.88, title: geometry.title, landR: 656, landLz: 0, landBlendFrom: 600, pullFrames: 310, panFrames: 300, ...o };
}

/** The camera on an R-frame: the world point at the frame's centre and the log of the zoom (px at 1080 a world px). */
export function returnCameraAt(s: ReturnCameraSpec, r: number): { x: number; y: number; L: number } {
  const RS = -60;
  const Lc = Math.log(s.zCard);
  const Ll = Math.log(s.zLow);
  const { W, H } = s.geometry;
  const bIn = s.geometry.ell[0][1];
  if (s.fresh) {
    // the canary: the field opens whole on the stone, with a slow push, as a cut would
    return { x: 0, y: 0, L: Ll + 0.0003 * (r - RS) };
  }
  const u = Math.max(0, (r - RS) / s.pullFrames);
  // the log-space pull-back from S24's last frame (slow at first), and the 12 % push overlapping its end (F03); G1's
  // variants replace the push (afterBloom), and revision 1's travel ends the pull-back tighter
  const Lb = bloomTarget(s);
  let L = Lc + (Lb - Lc) * E_MOVE(u ** 1.3) + afterBloom(s, r, Lb);
  // the pan from the kept card to the stone, then the glide that lands the stone on the title stone's pose
  const k = 1 - E_MOVE((r - RS) / s.panFrames);
  const p = r > 420 ? smoothstep(0, 1, Math.max(0, (r - 420) / (s.landR - 420)) ** 1.5) : 0;
  let x = (W / 2 - s.title.x) * p;
  let y = -bIn * k + (H / 2 - s.title.y) * p;
  if (s.entry) {
    // S24's own glide carried across the join, decaying (no net offset: t·e^(−t/τ))
    const t = r - RS;
    // (`lead`: the camera starts one film frame along S24's motion, so the first cell, a still of S24's last frame, moves
    // on the Return's first frame as S24's frame after it would have: no repeated frame at the join)
    const g = (t + (s.entry.lead ?? 0)) * Math.exp(-t / s.entry.tau);
    x += s.entry.x * g;
    y += s.entry.y * g;
    L += s.entry.lz * g;
  }
  if (s.landLz) {
    // the page's own glide from the landing (CR-01: the world's stone lands on the title stone with its velocity),
    // blended in over the pan's last frames with no net zoom at the landing
    if (r >= s.landR) L += s.landLz * (r - s.landR);
    else if (r > s.landBlendFrom) {
      const a = r - s.landBlendFrom;
      const D = s.landR - s.landBlendFrom;
      L += (s.landLz * a * a * (r - s.landR)) / (D * D);
    }
  }
  return { x, y, L };
}

/**
 * The plan's camera: the function sampled into C1 Hermite segments every `step` local frames from frame 0 to `to`,
 * each knot with its exact pose and its velocity (a central difference), at the frame's `unit`; past `to` it glides on.
 */
export function returnCamera(s: ReturnCameraSpec, fps: number, unit: number, to: number, step = 2): VelocityCamera {
  const at = (f: number): Pose => {
    const a = returnCameraAt(s, rOfLocal(f, fps));
    return { x: a.x, y: a.y, zoom: Math.exp(a.L) * unit };
  };
  const vel = (f: number): CamVel => {
    const h = 0.25;
    const a = returnCameraAt(s, rOfLocal(f - h, fps));
    const b = returnCameraAt(s, rOfLocal(f + h, fps));
    return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h), lz: (b.L - a.L) / (2 * h) };
  };
  const cam = new VelocityCamera(at(0), vel(0), 0);
  for (let f = step; f < to; f += step) cam.hermite(f, at(f), vel(f));
  cam.hermite(to, at(to), vel(to));
  return cam;
}

/* ---------------------------------------------------------------- the plan ------------------------------------ */

/** The stone at the centre of the rings, at rest: its blink at R646 is its own idle blink (the film claims no reaction). */
const RETURN_CUES: PebbleCue[] = [{ at: 0, pose: "idle", note: "the stone at rest at the rings' centre; its blinks are the engine's own idle blinks" }];

/** The R-frames kept free of any blink but the planned one: the drain's start to J5's first beat, and the iris to the title's first second. */
export const blinkKeepClear = (field: ReturnField, fps: number): FrameSpan[] => {
  const firstReturn = Math.min(...field.cells.filter((c) => c.retStart !== null).map((c) => c.retStart!));
  return [
    { from: localOfR(firstReturn, fps), to: localOfR(496, fps), why: "the drain's first return to J5's first beat" },
    { from: localOfR(658, fps), to: localOfR(780, fps), why: "the iris, the wordmark and the title's first second" },
  ];
};

/** The planned blink: R646, 6–8 frames after the kept card is hidden (MONTAGE_DESIGN §2.7). */
export const RETURN_BLINK_R = 646;

export interface ReturnJoin {
  /** the piece it continues, and that piece's exit (S24's last pose and velocity) */
  from: string;
  exit: NonNullable<ScenePlan["exit"]>;
  /** S24's frame (its zoom) and its frame size */
  frame: { w: number; h: number; unit: number };
  /** the stones S24's last frame shows (an avatar there would be a second stone in the first cell) */
  stonesOnLastFrame: number;
  fps: number;
  /** S24's plan itself: the view draws its last frame as the first cell (views/ReturnView.tsx), so it is S24's own frame */
  source?: ScenePlan;
}

/**
 * How the cells merge into the stone (MONTAGE_DESIGN §2.7): "behind" (the default) the stone's own opaque silhouette,
 * drawn above every cell, takes each cell; "toned" (R4's toned matte, a G1 alternative, lead ruling R4: only if it wins
 * G1 on measured contrast) draws each cell's part inside the outline above the body and under the eyes, toned toward
 * the stone's sage (#536B54) over 7 frames from its first contact, and lets it shrink on toward the centre, so its
 * continued inward travel clears it (never a fade)
 */
export type ReturnMerge = "behind" | "toned";
/** The toned matte's cells shrink to this share of the body's width at the centre (the default merge's is 0.55). */
export const TONED_W_END = 0.03;

export interface ReturnExtra {
  field: ReturnField;
  /** the montage act: the field's shot, [from, to) local frames (R2's exemptions apply here only) */
  span: { from: number; to: number };
  /** the R-frame base: local frame of R0 */
  r0: number;
  camera: ReturnCameraSpec;
  blink: { at: number; keepClear: FrameSpan[]; clockOffset: number };
  join: ReturnJoin | null;
  /** the landing: the title stone on `landAt` (frame px), and the R-frame */
  landing: { landAt: number; landR: number; titleStone: Point; titleStonePx: number; irisAt: number };
  merge: ReturnMerge;
  /** G1's variants: the travel, and whether the family labels are drawn */
  curve: ReturnCurve;
  labels: boolean;
}

export interface ReturnOptions {
  w: number;
  h: number;
  fps: number;
  /** the Return's grid in local frames (default returnGrid(fps)) */
  grid?: MusicGrid;
  /** S24: the climax planned with `into: "return"`; its exit is the Return's entry (joinPose) */
  climax?: ScenePlan;
  /** the end card's music (as the finale's): the last strong note (local), its decay, the room tone */
  lastNote?: number;
  decayS?: number;
  roomToneS?: number;
  musicCredit?: string;
  trademarks?: readonly string[];
  align?: Partial<FinaleTiming>;
  /** the merge (default "behind"; "toned" is R4's toned matte, the G1 alternative) */
  merge?: ReturnMerge;
  /** canaries: the field's options, a fresh field (a cut, no pull-back), a stone clock, entries left as the design has them */
  field?: ReturnFieldOptions;
  fresh?: boolean;
  clockOffset?: number;
  fitEntries?: boolean;
  /** G1's curve A/B (MONTAGE_DESIGN §2.3, §9 item 2): the design's travel ("r2", the default) or revision 1's ("r1") */
  curve?: ReturnCurve;
  /** G1's labels A/B (MONTAGE_DESIGN §2.8, §9 item 3): the three family names in one band, the camera held to suit */
  labels?: boolean;
  /**
   * G1's size test (MONTAGE_DESIGN §9 item 7, §10): the three rings and their cells scaled by this about the stone (the
   * stone, the first cell and the camera as built), so the outer ring may pass the frame's edge while every cell stays
   * half in frame for 60 frames or more (returnSchedule); default RETURN_FIELD_SCALE (1.1, G1's choice), 1 the design's
   * own size (RETURN_GEOMETRY)
   */
  fieldScale?: number;
}

/**
 * The field's scale about the stone that the film plans (G1, 28 Oct, MONTAGE_DESIGN §9 item 7: the field as designed read
 * sparse, its cells covering 22, 26 and 18 % of the frame in the rush with inner cells under CR-16's 150 px; ×1.1 passes
 * every plan check and both scans on its renders in every aspect, and covers 26, 31 and 21 %). RETURN_GEOMETRY stays the
 * design's (`return-sheet --reference` compares it with schedule_r2.json).
 */
export const RETURN_FIELD_SCALE = 1.1;

/**
 * The Return's travel for G1's curve A/B (MONTAGE_DESIGN §2.3: "G1 also plays revision 1's curve (orbits of 3–5° a
 * second, a 0.33-px-a-frame pull-back, in-place swaps only) against this one"): "r2" is the design's (orbits of 5, −7
 * and 7° a second; the rush's swaps slide 36 px along their rings; a 12 % push from R200 to R480 after the pull-back);
 * "r1" is revision 1's travel on the same cells, waves, merge and landing (orbits of 5, −4 and 3° a second; every swap in
 * place; the pull-back ends tighter and a slow pull-back at 0.33 px a frame at the frame's corners carries the zoom to 1
 * at R480). Never in a film unless G1 picks it.
 */
export type ReturnCurve = "r2" | "r1";

/**
 * G1's labels A/B (MONTAGE_DESIGN §2.8): three family names the film no longer names, one at a time in one fixed band in
 * the lower safe area, each landing on a beat as its family's outer-ring cells arrive (R-frames: lands, exit starts).
 * Each needs a CLAIMS row before it may be drawn in a film; drawn only in the G1 variant. The design's "Memory" ran to
 * R294, but in one band its 12-frame blur exit then overlaps "Your workspace"'s 8-frame entrance (typeOverType, R292–R306):
 * two labels 60 frames apart leave room for a 38-frame hold at most, under R3 §3.4's 48, so "Memory" leaves on R278 here
 * (G1 records it).
 */
export const RETURN_LABELS: readonly { id: string; text: string; land: number; exit: number }[] = [
  { id: "RL1", text: "Models", land: 150, exit: 216 },
  { id: "RL2", text: "Memory", land: 240, exit: 278 },
  { id: "RL3", text: "Your workspace", land: 300, exit: 354 },
];

/**
 * S24's exit as a velocity of the Return's camera at R−60 (world px and log zoom per R-frame), with the same screen
 * motion: the content's screen velocity at a frame point p is −Z·v + (p − c)·vlz on both sides, so u = v·Z_S24 ⁄ Z_R
 * and ulz = vlz. `zR` is the Return's zoom at R−60 (the frame's unit included).
 */
export function entryFromS24(join: ReturnJoin, zR: number): { x: number; y: number; lz: number } {
  const v = join.exit.vel;
  const zS = join.exit.pose.zoom;
  const perR = join.fps / 60;
  return { x: ((v.x * zS) / zR) * perR, y: ((v.y * zS) / zR) * perR, lz: v.lz * perR };
}

/** The Return, the iris, the title and the end card, for one aspect. */
export function planReturn(o: ReturnOptions): ScenePlan {
  const fps = o.fps;
  const grid = o.grid ?? returnGrid(fps);
  const hit = Math.round(localOfR(RETURN_MUSIC.titleR, fps));
  const join: ReturnJoin | null = o.climax?.exit
    ? {
        from: o.climax.id,
        exit: o.climax.exit,
        frame: { w: o.climax.frame.w, h: o.climax.frame.h, unit: o.climax.frame.unit },
        stonesOnLastFrame: stonesOnFrame(o.climax, o.climax.duration - 1).length,
        fps: o.climax.fps,
        source: o.climax,
      }
    : null;

  const head = (ctx: FinaleHeadContext): FinaleHead => {
    const { f, irisAt, landAt, titleStone, titleStonePx, lzPage } = ctx;
    const unit = f.unit;
    const r0 = Math.round(localOfR(0, fps));
    const landR = rOfLocal(landAt, fps);
    if (landR < RETURN_BLINK_R) throw new Error(`the Return lands its stone on R${landR.toFixed(1)}: it needs the merge and the blink first (R${RETURN_BLINK_R})`);
    // the field is built at the title stone's size on the landing, so the landing is a pan only (§2.6)
    const merge: ReturnMerge = o.merge ?? "behind";
    const curve: ReturnCurve = o.curve ?? "r2";
    const fieldO: ReturnFieldOptions = { stonePx: titleStonePx / unit, holdInner: true, ...(curve === "r1" ? { omega: RETURN_OMEGA_R1 } : {}), ...(o.field ?? {}) };
    if (merge === "toned") fieldO.timing = { wEnd: TONED_W_END, ...(fieldO.timing ?? {}) };
    // revision 1's swaps are all in place (no 36-px slide along the ring)
    if (curve === "r1") fieldO.timing = { slidePx: 0, ...(fieldO.timing ?? {}) };
    // G1's size: the rings and their cells larger about the stone (the first cell keeps S24's frame's size)
    const k = o.fieldScale ?? RETURN_FIELD_SCALE;
    if (k !== 1) {
      const g = RETURN_GEOMETRY[f.aspect];
      fieldO.geometry = { ell: g.ell.map(([x, y]) => [x * k, y * k] as const) as unknown as ReturnGeometry["ell"], cell: g.cell.map((c) => c * k) as unknown as ReturnGeometry["cell"], ...(fieldO.geometry ?? {}) };
    }
    const field = buildReturnField(f.aspect, fieldO, fps);
    const geometry = field.geometry;
    const zCard = Math.min(geometry.W / geometry.hero.w, geometry.H / geometry.hero.h);
    const entry = join ? { ...entryFromS24(join, zCard * unit), tau: 20, lead: 60 / fps } : undefined;
    // G1's variants change what follows the pull-back: revision 1's slow pull-back, or the labels' held push (from a
    // slightly wider framing, 0.85, so the held push still moves the corners 0.35 px a frame or more: the camera floor)
    const after = curve === "r1" ? ("pullback" as const) : o.labels ? ("labels" as const) : ("push" as const);
    const camSpec = returnCameraSpec(f.aspect, { geometry, title: { x: titleStone.x / unit, y: titleStone.y / unit }, landR, landLz: (lzPage * fps) / 60, entry, fresh: o.fresh, after, ...(after === "labels" ? { zLow: 0.85 } : {}) });
    const camera = returnCamera(camSpec, fps, unit, landAt);
    camera.glide(irisAt, 1e9, { lz: lzPage });
    const ref = camera.pose(Math.round(localOfR(480, fps)));
    field.view = { camera, ref, w: f.w, h: f.h, unit };
    // every entry begins out of frame, on this aspect's camera (fitEntries; the review's RV-02 scan)
    if (o.fitEntries !== false) fitEntries(field);

    // the music: every event on the point the design puts it, within a frame (the field is fitted to 120 BPM)
    const music: MusicHit[] = [];
    for (const e of RETURN_EVENTS) {
      const earliest = Math.round(localOfR(e.r, fps));
      const pl = place(earliest, grid, { level: e.level });
      if (pl.point === null || Math.abs(pl.point - earliest) > 1) throw new Error(`the Return's ${e.event} wants a ${e.level} on frame ${earliest}; this grid's next is ${pl.point ?? "none"} (re-fit the cue at bar lines, never the field)`);
      music.push(musicHit(e.event, pl));
    }

    // the stone: at the world's origin, at the title stone's size on the landing; its clock puts an idle blink on R646
    const blinkAt = localOfR(RETURN_BLINK_R, fps);
    const keepClear = blinkKeepClear(field, fps);
    const clockOffset = o.clockOffset ?? offsetForBlink(blinkAt, fps, keepClear);
    const stonePx = field.stone.px;
    const shot: ShotSpec = {
      id: "return",
      from: 0,
      to: irisAt,
      kind: "cutscene",
      camera,
      ref,
      ground: "riverbed",
      planes: [],
      returnField: field,
      stone: { at: { x: 0, y: 0 }, r: stonePx * 0.3, size: stonePx, cues: anchored(RETURN_CUES, 0, "the Return's cues"), clockOffset, layer: "film" },
      rings: [],
    };
    // the light: evening to the page grade over the release (light-theme cells on the page ground, R3 §4.4)
    const lightCues: LightCue[] = [{ at: r0, to: "page", frames: f60(120, fps) }];
    const firstSwap = (wave: string) => Math.min(...field.cells.filter((c) => c.wave === wave).map((c) => c.swapIn ?? Infinity));
    const moves = [
      move("light", r0, f60(120, fps), "evening to the page grade (the release)"),
      ...(["mid2", "mid3", "out2"] as const).map((w) => move("swap", Math.round(localOfR(firstSwap(w), fps)), f60(16, fps), `the ${w} wave's swaps (8 out, 8 in, crossing at mid-blur)`)),
    ];
    const extra: ReturnExtra = {
      field,
      span: { from: 0, to: irisAt },
      r0,
      camera: camSpec,
      blink: { at: blinkAt, keepClear, clockOffset },
      join,
      landing: { landAt, landR, titleStone, titleStonePx, irisAt },
      merge,
      curve,
      labels: !!o.labels,
    };
    return { shot, lightInitial: "evening", lightCues, music, moves, extra: { return: extra }, stone: { clockOffset, layer: "film" } };
  };

  const plan = planFinale({
    w: o.w,
    h: o.h,
    fps,
    grid,
    hit,
    lastNote: o.lastNote,
    decayS: o.decayS,
    roomToneS: o.roomToneS,
    musicCredit: o.musicCredit,
    trademarks: o.trademarks,
    align: o.align,
    head,
  });
  const variant = [o.merge === "toned" ? "the toned matte" : "", o.curve === "r1" ? "revision 1's curve" : "", o.labels ? "the family labels" : "", o.fieldScale !== undefined && o.fieldScale !== RETURN_FIELD_SCALE ? `the field ×${o.fieldScale}` : ""].filter(Boolean).join(", ");
  return { ...plan, id: "return", name: `The Return${variant ? ` (${variant})` : ""}, title, end ${plan.aspect}`, ...(o.labels ? { types: [...plan.types, ...returnLabelTypes(plan, fps)] } : {}) };
}

/**
 * G1's family labels as the plan's lines (MONTAGE_DESIGN §2.8): the label tier (Inter 500, 28–34 px at 1080) in ink,
 * centred in one band whose foot is the safe margin, each landing on its beat (a line blur in) and leaving on a blur.
 */
export function returnLabelTypes(plan: Pick<ScenePlan, "frame">, fps: number): TypeSpec[] {
  const f = plan.frame;
  const sizeT = 0.5;
  const top = f.h - f.safe - typeSizePx("label", f.w, f.h, sizeT) * lineHeightOf("label");
  return RETURN_LABELS.map((l) => {
    const land = Math.round(localOfR(l.land, fps));
    const t: TypeSpec = { id: l.id, text: l.text, tier: "label", at: 0, exitAt: Math.round(localOfR(l.exit, fps)), sizeT, box: { left: 0, top, width: f.w, align: "center" }, kind: "label", color: COLOR.ink, exit: "blur" };
    return { ...t, at: land - landFrames(t, fps) };
  });
}

