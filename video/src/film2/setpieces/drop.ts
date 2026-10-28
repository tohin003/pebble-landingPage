// THE DROP (TREATMENT §3.9, S06–S07): the person's Allow, a ring leaves the stone, the narrow frame opens to full bleed
// with it, the light warms, and the whole Mac appears with Pebble already at work in the browser. One continuous shot.
//
// It works for ANY music hit: the track's entrance (a downbeat with a step of about +3 LU) is `hit`, a local frame, and
// every event is placed from it:
//   0 … hit        the pre-roll: S05's tail. The card the Allow answers reads at 28 px or more in the narrow aperture
//                  (CR-09: it was never readable, declared as 0 words), the camera still pushing in slowly (Act I's
//                  push carried across the cut, never from rest), L04 in the band
//   hit            the Allow click: RS-9's in-point is solved so its "allow" lands exactly here (1×, never retimed)
//   hit            the burst: a ring leaves the stone (E-arrive, the one snap the Drop's hit allows), and the frame opens
//                  ON THE HIT in every aspect, over 34 frames (S06: 30–36; CR-07: in 9:16 it waited 24 frames for the
//                  ring to reach the 4:5 edge); the camera hands off to the wider framing as it opens; the warm grade over
//                  60 frames (≥ 0.5 s); one code light leak (of the film's two) once the bands have cleared, so it never
//                  tints them (CR-07: it turned the night green muddy brown)
//   receipt        the take's own receipt; the pebble turns `working` on it (a real host event), and the companion's view
//                  switches to the recording's next state with a hard cut, as a recording changes (CR-18)
//   L05, L06       "Now it works across your Mac." / "Where you allow it.": each lands on a beat once the burst has
//                  cleared its band (a ring never crosses a line being read), held together ≥ 3.0 s, while the camera
//                  keeps drifting out at 0.4 px a frame at the frame's edge (CR-04: it froze here for 3.5 s)
//   hit + 4.0 s    S07: a pull-back in log space to the whole Mac (dense: CR-16), easing into a glide toward the browser
//   after L06      a second ring travels out through the world; each dimmed place lifts into light as it passes
//   end            the next phrase line at or after hit + 7.5 s (S07 extends by up to 4 s within its phrase), else a
//                  bar line; never earlier (holds are never shortened)
// Pure data (setpieces/scene.ts): setpieces/views/PieceView.tsx draws it, setpieces/qa.ts checks it.
import { COLOR, f60, sec } from "../tokens";
import { VelocityCamera, type Pose } from "../motion/camera";
import { clamp01, curve } from "../motion/ease";
import { dist, farDistToRect, rectCenter, type Rect } from "../motion/geometry";
import { ringEnd, ringStates, type RingSpec } from "../carrier/ring";
import { apertureRect } from "../carrier/apertureMath";
import type { LightCue } from "../light/grades";
import { typeSizePx } from "../type/scale";
import { place, type MusicGrid } from "./music";
import { breakLines, cornerSpeedOf, exitFramesOf, exitPlanOf, fitPose, frameBox, glideLz, lineHeightOf, lineRect, unionRect, zoomAbout, type FrameBox, type TypeBox } from "./frame";
import { CARD_TEXT_INSET, SLOT, STILL, cardText } from "./standins";
import { TAKE_RS9, eventFrame, solveInPoint, type TakeManifest } from "./take";
import { STONE_R, STONE_SIZE, WORLD, worldRects } from "./world";
import { DROP_CUES } from "./pieces.cues";
import { anchored, landFrames, musicHit, ringClearFrame } from "./kit";
import { move, type MusicHit, type PlaneSpec, type ScenePlan, type TypeSpec } from "./scene";

export interface DropOptions {
  w: number;
  h: number;
  fps: number;
  /** the track's entrance, a local frame: the Allow click lands on it (the frames before it are the pre-roll) */
  hit: number;
  /** the music grid in local frames (the edit lane: shiftGrid(grid, −start)) */
  grid?: MusicGrid;
  take?: TakeManifest;
  lines?: { promise?: string; limit?: string; leadIn?: string | null };
  /** Act I's aperture centre (frame px); default the frame's centre */
  apertureCenterY?: number;
  /** the bands' colour: opaque night green, never black (lead ruling, §52: ≥ 3:1 against the picture's edge) */
  band?: string;
  /** the Drop runs at least this long after the hit (S06 + S07) */
  minAfterHitS?: number;
  /** ... and waits for its phrase line by up to this long */
  maxExtendS?: number;
  /** one timeline for every aspect: the latest frame of each timed event across the aspects (setpieces/align.ts) */
  align?: Partial<DropTiming>;
}

