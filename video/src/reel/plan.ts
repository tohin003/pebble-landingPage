// The style test's edit, built from a beat map: every cut, hit and speed ramp is a function of the map, so the music
// lane's file replaces the temporary grid without re-cutting by hand. Pure; no React.
//
// Arc (15 s): the hook and the tension (the real question typed in the quick chat, echoed in huge type), the send on a
// beat, a whip-zoom into the real pebble on the riser, a short dark breath, THE DROP (the pebble lands, one flash,
// "Pebble" and "2.0" slam in on the next beats), then the montage cutting on every beat (real screens as floating
// cards, one word a cut), and, if the map leaves room, the cards merge into the pebble on the last bar.
import { type BeatMap, beatAfter, beatPeriod, nearestBeat } from "./beats";
import { CROPS, type CropId } from "./takes";
import { ramp, warp, type Warp } from "./warp";

export type Dir = "left" | "right" | "up" | "down";

export interface CardShot {
  kind: "card";
  id: string;
  from: number;
  to: number;
  crop: CropId;
  /** output frame (shot-local) → source file frame */
  src: Warp;
  /** the feature's line (2–5 words from the page's 2.0.0 copy), held across the feature's screens */
  word: string;
  /** the feature this screen belongs to, and when its line landed and leaves (absolute frames) */
  feature: string;
  lineFrom: number;
  lineTo: number;
  /** shot-local frames of punch-ins */
  punches: number[];
  /** the whip this shot arrives with, and the one it leaves with */
  enter: Dir;
  exit: Dir;
  /** which side the card sits on in 16:9 (the word takes the other) */
  side: "left" | "right";
  tint: "sage" | "clay" | "deep";
}

export interface Plan {
  map: BeatMap;
  B: number;
  D: number;
  length: number;
  /** the hook and tension shot, [0, breathFrom) */
  hook: { from: number; to: number; src: Warp; send: number; zoomFrom: number; accents: number[]; pulses: number[] };
  /** the dark breath before the drop */
  breath: { from: number; to: number };
  /** the reveal: [D, D + 4B); words on the beats after the drop */
  reveal: { from: number; to: number; hits: { pebble: number; word1: number; word2: number } };
  montage: CardShot[];
  /** the merge into the pebble, if the map leaves room: cards pulled in on the eighth notes (`arrivals`), the lockup on a beat */
  merge: { from: number; to: number; arrivals: number[]; lockup: number } | null;
  /** every beat the edit cuts or hits on (for the check) */
  cuts: number[];
}

/**
 * Pebble 2.0's features in the style test's montage bars (the lead, 03:00: "we also have to show pebbles main
 * features"): each is a real screen and a line of 2–5 words that lands on the beat. The lines are the page's approved
 * 2.0.0 copy, shortened, never invented; `claim` names the CLAIMS row (docs/CLAIMS.md) the words come from. A feature
 * with two screens cuts between them on its beats and keeps its line. "\n" is where the line breaks.
 */
export const FEATURES: readonly { id: string; line: string; claim: string; beats: number; crops: readonly CropId[]; tint: CardShot["tint"] }[] = [
  // "… use the apps and websites you allow …" (the hero's clause, copy.ts hero; C-MAC-1 "use the app windows … you allow")
  { id: "apps", line: "Uses the apps\nyou allow.", claim: "C-200-1, C-MAC-1", beats: 3, crops: ["calculator"], tint: "sage" },
  // the Across your Mac row's term, word for word (copy.ts models.rows[3].term)
  { id: "actions", line: "Apps and\napp actions.", claim: "C-MAC-8", beats: 2, crops: ["calendar", "finder"], tint: "clay" },
  // "… stays on top of your other windows and joins every Space." (copy.ts desktop.lead)
  { id: "spaces", line: "Joins\nevery Space.", claim: "C-DESK-1", beats: 2, crops: ["spaces"], tint: "deep" },
  // the Workshop's second line, "Tools it makes for itself, checked before it keeps them." (copy.ts workshop.then)
  { id: "tools", line: "Tools it makes\nfor itself.", claim: "C-WS-1", beats: 2, crops: ["keepCard"], tint: "sage" },
  // the section's heading, a sentence that states no fact (CLAIMS.md: "You set the pace." needs no row)
  { id: "pace", line: "You set\nthe pace.", claim: "none needed (copy.ts pace.h2)", beats: 1, crops: ["reply"], tint: "clay" },
];

