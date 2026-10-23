// Where a site pebble's eyes rest (docs/DESIGN.md §9, "Pebble gaze at rest"): the engine's own resting gaze glances up
// and to the right, away from the headline and the visitor, so on the site the static frame (server render, no
// JavaScript, reduced or paused motion) and the live pebble at rest look straight ahead, like the app icon. The live
// pebble still follows the pointer, and comes back to centre when it settles. The footer's sleeping pebble keeps its
// own pose. Type-only engine imports: this file adds no engine code to a bundle.
import type { Gaze, PoseId } from "@pebble/index";

/** Straight ahead, at the visitor (a quantised screen-direction gaze; bloub turns it into its own look). */
export const SITE_REST: Gaze = { x: 0, y: 0 };

/** The resting gaze for a pose: an explicit `rest` wins (null = the pose's own direction); sleepy keeps its own. */
export function restFor(pose: PoseId, rest?: Gaze | null): Gaze | null {
  if (rest !== undefined) return rest;
  return pose === "sleepy" ? null : SITE_REST;
}
