// The overall result, drawn (PHILOSOPHY "Evidence, presented": "the chart that leads"). Our own drawing in the system:
//
//   Paired difference, Pebble minus Claude Code          the chart that leads: one ink mark, the zero centred
//                      −3.3 points
//               ├────────●──────┼──┤                     a dot at −3.3 with its 95 % whisker, −9.2 to +2.5
//              −9.2             │ +2.5
//   ──┬────────┬─────────┬──────┼──┬──────────┬──        the axis runs from −25 to +25 points, so the interval's
//    −20      −10        0          +10      +20          lean below zero stays visible (S2 §6.5)
//   Claude Code ahead                       Pebble ahead
//
//   Success, of 135 runs each
//   ● Pebble 1.0.2       ─────────────────├──●──┤──      79.3 % (107 of 135)    sage, Pebble's own colour
//   ● Claude Code 2.1.309 ─────────────────├──●──┤─      82.2 % (111 of 135)    a warm grey for the other agent
//                        0     25     50     75   100 %
//
// Hairlines, square ends, dots ringed in the page's colour (an outline, never a shadow), every value printed beside
// its mark in Geist Mono with tabular figures, and the words in ink, never in a mark's colour. The lines are SVG
// stretched to the box (x in per cent, y in pixels, strokes that don't scale); the dots and every word are HTML placed
// at the same percentages, so they stay round and crisp at any width. Static: nothing moves.
//
// For the eye only (aria-hidden): the figure's caption (Benchmarks.tsx) says every number in words.
import type { CSSProperties } from "react";
import { benchmarks, of, pct, run, signed, type ProductRun } from "@/content/benchmarks";
import { Figures } from "./Benchmarks.figures";
import styles from "./Benchmarks.module.css";

/** The difference axis: −SPAN to +SPAN points. */
const SPAN = 25;
const TICKS = [-20, -10, 0, 10, 20] as const;
/** a difference in points → per cent of the plot's width */
const dx = (v: number) => ((v + SPAN) / (2 * SPAN)) * 100;
/** a rate in per cent → per cent of the track's width */
const rx = (v: number) => v;
const at = (x: number): CSSProperties => ({ left: `${x.toFixed(3)}%` });

/** The difference panel's vertical layout, in pixels (Benchmarks.module.css .diffPlot is DIFF_H tall). */
const DIFF_H = 84;
const MARK_Y = 36;
const CAP = 6;

export function DifferenceChart() {
  const d = run.difference;
  const [lo, hi] = d.interval;
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>{benchmarks.result.difference.title}</p>
      <div className={styles.diffPlot} style={{ height: DIFF_H }}>
        <svg
          className={styles.lines}
          viewBox={`0 0 100 ${DIFF_H}`}
          preserveAspectRatio="none"
          width="100%"
          height={DIFF_H}
          focusable="false"
        >
          <line className={styles.axis} x1={0} x2={100} y1={DIFF_H - 0.5} y2={DIFF_H - 0.5} />
          {TICKS.map((t) => (
            <line key={t} className={styles.tick} x1={dx(t)} x2={dx(t)} y1={DIFF_H - 6} y2={DIFF_H} />
          ))}
          {/* the centred zero: no difference */}
          <line className={styles.zero} x1={dx(0)} x2={dx(0)} y1={22} y2={DIFF_H} />
          {/* the 95 % interval */}
          <line className={styles.whisker} x1={dx(lo)} x2={dx(hi)} y1={MARK_Y} y2={MARK_Y} />
          <line className={styles.whisker} x1={dx(lo)} x2={dx(lo)} y1={MARK_Y - CAP} y2={MARK_Y + CAP} />
          <line className={styles.whisker} x1={dx(hi)} x2={dx(hi)} y1={MARK_Y - CAP} y2={MARK_Y + CAP} />
        </svg>
        <span className={`${styles.dot} ${styles.dotInk}`} style={{ ...at(dx(d.points)), top: MARK_Y }} />
        <span className={`data ${styles.markLabel}`} style={at(dx(d.points))}>
          {benchmarks.result.difference.value}
        </span>
        <span className={`data ${styles.endLabel}`} style={{ ...at(dx(lo)), top: MARK_Y + 10 }}>
          {signed(lo)}
        </span>
        <span className={`data ${styles.endLabel}`} style={{ ...at(dx(hi)), top: MARK_Y + 10 }}>
          {signed(hi)}
        </span>
      </div>
      <div className={styles.ticks}>
        {TICKS.map((t) => (
          <span key={t} className="data" style={at(dx(t))}>
            {signed(t).replace(/\.0$/, "")}
          </span>
        ))}
      </div>
      <p className={styles.sides}>
        <span>{benchmarks.result.difference.left}</span>
        <span>{benchmarks.result.difference.right}</span>
      </p>
    </div>
  );
}

