// THE DUSK PASSAGE (TREATMENT §3.5 S20–S22, §3.7 H7, OVERRIDES §21 and §49): Stealth Lockdown, the film's quiet passage.
//   S20  ⌘K over the workspace: the passage opens on HS-B3's own frame of the workspace (CR-06: it opened on 12 blank
//        frames of bare ground), the camera arriving with the momentum of the cut into it and pushing on slowly (never
//        from rest, CR-04); the palette opens (the product's own entrance), "stealth" is typed, the row "Turn Stealth
//        Lockdown on" lights, Enter, which lands on a beat (HS-B3's in-point is solved for it); the light cools to dusk,
//        continuously (the Veil's dusk blue is allowed inside this passage only)
//   S21  a rack focus into the cut scene "Dusk": the Veil RENDERED with Pebble's own code (stealthVeil.ts), in macro
//        (its body 40–55 % of the frame's height, CR-19: it filled 19 % of the width) and pushing in slowly; beside it,
//        set in the render's world so it is on screen exactly as long as the render, "A render, not a screen
//        recording." (L22, CR-19: it left 2–4 frames before the render did); the shot ends as the camera cranes up and
//        carries both out of the frame's foot
//   S22  RS-13, from the Dock to the menu bar: the crane arrives on the Dock with the cut's momentum, the Dock icon leaves
//        on a beat, the crane goes on up, and a momentum cut on a beat skips the crane's empty middle (CR-19) into its
//        last stretch, which lands at 3.5× on the menu-bar icon's new state (60 px or more at 1080)
//   L21  the honest line, word for word (STEALTH_HONEST), from just after the Enter to the passage's end, held ≥ 12 s
//        (it needs 9): in a fixed band, across the rack and the cuts. Never "undetectable" or "invisible"; no light
//        sweep, rim or leak while it shows; no focus claim unless 2.0.0's release notes confirm it (L23, default out)
// The passage ends on a bar line (the climax's build), the camera leaving on an E-leave into the climax's cut.
// Pure data.
import { COLOR, f60, sec } from "../tokens";
import { VelocityCamera, arriveWithMomentum, screenVelocity, type Pose } from "../motion/camera";
import type { Rect, Vec } from "../motion/geometry";
import type { Grade, GradeName, LightCue } from "../light/grades";
import { typeSizePx } from "../type/scale";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { ACTIVATE } from "../../../../shared/pebble/veil";
import { BODY } from "../../../../shared/pebble";
import { place, type MusicGrid } from "./music";
import { breakLines, exitFramesOf, fitPose, frameBox, glideLz, insideFrame, lineHeightOf, lineRect, rectInFrame, zoomAbout, type FrameBox, type TypeBox } from "./frame";
import { TAKE_HSB3, TAKE_RS13, eventFrame, solveInPoint } from "./take";
import { DUSK_CUES } from "./pieces.cues";
import { anchored, carryWith, landFrames, musicHit } from "./kit";
import { move, type MusicHit, type PlaneSpec, type ScenePlan, type TypeSpec } from "./scene";

export const DUSK_TEXT = {
  honest: STEALTH_HONEST,
  label: "A render, not a screen recording.",
} as const;

export interface DuskOptions {
  w: number;
  h: number;
  fps: number;
  grid?: MusicGrid;
  /**
   * L23, the focus line: only when the release session posts that 2.0.0 ships Stealth Lockdown's keyboard-focus fix,
   * worded exactly as 2.0.0's release notes word it (TREATMENT §3.9). Default: out.
   */
  focusLine?: { text: string; releaseNotesConfirmed: true };
  /** a momentum cut into the passage: the previous piece's screen velocity on its last frame (px a frame), its light */
  cutIn?: { vScreen: Vec; grade?: GradeName | Grade };
}

interface DuskLayout {
  /** the honest line's band (functional, broken to fit): a bottom band, or (9:16) a top one the crane never crosses */
  honest: (f: FrameBox) => { left: number; bottom?: number; top?: number; maxW: number; align: "left" | "center" };
  /** where RS-13's Dock and menu bar are framed, clear of the honest line's band */
  stage: (f: FrameBox, band: { top: number; bottom: number }) => Rect;
  /** the palette's region on screen */
  palette: (f: FrameBox) => Rect;
  /** the Veil's centre (frame px) and the label's box beside it, given the body's half-width and half-height (px) */
  veil: (f: FrameBox) => { x: number; y: number };
  label: (f: FrameBox, c: { x: number; y: number }, hw: number, hh: number) => TypeBox;
  /** the way the camera carries the render and its label out of the frame (screen direction of the content): never
   * through the honest line's band */
  craneOut: { x: number; y: number };
}

