"use client";
// The header (DESIGN §5 row 0, comp 3): section links on the left, the wordmark in the centre, and GitHub, Pause
// motion, the theme and the call to action on the right. Sticky; it becomes translucent with a hairline after 24 px of
// scroll. Below 900 px: the theme on the left, the wordmark, and a menu that opens a sheet (a modal <dialog>: focus
// stays inside, Esc and the backdrop close it, focus returns to the menu button).
//
// Links to sections are written "/#id", so they work from every page and stay same-page jumps on the home page.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { header } from "@/content/copy";
import type { ReleaseInfo } from "@/lib/release";
import { GetPebble } from "./GetPebble";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";
import styles from "./SiteHeader.module.css";

const SCROLLED_AT = 24;

/** "#install" → "/#install", so a section link works from /film or /credits too. */
function href(link: string): string {
  return link.startsWith("#") ? `/${link}` : link;
}

export function SiteHeader({ release }: { release: Pick<ReleaseInfo, "state" | "downloadUrl"> }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const sections = header.nav.filter((link) => !("external" in link && link.external));
  const external = header.nav.filter((link) => "external" in link && link.external);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLLED_AT);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const openSheet = () => {
    sheet.current?.showModal();
    setOpen(true);
  };
  const closeSheet = () => sheet.current?.close();

  return (
    <header className={styles.header} data-scrolled={scrolled ? "" : undefined}>
      <div className={styles.bar}>
        <ThemeToggle className={styles.compactOnly} />
        <nav className={styles.navLeft} aria-label={header.navLabel}>
          {sections.map((link) => (
            <a key={link.href} href={href(link.href)} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>
        <Wordmark className={styles.wordmark} />
        <div className={styles.navRight}>
          {external.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
          <MotionToggle />
          <ThemeToggle />
          <GetPebble release={release} variant="ghost" macLabel={header.cta} otherLabel={header.ctaNonMac} className={styles.cta} />
        </div>
        <button
          type="button"
          className={`${styles.menuButton} ${styles.compactOnly}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openSheet}
        >
          <Icon name="List" className={styles.menuIcon} />
          <span className="sr-only">{header.menuOpen}</span>
        </button>
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
