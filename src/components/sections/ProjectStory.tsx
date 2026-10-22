// Section 5, Works in your project. Asks first. (DESIGN §5 row 5).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): comp 3's 01–04
// rail (each stone a data-path-anchor="stop", the guide pebble on the current step) and the sticky stage:
// ApprovalCardDemo, loops L3 and L4; step copy mode-qualified (OVERRIDES §8 C2).
import { project } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./ProjectStory.module.css";

export function ProjectStory() {
  return (
    <section
      id={SECTIONS.project}
      className={`section ${styles.section}`}
      aria-labelledby="project-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="project-title">{project.h2}</h2>
        <p className="lead">{project.note}</p>
      </div>
    </section>
  );
}
