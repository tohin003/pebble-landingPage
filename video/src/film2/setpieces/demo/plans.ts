// The demo's plans, one list per aspect, in the film's order (pure: the tests check exactly what the reel draws).
// Each piece is fitted to a real measured stretch of an audition track (demo/grids.ts); the wall hands its camera to
// the convergence (a continuous hand-off), the others start as the edit lane would start them after a seam.
import type { Aspect } from "../../tokens";
import { sec } from "../../tokens";
import type { MusicGrid } from "../music";
import type { ScenePlan } from "../scene";
import { planDrop } from "../drop";
import { planRingBlock } from "../ringBlock";
import { ring4 } from "../rings";
import { planWall } from "../wall";
import { planDusk } from "../dusk";
import { planClimax } from "../climax";
import { planFinale } from "../finale";
import { STRETCH, demoGrid, type DemoStretch } from "./grids";

export interface DemoEntry {
  plan: ScenePlan;
  grid: MusicGrid;
  stretch: DemoStretch;
}

const SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };
const FPS = 60;
const cache = new Map<Aspect, DemoEntry[]>();

/** The credit line a CC BY cue needs (TREATMENT §3.11 L30; OVERRIDES §51). */
export const ccByCredit = (title: string) => `"${title}" by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au`;

export function demoPlans(aspect: Aspect): DemoEntry[] {
  const hit = cache.get(aspect);
  if (hit) return hit;
  const { w, h } = SIZE[aspect];
  const out: DemoEntry[] = [];
  const N = 6000;
  {
    // the Drop: 3 s of pre-roll (the card, the lead-in line), then the entrance on frame 180
    const grid = demoGrid(STRETCH.drop, 180, N, FPS);
    out.push({ plan: planDrop({ w, h, fps: FPS, hit: 180, grid }), grid, stretch: STRETCH.drop });
  }
  {
    // Ring 4 and Cascade 4: the block starts on a phrase downbeat of the ring groove
    const grid = demoGrid(STRETCH.ring, 0, N, FPS);
    out.push({ plan: planRingBlock({ w, h, fps: FPS, content: ring4(aspect), grid }), grid, stretch: STRETCH.ring });
  }
  {
    // the Dusk passage: from the quiet section's first downbeat
    const grid = demoGrid(STRETCH.dusk, 0, N, FPS);
    out.push({ plan: planDusk({ w, h, fps: FPS, grid }), grid, stretch: STRETCH.dusk });
  }
  {
    // the climax: the kept card lands on the peak's first strong downbeat, 5 s in
    const grid = demoGrid(STRETCH.climax, 300, N, FPS);
    out.push({ plan: planClimax({ w, h, fps: FPS, grid, peak: 300 }), grid, stretch: STRETCH.climax });
  }
  let wallExit: ScenePlan["exit"];
  let wallFrames = 0;
  {
    const grid = demoGrid(STRETCH.wall, 0, N, FPS);
    const plan = planWall({ w, h, fps: FPS, grid });
    wallExit = plan.exit;
    wallFrames = plan.duration;
    out.push({ plan, grid, stretch: STRETCH.wall });
  }
  {
    // the convergence continues the wall's camera; the title lands on frame 300; the track's last strong note 4 s later
    // (an edit at a bar line brings Born Of The Sky's 2:55.42 there), then its 6.6 s decay and 0.75 s of room tone
    const grid = demoGrid(STRETCH.finale, 300, N, FPS);
    const plan = planFinale({ w, h, fps: FPS, grid, hit: 300, lastNote: 300 + sec(4.0, FPS), decayS: 6.6, roomToneS: 0.75, entry: wallExit && { pose: wallExit.pose, vel: wallExit.vel, ref: wallExit.ref }, wallElapsed: wallFrames, musicCredit: ccByCredit("Born Of The Sky") });
    out.push({ plan, grid, stretch: STRETCH.finale });
  }
  cache.set(aspect, out);
  return out;
}
