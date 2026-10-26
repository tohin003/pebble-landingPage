// <ForegroundMotionBlur>: true temporal motion blur for the foreground during fast camera moves (TOOLS_TESTS §2.4:
// adopt CameraMotionBlur at 8 samples and a 180° shutter, on the foreground layer only). Use it for zooms, dives and
// pull-backs, where the screen speed grows toward the frame's edges and a directional blur from the centre's velocity
// would be zero; for lateral moves <Plane>'s directional σ = travel ÷ 7 is enough and costs nothing.
//
// - Inside the window, <Plane>s switch to the hybrid's small gap-filling blur (σ = travel ÷ 55): CameraMotionBlur's
//   samples plus that blur were measured smooth with colours intact (CRAFT §5.4).
// - CameraMotionBlur renders its children at fractional frames (from 0.5 to 0.94 of a frame ahead). Switch it on and off
//   only where the camera is nearly still (≤ 1 px a frame), so the switch never shows that offset as a jump; qa checks
//   the windows' ends with blurWindowEdges().
// - It multiplies the subtree eight times: keep type, SplitText and anything heavy outside it.
import { CameraMotionBlur } from "@remotion/motion-blur";
import { createContext, useContext, type ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { CAMERA_BLUR } from "../motion/blur";

const HybridCtx = createContext(false);
/** True inside an active <ForegroundMotionBlur>: planes then use the hybrid's σ = travel ÷ 55. */
export const useHybridBlur = (): boolean => useContext(HybridCtx);

export interface BlurWindow {
  /** local frames, [from, to) */
  from: number;
  to: number;
}

export const ForegroundMotionBlur: React.FC<{ windows: readonly BlurWindow[]; children: ReactNode }> = ({ windows, children }) => {
  const frame = useCurrentFrame();
  const on = windows.some((w) => frame >= w.from && frame < w.to);
  if (!on) return <>{children}</>;
  return (
    <HybridCtx.Provider value={true}>
      <CameraMotionBlur samples={CAMERA_BLUR.samples} shutterAngle={CAMERA_BLUR.shutterAngle}>
        {children}
      </CameraMotionBlur>
    </HybridCtx.Provider>
  );
};
