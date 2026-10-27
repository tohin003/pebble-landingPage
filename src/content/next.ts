// src/content/next.ts
//
// The footer's hint of a coming feature: the person's request for a post-credit sneak peek on the page (D157, posted by
// the release session at 16:12 on 27 October 2026; OVERRIDES §62). The feature's working name is "learning while
// resting" (its public name is the person's to choose), and its status is "researched and planned, not built". So the
// hint is a promise with its limit beside it, in one paragraph (PHILOSOPHY principle 3), and never a fact of a release.
//
// The rules (OVERRIDES §62, binding), and where they are checked:
// - Coming, never part of the release the page states: it starts with "Coming next:", says "Not built yet." with the
//   measurement condition, and names no version or date (src/content/next.test.ts).
// - No numbers, no model or company names, and none of §62's four phrases: NEXT_NEVER below, run on these strings by
//   next.test.ts. The four phrases (NEXT_NEVER_PHRASES) are banned site-wide by tools/qa/copy-lint.mjs, with the same
//   expressions.
// - No mock screen: the only picture beside it is the footer's sleeping pebble, the Companion's own resting pose
//   ("sleepy", priority row 17) drawn by the site's engine (src/components/shell/Footer.tsx).
// - The gate: the footer shows it only when the release facts say 2.0.0 or later (comingNextShown), and only while
//   `planned` is true. releaseFacts.ts is read here and never changed for it: the page states a release only after its
//   "x.y.z published" post, so the hint goes public with 2.0.0's page and not before (D87).
// - Only the footer shows it: it stays out of llms.txt, the metadata, Open Graph, JSON-LD and the sitemap.
// Rows: C-NEXT-1 and C-NEXT-2 in docs/CLAIMS.md.
import { releaseFacts } from "./releaseFacts";

export const comingNext = {
  /** The promise, in ink: the release session's own starting line (D157). [C-NEXT-1] */
  lead: "Coming next: learning while resting.",
  /** Its limit, in muted ink, in the same paragraph: D157's status line, with the release it names left out. [C-NEXT-2] */
  limit: "Not built yet. It comes only if measurement shows it helps.",
  /** The first release whose page may carry the hint: the hint's embargo (D87) ends with that release's post. */
  from: "2.0.0",
  /**
   * True while the feature stays planned. If the release session withdraws it, set this to false: the hint leaves
   * every page, and nothing else changes.
   */
  planned: true,
} as const;

/**
 * §62's four phrases and their forms: "rewrites its memory", "never forgets", "learns everything" and "smarter every
 * night" (in two parts, so either half fails). tools/qa/copy-lint.mjs bans exactly these expressions on every page.
 */
export const NEXT_NEVER_PHRASES: readonly RegExp[] = [
  /\brewr[io]t\w*\b.{0,20}\bmemor/i,
  /\bnever forget/i,
  /\blearn\w*\s+everything/i,
  /\bsmarter\b/i,
  /\bevery night\b/i,
];

/**
 * Everything the hint may never say (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1 and C2): the four phrases; any number (so
 * any version, date, price or rate) and the number words; a month, a weekday, a season or another time word; anything
 * that says it is out, included or part of a release; a comparison; a model or company name; and the house never-list
 * (an exclamation mark, a middle dot, a word in capitals, an emoji). Rules, not copy.
 */
export const NEXT_NEVER: readonly RegExp[] = [
  ...NEXT_NEVER_PHRASES,
  /\d/,
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|double|half|percent)\b/i,
  /[%×]/,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/,
  /\b(today|tomorrow|tonight|weekend|spring|summer|autumn|fall|winter|quarter)\b/i,
  /\b(next|this)\s+(week|month|year)\b/i,
  /\blater this\b|\bcoming (days|weeks|months)\b|\b(in|by) (early|mid|late)\b/i,
  /\b(available|out now|now|included|includes|ships|shipped|versions?|releases?|updates?)\b/i,
  /\b(better|faster|cheaper|more accurate)\b/i,
  /\b(OpenAI|ChatGPT|GPT|Anthropic|Claude|Codex|Cursor|Copilot|Devin|Windsurf|Aider|Cline|Google|Gemini|Meta|Llama|Mistral|Qwen|DeepSeek|xAI|Grok|Microsoft|Apple)\b/i,
  /[!·•]/,
  /\b[A-Z]{2,}\b/,
  /\p{Extended_Pictographic}/u,
];

/** [major, minor, patch] of a plain release version ("2.0.0"); anything else (a pre-release, a "v", "") gives null. */
function versionParts(version: string): number[] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return match ? match.slice(1).map(Number) : null;
}

/** Whether `version` is `from` or later, compared as numbers. A version that isn't a plain x.y.z is never later. */
export function versionAtLeast(version: string, from: string): boolean {
  const have = versionParts(version);
  const need = versionParts(from);
  if (!have || !need) return false;
  for (let i = 0; i < need.length; i++) {
    if (have[i] !== need[i]) return (have[i] ?? 0) > (need[i] ?? 0);
  }
  return true;
}

/**
 * The gate: the footer shows the hint only when this is true. It reads the release facts' version by default, so the
 * hint stays off while the page states 1.5.0 and comes on with 2.0.0's facts; `planned` alone takes it down after.
 */
export function comingNextShown(version: string = releaseFacts.version, planned: boolean = comingNext.planned): boolean {
  return planned && versionAtLeast(version, comingNext.from);
}
