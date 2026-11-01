// The full reel's plan check (light: no browser, no render): segments cover 0–end with no gap or overlap, every
// segment and cut lands on a beat (the breath and the silence on their own edges), every source frame a shot shows
// exists and is allowed, every line holds 0.4 s a word, and no forbidden word is on screen.
//   cd video && bun src/reel/full/check.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stealth } from "../../../../src/content/copy";
import { usesNeverWord } from "../../../../src/content/neverWords";
import { REEL_MAP } from "../maps/reelMap";
import { CROPS, framePath, hasFrame, type CropId } from "../takes";
import { buildFullPlan, CONVERGE, CONVERGE_SRC, END_CARD, STEALTH_HONEST, TEASE_LINES, TITLE } from "./timeline";
import { HERO_LABELS } from "./labels";

const plan = buildFullPlan(REEL_MAP);
const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "public");
const problems: string[] = [];
const map = plan.map;

const useFrames = (label: string, crop: CropId, frames: number[]) => {
  const c = CROPS[crop];
  for (const n of frames) {
    if (n < c.allowed[0] || n > c.allowed[1]) problems.push(`${label}: ${crop} shows source ${n}, outside its allowed ${c.allowed[0]}–${c.allowed[1]}`);
    if (!hasFrame(c.take, n)) problems.push(`${label}: ${c.take} has no frame ${n}`);
    else if (!existsSync(join(pub, framePath(c.take, n)))) problems.push(`${label}: missing ${framePath(c.take, n)}`);
  }
};
const words = (s: string) => s.replace(/\n/g, " ").split(/\s+/).filter(Boolean).length;
const readable = (label: string, text: string, frames: number) => {
  const need = words(text) * 0.4 * 60;
  // the checklist's "about 0.4 s per word as a floor": 5 % under it is still about it
  if (frames + 0.5 < need * 0.95) problems.push(`${label}: "${text.replace(/\n/g, " ")}" is on screen ${(frames / 60).toFixed(2)} s; ${words(text)} words need ${(need / 60).toFixed(2)} s`);
};

let prev = 0;
for (const s of plan.segments) {
  if (s.from !== prev) problems.push(`gap or overlap before ${s.kind} at ${s.from} (previous ended ${prev})`);
  prev = s.to;
  if (s.kind === "title") {
    // the opening: each line held at the floor from the beat it lands on (the second line's halves land a beat apart)
    readable("title", `${TITLE.intro} ${TITLE.name}`, s.lines[1] - s.lines[0]);
    readable("title", TITLE.line.join(" "), s.to - s.lines[1]);
    readable("title (second half)", TITLE.line[1], s.to - s.lines[2]);
  }
  if (s.kind === "hook") {
    const fr: number[] = [];
    for (let f = s.from; f < s.to; f++) fr.push(Math.round(s.src.at(f)));
    useFrames("hook", "askHook", fr);
  }
  if (s.kind === "flash") {
    for (const sh of s.shots) {
      const fr: number[] = [];
      for (let f = 0; f < sh.to - sh.from; f++) fr.push(Math.round(sh.src.at(f)));
      useFrames(s.id, sh.crop, fr);
    }
    readable(s.id, s.line, s.to - s.from);
  }
  if (s.kind === "type") readable(s.id, s.line, s.to - s.from);
  if (s.kind === "hero") {
    readable(s.id, `${s.name} ${s.sub ?? ""}`, s.to - s.from);
    // every explainer label held 0.4 s a word from its beat to the hero's end; at most about six label words (REVIEW B2)
    const labels = HERO_LABELS[s.id] ?? [];
    for (const l of labels) readable(`${s.id} label`, l.text, Math.round(((l.until ?? (s.to - s.from) / plan.B) - l.at) * plan.B));
    const lw = labels.reduce((n, l) => n + words(l.text), 0);
    if (labels.length > 3 || lw > 7) problems.push(`${s.id}: ${labels.length} labels, ${lw} label words (at most 3 and about 6)`);
  }
  if (s.kind === "card") {
    // the last card (the person, 12:03): the lockup, the licence and the address, at least 3 s and at the floor
    if (s.to - s.from < 180) problems.push(`the last card holds ${((s.to - s.from) / 60).toFixed(2)} s: at least 3 s`);
    readable("last card", `Pebble 2.0 ${END_CARD.licence} ${END_CARD.repo}`, s.to - s.from);
  }
  if (s.kind === "tease") TEASE_LINES.forEach((t, i) => readable("tease", t, s.to - s.lines[i]));
}
// the converge's cards: every one inside its crop's allowed window
CONVERGE.forEach((crop, i) => useFrames(`converge ${i}`, crop, [CONVERGE_SRC[crop] ?? CROPS[crop].allowed[0]]));
// the rival beat is out (the person, 12:03): no crop of the ask's take, and RS9B-02 only before its video (allow1, its tab)
for (const [id, c] of Object.entries(CROPS)) {
  if ((c.take as string) === "RS9A-01") problems.push(`${id}: RS9A-01 (the rival ask) must not be shown`);
  if (c.take === "RS9B-02" && c.allowed[1] > 3352) problems.push(`${id}: RS9B-02 past 3352 shows the video or its thumbnails`);
}
if (prev !== plan.length) problems.push(`the last segment ends on ${prev}, the reel on ${plan.length}`);

