// Section 12, Install (DESIGN §5 row 12).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): comp 2's split
// install: the requirements list, the one-line command with Copy, what the installer does, "or download and check" with
// SHA256SUMS, honest first-run steps; InstallPill with the pebble tap.
import { install } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./Install.module.css";

export function Install() {
  return (
    <section
      id={SECTIONS.install}
      className={`section ${styles.section}`}
      aria-labelledby="install-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="install-title">{install.h2}</h2>
        <p className="lead">{install.lead}</p>
      </div>
      <pre className={styles.command}>
        <code translate="no">{install.oneLine.command}</code>
      </pre>
    </section>
  );
}
