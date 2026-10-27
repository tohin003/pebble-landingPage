// A RING BLOCK (TREATMENT §3.5 S08–S19, §3.6, §3.8): one feature place's ask → act → receipt, then the in-place
// cascade that follows it. A template driven by data (setpieces/rings.ts holds Ring 4 and the edit lane adds the
// others): the place and its take, the views the film reads, the event that lands on a beat, the lines, the cascade.
//
// Every plane of the place is a VIEW of one take, on one clock (CR-11: a still of the ask beside a live take of the
// act showed states that never coexisted): the window, the ask (the history), the act and, inside it, the receipt.
// Each view is cropped at a clean card or line boundary and framed whole while its text is legible (CR-05).
//
// The ring shot, in local frames from the block's start (the edit lane puts frame 0 on a phrase downbeat):
//   0            a ring leaves the stone; it travels to the place and frames the ask (E-move), and holds. The camera
//                continues the previous piece's (`entry`, the same world) or opens on the stone
//   +24 …        the camera follows the ring, a ring-led move arriving with momentum into a glide
//   lines        the chapter line and its limit (≤ 3 lines a ring), each landing on a beat once no ring crosses it,
//                held together ≥ 2.5 s; they leave before the camera moves in (the held ring grows with the zoom)
//   dolly        in to reading magnification (UI text ≥ 28 px at 1080); then the reading glide, a drift of 0.4 px a
//                frame toward where the receipt lands (CR-04: never arrive-and-hold)
//   the take     at 1×, shown from the block's first frame (its in-point is solved so the receipt event lands on a
//                beat); the ask is read in the take's history, the act from its start event; nothing is cut (§3.6)
//   the receipt  the camera glides down the conversation to it, arriving as it lands (the ring returns to the stone on
//                that beat), and holds it for its reading time, still drifting (no freeze, no mark, no hit)
//   the cut      a momentum cut (E-leave out, matched speed in, gliding on: never landing at rest) onto the cascade's
//                stage, on a bar line
// The cascade shot: one fixed line, items swapped in place with their UI cards, crossing at mid-blur (CR-17), each
// landing 2–3 frames before a beat; the block ends on the next bar line after the last item's hold, the camera leaving
// on an E-leave with the fixed line and the last item drawing their exits before the cut (CR-03, CR-06).
// Pure data (setpieces/scene.ts).
import { f60, sec } from "../tokens";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import { travelTo } from "../camera/moves";
import { momentumCut } from "../transitions/momentum";
import type { Point, Rect, Vec } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import type { Grade, GradeName, LightCue } from "../light/grades";
import { cascadeSchedule } from "../type/Cascade";
import { typeSizePx } from "../type/scale";
import { place, pointsOf, type MusicGrid } from "./music";
import { breakLines, enterFramesOf, exitFramesOf, fitPose, frameBox, glideLz, lineHeightOf, lineRect, rectInFrame, unionRect, type FrameBox, type TypeBox } from "./frame";
import { frameOfSource, solveInPoint, type TakeManifest } from "./take";
import type { StandIn } from "./standins";
import { RING_RECEIPT_CUES, RING_START_CUES } from "./pieces.cues";
import { anchored, cueList, landFrames, musicHit, ringClearFrame } from "./kit";
import { move, type CascadeSpec, type MusicHit, type PlaneSpec, type ScenePlan, type TypeSpec } from "./scene";
import { STONE_R, STONE_SIZE } from "./world";

/** What a ring block shows: the data the edit lane writes for each ring. World units throughout. */
export interface RingContent {
  id: string;
  name: string;
  /** the stone the ring leaves (the companion's avatar centre) */
  stone: Point;
  /** what a fresh block opens on (default: the companion around the stone) */
  startRect?: Rect;
  /** context planes drawn in the place's world (the other windows) */
  context?: readonly PlaneSpec[];
  /** the one take every plane of the place is a view of (CR-11), and its event the act starts on */
  take: TakeManifest;
  /** the place's window: a view of the take, drawn behind the views the film reads */
  window?: { view: string; rect: Rect };
  /** the ask: a view of the take (in its history); `readRect` is the part read (world) */
  ask: { view: string; rect: Rect; words: number; textPx: number; readRect?: Rect };
  /** the act: a view of the take, from its start event */
  act: { view: string; rect: Rect; startEvent: string; words: number; textPx: number; readRect: Rect };
  /** the receipt: the take event that lands on a beat, and where it shows (inside the act's view, view px) */
  receipt: { event: string; rect: Rect; words: number; textPx: number; readRect?: Rect };
  lines: { chapter: string; limit?: string };
  cascade?: { fixed: string; items: readonly { text: string; holdS?: number; card: StandIn }[] };
}

