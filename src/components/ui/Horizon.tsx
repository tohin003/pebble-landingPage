// The local ground a pebble stands on (DESIGN-LEXINGTON §3.9, PHILOSOPHY "One living thing"): one hand-drawn line,
// 1.35 px in --trail, faded at both ends, static (no wobble, no draw-on: the motion budget is the pebble's).
// Decorative: aria-hidden. A server component with no JavaScript; it also works inside client components.
//
//   <Horizon />                 a ground line as wide as its box, 12 px tall; the ground is its vertical middle, so
//                               place it 6 px below the point the pebble stands on (bottom: calc(var(--floor) - 6px)).
//   <Horizon variant={2} />     one of five hand-drawn lines (groundPaths.ts LINES): give each place its own.
//   <Horizon shape="arch" />    the permission dial's arch. Put it inside the dial's arch box (2R wide, R tall, the
//                               baseline at its bottom); it fills the box and runs its feet out on both sides.
import { ARCH, ARCH_VIEWBOX, LINES, LINE_VIEWBOX, type LineVariant } from "./groundPaths";
import styles from "./Horizon.module.css";

export type HorizonProps = Readonly<{
  shape?: "line" | "arch";
  variant?: LineVariant;
  className?: string;
}>;

export function Horizon({ shape = "line", variant = 0, className }: HorizonProps) {
  if (shape === "arch") {
    return (
      <svg
        className={`${styles.arch} ${className ?? ""}`}
        viewBox={ARCH_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        data-horizon="arch"
      >
        <path d={ARCH} className={styles.stroke} />
      </svg>
    );
  }
  return (
    <svg
      className={`${styles.line} ${className ?? ""}`}
      viewBox={LINE_VIEWBOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-horizon="line"
    >
      <path d={LINES[variant]} className={styles.stroke} />
    </svg>
  );
}
