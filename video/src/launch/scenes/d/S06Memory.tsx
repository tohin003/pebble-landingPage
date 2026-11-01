// S06 Memory (7 s): "It remembers what matters." (EDIT_PLAN "S06").
//
// Six translucent stone slabs stack in 3D on six beats, each labelled with its layer (a diagram: drawn shapes, never
// Pebble's interface). The Semantic slab (facts and knowledge) lifts and carries the seam: the real Settings › Memory
// capture (Pebble 2.0.1's own frontend, sample data) grows out of it onto the Daylight ground, on its own Facts &
// knowledge layer: a record's trash, Keep and Forget, Forget, the record gone. "All visible. Forget anything."
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
import { PLACE_SFX, SFX, clamp01, lerp, useRetime, useT } from "./common";
import { MEMORY_CAPTURE as MC } from "./memoryCapture";

export const S06_NOMINAL = 7;

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
  /** the slabs land on these beats (contact frames) */
  slabs: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
  lift: 3.8,
  capture: 4.0,
  line: 4.35,
} as const;
const FALL = 0.36;
const MORPH = 0.75;

/** the capture's time map, local to its start: 2× through to the trash, then real time, then the last frame held */
const captureTime = timeMap(
  [
    [0, MC.t.records],
    [0.9, MC.t.trash],
    [1.35, MC.t.trash + 0.45],
    [2.75, MC.t.after + 0.15],
  ],
  { tail: 0 },
);
const TRASH_OUT = captureTime.inv(MC.t.trash);
const FORGET_OUT = captureTime.inv(MC.t.forget);

export const S06_MARKS = [
  ...S06_BEATS.slabs.map((s, i) => ({ name: `slab ${i + 1} lands (${LAYERS[i].name})`, s })),
  { name: "the Semantic slab lifts", s: S06_BEATS.lift },
  { name: "the capture grows out of it", s: S06_BEATS.capture },
  { name: "trash clicked (Keep / Forget)", s: S06_BEATS.capture + TRASH_OUT },
  { name: "Forget clicked", s: S06_BEATS.capture + FORGET_OUT },
] as const;

export const s06Sfx = (k = 1): SfxCue[] => [
  ...S06_BEATS.slabs.map((s, i) => ({ src: SFX.thud, at: s * k + 1 / 60, db: i === 5 ? -13 : -16 })),
  { src: SFX.whoosh, at: S06_BEATS.capture * k + 0.25, db: -15 },
  { src: SFX.click, at: S06_BEATS.capture * k + TRASH_OUT + 1 / 60, db: -14 },
  { src: SFX.click, at: S06_BEATS.capture * k + FORGET_OUT + 1 / 60, db: -13 },
];

