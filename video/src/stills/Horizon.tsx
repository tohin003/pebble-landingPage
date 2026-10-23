// The line the pebble stands on (DESIGN-LEXINGTON §3.9: "the pebble always stands on a hand-drawn line"), as the page
// draws it under the hero's pebble: the site's own path data (src/components/ui/groundPaths.ts, pure data; the hero
// draws LINES[0], so the Open Graph card stands the pebble on the hero's very line), a slight hand wobble across a
// 1000 × 12 box, stroked in --trail and faded to nothing over the first and last 12 % of its length (the site's mask in
// Horizon.module.css). Static: no wobble, no draw-on (the motion budget belongs to the pebble). Frame px; `y` is the
// line's middle, where the pebble's foot rests.
import { useId } from "react";
import { LINES, LINE_VIEWBOX } from "../../../src/components/ui/groundPaths";
import { PAGE } from "./page";

/** the hero's ground (src/components/sections/Hero.tsx: `<Horizon variant={0} />`) */
const PATH = LINES[0];

export const Horizon: React.FC<{ x: number; y: number; width: number; stroke?: number; color?: string }> = ({
  x,
  y,
  width,
  stroke = 1.35,
  color = PAGE.trail,
}) => {
  const id = `fade-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={width}
      height={12}
      viewBox={LINE_VIEWBOX}
      preserveAspectRatio="none"
      style={{ position: "absolute", left: x, top: y - 6, overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.12" stopColor={color} />
          <stop offset="0.88" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={PATH} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
