// S07 Context warping (7.0 s): the owner's name for Pebble's sealed long-task context (CLAUDE.md, Pebble 1.4.0+;
// REVIEW-1 N2, N3, S9 and BANNED "a title demoted to a corner label"; FIXES-1 WP-D). v2.0.1's frontend has no view of
// sealed context (UI_CAPTURE.md §8), so this is a DIAGRAM and reads as one: generic blocks with plain labels and grey
// lines for text, never Pebble's interface.
//
// 0.00  "Context warping." lands on the cut at full size (112 px; 96 px in 4:5) and stays there, dead still, to the end.
// 0.50  A long task's context grows upward, one tool result every 0.2 s, past the dashed budget line (the last block
//       crosses it on the 1.50 downbeat and the line turns clay). "Long tasks keep a smaller window."
// 2.00  A seal is stamped on each of the three oldest results, a sixteenth apart from the beat (a hard stamp: no lens,
//       no glow); on the next beat (2.50) the three squeeze together into thin sealed stubs that keep their labels, so
//       the newest stay whole and the column falls back under the line in ONE move. The flash scan's fix stays: a
//       block's content fades to low contrast before its stamp, and a block in motion carries a motion blur.
// 4.02  "Older results sealed. Any one returned exactly." 4.50: one stub opens back into its full block, unchanged,
//       ringed in sage. No saving is claimed.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import type { SfxCue } from "../../components/Sfx";
import { SfxTrack } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { useLayout, type Layout } from "../../layout";
import { prog, tween } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { DAY } from "../../world";
import type { SceneProps } from "../types";
import { PLACE_SFX, SFX, clamp01, lerp, peakAt, useRetime, useT } from "./common";

export const S07_NOMINAL = 7;

/** Oldest first: block 0 sits at the bottom of the column. Generic diagram labels, no real data (C-FILM2-27). */
const BLOCKS = [
  { label: "read invoice.py", lines: [0.9, 0.62] },
  { label: "read dates.py", lines: [0.78, 0.5] },
  { label: "searched the web", lines: [0.86, 0.7] },
  { label: "edited invoice.py", lines: [0.92, 0.66] },
  { label: "ran the tests", lines: [0.74, 0.44] },
  { label: "read the test log", lines: [0.88, 0.58] },
] as const;
/** how many of the oldest are sealed */
const SEALED = 3;
/** the stub that opens again */
const REOPEN = 1;

export const S07_BEATS = {
  title: 0,
  firstBlock: 0.5,
  blockStep: 0.2,
  line1: 0.8,
  /** the seals are stamped a sixteenth apart from the beat (the oldest first) */
  stamps: [2.0, 2.125, 2.25],
  /** the three sealed results squeeze together on the next beat: one move of the column, not three */
  squeeze: 2.5,
  line1Out: 3.72,
  line2: 4.02,
  reopen: 4.5,
} as const;
const BLOCK_IN = 0.42;
/** the content fades this long before its stamp */
const FADE = 0.25;
const SQUEEZE = 0.4;
const REOPEN_DUR = 0.6;

const stampAt = (i: number, a: (s: number) => number) => a(S07_BEATS.stamps[i]);

export const S07_MARKS = [
  { name: "title lands (full size, held)", s: 0.2 },
  { name: "the last block crosses the budget line", s: S07_BEATS.firstBlock + 5 * S07_BEATS.blockStep + 0.2 },
  ...S07_BEATS.stamps.map((s, i) => ({ name: `seal ${i + 1} stamped (${BLOCKS[i].label})`, s })),
  { name: "the sealed results squeeze; the column falls back under the line", s: S07_BEATS.squeeze },
  { name: "the column fits again", s: S07_BEATS.squeeze + SQUEEZE },
  { name: "\"Older results sealed. Any one returned exactly.\"", s: S07_BEATS.line2 },
  { name: "one stub opens, unchanged", s: S07_BEATS.reopen },
] as const;

