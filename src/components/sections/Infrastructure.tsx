// Section 10, Built like infrastructure (DESIGN §5 row 10).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): quiet and
// typographic: the stack sentence, then 8,421 automated tests, 1,772 service checks and 40 validator suites in source
// and frozen modes, and the release gates (OVERRIDES §7). No stat tiles. The H2 comes from src/content/stubs.ts until
// the claims pass moves it into copy.ts.
import { sectionStubs } from "@/content/stubs";
import { SECTIONS } from "@/lib/sections";
import styles from "./Infrastructure.module.css";

export function Infrastructure() {
  return (
    <section
      id={SECTIONS.infrastructure}
      className={`section ${styles.section}`}
      aria-labelledby="infrastructure-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="infrastructure-title">{sectionStubs.infrastructure.h2}</h2>
      </div>
    </section>
  );
}
