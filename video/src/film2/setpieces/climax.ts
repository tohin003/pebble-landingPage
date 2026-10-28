// THE CLIMAX SHELL (TREATMENT §3.9, S23–S24; OVERRIDES §50 and L1: the Workshop keep is the peak):
//   S23  "Glaze", evening light: the shot opens ON ITS TAKE (CR-06: it opened on 16 blank frames of its slot), HS-G's
//        ask card already arriving with the entrance every ask shares, "Keep this tool in Pebble's Toolbox?" with
//        Discard and Keep (G4); the camera comes in with the cut's momentum and pushes in to meet it, never at rest;
//        "Its own tools." (L24) lands on a beat and lifts out through its mask, as it rose, over before the cut (CR-03:
//        its "camera" exit drew nothing, and it vanished 6 frames before the cut)
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
import type { Point, Rect, Vec } from "../motion/geometry";
import type { Grade, GradeName, LightCue } from "../light/grades";
import { halfBars, place, prevPoint, type MusicGrid } from "./music";
import { breakLines, exitFramesOf, fitPose, frameBox, glideLz, holdGlide, rectInFrame, type FrameBox, type TypeBox } from "./frame";
import { SLOT, cardText } from "./standins";
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
/**
 * The composer and the window's foot under a conversation's newest message, CSS px (Pebble 1.0.x's main window: the
 * composer from 628 to 745 of 800, its footer to 800).
 */
export const KILN_FOOT_H = 172;
/**
 * The kept card (fix round 3, the peak; verify-2: "a cream frame with one slot and one film line for 10 s", luma std
 * 11.3, colourfulness 4.4, no ground for the evening light in 16:9 and 1:1): it lands as the conversation's newest
 * message, at the foot of the column just above the composer, and the conversation is recorded with the sidebar
 * folded away (RS-W's capture is made so), so the window's left edge and its foot lie near the card and the evening
 * riverbed shows beside it while it is read. (It sat 350 px into the window, in the middle, 250 px down: read at 28 px,
 * the window filled every frame.)
 */
export const KEPT: Rect = { x: KILN.x + 64, y: KILN.y + KILN.h - KILN_FOOT_H - 12 - SLOT.keptCard.h, w: SLOT.keptCard.w, h: SLOT.keptCard.h };

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
  /**
   * the peak (fix round 3): where the stone waits, on the evening riverbed beside Kiln's window (world units), and the
   * zoom the cut into Kiln lands on, wide enough to show the window's corner, the ground and the stone as the card
   * lands and the stone turns happy; the push to reading size then carries the stone out of the frame (S24's last frame
   * is the Return's first cell: it shows no stone, joinPose)
   */
  stone: Point;
  wideZoom: number;
}

