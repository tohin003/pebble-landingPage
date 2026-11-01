// S10 Benchmarks (13.954 s, 79.101 to 93.055): the payoff of the hook's open question (TREATMENT §3 "The numbers";
// REVIEW-1 M4, M5, S4, S6, S7, S9; FIXES-1 WP-D; REVIEW-2 S-3, S-5, N-2, N-3; FIXES-2 R2-D).
//
// 0.00  S09's last frame: the Veil pebble centred at (0.5 W, 0.5 H), its body 12 % of the frame's height, on the dusk
//       night. On S10's first frame the daylight opens out of the pebble's own outline (its silhouette plus 4 px), and
//       grows as its centre travels up to the question's line, the whole pebble always inside it (REVIEW-3 N-1), so the
//       question is never cut by the blob's edge: it is set, whole, on the frame the blob first holds all of it (about
//       0.15 s, 79.25 on the film), with a short blur-in. The pebble's colour (S09's dark theme to the daylight's light
//       theme) changes in a radial wipe from its top over 8 frames; then it sheds the Veil (Pebble's own release, played
//       at half speed: 1.3 s from 0.27, so the dusk edge crosses the body over about 7 frames). No bloom, no glow.
// 0.15  "So. How did it do?" holds still through the music's stop (about 1.25 to 1.9 s: the master ducks the music):
//       about 1.8 s readable.
// 1.95  The payoff (81.051): picture and impact on the same frame. "Tasks done correctly." and the scaffold (method
//       lines, names, tracks, divider, footnote) land together; both bars of a panel start on the same frame with the
//       same 0.75 s grow and ease, so their ratio holds on every frame, and their numbers land with them: a number is
//       never counted, so no unpublished value is ever drawn. The first panel, then the second half a beat later.
// 4.75, 8.50  Only the headline, the bars and the values change: the values leave, both bars of each panel retract
//       together, the next headline lands with "Lower is better." under it (Inter 600, #506E54, held to the end), then
//       the bars grow again. The scaffold stays: no empty frame between metrics.
// The pebble stands in the gutter between the two comparisons, beside Pebble's bars: it watches each panel grow and
// reacts as it lands, in Pebble's own poses (hover, tap, happy). At 12.45 the chart leaves; the pebble hops to
// (0.5 W, 0.56 H), its body 11 % of the frame's height, and lands happy: S11 starts from it.
//
// Every number is the published one (v2.0.0 release notes; TREATMENT §3), exactly. Rival names in plain text only.
import { AbsoluteFill } from "remotion";
import { BODY, VIEWBOX_SIZE } from "../../../../../shared/pebble";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { PebbleActor, cues, look, lookBack, pose } from "../../components/PebbleActor";
import { SfxTrack, type SfxCue } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { pebblePath } from "../../components/transitions";
import { useLayout, type Layout, type Rect } from "../../layout";
import { EASE, TYPE } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { PLACE_SFX, SFX, clamp01, lerp, peakAt, useRetime, useT } from "./common";
import { VeilShed } from "./VeilShed";

/** its slot on the master (FIXES-2: 79.101 to 93.055) */
export const S10_NOMINAL = 13.954;

/** TREATMENT §3's footnote, word for word ("Pebble 1.9.29" is kept on one line where it is drawn). */
export const S10_FOOTNOTE =
  "Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each, 255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Costs at public list prices. Full results, including time, safety and where Pebble trails, in the 2.0.0 release notes.";

/**
 * The pebble's handoffs (FIXES-1): its BODY's centre as fractions of the frame and the body's height as a fraction of
 * the frame's height. In: S09's last frame and S10's first. Out: S10's last frame and S11's first.
 */
export const S10_PEBBLE_IN = { x: 0.5, y: 0.5, h: 0.12 } as const;
export const S10_PEBBLE_OUT = { x: 0.5, y: 0.56, h: 0.11 } as const;
/** The PebbleActor / VeilPebble numbers (the foot and the 220-unit viewBox's size) for a body centred at (x W, y H), h H tall. */
export const pebblePlace = (W: number, H: number, p: { x: number; y: number; h: number }) => {
  const bodyH = p.h * H;
  const size = (bodyH * VIEWBOX_SIZE) / BODY.height;
  return { x: p.x * W, y: p.y * H + bodyH / 2, size, cy: p.y * H, bodyW: (BODY.width * size) / VIEWBOX_SIZE, bodyH };
};

/** The two comparisons, as the release notes' tables head them (C-FILM2-37). */
const PANELS = [
  { lead: "vs Claude Code,", rest: "both on claude-opus-5-5", rival: "Claude Code" },
  { lead: "vs Codex,", rest: "both on gpt-6.1-sol", rival: "Codex" },
] as const;

interface Metric {
  title: string;
  /** the title on 4:5 (line breaks) */
  titlePortrait: string;
  unit?: string;
  prefix?: string;
  decimals: number;
  /** one scale for both panels of a metric, so their bars compare honestly; bars run from zero */
  max: number;
  lowerIsBetter?: boolean;
  /** [panel][Pebble, rival] */
  values: readonly [readonly [number, number], readonly [number, number]];
  details?: readonly [readonly [string, string], readonly [string, string]];
}