const LAYOUT: Record<FrameBox["aspect"], DuskLayout> = {
  "16:9": {
    honest: (f) => ({ left: f.safe * 2, bottom: f.h - f.safe * 1.4, maxW: f.w - f.safe * 4, align: "left" }),
    stage: (f, b) => ({ x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: b.top - f.safe * 1.6 }),
    palette: (f) => ({ x: f.w * 0.2, y: f.h * 0.08, w: f.w * 0.6, h: f.h * 0.58 }),
    veil: (f) => ({ x: f.w * 0.34, y: f.h * 0.4 }),
    label: (f, c, hw) => ({ left: c.x + hw + 48 * f.unit, top: c.y - 22 * f.unit, align: "left" }),
    // out of the left edge: the render and its label stay above the honest line's band all the way out
    craneOut: { x: -1, y: 0 },
  },
  "1:1": {
    honest: (f) => ({ left: f.safe * 1.2, bottom: f.h - f.safe * 1.2, maxW: f.w - f.safe * 2.4, align: "left" }),
    stage: (f, b) => ({ x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: b.top - f.safe * 1.6 }),
    palette: (f) => ({ x: f.w * 0.06, y: f.h * 0.07, w: f.w * 0.88, h: f.h * 0.44 }),
    veil: (f) => ({ x: f.w * 0.36, y: f.h * 0.36 }),
    label: (f, c, hw) => ({ left: c.x + hw + 30 * f.unit, top: c.y - 40 * f.unit, align: "left" }),
    craneOut: { x: -1, y: 0 },
  },
  // the tall frame: the honest line in the top band, so the render and its label crane out of the foot without
  // ever crossing it; RS-13 is framed below the band
  "9:16": {
    honest: (f) => ({ left: f.safe * 1.2, top: f.safe * 2, maxW: f.w - f.safe * 2.4, align: "left" }),
    stage: (f, b) => ({ x: f.safe, y: b.bottom + f.safe, w: f.w - 2 * f.safe, h: f.h - b.bottom - 2.2 * f.safe }),
    palette: (f) => ({ x: f.safe * 0.5, y: f.h * 0.24, w: f.w - f.safe, h: f.h * 0.32 }),
    veil: (f) => ({ x: f.w * 0.5, y: f.h * 0.46 }),
    label: (f, c, _hw, hh) => ({ left: 0, top: c.y + hh + 40 * f.unit, width: f.w, align: "center" }),
    // a crane up: down and out of the foot (the honest line is in the top band)
    craneOut: { x: 0, y: 1 },
  },
};

/** The Veil's drawn size (px of its 220-unit viewBox) for a frame: its body 47 % of the height, at most 78 % of the width. */
export const veilSizeFor = (f: FrameBox): number => Math.min((0.47 * f.h) / (BODY.height / 220), (0.78 * f.w) / (BODY.width / 220));

