// RS-9's beat (S08–S09): "Show me a clip of your rival.", a composite of two real clips at the person's request, edited
// deadpan (.work/real-takes/DECISION-RS9-2026-10-31.md: the 23:10 sarcastic edit, the 23:40 composite and the lead's
// 23:52 edit decisions). Each shot plays its clip at 1×; the cuts are between shots, never inside Pebble's reply:
//   ask     Clip A, the companion: the request in the box, sent, "Task: running" (cut there; Pebble's later "which
//           rival?" is never used). Cropped to the companion: the workspace behind it shows a usage line.
//   slide   Clip B as Chrome's Space slides in, from the first frame it has cleared the workspace (B's prompt, with
//           the URL, sits in the companion there) to the frame before YouTube's advert shows: the cut on motion.
//   play    Clip B's playback (YouTube's adverts, about 55–116 s, are skipped by the composite's cut), cropped to the
//           player and the title: no sidebar, no advert, no Pebble pill.
//   punch   the same playback at 1×, punched in on "Introducing Claude Code" and the channel: the score cuts out,
//           about a second of silence (the sound lane's mark)
//   anyway  the line "Anyway." on the punch-in, then a hard cut back as the score picks up
// No caption claims or compares anything; nothing of Pebble is altered; the end credits carry RS9_CREDIT.
// Pure; no React.
import type { Rect } from "../motion/geometry";
import { TAKE_RS9A_01, TAKE_RS9B_02, type TakeManifest } from "./take";

export const RS9_TEXT = { anyway: "Anyway." } as const;

/** The end credits' line whenever this beat is in a cut (DECISION-RS9; the lead's MASTER_NOTES). */
export const RS9_CREDIT = "Claude Code launch video: Anthropic, on YouTube. Claude and Claude Code are trademarks of Anthropic.";

export interface BeatShot {
  id: "ask" | "slide" | "play" | "punch" | "anyway";
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
export const RS9_PLAYER: Rect = { x: 12, y: 232, w: 664, h: 434 };
/** The punch-in: "Introducing Claude Code" and the channel, to the screen's foot. */
export const RS9_TITLE: Rect = { x: 8, y: 606, w: 320, h: 60 };

/** Clip B's adverts: never shown. */
export const RS9B_ADVERTS = { from: 3282, to: 6960 } as const;

export const RS9_BEAT: readonly BeatShot[] = [
  { id: "ask", take: TAKE_RS9A_01, from: 1620, to: 1800, crop: RS9_COMPANION },
  { id: "slide", take: TAKE_RS9B_02, from: 3276, to: 3282 },
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

/** The shot and its source frame on beat-local frame `f`. */
export function beatAt(f: number): { shot: BeatShot; src: number; local: number } {
  let at = 0;
  for (const s of RS9_BEAT) {
    const n = s.to - s.from;
    if (f < at + n) return { shot: s, src: s.from + (f - at), local: f - at };
    at += n;
  }
  const last = RS9_BEAT[RS9_BEAT.length - 1]!;
  return { shot: last, src: last.to - 1, local: last.to - 1 - last.from };
}

/** The beat's own rules: 1× inside each shot, inside its take, never A after "which rival?", never B's prompt or adverts. */
export function checkRs9Beat(): string[] {
  const out: string[] = [];
  for (const s of RS9_BEAT) {
    if (s.from < 0 || s.to > s.take.frames || s.to <= s.from) out.push(`${s.id}: source ${s.from}–${s.to} outside ${s.take.id}`);
    if (s.take.id === "RS9A-01" && s.to > 37 * 60) out.push(`${s.id}: Clip A past 37 s (Pebble's 'which rival?')`);
    if (s.take.id === "RS9B-02" && s.from < TAKE_RS9B_02.events.chromeClear!) out.push(`${s.id}: Clip B before Chrome clears the workspace (its prompt carries the URL)`);
    if (s.take.id === "RS9B-02" && s.from < RS9B_ADVERTS.to && s.to > RS9B_ADVERTS.from) out.push(`${s.id}: Clip B's adverts`);
    if (s.crop && (s.crop.x < 0 || s.crop.y < 0 || s.crop.x + s.crop.w > s.take.w || s.crop.y + s.crop.h > s.take.h)) out.push(`${s.id}: its crop leaves the recording`);
  }
  if (!RS9_BEAT.some((s) => s.line === RS9_TEXT.anyway)) out.push("the beat has no 'Anyway.'");
  return out;
}
