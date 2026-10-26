// The aperture's bands on a render (added after the craft review: CR-07, CR-15). At the Drop the narrow frame must
// open on the music's hit in every aspect; the review measured the 9:16 bands still closed 21 frames after it. This
// measures the bands' heights on each frame and finds the frame they start to open; the plan-level check is
// setpieces/qa.ts hitSync().
//
// A band's edge is the strongest one-pixel step from dark to light going inward from the frame's edge (within
// `maxBandShare` of the frame's height), on a few columns (their median); the band's height is the number of rows before
// the first light row. The bands are opaque night green and the picture inside is the riverbed or a card, so the step is
// large even where a light leak lies over the band.
// Pure: 8-bit grey frames in.

export interface BandHeights {
  top: number;
  bottom: number;
}

export interface BandOptions {
  /** columns to measure on, as shares of the width (their median is taken) */
  cols?: readonly number[];
  /** the deepest a band may reach, as a share of the frame's height */
  maxBandShare?: number;
  /** the smallest step (grey levels, between neighbouring rows) that counts as a band's edge */
  minStep?: number;
}

export const BANDS = { cols: [0.08, 0.2, 0.8, 0.92], maxBandShare: 0.4, minStep: 40 } as const;

const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** The top and bottom band heights of a grey frame, px (0 where no band edge is found). */
export function bandHeights(frame: Uint8Array, W: number, H: number, o: BandOptions = {}): BandHeights {
  const cols = o.cols ?? BANDS.cols;
  const maxY = Math.floor(H * (o.maxBandShare ?? BANDS.maxBandShare));
  const minStep = o.minStep ?? BANDS.minStep;
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (const c of cols) {
    const x = Math.min(W - 1, Math.max(0, Math.round(c * (W - 1))));
    let best = 0;
    let at = 0;
    // from the top: the first light row below the band (its index is the band's height)
    for (let y = 1; y < maxY; y++) {
      const step = frame[y * W + x]! - frame[(y - 1) * W + x]!;
      if (step > best) {
        best = step;
        at = y;
      }
    }
    tops.push(best >= minStep ? at : 0);
    best = 0;
    at = 0;
    // from the bottom: the last light row above the band
    for (let y = H - 2; y > H - 1 - maxY; y--) {
      const step = frame[y * W + x]! - frame[(y + 1) * W + x]!;
      if (step > best) {
        best = step;
        at = H - 1 - y;
      }
    }
    bottoms.push(best >= minStep ? at : 0);
  }
  return { top: med(tops), bottom: med(bottoms) };
}

/**
 * The frame the bands start to open: the first frame from `from` on whose top or bottom band is more than `minPx` below
 * its resting height (the median over `rest`), and keeps shrinking for the next frames (so one noisy frame is not an
 * opening). Null when they never open.
 */
export function openingStart(series: readonly (BandHeights | undefined)[], rest: { from: number; to: number }, from: number, minPx = 1.5): number | null {
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (let f = rest.from; f < rest.to; f++) {
    const b = series[f];
    if (b) {
      tops.push(b.top);
      bottoms.push(b.bottom);
    }
  }
  if (!tops.length) return null;
  const t0 = med(tops);
  const b0 = med(bottoms);
  const opened = (f: number) => {
    const b = series[f];
    return !!b && (b.top < t0 - minPx || b.bottom < b0 - minPx);
  };
  for (let f = from; f < series.length; f++) if (opened(f) && opened(f + 1) && opened(f + 2)) return f;
  return null;
}
