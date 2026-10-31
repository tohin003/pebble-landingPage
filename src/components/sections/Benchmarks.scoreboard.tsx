// Golden set 2.0's moment at the top of the Benchmarks section (the lead's direction, 31 Oct 17:30: "the page's proudest
// moment"), in three parts, each its own text equivalent:
//
//   More tasks done correctly, fewer false completions, lower cost per task.      README.md@v2.0.0:392, in Fraunces
//
//   Tasks done correctly
//     Against Claude Code (claude-opus-5-5)       Against Codex (gpt-6.1-sol)
//     Pebble        235 of 255 (92.2 %)           Pebble        243 of 255 (95.3 %)
//     ██████████████████████████████████░░        ████████████████████████████████████░
//     Claude Code   213 of 255 (83.5 %)           Codex         231 of 255 (90.6 %)
//     ██████████████████████████████░░░░░░        ██████████████████████████████████░░░
//   Said done when it was not   … the same, 6.3 % / 13.7 %, 3.9 % / 7.1 %
//   Cost per task               … the same, $0.091 / $0.117, $0.042 / $0.050
//
//   The paired difference, drawn: a zero line, each comparison's 95 % interval as a sage band with its dot, both to
//   the right of zero (+8.6, +3.1 to +14.9; +4.7, +0.4 to +9.4), the README's two lines as the caption.
//
//   Where Pebble led | Where Pebble trailed: a pair at the same weight, in the same type.
//
// Every figure is a README table cell (benchmarks.ts `golden.result.tables`), split for display by goldenCell() and
// printed whole: the HTML reads "235 of 255 (92.2 %)" exactly. Bars start at zero; a count's bar runs to its
// denominator (255), a rate's or a price's to the largest of its measure's four values, so both comparisons of a
// measure share one scale. Pebble's bars are the pebble's sage, the other product's a warm grey; every word and value
// stays in ink or muted ink. The bars grow and the figures count up once, only with motion on (Benchmarks.grow.tsx).
import type { CSSProperties } from "react";
import { golden, goldenCell, goldenRow, signed, type GoldenTable } from "@/content/benchmarks";
import { Figures } from "./Benchmarks.figures";
import { Grow } from "./Benchmarks.grow";
import styles from "./Benchmarks.glory.module.css";

type Tone = "pebble" | "other";
const vars = (v: Record<string, string>) => v as CSSProperties;
/** "Against Claude Code (claude-opus-5-5)" → "Against Claude Code" */
const against = (table: GoldenTable) => table.caption.replace(` (${table.model})`, "");
/** a measure's id: "Tasks done correctly" → "golden-score-tasks-done-correctly" */
const measureId = (measure: string) => `golden-score-${measure.toLowerCase().replace(/[^a-z]+/g, "-")}`;

/** One product's line in a comparison: its name, its figure (counted), then its bar on the measure's scale. */
function Line({ name, tone, text, max }: { name: string; tone: Tone; text: string; max: number }) {
  const cell = goldenCell(text);
  return (
    <div className={styles.line} data-tone={tone}>
      <dt className={styles.who}>{name}</dt>
      <dd className={styles.value}>
        <span className={styles.big}>
          <span className={`data ${styles.figure}`} data-count={cell.figure}>
            {cell.figure}
          </span>
        </span>
        {cell.tail ? <span className={`data ${styles.tail}`}>{cell.tail}</span> : null}
        {cell.share ? (
          <>
            {" "}
            <span className={`data ${styles.share}`}>({cell.share})</span>
          </>
        ) : null}
        <span className={styles.track} aria-hidden="true">
          <span className={styles.fill} style={vars({ "--w": `${((cell.value / max) * 100).toFixed(2)}%` })} />
        </span>
      </dd>
    </div>
  );
}

