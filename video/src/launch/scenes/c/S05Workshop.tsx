// S05 Pebble's Workshop (FIXES-1 WP-C; REVIEW-1 M2, M5, N1, N3 and the BANNED list). Daylight world.
//
// The headline band holds the story: "It builds small tools / for itself." from the whip's landing to 3.95 s (held
// 3.2 s after it lands), then "When the check disagrees, / it asks you." from 4.2 s to 7.0 s (2.6 s after it lands).
// Under it, one carried line of evidence:
//   1. RSW-01 (Pebble 2.0, the demo account, dark theme): the kiln request, already sent (1×, 1 s);
//   2. the thinking, cut to 0.65 s: a hard cut on the beat to the steps (the edit skips the wait; every frame real), and
//      "Running a script: Create, test, keep and use a kiln_ramp_time tool for…" lands (1×);
//   3. the window narrows onto the word kiln_ramp_time and becomes the tool's card (no grey bars, no pill);
//   4. the diagram fills the space under the headline (plain marks and Inter type at 40 px or more, never a Pebble
//      screen): Sandbox, its own tests ✓✓✓ → Blind check, tests written from its description alone ✓✓✗✗✗, 2 of 5 →
//      the pebble asks (Pebble's own `question` pose), "Asks you.";
//   5. the diagram leaves before anything else arrives (nothing crosses "2 of 5"), and RSW-01's real Keep card rises:
//      "Keep this tool in Pebble's Toolbox? · kiln_ramp_time … Pebble asks because the independent check disagreed
//      (2 of 5 tests passed)."; the camera pushes onto that bullet and a clay underline marks "(2 of 5 tests passed).".
// The scene ends on the whole card settled at 60 % of the frame's width on the stone (by 7.2 s, for the master's zoom
// punch into S06), its words gone by 7.18 s.
//
// Framings stay inside Pebble's window (RSW-01's ROIs, measured on its frames): the menu bar (the recording pill, the
// clock) and the Dock are never in frame; RSW-01 has no usage line. Every crop edge falls in a gap between lines.
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { PebbleActor, cues, look, pose } from "../../components/PebbleActor";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import type { Box, ZoomKey } from "../../camera";
import { pick, useLayout, type Layout, type Rect } from "../../layout";
import { timeMap, type TimeMap } from "../../timeMap";
import { C, EASE, TYPE } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { Check, Cross, box, clamp01, lerp, ramp, sfxSrc, sfxStart, useClock, type SfxNote } from "./common";

export const S05_NOMINAL = 7.5;

const SRC = "launch/takes/RSW-01.mp4";
const SIZE = { w: 2940, h: 1912 };

/** Beats, seconds at the nominal length (local beats every 0.5 s; downbeats at 0, 2, 4, 6). */
const B = {
  title: 0.2, // after the whip lands (0.13)
  cut: 1.0, // the thinking (0.65 s, was 1.6): a hard cut on the beat to the steps, the wait skipped (source 71.35)
  script: 1.35, // "Running a script: …" lands (source 71.70)
  fold: 1.65, // → 2.05, the window narrows onto kiln_ramp_time and becomes the tool's card
  sandbox: 2.05,
  ticks: [2.3, 2.4, 2.5] as const,
  ownTests: 2.45,
  blind: 2.8,
  caption: 2.9,
  marks: [3.1, 3.18, 3.26, 3.34, 3.42] as const,
  twoOfFive: 3.55,
  asks: 3.8,
  titleOut: 3.95, // gone by 4.13, two frames before the next line
  line: 4.2, // lands 4.4: held 2.6 s (0.5 s + 0.3 s a word)
  diagramOut: 4.65, // gone by 4.85
  keepIn: 4.9,
  keepPush: 5.95,
  underline: 6.2,
  settle: 6.85, // → 7.2: the card settles centred at 60 % of the frame's width on the stone (the master's zoom punch)
  out: 7.0, // gone by 7.18, two frames before the push into S06 (7.27)
} as const;
const FOLD = 0.4;
const SETTLE = 0.35;
/** Type exits: 0.18 s, accelerating (REVIEW-1 M2). */
const EXIT = 0.18;

