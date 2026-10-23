// Section 14, Open source and FAQ (DESIGN §5 row 14).
//
// A split: on the left the H2, the repo card (licence, latest release and its date, read from GitHub at build time;
// no star count while the number is small, DESIGN §5) and the project's links; on the right the FAQ as <details>
// (id="faq"), each entry addressable by its own id (FaqHashOpener opens the one a link points at).
// The line passes beside the section (a "margin" anchor).
import { faq } from "@/content/faq";
import { faqSection, openSource } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { Galet } from "@/components/shell/Galet";
import { inline } from "@/lib/inline";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { FaqHashOpener } from "./OpenSourceFaq.hash";
import styles from "./OpenSourceFaq.module.css";

/** Phosphor's CaretDown and ArrowUpRight (regular), MIT; Phosphor is credited on /credits. */
const CARET = "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z";
const ARROW = "M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z";

/** "2026-10-22" → "22 October 2026" (fixed time zone, so the build and the browser agree). */
function longDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function OpenSourceFaq() {
  const release = await getRelease();
  const card = openSource.repoCard;
  return (
    <section id={SECTIONS.openSource} className={`section ${styles.section}`} aria-labelledby="openSource-title">
      <div className={styles.inner}>
        <div className={styles.aside}>
          <h2 id="openSource-title">{openSource.h2}</h2>
          <p className={`lead ${styles.lead}`}>{openSource.lead}</p>
          <div className={styles.chip}>
            <ChapterChip chapterId={openSource.chapterId} />
          </div>

          <div className={styles.repo}>
            <p className={styles.repoName}>
              <Galet className={styles.repoMark} />
              <a href={release.repoUrl} translate="no">
                {card.name}
              </a>
            </p>
            <ul className={styles.repoFacts}>
              <li>{card.licence}</li>
              <li>
                <a href={release.releaseNotesUrl}>{card.latest(release.version)}</a>
              </li>
              <li>{card.released(longDate(release.publishedOn))}</li>
            </ul>
            {release.source === "github" ? <p className={styles.built}>{card.builtNote}</p> : null}
          </div>

          <ul className={styles.links}>
            {openSource.links.map((link) => {
              // the last word and the arrow never part, so a label that wraps keeps its arrow at its end
              const at = link.label.lastIndexOf(" ") + 1;
              return (
                <li key={link.href}>
                  <a href={link.href}>
                    {link.label.slice(0, at)}
                    <span className={styles.lastWord}>
                      {link.label.slice(at)}
                      <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false" className={styles.arrow}>
                        <path d={ARROW} />
                      </svg>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <p className={styles.maintainer}>{openSource.maintainer}</p>
        </div>

        <div id={SECTIONS.faq} className={styles.faq}>
          <h3 className={styles.faqTitle}>{faqSection.h2}</h3>
          <div className={styles.items}>
            {faq.map((item) => (
              <details key={item.id} id={item.id} className={styles.item}>
                <summary className={styles.question}>
                  <span>{item.question}</span>
                  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false" className={styles.caret}>
                    <path d={CARET} />
                  </svg>
                </summary>
                <div className={styles.answer}>
                  {item.answer.map((paragraph) => (
                    <p key={paragraph}>{inline(paragraph)}</p>
                  ))}
                  {item.links?.length ? (
                    <ul className={styles.answerLinks}>
                      {item.links.map((link) => (
                        <li key={link.href}>
                          <a href={link.href}>{link.label}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
          <FaqHashOpener ids={faq.map((item) => item.id)} />
        </div>
      </div>
    </section>
  );
}
