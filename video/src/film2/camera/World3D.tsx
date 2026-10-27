// Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's film (film2/THIRD_PARTY_NOTICES.md).
// <World3D> and <Plane>: one world, with windows as planes in it (TREATMENT §5.3, CRAFT U01, U04, T07).
//
// - The desktop is one large plane; windows are places on it. The camera travels between them (motion/camera.ts).
// - Parallax: every plane has a depth factor (0.4 the far ground, 1 the UI, 1.15 a near layer). Planes line up at the
//   reference pose and move `depth` times as much away from it.
// - Tilt only Pebble's own windows, and only while travelling: rotateY ±8–20°, rotateX 4–12°, perspective 1,600–3,000
//   px, flattened to face-on before anything is read. A plane of kind "thirdParty" or "apple" refuses any tilt (Apple's
//   guidelines forbid tilting its products; third-party windows stay flat, 2D moves only).
// - A flat plane is drawn with a 2D matrix only, never a 3D context, so its text paints at its final scale and stays
//   crisp (the old World.tsx's rule, kept for every reading shot).
// - Depth of field: blur ∝ |depth − focus| (the thin-lens circle of confusion is linear in 1/distance, and the depth
//   factor is 1/distance up to a constant; HyperFrames rack-focus interpolates focus in dioptres for the same reason).
//   Only Pebble's own windows and the ground ever defocus, and a plane marked `reading` is never blurred.
// - Motion blur on the foreground only: a directional SVG Gaussian with σ = travel ÷ 7 from the plane's own screen
//   velocity; the ground (motionBlur false by default) never carries it.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAMERA, COLOR, SHADOW_WINDOW } from "../tokens";
import { planePose, poseMatrix, screenVelocity, type CamSample, type CamVel, type Pose } from "../motion/camera";
import { directionalSigma, hybridGapSigma } from "../motion/blur";
import { useHybridBlur } from "./MotionBlur";
import type { Rect } from "../motion/geometry";

export interface WorldCam {
  pose: Pose;
  /** the pose every parallax plane lines up at */
  ref: Pose;
  /** the camera's velocity on this frame (per frame), for motion blur; omit for a still camera */
  vel?: CamVel;
}

interface WorldCtx {
  cam: WorldCam;
  width: number;
  height: number;
  /** the depth factor in focus (1 = the UI plane) */
  focus: number;
  /** blur (px at 1080) per unit of |depth − focus| */
  dofScale: number;
  perspective: number;
}

const Ctx = createContext<WorldCtx | null>(null);
export const useWorld = (): WorldCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error("<Plane> must be inside <World3D>");
  return c;
};

export interface World3DProps {
  cam: WorldCam;
  /** depth factor in focus (default 1, the UI plane) */
  focus?: number;
  /** px of blur at 1080 per unit of depth difference: 20 puts the ground (0.4) at 12 px when the UI is in focus */
  dofScale?: number;
  /** perspective for tilted Pebble planes, frame px (1,600–3,000) */
  perspective?: number;
  /** what shows where no plane is drawn: the riverbed's mid ground, never black */
  background?: string;
  children: ReactNode;
}

export const World3D: React.FC<World3DProps> = ({ cam, focus = 1, dofScale = 20, perspective = 2200, background = COLOR.riverbedMid, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <Ctx.Provider value={{ cam, width, height, focus, dofScale, perspective }}>
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: background }}>{children}</AbsoluteFill>
    </Ctx.Provider>
  );
};

export type PlaneKind = "ground" | "pebble" | "thirdParty" | "apple" | "film";

