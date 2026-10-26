// A RING BLOCK (TREATMENT §3.5 S08–S19, §3.6, §3.8): one feature place's ask → act → receipt, then the in-place
// cascade that follows it. A template driven by data (setpieces/rings.ts holds Ring 4 and the edit lane adds the
// others): the place and its planes, the take and the event that lands on a beat, the lines, the cascade.
//
// The ring shot, in local frames from the block's start (the edit lane puts frame 0 on a phrase downbeat):
//   0            a ring leaves the stone; it travels to the place and frames the ask (E-move), and holds
//   +12 … +108   the camera follows 12 frames behind, a ring-led move of ≤ 1.4 s arriving with momentum into a glide,
//                at a framing where the ring's circle stays clear of the type
//   lines        the chapter line and its limit (≤ 3 lines a ring), each landing on a beat once no ring crosses it,
//                held together ≥ 2.5 s; they leave before the camera moves in (the held ring grows with the zoom)
//   dolly        in to reading magnification (UI text ≥ 28 px at 1080), then a reading glide (≈ 0.3 px a frame)
//   the take     at 1×: its in-point is solved so its receipt event lands on a beat, after the ask and the act have
//                been read; nothing inside it is cut (§3.6 chain 9); the ring returns to the stone on that beat
//   the receipt  the camera glides to it (no freeze, no mark, no hit: "Verified gets no hit") and holds it for its
//                reading time
//   the cut      a momentum cut (E-leave out, matched speed in) onto the cascade's stage, on a bar line
// The cascade shot: one fixed line, items swapped in place with their UI cards (8 frames out, 8 in), each landing
// 2–3 frames before a beat; the block ends on the next bar line after the last item's hold.
// Pure data (setpieces/scene.ts).
import { f60, sec } from "../tokens";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import { travelTo } from "../camera/moves";
import { momentumCut } from "../transitions/momentum";
import type { Point, Rect } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import { cascadeSchedule } from "../type/Cascade";
import { typeSizePx } from "../type/scale";
import { place, pointsOf, type MusicGrid } from "./music";
import { breakLines, enterFramesOf, exitFramesOf, fitPose, frameBox, lineHeightOf, lineRect, rectInFrame, unionRect, type FrameBox, type TypeBox } from "./frame";
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
  /** context planes drawn in the place's world (the place's window, other windows) */
  context?: readonly PlaneSpec[];
  /** the ask the ring frames: a still (in the conversation's history) or a slot */
  ask: { rect: Rect; standIn: StandIn; words: number; textPx: number };
  /** the act: one view of a take, played at 1× */
  act: { take: TakeManifest; view: string; rect: Rect; startEvent: string; words: number; textPx: number; readRect: Rect };
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
  /** continue the previous piece's camera in the same world (a continuous hand-off); default: a fresh start */
  entry?: { pose: Pose; vel: CamVel };
}

interface RingLayout {
  /** where the place sits on arrival (the type owns the rest of the frame) */
  arrive: (f: FrameBox) => Rect;
  /** the chapter pair's box */
  pair: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
  sizeT: number;
  /** the reading region (the act and the receipt are framed into it) */
  read: (f: FrameBox) => Rect;
  /** the cascade: the card's region, the fixed line's box and the item's box */
  stage: (f: FrameBox) => Rect;
  fixedBox: (f: FrameBox) => TypeBox;
  itemBox: (f: FrameBox) => TypeBox;
}

