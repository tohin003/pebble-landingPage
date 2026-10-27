// The composed world of the Drop and the rings (TREATMENT §3.9 step 8, S07; §5.3 "one world"): the whole Mac as one
// plane of places, laid out on its own for each aspect (§3.12: 9:16 stacks its windows vertically; 1:1 is compact, so
// its push-ins are tighter). World units are CSS px of a capture at 1×. Pure data.
//
// Dense, not sparse (CR-16: at the S07 wide the windows covered 10–15 % of the frame's width and floated in large
// flat fields): the windows overlap as a desktop's do, the main ones 25–40 % of the frame's width at the wide (16:9),
// and the windows that are only context sit at their own parallax depths, so the pull-back reads as depth. The
// places that rings later read (the browser, the companion, the project) stay at depth 1.
//
// The places (PLACEHOLDERS until the 2.0.0 captures; setpieces/standins.ts says what stands for what):
//   browser     RS-9's browser window (a slot: Pebble's own tab, at 1×)
//   companion   the companion (RS-9's companion view: a slot holding its card, then a real 1.0.x frame at work)
//   calculator  Ring 2's place (a slot), an Apple window: flat, never tilted
//   finder      Ring 3's place, Finder at Pebble Workbench (a slot), an Apple window
//   project     Ring 4's place, the conversation "studio-bookings": HS-F's window and, inside it, the views Ring 4
//               reads (the history's held card, the run)
//   toolbox     Pebble's Toolbox in Settings (a 1.5.0 Settings window)
import type { Aspect } from "../tokens";
import type { Point, Rect } from "../motion/geometry";
import { COMPANION_PANEL, HSF_VIEWS } from "./take";

export interface WorldLayout {
  browser: Rect;
  companion: Rect;
  /** the companion's card: the part of the companion's view the Drop reads (the 2.0.0 card sits inside the panel) */
  card: Rect;
  calculator: Rect;
  finder: Rect;
  /** Ring 4's place: HS-F's window and, inside it, the history's held card and the run (the take's views) */
  project: { window: Rect; held: Rect; run: Rect };
  toolbox: Rect;
  /** parallax depths of the context windows (1 = the UI plane; the places rings read stay at 1) */
  depth: { calculator: number; finder: number; toolbox: number };
  /** the stone: the companion's avatar centre */
  stone: Point;
}

const companionAt = (x: number, y: number) => ({
  companion: { x, y, w: COMPANION_PANEL.w, h: COMPANION_PANEL.h },
  // the card the 2.0.0 companion holds: inside the panel, under its header (never wider than the panel: CR-18)
  card: { x: x + 10, y: y + 66, w: 364, h: 236 },
  stone: { x: x + COMPANION_PANEL.stone.x, y: y + COMPANION_PANEL.stone.y },
});

/**
 * HS-F's window at (x, y), and the views Ring 4 reads inside it: the conversation's column, past its sidebar (the held
 * card, the whole 1.0.x card while it asks, then the run below it).
 */
const projectAt = (x: number, y: number) => {
  const held = { x: x + 330, y: y + 150, w: HSF_VIEWS.held.w, h: HSF_VIEWS.held.h };
  return { project: { window: { x, y, w: 1160, h: 800 }, held, run: { x: held.x, y: held.y + held.h + 28, w: HSF_VIEWS.run.w, h: HSF_VIEWS.run.h } } };
};

export const WORLD: Record<Aspect, WorldLayout> = {
  "16:9": {
    browser: { x: 0, y: 0, w: 1440, h: 900 },
    ...companionAt(1230, 452),
    // wholly off the frame's left edge at the hold, so its slot's label is never cut by it (NF-08)
    calculator: { x: -330, y: 470, w: 232, h: 372 },
    finder: { x: 1180, y: -380, w: 820, h: 500 },
    ...projectAt(-1010, -480),
    toolbox: { x: 700, y: 990, w: 1160, h: 800 },
    depth: { calculator: 1.06, finder: 0.93, toolbox: 0.95 },
  },
  "1:1": {
    browser: { x: 0, y: 0, w: 1440, h: 900 },
    ...companionAt(1180, 480),
    calculator: { x: -240, y: 700, w: 232, h: 372 },
    finder: { x: 860, y: -560, w: 820, h: 500 },
    ...projectAt(-880, -600),
    toolbox: { x: 330, y: 1060, w: 1160, h: 800 },
    depth: { calculator: 1.06, finder: 0.93, toolbox: 0.95 },
  },
  "9:16": {
    browser: { x: 40, y: -120, w: 1440, h: 900 },
    ...companionAt(1060, 500),
    calculator: { x: -60, y: 700, w: 232, h: 372 },
    // (right of the held card: at x 560 it covered the card's right half, drawn in front of the place)
    finder: { x: 990, y: -1100, w: 820, h: 500 },
    ...projectAt(-80, -960),
    // below the type's band at the Drop's hold (fix round 2, NF-05: L05 and L06 sat over its Settings still, the band
    // spanning world y 1085–1537 at its depth), so the lines sit on the ground
    toolbox: { x: 200, y: 1580, w: 1160, h: 800 },
    depth: { calculator: 1.06, finder: 0.93, toolbox: 0.95 },
  },
};

/** The stone's radius in world units (the film pebble drawn at 148 px: the companion's avatar). */
export const STONE_R = 44;
export const STONE_SIZE = 148;

/** Every place of the composed world, for the wide framing. */
export const worldRects = (w: WorldLayout): Rect[] => [w.browser, w.companion, w.calculator, w.finder, w.project.window, w.toolbox];
