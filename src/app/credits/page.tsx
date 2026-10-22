// /credits (MASTER_PLAN §6.5, critic M10): who made what, with bloub's full MIT notice (its code ships in this site's
// JavaScript). STUB by lane F1: the structure and the required notices. TODO(F2): the final layout.
import type { Metadata } from "next";
import Link from "next/link";
import { creditsPage } from "@/content/copy";
import { bloubCredit, creditSections, mediaNotice } from "@/content/credits";
import { BLOUB_MIT_LICENCE } from "@/content/licences";
import { seo } from "@/content/seo";
import { Article, articleStyles as styles } from "@/components/shell/Article";

export const metadata: Metadata = {
  title: seo.pages.credits.title,
  description: seo.pages.credits.description,
  alternates: { canonical: "/credits" },
};

export default function CreditsPage() {
  return (
    <Article title={creditsPage.h1} lead={creditsPage.lead}>
      <div className={styles.body}>
        <p>{bloubCredit}</p>
        {creditSections.map((section) => {
          const items = section.items.filter((item) => !item.todo); // unfinished entries never ship
          if (items.length === 0) return null;
          return (
            <section key={section.id} aria-labelledby={`credits-${section.id}`}>
              <h2 id={`credits-${section.id}`}>{section.title}</h2>
              {section.intro ? <p className="small">{section.intro}</p> : null}
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.name}>
                    {item.url ? <a href={item.url}>{item.name}</a> : item.name}
                    {item.by ? `, ${item.by}` : ""}
                    {item.by?.endsWith(".") ? " " : ". "}
                    {item.licence}.{item.use ? ` ${item.use}` : ""}
                    {item.notice ? <span className="small"> {item.notice}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <h2>bloub</h2>
        <pre className={styles.pre}>{BLOUB_MIT_LICENCE}</pre>
        <p className="small">{creditsPage.licenceNote}</p>
        <p className="small">{mediaNotice}</p>
        <p className={styles.back}>
          <Link href="/" prefetch={false}>
            {creditsPage.backHome}
          </Link>
        </p>
      </div>
    </Article>
  );
}
