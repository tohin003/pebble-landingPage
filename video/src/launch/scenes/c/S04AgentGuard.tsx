// S04 AgentGuard (EDIT_PLAN "S04", TREATMENT §3 act 4). Daylight world: the real 2.0.1 UI floats on warm stone.
//
// Frame 0 is the seam from S03: a card under the title, already framed on the held block at readable size (the capture
// harness clip, v2.0.1, dark theme, sample data): "Pebble's change isn't verified yet." with Run the
// tests / Ask Pebble to finish / Accept as unverified, a clay glow on the held block. "Done means checked." lands above
// it. The camera pushes onto the held block; the person's pointer clicks Run the tests; the "Run isolated tests" card;
// Run tests; the tests run (the wait compressed, every frame real); their result; then Details' newest cards land and
// "Verified · pytest 42 passed on current files" takes a sage glow (the shimmer). The window shrinks to that one card
// (the evidence) and "AgentGuard." + "Evidence before “done”." arrive with three diagram rows on beats: drawn checks
// and plain type, a diagram, never a Pebble screen.
//
// The pointer is drawn from the harness's own log of the real mouse (data/ui.ts `pointer`): the capture has no cursor.
// The glows are annotations round the real UI's own boxes (data/ui.ts `boxes`), never redrawn UI.
import { AbsoluteFill } from "remotion";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import type { ZoomKey } from "../../camera";
import { UI_CLIPS } from "../../data/ui";
import { pick, useLayout, type Layout } from "../../layout";
import { timeMap } from "../../timeMap";
import { C, EASE } from "../../tokens";
import { DAY, useWorld } from "../../world";
import type { SceneProps } from "../types";
import { Check, box, clamp01, glowRing, hit, ramp, rectAt, sfxSrc, sfxStart, useClock, type SfxNote } from "./common";

export const S04_NOMINAL = 8;

const AG = UI_CLIPS.agentguard;
const SRC = AG.src.dark;
const SIZE = AG.size; // 3600 × 2250

/** Beats, seconds at the nominal length (they scale with the scene's length through the clock's T). */
const B = {
  title: 0.12,
  settle: 0.7,
  pushHeld: 1.6,
  click1: 1.8, // Run the tests (source 1.4)
  titleOut: 1.95,
  card: 2.4,
  click2: 2.55, // Run tests (source 3.1)
  running: 2.95,
  result: 3.45,
  verified: 3.95, // Details' newest cards settle (source 9.7): the sage glow and the shimmer
  shrink: 4.5,
  agTitle: 4.62,
  agSub: 4.92,
  chips: [5.3, 5.7, 6.1] as const,
} as const;

export const S04_MARKS = [
  { name: "title", s: B.title },
  { name: "click-run-the-tests", s: B.click1 },
  { name: "click-run-tests", s: B.click2 },
  { name: "verified-shimmer", s: B.verified },
  { name: "agentguard-title", s: B.agTitle },
  { name: "chip-1", s: B.chips[0] },
  { name: "chip-2", s: B.chips[1] },
  { name: "chip-3", s: B.chips[2] },
] as const;

/** Source boxes (the clip's own px, data/ui.ts), framed on UI boundaries. */
const HELD_16 = box(700, 1300, 1250, 600); // "Blocked", the held sentence and the three buttons
const HELD_45 = box(712, 1300, 960, 600); // above the composer (its placeholder would be sliced)
const HELD_ROW = AG.boxes.heldRow.box;
const CARD = AG.boxes.testsCard.box; // the "Run isolated tests" card, Run tests ready
const RUNNING = AG.boxes.testsCardRunning.box; // the card in Earlier actions, Running
const RESULT = box(2543, 1480, 1018, 620); // the card's Result (passed 42) and the output "42 passed in 1.84s"
const VCTX = box(2500, 230, 1100, 880); // Details › Steps: Tests · pytest, the Verified check card, Done
const VERIFIED = AG.boxes.verifiedWorkCard.box; // "What your request requires · Verified · pytest 42 passed on current files"
/** The same card framed on its own border (x 2548–3564, y 664–860 when the shrink lands) plus ~20 px of panel. */
const VCARD = box(2526, 644, 1060, 236);

