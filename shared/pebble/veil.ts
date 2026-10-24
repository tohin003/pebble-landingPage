// The Veil, Stealth Lockdown's look on the pebble, for the site and the films: Pebble 1.1.0's own pure function
// (stealthVeil.ts, copied unchanged) driven the way its comment describes, plus everything Pebble's Avatar.vue template
// computes from it, as data. Written for the Pebble site (Apache-2.0); the formulas in veilDraw are Avatar.vue's
// (Pebble v1.1.0, src/components/Avatar.vue), the colours are its src/tokens.css.
//
// - veilFrame(on, since, from, reduced): the frame-exact Veil for films, clips and stills.
// - veilAt(switches, t): the same for a timeline of switches, replayed for every frame (films replay, never remember).
// - LiveVeil: the live switch and clock behind PebbleLive's `stealth` prop.
// - veilDraw(frame, size): every attribute of the Veil's layers, so every renderer draws the same numbers.
// - VEIL_LIGHT, VEIL_DARK: the dusk family.
//
// Reversal: a switch starts from the Veil as it is drawn at that moment, so turning it back mid-cast never jumps
// (stealthVeil.ts: "A change mid-transition starts from where the last one had got to"), as Pebble's Avatar.vue does
// since 1.2.0. Pebble 1.1.0's Avatar.vue read that state after the prop had already flipped, so in 1.1.0 (and in its
// README renders) a cast started from ON and a release from OFF: the colour changed at once and only the squash, blink
// and ping played. `veilFrame(on, since, on ? ON : OFF)` reproduces that.
//
// Plain TypeScript with one import (the copied function), so a renderer can use it without pulling in the engine.
import { ACTIVATE, FADE, GLASS_OPACITY, OFF, ON, RELEASE, SHIMMER, SHIMMER_EVERY, moving, shimmer, veil, type Veil } from "./stealthVeil";

export { ACTIVATE, FADE, GLASS_OPACITY, OFF, ON, RELEASE, SHIMMER, SHIMMER_EVERY };
export type { Veil };

/** The shimmer counts from this long after the switch went on (Avatar.vue: "from the end of the cast"). */
export const SHIMMER_FROM = 0.95;
/** Below this rendered size (px) the glass, highlight, shimmer and ping are left out and the rim is thickened. */
export const VEIL_FINE_PX = 64;
/** The largest clock step accepted at once (as LivePebble's MAX_STEP). */
const MAX_VEIL_STEP = 0.25;

export interface VeilShine {
  /** the band's progress across the pebble, 0-1 */
  x: number;
  /** its strength, 0-1 */
  opacity: number;
}

/** One frame of the Veil: what a renderer needs besides the engine's frame. */
export interface VeilFrame {
  /** the switch (Avatar.vue's data-stealth) */
  on: boolean;
  /** stealthVeil.ts's state: cloak, rim, glass, eye openness, squash, hem, ping, and fade (Reduce Motion) */
  veil: Veil;
  /** the shimmer band, or null */
  shine: VeilShine | null;
}

const end = (on: boolean): Veil => ({ ...(on ? ON : OFF) });

/** The settled look, with no shimmer: ON (dusk glass, light rim, eyes at 80 %) or OFF. Every still frame shows it. */
export function veilEnd(on: boolean): VeilFrame {
  return { on, veil: end(on), shine: null };
}

/**
 * The Veil `since` seconds after the switch went `on` (or off), starting from `from` (by default the other end state:
 * a full cast or release). `reduced`: Reduce Motion's 0.3 s cross-fade, and no shimmer. While on, the 1.1 s shimmer
 * runs from SHIMMER_FROM seconds after the switch, every 6 s. Once the transition is over it is exactly the end state;
 * before the switch (`since` < 0) it is `from`.
 */
export function veilFrame(on: boolean, since: number, from: Veil = on ? OFF : ON, reduced = false): VeilFrame {
  if (!(since >= 0)) return { on: !on, veil: { ...from }, shine: null };
  const v = moving(on, since, reduced) ? veil(on, since, from, reduced) : end(on);
  return { on, veil: v, shine: on && !reduced ? shimmer(since - SHIMMER_FROM) : null };
}

export interface VeilSwitch {
  /** seconds, in the same time as `t` (absolute composition time in a film) */
  at: number;
  on: boolean;
}

/**
 * The Veil at time `t` of a timeline of switches sorted by `at`. Each switch starts from the Veil as drawn at that
 * moment. `initial` is the position before the first switch; while it is on and nothing has switched yet, the shimmer
 * counts from t = 0 (Avatar.vue: from mount).
 */
