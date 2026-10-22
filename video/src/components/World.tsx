// <World> is the world-space layer of a <Camera>: its children are positioned absolutely in world units (one unit is
// one CSS px of the captured UI) and the whole layer is mapped to the frame with one 2D matrix. 2D only, never 3D or
// will-change: Chrome then paints images and text at their final scale, so punch-ins stay crisp.
//
// `depth` makes a parallax plane (R5 §5.9): 0.4 for a far background, 1 for the UI, 1.15 for a near foreground. A
// plane lines up with the others at the camera's reference pose and moves `depth` times as much away from it.
import type { CSSProperties, ReactNode } from "react";
import { planePose, worldMatrix } from "../motion/camera";
import { useCamera } from "./Camera";

export const World: React.FC<{ children: ReactNode; depth?: number; style?: CSSProperties }> = ({ children, depth = 1, style }) => {
  const cam = useCamera();
  const pose = planePose(cam.pose, cam.ref, depth);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        overflow: "visible",
        transformOrigin: "0 0",
        transform: worldMatrix(pose, cam.width, cam.height),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Absolutely positioned box in the enclosing coordinate space (world units inside <World>, px elsewhere). */
export const Place: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: ReactNode;
  style?: CSSProperties;
}> = ({ x, y, w, h, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>
);
