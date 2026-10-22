// Section 4, On your desktop (DESIGN §5 row 4).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): the riverbed
// vignette with the companion and loop L1 (LoopVideo, MediaFrame), short copy.
import { desktop } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./OnYourDesktop.module.css";

export function OnYourDesktop() {
  return (
    <section
      id={SECTIONS.desktop}
      className={`section ${styles.section}`}
      aria-labelledby="desktop-title"
      data-path-anchor="margin"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="desktop-title">{desktop.h2}</h2>
        <p className="lead">{desktop.lead}</p>
      </div>
    </section>
  );
}