const LAYOUT: Record<FrameBox["aspect"], ClimaxLayout> = {
  "16:9": {
    ask: (f) => ({ x: f.w * 0.42, y: f.h * 0.14, w: f.w * 0.55, h: f.h * 0.72 }),
    chapter: (f) => ({ left: f.safe * 2, top: f.h * 0.42, align: "left" }),
    // (fix round 3: the card read at the frame's right, the window's left edge 140 px left of it, the check line on the
    // evening riverbed left of the window: no line over Kiln's conversation, OVERRIDES §53's G4 item)
    kept: (f) => ({ x: f.w * 0.415, y: f.h * 0.2, w: f.w * 0.52, h: f.h * 0.6 }),
    check: (f) => ({ box: { left: f.safe * 2, top: f.h * 0.36, align: "left" }, maxW: f.w * 0.415 - (KEPT.x - KILN.x) * 2.2 * f.unit - f.safe * 2 - 40 * f.unit }),
    // right, away from the chapter line and the check line on the left
    travel: { x: 1, y: 0 },
    // the stone on the ground left of the window, below the check line, well inside the frame as the card lands; the
    // push about the card's left edge (×2) carries it out of the frame's left edge before the hold's pan could bring it
    // back (476 px left of the card: 163 px from the frame's edge at the landing, 137 px past it at the end)
    stone: { x: KEPT.x - 476, y: KEPT.y + 330 },
    wideZoom: 1.1,
  },
  "1:1": {
    ask: (f) => ({ x: f.safe * 0.4, y: f.h * 0.3, w: f.w - f.safe * 0.8, h: f.h * 0.6 }),
    chapter: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.2, align: "left" }),
    kept: (f) => ({ x: f.safe * 0.4, y: f.h * 0.36, w: f.w - f.safe * 0.8, h: f.h * 0.5 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.safe * 1.1, align: "left" }, maxW: f.w - f.safe * 2.4 }),
    // the cards fill the square's width at reading size: down, away from the lines at the top
    travel: { x: 0, y: 1 },
    // the stone below and left of the window's corner; the push about the card's top carries it out at the left
    stone: { x: KEPT.x + KEPT.w / 2 - 380, y: KILN.y + KILN.h + 100 },
    wideZoom: 1.0,
  },
  "9:16": {
    ask: (f) => ({ x: f.safe * 0.4, y: f.h * 0.3, w: f.w - f.safe * 0.8, h: f.h * 0.4 }),
    chapter: (f) => ({ left: 0, top: f.h * 0.15, width: f.w, align: "center" }),
    // (fix round 3: the card read in the frame's upper middle, the window's foot below it, then the evening riverbed,
    // where the check line sits)
    kept: (f) => ({ x: f.safe * 0.4, y: f.h * 0.22, w: f.w - f.safe * 0.8, h: f.h * 0.34 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.h * 0.8, align: "left" }, maxW: f.w - f.safe * 2.4 }),
    // the cards fill the frame's width at reading size: down, away from the chapter line at the top (the check line
    // below the kept card stays 170 px clear of it at the hold's end)
    travel: { x: 0, y: 1 },
    stone: { x: KEPT.x + KEPT.w / 2 - 380, y: KILN.y + KILN.h + 100 },
    wideZoom: 1.0,
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
  // (it rose through its mask: it leaves through it with a lift, as it came; fix round 2: it blurred away)
  const chapter: TypeSpec = { id: "L24", text: chapterText, tier: "expressive", at: 0, sizeT: 0.3, box: L.chapter(f), kind: "film", key: true, exit: "lift" };
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
  // L24 leaves with the camera's E-leave: a drawn lift through its mask, over 2 frames before the cut (CR-03)
  const leaveStart = cut - 1 - leaveF;
  chapter.exitAt = Math.min(leaveStart, cut - 2 - exitFramesOf("lineRise", "lift", chapterText, fps));
  camA.glide(leaveStart, f60(30, fps), pushA);
  const hsgUse: TakeUse = { manifest: hsg, at: 0, inPoint: cardSrc - askAt, until: cut };

  /* ------------------------------------------------ S24: Kiln, the take at 1× ------------------------------------ */
  // (fix round 3: read at the 28 px floor, a per cent over it, so the window's edge and the ground stay in the frame
  // beside it; its text keeps the safe margin inside the card's padding, readEdges)
  const keptFit = fitPose(KEPT, L.kept(f), f, 0.94);
  const keptRead: Pose = { ...keptFit, zoom: Math.min(((28 * f.unit) / CLIMAX_CARDS.kept.textPx) * 1.01, (f.w - 2 * f.safe) / cardText(KEPT).w) };
  // the landing framing (fix round 3, the peak): wide, the window's corner on the evening riverbed with the stone
  // beside it, so the card lands and the stone turns happy in one frame; the push to reading size that follows is the
  // climax's breath, and it carries the stone out of the frame
  const landPose: Pose = { ...keptRead, zoom: L.wideZoom * f.unit };
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
  // (no push through the hold: the card is read at the floor, with the safe margin; the pan carries it)
  const vHold = { ...panAt(keptRead.zoom), lz: 0 };
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
  // the push-in for reading, carrying the pan; then the hold's own glide to the E-leave: the push never stops (CR-04).
  // (fix round 3: from the wide landing the push doubles the zoom, so it is laid key by key about the card's trailing
  // edge, which moves at the pan's pace on screen the whole way (one Hermite from the wide let it step back 0.8 px in
  // 9:16, the sway the verifier measured on that edge, NF-02); the log zoom eases in and out between the glides)
  const lz0 = Math.log(pushFromPose.zoom);
  const lz1 = Math.log(holdFrom.zoom);
  const dir = { x: L.travel.x / tl, y: L.travel.y / tl };
  const pan = KEPT_PAN_PX * f.unit;
  const keyAt = (t: number): { pose: Pose; vel: CamVel } => {
    const u = Math.min(1, Math.max(0, t / pushF));
    const lz = lz0 + (lz1 - lz0) * u * u * (3 - 2 * u);
    const dlz = ((lz1 - lz0) * 6 * u * (1 - u)) / pushF;
    const zoom = Math.exp(lz);
    const A = { x: anchorAt0.x + dir.x * pan * t, y: anchorAt0.y + dir.y * pan * t };
    const pose: Pose = { x: anchor.x - (A.x - f.w / 2) / zoom, y: anchor.y - (A.y - f.h / 2) / zoom, zoom };
    const vel: CamVel = { x: (-dir.x * pan) / zoom + ((A.x - f.w / 2) * dlz) / zoom, y: (-dir.y * pan) / zoom + ((A.y - f.h / 2) * dlz) / zoom, lz: dlz };
    return { pose, vel };
  };
  const keyStep = f60(10, fps);
  for (let t = keyStep; t < pushF; t += keyStep) {
    const k = keyAt(t);
    camB.hermite(pushFrom + t, k.pose, k.vel);
  }
  camB.hermite(pushTo, holdFrom, vHold);
  camB.glide(exitStart - cut, f60(30, fps), vHold);
  if (toReturn) camB.glide(end - cut, f60(30, fps), vHold);
  else {
    const pEnd = camB.pose(exitStart - cut);
    camB.ease(end - cut - 1, { x: pEnd.x - ((L.travel.x / tl) * 118 * f.unit) / pEnd.zoom, y: pEnd.y - ((L.travel.y / tl) * 118 * f.unit) / pEnd.zoom, zoom: pEnd.zoom * Math.exp(vHold.lz * leaveF) }, "E-leave");
  }

  const use = solveInPoint(take, "cardLands", peak, cut, end, fps);
  const happyAt = eventFrame(use, "happy", fps);

  // (fix round 3: each card is read from the frame its text reaches the 28 px floor and keeps the safe margin, as its
  // camera brings it in: the kept card from the push out of the wide landing, the ask from the cut's glide)
  const readsFrom = (cam: VelocityCamera, shotFrom: number, rect: Rect, css: number, from: number, to: number): number => {
    for (let fr = from; fr < to; fr++) {
      const pose = cam.pose(fr - shotFrom);
      const q = rectInFrame(rect, pose, f);
      if ((css * pose.zoom) / f.unit >= 28 - 1e-6 && Math.min(q.x, q.y, f.w - q.x - q.w, f.h - q.y - q.h) >= f.safe - 0.5) return fr;
    }
    return to;
  };
  const askReadFrom = readsFrom(camA, 0, cardText(ASK), CLIMAX_CARDS.ask.textPx, f60(44, fps), leaveStart);
  const keptReadFrom = readsFrom(camB, cut, cardText(KEPT), CLIMAX_CARDS.kept.textPx, cut + pushFrom, exitStart);

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const planesA: PlaneSpec[] = [
    { id: "glaze", kind: "pebble", rect: GLAZE, content: { kind: "take", use: hsgUse, view: "conversation" }, shadow: true },
    // read once the cut's momentum has settled into the glide (the card is arriving meanwhile)
    { id: "ask", kind: "pebble", rect: ASK, content: { kind: "take", use: hsgUse, view: "card" }, shadow: true, read: { from: askReadFrom, to: leaveStart, words: CLIMAX_CARDS.ask.words, textPx: CLIMAX_CARDS.ask.textPx, rect: cardText(ASK) } },
  ];
  const planesB: PlaneSpec[] = [
    { id: "kiln", kind: "pebble", rect: KILN, content: { kind: "take", use, view: "conversation" }, shadow: true },
    { id: "kept", kind: "pebble", rect: KEPT, content: { kind: "take", use, view: "keptCard" }, shadow: true, read: { from: keptReadFrom, to: exitStart, words: CLIMAX_CARDS.kept.words, receipt: true, textPx: CLIMAX_CARDS.kept.textPx, rect: cardText(KEPT) } },
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
      { id: "kiln", from: cut, to: end, kind: "ui", camera: camB, ref: landPose, ground: "riverbed", planes: planesB, stone: { at: L.stone, r: 44, size: 148, cues }, rings: [], blur: [{ from: 0, to: f60(16, fps) }], dofScale: 14 },
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
