// RS-9's beat (S08–S09): "Show me a clip of your rival.", a composite of two real clips at the person's request, edited
// deadpan (.work/real-takes/DECISION-RS9-2026-10-31.md: the 23:10 sarcastic edit, the 23:40 composite and the lead's
// 23:52 edit decisions). Each shot plays its clip at 1×; the cuts are between shots, never inside Pebble's reply:
//   ask     Clip A, the companion: the request in the box, sent, "Task: running" (cut there; Pebble's later "which
//           rival?" is never used). Cropped to the companion: the workspace behind it shows a usage line.
//   tab     Clip B from the first frame Chrome's Space has cleared the workspace (B's prompt, with the URL, sits in the
//           companion there), cropped to Chrome's tab and address bars: Pebble's green group and its own tab on the
//           video's address. YouTube's advert is already playing in the player below, which the crop leaves out
//           (the first look, 1 Nov: the whole screen showed the advert's first frames).
//   play    Clip B's playback (YouTube's adverts, about 55–116 s, are skipped by the composite's cut), cropped to the
//           player and the title: no sidebar, no advert, no Pebble pill.
//   punch   the same playback at 1×, punched in on the title "Introducing Claude Code": the score cuts out, about a
//           second of silence (the sound lane's mark). The channel's name is half cut by the screen's foot in the
//           recording, so it stays out (the credit line names Anthropic)
//   anyway  the line "Anyway." on the punch-in, then a hard cut back as the score picks up
// No caption claims or compares anything; nothing of Pebble is altered; the end credits carry RS9_CREDIT.
// Pure; no React.
import type { Rect } from "../motion/geometry";
import { TAKE_RS9A_01, TAKE_RS9B_02, type TakeManifest } from "./take";

export const RS9_TEXT = { anyway: "Anyway." } as const;

/** The end credits' line whenever this beat is in a cut (DECISION-RS9; the lead's MASTER_NOTES). */
export const RS9_CREDIT = "Claude Code launch video: Anthropic, on YouTube. Claude and Claude Code are trademarks of Anthropic.";

export interface BeatShot {
  id: string;
  take: TakeManifest;
  /** source frames shown, [from, to), at 1× */
  from: number;
  to: number;
  /** the part of the recording shown, CSS px; undefined: the whole screen */
  crop?: Rect;
  /** the line shown over it */
  line?: string;
}

/** The companion in Clip A (its panel and box, above the pebble; the workspace and its usage line left of it). */
export const RS9_COMPANION: Rect = { x: 636, y: 116, w: 370, h: 340 };
/** YouTube's player and the video's title in Clip B (left of the sidebar, its adverts and Pebble's pill). */
export const RS9_PLAYER: Rect = { x: 12, y: 232, w: 664, h: 420 };
/** The punch-in: the title "Introducing Claude Code" alone. */
export const RS9_TITLE: Rect = { x: 8, y: 610, w: 250, h: 42 };
/** Chrome's tab and address bars in Clip B (above the default-browser notice and the player). */
export const RS9_TABS: Rect = { x: 0, y: 28, w: 700, h: 84 };

/** Clip B's adverts, in the player: never shown (a shot over these frames is cropped above the player, y ≤ 112). */
export const RS9B_ADVERTS = { from: 3276, to: 6960 } as const;
const ABOVE_PLAYER_Y = 112;

export const RS9_BEAT: readonly BeatShot[] = [
  { id: "ask", take: TAKE_RS9A_01, from: 1620, to: 1800, crop: RS9_COMPANION },
  { id: "tab", take: TAKE_RS9B_02, from: 3276, to: 3336, crop: RS9_TABS },
  { id: "play", take: TAKE_RS9B_02, from: 6990, to: 7140, crop: RS9_PLAYER },
  { id: "punch", take: TAKE_RS9B_02, from: 7140, to: 7200, crop: RS9_TITLE },
  { id: "anyway", take: TAKE_RS9B_02, from: 7200, to: 7260, crop: RS9_TITLE, line: RS9_TEXT.anyway },
];

/** The beat's length, frames at 60 fps (every shot at 1×). */
export const RS9_BEAT_FRAMES = RS9_BEAT.reduce((n, s) => n + (s.to - s.from), 0);

/** The sound lane's marks, beat-local frames: the score cuts out on the punch-in and picks up on the hard cut. */
export const RS9_SOUND_MARKS = (() => {
  let at = 0;
  const starts: Record<string, number> = {};
  for (const s of RS9_BEAT) {
    starts[s.id] = at;
    at += s.to - s.from;
  }
  return { scoreOut: starts.punch!, scoreBack: at };
})();

/** The shot and its source frame on beat-local frame `f` (RS-9's beat, or another list of shots). */
export function beatAt(f: number, beat: readonly BeatShot[] = RS9_BEAT): { shot: BeatShot; src: number; local: number } {
  let at = 0;
  for (const s of beat) {
    const n = s.to - s.from;
    if (f < at + n) return { shot: s, src: s.from + (f - at), local: f - at };
    at += n;
  }
  const last = beat[beat.length - 1]!;
  return { shot: last, src: last.to - 1, local: last.to - 1 - last.from };
}

/** The beat's own rules: 1× inside each shot, inside its take, never A after "which rival?", never B's prompt or adverts. */
export function checkRs9Beat(): string[] {
  const out: string[] = [];
  for (const s of RS9_BEAT) {
    if (s.from < 0 || s.to > s.take.frames || s.to <= s.from) out.push(`${s.id}: source ${s.from}–${s.to} outside ${s.take.id}`);
    if (s.take.id === "RS9A-01" && s.to > 37 * 60) out.push(`${s.id}: Clip A past 37 s (Pebble's 'which rival?')`);
    if (s.take.id === "RS9B-02" && s.from < TAKE_RS9B_02.events.chromeClear!) out.push(`${s.id}: Clip B before Chrome clears the workspace (its prompt carries the URL)`);
    if (s.take.id === "RS9B-02" && s.from < RS9B_ADVERTS.to && s.to > RS9B_ADVERTS.from && !(s.crop && s.crop.y + s.crop.h <= ABOVE_PLAYER_Y)) out.push(`${s.id}: Clip B's adverts`);
    if (s.crop && (s.crop.x < 0 || s.crop.y < 0 || s.crop.x + s.crop.w > s.take.w || s.crop.y + s.crop.h > s.take.h)) out.push(`${s.id}: its crop leaves the recording`);
  }
  if (!RS9_BEAT.some((s) => s.line === RS9_TEXT.anyway)) out.push("the beat has no 'Anyway.'");
  return out;
}
