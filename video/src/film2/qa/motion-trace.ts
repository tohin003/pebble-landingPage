// Dumps the demo reel's motion, frame by frame, as JSON (light: pure TypeScript): the focal point's screen speed, the
// blur the planes apply, the grade's modelled luminance, the rings alive, and the aperture's opening. A plot of it is
// the cheapest way to LOOK at velocity across every seam before rendering anything.
//   bun video/src/film2/qa/motion-trace.ts > .work/film2/motion-trace.json
import { blurForTravel } from "../motion/blur";
import { len } from "../motion/geometry";
import { allRingStates } from "../carrier/ring";
import { gradeAt, gradeLuminance } from "../light/grades";
import { focalVelocity, shotAt } from "./checks";
import { DURATION, LIGHT_CUES, LIGHT_INITIAL, apertureOpenAt, demoQa } from "../demo/timeline";

const t = demoQa();
const rows: { f: number; shot: string; speed: number; vx: number; vy: number; blur: number; lum: number; rings: number; aperture: number }[] = [];
for (let f = 0; f < DURATION; f++) {
  const s = shotAt(t, f)!;
  const v = focalVelocity(t, s, f);
  rows.push({
    f,
    shot: s.id,
    speed: Math.round(len(v) * 100) / 100,
    vx: Math.round(v.x * 100) / 100,
    vy: Math.round(v.y * 100) / 100,
    blur: Math.round(blurForTravel(len(v), t.fps) * 100) / 100,
    lum: Math.round(gradeLuminance(gradeAt(f, LIGHT_INITIAL, LIGHT_CUES)) * 1000) / 1000,
    rings: allRingStates(t.rings ?? [], f, t.fps).filter((r) => r.opacity > 0.01).length,
    aperture: Math.round(apertureOpenAt(f) * 1000) / 1000,
  });
}
console.log(JSON.stringify({ fps: t.fps, seams: t.seams.map((x) => ({ at: x.at, kind: x.kind, frames: x.frames })), rows }));