/** TREATMENT §3, exactly as published. */
export const S10_METRICS: readonly Metric[] = [
  {
    title: "Tasks done correctly.",
    titlePortrait: "Tasks done\ncorrectly.",
    unit: "%",
    decimals: 1,
    max: 100,
    values: [
      [92.2, 83.5],
      [95.3, 90.6],
    ],
    details: [
      ["235 of 255", "213 of 255"],
      ["243 of 255", "231 of 255"],
    ],
  },
  {
    title: "Said “done” when it wasn’t.",
    titlePortrait: "Said “done”\nwhen it wasn’t.",
    unit: "%",
    decimals: 1,
    max: 16,
    lowerIsBetter: true,
    values: [
      [6.3, 13.7],
      [3.9, 7.1],
    ],
  },
  {
    title: "Cost per task.",
    titlePortrait: "Cost per task.",
    prefix: "$",
    decimals: 3,
    max: 0.13,
    lowerIsBetter: true,
    values: [
      [0.091, 0.117],
      [0.042, 0.05],
    ],
  },
];

/** Beats at the nominal length (seconds from the scene's start); multiplied by the retime factor. */
export const S10_BEATS = {
  /** the Veil's switch: Pebble's own release plays from here, at half speed (1.3 s; REVIEW-3 N-1), once the theme's
   *  colour wipe has crossed the body */
  veilOff: 0.27,
  /** the daylight opens out of the pebble's own outline (plus 4 px) on S10's first frame, and travels up to the
   *  question's line as it grows (REVIEW-3 N-1) */
  wipe: 0,
  /** the blob holds the whole question: it is set (79.25 on the film) */
  question: 0.15,
  /** the music's stop (the master's duck, 80.35 to 81.0 on the film) */
  stop: 1.25,
  /** each metric's mark: the first is the payoff's impact (81.051); the next two swap the headline (84.301, 88.051) */
  metrics: [1.95, 5.2, 8.95],
  /** the cost chart: the pebble's happy reaction once both panels have landed (90.3 on the film; REVIEW-2 S-5) */
  costHappy: 11.2,
  /** the chart leaves */
  exit: 12.9,
  /** the pebble's hop to its end mark; it lands happy */
  hop: 13.0,
} as const;
/** the blob: it holds the question at `question`, and has covered the frame at WIPE_DUR */
const WIPE_DUR = 0.5;
/** Pebble's release (0.65 s) at VEIL_RATE, from veilOff: the hand-over to <PebbleActor> after it */
const VEIL_RATE = 0.5;
const RELEASE_END = 0.27 + 0.68 / VEIL_RATE;
/** the pebble's colour (S09's dark-theme Veil → the daylight's light-theme Veil): a radial wipe over 8 frames at 30 fps,
 *  from the side the blob grows to (the body's top, towards the question), never a hard split */
const THEME_WIPE = 0.27;
const GROW = 0.75;
const RETRACT = 0.3;
/** the second panel starts half a beat after the first */
const PANEL_GAP = 0.5;
/** each metric's bars start this long after its mark: the first on the impact, the next ones once the headline has landed */
const BAR_DELAY = [0, 0.75, 0.75] as const;
const HOP_DUR = 0.4;
/** the pebble nods on these downbeats while a chart holds (the cost chart's after its happy reaction) */
const NODS = [3.95, 7.95, 12.05] as const;
const HEAD_OUT = 0.18;
/** how far the chart's body drifts in over a hold (a fraction of its size) */
const DRIFT = 0.012;
const HEAD_IN = 0.22;

const barStartAt = (m: number, p: number) => S10_BEATS.metrics[m] + BAR_DELAY[m] + p * PANEL_GAP;
const landAt = (m: number, p: number) => barStartAt(m, p) + GROW;
const HAPPY = S10_BEATS.hop + HOP_DUR;

export const S10_MARKS = [
  { name: "the daylight opens in a blob on the question's line; the Veil sheds inside it", s: S10_BEATS.wipe },
  { name: "\"So. How did it do?\" set, whole, inside the blob", s: S10_BEATS.question },
  { name: "the music's stop: the question still", s: S10_BEATS.stop },
  { name: "the payoff: chart 1 and the impact (tasks done correctly)", s: S10_BEATS.metrics[0] },
  ...S10_METRICS.flatMap((_, m) => [
    ...(m > 0 ? [{ name: `metric ${m + 1}: the headline swaps (${m === 1 ? "said done when it wasn't" : "cost per task"})`, s: S10_BEATS.metrics[m] }] : []),
    { name: `metric ${m + 1}: panel 1 lands`, s: landAt(m, 0) },
    { name: `metric ${m + 1}: panel 2 lands`, s: landAt(m, 1) },
  ]),
  { name: "the cost chart: the pebble's happy reaction", s: S10_BEATS.costHappy },
  { name: "the chart leaves", s: S10_BEATS.exit },
  { name: "the pebble lands happy at (0.5 W, 0.56 H)", s: HAPPY },
] as const;

