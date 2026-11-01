// S06 Memory (7.0 s): "It remembers what matters." (REVIEW-1 BANNED "isometric slab stacks", S8, S9, N2; FIXES-1 WP-D).
//
// 0.00  "It remembers what matters." rises in at the top.
// 0.50  Pebble's six memory layers land one a beat (0.50 to 3.00), as a typographic table in Inter: each layer's name
//       and what it holds. A diagram in type, never Pebble's interface.
// 3.25  Semantic (facts and knowledge) turns sage; at 3.50 the real Settings › Memory capture (Pebble 2.0.1's own
//       frontend at its published tag, sample data) grows out of that row, framed at about 2× on that layer's records
//       and their Keep and Forget. "All visible."
// 4.25  A record's trash: Keep and Forget appear. 5.00: Forget, on the beat: the record is gone (in one frame, as the app
//       does it) and "Forget anything." lands on the click, held to the cut (2 s).
// The camera never scrolls: one framing, a slow drift and a small punch on the click (REVIEW-1 S8: no motion-blur
// samples on text).
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import type { SfxCue } from "../../components/Sfx";
import { SfxTrack } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { centreOf, useLayout, type Layout, type Rect } from "../../layout";
import { timeMap } from "../../timeMap";
import { prog } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { PLACE_SFX, SFX, clamp01, lerp, peakAt, useRetime, useT } from "./common";
import { MEMORY_CAPTURE as MC } from "./memoryCapture";

export const S06_NOMINAL = 7;

/** Pebble's six memory layers (memory KINDS at v2.0.1; README "Memory"), with plain descriptions (C-FILM2-22). */
export const LAYERS = [
  { name: "Profile", desc: "your preferences" },
  { name: "Semantic", desc: "facts and knowledge" },
  { name: "Procedural", desc: "how things are done here" },
  { name: "Episodic", desc: "past tasks" },
  { name: "Temporal", desc: "things that expire" },
  { name: "Working", desc: "the current task" },
] as const;
/** the row that becomes the capture (the capture opens on Facts & knowledge) */
const CARRY = 1;

export const S06_BEATS = {
  headline: 0,
  /** each row lands on a beat (its contact frame) */
  rows: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
  /** the Semantic row turns sage */
  pick: 3.25,
  /** the capture grows out of it; the table leaves */
  capture: 3.5,
  /** "All visible." */
  visible: 3.75,
  /** the record's trash: Keep and Forget */
  trash: 4.25,
  /** Forget: the record is gone, "Forget anything." */
  forget: 5.0,
} as const;
const ROW_IN = 0.2;
const GROW = 0.55;

/** The capture's time map, local to its start: the layer's records drawn, the trash, Forget, then real time. */
const CAP = {
  trash: S06_BEATS.trash - S06_BEATS.capture,
  forget: S06_BEATS.forget - S06_BEATS.capture,
} as const;
const captureTime = timeMap(
  [
    [0, MC.t.records],
    [CAP.trash, MC.t.trash],
    [CAP.forget, MC.t.forget],
    [CAP.forget + (MC.duration - MC.t.forget), MC.duration],
  ],
  { tail: 0 },
);

/**
 * The one framing (clip px = CSS px × 2.5): the layer's column from "Learning and recall in this layer · Facts &
 * knowledge" through its three records, Keep and Forget and "Check waiting memories now". Every text line of that column
 * (CSS x 552 to 1090) is inside it with room for the drift, so no word is cut at an edge.
 */
const c = (v: number) => v * 2.5;
const FRAME = { x: c(526), y: c(356), w: c(588), h: c(468) } as const;
/** the Settings panel's own colour in the capture (sampled): the window's ground under its soft edges */
const PANEL = { hex: "#212822", rgb: "33, 40, 34" } as const;

export const S06_MARKS = [
  { name: "headline lands", s: 0.6 },
  ...S06_BEATS.rows.map((s, i) => ({ name: `row ${i + 1} lands (${LAYERS[i].name})`, s })),
  { name: "the Semantic row turns sage", s: S06_BEATS.pick },
  { name: "the capture grows out of it", s: S06_BEATS.capture },
  { name: "\"All visible.\"", s: S06_BEATS.visible },
  { name: "the trash: Keep / Forget", s: S06_BEATS.trash },
  { name: "Forget: the record is gone; \"Forget anything.\"", s: S06_BEATS.forget },
] as const;

