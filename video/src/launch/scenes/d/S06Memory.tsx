// S06 Memory (8 s): "It remembers what matters." (EDIT_PLAN "S06"; the director's review r2: hero type, a stack that
// fills the frame, the capture zoomed until its records and Forget are big).
//
// The headline lands at hero size in the middle of the frame, then settles to the top as six translucent stone slabs
// stack in 3D on six beats, each labelled with its layer (a diagram: drawn shapes, never Pebble's interface); the view
// eases back as the stack grows. The Semantic slab (facts and knowledge) lifts and carries the seam: the real Settings ›
// Memory capture (Pebble 2.0.1's own frontend, sample data) grows out of it on its own Facts & knowledge layer. The
// trash on a record, then the camera pushes onto Keep and Forget, Forget, the record gone, and back out to the layer
// whose count now reads 2. "All visible." / "Forget anything."
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
import { prog, tween } from "../../timing";
import { EASE, TYPE } from "../../tokens";
import { useWorld } from "../../world";
import type { SceneProps } from "../types";
import { PLACE_SFX, SFX, Settle, clamp01, lerp, peakAt, useRetime, useT } from "./common";
import { MEMORY_CAPTURE as MC } from "./memoryCapture";

export const S06_NOMINAL = 8;

/** Bottom first. Pebble's six memory layers (memory KINDS at v2.0.1), with plain descriptions. */
export const LAYERS = [
  { name: "Profile", desc: "your preferences" },
  { name: "Semantic", desc: "facts and knowledge" },
  { name: "Procedural", desc: "how things are done here" },
  { name: "Episodic", desc: "past tasks" },
  { name: "Temporal", desc: "things that expire" },
  { name: "Working", desc: "the current task" },
] as const;
/** the slab that becomes the capture (the capture opens on Facts & knowledge) */
const CARRY = 1;

export const S06_BEATS = {
  headline: 0.05,
  /** the headline leaves the middle for the top as the stack starts */
  settle: 0.8,
  /** the slabs land on these beats (contact frames) */
  slabs: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
  lift: 3.8,
  capture: 4.0,
  line: 4.4,
} as const;
const FALL = 0.36;
const MORPH = 0.75;

/** The capture's moments in clip px (CSS px × 2.5; .work/launch/ui/meta/launch-memory-dark.timeline.json). */
const c = (v: number) => v * 2.5;
/** the six layers with their counts and the top of the Facts & knowledge records (trash buttons inside) */
const VIEW_LAYER = { x: c(536), y: c(162), w: c(568), h: c(438) };
/** the second record, Keep and Forget, with the records above and below it */
const VIEW_FORGET = { x: c(534), y: c(455), w: c(424), h: c(295) };
const TRASH_AT = { x: c(1075), y: c(567) };
const FORGET_AT = { x: MC.box.forget.x + MC.box.forget.w / 2, y: MC.box.forget.y + MC.box.forget.h / 2 };

/** the capture's time map, local to its start: 1.3× through to the trash, then real time, the last frame held */
const captureTime = timeMap(
  [
    [0, MC.t.records],
    [0.85, MC.t.trash],
    [0.85 + (MC.duration - MC.t.trash), MC.duration],
  ],
  { tail: 0 },
);
const TRASH_OUT = captureTime.inv(MC.t.trash);
const FORGET_OUT = captureTime.inv(MC.t.forget);
const GONE_OUT = captureTime.inv(MC.t.after);
/** the camera inside the capture (output seconds from the capture's start) */
const CAM = { pushArrive: 1.6, pullStart: 2.7, pullArrive: 3.4 } as const;

export const S06_MARKS = [
  { name: "headline lands (hero)", s: S06_BEATS.headline + 0.5 },
  ...S06_BEATS.slabs.map((s, i) => ({ name: `slab ${i + 1} lands (${LAYERS[i].name})`, s })),
  { name: "the Semantic slab lifts", s: S06_BEATS.lift },
  { name: "the capture grows out of it", s: S06_BEATS.capture },
  { name: "trash clicked (Keep / Forget)", s: S06_BEATS.capture + TRASH_OUT },
  { name: "Forget clicked; \"Forget anything.\"", s: S06_BEATS.capture + FORGET_OUT },
  { name: "the record is gone (Facts & knowledge 3 → 2)", s: S06_BEATS.capture + GONE_OUT },
] as const;

