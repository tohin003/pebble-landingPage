// The footer (DESIGN-LEXINGTON §6 Footer, with the lead's graft of comp B's wordmark): the hero's pebble is awake at the
// top of the page; at the bottom it sleeps. The wordmark "pebble" is set huge and tone on tone (--word), and the
// sleeping pebble is its full stop, standing on a local ground line along the baseline. Under it, the statement
// "Pebble is resting." / "No telemetry." (copy.ts footer.resting, split at its full stop) in two tones.
// Then the colophon on the page's grid: the links ("Pebble": GitHub, Releases and, while the benchmark is shown, the
// home page's Benchmarks section; "This site": Film transcript, Credits, Privacy) and "Appearance" (the theme as words,
// and Pause motion); and the fine print from column 4: the honesty stamp
// (counted live in the browser by Footer.stamp.tsx; nothing shows until it has been counted), the bloub credit
// (OVERRIDES §2), the licence line and the trademark notice.
//
// The giant wordmark is decoration (aria-hidden): the statement, the links and the fine print carry every word. Its
// letters are CSS generated content (data-word), not text in the page, so screen readers, find-in-page, translation
// and the contrast check all skip it: it is a logotype set tone on tone on purpose (about 1.2:1), which WCAG 1.4.3
// exempts, and axe's colour-contrast rule (tools/qa/a11y.mjs) only reads real text. The sleeping pebble is a still
// (no JavaScript): at the end of the page nothing moves on its own.
import Link from "next/link";
import { footer, type Link as LinkCopy } from "@/content/copy";
import { bloubCredit } from "@/content/credits";
import { footerColumns } from "@/content/labels";
import { releaseFacts } from "@/content/releaseFacts";
import { Pebble } from "@/components/pebble/Pebble";
import { Horizon } from "@/components/ui/Horizon";
import { firstSentence } from "@/components/ui/twoTone";
import { HonestyStamp } from "./Footer.stamp";
import { MotionToggle } from "./MotionToggle";
import { ThemeSwitch } from "./ThemeSwitch";
import styles from "./Footer.module.css";

const isExternal = (link: LinkCopy) => "external" in link && link.external === true;

/**
 * `benchmarkShown`: the Benchmarks section's gate (releaseFacts.benchmarksPublic, as the section and Infrastructure's
 * link read it), a prop so the tests can render the closed site.
 */
export function Footer({ benchmarkShown = releaseFacts.benchmarksPublic }: { benchmarkShown?: boolean } = {}) {
  const [resting, then] = firstSentence(footer.resting);
  const columns: { key: string; title: string; links: readonly LinkCopy[] }[] = [
    {
      key: "pebble",
      title: footerColumns.pebble,
      links: [...footer.links.filter(isExternal), ...(benchmarkShown ? [footer.benchmarksLink] : [])],
    },
    { key: "site", title: footerColumns.site, links: footer.links.filter((link) => !isExternal(link)) },
  ];
  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.rest}>
          <div className={styles.giant} aria-hidden="true">
            <Horizon variant={4} className={styles.ground} />
            <span className={styles.word} data-word="pebble" />
            <span className={styles.stop}>
              <span className={styles.contact} />
              <Pebble pose="sleepy" live={false} className={styles.sleeper} />
            </span>
          </div>
          <p className={`display-3 two-tone ${styles.resting}`}>
            <span>{resting}</span> <span>{then}</span>
          </p>
        </div>

        <div className={`grid-12 ${styles.colophon}`}>
          <nav className={styles.links} aria-label={footer.navLabel}>
            {columns.map((column) => (
              <div key={column.key} className={styles.col}>
                <p id={`footer-${column.key}`} className={styles.colTitle}>
                  {column.title}
                </p>
                <ul aria-labelledby={`footer-${column.key}`}>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {/* a page's own section ("/#benchmarks") is a plain link, as TextLink makes them */}
                      {isExternal(link) || link.href.startsWith("/#") ? (
                        <a href={link.href}>{link.label}</a>
                      ) : (
                        <Link href={link.href} prefetch={false}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className={`${styles.col} ${styles.appearance}`} role="group" aria-labelledby="footer-appearance">
            <p id="footer-appearance" className={styles.colTitle}>
              {footerColumns.appearance}
            </p>
            <div className={styles.toggles}>
              <ThemeSwitch />
              <MotionToggle variant="pill" />
            </div>
          </div>
          <div className={`fine ${styles.fine}`}>
            <HonestyStamp />
            <p>{bloubCredit}</p>
            <p>{footer.licence}</p>
            {footer.trademarks.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
