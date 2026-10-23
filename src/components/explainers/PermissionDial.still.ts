// The dial pebble's engine, set up the same way on the server (the still frame in the HTML) and in the browser (the
// live pebble that continues from it): Pebble's idle pose with its eyes on the chosen mode. Pure TypeScript, no React.
// It imports the engine: keep it out of the dial's own client code (PermissionDial.tsx uses PermissionDial.modes.ts).
import { LivePebble, type Gaze, type PebbleView } from "@pebble/index";

/** A live pebble in the idle pose, looking toward `gaze` (quantised screen direction, y down). */
export function dialPebble(gaze: Gaze): LivePebble {
  const pebble = new LivePebble("idle");
  pebble.setGaze(gaze);
  return pebble;
}

/** The settled still frame for a gaze: what the server renders and what reduced or paused motion shows. */
export function dialStill(gaze: Gaze): PebbleView {
  return dialPebble(gaze).still();
}
