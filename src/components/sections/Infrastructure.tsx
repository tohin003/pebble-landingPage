// Section 10, Built like infrastructure (DESIGN §5 row 10; OVERRIDES §7).
//
// Quiet and typographic, no stat tiles: the stack sentence as the lead, then a two-column ledger with the README's own
// row names (Tests, Service checks, Reproducible build, Release gates), then the note that these are engineering facts,
// not benchmarks (OVERRIDES §2). The line passes beside the section (a "margin" anchor).
import { infrastructure } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./Infrastructure.module.css";

export function Infrastructure() {
  return (
    <section
      id={SECTIONS.infrastructure}
      className={`section ${styles.section}`}
      aria-labelledby="infrastructure-title"
    >
      <div className="section-head">
        <h2 id="infrastructure-title">{infrastructure.h2}</h2>
        <p className="lead">{infrastructure.stack}</p>
      </div>
      <dl className={styles.ledger}>
        {infrastructure.facts.map((fact) => (
          <div key={fact.term} className={styles.row}>
            <dt>{fact.term}</dt>
            <dd>{fact.text}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>{infrastructure.note}</p>
    </section>
  );
}