/** The scene's SFX cues for the master (seconds from the scene's start, at nominal length × k; `at` is the file's start). */
export const s10Sfx = (k = 1): SfxCue[] => {
  const out: SfxCue[] = [
    // the daylight opening: a short whoosh peaking as the blob takes the question, gone well before the stop
    peakAt(SFX.whoosh, (S10_BEATS.wipe + 0.12) * k, -19),
    // the payoff's impact on the chart's first frame (the master plays the list's first thud as the full impact)
    peakAt(SFX.thud, S10_BEATS.metrics[0] * k, -12),
  ];
  S10_METRICS.forEach((_, m) => {
    // the headline swaps
    if (m > 0) out.push(peakAt(m === 1 ? SFX.whoosh2 : SFX.whoosh, (S10_BEATS.metrics[m] + 0.1) * k, -19));
    // one tick as each panel's bars and numbers land
    for (let p = 0; p < 2; p++) out.push(peakAt(SFX.tick, landAt(m, p) * k, -16));
  });
  // the cost chart: a soft click under the pebble's happy reaction
  out.push(peakAt(SFX.click2, S10_BEATS.costHappy * k, -17));
  // the pebble lands happy
  out.push(peakAt(SFX.shimmer, HAPPY * k + 0.02, -15));
  return out.sort((a, b) => a.at - b.at);
};

/* ---------- layout ---------- */

interface Geo {
  question: Rect;
  /** the question's ink, about (what the blob must hold whole before it is set) */
  questionInk: Rect;
  questionText: string;
  questionSize: number;
  headline: Rect;
  headlineSize: number;
  lower: Rect;
  lowerSize: number;
  panels: Rect[];
  /** the method lines: two lines (16:9) or one (4:5) */
  method: { lead: number; rest: number; twoLines: boolean };
  /** per row (Pebble, rival), relative to the panel's top */
  rowTop: [number, number];
  value: [number, number];
  name: [number, number];
  detail: number;
  barTop: [number, number];
  bar: [number, number];
  /** the divider's segments: [x1, y1, x2, y2] each (they break round the pebble) */
  divider: [number, number, number, number][];
  foot: Rect;
  footSize: number;
  /** the pebble's body height during the charts, as a fraction of the frame's height */
  chartH: number;
  /** where the pebble looks at each panel */
  lookAt: [{ x: number; y: number }, { x: number; y: number }];
}

const geometry = (L: Layout): Geo => {
  const p = L.px;
  if (!L.portrait) {
    const x0 = p(96);
    const w = p(1728);
    const gutter = p(232);
    const pw = (w - gutter) / 2;
    const py = p(300);
    const cx = L.W / 2;
    return {
      question: { x: x0, y: p(200), w, h: p(230) },
      questionInk: { x: L.W / 2 - p(690), y: p(250), w: p(1380), h: p(190) },
      questionText: "So. How did it do?",
      questionSize: L.type.display,
      headline: { x: x0, y: p(40), w, h: p(136) },
      headlineSize: p(112),
      lower: { x: x0, y: p(188), w: p(1200), h: p(80) },
      lowerSize: p(64),
      panels: [
        { x: x0, y: py, w: pw, h: p(460) },
        { x: x0 + pw + gutter, y: py, w: pw, h: p(460) },
      ],
      method: { lead: p(48), rest: p(44), twoLines: true },
      rowTop: [p(136), p(334)],
      value: [p(100), p(76)],
      name: [p(56), p(48)],
      detail: p(36),
      barTop: [p(248), p(422)],
      bar: [p(52), p(38)],
      divider: [
        [cx, py, cx, p(428)],
        [cx, p(652), cx, py + p(460)],
      ],
      // 75 % of the frame's width (REVIEW-3 N-5)
      foot: { x: x0, y: p(832), w: p(1440), h: p(150) },
      footSize: p(30),
      chartH: 0.12,
      lookAt: [
        { x: -0.85, y: 0.12 },
        { x: 0.85, y: 0.12 },
      ],
    };
  }
  const x0 = p(64);
  const w = p(952);
  const cy = L.H / 2;
  return {
    question: { x: x0, y: p(250), w, h: p(320) },
    questionInk: { x: L.W / 2 - p(440), y: p(270), w: p(880), h: p(310) },
    questionText: "So.\nHow did it do?",
    questionSize: p(128),
    // headline and "Lower is better." 16 px higher, so the method line has 16 px more air under it (REVIEW-2 N-3)
    headline: { x: x0, y: p(20), w, h: p(178) },
    headlineSize: p(84),
    lower: { x: x0, y: p(206), w, h: p(62) },
    lowerSize: p(52),
    // the two comparisons stacked, with the band between them centred on the pebble (its handoff place and size)
    panels: [
      { x: x0, y: p(292), w, h: p(296) },
      { x: x0, y: p(784), w, h: p(296) },
    ],
    method: { lead: p(40), rest: p(40), twoLines: false },
    rowTop: [p(62), p(200)],
    value: [p(76), p(60)],
    name: [p(48), p(42)],
    detail: p(32),
    barTop: [p(146), p(268)],
    bar: [p(40), p(28)],
    divider: [
      [x0, cy, L.W / 2 - p(124), cy],
      [L.W / 2 + p(124), cy, x0 + w, cy],
    ],
    foot: { x: x0, y: p(1112), w, h: p(214) },
    footSize: p(28),
    chartH: 0.12,
    lookAt: [
      { x: 0.1, y: -0.85 },
      { x: 0.1, y: 0.85 },
    ],
  };
};