export const S05_MARKS = [
  { name: "title", s: B.title },
  { name: "thinking-cut", s: B.cut },
  { name: "script-line", s: B.script },
  { name: "fold-to-tool", s: B.fold },
  { name: "sandbox", s: B.sandbox },
  { name: "blind-check", s: B.blind },
  { name: "two-of-five", s: B.twoOfFive },
  { name: "asks-you", s: B.asks },
  { name: "when-the-check-disagrees", s: B.line },
  { name: "keep-card", s: B.keepIn },
  { name: "settle", s: B.settle },
  { name: "type-out", s: B.out },
] as const;

export const S05_SFX: SfxNote[] = [
  { scene: "S05", s: B.ticks[0] + 0.25, file: "sfx-tick.wav", db: -22, note: "its own test 1 ticks" },
  { scene: "S05", s: B.ticks[1] + 0.25, file: "sfx-tick-b.wav", db: -22, note: "its own test 2 ticks" },
  { scene: "S05", s: B.ticks[2] + 0.25, file: "sfx-tick.wav", db: -22, note: "its own test 3 ticks" },
  { scene: "S05", s: B.twoOfFive, file: "sfx-click-soft-a.wav", db: -15, note: "“2 of 5” lands (clay)" },
  { scene: "S05", s: B.asks + 0.08, file: "sfx-pop-soft-b.wav", db: -18, note: "the pebble pops in to ask" },
];

/**
 * RSW-01 framings (source px), measured at 61.8, 72.4 and 89.6 s. Each pair shares its window's aspect.
 * REQUEST: the sent bubble (836–2010 × 318–556; on 4:5 also the status and steps under it, 640–2004 × 693–985).
 * SCRIPT: "The model responded · 2 steps" (872–894) and "Running a script: Create, test, keep and use a kiln_ramp_time
 * tool for…" (676–1471 × 925–947) with "▶ Details"; the step dots (640–651) and the timestamps (from 1926) stay outside.
 * WORD: kiln_ramp_time in that line (1196–1366), at the tool card's aspect.
 */
const REQUEST: Record<Layout["id"], Box> = { "16x9": box(806, 262, 1224, 412), "4x5": box(630, 240, 1400, 760) };
const SCRIPT: Record<Layout["id"], Box> = { "16x9": box(662, 846, 823, 277), "4x5": box(662, 846, 823, 447) };
const WORD: Record<Layout["id"], Box> = { "16x9": box(1166, 908, 230, 56), "4x5": box(1166, 909, 230, 54) };
const WORD_INK = { x0: 1193, x1: 1369, y0: 918, y1: 955 };
/** The conversation's ground in RSW-01 (sampled), for the fold's isolating fade. */
const RSW_BG = "#141A18";
/** The Keep card's ground as the render decodes it (sampled from a still). */
const CARD_BG = "#1B211B";
/** The Keep card (714–2009 × 677–1048, from 89.433) and its bullet's strip (the bullet 796–1819 × 898–924, the buttons). */
const KEEP_CARD = box(700, 664, 1324, 398);
/**
 * 16:9: the whole bullet with the buttons and the card's foot. 4:5 (1040 px wide): the bullet's last words,
 * "independent check disagreed (2 of 5 tests passed)." with the card's ground under them. The left edge sits in the
 * 11 px gap between "the" (ends 1147) and "independent" (starts 1158), so its feather is kept to 7 source px; the Keep
 * button (ends 1157, one row lower) falls inside that feather.
 */
const KEEP_STRIP: Record<Layout["id"], Box> = { "16x9": box(712, 878, 1148, 176), "4x5": box(1150, 866, 696, 150) };
/**
 * 16:9 (REVIEW-2 M-1): the strip's top edge is 6 source px lower than in draft 3, mid-gap between "hold_min)" (ink
 * 837–862) and the bullet (899–924), so the bullet keeps its padding; and while the camera narrows onto the strip, the card's upper part
 * (its title and description, inside its border) fades into the card's ground, so the moving crop never cuts a line.
 */
const KEEP_UPPER = { x0: 718, x1: 2004, y0: 682, y1: 880 };
/**
 * 4:5 (REVIEW-2 M-1): the card's bullet and buttons, re-wrapped from the take's own pixels so they read in a 4:5 frame
 * (the window's real layout, one line of 1023 source px, is 22-px type at 92 % of 1080). Three crops of the same frame,
 * stacked: A the bullet and "Pebble asks because the independent" (the edge at 1322 is in the 10-px gap before
 * "check"); B "check disagreed (2 of 5 tests passed)." set one line lower (the UI's own line pitch, 34 px, measured on
 * the description's wrap) and hung under "Pebble" (830); C "View code · Discard · Keep", a line lower too. The top
 * edge lies in the gap between "hold_min)" and the bullet. `v` is the crop's place in the stacked card (source px).
 */
