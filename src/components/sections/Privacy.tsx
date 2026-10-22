// Section 11, Private by default (DESIGN §5 row 11).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): two columns,
// "Stored on your Mac" and "What leaves your Mac" with the five destinations of OVERRIDES §8 C1; the line becomes the
// diagram's arrows. copy.ts `privacy` still says "Stays on your Mac" and lists four destinations: the claims pass fixes
// that first.
import { privacy } from "@/content/copy";
import { sectionStubs } from "@/content/stubs";
import { SECTIONS } from "@/lib/sections";
import styles from "./Privacy.module.css";

export function Privacy() {
  return (
    <section
      id={SECTIONS.privacy}
      className={`section ${styles.section}`}
      aria-labelledby="privacy-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="privacy-title">{sectionStubs.privacy.h2}</h2>
        <p className="lead">{privacy.lead}</p>
      </div>
    </section>
  );
}
