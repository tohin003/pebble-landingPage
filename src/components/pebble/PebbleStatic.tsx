// The pebble as zero-JavaScript inline SVG (a server component): the engine runs at build time and only the frame's
// markup reaches the page. For idle poses this is `engine.sample(1.0)`: eyes open, before the first blink. It is what
// visitors without JavaScript or with reduced motion see, and the exact frame PebbleLive continues from.
import type { CSSProperties } from "react";
import { staticView, type PoseId } from "@pebble/index";
import { PebbleSvg } from "./PebbleSvg";

export interface PebbleStaticProps {
  pose?: PoseId;
  /** width and height in px; without it the SVG fills its box (size it with CSS) */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function PebbleStatic({ pose = "idle", size, className, style }: PebbleStaticProps) {
  const { frame, motion } = staticView(pose);
  return <PebbleSvg frame={frame} motion={motion} still size={size} pose={pose} className={className} style={style} />;
}
