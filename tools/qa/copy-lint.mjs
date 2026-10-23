// tools/qa/copy-lint.mjs: the copy lint of MASTER_PLAN §9.3 and OVERRIDES §8 (C2), on the built site.
//
//   cd <repo> && source scripts/env.sh && node tools/qa/copy-lint.mjs [--src] [--verbose]
//
// Reads the prerendered pages of the last `next build` (.next/server/app/*.html, plus /llms.txt), keeps what a visitor
// reads (text, alt, aria-label, title, the meta description and Open Graph text), and fails on:
//   - phrases the voice rules ban (U1 §1.5, MASTER_PLAN §7.2 and §9.3, OVERRIDES §2): hype words, claims such as
//     "secure", "safe", "works offline", "100%", comparisons ("faster", "better", "more reliable") and so on;
//   - exclamation marks;
//   - American spellings (licence, colour, recognise and the like);
//   - "every" or "always" next to edit, command, Git or test without a mode qualifier (OVERRIDES §8 C2);
//   - competitor and internal model names, and words that must not reach a visitor ("receipt", "fixture", "mock").
// Exact strings that are right as written (Pebble's own words, honest negatives, approved sentences) are allowed by
// exact match only (ALLOW below; the reasons are in docs/CLAIMS.md "Allow-list for tools/qa/copy-lint.mjs").
// Verbatim text is exempt from the wording rules (still checked for "!"): <code>, <pre>, <kbd>, <samp> and elements
// marked translate="no" (commands, file names, third-party licence notices).
// With --src, also scans the string literals in src/content/*.ts (text that only appears after an interaction).
// Light work (reads files); no heavy.sh lock needed. Exit 1 on any finding.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const APP = path.join(REPO, ".next", "server", "app");
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");

