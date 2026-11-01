// Scene group A's leap into the lockup (S01 on the drop, S11 into the end card). Owned by the group's worker.
//
// The motion system's hops fly a parabola over the straight line between two feet. Into the 16:9 lockup that line
// runs under the name and the parabola slides the pebble across the "P"; so the pebble flies a cubic curve instead: it
// swoops left under the type, rises on the name's left and drops onto its spot from just above. On 4:5 (pebble above
// the name) it shoots up, fast first (an ease-out), and clears the name in about 3 frames.
//
// One PebbleActor at a time, all with the same cues and lead, so the engine's frame never jumps: standing at `from`
// before take-off (with the anticipation squash), flying (stretched by its speed, no contact shadow), then landed at
// `to` (the landing squash for 2 frames and the jelly recovery). Only Pebble's own poses; the acting is outer
// transforms only.
import type { PebbleCue } from "../../../../../shared/pebble";
import { PebbleActor } from "../../components/PebbleActor";
import type { Pt } from "../../layout";

export interface Flight {
  from: Pt;
  c1: Pt;
  c2: Pt;
  to: Pt;
  fromSize: number;
  toSize: number;
  /** take-off and time in the air, local seconds */
  at: number;
  dur: number;
  /** progress warp: >1 is fast first (an ease-out); 1 is the curve's own pace */
  warp?: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const bez = (f: Flight, u: number): Pt => {
  const a = (1 - u) ** 3;
  const b = 3 * (1 - u) ** 2 * u;
  const c = 3 * (1 - u) * u * u;
  const d = u ** 3;
  return { x: a * f.from.x + b * f.c1.x + c * f.c2.x + d * f.to.x, y: a * f.from.y + b * f.c1.y + c * f.c2.y + d * f.to.y };
};

const warpOf = (f: Flight, p: number) => 1 - (1 - p) ** (f.warp ?? 1);

/** Where the foot is (px), the size and the stretch at local time `t` during the flight. */
export const flightAt = (f: Flight, t: number) => {
  const p = clamp01((t - f.at) / f.dur);
  const u = warpOf(f, p);
  const foot = bez(f, u);
  // speed (px per unit of p), normalised by the flight's fastest moment: stretched when fast, round at the apex
  const speedAt = (q: number) => {
    const e = 0.01;
    const a = bez(f, warpOf(f, clamp01(q - e)));
    const b = bez(f, warpOf(f, clamp01(q + e)));
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  let vmax = 1e-6;
  for (let i = 0; i <= 20; i++) vmax = Math.max(vmax, speedAt(i / 20));
  const s = Math.min(1, speedAt(p) / vmax);
  const sy = 1 + 0.11 * s;
  const sx = 1 - 0.1 * s;
  // the size eases in with the flight (no bounce: the squash is the pebble's only overshoot)
  const size = lerp(f.fromSize, f.toSize, 1 - (1 - p) ** 2);
  return { foot, size, sx, sy, p };
};

export const FlightPebble: React.FC<{
  flight: Flight;
  t: number;
  cues: readonly PebbleCue[];
  lead?: number;
  glow?: number;
  /** a floor light under it while it stands at `from` (0..1) */
  pool?: number;
  pulses?: readonly number[];
}> = ({ flight: f, t, cues, lead = 1, glow = 0.5, pool = 0, pulses }) => {
  const land = f.at + f.dur;
  if (t < f.at) {
    // standing; the anticipation squash for the last 0.15 s before take-off (the hop's own)
    return (
      <PebbleActor
        x={f.from.x}
        y={f.from.y}
        size={f.fromSize}
        hops={[{ at: f.at, to: f.from, duration: f.dur }]}
        cues={cues}
        lead={lead}
        glow={glow}
        pool={pool}
        pulses={pulses}
      />
    );
  }
  if (t < land) {
    const a = flightAt(f, t);
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${a.sx.toFixed(5)}, ${a.sy.toFixed(5)})`,
          transformOrigin: `${a.foot.x.toFixed(2)}px ${a.foot.y.toFixed(2)}px`,
        }}
      >
        <PebbleActor x={a.foot.x} y={a.foot.y} size={a.size} cues={cues} lead={lead} glow={glow} shadow={false} />
      </div>
    );
  }
  // landed: a zero-length hop that ends on `land` gives the landing squash (2 frames) and the jelly recovery
  return (
    <PebbleActor
      x={f.to.x}
      y={f.to.y}
      size={f.toSize}
      hops={[{ at: land - 0.001, to: f.to, duration: 0.001, height: 0 }]}
      cues={cues}
      lead={lead}
      glow={glow}
      pulses={pulses}
    />
  );
};

/**
 * The curve into a lockup. 16:9: swoop left under the type (leaving `rise` px above the start), rise on the name's
 * left, drop onto the spot from about 55 px above. 4:5: straight up, a small overshoot above the spot; `warpPortrait`
 * 1.6 shoots it past a name in ~3 frames (S01), 1 keeps the curve's own pace where nothing is in the way (S11).
 */
export const lockupFlight = (portrait: boolean, px: (v: number) => number, from: Pt, to: Pt, rise = 40, warpPortrait = 1.6): Pick<Flight, "c1" | "c2" | "warp"> =>
  portrait
    ? { c1: { x: from.x, y: from.y - 0.95 * (from.y - to.y) }, c2: { x: to.x, y: to.y - px(70) }, warp: warpPortrait }
    : { c1: { x: to.x, y: from.y - px(rise) }, c2: { x: to.x - px(110), y: to.y - px(260) }, warp: 1 };
