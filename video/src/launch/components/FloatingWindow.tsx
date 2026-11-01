// <FloatingWindow>: real UI floating on the stage (TREATMENT §4 "Real UI"): a rounded window (22 px at 1080p), a 1 px
// inner highlight above the picture, a deep soft shadow in the stage's ink, and the light the screen throws on the
// stage behind it. It enters tilted (rotateX 8°, rotateY −12°), rising out of a blur, and flattens as the action starts
// (`flattenAt`), on the camera ease. The content (a <ScreenZoom>, an image) is clipped to the rounded rectangle; it
// learns the window's size from context, so a ScreenZoom inside needs no size of its own.
//
//   <FloatingWindow rect={L.feature.media} at={0} flattenAt={0.8}>
//     <ScreenZoom src="launch/takes/RS4-07.mp4" … />
//   </FloatingWindow>
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, type Rect } from "../layout";
import { DUR, EASE, RGB, WINDOW, windowEdge, windowShadow } from "../tokens";
import { useWorld } from "../world";

export interface Tilt {
  rx: number;
  ry: number;
  rz?: number;
}

/** The size of the enclosing window's (or device screen's) content box, px (null outside one). */
export const WindowSizeContext = createContext<{ w: number; h: number } | null>(null);
export const useWindowSize = () => useContext(WindowSizeContext);

export interface FloatingWindowProps {
  /** the window's box on the stage, px (default: the layout's feature media box) */
  rect?: Rect;
  /** corner radius at 1080p (scaled by the layout) */
  radius?: number;
  /** entrance start, seconds; undefined: already in place */
  at?: number;
  /** the entrance: rise from below out of a blur (default), "scale" from 0.9, or "none" */
  enter?: "rise" | "scale" | "none";
  /** the tilt while it enters (default rotateX 8°, rotateY −12°) */
  tilt?: Tilt;
  /** the tilt it settles to (default flat) */
  rest?: Tilt;
  /** when the tilt starts to flatten, seconds (default: as the entrance ends) */
  flattenAt?: number;
  flattenDur?: number;
  /** exit start, seconds: falls back and fades (0.3 s) */
  exitAt?: number;
  /** shadow strength (1 = default) */
  shadow?: number;
  /** the screen's light on the stage behind it, 0..1 (0 = none) */
  spill?: number;
  /** extra scale (beat punches), about the window's centre */
  scale?: number;
  /** extra offset, px */
  offset?: { x: number; y: number };
  /** the window's own background under the picture */
  background?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  rect,
  radius = WINDOW.radius,
  at,
  enter = "rise",
  tilt = WINDOW.tilt,
  rest = { rx: 0, ry: 0, rz: 0 },
  flattenAt,
  flattenDur = DUR.flatten,
  exitAt,
  shadow = 1,
  spill = 0.6,
  scale = 1,
  offset = { x: 0, y: 0 },
  background = "#0B0F0D",
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const world = useWorld();
  const t = frame / fps;
  const r = rect ?? L.feature.media;
  const u = L.u;
  // the screen's light on the ground reads on the dark worlds only; in daylight the shadow carries the depth
  const spillK = world.dark ? spill : 0;

  const start = at ?? -10;
  const pin = enter === "none" ? 1 : EASE.enter(Math.max(0, Math.min(1, (t - start) / DUR.windowIn)));
  if (pin <= 0) return null;
  const fStart = flattenAt ?? start + DUR.windowIn * 0.8;
  const pf = EASE.camera(Math.max(0, Math.min(1, (t - fStart) / flattenDur)));
  const pex = exitAt === undefined ? 0 : EASE.exit(Math.max(0, Math.min(1, (t - exitAt) / 0.3)));
  if (pex >= 1) return null;

  const rx = lerp(tilt.rx, rest.rx, pf) + pex * 6;
  const ry = lerp(tilt.ry, rest.ry, pf);
  const rz = lerp(tilt.rz ?? 0, rest.rz ?? 0, pf);
  const dy = enter === "rise" ? (1 - pin) * 90 * u : 0;
  const sc = (enter === "scale" ? lerp(0.9, 1, pin) : lerp(0.97, 1, pin)) * scale * (1 - 0.04 * pex);
  const blur = enter === "none" ? 0 : (1 - pin) * 14 * u + pex * 6 * u;
  const opacity = Math.min(1, pin * 1.6) * (1 - pex);
  const rad = radius * u;

  return (
    <WindowSizeContext.Provider value={{ w: r.w, h: r.h }}>
      {spillK > 0 && (
        // the screen's light on the stage: a broad soft pool behind the window
        <div
          style={{
            position: "absolute",
            left: r.x - r.w * 0.25 + offset.x,
            top: r.y - r.h * 0.2 + offset.y + dy,
            width: r.w * 1.5,
            height: r.h * 1.4,
            background: `radial-gradient(closest-side, rgba(${RGB.sage}, ${(0.1 * spillK * opacity).toFixed(3)}), rgba(${RGB.sageDeep}, ${(0.12 * spillK * opacity).toFixed(3)}) 55%, rgba(${RGB.sageDeep}, 0) 100%)`,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: r.x + offset.x,
          top: r.y + offset.y + dy,
          width: r.w,
          height: r.h,
          perspective: WINDOW.perspective * u,
          opacity,
          filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined,
          ...style,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${sc.toFixed(5)})`,
            transformStyle: "preserve-3d",
            borderRadius: rad,
            boxShadow: windowShadow(shadow * world.shadeK, u, world.shade),
            background,
          }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: rad, overflow: "hidden", isolation: "isolate" }}>{children}</div>
          {/* the edge: a hairline and the top highlight, above the picture */}
          <div style={{ position: "absolute", inset: 0, borderRadius: rad, boxShadow: windowEdge(u), pointerEvents: "none" }} />
        </div>
      </div>
    </WindowSizeContext.Provider>
  );
};
