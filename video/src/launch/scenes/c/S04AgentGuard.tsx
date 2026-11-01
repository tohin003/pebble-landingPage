// S04 AgentGuard (FIXES-1 WP-C; REVIEW-1 S1, M2, N1, N2). Daylight world: the real 2.0.1 UI floats on warm stone.
//
// Three states of the capture harness clip (Pebble 2.0.1's own frontend, dark theme, sample data), each pushed about 2×
// so its key line reads at 56 px or more (16:9; 40 px or more on 4:5):
//   1. Blocked (0 to 1.5 s): "Pebble's change isn't verified yet." in a clay glow, with Run the tests and Ask Pebble to
//      finish. Frame 0 is the zoom-through's incoming window (master/timeline.ts S04_FIRST): the master scales this window
//      up to fill the frame at the swap and lets it settle, so the stone comes in behind it; the scene holds it still
//      for the seam and puts "Done means checked." above it once it has settled.
//   2. The click (0.95 to 2.0 s): the person's pointer (drawn from the harness's own mouse log, data/ui.ts `pointer`)
//      presses Run the tests on the beat; the block gives way to "Needs your review" (the approval it asks for).
//   3. Verified (2.0 to 3.6 s): a hard cut on the beat to Details' check card, "Verified · pytest 42 passed on current
//      files", in a sage glow (the shimmer), the edit skipping the wait ("edited for time").
// Then the window shrinks to that card (the evidence) and, 0.2 s after it settles, "AgentGuard." with "Evidence before
// “done”." and the three check lines (drawn checks and plain type: a diagram, never a Pebble screen), held 3 s after
// the last one lands. Every word leaves 2 frames before the whip into S05.
//
// Crops end on the UI's own boundaries (measured on the clip's frames); the held sentence's first line runs on past
// "yet." under the crop's right edge, so it fades into the UI's own ground there (a feather, never a sliced word).
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import type { Box } from "../../camera";
import { UI_CLIPS } from "../../data/ui";
import { pick, useLayout, type Layout, type Rect } from "../../layout";
import type { TimeMap } from "../../timeMap";
import { C, EASE } from "../../tokens";
import { DAY, useWorld } from "../../world";
import type { SceneProps } from "../types";
import { Check, box, clamp01, glowRing, hit, lerp, ramp, sfxSrc, sfxStart, useClock, type SfxNote } from "./common";

export const S04_NOMINAL = 9;

const AG = UI_CLIPS.agentguard;
const SRC = AG.src.dark;
const SIZE = AG.size; // 3600 × 2250

/** Beats, seconds at the nominal length (local beats every 0.5 s; downbeats at 1, 3, 5, 7). */
const B = {
  /** the zoom-through's post ends at 0.42: the title waits for the window to settle */
  title: 0.45,
  pointer: 0.95,
  press: 1.5, // Run the tests (source 1.38), on the beat
  cut: 2.0, // Verified (source 9.8), on the beat
  titleOut: 3.42,
  shrink: 3.6, // → 4.05, the window becomes the evidence card
  agTitle: 4.25,
  agSub: 4.45,
  rows: [4.6, 4.8, 5.0] as const,
  out: 8.52, // every word gone by 8.70, two frames before the whip (8.87)
} as const;
const SHRINK = 0.45;
/** Type exits: 0.18 s, accelerating (REVIEW-1 M2). */
const EXIT = 0.18;

export const S04_MARKS = [
  { name: "title", s: B.title },
  { name: "click-run-the-tests", s: B.press },
  { name: "verified-cut", s: B.cut },
  { name: "card-settles", s: B.shrink + SHRINK },
  { name: "agentguard-title", s: B.agTitle },
  { name: "row-1", s: B.rows[0] },
  { name: "row-2", s: B.rows[1] },
  { name: "row-3", s: B.rows[2] },
  { name: "type-out", s: B.out },
] as const;

/**
 * Source framings (the clip's own px), measured on its frames: every edge falls in a gap between lines.
 * BLOCKED: "Blocked" (y 1453–1490), the sentence's two lines (1558–1623; line 1 from x 767, "yet." ends at 1240), the
 * buttons (Run the tests 765–1007, Ask Pebble to finish 1027–1359; Accept as unverified starts at 1381, outside).
 * VERIFIED: Details' check card (2543–3561 × 663–860; the green line 2577–3173 × 753–780) and the Done card's heading
 * (923–947); the right edge crosses only the cards' borders.
 */
