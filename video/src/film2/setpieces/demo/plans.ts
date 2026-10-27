// The demo's plans, one list per aspect, in the film's order (pure: the tests check exactly what the reel draws).
// Each piece is fitted to a real measured stretch of an audition track (demo/grids.ts), and every join is designed
// (CR-06, setpieces/joins.ts): the Drop's world continues into Ring 4 (the ring leaves the stone in the same world), the
// cascade, the crane and the climax each leave on an E-leave into a momentum cut that the next piece enters at the
// same speed, and the wall hands its camera to the convergence. Each piece takes the light the previous one ends on.
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
import { CODA_GRID, CODA_STRETCH, planCoda, type CodaTiming } from "../coda";
import { ASPECTS, alignAspects } from "../align";
import { cutVelocity, shareGround, type JoinKind } from "../joins";
import { STRETCH, demoGrid, type DemoStretch } from "./grids";

export interface DemoEntry {
  plan: ScenePlan;
  grid: MusicGrid;
  stretch: DemoStretch;
}

const SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };
const FPS = 60;
const cache = new Map<Aspect, DemoEntry[]>();

/** The credit line a CC BY cue needs (TREATMENT §3.11 L30; OVERRIDES §51): it goes with the film (FILM_CREDITS). */
export const ccByCredit = (title: string) => `"${title}" by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au`;

/** How each piece after the first starts (setpieces/joins.ts checkJoins holds the reel to it); the coda continues the end card's page. */
export const DEMO_JOINS: readonly JoinKind[] = ["continue", "cut", "cut", "cut", "continue", "continue"];

/** Every piece in every aspect, each piece on one timeline across the aspects (setpieces/align.ts). */
function buildAll(): Map<Aspect, DemoEntry[]> {
  const out = new Map<Aspect, DemoEntry[]>(ASPECTS.map((a) => [a, []]));
  const add = (plans: Record<Aspect, ScenePlan>, grid: MusicGrid, stretch: DemoStretch) => {
    for (const a of ASPECTS) out.get(a)!.push({ plan: plans[a], grid, stretch });
  };
  const N = 6000;
  // the Drop: 3 s of pre-roll (the card read, the lead-in line), then the entrance on frame 180
  const dropGrid = demoGrid(STRETCH.drop, 180, N, FPS);
  const drops = alignAspects<DropTiming>((a, align) => planDrop({ ...SIZE[a], fps: FPS, hit: 180, grid: dropGrid, align }));
  add(drops, dropGrid, STRETCH.drop);
  // Ring 4 and Cascade 4, continuing the Drop's world: the block starts on a phrase downbeat of the ring groove
  const ringGrid = demoGrid(STRETCH.ring, 0, N, FPS);
  const rings = alignAspects<RingTiming>((a, align) => {
    const ex = drops[a].exit!;
    return planRingBlock({ ...SIZE[a], fps: FPS, content: ring4(a), grid: ringGrid, align, entry: { pose: ex.pose, vel: ex.vel, ref: ex.ref, grade: ex.grade } });
  });
  for (const a of ASPECTS) shareGround(drops[a], rings[a]);
  add(rings, ringGrid, STRETCH.ring);
  // the Dusk passage: from the quiet section's first downbeat, cut into with the cascade's momentum
  const duskGrid = demoGrid(STRETCH.dusk, 0, N, FPS);
  const dusks = alignAspects((a) => planDusk({ ...SIZE[a], fps: FPS, grid: duskGrid, cutIn: { vScreen: cutVelocity(rings[a]), grade: rings[a].exit?.grade } }));
  add(dusks, duskGrid, STRETCH.dusk);
  // the climax: the kept card lands on the peak's first strong downbeat, 5 s in; cut into with the crane's leave
  const climaxGrid = demoGrid(STRETCH.climax, 300, N, FPS);
  const climaxes = alignAspects((a) => planClimax({ ...SIZE[a], fps: FPS, grid: climaxGrid, peak: 300, cutIn: { vScreen: cutVelocity(dusks[a]), grade: dusks[a].exit?.grade } }));
  add(climaxes, climaxGrid, STRETCH.climax);
  // the wall, cut into with the climax's leave (the montage decision may replace it: OVERRIDES §54–§57)
  const wallGrid = demoGrid(STRETCH.wall, 0, N, FPS);
  const walls = alignAspects((a) => planWall({ ...SIZE[a], fps: FPS, grid: wallGrid, cutIn: { vScreen: cutVelocity(climaxes[a]) } }));
  add(walls, wallGrid, STRETCH.wall);
  {
    // the convergence continues the wall's camera, parallax ref and orbit clock; the title lands on frame 300; the
    // track's last strong note 4 s later (an edit at a bar line brings Born Of The Sky's 2:55.42 there), then its 6.6 s
    // decay and 0.75 s of room tone
    const grid = demoGrid(STRETCH.finale, 300, N, FPS);
    const finales = alignAspects<FinaleTiming>((a, align) => {
      const ex = walls[a].exit!;
      return planFinale({ ...SIZE[a], fps: FPS, grid, hit: 300, lastNote: 300 + sec(4.0, FPS), decayS: 6.6, roomToneS: 0.75, entry: { pose: ex.pose, vel: ex.vel, ref: ex.ref }, wallElapsed: walls[a].duration, musicCredit: ccByCredit("Born Of The Sky"), align });
    });
    for (const a of ASPECTS) shareGround(walls[a], finales[a]);
    add(finales, grid, STRETCH.finale);
    // the post-credit scene (D157, OVERRIDES §62): from the end card's true ending, the main film only; the X version is
    // the master cut at its first frame (setpieces/coda.ts codaPlacement)
    const codas = alignAspects<CodaTiming>((a, align) => planCoda({ ...SIZE[a], fps: FPS, endCard: finales[a], align }));
    add(codas, CODA_GRID, CODA_STRETCH);
  }
  return out;
}

export function demoPlans(aspect: Aspect): DemoEntry[] {
  if (cache.size === 0) for (const [a, list] of buildAll()) cache.set(a, list);
  return cache.get(aspect)!;
}
