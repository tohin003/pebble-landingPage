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
  // ---- the Drop
  { piece: "drop", check: "cameraFloor", cr: "CR-04", saw: [{ aspect: "16:9", from: 210, to: 420 }], note: "the camera freezes after the hit while L05 and L06 are held (lz 0.00004, 0.04 px a frame at the corners)" },
  { piece: "drop", check: "hitSync", cr: "CR-07", saw: [{ aspect: "9:16", from: 202, to: 205 }], note: "9:16's bands open 24 frames after the hit (16:9 and 1:1 open on 182); the warm leak plays over the bands in every aspect" },
  { piece: "drop", check: "legibleWords", cr: "CR-09", note: "the ask card is declared read with 0 words; the companion's panel shows its 27 words at about 20 px, uncounted" },
  { piece: "drop", check: "askActClock", cr: "CR-11", note: "the companion's panel (a 1.0.x still) frames RS-9's live card view of the same window (the review's CR-18 overhang is the same composite)" },
  { piece: "drop", check: "groundCoverage", cr: "CR-02", note: "9:16 only: the riverbed's top edge in frame at the end of the pull-back (561–660)" },
  // ---- Ring 4 and Cascade 4
  { piece: "ring4", check: "planesInFrame", cr: "CR-05", saw: [{ aspect: "16:9", from: 420, to: 600 }, { aspect: "16:9", from: 645, to: 915 }, { aspect: "1:1", from: 360, to: 900 }], note: "the held card, the test card and the receipt cut by the frame's edge at reading size" },
  { piece: "ring4", check: "legibleWords", cr: "CR-05", saw: [{ aspect: "16:9", from: 645, to: 915 }], note: "162 legible words at 26–36 px against 22 counted (ask 5, act 8, receipt 9)" },
  { piece: "ring4", check: "askActClock", cr: "CR-11", saw: [{ aspect: "16:9", from: 645, to: 915 }], note: "the held card (a still) above HS-F's live run view of the same conversation, Verified included" },
  { piece: "ring4", check: "typeExits", cr: "CR-03", saw: [{ aspect: "16:9", from: 1393, to: 1394 }], note: "the cascade's last item is held to the piece's end and vanishes on the cut (reel 2054)" },
  { piece: "ring4", check: "cameraFloor", cr: "CR-04", note: "the cascade's stage arrives on E-arrive at rest, then glides up from 0 (local 956–1024): an arrive-and-hold of about 1 s" },
  { piece: "ring4", check: "groundCoverage", cr: "CR-02", note: "the riverbed's edge in frame while the ring leaves the stone (local 0–132 in 16:9; visible in the review's own ring_travel.jpg at reel 700–780)" },
  // ---- the Dusk passage
  { piece: "dusk", check: "cameraFloor", cr: "CR-04", note: "the palette's push starts from rest on E-move (local 0–67), over the blank frames CR-06 names" },
  { piece: "dusk", check: "groundCoverage", cr: "CR-02", note: "9:16 only: the riverbed's top edge in frame under the crane to the menu bar" },
  // ---- the climax shell
  { piece: "climax", check: "cameraFloor", cr: "CR-04", saw: [{ aspect: "16:9", from: 530, to: 900 }], note: "the freeze on the kept card after the push-in (0.055 px a frame); also the end of Glaze's push (local 132–226)" },
  { piece: "climax", check: "typeExits", cr: "CR-03", saw: [{ aspect: "16:9", from: 232, to: 234 }], note: "L24's 'camera' exit draws nothing: it vanishes on local 234 (reel 3368), 6 frames before the cut" },
  { piece: "climax", check: "legibleWords", cr: "CR-05", note: "the approval card's 82 and the kept card's 78 legible words against 7 and 12 counted" },
  { piece: "climax", check: "planesInFrame", cr: "CR-05", note: "1:1 only: both cards bleed off the frame's foot at reading size (§53 deferred this to the 2.0.0 captures; §55 asks every plane at 20 px wholly in frame)" },
  // ---- the wall
  { piece: "wall", check: "groundCoverage", cr: "CR-02", waitsForMontage: true, saw: [{ aspect: "16:9", from: 106, to: 360 }], note: "the riverbed shows as an inset rectangle through the pull-back (reel 4140–4394)" },
  { piece: "wall", check: "cameraFloor", cr: "CR-04", waitsForMontage: true, note: "1:1 only: the drift after the pull-back (0.22 px a frame)" },
  // ---- the convergence, the title and the end card
  { piece: "finale", check: "stoneCount", cr: "CR-01", saw: [{ aspect: "16:9", from: 238, to: 244 }, { aspect: "1:1", from: 238, to: 245 }, { aspect: "9:16", from: 238, to: 243 }], note: "two stones as the iris opens, 148–163 px apart at 1080" },
  { piece: "finale", check: "groundCoverage", cr: "CR-02", waitsForMontage: true, saw: [{ aspect: "16:9", from: 0, to: 166 }], note: "the riverbed's edges through the convergence (reel 4394–4560)" },
  { piece: "finale", check: "smallPrintHolds", cr: "CR-10", saw: [{ aspect: "16:9", from: 926, to: 1308 }], note: "page 2: 102 words, the honest line among them, on screen together 5.97 s (they need 31.1 s; the honest line 9 s)" },
  { piece: "finale", check: "cameraFloor", cr: "CR-04", note: "the convergence's first second (0.19 px a frame) and the title page's breath before its declared wait (0.08 px a frame, local 266–374)" },
  // ---- the foundation demo (qa/checks.ts on demo/timeline.ts)
  { piece: "F2-Foundation-Demo", check: "irisEase", cr: "CR-21", note: "its iris at 1358 takes ringIris's default, E-arrive, with no marked hit" },
  { piece: "F2-Foundation-Demo", check: "cameraFloor", cr: "CR-04", note: "S2's reading hold (371–459) and the title before its wait (1367–1536) glide under 0.25 px a frame" },
];

/** Is a finding one of the open findings of this piece? */
export const isOpen = (piece: string, check: string): boolean => OPEN_FINDINGS.some((o) => o.piece === piece && o.check === check);