export interface RingOptions {
  w: number;
  h: number;
  fps: number;
  content: RingContent;
  grid?: MusicGrid;
  /** continue the previous piece's camera in the same world (a continuous hand-off): its pose, velocity, parallax ref, riverbed and light */
  entry?: { pose: Pose; vel: CamVel; ref?: Pose; groundRect?: Rect; grade?: GradeName | Grade };
  /**
   * One timeline for every aspect (§3.12): the latest frame of each timed event across the aspects (setpieces/align.ts
   * alignAspects); each is a minimum here, so every aspect cuts on the same frames.
   */
  align?: Partial<RingTiming>;
}

/** The frames a ring block's timeline is made of (the same in every aspect once aligned). */
export interface RingTiming {
  arriveAt: number;
  /** the frames the lines LAND (their entrances start earlier by their own length, which differs with line breaks) */
  chapterLand: number;
  limitLand: number;
  linesExit: number;
  linesGone: number;
  receiptAt: number;
  cut: number;
  end: number;
}

interface RingLayout {
  /** where the place sits on arrival (the type owns the rest of the frame) */
  arrive: (f: FrameBox) => Rect;
  /** the chapter pair's box */
  pair: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
  sizeT: number;
  /** the reading region (the ask and the act are framed into it) */
  read: (f: FrameBox) => Rect;
  /** where the receipt is framed once the camera has glided down to it (the conversation above it out of frame) */
  receipt: (f: FrameBox) => Rect;
  /** the cascade: the card's region, the fixed line's box and the item's box */
  stage: (f: FrameBox) => Rect;
  fixedBox: (f: FrameBox) => TypeBox;
  itemBox: (f: FrameBox) => TypeBox;
}

const LAYOUT: Record<FrameBox["aspect"], RingLayout> = {
  "16:9": {
    arrive: (f) => ({ x: f.w * 0.46, y: f.safe * 2, w: f.w * 0.5, h: f.h - 4 * f.safe }),
    pair: (f, bh) => ({ left: f.safe * 2, top: f.h - f.safe * 2.4 - bh, maxW: f.w * 0.46 - f.safe * 2 }),
    sizeT: 0,
    read: (f) => ({ x: f.safe * 2, y: f.safe * 2, w: f.w - f.safe * 4, h: f.h - f.safe * 4 }),
    receipt: (f) => ({ x: f.safe * 2, y: f.safe * 2, w: f.w - f.safe * 4, h: f.h - f.safe * 4 }),
    // the stage card fills the right half: a cascade is a frame of real UI beside its words, not a card in a field (CR-16)
    stage: (f) => ({ x: f.w * 0.47, y: f.h * 0.11, w: f.w * 0.48, h: f.h * 0.78 }),
    fixedBox: (f) => ({ left: f.safe * 2, top: f.h * 0.32, align: "left" }),
    itemBox: (f) => ({ left: f.safe * 2 + 2 * f.unit, top: f.h * 0.32 + 128 * f.unit, align: "left" }),
  },
  "1:1": {
    arrive: (f) => ({ x: f.w * 0.3, y: f.safe, w: f.w * 0.66, h: f.h * 0.58 }),
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 1.6 - bh, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.1,
    read: (f) => ({ x: f.safe, y: f.safe * 1.5, w: f.w - 2 * f.safe, h: f.h - 3 * f.safe }),
    receipt: (f) => ({ x: f.safe, y: f.safe * 1.5, w: f.w - 2 * f.safe, h: f.h - 3 * f.safe }),
    stage: (f) => ({ x: f.safe * 1.2, y: f.h * 0.34, w: f.w - f.safe * 2.4, h: f.h * 0.6 }),
    fixedBox: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.4, align: "left" }),
    itemBox: (f) => ({ left: f.safe * 1.2 + 2 * f.unit, top: f.safe * 1.4 + 104 * f.unit, align: "left" }),
  },
  // 9:16: each cascade stacks: the fixed line at the top, the UI card in the middle, the item below (§3.12)
  "9:16": {
    arrive: (f) => ({ x: f.safe, y: f.h * 0.12, w: f.w - 2 * f.safe, h: f.h * 0.5 }),
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 2.6 - bh, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.2,
    read: (f) => ({ x: f.safe * 0.5, y: f.h * 0.22, w: f.w - f.safe, h: f.h * 0.5 }),
    // the tall frame frames the receipt high, so the test card's sentence, wider than the frame at the receipt's zoom,
    // glides up out of it whole
    receipt: (f) => ({ x: f.safe * 0.5, y: f.h * 0.12, w: f.w - f.safe, h: f.h * 0.3 }),
    stage: (f) => ({ x: f.safe * 0.7, y: f.h * 0.27, w: f.w - 1.4 * f.safe, h: f.h * 0.46 }),
    fixedBox: (f) => ({ left: 0, top: f.h * 0.13, width: f.w, align: "center" }),
    itemBox: (f) => ({ left: 0, top: f.h * 0.77, width: f.w, align: "center" }),
  },
};