/** The plan of the Dusk passage for one aspect. */
export function planDusk(o: DuskOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const g = o.grid;
  const music: MusicHit[] = [];
  const types: TypeSpec[] = [];
  const lzHold = glideLz(f);
  const centreV = (cam: VelocityCamera, fr: number): Vec => screenVelocity(cam.sample(fr), { x: f.w / 2, y: f.h / 2 }, f.w, f.h);

  /* ------------------------------------------------ S20: ⌘K over the workspace, Enter on a beat ---------------- */
  const palette = TAKE_HSB3;
  const src = (e: string) => Math.ceil((palette.events[e]! * fps) / palette.fps);
  // the take shows from the passage's first frame (the workspace), and the palette opens at least half a second in
  const earliestEnter = src("enter") - src("opens") + f60(30, fps);
  const landEnter = place(earliestEnter, g, { level: "beat", maxWait: Math.max(1, src("enter") - earliestEnter) });
  const enter = landEnter.point ?? earliestEnter;
  music.push(musicHit("Enter (the switch)", landEnter));
  const paletteUse = solveInPoint(palette, "enter", enter, 0, 1, fps);
  const paletteAt = eventFrame(paletteUse, "opens", fps);
  const ws = palette.views.workspace!;
  const pv = palette.views.palette!;
  const workspaceWorld: Rect = { x: 0, y: 0, w: ws.w, h: ws.h };
  // the palette opens in the workspace's upper middle, as a launcher does
  const paletteWorld: Rect = { x: (ws.w - pv.w) / 2, y: 96, w: pv.w, h: pv.h };
  // the typed word and the lit row are read (L20, UI) at ≥ 28 px at 1080; the palette may bleed off the frame's sides
  const paletteTextPx = 15;
  const needZoom = ((28 * f.unit) / paletteTextPx) * 1.03;
  // (the push grows it by up to 12 % before the rack: the row it reads stays inside the frame's margins)
  const rowW = Math.min(paletteWorld.w, (f.w - 2 * f.safe) / needZoom / 1.12);
  const paletteRead: Rect = { x: paletteWorld.x + (paletteWorld.w - rowW) / 2, y: paletteWorld.y, w: rowW, h: 170 };
  const p0fit = fitPose(paletteRead, L.palette(f), f, 0.92);
  const p0: Pose = { ...p0fit, zoom: Math.max(p0fit.zoom, needZoom) };
  const rackAt = enter + f60(48, fps);
  const rackF = f60(36, fps);
  // in with the cut's momentum (a glide, never landing at rest), then the slow push toward the palette
  const vIn: Vec = o.cutIn?.vScreen ?? { x: -3 * f.unit, y: 0 };
  const pushV = zoomAbout(p0, { x: f.w / 2, y: (L.palette(f).y + L.palette(f).h / 2) }, lzHold * 1.2, f);
  // (the glide lands its framing after five time constants: what is left of the cut's speed then is under 1 %)
  const camA = arriveWithMomentum({ target: p0, frames: f60(80, fps), vScreen: vIn, mode: "glide", tau: f60(16, fps), drift: pushV });
  camA.glide(rackAt + rackF, f60(30, fps), pushV);

  /* ------------------------------------------------ the honest line, from just after the Enter ------------------ */
  const hb = L.honest(f);
  const honest = breakLines(DUSK_TEXT.honest, "functional", f, hb.maxW, 0.15);
  const hLines = honest.split("\n").length;
  const hSize = typeSizePx("functional", f.w, f.h, 0.15);
  const honestH = hLines * hSize * lineHeightOf("functional");
  const honestBox: TypeBox = { left: hb.left, top: hb.top ?? hb.bottom! - honestH, align: hb.align };
  const band = { top: honestBox.top, bottom: honestBox.top + honestH };
  // it enters as the rack begins, so it never sits over the palette's sharp rows (the palette defocuses under it)
  const honestAt = enter + f60(48, fps);

  /* ------------------------------------------------ S21: the Veil, rendered, in macro --------------------------- */
  const veilShotAt = rackAt;
  const veilSize = veilSizeFor(f);
  const hw = (BODY.width / 220) * veilSize * 0.5;
  const hh = (BODY.height / 220) * veilSize * 0.5;
  const vc = L.veil(f);
  // the render lives in its own small world: the pebble at the origin, drawn at veilSize; the camera's pose puts it at `vc`
  const veilCentreWorld = { x: 0, y: 0 };
  const veilPose: Pose = { x: veilCentreWorld.x - (vc.x - f.w / 2), y: veilCentreWorld.y - (vc.y - f.h / 2), zoom: 1 };
  const castAt = veilShotAt + rackF + f60(12, fps); // the cast plays once the render is in focus
  const veilShotFrames = sec(7.0, fps);
  // the push in on the render, about its centre, with a slow lateral orbit (2D: a drift with the ground's parallax)
  const orbit = { ...zoomAbout(veilPose, vc, lzHold, f), x: zoomAbout(veilPose, vc, lzHold, f).x + (0.12 * f.unit * 60) / fps };
  const camB = new VelocityCamera({ ...veilPose, zoom: 0.985 }, orbit);
  // the label: beside the render, in its world (TypeSpec.carry): it is on screen exactly as long as the render is
  const labelAt = rackAt + Math.round(rackF * 0.36);
  const labelLand = labelAt + landFrames({ text: DUSK_TEXT.label, tier: "label" }, fps);
  const labelBox = L.label(f, vc, hw, hh);

  /* ------------------------------------------------ the crane out of the render, into RS-13 --------------------- */
  const cutP = place(veilShotAt + veilShotFrames, g, { level: "bar" });
  const cut = cutP.point ?? veilShotAt + veilShotFrames;
  music.push(musicHit("the crane to the Dock", cutP));
  // the camera carries the render and its label out of the frame before the cut, never through the honest line's
  // band: the content accelerates evenly to the cut's speed (§5.3: travel ≤ 30 px a frame) until both are out
  const craneV = 27 * f.unit;
  const dir = L.craneOut;
  // how far the render and its label must travel to clear the frame, measured where the push has put them on the
  // crane's first frame (the render's body about its centre, the label where its world carries it), plus 8 px: the
  // crane ends as the last of them leaves, so the cut follows no stretch of empty ground (CR-19)
  const clearOf = (labelR: Rect, craneFromLocal: number): number => {
    const P = camB.pose(craneFromLocal);
    const c = { x: f.w / 2 + (veilCentreWorld.x - P.x) * P.zoom, y: f.h / 2 + (veilCentreWorld.y - P.y) * P.zoom };
    const k = P.zoom / veilPose.zoom;
    const body = { x: c.x - hw * k, y: c.y - hh * k, w: 2 * hw * k, h: 2 * hh * k };
    const m = carryWith(camB, veilShotAt, labelLand, veilShotAt + craneFromLocal, f.w, f.h);
    const lr = { x: labelR.x * m.k + m.tx, y: labelR.y * m.k + m.ty, w: labelR.w * m.k, h: labelR.h * m.k };
    const reach =
      dir.x < 0
        ? Math.max(body.x + body.w, lr.x + lr.w)
        : dir.x > 0
          ? f.w - Math.min(body.x, lr.x)
          : dir.y > 0
            ? f.h - Math.min(body.y, lr.y)
            : Math.max(body.y + body.h, lr.y + lr.h);
    return reach + 8 * f.unit;
  };
  const craneFor = (labelR: Rect) => {
    // (the crane's start depends on how far the push has grown them by then: a few rounds settle it)
    let craneOut = Math.ceil((clearOf(labelR, veilShotFrames - f60(60, fps)) * 2) / craneV);
    for (let i = 0; i < 4; i++) craneOut = Math.ceil((clearOf(labelR, cut - veilShotAt - 1 - craneOut) * 2) / craneV);
    return { craneOut, craneFrom: cut - veilShotAt - 1 - craneOut };
  };
  // the label is read from its landing until the crane carries it out: in the safe area all that time, while the push
  // grows it about the frame's centre (CR-19's label beside the render, never in the frame's margin)
  const inSafeUntil = (labelR: Rect, untilLocal: number): boolean => {
    for (let fr = labelLand; fr < veilShotAt + untilLocal; fr += 3) {
      const m = carryWith(camB, veilShotAt, labelLand, fr, f.w, f.h);
      if (!insideFrame({ x: labelR.x * m.k + m.tx, y: labelR.y * m.k + m.ty, w: labelR.w * m.k, h: labelR.h * m.k }, f, f.safe)) return false;
    }
    return true;
  };
  let labelMaxW = A === "9:16" ? f.w - 2 * f.safe : f.w - labelBox.left - f.safe;
  let label = breakLines(DUSK_TEXT.label, "label", f, labelMaxW, 0.4);
  let crane = craneFor(lineRect(label, "label", f, labelBox, 0.4));
  for (let i = 0; i < 8 && !inSafeUntil(lineRect(label, "label", f, labelBox, 0.4), crane.craneFrom); i++) {
    labelMaxW *= 0.88;
    label = breakLines(DUSK_TEXT.label, "label", f, labelMaxW, 0.4);
    crane = craneFor(lineRect(label, "label", f, labelBox, 0.4));
  }
  const { craneOut, craneFrom } = crane;
  if (craneFrom < f60(150, fps)) throw new Error(`the Veil needs ${f60(150, fps) - craneFrom} more frames before its crane (the render is seen first)`);
  camB.glide(craneFrom, f60(40, fps), orbit);
  const pB = camB.pose(craneFrom);
  const vB = camB.sample(craneFrom).vel;
  // the camera moves against the content's direction: content leaving left means the camera moves right
  const travel = (craneV * craneOut) / 2 / pB.zoom;
  camB.hermite(cut - veilShotAt - 1, { x: pB.x - dir.x * travel + vB.x * craneOut * (dir.x === 0 ? 1 : 0), y: pB.y - dir.y * travel + vB.y * craneOut * (dir.y === 0 ? 1 : 0), zoom: pB.zoom * Math.exp(vB.lz * craneOut) }, { x: dir.x === 0 ? vB.x : (-dir.x * craneV) / pB.zoom, y: dir.y === 0 ? vB.y : (-dir.y * craneV) / pB.zoom, lz: vB.lz });

  /* ------------------------------------------------ S22: the Dock, then the menu bar ---------------------------- */
  const desk: Rect = { x: 0, y: 0, w: 1440, h: 900 };
  const menuBar: Rect = { x: 0, y: 0, w: TAKE_RS13.views.menuBar!.w, h: TAKE_RS13.views.menuBar!.h };
  const dock: Rect = { x: (desk.w - TAKE_RS13.views.dock!.w) / 2, y: desk.h - TAKE_RS13.views.dock!.h - 8, w: TAKE_RS13.views.dock!.w, h: TAKE_RS13.views.dock!.h };
  // the Dock and the menu bar are framed clear of the honest line's band
  const upper: Rect = L.stage(f, band);
  // the Dock in the band's upper half, so the crane up from it never carries it into the honest line's band
  const dockPose = fitPose(dock, { ...upper, h: upper.h * 0.55 }, f, 0.8);
  // the menu bar at 3.5× (the icon, 22 CSS px, reads at 77 px at 1080), on the status menus where Pebble's icon sits
  const iconAt = { x: menuBar.w * 0.78, y: menuBar.h / 2 };
  const menuZoom = 3.5 * f.unit;
  const menuPose: Pose = { x: iconAt.x - (upper.x + upper.w * 0.5 - f.w / 2) / menuZoom, y: iconAt.y - (upper.y + upper.h * 0.42 - f.h / 2) / menuZoom, zoom: menuZoom };
  const vOut1 = centreV(camB, cut - veilShotAt - 1);
  const holdDrift = (pose: Pose) => ({ x: 0, y: (-0.4 * f.unit * 60) / fps / pose.zoom, lz: 0 });
  const camC = arriveWithMomentum({ target: dockPose, frames: f60(40, fps), vScreen: vOut1, mode: "glide", tau: f60(15, fps), drift: holdDrift(dockPose) });
  // the Dock icon leaves on a beat while the camera is at the Dock
  const dockP = place(cut + f60(40, fps), g, { level: "beat" });
  const dockAt = dockP.point ?? cut + f60(40, fps);
  music.push(musicHit("the Dock icon leaves", dockP));
  const rsUse = solveInPoint(TAKE_RS13, "dockLeaves", dockAt, cut, cut + sec(14, fps), fps);
  const iconChange = eventFrame(rsUse, "iconChanges", fps);
  // then up again, accelerating, and a momentum cut on a beat into the crane's last stretch: the empty middle of the
  // desktop is skipped (CR-19), the take running on at 1× across the cut (the same recording, two framings)
  // (a UI shot holds at least 2 s)
  const cut2Earliest = Math.max(dockAt + f60(36, fps), iconChange + 2, cut + sec(2.0, fps));
  const cut2P = place(cut2Earliest, g, { level: "beat" });
  const cut2 = cut2P.point ?? cut2Earliest;
  music.push(musicHit("the cut to the menu bar", cut2P));
  // the crane up accelerates into the cut while the Dock is still in frame and clear of the honest line's band (the
  // content moves down: in 16:9 and 1:1 the band is below the Dock, so the crane is short and the cut comes before the
  // Dock reaches it; CR-19: the crane passed empty ground, then the Dock ran under the honest line)
  const upV = 18 * f.unit;
  const lastLocal = cut2 - cut - 1;
  const dockOn = (local: number) => rectInFrame(dock, camC.pose(local), f);
  const bandBelow = band.top > f.h / 2;
  const room = (local: number) => (bandBelow ? band.top - 16 * f.unit - (dockOn(local).y + dockOn(local).h) : f.h - 24 * f.unit - dockOn(local).y);
  const minStart = dockAt - cut + f60(8, fps);
  let upFrom = minStart;
  // the crane's travel is upV × its frames ÷ 2: start it as late as its room allows (at least 20 frames of crane)
  for (let i = 0; i < 4; i++) {
    const upFi = Math.max(f60(20, fps), Math.floor((2 * Math.max(0, room(upFrom))) / upV));
    upFrom = Math.max(minStart, lastLocal - upFi);
  }
  const upF = lastLocal - upFrom;
  camC.glide(upFrom, f60(20, fps), holdDrift(dockPose));
  const pC = camC.pose(upFrom);
  camC.hermite(lastLocal, { x: pC.x, y: pC.y - ((upV * upF) / 2) / pC.zoom, zoom: pC.zoom }, { x: 0, y: -upV / pC.zoom, lz: 0 });
  const vOut2 = centreV(camC, cut2 - cut - 1);
  const camD = arriveWithMomentum({ target: menuPose, frames: f60(80, fps), vScreen: vOut2, mode: "glide", tau: f60(16, fps), drift: { x: (0.4 * f.unit * 60) / fps / menuZoom, y: 0, lz: lzHold * 0.3 } });
  const arriveMenu = cut2 + f60(80, fps);

  /* ------------------------------------------------ the honest line's hold, and the end ------------------------- */
  const focus = o.focusLine;
  if (focus && focus.releaseNotesConfirmed !== true) throw new Error("L23 is out until the release session confirms 2.0.0 ships the focus fix");
  const leaveF = f60(18, fps);
  const honestEarliestOff = Math.max(honestAt + sec(12.2, fps), arriveMenu + sec(1.6, fps) + (focus ? sec(2, fps) : 0));
  const endEarliest = honestEarliestOff + exitFramesOf("lineBlur", "blur", honest, fps) + 2;
  const endP = place(Math.max(endEarliest, honestEarliestOff + leaveF + 2), g, { level: "bar" });
  const end = endP.point ?? Math.max(endEarliest, honestEarliestOff + leaveF + 2);
  music.push(musicHit("the passage ends (the climax's build)", endP));
  const honestExit = end - 1 - leaveF;
  types.push({ id: "L21", text: honest, tier: "functional", at: honestAt, exitAt: honestExit, sizeT: 0.15, box: honestBox, kind: "film", honest: true });
  // the label beside the render, carried with its world: it leaves the frame with the render on the crane
  types.push({ id: "L22", text: label, tier: "label", at: labelAt, exitAt: cut, sizeT: 0.4, box: labelBox, kind: "label", color: COLOR.ink2, exit: "camera", carry: { shot: "dusk-veil", at: labelLand, outFrom: veilShotAt + craneFrom } });
  if (focus) {
    types.push({ id: "L23", text: breakLines(focus.text, "functional", f, hb.maxW, 0.15), tier: "functional", at: arriveMenu + sec(1.6, fps), exitAt: arriveMenu + sec(3.6, fps), sizeT: 0.15, box: { left: honestBox.left, top: honestBox.top - hSize * 2.4, align: "left" }, kind: "film" });
  }
  // the menu bar's hold drifts on, then leaves on an E-leave into the climax's cut
  const menuDrift = { x: (0.4 * f.unit * 60) / fps / menuZoom, y: 0, lz: lzHold * 0.3 };
  camD.glide(honestExit - cut2, f60(30, fps), menuDrift);
  const pD = camD.pose(honestExit - cut2);
  camD.ease(end - cut2 - 1, { x: pD.x + (118 * f.unit) / pD.zoom, y: pD.y, zoom: pD.zoom }, "E-leave");

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const paletteUseAll = solveInPoint(palette, "enter", enter, 0, rackAt + rackF, fps);
  const planesA: PlaneSpec[] = [
    { id: "workspace", kind: "pebble", rect: workspaceWorld, content: { kind: "take", use: paletteUseAll, view: "workspace" }, shadow: true },
    { id: "palette", kind: "pebble", rect: paletteWorld, content: { kind: "take", use: paletteUseAll, view: "palette" }, shadow: true, read: { from: paletteAt + f60(84, fps), to: enter + f60(30, fps), words: 5, textPx: paletteTextPx, rect: paletteRead } },
  ];
  const planesC: PlaneSpec[] = [{ id: "dock", kind: "apple", rect: dock, content: { kind: "take", use: rsUse, view: "dock" }, shadow: false, radius: 18, textless: true }];
  const planesD: PlaneSpec[] = [
    { id: "menu-bar", kind: "apple", rect: menuBar, content: { kind: "take", use: rsUse, view: "menuBar" }, shadow: false, radius: 0 },
    { id: "dock", kind: "apple", rect: dock, content: { kind: "take", use: rsUse, view: "dock" }, shadow: false, radius: 18, textless: true },
  ];
  const veilSwitchS = castAt / fps;
  // the light cools continuously through S20 into the Veil: day to dusk is about 0.2 of luminance on the ground, and
  // the film allows one large (0.1) change a second, so on E-move (its peak 1.82× the mean) it takes at least 4 s
  const lightInitial = o.cutIn?.grade ?? "day";
  const lightCues: LightCue[] = [{ at: 0, to: "dusk", frames: sec(6.1, fps) }];

  return {
    id: "dusk",
    name: `Dusk ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      { id: "dusk-palette", from: 0, to: rackAt, kind: "ui", camera: camA, ref: p0, ground: "riverbed", planes: planesA, rings: [], dofScale: 10 },
      {
        id: "dusk-veil",
        from: rackAt,
        to: cut,
        kind: "cutscene",
        camera: camB,
        ref: veilPose,
        ground: "riverbed",
        planes: [],
        rings: [],
        stone: { at: veilCentreWorld, r: veilSize * 0.3, size: veilSize, cues: anchored(DUSK_CUES, 0, "the Veil's cues"), veil: [{ at: veilSwitchS, on: true }] },
        dofScale: 18,
        focus: () => 1,
      },
      { id: "dusk-dock", from: cut, to: cut2, kind: "ui", camera: camC, ref: dockPose, ground: "riverbed", planes: planesC, rings: [], dofScale: 10 },
      { id: "dusk-menubar", from: cut2, to: end, kind: "ui", camera: camD, ref: dockPose, ground: "riverbed", planes: planesD, rings: [], dofScale: 10 },
    ],
    seams: [
      { at: rackAt, kind: "rack", frames: rackF, out: "dusk-palette", in: "dusk-veil", presentation: "rack", blurPx: 13, swapAt: rackAt + Math.round(rackF / 2), covered: { from: rackAt + Math.round(rackF * 0.36), to: rackAt + Math.round(rackF * 0.64) } },
      { at: cut, kind: "momentum", frames: 0, out: "dusk-veil", in: "dusk-dock" },
      { at: cut2, kind: "momentum", frames: 0, out: "dusk-dock", in: "dusk-menubar" },
    ],
    types,
    lightInitial,
    lightCues,
    leaks: [],
    hits: [],
    takes: [paletteUseAll, rsUse],
    music,
    moves: [
      move("product", paletteAt, rackAt - paletteAt, "HS-B3: the palette's own entrance, typing and Enter"),
      move("push", 0, Math.min(rackAt + rackF, f60(240, fps)), "S20: the slow push-in (then a glide)"),
      move("light", 0, sec(6.1, fps), "the light cools to dusk"),
      move("push", rackAt, Math.min(craneFrom, f60(240, fps)), "S21: the push in on the render (then a glide)"),
      move("product", cut, end - cut, "RS-13: the Dock icon leaves, the menu-bar icon changes"),
    ],
    exit: { pose: camD.pose(end - cut2), vel: camD.sample(end - cut2).vel, shot: "dusk-menubar", ref: dockPose, grade: "dusk" },
    extra: {
      enter,
      paletteAt,
      honestAt,
      honestExit,
      honestS: (honestExit - honestAt) / fps,
      castAt,
      castEnd: castAt + Math.round(ACTIVATE * fps),
      cut,
      cut2,
      craneFrom: craneFrom + veilShotAt,
      dockAt,
      iconAt: iconChange,
      arriveMenu,
      veilSize,
      veilBody: { w: hw * 2, h: hh * 2 },
      labelRect: lineRect(label, "label", f, labelBox, 0.4),
      menuZoom,
    },
  };
}
