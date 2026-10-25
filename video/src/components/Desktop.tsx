// The desktop world (DESIGN.md §1, §6): comp 2's original "riverbed" wallpaper (speckled sage stones lit from the upper
// left) covering a 1600 × 1000 world (a Mac screen of that many points), with an optional plain menu bar. No Apple
// artwork: no Apple logo, no system wallpaper, no system icons.
//
// The wallpaper's own vignette is removed (video/public/desktop/riverbed-light.svg): the film's <Vignette> lives in
// frame space, so it does not zoom with the camera. A 3× raster (RiverbedPlate) is used when it exists; otherwise the
// SVG itself is drawn, which is correct but slower (its feTurbulence grain re-rasterises at every new scale).
import type { CSSProperties } from "react";
import { Img, getStaticFiles, staticFile } from "remotion";
import { FONT } from "../fonts";
import type { Rect } from "../motion/camera";

/** The desktop's world rect (points). Windows and the pet are placed in these coordinates. */
export const DESKTOP: Rect = { x: 0, y: 0, w: 1600, h: 1000 };
export const MENUBAR_HEIGHT = 26;

export const RIVERBED = {
  svg: "desktop/riverbed-light.svg",
  raster: "desktop/riverbed-light@3x.png",
  /** the dark plate (capture/riverbed-plate.mjs: the page's night-green wallpaper without its vignette; gitignored) */
  darkRaster: "desktop/riverbed-dark@3x.png",
  darkGround: "#29312B",
  /** the ground colours of the wallpaper's own gradient (comp 2 wallpaper.py), lit top-left to lower-right */
  ground: { g0: "#E7ECE2", g1: "#D3DDCD", g2: "#C6D3C0" },
} as const;

const hasStatic = (path: string) => {
  try {
    return getStaticFiles().some((f) => f.name === path);
  } catch {
    return false;
  }
};

export interface DesktopProps {
  /** world rect the wallpaper covers (default DESKTOP) */
  rect?: Rect;
  /** a plain menu bar along the top (app name in bold, then the usual menus; no Apple logo) */
  menubar?: boolean;
  /** the menu bar's clock text, if any */
  clock?: string;
  /** the dark riverbed (the trailer's cold open) */
  dark?: boolean;
  style?: CSSProperties;
}

export const Desktop: React.FC<DesktopProps> = ({ rect = DESKTOP, menubar = false, clock, dark = false, style }) => {
  const src = dark ? (hasStatic(RIVERBED.darkRaster) ? RIVERBED.darkRaster : null) : hasStatic(RIVERBED.raster) ? RIVERBED.raster : RIVERBED.svg;
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: dark ? RIVERBED.darkGround : `linear-gradient(135deg, ${RIVERBED.ground.g0} 0%, ${RIVERBED.ground.g1} 55%, ${RIVERBED.ground.g2} 100%)`,
        }}
      />
      {src ? <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: rect.w, height: rect.h, objectFit: "cover" }} /> : null}
      {menubar ? <MenuBar width={rect.w} clock={clock} /> : null}
    </div>
  );
};

const MENUS = ["File", "Edit", "View", "Window", "Help"] as const;

/** A plain, translucent menu bar in world units (the comp 2 hero's): the app's name, its menus, an optional clock. */
export const MenuBar: React.FC<{ width: number; clock?: string; app?: string }> = ({ width, clock, app = "Pebble" }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width,
      height: MENUBAR_HEIGHT,
      display: "flex",
      alignItems: "center",
      gap: 19,
      padding: "0 18px",
      boxSizing: "border-box",
      background: "rgba(248, 249, 246, 0.62)",
      color: "rgba(37, 44, 40, 0.86)",
      fontFamily: FONT.sans,
      fontSize: 12.5,
      fontWeight: 500,
      letterSpacing: "-0.005em",
    }}
  >
    <span style={{ fontWeight: 700 }}>{app}</span>
    {MENUS.map((m) => (
      <span key={m}>{m}</span>
    ))}
    {clock ? <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{clock}</span> : null}
  </div>
);
