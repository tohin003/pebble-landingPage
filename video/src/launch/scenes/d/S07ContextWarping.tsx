// S07 Context warping (7 s): the owner's name for Pebble's sealed long-task context (EDIT_PLAN "S07"; CLAUDE.md
// Pebble 1.4.0+). v2.0.1's frontend has no view of sealed context (UI_CAPTURE.md §8), so this is a DIAGRAM and reads as
// one: generic blocks with plain labels and grey lines for text, never Pebble's interface.
//
// The title lands at hero size, then settles to the corner. A long task's context grows upward, one tool result at a time, past the budget line. Then a glass lens travels up
// the oldest results and each one it passes warps: its sides pinch into an hourglass, it squashes, the glass brightens
// at the squeeze, and it settles into a thin sealed stub (a seal and its label), while the newest stay full and the
// column falls back under the line. Then one stub opens back into its full block: the same block, unchanged. No saving
// is claimed.
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
import { PLACE_SFX, SFX, Settle, clamp01, lerp, peakAt, useRetime, useT } from "./common";

export const S07_NOMINAL = 7;

/** Oldest first: block 0 sits at the bottom of the column. Generic diagram labels, no real data. */
const BLOCKS = [
  { label: "read invoice.py", lines: [0.92, 0.74, 0.58] },
  { label: "read dates.py", lines: [0.8, 0.95, 0.42] },
  { label: "searched the web", lines: [0.88, 0.66, 0.78] },
  { label: "edited invoice.py", lines: [0.94, 0.62, 0.8] },
  { label: "ran the tests", lines: [0.76, 0.86, 0.36] },
  { label: "read the test log", lines: [0.9, 0.7, 0.6] },
] as const;
/** how many of the oldest are sealed */
const SEALED = 3;
/** the stub that opens again */
const REOPEN = 1;

export const S07_BEATS = {
  title: 0.05,
  /** the title leaves the middle for the corner */
  settle: 0.7,
  firstBlock: 0.8,
  blockStep: 0.2,
  line1: 1.5,
  warp: 2.3,
  warpStagger: 0.24,
  line2: 4.1,
  reopen: 4.5,
} as const;
const WARP_DUR = 0.9;
const REOPEN_DUR = 0.62;

export const S07_MARKS = [
  { name: "title lands (hero)", s: S07_BEATS.title + 0.3 },
  { name: "title settles to the corner", s: S07_BEATS.settle + 0.6 },
  { name: "context crosses the budget line", s: S07_BEATS.firstBlock + 5 * S07_BEATS.blockStep + 0.3 },
  { name: "the warp (the lens reaches the oldest block)", s: S07_BEATS.warp + WARP_DUR / 2 },
  { name: "the column fits again", s: S07_BEATS.warp + (SEALED - 1) * S07_BEATS.warpStagger + WARP_DUR },
  { name: "\"Older results sealed. Any one returned exactly.\"", s: S07_BEATS.line2 },
  { name: "one stub opens, unchanged", s: S07_BEATS.reopen },
] as const;

export const s07Sfx = (k = 1): SfxCue[] => {
  const out: SfxCue[] = [];
  // a soft tick as each block lands on the column (the entrance is 0.42 s; it reads as landed at about 0.18 s)
  BLOCKS.forEach((_, i) => out.push(peakAt(i % 2 ? SFX.tick : SFX.click2, (S07_BEATS.firstBlock + i * S07_BEATS.blockStep) * k + 0.18, -21)));
  // the warp: a short whoosh under the lens's travel, a click as each seal lands
  out.push(peakAt(SFX.whoosh, S07_BEATS.warp * k + WARP_DUR / 2, -16));
  for (let i = 0; i < SEALED; i++) out.push(peakAt(SFX.click, S07_BEATS.warp * k + i * S07_BEATS.warpStagger + WARP_DUR * 0.85, -16));
  // the stub opens: the shimmer as the block is whole again
  out.push(peakAt(SFX.shimmer, S07_BEATS.reopen * k + REOPEN_DUR, -16));
  return out;
};

