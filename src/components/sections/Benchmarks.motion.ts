// The scoreboard's one-time grow-in, as plain functions (no React, no DOM types beyond strings), so the tests can check
// them without a browser (Benchmarks.glory.test.tsx).
//
// The rule (the lead's direction, 31 Oct 17:30; PHILOSOPHY principle 5): the server renders every figure at its final
// value and every bar at its full length, and that is what a visitor sees without JavaScript, with Pause motion pressed
// or with the system's Reduce motion. Only when html[data-motion="on"] and the scoreboard is still below the fold when
// the page hydrates does it arm: the bars start at zero and the figures count up once, together, when it scrolls into
// view. A deep link that lands on it, or a reader already looking at it, sees it still.

/** How long the bars grow and the figures count (ms): one movement, then nothing moves again. */
export const GROW_MS = 900;

/** The scoreboard's state, on its root as data-grow: none (still), armed (waiting below the fold), play, done. */
export type GrowState = "still" | "armed" | "play" | "done";

/**
 * What the scoreboard does at hydration: arm only when motion is on and it is not yet in view. "paused" (Pause motion
 * or the system's Reduce motion: src/lib/motion.ts writes either as "paused") and a missing attribute (no script)
 * both mean still.
 */
export function growPlan(motion: string | null | undefined, inView: boolean): "still" | "armed" {
  return motion === "on" && !inView ? "armed" : "still";
}

/** The figure at progress t (0 to 1, eased by the caller): the final text's prefix, decimals and suffix kept. */
export function countText(final: string, t: number): string {
  const m = /^(\D*?)(\d+(?:\.(\d+))?)(.*)$/.exec(final);
  if (!m) return final;
  const [, prefix, number, decimals = "", suffix] = m;
  if (t >= 1) return final;
  const value = Number(number) * Math.max(0, t);
  return `${prefix}${value.toFixed(decimals.length)}${suffix}`;
}

/** An ease-out for the count, matching the bars' --ease-enter closely enough to read as one movement. */
export function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 4);
}