const BLOCKED: Record<Layout["id"], Box> = { "16x9": box(733, 1432, 646, 310), "4x5": box(733, 1300, 646, 517) };
/**
 * After the press the conversation reflows (measured at 1.6 s): the reply's icons (1402–1426), "Needs your review"
 * (1524–1552), the action card (1622–1771), the composer's border at 1850; the camera follows it down.
 */
const REVIEW: Record<Layout["id"], Box> = { "16x9": box(733, 1490, 646, 310), "4x5": box(733, 1350, 625, 500) };
const VERIFIED: Record<Layout["id"], Box> = { "16x9": box(2530, 636, 665, 319), "4x5": box(2530, 586, 665, 532) };
/** The check card on its own border plus ~20 px of panel: the end frame's evidence. */
const VCARD = box(2526, 644, 1060, 236);
const CARD = box(2543, 663, 1018, 197);
const GREEN_LINE = box(2567, 745, 618, 43);
/** The held sentence (both lines), the clay line: the glow rings it, not the buttons. */
const HELD = box(755, 1546, 505, 90);
/** Line 1 of the held sentence runs on after "yet." (1240): it fades out over the gap before "·" (1254). */
const LINE1 = { x0: 1243, x1: 1252, y0: 1550, y1: 1595 };
/** The conversation's ground as the render decodes it (sampled from a still), for that fade. */
const CONV_BG = "#171C19";
/** Details' ground around its cards, as the render decodes it: the shrink fades everything but the card into it. */
const PANEL_BG = "#121815";
/** Where the pointer presses: Run the tests (data/ui.ts pointer, t 1.4). */
const PRESS_AT = { x: 887, y: 1686 };

/**
 * S04's first window, as fractions: the master's zoom-through incoming rect (master/timeline.ts S04_FIRST). On 4:5 it
 * is taller than the master's first guess (h 0.463), so the window fills the frame's lower half instead of leaving it
 * empty: FIX1-C.md asks for S04_FIRST["4x5"] = { x: 0.037, y: 0.2963, w: 0.9259, h: 0.5926 }.
 */
const FIRST: Record<Layout["id"], { x: number; y: number; w: number; h: number }> = {
  "16x9": { x: 0.1458, y: 0.2944, w: 0.7083, h: 0.6044 },
  "4x5": { x: 0.037, y: 0.2963, w: 0.9259, h: 0.5926 },
};

const CHECKS = ["Tests the host ran, not the model’s word.", "Files you asked to keep, kept.", "Output matched to its file, byte for byte."] as const;