const geometry = (L: Layout) => {
  if (!L.portrait) {
    return {
      // hero in the middle, then a corner label at 64 px
      title: { x: L.px(128), y: L.px(420), w: L.px(1664), h: L.px(240) },
      titleSize: L.px(160),
      heroAnchor: { x: L.px(128), y: L.px(540) },
      cornerAnchor: { x: L.px(112), y: L.px(104) },
      cornerScale: 64 / 160,
      lines: { x: L.px(112), y: L.px(420), w: L.px(620), h: L.px(420) },
      lineSize: L.px(68),
      col: { x: L.px(824), w: L.px(940), floor: L.px(1030) },
      block: { full: L.px(128), stub: L.px(54), gap: L.px(14) },
      budget: L.px(716),
      label: L.px(40),
      stubLabel: L.px(34),
      budgetLabel: L.px(34),
      budgetText: "context budget",
      push: 1.06,
    };
  }
  return {
    title: { x: L.px(64), y: L.px(560), w: L.px(952), h: L.px(220) },
    titleSize: L.px(116),
    heroAnchor: { x: L.px(64), y: L.px(670) },
    cornerAnchor: { x: L.px(64), y: L.px(100) },
    cornerScale: 60 / 116,
    lines: { x: L.px(64), y: L.px(158), w: L.px(952), h: L.px(140) },
    lineSize: L.px(52),
    col: { x: L.px(262), w: L.px(754), floor: L.px(1300) },
    block: { full: L.px(146), stub: L.px(60), gap: L.px(14) },
    budget: L.px(800),
    label: L.px(36),
    stubLabel: L.px(32),
    budgetLabel: L.px(30),
    budgetText: "context\nbudget",
    push: 1.04,
  };
};

const warpStart = (i: number, a: (s: number) => number) => a(S07_BEATS.warp) + i * S07_BEATS.warpStagger;

/** 0 = a full block, 1 = a sealed stub. */
const warpOf = (t: number, i: number, a: (s: number) => number): number => {
  if (i >= SEALED) return 0;
  const w = prog(t, warpStart(i, a), WARP_DUR, EASE.camera);
  if (i !== REOPEN) return w;
  return w * (1 - prog(t, a(S07_BEATS.reopen), REOPEN_DUR, EASE.camera));
};

