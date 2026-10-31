// Section 10b, Benchmarks: "Measured, not claimed" (the lead's decision; PHILOSOPHY "Evidence, presented"; OVERRIDES
// §11, §16, §18), right after Built like infrastructure.
//
// Since Pebble 2.0.0 (the "2.0.0 published" post, STATUS 2026-10-31 14:53) it leads with the latest run, golden set 2.0:
// Pebble against Claude Code and against Codex, one model for both products in each comparison (content: benchmarks.ts
// `golden`, every figure as README.md@v2.0.0's tables print it). In the philosophy's order, one ruled row each: how it
// was measured; the result (the README's two tables, then the paired differences); where Pebble led and where it
// trailed, at the same weight, with cost and time said to be reported, not claimed; what it doesn't prove (gate 6 and
// the probes weren't run); the data (the 2.0.0 release notes). No chart is drawn for it: the README publishes no
// interval per product, only the paired differences, printed as data. Then, under its own dated heading, the 1.0.2 run
// below as published history (its rows' titles one level down), with everything that follows:
//
// It renders only while releaseFacts.benchmarksPublic is true (src/content/releaseFacts.ts), and every number in it is
// published (src/content/benchmarks.ts, checked against Pebble's analysis by benchmarks.test.ts). The order is the
// philosophy's, one ruled row each, the title in the main column's first three columns and the evidence in the other
// six (one column below 1024 px):
//   1. how it was measured: the model, the builds, the tasks, the conditions, the grading, what was fixed in advance;
//   2. the overall result with its interval: the chart that leads (the paired difference crossing a centred zero),
//      the success rates with their counts, the figure's words, and the 23 October correction beside them;
//   3. where Pebble was ahead and where it was behind, in one table, at the same weight and in the same type;
//   4. what it cost, printed plainly, with its caveats;
//   5. what this doesn't prove;
//   6. the data, and how to run it again (Pebble's `main`, which carries the correction).
// The only headline is the allowed one, word for word. No stat tiles, no win or loss colours, no animation: numbers are
// data (Geist Mono, tabular figures), each rate with its count.
import type { ReactNode } from "react";
import { benchmarkLinks, benchmarks, golden, run } from "@/content/benchmarks";
import { labels } from "@/content/labels";
import { releaseFacts } from "@/content/releaseFacts";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { DifferenceChart, SuccessChart } from "./Benchmarks.chart";
import { Figures } from "./Benchmarks.figures";
import styles from "./Benchmarks.module.css";

/** Words in which bare numbers are counts (rendered as data): "45 tasks", "135 runs" … */
const COUNTS = ["tasks", "runs", "false completions"];
/** the ids of the table's headers start with this */
const TABLE = "benchmarks-sides-table";

export type BenchmarksProps = Readonly<{
  /** the gate (default: releaseFacts.benchmarksPublic); the tests pass false to check that nothing renders */
  open?: boolean;
  /** the version the page offers (default: src/lib/release.ts); a release this result doesn't cover gets a line */
  offered?: string;
}>;

/**
 * A measured value in the table, set as lines on purpose instead of wrapping wherever the column ends: "88.9 % (32 of
 * 36)" is the rate, then its count on a line of its own in muted ink; "82.2 % and 75.6 %" is two lines (the row's note
 * says which is which; "and" stays for screen readers). The words are benchmarks.ts's, unchanged.
 */
function Value({ text }: { text: string }) {
  const parts = text.split(" and ");
  return (
    <>
      {parts.map((part, i) => {
        const counted = /^(.*?) \((.*)\)$/.exec(part);
        return (
          <span key={i} className={styles.valueLine}>
            {i > 0 ? <span className="sr-only">and </span> : null}
            {counted ? (
              <>
                <Figures text={counted[1]!} />{" "}
                <span className={styles.count}>
                  (<Figures text={counted[2]!} />)
                </span>
              </>
            ) : (
              <Figures text={part} />
            )}
          </span>
        );
      })}
    </>
  );
}

function Row({ id, title, level = 3, children }: { id: string; title: string; level?: 3 | 4; children: ReactNode }) {
  const Heading = level === 4 ? "h4" : "h3";
  return (
    <div className={styles.row}>
      <Heading id={id} className={styles.rowTitle}>
        {title}
      </Heading>
      <div className={styles.rowBody}>{children}</div>
    </div>
  );
}

/** The model ids ("claude-opus-5-5", "gpt-6.1-sol") are data whole; everything else goes through Figures. */
const MODEL_ID = /(claude-opus-5-5|gpt-6\.1-sol)/;
function GoldenText({ text }: { text: string }) {
  return (
    <>
      {text.split(MODEL_ID).map((part, i) =>
        MODEL_ID.test(part) ? (
          <span key={i} className="data">
            {part}
          </span>
        ) : part ? (
          <Figures key={i} text={part} counts={COUNTS} />
        ) : null,
      )}
    </>
  );
}

