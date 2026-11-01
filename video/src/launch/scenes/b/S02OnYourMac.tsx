// S02 "Lives on your Mac" (Desktop world), 6.5 s nominal (FIXES-1: 13.551–20.051 on the master).
//
// One screen, three takes, the pebble on the same spot in all of them (≈ 2750, 1620 of the 2940 × 1912 screen), on a
// soft blur of the Mac's own wallpaper (REVIEW-1 S3, BANNED "windows on a dark blur"):
// 0.0  RS11-02: the match from S01's sage. The screen starts scaled up about the real companion pebble, centred and
//      sharp (take px at 1.8× at most: REVIEW-1 S4), and settles to the whole Mac at 1.0×: the menu bar (its right end,
//      the clock, masked), Pebble's window, Pebble's own folder in Finder, the Dock. "It lives on your Mac." (≥ 2 s).
// 3.0  RS1-03 (cut on the beat): a full-screen Space, the pebble in the same place; the Spaces swipe plays full width
//      (⌃→, the slide, the pebble rides in with the new Space and settles in the same spot). "On every Space."
// 4.5  RS15-01 (cut on the downbeat): close on the pebble; the pointer, the click, the quick chat opens; a push onto
//      its input as "What can you do now?" is typed, held whole ≥ 1.0 s, sent (Return, "Sending"). "Click. Ask."
//      The scene ends on the send with the out half of a whip; S03 opens with the in half and its answer.
//
// Every frame inside the screen is a real frame of a take (time maps choose frames; nothing is drawn on Pebble's UI
// except masks over hazards).
import { Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { eventS, TAKES } from "../../data/takes";
import { useLayout, type Layout } from "../../layout";
import { fromRamps, realTime } from "../../timeMap";
import { EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { DesktopGround, EdgeWhip, INK, lerp, MaskedZoom, R, ramp, sfxAt, sfxSrc, useSceneTime, ZoomAbout, type Mask, type SfxNote } from "./kit";

export const S02_NOMINAL = 6.5;

const SRC = { w: 2940, h: 1912 };
const A = TAKES["RS11-02"];
const B = TAKES["RS1-03"];
const C = TAKES["RS15-01"];

/** shot starts, scene seconds at nominal (the master's beats fall on 13.551 + 0.5 k: 3.0 is a beat, 4.5 a downbeat) */
const AT = { b: 3.0, c: 4.5 } as const;
/** the opening pull-back from the pebble to the whole Mac */
const PULL_S = 0.85;
const WHIP_S = 0.14;

/** RS11-02's companion pebble: body centre and width, source px */
const PEBBLE = { x: 2750, y: 1621, w: 173 };
/** the opening pebble's sharpness: take px shown at this many frame px (REVIEW-1 S4: 2× or less) */
const OPEN_MAG = 1.8;

/* ---------- the takes' time maps and masks ---------- */

const A_TIME = realTime(0.6); // a still tour shot: the pointer barely moves
const B_TIME = realTime(3.6); // ⌃→ at 3.967, the slide 4.0–4.3, the pebble back on its spot at 4.433
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

/** RS1-03: where Chrome's Space is during the slide (its left edge, measured per frame off the take's black gap) */
const SLIDE: readonly (readonly [number, number])[] = [
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
const slideDx = (s: number) => {
  let dx = SLIDE[0][1];
  for (const [t, v] of SLIDE) if (s >= t - 1e-4) dx = v;
  return { dx, dy: 0 };
};

/** the menu bar's own colour by the clock (RS11-02: #c9dabf on its left, #c2d4b6 under the clock) */
const MENU_FILL = "linear-gradient(to right, rgba(201, 218, 191, 0) 0%, rgb(201, 218, 191) 10%, rgb(195, 213, 185) 100%)";

const A_MASKS: Mask[] = [
  { box: { x: 2622, y: 0, w: 318, h: 60 }, s0: 0, s1: 99, kind: "fill", fill: MENU_FILL }, // the clock and the recording dot
  { box: { x: 590, y: 290, w: 1820, h: 48 }, s0: 0, s1: 99, px: 24 }, // the take's own Finder window behind ("pebble-takes")
  { box: { x: 630, y: 945, w: 290, h: 180 }, s0: 0, s1: 99, px: 22 }, // Finder's sidebar: iCloud Drive, the account, On My Mac
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
    swipe: b + B_TIME.inv(eventS("RS1-03", "swipeKey")),
    settled: b + B_TIME.inv(eventS("RS1-03", "pebbleSettled")),
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
  const pa = ramp(t, 0, PULL_S, EASE.push);
  const sA = Math.exp(Math.log(s0) * (1 - pa)) * (1 + 0.01 * Math.max(0, t - PULL_S)); // then a slow drift (≈ 1 %/s)
  const pebNow = { x: lerp(L.W / 2, pebFinal.x, pa), y: lerp(L.H / 2, pebFinal.y, pa) };
  const capA = PULL_S * 0.82;

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
            <ZoomAbout s={sA} from={pebFinal} to={pebNow}>
              <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={0.55} background="#C9D7C0">
                <MaskedZoom src={A.file} srcSize={SRC} time={A_TIME} srcDuration={A.durationS} drift={0} masks={A_MASKS} />
              </FloatingWindow>
            </ZoomAbout>
            {caption(G.lines ? "It lives on\nyour Mac." : "It lives on your Mac.", capA, "line")}
          </Sequence>
          <Sequence from={f(M.b)} durationInFrames={f(M.c) - f(M.b)} premountFor={pre} name="B · RS1-03 the Spaces swipe">
            <FloatingWindow rect={G.screen} enter="none" spill={0} shadow={0.55} background="#000">
              <MaskedZoom src={B.file} srcSize={SRC} time={B_TIME} srcDuration={B.durationS} drift={0} masks={B_MASKS} />
            </FloatingWindow>
            {caption(G.lines ? "On every\nSpace." : "On every Space.", 0.04, "blur")}
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
