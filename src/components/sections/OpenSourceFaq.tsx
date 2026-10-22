// Section 14, Open source and FAQ (DESIGN §5 row 14).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): the repo card
// (no star count while small) and the <details> FAQ from src/content/faq.ts, with id="faq" on the FAQ.
import { openSource } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./OpenSourceFaq.module.css";

export function OpenSourceFaq() {
  return (
    <section
      id={SECTIONS.openSource}
      className={`section ${styles.section}`}
      aria-labelledby="openSource-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="openSource-title">{openSource.h2}</h2>
        <p className="lead">{openSource.lead}</p>
      </div>
    </section>
  );
}
