// The root layout: fonts, metadata, the theme / motion / platform bootstrap, the skip link, the header, the pebble's
// path, the footer and the JSON-LD record (MASTER_PLAN §2.2, §7.8; docs/DESIGN.md).
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { hero, honestLimits } from "@/content/copy";
import { seo, jsonLdString, softwareApplicationJsonLd } from "@/content/seo";
import { PebblePath } from "@/components/line/PebblePath";
import { Footer } from "@/components/shell/Footer";
import { ShellSync } from "@/components/shell/ShellSync";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { SkipLink } from "@/components/shell/SkipLink";
import { BOOTSTRAP_SCRIPT } from "@/lib/bootstrap";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { siteUrl } from "@/lib/site";
import { fontVariables } from "./fonts";
import styles from "./layout.module.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: seo.title, template: seo.titleTemplate },
  description: seo.description,
  applicationName: seo.siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: seo.openGraph.type,
    siteName: seo.siteName,
    locale: seo.openGraph.locale,
    url: "/",
    title: seo.openGraph.title,
    description: seo.openGraph.description,
  },
  twitter: {
    card: seo.twitter.card,
    title: seo.openGraph.title,
    description: seo.openGraph.description,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: seo.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: seo.themeColor.dark },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const release = await getRelease();
  const jsonLd = softwareApplicationJsonLd({
    version: release.version,
    sizeBytes: release.sizeBytes,
    datePublished: release.publishedOn,
    live: release.state === "live",
  });
  return (
    // The inline script sets data-theme, data-motion and data-platform on <html> before first paint, hence
    // suppressHydrationWarning (Next.js guide "Preventing flash before hydration").
    <html lang="en-GB" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <SkipLink />
        <div className={styles.page}>
          <PebblePath />
          <SiteHeader
            release={{ state: release.state, downloadUrl: release.downloadUrl }}
            honest={{ line: hero.honestLine, link: honestLimits.shortLink, href: `#${SECTIONS.limits}` }}
          />
          <main id="main" className={styles.main}>
            {children}
          </main>
          <Footer />
        </div>
        <ShellSync />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      </body>
    </html>
  );
}
