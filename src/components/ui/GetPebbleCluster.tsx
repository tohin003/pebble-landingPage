// The primary call to action as one unit, so the honest line can never be left out (OVERRIDES §2; PHILOSOPHY
// principle 3): the row (the accent Download, then "View on GitHub ›"), the download notice after a click, the non-Mac
// line, the honest line, the release facts and, if asked, "Or install in one line ›". Left-aligned on the grid.
//
//   <GetPebbleCluster release={release} />                      the hero
//   <GetPebbleCluster release={release} install headingLevel={3} />   the final call to action
//   <GetPebbleCluster release={release} reveal={3} />           with the hero's one-time CSS reveal, staggered from 3
//
// On phones the Download is full width and "View on GitHub ›" sits under it, centred.
import type { CSSProperties } from "react";
import { cta } from "@/content/copy";
import { GetPebble } from "@/components/shell/GetPebble";
import type { ReleaseInfo } from "@/lib/release";
import { sectionHref } from "@/lib/sections";
import { DownloadNotice } from "./DownloadNotice";
import { HonestLine } from "./HonestLine";
import { ReleaseFacts } from "./ReleaseFacts";
import { TextLink } from "./TextLink";
import styles from "./GetPebbleCluster.module.css";

export type GetPebbleClusterProps = Readonly<{
  release: ReleaseInfo;
  /** the release facts under the honest line (default true) */
  facts?: boolean;
  /** "Or install in one line ›" at the end (default false) */
  install?: boolean;
  /** the download notice's heading level: 2 in the hero, 3 inside a section with its own H2 */
  headingLevel?: 2 | 3;
  /** stagger index for the hero's CSS reveal (globals.css .reveal); omit for no reveal */
  reveal?: number;
  className?: string;
}>;

export function GetPebbleCluster({ release, facts = true, install = false, headingLevel = 2, reveal, className }: GetPebbleClusterProps) {
  const live = release.state === "live";
  const rv = reveal === undefined ? "" : "reveal";
  const at = (step: number): CSSProperties | undefined => (reveal === undefined ? undefined : ({ "--i": reveal + step } as CSSProperties));
  return (
    <div className={`${styles.cluster} ${className ?? ""}`}>
      <DownloadNotice className={`${styles.row} ${rv}`} style={at(0)} headingLevel={headingLevel}>
        <GetPebble release={release} variant="primary" className={styles.primary} />
        <TextLink href={release.repoUrl} className={styles.github}>
          {cta.github}
        </TextLink>
      </DownloadNotice>
      <p className={`only-other ${styles.notice} ${rv}`} style={at(1)}>
        {cta.nonMac.notice}
      </p>
      {live ? <HonestLine className={rv} style={at(1)} /> : null}
      {live && facts ? <ReleaseFacts release={release} className={`${styles.facts} ${rv}`} style={at(2)} /> : null}
      {live && install ? (
        <p className={`only-mac ${styles.install} ${rv}`} style={at(3)}>
          <TextLink href={sectionHref("install")}>{cta.installLink}</TextLink>
        </p>
      ) : null}
    </div>
  );
}