/** The success panel's track: the whisker zone, then a row for the interval's end labels (pixels). */
const TRACK_H = 20;
const TRACK_Y = 10;

/**
 * One product's success row: its key, name and build at the left and its rate with its count at the right, then a
 * 0–100 % track the width of the panel, with the 95 % interval as a whisker, the rate as a dot and the interval's two
 * ends printed under the whisker.
 */
function SuccessRow({ product, tone }: { product: ProductRun; tone: "pebble" | "other" }) {
  const [lo, hi] = product.interval;
  return (
    <li className={styles.successRow} data-tone={tone}>
      <p className={styles.successHead}>
        <span className={styles.who}>
          <span className={styles.key} />
          {product.name} <Figures text={product.build} className={styles.build} />
        </span>
        <span className={styles.rate}>
          <Figures text={pct(product.rate)} /> <span className={styles.rateCount}>(<Figures text={of(product.passed, run.runsPerProduct)} />)</span>
        </span>
      </p>
      <span className={styles.track}>
        <svg
          className={styles.lines}
          viewBox={`0 0 100 ${TRACK_H}`}
          preserveAspectRatio="none"
          width="100%"
          height={TRACK_H}
          focusable="false"
        >
          <line className={styles.baseline} x1={0} x2={100} y1={TRACK_Y} y2={TRACK_Y} />
          <line className={styles.interval} x1={rx(lo)} x2={rx(hi)} y1={TRACK_Y} y2={TRACK_Y} />
          <line className={styles.interval} x1={rx(lo)} x2={rx(lo)} y1={TRACK_Y - 5} y2={TRACK_Y + 5} />
          <line className={styles.interval} x1={rx(hi)} x2={rx(hi)} y1={TRACK_Y - 5} y2={TRACK_Y + 5} />
        </svg>
        <span className={styles.dot} style={{ ...at(rx(product.rate)), top: TRACK_Y }} />
        <span className={`data ${styles.endLabel}`} style={{ ...at(rx(lo)), top: TRACK_H + 2 }}>
          {lo.toFixed(1)}
        </span>
        <span className={`data ${styles.endLabel}`} style={{ ...at(rx(hi)), top: TRACK_H + 2 }}>
          {hi.toFixed(1)}
        </span>
      </span>
    </li>
  );
}

export function SuccessChart() {
  return (
    <div className={styles.panel}>
      <p className={styles.panelTitle}>
        <Figures text={benchmarks.result.success.title} counts={["runs"]} />
      </p>
      <ul className={styles.success}>
        <SuccessRow product={run.pebble} tone="pebble" />
        <SuccessRow product={run.claudeCode} tone="other" />
      </ul>
      <div className={styles.successAxis}>
        <svg className={styles.lines} viewBox="0 0 100 6" preserveAspectRatio="none" width="100%" height={6} focusable="false">
          <line className={styles.axis} x1={0} x2={100} y1={0.5} y2={0.5} />
          {[0, 25, 50, 75, 100].map((t) => (
            <line key={t} className={styles.tick} x1={rx(t)} x2={rx(t)} y1={0} y2={6} />
          ))}
        </svg>
      </div>
      <div className={styles.ticks}>
        {[0, 25, 50, 75, 100].map((t) => (
          <span key={t} className="data" style={at(rx(t))} data-edge={t === 0 ? "start" : t === 100 ? "end" : undefined}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