/* ---------- the daylight wipe ---------- */

/**
 * How much of the frame a pebble-shaped wipe of width `w` centred at (cx, cy) covers (0..1). The galet is taken as an
 * ellipse of its proportions (half-axes 0.5 w and 0.44 w); this only paces the wipe, the clip is the pebble's own path.
 */
const covered = (w: number, cx: number, cy: number, W: number, H: number): number => {
  const ax = 0.5 * w;
  const by = 0.44 * w;
  const n = 96;
  const x0 = Math.max(0, cx - ax);
  const x1 = Math.min(W, cx + ax);
  if (x1 <= x0) return 0;
  let area = 0;
  const dx = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * dx;
    const u = (x - cx) / ax;
    const half = by * Math.sqrt(Math.max(0, 1 - u * u));
    area += Math.max(0, Math.min(H, cy + half) - Math.max(0, cy - half)) * dx;
  }
  return area / (W * H);
};

/** The narrowest blob (the galet as an ellipse of half-axes 0.5 w and 0.44 w, with a margin for its flatter flanks) centred
 * at (cx, cy) that holds every corner of `r`. */
const containWidth = (r: Rect, cx: number, cy: number): number => {
  const corners = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ];
  // (dx / 0.5w)² + (dy / 0.44w)² ≤ 1  ⇔  w ≥ 2 √(dx² + (dy / 0.88)²)
  const w = Math.max(...corners.map(([x, y]) => 2 * Math.hypot(x - cx, (y - cy) / 0.88)));
  return w * 1.1;
};

/**
 * The blob's width `dt` seconds after it starts: from nothing to holding the question (wQ) at `tQ`, decelerating a
 * little into it, then on to past the frame's farthest corner at `tEnd`, the covered area growing nearly evenly.
 */
const blobWidth = (dt: number, tQ: number, tEnd: number, wQ: number, cx: number, cy: number, W: number, H: number): number => {
  if (dt <= 0) return 0;
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
  const wEnd = (far / 0.44) * 1.04;
  if (dt < tQ) {
    const q = dt / tQ;
    return wQ * (1 - Math.pow(1 - q, 1.6));
  }
  const q = clamp01((dt - tQ) / Math.max(0.01, tEnd - tQ));
  if (q >= 1) return wEnd;
  const fQ = covered(wQ, cx, cy, W, H);
  const target = fQ + (1 - fQ) * (0.7 * q + 0.3 * q * q * (3 - 2 * q));
  let lo = wQ;
  let hi = wEnd;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (covered(mid, cx, cy, W, H) < target) lo = mid;
    else hi = mid;
  }
  return Math.max(wQ, (lo + hi) / 2);
};

/**
 * The blob from S10's first frame (REVIEW-3 N-1): born as the pebble's own silhouette plus 4 px (w0, centred on the
 * body P), it grows to wQ by tQ while its centre travels to the question's line (Q), never faster than keeps the whole
 * pebble inside it (for one convex shape, a copy of width b sits inside a copy of width w when their centres are within
 * the shape of width w − b: about 0.44 (w − b) up or down); then blobWidth() takes it on from Q.
 */
const blobAt = (dt: number, tQ: number, tEnd: number, w0: number, bodyW: number, wQ: number, P: { x: number; y: number }, Q: { x: number; y: number }, W: number, H: number) => {
  if (dt >= tQ) return { w: blobWidth(dt, tQ, tEnd, wQ, Q.x, Q.y, W, H), x: Q.x, y: Q.y };
  const q = clamp01(dt / tQ);
  const w = w0 + (wQ - w0) * (1 - Math.pow(1 - q, 1.6));
  const dist = Math.hypot(Q.x - P.x, Q.y - P.y);
  const s = dist < 1 ? 1 : Math.min(q, (0.85 * 0.44 * (w - bodyW)) / dist);
  return { w, x: P.x + (Q.x - P.x) * s, y: P.y + (Q.y - P.y) * s };
};

/* ---------- time ---------- */

/** a bar's grow: a long landing, but visibly arriving at the end of its 0.75 s (the number lands on that frame) */
const growEase = (x: number) => 1 - Math.pow(1 - clamp01(x), 2.6);
/** the retract accelerates away */
const retractEase = (x: number) => clamp01(x) * clamp01(x);