export const s06Sfx = (k = 1): SfxCue[] => [
  ...S06_BEATS.slabs.map((s, i) => peakAt(SFX.thud, s * k, i === 5 ? -20 : -24)),
  peakAt(SFX.whoosh, (S06_BEATS.capture + MORPH * 0.5) * k, -17),
  peakAt(SFX.click, S06_BEATS.capture * k + TRASH_OUT, -15),
  peakAt(SFX.click2, S06_BEATS.capture * k + FORGET_OUT, -13),
];

const geometry = (L: Layout) => {
  if (!L.portrait) {
    const a = L.px(300);
    return {
      // hero in the middle, then settled to the top at 110 px
      headline: { x: L.px(128), y: L.px(440), w: L.px(1700), h: L.px(200) } as Rect,
      headlineSize: L.px(124),
      headlineText: "It remembers what matters.",
      heroAnchor: { x: L.px(128), y: L.px(540) },
      topAnchor: { x: L.px(128), y: L.px(128) },
      topScale: 110 / 124,
      slab: { cx: L.px(128) + a, a, b: a * 0.4, d: L.px(26), floor: L.px(854), step: L.px(85) },
      label: { x: L.px(800), name: L.px(60), desc: L.px(36), inline: true },
      view: { scale: 1.08, origin: { x: L.px(900), y: L.px(1000) } },
      media: { x: L.px(648), y: L.px(80), w: L.px(1176), h: L.px(920) } as Rect,
      line1: { x: L.px(112), y: L.px(250), w: L.px(500), h: L.px(160) } as Rect,
      line2: { x: L.px(112), y: L.px(430), w: L.px(500), h: L.px(170) } as Rect,
      line1Text: "All visible.",
      line2Text: "Forget\nanything.",
      lineSize: L.px(72),
    };
  }
  const a = L.px(210);
  return {
    headline: { x: L.px(64), y: L.px(520), w: L.px(952), h: L.px(300) } as Rect,
    headlineSize: L.px(100),
    headlineText: "It remembers\nwhat matters.",
    heroAnchor: { x: L.px(64), y: L.px(670) },
    topAnchor: { x: L.px(64), y: L.px(196) },
    topScale: 0.92,
    slab: { cx: L.px(64) + a, a, b: a * 0.4, d: L.px(20), floor: L.px(1136), step: L.px(134) },
    label: { x: L.px(530), name: L.px(50), desc: L.px(31), inline: false },
    view: { scale: 1.08, origin: { x: L.px(540), y: L.px(1240) } },
    media: { x: L.px(40), y: L.px(400), w: L.px(1000), h: L.px(880) } as Rect,
    line1: { x: L.px(64), y: L.px(110), w: L.px(952), h: L.px(100) } as Rect,
    line2: { x: L.px(64), y: L.px(212), w: L.px(952), h: L.px(100) } as Rect,
    line1Text: "All visible.",
    line2Text: "Forget anything.",
    lineSize: L.px(72),
  };
};

