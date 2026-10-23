// The footer (DESIGN §5 row 15, comp 3): the line ends here and the pebble sleeps on it, in a dimmer pool of light;
// then the colophon: wordmark, links, the theme and Pause motion toggles, and the fine print: the honesty stamp
// (counted live in the browser by Footer.stamp.tsx; nothing shows until it has been counted), the bloub credit
// (OVERRIDES §2), the licence line and the trademark notice. Structure by lane F1, content by lane F2b.
import Link from "next/link";
import { footer } from "@/content/copy";
import { bloubCredit } from "@/content/credits";
import { Pebble } from "@/components/pebble/Pebble";
import { HonestyStamp } from "./Footer.stamp";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.rest}>
        <div className={styles.restLight} aria-hidden="true" />
        <div className={styles.restStage} aria-hidden="true">
          <Pebble pose="sleepy" live={false} className={styles.restPebble} />
          <span className={styles.contact} />
          {/* the line ends here (src/components/line/PebblePath.tsx) */}
          <span className={styles.floor} data-path-anchor="floor" />
        </div>
        <p className={styles.restNote}>{footer.resting}</p>
      </div>

      <div className={styles.colophon}>
        <Wordmark className={styles.wordmark} />
        <nav className={styles.nav} aria-label={footer.navLabel}>
          <ul>
            {footer.links.map((link) => (
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
        </nav>
        <div className={styles.toggles}>
          <ThemeToggle variant="pill" />
          <MotionToggle variant="pill" />
        </div>
        <div className={styles.fine}>
          <HonestyStamp />
          <p>{bloubCredit}</p>
          <p>{footer.licence}</p>
          {footer.trademarks.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </footer>
  );
}