export const s06Sfx = (k = 1): SfxCue[] => [
  // a soft tick as each row lands
  ...S06_BEATS.rows.map((s) => peakAt(SFX.tick, s * k, -21)),
  peakAt(SFX.whoosh, (S06_BEATS.capture + GROW * 0.5) * k, -18),
  peakAt(SFX.click, S06_BEATS.trash * k, -15),
  peakAt(SFX.click2, S06_BEATS.forget * k, -13),
];

const geometry = (L: Layout) => {
  const p = L.px;
  if (!L.portrait) {
    return {
      headline: { x: p(128), y: p(60), w: p(1664), h: p(150) } as Rect,
      headlineText: "It remembers what matters.",
      headlineSize: L.type.title,
      rowTop: (i: number) => p(292) + i * p(114),
      rowH: p(96),
      name: { x: p(128), size: p(68) },
      desc: { x: p(620), dy: 0, size: p(48) },
      rule: { x: p(128), w: p(1664) },
      media: { x: p(624), y: p(56), w: p(1216), h: p(968) } as Rect,
      line1: { x: p(112), y: p(300), w: p(500), h: p(170) } as Rect,
      line2: { x: p(112), y: p(490), w: p(500), h: p(200) } as Rect,
      line1Text: "All visible.",
      line2Text: "Forget\nanything.",
      lineSize: p(76),
      inline: true,
    };
  }
  return {
    headline: { x: p(64), y: p(64), w: p(952), h: p(240) } as Rect,
    headlineText: "It remembers\nwhat matters.",
    headlineSize: p(100),
    rowTop: (i: number) => p(372) + i * p(150),
    rowH: p(124),
    name: { x: p(64), size: p(60) },
    desc: { x: p(64), dy: p(68), size: p(44) },
    rule: { x: p(64), w: p(952) },
    // the same aspect as 16:9's window, so the one framing shows the same column with nothing cut
    media: { x: p(40), y: p(420), w: p(1000), h: p(796) } as Rect,
    line1: { x: p(64), y: p(96), w: p(952), h: p(110) } as Rect,
    line2: { x: p(64), y: p(214), w: p(952), h: p(110) } as Rect,
    line1Text: "All visible.",
    line2Text: "Forget anything.",
    lineSize: p(76),
    inline: false,
  };
};
type Geo = ReturnType<typeof geometry>;

export const S06Memory: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { fps } = useVideoConfig();
  const { at: a, k } = useRetime(S06_NOMINAL, durationInFrames);
  const g = geometry(L);
  const capAt = a(S06_BEATS.capture);

  // the capture grows out of the Semantic row: from the row's place and a fifth of its size to its own rect
  const grow = EASE.camera(clamp01((t - capAt) / GROW));
  const media = g.media;
  const mc = centreOf(media);
  const rowCy = g.rowTop(CARRY) + g.rowH / 2;
  const rowCx = g.inline ? g.desc.x + L.px(200) : g.name.x + L.px(260);
  const offset = { x: (rowCx - mc.x) * (1 - grow), y: (rowCy - mc.y) * (1 - grow) };
  // a small punch on the Forget click (a hit that decays, never a creep)
  const forgetAt = a(S06_BEATS.forget);
  const punch = t >= forgetAt ? 0.022 * Math.exp(-(t - forgetAt) / 0.12) : 0;
  const winScale = lerp(0.22, 1, grow) * (1 + punch);
  const winOpacity = clamp01((t - capAt) / 0.12);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight" keyLight={L.portrait ? { x: 0.35, y: 0.25, r: 0.95 } : { x: 0.3, y: 0.08, r: 0.95 }}>
          {/* already rising on the scene's first frame: the seam never lands on a bare ground */}
          <Headline text={g.headlineText} at={a(S06_BEATS.headline) - 0.2} exitAt={capAt} exit="fade" size={g.headlineSize} align="left" valign="bottom" box={g.headline} fit />
          <Table g={g} a={a} />
          <Headline text={g.line1Text} at={a(S06_BEATS.visible)} entrance="blur" size={g.lineSize} align="left" valign="bottom" box={g.line1} fit={false} />
          <Headline text={g.line2Text} at={forgetAt - 0.04} entrance="rise" size={g.lineSize} align="left" valign="top" box={g.line2} fit={false} />
          <Sequence from={Math.round(capAt * fps)} layout="none" name="Settings › Memory (v2.0.1 capture)">
            <div style={{ position: "absolute", inset: 0, opacity: winOpacity }}>
              <FloatingWindow rect={media} enter="none" offset={offset} scale={winScale} tilt={{ rx: 5, ry: -7 }} flattenAt={0} flattenDur={GROW + 0.1} shadow={1.1} background={PANEL.hex}>
                <ScreenZoom src={MC.src} srcSize={MC.size} srcDuration={MC.duration} time={captureTime} keys={[{ t: 0, box: FRAME }]} drift={0.012} motionBlur={false} edgeFade={24} />
                {/* the list runs on below the window: its foot fades into the panel's colour, as a scrolled list does */}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: media.h * 0.1, background: `linear-gradient(to bottom, rgba(${PANEL.rgb}, 0), rgba(${PANEL.rgb}, 0.96))` }} />
              </FloatingWindow>
            </div>
          </Sequence>
          {PLACE_SFX ? <SfxTrack cues={s06Sfx(k)} /> : null}
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};

