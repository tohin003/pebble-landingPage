// The demo's plans, one list per aspect, in the film's order (pure: the tests check exactly what the reel draws).
// Each piece is fitted to a real measured stretch of an audition track (demo/grids.ts); the wall hands its camera to
// the convergence (a continuous hand-off), the others start as the edit lane would start them after a seam.
import type { Aspect } from "../../tokens";
import { sec } from "../../tokens";
import type { MusicGrid } from "../music";
import type { ScenePlan } from "../scene";
import { planDrop, type DropTiming } from "../drop";
import { planRingBlock, type RingTiming } from "../ringBlock";
import { ring4 } from "../rings";
import { planWall } from "../wall";
import { planDusk } from "../dusk";
import { planClimax } from "../climax";
import { planFinale, type FinaleTiming } from "../finale";
import { ASPECTS, alignAspects } from "../align";
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

/** Every piece in every aspect, each piece on one timeline across the aspects (setpieces/align.ts). */
function buildAll(): Map<Aspect, DemoEntry[]> {
  const out = new Map<Aspect, DemoEntry[]>(ASPECTS.map((a) => [a, []]));
  const add = (plans: Record<Aspect, ScenePlan>, grid: MusicGrid, stretch: DemoStretch) => {
    for (const a of ASPECTS) out.get(a)!.push({ plan: plans[a], grid, stretch });
  };
  const N = 6000;
  {
    // the Drop: 3 s of pre-roll (the card, the lead-in line), then the entrance on frame 180
    const grid = demoGrid(STRETCH.drop, 180, N, FPS);
    add(alignAspects<DropTiming>((a, align) => planDrop({ ...SIZE[a], fps: FPS, hit: 180, grid, align })), grid, STRETCH.drop);
  }
  {
    // Ring 4 and Cascade 4: the block starts on a phrase downbeat of the ring groove
    const grid = demoGrid(STRETCH.ring, 0, N, FPS);
    add(alignAspects<RingTiming>((a, align) => planRingBlock({ ...SIZE[a], fps: FPS, content: ring4(a), grid, align })), grid, STRETCH.ring);
  }
  {
    // the Dusk passage: from the quiet section's first downbeat
    const grid = demoGrid(STRETCH.dusk, 0, N, FPS);
    add(alignAspects((a) => planDusk({ ...SIZE[a], fps: FPS, grid })), grid, STRETCH.dusk);
  }
  {
    // the climax: the kept card lands on the peak's first strong downbeat, 5 s in
    const grid = demoGrid(STRETCH.climax, 300, N, FPS);
    add(alignAspects((a) => planClimax({ ...SIZE[a], fps: FPS, grid, peak: 300 })), grid, STRETCH.climax);
  }
  const wallGrid = demoGrid(STRETCH.wall, 0, N, FPS);
  const walls = alignAspects((a) => planWall({ ...SIZE[a], fps: FPS, grid: wallGrid }));
  add(walls, wallGrid, STRETCH.wall);
  {
    // the convergence continues the wall's camera, parallax ref and orbit clock; the title lands on frame 300; the
    // track's last strong note 4 s later (an edit at a bar line brings Born Of The Sky's 2:55.42 there), then its 6.6 s
    // decay and 0.75 s of room tone
    const grid = demoGrid(STRETCH.finale, 300, N, FPS);
    add(
      alignAspects<FinaleTiming>((a, align) => {
        const ex = walls[a].exit!;
        return planFinale({ ...SIZE[a], fps: FPS, grid, hit: 300, lastNote: 300 + sec(4.0, FPS), decayS: 6.6, roomToneS: 0.75, entry: { pose: ex.pose, vel: ex.vel, ref: ex.ref }, wallElapsed: walls[a].duration, musicCredit: ccByCredit("Born Of The Sky"), align });
      }),
      grid,
      STRETCH.finale,
    );
  }
  return out;
}

export function demoPlans(aspect: Aspect): DemoEntry[] {
  if (cache.size === 0) for (const [a, list] of buildAll()) cache.set(a, list);
  return cache.get(aspect)!;
}
