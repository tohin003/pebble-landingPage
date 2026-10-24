// src/content/neverWords.ts
//
// The words Pebble's release session never wants on the site next to Stealth Lockdown (OVERRIDES §21): "undetectable",
// "invisible", and anything about exams, interviews, proctoring, monitoring, cheating, bypassing or evading, beyond
// Stealth Lockdown's honest line (copy.ts `stealth.honest`), which says "Exams and interviews" on purpose and is
// allowed by exact match only. Not copy: a rule, kept here so the content tests (src/content/stealth.test.ts, the
// section's test) and tools/qa/copy-lint.mjs (its BANNED list, the same expressions, checked by stealth.test.ts) agree.

export const STEALTH_NEVER: readonly RegExp[] = [
  /\bundetectabl/i,
  /\binvisib/i,
  /\bexam(s|inations?)?\b/i,
  /\binterview/i,
  /\bproctor/i,
  /\bmonitor(ing|ed|s)?\b/i,
  /\bcheat/i,
  /\bbypass/i,
  /\b(evad(e|es|ed|ing)|evasion)\b/i,
];

/** True when `text` uses a never-word anywhere outside the exact honest line(s) given. */
export function usesNeverWord(text: string, allowed: readonly string[]): boolean {
  const rest = allowed.reduce((t, line) => t.split(line).join(" "), text);
  return STEALTH_NEVER.some((re) => re.test(rest));
}