const CHIPS = ["Tests the host ran, not the model’s word.", "Files you asked to keep, kept.", "Output matched to its file, byte for byte."] as const;

const geo = (L: Layout) => {
  const W = L.W;
  if (!L.portrait) {
    // the end frame is a diagonal: the title and the three rows top-left, the evidence card large at the bottom right
    const cardW = L.px(1100);
    const cardH = (cardW * VCARD.h) / VCARD.w;
    // frame 0 (the seam from S03): the held block itself, already readable, in a card under the title
    const r0W = L.px(1360);
    const r0H = (r0W * HELD_16.h) / HELD_16.w;
    return {
      R0: { x: (W - r0W) / 2, y: L.px(318), w: r0W, h: r0H },
      R1: { x: (W - r0W * 1.03) / 2, y: L.px(306), w: r0W * 1.03, h: r0H * 1.03 },
      R2a: { x: L.px(150), y: L.px(270), w: L.px(1620), h: L.px(770) },
      R2: L.window,
      R3: { x: W - L.margin.x - cardW, y: L.content.y + L.content.h - cardH, w: cardW, h: cardH },
      title: { text: "Done means *checked.*", box: { x: L.content.x, y: L.px(84), w: L.content.w, h: L.px(190) }, size: L.type.headline },
      ag: { x: L.content.x, y: L.px(96), w: L.px(900), h: L.px(170) },
      agSize: L.type.headline,
      sub: { x: L.content.x, y: L.px(268), w: L.px(1000), h: L.px(80) },
      chipTop: L.px(388),
      chipH: L.px(108),
      chipSize: L.type.sub,
      held: HELD_16,
    };
  }
  const cardW = L.content.w;
  const r0W = L.px(1000);
  const r0H = (r0W * HELD_45.h) / HELD_45.w;
  return {
    R0: { x: (W - r0W) / 2, y: L.px(400), w: r0W, h: r0H },
    R1: { x: L.px(40), y: L.px(410), w: L.px(1000), h: r0H },
    R2a: { x: L.px(40), y: L.px(400), w: L.px(1000), h: L.px(1000) / 1.6 },
    R2: L.window,
    R3: { x: L.content.x, y: L.px(330), w: cardW, h: (cardW * VCARD.h) / VCARD.w },
    title: { text: "Done means\n*checked.*", box: { x: L.content.x, y: L.px(110), w: L.content.w, h: L.px(260) }, size: L.type.headline },
    ag: { x: L.content.x, y: L.px(96), w: L.content.w, h: L.px(140) },
    agSize: L.type.headline,
    sub: { x: L.content.x, y: L.px(238), w: L.content.w, h: L.px(64) },
    chipTop: L.px(650),
    chipH: L.px(180),
    chipSize: L.px(46),
    held: HELD_45,
  };
};