/** Seconds a viewer needs for `words` words of UI (§5.2's hold formula). */
const readS = (words: number) => Math.max(50 / 60, 0.5 + 0.3 * words);

/** The world rect of a rect given inside a view of a plane. */
const inView = (plane: Rect, r: Rect): Rect => ({ x: plane.x + r.x, y: plane.y + r.y, w: r.w, h: r.h });

/** The plan of one ring block for one aspect. */
export function planRingBlock(o: RingOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const c = o.content;
  const g = o.grid;
  const m = c.take;
  const music: MusicHit[] = [];
  const types: TypeSpec[] = [];
  const lzHold = glideLz(f);
  const holdPx = 0.4 * f.unit; // the reading drift, px a frame at the frame's corners (all of them: a pan)

  /* ------------------------------------------------ the place and its framings -------------------------------- */
  const placeRect = unionRect(c.window?.rect ?? c.ask.rect, c.ask.rect, c.act.rect);
  const askRead = c.ask.readRect ?? c.ask.rect;
  const receiptWorld = inView(c.act.rect, c.receipt.rect);
  const receiptRead = c.receipt.readRect ? inView(receiptWorld, c.receipt.readRect) : receiptWorld;
  // the arrival frames the place's window whole (its text too small to read yet: the dolly brings it to reading size)
  const arrivePose = fitPose(c.window?.rect ?? unionRect(askRead, c.act.readRect), L.arrive(f), f, 0.9);
  const zoomFor = (css: number) => ((28 * f.unit) / css) * 1.03; // UI text ≥ 28 px at 1080
  // the ask and the act are read together, framed whole (CR-05), at the 28 px floor of the smaller of their texts
  const readBlock = unionRect(askRead, c.act.readRect);
  const readFit = fitPose(readBlock, L.read(f), f, 0.94);
  // (as large as the frame allows, up to 3× (the read crops are 3× captures): a read is a frame's subject, not a
  // card in a field; at least the 28 px floor)
  const readZoom = Math.max(zoomFor(Math.min(c.ask.textPx, c.act.textPx)), Math.min(readFit.zoom, 3.0 * f.unit));
  const readPose: Pose = { ...readFit, zoom: readZoom };
  // where the two together are wider than the reading region at that floor (1:1 and 9:16: the act's sentence at the
  // ask's floor is nearly the frame's width, 17 px from its edges), the camera eases back to the act's own floor as the
  // act starts, so the act is read with its margins (the ask has been read by then)
  const twoReads = readBlock.w * readZoom > L.read(f).w + 0.5;
  const actFit = fitPose(c.act.readRect, L.read(f), f, 0.94);
  const actZoom = twoReads ? Math.min(readZoom, Math.max(zoomFor(c.act.textPx), Math.min(actFit.zoom, 3.0 * f.unit))) : readZoom;
  const actPose: Pose = twoReads ? { ...actFit, zoom: actZoom } : readPose;
  // the receipt, framed alone at its own floor (the conversation glides up past the frame's top as it comes), at most
  // 1.2× the act's zoom, so the glide down to it never has to move the frame's corners faster than travel allows
  const recFit = fitPose(receiptRead, L.receipt(f), f, 0.9);
  const receiptPose: Pose = { ...recFit, zoom: Math.max(zoomFor(c.receipt.textPx), Math.min(recFit.zoom, 3.2 * f.unit, actZoom * 1.2)) };

  /* ------------------------------------------------ the ring ---------------------------------------------------- */
  const emitF = f60(36, fps);
  const frameF = f60(60, fps);
  const framedAt = emitF + frameF;

  /* ------------------------------------------------ the camera: arrival ---------------------------------------- */
  // A fresh block opens on the stone, so the ring is seen to leave it; a continued one (`entry`) starts where the
  // previous piece's camera is, moving as it moves. The camera follows the ring 24 frames behind; a long journey bows
  // out in zoom halfway, so the picture never moves faster than about 22 px a frame on the way (§5.3 travel ≤ 30), and
  // lands on the place with momentum (a ring-led move of 0.7–1.4 s, longer only when the distance or the zoom needs it).
  const startRect: Rect = c.startRect ?? { x: c.stone.x - 420, y: c.stone.y - 520, w: 560, h: 640 };
  const start: Pose = o.entry?.pose ?? fitPose(startRect, { x: 0, y: 0, w: f.w, h: f.h }, f, 0.8);
  const startVel: CamVel = o.entry?.vel ?? { x: 0, y: 0, lz: lzHold };
  const ref: Pose = o.entry?.ref ?? arrivePose;
  const followFrom = f60(24, fps);
  const D = Math.hypot(arrivePose.x - start.x, arrivePose.y - start.y);
  const travelDir = { x: D > 1e-6 ? (arrivePose.x - start.x) / D : 1, y: D > 1e-6 ? (arrivePose.y - start.y) / D : 0 };
  const zLow = Math.min(start.zoom, arrivePose.zoom);
  const T0 = Math.max(f60(84, fps), framedAt + f60(12, fps) - followFrom);
  // the bow: the zoom halfway that keeps the peak screen speed (≈ 1.5 × D × z ÷ T) at about 22 px a frame
  const zMid = Math.min(zLow, (22 * f.unit * T0 * 60) / fps / (1.5 * Math.max(D, 1)));
  const bow = zMid < zLow * 0.97;
  const lzTravel = bow ? 2 * Math.max(Math.abs(Math.log(zMid / start.zoom)), Math.abs(Math.log(arrivePose.zoom / zMid))) : Math.abs(Math.log(arrivePose.zoom / start.zoom));
  // the zoom moves the frame's corners at (half-diagonal × log-zoom rate): keep that at ≤ 18 px a frame at 60 fps (a
  // Hermite peaks at 1.5× its mean), so with the pan the corners stay within the 30 px travel limit
  const lzMax = (18 * f.unit) / (Math.hypot(f.w, f.h) / 2);
  const zoomFrames = Math.ceil(((1.5 * lzTravel) / lzMax) * (fps / 60));
  const al = o.align ?? {};
  const arriveAt = Math.max(followFrom + T0, followFrom + zoomFrames, al.arriveAt ?? 0);
  // the arrival glide drifts on at 0.4 px a frame in the travel's direction, breathing in (never a rest)
  const travelDrift = { x: (travelDir.x * holdPx * 60) / fps / arrivePose.zoom, y: (travelDir.y * holdPx * 60) / fps / arrivePose.zoom, lz: lzHold * 0.3 };
  const arrival = (into: VelocityCamera, glideTo: number) => {
    into.glide(followFrom, f60(24, fps), startVel);
    if (bow) {
      const midAt = followFrom + Math.round((arriveAt - followFrom) * 0.5);
      const mid: Pose = { x: (start.x + arrivePose.x) / 2, y: (start.y + arrivePose.y) / 2, zoom: zMid };
      const v = (D / (arriveAt - followFrom)) * 1.25;
      into.hermite(midAt, mid, { x: travelDir.x * v, y: travelDir.y * v, lz: 0 });
    }
    return travelTo(into, arriveAt, arrivePose, glideTo, fps, { arriveSpeedPxPerFrame: 7, tauS: 0.4, drift: travelDrift });
  };
  const cam = new VelocityCamera(start, startVel);

  /* ------------------------------------------------ the lines (they land on beats once no ring crosses them) --- */
  const sizeE = typeSizePx("expressive", f.w, f.h, L.sizeT);
  const sizeF = typeSizePx("functional", f.w, f.h, 0.3);
  const probe = L.pair(f, 0);
  const chapter = breakLines(c.lines.chapter, "expressive", f, probe.maxW, L.sizeT);
  const limit = c.lines.limit ? breakLines(c.lines.limit, "functional", f, probe.maxW, 0.3) : null;
  const nC = chapter.split("\n").length;
  const nL = limit ? limit.split("\n").length : 0;
  const gap = 12 * f.unit;
  const blockH = nC * sizeE * lineHeightOf("expressive") + (limit ? gap + nL * sizeF * lineHeightOf("functional") : 0);
  const pos = L.pair(f, blockH);
  const boxC: TypeBox = { left: pos.left, top: pos.top, align: "left" };
  const boxL: TypeBox = { left: pos.left, top: pos.top + nC * sizeE * lineHeightOf("expressive") + gap, align: "left" };

  // a provisional camera to the end of the lines' hold, so the ring's path can be tested against the lines
  const linesHoldS = { chapter: 3.4, limit: 2.8 };
  const provisionalEnd = arriveAt + sec(5, fps);
  arrival(cam, provisionalEnd);
  const poseAt = (fr: number) => cam.pose(fr);
  // the ring's spec needs the receipt's frame (its return); compute the type first against a ring that holds long
  const ringWith = (holdUntil: number): RingSpec => ({
    id: `${c.id}-ring`,
    start: 0,
    source: c.stone,
    stoneRadius: STONE_R,
    phases: [
      { kind: "emit", frames: emitF, radius: STONE_R * 3 },
      { kind: "frame", frames: frameF, rect: c.ask.rect, ease: "E-move" },
      { kind: "hold", frames: Math.max(1, holdUntil - framedAt) },
      { kind: "return", frames: f60(42, fps) },
    ],
    echoes: 2,
    layer: "ground",
  });
  const probeRing = ringWith(provisionalEnd + sec(10, fps));
  const specC: TypeSpec = { id: `${c.id}-chapter`, text: chapter, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxC, kind: "film", key: true, pairWith: limit ? `${c.id}-limit` : undefined };
  const rectC = lineRect(chapter, "expressive", f, boxC, L.sizeT);
  const clearC = ringClearFrame([probeRing], [rectC], fps, poseAt, f, 0, provisionalEnd);
  const landC = place(Math.max(f60(30, fps) + landFrames(specC, fps), clearC, al.chapterLand ?? -Infinity), g, { level: "beat", frames: landFrames(specC, fps) });
  specC.at = landC.at;
  music.push(musicHit("the chapter line lands", landC));
  types.push(specC);
  let exitAt = specC.at + sec(linesHoldS.chapter, fps);
  let specL: TypeSpec | null = null;
  if (limit) {
    specL = { id: `${c.id}-limit`, text: limit, tier: "functional", at: 0, sizeT: 0.3, box: boxL, kind: "film" };
    const rectL = lineRect(limit, "functional", f, boxL, 0.3);
    const clearL = ringClearFrame([probeRing], [rectL], fps, poseAt, f, 0, provisionalEnd);
    const landL = place(Math.max((landC.point ?? landC.at + landFrames(specC, fps)) + f60(18, fps), clearL, al.limitLand ?? -Infinity), g, { level: "beat", frames: landFrames(specL, fps) });
    specL.at = landL.at;
    music.push(musicHit("the limit lands", landL));
    exitAt = Math.max(exitAt, specL.at + sec(linesHoldS.limit, fps));
    types.push(specL);
  }
  exitAt = Math.max(exitAt, al.linesExit ?? 0);
  specC.exitAt = exitAt;
  if (specL) specL.exitAt = exitAt;
  const linesGone = Math.max(exitAt + Math.max(exitFramesOf("lineRise", "blur", chapter, fps), limit ? exitFramesOf("lineBlur", "blur", limit, fps) : 0), al.linesGone ?? 0);
  if (linesGone > provisionalEnd) throw new Error(`${c.id}: the lines run to ${linesGone}, past the arrival glide (${provisionalEnd})`);

  /* ------------------------------------------------ the take's timing ------------------------------------------ */
  const startSrc = m.events[c.act.startEvent];
  const recSrc = m.events[c.receipt.event];
  if (startSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.act.startEvent}"`);
  if (recSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.receipt.event}"`);
  const actToReceipt = Math.ceil(((recSrc - startSrc) * fps) / m.fps); // Pebble's own time, never shortened
  // the glide down the conversation to the receipt: long enough for its distance at ≤ about 22 px a frame on average
  // (a Hermite peaks at 1.5× its mean: §5.3 travel ≤ 30), straddling the receipt's landing (a third before it), so
  // the act is read for nearly all of the take's own span from its start event to the receipt
  const glideDist = Math.hypot((receiptPose.x - actPose.x) * Math.sqrt(actZoom * receiptPose.zoom), (receiptPose.y - actPose.y) * Math.sqrt(actZoom * receiptPose.zoom)) / f.unit;
  // (its zoom change moves the frame's corners too: half the diagonal × the log-zoom change, as the dolly counts it)
  const glideLzChange = Math.abs(Math.log(receiptPose.zoom / actZoom));
  const glideF = Math.max(f60(56, fps), Math.ceil(((1.5 * ((Math.hypot(f.w, f.h) / 2 / f.unit) * glideLzChange + glideDist)) / 22) * (fps / 60)));
  const glideDownF = Math.round(glideF / 3);
  // the dolly, then the ask read in the take's history; the act starts after it; the receipt lands on a beat after
  // the act's read and the glide down to it: every span is the take's own (1×), every hold its reading time
  const dollyFrom = Math.max(linesGone + 2, arriveAt + f60(30, fps));
  // (long enough for its zoom change at the frame's corners and its pan: ≤ about 22 px a frame on average)
  const dollyLz = Math.abs(Math.log(readZoom / arrivePose.zoom));
  const dollyPan = (Math.hypot(readPose.x - arrivePose.x, readPose.y - arrivePose.y) * Math.sqrt(readZoom * arrivePose.zoom)) / f.unit;
  const dollyF = Math.max(f60(110, fps), Math.ceil(((1.5 * ((Math.hypot(f.w, f.h) / 2 / f.unit) * dollyLz + dollyPan)) / 22) * (fps / 60)));
  const dollyTo = dollyFrom + dollyF;
  const askReadF = sec(readS(c.ask.words), fps);
  const actReadF = sec(readS(c.act.words) - 0.5, fps);
  const earliestReceipt = Math.max(dollyTo + askReadF + actToReceipt, dollyTo + askReadF + actReadF + glideDownF);
  const landR = place(Math.max(earliestReceipt, al.receiptAt ?? 0), g, { level: "beat" });
  const receiptAt = landR.point ?? landR.at;
  music.push(musicHit("the receipt lands (the ring returns)", landR));
  const actAt = receiptAt - actToReceipt;
  const receiptReadEnd = receiptAt - glideDownF + glideF + sec(readS(c.receipt.words), fps);

  /* ------------------------------------------------ the camera: in to read, the glide down, the receipt ---------- */
  // the arrival glide was provisional: rebuild the camera with the glide ending where the dolly starts
  const cam2 = new VelocityCamera(start, startVel);
  arrival(cam2, dollyFrom);
  // the reading drift: 0.4 px a frame, down toward where the receipt lands (a pan: every corner moves), and the
  // framing starts half the drift back, so the block drifts through the middle of the frame and never toward its edge
  // (straight down: the read block can be nearly as wide as a square or tall frame, so it never drifts sideways)
  const down = { x: 0, y: receiptPose.y >= readPose.y ? 1 : -1 };
  const readDrift = { x: (down.x * holdPx * 60) / fps / readZoom, y: (down.y * holdPx * 60) / fps / readZoom, lz: 0 };
  const readSpan = (twoReads ? actAt : receiptAt - glideDownF) - dollyTo;
  const readFrom: Pose = { x: readPose.x - (readDrift.x * readSpan) / 2, y: readPose.y - (readDrift.y * readSpan) / 2, zoom: readZoom };
  cam2.hermite(dollyTo, readFrom, readDrift);
  const actDrift = { x: (down.x * holdPx * 60) / fps / actZoom, y: (down.y * holdPx * 60) / fps / actZoom, lz: 0 };
  const easeBackF = f60(40, fps);
  if (twoReads) {
    // the ask's read, then, as the act starts, the ease back to the act's framing, drifting on at the same pace
    cam2.glide(actAt, f60(30, fps), readDrift);
    const actSpan = receiptAt - glideDownF - (actAt + easeBackF);
    cam2.hermite(actAt + easeBackF, { x: actPose.x - (actDrift.x * actSpan) / 2, y: actPose.y - (actDrift.y * actSpan) / 2, zoom: actZoom }, actDrift);
  }
  cam2.glide(receiptAt - glideDownF, f60(30, fps), twoReads ? actDrift : readDrift);
  // the glide down the conversation to the receipt, landing a little after it lands, then drifting on through its
  // hold (the receipt is legible on the way: its words count from its landing)
  const receiptArrive = receiptAt - glideDownF + glideF;
  const recDrift = { x: (down.x * holdPx * 60) / fps / receiptPose.zoom, y: (down.y * holdPx * 60) / fps / receiptPose.zoom, lz: lzHold * 0.25 };
  const recHold = receiptReadEnd - receiptArrive;
  const recFrom: Pose = { x: receiptPose.x - (recDrift.x * recHold) / 2, y: receiptPose.y - (recDrift.y * recHold) / 2, zoom: receiptPose.zoom / Math.exp((recDrift.lz * recHold) / 2) };
  // two phases: straight down at the reading zoom until the receipt sits where it will be read (the sentences above
  // it leave through the frame's top, never cut at its sides), then in to the receipt's own zoom and centre
  const recScreenY = f.h / 2 + (receiptRead.y + receiptRead.h / 2 - recFrom.y) * recFrom.zoom;
  const midPose: Pose = { x: actPose.x, y: receiptRead.y + receiptRead.h / 2 - (recScreenY - f.h / 2) / actZoom, zoom: actZoom };
  const midAt = receiptAt - glideDownF + Math.round(glideF * 0.6);
  const midV = { x: 0, y: ((midPose.y - cam2.pose(receiptAt - glideDownF).y) / (glideF * 0.6)) * 0.9, lz: 0 };
  cam2.hermite(midAt, midPose, midV);
  cam2.hermite(receiptArrive, recFrom, recDrift);
  cam2.glide(receiptReadEnd, f60(30, fps), recDrift);

  /* ------------------------------------------------ the cut to the cascade, on a bar line ---------------------- */
  const leaveF = f60(18, fps);
  const cutP = place(Math.max(receiptReadEnd + leaveF + 1, al.cut ?? 0), g, { level: "bar" });
  const cut = cutP.point ?? cutP.at;
  music.push(musicHit("the cut to the cascade", cutP));
  const use = solveInPoint(m, c.receipt.event, receiptAt, 0, cut, fps);

  // the ring: frames the ask, holds, returns to the stone on the receipt's beat
  const ring = ringWith(receiptAt);

  /* ------------------------------------------------ the cascade shot ------------------------------------------- */
  const shots: ScenePlan["shots"][number][] = [];
  const seams: ScenePlan["seams"][number][] = [];
  let duration = cut;
  let cascadeSpec: CascadeSpec | undefined;
  const stageWorld: Rect = { x: placeRect.x + placeRect.w + 1400, y: placeRect.y + 120, w: 640, h: 520 };
  let inCam: VelocityCamera | null = null;
  let leaveDir: Vec = { x: -1, y: 0 };
  const stagePose = fitPose(stageWorld, L.stage(f), f, 0.97);
  if (c.cascade) {
    // the incoming camera glides on at the cut's speed into the stage's push (CR-04: E-arrive to rest, then a glide up
    // from 0, was an arrive-and-hold of a second)
    const stageDrift = { x: (holdPx * 0.6 * 60) / fps / stagePose.zoom, y: 0, lz: lzHold * 0.8 };
    // (the glide lands its framing after five time constants: what is left of the cut's speed then is under 1 %)
    const seam = momentumCut({ out: cam2, cutFrame: cut, dir: { x: -1, y: 0 }, dPx: 118 * f.unit, leaveFrames: leaveF, target: stagePose, inFrames: f60(100, fps), mode: "glide", tau: f60(20, fps), drift: stageDrift, frameW: f.w, frameH: f.h, fps });
    inCam = seam.inCam;
    // the fixed line, then the items, each swap landing 2–3 frames before a beat (local frames of the piece)
    const fixedBox = L.fixedBox(f);
    const fixedText = breakLines(c.cascade.fixed, "expressive", f, f.w - 2 * f.safe, 0.3);
    const fixed: TypeSpec = { id: `${c.id}-fixed`, text: fixedText, tier: "expressive", at: cut + f60(6, fps), sizeT: 0.3, box: fixedBox, kind: "cascade", exit: "blur" };
    const items = c.cascade.items.map((it, i) => ({ text: it.text, holdS: it.holdS ?? (i === 0 ? 1.1 : 0.85) }));
    const beats = g ? pointsOf(g, "beat").filter((b) => b > cut) : undefined;
    const itemsStart = cut + f60(6, fps) + enterFramesOf("lineRise", fixedText, fps) + f60(6, fps);
    const sched = cascadeSchedule(itemsStart, items, fps, beats);
    const last = sched[sched.length - 1]!;
    // the block ends on the bar line after the last item's hold and the leave: the camera's E-leave starts 19 frames
    // before the end, the fixed line and the last item draw their exits from it, gone before the cut (CR-03)
    const endEarliest = last.outStart + leaveF + 1;
    const endP = place(Math.max(endEarliest, al.end ?? 0), g, { level: "bar" });
    duration = endP.point ?? endEarliest;
    music.push(musicHit("the cascade ends (the next block)", endP));
    for (const w of cascadeSchedule(itemsStart, items, fps, beats)) music.push({ event: `swap "${w.text}" lands`, frame: w.inEnd, point: null, level: null, waited: 0 });
    const leaveAt = duration - 1 - leaveF;
    fixed.exitAt = leaveAt;
    const cards: PlaneSpec[] = c.cascade.items.map((it, i) => {
      // each card at a uniform scale that fits the stage (never stretched), centred on it
      const k = Math.min(stageWorld.w / it.card.w, stageWorld.h / it.card.h);
      const w = it.card.w * k;
      const h = it.card.h * k;
      return { id: `${c.id}-card${i}`, kind: "pebble", rect: { x: stageWorld.x + (stageWorld.w - w) / 2, y: stageWorld.y + (stageWorld.h - h) / 2, w, h }, content: { kind: "standIn", standIn: it.card }, shadow: true };
    });
    cascadeSpec = { fixed, items, start: itemsStart, beats, itemBox: L.itemBox(f), cards, holdLast: false, endAt: leaveAt };
    // the stage's slow push-in after the arrival drifts on through every hold, then leaves on an E-leave into the cut
    inCam.glide(leaveAt - cut, f60(30, fps), stageDrift);
    leaveDir = { x: -1, y: 0 };
    const p0 = inCam.pose(leaveAt - cut);
    inCam.ease(duration - cut - 1, { x: p0.x + (118 * f.unit) / p0.zoom, y: p0.y, zoom: p0.zoom * Math.exp(lzHold * 0.8 * leaveF) }, "E-leave");
    seams.push({ at: cut, kind: "momentum", frames: 0, out: `${c.id}-ring`, in: `${c.id}-cascade` });
  }

  /* ------------------------------------------------ planes of the ring shot ------------------------------------ */
  const view = (id: string, v: string, rect: Rect, read?: PlaneSpec["read"]): PlaneSpec => ({ id: `${c.id}-${id}`, kind: "pebble", rect, content: { kind: "take", use, view: v }, shadow: id === "window", radius: id === "window" ? 10 : 4, read });
  // the place first, then the context in front of it, in the composed world's own order (a continued world keeps its
  // stacking: setpieces/drop.ts draws the same places in the same order)
  const planes: PlaneSpec[] = [
    ...(c.window ? [view("window", c.window.view, c.window.rect)] : []),
    // read until the glide down to the receipt carries them up out of the frame
    // their words count from the dolly's start (legible on the way in); read until the glide down carries them out
    // (with two reads the ask's read ends as the camera eases back to the act's floor: it has been read by then)
    view("ask", c.ask.view, c.ask.rect, { from: dollyTo, to: twoReads ? actAt : receiptAt - glideDownF, words: c.ask.words, textPx: c.ask.textPx, rect: askRead, seenFrom: dollyFrom, seenTo: receiptAt - glideDownF + glideF }),
    view("act", c.act.view, c.act.rect, { from: Math.max(dollyTo, actAt), to: receiptAt - glideDownF, words: c.act.words, textPx: c.act.textPx, rect: c.act.readRect, seenFrom: Math.max(dollyFrom, actAt), seenTo: receiptAt - glideDownF + glideF }),
    ...(c.context ?? []),
  ];

  const cues = cueList(`${c.id} cues`, anchored(RING_START_CUES, 0, `${c.id} start`), anchored(RING_RECEIPT_CUES, receiptAt / fps, `${c.id} receipt`));
  const ringShot = {
    id: `${c.id}-ring`,
    from: 0,
    to: c.cascade ? cut : duration,
    kind: "ui" as const,
    camera: cam2,
    ref,
    ground: "riverbed" as const,
    groundRect: o.entry?.groundRect,
    planes,
    // the receipt shows inside the act's view at its event; it is read here and never framed by a ring
    // the receipt is read from its landing until the camera leaves (its whole legible span: CR-05)
    reads: [{ id: `${c.id}-receipt`, rect: receiptRead, from: receiptArrive, to: c.cascade ? cut - leaveF - 1 : duration, words: c.receipt.words, receipt: true, textPx: c.receipt.textPx, seenFrom: receiptAt }],
    stone: { at: c.stone, r: STONE_R, size: STONE_SIZE, cues },
    rings: [ring],
    dofScale: 14,
  };
  shots.push(ringShot);
  if (c.cascade && inCam && cascadeSpec) {
    shots.push({
      id: `${c.id}-cascade`,
      from: cut,
      to: duration,
      kind: "ui",
      camera: inCam,
      ref: stagePose,
      ground: "riverbed",
      planes: [],
      rings: [],
      blur: [{ from: 0, to: f60(20, fps) }],
      cascade: cascadeSpec,
      dofScale: 14,
    });
  }

  // the light: the day of the rings, from whatever the previous piece ended on (a continued world never steps)
  const lightInitial = o.entry?.grade ?? "day";
  const lightCues: LightCue[] = lightInitial === "day" ? [] : [{ at: 0, to: "day", frames: f60(90, fps) }];
  const lastShot = shots[shots.length - 1]!;
  const exitSample = lastShot.camera.sample(duration - lastShot.from);

  return {
    id: c.id,
    name: c.name,
    aspect: A,
    frame: f,
    fps,
    duration,
    shots,
    seams,
    types,
    lightInitial,
    lightCues,
    leaks: [],
    hits: [],
    takes: [use],
    music,
    moves: [
      move("ring", emitF, frameF, "the ring leads to the ask and frames it"),
      move("push", dollyFrom, dollyF + f60(30, fps), "the dolly in to reading magnification"),
      move("product", 0, cut, `${m.id} at 1×`),
      move("ring", receiptAt, f60(42, fps), "the ring returns to the stone on the receipt's beat"),
      ...lightCues.map((x) => move("light", x.at, x.frames, "the light to day")),
      ...(cascadeSpec ? cascadeSchedule(cascadeSpec.start, cascadeSpec.items, fps, cascadeSpec.beats).slice(1).map((w, i) => move("swap", w.inStart, w.inEnd - w.inStart, `swap ${i + 1}`)) : []),
    ],
    exit: { pose: exitSample.pose, vel: exitSample.vel, shot: lastShot.id, ref: lastShot.ref, grade: "day" },
    extra: {
      timing: { arriveAt, chapterLand: specC.at + landFrames(specC, fps), limitLand: specL ? specL.at + landFrames(specL, fps) : specC.at + landFrames(specC, fps), linesExit: exitAt, linesGone, receiptAt, cut, end: duration } satisfies RingTiming,
      arriveAt,
      linesGone,
      dollyFrom,
      dollyTo,
      receiptAt,
      actAt,
      takeAt: 0,
      receiptArrive,
      receiptReadEnd,
      cut,
      leaveDir,
      receiptFrame: frameOfSource(recSrc, use.at, fps, m, use.inPoint),
      readZoom,
      actZoom,
      twoReads: twoReads ? 1 : 0,
      receiptZoom: receiptPose.zoom,
    },
  };
}

/** Where a world rect is on screen in a shot (for layouts and tests). */
export const onScreen = (r: Rect, pose: Pose, f: FrameBox): Rect => rectInFrame(r, pose, f);
