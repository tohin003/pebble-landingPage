// The pebble as zero-JavaScript inline SVG (a server component): the engine runs at build time and only the frame's
// markup reaches the page. For idle poses this is `engine.sample(1.0)`: eyes open, before the first blink. It is what
// visitors without JavaScript or with reduced motion see, and the exact frame PebbleLive continues from. The eyes rest
// straight ahead (rest.ts, DESIGN §9) unless `restGaze` says otherwise; the sleepy pose keeps its own. With `stealth`,
// the still frame wears the Veil's settled look (on: the dusk glass and light rim; off: the plain pebble).
import type { CSSProperties } from "react";
import { staticView, type Gaze, type PoseId } from "@pebble/index";
import { veilEnd } from "@pebble/veil";
import { PebbleSvg } from "./PebbleSvg";
import { restFor } from "./rest";

export interface PebbleStaticProps {
  pose?: PoseId;
  /** where the eyes rest (default: straight ahead; null: the pose's own direction) */
  restGaze?: Gaze | null;
  /** width and height in px; without it the SVG fills its box (size it with CSS) */
  size?: number;
  /** Stealth Lockdown's Veil, settled (absent: no Veil and no data-stealth) */
  stealth?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PebbleStatic({ pose = "idle", restGaze, size, stealth, className, style }: PebbleStaticProps) {
  const { frame, motion } = staticView(pose, restFor(pose, restGaze));
  const veil = stealth === undefined ? undefined : veilEnd(stealth);
  return <PebbleSvg frame={frame} motion={motion} still size={size} pose={pose} veil={veil} className={className} style={style} />;
}
