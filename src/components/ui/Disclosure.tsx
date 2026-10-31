// Detail on demand (.work/page-declutter/PLAN.md): a hairline row on the browser's own <details>/<summary>, the FAQ's
// pattern. Keyboard, find-in-page, fragment links and the open state come free, it works without JavaScript, and the
// content stays in the DOM, so indexers and screen readers reach it. Closed unless `open`. The summary is at least
// 44 px tall at every width; the caret turns only with motion on (Disclosure.module.css).
//
//   <DisclosureGroup>
//     <Disclosure summary="How it checks">…</Disclosure>
//     <Disclosure summary="The result" term="Tables">…</Disclosure>
//   </DisclosureGroup>
//
// Never put a must-stay-visible line inside one (the download's honest line, Stealth Lockdown's honest line, the
// benchmark's scoreboard, chart and not-run line): PLAN.md, "Must stay visible".
import type { ReactNode } from "react";
import { Caret } from "./Caret";
import styles from "./Disclosure.module.css";

export type DisclosureProps = Readonly<{
  /** the summary's words: what opening it shows */
  summary: ReactNode;
  children: ReactNode;
  /** a short line under the summary, visible while closed (the gist; never a limit that belongs beside a claim) */
  hint?: ReactNode;
  id?: string;
  /** a shared name makes a group exclusive: opening one closes the others */
  name?: string;
  open?: boolean;
  className?: string;
}>;

export function Disclosure({ summary, children, hint, id, name, open, className }: DisclosureProps) {
  return (
    <details id={id} name={name} open={open} className={`${styles.item} ${className ?? ""}`} data-disclosure="">
      <summary className={styles.summary}>
        <span className={styles.summaryText}>
          <span className={styles.title}>{summary}</span>
          {hint ? <span className={styles.hint}>{hint}</span> : null}
        </span>
        <Caret className={styles.caret} />
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}

/** Hairline rows: a rule above each row and one under the last. */
export function DisclosureGroup({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={`${styles.group} ${className ?? ""}`}>{children}</div>;
}
