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
import { VelocityCamera, arriveWithMomentum, type CamVel, type Pose } from "../motion/camera";
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
import { anchored, cueList, landFrames, musicHit, planesClearFrame, ringClearFrame } from "./kit";
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
  /**
   * the ask: a view of the take; `readRect` is the part read (world). With `asking`, the view first shows the card
   * while it asks, framed whole with its buttons (seen, not read: its text kept under the legibility size), until the
   * take's event `asking.until` (the person's click), when it shows its answered state, which is read (fix round 2,
   * the verifier's NF-01: the ask beat framed only the history's sentence, so no decision was ever framed).
   * With `shownOnly` (MONTAGE_DESIGN §5.4's named cut, fix round 3): the ask is shown, not read: the ring frames it and
   * the camera lands on the act; the take enters after its decision (`shownOnly.after`, the person's click), so the
   * decision sits in the conversation's history (TREATMENT §3.6 chain 9), and only the act and the receipt are read
   */
  ask: { view: string; rect: Rect; words: number; textPx: number; readRect?: Rect; asking?: { until: string; textPx: number }; shownOnly?: { after: string } };
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
  /**
   * the frame the camera reaches the receipt, one frame in every aspect: a wide frame reads the ask and the act in one
   * framing, quicker than the tall frame's two, and the time it gains goes to those reads, not to the receipt held on
   * its own (28 Oct's render: 16:9 held its 7-word Verified line 5.1 s on a nearly empty slot while 9:16 held it 2.6 s,
   * and read the 19 words above it at 4.4 words a second)
   */
  receiptArrive: number;
  cut: number;
  end: number;
}

interface RingLayout {
  /** where the place sits on arrival (the type owns the rest of the frame) */
  arrive: (f: FrameBox) => Rect;
  /** the chapter pair's box */
  pair: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
  /** the lean ring's pair box, where it differs (9:16: the act is read at the frame's top, so the pair sits low) */
  pairLean?: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
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
    // the pair keeps to the frame's left: the Toolbox's Settings still is in the bottom right as the ring leaves the
    // whole Mac (NF-05)
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 1.6 - bh, maxW: f.w * 0.42 }),
    sizeT: 0.1,
    read: (f) => ({ x: f.safe, y: f.safe * 1.5, w: f.w - 2 * f.safe, h: f.h - 3 * f.safe }),
    receipt: (f) => ({ x: f.safe, y: f.safe * 1.5, w: f.w - 2 * f.safe, h: f.h - 3 * f.safe }),
    stage: (f) => ({ x: f.safe * 1.2, y: f.h * 0.34, w: f.w - f.safe * 2.4, h: f.h * 0.6 }),
    fixedBox: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.4, align: "left" }),
    itemBox: (f) => ({ left: f.safe * 1.2 + 2 * f.unit, top: f.safe * 1.4 + 104 * f.unit, align: "left" }),
  },
  // 9:16: each cascade stacks: the fixed line at the top, the UI card in the middle, the item below (§3.12)
  "9:16": {
    // the place arrives in the frame's lower part, so the camera, having travelled up to it, only ever moves down from
    // there (the held card, the reads, the receipt below them): arriving in the upper part made it go up to the card
    // and turn back down through a stop (the sway check, NF-02)
    arrive: (f) => ({ x: f.safe, y: f.h * 0.36, w: f.w - 2 * f.safe, h: f.h * 0.5 }),
    // the pair in the top band, over the ground above the place, at the frame's left (NF-05: the chapter line ran
    // across the bottom of the frame, over the companion's and the Toolbox's real stills)
    pair: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.6, maxW: f.w * 0.62 }),
    // (the lean ring reads the act at the frame's top, where the top band would be: its pair sits low, below where
    // the receipt is read and just above where the Toolbox's Settings still passes during the travel, at half the
    // frame's width, clear of the companion's still beside it)
    pairLean: (f, bh) => ({ left: f.safe * 1.2, top: f.h * 0.74 - bh, maxW: f.w * 0.5 }),
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

/** The text size (px at 1080) under which the ask asking is framed whole: seen, not read (under the 20 px legibility line). */
export const SEEN_TEXT_PX = 17;
/** How long the ask asking is framed before the person's click, seconds (the person's own span: §3.6 lets it be cut). */
export const SEEN_S = 1.1;
/** Frames where a cascade card's edges move faster than this (px a frame at 1080) are the cut's sweep, not judged. */
export const CASCADE_SWEEP_PX = 4;
/**
 * The lean ring's hand-off speed into the act's read, px a frame at 1080, per aspect: the glide decays from it over
 * 0.4 s into the read's drift. The square and tall frames read the act's sentence with no room across (957 px of 1080
 * at 28 px), so the 1:1 landing, which comes in sideways, is slow (at 1.5 the sentence sat 14 % over the left edge for
 * half a second); the 9:16 landing comes in from below, against the drift up, and a slower one passes through a stop
 * (sway) and under the content's floor (at 1.5–1.8 its slowest second moved 0.247–0.250 px a frame)
 */
