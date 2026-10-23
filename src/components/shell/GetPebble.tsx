// The call to action, by platform (DESIGN §7): a Mac gets "Download for Mac", everyone else "Send yourself the link".
// Both are in the server HTML; html[data-platform] (set before first paint) shows one, so there is no flash and no
// hydration mismatch. With PEBBLE_RELEASE_STATE=soon there is no download at all (release.ts), and this renders
// nothing; keep a "View on GitHub" link next to it.
//
// Variants (DESIGN-LEXINGTON §6 Shared components):
//   primary   48 px, radius 8, the accent (getting Pebble is the accent's first job), Inter 500 16 px, no shadow. The
//             hero and the final call to action. A primary Download always has the honest line under it: render it
//             through <GetPebbleCluster> (src/components/ui), which keeps the button, its honest line and the facts
//             together, or put <HonestLine> right under it yourself.
//   small     36 px, radius 8, ink with --bg text, no icon: the header's.
//   compact   44 px, radius 8, the accent: the sticky call to action's.
//   ghost     the old name of small.
import { Icon } from "./icons";
import { cta } from "@/content/copy";
import type { ReleaseInfo } from "@/lib/release";
import { ShareLinkButton } from "./ShareLinkButton";
import styles from "./GetPebble.module.css";

export type GetPebbleVariant = "primary" | "small" | "compact" | "ghost";

export type GetPebbleProps = Readonly<{
  release: Pick<ReleaseInfo, "state" | "downloadUrl">;
  variant?: GetPebbleVariant;
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
  const look = variant === "ghost" ? "small" : variant;
  const cls = `${styles.button} ${styles[look]} ${block ? styles.block : ""} ${className ?? ""}`;
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
