// S02 "Lives on your Mac" (Desktop world), 6.5 s nominal (FIXES-1: 13.551–20.051 on the master).
//
// One screen, three takes, the pebble on the same spot in all of them (≈ 2750, 1620 of the 2940 × 1912 screen), on a
// soft blur of the Mac's own wallpaper (REVIEW-1 S3, BANNED "windows on a dark blur"):
// 0.0  RS11-02: the match from S01's sage. The screen starts scaled up about the real companion pebble, centred and
//      sharp (take px at 1.8× at most: REVIEW-1 S4), and settles to the whole Mac at 1.0×: the menu bar (its right end,
//      the clock, masked), Pebble's window, Pebble's own folder in Finder, the Dock. "It lives on your Mac." (≥ 2 s).
// 2.9  The Spaces swipe (REVIEW-4 S-1), on its first frame: one framing from the pull-back to the end of the shot, the
//      whole screen in the same window at the same scale (the same slow drift about the pebble's spot). Finder's Space
//      (shot A's own frame) leaves to the left, the black gap between two Spaces crosses, and Chrome's Space (RS1-03)
//      arrives, on RS1-03's own measured slide played at 0.6×, with a motion blur of the move's own length (a 180°
//      shutter, 55 px at most). The pebble does what it does in the take: it hides as the swipe starts and rides in
//      with the new Space to the same spot. "On every Space." lands on the swipe's first frame.
// 4.5  RS15-01 (cut on the downbeat): close on the pebble; the pointer, the click, the quick chat opens; a push onto
//      its input as "What can you do now?" is typed, held whole ≥ 1.0 s, sent (Return, "Sending"). "Click. Ask."
//      The scene ends on the send with the out half of a whip; S03 opens with the in half and its answer.
//
// Every frame inside the screen is a real frame of a take (time maps choose frames; nothing is drawn on Pebble's UI
// except masks over hazards).
import { useId } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { eventS, TAKES } from "../../data/takes";
import { useLayout, type Layout } from "../../layout";
import { fromRamps, realTime, type TimeMap } from "../../timeMap";
import { EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { DesktopGround, EdgeWhip, INK, lerp, MaskedZoom, R, ramp, sfxAt, sfxSrc, useSceneTime, ZoomAbout, type Mask, type SfxNote } from "./kit";

export const S02_NOMINAL = 6.5;

const SRC = { w: 2940, h: 1912 };
const A = TAKES["RS11-02"];
const B = TAKES["RS1-03"];
const C = TAKES["RS15-01"];

/**
 * shot starts, scene seconds at nominal (the master's beats fall on 13.551 + 0.5k: 2.0 a beat, 4.5 a downbeat); see
 * B_TIME for where the slide sits between them (the flash scan).
 */
const AT = { b: 2.9, c: 4.5 } as const;
/** the first caption leaves just before the swipe (it sits under the screen, never over a picture) */
const CAPTION_A_EXIT = 2.64;
/** the opening pull-back from the pebble to the whole Mac */
const PULL_S = 0.85;
const WHIP_S = 0.14;

/** RS11-02's companion pebble: body centre and width, source px */
const PEBBLE = { x: 2750, y: 1621, w: 173 };
/** the opening pebble's sharpness: take px shown at this many frame px (REVIEW-1 S4: 2× or less; 1.5 keeps the pull-back's sweep short) */
// The director (draft 3 prep): 1.2, not 1.5: a shorter sweep for the Dock's icons (the strictest flash binding failed by
// one transition at 1.5; a longer pull-back made it worse). S01's three sage frames hide the scale at the match.
const OPEN_MAG = 1.2;

/* ---------- the takes' time maps and masks ---------- */

const A_TIME = realTime(0.6); // a still tour shot: the pointer barely moves
/** shot B: the whole screen, as shot A shows the Mac (the file path and the dated kicker are masked) */
const B_BOX: Box = { x: 0, y: 0, w: 2940, h: 1912 };

/*
 * The swipe (REVIEW-4 S-1). RS1-03 was recorded from the full-screen poster's Space, and its slide updates about 20
 * times a second, so its own frames can't show Finder's Space leaving and judder when slowed. The slide is composed
 * of real frames moved along the take's own measured curve: shot A's frame of the desktop leaves, and Chrome's Space
 * arrives as RS1-03 shows it the moment the slide ends (f266–f271 are one picture), then the take runs on. Nothing is
 * drawn but the black gap macOS leaves between two Spaces.
 */
/** the pebble on its spot, the page 4 px from home, the stray pointer still a crosshair (f266–f271: one picture) */
const B_HOLD = 4.45;
/**
 * RS1-03's slide, measured off the black gap between its Spaces in each frame (f239–f266): Chrome's Space comes in
 * from the right on an exponential settle from 3.986 s, time constant 0.096 s (rms 30 take px against the 14 measured
 * positions), and rests 4 px from home at f266 (4.433), as the take does (it snaps home on f272). macOS leaves a
 * 125-px black gap between two Spaces (the take's dark run is that gap plus the poster's own 53-px black bar).
 */
const SLIDE = { s0: 3.986, tc: 0.096, end: eventS("RS1-03", "pebbleSettled"), rest: 4, gap: 125 } as const;
const SLIDE_FROM = SRC.w + SLIDE.gap; // Chrome's Space's left edge before the slide: the gap just off the screen
const SLIDE_NORM = 1 - Math.exp(-(SLIDE.end - SLIDE.s0) / SLIDE.tc);
/** Chrome's Space's left edge on the screen at take second `s`, take px (the leaving Space ends a gap to its left) */
const spaceEdge = (s: number) => {
  const p = s <= SLIDE.s0 ? 0 : s >= SLIDE.end ? 1 : (1 - Math.exp(-(s - SLIDE.s0) / SLIDE.tc)) / SLIDE_NORM;
  return SLIDE_FROM - (SLIDE_FROM - SLIDE.rest) * p;
};
/**
 * The swipe's clock: the take's second at output second `u` after the swipe's first frame. The slide plays at 0.6×;
 * the speed eases in over 0.2 s from 0.05 s before that frame, so the move and its blur build over three frames
 * (never a cut from a sharp frame into a smear), and after the take's last step (4.533: the page home, the pointer an
 * arrow) it eases into real time.
 */
const SWIPE = { speed: 0.6, rampIn: 0.2, lead: 0.05, slowTo: 4.533, rampOut: 0.15 } as const;
const smoothInt = (x: number) => x * x * x - (x * x * x * x) / 2; // ∫ smoothstep from 0 (1/2 at 1)
const swipeAt = (u: number): number => {
  const { speed: v, rampIn: r1, lead, slowTo, rampOut: r2 } = SWIPE;
  const tau = u + lead;
  if (tau <= 0) return SLIDE.s0;
  if (tau < r1) return SLIDE.s0 + v * r1 * smoothInt(tau / r1);
  const t2 = r1 / 2 + (slowTo - SLIDE.s0) / v;
  if (tau < t2) return SLIDE.s0 + v * (tau - r1 / 2);
  if (tau < t2 + r2) return slowTo + v * (tau - t2) + (1 - v) * r2 * smoothInt((tau - t2) / r2);
  return slowTo + v * r2 + ((1 - v) * r2) / 2 + (tau - t2 - r2);
};
const swipeInv = (s: number): number => {
  let lo = -SWIPE.lead;
  let hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (swipeAt(mid) < s) lo = mid;
    else hi = mid;
  }
  return hi;
};
/** a time map from a function of output seconds (the swipe's layers; ScreenZoom reads only `at`) */
const mapOf = (at: (t: number) => number): TimeMap => ({
  at,
  inv: (src) => {
    let lo = 0;
    let hi = 10;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid) < src) lo = mid;
      else hi = mid;
    }
    return hi;
  },
  speed: (t) => (at(t + 0.005) - at(t - 0.005)) / 0.01,
  knots: [],
});
/** the blur's longest length, frame px at 1080 (REVIEW-4 S-1: half the move per output frame, never more than 55 px) */
const SWIPE_BLUR_MAX = 55;
/** the Gaussian's sigma for a blur of that length: the sigma of a box blur that long (1/√12 of it) */
const SIGMA_PER_LENGTH = 1 / Math.sqrt(12);
/** the leaving desktop's pebble hides as the swipe starts, as Pebble does in RS1-03 (f237): Pebble's window ground under it */
const PEBBLE_HIDES: Mask = { box: { x: 2652, y: 1532, w: 202, h: 184 }, s0: 0, s1: 99, kind: "fill", fill: "rgb(18, 24, 22)" };
const C_CLICK = eventS("RS15-01", "click");
const C_PANEL = eventS("RS15-01", "panelOpens");
const C_TYPE = eventS("RS15-01", "typeW");
const C_DONE = eventS("RS15-01", "typeQuestionMark");
const C_RETURN = eventS("RS15-01", "returnKey");
const C_SENDING = eventS("RS15-01", "sending");
const C_TIME = fromRamps(
  [
    { s0: 2.7, s1: 2.95, speed: 1 }, // the pointer on the pebble, the click (2.867); the pebble leaves its spot at f178
    { s0: C_PANEL, s1: C_TYPE, speed: 6 }, // a jump over the glitch frames (2.983–3.050): the quick chat is open
    { s0: C_TYPE, s1: C_DONE, speed: 9 }, // "What can you do now?" typed
    { s0: C_DONE, s1: 8.55, speed: 0.4 }, // the whole question held (a still picture: frames repeat, the cursor blinks)
    { s0: 8.55, s1: 8.75, speed: 1 }, // Return (8.594), "Sending" (8.667)
  ],
  { ramp: 0.05, tail: 1 },
);

