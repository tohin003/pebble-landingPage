// The ring blocks' content (setpieces/ringBlock.ts is the template). Ring 4, "your project, with AgentGuard" (TREATMENT
// S18–S19), is filled in; the edit lane adds Rings 1–3 the same way once their 2.0.0 captures exist.
//
// PLACEHOLDERS (setpieces/standins.ts, setpieces/take.ts): every plane of Ring 4's place is a view of HS-F's
// placeholder take, on its one clock (CR-11): the conversation's window (a slot), the history's held card (its
// sentence, cropped above its buttons), the run (the test card's sentence, then the receipt cropped below its timing
// line). Cascade 4's cards are slots: no published capture shows the agents panel, a goal, Skills & connectors or a
// connector's call.
import type { Aspect } from "../tokens";
import { COMPANION_PANEL, HSF_VIEWS, TAKE_HSF } from "./take";
import { SLOT, STILL } from "./standins";
import { WORLD } from "./world";
import type { RingContent } from "./ringBlock";
import type { PlaneSpec } from "./scene";

/**
 * The composed world's other places, lit, as context around a ring (the same world, at the same depths, as the Drop).
 * The companion is the real 1.0.x frame of it at work the Drop ends on, so a continued world never changes under the
 * camera.
 */
export const worldContext = (A: Aspect, omit: readonly string[] = []): PlaneSpec[] => {
  const W = WORLD[A];
  const all: PlaneSpec[] = [
    { id: "toolbox", kind: "pebble", rect: W.toolbox, depth: W.depth.toolbox, content: { kind: "standIn", standIn: STILL.settings }, shadow: true },
    { id: "finder", kind: "apple", rect: W.finder, depth: W.depth.finder, content: { kind: "standIn", standIn: { ...SLOT.finder, w: W.finder.w, h: W.finder.h } }, shadow: true },
    { id: "calculator", kind: "apple", rect: W.calculator, depth: W.depth.calculator, content: { kind: "standIn", standIn: { ...SLOT.calculator, w: W.calculator.w, h: W.calculator.h } }, shadow: true },
    { id: "browser", kind: "thirdParty", rect: W.browser, content: { kind: "standIn", standIn: { ...SLOT.browser, w: W.browser.w, h: W.browser.h } }, shadow: true, radius: 10 },
    { id: "companion", kind: "pebble", rect: W.companion, content: { kind: "standIn", standIn: STILL.companionWorking }, shadow: true, radius: 14 },
  ];
  return all.filter((p) => !omit.includes(p.id));
};

/** Ring 4: "studio-bookings", tests in an isolated copy, Verified; then Cascade 4, "Bigger tasks". */
export const ring4 = (A: Aspect): RingContent => {
  const W = WORLD[A];
  const run = W.project.run;
  const held = W.project.held;
  return {
    id: "ring4",
    name: `Ring 4 ${A}`,
    stone: W.stone,
    // a fresh block opens on the companion: the ring is seen to leave the stone
    startRect: { x: W.companion.x - 360, y: W.companion.y - 260, w: COMPANION_PANEL.w + 720, h: COMPANION_PANEL.h + 520 },
    context: worldContext(A),
    take: TAKE_HSF,
    window: { view: "window", rect: W.project.window },
    // MONTAGE_DESIGN §5.4's named cut (fix round 3, the trim to 35 readable features, OVERRIDES §61): the held card is
    // shown, not read: F11 stays in context in the conversation's history (the take enters after the person's click
    // on Run the tests, TREATMENT §3.6 chain 9); the ring frames it and the camera lands on the test card, read while
    // the take runs; the receipt reads its first line only. (Fix round 2 framed the card asking with its buttons for
    // 1.1 s and read its answer, NF-01: 6 more words and a second dolly, which the phrase has no room for.)
    // OVERRIDES §67 asked for the take entered at Done, to bring the ring part to 4.5 bars. Measured (fix round 3, part
    // 2): `after: "done"` plans the same 639 frames in every aspect, because the reads set the length, not the take
    // (the act legible from frame 149, 153 and 148, then its read, the glide, the receipt and the leave); and its
    // receipt then lands on R87, during the travel, under the lines' band in 16:9 and 1:1 (typeOverPlanes). So the take
    // stays entered after the click until the lead rules (the review ledger's TRIM-R4)
    ask: {
      view: "held",
      rect: held,
      words: STILL.heldNote.words!,
      textPx: STILL.heldNote.textPx!,
      readRect: { x: held.x + HSF_VIEWS.held.answered.x, y: held.y + HSF_VIEWS.held.answered.y, w: HSF_VIEWS.held.answered.w, h: HSF_VIEWS.held.answered.h },
      shownOnly: { after: "click" },
    },
    // the test card's sentence: "Runs the project's tests in a temporary copy. Your project files don't change." (13)
    act: { view: "run", rect: run, startEvent: "running", words: STILL.testsLine.words!, textPx: STILL.testsLine.textPx!, readRect: { x: run.x + HSF_VIEWS.run.tests.x, y: run.y + HSF_VIEWS.run.tests.y, w: HSF_VIEWS.run.tests.w, h: HSF_VIEWS.run.tests.h } },
    // "Verified · pytest … passed on current files" (7 words)
    receipt: { event: "verified", rect: HSF_VIEWS.run.receipt, words: STILL.verifiedTop.words!, textPx: STILL.verifiedTop.textPx! },
    lines: { chapter: "AgentGuard, built in.", limit: "Reliability, not security." },
    // (the lean cascade, MONTAGE_DESIGN §5.4: its four features stay. Each swap lands 2–3 frames before a beat (124 BPM:
    // a beat is 29 frames), so a hold is two beats less the 8-frame swap (0.83 s) or three (1.32 s): the first item
    // holds three beats (TREATMENT §3.8 asks about 1.1 s; checkCascade's floor is 0.95), the next two two beats each
    // (the table's 0.9 and 0.85 s), and the last its floor, 0.65 s, so the four end on the cascade's second half bar)
    cascade: {
      fixed: "Bigger tasks",
      items: [
        { text: "Agents read and propose", holdS: 1.1, card: SLOT.agents },
        { text: "A goal, with criteria", holdS: 0.8, card: SLOT.goal },
        { text: "Skills you review", holdS: 0.8, card: SLOT.skills },
        { text: "Connectors that ask", holdS: 0.65, card: SLOT.connector },
      ],
    },
  };
};