const geometry = (L: Layout) => {
  if (!L.portrait) {
    const a = L.px(290);
    return {
      headline: { x: L.px(128), y: L.px(96), w: L.px(1500), h: L.px(170) } as Rect,
      headlineSize: L.px(104),
      headlineText: "It remembers what matters.",
      slab: { cx: L.px(470), a, b: a * 0.4, d: L.px(20), floor: L.px(915), step: L.px(102) },
      label: { x: L.px(830), name: L.px(56), desc: L.px(28), inline: true },
      text: L.feature.text,
      media: L.feature.media,
    };
  }
  const a = L.px(205);
  return {
    headline: { x: L.px(64), y: L.px(104), w: L.px(952), h: L.px(280) } as Rect,
    headlineSize: L.type.headline * 0.9,
    headlineText: "It remembers\nwhat matters.",
    slab: { cx: L.px(290), a, b: a * 0.4, d: L.px(14), floor: L.px(1120), step: L.px(114) },
    label: { x: L.px(560), name: L.px(44), desc: L.px(26), inline: false },
    text: { x: L.px(64), y: L.px(96), w: L.px(952), h: L.px(300) } as Rect,
    media: L.feature.media,
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
          <Headline text={g.headlineText} at={a(S06_BEATS.headline)} exitAt={liftAt} exit="rise" size={g.headlineSize} align="left" valign={L.portrait ? "top" : "middle"} box={g.headline} fit />
          <Slabs g={g} a={a} lift={lift} gone={prog(t, liftAt, 0.3, EASE.exit)} carryFade={clamp01((t - capAt - 0.1) / 0.25)} />
          <Headline
            text={"All visible.\nForget anything."}
            at={a(S06_BEATS.line)}
            entrance="blur"
            size={L.portrait ? L.type.title * 0.9 : L.type.title * 0.86}
            align="left"
            valign={L.portrait ? "top" : "middle"}
            box={L.portrait ? { ...g.text, y: L.px(110), h: L.px(240) } : g.text}
            lineStagger={0.25}
            fit
          />
          <Sequence from={Math.round(capAt * fps)} layout="none" name="Settings › Memory (v2.0.1 capture)">
            <FloatingWindow rect={media} at={0} enter="scale" offset={offset} scale={winScale} flattenAt={0.25} flattenDur={0.8} shadow={1.1}>
              <ScreenZoom
                src={MC.src}
                srcSize={MC.size}
                srcDuration={MC.duration}
                time={captureTime}
                keys={[
                  // the six layers and the records: the slabs' names in the product's own words
                  { t: 0, box: { x: MC.box.layers.x - 60, y: MC.box.layers.y - 70, w: MC.box.layers.w + 120, h: 1000 } },
                  { t: 1.0, box: { x: MC.box.layers.x - 60, y: MC.box.layers.y - 70, w: MC.box.layers.w + 120, h: 1000 } },
                  // one push onto the record, its Keep and Forget (arrives before the Forget click)
                  { t: 1.6, box: { x: MC.box.record.x - 50, y: 925, w: MC.box.record.w + 100, h: 1030 }, dur: 0.6 },
                ]}
                drift={0.01}
                overlay={(toView, scale, tt) => (
                  <>
                    <ClickRing at={TRASH_OUT} t={tt} p={toView({ x: MC.box.record.x + MC.box.record.w - 37, y: MC.box.confirm.y + MC.box.confirm.h / 2 })} r={22 * scale} />
                    <ClickRing at={FORGET_OUT} t={tt} p={toView({ x: MC.box.forget.x + MC.box.forget.w / 2, y: MC.box.forget.y + MC.box.forget.h / 2 })} r={30 * scale} />
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
    // falls in with gravity, lands on the beat, a 2 % settle (no bounce: UI rule)
    const fall = p < 1 ? -(1 - p * p) * L.px(110) : 0;
    const settle = p >= 1 ? Math.exp(-(t - land) / 0.08) * L.px(3) : 0;
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
            <stop offset="0" stopColor="#FCFAF4" stopOpacity="0.9" />
            <stop offset="1" stopColor="#DFD8CA" stopOpacity="0.78" />
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
              <ellipse cx={cx} cy={cy + hb * 0.55 + d} rx={ha * 0.82} ry={hb * 0.5} fill="rgba(74, 62, 44, 0.07)" />
              <polygon points={leftFace} fill={hi > 0 ? `rgba(${sage}, ${0.25 + 0.3 * hi})` : "rgba(170, 160, 138, 0.72)"} />
              <polygon points={rightFace} fill={hi > 0 ? `rgba(${sage}, ${0.35 + 0.3 * hi})` : "rgba(140, 130, 110, 0.78)"} />
              <polygon points={top} fill="url(#d-slab-top)" stroke={hi > 0 ? `rgba(${sage}, ${0.4 + 0.5 * hi})` : "rgba(96, 86, 68, 0.55)"} strokeWidth={L.px(1.5)} />
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
            <div style={{ position: "absolute", left: lineFrom, top: cy, width: (lx - L.px(16) - lineFrom) * EASE.enter(labelP), height: Math.max(1, L.px(1.5)), background: W.line }} />
            <div
              style={{
                position: "absolute",
                left: lx,
                top: cy,
                transform: `translateY(-${g.label.inline ? 52 : 50}%)`,
                display: "flex",
                flexDirection: g.label.inline ? "row" : "column",
                alignItems: g.label.inline ? "baseline" : "flex-start",
                gap: g.label.inline ? L.px(22) : L.px(4),
                whiteSpace: "nowrap",
                opacity: labelP,
                filter: labelP < 1 ? `blur(${((1 - labelP) * 6 * L.u).toFixed(2)}px)` : undefined,
              }}
            >
              <span style={{ fontFamily: TYPE.headline.fontFamily, fontVariationSettings: TYPE.headline.fontVariationSettings, fontWeight: 650, letterSpacing: "-0.025em", fontSize: g.label.name, lineHeight: 1.05, color: W.ink }}>
                {layer.name}
              </span>
              <span style={{ fontFamily: TYPE.mono.fontFamily, fontWeight: 500, fontSize: g.label.desc, color: W.ink2 }}>{layer.desc}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};