export function veilAt(
  switches: readonly VeilSwitch[],
  t: number,
  { initial = false, reduced = false }: { initial?: boolean; reduced?: boolean } = {},
): VeilFrame {
  let on = initial;
  let at = -Infinity;
  let from = end(initial);
  for (const s of switches) {
    if (s.at > t) break;
    if (s.on === on) continue;
    from = at === -Infinity ? end(on) : veilFrame(on, s.at - at, from, reduced).veil;
    on = s.on;
    at = s.at;
  }
  if (at === -Infinity) return { on, veil: end(on), shine: on && !reduced ? shimmer(t) : null };
  return veilFrame(on, t - at, from, reduced);
}

/**
 * How the pebble is drawn right now:
 * - "animate": it is the animated pebble (or paused where it stands): the cast and release play, the shimmer runs;
 * - "reduced": Reduce Motion or the page's Pause motion: one 0.3 s cross-fade each way, no shimmer;
 * - "still": another pebble is the animated one: the end state at once (Avatar.vue).
 */
export type VeilMotion = "animate" | "reduced" | "still";

/**
 * The Veil's switch and clock, without any DOM: PebbleLive drives one from requestAnimationFrame, the tests with a
 * fake clock. The clock moves only through advance(), so a pebble paused mid-cast continues from the frame on screen.
 * A transition belongs to the motion it started under: drawn under another one, it shows its end state (a cross-fade
 * that ended never comes back as an unfinished release when motion is allowed again).
 */
export class LiveVeil {
  /** The switch. */
  on: boolean;
  /** The Veil's clock, in seconds. */
  time = 0;
  /** Clock time of the last switch; -Infinity when none is under way (never switched, or settled). */
  private at = -Infinity;
  /** The Veil as drawn when the switch last changed. */
  private from: Veil;
  /** How the transition under way is drawn: played ("animate") or cross-faded ("reduced"). */
  private kind: VeilMotion = "animate";

  constructor(on = false) {
    this.on = on;
    this.from = end(on);
  }

  /** Flip the switch now, starting from the Veil as drawn now. Returns false if it was already in that position. */
  set(on: boolean, motion: VeilMotion): boolean {
    if (on === this.on) return false;
    const drawn = this.frame(motion).veil;
    this.on = on;
    if (motion === "still") this.settle();
    else {
      this.from = drawn;
      this.at = this.time;
      this.kind = motion;
    }
    return true;
  }

  /** Advance the clock by `dt` seconds (clamped to [0, 0.25]). */
  advance(dt: number): void {
    this.time += Number.isFinite(dt) ? Math.min(Math.max(dt, 0), MAX_VEIL_STEP) : 0;
  }

  /** End any transition: the end state from now on. */
  settle(): void {
    this.at = -Infinity;
    this.from = end(this.on);
  }

  /** A cast, release or cross-fade is under way (and drawn the way it started). */
  moving(motion: VeilMotion): boolean {
    return motion === this.kind && this.at !== -Infinity && moving(this.on, this.time - this.at, motion === "reduced");
  }

  /** The Veil to draw now. */
  frame(motion: VeilMotion): VeilFrame {
    if (motion !== "still" && this.at !== -Infinity && motion === this.kind) {
      return veilFrame(this.on, this.time - this.at, this.from, motion === "reduced");
    }
    // Settled. The shimmer counts from the switch, or from the clock's start when the Veil was on from the start.
    const since = this.at === -Infinity ? this.time : this.time - this.at - SHIMMER_FROM;
    return { on: this.on, veil: end(this.on), shine: motion === "animate" && this.on ? shimmer(since) : null };
  }

  /** Moving, or a shimmer band is on the pebble: an animated pebble should not settle on this frame. */
  busy(motion: VeilMotion): boolean {
    return this.moving(motion) || this.frame(motion).shine !== null;
  }
}

