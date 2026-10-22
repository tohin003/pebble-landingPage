// The 404 page. STUB by lane F1. TODO(F2): a sleeping or curious pebble, if it earns its place.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "@/content/copy";
import { seo } from "@/content/seo";
import { Article, articleStyles as styles } from "@/components/shell/Article";

export const metadata: Metadata = {
  title: seo.pages.notFound.title,
  description: seo.pages.notFound.description,
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Article title={notFound.h1} lead={notFound.body}>
      <p className={styles.back}>
        <Link href="/" prefetch={false}>
          {notFound.home}
        </Link>
      </p>
    </Article>
  );
}
