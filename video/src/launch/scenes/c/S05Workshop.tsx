// S05 Pebble's Workshop (EDIT_PLAN "S05", TREATMENT §3 act 5). Daylight world.
//
// "It builds its own tools." beside the real take RSW-01 (Pebble 2.0, the demo account, dark theme): the kiln request
// lands, the wait is compressed (every frame real) and the camera pushes onto "Running a script: Create, test, keep and
// use a kiln_ramp_time tool…". The window folds away into a diagram (plain marks and type, never a Pebble screen): code
// lines assemble into a small tool `kiln_ramp_time` → a sandbox → its own tests tick → a blind check (tests written from
// its description alone) returns 2 of 5 → it asks you (the pebble, in Pebble's own `question` pose). Then RSW-01's real
// Keep card rises in a card-shaped window: "Keep this tool in Pebble's Toolbox? · kiln_ramp_time … Pebble asks because
// the independent check disagreed (2 of 5 tests passed)."; the camera pushes onto that line and "When the check
// disagrees, it asks you." lands above it. The scene ends on that centred card, for S06's slabs to carry.
//
// Framings stay inside Pebble's window (RSW-01's ROIs): the menu bar (the recording pill, the clock) and the Dock are
// never in frame; RSW-01 has no usage line.
import { AbsoluteFill } from "remotion";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { PebbleActor, cues, look, pose } from "../../components/PebbleActor";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import type { ZoomKey } from "../../camera";
import { pick, useLayout, type Layout, type Rect } from "../../layout";
import { timeMap } from "../../timeMap";
import { C, EASE, FAMILY } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { Check, Cross, box, clamp01, lerp, ramp, rectAt, sfxSrc, sfxStart, useClock, type SfxNote } from "./common";

export const S05_NOMINAL = 8;

const SRC = "launch/takes/RSW-01.mp4";
const SIZE = { w: 2940, h: 1912 };

/** RSW-01 framings (source px): data/takes.ts ROIs, tightened on UI boundaries. */
/** the opening: the kiln request's bubble (836–2010 × 318–556 once sent, source 61.75) and the first steps under it */
const REQUEST = box(816, 298, 1214, 278);
const SCRIPT = box(610, 660, 950, 530);
const SCRIPT_45 = box(650, 640, 840, 740); // status + steps: "Running a script: Create, test, keep and use a kiln_ramp_time tool for…"
const KEEP_CARD = box(700, 664, 1324, 398); // the Keep card (714–2009 × 677–1048)
/**
 * The push: the bullet "Pebble asks because … (2 of 5 tests passed)." whole (795–1822 × 895–925), the buttons and the
 * card's bottom edge, under the description's last line (838–862); the window narrows to it, so on 16:9 the bullet
 * renders at ≈ 1.45× (≈ 39 px type, ≈ 45 px from ascender to descender).
 */
const KEEP_STRIP = box(712, 872, 1148, 182);
/** The bullet's "(2 of 5 tests passed)." on the source, for the drawn underline (an annotation). */
const TWO_OF_FIVE = { x0: 1555, x1: 1822, y: 935 };

/** Beats, seconds at the nominal length. */
const B = {
  windowIn: -0.6,
  title: 0,
  titleOut: 0.95,
  grow: 1.15,
  script: 1.85, // the clay line on screen (source 71.70)
  fold: 2.75, // the window folds into the tool chip
  bars: 2.85,
  chip: 3.25,
  sandbox: 3.45,
  intoBox: 3.75,
  ticks: [3.9, 4.0, 4.1] as const,
  blind: 4.2,
  marks: [4.42, 4.5, 4.58, 4.66, 4.74] as const,
  twoOfFive: 4.85,
  asks: 4.95,
  out: 5.48,
  keepIn: 5.5,
  keepLand: 5.68, // the card lands in the take (source 89.433)
  line: 5.68,
  push: 6.4,
} as const;

export const S05_MARKS = [
  { name: "title", s: B.title },
  { name: "script-line", s: B.script },
  { name: "diagram", s: B.fold },
  { name: "two-of-five", s: B.twoOfFive },
  { name: "asks-you", s: B.asks },
  { name: "keep-card", s: B.keepIn },
  { name: "when-the-check-disagrees", s: B.line },
] as const;

