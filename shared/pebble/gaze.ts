// Modified for the Pebble site.
// Source: Pebble v1.0.1, src/companionPointer.ts (Apache-2.0, Copyright 2026 Tohin Majumder). Kept: Gaze, GAZE_STEPS,
// REACH_PX, quantize, Box, gazeToward, sameGaze and lookFor. Left out: the Vue pointer listener, the one-animated-avatar
// election and the pet's native gaze bridge (the site has its own, in src/components/pebble). One change: gazeToward
// takes an optional `reach` (default REACH_PX), so a large pebble turns its eyes over a proportionally larger distance.
// Everything else is unchanged.
import type { Look } from "./bloub/engine";

export interface Gaze {
  x: number;
  y: number;
}
export const GAZE_STEPS = 8; // quantization: 17 positions per axis
export const REACH_PX = 200; // a pointer this far from the centre turns the eyes fully

export function quantize(value: number, steps = GAZE_STEPS): number {
  if (!Number.isFinite(value)) return 0;
  const q = Math.round(Math.max(-1, Math.min(1, value)) * steps) / steps;
  return q === 0 ? 0 : q; // no -0
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
/** Direction from an avatar's box to a pointer, or null for an empty or non-finite box. */
// Pebble site: `reach` replaces the REACH_PX constant inside the division (a non-positive or non-finite reach falls
// back to REACH_PX).
export function gazeToward(x: number, y: number, box: Box | null | undefined, reach = REACH_PX): Gaze | null {
  if (!box) return null;
  const values = [x, y, box.left, box.top, box.width, box.height];
  if (!values.every(Number.isFinite) || box.width <= 0 || box.height <= 0) return null;
  const r = Number.isFinite(reach) && reach > 0 ? reach : REACH_PX;
  return {
    x: quantize((x - (box.left + box.width / 2)) / r),
    y: quantize((y - (box.top + box.height / 2)) / r),
  };
}

export function sameGaze(a: Gaze | null, b: Gaze | null): boolean {
  return a === b || (!!a && !!b && a.x === b.x && a.y === b.y);
}

/** The bloub look for a gaze; null returns the eyes to the pose's own direction. */
// Gaze is in screen terms (x right, y DOWN), from the DOM pointer and the shell's sampler alike; bloub's pitch is
// positive UP (vendor/bloub/face.ts HeadGaze), so y changes sign here. Phase 26 (D24): the person saw the eyes look
// up at a pointer below the avatar and down at one above it.
export function lookFor(gaze: Gaze | null): Look | null {
  return gaze ? { yaw: gaze.x * 40, pitch: -gaze.y * 30, mix: 0.8, spin: 0, wander: 0.1 } : null;
}
