// The feature ledger of the two Pebble 2.0.0 sections, Across your Mac and Pebble's Workshop. Each row is a feature in
// ink with its limit right under it in muted ink, at the same size and in the same cell (PHILOSOPHY principle 3: the
// limit sits beside the promise). Then one note under the ledger. Text only: until the captures lane has real 2.0.0
// stills, nothing here pictures Pebble's interface.
//
// Detail on demand (.work/page-declutter/PLAN.md): the rows no longer show all at once.
// - "tabs": parallel reaches of equal weight, one at a time (Tabs: tabs from 768 px, an accordion below).
// - "rows": hairline disclosure rows, each closed on its term (Disclosure).
// Either way a feature and its limit open together, and every row stays in the DOM.
import type { LedgerRow } from "@/content/copy";
import { inline } from "@/lib/inline";
import { Disclosure, DisclosureGroup } from "@/components/ui/Disclosure";
import { Tabs } from "@/components/ui/Tabs";
import styles from "./FeatureLedger.module.css";

export type FeatureLedgerProps = Readonly<{
  rows: readonly LedgerRow[];
  note?: string;
  mode?: "tabs" | "rows";
  /** the tablist's accessible name (tabs mode) */
  label?: string;
}>;

function Cell({ row }: Readonly<{ row: LedgerRow }>) {
  return (
    <div className={styles.cell} data-row={row.id}>
      <p className={styles.text}>{inline(row.text)}</p>
      <p className={styles.limit}>{inline(row.limit)}</p>
    </div>
  );
}

export function FeatureLedger({ rows, note, mode = "rows", label = "" }: FeatureLedgerProps) {
  return (
    <>
      {mode === "tabs" ? (
        <Tabs label={label} items={rows.map((row) => ({ id: row.id, label: row.term, content: <Cell row={row} /> }))} />
      ) : (
        <DisclosureGroup>
          {rows.map((row) => (
            <Disclosure key={row.id} summary={row.term}>
              <Cell row={row} />
            </Disclosure>
          ))}
        </DisclosureGroup>
      )}
      {note ? <p className={styles.note}>{inline(note)}</p> : null}
    </>
  );
}
