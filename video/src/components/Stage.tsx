// The window world's stage (docs/FILM_SPEC.md §4): a rounded viewport into Pebble's real UI, with the window shadow,
// on the desktop ground. In 16:9 it sits right of the text column and bleeds off the right edge (left corners
// rounded); in the square it sits under the text band and bleeds off the bottom (top corners rounded). The camera
// works INSIDE the stage: a framing is a magnification m (frame px per UI CSS px) and a region of interest (ROI, CSS px
// of the captured window) whose centre sits at the stage's centre.
//
//   <Stage roi={{x: 215, y: 300, w: 455, h: 433}} m={2.2}
//          overlay={<Cursor space="world" keys={…} clicks={[990]} />}>
//     <UiStill name="held-unverified" />
//   </Stage>
//
// `children` are world-space (UI CSS px, the window's top-left at 0, 0) and clipped by the stage; `overlay` uses the
// same camera but is not clipped, so a pointer can travel in from outside the stage.
import type { ReactNode } from "react";
import type { CamKey, CamPose, Rect } from "../motion/camera";
import { useLayout } from "../motion/layout";
import { COLOR } from "../motion/spec";
import { Camera } from "./Camera";
import { World } from "./World";

/** The pose that puts a ROI's centre at the stage's centre at magnification m. */
export const roiPose = (roi: Rect, m: number): CamPose => ({ x: roi.x + roi.w / 2, y: roi.y + roi.h / 2, zoom: m });

export interface StageProps {
  /** the stage's visible rect, frame px (default: the layout's) */
  rect?: Rect;
  /** rounded corners (default: the layout's: "left" in 16:9, "top" in the square) */
  corners?: "left" | "top" | "all" | "none";
  radius?: number;
  /** a fixed framing: ROI (UI CSS px) and magnification … */
  roi?: Rect;
  m?: number;
  /** … or a pose, or camera keys (local frames) */
  pose?: CamPose;
  keys?: readonly CamKey[];
  /** the colour behind the UI (shows where a ROI runs past the capture) */
  background?: string;
  /** 0..1 scales the window shadow */
  shadow?: number;
  children: ReactNode;
  overlay?: ReactNode;
  style?: React.CSSProperties;
}

const radii = (corners: StageProps["corners"], r: number) =>
  corners === "left" ? `${r}px 0 0 ${r}px` : corners === "top" ? `${r}px ${r}px 0 0` : corners === "all" ? `${r}px` : "0";

export const Stage: React.FC<StageProps> = ({ rect, corners, radius, roi, m, pose, keys, background = "#F7F8F5", shadow = 1, children, overlay, style }) => {
  const L = useLayout();
  const r = rect ?? L.win.stage;
  const c = corners ?? L.win.stageCorners;
  const rad = radius ?? L.win.stageRadius;
  const p = pose ?? (roi && m ? roiPose(roi, m) : undefined);
  const viewport = { width: r.w, height: r.h };
  const rgb = COLOR.shadowRgb;
  const s = Math.max(0, shadow);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          borderRadius: radii(c, rad),
          overflow: "hidden",
          background,
          boxShadow: `0 0 0 1px rgba(${rgb}, ${(0.08 * s).toFixed(3)}), 0 2px 4px rgba(${rgb}, ${(0.06 * s).toFixed(3)}), 0 14px 36px rgba(${rgb}, ${(0.1 * s).toFixed(3)}), 0 44px 96px rgba(${rgb}, ${(0.14 * s).toFixed(3)})`,
          ...style,
        }}
      >
        <Camera pose={p} keys={keys} viewport={viewport} background={background}>
          <World>{children}</World>
        </Camera>
      </div>
      {overlay ? (
        <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, pointerEvents: "none" }}>
          <Camera pose={p} keys={keys} viewport={viewport} background="transparent" clip={false}>
            {overlay}
          </Camera>
        </div>
      ) : null}
    </>
  );
};
