// Where each film face puts its baseline, so text can be placed by its baseline (FILM_SPEC §6–§8 give baselines).
// Measured on the FontMetrics still (stills/FontMetrics.tsx): "H" at 200 px, line-height 1, box top at y 100.
// For line-height L the baseline sits (L − 1) / 2 em lower (half the extra leading above the line).
import { TYPO, type TypoRole } from "../motion/spec";

/** Baseline below the top of a line-height-1 box, em; and x-heights, em (Inter at opsz 32, Fraunces at display opsz). */
export const FACE_METRICS = {
  display: { baseline: 0.86, xHeight: 0.435, capHeight: 0.705 },
  sans: { baseline: 0.865, xHeight: 0.52, capHeight: 0.73 },
  mono: { baseline: 0.855, xHeight: 0.535, capHeight: 0.715 },
} as const;

/** The top of a role's first line box, given where its baseline must sit. */
export function topForBaseline(baselineY: number, size: number, role: TypoRole): number {
  const t = TYPO[role];
  const m = FACE_METRICS[t.family as keyof typeof FACE_METRICS];
  return baselineY - (m.baseline + (t.leading - 1) / 2) * size;
}

/** The height of a block of `lines` lines of a role. */
export const blockHeight = (lines: number, size: number, role: TypoRole) => lines * size * TYPO[role].leading;
