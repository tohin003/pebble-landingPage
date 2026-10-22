// The film-only acting layer (MASTER_PLAN §4.3, R5 §9.2): hops with anticipation, stretch and a landing squash, and
// the contact shadow. It is pure arithmetic over composition time and moves the pebble only through OUTER transforms
// (position and scale around the foot); the engine and its frames are never touched.
import { spring } from "remotion";
import type { BotFrame, Gaze, PebbleCue, PebbleMotion } from "../../../shared/pebble";
import { BODY, quantize } from "../../../shared/pebble";
import { SPRING } from "../motion/spec";

export interface Point {
  x: number;
  y: number;
}

/** One hop, in absolute composition time. The pebble's foot (bottom centre of the body) travels to `to`. */
export interface Hop {
  /** take-off, seconds; the anticipation squash starts ACTING.anticipation.s before it */
  at: number;
  /** where the foot lands, px in the parent's box */
  to: Point;
  /** seconds in the air (default 0.45) */
  duration?: number;
  /** apex height above the straight line between the two feet, px (default 0.45 × the body's height) */
  height?: number;
}

export const ACTING = {
  anticipation: { s: 0.15, sy: 0.89 },
  stretch: { sy: 1.11, sx: 0.9 },
  landing: { sy: 0.87, sx: 1.15, frames: 2 },
  /** ellipse 0.9 × the body's width and 0.18 × its height, blur 16 px, opacity 0.3; at a hop's apex it shrinks to
   *  0.6 × and fades to 0.12 (R5 §5.9) */
  shadow: { w: 0.9, h: 0.18, blurPx: 16, opacity: 0.3, apexScale: 0.6, apexOpacity: 0.12 },
  /** the eyes lead the body by 0.1 s (3 frames at 30 fps) */
  eyesLead: 0.1,
  defaultDuration: 0.45,
  defaultHeight: 0.45,
} as const;

export interface Acting {
  /** where the foot is drawn */
  foot: Point;
  /** the ground under the foot (the shadow's centre) */
  ground: Point;
  /** 0 on the ground, 1 at a hop's apex */
  lift: number;
  sx: number;
  sy: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Where the pebble is and how it is squashed at time `t`, given its start position and its hops (sorted by `at`). */
export function actingAt(t: number, fps: number, start: Point, hops: readonly Hop[], bodyHeightPx: number): Acting {
  let pos = start;
  let state: Acting = { foot: start, ground: start, lift: 0, sx: 1, sy: 1 };
  for (const hop of hops) {
    const duration = hop.duration ?? ACTING.defaultDuration;
    const land = hop.at + duration;
    const anticipate = hop.at - ACTING.anticipation.s;
    if (t < anticipate) break;
    if (t < hop.at) {
      // anticipation: squash down, keeping the volume (sx · sy = 1)
      const sy = 1 - (1 - ACTING.anticipation.sy) * easeInOut(clamp01((t - anticipate) / ACTING.anticipation.s));
      state = { foot: pos, ground: pos, lift: 0, sx: 1 / sy, sy };
    } else if (t < land) {
      // flight on a parabola; stretched along the motion at take-off and landing, round at the apex
      const u = (t - hop.at) / duration;
      const height = hop.height ?? ACTING.defaultHeight * bodyHeightPx;
      const ground = { x: lerp(pos.x, hop.to.x, u), y: lerp(pos.y, hop.to.y, u) };
      const lift = 4 * u * (1 - u);
      const k = Math.abs(1 - 2 * u);
      state = {
        foot: { x: ground.x, y: ground.y - height * lift },
        ground,
        lift,
        sx: lerp(1, ACTING.stretch.sx, k),
        sy: lerp(1, ACTING.stretch.sy, k),
      };
    } else {
      // landed: a squash held for two frames, then recovery on the `jelly` spring
      pos = hop.to;
      const since = Math.round((t - land) * fps);
      if (since < ACTING.landing.frames) {
        state = { foot: pos, ground: pos, lift: 0, sx: ACTING.landing.sx, sy: ACTING.landing.sy };
      } else {
        const s = spring({ frame: since - ACTING.landing.frames, fps, config: SPRING.jelly });
        state = {
          foot: pos,
          ground: pos,
          lift: 0,
          sx: lerp(ACTING.landing.sx, 1, s),
          sy: lerp(ACTING.landing.sy, 1, s),
        };
      }
    }
  }
  return state;
}

/**
 * Where the drawn silhouette reaches, in viewBox units (y down): the body outline after the pose's body motion
 * (avatarMotion's translate, rotate and scale), plus the engine's dots (the "!" point), which Avatar.vue draws outside
 * that transform. Bézier control points stand in for the curve; they sit within a fraction of a unit of it.
 */
export function silhouetteExtent(frame: BotFrame, motion: PebbleMotion) {
  const nums = frame.bodyPath.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const a = (motion.tilt * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]) * motion.sx;
    const y = Number(nums[i + 1]) * motion.sy;
    const px = x * cos - y * sin + motion.x;
    const py = x * sin + y * cos + motion.y;
    left = Math.min(left, px);
    right = Math.max(right, px);
    bottom = Math.max(bottom, py);
  }
  for (const d of frame.dots) {
    if (d.opacity < 0.05) continue;
    left = Math.min(left, d.x - d.r);
    right = Math.max(right, d.x + d.r);
    bottom = Math.max(bottom, d.y + d.r);
  }
  if (!Number.isFinite(left)) return { left: BODY.left, right: BODY.right, bottom: BODY.bottom };
  return { left, right, bottom };
}