/** The six layers as a typographic table: a hairline, then the name and what it holds, landing one a beat. */
const Table: React.FC<{ g: Geo; a: (s: number) => number }> = ({ g, a }) => {
  const t = useT();
  const L = useLayout();
  const leave = a(S06_BEATS.capture);
  const pick = prog(t, a(S06_BEATS.pick), 0.25, EASE.enter);
  return (
    <>
      {LAYERS.map((layer, i) => {
        const land = a(S06_BEATS.rows[i]);
        // lands on its beat: sharp on the contact frame, from a short rise and blur just before it
        const pIn = clamp01((t - (land - ROW_IN)) / ROW_IN);
        if (pIn <= 0) return null;
        const e = EASE.enter(pIn);
        // leaves as the capture grows (the carried row last, under the window)
        const pOut = EASE.exit(clamp01((t - leave - (i === CARRY ? 0.12 : 0.02 * i)) / 0.2));
        if (pOut >= 1) return null;
        const top = g.rowTop(i);
        const carry = i === CARRY ? pick : 0;
        const ruleW = g.rule.w * EASE.enter(clamp01((t - (land - ROW_IN)) / 0.35));
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: (pIn < 1 ? Math.min(1, pIn * 1.8) : 1) * (1 - pOut), transform: `translateY(${((1 - e) * L.px(18) + pOut * L.px(12)).toFixed(2)}px)` }}>
            <div style={{ position: "absolute", left: g.rule.x, top: top - L.px(14), width: ruleW, height: Math.max(1, L.px(2)), background: carry > 0 ? mix(DAY.line, DAY.sage, carry) : DAY.line }} />
            <div
              style={{
                position: "absolute",
                left: g.name.x,
                top,
                fontFamily: TYPE.headline.fontFamily,
                fontVariationSettings: TYPE.headline.fontVariationSettings,
                fontWeight: 650,
                fontSize: g.name.size,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: carry > 0 ? mix(DAY.ink, DAY.sage, carry) : DAY.ink,
                whiteSpace: "nowrap",
                filter: pIn < 1 ? `blur(${((1 - e) * 7 * L.u).toFixed(2)}px)` : undefined,
              }}
            >
              {layer.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: g.desc.x,
                top: g.inline ? top + (g.name.size - g.desc.size) * 0.78 : top + g.desc.dy,
                fontFamily: TYPE.support.fontFamily,
                fontVariationSettings: TYPE.support.fontVariationSettings,
                fontWeight: 460,
                fontSize: g.desc.size,
                letterSpacing: "-0.012em",
                lineHeight: 1.1,
                color: carry > 0 ? mix(DAY.ink2, DAY.sage, carry) : DAY.ink2,
                whiteSpace: "nowrap",
                filter: pIn < 1 ? `blur(${((1 - e) * 7 * L.u).toFixed(2)}px)` : undefined,
              }}
            >
              {layer.desc}
            </div>
          </div>
        );
      })}
    </>
  );
};

const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mix = (x: string, y: string, k: number) => {
  const A = hex(x);
  const B = hex(y);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(", ")})`;
};
