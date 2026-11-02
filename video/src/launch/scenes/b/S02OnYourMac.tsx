// S02 "Lives on your Mac" (Desktop world), 6.5 s nominal (FIXES-1: 13.551–20.051 on the master).
//
// One screen, three takes, the pebble on the same spot in all of them (≈ 2750, 1620 of the 2940 × 1912 screen), on a
// soft blur of the Mac's own wallpaper (REVIEW-1 S3, BANNED "windows on a dark blur"):
// 0.0  RS11-02: the match from S01's sage. The screen starts scaled up about the real companion pebble, centred and
//      sharp (take px at 1.8× at most: REVIEW-1 S4), and settles to the whole Mac at 1.0×: the menu bar (its right end,
//      the clock, masked), Pebble's window, Pebble's own folder in Finder, the Dock. "It lives on your Mac." (≥ 2 s).
// 3.0  RS1-03, cut on the beat in the same framing (the director's S-1 ruling): the whole screen in the same window at
//      the same scale and drift, so the pebble stays on its spot across the cut (2750, 1621 → 2752, 1613), now on the
//      full-screen poster's Space, for 8 frames. "On every Space." lands on the cut. Then the take's own f237 (the
//      pebble gone, the poster's Space starting to slide) as the first frame of REVIEW-4's whip into Chrome's Space:
//      8 frames of smear, the cut between the two real frames inside it, Chrome's Space sharp with the pebble on the
//      same spot from 3.533; then the take runs on.
// 4.5  RS15-01 (cut on the downbeat): close on the pebble; the pointer, the click, the quick chat opens; a push onto
//      its input as "What can you do now?" is typed, held whole ≥ 1.0 s, sent (Return, "Sending"). "Click. Ask."
//      The scene ends on the send with the out half of a whip; S03 opens with the in half and its answer.
//
// Every frame inside the screen is a real frame of a take (time maps choose frames; the whip moves and blurs two real
// frames). Nothing is drawn on Pebble's UI except masks over hazards, and nothing of Pebble's is ever painted out.
import { useId, type CSSProperties } from "react";
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
import { clamp01, DesktopGround, EdgeWhip, INK, lerp, MaskedZoom, R, ramp, sfxAt, sfxSrc, useSceneTime, ZoomAbout, type Mask, type SfxNote } from "./kit";

export const S02_NOMINAL = 6.5;

const SRC = { w: 2940, h: 1912 };
const A = TAKES["RS11-02"];
const B = TAKES["RS1-03"];
const C = TAKES["RS15-01"];

/**
 * shot starts, scene seconds at nominal (the master's beats fall on 13.551 + 0.5k: 2.0 a beat, 4.5 a downbeat): the cut
 * to the poster's Space on the beat at 3.0 (film 16.567), the cut to click and ask on the downbeat at 4.5
 */
const AT = { b: 3.0, c: 4.5 } as const;
/** the first caption leaves just before the cut (it sits under the screen, never over a picture): gone by about 2.96 */
const CAPTION_A_EXIT = 2.74;
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
 * The Space change (REVIEW-4 S-1, as the director ruled: nothing of Pebble's is ever painted out of a picture). Shot B is
 * RS1-03 throughout:
 * - its live frames on the poster's Space, the pebble asleep on its spot, for 8 frames (the ruling: at least 0.25 s);
 * - its own f237, where the pebble has gone and the poster's Space has started to slide (54 px along; f237–f239 are one
 *   picture);
 * - REVIEW-4's whip into Chrome's Space, the film's own whip (EdgeWhip's travel, scale and blur) inside the screen: the
 *   poster's Space accelerates out to the left over 4 frames from f237, Chrome's Space arrives from the right and
 *   settles over 4, the cut between them at full speed inside the smear; 8 frames of smear, sharp after;
 * - then the take runs on, the pebble on its spot.
 * The composed slide the ruling asked for first (the take's measured slide at 0.6×, blur ≤ 55 px) read well, but it
 * failed the flash scan's strictest binding in 16:9 (desk27 7 and css2560 9 transitions in a second against 6, 8 from
 * the slide alone): the poster's and the page's big type and vases sweeping across the frame. The ruling's fallback is
 * this whip.
 */
/** the take's first slide frame: the pebble hidden, the poster's Space 54 px to the left (f237–f239 are one picture) */
const B_LEAVE = 3.95;
/** the pebble on the poster's Space after the cut, before f237: 8 frames at 30 fps (the ruling: at least 0.25 s) */
const POSTER_S = 8 / 30;
/** Chrome's Space as the take shows it once the slide has ended: the pebble on its spot (f266–f271 are one picture) */
const B_HOLD = 4.45;
/**
 * The whip (kit.tsx's EdgeWhip: 8 % of the width, a 17 % scale that keeps the picture over the window's edges, a 90-px
 * directional blur at full speed), in halves of 4 frames at 30 fps: its speed eases 0 → 1 across the out half and 1 → 0
 * across the in half, and the blur rides it, so it builds over 4 frames and lands sharp (REVIEW-4: 8 frames of smear).
 */