const PITCH = 34;
const HANG = 830 - 1327; // "check" (1327) under "Pebble" (830)
const STACK = { x: 720, y: 870, w: 631, h: 208 };
const STACK_ROWS: { src: Box; v: { x: number; y: number } }[] = [
  { src: box(720, 870, 602, 57), v: { x: 720, y: 870 } },
  { src: box(1322, 893, 508, 52), v: { x: 1322 + HANG, y: 893 + PITCH } },
  { src: box(720, 945, 631, 99), v: { x: 720, y: 945 + PITCH } },
];
/** "(2 of 5 tests passed)." in row B of the stacked card */
const TWO_OF_FIVE_V = { x0: 1550 + HANG, x1: 1820 + HANG, y: 935 + PITCH };
/** "(2 of 5 tests passed)." in the bullet (1550–1819), for the drawn underline (an annotation). */
const TWO_OF_FIVE = { x0: 1550, x1: 1820, y: 935 };

const diagram = (L: Layout) => {
  const P = L.px;
  if (!L.portrait) {
    return {
      portrait: false,
      sandbox: { x: P(128), y: P(400), w: P(560), h: P(540) },
      sbTitle: { x: P(168), y: P(426), w: P(480), h: P(80) },
      card: { x: P(168), y: P(524), w: P(480), h: P(116) },
      nameSize: P(50),
      ticks: { x: P(168), y: P(680), d: P(76), gap: P(104) },
      ownTests: { x: P(168), y: P(784), w: P(480), h: P(64) },
      arrows: [
        { x0: P(700), y0: P(670), x1: P(772), y1: P(670) },
        { x0: P(1416), y0: P(670), x1: P(1478), y1: P(670) },
      ],
      blind: { x: P(784), y: P(400), w: P(620), h: P(540) },
      blTitle: { x: P(824), y: P(426), w: P(560), h: P(80) },
      caption: { x: P(824), y: P(522), w: P(560), h: P(120) },
      marks: { x: P(824), y: P(666), d: P(76), gap: P(100) },
      two: { x: P(824), y: P(770), w: P(540), h: P(136) },
      twoSize: P(112),
      twoAlign: "left" as const,
      pebble: { x: P(1636), y: P(784), size: P(300) },
      asks: { x: P(1486), y: P(808), w: P(300), h: P(84) },
      asksAlign: "center" as const,
      titleSize: P(64),
      labelSize: P(46),
      captionSize: P(44),
    };
  }
  return {
    portrait: true,
    sandbox: { x: P(64), y: P(412), w: P(952), h: P(232) },
    sbTitle: { x: P(104), y: P(430), w: P(440), h: P(70) },
    card: { x: P(104), y: P(512), w: P(430), h: P(96) },
    nameSize: P(44),
    ticks: { x: P(604), y: P(452), d: P(70), gap: P(92) },
    ownTests: { x: P(604), y: P(538), w: P(380), h: P(60) },
    arrows: [
      { x0: P(540), y0: P(652), x1: P(540), y1: P(696) },
      { x0: P(540), y0: P(1018), x1: P(540), y1: P(1058) },
    ],
    blind: { x: P(64), y: P(704), w: P(952), h: P(306) },
    blTitle: { x: P(104), y: P(722), w: P(560), h: P(70) },
    caption: { x: P(104), y: P(794), w: P(560), h: P(110) },
    marks: { x: P(104), y: P(916), d: P(70), gap: P(88) },
    two: { x: P(560), y: P(866), w: P(416), h: P(130) },
    twoSize: P(104),
    twoAlign: "right" as const,
    pebble: { x: P(540), y: P(1250), size: P(196) },
    asks: { x: P(652), y: P(1146), w: P(330), h: P(84) },
    asksAlign: "left" as const,
    titleSize: P(56),
    labelSize: P(42),
    captionSize: P(42),
  };
};
type DG = ReturnType<typeof diagram>;

