// THE CLIMAX SHELL (TREATMENT §3.9, S23–S24; OVERRIDES §50 and L1: the Workshop keep is the peak):
//   S23  "Glaze", evening light: the shot opens ON ITS TAKE (CR-06: it opened on 16 blank frames of its slot), HS-G's
//        ask card already arriving with the entrance every ask shares, "Keep this tool in Pebble's Toolbox?" with
//        Discard and Keep (G4); the camera comes in with the cut's momentum and pushes in to meet it, never at rest;
//        "Its own tools." (L24) lands on a beat and leaves with a drawn blur exit that is over before the cut (CR-03: its
//        "camera" exit drew nothing, and it vanished 6 frames before the cut)
//   S24  a momentum cut into "Kiln", on the last beat at least 0.75 s before the peak: ONE continuous 1× take (RS-W)
//        whose in-point is SOLVED so the kept card lands on the peak's first strong downbeat (`peak`): "Kept in
//        Pebble's Toolbox · kiln_ramp_time", "Pebble kept this tested calculation on its own. Remove it if you don't
//        want it.", View code and Remove. The avatar turns happy on the take's own event. The camera glides through the
//        landing, pushes in until the card reads at ≥ 28 px, and keeps gliding across the whole hold (CR-04: it froze
//        for 6.2 s on the card: the peak was the reel's most static frame); "Kept on its own only after an independent
//        check." (L25) lands on a beat beside it and holds 6.5 s. Nothing inside the take is cut or sped up.
//   end  on a bar line, leaving on an E-leave into the next piece's cut; or, into the Return (`into: "return"`), on the
//        middle of a bar, still on the hold's glide: S24's last frame becomes the Return's first cell and the Return's
//        pull-back continues its motion (MONTAGE_DESIGN §2.12; setpieces/returnPlan.ts, joinPose).
// PLACEHOLDERS: the Workshop's cards and conversations were never published (1.7.0), so they are labelled slots at the
// 2.0.0 cards' sizes (CR-05: the 1.0.x approval and command cards stood in with 82 and 78 legible words).
// Pure data.
import { f60, sec } from "../tokens";
import { VelocityCamera, arriveWithMomentum, type CamVel, type Pose } from "../motion/camera";
import { momentumCut } from "../transitions/momentum";
import type { Rect, Vec } from "../motion/geometry";
import type { Grade, GradeName, LightCue } from "../light/grades";
import { halfBars, place, prevPoint, type MusicGrid } from "./music";
import { breakLines, fitPose, frameBox, glideLz, holdGlide, rectInFrame, type FrameBox, type TypeBox } from "./frame";
import { SLOT } from "./standins";
import { TAKE_HSG, TAKE_RSW, eventFrame, solveInPoint, type TakeManifest, type TakeUse } from "./take";
import { CLIMAX_CUES } from "./pieces.cues";
import { anchored, landFrames, musicHit } from "./kit";
import { move, type MusicHit, type PlaneSpec, type ScenePlan, type TypeSpec } from "./scene";

export const CLIMAX_TEXT = {
  chapter: "Its own tools.",
  check: "Kept on its own only after an independent check.",
} as const;

/** The 2.0.0 cards' must-read words and text (CSS px): the ask's question and buttons, the kept card's two lines. */
export const CLIMAX_CARDS = { ask: { words: 7, textPx: 13 }, kept: { words: 12, textPx: 13 } } as const;

/** The kept card's pan through its hold, px a frame at 1080 on screen (OVERRIDES §55: 0.3–0.6). */
export const KEPT_PAN_PX = 0.42;

export interface ClimaxOptions {
  w: number;
  h: number;
  fps: number;
  grid?: MusicGrid;
  /** the peak's first strong downbeat, a local frame: the kept card lands on it */
  peak: number;
  take?: TakeManifest;
  /** a momentum cut into the climax: the previous piece's screen velocity on its last frame (px a frame), its light */
  cutIn?: { vScreen: Vec; grade?: GradeName | Grade };
  /** continue a camera instead (the same world) */
  entry?: { pose: Pose; vel: CamVel };
  /** "cut" (default): an E-leave into the next piece's cut; "return": end on the hold's glide, into the Return */
  into?: "cut" | "return";
}

