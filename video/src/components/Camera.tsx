// <Camera> computes the virtual camera for the current frame (motion/camera.ts) and shares it with everything inside:
// <World> applies it to world-space layers, and frame-space overlays (the cursor, annotations, captions) use
// useCamera().toFrame to follow world points without scaling with the world.
//
//   <Camera keys={[{at: 0, x: 600, y: 400, zoom: 1.25}, {at: 40, x: 690, y: 530, zoom: 2.7}]}>
//     <World><Desktop /><MacWindow …><UiStill name="held-unverified" /></MacWindow></World>
//     <Cursor space="world" keys={…} />
//   </Camera>
//
// Keys are local to the enclosing <Sequence>. Determinism: the pose is a pure function of the frame.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  cameraAt,
  checkCamKeys,
  clampPose,
  rectToFrame,
  toFrame,
  toWorld,
  type CamKey,
  type CamPose,
  type Point,
  type Rect,
} from "../motion/camera";

export interface CameraState {
  pose: CamPose;
  /** the pose every parallax plane lines up at (the first key by default) */
  ref: CamPose;
  width: number;
  height: number;
  toFrame: (p: Point) => Point;
  toWorld: (p: Point) => Point;
  rectToFrame: (r: Rect) => Rect;
}

const CameraContext = createContext<CameraState | null>(null);

/** The camera around this component, or an identity camera (world units = frame px) outside any <Camera>. */
export const useCamera = (): CameraState => {
  const ctx = useContext(CameraContext);
  const { width, height } = useVideoConfig();
  return useMemo(() => {
    if (ctx) return ctx;
    const pose = { x: width / 2, y: height / 2, zoom: 1 };
    return makeState(pose, pose, width, height);
  }, [ctx, width, height]);
};

function makeState(pose: CamPose, ref: CamPose, width: number, height: number): CameraState {
  return {
    pose,
    ref,
    width,
    height,
    toFrame: (p) => toFrame(p, pose, width, height),
    toWorld: (p) => toWorld(p, pose, width, height),
    rectToFrame: (r) => rectToFrame(r, pose, width, height),
  };
}

export interface CameraProps {
  /** arrival keys (motion/camera.ts CamKey), local to the enclosing Sequence */
  keys?: readonly CamKey[];
  /** a fixed pose instead of keys (style frames, stills) */
  pose?: CamPose;
  /** keep the view inside this world rect (for example the wallpaper), so the frame never shows past it */
  bounds?: Rect;
  /** the parallax reference (default: the first key or the fixed pose) */
  reference?: CamPose;
  /** what shows where no world layer is drawn (default: the riverbed's mid ground, never black) */
  background?: string;
  /** the camera's viewport size, px (default: the composition's); set it when the camera fills only part of the frame */
  viewport?: { width: number; height: number };
  /** clip to the viewport (default); false for overlays that may leave it (a pointer entering a stage) */
  clip?: boolean;
  children: ReactNode;
}

export const Camera: React.FC<CameraProps> = ({ keys, pose, bounds, reference, background = "#D3DDCD", viewport, clip = true, children }) => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const fps = config.fps;
  const width = viewport?.width ?? config.width;
  const height = viewport?.height ?? config.height;
  if (keys) {
    const problems = checkCamKeys(keys, fps);
    if (problems.length) throw new Error(`Invalid camera keys:\n  ${problems.join("\n  ")}`);
  }
  let p: CamPose = pose ?? (keys && keys.length ? cameraAt(frame, keys, fps, width) : { x: width / 2, y: height / 2, zoom: 1 });
  if (bounds) p = clampPose(p, bounds, width, height);
  const ref = reference ?? (keys && keys[0] ? keys[0] : p);
  const state = makeState(p, ref, width, height);
  return (
    <CameraContext.Provider value={state}>
      <AbsoluteFill style={{ overflow: clip ? "hidden" : "visible", backgroundColor: background }}>{children}</AbsoluteFill>
    </CameraContext.Provider>
  );
};
