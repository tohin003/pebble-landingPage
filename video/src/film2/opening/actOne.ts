// Act I (S01–S05, film 0:00.00–0:17.00, frames 0–1020; the Drop's own pre-roll takes 1020–1200 with the card and L04):
//   ask      RS15-01 whole screen: "What can you do now?" in the quick chat over the poster, sent on its source 516 =
//            film 180 (the score's tick 1, 0:03.00); Pebble's whole wait at 1×, uncut, to the frame before its reply
//            lands (920). "Pebble 2.0" lands on 240 (the score's soft hit) while Pebble thinks.
//   reply    the same take punched in on the reply, above its usage line (920–1040).
//   swipe    RS1-03 whole screen: ⌃→ (238), the Space slides to the booking page and the pebble stays (L03).
//   rival    RS9A-01, the companion (RS-9's Clip A): "Show me a clip of your rival." sent (1721), "Task: running" (1726);
//            cut there.
//   card     RS9B-02, the companion's card 'Use youtube.com' (L04) to the frame of its Allow click (2910), which is film
//            1200, the Drop's hit: the film's Drop starts there (film.ts), its own pre-roll card slot never shown.
// Where the score's placeholder marks miss the takes' real timings, the take wins (CUE_SHEET §5.4: reading holds and
// Pebble's time are never shortened): the slide's whoosh is placed for 0:08.00 (480) but the real reply needs
// Pebble's 6.7 s wait, so the swipe lands on 747 (marks: `score` is the score's frame).
// Pure; no React.
import { TAKE_RS15_01, TAKE_RS1_03, TAKE_RS9A_01 } from "../setpieces/take";
import { RS15_REPLY } from "../setpieces/takeBeats";
import { RS9_COMPANION } from "../setpieces/rs9Beat";
import { TAKE_RS9B_02 } from "../setpieces/take";

/** RS1-03's picture right of the booking page's date column (its "Saturday 14 November" sits at x 103–291). */
export const RS1_SWIPE = { x: 400, y: 0, w: 1070, h: 956 } as const;
/** RS9B-02's card "Use youtube.com" in the companion, below the prompt with the URL (y < 228) and above the box. */
export const RS9B_CARD = { x: 644, y: 228, w: 350, h: 126 } as const;
import { frameOfSource, type ActPlan, type ActShot } from "./kit";

const SHOTS: readonly ActShot[] = [
  { id: "ask", stands: "S01–S02", kind: "take", take: TAKE_RS15_01, from: 336, to: 920, note: "the question in the box, sent; Pebble's whole wait, uncut" },
  { id: "reply", stands: "S02", kind: "take", take: TAKE_RS15_01, from: 920, to: 1040, crop: RS15_REPLY, note: "the reply, above its usage line" },
  { id: "swipe", stands: "S03", kind: "take", take: TAKE_RS1_03, from: 195, to: 368, crop: RS1_SWIPE, soften: { from: 240, to: 260, ramp: 6, blurPx: 10, veil: 0.55 }, note: "the Space swipe; the pebble stays (cropped past the booking page's date; the slide softened by its speed)" },
  { id: "rival", stands: "S04–S05", kind: "take", take: TAKE_RS9A_01, from: 1657, to: 1800, crop: RS9_COMPANION, note: "RS-9's Clip A: the ask, sent, 'Task: running'" },
  { id: "card", stands: "S05", kind: "take", take: TAKE_RS9B_02, from: 2730, to: 2910, crop: RS9B_CARD, note: "RS-9's Clip B: the card 'Use youtube.com', the pointer to Allow; the cut on the click (1200, the Drop's hit)" },
];

const draft: ActPlan = { id: "act1", name: "Act I", start: 0, shots: SHOTS, lines: [], marks: [], mutes: [] };
const at = (id: string, src: number) => frameOfSource(draft, id, src);

export const ACT_ONE: ActPlan = {
  ...draft,
  lines: [
    { id: "L02", text: "Pebble 2.0", tier: "expressive", at: 228, exitAt: 470, claim: "C-F2O-1", sizeT: 1 },
    { id: "L03", text: "Over full-screen apps, on every Space.", tier: "functional", at: at("swipe", 196), exitAt: at("swipe", 351), claim: "C-F2O-2" },
    { id: "L04", text: "Allow it right where you are.", tier: "functional", at: at("card", 2742), exitAt: at("card", 2892), claim: "C-F2O-16" },
  ],
  marks: [
    { frame: at("ask", TAKE_RS15_01.events.send!), what: "tick 1: the question is sent", score: 180 },
    { frame: 240, what: "'Pebble 2.0' lands (the soft hit)", score: 240 },
    { frame: at("reply", TAKE_RS15_01.events.replyLands!), what: "the reply lands (the punch-in)" },
    { frame: at("swipe", TAKE_RS1_03.events.swipe!), what: "⌃→: the Space slide (the score's whoosh is on 480)", score: 480 },
    { frame: at("rival", TAKE_RS9A_01.events.send!), what: "'Show me a clip of your rival.' sent" },
    { frame: at("rival", TAKE_RS9A_01.events.taskRunning!), what: "'Task: running'" },
    { frame: at("card", TAKE_RS9B_02.events.allow1!) , what: "Allow: the cut into the Drop on its hit", score: 1200 },
  ],
};
