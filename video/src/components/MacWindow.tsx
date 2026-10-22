// A Mac window frame for a captured UI (DESIGN.md §6, critic H6): rounded corners, a hairline edge, film-scale
// tinted shadows (R5 §8) and the traffic lights as plain circles (no glyphs, no Apple artwork). Pebble's main window
// uses an overlay title bar (tauri.conf.json: titleBarStyle "Overlay", hiddenTitle), so the lights sit over the
// sidebar's top-left corner and the capture already leaves room for them. Everything is in world units.
import type { CSSProperties, ReactNode } from "react";
import { COLOR, LOOK } from "../motion/spec";

export interface MacWindowProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** corner radius in world units */
  radius?: number;
  /** "color": muted red, yellow, green; "quiet": three neutral circles (an unfocused window, the site's poster); "none" */
  lights?: "color" | "quiet" | "none";
  /** 0..1, scales the window shadow (1 = R5's film-scale window shadow) */
  shadow?: number;
  /** the window's own background (Pebble's main window: #f7f8f5) */
  background?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/** Centres of the three lights from the window's top-left corner, and their diameter (world units). */
export const LIGHTS = { y: 20, x: [20, 40, 60], d: 12 } as const;

export const windowShadow = (k: number) => {
  const s = Math.max(0, k);
  const rgb = COLOR.shadowRgb;
  return [
    `0 0 0 1px rgba(${rgb}, ${(0.1 * Math.min(1, s * 1.5)).toFixed(3)})`,
    `0 2px 4px rgba(${rgb}, ${(0.06 * s).toFixed(3)})`,
    `0 14px 36px rgba(${rgb}, ${(0.12 * s).toFixed(3)})`,
    `0 44px 96px rgba(${rgb}, ${(0.16 * s).toFixed(3)})`,
  ].join(", ");
};

export const MacWindow: React.FC<MacWindowProps> = ({
  x,
  y,
  width,
  height,
  radius = 12,
  lights = "color",
  shadow = 1,
  background = "#F7F8F5",
  children,
  style,
}) => {
  const fills =
    lights === "color"
      ? [LOOK.traffic.close, LOOK.traffic.minimize, LOOK.traffic.zoom]
      : ["rgba(19, 37, 27, 0.16)", "rgba(19, 37, 27, 0.16)", "rgba(19, 37, 27, 0.16)"];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        borderRadius: radius,
        background,
        boxShadow: windowShadow(shadow),
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden" }}>{children}</div>
      {lights !== "none"
        ? LIGHTS.x.map((cx, i) => (
            <div
              key={cx}
              style={{
                position: "absolute",
                left: cx - LIGHTS.d / 2,
                top: LIGHTS.y - LIGHTS.d / 2,
                width: LIGHTS.d,
                height: LIGHTS.d,
                borderRadius: "50%",
                background: fills[i],
                boxShadow: lights === "color" ? `inset 0 0 0 0.5px ${LOOK.traffic.edge}` : undefined,
              }}
            />
          ))
        : null}
      {/* a faint inner highlight along the top edge, as on a real window */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          boxShadow: "inset 0 0.5px 0 rgba(255, 255, 255, 0.7)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
