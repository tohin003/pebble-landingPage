// The head of every section after the hero (DESIGN-LEXINGTON §3.6): one anatomy, one left edge.
//
//   ─────────────────────────────────────────────── a hairline (.sec-head)
//   AgentGuard           Evidence before “done”.                     the H2, Fraunces 350, columns 4–11
//   The evidence layer   An agent shouldn’t grade its own work.      its second line in muted ink (two-tone)
//   ▶ Watch this 0:28    AgentGuard is built into Pebble as …        the lead, columns 4–8
//                        (children: more of the head, columns 4–9)
//                        Read the limits ›                           one text link
//
// The rail (columns 1–3) holds the label (name / fact) and, under it, the film chapter chip. Below 1024 px: one
// column; the label becomes a running head over the H2 and the chip follows the head.
//
// Two-tone (checkable): `then` becomes the H2's muted second line only when it is a whole approved sentence of 60
// characters or fewer (twoTone.ts). Otherwise it is shown as a lead paragraph instead, and a warning names the
// heading in development. Never pass text that isn't in src/content.
//
//   <section id={SECTIONS.agentGuard} className="sec" aria-labelledby="agentguard-title">
//     <SectionHead id="agentguard-title" label={labels.agentGuard} title={agentGuard.heading}
//       then={agentGuard.intent} lead={agentGuard.layer[0]} chip="agentguard" />
//     <div className="wrap grid-12 sec-body"> … the exhibit, in .main (columns 4–12) or .full (1–12) … </div>
//   </section>
import type { ReactNode } from "react";
import { ChapterChip } from "@/components/media/ChapterChip";
import type { RailLabelText } from "@/content/labels";
import { RailLabel } from "./RailLabel";
import { checkTwoTone } from "./twoTone";
import styles from "./SectionHead.module.css";

export type SectionHeadProps = Readonly<{
  /** the H2's id; the section's aria-labelledby points at it */
  id: string;
  /** the rail label: a name and a fact (src/content/labels.ts) */
  label: RailLabelText;
  /** the H2 */
  title: string;
  /** the H2's muted second line: a whole approved sentence of at most 60 characters (twoTone.ts) */
  then?: string;
  /** the lead under the H2 (a string, or inline() output for copy with `code`) */
  lead?: ReactNode;
  /** more of the head after the lead, such as a body paragraph (columns 4–9) */
  children?: ReactNode;
  /** the head's one text link (<TextLink>) */
  action?: ReactNode;
  /** a film chapter id (src/content/chapters.ts): its "Watch this in the film" chip sits in the rail */
  chip?: string;
  className?: string;
}>;

export function SectionHead({ id, label, title, then, lead, children, action, chip, className }: SectionHeadProps) {
  const check = then ? checkTwoTone(title, then) : null;
  const twoTone = check?.ok === true;
  if (check && !check.ok && process.env.NODE_ENV !== "production") {
    console.warn(`SectionHead "${title}": the second line is shown as a lead, not as a two-tone heading: ${check.reason}.`);
  }
  return (
    <div className={`wrap grid-12 sec-head ${styles.head} ${className ?? ""}`}>
      <RailLabel name={label.name} fact={label.fact} className={styles.label} />
      <div className={`main ${styles.main}`}>
        <h2 id={id} className={`${styles.title} ${twoTone ? "two-tone" : ""}`}>
          {twoTone ? (
            <>
              <span>{title}</span> <span>{then}</span>
            </>
          ) : (
            title
          )}
        </h2>
        {then && !twoTone ? <p className={`lead ${styles.lead}`}>{then}</p> : null}
        {lead ? <p className={`lead ${styles.lead}`}>{lead}</p> : null}
        {children ? <div className={styles.more}>{children}</div> : null}
        {action ? <p className={styles.action}>{action}</p> : null}
      </div>
      {chip ? (
        <div className={styles.chip}>
          <ChapterChip chapterId={chip} />
        </div>
      ) : null}
    </div>
  );
}
