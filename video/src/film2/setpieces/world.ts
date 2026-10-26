// The composed world of the Drop and the rings (TREATMENT §3.9 step 8, S07; §5.3 "one world"): the whole Mac as one
// plane of places, laid out on its own for each aspect (§3.12: 9:16 stacks its windows vertically; 1:1 is compact, so
// its push-ins are tighter). World units are CSS px of a capture at 1×. Pure data.
//
// The places (PLACEHOLDERS until the 2.0.0 captures; setpieces/standins.ts says what stands for what):
//   browser     RS-9's browser window (a slot: Pebble's own tab, at 1×)
//   companion   the companion's panel (a real 1.0.x frame, avatar hidden: the film pebble is the stone) and its card
//   calculator  Ring 2's place (a slot), an Apple window: flat, never tilted
//   finder      Ring 3's place, Finder at Pebble Workbench (a slot), an Apple window
//   project     Ring 4's place, the conversation "studio-bookings": the held card in its history and the test card
//   toolbox     Pebble's Toolbox in Settings (a 1.5.0 Settings window)
import type { Aspect } from "../tokens";
import type { Point, Rect } from "../motion/geometry";
import { COMPANION_PANEL } from "./take";
import { STILL } from "./standins";

export interface WorldLayout {
  browser: Rect;
  companion: Rect;
  /** the companion's card, inside its panel */
  card: Rect;
  calculator: Rect;
  finder: Rect;
  /** Ring 4's place: the held card in the history, and the take's view below it */
  project: { held: Rect; run: Rect };
  toolbox: Rect;
  /** the stone: the companion's avatar centre */
  stone: Point;
}

const companionAt = (x: number, y: number) => ({
  companion: { x, y, w: COMPANION_PANEL.w, h: COMPANION_PANEL.h },
  // the card sits in the panel's middle (396 × 275: the 1.0.x stand-in at 0.8, never stretched)
  card: { x: x - 6, y: y + 60, w: 396, h: 275 },
  stone: { x: x + COMPANION_PANEL.stone.x, y: y + COMPANION_PANEL.stone.y },
});

const heldW = STILL.held.crop!.w;
const heldH = STILL.held.crop!.h;
const projectAt = (x: number, y: number) => ({ held: { x, y, w: heldW, h: heldH }, run: { x, y: y + heldH + 36, w: 726, h: 640 } });

export const WORLD: Record<Aspect, WorldLayout> = {
  "16:9": {
    browser: { x: 0, y: 0, w: 1440, h: 900 },
    ...companionAt(1180, 520),
    calculator: { x: -560, y: 240, w: 232, h: 372 },
    finder: { x: 1720, y: -640, w: 820, h: 500 },
    project: projectAt(-1300, -900),
    toolbox: { x: 1760, y: 1040, w: 1160, h: 800 },
  },
  "1:1": {
    browser: { x: 0, y: 0, w: 1440, h: 900 },
    ...companionAt(1180, 520),
    calculator: { x: -420, y: 560, w: 232, h: 372 },
    finder: { x: 260, y: -760, w: 820, h: 500 },
    project: projectAt(-1000, -1000),
    toolbox: { x: 300, y: 1100, w: 1160, h: 800 },
  },
  "9:16": {
    browser: { x: 0, y: -520, w: 1440, h: 900 },
    ...companionAt(1050, 100),
    calculator: { x: 200, y: 700, w: 232, h: 372 },
    finder: { x: 500, y: -1180, w: 820, h: 500 },
    project: projectAt(-60, -2100),
    toolbox: { x: 140, y: 1180, w: 1160, h: 800 },
  },
};

/** The stone's radius in world units (the film pebble drawn at 148 px: the companion's avatar). */
export const STONE_R = 44;
export const STONE_SIZE = 148;

/** Every place of the composed world, for the wide framing. */
export const worldRects = (w: WorldLayout): Rect[] => [w.browser, w.companion, w.calculator, w.finder, w.project.held, w.project.run, w.toolbox];
