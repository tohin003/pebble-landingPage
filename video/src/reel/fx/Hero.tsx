// The pebble as the reel's hero: Pebble's own character engine (shared/pebble, bloub by Jérémy Perret, MIT) through
// PebbleOnFilm, in the dark palette (sage on the dark ground, never black). The landing (scale from huge, a squash, a
// settle) and the absorb pulses are outer transforms only: the engine's frames are never touched.
import { useCurrentFrame } from "remotion";
import type { PebbleCue } from "../../../../shared/pebble";
import { PEBBLE_DARK } from "../../pebble/PebbleSvg";
import { PebbleOnFilm } from "../../pebble/PebbleOnFilm";
import { REEL, expoOut, hitEnv } from "./look";

export const Hero: React.FC<{
  cues: readonly PebbleCue[];
  /** the foot's place, frame px */
  x: number;
  y: number;
  /** the viewBox's rendered size, px (the body is about 0.59 of it) */
  size: number;
  /** the frame it lands on (absolute) */
  landAt: number;
  /** frames of extra squash pulses (absolute) */
  pulses?: readonly number[];
  opacity?: number;
}> = ({ cues, x, y, size, landAt, pulses = [], opacity = 1 }) => {
  const frame = useCurrentFrame();
  const dt = frame - landAt;
  if (dt < 0) return null;
  // the landing: from 3.2× and above, down onto its foot in 7 frames, a squash, a small overshoot, settled by ~20
  const fall = expoOut(dt / 7);
  const s = 3.2 - 2.2 * fall;
  const land = dt >= 6 ? hitEnv(dt - 6, 1, 5) : 0;
  let sx = 1 + 0.16 * land;
  let sy = 1 - 0.15 * land;
  for (const p of pulses) {
    const e = hitEnv(frame - p, 1, 6);
    sx += 0.09 * e;
    sy -= 0.08 * e;
  }
  const lift = (1 - fall) * size * 0.6;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {/* the light pool it lands in */}
      <div
        style={{
          position: "absolute",
          left: x - size * 1.1,
          top: y - size * 0.9,
          width: size * 2.2,
          height: size * 1.2,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, rgba(${REEL.sageCore}, 0.30), rgba(${REEL.sage}, 0.12) 60%, transparent)`,
          filter: "blur(20px)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, transform: `translate(0px, ${-lift}px) scale(${s * sx}, ${s * sy})`, transformOrigin: `${x}px ${y}px` }}>
        <PebbleOnFilm cues={cues} size={size} x={x} y={y} colors={PEBBLE_DARK} shadow={false} initialPose="idle" />
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
