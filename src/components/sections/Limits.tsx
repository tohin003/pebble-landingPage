// Section 13, What Pebble isn't (yet) (DESIGN §5 row 13).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): comp 2's
// two-column limits list: the four release limits plus OVERRIDES §8 H14. The stub already lists them all, so the hero's
// "Read the limits" link never lands on an empty section.
import { honestLimits } from "@/content/copy";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import styles from "./Limits.module.css";

export function Limits() {
  return (
    <section
      id={SECTIONS.limits}
      className={`section ${styles.section}`}
      aria-labelledby="limits-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="limits-title">{honestLimits.heading}</h2>
        <p className="lead">{honestLimits.lead}</p>
      </div>
      <ul className={styles.list}>
        {[...honestLimits.release, ...honestLimits.product.map((item) => `${item.title}. ${item.body}`)].map((line) => (
          <li key={line}>{inline(line)}</li>
        ))}
      </ul>
    </section>
  );
}
