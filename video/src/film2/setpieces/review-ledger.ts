// The open findings: what the checks added after the craft review (CR-15) catch on the CURRENT plans, until the fix
// lane fixes them. Two rules keep it honest:
//   - the tests (tests/setpieces.test.ts, tests/qa.test.ts) hold every plan to every check EXCEPT the (piece, check)
//     pairs listed here, so nothing new slips in behind them;
//   - each entry must still fire, and where it says what the review saw, it must cover those frames: an entry that stops
//     firing fails the tests ("fixed? take it out"), so the list only shrinks, and every fix is a visible edit here.
// setpieces/tools/check-setpieces.ts and qa/luma-scan.ts ignore the ledger: they FAIL while any finding is open. A fix
// counts only when they pass AND the frames look right (OVERRIDES §55).
//
// `saw` is where the review saw the defect (CRAFT_REVIEW.md, 27 Oct), in the piece's local frames of one aspect of the
// demo (the reel frame is the piece's start plus it: drop 0, ring4 660, dusk 2054, climax 3134, wall 4034, finale 4394).
// Entries without `saw` are the same defect caught where the review did not look; their notes say what was looked at.
import type { Aspect } from "../tokens";

export interface OpenFinding {
  /** the plan's id; "F2-Foundation-Demo" for the foundation demo's timeline */
  piece: string;
  /** the check's name (qa/checks.ts, setpieces/qa.ts) */
  check: string;
  cr: string;
  /** what the review saw: the finding's frames cover [from, to) in this aspect (a point finding lies within 3 frames) */
  saw?: readonly { aspect: Aspect; from: number; to: number }[];
  /** the finding waits for the montage decision (§54, §55): the wall and the convergence may be replaced */
  waitsForMontage?: boolean;
  note: string;
}

export const OPEN_FINDINGS: readonly OpenFinding[] = [
  // ---- the foundation demo (qa/checks.ts on demo/timeline.ts): the motion foundation's own demo reel, not a set piece
  { piece: "F2-Foundation-Demo", check: "cameraFloor", cr: "CR-04", note: "S2's reading hold (371–459: its momentum cut lands on E-arrive at rest) and the title before its wait (1367–1536) glide under 0.25 px a frame; the fix is the set pieces' (a glide in, the title set in its page's world, setpieces/finale.ts), for the foundation lane's demo" },
  // ---- fix round 2's checks on the wall and the convergence. OVERRIDES §61 (27 Oct ~12:35): the person put the montage
  // (the Return) at the end only, and it REPLACES the wall and the convergence; CR-08, the wall's parts of CR-02 and
  // CR-16 and CR-06's S24 → S25 pull-back close by replacement, and the fix lane no longer touches them. The Return lane
  // takes these entries out as it replaces the two pieces (its own checks: joinPose, returnMerge, cameraFloor …)
  {
    piece: "wall",
    check: "contentFloor",
    cr: "CR-04",
    waitsForMontage: true,
    note: "the wall pulls back about the stone and drifts out about it, the cells orbiting at 0.8–1.6° a second: its content (the cells and the stone) moves 0.14–0.22 px a frame at its median, while the corners move 0.4 (cameraFloor passes). CR-16's wall part (a readable 4–6° a second orbit) would lift it; if the wall stays, give its drift a lateral pan too, as every other hold has",
  },
  {
    piece: "wall",
    check: "sway",
    cr: "CR-06",
    waitsForMontage: true,
    note: "9:16: the climax leaves downward into the cut and the wall's pull-back about its centre turns the content back up through a stop; the join into the wall is CR-06's S24 → S25 pull-back, which waits for the montage",
  },
  {
    piece: "finale",
    check: "contentFloor",
    cr: "CR-08",
    waitsForMontage: true,
    note: "the convergence's first 1.8 s keep the wall's drift about the stone (0.14–0.21 px a frame at the content's median) until the cells turn inward; its look waits for the montage (CR-08). The title and the end card are held to the corners' floor (OVERRIDES §58) and pass",
  },
  {
    piece: "finale",
    check: "sway",
    cr: "CR-08",
    waitsForMontage: true,
    note: "9:16: the wall's slow drift turns into the convergence's push toward the stone through a stop; the convergence waits for the montage (CR-08)",
  },
];

/**
 * The findings the fix lane closed (fix rounds 1 and 2, 27 Oct): each check now passes the plan in all three aspects,
 * and the reels were rendered and looked at where the review (round 1) or the verifier (round 2) saw the defect
 * (film2/README.md, "Fix round 1", "Fix round 2"). The tests hold them closed: every error on the current plans must
 * be an open finding, and these are not.
 */