/** Every attribute of the Veil's layers, exactly as Avatar.vue (Pebble v1.1.0) computes them. */
export interface VeilDraw {
  on: boolean;
  /** The dusk layers, the rim and the clips are drawn (Avatar.vue's showVeil). */
  show: boolean;
  /** Reduce Motion: the layers cross-fade (opacity) instead of wiping (clip). */
  fade: boolean;
  /** 64 px or larger (or sized by CSS): glass, highlight, shimmer and ping. */
  fine: boolean;
  /** The wipe edge, in viewBox units: -78 (none) to 78 (covered). */
  edge: number;
  /** The plain pebble's clip, below the edge, and the dusk pebble's, above it (both 220 wide from x = -110). */
  baseClip: { y: number; height: number };
  cloakClip: { y: number; height: number };
  /** The squash and stretch about the pebble's bottom, or undefined. */
  squash: string | undefined;
  /** Opacity of the plain pebble's layer (fade only). */
  baseOpacity: number | undefined;
  /** Opacity of the dusk layer (fade only). */
  veilOpacity: number | undefined;
  /** Appended to each eye's matrix: "" when the eyes are fully open, else " scale(1 k)". */
  eyeScale: string;
  /** fill-opacity of the dusk body: the glass at 70 % (fine), else 1. */
  fillOpacity: number;
  /** The glass's white highlight (fine). */
  highlightOpacity: number;
  /** The shimmer band (fine, while on and animated). */
  shimmer: { transform: string; opacity: number } | null;
  /** The light rim: a stroke on the body path, clipped to the body (so half of it shows). */
  rimWidth: number;
  rimOpacity: number;
  /** The bright line at the wipe edge. */
  hem: { y: number; opacity: number } | null;
  /** The ring the cast sends out (fine). */
  ping: { transform: string; strokeWidth: string; opacity: string } | null;
}

/** Whether a frame differs from the plain pebble at all (a renderer can skip the Veil's markup otherwise). */
export function veilVisible(v: Veil): boolean {
  return v.cloak > 0.001 || v.rim > 0.001 || v.ping >= 0 || v.sy !== 1 || v.eye < 0.999;
}

/** The Veil's layers for a pebble `size` px wide (undefined: sized by CSS, taken as 64 px or larger). */
export function veilDraw({ on, veil: v, shine }: VeilFrame, size?: number): VeilDraw {
  const fine = size === undefined || size >= VEIL_FINE_PX;
  const show = v.cloak > 0.001 || v.rim > 0.001 || v.ping >= 0;
  const edge = -78 + 156 * v.cloak;
  return {
    on,
    show,
    fade: v.fade,
    fine,
    edge,
    baseClip: { y: edge, height: Math.max(0, 110 - edge) },
    cloakClip: { y: -110, height: Math.max(0, edge + 110) },
    squash: v.sy === 1 ? undefined : `translate(0 ${(66 * (1 - v.sy)).toFixed(2)}) scale(${v.sx.toFixed(4)} ${v.sy.toFixed(4)})`,
    baseOpacity: show && v.fade ? 1 - v.cloak : undefined,
    veilOpacity: v.fade ? v.cloak : undefined,
    eyeScale: v.eye >= 0.999 ? "" : ` scale(1 ${Math.max(0.06, v.eye).toFixed(3)})`,
    fillOpacity: fine ? 1 - (1 - GLASS_OPACITY) * v.glass : 1,
    highlightOpacity: 0.2 * v.glass,
    shimmer:
      fine && shine
        ? { transform: `translate(${(-130 + 260 * shine.x).toFixed(1)} 0) rotate(22)`, opacity: shine.opacity * v.glass }
        : null,
    rimWidth: fine ? 5 : (2 * 1.3 * 220) / (size ?? VEIL_FINE_PX), // about 1.3 px on screen at small sizes
    rimOpacity: 0.95 * v.rim,
    hem: v.hem > 0 ? { y: edge - 0.9, opacity: 0.95 * v.hem } : null,
    ping:
      fine && v.ping >= 0
        ? {
            transform: `scale(${(1 + (16 / 66) * (1 - (1 - v.ping) ** 5)).toFixed(4)})`,
            strokeWidth: (3.5 - 2.8 * v.ping).toFixed(2),
            opacity: (0.85 * (1 - v.ping)).toFixed(3),
          }
        : null,
  };
}

export interface VeilColors {
  /** the dusk blue (--avatar-stealth) */
  veil: string;
  /** its highlight, the glass gradient's light end (--avatar-stealth-hi) */
  hi: string;
  /** the eyes on the glass (--avatar-stealth-eye) */
  eye: string;
  /** the light rim and the hem (--avatar-stealth-rim) */
  rim: string;
  /** the cast's ring (--avatar-stealth-glow) */
  glow: string;
}

/** Pebble 1.1.0's src/tokens.css (sha256 2e1c6c29…6d7b19), light theme. */
export const VEIL_LIGHT: VeilColors = { veil: "#44528c", hi: "#7684c6", eye: "#fff", rim: "#d6ddff", glow: "#7d8df2" };
/** The same, dark theme (:root[data-theme="dark"]). */
export const VEIL_DARK: VeilColors = { veil: "#a3aeea", hi: "#ccd4fb", eye: "#1c2246", rim: "#fff", glow: "#8494f7" };
