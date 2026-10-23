// The dial's three stops and where the pebble looks for each. Plain constants with no engine import, so the dial's
// own client code stays small: the engine arrives only with the live pebble (PermissionDial.pebble.tsx).
import type { Gaze } from "@pebble/index";

/**
 * Where each mode sits on the arch, seen from the pebble under it (x right, y down), quantised to the app's 1/8 gaze
 * steps (shared/pebble quantize). The angles are comp 3's detents: 152°, 90° and 28° (155° and 25° on phones, close
 * enough to share a gaze).
 */
export const MODE_GAZE = {
  ask: { x: -0.875, y: -0.5 },
  auto: { x: 0, y: -1 },
  full: { x: 0.875, y: -0.5 },
} as const satisfies Record<string, Gaze>;

export type DialModeId = keyof typeof MODE_GAZE;
