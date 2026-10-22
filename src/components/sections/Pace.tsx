// Section 7, You set the pace (DESIGN §5 row 7).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): comp 3's arc
// dial (PermissionDial; the dial is a data-path-anchor="arc" with --path-r and --path-cy), verbatim mode text,
// attributed "In Pebble's Settings, under the three modes:".
import { pace } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./Pace.module.css";

export function Pace() {
  return (
    <section
      id={SECTIONS.pace}
      className={`section ${styles.section}`}
      aria-labelledby="pace-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="pace-title">{pace.h2}</h2>
        <p className="lead">{pace.lead}</p>
      </div>
    </section>
  );
}