export const S05_SFX: SfxNote[] = [
  { scene: "S05", s: B.ticks[0] + 0.25, file: "sfx-tick.wav", db: -22, note: "its own test 1 ticks" },
  { scene: "S05", s: B.ticks[1] + 0.25, file: "sfx-tick-b.wav", db: -22, note: "its own test 2 ticks" },
  { scene: "S05", s: B.ticks[2] + 0.25, file: "sfx-tick.wav", db: -22, note: "its own test 3 ticks" },
  { scene: "S05", s: B.twoOfFive, file: "sfx-click-soft-a.wav", db: -15, note: "“2 of 5” lands (clay)" },
  { scene: "S05", s: B.asks + 0.08, file: "sfx-pop-soft-b.wav", db: -18, note: "the pebble pops in to ask" },
];

/**
 * Diagram geometry, in the diagram's own px (per aspect). The diagram is drawn at this size and shown through a camera
 * at `scale` (1.6× on 16:9, 1.25× on 4:5) that travels along the flow, so its marks and words read big; the type sizes
 * here are divided by the scale so they land at the sizes asked for (box labels ≥ 32 px, the titles ≥ 48 px, "2 of 5"
 * ≥ 80 px on screen).
 */
const diagram = (L: Layout) => {
  const P = L.px;
  if (!L.portrait) {
    const S = 1.6;
    const top = P(372);
    const h = P(330);
    return {
      portrait: false,
      S,
      chipStart: { x: P(128), y: P(505), w: P(350), h: P(84) },
      bars: { x: P(128), y: P(440), w: P(350) },
      sandbox: { x: P(560), y: top, w: P(440), h },
      chipIn: { x: P(605), y: top + P(46), w: P(350), h: P(84) },
      ticks: { x: P(660), y: top + P(170), d: P(64), gap: P(88) },
      ticksLabel: { x: P(560), y: top + P(254), w: P(440) },
      blind: { x: P(1080), y: top, w: P(440), h },
      blindLabel: { x: P(1080), y: top + P(30), w: P(440) },
      marks: { x: P(1120), y: top + P(130), d: P(58), gap: P(74) },
      two: { x: P(1080), y: top + P(206), w: P(440), h: P(100) },
      twoSize: P(62),
      pebble: { x: P(1690), y: top + P(250), size: P(190) },
      labels: { y: top + h + P(30), h: P(50) },
      arrows: [
        { x0: P(488), y0: top + h / 2, x1: P(548), y1: top + h / 2 },
        { x0: P(1010), y0: top + h / 2, x1: P(1068), y1: top + h / 2 },
        { x0: P(1530), y0: top + h / 2, x1: P(1588), y1: top + h / 2 },
      ],
      labelSize: P(60 / S),
      smallSize: P(34 / S),
      cols: [
        { x: P(560), w: P(440), text: "Sandbox" },
        { x: P(1080), w: P(440), text: "Blind check" },
        { x: P(1560), w: P(260), text: "Asks you." },
      ],
      // where the camera looks (diagram px) at each beat: the chip, the sandbox, the blind check, the last pair
      focus: [
        { at: B.chip, x: P(303), y: P(560) },
        { at: B.intoBox + 0.1, x: P(800), y: P(575) },
        { at: B.blind + 0.15, x: P(1180), y: P(585) },
        { at: B.twoOfFive, x: P(1450), y: P(590) },
      ],
    };
  }
  // 4:5: the same flow top to bottom, the camera travelling down it
  const S = 1.25;
  return {
    portrait: true,
    S,
    chipStart: { x: P(365), y: P(150), w: P(350), h: P(84) },
    bars: { x: P(365), y: P(110), w: P(350) },
    sandbox: { x: P(152), y: P(300), w: P(776), h: P(250) },
    chipIn: { x: P(192), y: P(400), w: P(350), h: P(84) },
    ticks: { x: P(600), y: P(380), d: P(64), gap: P(92) },
    ticksLabel: { x: P(600), y: P(462), w: P(320) },
    blind: { x: P(152), y: P(620), w: P(776), h: P(300) },
    blindLabel: { x: P(192), y: P(704), w: P(420) },
    marks: { x: P(192), y: P(800), d: P(58), gap: P(76) },
    two: { x: P(560), y: P(760), w: P(340), h: P(130) },
    twoSize: P(80),
    pebble: { x: P(380), y: P(1190), size: P(190) },
    labels: { y: 0, h: P(50) },
    arrows: [
      { x0: P(540), y0: P(244), x1: P(540), y1: P(292) },
      { x0: P(540), y0: P(558), x1: P(540), y1: P(612) },
      { x0: P(540), y0: P(928), x1: P(540), y1: P(990) },
    ],
    labelSize: P(54 / S),
    smallSize: P(32 / S),
    cols: [
      { x: P(192), w: P(500), y: P(322), text: "Sandbox" },
      { x: P(192), w: P(560), y: P(642), text: "Blind check" },
      { x: P(500), w: P(420), y: P(1084), text: "Asks you." },
    ],
    focus: [
      { at: B.chip, x: P(540), y: P(560) },
      { at: B.twoOfFive, x: P(540), y: P(722) },
    ],
  };
};

