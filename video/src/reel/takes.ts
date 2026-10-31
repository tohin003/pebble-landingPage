// The reel's real takes: where their frames are, which source frames exist, and the SAFE crops the reel may show. Pure.
//
// Source frame numbers in the reel are the FILES' numbers (1-based): the take manifests' 0-based frame + 1. The events
// below were read off the files (or are a manifest's event + 1).
//
// Frames: the edit lane's export of the kept 2.0.0 takes, `video/public/ui-frames/real-takes/<take>/<n>.jpg` (1-based,
// 5 digits, device px; gitignored), only the runs listed in `runs`. A shot that needs another source frame fails the
// check (check.ts), never renders a missing image.
//
// Crops are in the JPEGs' device px. Each one was chosen by eye on the frames it is used on (.work/reel/look/) and keeps
// out what TAKES_REPORT and the brief forbid: usage lines (tokens, seconds), the Activity panel's step timings, the
// Dock, the menu bar, Finder's iCloud sidebar, every Calendar cell but Monday 2's (the month view carries other
// calendars' events), and RS1-03's booking-page date. `allowed` is each crop's source-frame window: outside it the same
// region shows something the reel must not (RS15-01's usage line from ~924, its "Thinking ~1s" status after 516).
import type { Rect } from "../film2/motion/geometry";

export interface ReelTake {
  id: string;
  /** the picture's size, device px */
  w: number;
  h: number;
  /** source frames that exist on disk, inclusive runs */
  runs: readonly (readonly [number, number])[];
  /** named moments, source frames (the take manifests' events, plus ones read off the picture for the reel) */
  events: Readonly<Record<string, number>>;
}

export interface ReelCrop {
  take: string;
  rect: Rect;
  /** inclusive source-frame window this crop may show */
  allowed: readonly [number, number];
  /** the crop's own corner radius, device px (a window's rounded corner, when the crop is the window) */
  radius?: number;
  note: string;
}

const RETINA = { w: 2940, h: 1912 } as const;
const LARGER_TEXT = { w: 2048, h: 1332 } as const;

export const REEL_TAKES: Readonly<Record<string, ReelTake>> = {
  "RS15-01": {
    id: "RS15-01",
    ...RETINA,
    runs: [[241, 1060]],
    // the typed question's letters, read off the input box frame by frame (.work/reel/look, 1 Nov): the first letter of
    // each word, then "?" ; send at 516 (log)
    events: { W: 232, can: 300, you: 352, do: 410, now: 455, q: 491, send: 517, replyLands: 921 },
  },
  "RS1-03": { id: "RS1-03", ...RETINA, runs: [[181, 370]], events: { swipe: 238, slideVisible: 240, slideSettled: 262, pebbleBack: 270 } },
  "RS4-07": { id: "RS4-07", ...LARGER_TEXT, runs: [[3121, 3478]], events: { keysFrom: 3150, equals600: 3386 } },
  "RS5C-04": { id: "RS5C-04", ...LARGER_TEXT, runs: [[2799, 2922], [6109, 6332]], events: { doIt: 2907, calendarShown: 6109 } },
  "RS5F-03": { id: "RS5F-03", ...LARGER_TEXT, runs: [[2539, 2962]], events: { doIt: 2633, finderOpens: 2753 } },
  "RSW-01": { id: "RSW-01", ...RETINA, runs: [[5369, 5612]], events: { card: 5366 } },
  "RS13-03": { id: "RS13-03", ...RETINA, runs: [[257, 1185]], events: { opens: 262, lit: 346, enter: 432 } },
  "RS9A-01": { id: "RS9A-01", ...LARGER_TEXT, runs: [[1621, 1802]], events: { send: 1721, taskRunning: 1726 } },
  "RS9B-02": { id: "RS9B-02", ...LARGER_TEXT, runs: [[2729, 2912], [3275, 3578], [6989, 7308]], events: { allow1: 2910, chromeClear: 3276 } },
};

