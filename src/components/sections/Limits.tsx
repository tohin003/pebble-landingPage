// Section 13, What Pebble isn’t (yet) (DESIGN §5 row 13; design comp 2's limits list; OVERRIDES §2, §8 H14).
//
// A split: the H2 and the lead on the left, every limit on the right in two newspaper columns, each marked with the
// galet (below 1100 px the head sits above the columns). The four release limits come first, word for word as the
// release session wrote them (OVERRIDES §2), then the product's own limits, each with its title as a lead-in,
// including "Other software on your Mac" (DESIGN §9). The hero's "Read the limits" link lands here.
// The line sweeps across the page in the gap above the section (a "cross" anchor).
import { honestLimits } from "@/content/copy";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import styles from "./Limits.module.css";

export function Limits() {
  return (
    <section id={SECTIONS.limits} className={`section ${styles.section}`} aria-labelledby="limits-title" data-path-anchor="cross">
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id="limits-title">{honestLimits.heading}</h2>
          <p className={`lead ${styles.lead}`}>{honestLimits.lead}</p>
        </div>
        <ul className={styles.list}>
          {honestLimits.release.map((line) => (
            <li key={line} className={styles.release}>
              {inline(line)}
            </li>
          ))}
          {honestLimits.product.map((item) => (
            <li key={item.title}>
              <strong>{item.title}.</strong> {inline(item.body)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
