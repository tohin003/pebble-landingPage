// Section 8, Memory you can see (DESIGN §5 row 8).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): the six
// labelled layers and the recall rule (OVERRIDES §10), MemoryForgetDemo and loop L7.
import { memory } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./Memory.module.css";

export function Memory() {
  return (
    <section
      id={SECTIONS.memory}
      className={`section ${styles.section}`}
      aria-labelledby="memory-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="memory-title">{memory.h2}</h2>
        <p className="lead">{memory.lead}</p>
      </div>
    </section>
  );
}
