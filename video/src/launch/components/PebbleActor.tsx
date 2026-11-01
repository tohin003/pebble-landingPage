// The pebble as the film's protagonist: Pebble's own character engine (shared/pebble, bloub by Jérémy Perret, MIT)
// through PebbleOnFilm, in Pebble's dark-theme colours (sage on the dark stage, never black, never recoloured).
//
//   <PebbleActor x={L.centre.x} y={L.floorY} size={L.px(170)} cues={[sleepy(0), wake(0.6)]} enter={{ at: 0, kind: "pop" }} pool />
//
// - Cues and hops are in LOCAL seconds (the enclosing Sequence's time). Only Pebble's own poses (shared/pebble/README.md):
//   checkCues rejects anything else, on every frame.
// - `lead` runs the engine ahead of local time (default 1 s), so local 0 already shows the settled static frame
//   (engine time 1.0: eyes open, before the first blink at 1.4 s).
// - Entrances, `grow`, `pulses` and the light under it are outer transforms and light only; the engine's frames are
//   never touched. The pebble alone may overshoot and squash (TREATMENT §4).
//
// <VeilPebble>: the Veil (Stealth Lockdown's look) rendered by Pebble's own code (shared/pebble/veil.ts, Avatar.vue's
// layers, the dark theme's tokens). Stealth Lockdown ONLY; it is a render, never called a recording.
import { useId } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BODY,
  VEIL_DARK,
  VIEWBOX,
  VIEWBOX_SIZE,
  blinkStarts,
  pebbleAt,
  snapToBlink,
  veilAt,
  veilDraw,
  type Gaze,
  type PebbleCue,
  type PoseId,
  type VeilSwitch,
} from "../../../../shared/pebble";
import { SPRING } from "../../motion/spec";
import { actingAt, type Hop } from "../../pebble/acting";
import { PEBBLE_DARK, type PebbleColors } from "../../pebble/PebbleSvg";
import { PebbleOnFilm } from "../../pebble/PebbleOnFilm";
import { RGB } from "../tokens";
import { useWorld } from "../world";

/* ---------- cue helpers (local seconds) ---------- */

/** A pose from `at`. */
export const pose = (at: number, p: PoseId, note?: string): PebbleCue => (note ? { at, pose: p, note } : { at, pose: p });
/** The eyes look toward (x, y), each in [−1, 1] (x right, y down). */
export const look = (at: number, x: number, y: number): PebbleCue => ({ at, look: { x, y } satisfies Gaze });
/** The eyes go back to the pose's own gaze. */
export const lookBack = (at: number): PebbleCue => ({ at, look: null });
/** Asleep from `at` (the "sleepy" pose: resting, the slow z). */
export const sleepy = (at: number): PebbleCue => pose(at, "sleepy", "asleep");
/**
 * Wakes at about `at`: idle from the nearest blink's shut point (so the face change hides in a blink), given the
 * actor's `lead` (engine time = local + lead).
 */
export const wake = (at: number, lead = 1): PebbleCue => pose(snapToBlink(at + lead, 0.35, 0.2) - lead, "idle", "wakes");
/** Sorts cue lists into one (stable). */
export const cues = (...lists: (PebbleCue | readonly PebbleCue[])[]): PebbleCue[] =>
  lists
    .flat()
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.at - b.c.at || a.i - b.i)
    .map(({ c }) => c);
/** Blinks (local seconds) between `from` and `to`, for an actor with `lead`: put a face change or a cut on one. */
export const blinksIn = (from: number, to: number, lead = 1): number[] => blinkStarts(from + lead, to + lead).map((b) => b - lead);

/* ---------- the actor ---------- */

export interface ActorEnter {
  at: number;
  /** "pop": a springy scale-up in place; "drop": falls in from above and lands with a squash; "fade" */
  kind: "pop" | "drop" | "fade";
}