const geo = (L: Layout) => {
  const f = FIRST[L.id];
  const R0: Rect = { x: f.x * L.W, y: f.y * L.H, w: f.w * L.W, h: f.h * L.H };
  if (!L.portrait) {
    // the end frame is a diagonal: the title and the three rows top left, the evidence card large at the bottom right
    const cardW = L.px(1100);
    const cardH = (cardW * VCARD.h) / VCARD.w;
    return {
      R0,
      R3: { x: L.W - L.margin.x - cardW, y: L.content.y + L.content.h - cardH, w: cardW, h: cardH },
      title: { text: "Done means *checked.*", box: { x: L.content.x, y: L.px(64), w: L.content.w, h: L.px(224) }, size: L.type.headline },
      ag: { x: L.content.x, y: L.px(96), w: L.px(900), h: L.px(170) },
      agSize: L.type.headline,
      sub: { x: L.content.x, y: L.px(268), w: L.px(1000), h: L.px(80) },
      rowTop: L.px(388),
      rowH: L.px(108),
      rowSize: L.type.sub,
    };
  }
  const cardW = L.content.w;
  return {
    R0,
    R3: { x: L.content.x, y: L.px(330), w: cardW, h: (cardW * VCARD.h) / VCARD.w },
    title: { text: "Done means\n*checked.*", box: { x: L.content.x, y: L.px(106), w: L.content.w, h: L.px(270) }, size: L.type.headline },
    ag: { x: L.content.x, y: L.px(96), w: L.content.w, h: L.px(140) },
    agSize: L.type.headline,
    sub: { x: L.content.x, y: L.px(238), w: L.content.w, h: L.px(64) },
    rowTop: L.px(610),
    rowH: L.px(170),
    rowSize: L.px(50),
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

/** Paints `color` over everything but the source box `b` (feathered edges): the picture narrows onto that box. */
const Isolate: React.FC<{ toView: (p: { x: number; y: number }) => { x: number; y: number }; b: Box; color: string; opacity: number; feather: number }> = ({ toView, b, color, opacity, feather: f }) => {
  const a = toView({ x: b.x, y: b.y });
  const z = toView({ x: b.x + b.w, y: b.y + b.h });
  const h = `linear-gradient(90deg, #000 ${(a.x - f).toFixed(1)}px, transparent ${a.x.toFixed(1)}px, transparent ${z.x.toFixed(1)}px, #000 ${(z.x + f).toFixed(1)}px)`;
  const v = `linear-gradient(180deg, #000 ${(a.y - f).toFixed(1)}px, transparent ${a.y.toFixed(1)}px, transparent ${z.y.toFixed(1)}px, #000 ${(z.y + f).toFixed(1)}px)`;
  return (
    <div
      style={{ position: "absolute", inset: 0, background: color, opacity, maskImage: `${h}, ${v}`, WebkitMaskImage: `${h}, ${v}`, maskComposite: "add", WebkitMaskComposite: "source-over" }}
    />
  );
};

/** Type that leaves in 0.18 s, accelerating, rising a little out of focus (REVIEW-1 M2). */
const TypeExit: React.FC<{ at: number; t: number; u: number; children: ReactNode }> = ({ at, t, u, children }) => {
  const p = EASE.exit(clamp01((t - at) / EXIT));
  if (p >= 0.999) return null;
  if (p <= 0) return <>{children}</>;
  return <AbsoluteFill style={{ opacity: 1 - p, transform: `translateY(${(-p * 22 * u).toFixed(2)}px)`, filter: `blur(${(p * 5 * u).toFixed(2)}px)` }}>{children}</AbsoluteFill>;
};

const CheckRow: React.FC<{ text: string; at: number; t: number; x: number; y: number; w: number; h: number; size: number; first: boolean }> = ({ text, at, t, x, y, w, h, size, first }) => {
  const world = useWorld();
  const line = ramp(t, at - 0.1, 0.45, EASE.enter);
  const d = size * 0.92;
  return (
    <>
      {first ? null : <div style={{ position: "absolute", left: x, top: y, width: w * line, height: 1.5, background: DAY.line, opacity: 0.9 }} />}
      <Check x={x} y={y + (h - d) / 2 - size * 0.02} d={d} p={ramp(t, at, 0.42, EASE.enter)} color={world.accent} />
      <Headline
        text={text}
        at={at + 0.06}
        entrance="line"
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

/**
 * The clip's time for output second `t`: the held frame runs slowly into the press (the UI is still until then; only
 * the drawn pointer moves), the press holds two frames, then the edit skips the block's 0.15 s reflow to "Needs your
 * review" (1×), and at the cut it skips the tests' wait to the verified card (1×). Every frame shown is the clip's own.
 */
const clipTime = (T: (x: number) => number): TimeMap => {
  const press = T(B.press);
  const cut = T(B.cut);
  const hold = 2 / 30;
  const at = (t: number) => {
    if (t < press) return 0.05 + (1.38 - 0.05) * clamp01(t / press);
    if (t < press + hold) return 1.38;
    if (t < cut) return 1.56 + (t - press - hold);
    return 9.8 + (t - cut);
  };
  return {
    at,
    inv: (src: number) => (src <= 1.38 ? (press * (src - 0.05)) / (1.38 - 0.05) : src < 9.8 ? press + hold + (src - 1.56) : cut + (src - 9.8)),
    speed: (t: number) => (t < press ? (1.38 - 0.05) / press : t < press + hold ? 0 : 1),
    knots: [],
  };
};

/** A region of the source pushed in by `k` (< 1) about the point (fx, fy). */
const pushAbout = (b: Box, k: number, fx: number, fy: number): Box => ({ x: fx - (fx - b.x) * k, y: fy - (fy - b.y) * k, w: b.w * k, h: b.h * k });
/** Between two regions in log scale (a constant perceived zoom speed), centres linear. */
const mixRegion = (a: Box, b: Box, p: number): Box => {
  const w = Math.exp(lerp(Math.log(a.w), Math.log(b.w), p));
  const h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), p));
  const cx = lerp(a.x + a.w / 2, b.x + b.w / 2, p);
  const cy = lerp(a.y + a.h / 2, b.y + b.h / 2, p);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

export const S04_SFX: SfxNote[] = [
  { scene: "S04", s: B.press, file: "sfx-click-soft-a.wav", db: -14, note: "Run the tests pressed (the harness's click, source 1.4 s), on the beat" },
  { scene: "S04", s: B.cut, file: "sfx-shimmer.wav", db: -15, note: "the cut to “Verified · pytest 42 passed on current files” with the sage glow, on the beat" },
  { scene: "S04", s: B.rows[0] + 0.3, file: "sfx-tick.wav", db: -20, note: "check 1 drawn" },
  { scene: "S04", s: B.rows[1] + 0.3, file: "sfx-tick-b.wav", db: -20, note: "check 2 drawn" },
  { scene: "S04", s: B.rows[2] + 0.3, file: "sfx-tick.wav", db: -20, note: "check 3 drawn" },
];

export const S04AgentGuard: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T } = useClock(S04_NOMINAL, durationInFrames);
  const g = geo(L);
  const time = clipTime(T);

  // the window: the zoom-through's rect (still through the seam), then the evidence card
  const shrinkP = EASE.camera(clamp01((t - T(B.shrink)) / SHRINK));
  const rect = mixRegion(g.R0, g.R3, shrinkP);
  // a 3 % punch on the cut to Verified, decaying (a hit, not a creep); the evidence card's hold drifts 0.8 %/s (UI only)
  const punch = (1 + 0.03 * hit(t, T(B.cut), 0.001, 0.22)) * (1 + 0.008 * Math.max(0, t - T(B.shrink) - SHRINK));

  // the camera: each state's framing with a slow push (0.8 %/s, UI only), then the glide onto the card
  const blocked = BLOCKED[L.id];
  const verified = VERIFIED[L.id];
  let region: Box;
  const reflow = T(B.press) + 2 / 30;
  if (t < reflow) {
    region = pushAbout(blocked, Math.exp(-0.008 * Math.max(0, t - 0.45)), 1004, 1600);
  } else if (t < T(B.cut)) {
    region = pushAbout(REVIEW[L.id], Math.exp(-0.008 * (t - reflow)), 1050, 1660);
  } else {
    const v = pushAbout(verified, Math.exp(-0.008 * (t - T(B.cut))), 2875, 766);
    const end = pushAbout(VCARD, Math.exp(-0.005 * Math.max(0, t - T(B.shrink) - SHRINK)), VCARD.x + VCARD.w / 2, VCARD.y + VCARD.h / 2);
    region = shrinkP <= 0 ? v : mixRegion(v, end, shrinkP);
  }

  // the clay glow on the held block until the press; the sage glow on the verified line, widening to the card
  const clay = ramp(t, 0.1, 0.35) * (1 - ramp(t, T(B.press) + 0.03, 0.2)) * (0.78 + 0.22 * Math.sin(t * 5.2));
  // the line's ring leaves as the shrink starts and the card's ring arrives as it settles (never sweeping across text)
  const sage = (ramp(t, T(B.cut), 0.2) * 0.8 + 0.3 * hit(t, T(B.cut), 0.04, 0.45)) * (1 - ramp(t, T(B.shrink), 0.12, EASE.linear));
  const sageCard = 0.75 * ramp(t, T(B.shrink) + SHRINK - 0.1, 0.25);
  // during the shrink everything but the card fades into Details' ground, so the moving crop never slices a line
  const isolate = clamp01(shrinkP / 0.45);
  const cursorOn = ramp(t, T(B.pointer), 0.15) * (1 - ramp(t, T(B.cut) - 0.12, 0.1));
  const pressK = (() => {
    const dt = t - T(B.press);
    return dt < -0.07 ? 0 : dt < 0 ? 1 + dt / 0.07 : dt < 0.12 ? 1 - dt / 0.12 : 0;
  })();

  const overlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, k: number) => {
    const p = toView(pointerAt(time.at(t)));
    const ripple = (() => {
      const dt = t - T(B.press);
      if (dt < 0 || dt > 0.45) return null;
      const c = toView(PRESS_AT);
      const r = (20 + dt * 140) * k;
      return <div style={{ position: "absolute", left: c.x - r, top: c.y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", border: `${2.5 * k}px solid rgba(255,255,255,${(0.7 * (1 - dt / 0.45)).toFixed(3)})` }} />;
    })();
    const fadeA = toView({ x: LINE1.x0, y: LINE1.y0 });
    const fadeB = toView({ x: LINE1.x1, y: LINE1.y1 });
    return (
      <>
        {t < reflow ? (
          // line 1 of the held sentence fades into the UI's ground after "yet." (the crop's right edge cuts it later)
          <div
            style={{
              position: "absolute",
              left: fadeA.x,
              top: fadeA.y,
              right: 0,
              height: fadeB.y - fadeA.y,
              background: `linear-gradient(90deg, rgba(23,28,25,0) 0px, ${CONV_BG} ${(fadeB.x - fadeA.x).toFixed(1)}px)`,
            }}
          />
        ) : null}
        {t < reflow ? glowRing(toView, HELD, C.clay, clamp01(clay), { radius: 12 * k, pad: 0, spread: 30 * k }) : null}
        {isolate > 0.001 ? <Isolate toView={toView} b={CARD} color={PANEL_BG} opacity={isolate} feather={8 * k} /> : null}
        {t >= T(B.cut) ? glowRing(toView, GREEN_LINE, C.glow, clamp01(sage), { radius: 10 * k, pad: 6, spread: 34 * k, line: 2.5 }) : null}
        {sageCard > 0.001 ? glowRing(toView, CARD, C.glow, sageCard, { radius: 22 * k, pad: 6, spread: 40 * k, line: 2.5 }) : null}
        {ripple}
        {cursorOn > 0.01 ? <Pointer x={p.x} y={p.y} h={19 * 2.5 * k} press={pressK} opacity={cursorOn} /> : null}
      </>
    );
  };

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight">
          <FloatingWindow rect={rect} enter="none" radius={pick(L, { "16x9": 22, "4x5": 20 })} shadow={1.1} scale={punch} background={CONV_BG}>
            <ScreenZoom
              src={SRC}
              srcSize={SIZE}
              time={time}
              srcDuration={AG.duration}
              keys={[{ t: 0, box: region }]}
              drift={0}
              motionBlur={false}
              edgeFade={14}
              overlay={overlay}
            />
          </FloatingWindow>

          <TypeExit at={T(B.titleOut)} t={t} u={L.u}>
            <Headline text={g.title.text} at={T(B.title)} accentFace="same" size={g.title.size} align="center" valign="middle" box={g.title.box} />
          </TypeExit>

          <TypeExit at={T(B.out)} t={t} u={L.u}>
            <Headline text="AgentGuard." at={T(B.agTitle)} entrance="letters" size={g.agSize} align="left" valign="top" box={g.ag} fit />
            <Headline text="Evidence before “done”." at={T(B.agSub)} entrance="ink" variant="support" size={L.type.sub} color={DAY.ink2} align="left" valign="top" box={g.sub} />
            {CHECKS.map((c, i) => (
              <CheckRow
                key={c}
                text={c}
                at={T(B.rows[i])}
                t={t}
                first={i === 0}
                x={L.content.x}
                y={g.rowTop + i * g.rowH}
                w={L.content.w}
                h={g.rowH}
                size={g.rowSize}
              />
            ))}
          </TypeExit>
        </Stage>
        {S04_SFX.map((c) => (
          <Sfx key={`${c.file}-${c.s}`} src={sfxSrc(c.file)} at={sfxStart(c.file, T(c.s))} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};