/** The pebble's acting: watches each panel grow, reacts as it lands (Pebble's own poses only). */
const pebbleCues = (a: (s: number) => number, G: Geo) =>
  cues(
    pose(0, "idle"),
    // up at the question once the Veil is off, then still through the stop
    look(a(0.7), 0, -0.8),
    // the payoff: attentive
    pose(a(S10_BEATS.metrics[0]), "hover"),
    ...S10_METRICS.flatMap((_, m) =>
      m < S10_METRICS.length - 1
        ? [
            look(a(barStartAt(m, 0)) + 0.04, G.lookAt[0].x, G.lookAt[0].y),
            // the first panel lands: happy eyes
            pose(a(landAt(m, 0)), "tap"),
            look(a(landAt(m, 0)) + 0.12, G.lookAt[1].x, G.lookAt[1].y),
            // back to attentive once the second has landed
            pose(a(landAt(m, 1)) + 0.7, "hover"),
            lookBack(a(landAt(m, 1)) + 0.7),
          ]
        : [
            // the cost chart: it watches both panels land, then reacts happy (REVIEW-2 S-5: 90.3, not 89.6)
            look(a(barStartAt(m, 0)) + 0.04, G.lookAt[0].x, G.lookAt[0].y),
            look(a(landAt(m, 0)) + 0.12, G.lookAt[1].x, G.lookAt[1].y),
            lookBack(a(S10_BEATS.costHappy) - 0.12),
            pose(a(S10_BEATS.costHappy), "tap"),
            pose(a(S10_BEATS.costHappy) + 0.75, "hover"),
          ],
    ),
    // the end: it hops to its mark and lands happy
    pose(a(HAPPY), "happy"),
  );

/* ---------- the scene ---------- */

export const S10Benchmarks: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { at: a, k } = useRetime(S10_NOMINAL, durationInFrames);
  const G = geometry(L);

  const start = pebblePlace(L.W, L.H, S10_PEBBLE_IN);
  const end = pebblePlace(L.W, L.H, S10_PEBBLE_OUT);
  const chartSize = (G.chartH / S10_PEBBLE_IN.h) * start.size;

  // the daylight opens out of the pebble's outline (a little wider than the body, so the whole pebble is inside it)
  const wipeAt = a(S10_BEATS.wipe);
  const wipeP = clamp01((t - wipeAt) / a(WIPE_DUR));
  const dayOn = t >= wipeAt;
  const nightOn = wipeP < 1;

  const pebbleCueList = pebbleCues(a, G);
  const veil = [{ at: a(S10_BEATS.veilOff), on: false }];

  // the pebble during the charts: in 4:5 it settles from its handoff size to the band between the two comparisons
  const impact = a(S10_BEATS.metrics[0]);
  const settle = EASE.enter(clamp01((t - impact) / 0.32));
  const sizeNow = lerp(start.size, chartSize, settle);
  const footNow = { x: start.x, y: start.cy + (sizeNow * BODY.height) / VIEWBOX_SIZE / 2 };
  const hopAt = a(S10_BEATS.hop);
  // a squash at the impact and at each landing; in the holds it nods on the bar's downbeat (it never holds dead still)
  const pulses = [impact, ...S10_METRICS.flatMap((_, m) => [a(landAt(m, 0)), a(landAt(m, 1))]), a(S10_BEATS.costHappy), ...NODS.map(a)];
  // the blob: centred on the question's line; it holds the whole question at `question`, then covers the frame
  const qc = { x: G.question.x + G.question.w / 2, y: G.questionInk.y + G.questionInk.h / 2 };
  const wQ = containWidth(G.questionInk, qc.x, qc.y);
  const P = { x: start.x, y: start.cy };
  const w0 = (start.bodyW * (start.bodyH + L.px(8))) / start.bodyH;
  const blob = blobAt(t - wipeAt, a(S10_BEATS.question) - wipeAt, a(WIPE_DUR), w0, start.bodyW, wQ, P, qc, L.W, L.H);
  // the pebble's colour: S09's dark-theme pebble stays drawn over the daylight, and a disc growing from the body's top
  // (the blob's side) takes it away over THEME_WIPE, its edge soft over 3 px
  const themeP = EASE.camera(clamp01((t - wipeAt) / a(THEME_WIPE)));
  const tOrigin = { x: P.x, y: P.y - start.bodyH * 0.55 };
  const tSoft = L.px(3);
  const tR = (Math.hypot(start.bodyW / 2, start.bodyH * 1.1) + tSoft + L.px(6)) * themeP;
  const qAt = a(S10_BEATS.question);

  const sfx = PLACE_SFX ? <SfxTrack cues={s10Sfx(k)} /> : null;

  return (
    <FontGate>
      <AbsoluteFill>
        {nightOn && (
          // S09's dusk night, receding a little as the daylight opens
          <AbsoluteFill style={{ filter: dayOn && wipeP > 0 ? `brightness(${(1 - 0.3 * wipeP).toFixed(3)})` : undefined }}>
            <Stage world="night" tint="dusk" keyLight={{ x: 0.5, y: 0.5, r: 0.6 }}>
              <VeilShed x={start.x} y={start.y} size={start.size} theme="dark" cues={pebbleCueList} veil={veil} rate={VEIL_RATE} />
            </Stage>
          </AbsoluteFill>
        )}
        {dayOn && (
          <AbsoluteFill style={nightOn ? { clipPath: pebblePath(blob.x, blob.y, blob.w) } : undefined}>
            <Stage world="daylight" keyLight={L.portrait ? { x: 0.4, y: 0.08, r: 0.95 } : { x: 0.32, y: 0.06, r: 0.95 }}>
              {t < impact && (
                <Headline text={G.questionText} at={qAt - 0.02} entrance="blur" together dur={0.13} size={G.questionSize} align="center" valign="bottom" box={G.question} lineStagger={0} />
              )}
              <Chart G={G} a={a} />
              {t < a(RELEASE_END) ? (
                <VeilShed x={start.x} y={start.y} size={start.size} theme="light" cues={pebbleCueList} veil={veil} rate={VEIL_RATE} shadow />
              ) : (
                <PebbleActor
                  x={footNow.x}
                  y={footNow.y}
                  size={t < hopAt - 0.2 ? sizeNow : chartSize}
                  cues={pebbleCueList}
                  pulses={pulses}
                  hops={[{ at: hopAt, to: { x: end.x, y: end.y }, duration: HOP_DUR, height: end.bodyH * 0.45 }]}
                  grow={{ at: hopAt, to: end.size, dur: HOP_DUR }}
                />
              )}
            </Stage>
          </AbsoluteFill>
        )}
        {dayOn && themeP < 1 && (
          <AbsoluteFill
            style={{
              maskImage: `radial-gradient(circle at ${tOrigin.x.toFixed(1)}px ${tOrigin.y.toFixed(1)}px, transparent ${tR.toFixed(1)}px, #000 ${(tR + tSoft).toFixed(1)}px)`,
              WebkitMaskImage: `radial-gradient(circle at ${tOrigin.x.toFixed(1)}px ${tOrigin.y.toFixed(1)}px, transparent ${tR.toFixed(1)}px, #000 ${(tR + tSoft).toFixed(1)}px)`,
            }}
          >
            <VeilShed x={start.x} y={start.y} size={start.size} theme="dark" cues={pebbleCueList} veil={veil} rate={VEIL_RATE} />
          </AbsoluteFill>
        )}
        {sfx}
      </AbsoluteFill>
    </FontGate>
  );
};

