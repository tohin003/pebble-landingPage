// The pebble for a page section, in one line: `<Pebble size={240} name="hero" />`. A server component: it renders the
// static SVG (zero JavaScript, no layout shift) and, unless `live={false}`, upgrades it to PebbleLive after first paint.
// Give the static and live pebble the same box: size it with `size` or with `className`, not with a parent's flex
// stretch alone. Both rest their eyes the same way (rest.ts), so the swap moves nothing.
import { PebbleLiveSlot } from "./PebbleLiveSlot";
import type { PebbleLiveProps } from "./PebbleLive";
import { PebbleStatic } from "./PebbleStatic";

export interface PebbleProps extends PebbleLiveProps {
  /** false: the static frame only (no JavaScript at all) */
  live?: boolean;
}

export function Pebble({ live = true, ...props }: PebbleProps) {
  const still = (
    <PebbleStatic pose={props.pose} restGaze={props.restGaze} size={props.size} className={props.className} style={props.style} />
  );
  if (!live) return still;
  return <PebbleLiveSlot {...props}>{still}</PebbleLiveSlot>;
}