/** One of the README's two tables, every cell as it prints it; the cells read as data, the rate's share in muted ink. */
function GoldenTable({ table }: { table: (typeof golden.result.tables)[number] }) {
  const id = `golden-${table.id}`;
  return (
    <table className={`${styles.table} ${styles.goldenTable}`} aria-labelledby={id}>
      <caption id={id} className={styles.goldenCaption}>
        <GoldenText text={table.caption} />
      </caption>
      <thead>
        <tr>
          <th scope="col" className={styles.measureHead}>
            {golden.result.columns.measure}
          </th>
          <th scope="col" className={styles.valueHead} data-tone="pebble">
            <span className={styles.key} aria-hidden="true" />
            {golden.result.columns.pebble}
          </th>
          <th scope="col" className={styles.valueHead} data-tone="other">
            <span className={styles.key} aria-hidden="true" />
            {table.other}
          </th>
        </tr>
      </thead>
      <tbody className={styles.group}>
        {table.rows.map((row) => (
          <tr key={row.measure}>
            <th scope="row" className={styles.measure}>
              <span className={styles.measureName}>{row.measure}</span>
            </th>
            <td className={styles.value}>
              <Value text={row.pebble} />
            </td>
            <td className={styles.value}>
              <Value text={row.other} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function Benchmarks({ open = releaseFacts.benchmarksPublic, offered }: BenchmarksProps = {}) {
  if (!open) return null;
  const version = offered ?? (await getRelease()).version;
  const unmeasured = !(run.coveredVersions as readonly string[]).includes(version);
  const b = benchmarks;
  const g = golden;
  return (
    <section id={SECTIONS.benchmarks} className={`sec ${styles.section}`} aria-labelledby="benchmarks-title">
      <SectionHead
        id="benchmarks-title"
        label={labels.benchmarks}
        title={g.h2}
        then={g.then}
        lead={<Figures text={g.lead} counts={COUNTS} />}
        action={<TextLink href={benchmarkLinks.releaseNotes200}>{g.notesLink}</TextLink>}
      />

      {/* golden set 2.0, the latest run */}
      <div className="wrap grid-12 sec-body">
        <div className={`main ${styles.ledger}`} data-run="golden-2.0">
          <Row id="golden-method" title={g.method.title}>
            <dl className={styles.method}>
              {g.method.items.map((item) => (
                <div key={item.term} className={styles.methodItem}>
                  <dt>{item.term}</dt>
                  <dd>
                    <GoldenText text={item.text} />
                  </dd>
                </div>
              ))}
            </dl>
          </Row>

          <Row id="golden-result" title={g.result.title}>
            <div className={styles.goldenTables}>
              {g.result.tables.map((table) => (
                <GoldenTable key={table.id} table={table} />
              ))}
            </div>
            <div className={styles.goldenDifference}>
              <p>{g.result.differenceTitle}</p>
              <ul className={styles.list}>
                {g.result.differences.map((line) => (
                  <li key={line}>
                    <Figures text={line} />
                  </li>
                ))}
              </ul>
              <p className={styles.goldenGates}>
                <Figures text={g.result.gates} />
              </p>
            </div>
          </Row>

          <Row id="golden-sides" title={g.sides.title}>
            <p className={styles.goldenSide}>
              <Figures text={g.sides.led} />
            </p>
            <p className={styles.goldenSide}>
              <Figures text={g.sides.trailed} />
            </p>
            <ul className={styles.notes}>
              {g.reported.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Row>

          <Row id="golden-limits" title={g.limits.title}>
            <ul className={styles.list}>
              {g.limits.items.map((item) => (
                <li key={item}>
                  <Figures text={item} />
                </li>
              ))}
            </ul>
          </Row>

          <Row id="golden-data" title={g.data.title}>
            <ul className={styles.links}>
              <li>
                <TextLink href={benchmarkLinks.releaseNotes200}>{g.data.line}</TextLink>
              </li>
            </ul>
          </Row>
        </div>
      </div>

      {/* the 1.0.2 run, below, as published history */}
      <div className={`wrap grid-12 ${styles.earlierBody}`}>
        <div className={`main ${styles.ledger}`} data-run="corpus-24a-1.0.2">
          <div className={styles.earlierHead}>
            <h3 id="benchmarks-earlier" className={styles.earlierTitle}>
              <Figures text={g.earlier.title} />
            </h3>
            <p className={styles.earlierLine}>{b.h2}</p>
            <p className={styles.earlierLead}>
              <Figures text={b.lead} counts={COUNTS} />
            </p>
            <p className={styles.earlierLink}>
              <TextLink href={benchmarkLinks.results}>{b.resultsLink}</TextLink>
            </p>
          </div>

          {/* 1. the method first */}
          <Row id="benchmarks-method" title={b.method.title} level={4}>
            <dl className={styles.method}>
              {b.method.items.map((item) => (
                <div key={item.term} className={styles.methodItem}>
                  <dt>{item.term}</dt>
                  <dd>
                    <Figures text={item.text} counts={COUNTS} />
                    {item.term === "Builds" && unmeasured ? (
                      <>
                        {" "}
                        <Figures text={b.method.notMeasured(version)} />
                      </>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </Row>

          {/* 2. the overall result, with its interval, its counts and the correction beside it */}
          <Row id="benchmarks-result" title={b.result.title} level={4}>
            <figure className={styles.figure}>
              <div className={styles.charts} aria-hidden="true">
                <DifferenceChart />
                <SuccessChart />
              </div>
              <figcaption className={styles.caption}>
                <Figures text={b.result.caption} counts={COUNTS} /> <Figures text={b.result.intervalNote} />
              </figcaption>
            </figure>
            <div className={styles.correction}>
              <p>
                <strong className={styles.correctionTitle}>
                  <Figures text={b.correction.title} />
                </strong>{" "}
                <Figures text={b.correction.body} counts={COUNTS} />
              </p>
              <p className={styles.correctionLink}>
                <TextLink href={benchmarkLinks.correction}>{b.correction.link}</TextLink>
              </p>
            </div>
          </Row>

          {/* 3. ahead and behind, at the same weight */}
          <Row id="benchmarks-sides" title={b.sides.title} level={4}>
            {/* Every cell names its headers (headers and id): the group ("Behind"), the measure and the product. Not all
                screen readers apply scope="rowgroup", and axe can't resolve it (QA F-AXE-1); explicit headers can't be
                misread. */}
            <table className={styles.table} aria-labelledby="benchmarks-sides">
              <thead>
                <tr>
                  <th scope="col" id={`${TABLE}-measure`} className={styles.measureHead}>
                    {b.sides.columns.measure}
                  </th>
                  <th scope="col" id={`${TABLE}-pebble`} className={styles.valueHead} data-tone="pebble">
                    <span className={styles.key} aria-hidden="true" />
                    {b.sides.columns.pebble}
                  </th>
                  <th scope="col" id={`${TABLE}-other`} className={styles.valueHead} data-tone="other">
                    <span className={styles.key} aria-hidden="true" />
                    {b.sides.columns.other}
                  </th>
                </tr>
              </thead>
              {b.sides.groups.map((group) => {
                const groupId = `${TABLE}-${group.id}`;
                return (
                  <tbody key={group.id} className={styles.group}>
                    <tr>
                      <th scope="rowgroup" colSpan={3} id={groupId} className={styles.groupTitle}>
                        {group.title}
                      </th>
                    </tr>
                    {group.rows.map((row, i) => {
                      const rowId = `${groupId}-${i + 1}`;
                      return (
                        <tr key={row.measure}>
                          <th scope="row" id={rowId} headers={`${groupId} ${TABLE}-measure`} className={styles.measure}>
                            <span className={styles.measureName}>{row.measure}</span>
                            <span className={styles.measureNote}>
                              <Figures text={row.note} counts={COUNTS} />
                            </span>
                          </th>
                          <td headers={`${groupId} ${rowId} ${TABLE}-pebble`} className={styles.value}>
                            <Value text={row.pebble} />
                          </td>
                          <td headers={`${groupId} ${rowId} ${TABLE}-other`} className={styles.value}>
                            <Value text={row.other} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
            <ul className={styles.notes}>
              {b.sides.notes.map((note) => (
                <li key={note}>
                  <Figures text={note} counts={COUNTS} />
                </li>
              ))}
            </ul>
          </Row>

          {/* 4. the cost, printed plainly */}
          <Row id="benchmarks-cost" title={b.cost.title} level={4}>
            <p className={styles.costLine}>
              <Figures text={b.cost.line} />
            </p>
            <ul className={styles.notes}>
              {b.cost.caveats.map((caveat) => (
                <li key={caveat}>
                  <Figures text={caveat} />
                </li>
              ))}
              <li>{b.cost.reported}</li>
            </ul>
          </Row>

          {/* 5. what it doesn't prove */}
          <Row id="benchmarks-limits" title={b.limits.title} level={4}>
            <ul className={styles.list}>
              {b.limits.items.map((item) => (
                <li key={item}>
                  <Figures text={item} counts={COUNTS} />
                </li>
              ))}
            </ul>
          </Row>

          {/* 6. the data, and how to run it again */}
          <Row id="benchmarks-data" title={b.data.title} level={4}>
            <p className={styles.stamp}>
              <Figures text={b.data.stamp} />
            </p>
            <ul className={styles.links}>
              {b.data.links.map((link) => (
                <li key={link.href}>
                  <TextLink href={link.href}>{link.label}</TextLink>
                </li>
              ))}
            </ul>
          </Row>
        </div>
      </div>
    </section>
  );
}