const LAYOUT: Record<FrameBox["aspect"], RingLayout> = {
  "16:9": {
    arrive: (f) => ({ x: f.w * 0.46, y: f.safe, w: f.w * 0.5, h: f.h - 2 * f.safe }),
    pair: (f, bh) => ({ left: f.safe * 2, top: f.h - f.safe * 2.4 - bh, maxW: f.w * 0.42 - f.safe * 2 }),
    sizeT: 0.15,
    read: (f) => ({ x: f.safe * 2, y: f.safe * 1.5, w: f.w - f.safe * 4, h: f.h - f.safe * 3 }),
    stage: (f) => ({ x: f.w * 0.52, y: f.h * 0.14, w: f.w * 0.42, h: f.h * 0.72 }),
    fixedBox: (f) => ({ left: f.safe * 2, top: f.h * 0.3, align: "left" }),
    itemBox: (f) => ({ left: f.safe * 2 + 2 * f.unit, top: f.h * 0.3 + 128 * f.unit, align: "left" }),
  },
  "1:1": {
    arrive: (f) => ({ x: f.w * 0.3, y: f.safe, w: f.w * 0.66, h: f.h * 0.58 }),
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 1.6 - bh, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.1,
    read: (f) => ({ x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: f.h - 2 * f.safe }),
    stage: (f) => ({ x: f.safe * 1.2, y: f.h * 0.36, w: f.w - f.safe * 2.4, h: f.h * 0.56 }),
    fixedBox: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.4, align: "left" }),
    itemBox: (f) => ({ left: f.safe * 1.2 + 2 * f.unit, top: f.safe * 1.4 + 104 * f.unit, align: "left" }),
  },
  // 9:16: each cascade stacks: the fixed line at the top, the UI card in the middle, the item below (§3.12)
  "9:16": {
    arrive: (f) => ({ x: f.safe, y: f.h * 0.12, w: f.w - 2 * f.safe, h: f.h * 0.5 }),
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 2.6 - bh, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.2,
    read: (f) => ({ x: f.safe * 0.5, y: f.h * 0.2, w: f.w - f.safe, h: f.h * 0.55 }),
    stage: (f) => ({ x: f.safe, y: f.h * 0.3, w: f.w - 2 * f.safe, h: f.h * 0.42 }),
    fixedBox: (f) => ({ left: 0, top: f.h * 0.14, width: f.w, align: "center" }),
    itemBox: (f) => ({ left: 0, top: f.h * 0.76, width: f.w, align: "center" }),
  },
};

/** Seconds a viewer needs for `words` words of UI (§5.2's hold formula). */
const readS = (words: number) => Math.max(50 / 60, 0.5 + 0.3 * words);