export const s07Sfx = (k = 1): SfxCue[] => {
  const out: SfxCue[] = [];
  // a soft tick as each block lands on the column (its entrance reads as landed at about 0.18 s)
  BLOCKS.forEach((_, i) => out.push(peakAt(i % 2 ? SFX.tick : SFX.click2, (S07_BEATS.firstBlock + i * S07_BEATS.blockStep) * k + 0.18, -21)));
  // a click on each stamp (the master keeps the first; the stamps themselves are the beat), a short whoosh as the column drops
  S07_BEATS.stamps.forEach((s) => out.push(peakAt(SFX.click, s * k, -15)));
  out.push(peakAt(SFX.whoosh, S07_BEATS.squeeze * k + SQUEEZE * 0.5, -19));
  // the stub opens: the shimmer as the block is whole again
  out.push(peakAt(SFX.shimmer, S07_BEATS.reopen * k + REOPEN_DUR, -16));
  return out;
};

const geometry = (L: Layout) => {
  const p = L.px;
  if (!L.portrait) {
    return {
      title: { x: p(112), y: p(56), w: p(1700), h: p(150) },
      titleSize: p(112),
      lines: { x: p(112), y: p(420), w: p(620), h: p(440) },
      lineSize: p(68),
      col: { x: p(840), w: p(940), floor: p(1012) },
      block: { full: p(112), stub: p(66), gap: p(12) },
      budget: p(660),
      label: p(48),
      tag: p(32),
      budgetLabel: p(40),
      budgetText: "context budget",
      /** the dashed line's span; the label left of its start */
      budgetSpan: { x: p(840) - p(44), w: p(940) + p(88) },
      labelAbove: false,
      push: 1.035,
    };
  }
  return {
    title: { x: p(64), y: p(56), w: p(952), h: p(130) },
    titleSize: p(96),
    lines: { x: p(64), y: p(214), w: p(952), h: p(170) },
    lineSize: p(52),
    // REVIEW-2 N-6: the rows end 60 px from the right edge at rest (40 px or more at the push's largest scale, 1.06),
    // clear of "context budget", which now sits on one line above the line's left end
    col: { x: p(360), w: p(660), floor: p(1290) },
    block: { full: p(120), stub: p(70), gap: p(12) },
    budget: p(700),
    label: p(48),
    tag: p(32),
    budgetLabel: p(40),
    budgetText: "context budget",
    budgetSpan: { x: p(64), w: p(1020) - p(64) },
    labelAbove: true,
    push: 1.03,
  };
};

/** 0 = a full block, 1 = a sealed stub (the three squeeze together after their stamps; the reopened one goes back). */
const warpOf = (t: number, i: number, a: (s: number) => number): number => {
  if (i >= SEALED) return 0;
  const w = prog(t, a(S07_BEATS.squeeze), SQUEEZE, EASE.camera);
  if (i !== REOPEN) return w;
  return w * (1 - prog(t, a(S07_BEATS.reopen), REOPEN_DUR, EASE.camera));
};