/** Where the person's pointer is at source time `s` (the harness's log), eased between samples. */
const pointerAt = (s: number) => {
  const P = AG.pointer;
  if (s <= P[0].t) return { x: P[0].x, y: P[0].y };
  for (let i = 1; i < P.length; i++) {
    if (s <= P[i].t) {
      const a = P[i - 1];
      const b = P[i];
      const p = EASE.move(clamp01((s - a.t) / Math.max(1e-6, b.t - a.t)));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  const z = P[P.length - 1];
  return { x: z.x, y: z.y };
};

/** A plain macOS-style arrow pointer (the person's mouse, not Pebble's UI), tip at (x, y), `h` px tall. */
const Pointer: React.FC<{ x: number; y: number; h: number; press: number; opacity: number }> = ({ x, y, h, press, opacity }) => {
  const s = h / 19;
  return (
    <svg
      width={14 * s}
      height={20 * s}
      viewBox="-1 -1 14 20"
      style={{ position: "absolute", left: x - s, top: y - s, opacity, transform: `scale(${1 - 0.12 * press})`, transformOrigin: "0 0", overflow: "visible", filter: `drop-shadow(0 ${s * 0.8}px ${s * 1.2}px rgba(0,0,0,0.35))` }}
    >
      <path d="M0 0 L0 15.5 L3.9 11.9 L6.6 17.9 L9.1 16.8 L6.5 10.9 L11.6 10.9 Z" fill="#111" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
};

const ChipRow: React.FC<{ text: string; at: number; t: number; x: number; y: number; w: number; h: number; size: number; first: boolean }> = ({ text, at, t, x, y, w, h, size, first }) => {
  const world = useWorld();
  const line = ramp(t, at - 0.1, 0.5, EASE.enter);
  const d = size * 0.92;
  return (
    <>
      {first ? null : (
        <div style={{ position: "absolute", left: x, top: y, width: w * line, height: 1.5, background: DAY.line, opacity: 0.9 }} />
      )}
      <Check x={x} y={y + (h - d) / 2 - size * 0.02} d={d} p={ramp(t, at, 0.42, EASE.enter)} color={world.accent} />
      <Headline
        text={text}
        at={at + 0.06}
        entrance="blur"
        variant="support"
        weight={540}
        size={size}
        color={world.ink}
        box={{ x: x + d + size * 0.5, y, w: w - d - size * 0.5, h }}
        valign="middle"
        wrap
        balance
      />
    </>
  );
};

export const S04_SFX: SfxNote[] = [
  { scene: "S04", s: B.click1, file: "sfx-click-soft-a.wav", db: -14, note: "Run the tests pressed (the harness's click, source 1.4 s)" },
  { scene: "S04", s: B.click2, file: "sfx-click-soft-b.wav", db: -14, note: "Run tests pressed (source 3.1 s)" },
  { scene: "S04", s: B.verified, file: "sfx-shimmer.wav", db: -15, note: "“Verified · pytest 42 passed on current files” lands with the sage glow" },
  { scene: "S04", s: B.chips[0] + 0.3, file: "sfx-tick.wav", db: -20, note: "check 1 drawn" },
  { scene: "S04", s: B.chips[1] + 0.3, file: "sfx-tick-b.wav", db: -20, note: "check 2 drawn" },
  { scene: "S04", s: B.chips[2] + 0.3, file: "sfx-tick.wav", db: -20, note: "check 3 drawn" },
];

export const S04AgentGuard: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T } = useClock(S04_NOMINAL, durationInFrames);
  const g = geo(L);

  // the clip's time: the held frame (static until the pointer comes), 1× into the click, the waits compressed
  const time = timeMap(
    [
      [0, 0],
      [T(0.9), 0.35],
      [T(B.click1), 1.4],
      [T(B.click2), 3.1],
      [T(B.verified), 9.7],
    ],
    { tail: 1 },
  );

  const shrinkEnd = T(B.shrink) + 0.65;
  const rect = rectAt(
    [
      { t: 0, rect: g.R0 },
      { t: T(B.settle), rect: g.R1, dur: 0.7 },
      { t: T(B.pushHeld), rect: g.R2a, dur: 0.6 },
      { t: T(B.card) + 0.1, rect: g.R2, dur: 0.4 },
      { t: T(B.shrink), rect: g.R2, dur: 0.01 },
      { t: shrinkEnd, rect: g.R3, dur: 0.65 },
    ],
    t,
  );

  const keys: ZoomKey[] = [
    { t: 0, box: g.held },
    { t: T(B.pushHeld), box: g.held, dur: 0.6 },
    { t: T(1.9), box: g.held },
    { t: T(B.card), box: CARD, dur: 0.42 },
    { t: T(2.62), box: CARD },
    { t: T(B.running), box: RUNNING, dur: 0.33 },
    { t: T(3.15), box: RUNNING },
    { t: T(B.result), box: RESULT, dur: 0.3 },
    { t: T(3.62), box: RESULT },
    { t: T(B.verified) + 0.05, box: VCTX, dur: 0.45 },
    { t: T(B.shrink), box: VCTX },
    { t: shrinkEnd, box: VCARD, dur: 0.65 },
  ];

  // the clay glow on the held block until the click, the sage glow on the verified card from its landing
  const clay = ramp(t, 0.15, 0.4) * (1 - ramp(t, T(B.click1) + 0.05, 0.3)) * (0.7 + 0.3 * Math.sin(t * 5.2));
  const sage = ramp(t, T(B.verified), 0.25) * 0.75 + 0.35 * hit(t, T(B.verified), 0.06, 0.45);
  const tSrc = (out: number) => time.at(out);
  const cursorOn = ramp(t, T(1.15), 0.2) * (1 - ramp(t, T(B.click2) + 0.35, 0.2));
  const press = (srcClick: number) => {
    const dt = tSrc(t) - srcClick;
    return dt > -0.05 && dt < 0.12 ? 1 - Math.abs(dt - 0.03) / 0.09 : 0;
  };

  const feather = 1 - ramp(t, T(B.card) - 0.42, 0.25);
  const overlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, k: number) => {
    const s = tSrc(t);
    const p = toView(pointerAt(s));
    const pr = Math.max(0, press(1.4), press(3.1));
    // click ripples
    const ripple = (srcClick: number) => {
      const dt = s - srcClick;
      if (dt < 0 || dt > 0.45) return null;
      const c = toView(pointerAt(srcClick));
      const r = (20 + dt * 140) * k;
      return (
        <div style={{ position: "absolute", left: c.x - r, top: c.y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", border: `${2.5 * k}px solid rgba(255,255,255,${(0.7 * (1 - dt / 0.45)).toFixed(3)})` }} />
      );
    };
    return (
      <>
        {glowRing(toView, HELD_ROW, C.clay, clamp01(clay), { radius: 16 * k, pad: 14, spread: 34 * k })}
        {glowRing(toView, VERIFIED, C.glow, clamp01(sage), { radius: 22 * k, pad: 6, spread: 40 * k, line: 2.5 })}
        {/* the held sentence runs past the framing's right edge: feather it into the window's own ground, never a sliced word */}
        {feather > 0.01 ? (
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "17%", opacity: feather, background: "linear-gradient(90deg, rgba(22,26,23,0) 0%, rgba(22,26,23,0.92) 55%, rgb(22,26,23) 100%)" }} />
        ) : null}
        {ripple(1.4)}
        {ripple(3.1)}
        {cursorOn > 0.01 ? <Pointer x={p.x} y={p.y} h={19 * 2.5 * k} press={pr} opacity={cursorOn} /> : null}
      </>
    );
  };

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight">
          <FloatingWindow rect={rect} radius={pick(L, { "16x9": 22, "4x5": 20 })} shadow={1.1}>
            <ScreenZoom src={SRC} srcSize={SIZE} time={time} srcDuration={AG.duration} keys={keys} drift={0.008} overlay={overlay} />
          </FloatingWindow>

          <Headline text={g.title.text} at={T(B.title)} exitAt={T(B.titleOut)} size={g.title.size} align="center" valign="middle" box={g.title.box} />

          <Headline text="AgentGuard." at={T(B.agTitle)} entrance="letters" size={g.agSize} align="left" valign="top" box={g.ag} fit />
          <Headline
            text="Evidence before “done”."
            at={T(B.agSub)}
            entrance="ink"
            variant="support"
            size={L.type.sub}
            color={DAY.ink2}
            align="left"
            valign="top"
            box={g.sub}
          />
          {CHIPS.map((c, i) => (
            <ChipRow
              key={c}
              text={c}
              at={T(B.chips[i])}
              t={t}
              first={i === 0}
              x={L.content.x}
              y={g.chipTop + i * g.chipH}
              w={L.content.w}
              h={g.chipH}
              size={g.chipSize}
            />
          ))}
        </Stage>
        {S04_SFX.map((c) => (
          <Sfx key={`${c.file}-${c.s}`} src={sfxSrc(c.file)} at={sfxStart(c.file, T(c.s))} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};
