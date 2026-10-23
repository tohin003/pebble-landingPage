"use client";
// The header (DESIGN-LEXINGTON §6 Header, comp A): small text on the page's grid. The wordmark sits over the label rail
// (columns 1–3), the section links start on column 4, and GitHub, Pause motion, the theme and the small ink Download
// sit at the right (9–12). Always on the page ground with a hairline under it: no blur, no change on scroll.
// Below 1024 px: the wordmark, then the theme and a menu that opens a sheet (a modal <dialog>: focus stays inside, Esc
// and the backdrop close it, focus returns to the menu button). The sheet's Download has the honest line under it.
//
// Links to sections are written "/#id", so they work from every page and stay same-page jumps on the home page.
import { useRef, useState } from "react";
import { Icon } from "./icons";
import { header } from "@/content/copy";
import type { ReleaseInfo } from "@/lib/release";
import { HonestLine } from "@/components/ui/HonestLine";
import { GetPebble } from "./GetPebble";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";
import styles from "./SiteHeader.module.css";

/** "#install" → "/#install", so a section link works from /film or /credits too. */
function href(link: string): string {
  return link.startsWith("#") ? `/${link}` : link;
}

export function SiteHeader({ release }: { release: Pick<ReleaseInfo, "state" | "downloadUrl"> }) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const sections = header.nav.filter((link) => !("external" in link && link.external));
  const external = header.nav.filter((link) => "external" in link && link.external);

  const openSheet = () => {
    sheet.current?.showModal();
    setOpen(true);
  };
  const closeSheet = () => sheet.current?.close();

  return (
    <header className={styles.header}>
      <div className={`wrap grid-12 ${styles.bar}`}>
        <Wordmark className={styles.wordmark} />
        <nav className={styles.nav} aria-label={header.navLabel}>
          {sections.map((link) => (
            <a key={link.href} href={href(link.href)} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.tools}>
          {external.map((link) => (
            <a key={link.href} href={link.href} className={`${styles.navLink} ${styles.wideOnly}`}>
              {link.label}
            </a>
          ))}
          <MotionToggle className={styles.wideOnly} />
          <ThemeToggle />
          <GetPebble release={release} variant="small" macLabel={header.cta} otherLabel={header.ctaNonMac} className={`${styles.cta} ${styles.wideOnly}`} />
          <button type="button" className={`${styles.menuButton} ${styles.compactOnly}`} aria-haspopup="dialog" aria-expanded={open} onClick={openSheet}>
            <Icon name="List" className={styles.menuIcon} />
            <span className="sr-only">{header.menuOpen}</span>
          </button>
        </div>
      </div>

      <dialog
        ref={sheet}
        className={styles.sheet}
        aria-label={header.menuOpen}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSheet(); // a click on the backdrop
        }}
      >
        <div className={styles.sheetBody}>
          <div className={styles.sheetTop}>
            {/* first in the DOM, so showModal() focuses it; drawn on the right */}
            <button type="button" className={styles.menuButton} onClick={closeSheet}>
              <Icon name="X" className={styles.menuIcon} />
              <span className="sr-only">{header.menuClose}</span>
            </button>
            <Wordmark />
          </div>
          <nav aria-label={header.navLabel}>
            <ul className={styles.sheetNav}>
              {header.nav.map((link) => (
                <li key={link.href}>
                  <a href={href(link.href)} onClick={closeSheet}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.sheetCta}>
            <GetPebble release={release} variant="primary" macLabel={header.cta} block />
            {release.state === "live" ? <HonestLine macOnly className={styles.sheetHonest} onNavigate={closeSheet} /> : null}
          </div>
          <div className={styles.sheetToggles}>
            <MotionToggle variant="pill" />
            <ThemeToggle variant="pill" />
          </div>
        </div>
      </dialog>
    </header>
  );
}