const DIRS: readonly Dir[] = ["left", "up", "right", "down"];
const BREATH = 6;

/** The shot-local warp of a montage card: the screen's moment lands on the shot's second beat (or its first frame + 70 % of a one-beat shot). */
function cardWarp(crop: CropId, len: number, B: number): { src: Warp; punches: number[] } {
  const two = len > B * 1.5;
  switch (crop) {
    case "calculator":
      // keys pressed from 3260 (the "×"), "=" turns the display to 600 on 3387: the presses run fast, "=" lands on the beat
      return two
        ? { src: ramp({ srcIn: 3200, srcEvent: 3387, outEvent: B, outEnd: len, landSpeed: 1, afterSpeed: 1, landFrames: 6 }), punches: len > B * 2.5 ? [B, 2 * B] : [B] }
        : { src: warp([[0, 3384], [len, 3384 + len]]), punches: [] }; // one beat: "=" lands 3 frames after the cut, which is the hit
    case "calendar":
      return { src: warp([[0, 6150], [len, 6150 + len]]), punches: two ? [B] : [] };
    case "finder":
      return { src: warp([[0, 2790], [len, 2790 + len]]), punches: two ? [B] : [] };
    case "spaces":
      // the real slide (⌃→ on 238 → settled about 262), at 1×, starting just before it
      return { src: warp([[0, 234], [len, 234 + len]]), punches: [] };
    case "keepCard":
      return { src: warp([[0, 5400], [len, 5400 + len]]), punches: two ? [B] : [] };
    case "reply":
      return { src: warp([[0, 960], [len, 960 + len]]), punches: two ? [B] : [] };
    default:
      return { src: warp([[0, CROPS[crop].allowed[0]], [len, CROPS[crop].allowed[0] + len]]), punches: [] };
  }
}

