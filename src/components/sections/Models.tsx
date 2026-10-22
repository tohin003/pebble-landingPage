// Section 6, Your model, your choice (DESIGN §5 row 6).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): three ways in
// as a quiet three-item list (not cards), loop L2.
import { models } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./Models.module.css";

export function Models() {
  return (
    <section
      id={SECTIONS.models}
      className={`section ${styles.section}`}
      aria-labelledby="models-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="models-title">{models.h2}</h2>
        <p className="lead">{models.lead}</p>
      </div>
    </section>
  );
}
