// Writes the film's master LUT (light/lut.ts) as a .cube file. Light work (a few ms, no media):
//   bun video/src/film2/light/write-lut.ts <out.cube> [size=33] [grade]
// With a grade name (morning, warm, day, dusk, evening, page, night), the section grade is baked in front of the look.
import { writeFileSync } from "node:fs";
import { GRADES, type GradeName } from "./grades";
import { filmCube, gradeCube } from "./lut";

const [out, sizeArg, gradeArg] = process.argv.slice(2);
if (!out) {
  console.error("usage: bun video/src/film2/light/write-lut.ts <out.cube> [size=33] [grade]");
  process.exit(64);
}
const size = Number(sizeArg ?? 33);
if (!Number.isInteger(size) || size < 2 || size > 65) throw new Error("size must be an integer in 2..65");
const text = gradeArg ? gradeCube(GRADES[gradeArg as GradeName] ?? (() => { throw new Error(`unknown grade ${gradeArg}`); })(), size) : filmCube(size);
writeFileSync(out, text);
console.log(`wrote ${out}: ${size}³ entries, ${text.length} bytes${gradeArg ? `, grade ${gradeArg} + look` : ""}`);
