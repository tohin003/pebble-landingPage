// Ink presence per type rect (added after the craft review: CR-03, CR-15). A line on screen is a rect of ink; this
// tracks how much ink each line's rect holds on every frame of a render, and refuses a fall the plan did not declare:
//
//   the ink in a line's rect may not fall by more than 50 % of its held ink within 6 frames, to under half of it,
//   unless an exit is declared over those frames (a blur or a lift drawn by KineticLine, a cascade's swap out)
//
// The ink is the line's coverage: the pixels of its rect on the ink's side of the midpoint between the rect's ground
// and the line's own colour (the plan knows it), so a darker plane passing behind the line does not halve it (an ink
// mass did, on the 9:16 reel). A fall must end under half the held ink: UI text sliding out from under a line takes
// its own ink away, not the line's (the 1:1 reel).
//
// It sees what the whole-frame pixel checks cannot: "Its own tools." vanished in 2 frames (1,520 ink pixels to 0) at
// a whole-frame difference inside its moving neighbours', and the cascade's last item vanished on the cut, where a
// whole-frame pop is expected. A "camera" exit is not a declared exit here: the type layer is fixed to the screen
// (setpieces/views/PieceView.tsx TypeView), so nothing carries the line away and it vanishes on its exit frame.
//
// Pure: 8-bit grey frames in, numbers out. qa/luma-scan.ts measures the rects on a render; setpieces/qa.ts typeTracks()
// says where each line is and which exits it declares.
import type { Rect } from "../motion/geometry";

export type InkPolarity = "dark" | "light";

/** One line as the ink check sees it. Frames are the render's frames; the rect is px of the analysed frames. */
export interface InkTrack {
  id: string;
  text: string;
  rect: Rect;
  /** dark ink on a lighter ground (the film's ink), or light ink on a dark band (L04 on the night green) */
  polarity: InkPolarity;
  /** the line's own colour as an 8-bit grey level (coverage is counted against it); default the ink mass measure */
  inkLuma?: number;
  /** the frame its entrance starts, and the frame it has fully landed */
  from: number;
  landed: number;
  /** the first frame it is never drawn on again */
  until: number;
  /** declared, drawn exits: the frames [from, to) over which its ink may fall */
  exits: readonly { from: number; to: number; kind: string }[];
}

export const INK = {
  /** a fall of more than this share of the ink … */
  fallShare: 0.5,
  /** … within this many frames is a vanish unless an exit is declared over it */
  withinFrames: 6,
  /** levels of difference from the ground below which a pixel holds no ink (anti-aliasing, grain, the hatch of a slot) */
  noise: 12,
  /** the ground: this percentile of the rect's pixels (most of a line's rect is ground) */
  groundPercentile: 0.85,
  /** a line whose held ink is under this many fully inked pixels cannot be measured (it is reported, not judged) */
  minHeld: 40,
  /**
   * after a line's last drawn frame, ink above this share of its held ink is what covers its rect next, not the line (28
   * Oct: the post-credit scene's iris-out filled the end card's last line's rect with night green, 6.4 × the line's ink,
   * then read 0 once it covered it, 6 frames after the line's drawn blur had ended)
   */
  notOwnAfterUntil: 1.5,
} as const;

/**
 * The ink in `rect` of a grey frame. With the line's own grey level (`inkLuma`): its coverage, the pixels on the ink's
 * side of the midpoint between the ground and that level (and at least `noise` from the ground). Without it: the ink
 * mass in fully inked pixels, Σ max(0, |ground − px| − noise) ÷ 255. The ground is the rect's 85th percentile (dark ink)
 * or its 15th (light ink).
 */
export function inkIn(frame: Uint8Array, W: number, H: number, rect: Rect, polarity: InkPolarity, noise: number = INK.noise, inkLuma?: number): number {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(W, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(H, Math.ceil(rect.y + rect.h));
  if (x1 <= x0 || y1 <= y0) return 0;
  const hist = new Uint32Array(256);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) hist[frame[y * W + x]!]!++;
  const total = (x1 - x0) * (y1 - y0);
  const q = polarity === "dark" ? INK.groundPercentile : 1 - INK.groundPercentile;
  let acc = 0;
  let ground = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= q * total) {
      ground = v;
      break;
    }
  }
  if (inkLuma !== undefined) {
    const mid = (ground + inkLuma) / 2;
    let n = 0;
    for (let v = 0; v < 256; v++) {
      if (!hist[v]) continue;
      const onInkSide = polarity === "dark" ? v < mid && ground - v > noise : v > mid && v - ground > noise;
      if (onInkSide) n += hist[v]!;
    }
    return n;
  }
  let ink = 0;
  for (let v = 0; v < 256; v++) {
    const n = hist[v]!;
    if (!n) continue;
    const d = polarity === "dark" ? ground - v : v - ground;
    if (d > noise) ink += n * (d - noise);
  }
  return ink / 255;
}