/** RS1-03: where Chrome's Space is in each frame of the slide (its left edge, measured off the take's black gap) */
const SLIDE_STEPS: readonly (readonly [number, number])[] = [
  [3.99, 2940],
  [4.0, 2682],
  [4.05, 1532],
  [4.1, 976],
  [4.15, 582],
  [4.183, 398],
  [4.217, 264],
  [4.25, 170],
  [4.3, 82],
  [4.333, 48],
  [4.35, 36],
  [4.4, 12],
  [4.417, 8],
  [4.433, 4],
  [4.533, 0],
];
/** the page's offset in the take's own frame at take second `s` (its masks follow it) */
const slideDx = (s: number) => {
  let dx = SLIDE_STEPS[0][1];
  for (const [t, v] of SLIDE_STEPS) if (s >= t - 1e-4) dx = v;
  return { dx, dy: 0 };
};
/** the menu bar's own colour by the clock (RS11-02: #c9dabf on its left, #c2d4b6 under the clock) */
const MENU_FILL = "linear-gradient(to right, rgba(201, 218, 191, 0) 0%, rgb(201, 218, 191) 10%, rgb(195, 213, 185) 100%)";

const A_MASKS: Mask[] = [
  { box: { x: 2622, y: 0, w: 318, h: 60 }, s0: 0, s1: 99, kind: "fill", fill: MENU_FILL }, // the clock and the recording dot
  { box: { x: 590, y: 290, w: 1820, h: 48 }, s0: 0, s1: 99, px: 24 }, // the take's own Finder window behind ("pebble-takes")
  { box: { x: 618, y: 938, w: 326, h: 256 }, s0: 0, s1: 99, px: 22 }, // Finder's sidebar, takes.ts's identity box (630, 950, 300 × 230) with a margin: iCloud Drive, the account, On My Mac
  { box: { x: 1110, y: 1765, w: 118, h: 110 }, s0: 0, s1: 99, px: 24 }, // the Dock's dated Calendar icon
  { box: { x: 1858, y: 1750, w: 62, h: 58 }, s0: 0, s1: 99, px: 24 }, // the System Settings badge
];
const B_MASKS: Mask[] = [
  { box: { x: 2850, y: 0, w: 90, h: 66 }, s0: 0, s1: 99, kind: "fill", fill: "#000" }, // the recording dot, if any
  { box: { x: 230, y: 160, w: 920, h: 62 }, s0: 3.99, s1: 99, px: 26, backing: "#3c3c3c", track: slideDx }, // the booking page's file path
  { box: { x: 190, y: 532, w: 420, h: 56 }, s0: 3.99, s1: 99, px: 26, backing: "#efe8dc", track: slideDx }, // its dated kicker (the poster says 7 November)
];