export function buildPlan(map: BeatMap): Plan {
  const B = beatPeriod(map);
  const D = Math.round(map.drop);
  const length = map.durationFrames;
  if (D < 3 * B) throw new Error(`plan: the drop (${D}) leaves under three beats of tension`);

  // the send lands on the beat two beats before the drop (or the nearest one to it)
  const send = Math.round(nearestBeat(map, D - 2 * B));
  const breathFrom = D - BREATH;
  // the typing at about real time: it starts as late as the take allows (on "What" when the tension is short enough)
  const hookSrc = ramp({ srcIn: Math.min(270, Math.max(241, 517 - send)), srcEvent: 517, outEvent: send, outEnd: breathFrom, landSpeed: 1, afterSpeed: 0, landFrames: 10 });
  const zoomFrom = Math.round(send + B * 0.5);

  const word1 = Math.round(beatAfter(map, D + 1, 0));
  const word2 = Math.round(beatAfter(map, D + 1, 1));
  const revealTo = Math.round(beatAfter(map, D + 1, 3));

  // montage: shot boundaries on beats from revealTo; keep the last bar for the merge when there's room
  const beatsLeft = map.beats.filter((b) => b >= revealTo - 0.5 && b < length - 0.5).map(Math.round);
  // the merge: its last six beats (two cards fly in on the next two, the lockup on the third, held to the end)
  const mergeBeats = beatsLeft.length >= 12 ? 6 : 0;
  const montageEnd = mergeBeats ? beatsLeft[beatsLeft.length - mergeBeats] : length;
  const montage: CardShot[] = [];
  const beatAt = (from: number, n: number) => {
    const idx = beatsLeft.indexOf(from);
    return idx >= 0 && idx + n < beatsLeft.length ? beatsLeft[idx + n] : from + Math.round(n * B);
  };
  let i = 0; // shots
  let fi = 0; // features
  let at = revealTo;
  while (at < montageEnd - B * 0.5) {
    const ft = FEATURES[fi % FEATURES.length];
    // a second time round, every feature gets one beat: the montage accelerates into the merge
    const beats = fi < FEATURES.length ? ft.beats : 1;
    const fTo = Math.min(beatAt(at, beats), montageEnd);
    const side: CardShot["side"] = fi % 2 === 0 ? "right" : "left";
    const crops = beats >= ft.crops.length ? ft.crops : ft.crops.slice(0, 1);
    // the feature's beats shared among its screens, a cut on a beat between them
    const per = Math.max(1, Math.floor(beats / crops.length));
    let sAt = at;
    crops.forEach((crop, ci) => {
      const to = ci === crops.length - 1 ? fTo : Math.min(beatAt(sAt, per), fTo);
      const len = to - sAt;
      const { src, punches } = cardWarp(crop, len, B);
      montage.push({
        kind: "card",
        id: `${ft.id}-${crop}-${i}`,
        from: sAt,
        to,
        crop,
        src,
        word: ft.line,
        feature: ft.id,
        lineFrom: at,
        lineTo: fTo,
        punches,
        enter: DIRS[i % DIRS.length],
        exit: DIRS[(i + 1) % DIRS.length],
        side,
        tint: ft.tint,
      });
      sAt = to;
      i++;
    });
    at = fTo;
    fi++;
  }
  // the merge: the montage's cards orbit the pebble and are pulled into it one by one on the eighth notes, then the
  // lockup lands on a beat and holds to the end
  let merge: Plan["merge"] = null;
  if (mergeBeats) {
    const from = montageEnd;
    const lockup = beatsLeft[beatsLeft.length - mergeBeats + 3];
    const pulls: number[] = [];
    for (let t = from + B / 2; t < lockup - B * 0.25; t += B / 2) pulls.push(Math.round(t));
    merge = { from, to: length, arrivals: pulls, lockup };
  }

  return {
    map,
    B,
    D,
    length,
    hook: {
      from: 0,
      to: breathFrom,
      src: hookSrc,
      send,
      zoomFrom,
      // the music's own tension hits (a section entering, the suck-back) before the send: punches and sweeps
      accents: map.hits.filter((h) => h.kind !== "drop" && h.frame > 4 && h.frame < send - 4).map((h) => Math.round(h.frame)),
      // from the first such hit, the ground breathes on every beat (harder on downbeats)
      pulses: map.beats.filter((b) => b >= (map.hits.find((h) => h.kind !== "drop")?.frame ?? send) - 0.5 && b < send - 0.5).map(Math.round),
    },
    breath: { from: breathFrom, to: D },
    reveal: { from: D, to: revealTo, hits: { pebble: D, word1, word2 } },
    montage,
    merge,
    cuts: [send, D, word1, word2, ...montage.map((s) => s.from), ...montage.flatMap((s) => s.punches.map((p) => s.from + p)), ...(merge ? [merge.from, merge.lockup] : [])],
  };
}

/** The question's letters as typed in RS15-01 (file frames, read off the input box): the echo in huge type follows them. */
export const TYPED: readonly (readonly [string, number])[] = [
  ["W", 232], ["h", 249], ["a", 258], ["t", 270], [" ", 285], ["c", 300], ["a", 316], ["n", 330], [" ", 341],
  ["y", 352], ["o", 365], ["u", 377], [" ", 395], ["d", 410], ["o", 425], [" ", 440], ["n", 455], ["o", 467], ["w", 480], ["?", 491],
];

/** The question typed by source frame `src`. */
export const typedAt = (src: number): string => TYPED.filter(([, f]) => f <= src).map(([c]) => c).join("");