export const CLOSED_FINDINGS: readonly { piece: string; check: string; cr: string; how: string }[] = [
  { piece: "drop", check: "cameraFloor", cr: "CR-04", how: "the pre-roll pushes in from its first frame, the hand-off drifts out through L05 and L06 at 0.4 px a frame" },
  { piece: "drop", check: "hitSync", cr: "CR-07", how: "the frame opens on the hit's next frame in every aspect; the leak plays once the bands have cleared" },
  { piece: "drop", check: "legibleWords", cr: "CR-09", how: "the card is read at 28 px or more in the aperture, 12 words declared" },
  { piece: "drop", check: "askActClock", cr: "CR-11", how: "the companion is RS-9's own view (a slot holding its card, then its frame at work from the receipt)" },
  { piece: "drop", check: "groundCoverage", cr: "CR-02", how: "the riverbed is sized from the shot's widest pose (setpieces/ground.ts), shared with Ring 4 across the join" },
  { piece: "ring4", check: "planesInFrame", cr: "CR-05", how: "the ask, the act and the receipt are views of HS-F cropped at line boundaries and framed whole while legible" },
  { piece: "ring4", check: "legibleWords", cr: "CR-05", how: "every legible word is a declared read (6 + 13 + 10)" },
  { piece: "ring4", check: "askActClock", cr: "CR-11", how: "every plane of the place is a view of HS-F, on its one clock" },
  { piece: "ring4", check: "typeExits", cr: "CR-03", how: "the cascade's fixed line and last item leave with drawn exits on the stage's E-leave, before the cut" },
  { piece: "ring4", check: "cameraFloor", cr: "CR-04", how: "the stage is entered on a glide at the cut's speed into its push, never landing at rest" },
  { piece: "ring4", check: "groundCoverage", cr: "CR-02", how: "the ground sized from the widest pose, shared with the Drop" },
  { piece: "dusk", check: "cameraFloor", cr: "CR-04", how: "the passage is entered with the cascade's momentum, gliding into the palette's push" },
  { piece: "dusk", check: "groundCoverage", cr: "CR-02", how: "the ground sized from each shot's widest pose" },
  { piece: "climax", check: "cameraFloor", cr: "CR-04", how: "the kept card's hold keeps a glide to the E-leave (push or pan, 0.42 px a frame)" },
  { piece: "climax", check: "typeExits", cr: "CR-03", how: "L24 has a drawn blur exit ending 2 frames before the cut" },
  { piece: "climax", check: "legibleWords", cr: "CR-05", how: "the Workshop's cards are labelled slots at the 2.0.0 cards' sizes (no 1.0.x card stands in their state)" },
  { piece: "climax", check: "planesInFrame", cr: "CR-05", how: "as legibleWords: slots, framed whole" },
  { piece: "wall", check: "groundCoverage", cr: "CR-02", how: "the general rule covers the wall too (its look still waits for the montage decision)" },
  { piece: "wall", check: "cameraFloor", cr: "CR-04", how: "the drift after the pull-back is 0.4 px a frame in every aspect" },
  { piece: "finale", check: "stoneCount", cr: "CR-01", how: "the world's stone lands on the title stone's pose, with its velocity, 2 frames before the iris" },
  { piece: "finale", check: "groundCoverage", cr: "CR-02", how: "the wall's riverbed is shared with the convergence across the join" },
  { piece: "finale", check: "smallPrintHolds", cr: "CR-10", how: "page 2 is the sample line and the method line (18 words), held for their reading time; the credits go with the film (FILM_CREDITS)" },
  { piece: "finale", check: "cameraFloor", cr: "CR-04", how: "the title and both end-card pages glide at 0.3 px a frame (OVERRIDES §58); only the last breath is still" },
  { piece: "F2-Foundation-Demo", check: "irisEase", cr: "CR-21", how: "ringIris() defaults to E-move (IRIS_DEFAULT_EASE)" },
  // fix round 2 (27 Oct): the verifier's findings after round 1, held by the checks added for them
  { piece: "drop", check: "contentFloor", cr: "CR-04", how: "the hold after the hit pans at 0.42 px a frame the way the reveal glides, besides its pull-back about the companion; the 1:1 pre-roll drifts sideways where the aperture leaves the card no room to rise" },
  { piece: "ring4", check: "contentFloor", cr: "CR-04", how: "the cascade's stage pans at the reading pace (0.4 px a frame; it was 0.24)" },
  { piece: "ring4", check: "sway", cr: "NF-02", how: "the 9:16 place arrives in the frame's lower part, so after the travel up the camera only moves down" },
  { piece: "ring4", check: "slotLabels", cr: "NF-08", how: "labels are whole or not drawn (setpieces/labels.ts); the browser's label sits right of its middle" },
  { piece: "ring4", check: "typeOverPlanes", cr: "NF-05", how: "the chapter pair lands once no capture with text is under its band for its whole hold, the pair kept to the frame's left in 1:1 and 9:16" },
  { piece: "drop", check: "typeOverPlanes", cr: "NF-05", how: "the 9:16 Toolbox sits below the pair's band; the reveal waits for the pair's exit" },
  { piece: "dusk", check: "contentFloor", cr: "CR-04", how: "the palette pans the cut's way, the Veil orbits at 0.36 px a frame through its framing" },
  { piece: "dusk", check: "typeOverType", cr: "NF-03", how: "the Veil's label under the render clears the honest line's band (1:1's render 42 % of the frame's height)" },
  { piece: "climax", check: "contentFloor", cr: "CR-04", how: "the ask pans the climax's way at 0.45 px a frame with a slight push" },
  { piece: "climax", check: "sway", cr: "NF-02", how: "one direction from Glaze's leave through Kiln's landing, push and hold to its leave; the kept card pushed about its trailing edge" },
  { piece: "climax", check: "cutsReadable", cr: "NF-07", how: "the Kiln slot's label sits where the cut lands, under the kept card's place" },
];

/** Is a finding one of the open findings of this piece? */
export const isOpen = (piece: string, check: string): boolean => OPEN_FINDINGS.some((o) => o.piece === piece && o.check === check);
