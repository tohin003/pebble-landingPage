// Section 15, The final call to action (DESIGN §5 row 15).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): "Say hi to
// Pebble." and the CTA cluster; the footer below holds the sleeping pebble where the line ends.
import { cta, finalCta, links } from "@/content/copy";
import { GetPebble } from "@/components/shell/GetPebble";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import styles from "./FinalCta.module.css";

export async function FinalCta() {
  const release = await getRelease();
  return (
    <section
      id={SECTIONS.finalCta}
      className={`section ${styles.section}`}
      aria-labelledby="finalCta-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="finalCta-title">{finalCta.h2}</h2>
        <p className="lead">{finalCta.lead}</p>
      </div>
      <div className={styles.cta}>
        <GetPebble release={release} variant="primary" />
        <a className={styles.quiet} href={links.repo}>
          {cta.github}
        </a>
      </div>
    </section>
  );
}
