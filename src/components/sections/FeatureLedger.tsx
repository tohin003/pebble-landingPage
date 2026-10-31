// The ruled feature ledger of the two Pebble 2.0.0 sections, Across your Mac and Pebble's Workshop (the Infrastructure
// pattern, DESIGN-LEXINGTON §6 row 10): each row's term on columns 4–6 (Inter 500), then on columns 7–12 the feature in
// ink and its limit right under it in muted ink, at the same size (PHILOSOPHY principle 3: the limit sits beside the
// promise). Hairlines only, no tiles, no icons. Then one note under the ledger. Text only: until the captures lane has
// real 2.0.0 stills, nothing here pictures Pebble's interface.
import type { LedgerRow } from "@/content/copy";
import { inline } from "@/lib/inline";
import styles from "./FeatureLedger.module.css";

export type FeatureLedgerProps = Readonly<{ rows: readonly LedgerRow[]; note?: string }>;

export function FeatureLedger({ rows, note }: FeatureLedgerProps) {
  return (
    <>
      <dl className={styles.ledger}>
        {rows.map((row) => (
          <div key={row.id} className={styles.row} data-row={row.id}>
            <dt>{row.term}</dt>
            <dd>
              <p className={styles.text}>{inline(row.text)}</p>
              <p className={styles.limit}>{inline(row.limit)}</p>
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className={styles.note}>{inline(note)}</p> : null}
    </>
  );
}
