// <Device>: a clean, generic iPhone to hold the real Pebble Remote recordings (Simulator takes). It is a device frame
// drawn in CSS (a graphite band, the black bezel, a Dynamic Island pill, the side buttons), never Pebble's UI and never
// Apple artwork. The screen clips its children to the display's rounded corners and tells a <ScreenZoom> inside its
// size, so a recording fills the display exactly:
//
//   <Device at={0.2}>
//     <ScreenZoom src="launch/remote/approve.mp4" srcSize={{ w: 1206, h: 2622 }} />
//   </Device>
//
// It enters like a window (a rise out of a blur, tilted) and flattens; `tilt`/`rest` turn it in 3D.
import type { ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, type Pt } from "../layout";
import { DUR, EASE, WINDOW } from "../tokens";
import { useWorld } from "../world";
import { WindowSizeContext, type Tilt } from "./FloatingWindow";

export interface DeviceProps {
  /** the device's centre, px (default: the layout's device centre) */
  centre?: Pt;
  /** the device's height, px (default: the layout's) */
  height?: number;
  /** the display's aspect, width ÷ height (default 393 ÷ 852, a 6.1-inch iPhone with a Dynamic Island) */
  screenAspect?: number;
  /** entrance start, seconds (undefined: in place) */
  at?: number;
  tilt?: Tilt;
  rest?: Tilt;
  flattenAt?: number;
  exitAt?: number;
  /** the Dynamic Island pill (default on) */
  island?: boolean;
  /** extra scale (beat punches) */
  scale?: number;
  /** the display's background under the content */
  screenBackground?: string;
  children?: ReactNode;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const Device: React.FC<DeviceProps> = ({
  centre,
  height,
  screenAspect = 393 / 852,
  at,
  tilt = { rx: 6, ry: -14, rz: 0 },
  rest = { rx: 0, ry: 0, rz: 0 },
  flattenAt,
  exitAt,
  island = true,
  scale = 1,
  screenBackground = "#000",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const world = useWorld();
  const SHADE = world.shade;
  const sk = world.shadeK;
  const t = frame / fps;
  const c = centre ?? L.device.centre;
  const H = height ?? L.device.h;

  // proportions of a 6.1-inch phone: the band and bezel around a 393 × 852 display
  const band = H * 0.0075; // the graphite band seen from the front
  const bezel = H * 0.0115; // the black glass border
  const sh = H - 2 * (band + bezel);
  const sw = sh * screenAspect;
  const W = sw + 2 * (band + bezel);
  const outerR = W * 0.163;
  const screenR = outerR - band - bezel * 0.85;

  const start = at ?? -10;
  const pin = EASE.enter(Math.max(0, Math.min(1, (t - start) / DUR.windowIn)));
  if (pin <= 0) return null;
  const pf = EASE.camera(Math.max(0, Math.min(1, (t - (flattenAt ?? start + DUR.windowIn * 0.8)) / DUR.flatten)));
  const pex = exitAt === undefined ? 0 : EASE.exit(Math.max(0, Math.min(1, (t - exitAt) / 0.3)));
  if (pex >= 1) return null;
  const rx = lerp(tilt.rx, rest.rx, pf);
  const ry = lerp(tilt.ry, rest.ry, pf);
  const rz = lerp(tilt.rz ?? 0, rest.rz ?? 0, pf);
  const dy = (1 - pin) * 110 * L.u;
  const blur = (1 - pin) * 14 * L.u + pex * 6 * L.u;
  const sc = lerp(0.96, 1, pin) * scale * (1 - 0.04 * pex);

  const button = (side: "left" | "right", top: number, len: number) => (
    <div
      style={{
        position: "absolute",
        [side]: -W * 0.011,
        top: H * top,
        width: W * 0.016,
        height: H * len,
        borderRadius: W * 0.01,
        background: "linear-gradient(90deg, #2b2f2d, #5b605d 45%, #2a2e2c)",
      }}
    />
  );

  return (
    <div
      style={{
        position: "absolute",
        left: c.x - W / 2,
        top: c.y - H / 2 + dy,
        width: W,
        height: H,
        perspective: WINDOW.perspective * L.u,
        opacity: Math.min(1, pin * 1.6) * (1 - pex),
        filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${sc.toFixed(5)})`,
        }}
      >
        {button("left", 0.165, 0.042)}
        {button("left", 0.245, 0.075)}
        {button("left", 0.335, 0.075)}
        {button("right", 0.27, 0.11)}
        {/* the band: graphite, lit from the top left */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: outerR,
            background: "linear-gradient(140deg, #6a6f6c 0%, #2c302e 22%, #1b1e1d 50%, #2a2e2c 78%, #5d625f 100%)",
            boxShadow: [
              `0 ${2 * L.u}px ${4 * L.u}px rgba(${SHADE}, ${(0.4 * sk).toFixed(3)})`,
              `0 ${30 * L.u}px ${70 * L.u}px rgba(${SHADE}, ${(0.55 * sk).toFixed(3)})`,
              `0 ${80 * L.u}px ${150 * L.u}px -${20 * L.u}px rgba(${SHADE}, ${(0.65 * sk).toFixed(3)})`,
            ].join(", "),
          }}
        />
        {/* the black glass */}
        <div
          style={{
            position: "absolute",
            inset: band,
            borderRadius: outerR - band,
            background: "#030404",
            boxShadow: `inset 0 0 0 ${Math.max(1, 0.8 * L.u)}px rgba(255, 255, 255, 0.07)`,
          }}
        />
        {/* the display */}
        <div
          style={{
            position: "absolute",
            left: band + bezel,
            top: band + bezel,
            width: sw,
            height: sh,
            borderRadius: screenR,
            overflow: "hidden",
            background: screenBackground,
            isolation: "isolate",
          }}
        >
          <WindowSizeContext.Provider value={{ w: sw, h: sh }}>{children}</WindowSizeContext.Provider>
          {island && (
            <div
              style={{
                position: "absolute",
                left: sw / 2 - sw * 0.16,
                top: sw * 0.028,
                width: sw * 0.32,
                height: sw * 0.094,
                borderRadius: sw * 0.047,
                background: "#000",
              }}
            />
          )}
          {/* a faint sheen on the glass, from the top left */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(125deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 28%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};
