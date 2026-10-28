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
// - The gate: the footer shows it only while the release facts state a release of `from`'s own line, 2.0.0 or a later
//   2.0.x (comingNextShown), and only while `planned` is true. releaseFacts.ts is read here and never changed for it:
//   the page states a release only after its "x.y.z published" post, so the hint goes public with 2.0.0's page and not
//   before (D87). A later minor or major closes the gate by itself (the post-credit review's P2-2): D157 names the
//   next minor as the earliest the feature could come in, so that page must never carry "Not built yet." beside it
//   unless someone decides again here.
// - Only the footer shows it: it stays out of llms.txt, the metadata, Open Graph, JSON-LD and the sitemap.
// Rows: C-NEXT-1 and C-NEXT-2 in docs/CLAIMS.md.
import { COMING_NEVER, COMING_NEVER_PHRASES } from "../../shared/coming/never";
import { releaseFacts } from "./releaseFacts";

export const comingNext = {
  /** The promise, in ink: the release session's own starting line (D157). [C-NEXT-1] */
  lead: "Coming next: learning while resting.",
  /** Its limit, in muted ink, in the same paragraph: D157's status line, with the release it names left out. [C-NEXT-2] */
  limit: "Not built yet. It comes only if measurement shows it helps.",
  /**
   * The first release whose page may carry the hint: the hint's embargo (D87) ends with that release's post. Only its
   * own line carries it (the same major and minor: 2.0.x); a later minor or major retires it.
   */
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
 * The film's post-credit scene is held to the same ones: both read shared/coming/never.ts.
 */
export const NEXT_NEVER_PHRASES: readonly RegExp[] = COMING_NEVER_PHRASES;

/**
 * Everything the hint may never say (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1 and C2): the four phrases; any number (so
 * any version, date, price or rate) and the number words; a month (or its abbreviation), a weekday, a season or another
 * time word; a version, a release, an update or a build; anything that says it is out, shipping, included or part of a
 * release; a comparison; an overclaim of what it keeps ("everything", "all your", "always"); a model or company name;
 * and the house never-list (an exclamation mark, a middle dot, a word in capitals, an emoji). Rules, not copy. One rule
 * set with the film's post-credit scene (shared/coming/never.ts, where each rule says why), so the two say the coming
 * feature one way.
 */
export const NEXT_NEVER: readonly RegExp[] = COMING_NEVER.map((rule) => rule.re);

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

/** Whether `version` is in `from`'s own line: the same major and minor (2.0.4 is in 2.0.0's; 2.1.0 is not). */
export function sameLine(version: string, from: string): boolean {
  const have = versionParts(version);
  const need = versionParts(from);
  return !!have && !!need && have[0] === need[0] && have[1] === need[1];
}

/**
 * The gate: the footer shows the hint only when this is true. It reads the release facts' version by default, so the
 * hint stays off while the page states 1.5.0, comes on with 2.0.0's facts, stays on through 2.0.x, and goes by itself
 * when the facts state a later minor or major; `planned` takes it down at any time.
 */
export function comingNextShown(version: string = releaseFacts.version, planned: boolean = comingNext.planned): boolean {
  return planned && versionAtLeast(version, comingNext.from) && sameLine(version, comingNext.from);
}