// cuts land on a beat, or on an eighth (Vanguard's grid: "cuts can land on every beat or every half beat")
const eighths = map.beats.flatMap((b, i) => (i + 1 < map.beats.length && map.beats[i + 1] - b < 40 ? [b, (b + map.beats[i + 1]) / 2] : [b]));
const onBeat = (f: number) => Math.min(...eighths.map((b) => Math.abs(b - f))) <= 1.01;
for (const c of plan.cuts) {
  const s = plan.segments.find((x) => x.from === c);
  if (s && s.kind === "breath") continue; // the breath runs from 6 frames before the drop
  if (!onBeat(c)) problems.push(`cut or hit at ${c} (${(c / 60).toFixed(3)} s) is off the beat`);
}
readable("honest line", STEALTH_HONEST, plan.honest.to - plan.honest.from);
if (plan.length < 45 * 60 || plan.length > 60 * 60) problems.push(`the reel runs ${(plan.length / 60).toFixed(1)} s: 45–60 s`);

// the never-lists on everything the reel prints: Stealth's (neverWords.ts; its honest line is the one allowed context)
// and PHILOSOPHY's banned words
const printed = [
  ...plan.segments.flatMap((s) => (s.kind === "flash" || s.kind === "type" ? [s.line] : s.kind === "hero" ? [s.name, s.sub ?? ""] : [])),
  ...TEASE_LINES,
  ...Object.values(HERO_LABELS).flatMap((ls) => ls.map((l) => l.text)),
  TITLE.intro,
  TITLE.name,
  ...TITLE.line,
  ...TITLE.lineNarrow,
  "What can you do now?",
  "Ask for approval",
  "Auto in project",
  "Full access",
  END_CARD.tagline,
  END_CARD.licence,
  END_CARD.repo,
  STEALTH_HONEST,
];
// the explainers' labels and chips, read from their source (every quoted string a component prints)
for (const file of ["explainers.tsx", "../fx/WorkshopExplainer.tsx"]) {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), "utf8");
  for (const m of src.matchAll(/text="([^"]+)"|"([A-Za-z][^"{}<>]{2,60})"/g)) printed.push(m[1] ?? m[2]);
}
const PHILOSOPHY_NEVER = [/\bmagic/i, /\bseamless/i, /\brevolutionary/i, /\bsecure\b/i, /private by design/i, /\bbeats?\b/i, /!/];
// nothing of the rival beat (the person, 12:03), and no competitor named or implied by the opening (the lead, round 3)
const ROUND3_NEVER = [/claude/i, /anthropic/i, /\brival/i, /\banyway/i, /\bcodex\b/i, /\bthan\b/i];
for (const p of printed) {
  if (usesNeverWord(p, [STEALTH_HONEST])) problems.push(`"${p}" uses a Stealth never-word (neverWords.ts)`);
  for (const re of PHILOSOPHY_NEVER) if (re.test(p)) problems.push(`"${p}" matches ${re} (PHILOSOPHY's never-list)`);
  for (const re of ROUND3_NEVER) if (re.test(p)) problems.push(`"${p}" matches ${re} (round 3: no rival, no comparison)`);
}
if (STEALTH_HONEST !== stealth.honest) problems.push("STEALTH_HONEST differs from copy.ts stealth.honest");

console.log(`map: ${map.name}, ${map.bpm.toFixed(2)} BPM, beat ${plan.B} f; drop ${plan.drop}, step-up ${plan.stepUp}, slam ${plan.slam}, logo ${plan.logo}, ${plan.length} frames`);
for (const s of plan.segments) {
  const label = s.kind === "flash" || s.kind === "type" ? `${s.kind} ${s.id}: ${s.line.replace(/\n/g, " ")}` : s.kind === "hero" ? `HERO ${s.id}: ${s.name.replace(/\n/g, " ")} ${s.sub ?? ""}` : s.kind;
  console.log(`  ${String(s.from).padStart(4)}–${String(s.to).padEnd(4)} ${(s.from / 60).toFixed(2).padStart(6)} s  ${((s.to - s.from) / plan.B).toFixed(1).padStart(4)} beats  ${label}`);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ${[...new Set(problems)].slice(0, 50).join("\n  ")}`);
  process.exit(1);
}
console.log("\nok: no gaps; cuts on beats; frames exist and are allowed; lines readable at 0.4 s a word; no never-words");
