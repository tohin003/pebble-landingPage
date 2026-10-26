// The riverbed ground's extent and depth, read by the picture and by the coverage check alike (CR-02): PieceView draws
// the Riverbed at RIVERBED.w × RIVERBED.h world units, centred on the shot's `ref`, on a parallax plane at
// RIVERBED.depth; setpieces/qa.ts groundCoverage() requires the frame's four corners to stay inside that rect on every
// frame. Where nothing is drawn the world shows the flat riverbedMid colour, so a corner outside the rect shows the
// image's straight edge and a flat band (the review saw it for about 7 s in the wall). Pure.
import { CAMERA } from "../tokens";
import type { Pose } from "../motion/camera";
import type { Rect } from "../motion/geometry";

/** The riverbed's size (world units of its plane at the ref pose; the image is 1.6:1) and its parallax depth. */
export const RIVERBED = { w: 3400, h: 3400 / 1.6, depth: CAMERA.depthFactor.ground } as const;

/** The riverbed's rect in its plane's world units, for a shot whose parallax planes line up at `ref`. */
export const riverbedRect = (ref: Pose): Rect => ({ x: ref.x - RIVERBED.w / 2, y: ref.y - RIVERBED.h / 2, w: RIVERBED.w, h: RIVERBED.h });