export const S06Memory: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const t = useT();
  const { fps } = useVideoConfig();
  const { at: a, k } = useRetime(S06_NOMINAL, durationInFrames);
  const g = geometry(L);
  const capAt = a(S06_BEATS.capture);
  const liftAt = a(S06_BEATS.lift);

  // the view eases back as the stack grows (the first slabs land big)
  const vs = lerp(g.view.scale, 1, prog(t, a(S06_BEATS.slabs[0]) - 0.2, a(S06_BEATS.slabs[5]) - a(S06_BEATS.slabs[0]) + 0.4, EASE.camera));

  // the carried slab's centre on screen (the capture starts there)
  const carryCy = g.slab.floor - CARRY * g.slab.step;
  const lift = tween(t, [liftAt, liftAt + 0.3], [0, 1], EASE.enter);
  const morph = prog(t, capAt, MORPH, EASE.camera);
  const media = g.media;
  const mc = centreOf(media);
  const from = { x: g.slab.cx, y: carryCy - g.slab.d - L.px(34) * lift };
  const offset = { x: (from.x - mc.x) * (1 - morph), y: (from.y - mc.y) * (1 - morph) };
  const winScale = lerp((g.slab.a * 2) / media.w, 1, morph);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage world="daylight" keyLight={L.portrait ? { x: 0.35, y: 0.3, r: 0.95 } : { x: 0.3, y: 0.1, r: 0.95 }}>
          <Settle from={g.heroAnchor} to={g.topAnchor} scale={g.topScale} at={a(S06_BEATS.settle)} dur={0.7}>
            <Headline text={g.headlineText} at={a(S06_BEATS.headline)} exitAt={liftAt} exit="rise" size={g.headlineSize} align="left" valign="middle" box={g.headline} fit />
          </Settle>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${vs.toFixed(5)})`, transformOrigin: `${g.view.origin.x}px ${g.view.origin.y}px` }}>
            <Slabs g={g} a={a} lift={lift} gone={prog(t, liftAt, 0.3, EASE.exit)} carryFade={clamp01((t - capAt - 0.1) / 0.25)} />
          </div>
          <Headline text={g.line1Text} at={a(S06_BEATS.line)} entrance="blur" size={g.lineSize} align="left" valign="bottom" box={g.line1} fit={false} />
          <Headline text={g.line2Text} at={capAt + FORGET_OUT - 0.04} entrance="rise" size={g.lineSize} align="left" valign="top" box={g.line2} fit={false} />
          <Sequence from={Math.round(capAt * fps)} layout="none" name="Settings › Memory (v2.0.1 capture)">
            <FloatingWindow rect={media} at={0} enter="scale" offset={offset} scale={winScale} flattenAt={0.25} flattenDur={0.7} shadow={1.1}>
              <ScreenZoom
                src={MC.src}
                srcSize={MC.size}
                srcDuration={MC.duration}
                time={captureTime}
                keys={[
                  // the six layers with their counts and the records (the slabs' names in the product's own words)
                  { t: 0, box: VIEW_LAYER },
                  { t: TRASH_OUT + 0.15, box: VIEW_LAYER },
                  // one push onto the record, Keep and Forget (arrives before the Forget click)
                  { t: CAM.pushArrive, box: VIEW_FORGET, dur: 0.6 },
                  { t: CAM.pullStart, box: VIEW_FORGET },
                  // back out: the record is gone and Facts & knowledge reads 2
                  { t: CAM.pullArrive, box: VIEW_LAYER, dur: 0.7 },
                ]}
                drift={0.012}
                overlay={(toView, scale, tt) => (
                  <>
                    <ClickRing at={TRASH_OUT} t={tt} p={toView(TRASH_AT)} r={24 * scale} />
                    <ClickRing at={FORGET_OUT} t={tt} p={toView(FORGET_AT)} r={34 * scale} />
                  </>
                )}
              />
            </FloatingWindow>
          </Sequence>
          {PLACE_SFX ? <SfxTrack cues={s06Sfx(k)} /> : null}
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};

/** A soft ring where the person clicked (the pointer itself is not in the capture). */
const ClickRing: React.FC<{ at: number; t: number; p: { x: number; y: number }; r: number }> = ({ at, t, p, r }) => {
  const d = t - at;
  if (d < -0.02 || d > 0.55) return null;
  const q = clamp01(d / 0.5);
  const rr = r * (0.6 + 1.2 * EASE.enter(q));
  return (
    <div
      style={{
        position: "absolute",
        left: p.x - rr,
        top: p.y - rr,
        width: rr * 2,
        height: rr * 2,
        borderRadius: "50%",
        border: `${Math.max(2, r * 0.12).toFixed(2)}px solid rgba(166, 199, 149, ${(0.9 * (1 - q)).toFixed(3)})`,
        background: `rgba(166, 199, 149, ${(0.18 * (1 - q)).toFixed(3)})`,
      }}
    />
  );
};

type Geo = ReturnType<typeof geometry>;

/** The six slabs and their labels. */
const Slabs: React.FC<{ g: Geo; a: (s: number) => number; lift: number; gone: number; carryFade: number }> = ({ g, a, lift, gone, carryFade }) => {
  const t = useT();
  const W = useWorld();
  const L = useLayout();
  const { cx, a: ha, b: hb, d } = g.slab;
  const items = LAYERS.map((layer, i) => {
    const land = a(S06_BEATS.slabs[i]);
    const p = clamp01((t - (land - FALL)) / FALL);
    // falls in with gravity, lands on the beat, a small settle (no bounce: UI rule)
    const fall = p < 1 ? -(1 - p * p) * L.px(140) : 0;
    const settle = p >= 1 ? Math.exp(-(t - land) / 0.08) * L.px(4) : 0;
    const carry = i === CARRY;
    const restY = g.slab.floor - i * g.slab.step;
    const cy = restY + fall + settle + (carry ? -L.px(34) * lift : gone * L.px(40));
    const op = p <= 0 ? 0 : Math.min(1, p * 1.6) * (carry ? 1 - carryFade : 1 - gone);
    const hi = carry ? lift : 0;
    const labelP = clamp01((t - land) / 0.25);
    return { layer, i, cy, op, hi, labelP, carry };
  });
  return (
    <>
      <svg width={L.W} height={L.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} aria-hidden>
        <defs>
          <linearGradient id="d-slab-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FCFAF4" stopOpacity="0.92" />
            <stop offset="1" stopColor="#DCD4C4" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        {items.map(({ i, cy, op, hi }) => {
          if (op <= 0) return null;
          const top = `${cx - ha},${cy} ${cx},${cy - hb} ${cx + ha},${cy} ${cx},${cy + hb}`;
          const leftFace = `${cx - ha},${cy} ${cx},${cy + hb} ${cx},${cy + hb + d} ${cx - ha},${cy + d}`;
          const rightFace = `${cx},${cy + hb} ${cx + ha},${cy} ${cx + ha},${cy + d} ${cx},${cy + hb + d}`;
          const sage = "80, 110, 84";
          return (
            <g key={i} opacity={op}>
              {/* a soft shadow on the slab below */}
              <ellipse cx={cx} cy={cy + hb * 0.55 + d} rx={ha * 0.82} ry={hb * 0.5} fill="rgba(74, 62, 44, 0.08)" />
              <polygon points={leftFace} fill={hi > 0 ? `rgba(${sage}, ${0.25 + 0.3 * hi})` : "rgba(170, 160, 138, 0.74)"} />
              <polygon points={rightFace} fill={hi > 0 ? `rgba(${sage}, ${0.35 + 0.3 * hi})` : "rgba(140, 130, 110, 0.8)"} />
              <polygon points={top} fill="url(#d-slab-top)" stroke={hi > 0 ? `rgba(${sage}, ${0.4 + 0.5 * hi})` : "rgba(96, 86, 68, 0.55)"} strokeWidth={L.px(2)} />
              {hi > 0 && <polygon points={top} fill={`rgba(${sage}, ${0.16 * hi})`} />}
            </g>
          );
        })}
      </svg>
      {items.map(({ layer, i, cy, op, labelP }) => {
        if (op <= 0 || labelP <= 0) return null;
        const lx = g.label.x;
        const lineFrom = cx + ha + L.px(14);
        return (
          <div key={`l${i}`} style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
            {/* the leader from the slab's corner to its label */}
            <div style={{ position: "absolute", left: lineFrom, top: cy, width: Math.max(0, lx - L.px(18) - lineFrom) * EASE.enter(labelP), height: Math.max(1, L.px(2)), background: W.line }} />
            <div
              style={{
                position: "absolute",
                left: lx,
                top: cy,
                transform: `translateY(-${g.label.inline ? 56 : 50}%)`,
                display: "flex",
                flexDirection: g.label.inline ? "row" : "column",
                alignItems: g.label.inline ? "baseline" : "flex-start",
                gap: g.label.inline ? L.px(26) : L.px(2),
                whiteSpace: "nowrap",
                opacity: labelP,
                filter: labelP < 1 ? `blur(${((1 - labelP) * 6 * L.u).toFixed(2)}px)` : undefined,
              }}
            >
              <span style={{ fontFamily: TYPE.headline.fontFamily, fontVariationSettings: TYPE.headline.fontVariationSettings, fontWeight: 650, letterSpacing: "-0.025em", fontSize: g.label.name, lineHeight: 1.05, color: W.ink }}>
                {layer.name}
              </span>
              <span style={{ fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontSize: g.label.desc, lineHeight: 1.15, color: W.ink2 }}>{layer.desc}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};
