// The reel's on-screen text as an SRT (PRO_CHECKLIST, Delivery: "an SRT for any text a platform should read"): every
// line the reel prints, with the time it is on screen, from the same timeline the picture uses. Light: no render.
//   cd video && bun src/reel/full/srt.ts > ../.work/reel/full/pebble-2.0-reel.srt
import { REEL_MAP } from "../maps/reelMap";
import { buildFullPlan, END_CARD, STEALTH_HONEST, TEASE_LINES, TITLE } from "./timeline";

// only what the reel prints (the lead, round 3): the music's credits are in the descriptions (DESCRIPTION.txt)
const plan = buildFullPlan(REEL_MAP);
const cues: { from: number; to: number; text: string }[] = [];
const one = (s: string) => s.replace(/\n/g, " ");
for (const s of plan.segments) {
  if (s.kind === "title") {
    cues.push({ from: s.lines[0], to: s.lines[1], text: `${TITLE.intro} ${TITLE.name}` });
    cues.push({ from: s.lines[1], to: s.to, text: TITLE.line.join("\n") });
  }
  if (s.kind === "hook") cues.push({ from: s.from, to: s.zoomFrom + 10, text: "What can you do now?" });
  if (s.kind === "flash" || s.kind === "type") cues.push({ from: s.from, to: s.to, text: one(s.line) });
  if (s.kind === "hero") cues.push({ from: s.from, to: s.to, text: one(s.name) + (s.sub ? `\n${s.sub}` : "") });
}
cues.push({ from: plan.honest.from, to: plan.honest.to, text: STEALTH_HONEST });
const logo = plan.segments.find((s) => s.kind === "logo");
const tease = plan.segments.find((s) => s.kind === "tease");
const card = plan.segments.find((s) => s.kind === "card");
if (logo && tease && tease.kind === "tease" && card) {
  cues.push({ from: logo.from, to: card.from, text: `Pebble 2.0\n${END_CARD.tagline}` });
  TEASE_LINES.forEach((t, i) => cues.push({ from: tease.lines[i], to: card.from, text: t }));
  cues.push({ from: card.from, to: card.to, text: `Pebble 2.0\n${END_CARD.licence}\n${END_CARD.repo}` });
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