/** The diagram camera at `t`: diagram px → screen px is `p · S + o`. */
const diagramCam = (L: Layout, t: number, T: (x: number) => number) => {
  const g = diagram(L);
  const f = g.focus;
  let fx = f[0].x;
  let fy = f[0].y;
  for (let i = 1; i < f.length; i++) {
    const a = T(f[i - 1].at);
    const p = ramp(t, a, Math.max(0.2, T(f[i].at) - a), EASE.camera);
    fx = lerp(fx, f[i].x, p);
    fy = lerp(fy, f[i].y, p);
  }
  return { S: g.S, ox: L.W / 2 - fx * g.S, oy: L.H / 2 - fy * g.S };
};

type DG = ReturnType<typeof diagram>;

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

const Chip: React.FC<{ r: Rect; text: number; textOpacity: number; opacity?: number }> = ({ r, text, textOpacity, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      borderRadius: r.h * 0.26,
      background: DAY.ink,
      opacity,
      boxShadow: `0 ${r.h * 0.12}px ${r.h * 0.4}px rgba(74, 62, 44, 0.22)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FAMILY.mono,
      fontWeight: 500,
      fontSize: text,
      color: C.stone0,
      letterSpacing: "-0.01em",
    }}
  >
    <span style={{ opacity: textOpacity }}>kiln_ramp_time</span>
  </div>
);

const Diagram: React.FC<{ t: number; T: (x: number) => number; L: Layout }> = ({ t, T, L }) => {
  const g = diagram(L);
  const stroke = L.px(2.5);
  const out = ramp(t, T(B.out), 0.3, EASE.exit);
  if (t < T(B.bars) - 0.05 || out >= 1) return null;

  // code lines fly together into the chip
  const barW = [0.82, 0.58, 0.94, 0.46, 0.7];
  const scatter = [
    [-0.25, -1.4],
    [0.35, -0.8],
    [-0.1, 0.9],
    [0.45, 1.6],
    [-0.35, 2.2],
  ];
  const merge = ramp(t, T(B.chip) - 0.12, 0.3, EASE.camera);
  const chipOn = ramp(t, T(B.chip), 0.18, EASE.enter);
  const into = ramp(t, T(B.intoBox) - 0.3, 0.38, EASE.camera);
  const chipR: Rect = {
    x: lerp(g.chipStart.x, g.chipIn.x, into),
    y: lerp(g.chipStart.y, g.chipIn.y, into),
    w: g.chipStart.w,
    h: g.chipStart.h,
  };
  const boxIn = (at: number) => ramp(t, T(at), 0.4, EASE.enter);
  const sb = boxIn(B.sandbox);
  const bl = boxIn(B.blind);
  const twoIn = ramp(t, T(B.twoOfFive), 0.25, EASE.enter);
  const cam = diagramCam(L, t, T);

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
          background: dashed ? "rgba(255,255,255,0.0)" : "rgba(255,255,255,0.28)",
          opacity: p,
          transform: `scale(${0.96 + 0.04 * p})`,
        }}
      />
    );

  const label = (c: DG["cols"][number], at: number, size: number) => (
    <Headline
      key={c.text}
      text={c.text}
      at={T(at)}
      entrance="rise"
      size={size}
      variant="headline"
      align={g.portrait ? "left" : "center"}
      valign="top"
      fit={false}
      box={{ x: c.x, y: "y" in c && c.y !== undefined ? (c.y as number) : g.labels.y, w: c.w, h: size * 1.4 }}
    />
  );

  return (
    <AbsoluteFill
      style={{ opacity: 1 - out, transformOrigin: "0 0", transform: `translate(${cam.ox}px, ${cam.oy - L.px(40) * out}px) scale(${cam.S})` }}
    >
      {/* the code lines */}
      {barW.map((w, i) => {
        const appear = ramp(t, T(B.bars) + i * 0.045, 0.22, EASE.enter);
        if (appear <= 0 || merge >= 1) return null;
        const bx = g.bars.x + g.bars.w * (1 - w) * 0.5 + scatter[i][0] * L.px(60) * (1 - merge);
        const by = g.bars.y + i * L.px(26) + scatter[i][1] * L.px(26) * (1 - merge) + merge * (g.chipStart.y + g.chipStart.h / 2 - g.bars.y - i * L.px(26));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: bx,
              top: by,
              width: g.bars.w * w * (1 - 0.3 * merge),
              height: L.px(14),
              borderRadius: L.px(7),
              background: i % 2 ? C.sageDeep : DAY.ink2,
              opacity: appear * (1 - merge) * 0.75,
            }}
          />
        );
      })}
      {chipOn > 0 ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <Chip r={{ ...chipR, x: chipR.x + (chipR.w * (1 - (0.85 + 0.15 * chipOn))) / 2, w: chipR.w * (0.85 + 0.15 * chipOn) }} text={L.px(34)} textOpacity={chipOn} opacity={chipOn} />
        </div>
      ) : null}

      <div style={{ opacity: 1 - into }}>
        <Arrow a={g.arrows[0]} p={ramp(t, T(B.sandbox) - 0.1, 0.25, EASE.enter)} color={DAY.ink2} w={stroke} />
      </div>
      {frame(g.sandbox, sb, true)}
      {label(g.cols[0], B.sandbox + 0.05, g.labelSize)}
      {B.ticks.map((at, i) => (
        <Check key={i} x={g.ticks.x + i * g.ticks.gap} y={g.ticks.y} d={g.ticks.d} p={ramp(t, T(at), 0.32, EASE.enter)} color={DAY.sage} />
      ))}
      <div
        style={{
          position: "absolute",
          left: g.ticksLabel.x,
          top: g.ticksLabel.y,
          width: g.ticksLabel.w,
          textAlign: g.portrait ? "left" : "center",
          fontFamily: FAMILY.mono,
          fontWeight: 500,
          fontSize: g.smallSize,
          color: DAY.small,
          opacity: ramp(t, T(B.ticks[0]) + 0.1, 0.3),
        }}
      >
        its own tests
      </div>

      <Arrow a={g.arrows[1]} p={ramp(t, T(B.blind) - 0.1, 0.25, EASE.enter)} color={DAY.ink2} w={stroke} />
      {frame(g.blind, bl, false)}
      {label(g.cols[1], B.blind + 0.05, g.labelSize)}
      <div
        style={{
          position: "absolute",
          left: g.portrait ? g.blindLabel.x : g.blind.x,
          top: g.portrait ? g.blindLabel.y : g.blind.y + L.px(34),
          width: g.portrait ? g.blindLabel.w : g.blind.w,
          textAlign: g.portrait ? "left" : "center",
          fontFamily: FAMILY.mono,
          fontWeight: 500,
          fontSize: g.smallSize,
          lineHeight: 1.3,
          color: DAY.small,
          opacity: ramp(t, T(B.blind) + 0.12, 0.3),
        }}
      >
        tests written from
        <br />
        its description alone
      </div>
      {B.marks.map((at, i) =>
        i < 2 ? (
          <Check key={i} x={g.marks.x + i * g.marks.gap} y={g.marks.y} d={g.marks.d} p={ramp(t, T(at), 0.3, EASE.enter)} color={DAY.sage} />
        ) : (
          <Cross key={i} x={g.marks.x + i * g.marks.gap} y={g.marks.y} d={g.marks.d} p={ramp(t, T(at), 0.3, EASE.enter)} color={C.clay} />
        ),
      )}
      <div
        style={{
          position: "absolute",
          left: g.two.x,
          top: g.two.y,
          width: g.two.w,
          height: g.two.h,
          display: "flex",
          alignItems: "center",
          justifyContent: g.portrait ? "flex-end" : "center",
          fontFamily: FAMILY.sans,
          fontWeight: 700,
          fontSize: g.twoSize,
          letterSpacing: "-0.03em",
          color: "#B5562F",
          opacity: twoIn,
          transform: `translateY(${(1 - twoIn) * L.px(18)}px)`,
          filter: twoIn < 1 ? `blur(${(1 - twoIn) * 6}px)` : undefined,
        }}
      >
        2 of 5
      </div>

      <Arrow a={g.arrows[2]} p={ramp(t, T(B.asks) - 0.1, 0.22, EASE.enter)} color={DAY.ink2} w={stroke} />
      <PebbleActor
        x={g.pebble.x}
        y={g.pebble.y}
        size={g.pebble.size}
        enter={{ at: T(B.asks), kind: "pop" }}
        cues={cues(pose(0, "question"), look(T(B.asks) + 0.25, pick(L, { "16x9": -0.2, "4x5": 0.3 }), 0.1))}
      />
      {label(g.cols[2], B.asks + 0.08, g.labelSize)}
    </AbsoluteFill>
  );
};

export const S05Workshop: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T } = useClock(S05_NOMINAL, durationInFrames);
  const g = diagram(L);

  // RSW-01, the request: 1× as the bubble lands, the thinking compressed, 1× into the clay line (every frame real)
  const time = timeMap(
    [
      [0, 61.75],
      [T(0.6), 62.0],
      [T(B.script) - 0.1, 71.62],
      [T(B.script) + 0.9, 72.62],
    ],
    { tail: 1 },
  );
  const keepTime = timeMap(
    [
      [T(B.keepIn), 89.25],
      [T(B.keepIn) + 1, 90.25],
    ],
    { tail: 1, head: 0 },
  );

  // the opening: the kiln request's bubble, already sent, the window shaped to it and as wide as the content allows
  const openW = pick(L, { "16x9": L.content.w, "4x5": L.px(1040) });
  const openH = (openW * REQUEST.h) / REQUEST.w;
  const media: Rect = { x: (L.W - openW) / 2, y: pick(L, { "16x9": L.px(372), "4x5": L.px(470) }), w: openW, h: openH };
  const big = L.window;
  const c0 = diagramCam(L, T(B.chip), T);
  const foldTo = { x: g.chipStart.x * c0.S + c0.ox, y: g.chipStart.y * c0.S + c0.oy, w: g.chipStart.w * c0.S, h: g.chipStart.h * c0.S };
  const foldP = ramp(t, T(B.fold), 0.45, EASE.camera);
  const rect = rectAt(
    [
      { t: 0, rect: media },
      { t: T(B.grow), rect: media, dur: 0.01 },
      { t: T(B.grow) + 0.6, rect: big, dur: 0.6 },
      { t: T(B.fold), rect: big, dur: 0.01 },
      { t: T(B.fold) + 0.45, rect: foldTo, dur: 0.45 },
    ],
    t,
  );
  const keys: ZoomKey[] = [
    { t: 0, box: REQUEST },
    { t: T(B.grow) + 0.1, box: REQUEST },
    { t: T(B.script), box: pick(L, { "16x9": SCRIPT, "4x5": SCRIPT_45 }), dur: 0.65 },
  ];

  // the Keep card rises whole, then the window narrows onto its bullet while the camera pushes in
  const cardW0 = pick(L, { "16x9": L.px(1400), "4x5": L.px(1000) });
  const card0: Rect = { x: (L.W - cardW0) / 2, y: pick(L, { "16x9": L.px(520), "4x5": L.px(830) }), w: cardW0, h: (cardW0 * KEEP_CARD.h) / KEEP_CARD.w };
  const stripW = pick(L, { "16x9": L.content.w, "4x5": L.px(1040) });
  const strip: Rect = { x: (L.W - stripW) / 2, y: pick(L, { "16x9": L.px(560), "4x5": L.px(860) }), w: stripW, h: (stripW * KEEP_STRIP.h) / KEEP_STRIP.w };
  const card = rectAt(
    [
      { t: T(B.keepIn), rect: card0 },
      { t: T(B.push), rect: strip, dur: 0.6 },
    ],
    t,
  );
  const keepKeys: ZoomKey[] = [
    { t: T(B.keepIn), box: KEEP_CARD },
    { t: T(B.push) - 0.6, box: KEEP_CARD },
    { t: T(B.push), box: KEEP_STRIP, dur: 0.6 },
  ];

  // the steps run past the push's right edge: feather it into the window's own ground (never a sliced word)
  const featherK = ramp(t, T(B.grow), 0.4);
  const feather = () =>
    featherK > 0.01 ? (
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "16%", opacity: featherK, background: "linear-gradient(90deg, rgba(22,26,23,0) 0%, rgba(22,26,23,0.92) 55%, rgb(22,26,23) 100%)" }} />
    ) : null;

  const underline = ramp(t, T(B.push) + 0.15, 0.45, EASE.enter);
  const keepOverlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, k: number) => {
    if (underline <= 0) return null;
    const a = toView({ x: TWO_OF_FIVE.x0, y: TWO_OF_FIVE.y });
    const b = toView({ x: TWO_OF_FIVE.x1, y: TWO_OF_FIVE.y });
    return <div style={{ position: "absolute", left: a.x, top: a.y, width: (b.x - a.x) * underline, height: Math.max(2, 3 * k), borderRadius: 2, background: C.clay, opacity: 0.95 }} />;
  };

  const lineText = pick(L, { "16x9": "When the check disagrees,\nit asks you.", "4x5": "When the check\ndisagrees,\nit asks you." });
  const lineBox: Rect = pick(L, {
    "16x9": { x: L.content.x, y: L.px(230), w: L.content.w, h: L.px(270) },
    "4x5": { x: L.content.x, y: L.px(370), w: L.content.w, h: L.px(420) },
  });

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight">
          {t < T(B.fold) + 0.5 ? (
            <FloatingWindow
              rect={rect}
              at={T(B.windowIn)}
              flattenAt={0.15}
              flattenDur={0.7}
              style={{ opacity: 1 - foldP }}
            >
              <ScreenZoom src={SRC} srcSize={SIZE} time={time} keys={keys} drift={0.01} overlay={feather} />
            </FloatingWindow>
          ) : null}
          <Headline
            text={pick(L, { "16x9": "It builds its own tools.", "4x5": "It builds\nits own tools." })}
            at={T(B.title)}
            exitAt={T(B.titleOut)}
            size={L.type.title}
            align={L.portrait ? "left" : "center"}
            valign="middle"
            box={pick(L, { "16x9": { x: L.content.x, y: L.px(130), w: L.content.w, h: L.px(190) }, "4x5": { x: L.content.x, y: L.px(150), w: L.content.w, h: L.px(280) } })}
          />

          <Diagram t={t} T={T} L={L} />

          {t >= T(B.keepIn) ? (
            <FloatingWindow rect={card} at={T(B.keepIn)} enter="rise" tilt={{ rx: 10, ry: 0 }} flattenAt={T(B.keepIn) + 0.2} flattenDur={0.5} radius={20}>
              <ScreenZoom src={SRC} srcSize={SIZE} time={keepTime} keys={keepKeys} drift={0.003} overlay={keepOverlay} />
            </FloatingWindow>
          ) : null}
          <Headline text={lineText} at={T(B.line)} entrance="line" size={pick(L, { "16x9": L.type.title, "4x5": L.type.title })} align="center" valign="bottom" box={lineBox} />
        </Stage>
        {S05_SFX.map((c) => (
          <Sfx key={`${c.file}-${c.s}`} src={sfxSrc(c.file)} at={sfxStart(c.file, T(c.s))} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};