/** The crops the reel uses. */
export const CROPS = {
  /** the quick chat, whole, while the question is typed (before the send: no status line, no usage) */
  askPanel: { take: "RS15-01", rect: { x: 2105, y: 830, w: 740, h: 716 }, allowed: [241, 517], radius: 44, note: "the quick chat panel; header, intro, the input with the typed question" },
  /** the hook: the quick chat and the real floating pebble under it, on the demo poster (x < 2890: the picture's right edge is black) */
  askHook: { take: "RS15-01", rect: { x: 2062, y: 800, w: 810, h: 990 }, allowed: [241, 517], radius: 0, note: "the panel (2113–2834 × 838–1542) and the pebble (centre about 2750, 1625; its eyes about 2730 and 2777, 1618)" },
  /** the input box alone, for the hook's close-up */
  askInput: { take: "RS15-01", rect: { x: 2113, y: 1330, w: 722, h: 205 }, allowed: [241, 517], note: "the input box and its send row" },
  /** the real floating pebble under the panel (the riser's match shape) */
  askPebble: { take: "RS15-01", rect: { x: 2600, y: 1470, w: 300, h: 300 }, allowed: [241, 600], note: "the floating pebble, centre about (2750, 1625)" },
  /** Pebble's reply's last lines, cut above its usage line (y ≈ 1214) */
  reply: { take: "RS15-01", rect: { x: 2120, y: 1045, w: 715, h: 148 }, allowed: [930, 1060], note: "'I'm in \"ask\" permission mode, so I'll check / with you before anything that needs approval. / What would you like to start with?'" },
  /** Calculator, the window alone (the Activity panel's timings sit right of x ≈ 1040) */
  calculator: { take: "RS4-07", rect: { x: 568, y: 286, w: 464, h: 810 }, allowed: [3121, 3478], radius: 52, note: "Calculator, 48×12.5 → 600 on 3386" },
  /** Calendar: Monday 2's cell alone, "Glaze order 09:00" (other cells carry other calendars' events; the Dock tooltip starts at x ≈ 723) */
  calendar: { take: "RS5C-04", rect: { x: 392, y: 1012, w: 312, h: 148 }, allowed: [6109, 6332], note: "Glaze order, 09:00, Monday 2 November" },
  /** Finder's Open day folder, the files area and its title bar (the sidebar with iCloud Drive is left of x ≈ 400) */
  finder: { take: "RS5F-03", rect: { x: 404, y: 112, w: 1150, h: 560 }, allowed: [2745, 2962], note: "Documents › Open day: flyer.md, glazes, plan.md, poster-screen.png, poster.pdf, price-list.pdf, tickets.csv" },
  /** the Keep card, its question and buttons (the bullet's text runs off right: the card fades out there) */
  keepCard: { take: "RSW-01", rect: { x: 700, y: 668, w: 860, h: 360 }, allowed: [5369, 5612], radius: 0, note: "'Keep this tool in Pebble's Toolbox? · kiln_ramp_time', Discard, Keep" },
  /** the swipe across Spaces, the screen's lower part (below the booking page's dated kicker, y < 560) */
  spaces: { take: "RS1-03", rect: { x: 0, y: 600, w: 2900, h: 1312 }, allowed: [181, 370], note: "the poster slides away to Chrome's booking page; the pebble stays" },
} as const satisfies Record<string, ReelCrop>;

export type CropId = keyof typeof CROPS;

/** The file of a take's source frame `n` (the file's own 1-based number), under video/public. */
export function framePath(take: string, n: number): string {
  if (!REEL_TAKES[take]) throw new Error(`reel: unknown take ${take}`);
  return `ui-frames/real-takes/${take}/${String(Math.round(n)).padStart(5, "0")}.jpg`;
}

/** Whether a take has source frame `n` on disk (by its runs; check.ts also stats the files). */
export function hasFrame(take: string, n: number): boolean {
  const t = REEL_TAKES[take];
  const r = Math.round(n);
  return !!t && t.runs.some(([a, b]) => r >= a && r <= b);
}
