// The benchmark strip under the hero (the lead's direction, 31 Oct 17:30): golden set 2.0's headline, the README's bold
// line whole, and its two "Tasks done correctly" rows, each Pebble beside the other product with a bar on the same
// 0–255 scale, then a link to the Benchmarks section. It sits on the hero's ground and grid, in the hero's type, with a
// hairline above it: a line of evidence under the promise, not an advert. Static: nothing moves here.
//
// It renders only while releaseFacts.benchmarksPublic is true, like the section it points at. The product names it
// prints pass the copy lint only inside <aside id="benchmark-strip"> (tools/qa/copy-lint.mjs NAMED, CLAIMS C-GS-16).
//
//   ───────────────────────────────────────────────────────────────────────────────────────────────────────
//   Pebble 2.0 against Claude Code and Codex: more        Tasks done correctly
//   tasks done correctly, fewer false completions,        Against Claude Code (claude-opus-5-5)
//   lower cost per task.                                  Pebble       ███████████████████████░░  235 of 255
//   Each comparison used one model for both products.     Claude Code  █████████████████████░░░░  213 of 255
//   See how it was measured ›                             Against Codex (gpt-6.1-sol) …
import type { CSSProperties } from "react";
import { golden, goldenCell, goldenRow, type GoldenTable } from "@/content/benchmarks";
import { releaseFacts } from "@/content/releaseFacts";
import { TextLink } from "@/components/ui/TextLink";
import { sectionHref } from "@/lib/sections";
import styles from "./BenchmarkStrip.module.css";

export const STRIP_ID = "benchmark-strip";

function Bar({ name, tone, text }: { name: string; tone: "pebble" | "other"; text: string }) {
  const cell = goldenCell(text);
  const of = /^ of (\d+)$/.exec(cell.tail);
  const max = of ? Number(of[1]) : cell.value;
  return (
    <div className={styles.line} data-tone={tone}>
      <dt className={styles.who}>{name}</dt>
      <dd className={styles.value}>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={{ "--w": `${((cell.value / max) * 100).toFixed(2)}%` } as CSSProperties} />
        </span>
        <span className="data">
          {cell.figure}
          {cell.tail}
        </span>
      </dd>
    </div>
  );
}

export function BenchmarkStrip({ open = releaseFacts.benchmarksPublic }: { open?: boolean } = {}) {
  if (!open) return null;
  const s = golden.strip;
  const tables = golden.result.tables as readonly GoldenTable[];
  return (
    <aside id={STRIP_ID} className={styles.strip} aria-labelledby={`${STRIP_ID}-title`}>
      <div className={`wrap grid-12 ${styles.grid}`}>
        <div className={styles.words}>
          <p id={`${STRIP_ID}-title`} className={styles.headline}>
            {s.headline}
          </p>
          <p className={styles.note}>{s.note}</p>
          <p className={styles.link}>
            <TextLink href={sectionHref("benchmarks")}>{s.link}</TextLink>
          </p>
        </div>
        <div className={styles.figures}>
          <p className={styles.measure}>{s.measure}</p>
          {tables.map((table) => {
            const row = goldenRow(table, s.measure);
            return (
              <div key={table.id} className={styles.pair}>
                <p className={styles.against}>
                  {table.caption.replace(` (${table.model})`, "")} <span className="data">({table.model})</span>
                </p>
                <dl className={styles.lines}>
                  <Bar name={golden.result.columns.pebble} tone="pebble" text={row.pebble.replace(/ \(.*\)$/, "")} />
                  <Bar name={table.other} tone="other" text={row.other.replace(/ \(.*\)$/, "")} />
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