/** The plan of one ring block for one aspect. */
export function planRingBlock(o: RingOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const c = o.content;
  const g = o.grid;
  const music: MusicHit[] = [];
  const types: TypeSpec[] = [];

  /* ------------------------------------------------ the place and its framings -------------------------------- */
  const placeRect = unionRect(c.ask.rect, c.act.rect);
  // the arrival frames the ask and the top of the act's place (the act's card arrives there when its take starts)
  const arrivePose = fitPose(unionRect(c.ask.rect, c.act.readRect), L.arrive(f), f, 0.9);
  const zoomFor = (css: number) => (28 * f.unit) / css; // UI text ≥ 28 px at 1080
  // reading magnification: at least the 28 px floor, and no more than 2.4 (the captures are 2×; past that they soften)
  const readZoom = (fit: number, css: number) => Math.max(zoomFor(css) * 1.02, Math.min(fit, 2.4 * f.unit));
  const readAskPose = (() => {
    const p = fitPose(unionRect(c.ask.rect, c.act.readRect), L.read(f), f, 0.94);
    return { ...p, zoom: readZoom(p.zoom, Math.min(c.ask.textPx, c.act.textPx)) };
  })();
  const receiptWorld: Rect = { x: c.act.rect.x + c.receipt.rect.x, y: c.act.rect.y + c.receipt.rect.y, w: c.receipt.rect.w, h: c.receipt.rect.h };
  const receiptRead: Rect = c.receipt.readRect ? { x: receiptWorld.x + c.receipt.readRect.x, y: receiptWorld.y + c.receipt.readRect.y, w: c.receipt.readRect.w, h: c.receipt.readRect.h } : receiptWorld;
  const readReceiptPose = (() => {
    const p = fitPose(receiptRead, L.read(f), f, 0.94);
    return { ...p, zoom: readZoom(p.zoom, c.receipt.textPx) };
  })();

  /* ------------------------------------------------ the ring ---------------------------------------------------- */
  const emitF = f60(36, fps);
  const frameF = f60(60, fps);
  const framedAt = emitF + frameF;

  /* ------------------------------------------------ the camera: arrival ---------------------------------------- */
  // A fresh block starts as if cut in: already moving toward the place, about 900 px (at 1080) short of it. A
  // continuous hand-off (`entry`) starts from the previous piece's camera instead.
  const along = (() => {
    const dx = arrivePose.x - c.stone.x;
    const dy = arrivePose.y - c.stone.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
  })();
  const startVelDefault: CamVel = { x: (along.x * 10 * f.unit) / (arrivePose.zoom * 0.85), y: (along.y * 10 * f.unit) / (arrivePose.zoom * 0.85), lz: 0.0004 };
  const start: Pose = o.entry?.pose ?? {
    x: arrivePose.x - (along.x * 900 * f.unit) / (arrivePose.zoom * 0.85),
    y: arrivePose.y - (along.y * 900 * f.unit) / (arrivePose.zoom * 0.85),
    zoom: arrivePose.zoom * 0.85,
  };
  const startVel: CamVel = o.entry?.vel ?? startVelDefault;
  // the camera follows the ring 24 frames behind; a ring-led move takes 0.7–1.4 s, longer only when the zoom must
  // change so much that its corners would outrun the travel limit (peak log-zoom rate ≤ 0.0135 a frame at 60 fps)
  const followFrom = f60(24, fps);
  const zoomFrames = Math.ceil((111 * Math.abs(Math.log(arrivePose.zoom / start.zoom)) * fps) / 60);
  const arriveAt = Math.max(framedAt + f60(12, fps), followFrom + zoomFrames);
  // the arrival settles into a drift that continues its own direction (a reversal would pass through a stop)
  const travelDir = (() => {
    const dx = arrivePose.x - start.x;
    const dy = arrivePose.y - start.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
  })();
  const travelDrift = { x: (travelDir.x * 0.28 * f.unit * 60) / fps / arrivePose.zoom, y: (travelDir.y * 0.28 * f.unit * 60) / fps / arrivePose.zoom, lz: 0.00006 };
  const arrival = (into: VelocityCamera, glideTo: number) => {
    into.glide(followFrom, f60(24, fps), startVel);
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
  const landC = place(Math.max(f60(30, fps) + landFrames(specC, fps), clearC), g, { level: "beat", frames: landFrames(specC, fps) });
  specC.at = landC.at;
  music.push(musicHit("the chapter line lands", landC));
  types.push(specC);
  let exitAt = specC.at + sec(linesHoldS.chapter, fps);
  let specL: TypeSpec | null = null;
  if (limit) {
    specL = { id: `${c.id}-limit`, text: limit, tier: "functional", at: 0, sizeT: 0.3, box: boxL, kind: "film" };
    const rectL = lineRect(limit, "functional", f, boxL, 0.3);
    const clearL = ringClearFrame([probeRing], [rectL], fps, poseAt, f, 0, provisionalEnd);
    const landL = place(Math.max((landC.point ?? landC.at + landFrames(specC, fps)) + f60(18, fps), clearL), g, { level: "beat", frames: landFrames(specL, fps) });
    specL.at = landL.at;
    music.push(musicHit("the limit lands", landL));
    exitAt = Math.max(exitAt, specL.at + sec(linesHoldS.limit, fps));
    types.push(specL);
  }
  specC.exitAt = exitAt;
  if (specL) specL.exitAt = exitAt;
  const linesGone = exitAt + Math.max(exitFramesOf("lineRise", "blur", chapter, fps), limit ? exitFramesOf("lineBlur", "blur", limit, fps) : 0);
  if (linesGone > provisionalEnd) throw new Error(`${c.id}: the lines run to ${linesGone}, past the arrival glide (${provisionalEnd})`);

  /* ------------------------------------------------ the camera: in to read, the take, the receipt --------------- */
  // the arrival glide was provisional: rebuild the camera with the glide ending where the dolly starts
  const cam2 = new VelocityCamera(start, startVel);
  const dollyFrom = Math.max(linesGone + 2, arriveAt + f60(30, fps));
  arrival(cam2, dollyFrom);
  const dollyTo = dollyFrom + f60(72, fps);
  // the dolly ends still moving in the arrival's direction, and the reading glide keeps it (≈ 0.3 px a frame: slower
  // drifts read as stills; §5.3 allows up to 1)
  const readDrift = { x: (travelDir.x * 0.3 * f.unit * 60) / fps / readAskPose.zoom, y: (travelDir.y * 0.3 * f.unit * 60) / fps / readAskPose.zoom, lz: 0.00012 };
  cam2.hermite(dollyTo, readAskPose, { x: readDrift.x * 1.2, y: readDrift.y * 1.2, lz: 0.0002 });

  // the receipt lands on a beat once the ask and the act have been read
  const askAndActS = readS(c.ask.words) + readS(c.act.words) - 0.5;
  const earliestReceipt = dollyTo + sec(Math.max(askAndActS - 1.0, 1.0), fps);
  const landR = place(earliestReceipt, g, { level: "beat" });
  const receiptAt = landR.point ?? landR.at;
  music.push(musicHit("the receipt lands (the ring returns)", landR));
  // the take: its receipt event on that beat; it starts on its start event, or entered later (never cut, never sped up)
  const m = c.act.take;
  const startSrc = m.events[c.act.startEvent] ?? 0;
  const recSrc = m.events[c.receipt.event];
  if (recSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.receipt.event}"`);
  const takeAt = Math.max(0, receiptAt - Math.floor(((recSrc - startSrc) * fps) / m.fps));
  // the ask must be read before the act is: the take is on screen from at least the dolly's end
  if (takeAt > dollyTo) throw new Error(`${c.id}: the take would start at ${takeAt}, after the dolly (${dollyTo})`);

  cam2.glide(receiptAt + f60(6, fps), f60(30, fps), readDrift);
  const receiptArrive = receiptAt + f60(60, fps);
  const receiptReadEnd = receiptArrive + sec(readS(c.receipt.words), fps);
  // to the receipt: a glide-in that never stops (no freeze on Verified), drifting on in its own direction
  const toReceipt = (() => {
    const p0 = cam2.pose(receiptAt + f60(6, fps));
    const dx = readReceiptPose.x - p0.x;
    const dy = readReceiptPose.y - p0.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
  })();
  const receiptDrift = { x: (toReceipt.x * 0.3 * f.unit * 60) / fps / readReceiptPose.zoom, y: (toReceipt.y * 0.3 * f.unit * 60) / fps / readReceiptPose.zoom, lz: 0.0001 };
  travelTo(cam2, receiptArrive, readReceiptPose, receiptReadEnd, fps, { arriveSpeedPxPerFrame: 5, tauS: 0.45, drift: receiptDrift });

  /* ------------------------------------------------ the cut to the cascade, on a bar line ---------------------- */
  const leaveF = f60(18, fps);
  const cutP = place(receiptReadEnd + leaveF + 1, g, { level: "bar" });
  const cut = cutP.point ?? cutP.at;
  music.push(musicHit("the cut to the cascade", cutP));
  const use = solveInPoint(m, c.receipt.event, receiptAt, takeAt, cut, fps);

  // the ring: frames the ask, holds, returns to the stone on the receipt's beat
  const ring = ringWith(receiptAt);

  /* ------------------------------------------------ the cascade shot ------------------------------------------- */
  const shots: ScenePlan["shots"][number][] = [];
  const seams: ScenePlan["seams"][number][] = [];
  let duration = cut;
  let cascadeSpec: CascadeSpec | undefined;
  const stageWorld: Rect = { x: placeRect.x + placeRect.w + 1400, y: placeRect.y + 120, w: 640, h: 520 };
  let inCam: VelocityCamera | null = null;
  const stagePose = fitPose(stageWorld, L.stage(f), f, 0.96);
  if (c.cascade) {
    const seam = momentumCut({ out: cam2, cutFrame: cut, dir: { x: -1, y: 0 }, dPx: 140 * f.unit, leaveFrames: leaveF, target: stagePose, inFrames: f60(50, fps), frameW: f.w, frameH: f.h, fps });
    inCam = seam.inCam;
    // the fixed line, then the items, each swap landing 2–3 frames before a beat (local frames of the piece)
    const fixedBox = L.fixedBox(f);
    const fixedText = breakLines(c.cascade.fixed, "expressive", f, f.w - 2 * f.safe, 0.3);
    const fixed: TypeSpec = { id: `${c.id}-fixed`, text: fixedText, tier: "expressive", at: cut + f60(6, fps), sizeT: 0.3, box: fixedBox, kind: "cascade", exit: "lift" };
    const items = c.cascade.items.map((it, i) => ({ text: it.text, holdS: it.holdS ?? (i === 0 ? 1.1 : 0.85) }));
    const beats = g ? pointsOf(g, "beat").filter((b) => b > cut) : undefined;
    const itemsStart = cut + f60(6, fps) + enterFramesOf("lineRise", fixedText, fps) + f60(6, fps);
    const sched = cascadeSchedule(itemsStart, items, fps, beats);
    const last = sched[sched.length - 1]!;
    const endEarliest = last.outStart + f60(6, fps);
    const endP = place(endEarliest, g, { level: "bar" });
    duration = endP.point ?? endEarliest;
    music.push(musicHit("the cascade ends (the next block)", endP));
    for (const w of sched) music.push({ event: `swap "${w.text}" lands`, frame: w.inEnd, point: null, level: null, waited: 0 });
    fixed.exitAt = duration - exitFramesOf("lineRise", "lift", fixedText, fps) - 2;
    const cards: PlaneSpec[] = c.cascade.items.map((it, i) => {
      // each card at a uniform scale that fits the stage (never stretched), centred on it
      const k = Math.min(1, stageWorld.w / it.card.w, stageWorld.h / it.card.h);
      const w = it.card.w * k;
      const h = it.card.h * k;
      return { id: `${c.id}-card${i}`, kind: "pebble", rect: { x: stageWorld.x + (stageWorld.w - w) / 2, y: stageWorld.y + (stageWorld.h - h) / 2, w, h }, content: { kind: "standIn", standIn: it.card }, shadow: true };
    });
    cascadeSpec = { fixed, items, start: itemsStart, beats, itemBox: L.itemBox(f), cards, holdLast: true };
    // the stage's slow push-in after the arrival: it drifts on through every hold (≥ 12 px a second at 1080)
    inCam.glide(duration - cut, f60(30, fps), { x: (0.42 * f.unit * 60) / fps / stagePose.zoom, lz: 0.00022 });
    seams.push({ at: cut, kind: "momentum", frames: 0, out: `${c.id}-ring`, in: `${c.id}-cascade` });
  }

  /* ------------------------------------------------ planes of the ring shot ------------------------------------ */
  const planes: PlaneSpec[] = [
    ...(c.context ?? []),
    { id: `${c.id}-ask`, kind: "pebble", rect: c.ask.rect, content: { kind: "standIn", standIn: c.ask.standIn }, read: { from: dollyTo, to: receiptAt, words: c.ask.words, textPx: c.ask.textPx } },
    {
      id: `${c.id}-act`,
      kind: "pebble",
      rect: c.act.rect,
      content: { kind: "take", use, view: c.act.view },
      shadow: false,
      radius: 0,
      read: { from: Math.max(dollyTo, takeAt), to: receiptAt, words: c.act.words, textPx: c.act.textPx, rect: c.act.readRect },
    },
  ];

  const cues = cueList(`${c.id} cues`, anchored(RING_START_CUES, 0, `${c.id} start`), anchored(RING_RECEIPT_CUES, receiptAt / fps, `${c.id} receipt`));
  shots.push({
    id: `${c.id}-ring`,
    from: 0,
    to: c.cascade ? cut : duration,
    kind: "ui",
    camera: cam2,
    ref: arrivePose,
    ground: "riverbed",
    planes,
    // the receipt shows inside the act's view at its event; it is read here and never framed by a ring
    reads: [{ id: `${c.id}-receipt`, rect: receiptRead, from: receiptArrive, to: receiptReadEnd, words: c.receipt.words, receipt: true, textPx: c.receipt.textPx }],
    stone: { at: c.stone, r: STONE_R, size: STONE_SIZE, cues },
    rings: [ring],
    dofScale: 14,
  });
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
    lightInitial: "day",
    lightCues: [],
    leaks: [],
    hits: [],
    takes: [use],
    music,
    moves: [
      move("ring", emitF, frameF, "the ring leads to the ask and frames it"),
      move("push", dollyFrom, dollyTo - dollyFrom + f60(30, fps), "the dolly in to reading magnification"),
      move("product", takeAt, cut - takeAt, `${m.id} at 1×`),
      move("ring", receiptAt, f60(42, fps), "the ring returns to the stone on the receipt's beat"),
      ...(cascadeSpec ? cascadeSchedule(cascadeSpec.start, cascadeSpec.items, fps, cascadeSpec.beats).slice(1).map((w, i) => move("swap", w.inStart - f60(8, fps), f60(16, fps), `swap ${i + 1}`)) : []),
    ],
    exit: (() => {
      const last = shots[shots.length - 1]!;
      const s = last.camera.sample(duration - last.from);
      return { pose: s.pose, vel: s.vel, shot: last.id, ref: last.ref };
    })(),
    extra: { arriveAt, linesGone, dollyFrom, dollyTo, receiptAt, takeAt, receiptArrive, receiptReadEnd, cut, receiptFrame: frameOfSource(recSrc, use.at, fps, m, use.inPoint), readZoom: readAskPose.zoom, receiptZoom: readReceiptPose.zoom },
  };
}

/** Where a world rect is on screen in a shot (for layouts and tests). */
export const onScreen = (r: Rect, pose: Pose, f: FrameBox): Rect => rectInFrame(r, pose, f);
