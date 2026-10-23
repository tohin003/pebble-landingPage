// The pebble's ground, as path data (DESIGN-LEXINGTON §3.9): the line stops wandering the page's margins and becomes
// local ground, drawn only where something stands or moves on it (the hero, the story rail, the permission dial, the
// footer). Pure data, no React: Horizon.tsx draws it, ui.test.ts checks it.
//
// LINES are drawn in a 1000 × 12 box that is stretched to the width it is given (preserveAspectRatio="none"; the
// stroke keeps 1.35 px through vector-effect: non-scaling-stroke). Each wanders about ±1 px around y = 6, slowly: the
// hand-drawn feel of comp 3's path without its sine wobble (the line is static: the motion budget is the pebble's).
// The ground runs through the box's vertical middle, so place a Horizon 6 px below the point a pebble stands on.
//
// The ARCH is the permission dial's: a circle of radius 100 around (0, 100), from 172° over the top to 8°, with a
// soft foot on each side that lands on the baseline (y = 100) and runs out to ±152. Its box (ARCH_VIEWBOX) is the
// dial's arch box (2R wide, R tall) grown by 26 % on each side and 4 % at the top and bottom: Horizon.module.css
// places it with exactly those percentages, so the knobs (positioned in CSS on the same circle) sit on the line.

export const LINE_VIEWBOX = "0 0 1000 12";

/** Hand-drawn ground lines, from comps lex-A and lex-B. Pick one per place, so no two grounds are the same. */
export const LINES = [
  "M0 6.6C70 5.4 150 7.2 230 6.4S390 5.3 470 6S560 6.2 640 6.1S800 7.3 880 6.4S960 5.6 1000 6.2",
  "M0 6.2C90 5.6 170 6.8 260 6.1S420 5.5 500 6.1S660 6.8 740 6S900 5.5 1000 6.3",
  "M0 6.1C110 6.9 200 5.4 300 6.2S460 6.6 560 6S760 5.5 860 6.3S960 6.4 1000 6",
  "M0 6.4C80 5.5 160 7.1 250 6.3S410 5.4 500 6S600 6.1 690 6.2S850 7.1 930 6.3S980 5.9 1000 6.1",
  "M0 6.2C120 5.5 240 6.9 360 6.1S600 5.6 720 6.2S900 6.6 1000 6",
] as const;

export type LineVariant = 0 | 1 | 2 | 3 | 4;

export const ARCH_RADIUS = 100;
export const ARCH_VIEWBOX = "-152 -4 304 108";
/** where the arch leaves its feet and joins the circle (degrees from the right, counter-clockwise) */
export const ARCH_FROM_DEG = 172;
export const ARCH_TO_DEG = 8;

const round = (v: number) => Math.round(v * 100) / 100;

/** A point on the dial's circle at `deg` (0° to the right, 90° at the top), in the arch's units. */
export function archPoint(deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [round(Math.cos(r) * ARCH_RADIUS), round(ARCH_RADIUS - Math.sin(r) * ARCH_RADIUS)];
}

function archPath(): string {
  const [bx, by] = archPoint(ARCH_FROM_DEG); // the left join, about (-99.03, 86.08)
  const [ex, ey] = archPoint(ARCH_TO_DEG); // the right join, mirrored
  // The tangent at the joins: straight up the circle, leaning in. The foot's last control point sits 8 units back
  // along it, so the foot runs into the circle without a corner.
  const r = (ARCH_FROM_DEG * Math.PI) / 180;
  const tx = Math.sin(r) * 8;
  const ty = Math.cos(r) * 8; // negative: up
  return [
    "M-152 100.4",
    "C-141 100.2 -129 99.8 -118 99.6",
    `C-110 99.6 ${round(bx - tx)} ${round(by - ty)} ${bx} ${by}`,
    `A${ARCH_RADIUS} ${ARCH_RADIUS} 0 0 1 ${ex} ${ey}`,
    `C${round(ex + tx)} ${round(ey - ty)} 110 99.6 118 99.6`,
    "C128 99.8 140 100.3 152 100.1",
  ].join("");
}

export const ARCH = archPath();