export const S07ContextWarping: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { at: a, k } = useRetime(S07_NOMINAL, durationInFrames);
  const g = geometry(L);
  const u = L.u;

  // each block: how far it has entered (0..1) and how far it has warped (0..1)
  const enters = BLOCKS.map((_, i) => prog(t, a(S07_BEATS.firstBlock) + i * S07_BEATS.blockStep, 0.42, EASE.enter));
  const warps = BLOCKS.map((_, i) => warpOf(t, i, a));
  const heights = BLOCKS.map((_, i) => lerp(g.block.full, g.block.stub, warps[i]) * enters[i]);
  const gaps = BLOCKS.map((_, i) => g.block.gap * enters[i]);
  let y = g.col.floor;
  const bottoms = heights.map((h, i) => {
    const b = y;
    y -= h + gaps[i];
    return b;
  });
  const top = y + g.block.gap;
  const budgetY = g.col.floor - g.budget;
  const over = clamp01((budgetY - top) / L.px(40));

  // the lens: its centre follows the block it is squeezing (each block's squeeze peaks halfway through its warp)
  const peaks = Array.from({ length: SEALED }, (_, i) => warpStart(i, a) + WARP_DUR * 0.5);
  const centreOfBlock = (i: number) => bottoms[i] - heights[i] / 2;
  let lensY = centreOfBlock(0);
  if (t >= peaks[SEALED - 1]) lensY = centreOfBlock(SEALED - 1) - L.px(40) * clamp01((t - peaks[SEALED - 1]) / 0.4);
  else
    for (let i = 0; i < SEALED - 1; i++) {
      if (t >= peaks[i] && t < peaks[i + 1]) {
        const f = EASE.move((t - peaks[i]) / (peaks[i + 1] - peaks[i]));
        lensY = lerp(centreOfBlock(i), centreOfBlock(i + 1), f);
      }
    }
  if (t < peaks[0]) lensY = centreOfBlock(0) + L.px(60) * (1 - clamp01((t - (peaks[0] - 0.45)) / 0.45));
  const lensA = Math.min(clamp01((t - (peaks[0] - 0.45)) / 0.3), 1 - clamp01((t - (peaks[SEALED - 1] + 0.15)) / 0.35));

  // the camera: a push toward the warp while it happens, then back for the reopen
  const push = tween(t, [a(S07_BEATS.warp) - 0.3, a(S07_BEATS.warp) + 0.5, a(S07_BEATS.reopen) - 0.2, a(S07_BEATS.reopen) + 0.4], [1, g.push, g.push, 1 + (g.push - 1) / 4], EASE.camera);
  const drift = 1 + 0.004 * t;
  const focusY = g.col.floor - L.px(250);

  const left = g.col.x;
  const colCx = g.col.x + g.col.w / 2;
  const reopenP = prog(t, a(S07_BEATS.reopen), REOPEN_DUR, EASE.camera);
  const reopened = t >= a(S07_BEATS.reopen);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight" keyLight={L.portrait ? { x: 0.5, y: 0.25, r: 0.95 } : { x: 0.62, y: 0.12, r: 0.95 }}>
          <Settle from={g.heroAnchor} to={g.cornerAnchor} scale={g.cornerScale} at={a(S07_BEATS.settle)} dur={0.65}>
            <Headline text="Context warping." at={a(S07_BEATS.title)} entrance="blur" size={g.titleSize} align="left" valign="middle" box={g.title} fit />
          </Settle>
          <Headline
            text="Long tasks keep a smaller window."
            at={a(S07_BEATS.line1)}
            exitAt={a(S07_BEATS.line2) - 0.25}
            exit="rise"
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
            entrance="ink"
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${(push * drift).toFixed(5)})`,
              transformOrigin: `${colCx.toFixed(1)}px ${focusY.toFixed(1)}px`,
            }}
          >
            {/* the budget sits behind the column: the blocks that cross it read as over it */}
            <BudgetLine x={left - L.px(44)} w={g.col.w + L.px(88)} y={budgetY} over={over} at={a(S07_BEATS.firstBlock)} size={g.budgetLabel} text={g.budgetText} />
            {BLOCKS.map((b, i) =>
              enters[i] <= 0 ? null : (
                <WarpBlock
                  key={i}
                  label={b.label}
                  lines={b.lines}
                  x={left}
                  w={g.col.w}
                  bottom={bottoms[i]}
                  full={g.block.full}
                  stub={g.block.stub}
                  enter={enters[i]}
                  warp={warps[i]}
                  labelSize={g.label}
                  stubLabel={g.stubLabel}
                  overTint={over * (bottoms[i] - heights[i] < budgetY - L.px(4) ? 1 : 0)}
                  ring={i === REOPEN && reopened ? reopenP : 0}
                  u={u}
                />
              ),
            )}
            {/* the line over the blocks: a diagram's mark, so the overflow reads */}
            {lensA > 0 && <Lens cx={colCx} y={lensY} w={g.col.w + L.px(60)} h={g.block.full * 1.5} opacity={lensA} u={u} />}
          </div>
          {PLACE_SFX ? <SfxTrack cues={s07Sfx(k)} /> : null}
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};

/**
 * The lens, seen edge-on: a flat glass ellipse that travels up the old results. Bright at its centre, a sage-tinted rim,
 * a little refracted shadow under it.
 */
const Lens: React.FC<{ cx: number; y: number; w: number; h: number; opacity: number; u: number }> = ({ cx, y, w, h, opacity, u }) => (
  <div style={{ position: "absolute", left: cx - w / 2, top: y - h / 2, width: w, height: h, opacity, pointerEvents: "none" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(255,255,255,0.62), rgba(255,255,255,0.3) 60%, rgba(166,199,149,0.16) 92%, rgba(236,232,223,0) 100%)",
        boxShadow: `inset 0 ${(2 * u).toFixed(1)}px 0 rgba(255,255,255,0.9), inset 0 -${(2 * u).toFixed(1)}px 0 rgba(80,110,84,0.35), 0 ${(10 * u).toFixed(1)}px ${(24 * u).toFixed(1)}px rgba(74,62,44,0.10)`,
        border: `${Math.max(1.5, 2.5 * u).toFixed(2)}px solid rgba(80,110,84,0.5)`,
        backdropFilter: `blur(${(2.5 * u).toFixed(1)}px)`,
      }}
    />
  </div>
);

/** The budget: a dashed hairline across the column; its label sits outside the column's left edge. It warms to clay
 * while the column is over it. */
const BudgetLine: React.FC<{ x: number; w: number; y: number; over: number; at: number; size: number; text: string }> = ({ x, w, y, over, at, size, text }) => {
  const t = useT();
  const p = prog(t, at - 0.1, 0.5, EASE.enter);
  if (p <= 0) return null;
  const ink = mix(DAY.small, "#B5582F", over);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w * p,
          height: 0,
          borderTop: `${Math.max(2, size * 0.1).toFixed(2)}px dashed ${ink}`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - size * 0.4,
          top: y,
          transform: "translate(-100%, -50%)",
          fontFamily: TYPE.mono.fontFamily,
          fontWeight: 500,
          fontSize: size,
          lineHeight: 1.1,
          textAlign: "right",
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

/**
 * One tool result. Full: a card with its label and grey lines for its text. Warping: the card squashed to the current
 * height inside an hourglass silhouette (the lens's pinch), its content narrowing with the waist, the glass brightening
 * and softening at the squeeze. Sealed: a thin stub with a seal and the label.
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
  labelSize: number;
  stubLabel: number;
  ring: number;
  u: number;
  /** 0..1: the block reaches over the budget line (a clay edge) */
  overTint: number;
}> = ({ label, lines, x, w, bottom, full, stub, enter, warp, labelSize, stubLabel, ring, u: uFrame, overTint }) => {
  // the card's own unit: its inner layout scales with its height (104 px at u = 1 in the first round)
  const u = full / 104;
  const radius = 16 * u;
  const lens = Math.sin(Math.PI * warp); // 0 at rest, 1 mid-warp
  const h = lerp(full, stub, warp);
  const top = bottom - h * enter;
  const content = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        background: overTint > 0 ? `rgba(${Math.round(255 - 8 * overTint)}, ${Math.round(253 - 18 * overTint)}, ${Math.round(249 - 24 * overTint)}, 0.95)` : "rgba(255, 253, 249, 0.94)",
        boxShadow: `inset 0 0 0 ${(Math.max(1, u) * (1 + 1.2 * overTint)).toFixed(2)}px ${overTint > 0 ? `rgba(181, 88, 47, ${(0.3 + 0.45 * overTint).toFixed(3)})` : DAY.line}, 0 ${(6 * u).toFixed(1)}px ${(18 * u).toFixed(1)}px rgba(74, 62, 44, 0.10)`,
      }}
    >
      <div style={{ position: "absolute", left: 22 * u, top: 11 * u, fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontSize: labelSize, color: DAY.ink2, whiteSpace: "nowrap" }}>
        {label}
      </div>
      {lines.map((lw, li) => (
        <div
          key={li}
          style={{ position: "absolute", left: 22 * u, top: (60 + li * 13) * u, width: (w - 44 * u) * lw, height: 6.5 * u, borderRadius: 4 * u, background: DAY.track }}
        />
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  if (warp < 0.995) {
    if (warp <= 0.001) {
      body = <div style={{ position: "absolute", left: 0, top: 0, width: w, height: full }}>{content}</div>;
    } else {
      const pinch = 0.34 * lens;
      const steps = 24;
      const leftEdge: string[] = [];
      const rightEdge: string[] = [];
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const inX = pinch * Math.pow(Math.sin(Math.PI * f), 1.4) * 50;
        leftEdge.push(`${inX.toFixed(3)}% ${(f * 100).toFixed(3)}%`);
        rightEdge.unshift(`${(100 - inX).toFixed(3)}% ${(f * 100).toFixed(3)}%`);
      }
      const clip = `polygon(${[...leftEdge, ...rightEdge].join(", ")})`;
      body = (
        <div style={{ position: "absolute", inset: 0, clipPath: clip, WebkitClipPath: clip }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: w,
              height: full,
              transform: `scale(${(1 - 0.22 * lens).toFixed(4)}, ${(h / full).toFixed(4)})`,
              transformOrigin: "50% 0",
              filter: undefined,
            }}
          >
            {content}
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${(0.35 * lens).toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
        </div>
      );
    }
  }
  // the card is gone before the stub's label is legible, so the two labels never read doubled
  const bodyA = 1 - clamp01((warp - 0.55) / 0.2);
  const stubA = clamp01((warp - 0.72) / 0.24);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: top - (1 - enter) * 34 * u,
        width: w,
        height: h,
        opacity: enter,
        filter: enter < 1 ? `blur(${((1 - enter) * 6 * u).toFixed(2)}px)` : undefined,
      }}
    >
      {body && <div style={{ position: "absolute", inset: 0, opacity: bodyA }}>{body}</div>}
      {stubA > 0 && <Stub label={label} h={stub} w={w} labelSize={stubLabel} opacity={stubA} u={uFrame} />}
      {ring > 0 && (
        <div style={{ position: "absolute", inset: -7 * uFrame, borderRadius: radius + 7 * uFrame, boxShadow: `0 0 0 ${(4 * uFrame).toFixed(2)}px ${DAY.sage}`, opacity: ring }} />
      )}
    </div>
  );
};

/** A sealed stub: a thin bar, a wax-seal glyph and the result's label. */
const Stub: React.FC<{ label: string; h: number; w: number; labelSize: number; opacity: number; u: number }> = ({ label, h, w, labelSize, opacity, u }) => {
  const seal = h * 0.7;
  // the seal is stamped: it arrives large and lands (a hit, no bounce)
  const stamp = 1 + 0.6 * (1 - EASE.enter(opacity));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: h / 2,
        background: "rgba(80, 110, 84, 0.10)",
        boxShadow: `inset 0 0 0 ${Math.max(1, u)}px rgba(80, 110, 84, 0.45)`,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: 12 * u,
        paddingLeft: (h - seal) / 2 + 4 * u,
      }}
    >
      <div style={{ transform: `scale(${stamp.toFixed(4)})`, display: "flex" }}>
        <SealGlyph size={seal} color={DAY.sage} />
      </div>
      <span style={{ fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontSize: labelSize, color: DAY.ink2, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ marginLeft: "auto", marginRight: h * 0.5, fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontSize: labelSize * 0.8, color: DAY.sage, whiteSpace: "nowrap" }}>sealed</span>
    </div>
  );
};

/** A small wax seal: a scalloped disc with a ring pressed into it. */
const SealGlyph: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const n = 12;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? 50 : 44;
    pts.push(`${(50 + rr * Math.cos(ang)).toFixed(2)},${(50 + rr * Math.sin(ang)).toFixed(2)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flex: "none" }} aria-hidden>
      <polygon points={pts.join(" ")} fill={color} />
      <circle cx={50} cy={50} r={25} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={7} />
    </svg>
  );
};
