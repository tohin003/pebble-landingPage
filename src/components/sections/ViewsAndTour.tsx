// Section 9, Views, and what else is inside (DESIGN §5 row 9).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): the views
// paragraph plus the orchestration and feature-tour list (OVERRIDES §10), loop L8 (or a still, per the M7 cut line).
import { views } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./ViewsAndTour.module.css";

export function ViewsAndTour() {
  return (
    <section
      id={SECTIONS.views}
      className={`section ${styles.section}`}
      aria-labelledby="views-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="views-title">{views.h2}</h2>
        <p className="lead">{views.lead}</p>
      </div>
    </section>
  );
}