export const S07ContextWarping: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { at: a, k } = useRetime(S07_NOMINAL, durationInFrames);
  const g = geometry(L);

  // the column's stacking at any time (pure in tt), so each block's speed can be read from one frame back
  const stackAt = (tt: number) => {
    const en = BLOCKS.map((_, i) => prog(tt, a(S07_BEATS.firstBlock) + i * S07_BEATS.blockStep, BLOCK_IN, EASE.enter));
    const wa = BLOCKS.map((_, i) => warpOf(tt, i, a));
    const hs = BLOCKS.map((_, i) => lerp(g.block.full, g.block.stub, wa[i]) * en[i]);
    let yy = g.col.floor;
    const bs = hs.map((h, i) => {
      const b = yy;
      yy -= h + g.block.gap * en[i];
      return b;
    });
    return { enters: en, warps: wa, heights: hs, bottoms: bs, top: yy + g.block.gap };
  };
  const { enters, warps, heights, bottoms, top } = stackAt(t);
  // The director (flash scan, draft 2): as stubs seal (and one reopens) the blocks above slide, and their crisp labels
  // swept the same pixels ~15 times a second (WCAG 2.3.1's general flash at desk distance). A block in motion carries a
  // motion blur, as a camera's shutter would, so nothing crisp sweeps. The speed is read over a 30 fps frame (the
  // delivery's) whatever the composition's rate, so a 60 fps preview blurs as the 30 fps film does.
  const prevBottoms = stackAt(t - 1 / 30).bottoms;
  const motionOf = (i: number) => Math.abs(bottoms[i] - prevBottoms[i]);
  const budgetY = g.col.floor - g.budget;
  const over = clamp01((budgetY - top) / L.px(40));

  // the camera: a small push toward the stamps while they land, then back for the reopen; the title is outside it
  const s0 = stampAt(0, a);
  const push = tween(t, [s0 - 0.4, s0 + 0.3, a(S07_BEATS.reopen) - 0.2, a(S07_BEATS.reopen) + 0.4], [1, g.push, g.push, 1 + (g.push - 1) / 3], EASE.camera);
  const drift = 1 + 0.004 * t;
  const focusY = g.col.floor - L.px(250);
  const colCx = g.col.x + g.col.w / 2;
  const reopenP = prog(t, a(S07_BEATS.reopen), REOPEN_DUR, EASE.camera);
  const reopened = t >= a(S07_BEATS.reopen);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight" keyLight={L.portrait ? { x: 0.5, y: 0.25, r: 0.95 } : { x: 0.62, y: 0.12, r: 0.95 }}>
          {/* the title: full size from the cut to the end, never moved or shrunk */}
          <Headline text="Context warping." at={a(S07_BEATS.title) - 0.07} entrance="blur" together size={g.titleSize} align="left" valign="bottom" box={g.title} fit />
          <Headline
            text="Long tasks keep a smaller window."
            at={a(S07_BEATS.line1)}
            exitAt={a(S07_BEATS.line1Out)}
            exit="fade"
            entrance="ink"
            variant="support"
            size={g.lineSize}
            color={DAY.ink2}
            wrap
            balance
            fit={false}
            align="left"
            valign="top"
            box={g.lines}
          />
          <Headline
            text="Older results sealed. Any one returned exactly."
            at={a(S07_BEATS.line2)}
            entrance="line"
            variant="support"
            size={g.lineSize}
            color={DAY.ink}
            wrap
            balance
            fit={false}
            align="left"
            valign="top"
            box={g.lines}
          />
          {/* the diagram */}
          <div style={{ position: "absolute", inset: 0, transform: `scale(${(push * drift).toFixed(5)})`, transformOrigin: `${colCx.toFixed(1)}px ${focusY.toFixed(1)}px` }}>
            {/* the budget sits behind the column: the blocks that cross it read as over it */}
            <BudgetLine x={g.budgetSpan.x} w={g.budgetSpan.w} y={budgetY} over={over} at={a(S07_BEATS.firstBlock)} size={g.budgetLabel} text={g.budgetText} above={g.labelAbove} />
            {BLOCKS.map((b, i) =>
              enters[i] <= 0 ? null : (
                <WarpBlock
                  key={i}
                  label={b.label}
                  lines={b.lines}
                  x={g.col.x}
                  w={g.col.w}
                  bottom={bottoms[i]}
                  full={g.block.full}
                  stub={g.block.stub}
                  enter={enters[i]}
                  warp={warps[i]}
                  stamp={i < SEALED ? t - stampAt(i, a) : -Infinity}
                  reopen={i === REOPEN ? t - a(S07_BEATS.reopen) : -Infinity}
                  motion={motionOf(i)}
                  labelSize={g.label}
                  tagSize={g.tag}
                  overTint={over * (bottoms[i] - heights[i] < budgetY - L.px(4) ? 1 : 0)}
                  ring={i === REOPEN && reopened ? reopenP : 0}
                  u={L.u}
                />
              ),
            )}
          </div>
          {PLACE_SFX ? <SfxTrack cues={s07Sfx(k)} /> : null}
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};

/** The budget: a dashed hairline across the column; its label (Inter) sits outside the column's left edge, or (4:5) on
 * one line above the line's left end. It warms to clay while the column is over it. */