export interface PebbleActorProps {
  /** the foot (bottom centre of the body), px */
  x: number;
  y: number;
  /** the viewBox's rendered size, px: the body is about 0.59 × size wide and 0.52 × size tall */
  size: number;
  cues?: readonly PebbleCue[];
  hops?: readonly Hop[];
  initialPose?: PoseId;
  lead?: number;
  enter?: ActorEnter;
  /** exit: a quick shrink (the pebble's pop out) or a fade */
  exit?: { at: number; kind: "pop" | "fade" };
  /** a change of size about the foot */
  grow?: { at: number; to: number; dur: number };
  /** a pool of light on the floor under it (strength 0..1; true = 1) */
  pool?: boolean | number;
  /** a soft light behind the body (0..1) */
  glow?: number;
  /** squash pulses (local seconds): the pebble bobbing on the music */
  pulses?: readonly number[];
  shadow?: boolean;
  opacity?: number;
  /** Pebble's own theme colours (default: the world's: dark on night and desktop, light in daylight) */
  colors?: PebbleColors;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The body's centre above the foot, as a fraction of `size` (the body spans BODY.top..BODY.bottom in a 220 box). */
export const bodyCentreAbove = (size: number) => (((BODY.bottom - BODY.top) / 2) * size) / VIEWBOX_SIZE;

export const PebbleActor: React.FC<PebbleActorProps> = ({
  x,
  y,
  size,
  cues: list = [],
  hops = [],
  initialPose = "idle",
  lead = 1,
  enter,
  exit,
  grow,
  pool = false,
  glow = 0,
  pulses = [],
  shadow = true,
  opacity = 1,
  colors,
}) => {
  const frame = useCurrentFrame();
  const { fps, height: H } = useVideoConfig();
  const world = useWorld();
  const pebbleColors = colors ?? world.pebble;
  // the light under and behind it: sage on the dark grounds; in daylight a soft shadow does that work
  const lightRgb = world.dark ? RGB.sage : "255, 252, 246";
  const lightRgb2 = world.dark ? RGB.sageDeep : "255, 250, 240";
  const t = frame / fps;

  // entrance and exit as outer transforms about the foot
  let s = 1;
  let dy = 0;
  let sx = 1;
  let sy = 1;
  let a = opacity;
  if (enter) {
    const dt = t - enter.at;
    if (dt < 0) return null;
    if (enter.kind === "pop") {
      s = spring({ frame: dt * fps, fps, config: SPRING.pebble });
    } else if (enter.kind === "fade") {
      a *= clamp01(dt / 0.35);
    } else {
      // drop: falls from above the frame with gravity (0.42 s), then the landing squash and a jelly recovery
      const fall = 0.42;
      if (dt < fall) {
        const p = dt / fall;
        dy = -(y + size) * (1 - p * p);
        sy = 1.08;
        sx = 0.94;
      } else {
        const since = dt - fall;
        const land = spring({ frame: since * fps, fps, config: SPRING.jelly });
        sx = 1.18 - 0.18 * land;
        sy = 0.84 + 0.16 * land;
      }
    }
  }
  if (exit && t >= exit.at) {
    const p = clamp01((t - exit.at) / (exit.kind === "pop" ? 0.22 : 0.3));
    if (p >= 1) return null;
    if (exit.kind === "pop") s *= 1 - p * p;
    else a *= 1 - p;
  }
  for (const h of pulses) {
    const d = t - h;
    if (d < 0 || d > 0.6) continue;
    const e = d < 0.04 ? d / 0.04 : Math.exp(-(d - 0.04) / 0.12);
    sx *= 1 + 0.07 * e;
    sy *= 1 - 0.065 * e;
  }
  const g = grow ? 1 + (grow.to / size - 1) * SPRING_EASE(clamp01((t - grow.at) / grow.dur)) : 1;
  const sizeNow = size * g;

  const shifted = list.map((c) => ({ ...c, at: c.at + lead }));
  const shiftedHops = hops.map((h) => ({ ...h, at: h.at + lead }));
  // where the acting layer has the foot now (hops move it): the outer transforms scale about it
  const act = actingAt(t + lead, fps, { x, y }, shiftedHops, (BODY.height * sizeNow) / VIEWBOX_SIZE);
  const fx = act.foot.x;
  const fy = act.foot.y;
  const gx = act.ground.x;
  const gy = act.ground.y;
  const poolK = (pool === true ? 1 : pool === false ? 0 : pool) * (1 - 0.7 * act.lift);
  const body = sizeNow * 0.59 * s;
  const cy = fy - bodyCentreAbove(sizeNow);

  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, pointerEvents: "none" }}>
      {poolK > 0.002 && (
        <div
          style={{
            position: "absolute",
            left: gx - body * 2.6,
            top: gy - body * 0.5,
            width: body * 5.2,
            height: body * 1.0,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(${lightRgb}, ${(0.26 * poolK).toFixed(3)}), rgba(${lightRgb}, ${(0.13 * poolK).toFixed(3)}) 35%, rgba(${lightRgb2}, ${(0.07 * poolK).toFixed(3)}) 65%, rgba(${lightRgb2}, 0))`,
          }}
        />
      )}
      {glow > 0 && (
        <div
          style={{
            position: "absolute",
            left: fx - body * 1.5,
            top: cy - body * 1.5 + dy,
            width: body * 3,
            height: body * 3,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(${lightRgb}, ${(0.16 * glow).toFixed(3)}), rgba(${lightRgb2}, ${(0.1 * glow).toFixed(3)}) 50%, rgba(${lightRgb2}, 0))`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${dy.toFixed(2)}px) scale(${(s * sx).toFixed(5)}, ${(s * sy).toFixed(5)})`,
          transformOrigin: `${fx.toFixed(2)}px ${fy.toFixed(2)}px`,
        }}
      >
        <PebbleOnFilm
          cues={shifted}
          size={sizeNow}
          x={x}
          y={y}
          hops={shiftedHops}
          initialPose={initialPose}
          offsetFrames={lead * fps}
          shadow={shadow && dy > -H}
          colors={pebbleColors}
        />
      </div>
    </div>
  );
};

/** A no-bounce ease for size changes (the UI rule; the squash is the pebble's own). */
const SPRING_EASE = (p: number) => 1 - Math.pow(1 - p, 3);

/* ---------- the Veil ---------- */

export interface VeilPebbleProps {
  x: number;
  y: number;
  size: number;
  cues?: readonly PebbleCue[];
  /** Veil switches, local seconds (none + `initial`: settled) */
  veil?: readonly VeilSwitch[];
  /** the switch before the first one (default on: the settled dusk glass) */
  initial?: boolean;
  lead?: number;
  opacity?: number;
  /** a soft dusk light behind it (0..1) */
  glow?: number;
}

export const VeilPebble: React.FC<VeilPebbleProps> = ({ x, y, size, cues: list = [], veil = [], initial = true, lead = 1, opacity = 1, glow = 0 }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const te = frame / fps + lead;
  const view = pebbleAt(
    list.map((c) => ({ ...c, at: c.at + lead })),
    te,
  );
  const vf = veilAt(
    veil.map((v) => ({ ...v, at: v.at + lead })),
    te,
    { initial },
  );
  const d = veilDraw(vf, size);
  const ids = { body: `lvb${id}`, base: `lvs${id}`, cloak: `lvc${id}`, glass: `lvg${id}`, sheen: `lvh${id}` };
  const url = (n: string) => `url(#${n})`;
  const fr = view.frame;
  const eyes = (fill: string) => fr.eyes.map((e, i) => <path key={i} d={e.d} transform={e.matrix + d.eyeScale} opacity={e.alpha} fill={fill} />);
  const unit = size / VIEWBOX_SIZE;
  const left = x - size / 2;
  const top = y - (VIEWBOX_SIZE / 2 + BODY.bottom) * unit;
  const body = size * 0.59;
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      {glow > 0 && (
        <div
          style={{
            position: "absolute",
            left: x - body * 1.7,
            top: y - bodyCentreAbove(size) - body * 1.7,
            width: body * 3.4,
            height: body * 3.4,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(${RGB.duskHi}, ${(0.22 * glow).toFixed(3)}), rgba(${RGB.dusk}, ${(0.16 * glow).toFixed(3)}) 50%, rgba(${RGB.dusk}, 0))`,
          }}
        />
      )}
      <svg viewBox={VIEWBOX} width={size} height={size} style={{ position: "absolute", left, top, overflow: "visible", color: PEBBLE_DARK.body }} aria-hidden>
        {d.show && (
          <defs>
            <clipPath id={ids.body}>
              <path d={fr.bodyPath} />
            </clipPath>
            <clipPath id={ids.base}>
              <rect x={-110} y={d.baseClip.y} width={220} height={d.baseClip.height} />
            </clipPath>
            <clipPath id={ids.cloak}>
              <rect x={-110} y={d.cloakClip.y} width={220} height={d.cloakClip.height} />
            </clipPath>
            <linearGradient id={ids.glass} x1=".15" y1="0" x2=".85" y2="1">
              <stop offset="0" stopColor={VEIL_DARK.hi} />
              <stop offset=".75" stopColor={VEIL_DARK.veil} />
            </linearGradient>
            <linearGradient id={ids.sheen} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
        )}
        <g transform={view.motion.transform}>
          <g transform={d.squash}>
            <g clipPath={d.show && !d.fade ? url(ids.base) : undefined} opacity={d.baseOpacity}>
              <path d={fr.bodyPath} opacity={fr.bodyAlpha} fill="currentColor" />
              {eyes(PEBBLE_DARK.eye)}
            </g>
            {d.show && (
              <g clipPath={d.fade ? undefined : url(ids.cloak)} opacity={d.veilOpacity}>
                <path d={fr.bodyPath} opacity={fr.bodyAlpha} fill={d.fine ? url(ids.glass) : VEIL_DARK.veil} fillOpacity={d.fillOpacity} />
                {d.fine && (
                  <g clipPath={url(ids.body)}>
                    <ellipse cx={-26} cy={-30} rx={20} ry={9} transform="rotate(-35 -26 -30)" fill="#fff" opacity={d.highlightOpacity} />
                    {d.shimmer && <rect x={-20} y={-140} width={40} height={280} fill={url(ids.sheen)} opacity={d.shimmer.opacity} transform={d.shimmer.transform} />}
                  </g>
                )}
                {eyes(VEIL_DARK.eye)}
              </g>
            )}
            {d.show && (
              <g clipPath={url(ids.body)}>
                <path d={fr.bodyPath} fill="none" stroke={VEIL_DARK.rim} strokeWidth={d.rimWidth} opacity={d.rimOpacity} />
                {d.hem && <rect x={-110} y={d.hem.y} width={220} height={1.8} fill={VEIL_DARK.rim} opacity={d.hem.opacity} />}
              </g>
            )}
          </g>
          {d.ping && <circle r={66} fill="none" stroke={VEIL_DARK.glow} transform={d.ping.transform} strokeWidth={d.ping.strokeWidth} opacity={d.ping.opacity} />}
        </g>
      </svg>
    </div>
  );
};
