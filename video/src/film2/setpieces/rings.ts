// The ring blocks' content (setpieces/ringBlock.ts is the template). Ring 4, "your project, with AgentGuard" (TREATMENT
// S18–S19), is filled in; the edit lane adds Rings 1–3 the same way once their 2.0.0 captures exist.
//
// PLACEHOLDERS (setpieces/standins.ts): the ask is a 1.0.x held card ("Blocked · Pebble's change isn't verified yet",
// cropped below its usage line), the act is HS-F's placeholder take (the 1.0.x tests card, then the done receipt cropped
// below its timing line), and Cascade 4's cards are slots: no published capture shows the agents panel, a goal, Skills
// & connectors or a connector's call.
import type { Aspect } from "../tokens";
import { COMPANION_PANEL, TAKE_HSF } from "./take";
import { SLOT, STILL } from "./standins";
import { WORLD } from "./world";
import type { RingContent } from "./ringBlock";
import type { PlaneSpec } from "./scene";

/** The composed world's other places, lit, as context around a ring (the same world as the Drop). */
export const worldContext = (A: Aspect, omit: readonly string[] = []): PlaneSpec[] => {
  const W = WORLD[A];
  const all: PlaneSpec[] = [
    { id: "browser", kind: "thirdParty", rect: W.browser, content: { kind: "standIn", standIn: { ...SLOT.browser, w: W.browser.w, h: W.browser.h } }, shadow: true },
    { id: "calculator", kind: "apple", rect: W.calculator, content: { kind: "standIn", standIn: { ...SLOT.calculator, w: W.calculator.w, h: W.calculator.h } }, shadow: true },
    { id: "finder", kind: "apple", rect: W.finder, content: { kind: "standIn", standIn: { ...SLOT.finder, w: W.finder.w, h: W.finder.h } }, shadow: true },
    { id: "toolbox", kind: "pebble", rect: W.toolbox, content: { kind: "standIn", standIn: STILL.settings } },
    { id: "companion", kind: "pebble", rect: W.companion, content: { kind: "image", src: COMPANION_PANEL.src, w: COMPANION_PANEL.w, h: COMPANION_PANEL.h, note: "1.0.x harness frame, avatar hidden" }, shadow: true, radius: 14 },
  ];
  return all.filter((p) => !omit.includes(p.id));
};

/** Ring 4: "studio-bookings", tests in an isolated copy, Verified; then Cascade 4, "Bigger tasks". */
export const ring4 = (A: Aspect): RingContent => {
  const W = WORLD[A];
  const run = W.project.run;
  return {
    id: "ring4",
    name: `Ring 4 ${A}`,
    stone: W.stone,
    // a fresh block opens on the companion: the ring is seen to leave the stone
    startRect: { x: W.companion.x - 360, y: W.companion.y - 260, w: W.companion.w + 720, h: W.companion.h + 520 },
    context: worldContext(A),
    // "Pebble's change isn't verified yet." (5 words to read; the rest of the card is context) and Run the tests: the
    // part read is the card's first sentence and its first button (it fits 9:16 at reading size; the card does not)
    ask: { rect: W.project.held, standIn: STILL.held, words: 5, textPx: 13, readRect: { x: W.project.held.x + 30, y: W.project.held.y + 36, w: 400, h: 96 } },
    // the test card reading Running: its title and first sentence are read (8 words)
    act: { take: TAKE_HSF, view: "run", rect: run, startEvent: "running", words: 8, textPx: 15, readRect: { x: run.x, y: run.y, w: 430, h: 150 } },
    // "Verified · pytest … passed on current files" and "Done, and verified:" (9 words), read from its top-left
    receipt: { event: "verified", rect: { x: 0, y: 380, w: 684, h: 248 }, words: 9, textPx: 13, readRect: { x: 0, y: 0, w: 430, h: 64 } },
    lines: { chapter: "AgentGuard, built in.", limit: "Reliability, not security." },
    cascade: {
      fixed: "Bigger tasks",
      items: [
        { text: "Agents read and propose", holdS: 1.1, card: SLOT.agents },
        { text: "A goal, with criteria", holdS: 0.9, card: SLOT.goal },
        { text: "Skills you review", holdS: 0.85, card: SLOT.skills },
        { text: "Connectors that ask", holdS: 0.85, card: SLOT.connector },
      ],
    },
  };
};