/* ---------- framing ---------- */

/** the screen (the whole Mac at 1.0×, its own aspect) and the caption under it (16:9) or above it (4:5) */
const frame02 = (L: Layout) =>
  L.portrait
    ? { screen: R(L, 40, 540, 1000, 650), caption: R(L, 64, 170, 952, 330), cValign: "bottom" as const, cSize: L.type.headline, lines: true }
    : { screen: R(L, 299, 24, 1322, 860), caption: R(L, 128, 894, 1664, 110), cValign: "middle" as const, cSize: L.px(104), lines: false };

/** shot C: close on the pebble with room above it for the quick chat, then its input (the question at ≈ 50 px) */
const C_CLOSE: Box = { x: 1563, y: 838, w: 1323, h: 860 };
/** the input, the question at ≈ 50 px (16:9) / 43 px (4:5), with the pebble whole under it */
const C_INPUT = (portrait: boolean): Box => (portrait ? { x: 2100, y: 1290, w: 700, h: 455 } : { x: 2110, y: 1240, w: 760, h: 494 });

/** the scene's moments in its own seconds (marks, SFX) */
export const s02Moments = (lenS: number) => {
  const k = lenS / S02_NOMINAL;
  const b = AT.b * k;
  const c = AT.c * k;
  return {
    k,
    b,
    c,
    swipe: b,
    /** the swipe's first frame: the first move, and "On every Space." */
    slide: b,
    /** the new Space home, the pebble on its spot */
    settled: b + swipeInv(SLIDE.end),
    click: c + C_TIME.inv(C_CLICK),
    panel: c + C_TIME.inv(C_PANEL),
    typing: c + C_TIME.inv(C_TYPE),
    asked: c + C_TIME.inv(C_DONE),
    ret: c + C_TIME.inv(C_RETURN),
    sending: c + C_TIME.inv(C_SENDING),
    whip: lenS - WHIP_S,
  };
};

