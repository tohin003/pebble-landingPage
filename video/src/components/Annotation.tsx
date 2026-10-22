// Film annotations (R5 §5.7, §5.8; critic C3). They are the film speaking, never the product: a drawn mark must sit
// OUTSIDE the UI it refers to, so nobody mistakes it for an interface element. Pass `avoid` (the UI's world rect) and
// an annotation that would overlap it throws, in Studio and in renders.
//
// - <CheckMark>: a check that draws on (stroke-dashoffset, 0.35 s, EASE.enter), in the accent colour.
// - <Ring>: a callout ring around a control, 3 px wide on screen, offset 8 px, radius = the control's + 8, drawn on
//   over 0.4 s and faded out over 0.2 s. At most one per shot, never pulsing.
// Both are drawn in frame space at a world position, so their stroke keeps its on-screen width while the camera zooms.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { intersects, type Point, type Rect } from "../motion/camera";
import { COLOR, EASE, T2, ramp, sec } from "../motion/spec";
import { useCamera } from "./Camera";

const CHECK_PATH = "M 7 26.5 L 19.5 38.5 L 45 11.5"; // in a 52-unit box

export interface CheckMarkProps {
  /** centre of the mark: world units (space="world", default) or frame px */
  at: Point;
  space?: "world" | "frame";
  /** the mark's size on screen, px */
  size: number;
  /** local frame the stroke starts drawing */
  drawAt: number;
  /** local frame it fades away (optional) */
  outAt?: number;
  color?: string;
  /** stroke width on screen, px (default size / 9) */
  stroke?: number;
  /** the UI's rect in world units: the mark must not touch it (critic C3) */
  avoid?: Rect;
}

const toScreen = (cam: ReturnType<typeof useCamera>, p: Point, space: "world" | "frame") => (space === "world" ? cam.toFrame(p) : p);

export const CheckMark: React.FC<CheckMarkProps> = ({ at, space = "world", size, drawAt, outAt, color = COLOR.accent, stroke, avoid }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCamera();
  const c = toScreen(cam, at, space);
  if (avoid) {
    const ui = cam.rectToFrame(avoid);
    const mine = { x: c.x - size / 2, y: c.y - size / 2, w: size, h: size };
    if (intersects(ui, mine)) throw new Error("CheckMark overlaps the UI it annotates (critic C3): move it outside the UI's bounds");
  }
  const p = ramp(frame, drawAt, sec(T2.drawCheck, fps), EASE.enter);
  const o = outAt === undefined ? 1 : 1 - ramp(frame, outAt, sec(T2.ringOut, fps), EASE.exit);
  if (p <= 0 || o <= 0) return null;
  const sw = ((stroke ?? size / 9) * 52) / size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      style={{ position: "absolute", left: c.x - size / 2, top: c.y - size / 2, overflow: "visible", opacity: o }}
    >
      <path
        d={CHECK_PATH}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

export interface RingProps {
  /** the control, world units */
  rect: Rect;
  /** the control's corner radius, world units */
  radius?: number;
  drawAt: number;
  outAt?: number;
  color?: string;
  /** on-screen stroke and offset, px */
  width?: number;
  offset?: number;
}

export const Ring: React.FC<RingProps> = ({ rect, radius = 8, drawAt, outAt, color = COLOR.accent, width = 3, offset = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = useCamera();
  const r = cam.rectToFrame(rect);
  const p = ramp(frame, drawAt, sec(T2.ringIn, fps), EASE.enter);
  const o = outAt === undefined ? 1 : 1 - ramp(frame, outAt, sec(T2.ringOut, fps), EASE.exit);
  if (p <= 0 || o <= 0) return null;
  const x = r.x - offset;
  const y = r.y - offset;
  const w = r.w + 2 * offset;
  const h = r.h + 2 * offset;
  const rr = radius * cam.pose.zoom + offset;
  return (
    <svg style={{ position: "absolute", left: x - width, top: y - width, overflow: "visible", opacity: o }} width={w + 2 * width} height={h + 2 * width}>
      <rect
        x={width}
        y={width}
        width={w}
        height={h}
        rx={rr}
        ry={rr}
        fill="none"
        stroke={color}
        strokeWidth={width}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};
