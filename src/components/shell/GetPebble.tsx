// The call to action, by platform (DESIGN §7): a Mac gets "Download for Mac", everyone else "Send yourself the link".
// Both are in the server HTML; html[data-platform] (set before first paint) shows one, so there is no flash and no
// hydration mismatch. With PEBBLE_RELEASE_STATE=soon there is no download at all (release.ts), and this renders
// nothing; keep a "View on GitHub" link next to it.
//
// Used by the header (ghost), the hero and the final call to action (primary) and the sticky CTA (compact). The
// facts list and the honest line under a primary button belong to the section that shows it.
import { Icon } from "./icons";
import { cta } from "@/content/copy";
import type { ReleaseInfo } from "@/lib/release";
import { ShareLinkButton } from "./ShareLinkButton";
import styles from "./GetPebble.module.css";

export type GetPebbleProps = Readonly<{
  release: Pick<ReleaseInfo, "state" | "downloadUrl">;
  variant?: "primary" | "ghost" | "compact";
  /** visible label on a Mac (default "Download for Mac") */
  macLabel?: string;
  /** visible label elsewhere (default "Send yourself the link") */
  otherLabel?: string;
  /** stretch to the container's width (phones) */
  block?: boolean;
  className?: string;
}>;

export function GetPebble({ release, variant = "primary", macLabel = cta.download, otherLabel = cta.nonMac.share, block, className }: GetPebbleProps) {
  if (release.state !== "live") return null;
  const cls = `${styles.button} ${styles[variant]} ${block ? styles.block : ""} ${className ?? ""}`;
  return (
    <>
      <a className={`${cls} only-mac`} href={release.downloadUrl} data-cta="download">
        <Icon name="DownloadSimple" className={styles.icon} />
        <span>{macLabel}</span>
      </a>
      <ShareLinkButton className={`${cls} only-other`} iconClassName={styles.icon} label={otherLabel} />
    </>
  );
}