/** The thinking window's rect and the tool card it becomes. */
const mainRect = (L: Layout): Rect => pick(L, { "16x9": { x: L.px(128), y: L.px(410), w: L.px(1664), h: L.px(560) }, "4x5": { x: L.px(40), y: L.px(555), w: L.px(1000), h: L.px(543) } });

/** Type that leaves in 0.18 s, accelerating, rising a little out of focus (REVIEW-1 M2). */
const TypeExit: React.FC<{ at: number; t: number; u: number; dur?: number; children: ReactNode }> = ({ at, t, u, dur = EXIT, children }) => {
  const p = EASE.exit(clamp01((t - at) / dur));
  if (p >= 0.999) return null;
  if (p <= 0) return <>{children}</>;
  return <AbsoluteFill style={{ opacity: 1 - p, transform: `translateY(${(-p * 22 * u).toFixed(2)}px)`, filter: `blur(${(p * 5 * u).toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};

const Arrow: React.FC<{ a: DG["arrows"][number]; p: number; color: string; w: number }> = ({ a, p, color, w }) => {
  if (p <= 0) return null;
  const x1 = lerp(a.x0, a.x1, p);
  const y1 = lerp(a.y0, a.y1, p);
  const ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0);
  const hl = w * 5;
  const hx = (s: number) => x1 - hl * Math.cos(ang + s);
  const hy = (s: number) => y1 - hl * Math.sin(ang + s);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <line x1={a.x0} y1={a.y0} x2={x1} y2={y1} stroke={color} strokeWidth={w} strokeLinecap="round" />
      {p > 0.6 ? <path d={`M${hx(0.5)} ${hy(0.5)} L${x1} ${y1} L${hx(-0.5)} ${hy(-0.5)}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01((p - 0.6) / 0.4)} /> : null}
    </svg>
  );
};

