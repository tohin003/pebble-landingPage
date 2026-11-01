// The reel's on-screen text as an SRT (PRO_CHECKLIST, Delivery: "an SRT for any text a platform should read"): every
// line the reel prints, with the time it is on screen, from the same timeline the picture uses. Light: no render.
//   cd video && bun src/reel/full/srt.ts > ../.work/reel/full/pebble-2.0-reel.srt
import { REEL_MAP } from "../maps/reelMap";
import { buildFullPlan, END_CARD, STEALTH_HONEST, TEASE_LINES } from "./timeline";

const plan = buildFullPlan(REEL_MAP);
const cues: { from: number; to: number; text: string }[] = [];
const one = (s: string) => s.replace(/\n/g, " ");
const hook = plan.segments.find((s) => s.kind === "hook")!;
cues.push({ from: 30, to: hook.to - 34, text: "What can you do now?" });
const reveal = plan.segments.find((s) => s.kind === "reveal");
if (reveal && reveal.kind === "reveal") cues.push({ from: reveal.w1, to: reveal.to, text: "Pebble 2.0" });
for (const s of plan.segments) {
  if (s.kind === "flash" || s.kind === "type") cues.push({ from: s.from, to: s.to, text: one(s.line) });
  if (s.kind === "hero") cues.push({ from: s.from, to: s.to, text: one(s.name) + (s.sub ? `\n${s.sub}` : "") });
  if (s.kind === "silence") cues.push({ from: s.anyway, to: s.to, text: "Anyway." });
}
cues.push({ from: plan.honest.from, to: plan.honest.to, text: STEALTH_HONEST });
const logo = plan.segments.find((s) => s.kind === "logo");
const tease = plan.segments.find((s) => s.kind === "tease");
if (logo && logo.kind === "logo" && tease && tease.kind === "tease") {
  cues.push({ from: logo.from, to: tease.from, text: `Pebble 2.0\n${END_CARD.tagline}` });
  TEASE_LINES.forEach((t, i) => cues.push({ from: tease.lines[i], to: plan.scoreEnd, text: t }));
  cues.push({ from: logo.credits, to: plan.length, text: [END_CARD.honestSmall, ...END_CARD.credits].join("\n") });
}
cues.sort((a, b) => a.from - b.from);
const ts = (f: number) => {
  const ms = Math.round((f / 60) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
console.log(cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join("\n"));
