// THE DROP (TREATMENT §3.9, S06–S07): the person's Allow, a ring leaves the stone, the narrow frame opens to full bleed
// with it, the light warms, and the whole Mac appears with Pebble already at work in the browser. One continuous shot.
//
// It works for ANY music hit: the track's entrance (a downbeat with a step of about +3 LU) is `hit`, a local frame, and
// every event is placed from it:
//   hit            the Allow click: RS-9's in-point is solved so its "allow" lands exactly here (1×, never retimed)
//   hit            the burst: a ring leaves the stone (E-arrive, the one snap the Drop's hit allows), reaches the
//                  aperture's edges, and the frame opens with it over 34 frames (S06: 30–36); a code light leak (one
//                  of the film's two, where the light changes) and the warm grade over 60 frames (≥ 0.5 s)
//   receipt        the take's own receipt; the pebble turns `working` on it (a real host event)
//   L05, L06       "Now it works across your Mac." / "Where you allow it.": each lands on a beat once the burst has
//                  cleared its band (a ring never crosses a line being read), held together ≥ 3.0 s
//   hit + 4.0 s    S07: a pull-back in log space to the whole Mac, easing into a glide toward the browser
//   after L06      a second ring travels out through the world; each dimmed place lifts into light as it passes
//   end            the next phrase line at or after hit + 7.5 s (S07 extends by up to 4 s within its phrase), else a
//                  bar line; never earlier (holds are never shortened)
// Pure data (setpieces/scene.ts): components/Drop draws it, setpieces/qa.ts checks it.
import { COLOR, f60, sec } from "../tokens";
import { VelocityCamera, worldToFrame, type Pose } from "../motion/camera";

import { clamp01, curve } from "../motion/ease";
import { dist, farDistToRect, rectCenter, type Rect } from "../motion/geometry";
import { ringEnd, ringStates, type RingSpec } from "../carrier/ring";
import { apertureOpenForRing, apertureRect } from "../carrier/apertureMath";
import type { LightCue } from "../light/grades";
import { typeSizePx } from "../type/scale";
import { place, type MusicGrid } from "./music";
import { breakLines, exitFramesOf, fitPose, frameBox, lineHeightOf, lineRect, unionRect, type FrameBox, type TypeBox } from "./frame";
import { STILL } from "./standins";
import { COMPANION_PANEL, TAKE_RS9, eventFrame, solveInPoint, type TakeManifest } from "./take";
import { STONE_R, STONE_SIZE, WORLD, worldRects } from "./world";
import { DROP_CUES } from "./pieces.cues";
import { anchored, edgeRadius, landFrames, musicHit, ringClearFrame } from "./kit";
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

/** The frames the Drop's timeline is made of (the same in every aspect once aligned). */
export interface DropTiming {
  /** the frames the pair's lines LAND (their entrances start earlier by their own length) */
  promiseLand: number;
  limitLand: number;
  linesExit: number;
  revealRingAt: number;
  end: number;
}

export const DROP_DEFAULTS = {
  promise: "Now it works across your Mac.",
  limit: "Where you allow it.",
  leadIn: "Allow it right where you are.",
  minAfterHitS: 7.5,
  maxExtendS: 4,
} as const;

interface DropLayout {
  /** where the companion sits in the narrow aperture (fractions of the frame, x0, x1; y within the aperture) */
  subject: (f: FrameBox, ap: Rect) => Rect;
  fill: number;
  /** the pair's block: left, top (computed from its height), max width */
  pair: (f: FrameBox, blockH: number) => { left: number; top: number; maxW: number };
  sizeT: number;
}