/**
 * The contact shadow: an ellipse 0.9 × the silhouette's width with the galet's proportions (0.18 × its height), blur
 * 16 px (less on small pebbles, never more than 0.4 × the ellipse's height), opacity 0.3. It shrinks to 0.6 × and
 * fades to 0.12 as the body leaves the ground, whether it hops (acting) or the engine lifts it (the "!" glyph, a
 * happy bounce). Positions are px in the parent's box; `unit` is px per viewBox unit.
 */
export function contactShadow(frame: BotFrame, motion: PebbleMotion, acting: Acting, unit: number) {
  const s = ACTING.shadow;
  const ext = silhouetteExtent(frame, motion);
  const raised = Math.max(0, BODY.bottom - ext.bottom) / (ACTING.defaultHeight * BODY.height);
  const lift = clamp01(acting.lift + raised);
  const scale = lerp(1, s.apexScale, lift);
  const width = s.w * (ext.right - ext.left) * acting.sx * unit * scale;
  const height = (width * s.h * BODY.height) / (s.w * BODY.width);
  return {
    x: acting.ground.x + ((ext.left + ext.right) / 2) * acting.sx * unit,
    y: acting.ground.y,
    width,
    height,
    opacity: lerp(s.opacity, s.apexOpacity, lift),
    blur: Math.min(s.blurPx, 0.4 * height),
  };
}

/**
 * Look cues so the eyes lead each hop: toward the landing spot 0.1 s before the anticipation starts, back to the
 * pose's own gaze `settle` seconds after landing. Merge them into a timeline with `mergeCues`.
 */
export function hopGlances(start: Point, hops: readonly Hop[], settle = 0.5): PebbleCue[] {
  const out: PebbleCue[] = [];
  let from = start;
  for (const hop of hops) {
    const dx = hop.to.x - from.x;
    const dy = hop.to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const look: Gaze = { x: quantize(dx / d), y: quantize(dy / d - 0.25) }; // a little upward: it is a hop
    out.push({ at: hop.at - ACTING.anticipation.s - ACTING.eyesLead, look });
    out.push({ at: hop.at + (hop.duration ?? ACTING.defaultDuration) + settle, look: null });
    from = hop.to;
  }
  return out;
}

/** Several cue lists as one, sorted by time (stable, so same-time cues keep their order). */
export function mergeCues(...lists: readonly (readonly PebbleCue[])[]): PebbleCue[] {
  return lists
    .flat()
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.at - b.c.at || a.i - b.i)
    .map(({ c }) => c);
}