export interface PlaneProps {
  /** world rect of the plane's content (world units); the ground may omit it and fill its own layout */
  rect?: Rect;
  depth?: number;
  kind: PlaneKind;
  /** degrees; only kind "pebble" may tilt */
  tilt?: { rx: number; ry: number };
  /** the viewer reads this plane now: never defocused, and it must be face-on */
  reading?: boolean;
  /** carry motion blur (default: every kind but the ground) */
  motionBlur?: boolean;
  /** the window shadow allowed inside a riverbed picture (DESIGN-LEXINGTON --shadow-window); default on for pebble */
  shadow?: boolean;
  radius?: number;
  opacity?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

const sanitize = (n: number) => String(Math.round(n * 1000)).replace("-", "m");

/** The plane's camera sample (pose and velocity at its depth). */
export const planeSample = (cam: WorldCam, depth: number): CamSample => {
  const pose = planePose(cam.pose, cam.ref, depth);
  const v = cam.vel ?? { x: 0, y: 0, lz: 0 };
  return { frame: 0, pose, vel: v, state: { x: pose.x, y: pose.y, lz: Math.log(pose.zoom) } };
};

export const Plane: React.FC<PlaneProps> = ({
  rect,
  depth = 1,
  kind,
  tilt,
  reading = false,
  motionBlur,
  shadow,
  radius = 10,
  opacity = 1,
  style,
  children,
}) => {
  const w = useWorld();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (tilt && (kind === "thirdParty" || kind === "apple") && (Math.abs(tilt.rx) > 1e-6 || Math.abs(tilt.ry) > 1e-6)) {
    throw new Error(`A ${kind} window never tilts (TREATMENT §5.3): 2D moves and parallax only`);
  }
  const sample = planeSample(w.cam, depth);
  const short = Math.min(w.width, w.height);
  // depth of field (never on a plane being read, never on third-party or Apple windows)
  const canDefocus = (kind === "pebble" || kind === "ground") && !reading;
  const dof = canDefocus ? (w.dofScale * Math.abs(depth - w.focus) * short) / 1080 : 0;
  // motion blur from this plane's own screen velocity at the frame's centre
  const blurOn = motionBlur ?? kind !== "ground";
  const hybrid = useHybridBlur();
  const v = screenVelocity(sample, { x: w.width / 2, y: w.height / 2 }, w.width, w.height, depth);
  const speed = Math.hypot(v.x, v.y);
  // inside a CameraMotionBlur window the samples carry the blur; a small directional blur fills their gaps
  const mb = !blurOn
    ? { sx: 0, sy: 0, sigma: 0 }
    : hybrid
      ? speed > 1e-6
        ? { sx: (hybridGapSigma(speed) * Math.abs(v.x)) / speed, sy: (hybridGapSigma(speed) * Math.abs(v.y)) / speed, sigma: hybridGapSigma(speed) }
        : { sx: 0, sy: 0, sigma: 0 }
      : directionalSigma(v, fps);
  const filterId = `f2mb-${sanitize(frame)}-${sanitize(depth)}-${rect ? sanitize(rect.x + rect.y * 7) : "g"}`;
  const filters: string[] = [];
  if (dof > 0.05) filters.push(`blur(${dof.toFixed(2)}px)`);
  if (mb.sigma > 0.05) filters.push(`url(#${filterId})`);
  const tilted = kind === "pebble" && tilt && (Math.abs(tilt.rx) > 0.01 || Math.abs(tilt.ry) > 0.01);
  const persp = w.perspective / sample.pose.zoom; // world units, so the on-screen perspective is `perspective` px
  const content = rect ? (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        borderRadius: kind === "ground" ? 0 : radius,
        overflow: "hidden",
        boxShadow: (shadow ?? kind === "pebble") ? SHADOW_WINDOW : undefined,
        transformOrigin: "50% 50%",
        transform: tilted ? `perspective(${persp.toFixed(1)}px) rotateX(${tilt!.rx.toFixed(3)}deg) rotateY(${tilt!.ry.toFixed(3)}deg)` : undefined,
        backfaceVisibility: "hidden",
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  ) : (
    <div style={{ position: "absolute", left: 0, top: 0, opacity, ...style }}>{children}</div>
  );
  return (
    <AbsoluteFill style={{ filter: filters.length ? filters.join(" ") : undefined }}>
      {mb.sigma > 0.05 ? (
        <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${mb.sx.toFixed(2)} ${mb.sy.toFixed(2)}`} />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          overflow: "visible",
          transformOrigin: "0 0",
          transform: poseMatrix(sample.pose, w.width, w.height),
        }}
      >
        {content}
      </div>
    </AbsoluteFill>
  );
};

/** Tilt for a Pebble window travelling with screen velocity v (px per frame): it leans into the move, within limits. */
export const tiltForTravel = (vx: number, vy: number, fps: number): { rx: number; ry: number } => {
  const k = fps / 60;
  const [ryMin, ryMax] = CAMERA.tilt.ryDeg;
  const [, rxMax] = CAMERA.tilt.rxDeg;
  const sx = Math.min(1, Math.abs(vx * k) / 30);
  const sy = Math.min(1, Math.abs(vy * k) / 30);
  const ry = sx === 0 ? 0 : -Math.sign(vx) * (ryMin + (ryMax - ryMin) * sx) * sx;
  const rx = sy === 0 ? 0 : Math.sign(vy) * rxMax * sy;
  return { rx, ry };
};