/* ---------- the chart: the scaffold persists, only the headline, the bars and the values change ---------- */

const Chart: React.FC<{ G: Geo; a: (s: number) => number }> = ({ G, a }) => {
  const t = useT();
  const L = useLayout();
  const impact = a(S10_BEATS.metrics[0]);
  if (t < impact) return null;
  const exit = a(S10_BEATS.exit);
  const ex = retractEase((t - exit) / 0.2);
  if (ex >= 1) return null;
  // the impact: a 3.5 % punch that decays (a hit, never a creep)
  const punch = 1 + 0.035 * (1 - EASE.enter(clamp01((t - impact) / 0.3)));
  const marks = S10_BEATS.metrics.map(a);
  // the metric on screen: the last whose mark has passed
  let m = 0;
  for (let i = 0; i < marks.length; i++) if (t >= marks[i]) m = i;
  // N4: the chart's body (never its headline) drifts in while a metric holds, about 0.4 % a second, and eases back
  // under the next swap, while the bars retract, so no hold is dead still
  const holdFrom = marks[m] + RETRACT;
  const holdTo = m + 1 < marks.length ? marks[m + 1] : exit;
  const back = m > 0 ? 1 - EASE.camera(clamp01((t - marks[m]) / RETRACT)) : 0;
  const prevDrift = m > 0 ? DRIFT * clamp01((marks[m] - (marks[m - 1] + RETRACT)) / (marks[m] - marks[m - 1] - RETRACT)) : 0;
  const drift = t < holdFrom ? prevDrift * back : DRIFT * clamp01((t - holdFrom) / Math.max(0.01, holdTo - holdFrom));

  return (
    <AbsoluteFill
      style={{
        opacity: 1 - ex,
        transform: `translateY(${(ex * L.px(14)).toFixed(2)}px) scale(${punch.toFixed(5)})`,
        transformOrigin: "50% 45%",
      }}
    >
      {S10_METRICS.map((metric, i) => (
        <MetricHeadline key={i} G={G} text={L.portrait ? metric.titlePortrait : metric.title} at={i === 0 ? marks[0] : marks[i] + HEAD_IN} slam={i === 0} exitAt={marks[i + 1]} />
      ))}
      <LowerIsBetter G={G} at={marks[1] + HEAD_IN} />
      <AbsoluteFill style={{ transform: drift > 1e-5 ? `scale(${(1 + drift).toFixed(5)})` : undefined, transformOrigin: "50% 52%" }}>
      {PANELS.map((panel, p) => (
        <Panel key={p} G={G} p={p} m={m} a={a} />
      ))}
      {G.divider.map(([x1, y1, x2, y2], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: Math.min(x1, x2) - (x1 === x2 ? Math.max(1, L.px(2)) / 2 : 0),
            top: Math.min(y1, y2) - (y1 === y2 ? Math.max(1, L.px(2)) / 2 : 0),
            width: x1 === x2 ? Math.max(1, L.px(2)) : Math.abs(x2 - x1),
            height: y1 === y2 ? Math.max(1, L.px(2)) : Math.abs(y2 - y1),
            background: DAY.line,
          }}
        />
      ))}
      <Footnote G={G} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A metric's headline: the first slams in on the impact frame; the others swap in after the previous has gone. */
