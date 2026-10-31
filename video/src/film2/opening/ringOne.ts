// Ring 1, your browser (S08–S09, film 0:28.00–0:38.00, frames 1680–2280): RS-9's composite (RS9B-02, Clip B), edited
// deadpan as DECISION-RS9 decided (the 23:10 sarcastic edit, the 23:40 composite, the lead's 23:52 edit decisions):
//   tab      Clip B from the first frame Chrome's Space has cleared the workspace (its prompt carries the URL), cropped to
//            Chrome's tab and address bars: Pebble's green group, its own tab on the video's address. L07 and its limit.
//   play     the playback after YouTube's adverts (skipped by the composite's cut), cropped to the player and the title,
//            3 s at 1×.
//   punch    the same playback punched in on the title "Introducing Claude Code": the score cuts out on B2's phrase line
//            (0:36.00, 2160), a second of silence.
//   anyway   "Anyway." on the punch-in; a hard cut on 2280 (a B2 bar line) to Pebble at work in Calculator (Ring 2) as
//            the score comes back. Ring 2 arrives 2 s before the score's placed arrival (2400) so the hard cut is the
//            score's pick-up: the score's ring-2 sweep sits inside S11 (open for the score lane).
// The silence is the master muted for 2 s (2160–2280; the score has no silence of its own: the score lane can build it
// into the master, with room tone under it). No line claims or compares anything about the video; the end credits
// carry RS9_CREDIT.
// Pure; no React.
import { TAKE_RS9B_02 } from "../setpieces/take";
import { RS9_PLAYER, RS9_TABS, RS9_TEXT, RS9_TITLE } from "../setpieces/rs9Beat";
import type { ActPlan, ActShot } from "./kit";

const SHOTS: readonly ActShot[] = [
  { id: "tab", stands: "S08", kind: "take", take: TAKE_RS9B_02, from: 3276, to: 3576, crop: RS9_TABS, note: "Pebble's own tab in its green group, on the video's address" },
  { id: "play", stands: "S08", kind: "take", take: TAKE_RS9B_02, from: 6990, to: 7170, crop: RS9_PLAYER, note: "the video plays (after the adverts), player and title" },
  { id: "punch", stands: "S09", kind: "take", take: TAKE_RS9B_02, from: 7170, to: 7230, crop: RS9_TITLE, note: "the punch-in on the title; the score cuts out" },
  { id: "anyway", stands: "S09", kind: "take", take: TAKE_RS9B_02, from: 7230, to: 7290, crop: RS9_TITLE, note: "'Anyway.'; a hard cut" },
];

export const RING_ONE: ActPlan = {
  id: "ring1",
  name: "Ring 1",
  start: 1680,
  shots: SHOTS,
  lines: [
    { id: "L07", text: "Its own tab in your browser, on sites you approve.", tier: "functional", at: 12, exitAt: 270, claim: "C-F2O-3" },
    { id: "L08", text: "Pebble for Chrome needs Developer mode.", tier: "functional", at: 72, exitAt: 276, claim: "C-F2O-4", slot: 1, sizeT: 0.3 },
    { id: "anyway", text: RS9_TEXT.anyway, tier: "functional", at: 540, exitAt: 600, claim: "", sizeT: 0.6, cutOut: true },
  ],
  marks: [
    { frame: 0, what: "Ring 1 arrives on Pebble's tab", score: 0 },
    { frame: 480, what: "the score cuts out: the punch-in (B2's phrase line, 0:36.00)", score: 480 },
    { frame: 540, what: "'Anyway.'" },
    { frame: 600, what: "the hard cut back as the score picks up (a B2 bar line)" },
  ],
  mutes: [[480, 600]],
};
