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
import { steadyGrid, type MusicGrid } from "../music";
import type { ScenePlan } from "../scene";
import { planDrop, type DropTiming } from "../drop";
import { planRingBlock, type RingTiming } from "../ringBlock";
import { ring4 } from "../rings";
import { planDusk } from "../dusk";
import { planClimax } from "../climax";
import { withThen, type FinaleTiming } from "../finale";
import { RETURN_MUSIC, RETURN_STRETCH, planReturn, returnGrid, type ReturnOptions } from "../returnPlan";
import { localOfR } from "../returnField";
import { CODA_GRID, CODA_STRETCH, planCoda, type CodaTiming } from "../coda";
import { ASPECTS, alignAspects } from "../align";
import { cutVelocity, shareGround, type JoinKind } from "../joins";
import { STRETCH, demoGrid, type DemoStretch } from "./grids";
import { RS9_CREDIT } from "../rs9Beat";

/**
 * The Dusk's and the climax's lengths and music on the score (BEAT_SHEET.json revision 3, CUE_SHEET M3–M5), so the
 * film places them whole (video/src/film2/opening/film.ts): the quiet passage 4982–5874, the climax 5874–6534 with the
 * kept card on 6114.
 */
export const SCORE_LENGTHS = { dusk: 5874 - 4982, climax: 6534 - 5874, peak: 6114 - 5874 } as const;
export const SCORE_GRIDS = {
  // B4: bar 62 on 4982, bar 54 on 4053 (8 bars in 929 frames: 116.125 a bar, 124.0 BPM); the Dusk pad (M4, from
  // 5304) carries on without a beat of its own, so the passage keeps B4's
  dusk: steadyGrid({ bpm: (60 * 60 * 4) / 116.125, fps: 60, firstDownbeat: 0, from: 0, to: 6000 }),
  // B2 at 120 BPM: bar 42 on 5874, the lift (bar 44) on 6114 a phrase line, a hit
  climax: steadyGrid({ bpm: 120, fps: 60, firstDownbeat: 240, from: 0, to: 6000, hits: [240] }),
} as const;

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
  // the Dusk passage on the score (BEAT_SHEET revision 3): ⌘K on B4 bar 62 (film 4982), B4's bars 116.125 frames (B4's
  // stop on 5214, two bars on), the quiet passage 892 frames to S23 on 5874; cut into with the cascade's momentum
  const duskGrid = SCORE_GRIDS.dusk;
  const dusks = alignAspects((a) => planDusk({ ...SIZE[a], fps: FPS, grid: duskGrid, length: SCORE_LENGTHS.dusk, cutIn: { vScreen: cutVelocity(rings[a]), grade: rings[a].exit?.grade } }));
  add(dusks, duskGrid, STRETCH.dusk);
  // the climax: the kept card lands on the peak's first strong downbeat, 5 s in; cut into with the crane's leave; it
  // ends on its hold's glide, into the Return
  // (on the score: B2 at 120 BPM from S23 on 5874, the kept card on B2's lift, bar 44, film 6114 = local 240, the
  // piece 660 frames to the Return's pull-back on 6534, half a bar before R0 on bar 48)
  const climaxGrid = SCORE_GRIDS.climax;
  const climaxes = alignAspects((a) => planClimax({ ...SIZE[a], fps: FPS, grid: climaxGrid, peak: SCORE_LENGTHS.peak, length: SCORE_LENGTHS.climax, cutIn: { vScreen: cutVelocity(dusks[a]), grade: dusks[a].exit?.grade }, into: "return" }));
  add(climaxes, climaxGrid, STRETCH.climax);
  {
    // the Return, the title and the end card (OVERRIDES §61: in place of the wall and the convergence): S24's last
    // frame is its first cell; the title lands on A4's bar 82 (R720); the track's last strong note 4 s later (an edit
    // at a bar line brings Born Of The Sky's 2:55.42 there), then its 6.6 s decay and 0.75 s of room tone
    // This reel is the main cut: its end card is planned with finale.ts's `then: "coda"` (withThen: no frame of it
    // changes), and the post-credit scene plays from its true ending (D157, OVERRIDES §62, §65). Every other cut ends on
    // the end card, page 2 held to its last frame: the X version is this reel to the coda's first frame (coda.ts xCut,
    // codaPlacement), and codaCut holds every cut to it
    const aligned = alignAspects<FinaleTiming>((a, align) => planReturn(returnOptions(a, climaxes[a], align)));
    const returns = Object.fromEntries(ASPECTS.map((a) => [a, withThen(aligned[a], "coda")])) as Record<Aspect, ScenePlan>;
    add(returns, returnGrid(FPS), RETURN_STRETCH);
    const codas = alignAspects<CodaTiming>((a, align) => planCoda({ ...SIZE[a], fps: FPS, endCard: returns[a], align }));
    add(codas, CODA_GRID, CODA_STRETCH);
  }
  return out;
}

/** The demo's Return for an aspect, after its climax (the demo's end-card music; `o` for the G1 variants). */
const returnOptions = (a: Aspect, climax: ScenePlan, align?: Partial<FinaleTiming>, o: Partial<ReturnOptions> = {}): ReturnOptions => {
  const hit = Math.round(localOfR(RETURN_MUSIC.titleR, FPS));
  // (RS-9's beat is in the film at the person's decision: its credit line rides in the small print, DECISION-RS9)
  return { ...SIZE[a], fps: FPS, grid: returnGrid(FPS), climax, lastNote: hit + sec(4.0, FPS), decayS: 6.6, roomToneS: 0.75, musicCredit: ccByCredit("Born Of The Sky"), trademarks: [RS9_CREDIT], align, ...o };
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

/**
 * The demo's Dusk passage on its placeholders (HS-B3's and RS-13's slots), as it was before the real take RS13-03 (31
 * Oct): the same grid and cut-in as the reel's Dusk, for the canaries that hold the slots' rules (NF-08, slotLabels).
 */
export function demoDuskPlaceholders(aspect: Aspect): ScenePlan {
  const list = demoPlans(aspect);
  const ring = list.find((e) => e.plan.id === "ring4")!.plan;
  const dusk = list.find((e) => e.plan.id === "dusk")!;
  return planDusk({ ...SIZE[aspect], fps: FPS, grid: dusk.grid, cutIn: { vScreen: cutVelocity(ring), grade: ring.exit?.grade }, placeholders: true });
}
