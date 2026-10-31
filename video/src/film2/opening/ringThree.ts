// Ring 3, your files and the terminal (S15–S16, film 0:54.00–1:07.55, frames 3240–4053):
//   card     RS5F-03 (S14's Finder; RS-H, S15–S16's take, was skipped under the person's Photos rule): the card in the
//            Activity panel, "Pebble asks Finder through its own scripting …", and Do it (2633), above the step timings.
//   finder   RS5F-03 from the frame Finder's "Open day" window covers the workspace (2700; before it the chat's usage
//            line shows): Documents › Open day, its files.
//   files    S15–S16 (no take): a typographic beat, "Your files. The terminal.", the sandbox and Undo, and the limit;
//            it starts after S16's bar (B4 bar 50, 3588) and leaves before Ring 4 (4053).
// Pure; no React.
import { TAKE_RS5F_03 } from "../setpieces/take";
import { RS5_CARD } from "./ringTwo";
import { frameOfSource, type ActPlan, type ActShot } from "./kit";

/** RS5F-03's Finder window, "Open day" (left of the Activity panel's step timings). */
export const RS5F_FINDER = { x: 26, y: 52, w: 920, h: 440 } as const;

const SHOTS: readonly ActShot[] = [
  { id: "card", stands: "S15 (S14's Finder)", kind: "take", take: TAKE_RS5F_03, from: 2540, to: 2700, crop: RS5_CARD, note: "the Finder card, Do it" },
  { id: "finder", stands: "S15 (S14's Finder)", kind: "take", take: TAKE_RS5F_03, from: 2700, to: 2960, crop: RS5F_FINDER, note: "Documents › Open day in Finder" },
  { id: "files", stands: "S15–S16", kind: "type", frames: 393, note: "typographic: files, the terminal, the sandbox, Undo (RS-H not kept)" },
];

const draft: ActPlan = { id: "ring3", name: "Ring 3", start: 3240, shots: SHOTS, lines: [], marks: [], mutes: [] };
const at = (id: string, src: number) => frameOfSource(draft, id, src);

export const RING_THREE: ActPlan = {
  ...draft,
  lines: [
    { id: "finder", text: "Folders in Finder, without the screen.", tier: "functional", at: 172, exitAt: 400, claim: "C-F2O-11" },
    { id: "finder-limit", text: "It never deletes anything this way.", tier: "functional", at: 220, exitAt: 404, claim: "C-F2O-12", slot: 1, sizeT: 0.3 },
    { id: "L14", text: "Your files. The terminal.", tier: "expressive", at: 432, exitAt: 760, claim: "C-F2O-13" },
    { id: "L15", text: "Commands in a sandbox. File changes with Undo.", tier: "functional", at: 470, exitAt: 765, claim: "C-F2O-14", slot: 1 },
    { id: "L15-limit", text: "Deleting or moving outside the workbench asks every time.", tier: "functional", at: 530, exitAt: 770, claim: "C-F2O-15", slot: 2, sizeT: 0.3 },
  ],
  marks: [
    { frame: 0, what: "J2: Ring 3 arrives on B4's riser bar", score: 0 },
    { frame: at("card", TAKE_RS5F_03.events.doIt!), what: "Do it" },
    { frame: 116, what: "B4's phrase B: the lift", score: 116 },
    { frame: 348, what: "B4 bar 50 (S16)", score: 348 },
  ],
};