/** The least speed (px a frame at 1080) the card drifts at while it is read in the pre-roll (fix round 2). */
export const READ_DRIFT_PX = 0.36;
/** The hold's pan after the frame opens, px a frame at 1080 on screen (fix round 2; §55: 0.3–0.6). */
export const HOLD_PAN_PX = 0.42;

/** The frames the Drop's timeline is made of (the same in every aspect once aligned). */
export interface DropTiming {
  /** the frames the pair's lines LAND (their entrances start earlier by their own length) */
  promiseLand: number;
  limitLand: number;
  linesExit: number;
  revealRingAt: number;
  end: number;
  /** the frame the aperture starts to open (the hit's next frame, in every aspect: CR-07) */
  apertureOpen: number;
}

export const DROP_DEFAULTS = {
  promise: "Now it works across your Mac.",
  limit: "Where you allow it.",
  leadIn: "Allow it right where you are.",
  minAfterHitS: 7.5,
  maxExtendS: 4,
} as const;

/**
 * The card the Allow answers, as the 2.0.0 companion shows it: "Use youtube.com", the sites it may act on and only
 * read, Allow (TREATMENT S05). Its must-read words and its text (the companion's body text, measured on the 1.0.x
 * panel: 13.3 CSS px) are the read's, so the 28 px floor and the reading load both see it (CR-09).
 */
export const DROP_CARD = { words: 12, textPx: 13.3 } as const;

interface DropLayout {
  /** where the card reads in the narrow aperture (frame px) */
  read: (f: FrameBox, ap: Rect) => Rect;
  /** where the companion sits once the frame has opened: its centre, a share of the frame's width */
  companionX: number;
  /** the companion's height on screen once the frame has opened, a share of the frame's height */
  companionH: number;
  /** the pair's block: left, top (computed from its height), max width */
  pair: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
  sizeT: number;
  /**
   * the way the card drifts across the pre-roll where the aperture leaves it little room to rise: −1 left (toward the
   * frame's middle in 16:9), +1 right, the way the frame's opening then pans (fix round 3: with its text kept the safe
   * margin from the bands, 1:1's card rises less and drifts more, and a leftward drift turned back through a stop
   * into the opening's pan right, sway)
   */
  driftX?: number;
}

