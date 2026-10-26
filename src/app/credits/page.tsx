// /credits (MASTER_PLAN §6.5; critic M10; OVERRIDES §2): who made what, section by section from src/content/credits.ts,
// with bloub's MIT notice in full right under bloub (its code runs in this site's JavaScript). AgentGuard is listed
// only under "Pebble itself", as the app's own engine, never as something this site uses. Entries that still carry a
// `todo` are never shown.
import type { Metadata } from "next";
import Link from "next/link";
import { creditsPage } from "@/content/copy";
import { bloubCredit, creditSections, mediaNotice, type CreditItem } from "@/content/credits";
import { BLOUB_MIT_LICENCE } from "@/content/licences";
import { openGraphFor, seo, twitterCard } from "@/content/seo";
import { Article, articleStyles } from "@/components/shell/Article";
import styles from "./credits.module.css";

export const metadata: Metadata = {
  title: seo.pages.credits.title,
  description: seo.pages.credits.description,
  alternates: { canonical: "/credits" },
  openGraph: openGraphFor("/credits"),
  twitter: twitterCard(),
};

function Credit({ item }: { item: CreditItem }) {
  return (
    <li className={styles.item}>
      <p className={styles.name}>
        {item.url ? <a href={item.url}>{item.name}</a> : item.name}
        {item.by ? <span className={styles.by}>{item.by}</span> : null}
      </p>
      <p className={styles.licence}>
        {item.licenceUrl ? <a href={item.licenceUrl}>{item.licence}</a> : item.licence}
      </p>
      {item.use ? <p className={styles.use}>{item.use}</p> : null}
      {item.notice ? (
        <p className={styles.notice} translate="no">
          {item.notice}
        </p>
      ) : null}
    </li>
  );
}

/** A licence file's paragraphs (separated by blank lines), each with its hard line wrapping joined back into one line. */
function licenceParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " "));
}

export default function CreditsPage() {
  return (
    <Article title={creditsPage.h1} lead={creditsPage.lead}>
      <p className={styles.bloub}>{bloubCredit}</p>
      <p className={styles.note}>{creditsPage.licenceNote}</p>
      {creditSections.map((section) => {
        const items = section.items.filter((item) => !item.todo); // unfinished entries never ship
        if (items.length === 0) return null;
        return (
          <section key={section.id} className={styles.section} aria-labelledby={`credits-${section.id}`}>
            <h2 id={`credits-${section.id}`} className={styles.title}>
              {section.title}
            </h2>
            {section.intro ? <p className={styles.intro}>{section.intro}</p> : null}
            <ul className={styles.items}>
              {items.map((item) => (
                <Credit key={item.name} item={item} />
              ))}
            </ul>
            {section.id === "character" ? (
              <div className={styles.licenceText}>
                <h3 className={styles.licenceTitle}>{creditsPage.bloubLicenceTitle}</h3>
                <p className={styles.intro}>{creditsPage.bloubLicenceIntro}</p>
                {/* Every word of the notice, one paragraph per paragraph of the file. The file's own line breaks are
                    only its 80-column wrapping, so the text reflows to the screen instead of breaking twice on phones. */}
                <div className={styles.licenceBody} lang="en" translate="no">
                  {licenceParagraphs(BLOUB_MIT_LICENCE).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      <p className={styles.media}>{mediaNotice}</p>
      <p className={articleStyles.back}>
        <Link href="/" prefetch={false}>
          {creditsPage.backHome}
        </Link>
      </p>
    </Article>
  );
}
