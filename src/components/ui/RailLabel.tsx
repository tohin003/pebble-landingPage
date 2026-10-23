// The side label (DESIGN-LEXINGTON §3.1): a short name and a fact already true on the page (src/content/labels.ts),
// in the rail (columns 1–3) beside a heading. Sentence case, 14 px, ink and muted ink, never uppercase, never tracked,
// never the accent. Below 1024 px it becomes the section's running head: the name at the left and the fact at the
// right of one row under the hairline. Not an eyebrow: it never sits above the heading on its own.
import type { RailLabelText } from "@/content/labels";
import { DataText } from "./Data";
import styles from "./RailLabel.module.css";

export function RailLabel({ name, fact, className }: RailLabelText & { className?: string }) {
  return (
    <p className={`label ${styles.label} ${className ?? ""}`}>
      <span className={styles.name}>{name}</span>{" "}
      <span className={styles.fact}>
        <DataText text={fact} />
      </span>
    </p>
  );
}