/** The climax's world: "Glaze" and "Kiln", east of it (the cut travels east). PLACEHOLDERS: slots. */
const GLAZE: Rect = { x: 0, y: 0, w: 1160, h: 800 };
const ASK: Rect = { x: 350, y: 240, w: SLOT.glazeCard.w, h: SLOT.glazeCard.h };
const KILN: Rect = { x: 2600, y: 0, w: 1160, h: 800 };
const KEPT: Rect = { x: 2600 + 350, y: 250, w: SLOT.keptCard.w, h: SLOT.keptCard.h };
const STONE = { x: 2600 + 1160 + 120, y: 720 };

interface ClimaxLayout {
  /** where the ask sits on screen (the chapter line owns the rest) */
  ask: (f: FrameBox) => Rect;
  chapter: (f: FrameBox) => TypeBox;
  /** the kept card's reading region, and the check line's box beside it */
  kept: (f: FrameBox) => Rect;
  check: (f: FrameBox) => { box: TypeBox; maxW: number };
  /**
   * the one way the climax's content travels on screen (fix round 2, NF-02): the ask's pan, the cut into Kiln, the
   * landing's glide, the hold's pan on the kept card and the leave, all one direction, away from the check line (the
   * Kiln hold used to turn back on itself twice in 3 s, through two stops)
   */
  travel: { x: number; y: number };
}

const LAYOUT: Record<FrameBox["aspect"], ClimaxLayout> = {
  "16:9": {
    ask: (f) => ({ x: f.w * 0.42, y: f.h * 0.14, w: f.w * 0.55, h: f.h * 0.72 }),
    chapter: (f) => ({ left: f.safe * 2, top: f.h * 0.42, align: "left" }),
    kept: (f) => ({ x: f.w * 0.4, y: f.h * 0.16, w: f.w * 0.57, h: f.h * 0.68 }),
    check: (f) => ({ box: { left: f.safe * 2, top: f.h * 0.42, align: "left" }, maxW: f.w * 0.33 }),
    // right, away from the chapter line and the check line on the left
    travel: { x: 1, y: 0 },
  },
  "1:1": {
    ask: (f) => ({ x: f.safe * 0.4, y: f.h * 0.3, w: f.w - f.safe * 0.8, h: f.h * 0.6 }),
    chapter: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.2, align: "left" }),
    kept: (f) => ({ x: f.safe * 0.4, y: f.h * 0.36, w: f.w - f.safe * 0.8, h: f.h * 0.5 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.safe * 1.1, align: "left" }, maxW: f.w - f.safe * 2.4 }),
    // the cards fill the square's width at reading size: down, away from the lines at the top
    travel: { x: 0, y: 1 },
  },
  "9:16": {
    ask: (f) => ({ x: f.safe * 0.4, y: f.h * 0.3, w: f.w - f.safe * 0.8, h: f.h * 0.4 }),
    chapter: (f) => ({ left: 0, top: f.h * 0.15, width: f.w, align: "center" }),
    kept: (f) => ({ x: f.safe * 0.4, y: f.h * 0.3, w: f.w - f.safe * 0.8, h: f.h * 0.4 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.h * 0.8, align: "left" }, maxW: f.w - f.safe * 2.4 }),
    // the cards fill the frame's width at reading size: down, away from the chapter line at the top (the check line
    // below the kept card stays 170 px clear of it at the hold's end)
    travel: { x: 0, y: 1 },
  },
};

