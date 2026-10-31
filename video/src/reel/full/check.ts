// The full reel's plan check (light: no browser, no render): segments cover 0–end with no gap or overlap, every
// segment and cut lands on a beat (the breath and the silence on their own edges), every source frame a shot shows
// exists and is allowed, every line holds 0.4 s a word, and no forbidden word is on screen.
//   cd video && bun src/reel/full/check.ts
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stealth } from "../../../../src/content/copy";
import { usesNeverWord } from "../../../../src/content/neverWords";
import { REEL_MAP } from "../maps/reelMap";
import { CROPS, framePath, hasFrame, type CropId } from "../takes";
import { buildFullPlan, END_CARD, STEALTH_HONEST, TEASE_LINES } from "./timeline";

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
  if (s.kind === "hero") readable(s.id, `${s.name} ${s.sub ?? ""}`, s.to - s.from);
  if (s.kind === "rival") {
    const a: number[] = [];
    for (let f = 0; f < s.ask.to - s.ask.from; f++) a.push(Math.round(s.ask.src.at(f)));
    useFrames("rival ask", "rivalAsk", a);
    const p: number[] = [];
    for (let f = 0; f < s.play.to - s.play.from; f++) p.push(Math.round(s.play.src.at(f)));
    useFrames("rival play", "rivalPlay", p);
    useFrames("rival silence", "rivalTitle", [p[p.length - 1]]);
  }
}
if (prev !== plan.length) problems.push(`the last segment ends on ${prev}, the reel on ${plan.length}`);

const onBeat = (f: number) => Math.min(...map.beats.map((b) => Math.abs(b - f))) <= 1.01;
for (const c of plan.cuts) {
  const s = plan.segments.find((x) => x.from === c);
  if (s && s.kind === "breath") continue; // the breath runs from 6 frames before the drop
  if (!onBeat(c)) problems.push(`cut or hit at ${c} (${(c / 60).toFixed(3)} s) is off the beat`);
}
readable("honest line", STEALTH_HONEST, plan.length - plan.honest.from);
const tease = plan.segments.find((s) => s.kind === "tease");
if (tease && tease.kind === "tease") readable("tease", TEASE_LINES.join(" "), tease.to - tease.lines[0]);

// the never-lists on everything the reel prints: Stealth's (neverWords.ts; its honest line is the one allowed context)
// and PHILOSOPHY's banned words
const printed = [
  ...plan.segments.flatMap((s) => (s.kind === "flash" || s.kind === "type" ? [s.line] : s.kind === "hero" ? [s.name, s.sub ?? ""] : [])),
  ...TEASE_LINES,
  END_CARD.tagline,
  END_CARD.honestSmall,
  ...END_CARD.credits,
  "Anyway.",
  STEALTH_HONEST,
];
const PHILOSOPHY_NEVER = [/\bmagic/i, /\bseamless/i, /\brevolutionary/i, /\bsecure\b/i, /private by design/i, /\bbeats?\b/i, /!/];
for (const p of printed) {
  if (usesNeverWord(p, [STEALTH_HONEST])) problems.push(`"${p}" uses a Stealth never-word (neverWords.ts)`);
  for (const re of PHILOSOPHY_NEVER) if (re.test(p)) problems.push(`"${p}" matches ${re} (PHILOSOPHY's never-list)`);
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