// ---- rules -------------------------------------------------------------------------------------------------------
const BANNED = [
  [/\bverified download\b/i, "claim: verified download"],
  [/\bworks? offline\b/i, "claim: works offline"],
  [/\b100\s?%/i, "claim: 100%"],
  [/\bprivate by design\b/i, "retired line: Private by design"],
  [/\bsecure(ly)?\b/i, "claim: secure"],
  [/\bsafe(ly|r|st)?\b/i, "claim: safe"],
  [/\baudited\b/i, "claim: audited"],
  [/\bauto-?updat/i, "claim: auto-update"],
  [/\bany Mac\b/i, "claim: any Mac"],
  [/^(?!.*\bno (version|\w+ version)|.*\bno\b[^.]*\b(Windows|Linux)\b[^.]*\bversion\b).*\bWindows\b/, "platform: Windows (only as an honest negative)"],
  [/^(?!.*\bno (version|\w+ version)|.*\bno\b[^.]*\b(Windows|Linux)\b[^.]*\bversion\b).*\bLinux\b/, "platform: Linux (only as an honest negative)"],
  [/\bmagic(al)?\b/i, "hype: magic"],
  [/\bseamless(ly)?\b/i, "hype: seamless"],
  [/\brevolutionary\b/i, "hype: revolutionary"],
  [/\beffortless(ly)?\b/i, "hype: effortless"],
  [/\bunlock(s|ed)?\b/i, "hype: unlock"],
  [/\bsupercharg/i, "hype: supercharge"],
  [/\b(blazing|cutting-edge|game-?chang|next-gen|world-class|best-in-class|state-of-the-art|unleash|empower|superpower)/i, "hype"],
  [/\bfully local\b/i, "over-claim: fully local"],
  [/\bphones? home\b/i, "unsourced: phones home"],
  [/^(?!.*\b(not|isn't|isn’t|never|no|without)\b).*\bnotari[sz]ed\b/i, "claim: notarized (only as an honest negative)"],
  [/\bfaster\b/i, "comparison: faster"],
  [/\bbetter\b/i, "comparison: better"],
  [/\bbeats\b/i, "comparison: beats"],
  [/\bmore reliable\b/i, "comparison: more reliable"],
  [/\b(Claude Code|Codex|Cursor|Copilot|Devin|Windsurf|Aider|Cline)\b/, "competitor name"],
  [/\bQwen|\bQ4_K_M\b/i, "internal model name"],
  [/\bFrogNano\b.{0,40}\brecommended\b|\brecommended\b.{0,40}\bFrogNano\b/i, "FrogNano is a provisional default, never recommended"],
  [/\breceipts?\b/i, "jargon: receipt (use check or result)"],
  [/\b(fixture|mock(ed)?|synthetic)\b/i, "internal word on a visitor surface"],
];

// American spelling → British (MASTER_PLAN §7.2: British spelling; §9.3: licence, colour, recognise …)
const AMERICAN = [
  [/\blicenses?\b/i, "licence (noun; the verb, licensed and licensing, is fine)"],
  [/\bcolor(s|ed|ful|ing)?\b/i, "colour"],
  [/\bbehavior(s|al)?\b/i, "behaviour"],
  [/\bfavorite(s)?\b/i, "favourite"],
  [/\bcenter(s|ed)?\b/i, "centre"],
  [/\bgray\b/i, "grey"],
  [/\b(analy|organi|recogni|reali|customi|optimi|prioriti|summari|minimi|maximi|initiali|apologi|authori|categori|personali|visuali|synchroni|memori|standardi|utili|emphasi|normali|finali|speciali)z(e|es|ed|ing|ation|ations)\b/i, "-ise"],
  [/\bcatalog(s)?\b/i, "catalogue"],
  [/\bdefense\b/i, "defence"],
  [/\boffense\b/i, "offence"],
  [/\blabel(ed|ing)\b/i, "labelled, labelling"],
  [/\bcancel(ed|ing)\b/i, "cancelled, cancelling"],
  [/\btravel(ed|ing|er)\b/i, "travelled"],
  [/\bmodel(ed|ing)\b/i, "modelled, modelling"],
  [/\bfulfill(s|ment)?\b/i, "fulfil"],
  [/\benroll(s|ment)?\b/i, "enrol"],
  [/\bartifact(s)?\b/i, "artefact"],
  [/\bmom\b/i, "mum"],
  [/\bcozy\b/i, "cosy"],
  [/\btoward\b/i, "towards"],
];

const EVERY_ALWAYS = /\b(every|always)\b/i;
const SUBJECT = /\b(edit(s|ed|ing)?|commands?|git|tests?|test run(s)?)\b/i;
const NEAR = 6; // "next to": within this many words
/** "every"/"always" within NEAR words of edit, command, Git or test */
function everyAlwaysNear(text) {
  const words = text.split(/[^A-Za-z’'-]+/).filter(Boolean);
  const ea = [];
  const subj = [];
  words.forEach((w, i) => {
    if (EVERY_ALWAYS.test(w)) ea.push(i);
    if (SUBJECT.test(w) || (/^test$/i.test(w) && /^runs?$/i.test(words[i + 1] ?? ""))) subj.push(i);
  });
  return ea.some((i) => subj.some((j) => Math.abs(i - j) <= NEAR));
}
const QUALIFIER = /\b(in (the )?default mode|default mode|in every mode|in (Ask first|Auto in project|Full access)|whatever the mode|in all three modes)\b/i;

// Exact strings that are right as written (docs/CLAIMS.md allow-list, OVERRIDES §2 and §8 C2). Matched against the
// whole text node / attribute / sentence, so anything else with the same word still fails.
const ALLOW = new Set([
  // CLAIMS.md allow-list
  "Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe.",
  "Pebble is not notarized.",
  "not notarized",
  "Pebble is not notarized, so the first time you open it, macOS may say it cannot verify the app.",
  "Why isn't it notarized?",
  "Why isn’t it notarized?",
  "The first time you open it, macOS may say it cannot verify the app, because Pebble is not notarized.",
  "Pebble 1.0 is signed with the project's own stable identity, not an Apple Developer ID, and it is not notarized by Apple. Signed, notarized installers are on the list of work still to do.",
  "Pebble 1.0 is signed with the project’s own stable identity, not an Apple Developer ID, and it is not notarized by Apple. Signed, notarized installers are on the list of work still to do.",
  "Pebble runs on Macs with Apple silicon (M1 or later). There is no version for Intel Macs, Windows or Linux.",
  "There is no version for Intel Macs, Windows or Linux, and the installer won't run under Rosetta.",
  "There is no version for Intel Macs, Windows or Linux, and the installer won’t run under Rosetta.",
  // OVERRIDES §8 C2: the approved mode-qualified sentence for commands and Git
  "Terminal commands beyond a short read-only list, and Git changes that delete or publish work, always wait for your review.",
  // every/always sentences that need no mode qualifier (claims review):
  // the "Ask for approval" mode's own "Always asks" text, word for word from permissionModes.ts (C-EXP-4..7)
  "Every edit, test run, terminal command, app launch, Git change and connector call.",
  // true in every mode: a Git change that deletes or publishes work always asks (C-TOUR-2)
  "A Git change that deletes or publishes work always asks.",
  // README's release gates, word for word (C-INF-5); about how Pebble is released, not about modes
  "A secret scan, a licence inventory, a scan for personal paths, and every published test run in a fresh clone.",
  // the sandbox caveat (OVERRIDES §8 H14); "every" belongs to "attack"
  "Protection comes from elsewhere: the permission mode you pick, approvals that happen only in Pebble's main window, and macOS's sandbox, which limits commands and tests but is not a promise against every attack.",
  "Protection comes from elsewhere: the permission mode you pick, approvals that happen only in Pebble’s main window, and macOS’s sandbox, which limits commands and tests but is not a promise against every attack.",
]);
// Proper names and fixed terms that contain a flagged word
const ALLOW_PATTERNS = [
  /\b(MIT|Apache|SIL Open Font|Open Font|BSD|ISC|Mozilla Public|GNU (Lesser )?General Public|Pixabay|Mixkit( Free)?( Stock)?( Music)?|Creative Commons|Blue Oak Model) Licen[cs]e\b/g,
  /\bApache License,? (Version )?2\.0\b/g,
  /\bLICENSE\b/g, // the file name
  /\bRemotion License\b|\bFree License\b/g, // Remotion's licence and its tier, by name
];

// ---- HTML to visible text ----------------------------------------------------------------------------------------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", mdash: "—", ndash: "–", middot: "·", copy: "©", times: "×", rarr: "→" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** [{ text, verbatim, where }] from one HTML page: text runs split at block boundaries, plus readable attributes. */
function extract(html, page) {
  const out = [];
  let body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ");
  // the head: description and Open Graph / Twitter text, the title
  for (const m of body.matchAll(/<meta\b[^>]*\b(?:name|property)="(description|og:title|og:description|twitter:title|twitter:description)"[^>]*\bcontent="([^"]*)"/gi))
    out.push({ text: decode(m[2]), verbatim: false, where: `${page} <meta ${m[1]}>` });
  for (const m of body.matchAll(/<title>([^<]*)<\/title>/gi)) out.push({ text: decode(m[1]), verbatim: false, where: `${page} <title>` });
  body = body.replace(/<head\b[\s\S]*?<\/head>/i, " ");
  // readable attributes
  for (const m of body.matchAll(/\b(alt|aria-label|title|placeholder)="([^"]+)"/gi))
    out.push({ text: decode(m[2]), verbatim: false, where: `${page} [${m[1]}]` });
  // walk the tags, tracking verbatim zones
  const tokens = body.split(/(<[^>]+>)/);
  const stack = []; // verbatim depth markers: tag names
  let buf = "";
  let bufVerbatim = false;
  const flush = () => {
    const t = buf.replace(/\s+/g, " ").trim();
    if (t) out.push({ text: decode(t), verbatim: bufVerbatim, where: page });
    buf = "";
  };
  const BLOCK = /^(p|li|h[1-6]|dt|dd|td|th|summary|figcaption|caption|label|button|a|div|section|article|aside|header|footer|nav|main|ul|ol|blockquote|br|dialog|small|time|strong|span|code|pre|kbd|samp)$/i;
  for (const tok of tokens) {
    if (tok.startsWith("<")) {
      const m = tok.match(/^<\/?\s*([a-z0-9-]+)/i);
      if (!m) continue;
      const name = m[1].toLowerCase();
      const closing = tok.startsWith("</");
      const selfClosing = /\/>$/.test(tok) || /^(br|img|input|meta|link|hr|source|track|wbr)$/.test(name);
      if (BLOCK.test(name) && !/^(strong|span|time|a|small|code|kbd|samp)$/.test(name)) flush();
      if (!closing && !selfClosing) {
        const verbatim = /^(code|pre|kbd|samp)$/.test(name) || /\btranslate="no"/.test(tok);
        if (verbatim || stack.length) {
          if (verbatim && !stack.length) flush();
          stack.push(name);
        }
      } else if (closing && stack.length && stack[stack.length - 1] === name) {
        stack.pop();
        if (!stack.length) {
          bufVerbatim = true;
          flush();
          bufVerbatim = false;
        }
      }
      continue;
    }
    if (stack.length) bufVerbatim = true;
    buf += tok;
  }
  flush();
  return out;
}

// ---- checks ------------------------------------------------------------------------------------------------------
const findings = [];
const seen = new Set();
function report(where, rule, text, match) {
  const key = `${rule}|${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ where, rule, text, match });
}

function sentences(text) {
  return text.split(/(?<=[.?:;])\s+(?=[A-Z“"‘'(0-9])/);
}

function strip(text) {
  let t = text;
  for (const re of ALLOW_PATTERNS) t = t.replace(re, " ");
  return t;
}

function lint({ text, verbatim, where }) {
  if (ALLOW.has(text.trim())) return;
  if (text.includes("!")) {
    // "!" in a verbatim command or a URL is not prose
    const prose = verbatim ? "" : text.replace(/https?:\/\/\S+/g, "");
    if (prose.includes("!")) report(where, "exclamation mark", text, "!");
  }
  if (verbatim) return;
  for (const s of sentences(text)) {
    if (ALLOW.has(s.trim())) continue;
    const t = strip(s);
    for (const [re, rule] of BANNED) {
      const m = t.match(re);
      if (m) report(where, rule, s, m[0]);
    }
    for (const [re, rule] of AMERICAN) {
      const m = t.match(re);
      if (m) report(where, `American spelling (${rule})`, s, m[0]);
    }
    if (EVERY_ALWAYS.test(t) && everyAlwaysNear(t) && !QUALIFIER.test(t)) report(where, "every/always without a mode qualifier (C2)", s, t.match(EVERY_ALWAYS)[0]);
  }
}

const pages = existsSync(APP) ? readdirSync(APP).filter((f) => f.endsWith(".html") && !f.startsWith("_global-error")) : [];
if (!pages.length) {
  console.error("copy-lint: no built pages in .next/server/app (run next build first)");
  process.exit(2);
}
let items = 0;
for (const file of pages) {
  const page = file === "index.html" ? "/" : `/${file.replace(/\.html$/, "")}`;
  for (const item of extract(readFileSync(path.join(APP, file), "utf8"), page)) {
    items++;
    lint(item);
  }
}
const llms = path.join(APP, "llms.txt.body");
if (existsSync(llms)) {
  for (const [i, l] of readFileSync(llms, "utf8").split("\n").entries()) {
    if (!l.trim()) continue;
    items++;
    lint({ text: l.replace(/^[-#>*\s]+/, "").replace(/`[^`]*`/g, "CODE"), verbatim: false, where: `/llms.txt:${i + 1}` });
  }
}
if (args.includes("--src")) {
  for (const file of readdirSync(path.join(REPO, "src", "content")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
    const src = readFileSync(path.join(REPO, "src", "content", file), "utf8");
    const lines = src.split("\n");
    for (const [i, l] of lines.entries()) {
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue; // comments
      const code = l.replace(/\s\/\/\s.*$/, ""); // and end-of-line comments
      for (const m of code.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
        const s = (m[1] ?? m[2] ?? "").replace(/\\(["'`\\])/g, "$1");
        if (s.length < 3 || !/[a-z]{2}/i.test(s) || /^[\w./:#@-]+$/.test(s)) continue; // keys, paths, URLs
        items++;
        lint({ text: s.replace(/`[^`]*`/g, "CODE"), verbatim: false, where: `src/content/${file}:${i + 1}` });
      }
    }
  }
}

for (const f of findings) {
  console.log(`${f.where}  [${f.rule}] "${f.match}"`);
  console.log(`    ${f.text.length > 220 ? `${f.text.slice(0, 220)}…` : f.text}`);
}
console.log(`SUMMARY: ${items} text item(s) from ${pages.length} page(s)${args.includes("--src") ? " and src/content" : ""}; ${findings.length} finding(s)`);
if (VERBOSE) console.log(JSON.stringify(findings, null, 2));
process.exit(findings.length ? 1 : 0);
