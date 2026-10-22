// /privacy: three short paragraphs about this site (MASTER_PLAN §7.2 "Routes"). STUB by lane F1. TODO(F2): layout.
import type { Metadata } from "next";
import Link from "next/link";
import { privacyPage } from "@/content/copy";
import { seo } from "@/content/seo";
import { Article, articleStyles as styles } from "@/components/shell/Article";

export const metadata: Metadata = {
  title: seo.pages.privacy.title,
  description: seo.pages.privacy.description,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Article title={privacyPage.h1}>
      <div className={styles.body}>
        {privacyPage.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <ul className={styles.list}>
          {privacyPage.links.map((link) =>
            "external" in link && link.external ? (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ) : (
              <li key={link.href}>
                <Link href={link.href} prefetch={false}>
                  {link.label}
                </Link>
              </li>
            ),
          )}
        </ul>
        <p className={styles.back}>
          <Link href="/" prefetch={false}>
            {privacyPage.backHome}
          </Link>
        </p>
      </div>
    </Article>
  );
}