const LAYOUT: Record<FrameBox["aspect"], DropLayout> = {
  // the card right of centre; type left (the lines never sit over the companion's own text)
  "16:9": {
    read: (f, ap) => ({ x: f.w * 0.5, y: ap.y + 6 * f.unit, w: f.w * 0.46, h: ap.h - 12 * f.unit }),
    companionX: 0.74,
    companionH: 0.42,
    pair: (f, bh) => ({ left: f.safe * 2, top: f.h / 2 - bh / 2, maxW: f.w * 0.46 - f.safe * 2 }),
    sizeT: 0.35,
  },
  // the aperture is 16:9 inside the square; type sits above it (TREATMENT §3.12)
  "1:1": {
    read: (f, ap) => ({ x: f.w * 0.1, y: ap.y + 6 * f.unit, w: f.w * 0.8, h: ap.h - 12 * f.unit }),
    companionX: 0.66,
    companionH: 0.4,
    // one line each at the tier's smallest size, so the pair stays in the top band, clear of the companion
    pair: (f) => ({ left: f.safe * 1.2, top: f.safe, maxW: f.w - f.safe * 2.2 }),
    sizeT: 0,
    driftX: 1,
  },
  // the aperture is 4:5; the card in its upper part, the type below it
  "9:16": {
    read: (f, ap) => ({ x: f.safe * 0.6, y: ap.y + ap.h * 0.08, w: f.w - 1.2 * f.safe, h: ap.h * 0.62 }),
    companionX: 0.6,
    companionH: 0.26,
    pair: (f, bh) => ({ left: f.safe * 1.2, top: f.h - f.safe * 2.2 - bh, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.35,
  },
};

/** The plan of the Drop for one aspect and one music hit. */
export function planDrop(o: DropOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const W = WORLD[A];
  const L = LAYOUT[A];
  const take = o.take ?? TAKE_RS9;
  const hit = Math.round(o.hit);
  const al = o.align ?? {};
  const text = { promise: o.lines?.promise ?? DROP_DEFAULTS.promise, limit: o.lines?.limit ?? DROP_DEFAULTS.limit, leadIn: o.lines?.leadIn === undefined ? DROP_DEFAULTS.leadIn : o.lines.leadIn };
  const cy = o.apertureCenterY ?? f.h / 2;
  const band = o.band ?? COLOR.nightPage;
  const music: MusicHit[] = [{ event: "the entrance: Allow, the burst", frame: hit, point: o.grid?.beats.includes(hit) ? hit : null, level: "hit", waited: 0 }];
  const lzHold = glideLz(f);

  /* ------------------------------------------------ the framings ---------------------------------------------- */
  const ap0 = apertureRect(f.w, f.h, 0, cy);
  // the card reads at 28 px or more (4 % over the floor), framed in the narrow aperture (CR-09)
  const readZoom = ((28 * f.unit) / DROP_CARD.textPx) * 1.04;
  // (the card's text keeps the safe margin from the aperture's edges, inside the card's padding: fix round 3, readEdges;
  // in 1:1's 16:9 aperture the card drifting up through the whole aperture brought its text to 37 px of the bands)
  const readRegion0 = L.read(f, ap0);
  const padY = Math.max(0, f.safe - CARD_TEXT_INSET * readZoom - (readRegion0.y - ap0.y));
  const readRegion: Rect = { x: readRegion0.x, y: readRegion0.y + padY, w: readRegion0.w, h: readRegion0.h - 2 * padY };
  const readFit = fitPose(W.card, readRegion, f, 0.96);
  // the pre-roll's push starts at the reading floor and grows from it, so the card reads at 28 px from frame 0; it never
  // grows the card past the aperture's read region (a long pre-roll pushes more slowly), and the card drifts up through
  // the room the region leaves it, so the frame's corners keep moving where the push has little room (1:1's 16:9
  // aperture is about as wide as the card at reading size)
  const zStart = Math.max(readZoom, Math.min(readFit.zoom, readZoom * 1.02));
  const zMax = Math.max(zStart, (readFit.zoom / 0.96) * 0.995);
  const cardC = rectCenter(W.card);
  const regionC = rectCenter(readRegion);
  // the pose that puts the card's centre on frame point (sx, sy) at `zoom`
  const cardPose = (zoom: number, sy: number, sx = regionC.x): Pose => ({ x: cardC.x - (sx - f.w / 2) / zoom, y: cardC.y - (sy - f.h / 2) / zoom, zoom });
  // the read over its last T frames before the hit: the push and the drift that fill the room in T frames; where the
  // aperture leaves the card little room to rise (1:1's 16:9 aperture), it drifts sideways too, inside the frame, so
  // the card itself moves at READ_DRIFT_PX or more (fix round 2: its content moved 0.19 px a frame in 1:1)
  const readOver = (T: number) => {
    const lz = Math.min(lzHold * 1.25, Math.log(zMax / zStart) / Math.max(1, T));
    const zHit = zStart * Math.exp(lz * T);
    const roomY = Math.max(0, readRegion.h - W.card.h * zHit - 4 * f.unit);
    const travelY = Math.min(roomY * 0.9, 0.5 * f.unit * T);
    const vy = travelY / Math.max(1, T);
    const vx = Math.sqrt(Math.max(0, (READ_DRIFT_PX * f.unit) ** 2 - vy * vy));
    const roomX = Math.max(0, f.w - W.card.w * zHit - 48 * f.unit);
    const travelX = Math.min(roomX * 0.9, vx * T);
    // (the card drifts left, toward the frame's middle in 16:9, or right in 1:1 (LAYOUT.driftX), centred on its framing
    // so it never nears an edge)
    const sgn = L.driftX ?? -1;
    const sx = Math.max(24 * f.unit + (W.card.w * zHit) / 2 + travelX / 2, Math.min(regionC.x, f.w - 24 * f.unit - (W.card.w * zHit) / 2 - travelX / 2));
    const from = cardPose(zStart, regionC.y + travelY / 2, sx - (sgn * travelX) / 2);
    const to = cardPose(zHit, regionC.y - travelY / 2, sx + (sgn * travelX) / 2);
    const v = { x: (to.x - from.x) / Math.max(1, T), y: (to.y - from.y) / Math.max(1, T), lz: Math.log(zHit / zStart) / Math.max(1, T) };
    return { from, to, v, corner: cornerSpeedOf(from, v, f) / f.unit };
  };
  // the longest read the room keeps gliding at 0.32 px a frame or more (CR-04); a longer pre-roll comes in from wider
  let readT = Math.max(1, hit);
  while (readT > f60(90, fps) && readOver(readT).corner < 0.32) readT -= 2;
  const { from: read0, to: read, v: vPre } = readOver(readT);
  const readFrom = hit - readT;
  // once the frame has opened: the companion whole, right of centre, the type left of it
  const openZoom = (L.companionH * f.h) / W.companion.h;
  const compC = rectCenter(W.companion);
  const opened: Pose = { x: compC.x - (L.companionX * f.w - f.w / 2) / openZoom, y: compC.y, zoom: openZoom };
  const full: Rect = { x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: f.h - 2 * f.safe };
  const wide = fitPose(unionRect(...worldRects(W)), full, f, 0.98);

  /* ------------------------------------------------ the camera, never at rest (CR-04) -------------------------- */
  const openFrames = f60(90, fps);
  const browserC = rectCenter(W.browser);
  const toward = { x: browserC.x - wide.x, y: browserC.y - wide.y };
  const tl = Math.hypot(toward.x, toward.y) || 1;
  // the glide drifts toward the browser (Ring 1), 0.45 px a frame on screen at the wide zoom
  const driftSpeed = (0.45 * f.unit * 60) / fps / wide.zoom;
  const drift = { x: (toward.x / tl) * driftSpeed, y: (toward.y / tl) * driftSpeed, lz: 0 };
  // the camera up to the whole Mac's framing, for a reveal starting on `revealStart` (it starts at hit + 4 s, or as the
  // pair's exit starts if that is later: the pull-back never brings a capture under a line still read, NF-05)
  const buildCam = (revealStart: number) => {
    const revealEnd = revealStart + f60(160, fps);
    // the pre-roll: at reading size from `readFrom` (its first frame, unless the pre-roll is longer than the read can
    // glide), pushing in and drifting at one velocity; before it, a faster push-in from wider brings the card to it
    let cam: VelocityCamera;
    if (readFrom > 0) {
      const lzIn = glideLz(f, 0.6);
      const sy = f.h / 2 + (cardC.y - read0.y) * read0.zoom;
      const z0 = read0.zoom * Math.exp(-lzIn * readFrom);
      const approach0 = cardPose(z0, sy);
      cam = new VelocityCamera(approach0, zoomAbout(approach0, { x: regionC.x, y: sy }, lzIn, f));
      cam.hermite(readFrom, read0, vPre);
    } else cam = new VelocityCamera(read0, vPre);
    cam.hermite(hit, read, vPre);
    // the hand-off on the burst: out to the opened framing as the frame opens, then drifting out through the pair and
    // travelling the way the reveal's glide goes (toward the browser from the whole Mac's middle): the pull-back about
    // the companion alone left the companion, the frame's subject, still (the verifier's CR-04: 0.04–0.09 px a frame
    // while the corners moved 0.4–0.6), so the hold also pans at HOLD_PAN_PX on screen, in the direction the whole
    // passage keeps to the end of the piece
    const pullOut = zoomAbout(opened, { x: L.companionX * f.w, y: f.h / 2 }, -lzHold * 1.1, f);
    const driftOut = { x: pullOut.x + ((toward.x / tl) * HOLD_PAN_PX * f.unit) / opened.zoom, y: pullOut.y + ((toward.y / tl) * HOLD_PAN_PX * f.unit) / opened.zoom, lz: pullOut.lz };
    // (the opened framing is where the hold is centred: it lands half its pan early, so the hold drifts through it)
    const holdSpan = revealStart - (hit + openFrames);
    const openedFrom: Pose = { x: opened.x - (driftOut.x - pullOut.x) * holdSpan * 0.5, y: opened.y - (driftOut.y - pullOut.y) * holdSpan * 0.5, zoom: opened.zoom };
    cam.hermite(hit + openFrames, openedFrom, driftOut);
    cam.glide(revealStart, f60(30, fps), driftOut);
    const atReveal = cam.pose(revealStart);
    // the pull-back in log space (pullBack()'s Hermite: it lands still moving out, then glides)
    const factor = (wide.zoom * 1.05) / atReveal.zoom;
    const meanLz = Math.log(factor) / (revealEnd - revealStart);
    cam.hermite(revealEnd, { x: wide.x, y: wide.y, zoom: atReveal.zoom * factor }, { lz: meanLz * 0.35, x: drift.x, y: drift.y });
    return { cam, revealStart, revealEnd, meanLz };
  };
  let built = buildCam(Math.max(hit + sec(4.0, fps), al.linesExit ?? 0));
  const poseAt = (fr: number): Pose => built.cam.pose(fr);

  /* ------------------------------------------------ the burst and the aperture, on the hit --------------------- */
  const burst: RingSpec = {
    id: "drop-burst",
    start: hit,
    source: W.stone,
    stoneRadius: STONE_R,
    phases: [
      { kind: "emit", frames: f60(18, fps), radius: STONE_R * 5 },
      { kind: "burst", frames: f60(72, fps), radius: "edge" },
      { kind: "fade", frames: f60(12, fps) },
    ],
    echoes: 2,
    layer: "ground",
  };
  const apertureFrames = f60(34, fps);
  // the frame opens ON THE HIT in every aspect (its first moved frame is hit + 1), on power2.out: it leads the ring out
  const apertureOpen = Math.max(hit + 1, al.apertureOpen ?? 0);
  const open = (fr: number): number => curve("power2.out")(clamp01((fr - (apertureOpen - 1)) / apertureFrames));
  const bandsClear = apertureOpen - 1 + apertureFrames;

  /* ------------------------------------------------ type ------------------------------------------------------- */
  const sizeE = typeSizePx("expressive", f.w, f.h, L.sizeT);
  const lhE = sizeE * lineHeightOf("expressive");
  const probe = L.pair(f, 0);
  const promise = breakLines(text.promise, "expressive", f, probe.maxW, L.sizeT);
  const limit = breakLines(text.limit, "expressive", f, probe.maxW, L.sizeT);
  const nP = promise.split("\n").length;
  const nL = limit.split("\n").length;
  const gap = 14 * f.unit;
  const blockH = (nP + nL) * lhE + gap;
  const pos = L.pair(f, blockH);
  const boxP: TypeBox = { left: pos.left, top: pos.top, align: "left" };
  const boxL: TypeBox = { left: pos.left, top: pos.top + nP * lhE + gap, align: "left" };
  const types: TypeSpec[] = [];
  // (they rose through their masks, so they leave through them: a lift, the block's lines one after another from the top,
  // as they came; fix round 2: they blurred away)
  const specP: TypeSpec = { id: "L05", text: promise, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxP, kind: "film", key: true, pairWith: "L06", exit: "lift" };
  const specL: TypeSpec = { id: "L06", text: limit, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxL, kind: "film", key: true, exit: "lift" };
  const rectP = lineRect(promise, "expressive", f, boxP, L.sizeT);
  const rectL = lineRect(limit, "expressive", f, boxL, L.sizeT);
  // each line is read only once the burst (and its echoes) has left its rect and the bands have cleared; on a beat
  const clearP = ringClearFrame([burst], [rectP], fps, poseAt, f, hit, hit + f60(150, fps));
  const clearL = ringClearFrame([burst], [rectL], fps, poseAt, f, hit, hit + f60(150, fps));
  const enterP = landFrames(specP, fps);
  const enterL = landFrames(specL, fps);
  const landP = place(Math.max(hit + f60(48, fps) + enterP, clearP, bandsClear + enterP, al.promiseLand ?? -Infinity), o.grid, { level: "beat", frames: enterP });
  specP.at = landP.at;
  const landL = place(Math.max((landP.point ?? landP.at + enterP) + f60(24, fps), clearL, al.limitLand ?? -Infinity), o.grid, { level: "beat", frames: enterL });
  specL.at = landL.at;
  music.push(musicHit("L05 lands", landP), musicHit("L06 lands", landL));
  // held together, L05 3.6 s and L06 at least 3.0 s (they need 2.3 and 2.0, and 2.5 together): the reference timing's
  // 4.8 and 4.3 s would keep them on screen while the reveal ring passes, and a ring never crosses a line being read
  const exitAt = Math.max(specP.at + sec(3.6, fps), specL.at + sec(3.0, fps), al.linesExit ?? 0);
  specP.exitAt = exitAt;
  // (L06 lifts as the promise's last line has started to: the wave runs down the block)
  specL.exitAt = exitAt + nP * exitPlanOf("lineRise", "lift", promise, fps).stagger;
  if (exitAt > built.revealStart) built = buildCam(exitAt);
  const { cam, revealStart, revealEnd, meanLz } = built;
  const linesGone = Math.max(exitAt + exitFramesOf("lineRise", "lift", promise, fps), specL.exitAt + exitFramesOf("lineRise", "lift", limit, fps));
  types.push(specP, specL);

  // the lead-in (S05's L04) in a band on the night green, gone before the bands move on the hit
  if (text.leadIn) {
    const sizeF = typeSizePx("functional", f.w, f.h, 0.3);
    const lh = sizeF * lineHeightOf("functional");
    const upperRoom = ap0.y - 4 * f.unit;
    const top = upperRoom - lh >= f.safe ? Math.max(f.safe, (ap0.y - lh) / 2) : ap0.y + ap0.h + 4 * f.unit;
    const box: TypeBox = { left: 0, top, width: f.w, align: "center" };
    const exitF = exitFramesOf("lineBlur", "blur", text.leadIn, fps);
    const leadExit = hit - exitF - 2;
    const need = sec(0.5 + 0.3 * text.leadIn.split(/\s+/).length, fps) + 2;
    const at = leadExit - need;
    if (at < 0) throw new Error(`the Drop's lead-in "${text.leadIn}" needs ${need} frames before the band opens; the pre-roll is ${hit} frames`);
    types.push({ id: "L04", text: text.leadIn, tier: "functional", at: Math.min(at, f60(6, fps)), exitAt: leadExit, sizeT: 0.3, color: COLOR.nightInk, box, kind: "film" });
  }

  /* ------------------------------------------------ the reveal ring: each place lifts into light as it passes --- */
  const dimmed: { id: string; rect: Rect }[] = [
    { id: "calculator", rect: W.calculator },
    { id: "finder", rect: W.finder },
    { id: "project", rect: W.project.window },
    { id: "toolbox", rect: W.toolbox },
  ];
  const farR = Math.max(...dimmed.map((d) => farDistToRect(W.stone, d.rect))) + 80;
  const revealRingAt = Math.max(linesGone + 2, revealStart + f60(30, fps), al.revealRingAt ?? 0);
  const reveal: RingSpec = {
    id: "drop-reveal",
    start: revealRingAt,
    source: W.stone,
    stoneRadius: STONE_R,
    phases: [
      { kind: "emit", frames: f60(72, fps), radius: farR, ease: "E-move" },
      { kind: "fade", frames: f60(12, fps) },
    ],
    layer: "ground",
    ripple: false,
  };
  const passFrame = (rect: Rect): number => {
    const d = dist(W.stone, rectCenter(rect));
    for (let fr = revealRingAt; fr < ringEnd(reveal); fr++) {
      const r = ringStates(reveal, fr, fps).find((x) => x.echo === 0);
      if (r && r.r >= d) return fr;
    }
    return ringEnd(reveal);
  };
  const lift = (rect: Rect) => {
    const p = passFrame(rect);
    return [
      { at: 0, v: 1 },
      { at: p, v: 1 },
      { at: p + f60(30, fps), v: 0 },
    ];
  };

  /* ------------------------------------------------ the end: a phrase line (or a bar line), never earlier ------ */
  const earliestEnd = Math.max(hit + sec(o.minAfterHitS ?? DROP_DEFAULTS.minAfterHitS, fps), ringEnd(reveal) + f60(30, fps) + 6, revealEnd + f60(20, fps));
  const maxWait = sec(o.maxExtendS ?? DROP_DEFAULTS.maxExtendS, fps);
  const endEarliest = Math.max(earliestEnd, al.end ?? 0);
  let endP = place(endEarliest, o.grid, { level: "phrase", maxWait });
  if (endP.point === null && o.grid) endP = place(endEarliest, o.grid, { level: "bar", maxWait });
  const end = endP.point ?? endEarliest;
  music.push(musicHit("the Drop ends: Ring 1 starts", endP));
  // the glide after the pull-back, toward the browser, until the end (and past it at the same velocity)
  cam.glide(end, sec(0.4, fps), { lz: meanLz * 0.02, x: drift.x, y: drift.y });

  /* ------------------------------------------------ the take at 1×: Allow on the hit ---------------------------- */
  const use = solveInPoint(take, "allow", hit, 0, end, fps);
  const receiptAt = eventFrame(use, "receipt", fps);

  /* ------------------------------------------------ planes, back to front --------------------------------------- */
  const slotOf = (s: (typeof SLOT)[keyof typeof SLOT], r: Rect): PlaneSpec["content"] => ({ kind: "standIn", standIn: { ...s, w: r.w, h: r.h } });
  const planes: PlaneSpec[] = [
    { id: "project-window", kind: "pebble", rect: W.project.window, content: slotOf(SLOT.project, W.project.window), dim: lift(W.project.window), shadow: true },
    // (the held card as Ring 4 opens on it, asking with its buttons: the world Ring 4 continues is the same, NF-01)
    { id: "project-held", kind: "pebble", rect: W.project.held, content: { kind: "standIn", standIn: STILL.held }, dim: lift(W.project.window), radius: 4, shadow: false },
    { id: "toolbox", kind: "pebble", rect: W.toolbox, depth: W.depth.toolbox, content: { kind: "standIn", standIn: STILL.settings }, dim: lift(W.toolbox), shadow: true },
    { id: "finder", kind: "apple", rect: W.finder, depth: W.depth.finder, content: slotOf(SLOT.finder, W.finder), dim: lift(W.finder), shadow: true },
    { id: "calculator", kind: "apple", rect: W.calculator, depth: W.depth.calculator, content: slotOf(SLOT.calculator, W.calculator), dim: lift(W.calculator), shadow: true },
    { id: "browser", kind: "thirdParty", rect: W.browser, content: { kind: "take", use, view: "browser" }, shadow: true, radius: 10 },
    // the companion: RS-9's view; the card the Allow answers reads at 28 px until the Allow (CR-09, CR-11); its text,
    // inside the card's padding, keeps the safe margin from the aperture's edges (fix round 3, readEdges: in 1:1's 16:9
    // aperture the card itself comes within 10 px of the bands at reading size)
    { id: "companion", kind: "pebble", rect: W.companion, content: { kind: "take", use, view: "companion" }, shadow: true, radius: 14, read: { from: readFrom, to: hit, words: DROP_CARD.words, textPx: DROP_CARD.textPx, rect: cardText(W.card), seenFrom: 0 } },
  ];

  /* ------------------------------------------------ light, leak, cues ------------------------------------------ */
  const lightCues: LightCue[] = [{ at: hit, to: "warm", frames: f60(60, fps) }];
  const cues = anchored(DROP_CUES, receiptAt / fps, "the Drop's cues");

  return {
    id: "drop",
    name: `Drop ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      {
        id: "drop",
        from: 0,
        to: end,
        kind: "cutscene",
        camera: cam,
        // the parallax planes line up at the whole Mac's framing, so the composed world is exact at its widest
        ref: wide,
        ground: "riverbed",
        planes,
        stone: { at: W.stone, r: STONE_R, size: STONE_SIZE, cues },
        rings: [burst, reveal],
        aperture: { centerY: cy, band, open },
        dofScale: 10,
      },
    ],
    seams: [],
    types,
    lightInitial: "morning",
    lightCues,
    // the leak plays once the bands have cleared, never over them (CR-07)
    leaks: [{ at: bandsClear, frames: f60(48, fps) }],
    hits: [hit],
    takes: [use],
    music,
    moves: [
      move("ring", hit, f60(18, fps) + f60(72, fps), "the burst: emit and burst to the frame's edge"),
      move("ring", revealRingAt, f60(72, fps), "the reveal ring through the world"),
      move("push", hit, openFrames, "S06: the hand-off to the opened framing as the frame opens"),
      move("push", revealStart, revealEnd - revealStart, "S07: the pull-back to the whole Mac"),
      move("product", 0, end, "RS-9 at 1× (the companion, its card, the receipt, the browser)"),
      ...lightCues.map((c) => move("light", c.at, c.frames, "the light warms")),
    ],
    exit: { pose: cam.pose(end), vel: cam.sample(end).vel, shot: "drop", ref: wide, grade: "warm" },
    extra: {
      timing: { promiseLand: specP.at + enterP, limitLand: specL.at + enterL, linesExit: exitAt, revealRingAt, end, apertureOpen } satisfies DropTiming,
      apertureOpen,
      apertureFrames,
      bandsClear,
      band,
      receiptAt,
      linesGone,
      revealRingAt,
      revealStart,
      revealEnd,
      clearP,
      clearL,
      readZoom: read.zoom,
      readFrom,
      openedZoom: opened.zoom,
      wideZoom: wide.zoom,
    },
  };
}