/** The tool's card: a dark tile (never a pill) carrying its name in Inter, as Pebble's own UI sets it. */
const ToolCard: React.FC<{ r: Rect; size: number; opacity: number; u: number }> = ({ r, size, opacity, u }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        borderRadius: 20 * u,
        background: DAY.ink,
        opacity,
        boxShadow: `0 ${10 * u}px ${30 * u}px rgba(74, 62, 44, 0.22), inset 0 0 0 ${Math.max(1, u)}px rgba(255,255,255,0.06)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TYPE.headline.fontFamily,
        fontWeight: 600,
        fontVariationSettings: TYPE.headline.fontVariationSettings,
        fontSize: size,
        letterSpacing: "-0.015em",
        color: C.stone0,
      }}
    >
      kiln_ramp_time
    </div>
  );

const Diagram: React.FC<{ t: number; T: (x: number) => number; L: Layout; cardOn: number }> = ({ t, T, L, cardOn }) => {
  const g = diagram(L);
  const stroke = L.px(2.5);
  const out = EASE.exit(clamp01((t - T(B.diagramOut)) / 0.2));
  if (t < T(B.sandbox) - 0.1 || out >= 0.999) {
    // before the fold lands, only the tool card (the window becomes it)
    return t < T(B.sandbox) - 0.1 ? <ToolCard r={g.card} size={g.nameSize} opacity={cardOn} u={L.u} /> : null;
  }
  const sb = ramp(t, T(B.sandbox), 0.35, EASE.enter);
  const bl = ramp(t, T(B.blind), 0.35, EASE.enter);
  const twoIn = clamp01((t - T(B.twoOfFive)) / 0.18);
  const twoE = EASE.enter(twoIn);

  const frame = (r: Rect, p: number, dashed: boolean) =>
    p <= 0 ? null : (
      <div
        style={{
          position: "absolute",
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          borderRadius: L.px(28),
          border: `${stroke}px ${dashed ? "dashed" : "solid"} ${DAY.ink2}`,
          background: dashed ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.3)",
          opacity: p,
          transform: `scale(${0.97 + 0.03 * p})`,
        }}
      />
    );
  const title = (text: string, b: Rect, at: number) => (
    <Headline text={text} at={T(at)} entrance="rise" size={g.titleSize} align="left" valign="top" fit={false} box={b} />
  );
  const label = (text: string, b: Rect, at: number, size: number) => (
    <Headline text={text} at={T(at)} entrance="blur" variant="support" weight={500} size={size} color={DAY.ink2} align="left" valign="top" fit={false} leading={1.2} box={b} />
  );

  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: out > 0 ? `translateY(${(-out * 30 * L.u).toFixed(2)}px)` : undefined }}>
      {frame(g.sandbox, sb, true)}
      {title("Sandbox", g.sbTitle, B.sandbox + 0.05)}
      <ToolCard r={g.card} size={g.nameSize} opacity={cardOn} u={L.u} />
      {B.ticks.map((at, i) => (
        <Check key={i} x={g.ticks.x + i * g.ticks.gap} y={g.ticks.y} d={g.ticks.d} p={ramp(t, T(at), 0.32, EASE.enter)} color={DAY.sage} />
      ))}
      {label("its own tests", g.ownTests, B.ownTests, g.labelSize)}

      <Arrow a={g.arrows[0]} p={ramp(t, T(B.blind) - 0.12, 0.22, EASE.enter)} color={DAY.ink2} w={stroke} />
      {frame(g.blind, bl, false)}
      {title("Blind check", g.blTitle, B.blind + 0.05)}
      {label("tests written from\nits description alone", g.caption, B.caption, g.captionSize)}
      {B.marks.map((at, i) =>
        i < 2 ? (
          <Check key={i} x={g.marks.x + i * g.marks.gap} y={g.marks.y} d={g.marks.d} p={ramp(t, T(at), 0.3, EASE.enter)} color={DAY.sage} />
        ) : (
          <Cross key={i} x={g.marks.x + i * g.marks.gap} y={g.marks.y} d={g.marks.d} p={ramp(t, T(at), 0.3, EASE.enter)} color={C.clay} />
        ),
      )}
      {twoIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: g.two.x,
            top: g.two.y,
            width: g.two.w,
            height: g.two.h,
            display: "flex",
            alignItems: "center",
            justifyContent: g.twoAlign === "right" ? "flex-end" : "flex-start",
            fontFamily: TYPE.headline.fontFamily,
            fontVariationSettings: TYPE.headline.fontVariationSettings,
            fontWeight: 720,
            fontSize: g.twoSize,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: "#B5562F",
            opacity: Math.min(1, twoIn * 2.5),
            transform: `scale(${(1.12 - 0.12 * twoE).toFixed(4)})`,
            transformOrigin: g.twoAlign === "right" ? "100% 50%" : "0% 50%",
            filter: twoE < 0.99 ? `blur(${((1 - twoE) * 6 * L.u).toFixed(2)}px)` : undefined,
          }}
        >
          2 of 5
        </div>
      ) : null}

      <Arrow a={g.arrows[1]} p={ramp(t, T(B.asks) - 0.12, 0.2, EASE.enter)} color={DAY.ink2} w={stroke} />
      <PebbleActor
        x={g.pebble.x}
        y={g.pebble.y}
        size={g.pebble.size}
        enter={{ at: T(B.asks), kind: "pop" }}
        cues={cues(pose(0, "question"), look(T(B.asks) + 0.25, pick(L, { "16x9": -0.25, "4x5": 0 }), pick(L, { "16x9": 0, "4x5": -0.4 })))}
      />
      <Headline text="Asks you." at={T(B.asks + 0.06)} entrance="rise" size={g.titleSize} align={g.asksAlign} valign="middle" fit={false} box={g.asks} />
    </AbsoluteFill>
  );
};

/** 4:5: the Keep card's bullet and buttons, three crops of one real frame stacked (STACK_ROWS), and the underline. */
const StackedCard: React.FC<{ rect: Rect; time: TimeMap; underline: number }> = ({ rect, time, underline }) => {
  const k = rect.w / STACK.w;
  return (
    <AbsoluteFill>
      {STACK_ROWS.map((r, i) => (
        <div key={i} style={{ position: "absolute", left: (r.v.x - STACK.x) * k, top: (r.v.y - STACK.y) * k, width: r.src.w * k, height: r.src.h * k, overflow: "hidden" }}>
          <ScreenZoom src={SRC} srcSize={SIZE} time={time} keys={[{ t: 0, box: r.src }]} width={r.src.w * k} height={r.src.h * k} drift={0} motionBlur={false} edgeFade={false} />
        </div>
      ))}
      {underline > 0 ? (
        <div
          style={{
            position: "absolute",
            left: (TWO_OF_FIVE_V.x0 - STACK.x) * k,
            top: (TWO_OF_FIVE_V.y - STACK.y) * k,
            width: (TWO_OF_FIVE_V.x1 - TWO_OF_FIVE_V.x0) * k * underline,
            height: Math.max(2, 3 * k),
            borderRadius: 2,
            background: C.clay,
            opacity: 0.95,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** Between two regions in log scale (a constant perceived zoom speed), centres linear. */
const mixRegion = (a: Box, b: Box, p: number): Box => {
  const w = Math.exp(lerp(Math.log(a.w), Math.log(b.w), p));
  const h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), p));
  const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, p);
  const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, p);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};
const pushAbout = (b: Box, k: number): Box => ({ x: b.x + (b.w * (1 - k)) / 2, y: b.y + (b.h * (1 - k)) / 2, w: b.w * k, h: b.h * k });

export const S05Workshop: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T } = useClock(S05_NOMINAL, durationInFrames);
  const g = diagram(L);

  // RSW-01: the request at 1×, a cut that skips the wait, 1× through the script line and the fold; then the window is
  // gone and its picture holds (no decoding while hidden). Every frame shown is the take's own.
  const cut = T(B.cut);
  const holdAt = T(B.fold) + FOLD + 0.05;
  const time: TimeMap = {
    at: (x: number) => (x < cut ? 61.75 + x : 71.35 + (Math.min(x, holdAt) - cut)),
    inv: (src: number) => (src < 61.75 + cut ? src - 61.75 : cut + (src - 71.35)),
    speed: (x: number) => (x < holdAt ? 1 : 0),
    knots: [],
  };
  const keepTime = timeMap(
    [
      [T(B.keepIn), 89.45],
      [T(B.keepIn) + 1, 90.45],
    ],
    { tail: 1, head: 0 },
  );

  // the thinking window: the request, a cut to the steps, then it narrows onto kiln_ramp_time while the window shrinks
  // to the tool's card; the card takes over as the picture fades
  const foldP = EASE.camera(clamp01((t - T(B.fold)) / FOLD));
  let region = t < cut ? pushAbout(REQUEST[L.id], Math.exp(-0.01 * t)) : pushAbout(SCRIPT[L.id], Math.exp(-0.01 * (t - cut)));
  if (foldP > 0) region = mixRegion(region, WORD[L.id], foldP);
  const rect = mixRegion(mainRect(L), g.card, foldP);
  const pictureOn = 1 - ramp(t, T(B.fold) + FOLD - 0.1, 0.12, EASE.linear);
  const cardOn = ramp(t, T(B.fold) + FOLD - 0.12, 0.12, EASE.linear);
  const isolate = ramp(t, T(B.fold), FOLD * 0.7, EASE.camera);

  const mainOverlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }) => {
    if (isolate <= 0.001) return null;
    // everything but the word fades into the conversation's ground as the window narrows (no half-words at its edges)
    const a = toView({ x: WORD_INK.x0, y: WORD_INK.y0 });
    const b = toView({ x: WORD_INK.x1, y: WORD_INK.y1 });
    // a short feather: "a" ends 8 px before the word (1185) and "tool" starts 6 px after it (1375)
    const f = Math.max(4, (b.y - a.y) * 0.2);
    const h = `linear-gradient(90deg, #000 ${(a.x - f).toFixed(1)}px, transparent ${a.x.toFixed(1)}px, transparent ${b.x.toFixed(1)}px, #000 ${(b.x + f).toFixed(1)}px)`;
    const v = `linear-gradient(180deg, #000 ${(a.y - f).toFixed(1)}px, transparent ${a.y.toFixed(1)}px, transparent ${b.y.toFixed(1)}px, #000 ${(b.y + f).toFixed(1)}px)`;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: RSW_BG,
          opacity: isolate,
          maskImage: `${h}, ${v}`,
          WebkitMaskImage: `${h}, ${v}`,
          maskComposite: "add",
          WebkitMaskComposite: "source-over",
        }}
      />
    );
  };

  // the Keep card rises whole, then the window narrows onto its bullet while the camera pushes in
  const card0: Rect = pick(L, {
    "16x9": { x: L.px(160), y: L.px(460), w: L.px(1600), h: (L.px(1600) * KEEP_CARD.h) / KEEP_CARD.w },
    "4x5": { x: L.px(20), y: L.px(668), w: L.px(1040), h: (L.px(1040) * KEEP_CARD.h) / KEEP_CARD.w },
  });
  const stripBox = KEEP_STRIP[L.id];
  const stripW = pick(L, { "16x9": L.content.w, "4x5": L.px(1040) });
  const stripH = (stripW * stripBox.h) / stripBox.w;
  const strip: Rect = pick(L, {
    "16x9": { x: (L.W - stripW) / 2, y: L.px(570), w: stripW, h: stripH },
    "4x5": { x: (L.W - stripW) / 2, y: L.px(830) - stripH / 2, w: stripW, h: stripH },
  });
  const keepP = EASE.camera(clamp01((t - (T(B.keepPush) - 0.6)) / 0.6));
  // the last beat: back to the whole card, centred at 60 % of the frame's width with the stone round it (FIXES-1's
  // S05 → S06 zoom punch must not start on a dark frame)
  const settleP = EASE.camera(clamp01((t - T(B.settle)) / SETTLE));
  const endW = L.W * 0.6;
  const endH = (endW * KEEP_CARD.h) / KEEP_CARD.w;
  const endRect: Rect = { x: (L.W - endW) / 2, y: (L.H - endH) / 2, w: endW, h: endH };
  const card = mixRegion(mixRegion(card0, strip, keepP), endRect, settleP);
  const keepKeys: ZoomKey[] = [{ t: 0, box: mixRegion(mixRegion(KEEP_CARD, stripBox, keepP), KEEP_CARD, settleP) }];
  // the card's rise, drawn here so the window (and its video) stays mounted from frame 0 (FloatingWindow's own rise
  // unmounts it before `at`)
  const keepPin = EASE.enter(clamp01((t - T(B.keepIn)) / 0.75));
  const keepOn = t >= T(B.keepIn) ? Math.min(1, keepPin * 1.6) : 0;

  const underline = ramp(t, T(B.underline), 0.45, EASE.enter);
  // 16:9: the card's upper part fades out over the push's first 40 %, and back in over the settle's last 30 % (when the
  // widening crop is already above it)
  const upper = L.portrait ? 0 : clamp01(keepP / 0.4) * (1 - clamp01((settleP - 0.7) / 0.3));

  // 4:5: the stacked card at 92 % of the frame's width (40-px margins), centred under the headline; it rises, drifts
  // 0.6 %/s, and settles to 60 % of the width for the master's punch
  const stackW = L.W * 0.92;
  const stackK = stackW / STACK.w;
  const stackRect: Rect = { x: (L.W - stackW) / 2, y: L.px(840) - (STACK.h * stackK) / 2, w: stackW, h: STACK.h * stackK };
  const stackEndW = L.W * 0.6;
  const stackEnd: Rect = { x: (L.W - stackEndW) / 2, y: (L.H - (stackEndW * STACK.h) / STACK.w) / 2, w: stackEndW, h: (stackEndW * STACK.h) / STACK.w };
  const stackCard = mixRegion(stackRect, stackEnd, settleP);
  const stackDrift = 1 + 0.006 * Math.max(0, Math.min(t, T(B.settle)) - T(B.keepIn) - 0.75);
  const keepOverlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, k: number) => {
    const a = toView({ x: TWO_OF_FIVE.x0, y: TWO_OF_FIVE.y });
    const b = toView({ x: TWO_OF_FIVE.x1, y: TWO_OF_FIVE.y });
    // 4:5 only: the Keep button's last 7 px (1150–1157, a row below the bullet) under the crop's left edge, covered in
    // the card's own ground once the push has narrowed onto the bullet
    const c0 = toView({ x: 1120, y: 948 });
    const c1 = toView({ x: 1162, y: 1026 });
    const u0 = toView({ x: KEEP_UPPER.x0, y: KEEP_UPPER.y0 });
    const u1 = toView({ x: KEEP_UPPER.x1, y: KEEP_UPPER.y1 });
    return (
      <>
        {L.portrait && keepP > 0.5 && settleP < 0.25 ? (
          <div style={{ position: "absolute", left: c0.x, top: c0.y, width: c1.x - c0.x, height: c1.y - c0.y, background: CARD_BG, opacity: 1 - settleP * 4 }} />
        ) : null}
        {upper > 0.001 ? <div style={{ position: "absolute", left: u0.x, top: u0.y, width: u1.x - u0.x, height: u1.y - u0.y, background: CARD_BG, opacity: upper }} /> : null}
        {underline > 0 ? <div style={{ position: "absolute", left: a.x, top: a.y, width: (b.x - a.x) * underline, height: Math.max(2, 3 * k), borderRadius: 2, background: C.clay, opacity: 0.95 }} /> : null}
      </>
    );
  };
  // the strip's hold drifts (0.8 %/s on the window, never on the type)
  const keepDrift = 1 + 0.008 * Math.max(0, Math.min(t, T(B.settle)) - T(B.keepPush)) + 0.006 * Math.max(0, t - T(B.settle) - SETTLE);

  const head: Rect = pick(L, {
    "16x9": { x: L.content.x, y: L.px(96), w: L.content.w, h: L.px(250) },
    "4x5": { x: L.content.x, y: L.px(104), w: L.content.w, h: L.px(250) },
  });
  const lineBox: Rect = pick(L, {
    "16x9": head,
    "4x5": { x: L.content.x, y: L.px(104), w: L.content.w, h: L.px(300) },
  });

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight">
          {/* both windows stay mounted for the whole scene (no mid-scene mount of a video); each holds its picture
              while hidden */}
          <FloatingWindow rect={rect} enter="none" radius={lerp(22, 20, foldP)} shadow={1} background={RSW_BG} style={{ opacity: pictureOn }}>
            <ScreenZoom src={SRC} srcSize={SIZE} time={time} keys={[{ t: 0, box: region }]} drift={0} motionBlur={false} edgeFade={16} overlay={mainOverlay} />
          </FloatingWindow>

          <Diagram t={t} T={T} L={L} cardOn={cardOn} />

          {L.portrait ? (
            <FloatingWindow
              rect={stackCard}
              enter="none"
              tilt={{ rx: 10, ry: 0 }}
              flattenAt={T(B.keepIn) + 0.15}
              flattenDur={0.45}
              radius={20}
              background={CARD_BG}
              offset={{ x: 0, y: (1 - keepPin) * 90 * L.u }}
              scale={lerp(0.97, 1, keepPin) * stackDrift}
              style={{ opacity: keepOn, filter: keepPin < 0.999 && keepOn > 0 ? `blur(${((1 - keepPin) * 14 * L.u).toFixed(2)}px)` : undefined }}
            >
              <StackedCard rect={stackCard} time={keepTime} underline={underline} />
            </FloatingWindow>
          ) : null}
          {L.portrait ? null : (
          <FloatingWindow
            rect={card}
            enter="none"
            tilt={{ rx: 10, ry: 0 }}
            flattenAt={T(B.keepIn) + 0.15}
            flattenDur={0.45}
            radius={20}
            background="#1C231C"
            offset={{ x: 0, y: (1 - keepPin) * 90 * L.u }}
            scale={lerp(0.97, 1, keepPin) * keepDrift}
            style={{ opacity: keepOn, filter: keepPin < 0.999 && keepOn > 0 ? `blur(${((1 - keepPin) * 14 * L.u).toFixed(2)}px)` : undefined }}
          >
            <ScreenZoom src={SRC} srcSize={SIZE} time={keepTime} keys={keepKeys} drift={0} motionBlur={false} edgeFade={8} overlay={keepOverlay} />
          </FloatingWindow>
          )}

          <TypeExit at={T(B.titleOut)} t={t} u={L.u}>
            <Headline
              text={"It builds small tools\nfor itself."}
              at={T(B.title)}
              entrance="blur"
              size={pick(L, { "16x9": L.type.title, "4x5": L.type.title })}
              align="left"
              valign="top"
              box={head}
            />
          </TypeExit>
          <TypeExit at={T(B.out)} t={t} u={L.u}>
            <Headline
              text={pick(L, { "16x9": "When the check disagrees,\nit asks you.", "4x5": "When the check\ndisagrees,\nit asks you." })}
              at={T(B.line)}
              entrance="line"
              size={pick(L, { "16x9": L.type.title, "4x5": L.px(92) })}
              align="left"
              valign="top"
              box={lineBox}
            />
          </TypeExit>
        </Stage>
        {S05_SFX.map((c) => (
          <Sfx key={`${c.file}-${c.s}`} src={sfxSrc(c.file)} at={sfxStart(c.file, T(c.s))} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};
