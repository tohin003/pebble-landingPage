// The real Settings › Memory capture S06 floats on the Daylight ground: Pebble 2.0.1's own frontend at the published
// tag v2.0.1 with sample data, recorded by the launch-ui lane (.work/launch/ui/UI_CAPTURE.md; capture/launch/).
//
// data/ui.ts (the lane's generated manifest) did not exist yet when S06 was built, so this file carries the few numbers
// S06 needs, copied from the clip's own timeline (.work/launch/ui/meta/launch-memory-dark.timeline.json). When
// data/ui.ts lands, the director (or this group) swaps these for its entry; the numbers must agree.
import type { Box } from "../../camera";

/** The clip records the window at 2.5× its CSS size: CSS px × SCALE = clip px. */
const SCALE = 2.5;
const css = (b: readonly [number, number, number, number]): Box => ({ x: b[0] * SCALE, y: b[1] * SCALE, w: b[2] * SCALE, h: b[3] * SCALE });

export const MEMORY_CAPTURE = {
  src: "launch/ui/launch-memory-dark.mp4",
  size: { w: 3600, h: 2250 },
  fps: 60,
  /** 390 frames */
  duration: 6.5,
  /** the timeline's moments (seconds from the clip's first frame) */
  t: {
    /** the Facts & knowledge layer is clicked */
    layer: 1.3,
    /** its records are drawn */
    records: 1.6,
    /** the second record's trash is clicked: Keep and Forget appear */
    trash: 2.7,
    /** Forget is clicked */
    forget: 4.0,
    /** the record is gone, the layer's count 3 → 2 */
    after: 4.4,
  },
  /** boxes in clip px (from the timeline's CSS boxes) */
  box: {
    panel: css([320, 45, 800, 810]),
    layers: css([552, 170, 538, 111]),
    factsRecords: css([552, 459.1, 538, 249.6]),
    record: css([552, 542.3, 538, 117.8]),
    confirm: css([824.5, 552.3, 265.5, 33]),
    forget: css([883.5, 552.3, 61.3, 33]),
    /** the trash button on "Wheel taster: 10.00" (the record the take forgets) */
    trash: css([1060, 552.3, 30, 30]),
  },
} as const;
