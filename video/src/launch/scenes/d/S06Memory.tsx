// S06 Memory (7.0 s): "It remembers what matters." (REVIEW-1 BANNED "isometric slab stacks", S8, S9, N2; FIXES-1 WP-D;
// REVIEW-2 S-1: "Forget anything." shown, not told).
//
// 0.00  "It remembers what matters." rises in at the top.
// 0.50  Pebble's six memory layers land a dotted eighth apart (0.50 to 2.375), as a typographic table in Inter: each
//       layer's name and what it holds. A diagram in type, never Pebble's interface.
// 2.50  Semantic (facts and knowledge) turns sage; at 2.75 the real Settings › Memory capture (Pebble 2.0.1's own
//       frontend at its published tag, sample data) grows out of that row into a wide window on that layer's three
//       records. 3.00: "All visible."
// 3.60  The pointer presses the trash of "Wheel taster: 10.00" (the record the take forgets: an outdated price); Keep and
//       Forget appear. 3.65 to 4.25 the camera pushes about 2× onto that record and its Forget, and holds there 1.5 s.
// 5.00  The pointer presses Forget, on the beat: the record is gone (in one frame, as the app does it: the take has no
//       collapse) and "Forget anything." lands on that frame. 5.75 to 6.45 the camera pulls back onto the two records
//       left; held to the cut.
// The camera moves are the capture's own framing keys (no scroll, no motion-blur samples on text: REVIEW-1 S8). No
// cursor is in the capture: the drawn pointer follows the person's recorded path (data/ui.ts), as S04's does.
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { Box } from "../../camera";
import { UI_CLIPS } from "../../data/ui";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline, textWidth } from "../../components/Headline";
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
  /** each row lands a dotted eighth after the last (its contact frame), the first on the beat */
  rows: [0.5, 0.875, 1.25, 1.625, 2.0, 2.375],
  /** the Semantic row turns sage */
  pick: 2.5,
  /** the capture grows out of it; the table leaves */
  capture: 2.75,
  /** "All visible." */
  visible: 3.0,
  /** the pointer presses the record's trash: Keep and Forget */
  trash: 3.6,
  /** the camera arrives on the record and its Forget (the push starts 0.6 s before) */
  pushed: 4.25,
  /** the pointer presses Forget: the record is gone, "Forget anything." */
  forget: 5.0,
  /** the camera is back on the layer's two records (the pull starts 0.7 s before) */
  pulled: 6.45,
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

/** Framings, clip px (= CSS px × 2.5). Every text line inside a framing is whole (the column runs CSS x 552 to 1090). */
const c = (v: number) => v * 2.5;
const cbox = (x: number, y: number, w: number, h: number): Box => ({ x: c(x), y: c(y), w: c(w), h: c(h) });
/**
 * Per aspect (the window is 2.25:1 in 16:9, 1.72:1 in 4:5; a box is fitted to it about its centre):
 * - ALL: the layer's three records, whole (below the search field, CSS y 446);
 * - RECORD: "Wheel taster: 10.00" with its Keep and Forget (CSS 552 to 945), about 2× ALL's scale in 16:9 (1.4× in 4:5,
 *   whose window is narrower); in 4:5 framed below the kiln-log quote, whose long line the push would cut;
 * - AFTER: the two records left and the lines under them.
 */
const FRAMES = {
  "16x9": { all: cbox(530, 452, 580, 258), record: cbox(545, 532, 410, 140), after: cbox(530, 452, 580, 258) },
  "4x5": { all: cbox(532, 450, 576, 314), record: cbox(545, 538, 410, 238), after: cbox(532, 450, 576, 314) },
} as const;
/** the person's pointer as recorded (clip px) */
const POINTER = UI_CLIPS.memory.pointer;
const pointerAt = (src: number) => {
  const P = POINTER;
  if (src <= P[0].t) return { x: P[0].x, y: P[0].y };
  for (let i = 1; i < P.length; i++) {
    if (src < P[i].t) {
      const a = P[i - 1];
      const b = P[i];
      // a click holds the pointer still; a move glides there, easing in and out like a hand
      const q = EASE.camera(clamp01((src - a.t) / (b.t - a.t)));
      return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q };
    }
  }
  const z = P[P.length - 1];
  return { x: z.x, y: z.y };
};
/** the Settings panel's own colour in the capture (sampled): the window's ground under its soft edges */
const PANEL = { hex: "#212822", rgb: "33, 40, 34" } as const;

export const S06_MARKS = [
  { name: "headline lands", s: 0.6 },
  ...S06_BEATS.rows.map((s, i) => ({ name: `row ${i + 1} lands (${LAYERS[i].name})`, s })),
  { name: "the Semantic row turns sage", s: S06_BEATS.pick },
  { name: "the capture grows out of it", s: S06_BEATS.capture },
  { name: "\"All visible.\"", s: S06_BEATS.visible },
  { name: "the pointer presses the trash: Keep / Forget", s: S06_BEATS.trash },
  { name: "the push lands on the record and its Forget (about 2×)", s: S06_BEATS.pushed },
  { name: "Forget pressed: the record is gone; \"Forget anything.\"", s: S06_BEATS.forget },
  { name: "pulled back onto the two records left", s: S06_BEATS.pulled },
] as const;

