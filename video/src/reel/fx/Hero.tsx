// The pebble as the reel's hero: Pebble's own character engine (shared/pebble, bloub by Jérémy Perret, MIT) through
// PebbleOnFilm, in the dark palette (sage on the dark ground, never black). The landing (scale from huge, a squash, a
// settle), the move from another place, the pulses and the aura are outer transforms and light only: the engine's
// frames are never touched.
import { useCurrentFrame } from "remotion";
import type { PebbleCue } from "../../../../shared/pebble";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PebbleOnFilm } from "../../pebble/PebbleOnFilm";
import { Aura, rimLight, type AuraState } from "./Aura";
import { REEL, backOut, c01, expoOut, hitEnv, inOut } from "./look";

/** The body's centre above the foot, and its radius, as fractions of the viewBox's rendered size. */
export const BODY_CY = 0.3;
export const BODY_R = 0.27;

export const Hero: React.FC<{
  cues: readonly PebbleCue[];
  /** the foot's place, frame px */
  x: number;
  y: number;
  /** the viewBox's rendered size, px (the body is about 0.59 of it) */
  size: number;
  /** the frame it appears on (absolute) */
  landAt: number;
  /**
   * how it arrives: "fall" (from 3.2× above, squash, settle), "pop" (a small back-out pop in place), or a move from
   * another place and size over `frames`
   */
  enter?: "fall" | "pop" | { from: { x: number; y: number; size: number }; frames: number };
  /** frames of squash pulses (absolute), and how strong (default 1) */
  pulses?: readonly number[];
  pulseGain?: number;
  aura?: AuraState;
  opacity?: number;
  /** a little bounce (a hop of a quarter of its size) starting at this absolute frame */
  bounceAt?: number;
}> = ({ cues, x, y, size, landAt, enter = "fall", pulses = [], pulseGain = 1, aura, opacity = 1, bounceAt }) => {
  const frame = useCurrentFrame();
  const dt = frame - landAt;
  if (dt < 0) return null;
  let s = 1;
  let lift = 0;
  let px = x;
  let py = y;
  let ps = size;
  let sx = 1;
  let sy = 1;
  if (enter === "fall") {
    const fall = expoOut(dt / 7);
    s = 1.9 - 0.9 * fall;
    const land = dt >= 6 ? hitEnv(dt - 6, 1, 5) : 0;
    sx += 0.16 * land;
    sy -= 0.15 * land;
    lift = (1 - fall) * size * 0.6;
  } else if (enter === "pop") {
    s = 0.55 + 0.45 * backOut(dt / 12, 2.2);
  } else {
    const u = inOut(c01(dt / enter.frames));
    px = enter.from.x + (x - enter.from.x) * u;
    py = enter.from.y + (y - enter.from.y) * u;
    ps = enter.from.size + (size - enter.from.size) * u;
  }
  for (const p of pulses) {
    const e = hitEnv(frame - p, 1, 6) * pulseGain;
    sx += 0.08 * e;
    sy -= 0.07 * e;
  }
  if (bounceAt !== undefined && frame >= bounceAt && frame < bounceAt + 20) {
    const b = (frame - bounceAt) / 20;
    lift += Math.sin(Math.PI * b) * ps * 0.22;
    if (b > 0.85) {
      sx += 0.1 * (1 - (b - 0.85) / 0.15);
      sy -= 0.1 * (1 - (b - 0.85) / 0.15);
    }
  }
  const cy = py - ps * BODY_CY - lift;
  const r = ps * BODY_R * s;
  const warm = aura?.warmth ?? 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {aura && <Aura x={px} y={cy} r={r} state={aura} frame={frame} />}
      {/* the light pool under it */}
      <div
        style={{
          position: "absolute",
          left: px - ps * 1.0,
          top: py - ps * 0.5,
          width: ps * 2.0,
          height: ps * 0.8,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, rgba(${REEL.sageCore}, ${0.16 + 0.14 * (aura?.level ?? 0.5)}), transparent)`,
          filter: "blur(16px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(0px, ${-lift}px) scale(${s * sx}, ${s * sy})`,
          transformOrigin: `${px}px ${py}px`,
          filter: aura ? rimLight(r / Math.max(0.01, s), aura.level * (1 - 0.85 * (aura.dim ?? 0)), warm) : undefined,
        }}
      >
        <PebbleOnFilm cues={cues} size={ps} x={px} y={py} colors={PEBBLE_DARK} shadow={false} initialPose="idle" />
      </div>
    </div>
  );
};

/** A shock ring from a hit: a thin sage ring that expands and fades. */
export const ShockRing: React.FC<{ x: number; y: number; dt: number; r0: number; r1: number; frames?: number }> = ({ x, y, dt, r0, r1, frames = 26 }) => {
  if (dt < 0 || dt > frames) return null;
  const p = expoOut(dt / frames);
  const r = r0 + (r1 - r0) * p;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        border: `${Math.max(1.5, 6 * (1 - p))}px solid rgba(${REEL.sageCore}, ${0.8 * (1 - p)})`,
        boxShadow: `0 0 ${30 * (1 - p)}px rgba(${REEL.sage}, ${0.6 * (1 - p)})`,
      }}
    />
  );
};