export const S02_SFX = (lenS: number): SfxNote[] => {
  const M = s02Moments(lenS);
  return [
    { name: "click", s: M.click, db: -14, what: "the click on the pebble" },
    { name: "clickB", s: M.ret, db: -17, what: "Return: the question is sent" },
  ];
};

export const S02OnYourMac: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const G = frame02(L);
  const { t, lenS, f, fps } = useSceneTime(S02_NOMINAL, durationInFrames);
  const M = s02Moments(lenS);
  const pre = Math.round(fps); // premount each take a second early (Studio; renders wait on every frame anyway)

  /* shot A: the pull-back from the pebble to the whole Mac */
  const m1 = G.screen.w / SRC.w; // frame px per take px at 1.0×
  const pebFinal = { x: G.screen.x + PEBBLE.x * m1, y: G.screen.y + PEBBLE.y * m1 };
  const s0 = OPEN_MAG / m1;
  // the camera's in-out ease: the pebble holds a beat after the match, then the Mac opens round it (no first-frame lunge)
  const poseA = (time: number) => {
    const pa = ramp(time, 0, PULL_S, EASE.camera);
    return {
      s: Math.exp(Math.log(s0) * (1 - pa)) * (1 + 0.01 * Math.max(0, time - PULL_S)), // then a slow drift (≈ 1 %/s)
      p: { x: lerp(L.W / 2, pebFinal.x, pa), y: lerp(L.H / 2, pebFinal.y, pa) },
    };
  };
  // A shutter blur on the pull-back (180° at 30 fps, as delivered): equal-weight samples of the window across the
  // shutter while it moves fast, so the Dock's icons sweep as a blur instead of strobing (the flash scan's css2560).
  const SHUTTER = 1 / 60;
  const now = poseA(t);
  const prev = poseA(t - SHUTTER);
  const shift = Math.hypot(now.p.x - prev.p.x, now.p.y - prev.p.y) + Math.abs(now.s / prev.s - 1) * Math.hypot(L.W, L.H);
  // The director (draft 3 prep): one layer with a smooth blur scaled to the move's speed, not up to six stacked
  // samples. The samples drew visible ghost copies (the Dock's icons in bands, REVIEW-1's BANNED "motion blur with
  // visible sample copies") and those bands strobed under the strictest flash binding.
  const blurA = t > 0 && t < PULL_S + 0.05 ? Math.min(18, shift / 2) : 0;
  const samplesA = [now];
  // The director (draft 3 prep): the Dock's saturated icons, sweeping during the pull-back, still failed the strictest
  // flash binding (8 transitions a second against 6). The Dock band (RS11-02 y ≥ ~1715 of 1912) is veiled in the
  // wallpaper's sage through the fast part of the move and fades in as it settles: a brief mask, no invented UI.
  const DOCK_TOP_PCT = (1715 / 1912) * 100;
  const dockHide = t < 0 ? 0 : 1 - Math.min(1, Math.max(0, (t - 0.8 * PULL_S) / (0.3 * PULL_S)));
  const capA = PULL_S * 0.82;

  /* shot B: the swipe, composed (REVIEW-4 S-1) */
  const poseB = poseA(t); // the same framing and drift as shot A, carried across the swipe
  const blurId = `s02b${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mB = G.screen.w / SRC.w; // window px per take px
  const u = t - M.b; // output seconds since the swipe's first frame
  const sB = swipeAt(u);
  const edge = spaceEdge(sB);
  // the blur: the move over the last half frame at 30 fps (a 180° shutter, as delivered), in frame px, capped
  const blurLen = u < -SWIPE.lead ? 0 : Math.min(L.px(SWIPE_BLUR_MAX), Math.abs(spaceEdge(swipeAt(u - 1 / 60)) - edge) * mB * poseB.s);
  const blurB = (blurLen * SIGMA_PER_LENGTH) / poseB.s; // the filter sits inside the drift's scale
  const sliding = sB < SLIDE.end;
  const deskX = (edge - SLIDE.gap - SRC.w) * mB; // the leaving desktop, its right edge a gap left of Chrome's Space
  const deskOn = edge - SLIDE.gap > -40; // until it is wholly out of the window (with the blur's tail)
  const pageX = sliding ? (edge - SLIDE.rest) * mB : 0;
  const tB0 = f(M.b) / fps; // the swipe Sequence's start, scene seconds (its children count from 0 there)
  const deskTime = realTime(A_TIME.at(tB0));
  const pageTime = mapOf((lt) => {
    const s = swipeAt(lt + tB0 - M.b);
    return s < SLIDE.end ? B_HOLD : s;
  });

  /* shot C: the push onto the input once the quick chat is open */
  const tc = (sec: number) => sec - M.c;
  const keysC = [
    { t: 0, box: C_CLOSE },
    { t: tc(M.panel) + 0.04, box: C_CLOSE },
    // an in-out push (the camera ease), so no frame jumps and the blur never shows its samples (REVIEW-1 S8)
    { t: tc(M.panel) + 0.04 + 0.55, box: C_INPUT(L.portrait), dur: 0.55, ease: EASE.camera },
  ];

  const caption = (text: string, at: number, entrance: "line" | "blur", stagger?: number) => (
    <Headline text={text} at={at} entrance={entrance} stagger={stagger} size={G.cSize} align="center" valign={G.cValign} box={G.caption} color={INK} />
  );
  const sfx = S02_SFX(lenS);

  return (
    <FontGate>
      <EdgeWhip role="out" start={M.whip} dur={WHIP_S}>
        <DesktopGround>
          <Sequence durationInFrames={f(M.b)} name="A · RS11-02 the Mac">
            {samplesA.map((q, i) => (
              <AbsoluteFill key={i} style={{ filter: blurA > 0.3 ? `blur(${blurA.toFixed(2)}px)` : undefined }}>
                <ZoomAbout s={q.s} from={pebFinal} to={q.p}>
                  <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={i === 0 ? 0.55 : 0} background="#C9D7C0">
                    <MaskedZoom src={A.file} srcSize={SRC} time={A_TIME} srcDuration={A.durationS} drift={0} masks={A_MASKS} />
                    {dockHide > 0.01 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: `${DOCK_TOP_PCT.toFixed(2)}%`,
                          bottom: 0,
                          opacity: dockHide,
                          background: "linear-gradient(to bottom, rgba(201,215,192,0) 0%, rgba(201,215,192,0.97) 35%)",
                        }}
                      />
                    )}
                  </FloatingWindow>
                </ZoomAbout>
              </AbsoluteFill>
            ))}
          </Sequence>
          <Sequence from={f(M.b)} durationInFrames={f(M.c) - f(M.b)} premountFor={pre} name="B · the Spaces swipe (RS11-02 leaves, RS1-03 arrives)">
            <ZoomAbout s={poseB.s} from={pebFinal} to={poseB.p}>
              {/* black under the pictures: the gap between the two Spaces */}
              <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={0.55} background="#000">
                <AbsoluteFill style={{ filter: blurB > 0.3 ? `url(#${blurId})` : undefined }}>
                  <svg width={0} height={0} style={{ position: "absolute" }}>
                    <filter id={blurId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                      <feGaussianBlur stdDeviation={`${blurB.toFixed(2)} 0`} edgeMode="duplicate" />
                    </filter>
                  </svg>
                  {deskOn && (
                    <AbsoluteFill style={{ transform: `translateX(${deskX.toFixed(2)}px)` }}>
                      <MaskedZoom src={A.file} srcSize={SRC} time={deskTime} srcDuration={A.durationS} drift={0} masks={[...A_MASKS, PEBBLE_HIDES]} />
                    </AbsoluteFill>
                  )}
                  <AbsoluteFill style={{ transform: pageX !== 0 ? `translateX(${pageX.toFixed(2)}px)` : undefined }}>
                    <MaskedZoom src={B.file} srcSize={SRC} time={pageTime} srcDuration={B.durationS} keys={[{ t: 0, box: B_BOX }]} drift={0} motionBlur={false} edgeFade={false} masks={B_MASKS} />
                  </AbsoluteFill>
                </AbsoluteFill>
              </FloatingWindow>
            </ZoomAbout>
            {caption(G.lines ? "On every\nSpace." : "On every Space.", M.slide - M.b - 0.05, "blur")}
          </Sequence>
          <Sequence durationInFrames={f(CAPTION_A_EXIT * M.k + 0.25)} name="caption A (leaves before the swipe)">
            <Headline
              text={G.lines ? "It lives on\nyour Mac." : "It lives on your Mac."}
              at={capA}
              exitAt={CAPTION_A_EXIT * M.k}
              exit="rise"
              entrance="line"
              size={G.cSize}
              align="center"
              valign={G.cValign}
              box={G.caption}
              color={INK}
            />
          </Sequence>
          <Sequence from={f(M.c)} premountFor={pre} name="C · RS15-01 click, ask">
            <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={0.55} background="#EFE8DC">
              <ScreenZoom src={C.file} srcSize={SRC} time={C_TIME} srcDuration={C.durationS} keys={keysC} drift={0.012} motionBlur={32} />
            </FloatingWindow>
            {caption("Click. Ask.", tc(M.click) - 0.02, "blur", tc(M.typing) - tc(M.click))}
          </Sequence>
        </DesktopGround>
      </EdgeWhip>
      {sfx.map((c) => (
        <Sfx key={`${c.name}-${c.s.toFixed(3)}`} src={sfxSrc(c.name)} at={sfxAt(c.name, c.s)} db={c.db} />
      ))}
    </FontGate>
  );
};