/**
 * The master editor (SFX density, 22 effects in the film's 30 to 60 s against 8 to 15 per 30 s): two soft ticks for the
 * whole list (its first layer and its last) and one click on Forget; nothing else.
 */
export const s06Sfx = (k = 1): SfxCue[] => [
  peakAt(SFX.tick, S06_BEATS.rows[0] * k, -21),
  peakAt(SFX.tick, S06_BEATS.rows[S06_BEATS.rows.length - 1] * k, -21),
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
      // a wide window, so the push onto one record reads at phone size (REVIEW-2 S-1); the lines sit under it
      media: { x: p(96), y: p(84), w: p(1728), h: p(768) } as Rect,
      line1: { x: p(112), y: p(884), w: p(560), h: p(120) } as Rect,
      line2: { x: p(112) + textWidth("All visible.", p(76)) + p(30), y: p(884), w: p(900), h: p(120) } as Rect,
      line1Text: "All visible.",
      line2Text: "Forget anything.",
      lineSize: p(76),
      line1Valign: "top" as const,
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
    // the type above a wide window, the group's optical centre near the frame's (REVIEW-2 S-1, 4:5)
    media: { x: p(24), y: p(490), w: p(1032), h: p(600) } as Rect,
    line1: { x: p(64), y: p(210), w: p(952), h: p(110) } as Rect,
    line2: { x: p(64), y: p(328), w: p(952), h: p(110) } as Rect,
    line1Text: "All visible.",
    line2Text: "Forget anything.",
    lineSize: p(76),
    line1Valign: "bottom" as const,
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
  const t0 = t - capAt; // the capture's own clock
  const F = FRAMES[L.portrait ? "4x5" : "16x9"];
  const keys = [
    { t: 0, box: F.all },
    { t: a(S06_BEATS.pushed) - capAt, box: F.record, dur: 0.6 },
    { t: a(S06_BEATS.pulled) - capAt, box: F.after, dur: 0.7 },
  ];
  // the pointer: on from the moment the window has settled; it presses (0.07 s to 0.87, released over 0.12 s) on the
  // trash and on Forget
  const pointerOn = clamp01((t - (capAt + GROW - 0.1)) / 0.15);
  const press = (at: number) => {
    const dt = t - at;
    return dt < -0.07 ? 0 : dt < 0 ? 1 + dt / 0.07 : dt < 0.12 ? 1 - dt / 0.12 : 0;
  };
  const pressK = Math.max(press(a(S06_BEATS.trash)), press(a(S06_BEATS.forget)));
  const overlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, kv: number) => {
    if (pointerOn <= 0.01) return null;
    const p = toView(pointerAt(captureTime.at(Math.max(0, t0))));
    return <Pointer x={p.x} y={p.y} h={19 * 2.5 * kv} press={pressK} opacity={pointerOn} />;
  };

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
          <Headline text={g.line1Text} at={a(S06_BEATS.visible)} entrance="blur" size={g.lineSize} align="left" valign={g.line1Valign} box={g.line1} fit={false} />
          <Headline text={g.line2Text} at={forgetAt - 0.04} entrance="rise" size={g.lineSize} align="left" valign="top" box={g.line2} fit={false} />
          <Sequence from={Math.round(capAt * fps)} layout="none" name="Settings › Memory (v2.0.1 capture)">
            <div style={{ position: "absolute", inset: 0, opacity: winOpacity }}>
              <FloatingWindow rect={media} enter="none" offset={offset} scale={winScale} tilt={{ rx: 5, ry: -7 }} flattenAt={0} flattenDur={GROW + 0.1} shadow={1.1} background={PANEL.hex}>
                <ScreenZoom src={MC.src} srcSize={MC.size} srcDuration={MC.duration} time={captureTime} keys={keys} drift={0.006} motionBlur={false} edgeFade={24} overlay={overlay} />
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

/** A plain macOS-style arrow pointer (the person's mouse, not Pebble's UI), tip at (x, y), `h` px tall (as S04's). */
const Pointer: React.FC<{ x: number; y: number; h: number; press: number; opacity: number }> = ({ x, y, h, press, opacity }) => {
  const s = h / 19;
  return (
    <svg
      width={14 * s}
      height={20 * s}
      viewBox="-1 -1 14 20"
      style={{ position: "absolute", left: x - s, top: y - s, opacity, transform: `scale(${(1 - 0.13 * press).toFixed(4)})`, transformOrigin: "0 0", overflow: "visible", filter: `drop-shadow(0 ${s * 0.8}px ${s * 1.2}px rgba(0,0,0,0.35))` }}
    >
      <path d="M0 0 L0 15.5 L3.9 11.9 L6.6 17.9 L9.1 16.8 L6.5 10.9 L11.6 10.9 Z" fill="#111" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
};
