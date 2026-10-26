// THE DUSK PASSAGE (TREATMENT §3.5 S20–S22, §3.7 H7, OVERRIDES §21 and §49): Stealth Lockdown, the film's quiet passage.
//   S20  ⌘K: the palette opens (the product's own entrance), "stealth" is typed, the row "Turn Stealth Lockdown on"
//        lights, Enter, which lands on a beat (HS-B3's in-point is solved for it); a slow push-in; the light cools to
//        dusk, continuously (the Veil's dusk blue is allowed inside this passage only)
//   S21  a rack focus into the cut scene "Dusk": the Veil RENDERED with Pebble's own code (stealthVeil.ts), in macro,
//        with a slow orbit of 10° or less; beside it, on every frame the render shows, "A render, not a screen
//        recording." (L22)
//   S22  a momentum cut into a crane up (RS-13): the Dock icon leaves, the menu-bar icon becomes a filled pebble in a
//        ring; the icon's change lands on a beat
//   L21  the honest line, word for word (STEALTH_HONEST), from just after the Enter to the passage's end, held ≥ 12 s
//        (it needs 9): in a fixed band, across the rack and the cut. Never "undetectable" or "invisible"; no light
//        sweep, rim or leak while it shows; no focus claim unless 2.0.0's release notes confirm it (L23, default out)
// The passage ends on a bar line (the climax's build).
// Pure data.
import { COLOR, f60, sec } from "../tokens";
import { VelocityCamera, type Pose } from "../motion/camera";
import { momentumCut } from "../transitions/momentum";
import type { Rect } from "../motion/geometry";
import type { LightCue } from "../light/grades";
import { typeSizePx } from "../type/scale";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { ACTIVATE } from "../../../../shared/pebble/veil";
import { place, type MusicGrid } from "./music";
import { breakLines, exitFramesOf, fitPose, frameBox, lineHeightOf, type FrameBox, type TypeBox } from "./frame";
import { TAKE_HSB3, TAKE_RS13, eventFrame, solveInPoint } from "./take";
import { DUSK_CUES } from "./pieces.cues";
import { anchored, musicHit } from "./kit";
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
}

interface DuskLayout {
  /** the honest line's band (functional, broken to fit) */
  honest: (f: FrameBox) => { left: number; bottom: number; maxW: number; align: "left" | "center" };
  /** the palette's region on screen */
  palette: (f: FrameBox) => Rect;
  /** the Veil's region, and the label's box beside it */
  veil: (f: FrameBox) => Rect;
  label: (f: FrameBox, veil: Rect) => TypeBox;
}

const LAYOUT: Record<FrameBox["aspect"], DuskLayout> = {
  "16:9": {
    honest: (f) => ({ left: f.safe * 2, bottom: f.h - f.safe * 1.4, maxW: f.w - f.safe * 4, align: "left" }),
    palette: (f) => ({ x: f.w * 0.25, y: f.h * 0.1, w: f.w * 0.5, h: f.h * 0.5 }),
    veil: (f) => ({ x: f.w * 0.16, y: f.h * 0.08, w: f.w * 0.36, h: f.h * 0.6 }),
    label: (f, v) => ({ left: v.x + v.w + 40 * f.unit, top: v.y + v.h * 0.46, align: "left" }),
  },
  "1:1": {
    honest: (f) => ({ left: f.safe * 1.2, bottom: f.h - f.safe * 1.2, maxW: f.w - f.safe * 2.4, align: "left" }),
    palette: (f) => ({ x: f.w * 0.1, y: f.h * 0.08, w: f.w * 0.8, h: f.h * 0.42 }),
    veil: (f) => ({ x: f.w * 0.08, y: f.h * 0.06, w: f.w * 0.46, h: f.h * 0.46 }),
    label: (f, v) => ({ left: v.x + v.w + 24 * f.unit, top: v.y + v.h * 0.44, align: "left" }),
  },
  "9:16": {
    honest: (f) => ({ left: f.safe * 1.2, bottom: f.h - f.safe * 2, maxW: f.w - f.safe * 2.4, align: "left" }),
    palette: (f) => ({ x: f.safe, y: f.h * 0.16, w: f.w - 2 * f.safe, h: f.h * 0.3 }),
    veil: (f) => ({ x: f.w * 0.18, y: f.h * 0.1, w: f.w * 0.64, h: f.h * 0.36 }),
    label: (f, v) => ({ left: 0, top: v.y + v.h + 30 * f.unit, width: f.w, align: "center" }),
  },
};

