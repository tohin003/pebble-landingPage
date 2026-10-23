// The honest line under every primary Download (OVERRIDES §2; PHILOSOPHY principle 3, "the limit sits beside the
// promise"): the three trust limits in the same voice, then "Read the limits ›". Muted ink, 14 px; never smaller than
// the facts beside it.
import type { CSSProperties, MouseEventHandler } from "react";
import { hero, honestLimits } from "@/content/copy";
import { sectionHref } from "@/lib/sections";
import { TextLink } from "./TextLink";
import styles from "./GetPebbleCluster.module.css";

export function HonestLine({
  className,
  style,
  macOnly,
  onNavigate,
}: {
  className?: string;
  style?: CSSProperties;
  /** show it only where the Mac download shows (the menu sheet) */
  macOnly?: boolean;
  /** client components only: called when "Read the limits" is followed (the menu sheet closes) */
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <p className={`${styles.honest} ${macOnly ? "only-mac" : ""} ${className ?? ""}`} style={style}>
      {hero.honestLine}{" "}
      <TextLink href={sectionHref("limits")} onClick={onNavigate}>
        {honestLimits.shortLink}
      </TextLink>
    </p>
  );
}
