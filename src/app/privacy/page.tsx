// /privacy: about this site, in three short paragraphs (MASTER_PLAN §7.2 "Routes"): no cookies, no analytics, the
// hosting logs Vercel keeps, and the app's own privacy on the home page. The footer's honesty stamp, counted live on
// every page, shows the first paragraph rather than only stating it.
import type { Metadata } from "next";
import Link from "next/link";
import { privacyPage } from "@/content/copy";
import { openGraphFor, seo, twitterCard } from "@/content/seo";
import { Article, articleStyles } from "@/components/shell/Article";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: seo.pages.privacy.title,
  description: seo.pages.privacy.description,
  alternates: { canonical: "/privacy" },
  openGraph: openGraphFor("/privacy"),
  twitter: twitterCard(),
};

export default function PrivacyPage() {
  return (
    <Article title={privacyPage.h1}>
      <div className={styles.body}>
        {privacyPage.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <ul className={styles.links}>
        {privacyPage.links.map((link) => (
          <li key={link.href}>
            {"external" in link && link.external ? (
              <a href={link.href}>{link.label}</a>
            ) : (
              <Link href={link.href} prefetch={false}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className={articleStyles.back}>
        <Link href="/" prefetch={false}>
          {privacyPage.backHome}
        </Link>
      </p>
    </Article>
  );
}