/** The plan of the Dusk passage for one aspect. */
export function planDusk(o: DuskOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const g = o.grid;
  const music: MusicHit[] = [];
  const types: TypeSpec[] = [];

  /* ------------------------------------------------ S20: ⌘K, Enter on a beat ------------------------------------ */
  const palette = TAKE_HSB3;
  const enterSrc = palette.events.enter!;
  const earliestEnter = Math.ceil((enterSrc * fps) / palette.fps);
  const landEnter = place(earliestEnter, g, { level: "beat" });
  const enter = landEnter.point ?? earliestEnter;
  music.push(musicHit("Enter (the switch)", landEnter));
  const paletteAt = enter - Math.floor((enterSrc * fps) / palette.fps);
  const paletteWorld: Rect = { x: 0, y: 0, w: palette.views.palette!.w, h: palette.views.palette!.h };
  // the typed word and the lit row are read (L20, UI): at ≥ 28 px at 1080; the palette may bleed off the frame's sides
  const paletteTextPx = 15;
  const needZoom = ((28 * f.unit) / paletteTextPx) * 1.03;
  const rowW = Math.min(paletteWorld.w, (f.w - 2 * f.safe) / needZoom);
  const paletteRead: Rect = { x: 0, y: 0, w: rowW, h: 170 };
  const p0fit = fitPose(paletteRead, L.palette(f), f, 0.92);
  const p0: Pose = { ...p0fit, zoom: Math.max(p0fit.zoom, needZoom) };
  const rackAt = enter + f60(48, fps);
  const rackF = f60(36, fps);
  const camA = new VelocityCamera({ ...p0, zoom: p0.zoom * 0.985 }, { lz: 0.00012 });
  camA.ease(rackAt + rackF, { ...p0, zoom: p0.zoom * 1.06 }, "E-move");

  /* ------------------------------------------------ the honest line, from just after the Enter ------------------ */
  const hb = L.honest(f);
  const honest = breakLines(DUSK_TEXT.honest, "functional", f, hb.maxW, 0.15);
  const hLines = honest.split("\n").length;
  const hSize = typeSizePx("functional", f.w, f.h, 0.15);
  const honestBox: TypeBox = { left: hb.left, top: hb.bottom - hLines * hSize * lineHeightOf("functional"), align: hb.align };
  // it enters as the rack begins, so it never sits over the palette's sharp rows (the palette defocuses under it)
  const honestAt = enter + f60(48, fps);

  /* ------------------------------------------------ S21: the Veil, rendered ------------------------------------- */
  const veilShotAt = rackAt;
  const veilRect = L.veil(f);
  // the render lives in its own small world: the pebble at the origin, sized to fill the Veil's region
  const veilSize = Math.min(veilRect.w, veilRect.h) * 0.92;
  const veilCentreWorld = { x: 0, y: 0 };
  const veilPose: Pose = { x: veilCentreWorld.x - (veilRect.x + veilRect.w / 2 - f.w / 2), y: veilCentreWorld.y - (veilRect.y + veilRect.h / 2 - f.h / 2), zoom: 1 };
  const castAt = veilShotAt + rackF + f60(12, fps); // the cast plays once the render is in focus
  const veilShotFrames = sec(7.0, fps);
  // a slow orbit, as a lateral arc with the ground's parallax (the render is 2D): about 0.35 px a frame, breathing in
  const orbitDrift = { x: (0.35 * 60) / fps, lz: 0.00014 };
  const camB = new VelocityCamera({ ...veilPose, zoom: 0.97 }, orbitDrift);
  const labelBox = L.label(f, veilRect);
  const label = breakLines(DUSK_TEXT.label, "label", f, A === "9:16" ? f.w - 2 * f.safe : f.w - labelBox.left - f.safe, 0.4);

  /* ------------------------------------------------ S22: the crane to the menu bar (a momentum cut, on a bar) ---- */
  const cutP = place(veilShotAt + veilShotFrames, g, { level: "bar" });
  const cut = cutP.point ?? veilShotAt + veilShotFrames;
  music.push(musicHit("the cut to the menu bar", cutP));
  const desk: Rect = { x: 0, y: 0, w: 1440, h: 900 };
  const menuBar: Rect = { x: 0, y: 0, w: TAKE_RS13.views.menuBar!.w, h: TAKE_RS13.views.menuBar!.h };
  const dock: Rect = { x: (desk.w - TAKE_RS13.views.dock!.w) / 2, y: desk.h - TAKE_RS13.views.dock!.h - 8, w: TAKE_RS13.views.dock!.w, h: TAKE_RS13.views.dock!.h };
  // the Dock and the menu bar are framed in the frame's upper part, above the honest line's band
  const upper: Rect = { x: f.safe, y: f.safe, w: f.w - 2 * f.safe, h: honestBox.top - f.safe * 1.6 };
  const dockPose = fitPose({ ...dock, y: dock.y - 160, h: dock.h + 200 }, upper, f, 0.9);
  const menuPose = fitPose({ x: menuBar.x + menuBar.w * 0.45, y: 0, w: menuBar.w * 0.55, h: 240 }, upper, f, 0.9);
  camB.glide(cut - veilShotAt - 1 - f60(18, fps), f60(60, fps), orbitDrift);
  const seam = momentumCut({ out: camB, cutFrame: cut - veilShotAt, dir: { x: 0, y: 1 }, dPx: 120 * f.unit, leaveFrames: f60(18, fps), target: dockPose, inFrames: f60(40, fps), frameW: f.w, frameH: f.h, fps });
  const camC = seam.inCam;
  // the Dock icon leaves on a beat while the camera is at the Dock; the crane then rises to the menu bar and arrives on
  // the icon's new state (the change itself, a third of a second later in reality, happens on the way up)
  const craneFrom = f60(48, fps);
  const craneFrames = f60(150, fps);
  const dockP = place(cut + f60(30, fps), g, { level: "beat" });
  const dockAt = dockP.point ?? cut + f60(30, fps);
  music.push(musicHit("the Dock icon leaves", dockP));
  const rsUse = solveInPoint(TAKE_RS13, "dockLeaves", dockAt, cut, cut + sec(14, fps), fps);
  const iconAt = eventFrame(rsUse, "iconChanges", fps);
  const craneStart = Math.max(craneFrom, dockAt - cut + f60(20, fps));
  camC.glide(craneStart, f60(20, fps), { y: (-0.2 * 60) / fps / dockPose.zoom });
  camC.hermite(craneStart + craneFrames, menuPose, { y: (-0.4 * 60) / fps / menuPose.zoom, lz: -0.00008 });
  const arriveMenu = cut + craneStart + craneFrames;

  /* ------------------------------------------------ the honest line's hold, and the end ------------------------- */
  const focus = o.focusLine;
  if (focus && focus.releaseNotesConfirmed !== true) throw new Error("L23 is out until the release session confirms 2.0.0 ships the focus fix");
  const honestEarliestOff = Math.max(honestAt + sec(12.2, fps), arriveMenu + sec(1.6, fps) + (focus ? sec(2, fps) : 0));
  const endP = place(honestEarliestOff + exitFramesOf("lineBlur", "blur", honest, fps) + 2, g, { level: "bar" });
  const end = endP.point ?? honestEarliestOff + exitFramesOf("lineBlur", "blur", honest, fps) + 2;
  music.push(musicHit("the passage ends (the climax's build)", endP));
  const honestExit = end - exitFramesOf("lineBlur", "blur", honest, fps) - 2;
  types.push({ id: "L21", text: honest, tier: "functional", at: honestAt, exitAt: honestExit, sizeT: 0.15, box: honestBox, kind: "film", honest: true });
  // the label is beside the render on every frame it shows: from the rack's cross (the render appears) to the cut
  types.push({ id: "L22", text: label, tier: "label", at: rackAt + Math.round(rackF * 0.36), exitAt: cut - exitFramesOf("lineBlur", "blur", label, fps) - 1, sizeT: 0.4, box: labelBox, kind: "label", color: COLOR.ink2 });
  if (focus) {
    types.push({ id: "L23", text: breakLines(focus.text, "functional", f, hb.maxW, 0.15), tier: "functional", at: arriveMenu + sec(1.6, fps), exitAt: arriveMenu + sec(3.6, fps), sizeT: 0.15, box: { left: honestBox.left, top: honestBox.top - hSize * 2.4, align: "left" }, kind: "film" });
  }
  camC.glide(end - cut, f60(40, fps), { y: (-0.35 * 60) / fps / menuPose.zoom, lz: -0.00006 });

  /* ------------------------------------------------ planes ----------------------------------------------------- */
  const paletteUse = solveInPoint(palette, "enter", enter, paletteAt, rackAt + rackF, fps);
  const planesA: PlaneSpec[] = [
    { id: "palette", kind: "pebble", rect: paletteWorld, content: { kind: "take", use: paletteUse, view: "palette" }, shadow: true, from: paletteAt, enterAt: paletteAt, enterKind: "fade", read: { from: paletteAt + f60(84, fps), to: enter + f60(30, fps), words: 5, textPx: paletteTextPx, rect: paletteRead } },
  ];
  const planesC: PlaneSpec[] = [
    { id: "menu-bar", kind: "apple", rect: menuBar, content: { kind: "take", use: rsUse, view: "menuBar" }, shadow: false, radius: 0 },
    { id: "dock", kind: "apple", rect: dock, content: { kind: "take", use: rsUse, view: "dock" }, shadow: false, radius: 18, textless: true },
  ];
  const veilSwitchS = castAt / fps;
  // the light cools continuously through S20 into the Veil: day to dusk is about 0.3 of luminance, and the film allows
  // one large (0.1) change a second, so on E-move (its peak 1.82× the mean) it takes at least 5.9 s
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
      { id: "dusk-menubar", from: cut, to: end, kind: "ui", camera: camC, ref: dockPose, ground: "riverbed", planes: planesC, rings: [], dofScale: 10 },
    ],
    seams: [
      { at: rackAt, kind: "rack", frames: rackF, out: "dusk-palette", in: "dusk-veil", presentation: "rack", blurPx: 13, swapAt: rackAt + Math.round(rackF / 2), covered: { from: rackAt + Math.round(rackF * 0.36), to: rackAt + Math.round(rackF * 0.64) } },
      { at: cut, kind: "momentum", frames: 0, out: "dusk-veil", in: "dusk-menubar" },
    ],
    types,
    lightInitial: "day",
    lightCues,
    leaks: [],
    hits: [],
    takes: [paletteUse, rsUse],
    music,
    moves: [
      move("product", paletteAt, rackAt - paletteAt, "HS-B3: the palette's own entrance, typing and Enter"),
      move("push", 0, rackAt + rackF, "S20: the slow push-in"),
      move("light", 0, sec(6.1, fps), "the light cools to dusk"),
      move("product", cut, end - cut, "RS-13: the Dock icon leaves, the menu-bar icon changes"),
    ],
    extra: { enter, honestAt, honestExit, honestS: (honestExit - honestAt) / fps, castAt, castEnd: castAt + Math.round(ACTIVATE * fps), cut, dockAt, iconAt, arriveMenu, veilRect, veilSize },
  };
}
