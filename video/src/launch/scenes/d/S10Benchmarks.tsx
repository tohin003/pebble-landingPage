// S10 Benchmarks (13.5 s): the payoff of the hook's open question (EDIT_PLAN "S10"; TREATMENT §3 "The numbers").
//
// Night: "So. How did it do?" with the pebble glancing at the camera. Then the light rises from behind the pebble (a
// soft bloom, never a hard dark-to-light cut): everything the bloom passes is already the Daylight world, the question
// turns from stone to ink and the pebble from its dark theme to its light one, and the pebble glides to the chart's
// corner; the first chart slams in at 1.5 s on the music's strongest lift. Three cards, each two comparisons (side by side on 16:9, stacked on 4:5), same model for both products in
// each: tasks done correctly, said "done" when it wasn't (lower is better), cost per task. The method's footnote stays
// on screen from the first chart to the end. The pebble watches the bars and ends happy.
//
// Every number is the published one (v2.0.0 release notes; TREATMENT §3), exactly. Rival names in plain text only.
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { BarRow } from "../../components/BarCompare";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { PebbleActor, cues, look, lookBack, pose } from "../../components/PebbleActor";
import { SfxTrack, type SfxCue } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { useLayout, type Layout, type Rect } from "../../layout";
import { tween } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { BigBars, type BigBarSizes } from "./BigBars";
import { PLACE_SFX, SFX, SmallPrint, countTicks, lerp, peakAt, useRetime, useT } from "./common";

export const S10_NOMINAL = 13.5;

export const S10_FOOTNOTE =
  "Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each, 255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Costs at public list prices. Full results, including time, safety and where Pebble trails, in the 2.0.0 release notes.";

interface Pair {
  note: string;
  rows: readonly BarRow[];
}
interface Card {
  title: string;
  /** the title on 4:5 (line breaks) */
  titlePortrait: string;
  unit?: string;
  prefix?: string;
  decimals: number;
  /** one scale for both charts of a card, so their bars compare honestly */
  max: number;
  lowerIsBetter?: boolean;
  pairs: readonly [Pair, Pair];
}

const OPUS = "vs Claude Code, both on claude-opus-5-5";
const GPT = "vs Codex, both on gpt-6.1-sol";

/** TREATMENT §3, exactly as published. */
export const S10_CARDS: readonly Card[] = [
  {
    title: "Tasks done correctly.",
    titlePortrait: "Tasks done\ncorrectly.",
    unit: "%",
    decimals: 1,
    max: 100,
    pairs: [
      {
        note: OPUS,
        rows: [
          { name: "Pebble", value: 92.2, detail: "235 of 255", ours: true },
          { name: "Claude Code", value: 83.5, detail: "213 of 255" },
        ],
      },
      {
        note: GPT,
        rows: [
          { name: "Pebble", value: 95.3, detail: "243 of 255", ours: true },
          { name: "Codex", value: 90.6, detail: "231 of 255" },
        ],
      },
    ],
  },
  {
    title: "Said “done” when it wasn’t.",
    titlePortrait: "Said “done”\nwhen it wasn’t.",
    unit: "%",
    decimals: 1,
    max: 16,
    lowerIsBetter: true,
    pairs: [
      {
        note: OPUS,
        rows: [
          { name: "Pebble", value: 6.3, ours: true },
          { name: "Claude Code", value: 13.7 },
        ],
      },
      {
        note: GPT,
        rows: [
          { name: "Pebble", value: 3.9, ours: true },
          { name: "Codex", value: 7.1 },
        ],
      },
    ],
  },
  {
    title: "Cost per task.",
    titlePortrait: "Cost per task.",
    prefix: "$",
    decimals: 3,
    max: 0.13,
    lowerIsBetter: true,
    pairs: [
      {
        note: OPUS,
        rows: [
          { name: "Pebble", value: 0.091, ours: true },
          { name: "Claude Code", value: 0.117 },
        ],
      },
      {
        note: GPT,
        rows: [
          { name: "Pebble", value: 0.042, ours: true },
          { name: "Codex", value: 0.05 },
        ],
      },
    ],
  },
];

/** Beat starts at the nominal length (seconds from the scene's start); multiplied by the retime factor. */
export const S10_BEATS = {
  question: 0.1,
  glance: 0.5,
  bloom: 0.75,
  /** card 1 slams in on the music's strongest lift */
  cards: [1.5, 5.6, 9.3],
  happy: 12.3,
} as const;
/** each card's charts start this long after its title; the second chart this much after the first */
const CHART_DELAY = 0.04;
const PAIR_STAGGER = 0.32;
const COUNT_DUR = 1.3;
const BLOOM_DUR = 0.95;