const LAYOUT: Record<FrameBox["aspect"], DropLayout> = {
  // subject right, type left (the lines never sit over the companion's own text)
  "16:9": {
    subject: (f, ap) => ({ x: f.w * 0.5, y: ap.y, w: f.w * 0.44, h: ap.h }),
    fill: 0.86,
    pair: (f, bh) => ({ left: f.safe * 2, top: f.h / 2 - bh / 2, maxW: f.w * 0.46 - f.safe * 2 }),
    sizeT: 0.35,
  },
  // the aperture is 16:9 inside the square; type sits above it (TREATMENT §3.12)
  "1:1": {
    subject: (f, ap) => ({ x: f.w * 0.3, y: ap.y, w: f.w * 0.64, h: ap.h }),
    fill: 0.9,
    pair: (f) => ({ left: f.safe * 1.2, top: f.safe * 1.1, maxW: f.w - f.safe * 2.4 }),
    sizeT: 0.2,
  },
  // the aperture is 4:5; the companion in its upper part, the type below it
  "9:16": {
    subject: (f, ap) => ({ x: f.safe, y: ap.y, w: f.w - 2 * f.safe, h: ap.h * 0.6 }),
    fill: 0.86,
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
  const text = { promise: o.lines?.promise ?? DROP_DEFAULTS.promise, limit: o.lines?.limit ?? DROP_DEFAULTS.limit, leadIn: o.lines?.leadIn === undefined ? DROP_DEFAULTS.leadIn : o.lines.leadIn };
  const cy = o.apertureCenterY ?? f.h / 2;
  const band = o.band ?? COLOR.nightPage;
  const music: MusicHit[] = [{ event: "the entrance: Allow, the burst", frame: hit, point: o.grid?.beats.includes(hit) ? hit : null, level: "hit", waited: 0 }];

  /* ------------------------------------------------ the camera up to the end of the pull-back ------------------- */
  const ap0 = apertureRect(f.w, f.h, 0, cy);
  const tight = fitPose(unionRect(W.companion, W.card), L.subject(f, ap0), f, L.fill);
  const full: Rect = { x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: f.h - 2 * f.safe };
  const wide = fitPose(unionRect(...worldRects(W)), full, f, 0.98);
  const settle = hit + f60(30, fps);
  const revealStart = hit + sec(4.0, fps);
  const revealEnd = revealStart + f60(160, fps);
  // Act I's push-in is carried into the Drop and slows as the frame opens (it never stops dead)
  const cam = new VelocityCamera({ ...tight, zoom: tight.zoom * Math.exp(-0.00022 * hit) }, { lz: 0.00022 });
  cam.hermite(settle, { ...tight, zoom: tight.zoom * 1.02 }, { lz: 0.00005 });
  cam.glide(revealStart, f60(30, fps), { lz: 0.00004 });
  const atReveal = cam.pose(revealStart);
  const browserC = rectCenter(W.browser);
  const toward = { x: browserC.x - wide.x, y: browserC.y - wide.y };
  const tl = Math.hypot(toward.x, toward.y) || 1;
  // the glide drifts toward the browser (Ring 1), about 0.5 px a frame on screen at the wide zoom
  const driftSpeed = (1.6 * 60) / fps;
  const drift = { x: (toward.x / tl) * driftSpeed, y: (toward.y / tl) * driftSpeed, lz: 0 };
  // the pull-back in log space (pullBack()'s Hermite: it lands still moving out, then glides)
  const factor = (wide.zoom * 1.06) / atReveal.zoom;
  const meanLz = Math.log(factor) / (revealEnd - revealStart);
  cam.hermite(revealEnd, { x: wide.x, y: wide.y, zoom: atReveal.zoom * factor }, { lz: meanLz * 0.35, x: drift.x, y: drift.y });
  const poseAt = (fr: number): Pose => cam.pose(fr);

  /* ------------------------------------------------ the burst and the aperture ---------------------------------- */
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
  const edge = edgeRadius(poseAt, f.w, f.h);
  let touch = hit;
  for (let fr = hit; fr < hit + f60(120, fps); fr++) {
    const r = ringStates(burst, fr, fps, edge).find((x) => x.echo === 0);
    if (!r) continue;
    const pose = poseAt(fr);
    const c = worldToFrame(r.c, pose, f.w, f.h);
    if (apertureOpenForRing(f.w, f.h, c.y, r.r * pose.zoom, cy) > 0) {
      touch = fr;
      break;
    }
  }
  const apertureFrames = f60(34, fps);
  const open = (fr: number): number => curve("power2.out")(clamp01((fr - touch) / apertureFrames));

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
  const specP: TypeSpec = { id: "L05", text: promise, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxP, kind: "film", key: true, pairWith: "L06" };
  const specL: TypeSpec = { id: "L06", text: limit, tier: "expressive", at: 0, sizeT: L.sizeT, box: boxL, kind: "film", key: true };
  const rectP = lineRect(promise, "expressive", f, boxP, L.sizeT);
  const rectL = lineRect(limit, "expressive", f, boxL, L.sizeT);
  // each line is read only once the burst (and its echoes) has left its rect; it lands on a beat
  const clearP = ringClearFrame([burst], [rectP], fps, poseAt, f, hit, hit + f60(150, fps));
  const clearL = ringClearFrame([burst], [rectL], fps, poseAt, f, hit, hit + f60(150, fps));
  const enterP = landFrames(specP, fps);
  const enterL = landFrames(specL, fps);
  const al = o.align ?? {};
  const landP = place(Math.max(hit + f60(48, fps) + enterP, clearP, al.promiseLand ?? -Infinity), o.grid, { level: "beat", frames: enterP });
  specP.at = landP.at;
  const landL = place(Math.max((landP.point ?? landP.at + enterP) + f60(24, fps), clearL, al.limitLand ?? -Infinity), o.grid, { level: "beat", frames: enterL });
  specL.at = landL.at;
  music.push(musicHit("L05 lands", landP), musicHit("L06 lands", landL));
  // held together, L05 3.6 s and L06 at least 3.0 s (they need 2.3 and 2.0, and 2.5 together): the reference timing's
  // 4.8 and 4.3 s would keep them on screen while the reveal ring passes, and a ring never crosses a line being read
  const exitAt = Math.max(specP.at + sec(3.6, fps), specL.at + sec(3.0, fps), al.linesExit ?? 0);
  specP.exitAt = exitAt;
  specL.exitAt = exitAt;
  const linesGone = exitAt + Math.max(exitFramesOf("lineRise", "blur", promise, fps), exitFramesOf("lineRise", "blur", limit, fps));
  types.push(specP, specL);

  // the lead-in (S05's L04) in a band on the night green, gone before the burst could reach it or the band moves
  if (text.leadIn) {
    const sizeF = typeSizePx("functional", f.w, f.h, 0.3);
    const lh = sizeF * lineHeightOf("functional");
    const upperRoom = ap0.y - 4 * f.unit;
    const top = upperRoom - lh >= f.safe ? Math.max(f.safe, (ap0.y - lh) / 2) : ap0.y + ap0.h + 4 * f.unit;
    const box: TypeBox = { left: 0, top, width: f.w, align: "center" };
    const rect04 = lineRect(text.leadIn, "functional", f, box, 0.3);
    let firstReach = touch;
    for (let fr = hit; fr < touch; fr++) {
      if (ringClearFrame([burst], [rect04], fps, poseAt, f, fr, fr + 1) > fr) {
        firstReach = fr;
        break;
      }
    }
    const exitF = exitFramesOf("lineBlur", "blur", text.leadIn, fps);
    const leadExit = Math.min(touch, firstReach) - exitF - 2;
    const need = sec(0.5 + 0.3 * text.leadIn.split(/\s+/).length, fps) + 2;
    const at = leadExit - need;
    if (at < 0) throw new Error(`the Drop's lead-in "${text.leadIn}" needs ${need} frames before the band opens; the pre-roll is ${hit} frames`);
    types.push({ id: "L04", text: text.leadIn, tier: "functional", at: Math.min(at, f60(6, fps)), exitAt: leadExit, sizeT: 0.3, color: COLOR.nightInk, box, kind: "film" });
  }

  /* ------------------------------------------------ the reveal ring: each place lifts into light as it passes --- */
  const dimmed: { id: string; rect: Rect }[] = [
    { id: "calculator", rect: W.calculator },
    { id: "finder", rect: W.finder },
    { id: "project", rect: unionRect(W.project.held, W.project.run) },
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

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const slot = (id: string, captureId: string, label: string, r: Rect, window: "apple" | "thirdParty" | "pebble", standsFor: string): PlaneSpec["content"] => ({
    kind: "standIn",
    standIn: { kind: "slot", id, captureId, label, w: r.w, h: r.h, window, standsFor },
  });
  const planes: PlaneSpec[] = [
    { id: "browser", kind: "thirdParty", rect: W.browser, content: { kind: "take", use, view: "browser" }, shadow: true, radius: 10 },
    { id: "calculator", kind: "apple", rect: W.calculator, content: slot("calculator", "RS-4", "Calculator, before \"=\"", W.calculator, "apple", "I1, I8"), dim: lift(W.calculator), shadow: true },
    { id: "finder", kind: "apple", rect: W.finder, content: slot("finder", "RS-H", "Finder at Pebble Workbench", W.finder, "apple", "H1, H2"), dim: lift(W.finder), shadow: true },
    { id: "project-held", kind: "pebble", rect: W.project.held, content: { kind: "standIn", standIn: STILL.held }, dim: lift(dimmed[2]!.rect) },
    { id: "project-run", kind: "pebble", rect: { x: W.project.run.x, y: W.project.run.y, w: 495, h: 344 }, content: { kind: "standIn", standIn: STILL.testsCard }, dim: lift(dimmed[2]!.rect) },
    { id: "toolbox", kind: "pebble", rect: W.toolbox, content: { kind: "standIn", standIn: STILL.settings }, dim: lift(W.toolbox) },
    { id: "companion", kind: "pebble", rect: W.companion, content: { kind: "image", src: COMPANION_PANEL.src, w: COMPANION_PANEL.w, h: COMPANION_PANEL.h, note: "1.0.x harness frame, avatar hidden" }, shadow: true, radius: 14 },
    { id: "companion-card", kind: "pebble", rect: W.card, content: { kind: "take", use, view: "companionCard" }, shadow: false, radius: 8, read: { from: 0, to: receiptAt + f60(60, fps), words: 0, receipt: false } },
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
        ref: tight,
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
    leaks: [{ at: hit + 2, frames: f60(48, fps) }],
    hits: [hit],
    takes: [use],
    music,
    moves: [
      move("ring", hit, f60(18, fps) + f60(72, fps), "the burst: emit and burst to the frame's edge"),
      move("ring", revealRingAt, f60(72, fps), "the reveal ring through the world"),
      move("push", revealStart, revealEnd - revealStart, "S07: the pull-back to the whole Mac"),
      move("product", 0, end, "RS-9 at 1× (the companion's card, the receipt, the browser)"),
      ...lightCues.map((c) => move("light", c.at, c.frames, "the light warms")),
    ],
    exit: { pose: cam.pose(end), vel: cam.sample(end).vel, shot: "drop", ref: tight },
    extra: {
      timing: { promiseLand: specP.at + enterP, limitLand: specL.at + enterL, linesExit: exitAt, revealRingAt, end } satisfies DropTiming,
      touch,
      apertureFrames,
      band,
      receiptAt,
      linesGone,
      revealRingAt,
      revealStart,
      revealEnd,
      clearP,
      clearL,
      tightZoom: tight.zoom,
      wideZoom: wide.zoom,
    },
  };
}
