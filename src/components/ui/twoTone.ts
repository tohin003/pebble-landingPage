// The two-tone heading rule (DESIGN-LEXINGTON §3.6), as code so it can be checked:
//   a heading gets a second, muted line only when that line is an approved sentence of 60 characters or fewer;
//   otherwise one tone plus a lead. Never an accent colour, never italic, never a split sentence.
// "Approved" means the line is already a copy.ts string with a CLAIMS row (or the first sentence of one, cut with
// firstSentence below): SectionHead never invents text. "Never a split sentence": the second line is a whole
// sentence of its own: it starts with a capital letter and ends with its full stop.

export const TWO_TONE_MAX = 60;

export type TwoToneCheck = Readonly<{ ok: true } | { ok: false; reason: string }>;

const STARTS_LIKE_A_SENTENCE = /^[“"‘']?[A-Z0-9]/;
const ENDS_LIKE_A_SENTENCE = /[.?!][”"’')]?$/;

/** Can `then` stand as the muted second line under `title`? */
export function checkTwoTone(title: string, then: string): TwoToneCheck {
  const first = title.trim();
  const second = then.trim();
  if (!first) return { ok: false, reason: "the heading is empty" };
  if (!second) return { ok: false, reason: "the second line is empty" };
  if (second.length > TWO_TONE_MAX) return { ok: false, reason: `the second line has ${second.length} characters (at most ${TWO_TONE_MAX})` };
  if (/\n/.test(second)) return { ok: false, reason: "the second line breaks over two lines" };
  if (!STARTS_LIKE_A_SENTENCE.test(second)) return { ok: false, reason: "the second line does not start a sentence" };
  if (!ENDS_LIKE_A_SENTENCE.test(second)) return { ok: false, reason: "the second line does not end its sentence" };
  return { ok: true };
}

/**
 * Splits approved copy after its first sentence: "Pick one of three modes in Settings › Permissions. Pebble …" →
 * ["Pick one of three modes in Settings › Permissions.", "Pebble …"]. For two-tone heads made from a lead (Install,
 * Pace, Privacy, Limits, Open source: DESIGN-LEXINGTON §11). The rest is "" when there is only one sentence.
 * A sentence ends at . ? or ! (optionally followed by a closing quote or bracket), then a space, then a capital or an
 * opening quote. Abbreviations are not handled: Pebble's copy uses none before a capital.
 */
export function firstSentence(text: string): [string, string] {
  const match = /[.?!][”"’')]?\s+(?=[“"‘'A-Z0-9])/.exec(text);
  if (!match) return [text.trim(), ""];
  const end = match.index + match[0].trimEnd().length;
  return [text.slice(0, end).trim(), text.slice(match.index + match[0].length).trim()];
}