export const S10_MARKS = [
  { name: "question lands", s: S10_BEATS.question + 0.45 },
  { name: "light rises (bloom start)", s: S10_BEATS.bloom },
  { name: "card 1 slams in: tasks done correctly (the lift)", s: S10_BEATS.cards[0] },
  { name: "card 2: said done when it wasn't", s: S10_BEATS.cards[1] },
  { name: "card 3: cost per task", s: S10_BEATS.cards[2] },
  { name: "pebble happy", s: S10_BEATS.happy },
] as const;

const geometry = (L: Layout) => {
  if (!L.portrait) {
    const x0 = L.px(96);
    const cw = L.px(1728);
    const gap = L.px(96);
    const chartW = (cw - gap) / 2;
    const chartY = L.px(300);
    const chartH = L.px(560);
    return {
      question: { x: x0, y: L.px(360), w: cw, h: L.px(240) } as Rect,
      questionText: "So. How did it do?",
      questionSize: L.type.display,
      night: { x: L.centre.x, y: L.px(790), size: L.px(190) },
      corner: { x: L.px(1712), y: L.px(240), size: L.px(170) },
      title: { x: x0, y: L.px(84), w: L.px(1440), h: L.px(124) } as Rect,
      titleSize: L.px(104),
      lower: { x: x0, y: L.px(214), size: L.px(34) },
      charts: [
        { x: x0, y: chartY, w: chartW, h: chartH },
        { x: x0 + chartW + gap, y: chartY, w: chartW, h: chartH },
      ] as Rect[],
      bars: {
        header: L.px(38),
        oursName: L.px(58),
        rivalName: L.px(50),
        oursValue: L.px(132),
        rivalValue: L.px(92),
        detail: L.px(30),
        oursBar: L.px(56),
        rivalBar: L.px(40),
        headGap: L.px(44),
        rowGap: L.px(92),
      } as BigBarSizes,
      divider: { x: x0 + chartW + gap / 2, y: chartY, h: L.px(560), vertical: true },
      foot: { x: x0, y: L.px(930), w: cw, h: L.px(100) } as Rect,
      footMax: L.px(1600),
      footSize: L.px(22),
    };
  }
  const x0 = L.px(64);
  const cw = L.px(952);
  return {
    question: { x: x0, y: L.px(330), w: cw, h: L.px(330) } as Rect,
    questionText: "So.\nHow did it do?",
    questionSize: L.px(132),
    night: { x: L.centre.x, y: L.px(930), size: L.px(210) },
    corner: { x: L.px(930), y: L.px(296), size: L.px(150) },
    title: { x: x0, y: L.px(76), w: L.px(760), h: L.px(186) } as Rect,
    titleSize: L.px(88),
    lower: { x: x0, y: L.px(268), size: L.px(30) },
    charts: [
      { x: x0, y: L.px(336), w: cw, h: L.px(390) },
      { x: x0, y: L.px(756), w: cw, h: L.px(390) },
    ] as Rect[],
    bars: {
      header: L.px(36),
      oursName: L.px(48),
      rivalName: L.px(42),
      oursValue: L.px(108),
      rivalValue: L.px(78),
      detail: L.px(28),
      oursBar: L.px(44),
      rivalBar: L.px(32),
      headGap: L.px(14),
      rowGap: L.px(30),
    } as BigBarSizes,
    /** a hairline between the two stacked comparisons */
    divider: { x: x0, y: L.px(738), h: cw, vertical: false },
    foot: { x: x0, y: L.px(1160), w: cw, h: L.px(130) } as Rect,
    footMax: cw,
    footSize: L.px(20),
  };
};

const SWELL_LEN = 2.294; // sfx-swell-soft.wav, kit.json measure.duration_s
const swellInto = (end: number, db: number): SfxCue => {
  const start = end - SWELL_LEN;
  return start >= 0 ? { src: SFX.swell, at: start, db } : { src: SFX.swell, at: 0, trim: +(-start).toFixed(4), db };
};

