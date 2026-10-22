// Our own pointer (R5 §5.4): a black arrow with a white stroke, drawn here (never Apple's cursor art). It travels on
// gently arced minimum-jerk paths with Fitts-shaped durations (spec.ts cursorPathAt), dwells, presses (1 → 0.88 in
// 0.06 s, held 0.04 s, released on the snappy spring) and never draws rings or ripples. The click's effect on the UI
// starts on the click-down frame; the click sound peaks one frame later (timeline SFX).
//
// It lives in frame space so it keeps a readable size (4–7 % of the frame's height) while the camera zooms; with
// space="world" its path is in world units and follows the camera.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../motion/layout";
import { T2, cursorPathAt, cursorPressScale, ramp, sec, type CursorKey } from "../motion/spec";
import { useCamera } from "./Camera";

/** The arrow in a 24-unit box; its hotspot (the tip) is at HOTSPOT. */
const ARROW = "M3.6 2.4 L3.6 19.7 L8.05 15.45 L11.05 22.1 L14.15 20.75 L11.2 14.15 L17.35 14.15 Z";
const HOTSPOT = { x: 3.6, y: 2.4 };
const BOX = 24;
/** the arrow's drawn height as a share of its box */
const ARROW_SHARE = 0.82;

export interface CursorProps {
  /** arrival keys: positions in world units (space="world", default) or frame px (space="frame") */
  keys: readonly CursorKey[];
  /** click-down frames (local) */
  clicks?: readonly number[];
  space?: "world" | "frame";
  /** [from, to) local frame ranges when the pointer shows; it fades in and out over 0.15 s. Default: always. */
  visible?: readonly (readonly [number, number])[];
  /** the arrow's height in frame px (default: the layout's, FILM_SPEC §2: 56 px in 16:9, 52 px in the square) */
  size?: number;
}

export const Cursor: React.FC<CursorProps> = ({ keys, clicks = [], space = "world", visible, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const cam = useCamera();
  const p = cursorPathAt(frame, keys, fps);
  const at = space === "world" ? cam.toFrame(p) : p;
  const fade = sec(T2.cursorFade, fps);
  let opacity = 1;
  if (visible) {
    opacity = 0;
    for (const [from, to] of visible) {
      const v = Math.min(ramp(frame, from, fade), 1 - ramp(frame, to - fade, fade));
      opacity = Math.max(opacity, v);
    }
  }
  if (opacity <= 0.001) return null;
  const arrowPx = size ?? layout.cursor;
  const boxPx = arrowPx / ARROW_SHARE;
  const unit = boxPx / BOX;
  const press = cursorPressScale(frame, clicks, fps);
  return (
    <svg
      width={boxPx}
      height={boxPx}
      viewBox={`0 0 ${BOX} ${BOX}`}
      style={{
        position: "absolute",
        left: at.x - HOTSPOT.x * unit,
        top: at.y - HOTSPOT.y * unit,
        overflow: "visible",
        opacity: Math.min(1, opacity),
        transformOrigin: `${HOTSPOT.x * unit}px ${HOTSPOT.y * unit}px`,
        transform: press !== 1 ? `scale(${press.toFixed(4)})` : undefined,
        // the card shadow (R5 §8), scaled to the pointer
        filter: `drop-shadow(0 1px 2px rgba(19, 37, 27, 0.18)) drop-shadow(0 ${(0.25 * unit).toFixed(2)}px ${(1.4 * unit).toFixed(2)}px rgba(19, 37, 27, 0.22))`,
      }}
    >
      {/* black fill and a 3 px white border (FILM_SPEC §10): a 6 px stroke painted under the fill shows 3 px outside it */}
      <path d={ARROW} fill="#141815" stroke="#FFFFFF" strokeWidth={6 / unit} strokeLinejoin="round" strokeLinecap="round" paintOrder="stroke" />
    </svg>
  );
};

/** The click-down frame after the pointer arrives and dwells (R5 §5.4: 0.12–0.2 s of aim before a click). */
export const clickAfterArrival = (arrival: number, fps: number, dwell = 0.15) => arrival + sec(dwell, fps);