/** The three comparisons: one block per measure, each Pebble beside Claude Code and beside Codex. */
export function Scoreboard() {
  const tables = golden.result.tables as readonly GoldenTable[];
  return (
    <div className={styles.board}>
      <p className={styles.headline}>{golden.scoreboard.headline}</p>
      <Grow className={styles.measures}>
        {golden.scoreboard.measures.map((measure) => {
          const rows = tables.map((table) => ({ table, row: goldenRow(table, measure) }));
          const first = goldenCell(rows[0]!.row.pebble);
          // a count runs to its denominator ("of 255"); a rate or a price to its measure's largest value
          const of = /^ of (\d+)$/.exec(first.tail);
          const max = of ? Number(of[1]) : Math.max(...rows.flatMap(({ row }) => [goldenCell(row.pebble).value, goldenCell(row.other).value]));
          const id = measureId(measure);
          return (
            <div key={measure} className={styles.measure} role="group" aria-labelledby={id}>
              <h3 id={id} className={styles.measureTitle}>
                {measure}
              </h3>
              <div className={styles.pairs}>
                {rows.map(({ table, row }) => (
                  <div key={table.id} className={styles.pair}>
                    <p className={styles.against}>
                      {against(table)} <span className={`data ${styles.model}`}>({table.model})</span>
                    </p>
                    <dl className={styles.lines}>
                      <Line name={golden.result.columns.pebble} tone="pebble" text={row.pebble} max={max} />
                      <Line name={table.other} tone="other" text={row.other} max={max} />
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Grow>
      <ul className={styles.boardNotes}>
        {golden.scoreboard.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

/** The difference axis: LO to HI points, a tick every 5. Zero sits a third of the way in. */
const LO = -10;
const HI = 20;
const TICKS = [-10, -5, 0, 5, 10, 15, 20] as const;
const dx = (v: number) => ((v - LO) / (HI - LO)) * 100;
const pctOf = (x: number) => `${x.toFixed(3)}%`;

/** The paired difference, drawn: the section's chart that leads. The caption says every number in words. */
export function DifferenceFigure() {
  const c = golden.chart;
  return (
    <figure className={styles.diff} aria-labelledby="golden-diff-title">
      <p id="golden-diff-title" className={styles.diffTitle}>
        <Figures text={c.title} />
      </p>
      <Grow className={styles.diffPlot}>
        <div aria-hidden="true">
          {c.rows.map((row, i) => {
            const [lo, hi] = row.interval;
            const origin = ((row.points - lo) / (hi - lo)) * 100;
            return (
              <div key={row.id} className={styles.diffRow} style={vars({ "--i": String(i) })}>
                <p className={styles.diffLabel}>
                  {row.against} <span className={`data ${styles.model}`}>({row.model})</span>
                </p>
                <div className={styles.diffTrack}>
                  <span className={styles.zero} style={{ left: pctOf(dx(0)) }} />
                  <span
                    className={styles.band}
                    style={vars({ left: pctOf(dx(lo)), width: pctOf(dx(hi) - dx(lo)), "--origin": `${origin.toFixed(2)}%` })}
                  />
                  <span className={styles.diffDot} style={{ left: pctOf(dx(row.points)) }} />
                  <span className={`data ${styles.diffValue}`} style={{ left: pctOf(dx(row.points)) }}>
                    {signed(row.points)} points
                  </span>
                  <span className={`data ${styles.diffEnd}`} style={{ left: pctOf(dx(lo)) }}>
                    {signed(lo)}
                  </span>
                  <span className={`data ${styles.diffEnd}`} style={{ left: pctOf(dx(hi)) }} data-end="hi">
                    {signed(hi)}
                  </span>
                </div>
              </div>
            );
          })}
          <div className={styles.diffAxisRow}>
            <span className={styles.diffLabel} />
            <div className={styles.diffAxis}>
              <span className={styles.zero} style={{ left: pctOf(dx(0)) }} />
              {TICKS.map((t) => (
                <span
                  key={t}
                  className={`data ${styles.diffTick}`}
                  style={{ left: pctOf(dx(t)) }}
                  data-zero={t === 0 || undefined}
                  data-edge={t === LO ? "start" : t === HI ? "end" : undefined}
                >
                  {t === 0 ? "0" : signed(t).replace(/\.0$/, "")}
                </span>
              ))}
            </div>
          </div>
          <div className={styles.diffAxisRow}>
            <span className={styles.diffLabel} />
            <p className={styles.diffSides}>
              <span>{c.left}</span>
              <span>{c.right}</span>
            </p>
          </div>
        </div>
      </Grow>
      {/* the README's own lines: the chart's words, for every reader */}
      <figcaption className={styles.diffCaption}>
        <ul>
          {golden.result.differences.map((line) => (
            <li key={line}>
              <Figures text={line} />
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** Where Pebble led and where it trailed: a pair at the same weight, in the same type. */
export function LedTrailed() {
  return (
    <div className={styles.sidePair}>
      {[golden.pair.led, golden.pair.trailed].map((side) => (
        <div key={side.title} className={styles.side}>
          <h3 className={styles.sideTitle}>{side.title}</h3>
          <p className={styles.sideRule}>
            <Figures text={side.rule} />
          </p>
          <ul className={styles.sideList}>
            {side.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