/** The scene's SFX cues for the master (seconds from the scene's start, at nominal length × k). */
export const s10Sfx = (k = 1): SfxCue[] => {
  const out: SfxCue[] = [
    // the light rising: a soft swell whose END meets the slam (the kit's rule for swells); it starts before the scene,
    // so its head is trimmed (the director may instead start it on the master under S09's tail)
    swellInto(S10_BEATS.cards[0] * k, -13),
    // the first chart's slam on the lift
    peakAt(SFX.thud, S10_BEATS.cards[0] * k, -12),
  ];
  S10_CARDS.forEach((card, ci) => {
    const at = S10_BEATS.cards[ci] * k;
    if (ci > 0) out.push(peakAt(ci === 1 ? SFX.whoosh : SFX.whoosh2, at, -17));
    card.pairs.forEach((pair, pi) => {
      out.push(...countTicks({ at: at + CHART_DELAY + pi * PAIR_STAGGER, rows: pair.rows, decimals: card.decimals, dur: COUNT_DUR, db: -19 }));
    });
  });
  // the happy pose: a small shimmer on the pebble's own beat
  out.push(peakAt(SFX.shimmer, S10_BEATS.happy * k + 0.03, -15));
  // rate-limit the ticks of both charts together (they overlap): never two within 3 frames
  out.sort((a, b) => a.at - b.at);
  const kept: SfxCue[] = [];
  let lastTick = -Infinity;
  for (const c of out) {
    if (c.src === SFX.tick) {
      if (c.at - lastTick < 3 / 60 - 1e-6) continue;
      lastTick = c.at;
    }
    kept.push(c);
  }
  return kept;
};

/** The pebble's acting, shared by the night and day renders so both show the same frame of it. */
const pebbleCues = (a: (s: number) => number) =>
  cues(
    pose(0, "idle"),
    look(0, 0.5, -0.45),
    // the glance: straight at the camera
    look(a(S10_BEATS.glance), 0, 0.05),
    lookBack(a(S10_BEATS.bloom) + 0.3),
    // it watches the bars (below and to its left)
    look(a(S10_BEATS.cards[0]) + 0.25, -0.7, 0.55),
    look(a(S10_BEATS.cards[1]) + 0.25, -0.7, 0.55),
    look(a(S10_BEATS.cards[2]) + 0.25, -0.7, 0.55),
    lookBack(a(S10_BEATS.happy) - 0.3),
    pose(a(S10_BEATS.happy), "happy"),
  );

