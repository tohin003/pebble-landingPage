// THE CLIMAX SHELL (TREATMENT §3.9, S23–S24; OVERRIDES §50 and L1: the Workshop keep is the peak):
//   S23  "Glaze", evening light: Pebble's ask card, "Keep this tool in Pebble's Toolbox?" with Discard and Keep (G4),
//        arrives with the entrance every ask shares, and the camera pushes in to meet it; "Its own tools." (L24)
//   S24  a momentum cut into "Kiln", on the last beat at least 0.75 s before the peak: ONE continuous 1× take (RS-W)
//        whose in-point is SOLVED so the kept card lands on the peak's first strong downbeat (`peak`): "Kept in
//        Pebble's Toolbox · kiln_ramp_time", "Pebble kept this tested calculation on its own. Remove it if you don't
//        want it.", View code and Remove. The avatar turns happy on the take's own event. The camera keeps gliding
//        through the landing (no freeze, no snap: the card's landing is the product's motion), then pushes in slowly
//        until the whole card, Remove included, reads at ≥ 28 px; "Kept on its own only after an independent check."
//        (L25) beside it. Nothing inside the take is cut or sped up; its frames fill the slot from a frame sequence.
// Pure data.
import { f60, sec } from "../tokens";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import { pushInCarried } from "../camera/moves";
import { momentumCut } from "../transitions/momentum";
import type { Rect } from "../motion/geometry";
import type { LightCue } from "../light/grades";
import { place, prevPoint, type MusicGrid } from "./music";
import { breakLines, fitPose, frameBox, type FrameBox, type TypeBox } from "./frame";
import { STILL } from "./standins";
import { TAKE_RSW, eventFrame, solveInPoint, type TakeManifest } from "./take";
import { CLIMAX_CUES } from "./pieces.cues";
import { anchored, landFrames, musicHit } from "./kit";
import { move, type MusicHit, type PlaneSpec, type ScenePlan, type TypeSpec } from "./scene";

export const CLIMAX_TEXT = {
  chapter: "Its own tools.",
  check: "Kept on its own only after an independent check.",
} as const;

export interface ClimaxOptions {
  w: number;
  h: number;
  fps: number;
  grid?: MusicGrid;
  /** the peak's first strong downbeat, a local frame: the kept card lands on it */
  peak: number;
  take?: TakeManifest;
  entry?: { pose: Pose; vel: CamVel };
}

/** The climax's world: "Glaze" and "Kiln", east of it (the cut travels east). PLACEHOLDERS: slots and 1.0.x cards. */
const GLAZE: Rect = { x: 0, y: 0, w: 1160, h: 800 };
const ASK: Rect = { x: 560, y: 150, w: 495, h: 482 };
const KILN: Rect = { x: 2600, y: 0, w: 1160, h: 800 };
const KEPT: Rect = { x: 2600 + 560, y: 150, w: 495, h: 474 };
const STONE = { x: 2600 + 1160 + 120, y: 720 };

interface ClimaxLayout {
  /** where the ask sits on screen (the chapter line owns the rest) */
  ask: (f: FrameBox) => Rect;
  chapter: (f: FrameBox) => TypeBox;
  /** the kept card's reading region, and the check line's box beside it */
  kept: (f: FrameBox) => Rect;
  check: (f: FrameBox, maxW: number) => { box: TypeBox; maxW: number };
}