const BudgetLine: React.FC<{ x: number; w: number; y: number; over: number; at: number; size: number; text: string; above?: boolean }> = ({ x, w, y, over, at, size, text, above = false }) => {
  const t = useT();
  const p = prog(t, at - 0.1, 0.5, EASE.enter);
  if (p <= 0) return null;
  const ink = mix(DAY.small, "#B5582F", over);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w * p, height: 0, borderTop: `${Math.max(2, size * 0.08).toFixed(2)}px dashed ${ink}`, opacity: 0.9 }} />
      <div
        style={{
          position: "absolute",
          left: above ? x : x - size * 0.4,
          top: above ? y - size * 0.3 : y,
          transform: above ? "translateY(-100%)" : "translate(-100%, -50%)",
          fontFamily: TYPE.support.fontFamily,
          fontVariationSettings: '"opsz" 32',
          fontWeight: 520,
          fontSize: size,
          letterSpacing: "-0.012em",
          lineHeight: 1.08,
          textAlign: above ? "left" : "right",
          color: ink,
          opacity: p,
          whiteSpace: "pre",
        }}
      >
        {text}
      </div>
    </>
  );
};

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(", ")})`;
};

const labelStyle = (size: number, color: string): React.CSSProperties => ({
  fontFamily: TYPE.support.fontFamily,
  fontVariationSettings: '"opsz" 32',
  fontWeight: 560,
  fontSize: size,
  letterSpacing: "-0.015em",
  lineHeight: 1,
  color,
  whiteSpace: "nowrap",
});

/**
 * One tool result. Full: a card with its label (Inter, 48 px) and grey lines for its text. Sealed: its content fades
 * to low contrast, a seal is stamped on it on the beat, and it squeezes (a slight hourglass pinch: the warp) into a thin
 * stub that keeps its label and reads "sealed". Reopened: the same card again, unchanged.
 */
const WarpBlock: React.FC<{
  label: string;
  lines: readonly number[];
  x: number;
  w: number;
  bottom: number;
  full: number;
  stub: number;
  enter: number;
  warp: number;
  /** seconds since this block's stamp (−∞: never stamped) */
  stamp: number;
  /** seconds since this block reopens (−∞: never) */
  reopen: number;
  /** this block's vertical speed, px a frame (a motion blur above about 0.5 px a frame) */
  motion: number;
  labelSize: number;
  tagSize: number;
  ring: number;
  u: number;
  /** 0..1: the block reaches over the budget line (a clay edge) */
  overTint: number;
}> = ({ label, lines, x, w, bottom, full, stub, enter, warp, stamp, reopen, motion, labelSize, tagSize, ring, u, overTint }) => {
  const radius = 14 * u;
  const h = lerp(full, stub, warp);
  const top = bottom - h * enter;
  const pad = 26 * u;
  // the content fades to low contrast before the stamp (the flash fix) and comes back at the end of a reopen
  const fadeIn = reopen > -Infinity ? clamp01((reopen - REOPEN_DUR * 0.6) / (REOPEN_DUR * 0.4)) : 0;
  const innerA = Math.max(1 - 0.85 * clamp01((stamp + FADE) / FADE), fadeIn);
  // the card turns into the stub as it squeezes; the stub's label and tag arrive as it settles
  const stubA = clamp01((warp - 0.55) / 0.35) * (reopen > -Infinity ? 1 - clamp01(reopen / 0.15) : 1);
  const cardA = 1 - clamp01((warp - 0.45) / 0.4);
  const pinch = 0.16 * Math.sin(Math.PI * warp);
  // the stamp: a hard hit (2 frames from 1.35× to 1×, no ease-out tail, no glow), then it rides the squeeze down to the
  // stub's size; on the reopen it lifts away
  const sealSize = lerp(full * 0.6, stub * 0.72, warp);
  const stampP = stamp < -0.067 ? -1 : stamp < 0 ? 1 - (stamp + 0.067) / 0.067 : 0;
  const stampScale = stampP < 0 ? 0 : stampP > 0 ? 1 + 0.35 * stampP : stamp < 0.05 ? 0.97 : 1;
  const sealA = stampP < 0 ? 0 : (reopen > -Infinity ? 1 - clamp01(reopen / 0.18) : 1);

  const clip =
    pinch > 0.002
      ? (() => {
          const steps = 20;
          const L: string[] = [];
          const R: string[] = [];
          for (let s = 0; s <= steps; s++) {
            const f = s / steps;
            const inX = pinch * Math.pow(Math.sin(Math.PI * f), 1.4) * 50;
            L.push(`${inX.toFixed(3)}% ${(f * 100).toFixed(3)}%`);
            R.unshift(`${(100 - inX).toFixed(3)}% ${(f * 100).toFixed(3)}%`);
          }
          return `polygon(${[...L, ...R].join(", ")})`;
        })()
      : undefined;

  const blurPx = Math.max(enter < 1 ? (1 - enter) * 6 * u : 0, motion > 0.5 ? Math.min(16, (motion - 0.5) * 2.0) : 0);

  return (
    <div style={{ position: "absolute", left: x, top: top - (1 - enter) * 34 * u, width: w, height: h, opacity: enter, filter: blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : undefined }}>
      {cardA > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: cardA, clipPath: clip, WebkitClipPath: clip }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: radius,
              background: overTint > 0 ? `rgba(${Math.round(255 - 8 * overTint)}, ${Math.round(253 - 18 * overTint)}, ${Math.round(249 - 24 * overTint)}, 0.95)` : "rgba(255, 253, 249, 0.94)",
              boxShadow: `inset 0 0 0 ${(Math.max(1, u) * (1 + 1.2 * overTint)).toFixed(2)}px ${overTint > 0 ? `rgba(181, 88, 47, ${(0.3 + 0.45 * overTint).toFixed(3)})` : DAY.line}, 0 ${(6 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px rgba(74, 62, 44, 0.10)`,
            }}
          >
            {/* the content keeps the card's full layout and is squeezed with it */}
            <div style={{ position: "absolute", left: 0, top: 0, width: w, height: full, transform: `scaleY(${(h / full).toFixed(4)})`, transformOrigin: "50% 0", opacity: innerA }}>
              <div style={{ position: "absolute", left: pad, top: 15 * u, ...labelStyle(labelSize, DAY.ink2) }}>{label}</div>
              {lines.map((lw, li) => (
                <div key={li} style={{ position: "absolute", left: pad, top: full - (34 - li * 15) * u, width: (w - 2 * pad) * lw, height: 7 * u, borderRadius: 4 * u, background: DAY.track }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {stubA > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: w,
            height: stub,
            borderRadius: radius,
            background: "rgba(80, 110, 84, 0.10)",
            boxShadow: `inset 0 0 0 ${Math.max(1, 1.5 * u).toFixed(2)}px rgba(80, 110, 84, 0.5)`,
            opacity: stubA,
            display: "flex",
            alignItems: "center",
            paddingLeft: pad + stub * 0.72 + 16 * u,
            paddingRight: pad,
            boxSizing: "border-box",
          }}
        >
          <span style={labelStyle(labelSize, DAY.ink2)}>{label}</span>
          <span style={{ ...labelStyle(tagSize, DAY.sage), marginLeft: "auto", fontWeight: 620 }}>sealed</span>
        </div>
      )}
      {sealA > 0 && (
        <div style={{ position: "absolute", left: pad + (stub * 0.72 - sealSize) / 2, top: h / 2 - sealSize / 2, width: sealSize, height: sealSize, transform: `scale(${stampScale.toFixed(4)})`, opacity: sealA }}>
          <SealGlyph size={sealSize} color={DAY.sage} />
        </div>
      )}
      {ring > 0 && <div style={{ position: "absolute", inset: -7 * u, borderRadius: radius + 7 * u, boxShadow: `0 0 0 ${(4 * u).toFixed(2)}px ${DAY.sage}`, opacity: ring }} />}
    </div>
  );
};

/** The seal: a scalloped disc with a ring pressed into it, flat sage (a stamp, never a glow). */
const SealGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const n = 12;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? 50 : 44;
    pts.push(`${(50 + rr * Math.cos(ang)).toFixed(2)},${(50 + rr * Math.sin(ang)).toFixed(2)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }} aria-hidden>
      <polygon points={pts.join(" ")} fill={color} />
      <circle cx={50} cy={50} r={25} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={7} />
    </svg>
  );
};
