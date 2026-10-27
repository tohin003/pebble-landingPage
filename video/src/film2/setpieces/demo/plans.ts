// The demo's plans, one list per aspect, in the film's order (pure: the tests check exactly what the reel draws).
// Each piece is fitted to a real measured stretch of an audition track (demo/grids.ts), and every join is designed
// (CR-06, setpieces/joins.ts): the Drop's world continues into Ring 4 (the ring leaves the stone in the same world), the
// cascade and the crane each leave on an E-leave into a momentum cut that the next piece enters at the same speed, and
// the climax ends on its hold's glide into the Return, whose first cell is S24's own last frame (MONTAGE_DESIGN §2.12,
// joinPose). Each piece takes the light the previous one ends on.
// OVERRIDES §61 (27 Oct): the Return replaces the wall and the convergence at the film's end; it is fitted to its own
// cue (B2 run on, then A4's bars 80–82: returnPlan.ts returnGrid), and the title and the end card are planFinale's.
import type { Aspect } from "../../tokens";
import { sec } from "../../tokens";
import type { MusicGrid } from "../music";
import type { ScenePlan } from "../scene";
import { planDrop, type DropTiming } from "../drop";
import { planRingBlock, type RingTiming } from "../ringBlock";
import { ring4 } from "../rings";
import { planDusk } from "../dusk";
import { planClimax } from "../climax";
import type { FinaleTiming } from "../finale";
import { RETURN_MUSIC, RETURN_STRETCH, planReturn, returnGrid, type ReturnOptions } from "../returnPlan";
import { localOfR } from "../returnField";
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

/**
 * How each piece after the first starts (setpieces/joins.ts checkJoins holds the reel to it): the Return opens on S24's
 * own last frame ("frame": joinPose holds it); the coda continues the end card's page.
 */
export const DEMO_JOINS: readonly JoinKind[] = ["continue", "cut", "cut", "frame", "continue"];

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
  // the climax: the kept card lands on the peak's first strong downbeat, 5 s in; cut into with the crane's leave; it
  // ends on its hold's glide, into the Return
  const climaxGrid = demoGrid(STRETCH.climax, 300, N, FPS);
  const climaxes = alignAspects((a) => planClimax({ ...SIZE[a], fps: FPS, grid: climaxGrid, peak: 300, cutIn: { vScreen: cutVelocity(dusks[a]), grade: dusks[a].exit?.grade }, into: "return" }));
  add(climaxes, climaxGrid, STRETCH.climax);
  {
    // the Return, the title and the end card (OVERRIDES §61: in place of the wall and the convergence): S24's last
    // frame is its first cell; the title lands on A4's bar 82 (R720); the track's last strong note 4 s later (an edit
    // at a bar line brings Born Of The Sky's 2:55.42 there), then its 6.6 s decay and 0.75 s of room tone
    const returns = alignAspects<FinaleTiming>((a, align) => planReturn(returnOptions(a, climaxes[a], align)));
    add(returns, returnGrid(FPS), RETURN_STRETCH);
    // the post-credit scene (D157, OVERRIDES §62): from the end card's true ending, the main film only; the X version is
    // the master cut at its first frame (setpieces/coda.ts codaPlacement)
    const codas = alignAspects<CodaTiming>((a, align) => planCoda({ ...SIZE[a], fps: FPS, endCard: returns[a], align }));
    add(codas, CODA_GRID, CODA_STRETCH);
  }
  return out;
}

/** The demo's Return for an aspect, after its climax (the demo's end-card music; `o` for the G1 variants). */
const returnOptions = (a: Aspect, climax: ScenePlan, align?: Partial<FinaleTiming>, o: Partial<ReturnOptions> = {}): ReturnOptions => {
  const hit = Math.round(localOfR(RETURN_MUSIC.titleR, FPS));
  return { ...SIZE[a], fps: FPS, grid: returnGrid(FPS), climax, lastNote: hit + sec(4.0, FPS), decayS: 6.6, roomToneS: 0.75, musicCredit: ccByCredit("Born Of The Sky"), align, ...o };
};

/**
 * A G1 variant of the demo's Return (MONTAGE_DESIGN §9): the same climax and the same timeline as the demo's Return,
 * with other options (R4's toned matte: `{ merge: "toned" }`).
 */
export function demoReturnVariant(aspect: Aspect, o: Partial<ReturnOptions>): ScenePlan {
  const list = demoPlans(aspect);
  const climax = list.find((e) => e.plan.id === "climax")!.plan;
  const ret = list.find((e) => e.plan.id === "return")!.plan;
  return planReturn(returnOptions(aspect, climax, ret.extra?.timing as Partial<FinaleTiming> | undefined, o));
}

export function demoPlans(aspect: Aspect): DemoEntry[] {
  if (cache.size === 0) for (const [a, list] of buildAll()) cache.set(a, list);
  return cache.get(aspect)!;
}