export const LEAN_ARRIVE_PX: Record<FrameBox["aspect"], number> = { "16:9": 1.0, "1:1": 1.0, "9:16": 2.0 };

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
  // the ask while it asks: the whole card with its buttons, framed as the shot's subject, its text kept under
  // SEEN_TEXT_PX (seen, not read: its 43 words at reading size would ask 3.9 words a second of the shot)
  const seenFit = fitPose(c.ask.rect, L.read(f), f, 0.94);
  const seenPose: Pose = c.ask.asking ? { ...seenFit, zoom: Math.min(seenFit.zoom, (SEEN_TEXT_PX * f.unit) / c.ask.asking.textPx) } : readPose;
  // fix round 3, the lean ring (`ask.shownOnly`: MONTAGE_DESIGN §5.4's named cut; the verifier's VF-04): the ask is
  // shown, not read; the act and then the receipt are each read at the 28 px floor and keep the safe margin (60 px at
  // 1080) from every edge (TREATMENT §3.12; in 1:1 and 9:16 the act's sentence, read beside the ask at the ask's floor,
  // sat 26 px from the left edge). The act's 424-px sentence at 28 px is 957 px of 1080, so the square and tall frames
  // read it at the floor exactly; the receipt's 11-px line needs 2.55×, where that sentence would fill the width, so it
  // is read in a framing of its own, the conversation gliding up to it
  const lean = !!c.ask.shownOnly;
  const floorZ = (css: number) => (28 * f.unit) / css;
  const roomZ = (r: Rect) => 0.999 * Math.min((f.w - 2 * f.safe) / r.w, (f.h - 2 * f.safe) / r.h);
  const leanZoom = (css: number, r: Rect, prefer: number, what: string): number => {
    const lo = floorZ(css);
    const hi = roomZ(r);
    if (hi < lo) throw new Error(`${c.id}: the ${what} (${r.w.toFixed(0)} wide, ${css}-px text) cannot be read at 28 px ${(f.safe / f.unit).toFixed(0)} px inside the frame in ${A}`);
    return Math.min(hi, Math.max(lo * 1.002, prefer));
  };
  const leanActZoom = lean ? leanZoom(c.act.textPx, c.act.readRect, Math.min(actFit.zoom, 3.0 * f.unit, floorZ(c.act.textPx) * 1.03), "act") : actZoom;
  const leanRecZoom = lean ? leanZoom(c.receipt.textPx, receiptRead, Math.min(recFit.zoom, 3.2 * f.unit, leanActZoom * 1.2, floorZ(c.receipt.textPx) * 1.04), "receipt") : receiptPose.zoom;
  // the act's framing as its read ends: centred across, its top just inside the safe margin. The read drifts the
  // conversation up toward the receipt, the way the glide then goes, so the read starts lower in the frame and the
  // history's card above it stays out of the frame (its sentence would be legible there: shown, not read)
  const leanActEnd: Pose = { x: c.act.readRect.x + c.act.readRect.w / 2, y: c.act.readRect.y + (f.h / 2 - (f.safe + 6 * f.unit)) / leanActZoom, zoom: leanActZoom };
  // the framings the reads and the glide down use (the lean ring's, or the template's)
  const readingActZoom = lean ? leanActZoom : actZoom;
  const readingActPose: Pose = lean ? leanActEnd : actPose;
  const recPose: Pose = lean ? { ...recFit, zoom: leanRecZoom } : receiptPose;

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
  // (the lean ring's camera lands on the act's reading framing itself: the conversation's first read is the act)
  const arriveTarget: Pose = lean ? leanActEnd : arrivePose;
  const D = Math.hypot(arriveTarget.x - start.x, arriveTarget.y - start.y);
  const travelDir = { x: D > 1e-6 ? (arriveTarget.x - start.x) / D : 1, y: D > 1e-6 ? (arriveTarget.y - start.y) / D : 0 };
  const zLow = Math.min(start.zoom, arriveTarget.zoom);
  const T0 = Math.max(f60(84, fps), framedAt + f60(12, fps) - followFrom);
  // the bow: the zoom halfway that keeps the peak screen speed (≈ 1.5 × D × z ÷ T) at about 22 px a frame
  const zMid = Math.min(zLow, (22 * f.unit * T0 * 60) / fps / (1.5 * Math.max(D, 1)));
  const bow = zMid < zLow * 0.97;
  const lzTravel = bow ? 2 * Math.max(Math.abs(Math.log(zMid / start.zoom)), Math.abs(Math.log(arriveTarget.zoom / zMid))) : Math.abs(Math.log(arriveTarget.zoom / start.zoom));
  // the zoom moves the frame's corners at (half-diagonal × log-zoom rate): keep that at ≤ 18 px a frame at 60 fps (a
  // Hermite peaks at 1.5× its mean), so with the pan the corners stay within the 30 px travel limit
  // (the lean ring's arrival zooms all the way to reading size, so its zoom keeps to 16 px a frame, leaving the pan its
  // share of the 30: at 18 the 16:9 arrival's corners reached 31.3 px a frame)
  const lzMax = ((lean ? 16 : 18) * f.unit) / (Math.hypot(f.w, f.h) / 2);
  const zoomFrames = Math.ceil(((1.5 * lzTravel) / lzMax) * (fps / 60));
  const al = o.align ?? {};
  const arriveAt = Math.max(followFrom + T0, followFrom + zoomFrames, al.arriveAt ?? 0);
  // the arrival glide drifts on at 0.4 px a frame in the travel's direction, breathing in (never a rest); the lean
  // ring's glide is the act's read itself, drifting the conversation up toward the receipt (camera down, no zoom: the
  // sentence is read at the floor with the safe margin)
  const travelDrift = lean
    ? { x: 0, y: (holdPx * 60) / fps / leanActZoom, lz: 0 }
    : { x: (travelDir.x * holdPx * 60) / fps / arrivePose.zoom, y: (travelDir.y * holdPx * 60) / fps / arrivePose.zoom, lz: lzHold * 0.3 };
  const arrival = (into: VelocityCamera, glideTo: number) => {
    into.glide(followFrom, f60(24, fps), startVel);
    if (bow) {
      const midAt = followFrom + Math.round((arriveAt - followFrom) * 0.5);
      const mid: Pose = { x: (start.x + arriveTarget.x) / 2, y: (start.y + arriveTarget.y) / 2, zoom: zMid };
      const v = (D / (arriveAt - followFrom)) * 1.25;
      into.hermite(midAt, mid, { x: travelDir.x * v, y: travelDir.y * v, lz: 0 });
    }
    return travelTo(into, arriveAt, arriveTarget, glideTo, fps, { arriveSpeedPxPerFrame: lean ? LEAN_ARRIVE_PX[A] : 7, tauS: 0.4, drift: travelDrift });
  };
  const cam = new VelocityCamera(start, startVel);

  /* ------------------------------------------------ the lines (they land on beats once no ring crosses them) --- */
  const sizeE = typeSizePx("expressive", f.w, f.h, L.sizeT);
  const sizeF = typeSizePx("functional", f.w, f.h, 0.3);
  const pairOf = lean && L.pairLean ? L.pairLean : L.pair;
  const probe = pairOf(f, 0);
  const chapter = breakLines(c.lines.chapter, "expressive", f, probe.maxW, L.sizeT);
  const limit = c.lines.limit ? breakLines(c.lines.limit, "functional", f, probe.maxW, 0.3) : null;
  const nC = chapter.split("\n").length;
  const nL = limit ? limit.split("\n").length : 0;
  const gap = 12 * f.unit;
  const blockH = nC * sizeE * lineHeightOf("expressive") + (limit ? gap + nL * sizeF * lineHeightOf("functional") : 0);
  const pos = pairOf(f, blockH);
  const boxC: TypeBox = { left: pos.left, top: pos.top, align: "left" };
  const boxL: TypeBox = { left: pos.left, top: pos.top + nC * sizeE * lineHeightOf("expressive") + gap, align: "left" };

  // a provisional camera to the end of the lines' hold, so the ring's path can be tested against the lines
  // (the lean ring's lines land during the ring's travel and the take's first seconds, MONTAGE_DESIGN §5.4: the key
  // line its 2 s, the pair 2.5 s together, then gone before the receipt lands under their band)
  const linesHoldS = lean ? { chapter: 2.0, limit: 2.5 } : { chapter: 3.4, limit: 2.8 };
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
  // (the lean ring hands the place to the camera: having framed the ask it returns to the stone at once, while the
  // camera flies in, so no held ring grows across the lines with the reading zoom (behind the window it would be hidden,
  // but its hairline would cross the chapter line's band); the template's ring holds until the receipt's beat)
  const ringBack = lean ? framedAt + 1 : null;
  const probeRing = ringWith(ringBack ?? provisionalEnd + sec(10, fps));
  // (it rose through its mask, so it leaves through it, as it came: a lift; fix round 2: it blurred away)
  const specC: TypeSpec = { id: `${c.id}-chapter`, text: chapter, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxC, kind: "film", key: true, pairWith: limit ? `${c.id}-limit` : undefined, exit: "lift" };
  const rectC = lineRect(chapter, "expressive", f, boxC, L.sizeT);
  const clearC = ringClearFrame([probeRing], [rectC], fps, poseAt, f, 0, provisionalEnd);
  // and once the camera's travel has carried every capture with text out from under its band, for its whole hold
  // (fix round 2, NF-05: in 9:16 it landed mid-travel over the companion and the Toolbox)
  const holdC = sec(linesHoldS.chapter, fps) + exitFramesOf("lineRise", "lift", chapter, fps);
  const planesC = planesClearFrame(c.context ?? [], rectC, poseAt, ref, f, 0, provisionalEnd, holdC);
  const landC = place(Math.max(f60(lean ? 18 : 30, fps) + landFrames(specC, fps), clearC, planesC, al.chapterLand ?? -Infinity), g, { level: "beat", frames: landFrames(specC, fps) });
  specC.at = landC.at;
  music.push(musicHit("the chapter line lands", landC));
  types.push(specC);
  let exitAt = specC.at + sec(linesHoldS.chapter, fps);
  let specL: TypeSpec | null = null;
  if (limit) {
    specL = { id: `${c.id}-limit`, text: limit, tier: "functional", at: 0, sizeT: 0.3, box: boxL, kind: "film" };
    const rectL = lineRect(limit, "functional", f, boxL, 0.3);
    const clearL = ringClearFrame([probeRing], [rectL], fps, poseAt, f, 0, provisionalEnd);
    const planesL = planesClearFrame(c.context ?? [], rectL, poseAt, ref, f, 0, provisionalEnd, sec(linesHoldS.limit, fps) + exitFramesOf("lineBlur", "blur", limit, fps));
    const landL = place(Math.max((landC.point ?? landC.at + landFrames(specC, fps)) + f60(18, fps), clearL, planesL, al.limitLand ?? -Infinity), g, { level: "beat", frames: landFrames(specL, fps) });
    specL.at = landL.at;
    music.push(musicHit("the limit lands", landL));
    exitAt = Math.max(exitAt, specL.at + sec(linesHoldS.limit, fps));
    types.push(specL);
  }
  exitAt = Math.max(exitAt, al.linesExit ?? 0);
  specC.exitAt = exitAt;
  if (specL) specL.exitAt = exitAt;
  const linesGone = Math.max(exitAt + Math.max(exitFramesOf("lineRise", "lift", chapter, fps), limit ? exitFramesOf("lineBlur", "blur", limit, fps) : 0), al.linesGone ?? 0);
  if (linesGone > provisionalEnd) throw new Error(`${c.id}: the lines run to ${linesGone}, past the arrival glide (${provisionalEnd})`);

  /* ------------------------------------------------ the take's timing ------------------------------------------ */
  const startSrc = m.events[c.act.startEvent];
  const recSrc = m.events[c.receipt.event];
  if (startSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.act.startEvent}"`);
  if (recSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.receipt.event}"`);
  const clickSrc = c.ask.asking ? m.events[c.ask.asking.until] : undefined;
  if (c.ask.asking && clickSrc === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.ask.asking.until}"`);
  const actToReceipt = Math.ceil(((recSrc - startSrc) * fps) / m.fps); // Pebble's own time, never shortened
  const clickToReceipt = clickSrc === undefined ? 0 : Math.ceil(((recSrc - clickSrc) * fps) / m.fps);
  // the glide down the conversation to the receipt: long enough for its distance at ≤ about 22 px a frame on average
  // (a Hermite peaks at 1.5× its mean: §5.3 travel ≤ 30); it starts once the reads are done, and never more than a
  // third of itself before the receipt lands
  const glideDist = Math.hypot((recPose.x - readingActPose.x) * Math.sqrt(readingActZoom * recPose.zoom), (recPose.y - readingActPose.y) * Math.sqrt(readingActZoom * recPose.zoom)) / f.unit;
  // (its zoom change moves the frame's corners too: half the diagonal × the log-zoom change, as the dolly counts it)
  const glideLzChange = Math.abs(Math.log(recPose.zoom / readingActZoom));
  const glideF = Math.max(f60(56, fps), Math.ceil(((1.5 * ((Math.hypot(f.w, f.h) / 2 / f.unit) * glideLzChange + glideDist)) / 22) * (fps / 60)));
  const glideDownF = Math.round(glideF / 3);
  // a dolly's frames: long enough for its zoom change at the frame's corners and its pan (≤ about 22 px a frame)
  const dollyFramesFor = (a: Pose, b: Pose, least: number) => {
    const lz = Math.abs(Math.log(b.zoom / a.zoom));
    const pan = (Math.hypot(b.x - a.x, b.y - a.y) * Math.sqrt(a.zoom * b.zoom)) / f.unit;
    return Math.max(least, Math.ceil(((1.5 * ((Math.hypot(f.w, f.h) / 2 / f.unit) * lz + pan)) / 22) * (fps / 60)));
  };
  const dollyFrom = lean ? arriveAt : Math.max(linesGone + 2, arriveAt + f60(30, fps));
  const askReadF = sec(readS(c.ask.words), fps);
  // (the lean ring's act is read alone, so it holds its own words at the reading pace too: 13 words take 4.19 s at
  // 3.1 a second (the 3.14 ceiling, kept clear of the frame's rounding), more than the hold formula less its legible
  // half second, 3.9 s)
  const actReadF = sec(lean ? Math.max(readS(c.act.words) - 0.5, c.act.words / 3.1) : readS(c.act.words) - 0.5, fps);
  const easeBackF = f60(40, fps);
  let receiptAt: number;
  let clickAt: number | null = null;
  let dollyTo: number;
  let readsFrom: number;
  let dolly1To = dollyFrom;
  if (lean) {
    // the act is read from the frame its text reaches 20 px on the way in (the arrival is the final camera's: only the
    // glide after it differs) for its reading time, at the floor from the landing; the receipt lands on the latest beat
    // that keeps the decision in the take's history (the take shows from the block's first frame, after the person's
    // click: TREATMENT §3.6 chain 9) once the lines have left its band, and the ring returns to the stone on it
    const after = m.events[c.ask.shownOnly!.after];
    if (after === undefined) throw new Error(`${c.id}: the take ${m.id} has no event "${c.ask.shownOnly!.after}"`);
    const historyMax = Math.floor(((recSrc - after) * fps) / m.fps + 1e-6);
    const legibleZ = (20 * f.unit) / c.act.textPx;
    readsFrom = arriveAt;
    for (let fr = followFrom; fr <= arriveAt; fr++) {
      if (cam.pose(fr).zoom >= legibleZ - 1e-9) {
        readsFrom = fr;
        break;
      }
    }
    dollyTo = arriveAt;
    dolly1To = arriveAt;
    const lo = Math.max(linesGone, al.receiptAt ?? 0);
    const hi = Math.min(historyMax, readsFrom + actReadF);
    const inHistory = g ? [...pointsOf(g, "beat")].reverse().find((b) => b >= lo && b <= hi) : undefined;
    const landR = inHistory !== undefined ? place(inHistory, g, { level: "beat" }) : place(lo, g, { level: "beat" });
    receiptAt = landR.point ?? landR.at;
    music.push(musicHit("the receipt lands (the ring returns)", landR));
  } else if (c.ask.asking) {
    // the dolly frames the card asking, whole; the person's click comes at least SEEN_S after it lands; the dolly in
    // to read starts on the click; the receipt lands Pebble's own time after the click, on a beat
    const dolly1F = dollyFramesFor(arrivePose, seenPose, f60(100, fps));
    dolly1To = dollyFrom + dolly1F;
    const landR = place(Math.max(dolly1To + sec(SEEN_S, fps) + clickToReceipt, al.receiptAt ?? 0), g, { level: "beat" });
    receiptAt = landR.point ?? landR.at;
    music.push(musicHit("the receipt lands (the ring returns)", landR));
    clickAt = receiptAt - clickToReceipt;
    const dolly2F = dollyFramesFor(seenPose, readPose, f60(70, fps));
    dollyTo = clickAt + dolly2F;
    // (the answered sentence is legible from the dolly's middle: its read starts there)
    readsFrom = clickAt + Math.round(dolly2F * 0.5);
  } else {
    // the dolly, then the ask read in the take's history; the act starts after it; the receipt lands on a beat after
    // the act's read and the glide down to it: every span is the take's own (1×), every hold its reading time
    dollyTo = dollyFrom + dollyFramesFor(arrivePose, readPose, f60(110, fps));
    const earliestReceipt = Math.max(dollyTo + askReadF + actToReceipt, dollyTo + askReadF + actReadF + glideDownF);
    const landR = place(Math.max(earliestReceipt, al.receiptAt ?? 0), g, { level: "beat" });
    receiptAt = landR.point ?? landR.at;
    music.push(musicHit("the receipt lands (the ring returns)", landR));
    readsFrom = dollyTo;
  }
  const actAt = receiptAt - actToReceipt;
  // the reads: the ask (answered) from the dolly's landing, then the act from its start event (with two reads, after
  // an ease back to the act's own framing); the glide down to the receipt follows them. The lean ring reads the act
  // alone (its take entered after the decision: the act is on screen from the first frame), and glides once the
  // receipt has landed
  const twoR = !lean && twoReads;
  const askReadEnd = lean ? readsFrom : readsFrom + askReadF;
  const actReadFrom = lean ? readsFrom : twoR ? Math.max(askReadEnd, actAt) + easeBackF : Math.max(readsFrom, actAt);
  // (with two reads the act's sentence reads from the ease's middle: its zoom changes by a few per cent)
  const readsEnd = Math.max(askReadEnd, actReadFrom - (twoR ? Math.round(easeBackF / 2) : 0) + actReadF);
  // (the camera reaches the receipt on one frame in every aspect: RingTiming.receiptArrive)
  const glideStart = Math.max(readsEnd, lean ? receiptAt : receiptAt - glideDownF, (al.receiptArrive ?? -Infinity) - glideF);
  const receiptArrive = glideStart + glideF;
  const receiptReadEnd = receiptArrive + sec(readS(c.receipt.words), fps);

  /* ------------------------------------------------ the camera: in to read, the glide down, the receipt ---------- */
  // the arrival glide was provisional: rebuild the camera with the glide ending where the dolly starts
  const cam2 = new VelocityCamera(start, startVel);
  // the reading drift: 0.4 px a frame, down toward where the receipt lands (a pan: every corner moves), and each
  // framing starts half its drift back, so its block drifts through the middle of the frame and never toward its edge
  // (straight down: the read block can be nearly as wide as a square or tall frame, so it never drifts sideways)
  const down = { x: 0, y: recPose.y >= (lean ? leanActEnd : readPose).y ? 1 : -1 };
  const driftAt = (zoom: number) => ({ x: (down.x * holdPx * 60) / fps / zoom, y: (down.y * holdPx * 60) / fps / zoom, lz: 0 });
  const centred = (pose: Pose, v: { x: number; y: number }, span: number): Pose => ({ x: pose.x - (v.x * span) / 2, y: pose.y - (v.y * span) / 2, zoom: pose.zoom });
  if (lean) {
    // the ring-led arrival lands on the act's framing and glides on as its read, drifting the conversation up toward
    // the receipt, onto the act's end framing as the glide down starts
    arrival(cam2, glideStart);
  } else {
    arrival(cam2, dollyFrom);
    if (clickAt !== null) {
      // the card asking, framed whole and drifting down at the reading pace until the click
      const seenDrift = driftAt(seenPose.zoom);
      cam2.hermite(dolly1To, centred(seenPose, seenDrift, clickAt - dolly1To), seenDrift);
      cam2.glide(clickAt, f60(30, fps), seenDrift);
    }
    const readDrift = driftAt(readZoom);
    const readSpan = (twoReads ? Math.max(askReadEnd, actAt) : glideStart) - dollyTo;
    cam2.hermite(dollyTo, centred(readPose, readDrift, readSpan), readDrift);
    const actDrift = driftAt(actZoom);
    if (twoReads) {
      // the ask's read, then, as the act starts, the ease back to the act's framing, drifting on at the same pace
      cam2.glide(actReadFrom - easeBackF, f60(30, fps), readDrift);
      cam2.hermite(actReadFrom, centred(actPose, actDrift, glideStart - actReadFrom), actDrift);
    }
    cam2.glide(glideStart, f60(30, fps), twoReads ? actDrift : readDrift);
  }
  // the glide down the conversation to the receipt, then drifting on through its hold (its words count from its
  // landing: it is legible on the way)
  const recDrift = { ...driftAt(recPose.zoom), lz: lzHold * 0.25 };
  const recHold = receiptReadEnd - receiptArrive;
  const recFrom: Pose = { x: recPose.x - (recDrift.x * recHold) / 2, y: recPose.y - (recDrift.y * recHold) / 2, zoom: recPose.zoom / Math.exp((recDrift.lz * recHold) / 2) };
  // two phases: straight down at the reading zoom until the receipt sits where it will be read (the sentences above
  // it leave through the frame's top, never cut at its sides), then in to the receipt's own zoom and centre
  const recScreenY = f.h / 2 + (receiptRead.y + receiptRead.h / 2 - recFrom.y) * recFrom.zoom;
  const midPose: Pose = { x: readingActPose.x, y: receiptRead.y + receiptRead.h / 2 - (recScreenY - f.h / 2) / readingActZoom, zoom: readingActZoom };
  const midAt = glideStart + Math.round(glideF * 0.6);
  const midV = { x: 0, y: ((midPose.y - cam2.pose(glideStart).y) / (glideF * 0.6)) * 0.9, lz: 0 };
  cam2.hermite(midAt, midPose, midV);
  cam2.hermite(receiptArrive, recFrom, recDrift);
  cam2.glide(receiptReadEnd, f60(30, fps), recDrift);

  // (the lean ring's act is read, at the floor and the safe margin, from the frame its landing glide has carried it
  // wholly inside that margin: the square and tall frames land it with no room across, so its last few px of travel
  // happen at reading size; its words count from the frame they are legible, `readsFrom`, as every read's do)
  let leanReadFrom = arriveAt;
  if (lean) {
    const inside = (fr: number) => {
      const q = rectInFrame(c.act.readRect, cam2.pose(fr), f);
      return Math.min(q.x, q.y, f.w - q.x - q.w, f.h - q.y - q.h) >= f.safe - 0.5;
    };
    while (leanReadFrom < glideStart - 1 && !inside(leanReadFrom)) leanReadFrom++;
  }

  /* ------------------------------------------------ the cut to the cascade, on a bar line ---------------------- */
  // (the lean ring cuts on a half bar, a musical cause too (L3d): a bar line would hold the receipt up to 2 s longer)
  const leaveF = f60(18, fps);
  const cutP = place(Math.max(receiptReadEnd + leaveF + 1, al.cut ?? 0), g, { level: lean ? "half" : "bar" });
  const cut = cutP.point ?? cutP.at;
  music.push(musicHit("the cut to the cascade", cutP));
  const use = solveInPoint(m, c.receipt.event, receiptAt, 0, cut, fps);

  // the ring: frames the ask, holds, returns to the stone on the receipt's beat
  const ring = ringWith(ringBack ?? receiptAt);

  /* ------------------------------------------------ the cascade shot ------------------------------------------- */
  const shots: ScenePlan["shots"][number][] = [];
  const seams: ScenePlan["seams"][number][] = [];
  let duration = cut;
  let cascadeSpec: CascadeSpec | undefined;
  const stageWorld: Rect = { x: placeRect.x + placeRect.w + 1400, y: placeRect.y + 120, w: 640, h: 520 };
  let inCam: VelocityCamera | null = null;
  let leaveDir: Vec = { x: -1, y: 0 };
  let stagePose = fitPose(stageWorld, L.stage(f), f, 0.97);
  if (c.cascade) {
    // the incoming camera glides on at the cut's speed into the stage's push (CR-04: E-arrive to rest, then a glide up
    // from 0, was an arrive-and-hold of a second)
    // (its pan at the reading pace: at 0.24 px a frame the card, the frame's subject, moved 0.15 at its median: CR-04)
    // (the square and tall frames' stage pans more slowly and does not push: its card fills most of their width, and
    // the pan and the push carried it out of the left edge (VF-03); a smaller card would leave the cut's first frames
    // with too little of it in frame to read)
    const narrow = A !== "16:9";
    const driftOf = (pose: Pose) => ({ x: ((narrow ? 0.3 * f.unit : holdPx) * 60) / fps / pose.zoom, y: 0, lz: narrow ? 0 : lzHold * 0.8 });
    // (the glide lands its framing after five time constants: what is left of the cut's speed then is under 1 %)
    // (the outgoing E-leave once; the incoming camera is built again for each framing the stage's fit tries)
    const seam0 = momentumCut({ out: cam2, cutFrame: cut, dir: { x: -1, y: 0 }, dPx: 118 * f.unit, leaveFrames: leaveF, target: stagePose, inFrames: f60(100, fps), mode: "glide", tau: f60(20, fps), drift: driftOf(stagePose), frameW: f.w, frameH: f.h, fps });
    const stageCam = (pose: Pose): VelocityCamera => arriveWithMomentum({ target: pose, frames: f60(100, fps), vScreen: seam0.vOut, mode: "glide", tau: f60(20, fps), drift: driftOf(pose) });
    // the fixed line, then the items, each swap landing 2–3 frames before a beat (local frames of the piece)
    const fixedBox = L.fixedBox(f);
    const fixedText = breakLines(c.cascade.fixed, "expressive", f, f.w - 2 * f.safe, 0.3);
    // (the fixed line rose through its mask: it leaves through it with a lift, as it came. The lean cascade's
    // (MONTAGE_DESIGN §5.4) blurs in word by word on the cut, so its first item can land on the first beat, and leaves
    // with a blur, as it came)
    const fixedIn = lean ? ("wordBlur" as const) : ("lineRise" as const);
    const fixed: TypeSpec = { id: `${c.id}-fixed`, text: fixedText, tier: "expressive", at: cut + f60(lean ? 1 : 6, fps), sizeT: 0.3, box: fixedBox, kind: "cascade", ...(lean ? { entrance: "wordBlur" as const, exit: "blur" as const } : { exit: "lift" as const }) };
    const items = c.cascade.items.map((it, i) => ({ text: it.text, holdS: it.holdS ?? (i === 0 ? 1.1 : 0.85) }));
    const beats = g ? pointsOf(g, "beat").filter((b) => b > cut) : undefined;
    const itemsStart = fixed.at + enterFramesOf(fixedIn, fixedText, fps) + f60(lean ? 3 : 6, fps);
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
    // (a lift of two lines takes longer than the leave: it starts early enough to be gone 2 frames before the cut)
    fixed.exitAt = Math.min(leaveAt, duration - 2 - exitFramesOf(fixedIn, lean ? "blur" : "lift", fixedText, fps));
    const cards: PlaneSpec[] = c.cascade.items.map((it, i) => {
      // each card at a uniform scale that fits the stage (never stretched), centred on it
      const k = Math.min(stageWorld.w / it.card.w, stageWorld.h / it.card.h);
      const w = it.card.w * k;
      const h = it.card.h * k;
      return { id: `${c.id}-card${i}`, kind: "pebble", rect: { x: stageWorld.x + (stageWorld.w - w) / 2, y: stageWorld.y + (stageWorld.h - h) / 2, w, h }, content: { kind: "standIn", standIn: it.card }, shadow: true };
    });
    cascadeSpec = { fixed, items, start: itemsStart, beats, itemBox: L.itemBox(f), cards, holdLast: false, endAt: leaveAt };
    // the stage's slow push-in after the arrival drifts on through every hold, then leaves on an E-leave into the cut
    const build = (pose: Pose): VelocityCamera => {
      const cm = stageCam(pose);
      cm.glide(leaveAt - cut, f60(30, fps), driftOf(pose));
      const p0 = cm.pose(leaveAt - cut);
      cm.ease(duration - cut - 1, { x: p0.x + (118 * f.unit) / p0.zoom, y: p0.y, zoom: p0.zoom * Math.exp(driftOf(pose).lz * leaveF) }, "E-leave");
      return cm;
    };
    // fix round 3 (the verifier's VF-03): every card keeps the safe margin (60 px at 1080) from the frame's edges while
    // it is shown whole, after the cut's sweep has settled (in 1:1 and 9:16 the stage's pan and push carried the card,
    // 88 % of the tall frame's width, out of its left edge, and its label, whole or not drawn, went with it): the stage
    // is framed smaller and placed so that the pan and the push carry each card through the frame's middle
    const windows = cascadeSchedule(itemsStart, items, fps, beats, undefined, leaveAt);
    const spans = cards.map((_, i) => ({ from: i === 0 ? cut : windows[i]!.inEnd, to: i === cards.length - 1 ? leaveAt : windows[i]!.outStart }));
    const extentOf = (cm: VelocityCamera) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      cards.forEach((card, i) => {
        for (let fr = spans[i]!.from; fr < spans[i]!.to; fr++) {
          const a = cm.pose(fr - cut);
          const b = cm.pose(fr + 1 - cut);
          const r = rectInFrame(card.rect, a, f);
          const r2 = rectInFrame(card.rect, b, f);
          // (a sweep faster than 4 px a frame at 1080, the cut's incoming glide, is not judged: slotLabels' rule)
          if (Math.max(Math.abs(r2.x - r.x), Math.abs(r2.x + r2.w - r.x - r.w), Math.abs(r2.y - r.y)) > CASCADE_SWEEP_PX * f.unit) continue;
          x0 = Math.min(x0, r.x);
          x1 = Math.max(x1, r.x + r.w);
          y0 = Math.min(y0, r.y);
          y1 = Math.max(y1, r.y + r.h);
        }
      });
      return { x0, x1, y0, y1 };
    };
    for (let k = 0; k < 12; k++) {
      const e = extentOf(build(stagePose));
      if (!Number.isFinite(e.x0)) break;
      const m = f.safe + 2 * f.unit;
      if (e.x0 >= m && e.x1 <= f.w - m && e.y0 >= m && e.y1 <= f.h - m) break;
      // smaller by what the extent overruns the safe frame, then centred on it (content right by d px: camera left)
      const shrink = Math.min(1, (f.w - 2 * m) / (e.x1 - e.x0), (f.h - 2 * m) / (e.y1 - e.y0)) * 0.995;
      const dx = (f.w - e.x1 - e.x0) / 2;
      const dy = (f.h - e.y1 - e.y0) / 2;
      stagePose = { x: stagePose.x - dx / stagePose.zoom, y: stagePose.y - dy / stagePose.zoom, zoom: stagePose.zoom * shrink };
    }
    inCam = build(stagePose);
    leaveDir = { x: -1, y: 0 };
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
    // (each read is declared from the frame its dolly or ease lands, at reading size; its words count from the frame
    // they are legible on the way in: `seenFrom`)
    // (while it asks, before the click, the card is framed whole as the frame's subject: nothing may cover it)
    // (the lean ring's ask is shown, not read: no read is declared, and the framings keep its text out of the frame
    // whenever it would be legible)
    lean
      ? view("ask", c.ask.view, c.ask.rect)
      : { ...view("ask", c.ask.view, c.ask.rect, { from: dollyTo, to: twoReads ? actReadFrom - easeBackF : glideStart, words: c.ask.words, textPx: c.ask.textPx, rect: askRead, seenFrom: clickAt ?? dollyFrom, seenTo: glideStart + glideF }), ...(clickAt === null ? {} : { framed: { from: dolly1To, to: clickAt } }) },
    lean
      ? view("act", c.act.view, c.act.rect, { from: leanReadFrom, to: glideStart, words: c.act.words, textPx: c.act.textPx, rect: c.act.readRect, seenFrom: readsFrom, seenTo: glideStart + glideF })
      : view("act", c.act.view, c.act.rect, { from: Math.max(dollyTo, actReadFrom), to: glideStart, words: c.act.words, textPx: c.act.textPx, rect: c.act.readRect, seenFrom: Math.max(clickAt ?? dollyFrom, actAt), seenTo: glideStart + glideF }),
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
      lean
        ? move("push", followFrom, Math.max(f60(90, fps), Math.min(f60(240, fps), arriveAt - followFrom)), "the ring-led arrival, in to reading magnification on the act")
        : move("push", dollyFrom, Math.min(f60(240, fps), (clickAt === null ? dollyTo : dolly1To) - dollyFrom + f60(30, fps)), clickAt === null ? "the dolly in to reading magnification" : "the dolly to the ask, framed whole while it asks"),
      ...(clickAt === null ? [] : [move("push", clickAt, Math.max(f60(90, fps), dollyTo - clickAt + f60(30, fps)), "on the click: the dolly in to reading magnification")]),
      move("product", 0, cut, `${m.id} at 1×`),
      move("ring", ringBack ?? receiptAt, f60(42, fps), ringBack !== null ? "the ring returns to the stone once it has framed the ask" : "the ring returns to the stone on the receipt's beat"),
      ...lightCues.map((x) => move("light", x.at, x.frames, "the light to day")),
      ...(cascadeSpec ? cascadeSchedule(cascadeSpec.start, cascadeSpec.items, fps, cascadeSpec.beats).slice(1).map((w, i) => move("swap", w.inStart, w.inEnd - w.inStart, `swap ${i + 1}`)) : []),
    ],
    exit: { pose: exitSample.pose, vel: exitSample.vel, shot: lastShot.id, ref: lastShot.ref, grade: "day" },
    extra: {
      timing: { arriveAt, chapterLand: specC.at + landFrames(specC, fps), limitLand: specL ? specL.at + landFrames(specL, fps) : specC.at + landFrames(specC, fps), linesExit: exitAt, linesGone, receiptAt, receiptArrive, cut, end: duration } satisfies RingTiming,
      arriveAt,
      linesGone,
      dollyFrom,
      dollyTo,
      dolly1To,
      clickAt: clickAt ?? -1,
      receiptAt,
      actAt,
      glideStart,
      takeAt: 0,
      receiptArrive,
      receiptReadEnd,
      cut,
      leaveDir,
      receiptFrame: frameOfSource(recSrc, use.at, fps, m, use.inPoint),
      readZoom: lean ? leanActZoom : readZoom,
      actZoom: readingActZoom,
      twoReads: twoR ? 1 : 0,
      receiptZoom: recPose.zoom,
      // the lean ring (MONTAGE_DESIGN §5.4): the act legible from `readsFrom`, the ring part's and the cascade's lengths
      lean: lean ? 1 : 0,
      readsFrom,
      ringPart: cut,
      cascadePart: duration - cut,
    },
  };
}


/** Where a world rect is on screen in a shot (for layouts and tests). */
export const onScreen = (r: Rect, pose: Pose, f: FrameBox): Rect => rectInFrame(r, pose, f);
