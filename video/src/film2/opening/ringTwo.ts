// Ring 2, your apps (S11–S13, film 0:38.00–0:54.00, frames 2280–3240):
//   calc     RS4-07, Calculator alone: Pebble presses the keys at 1×; "=" turns the display to 600 on its source 3386 =
//            film 2490, the score's tick 2 (0:41.50). L11 and its limit.
//   card     RS5C-04 (S14's Calendar, in the slot of S12, whose take RS-7 was skipped): the card in the Activity panel,
//            "Pebble asks Calendar through its own scripting …", and Do it (2907), cropped above the step timings.
//   calendar RS5C-04, Calendar forward: "Glaze order" at 09:00 on Monday 2 November, the month's lower-left corner (no
//            other person's event, no Pebble timings). An ellipsis between two shots: Pebble's own work between the
//            click and the result is not shown, and nothing is sped up.
//   asks     S13 (RS-8 skipped: Notes can't be framed safely): a typographic beat, the line about presses that send, save
//            or delete, with its Full access limit; the lines leave before B2's hats stop (3150, J2's breath).
// Pure; no React.
import { TAKE_RS4_07, TAKE_RS5C_04 } from "../setpieces/take";
import { RS4_CALCULATOR } from "../setpieces/takeBeats";
import { frameOfSource, type ActPlan, type ActShot } from "./kit";

/** RS5C-04's and RS5F-03's card in the Activity panel (its text and its two buttons), above the step list. */
export const RS5_CARD = { x: 680, y: 140, w: 330, h: 120 } as const;
/** RS5C-04's Calendar, Monday 2 November's cell alone: "2", "Glaze order 09:00" (the Dock's tooltip, right of it, out). */
export const RS5C_CALENDAR = { x: 198, y: 505, w: 150, h: 76 } as const;

const SHOTS: readonly ActShot[] = [
  { id: "calc", stands: "S11", kind: "take", take: TAKE_RS4_07, from: 3176, to: 3476, crop: RS4_CALCULATOR, note: "Calculator: the keys, '=' to 600" },
  { id: "card", stands: "S12 (S14's Calendar)", kind: "take", take: TAKE_RS5C_04, from: 2800, to: 2920, crop: RS5_CARD, note: "the Calendar card, Do it" },
  { id: "calendar", stands: "S12 (S14's Calendar)", kind: "take", take: TAKE_RS5C_04, from: 6110, to: 6330, crop: RS5C_CALENDAR, maxK: 6, pushPerS: 0.025, note: "Glaze order, 09:00, Monday 2 November" },
  { id: "asks", stands: "S13", kind: "type", frames: 320, note: "typographic: what still asks (RS-8 not kept)" },
];

const draft: ActPlan = { id: "ring2", name: "Ring 2", start: 2280, shots: SHOTS, lines: [], marks: [], mutes: [] };
const at = (id: string, src: number) => frameOfSource(draft, id, src);

export const RING_TWO: ActPlan = {
  ...draft,
  lines: [
    { id: "L11", text: "Your apps. One window you allow.", tier: "functional", at: 12, exitAt: 270, claim: "C-F2O-5" },
    { id: "L11-limit", text: "Never terminals, System Settings or password managers.", tier: "functional", at: 60, exitAt: 276, claim: "C-F2O-6", slot: 1, sizeT: 0.3 },
    { id: "cal", text: "Calendar events, without the screen.", tier: "functional", at: 430, exitAt: 620, claim: "C-F2O-7" },
    { id: "cal-limit", text: "No invitations.", tier: "functional", at: 470, exitAt: 620, claim: "C-F2O-8", slot: 1, sizeT: 0.3 },
    { id: "L12", text: "A press that may send, save or delete asks you.", tier: "expressive", sizeT: 0.2, at: 652, exitAt: 900, claim: "C-F2O-9" },
    { id: "L12-limit", text: "In Full access, Pebble's check of your messages decides.", tier: "functional", at: 700, exitAt: 905, claim: "C-F2O-10", slot: 1, sizeT: 0.3 },
  ],
  marks: [
    { frame: 0, what: "the hard cut from RS-9's 'Anyway.': Pebble at work as the score picks up" },
    { frame: at("calc", TAKE_RS4_07.events.equals600!), what: "tick 2: Calculator's '=' (600)", score: 2490 - 2280 },
    { frame: 120, what: "the score's ring-2 sweep (placed for Ring 2's arrival)", score: 120 },
    { frame: at("card", TAKE_RS5C_04.events.doIt!), what: "Do it (the score's tick 3 is on 0:46.00)", score: 2760 - 2280 },
    { frame: 870, what: "B2's hats stop: J2's breath (the lines have left)", score: 870 },
  ],
};