/** The plan of the climax for one aspect and one peak. */
export function planClimax(o: ClimaxOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const g = o.grid;
  const peak = Math.round(o.peak);
  const take = o.take ?? TAKE_RSW;
  const lzHold = glideLz(f);
  const music: MusicHit[] = [{ event: "the peak: the kept card lands", frame: peak, point: g?.beats.includes(peak) ? peak : null, level: "hit", waited: 0 }];
  const types: TypeSpec[] = [];
  const readZoom = (css: number) => ((28 * f.unit) / css) * 1.04;

  /* ------------------------------------------------ S23: Glaze, opening on its take ------------------------------- */
  // the ask card's entrance is 4 frames along on the cut: it is arriving as the shot opens, and reads within 6 frames
  const hsg = TAKE_HSG;
  const cardSrc = hsg.events.card!;
  const askAt = -4; // the card's entrance starts 4 frames before the cut (local frames)
  const askFit = fitPose(ASK, L.ask(f), f, 0.94);
  const askPose: Pose = { ...askFit, zoom: Math.max(readZoom(CLIMAX_CARDS.ask.textPx), Math.min(askFit.zoom, readZoom(CLIMAX_CARDS.ask.textPx) * 1.05)) };
  // (cut into from another piece: that piece's leave; on its own, a cut arriving the climax's way)
  const vIn: Vec = o.cutIn?.vScreen ?? { x: 3 * f.unit * L.travel.x, y: 3 * f.unit * L.travel.y };
  // the shot's glide: a pan the climax's way at 0.45 px a frame with a slight push, centred on the card's framing
  // (estimated over the shot's usual length; fix round 2: the push alone about the card moved it 0.24 px a frame)
  const askHold = holdGlide(f, ASK, askPose, Math.max(1, peak - f60(60, fps)), { pan: L.travel, px: 0.45, preferPan: true });
  const pushA = { ...askHold.vel, lz: lzHold * 0.25 };
  // in with the cut's momentum, gliding into that glide (never from rest, never landing at rest)
  // (the glide lands its framing after five time constants: what is left of the cut's speed then is under 1 %)
  const camA = o.entry ? new VelocityCamera(o.entry.pose, o.entry.vel) : arriveWithMomentum({ target: askHold.from, frames: f60(80, fps), vScreen: vIn, mode: "glide", tau: f60(16, fps), drift: pushA });
  const chapterText = breakLines(CLIMAX_TEXT.chapter, "expressive", f, f.w - 2 * f.safe, 0.3);
  const chapter: TypeSpec = { id: "L24", text: chapterText, tier: "expressive", at: 0, sizeT: 0.3, box: L.chapter(f), kind: "film", key: true, exit: "blur" };
  const landC = place(f60(30, fps) + landFrames(chapter, fps), g, { level: "beat", frames: landFrames(chapter, fps) });
  chapter.at = landC.at;
  music.push(musicHit("\"Its own tools.\" lands", landC));
  // the ask is read (7 words: 2.6 s) and the chapter line held (≥ 2.4 s) before the cut, which comes on the last beat
  // at least 0.75 s before the peak: the kept card then lands 0.75–1.25 s into S24 (§3.6 chain 11: about 1.0 s)
  const leaveF = f60(18, fps);
  const minCut = Math.max(f60(8, fps) + sec(2.6, fps), chapter.at + landFrames(chapter, fps) + sec(2.4, fps) + leaveF);
  const cutCandidate = g ? prevPoint(g, peak - f60(45, fps), "beat") : undefined;
  const cut = cutCandidate !== undefined && cutCandidate >= minCut && peak - cutCandidate <= f60(75, fps) ? cutCandidate : peak - f60(60, fps);
  if (cut < minCut) throw new Error(`the climax needs ${minCut - cut} more frames before its peak (the ask must be read first)`);
  music.push({ event: "the cut into Kiln", frame: cut, point: g?.beats.includes(cut) ? cut : null, level: g?.beats.includes(cut) ? "beat" : null, waited: 0 });
  // L24 leaves with the camera's E-leave: a drawn blur exit, over 2 frames before the cut (CR-03)
  const leaveStart = cut - 1 - leaveF;
  chapter.exitAt = leaveStart;
  camA.glide(leaveStart, f60(30, fps), pushA);
  const hsgUse: TakeUse = { manifest: hsg, at: 0, inPoint: cardSrc - askAt, until: cut };

  /* ------------------------------------------------ S24: Kiln, the take at 1× ------------------------------------ */
  const keptFit = fitPose(KEPT, L.kept(f), f, 0.94);
  const keptRead: Pose = { ...keptFit, zoom: Math.max(readZoom(CLIMAX_CARDS.kept.textPx), Math.min(keptFit.zoom, readZoom(CLIMAX_CARDS.kept.textPx) * 1.06)) };
  // the landing framing: the card a little wide, so the push-in that follows reads as the climax's breath
  const landPose: Pose = { ...keptRead, zoom: keptRead.zoom / 1.1 };
  // the timing first: the incoming glide lands on the reading push's start, half a second after the card lands on
  // the peak; the push runs 160 frames; the check line lands on a beat after the card and holds 6.5 s
  const pushFrom = peak - cut + f60(30, fps);
  const pushTo = pushFrom + f60(160, fps);
  const ck = L.check(f);
  const checkText = breakLines(CLIMAX_TEXT.check, "functional", f, ck.maxW, 0.3);
  const check: TypeSpec = { id: "L25", text: checkText, tier: "functional", at: 0, sizeT: 0.3, box: ck.box, kind: "film" };
  const landK = place(peak + f60(45, fps), g, { level: "beat", frames: landFrames(check, fps) });
  check.at = landK.at;
  music.push(musicHit("\"Kept on its own only after an independent check.\" lands", landK));
  // the card is read once the push-in has reached reading size (12 words: 4.1 s), and the check line held 6.5 s
  const readEnd = Math.max(check.at + landFrames(check, fps) + sec(6.5, fps), cut + pushTo + sec(4.1, fps));
  const minEnd = readEnd + leaveF + f60(12, fps);
  const toReturn = o.into === "return";
  // into the Return: on the middle of a bar, so the Return's release (R0, half a bar later) lands on the next downbeat
  const mid = toReturn && g ? halfBars(g).find((x) => x >= minEnd && !g.downbeats.includes(x)) : undefined;
  const endP = toReturn ? (mid !== undefined ? { at: mid, point: mid, level: "half" as const, waited: mid - minEnd } : { at: minEnd, point: null, level: null, waited: 0 }) : place(minEnd, g, { level: "bar", maxWait: sec(2.2, fps) });
  const end = endP.point ?? minEnd;
  music.push(musicHit(toReturn ? "the climax ends: S24's last frame becomes the Return's first cell" : "the climax ends (the convergence)", endP));
  const exitStart = end - 1 - leaveF;
  check.exitAt = exitStart;
  types.push(chapter, check);
  // ONE direction from Glaze's leave to Kiln's (NF-02): the cut carries the content the climax's way; the incoming
  // glide decays that speed straight into the hold's pan (KEPT_PAN_PX, the same way), through the reading push, to the
  // E-leave the same way again. The hold's pan is centred on the card's reading framing, so the card drifts through
  // it; the push and the landing are placed back along the pan from there (the glide lands exactly on the push's start)
  const holdF = exitStart - cut - pushTo;
  const tl = Math.hypot(L.travel.x, L.travel.y) || 1;
  const panAt = (zoom: number) => ({ x: (-(L.travel.x / tl) * KEPT_PAN_PX * f.unit) / zoom, y: (-(L.travel.y / tl) * KEPT_PAN_PX * f.unit) / zoom });
  const vHold = { ...panAt(keptRead.zoom), lz: lzHold * 0.2 };
  const holdFrom: Pose = { x: keptRead.x - (vHold.x * holdF) / 2, y: keptRead.y - (vHold.y * holdF) / 2, zoom: keptRead.zoom / Math.exp((vHold.lz * holdF) / 2) };
  const pushF = pushTo - pushFrom;
  // the push grows the card about its trailing edge (its left edge as it travels right, its top as it travels down),
  // so that edge keeps the pan's pace through the push (pushing about the card's middle held its left edge still for
  // 1.5 s, as the verifier measured the sway on that edge)
  const anchor = { x: L.travel.x > 0 ? KEPT.x : L.travel.x < 0 ? KEPT.x + KEPT.w : KEPT.x + KEPT.w / 2, y: L.travel.y > 0 ? KEPT.y : L.travel.y < 0 ? KEPT.y + KEPT.h : KEPT.y + KEPT.h / 2 };
  const anchorAt1 = { x: f.w / 2 + (anchor.x - holdFrom.x) * holdFrom.zoom, y: f.h / 2 + (anchor.y - holdFrom.y) * holdFrom.zoom };
  const anchorAt0 = { x: anchorAt1.x - ((L.travel.x / tl) * KEPT_PAN_PX * f.unit * pushF), y: anchorAt1.y - ((L.travel.y / tl) * KEPT_PAN_PX * f.unit * pushF) };
  const pushFromPose: Pose = { x: anchor.x - (anchorAt0.x - f.w / 2) / landPose.zoom, y: anchor.y - (anchorAt0.y - f.h / 2) / landPose.zoom, zoom: landPose.zoom };
  const seam = momentumCut({ out: camA, cutFrame: cut, dir: L.travel, dPx: 118 * f.unit, leaveFrames: leaveF, target: pushFromPose, inFrames: pushFrom, mode: "glide", tau: f60(24, fps), drift: { ...vHold, lz: 0 }, frameW: f.w, frameH: f.h, fps });
  const camB = seam.inCam;
  // the push-in for reading, carrying the pan; then the hold's own glide to the E-leave: the push never stops (CR-04)
  camB.hermite(pushTo, holdFrom, vHold);
  camB.glide(exitStart - cut, f60(30, fps), vHold);
  if (toReturn) camB.glide(end - cut, f60(30, fps), vHold);
  else {
    const pEnd = camB.pose(exitStart - cut);
    camB.ease(end - cut - 1, { x: pEnd.x - ((L.travel.x / tl) * 118 * f.unit) / pEnd.zoom, y: pEnd.y - ((L.travel.y / tl) * 118 * f.unit) / pEnd.zoom, zoom: pEnd.zoom * Math.exp(vHold.lz * leaveF) }, "E-leave");
  }

  const use = solveInPoint(take, "cardLands", peak, cut, end, fps);
  const happyAt = eventFrame(use, "happy", fps);

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const planesA: PlaneSpec[] = [
    { id: "glaze", kind: "pebble", rect: GLAZE, content: { kind: "take", use: hsgUse, view: "conversation" }, shadow: true },
    // read once the cut's momentum has settled into the glide (the card is arriving meanwhile)
    { id: "ask", kind: "pebble", rect: ASK, content: { kind: "take", use: hsgUse, view: "card" }, shadow: true, read: { from: f60(44, fps), to: leaveStart, words: CLIMAX_CARDS.ask.words, textPx: CLIMAX_CARDS.ask.textPx, rect: ASK } },
  ];
  const planesB: PlaneSpec[] = [
    { id: "kiln", kind: "pebble", rect: KILN, content: { kind: "take", use, view: "conversation" }, shadow: true },
    { id: "kept", kind: "pebble", rect: KEPT, content: { kind: "take", use, view: "keptCard" }, shadow: true, read: { from: cut + pushTo - f60(40, fps), to: exitStart, words: CLIMAX_CARDS.kept.words, receipt: true, textPx: CLIMAX_CARDS.kept.textPx, rect: KEPT } },
  ];
  // evening light: dusk to evening is about 0.17 of luminance on the ground, so on E-move it takes at least 3.1 s
  const lightInitial = o.cutIn?.grade ?? "dusk";
  const lightCues: LightCue[] = [{ at: 0, to: "evening", frames: sec(4.6, fps) }];
  const cues = anchored(CLIMAX_CUES, happyAt / fps, "the climax's cues");

  return {
    id: "climax",
    name: `Climax ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      { id: "glaze", from: 0, to: cut, kind: "ui", camera: camA, ref: askPose, ground: "riverbed", planes: planesA, rings: [], dofScale: 14 },
      { id: "kiln", from: cut, to: end, kind: "ui", camera: camB, ref: landPose, ground: "riverbed", planes: planesB, stone: { at: STONE, r: 44, size: 148, cues }, rings: [], blur: [{ from: 0, to: f60(16, fps) }], dofScale: 14 },
    ],
    seams: [{ at: cut, kind: "momentum", frames: 0, out: "glaze", in: "kiln" }],
    types,
    lightInitial,
    lightCues,
    leaks: [],
    hits: [],
    takes: [hsgUse, use],
    music,
    moves: [
      move("product", 0, f60(20, fps), "S23: the ask card's entrance (a placeholder of the recorded one)"),
      move("push", 0, Math.min(leaveStart, f60(240, fps)), "S23: the push-in to meet the card (then its glide)"),
      move("product", cut, end - cut, "RS-W at 1×: the kept card lands on the peak"),
      move("push", pushFrom + cut, pushTo - pushFrom, "S24: the push-in for reading"),
      move("light", 0, sec(4.6, fps), "dusk to evening"),
    ],
    exit: { pose: camB.pose(end - cut), vel: camB.sample(end - cut).vel, shot: "kiln", ref: landPose, grade: "evening" },
    extra: { cut, peak, happyAt, cardLands: eventFrame(use, "cardLands", fps), pushFrom: pushFrom + cut, pushTo: pushTo + cut, end, readZoom: keptRead.zoom, holdKind: "pan", keptOnScreen: rectInFrame(KEPT, keptRead, f), into: toReturn ? "return" : "cut" },
  };
}
