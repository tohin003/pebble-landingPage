// The footer (DESIGN §5 row 15, comp 3): the line ends here and the pebble sleeps on it, in a dimmer pool of light;
// then the colophon: wordmark, links, the theme and Pause motion toggles, the credits and the trademark notice.
//
// STRUCTURE ONLY: lane F2b fills it. TODO(F2b):
// - the honesty stamp, counted live from PerformanceObserver and document.cookie (MASTER_PLAN §7.2 row 12), in the
//   slot marked below; no static claim until it is computed;
// - the resting note: copy.ts `footer.resting` still carries "It never phones home", which OVERRIDES §8 H14 drops.
//   Only its first sentence is shown here until the claims pass fixes the copy.
import Link from "next/link";
import { footer } from "@/content/copy";
import { bloubCredit } from "@/content/credits";
import { Pebble } from "@/components/pebble/Pebble";
import { MotionToggle } from "./MotionToggle";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";
import styles from "./Footer.module.css";

const restingNote = `${footer.resting.split(". ")[0]!.replace(/\.$/, "")}.`;

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
        <p className={styles.restNote}>{restingNote}</p>
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
          {/* TODO(F2b): <HonestyStamp /> here, computed live. */}
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
