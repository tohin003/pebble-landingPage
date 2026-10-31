// The kept takes whose pieces aren't built yet, cut as beats at 1× (the same machinery as RS-9's beat, rs9Beat.ts), so
// the set-piece lane and the lead can see and place the real material: Act I (S01–S03) and S11. Each shot is one stretch
// of one take at 1×, cut only between shots; usage lines (tokens, seconds, tok/s) are never in a crop.
//   act1  RS15-01 whole screen: "What can you do now?" typed in the quick chat over the poster, sent (516), Pebble's
//         thinking at 1× to the frame before its reply lands (no wait is cut: the reply's time is Pebble's); then the
//         same take punched in on the reply, above its usage line (from about 924 under the reply), to 15.6 s; then
//         RS1-03 whole screen: the poster, ⌃→ (238), the Space slides to the booking page (settled about 262).
//   s11   RS4-07, Calculator alone: Pebble presses the keys from about 52.5 s, "=" turns the display to 600 (3386).
// Pure; no React.
import type { Rect } from "../motion/geometry";
import { TAKE_RS15_01, TAKE_RS1_03, TAKE_RS4_07 } from "./take";
import { RS9_BEAT, type BeatShot } from "./rs9Beat";

/** RS15-01's quick-chat panel from its title to the reply's last line, above the usage line (y 600–612). */
export const RS15_REPLY: Rect = { x: 1057, y: 418, w: 366, h: 180 };
/** RS4-07's Calculator window (left of the workspace's Activity panel and its step timings). */
export const RS4_CALCULATOR: Rect = { x: 284, y: 140, w: 234, h: 412 };

export const ACT1_BEAT: readonly BeatShot[] = [
  { id: "ask-and-wait", take: TAKE_RS15_01, from: 240, to: 920 },
  { id: "reply", take: TAKE_RS15_01, from: 920, to: 1060, crop: RS15_REPLY },
  { id: "swipe", take: TAKE_RS1_03, from: 180, to: 330 },
];

export const S11_BEAT: readonly BeatShot[] = [{ id: "keys", take: TAKE_RS4_07, from: 3120, to: 3476, crop: RS4_CALCULATOR }];

export const BEATS = { rs9: RS9_BEAT, act1: ACT1_BEAT, s11: S11_BEAT } as const;
export type BeatName = keyof typeof BEATS;
export const beatFrames = (b: BeatName): number => BEATS[b].reduce((n, s) => n + (s.to - s.from), 0);

/** Usage lines never shown: RS15-01's whole screen ends before its usage line appears (about 924). */
export const RS15_USAGE_FROM = 924;

export function checkTakeBeats(): string[] {
  const out: string[] = [];
  for (const [name, beat] of Object.entries(BEATS)) {
    for (const s of beat) {
      if (s.from < 0 || s.to > s.take.frames || s.to <= s.from) out.push(`${name}/${s.id}: source ${s.from}–${s.to} outside ${s.take.id}`);
      if (s.crop && (s.crop.x < 0 || s.crop.y < 0 || s.crop.x + s.crop.w > s.take.w || s.crop.y + s.crop.h > s.take.h)) out.push(`${name}/${s.id}: its crop leaves the recording`);
      if (s.take.id === "RS15-01" && !s.crop && s.to > RS15_USAGE_FROM) out.push(`${name}/${s.id}: RS15-01's whole screen past its usage line`);
      if (s.take.id === "RS15-01" && s.crop && s.crop.y + s.crop.h > 600) out.push(`${name}/${s.id}: the crop reaches RS15-01's usage line`);
    }
  }
  // Pebble's wait before its reply is never cut: the whole screen runs from the send to the reply's landing
  const a = ACT1_BEAT;
  if (!(a[0]!.from <= TAKE_RS15_01.events.send! && a[0]!.to === a[1]!.from && a[1]!.from === TAKE_RS15_01.events.replyLands)) out.push("act1: the wait between the send and the reply is cut");
  return out;
}
