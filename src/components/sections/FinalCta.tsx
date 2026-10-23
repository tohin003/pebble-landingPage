// Section 15, the final call to action (DESIGN §5 row 15). Centred and calm: "Say hi to Pebble.", the platform's call
// to action (GetPebble: Download on a Mac, "Send yourself the link" elsewhere), the release facts as a list, the short
// honest line next to the download (OVERRIDES §2) and the way to the one-line install. The footer below holds the
// sleeping pebble where the line ends. The line sweeps across in the gap above the section (a "cross" anchor).
import { cta, finalCta, hero, honestLimits } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { GetPebble } from "@/components/shell/GetPebble";
import { getRelease, releaseFacts } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import styles from "./FinalCta.module.css";

export async function FinalCta() {
  const release = await getRelease();
  const live = release.state === "live";
  return (
    <section id={SECTIONS.finalCta} className={`section ${styles.section}`} aria-labelledby="finalCta-title" data-path-anchor="cross">
      <div className="section-head">
        <h2 id="finalCta-title">{finalCta.h2}</h2>
        <p className="lead">{finalCta.lead}</p>
      </div>
      <div className={styles.cta}>
        <GetPebble release={release} variant="primary" />
        <a className={styles.quiet} href={release.repoUrl}>
          {cta.github}
        </a>
      </div>
      <p className={`${styles.notice} only-other`}>{cta.nonMac.notice}</p>
      {live ? (
        <>
          <ul className={`facts ${styles.facts} only-mac`}>
            {releaseFacts(release).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <p className={styles.honest}>
            {hero.honestLine} <a href={`#${SECTIONS.limits}`}>{honestLimits.shortLink}</a>
          </p>
          <p className={`${styles.install} only-mac`}>
            <a href={`#${SECTIONS.install}`}>{cta.installLink}</a>
          </p>
        </>
      ) : null}
      <div className={styles.chip}>
        <ChapterChip chapterId={finalCta.chapterId} />
      </div>
    </section>
  );
}
