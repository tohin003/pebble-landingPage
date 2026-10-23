// The line the pebble stands on (DESIGN-LEXINGTON §3.9: "the pebble always stands on a hand-drawn line"), as the page
// draws it under the hero's pebble: comp lex-A's path, a slight hand wobble across a 1000 × 12 box, stroked in --trail
// and faded to nothing over the first and last 12 % of its length. Static: no wobble, no draw-on (the motion budget
// belongs to the pebble). Frame px; `y` is the line's middle, where the pebble's foot rests.
import { useId } from "react";
import { PAGE } from "./page";

const PATH = "M0 6.6C70 5.4 150 7.2 230 6.4S390 5.3 470 6S560 6.2 640 6.1S800 7.3 880 6.4S960 5.6 1000 6.2";

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
      viewBox="0 0 1000 12"
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
