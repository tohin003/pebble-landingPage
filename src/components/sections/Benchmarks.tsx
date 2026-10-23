// Section 10b, Benchmarks: "Measured, not claimed" (the lead's decision; PHILOSOPHY "Evidence, presented"; OVERRIDES
// §11, §16, §18), right after Built like infrastructure. Pebble against Claude Code CLI on the same model.
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
import { benchmarkLinks, benchmarks, run } from "@/content/benchmarks";
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

export type BenchmarksProps = Readonly<{
  /** the gate (default: releaseFacts.benchmarksPublic); the tests pass false to check that nothing renders */
  open?: boolean;
  /** the version the page offers (default: src/lib/release.ts); a release this result doesn't cover gets a line */
  offered?: string;
}>;

function Row({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <h3 id={id} className={styles.rowTitle}>
        {title}
      </h3>
      <div className={styles.rowBody}>{children}</div>
    </div>
  );
}

export async function Benchmarks({ open = releaseFacts.benchmarksPublic, offered }: BenchmarksProps = {}) {
  if (!open) return null;
  const version = offered ?? (await getRelease()).version;
  const unmeasured = !(run.coveredVersions as readonly string[]).includes(version);
  const b = benchmarks;
  return (
    <section id={SECTIONS.benchmarks} className={`sec ${styles.section}`} aria-labelledby="benchmarks-title">
      <SectionHead
        id="benchmarks-title"
        label={labels.benchmarks}
        title={b.h2}
        lead={<Figures text={b.lead} counts={COUNTS} />}
        action={<TextLink href={benchmarkLinks.results}>{b.resultsLink}</TextLink>}
      />

      <div className="wrap grid-12 sec-body">
        <div className={`main ${styles.ledger}`}>
          {/* 1. the method first */}
          <Row id="benchmarks-method" title={b.method.title}>
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
          <Row id="benchmarks-result" title={b.result.title}>
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
          <Row id="benchmarks-sides" title={b.sides.title}>
            <table className={styles.table} aria-labelledby="benchmarks-sides">
              <thead>
                <tr>
                  <th scope="col" className={styles.measureHead}>
                    {b.sides.columns.measure}
                  </th>
                  <th scope="col" className={styles.valueHead} data-tone="pebble">
                    <span className={styles.key} aria-hidden="true" />
                    {b.sides.columns.pebble}
                  </th>
                  <th scope="col" className={styles.valueHead} data-tone="other">
                    <span className={styles.key} aria-hidden="true" />
                    {b.sides.columns.other}
                  </th>
                </tr>
              </thead>
              {b.sides.groups.map((group) => (
                <tbody key={group.id} className={styles.group}>
                  <tr>
                    <th scope="rowgroup" colSpan={3} className={styles.groupTitle}>
                      {group.title}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.measure}>
                      <th scope="row" className={styles.measure}>
                        <span className={styles.measureName}>{row.measure}</span>
                        <span className={styles.measureNote}>
                          <Figures text={row.note} counts={COUNTS} />
                        </span>
                      </th>
                      <td className={styles.value}>
                        <Figures text={row.pebble} />
                      </td>
                      <td className={styles.value}>
                        <Figures text={row.other} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
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
          <Row id="benchmarks-cost" title={b.cost.title}>
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
          <Row id="benchmarks-limits" title={b.limits.title}>
            <ul className={styles.list}>
              {b.limits.items.map((item) => (
                <li key={item}>
                  <Figures text={item} counts={COUNTS} />
                </li>
              ))}
            </ul>
          </Row>

          {/* 6. the data, and how to run it again */}
          <Row id="benchmarks-data" title={b.data.title}>
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
