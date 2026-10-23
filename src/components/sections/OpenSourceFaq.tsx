// Section 14, Free and open source, and the FAQ (DESIGN-LEXINGTON §6 row 14).
//
// The head on the rail ("Open source / Apache-2.0", the film chip under it); the H2 "Free and open source." with the
// lead's first sentence ("Pebble’s code is on GitHub under the Apache License 2.0.") as its muted second line, and the
// rest of the lead under it. Then from column 4:
// - columns 4–6: the repository on the one flat panel (its name, the licence, the latest release and its date, read
//   from GitHub at build time; no star count while the number is small), the project's links as text links, and who
//   maintains it;
// - columns 7–12: the FAQ, on the browser's own <details> and <summary> (keyboard, find-in-page and the "open"
//   state come free), each entry a hairline row with its own id; FaqHashOpener opens the one a link points at.
// Numbers in the answers are data (Geist Mono, tabular figures).
import type { ReactNode } from "react";
import { faq } from "@/content/faq";
import { faqSection, openSource } from "@/content/copy";
import { labels } from "@/content/labels";
import { formatLongDate } from "@/content/releaseFacts";
import { Galet } from "@/components/shell/Galet";
import { DataText } from "@/components/ui/Data";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { firstSentence } from "@/components/ui/twoTone";
import { inline } from "@/lib/inline";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { FaqHashOpener } from "./OpenSourceFaq.hash";
import styles from "./OpenSourceFaq.module.css";

/** Phosphor's CaretDown (regular), MIT; Phosphor is credited on /credits. */
const CARET = "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z";

/** "Pebble’s code is on GitHub under the Apache License 2.0." under the H2, then "Read it, build it yourself …" */
const [THEN, LEAD] = firstSentence(openSource.lead);

/** An answer's paragraph: `code` spans as code, otherwise its numbers as data ("about 2.8 GB"). */
function prose(text: string): ReactNode {
  return text.includes("`") ? inline(text) : <DataText text={text} />;
}

export async function OpenSourceFaq() {
  const release = await getRelease();
  const card = openSource.repoCard;
  return (
    <section id={SECTIONS.openSource} className="sec" aria-labelledby="openSource-title">
      <SectionHead
        id="openSource-title"
        label={labels.openSource}
        title={openSource.h2}
        then={THEN}
        lead={LEAD}
        chip={openSource.chapterId}
      />

      <div className="wrap grid-12 sec-body">
        <div className={`main ${styles.body}`}>
          <div className={styles.aside}>
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
                  <a href={release.releaseNotesUrl}>
                    <DataText text={card.latest(release.version)} />
                  </a>
                </li>
                <li>
                  <DataText text={card.released(formatLongDate(release.publishedOn))} />
                </li>
              </ul>
              {release.source === "github" ? <p className={styles.built}>{card.builtNote}</p> : null}
            </div>

            <ul className={styles.links}>
              {openSource.links.map((link) => (
                <li key={link.href}>
                  <TextLink href={link.href}>{link.label}</TextLink>
                </li>
              ))}
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
                      <p key={paragraph}>{prose(paragraph)}</p>
                    ))}
                    {item.links?.length ? (
                      <ul className={styles.answerLinks}>
                        {item.links.map((link) => (
                          <li key={link.href}>
                            <TextLink href={link.href}>{link.label}</TextLink>
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
      </div>
    </section>
  );
}
