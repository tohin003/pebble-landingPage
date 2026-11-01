// The master's plan, checked and printed: the timeline's invariants, the seams, every SFX cue with its time, and the
// effect density per 30 s. `bun video/src/launch/master/check.ts [--json out.json]`; exit 2 when an invariant fails.
import { writeFileSync } from "node:fs";
import { ALL_SCENES } from "../scenes/Previews";
import { density, masterCues } from "./sfx";
import { SEAMS, TIMELINE, checkTimeline } from "./timeline";

const problems = checkTimeline();
const cues = masterCues();
console.log("Timeline (s):");
for (const s of TIMELINE) {
  const def = ALL_SCENES.find((d) => d.id === s.id);
  const len = s.out - s.in;
  console.log(`  ${s.id.padEnd(20)} ${s.in.toFixed(3).padStart(7)} → ${s.out.toFixed(3).padStart(7)}  ${len.toFixed(3)} s  ${def ? `nominal ${def.nominalS} (k ${(len / def.nominalS).toFixed(3)})` : "PLACEHOLDER"}`);
  if (def && Math.abs(len / def.nominalS - 1) > 0.15) console.log("  WARNING " + `${s.id}: retimed by ${((len / def.nominalS - 1) * 100).toFixed(1)} %, beyond ±15 %`);
}
console.log("Seams:");
SEAMS.forEach((m, i) => console.log(`  ${TIMELINE[i].out.toFixed(3).padStart(7)}  ${m.kind.padEnd(12)} ${(m.pre + m.post).toFixed(2)} s  ${m.from} → ${TIMELINE[i + 1].id}: ${m.why}`));
console.log("SFX (peak, file, dB, scene: what):");
for (const c of cues) console.log(`  ${c.peak.toFixed(3).padStart(7)}  ${c.file.padEnd(24)} ${c.db.toFixed(1).padStart(6)}${c.rate !== 1 ? ` ×${c.rate}` : ""}  ${c.sceneOwned ? "[scene] " : ""}${c.scene}: ${c.what}`);
console.log("Density (effects per 30 s; a tick burst counts once):");
for (const d of density(cues)) console.log(`  ${d.from.toFixed(0).padStart(3)}–${d.to.toFixed(0).padEnd(3)} ${d.count}`);
const ji = process.argv.indexOf("--json");
if (ji > 0) writeFileSync(process.argv[ji + 1], JSON.stringify({ timeline: TIMELINE, seams: SEAMS.map((m, i) => ({ ...m, rect: undefined, at: TIMELINE[i].out })), cues }, null, 1));
if (problems.length) {
  console.log("PROBLEMS:\n  " + problems.join("\n  "));
  process.exit(2);
}