const LAYOUT: Record<FrameBox["aspect"], ClimaxLayout> = {
  "16:9": {
    ask: (f) => ({ x: f.w * 0.44, y: f.safe, w: f.w * 0.52, h: f.h - 2 * f.safe }),
    chapter: (f) => ({ left: f.safe * 2, top: f.h * 0.42, align: "left" }),
    kept: (f) => ({ x: f.w * 0.42, y: f.safe * 0.6, w: f.w * 0.56, h: f.h - f.safe * 1.2 }),
    check: (f) => ({ box: { left: f.safe * 2, top: f.h * 0.4, align: "left" }, maxW: f.w * 0.36 }),
  },
  "1:1": {
    ask: (f) => ({ x: f.safe * 0.6, y: f.h * 0.2, w: f.w - f.safe * 1.2, h: f.h * 0.78 }),
    chapter: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.2, align: "left" }),
    kept: (f) => ({ x: f.safe * 0.6, y: f.h * 0.22, w: f.w - f.safe * 1.2, h: f.h * 0.76 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.safe * 1.1, align: "left" }, maxW: f.w - f.safe * 2.4 }),
  },
  "9:16": {
    ask: (f) => ({ x: f.safe * 0.5, y: f.h * 0.28, w: f.w - f.safe, h: f.h * 0.5 }),
    chapter: (f) => ({ left: 0, top: f.h * 0.14, width: f.w, align: "center" }),
    kept: (f) => ({ x: f.safe * 0.5, y: f.h * 0.3, w: f.w - f.safe, h: f.h * 0.5 }),
    check: (f) => ({ box: { left: f.safe * 1.2, top: f.h * 0.82, align: "left" }, maxW: f.w - f.safe * 2.4 }),
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
  const music: MusicHit[] = [{ event: "the peak: the kept card lands", frame: peak, point: g?.beats.includes(peak) ? peak : null, level: "hit", waited: 0 }];
  const types: TypeSpec[] = [];
  const readZoom = (css: number) => ((28 * f.unit) / css) * 1.03;

  /* ------------------------------------------------ S23: Glaze ------------------------------------------------- */
  const askAt = f60(12, fps);
  const askFit = fitPose(ASK, L.ask(f), f, 0.94);
  const askPose: Pose = { ...askFit, zoom: Math.max(askFit.zoom, readZoom(STILL.approvalCard.readPx!)) };
  // the card is readable from its first frame; the push-in brings it closer (1.00 → 1.06)
  const camA = new VelocityCamera(askPose, o.entry?.vel ?? { lz: 0.0003 });
  const chapterText = breakLines(CLIMAX_TEXT.chapter, "expressive", f, f.w - 2 * f.safe, 0.3);
  const chapter: TypeSpec = { id: "L24", text: chapterText, tier: "expressive", at: 0, sizeT: 0.3, box: L.chapter(f), kind: "film", key: true };
  const landC = place(askAt + f60(30, fps), g, { level: "beat", frames: landFrames(chapter, fps) });
  chapter.at = landC.at;
  music.push(musicHit("\"Its own tools.\" lands", landC));
  // the ask is read (7 words: 2.6 s) and the chapter line held (≥ 2 s) before the cut, which comes on the last beat at
  // least 0.75 s before the peak: the kept card then lands 0.75–1.25 s into S24 (§3.6 chain 11: about 1.0 s)
  const minCut = Math.max(askAt + f60(24, fps) + sec(2.6, fps), chapter.at + sec(2.4, fps));
  const cutCandidate = g ? prevPoint(g, peak - f60(45, fps), "beat") : undefined;
  const cut = cutCandidate !== undefined && cutCandidate >= minCut && peak - cutCandidate <= f60(75, fps) ? cutCandidate : peak - f60(60, fps);
  if (cut < minCut) throw new Error(`the climax needs ${minCut - cut} more frames before its peak (the ask must be read first)`);
  music.push({ event: "the cut into Kiln", frame: cut, point: g?.beats.includes(cut) ? cut : null, level: g?.beats.includes(cut) ? "beat" : null, waited: 0 });
  chapter.exitAt = cut - f60(6, fps);
  chapter.exit = "camera";
  // the push-in meets the card, carried from the incoming velocity (never from rest), over at most 240 frames (§5.1),
  // then drifts on into the cut's E-leave
  const leaveStart = cut - 1 - f60(18, fps);
  const pushEnd = Math.min(leaveStart, f60(240, fps));
  pushInCarried(camA, pushEnd, 1.06, 0.0001);
  if (pushEnd < leaveStart) camA.glide(leaveStart, f60(30, fps), { lz: 0.0001 });

  /* ------------------------------------------------ S24: Kiln, the take at 1× ------------------------------------ */
  const keptFit = fitPose(KEPT, L.kept(f), f, 0.96);
  const keptRead: Pose = { ...keptFit, zoom: Math.max(keptFit.zoom, readZoom(STILL.commandCard.readPx!)) };
  // the landing framing: the card a little wide, so the push-in that follows reads as the climax's breath
  const landPose: Pose = { ...keptRead, zoom: keptRead.zoom / 1.1 };
  const seam = momentumCut({ out: camA, cutFrame: cut, dir: { x: -1, y: 0 }, dPx: 130 * f.unit, leaveFrames: f60(18, fps), target: landPose, inFrames: f60(36, fps), mode: "glide", tau: f60(24, fps), frameW: f.w, frameH: f.h, fps });
  const camB = seam.inCam;
  // through the landing without a freeze: the glide drifts on, then a slow push-in (E-move) for reading
  const pushFrom = peak - cut + f60(30, fps);
  camB.glide(pushFrom, f60(24, fps), { x: (0.2 * f.unit * 60) / fps / landPose.zoom, lz: 0.00006 });
  const pushTo = pushFrom + f60(200, fps);
  camB.hermite(pushTo, keptRead, { x: (0.18 * f.unit * 60) / fps / keptRead.zoom, lz: 0.00008 });

  // the check line lands on a beat after the card, beside it
  const ck = L.check(f, 0);
  const checkText = breakLines(CLIMAX_TEXT.check, "functional", f, ck.maxW, 0.3);
  const check: TypeSpec = { id: "L25", text: checkText, tier: "functional", at: 0, sizeT: 0.3, box: ck.box, kind: "film" };
  const landK = place(peak + f60(45, fps), g, { level: "beat", frames: landFrames(check, fps) });
  check.at = landK.at;
  music.push(musicHit("\"Kept on its own only after an independent check.\" lands", landK));
  // the card is read once the push-in has reached reading size (12 words: 4.1 s), and the check line held 6.5 s
  const readEnd = Math.max(check.at + sec(6.5, fps), cut + pushTo + sec(4.1, fps));
  const endP = place(readEnd + f60(12, fps), g, { level: "bar", maxWait: sec(2.2, fps) });
  const end = endP.point ?? readEnd + f60(12, fps);
  music.push(musicHit("the climax ends (the convergence)", endP));
  check.exitAt = end - f60(14, fps);
  types.push(chapter, check);
  camB.glide(end - cut, f60(40, fps), { x: (0.16 * f.unit * 60) / fps / keptRead.zoom, lz: 0.0001 });

  const use = solveInPoint(take, "cardLands", peak, cut, end, fps);
  const happyAt = eventFrame(use, "happy", fps);

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const planesA: PlaneSpec[] = [
    { id: "glaze", kind: "pebble", rect: GLAZE, content: { kind: "standIn", standIn: { kind: "slot", id: "glaze", captureId: "HS-G", label: "the conversation \"Glaze\"", w: GLAZE.w, h: GLAZE.h, window: "pebble", standsFor: "G4's conversation" } } },
    { id: "ask", kind: "pebble", rect: ASK, content: { kind: "standIn", standIn: STILL.approvalCard }, enterAt: askAt, read: { from: askAt + f60(24, fps), to: cut, words: 7 } },
  ];
  const planesB: PlaneSpec[] = [
    { id: "kiln", kind: "pebble", rect: KILN, content: { kind: "take", use, view: "conversation" } },
    { id: "kept", kind: "pebble", rect: KEPT, content: { kind: "take", use, view: "keptCard" }, shadow: true, read: { from: cut + pushTo - f60(40, fps), to: end, words: 12, receipt: true, textPx: STILL.commandCard.readPx } },
  ];
  // evening light: dusk (0.39) to evening (0.63) is 0.24 of luminance, so on E-move it takes at least 4.4 s
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
    lightInitial: "dusk",
    lightCues,
    leaks: [],
    hits: [],
    takes: [use],
    music,
    moves: [
      move("product", askAt, f60(24, fps), "S23: the ask card's entrance (a placeholder of the recorded one)"),
      move("push", 0, Math.max(f60(90, fps), pushEnd), "S23: the push-in to meet the card"),
      move("product", cut, end - cut, "RS-W at 1×: the kept card lands on the peak"),
      move("push", pushFrom + cut, pushTo - pushFrom, "S24: the slow push-in for reading"),
      move("light", 0, sec(4.6, fps), "dusk to evening"),
    ],
    extra: { cut, peak, happyAt, cardLands: eventFrame(use, "cardLands", fps), pushFrom: pushFrom + cut, pushTo: pushTo + cut, end, readZoom: keptRead.zoom },
  };
}