const MetricHeadline: React.FC<{ G: Geo; text: string; at: number; slam: boolean; exitAt?: number }> = ({ G, text, at, slam, exitAt }) => {
  const t = useT();
  const L = useLayout();
  if (t < at) return null;
  const ex = exitAt === undefined ? 0 : EASE.exit(clamp01((t - exitAt) / HEAD_OUT));
  if (ex >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ex, transform: ex > 0 ? `translateY(${(-ex * L.px(18)).toFixed(2)}px)` : undefined, filter: ex > 0.02 ? `blur(${(ex * 6 * L.u).toFixed(2)}px)` : undefined }}>
      <Headline
        text={text}
        at={slam ? at - 0.1 : at}
        entrance={slam ? "line" : "blur"}
        together={slam}
        size={G.headlineSize}
        align="left"
        valign="bottom"
        box={G.headline}
        fit
      />
    </div>
  );
};

/** "Lower is better." (M4): Inter 600, #506E54, directly under the headline, landing with metric 2's and held to the end. */
const LowerIsBetter: React.FC<{ G: Geo; at: number }> = ({ G, at }) => {
  const t = useT();
  if (t < at) return null;
  return (
    <Headline
      text="Lower is better."
      at={at}
      entrance="line"
      variant="support"
      weight={600}
      size={G.lowerSize}
      color={DAY.sage}
      align="left"
      valign="top"
      box={G.lower}
      fit={false}
      style={{ letterSpacing: "-0.02em" }}
    />
  );
};