const SPACE_WHIP = { half: 4 / 30, travel: 0.08, scale: 0.17, blur: 90 } as const;
/** a time map from a function of output seconds (shot B's layers; ScreenZoom reads only `at`) */
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
// REVIEW-5 N-5: the left edge moved 64 px into the take (about 48 px in the 4:5 card), past "t)", the end of the page's
// "(sold out)". The right edge and the centre's height are kept.
const C_CLOSE: Box = { x: 1627, y: 859, w: 1259, h: 818 };
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
    /** the cut to the poster's Space, where "On every Space." lands */
    slide: b,
    /** the whip's first frame: the take's f237 (the pebble hidden, the poster's Space 54 px along) */
    swipe: b + POSTER_S,
    /** the whip has landed: Chrome's Space sharp, the pebble on its spot (8 frames after f237) */
    settled: b + POSTER_S + 2 * SPACE_WHIP.half,
    /** the whip's fastest frame, at the end of its out half: its whoosh peaks here (REVIEW-5 N-3) */
    spaceWhip: b + POSTER_S + 3 / 30,
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
    // REVIEW-5 N-3: the one click the film shows being made sat 8–12 dB under the music above 2 kHz. It now uses
    // Forget's take and level (soft-b at −1.9 dB, the master's kit level plus its bus). The whip has its own whoosh.
    { name: "whoosh", s: M.spaceWhip, db: -12, what: "the whip into Chrome's Space" },
    { name: "clickB", s: M.click, db: -1.9, what: "the click on the pebble" },
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

  /* shot B: the poster's Space, then the whip into Chrome's Space (REVIEW-4 S-1, the director's ruling) */
  const poseB = poseA(t); // the same framing and drift as shot A, carried across the cut
  const blurId = `s02b${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // the whip's halves at 30 fps: out from the last frame of the pebble (f504, at rest) to full speed (f508), f237 its
  // first frame; in from full speed (f509) to rest (f513); the cut from the poster's Space to Chrome's between them
  const outFrom = M.swipe - 1 / 30;
  const inFrom = outFrom + SPACE_WHIP.half + 1 / 30;
  const arriving = t >= inFrom - 1 / 60;
  const pOut = clamp01((t - outFrom) / SPACE_WHIP.half);
  const pIn = clamp01((t - inFrom) / SPACE_WHIP.half);
  const whipV = arriving ? (1 - pIn) * (1 - pIn) : pOut * pOut; // the whip's speed: 0 → 1 → 0
  const whipX = (arriving ? 1 : -1) * SPACE_WHIP.travel * G.screen.w * whipV; // out to the left, in from the right
  const whipStyle: CSSProperties | undefined =
    whipV > 0.001 ? { transform: `translateX(${whipX.toFixed(2)}px) scale(${(1 + SPACE_WHIP.scale * whipV).toFixed(4)})` } : undefined;
  const blurB = (L.px(SPACE_WHIP.blur) * whipV) / poseB.s; // the filter sits inside the drift's scale
  const tB0 = f(M.b) / fps; // shot B's Sequence start, scene seconds (its children count from 0 there)
  // the poster's Space: the take's live frames up to f237 (the pebble asleep on its spot), then f237 for the out half
  const leaveTime = mapOf((lt) => B_LEAVE + Math.min(0, lt + tB0 - M.swipe));
  // Chrome's Space: the take's frame once its slide has ended, through the in half, then the take's own frames
  const pageTime = mapOf((lt) => B_HOLD + Math.max(0, lt + tB0 - M.settled));

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
          <Sequence from={f(M.b)} durationInFrames={f(M.c) - f(M.b)} premountFor={pre} name="B · RS1-03 the poster's Space, then the whip into Chrome's Space">
            <ZoomAbout s={poseB.s} from={pebFinal} to={poseB.p}>
              <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={0.55} background="#000">
                <AbsoluteFill style={{ filter: blurB > 0.3 ? `url(#${blurId})` : undefined }}>
                  <svg width={0} height={0} style={{ position: "absolute" }}>
                    <filter id={blurId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                      <feGaussianBlur stdDeviation={`${blurB.toFixed(2)} 0`} edgeMode="duplicate" />
                    </filter>
                  </svg>
                  {/* both pictures stay mounted through the shot; the cut between them is inside the smear */}
                  <AbsoluteFill style={{ opacity: arriving ? 0 : 1, ...(arriving ? {} : whipStyle) }}>
                    <MaskedZoom src={B.file} srcSize={SRC} time={leaveTime} srcDuration={B.durationS} keys={[{ t: 0, box: B_BOX }]} drift={0} motionBlur={false} edgeFade={false} masks={B_MASKS} />
                  </AbsoluteFill>
                  <AbsoluteFill style={{ opacity: arriving ? 1 : 0, ...(arriving ? whipStyle : {}) }}>
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
