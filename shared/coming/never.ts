// shared/coming/never.ts
//
// The coming feature's never-list: ONE rule set for the two places that say it, the film's post-credit scene
// (video/src/film2/setpieces/codaChecks.ts CODA_NEVER, its lines, captions, description and transcript) and the page's
// hint (src/content/next.ts NEXT_NEVER). D157, posted by the release session at 16:12 on 27 October 2026; OVERRIDES §62;
// POSTCREDIT_DESIGN §5, C1 and C2. Before this file the two lists differed (the post-credit review's P2-3, 28 Oct): the
// film's missed plurals ("releases", "updates", "versions"), the page's missed month abbreviations and "season", and
// neither caught "shipping", "a future build" or an overclaim of memory ("remembers everything", "all your work").
//
// Each rule says why it exists. Rules, not copy: nothing here is shown. Plain TypeScript, no imports, so the site
// (Next.js) and the film (Remotion) both import it as it is.

/**
 * §62's four phrases and their forms: "rewrites its memory", "never forgets", "learns everything" and "smarter every
 * night" (in two parts, so either half fails). tools/qa/copy-lint.mjs bans exactly these expressions on every page.
 */
export const COMING_NEVER_PHRASES: readonly RegExp[] = [
  /\brewr[io]t\w*\b.{0,20}\bmemor/i,
  /\bnever forget/i,
  /\blearn\w*\s+everything/i,
  /\bsmarter\b/i,
  /\bevery night\b/i,
];

/** Everything the coming feature's words may never say, each with why (OVERRIDES §62; POSTCREDIT_DESIGN §5, C1 and C2). */
export const COMING_NEVER: readonly { re: RegExp; why: string }[] = [
  ...COMING_NEVER_PHRASES.map((re) => ({ re, why: "one of §62's four phrases" })),
  { re: /\d/, why: "a number (a version, a date, a price, a rate)" },
  { re: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|double|half|percent)\b/i, why: "a number word" },
  { re: /[%×]/, why: "a number sign" },
  { re: /\bv\d|\bversions?\b|\breleases?\b|\bupdates?\b|\bbuilds?\b/i, why: "a version, a release, an update or a build" },
  { re: /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/, why: "a month" },
  { re: /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/, why: "a weekday" },
  { re: /\b(today|tomorrow|tonight|weekend|spring|summer|autumn|fall|winter|quarter)\b/i, why: "a time word" },
  { re: /\b(next|this)\s+(week|month|year|season)\b/i, why: "a date" },
  { re: /\blater this\b|\bcoming (days|weeks|months)\b|\b(in|by) (early|mid|late)\b/i, why: "a window" },
  { re: /\b(available|out now|now|included|includes|ship|ships|shipped|shipping|in this release)\b/i, why: "says it is out or part of a release" },
  { re: /\b(better|faster|cheaper|more accurate)\b/i, why: "a comparison" },
  { re: /\beverything\b|\ball (of )?your\b|\balways\b|\bforever\b/i, why: "an overclaim of what it keeps or learns" },
  { re: /\b(OpenAI|ChatGPT|GPT|Anthropic|Claude|Codex|Cursor|Copilot|Devin|Windsurf|Aider|Cline|Google|Gemini|Meta|Llama|Mistral|Qwen|DeepSeek|xAI|Grok|Microsoft|Apple)\b/i, why: "a model or company name" },
  { re: /[!·•]/, why: "the never-list's marks" },
  { re: /\b[A-Z]{2,}\b/, why: "a word in capitals" },
  { re: /\p{Extended_Pictographic}/u, why: "an emoji" },
];

/** Why a text breaks the rules (empty when it passes): each match with its rule's why. */
export const comingNeverIn = (text: string): string[] => COMING_NEVER.filter((x) => x.re.test(text)).map((x) => `"${text.match(x.re)![0]}" (${x.why})`);
