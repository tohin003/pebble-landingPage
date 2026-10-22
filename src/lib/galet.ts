// The galet: the pebble's own silhouette, the site's one ownable brand device (docs/DESIGN.md §1, critic M9). It is the
// wordmark's period, the play button, the chapter marks, the rail stones, the dial thumb and the shape of media masks.
//
// Drawn from Pebble's character engine (shared/pebble: the `galet` profile of bloub, scaled by PEBBLE_SCALE): 20 points
// of the profile joined by a closed centripetal Catmull-Rom curve, then moved so its box starts at 0,0. Same shape as the
// pebble's body, at a fraction of the path data. CSS has the same path as a mask (`--galet-mask` in globals.css).

/** 130 × 115 box; the curve touches all four edges. */
export const GALET_VIEWBOX = "0 0 130 115";
export const GALET_WIDTH = 130;
export const GALET_HEIGHT = 115;

export const GALET_PATH =
  "M129.1 55.8C128.2 61.8 126.1 67.9 123.6 73.3C121.1 78.7 118.2 83.5 114.2 88.3C109.8 93.7 103.4 99.8 97.7 103.7C92.7 107.2 87.8 109.5 82.5 111.3C77.1 113 71.3 114 65.6 114.2C60 114.3 54.1 113.5 48.6 112C43 110.5 37.8 108.5 32.5 105.3C26.3 101.6 18.9 95.8 14 90.3C9.7 85.4 6.4 80.2 4 74.4C1.7 68.7 0.1 62 0 55.8C-0.1 49.5 1.2 42.7 3.6 37C6 31.3 9.7 26 14.4 21.5C19.6 16.5 27.9 11.9 34.3 8.9C39.7 6.4 44.7 5.4 49.9 4C55.1 2.7 60.3 1.7 65.6 1C71.1 0.3 76.8 -0.3 82.5 0.1C88.4 0.6 94.5 1.2 100.3 3.8C107.2 6.9 115.8 13.1 120.6 19C124.8 24.2 127.2 30.5 128.6 36.7C130 42.8 130 49.6 129.1 55.8Z";