export const S10Benchmarks: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { fps } = useVideoConfig();
  const { at: a, k } = useRetime(S10_NOMINAL, durationInFrames);
  const g = geometry(L);

  // the bloom: the Daylight world revealed by a soft disc of light growing from behind the pebble
  const b0 = a(S10_BEATS.bloom);
  const diag = Math.hypot(L.W, L.H);
  const bodyCy = g.night.y - g.night.size * 0.27;
  // a wide, soft edge: it reads as light spreading, not as a disc
  const r = tween(t, [b0, b0 + BLOOM_DUR], [0, diag * 1.7], EASE.camera);
  const feather = Math.min(r, diag * 0.7);
  const dayMask =
    r <= 0
      ? undefined
      : `radial-gradient(circle at ${g.night.x.toFixed(1)}px ${bodyCy.toFixed(1)}px, #000 0px, #000 ${Math.max(0, r - feather).toFixed(1)}px, rgba(0,0,0,0) ${r.toFixed(1)}px)`;
  const nightGone = r - feather >= diag * 1.0;

  // the pebble glides to the chart's corner as the light passes it
  const gp = tween(t, [b0 + 0.2, b0 + 1.15], [0, 1], EASE.camera);
  // across first, then up: the path clears the question, which holds until the slam
  const px = lerp(g.night.x, g.corner.x, EASE.enter(gp));
  const py = lerp(g.night.y, g.corner.y, Math.pow(gp, 2.2));
  const psize = lerp(g.night.size, g.corner.size, gp);
  const happyAt = a(S10_BEATS.happy);
  const pebbleCueList = pebbleCues(a);
  const pulses = [happyAt + 0.02, happyAt + 0.5];

  const qAt = a(S10_BEATS.question);
  // the question holds through the bloom (stone to ink as the light passes) and is cut by the first chart's slam
  const qExit = a(S10_BEATS.cards[0]);
  const question = (
    <Headline text={g.questionText} at={qAt} exitAt={qExit} exit="cut" size={g.questionSize} align="center" box={g.question} lineStagger={0.12} />
  );

  const cardAt = (i: number) => a(S10_BEATS.cards[i]);
  const cardExit = (i: number) => (i + 1 < S10_CARDS.length ? cardAt(i + 1) - 0.26 : undefined);
  const divP = EASE.enter(Math.max(0, Math.min(1, (t - cardAt(0)) / 0.6)));

  const sfx = PLACE_SFX ? <SfxTrack cues={s10Sfx(k)} /> : null;
  void fps;

  return (
    <FontGate>
      <AbsoluteFill>
        {!nightGone && (
          <Stage keyLight={{ x: 0.5, y: L.portrait ? 0.62 : 0.66, r: 0.7 }} pool={{ x: g.night.x, y: g.night.y, w: g.night.size * 2.2, strength: 0.8 }}>
            {question}
            <PebbleActor x={px} y={py} size={psize} cues={pebbleCueList} glow={0.5} pool />
          </Stage>
        )}
        {dayMask && (
          <AbsoluteFill style={{ WebkitMaskImage: nightGone ? undefined : dayMask, maskImage: nightGone ? undefined : dayMask }}>
            <Stage world="daylight">
              {question}
              {S10_CARDS.map((card, i) => {
                const at = cardAt(i);
                const exitAt = cardExit(i);
                if (t < at - 0.05 || (exitAt !== undefined && t > exitAt + 0.4)) return null;
                return (
                  <CardView
                    key={i}
                    card={card}
                    at={at}
                    exitAt={exitAt}
                    entrance={i === 0 ? "line" : "blur"}
                    title={L.portrait ? card.titlePortrait : card.title}
                    titleBox={g.title}
                    titleSize={g.titleSize}
                    charts={g.charts}
                    bars={g.bars}
                    lower={g.lower}
                    portrait={L.portrait}
                  />
                );
              })}
              {divP > 0 &&
                (g.divider.vertical ? (
                  <div style={{ position: "absolute", left: g.divider.x, top: g.divider.y, width: Math.max(1, L.px(2)), height: g.divider.h * divP, background: DAY.line }} />
                ) : (
                  <div style={{ position: "absolute", left: g.divider.x, top: g.divider.y, width: g.divider.h * divP, height: Math.max(1, L.px(2)), background: DAY.line }} />
                ))}
              <SmallPrint text={S10_FOOTNOTE} box={g.foot} maxWidth={g.footMax} at={cardAt(0) + 0.15} size={g.footSize} />
              <PebbleActor x={px} y={py} size={psize} cues={pebbleCueList} pulses={pulses} />
            </Stage>
          </AbsoluteFill>
        )}
        {sfx}
      </AbsoluteFill>
    </FontGate>
  );
};

const CardView: React.FC<{
  card: Card;
  at: number;
  exitAt?: number;
  entrance: "line" | "blur";
  title: string;
  titleBox: Rect;
  titleSize: number;
  charts: Rect[];
  bars: BigBarSizes;
  lower: { x: number; y: number; size: number };
  portrait: boolean;
}> = ({ card, at, exitAt, entrance, title, titleBox, titleSize, charts, bars, lower }) => {
  const t = useT();
  const W = DAY;
  const lp = Math.max(0, Math.min(1, (t - at - 0.15) / 0.3));
  const lx = exitAt === undefined ? 0 : Math.max(0, Math.min(1, (t - exitAt) / 0.2));
  return (
    <>
      <Headline text={title} at={at} exitAt={exitAt} exit="rise" entrance={entrance} together={entrance === "line"} size={titleSize} align="left" valign="bottom" box={titleBox} fit={false} />
      {card.lowerIsBetter && lp > 0 && (
        <div
          style={{
            position: "absolute",
            left: lower.x,
            top: lower.y,
            fontFamily: TYPE.mono.fontFamily,
            fontWeight: 500,
            fontSize: lower.size,
            color: W.sage,
            opacity: EASE.enter(lp) * (1 - lx),
            whiteSpace: "nowrap",
          }}
        >
          Lower is better.
        </div>
      )}
      {card.pairs.map((pair, pi) => (
        <BigBars
          key={pi}
          at={at + CHART_DELAY + pi * PAIR_STAGGER}
          dur={COUNT_DUR}
          slam={entrance === "line"}
          exitAt={exitAt}
          unit={card.unit}
          prefix={card.prefix}
          decimals={card.decimals}
          max={card.max}
          header={pair.note}
          rows={pair.rows}
          box={charts[pi]}
          sizes={bars}
        />
      ))}
    </>
  );
};