export interface InkFinding {
  id: string;
  text: string;
  /** "vanish": the ink fell with no exit declared; "unmeasured": too little ink to judge */
  kind: "vanish" | "unmeasured";
  /** the fall's first and last frames */
  from: number;
  to: number;
  before: number;
  after: number;
  held: number;
  message: string;
}

const medianOf = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Judges one line's ink series (`ink[f]` for the render's frames; undefined where not measured): from the frame it lands
 * to `withinFrames` past its last drawn frame, the ink may not fall by more than `fallShare` of its held ink within
 * `withinFrames` frames to under `fallShare` of it, unless the fall overlaps one of its declared exits. Its held ink
 * (the median while landed and not leaving) must be measurable. A fall is reported from its last full frame to the
 * frame it settles (10 % or less of where it fell from), so "1,520 at frame 3366 and 0 at 3368" reads 3366–3368.
 */
export function judgeInk(track: InkTrack, ink: readonly (number | undefined)[], o: { fallShare?: number; withinFrames?: number; minHeld?: number } = {}): InkFinding[] {
  const fallShare = o.fallShare ?? INK.fallShare;
  const within = o.withinFrames ?? INK.withinFrames;
  const firstExit = track.exits.length ? Math.min(...track.exits.map((e) => e.from)) : track.until;
  const heldFrames: number[] = [];
  for (let f = track.landed; f < Math.min(firstExit, track.until); f++) if (ink[f] !== undefined) heldFrames.push(ink[f]!);
  const held = medianOf(heldFrames);
  const label = `${track.id} "${track.text.replace(/\n/g, " ").slice(0, 40)}"`;
  if (held < (o.minHeld ?? INK.minHeld)) {
    return [{ id: track.id, text: track.text, kind: "unmeasured", from: track.landed, to: track.until, before: held, after: held, held, message: `${label}: ${held.toFixed(0)} ink px while held, too few to judge` }];
  }
  const declared = (a: number, b: number) => track.exits.some((e) => a <= e.to + 1 && b >= e.from - 1);
  // did the line leave on its own (its ink at 10 % of its held level or less on a frame of its drawn exit)?
  let left = false;
  for (let f = firstExit; f < track.until; f++) if (ink[f] !== undefined && ink[f]! <= 0.1 * held) left = true;
  const out: InkFinding[] = [];
  const end = track.until + within;
  const drop = fallShare * held;
  for (let f = track.landed; f < end; f++) {
    const a = ink[f];
    if (a === undefined || a < drop) continue;
    let fell = -1;
    for (let k = 1; k <= within; k++) {
      const b = ink[f + k];
      if (b !== undefined && a - b > drop && b < (1 - fallShare) * held) {
        fell = f + k;
        break;
      }
    }
    if (fell < 0) continue;
    // the fall starts at its last frame still within 10 % of `a`, and settles at 10 % of `a` or less (or where it fell)
    let start = f;
    for (let g = f; g < fell; g++) if (ink[g] !== undefined && ink[g]! >= 0.9 * a) start = g;
    let settled = fell;
    for (let g = fell; g <= fell + within; g++)
      if (ink[g] !== undefined && ink[g]! <= 0.1 * a) {
        settled = g;
        break;
      }
    if (declared(start, settled)) {
      f = settled;
      continue;
    }
    // a fall that starts once a line that left on its own has stopped being drawn, from far more ink than it ever held,
    // is whatever covers its rect next (an iris, the next shot), not the line; a line still drawn past its last frame
    // (its own ink level there), or one that never left before an iris covered it, is judged as before
    if (left && start >= track.until && ink[start]! > INK.notOwnAfterUntil * held) {
      f = settled;
      continue;
    }
    const before = ink[start]!;
    const after = ink[settled]!;
    const atCut = start < track.until && settled >= track.until;
    out.push({
      id: track.id,
      text: track.text,
      kind: "vanish",
      from: start,
      to: settled,
      before,
      after,
      held,
      message: `${label}: its ink falls from ${before.toFixed(0)} to ${after.toFixed(0)} px between frames ${start} and ${settled} (${settled - start} frames; held ${held.toFixed(0)}) with no exit declared${atCut ? ` (it stops being drawn on ${track.until}: it vanishes there)` : ""}`,
    });
    // one finding per fall: skip to where the ink has settled
    f = settled + within;
  }
  return out;
}
