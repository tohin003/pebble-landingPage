// Section 3, AgentGuard, the headline difference (DESIGN §5 row 3).
//
// STUB by lane F1 (site shell): its id, its H2 from the copy, a path anchor and nothing else. TODO(F2): split layout
// (DESIGN §5 row 3, OVERRIDES §7 and §9): left, the H2 and the evidence layer, "An agent shouldn't grade its own work."
// and "Reliability, not security" with the host-safety facts; right, the stacked real captures (the Activity step with
// the verbatim challenge, the held run, the Verified receipt). The final H2 is the claims pass's call; the stub uses
// copy.ts `agentGuard.heading`. Move the gate anchor beside the Verified receipt.
import { agentGuard } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import styles from "./AgentGuard.module.css";

export function AgentGuard() {
  return (
    <section
      id={SECTIONS.agentGuard}
      className={`section ${styles.section}`}
      aria-labelledby="agentGuard-title"
      data-path-anchor="cross"
      data-todo="F2"
    >
      <div className="section-head">
        <h2 id="agentGuard-title">{agentGuard.heading}</h2>
        <p className="lead">{agentGuard.lead}</p>
      </div>
      {/* the AgentGuard checkpoint: a small gap in the line here (TODO(F2): beside the Verified receipt) */}
      <span className={styles.gate} data-path-anchor="gate" aria-hidden="true" />
    </section>
  );
}