/** One comparison: its method lines, the two rows' names, tracks and bars, and the values that land with the bars. */
const Panel: React.FC<{ G: Geo; p: number; m: number; a: (s: number) => number }> = ({ G, p, m, a }) => {
  const t = useT();
  const L = useLayout();
  const b = G.panels[p];
  const panel = PANELS[p];
  const marks = S10_BEATS.metrics.map(a);
  const start = a(barStartAt(m, p));
  const ink = DAY.ink;
  const ink2 = DAY.ink2;

  // both bars of the panel share one progress: started on the same frame, same duration, same ease
  const fracs = [0, 1].map((r) => {
    const frac = (mm: number) => Math.min(1, S10_METRICS[mm].values[p][r] / S10_METRICS[mm].max);
    if (t >= start) return frac(m) * growEase((t - start) / GROW);
    if (m > 0) return frac(m - 1) * (1 - retractEase((t - marks[m]) / RETRACT));
    return 0;
  });

  // a value lands with its bars: it clears in the bars' last 0.12 s and is sharp on the landing frame; it leaves in
  // 0.12 s at the next metric's mark. Only the published value is ever drawn.
  const valueVis = (mm: number) => {
    const land = a(landAt(mm, p));
    if (t < land - 0.12) return 0;
    const qIn = clamp01((t - (land - 0.12)) / 0.12);
    const next = marks[mm + 1];
    const qOut = next === undefined ? 0 : clamp01((t - next) / 0.12);
    return qIn * (1 - qOut);
  };

  const methodLead: React.CSSProperties = { fontFamily: TYPE.support.fontFamily, fontVariationSettings: '"opsz" 32', fontWeight: 600, fontSize: G.method.lead, letterSpacing: "-0.015em", color: ink, whiteSpace: "nowrap" };
  const methodRest: React.CSSProperties = { fontFamily: TYPE.support.fontFamily, fontVariationSettings: '"opsz" 32', fontWeight: 460, fontSize: G.method.rest, letterSpacing: "-0.01em", color: ink2, whiteSpace: "nowrap" };

  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h }}>
      {G.method.twoLines ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, lineHeight: 1.12, ...methodLead }}>{panel.lead}</div>
          <div style={{ position: "absolute", left: 0, top: G.method.lead * 1.16, lineHeight: 1.12, ...methodRest }}>{panel.rest}</div>
        </>
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, lineHeight: 1.12, whiteSpace: "nowrap" }}>
          {/* the word space inside the lead's own span, at its size (REVIEW-2 N-3: it was a thin space at the default size) */}
          <span style={methodLead}>{`${panel.lead} `}</span>
          <span style={methodRest}>{panel.rest}</span>
        </div>
      )}
      {[0, 1].map((r) => {
        const ours = r === 0;
        // the metrics whose values are on screen: the current one once it lands, the previous one while it leaves
        const shown = [m - 1, m].filter((mm) => mm >= 0 && valueVis(mm) > 0);
        return (
          <div key={r}>
            <div style={{ position: "absolute", left: 0, top: G.rowTop[r], width: b.w, height: G.value[r], display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: L.px(16), minWidth: 0 }}>
                <span style={{ fontFamily: TYPE.headline.fontFamily, fontVariationSettings: TYPE.headline.fontVariationSettings, fontWeight: 650, fontSize: G.name[r], letterSpacing: "-0.025em", color: ours ? ink : ink2, whiteSpace: "nowrap" }}>
                  {ours ? "Pebble" : panel.rival}
                </span>
                {shown.map((mm) => {
                  const detail = S10_METRICS[mm].details?.[p][r];
                  return detail ? (
                    <span key={mm} style={{ fontFamily: TYPE.support.fontFamily, fontVariationSettings: '"opsz" 32', fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: G.detail, letterSpacing: "-0.01em", color: DAY.small, whiteSpace: "nowrap", opacity: valueVis(mm) }}>
                      {detail}
                    </span>
                  ) : null;
                })}
              </div>
              {/* the values of the two metrics share one cell, right-aligned, so the outgoing one leaves in place */}
              <span style={{ display: "inline-grid" }}>
                {shown.map((mm) => {
                  const metric = S10_METRICS[mm];
                  const vis = valueVis(mm);
                  return (
                    <span key={mm} style={{ gridArea: "1 / 1", justifySelf: "end" }}>
                      <Value
                        value={metric.values[p][r]}
                        decimals={metric.decimals}
                        unit={metric.unit}
                        prefix={metric.prefix}
                        size={G.value[r]}
                        color={ours ? DAY.sage : ink2}
                        weight={ours ? 700 : 620}
                        vis={vis}
                        blurPx={(1 - vis) * 6 * L.u}
                      />
                    </span>
                  );
                })}
              </span>
            </div>
            {/* the track runs the panel's full width from zero (never a cut axis); the bar on it */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: G.barTop[r],
                width: b.w,
                height: G.bar[r],
                borderRadius: G.bar[r] * 0.28,
                background: DAY.track,
                boxShadow: `inset 0 0 0 ${Math.max(1, L.u).toFixed(2)}px ${DAY.line}`,
                overflow: "hidden",
              }}
            >
              {fracs[r] > 0.0005 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: G.bar[r],
                    width: b.w * fracs[r],
                    borderRadius: G.bar[r] * 0.28,
                    background: ours ? `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0) 55%), ${DAY.sage}` : DAY.mute,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A published value, set whole (never counted): Inter with tabular figures. */
const Value: React.FC<{ value: number; decimals: number; unit?: string; prefix?: string; size: number; color: string; weight: number; vis: number; blurPx: number }> = ({
  value,
  decimals,
  unit,
  prefix,
  size,
  color,
  weight,
  vis,
  blurPx,
}) => (
  <span
    style={{
      fontFamily: TYPE.headline.fontFamily,
      fontVariationSettings: '"opsz" 32',
      fontWeight: weight,
      fontVariantNumeric: "tabular-nums",
      fontSize: size,
      lineHeight: 1,
      letterSpacing: "-0.035em",
      color,
      whiteSpace: "nowrap",
      opacity: vis,
      filter: blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : undefined,
      transform: vis < 1 ? `translateY(${((1 - vis) * 0.06 * size).toFixed(2)}px)` : undefined,
      display: "inline-block",
    }}
  >
    {prefix ? <span style={{ fontSize: "0.72em", marginRight: "0.03em" }}>{prefix}</span> : null}
    {value.toFixed(decimals)}
    {unit ? <span style={{ fontSize: "0.56em", marginLeft: "0.08em", fontWeight: weight - 100 }}>{unit}</span> : null}
  </span>
);

/** The method's footnote, word for word: Inter, wrapped and balanced, "Pebble 1.9.29" kept on one line. */
const Footnote: React.FC<{ G: Geo }> = ({ G }) => {
  const L = useLayout();
  return (
  <div
    style={{
      position: "absolute",
      left: G.foot.x,
      top: G.foot.y,
      width: G.foot.w,
      fontFamily: TYPE.support.fontFamily,
      fontVariationSettings: '"opsz" 32',
      fontWeight: 440,
      fontSize: G.footSize,
      lineHeight: 1.36,
      letterSpacing: "-0.012em",
      color: DAY.small,
      // 16:9 (REVIEW-3 N-5): the lines run the box's full 75 % of the frame (balanced, they stopped at about 65 %), 3 lines;
      // 4:5 stays balanced
      textWrap: L.portrait ? "balance" : "pretty",
    } as React.CSSProperties}
  >
    {S10_FOOTNOTE.replace("Pebble 1.9.29", "Pebble 1.9.29")}
  </div>
  );
};
