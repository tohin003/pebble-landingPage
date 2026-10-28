// THE RETURN'S CELLS (MONTAGE_DESIGN revision 2, §2.3–§2.5 and §4; OVERRIDES §61): the manifest of the 85 cells that
// rush in on three rings around the stone and return into it, one entry per cell, in the schedule's order (the inner
// ring's eight in slot order, then the waves M1, M2, M3, O1, O2 in time order).
//
// Each entry says what the cell shows and where it comes from, so the 2.0.0 crops replace the stand-ins through this
// file alone:
//   take, moment  the recording (or kit take) the cell is cropped from, and the instant of it the cell shows. Cells of
//                 one take show one moment of it (CR-11: returnContent refuses two moments of one take on screen
//                 together)
//   kitTake       the * cells of §2.3: re-sourced from a take in another conversation (a kit take recorded with the
//                 tour's and the shorts' takes, or "Glaze"), so no ask sits beside its own result. If the take is never
//                 recorded, the cell leaves the Return and its feature stays in the tour and the shorts
//   card, red     card-type cells (asks, receipts, notices) never sit side by side on a ring; red cells settle early and
//                 are never swapped (R3 §4.4)
//   standIn       until the 2.0.0 snapshot: a published capture (1.0.x–1.5.0, video/public/ui) of the SAME feature,
//                 cropped, never stretched, never showing a usage or timing line, an e-mail address or a sign-in; or a
//                 labelled slot naming the capture that fills it; or Pebble's engine (V); the first cell is S24's own
//                 last frame (MONTAGE_DESIGN §2.12). Never a capture of another feature in its place (§4)
//   textPx        the LARGEST text in the crop, CSS px (cellText holds it under 16 px at 1080 on screen); for slots the
//                 2.0.0 capture's expected largest text, until its crop is measured
//   meanLum, redShare  measured on the crop (the light-theme rule: mean relative luminance 0.70 or more; the red rule);
//                 unmeasured until the cells tool runs on the crops through heavy.sh
//   (drawn)       what the view draws NOW is measured on the cell's image as made (setpieces/tools/return-thumbs.ts
//                 writes returnLum.ts, keyed by each image's signature, so a changed stand-in is unmeasured until its
//                 new image is): the light rule, the red rule and the swaps' luminance pairing hold on it until the
//                 2.0.0 crop's own meanLum and redShare are filled (the review's RV-02, RV-05: rules held on declared
//                 values only passed the stand-ins unseen)
//   avatar        one stone from the climax to the end card (CR-01; MONTAGE_DESIGN §2.12, §2.13; the review's RV-01): a
//                 crop that pictures the companion's avatar is a second stone beside the stone. A still's `avatarPx` is
//                 the pictured pebble's body width in its crop (CSS px), and returnContent refuses any cell whose
//                 pictured pebble is drawn over PICTURED_STONE_PX at 1080; Pebble's engine drawn in a cell always
//                 pictures it. `avatar: "expected"` marks a feature whose 2.0.0 capture shows the companion: its crop
//                 must leave the avatar out, or the cell leaves the Return (a warning until the crop is measured; the
//                 lead rules on A2 and A3, whose features ARE the companion)
// No Stealth Lockdown cell, ever: this file refuses STEALTH_FEATURES at load (a cell cannot hold the honest line, §4),
// nor a Stealth word in any label drawn into a cell's image (RV-06).
// Pure data; no React.
import type { Rect } from "../motion/geometry";
import { STEALTH_FEATURES } from "./standins";

export type ReturnWave = "inner" | "mid1" | "mid2" | "mid3" | "out1" | "out2";
/** 0 inner, 1 middle, 2 outer */
export type ReturnRing = 0 | 1 | 2;

/** How a crop sits in the 4:3 cell: "cover" (the crop is 4:3) or "contain" (centred on its own ground, sampled at the crop's corner). */
export type CellFit = "cover" | "contain";

export type CellStandIn =
  | {
      kind: "still";
      /** path under video/public */
      src: string;
      /** the capture's size, CSS px */
      w: number;
      h: number;
      /** the part shown, CSS px */
      crop: Rect;
      fit: CellFit;
      version: string;
      /** what it shows, in a few words (and what it must not) */
      note: string;
      /** the companion's avatar pictured in the crop: its body's width, CSS px of the crop (absent: none) */
      avatarPx?: number;
    }
  | {
      kind: "slot";
      /** the capture that fills it (a take or the 2.0.0 snapshot's fixture) */
      captureId: string;
      label: string;
      /** the 2.0.0 crop's expected size, CSS px (a card's part, a window's part) */
      w: number;
      h: number;
    }
  /** Pebble's own engine, in one of Pebble's poses (V: renders now) */
  | { kind: "engine"; pose: "testing" | "working" | "idle"; w: number; h: number }
  /** S24's own last frame: the climax's shot on its last frame, framed as S24 framed it (§2.12) */
  | { kind: "frame"; piece: "climax"; shot: string; w: number; h: number };

export interface ReturnCellSpec {
  /** the cell's id: its feature IDs (FEATURES_2_0), joined with "+" where one frame shows several, "*" for a kit take */
  id: string;
  features: readonly string[];
  family: string;
  wave: ReturnWave;
  take: string;
  moment: string;
  /** the * cells: the take in another conversation the cell is cropped from (§2.5) */
  kitTake?: string;
  card: boolean;
  red: boolean;
  /** the film shows the feature before the Return (readably or in context), against TREATMENT §3.10 with Cascades 1–3 out */
  shown: boolean;
  /** the kept card: S24's last frame, the first cell and the last to return */
  hero?: boolean;
  /** a 6–12-frame 1× slice ending on its moment (only where the moment is motion), else a still */
  slice?: { frames: number };
  /** the capture route (R4 §1.1): V renders now; H+ the 2.0.0 snapshot; H a 1.5.0-era screen re-captured; R a real recording */
  capture: string;
  standIn: CellStandIn;
  textPx: number;
  theme: "light" | "dark";
  meanLum?: number;
  /** the share of the cell's own area that is saturated red (R/(R+G+B) ≥ 0.8), measured on the crop */
  redShare?: number;
  /** R4's label (1–3 words): only for the G1 A/B of family names, never drawn by default (§2.8) */
  label: string;
  note?: string;
  /** the feature's 2.0.0 capture shows the companion's avatar: its crop must leave it out, or the cell leaves (RV-01) */
  avatar?: "expected";
}

/** Pebble's engine in a cell (standIn kind "engine") is drawn this size, a share of the cell's height (views/ReturnView.tsx). */
export const ENGINE_CELL_SIZE = 0.78;

/* ---------------------------------------------------------------- stand-ins ------------------------------------- */

/** The published captures that show the same feature (R4_FIT §1.2's stand-in column, cropped to 4:3 where they can be). */
export type StillStandIn = Extract<CellStandIn, { kind: "still" }>;
export type SlotStandIn = Extract<CellStandIn, { kind: "slot" }>;
const still = (src: string, w: number, h: number, crop: Rect, note: string, fit: CellFit = "cover", version = "1.0.x"): StillStandIn => ({ kind: "still", src, w, h, crop, fit, version, note });
const slot = (captureId: string, label: string, w = 480, h = 360): SlotStandIn => ({ kind: "slot", captureId, label, w, h });

/** The published stills (exported for the canaries, which plant a stand-in as it was). */
export const SI = {
  verified: still("ui/crop-done-receipt@2x.png", 684, 278, { x: 6, y: 33, w: 327, h: 245 }, "\"Verified · pytest … passed on current files\" and \"Done, and verified:\", below the \"Worked for\" line"),
  quickChat: still("ui/pet-chat@2x.png", 384, 456, { x: 8, y: 8, w: 296, h: 222 }, "the quick chat: a question and the reply's first lines, above the usage line and the avatar"),
  whatChanges: still("ui/crop-approval-card@2x.png", 495, 482, { x: 14, y: 8, w: 420, h: 315 }, "a card's first line: \"Changes this file in your project. You can undo it afterwards.\""),
  heldCard: still("ui/held-unverified@2x.png", 1160, 800, { x: 342, y: 455, w: 240, h: 180 }, "\"Blocked · Pebble's change isn't verified yet.\" with Run the tests, between the usage line and the composer"),
  modes: still("ui/crop-permissions-modes@2x.png", 504, 443, { x: 0, y: 0, w: 504, h: 378 }, "Settings › Permissions: the modes, each with its two lines"),
  // (cropped below the model's row, whose details line prints its "4,096-token window" (§4 bars token counts), and left
  // of its Rest model button: RV-06)
  waysIn: still("ui/crop-models-ways-in@2x.png", 504, 227, { x: 0, y: 100, w: 302, h: 127 }, "the three ways in: Add a model file, Connect provider, Continue with ChatGPT", "contain"),
  refused: still("ui/crop-challenge-step@2x.png", 497, 329, { x: 0, y: 0, w: 436, h: 327 }, "a refused step in Activity with AgentGuard's words, left of its step time"),
  sidebar: still("ui/pet-sidebar@2x.png", 744, 576, { x: 8, y: 8, w: 344, h: 258 }, "the companion's sidebar: Chats, Activity, Views"),
  forgetRecords: still("ui/crop-memory-records-forgotten@2x.png", 504, 516, { x: 0, y: 138, w: 504, h: 378 }, "memory records, each with its Forget"),
  memoryKinds: still("ui/settings-memory@2x.png", 1160, 800, { x: 342, y: 200, w: 476, h: 357 }, "Settings › Memory: the six kinds, the switches"),
  forgetCard: still("ui/main-forget-card@2x.png", 1160, 800, { x: 371, y: 87, w: 667, h: 500 }, "\"Forget my … plans.\" and the card listing the matching memories (the avatar left of the crop)"),
  home: still("ui/v150/main-welcome@2x.png", 1160, 800, { x: 371, y: 232, w: 635, h: 476 }, "the home: \"Good to see you.\" and the starter cards, below the avatar", "cover", "1.5.0"),
  chart: still("ui/crop-dashboard-chart@2x.png", 783, 493, { x: 16, y: 6, w: 640, h: 480 }, "a view's chart in the canvas (sample data)"),
  quiz: still("ui/main-quiz@2x.png", 1160, 800, { x: 728, y: 215, w: 423, h: 317 }, "a quiz with its timer (sample data)"),
  editCard: still("ui/crop-approval-card@2x.png", 495, 482, { x: 13, y: 130, w: 469, h: 352 }, "an edit card's diff and its buttons"),
  commandCard: still("ui/crop-command-card@2x.png", 495, 474, { x: 14, y: 6, w: 460, h: 345 }, "the command card: \"Pebble can't undo a command.\""),
  gitPlan: still("ui/git-plan@2x.png", 1440, 900, { x: 958, y: 395, w: 464, h: 348 }, "the Git plan card's paths, message and effects, below the line with the sample e-mail address"),
  // A2's stand-in until 28 Oct: the companion's pebble itself, 87 CSS px wide in its 112-px crop (a second stone in the
  // Return: RV-01). No cell uses it now; the canaries plant it
  gaze: { ...still("ui/pet-collapsed-gaze@2x.png", 112, 112, { x: 0, y: 0, w: 112, h: 112 }, "the pebble with its eyes turned (the pointer is the 2.0.0 recording's)", "contain"), avatarPx: 87 },
} as const;

/* ---------------------------------------------------------------- the cells --------------------------------------- */

type Base = Pick<ReturnCellSpec, "id" | "features" | "family" | "take" | "moment" | "capture" | "standIn" | "label"> & Partial<Pick<ReturnCellSpec, "kitTake" | "card" | "red" | "hero" | "slice" | "textPx" | "note" | "shown" | "avatar">>;

const cell = (wave: ReturnWave, shown: boolean, b: Base): ReturnCellSpec => ({
  card: false,
  red: false,
  textPx: b.standIn.kind === "slot" ? 18 : 15,
  theme: "light",
  ...b,
  shown: b.shown ?? shown,
  wave,
});

/** The inner ring, in slot order clockwise from 12 o'clock: the proofs the film read, recalled. G3 is S24's last frame. */
const INNER: ReturnCellSpec[] = [
  cell("inner", true, { id: "G3", features: ["G3"], family: "G", take: "Kiln", moment: "kept", card: true, hero: true, capture: "H+, R", standIn: { kind: "frame", piece: "climax", shot: "kiln", w: 0, h: 0 }, textPx: 28, label: "Kept", note: "S24's last frame itself: the kept card at reading size; never the companion's avatar (one stone, CR-01)" }),
  cell("inner", true, { id: "A6", features: ["A6"], family: "A", take: "RS-1", moment: "over-full-screen", capture: "R", standIn: slot("RS-1", "the pebble over the full-screen poster, the Space slide's last frames"), label: "Every Space", note: "no focus words near it; its crop pictures the companion (about 3× in the bloom): RV-01", avatar: "expected" }),
  cell("inner", true, { id: "J2", features: ["J2"], family: "J", take: "RS-9 Open day", moment: "playing", capture: "R", standIn: slot("RS-9", "Pebble's own tab: the tab group, its border and status pill"), label: "Its own tab", note: "keep Chrome's bar" }),
  cell("inner", true, { id: "J6+F14", features: ["J6", "F14"], family: "J", take: "RS-9 Open day", moment: "playing", slice: { frames: 12 }, capture: "R", standIn: slot("RS-9", "the video's first moving frame beside the reply that says it plays"), label: "Checks it played", note: "a host check, not AgentGuard (R-AG)" }),
  cell("inner", true, { id: "I8+E6", features: ["I8", "E6"], family: "I", take: "RS-4 Tickets", moment: "after =", capture: "R", standIn: slot("RS-4", "Calculator just after \"=\", the press landing with no card"), label: "Keys, no card", note: "never the frame before \"=\"" }),
  cell("inner", true, { id: "H1", features: ["H1"], family: "H", take: "RS-H Photos", moment: "after flyer", capture: "H+, R", standIn: slot("RS-H", "\"Ran `sips …` with exit code 0.\" and its output"), label: "In a sandbox", note: "the sandbox limits; it doesn't promise" }),
  cell("inner", true, { id: "H4", features: ["H4"], family: "H", take: "RS-H Photos", moment: "after flyer", capture: "H+, R", standIn: slot("RS-H", "\"A copy of the earlier version was kept…\" with Undo this change"), label: "Undo this change" }),
  cell("inner", true, { id: "F12+F3+F1", features: ["F12", "F3", "F1"], family: "F", take: "HS-F studio-bookings", moment: "verified", capture: "H", standIn: SI.verified, label: "Verified", note: "the test card reading Done above \"Verified\"; sample numbers; never the \"Worked for\" line; not counted a card (MONTAGE_DESIGN's 20), so the inner ring's order keeps it beside G3" }),
];

/** M1: 14 entries on the middle ring, R120 + 7 i: what the film showed in context or read. */
const MID_W1: ReturnCellSpec[] = [
  cell("mid1", true, { id: "J1*", features: ["J1"], family: "J", take: "kit J", moment: "results", kitTake: "kit-J1", red: true, capture: "R", standIn: slot("kit-J1", "YouTube's own results page, in Pebble's tab"), label: "Straight there", note: "cleared video; other creators' thumbnails blurred; YouTube's red measured on the crop" }),
  cell("mid1", true, { id: "A4", features: ["A4"], family: "A", take: "RS-15", moment: "reply", capture: "H+, R", standIn: SI.quickChat, textPx: 19, label: "Quick chat", note: "crop the usage line under the reply" }),
  cell("mid1", true, { id: "E3", features: ["E3"], family: "E", take: "RS-8 Notes", moment: "delete waits", card: true, capture: "H", standIn: SI.whatChanges, label: "What changes" }),
  cell("mid1", true, { id: "B14", features: ["B14"], family: "B", take: "RS-15", moment: "reply", capture: "R, H+", standIn: slot("RS-15", "\"What can you do now?\" and the first line of Pebble's own answer"), label: "It knows itself" }),
  // A3 was Pebble's engine drawn live in its testing pose: a second pebble beside the stone, blinking on its own clock
  // (the review's RV-01). A labelled slot until the lead rules: its feature IS the companion, so any capture of it
  // pictures the pebble (returnContent refuses an engine cell, and warns on its expected avatar)
  cell("mid1", true, { id: "A3", features: ["A3"], family: "A", take: "engine", moment: "-", capture: "V", standIn: slot("engine", "the companion in one of its own working poses, reacting to work"), label: "Reacts to work", note: "Pebble's own poses only; never the review \"!\" (D6); it pictures the pebble: RV-01, the lead's ruling", avatar: "expected" }),
  cell("mid1", true, { id: "A10*", features: ["A10"], family: "A", take: "HS-G Glaze", moment: "waiting", kitTake: "HS-G", capture: "H+, R", standIn: slot("HS-G", "the waiting pebble with its \"Waiting for your review\" pill"), label: "Waits for you", note: "crop to the pill: the avatar is a second stone (RV-01)", avatar: "expected" }),
  cell("mid1", true, { id: "G4", features: ["G4"], family: "G", take: "HS-G Glaze", moment: "waiting", card: true, capture: "H+", standIn: slot("HS-G", "\"Keep this tool in Pebble's Toolbox?\" Discard · Keep"), label: "Keep this tool?" }),
  cell("mid1", true, { id: "I2*", features: ["I2"], family: "I", take: "kit I typing", moment: "typing", kitTake: "kit-I2", capture: "R", standIn: slot("kit-I2", "text appearing in a field of the allowed window"), label: "Types and presses" }),
  cell("mid1", true, { id: "B5", features: ["B5"], family: "B", take: "RS-7 sample app", moment: "after click", capture: "H+", standIn: slot("RS-7", "Activity's rows in plain words, one \"with a screenshot\""), label: "Plain-words Activity" }),
  cell("mid1", true, { id: "E4", features: ["E4"], family: "E", take: "RS-H Photos", moment: "after flyer", capture: "H+", standIn: slot("RS-H", "Settings › Permissions: allowed folders and sites, each with Remove"), label: "Always allow, Remove" }),
  cell("mid1", true, { id: "G1", features: ["G1"], family: "G", take: "Kiln", moment: "kept", capture: "H+", standIn: slot("RS-W", "an Activity step named by what its script does"), label: "Code Mode", note: "never \"first\"" }),
  cell("mid1", true, { id: "G2", features: ["G2"], family: "G", take: "Kiln", moment: "kept", capture: "H+", standIn: slot("RS-W", "Activity: the tool made and checked, then used"), label: "Makes a tool" }),
  cell("mid1", true, { id: "N1", features: ["N1"], family: "N", take: "HS-N agents", moment: "-", capture: "H+", standIn: slot("HS-N", "the agents panel, each agent's proposal"), label: "Agents propose" }),
  cell("mid1", true, { id: "N2", features: ["N2"], family: "N", take: "HS-N goal", moment: "-", capture: "H+", standIn: slot("HS-N", "a goal with its criteria"), label: "A goal" }),
];

/** M2: 12 blur swaps in place on the middle ring, R240 + 7 i (cards at odd items, which land on even slots). */
const MID_W2: ReturnCellSpec[] = [
  cell("mid2", true, { id: "A14*", features: ["A14"], family: "A", take: "HS-G Glaze", moment: "waiting", kitTake: "HS-G", capture: "R", standIn: slot("HS-G", "the macOS banner naming the conversation"), label: "A banner", note: "never under Stealth or quiet hours; it names the conversation, never the reply" }),
  cell("mid2", true, { id: "A9+J3*", features: ["A9", "J3"], family: "A", take: "kit A card", moment: "asking", kitTake: "kit-A9", card: true, capture: "H+, R", standIn: slot("kit-A9", "the companion's card \"Use youtube.com\": its sites, Allow"), label: "Allow in place" }),
  cell("mid2", true, { id: "B6*", features: ["B6"], family: "B", take: "kit B cmd-K", moment: "-", kitTake: "kit-B6", capture: "H+", standIn: slot("kit-B6", "⌘K with a typed word and its lit row"), label: "⌘K", note: "never the \"stealth\" query" }),
  cell("mid2", true, { id: "I1*", features: ["I1"], family: "I", take: "kit I window card", moment: "asking", kitTake: "kit-I1", card: true, capture: "H+, R", standIn: slot("kit-I1", "the window card naming the app and its window; Allow"), label: "One window" }),
  cell("mid2", true, { id: "I9", features: ["I9"], family: "I", take: "RS-4 Tickets", moment: "after =", capture: "H+", standIn: slot("RS-4", "the Activity row \"Pressed “=”\" with what changed"), label: "Says what changed" }),
  cell("mid2", true, { id: "I3", features: ["I3"], family: "I", take: "RS-8 Notes", moment: "delete waits", card: true, capture: "H+, R", standIn: slot("RS-8", "the press card: \"Delete\", what is next to it, waiting"), label: "Delete waits" }),
  cell("mid2", true, { id: "J9", features: ["J9"], family: "J", take: "RS-7 sample app", moment: "after click", capture: "R", standIn: slot("RS-7", "a click landing on a control Accessibility can't see; the window changing"), label: "Mouse and keyboard", note: "the pointer only as recorded" }),
  cell("mid2", true, { id: "H3*", features: ["H3"], family: "H", take: "kit H folder card", moment: "asking", kitTake: "kit-H3", card: true, capture: "H+", standIn: slot("kit-H3", "the folder card naming a folder, with Always allow"), label: "Asks first" }),
  cell("mid2", true, { id: "H2", features: ["H2"], family: "H", take: "RS-H Photos", moment: "after flyer", capture: "R, H+", standIn: slot("RS-H", "Finder at ~/Pebble Workbench with the resized copies"), label: "Pebble Workbench" }),
  // (a slot until its kit take exists: the published held card is a crop of the same conversation as F12's Verified, at
  // an earlier moment, and the two shared the screen R311–R582: the review's RV-05, CR-11 on what is drawn)
  cell("mid2", true, { id: "F11*", features: ["F11"], family: "F", take: "kit F held card", moment: "held", kitTake: "kit-F11", card: true, capture: "H", standIn: slot("kit-F11", "\"Pebble's change isn't verified yet.\" and Run the tests, in a conversation of its own"), textPx: 16, label: "Not verified yet", note: "below its usage line" }),
  cell("mid2", true, { id: "O1", features: ["O1"], family: "O", take: "HS-O skills", moment: "-", capture: "H", standIn: slot("HS-O", "Settings › Skills & connectors: a skill off until reviewed"), label: "Skills" }),
  cell("mid2", true, { id: "O2", features: ["O2"], family: "O", take: "HS-O connector", moment: "asking", card: true, capture: "H+", standIn: slot("HS-O", "a connector's call, asking first"), label: "Connectors ask" }),
];

/** M3: 8 slide swaps along the middle ring in the rush, R366 + 12 i: everything else. */
const MID_W3: ReturnCellSpec[] = [
  cell("mid3", false, { id: "B3", features: ["B3"], family: "B", take: "kit B status", moment: "-", capture: "H", standIn: slot("kit-B3", "the live status line naming the current action"), label: "Live status", note: "crop \"Worked for … · n steps\"" }),
  cell("mid3", false, { id: "B8", features: ["B8"], family: "B", take: "kit B slash", moment: "-", capture: "H", standIn: slot("kit-B8", "the / menu"), label: "Slash commands" }),
  cell("mid3", false, { id: "X4", features: ["X4"], family: "X", take: "kit X4", moment: "asking", card: true, capture: "H+", standIn: slot("kit-X4", "the \"Needs a check\" block with Done and End access"), label: "Needs a check", note: "1.9.15–1.9.17: confirm in 2.0.0" }),
  // (its slot's label is drawn into its image: it names no Stealth tab, RV-06; the crop still stops above that tab)
  cell("mid3", false, { id: "B9", features: ["B9"], family: "B", take: "kit B settings", moment: "-", capture: "H+", standIn: slot("kit-B9", "the Settings sidebar, cropped above the privacy tab"), label: "Settings sidebar", note: "crop above the privacy tab and its Lockdown line" }),
  cell("mid3", false, { id: "E1+E2", features: ["E1", "E2"], family: "E", take: "kit E modes", moment: "-", capture: "H, H+", standIn: SI.modes, label: "Three modes" }),
  cell("mid3", false, { id: "E9", features: ["E9"], family: "E", take: "kit E windows", moment: "-", capture: "H+", standIn: slot("kit-E9", "windows Pebble can use, with End access"), label: "End access" }),
  cell("mid3", false, { id: "X3", features: ["X3"], family: "X", take: "kit X3", moment: "-", capture: "R", standIn: slot("kit-X3", "the companion stepping out of the way of the spot Pebble must click"), label: "Steps aside", note: "1.9.15: confirm in 2.0.0; the companion it moves is a second stone (RV-01)", avatar: "expected" }),
  cell("mid3", false, { id: "X5", features: ["X5"], family: "X", take: "kit X5", moment: "-", slice: { frames: 12 }, capture: "R", standIn: slot("kit-X5", "a drag inside an allowed window: a picture cropped in Preview"), label: "Drags too", note: "1.9.18: confirm in 2.0.0; show the result, never a review it skipped" }),
];

/** O1: 24 entries on the outer ring, R150 + 7.5 i, in family groups (models, research, workspace, memory, views). */
const OUT_W1: ReturnCellSpec[] = [
  cell("out1", false, { id: "B2+C1-C3", features: ["B2", "C1", "C2", "C3"], family: "C", take: "kit C first launch", moment: "-", card: true, capture: "H+, H", standIn: SI.waysIn, label: "Three ways in", note: "the plan line stays in the small print; trademark lines for the providers" }),
  cell("out1", false, { id: "C4", features: ["C4"], family: "C", take: "kit C", moment: "-", capture: "H+", standIn: slot("kit-C4", "the composer's model button open, grouped by provider"), label: "Who answers", note: "short names, no e-mail addresses" }),
  cell("out1", false, { id: "C6", features: ["C6"], family: "C", take: "kit C handoff", moment: "asking", card: true, capture: "H+", standIn: slot("kit-C6", "the handoff notice: review and release to a cloud model"), label: "Release to cloud", note: "\"Stored on your Mac\", never \"stays\"" }),
  cell("out1", false, { id: "F9", features: ["F9"], family: "F", take: "kit F refused step", moment: "-", red: true, capture: "H", standIn: SI.refused, textPx: 14, label: "Scope checked", note: "its red step under the red-area limit; settled before R240, never swapped" }),
  cell("out1", false, { id: "K1+K2", features: ["K1", "K2"], family: "K", take: "kit K search", moment: "-", capture: "H+", standIn: slot("kit-K1", "\"Searching the web\", then the sources under the reply"), label: "Searches the web" }),
  cell("out1", false, { id: "K3", features: ["K3"], family: "K", take: "kit K source", moment: "-", capture: "H+", standIn: slot("kit-K3", "a source marker clicked, and the page it names"), label: "Sources open" }),
  cell("out1", false, { id: "A5", features: ["A5"], family: "A", take: "kit A workspace fill", moment: "-", slice: { frames: 12 }, capture: "R", standIn: slot("kit-A5", "the workspace mid-fill after the pebble's arrow"), label: "Full workspace", note: "crop the workspace, not the pebble (RV-01)", avatar: "expected" }),
  cell("out1", false, { id: "A8", features: ["A8"], family: "A", take: "kit A sidebar", moment: "-", capture: "H+", standIn: SI.sidebar, label: "Chats, Activity, Views" }),
  cell("out1", false, { id: "A11", features: ["A11"], family: "A", take: "kit A half-typed", moment: "-", capture: "R, H+", standIn: slot("kit-A11", "the same half-typed words waiting in the workspace's box"), label: "Words come along" }),
  cell("out1", false, { id: "A12", features: ["A12"], family: "A", take: "kit A from any app", moment: "-", capture: "R", standIn: slot("kit-A12", "Pebble coming forward over another app"), label: "From any app", note: "no drawn keycaps; no avatar in the crop (RV-01)", avatar: "expected" }),
  cell("out1", false, { id: "A13", features: ["A13"], family: "A", take: "kit A drop a file", moment: "-", capture: "R", standIn: slot("kit-A13", "a PDF's drag image touching the pebble"), label: "Drop a file", note: "sample file only; the pebble it touches is a second stone (RV-01)", avatar: "expected" }),
  cell("out1", false, { id: "B15", features: ["B15"], family: "B", take: "kit B appearance", moment: "-", capture: "H+", standIn: slot("kit-B15", "Settings › Appearance in the light theme"), label: "Light and dark", note: "never the light-dark flip itself; light cells only" }),
  cell("out1", false, { id: "D3", features: ["D3"], family: "D", take: "kit D forget", moment: "asking", card: true, capture: "H", standIn: SI.forgetRecords, label: "Forget" }),
  cell("out1", false, { id: "D1", features: ["D1"], family: "D", take: "kit D settings", moment: "-", capture: "H", standIn: SI.memoryKinds, label: "Six kinds" }),
  cell("out1", false, { id: "D4", features: ["D4"], family: "D", take: "kit D forget card", moment: "asking", card: true, capture: "H", standIn: SI.forgetCard, label: "Forget on request" }),
  cell("out1", false, { id: "D2", features: ["D2"], family: "D", take: "kit D remember", moment: "-", capture: "H+", standIn: slot("kit-D2", "\"Remember that …\" and Pebble's note that it saved it"), label: "Remember that" }),
  cell("out1", false, { id: "D6+P1", features: ["D6", "P1"], family: "D", take: "kit D Finder", moment: "-", capture: "R", standIn: slot("kit-D6", "Finder: Documents › Pebble with Memory and Conversations"), label: "Readable copies", note: "sample data; \"Stored on your Mac\"" }),
  cell("out1", false, { id: "B1", features: ["B1"], family: "B", take: "kit B home", moment: "-", capture: "H", standIn: SI.home, textPx: 40, label: "Welcome home" }),
  cell("out1", false, { id: "B4", features: ["B4"], family: "B", take: "kit B details", moment: "-", capture: "H", standIn: slot("kit-B4", "the Details drawer mid-slide"), label: "Details", note: "keep Context use out of frame" }),
  cell("out1", false, { id: "B7", features: ["B7"], family: "B", take: "kit B search", moment: "-", capture: "H+", standIn: slot("kit-B7", "search excerpts with the searched word"), label: "Search excerpts" }),
  cell("out1", false, { id: "B13", features: ["B13"], family: "B", take: "kit B undo toast", moment: "-", capture: "H+", standIn: slot("kit-B13", "the Undo toast after a delete"), label: "Recently deleted" }),
  cell("out1", false, { id: "M1", features: ["M1"], family: "M", take: "kit M view", moment: "-", capture: "H", standIn: SI.chart, label: "Views" }),
  cell("out1", false, { id: "M2", features: ["M2"], family: "M", take: "kit M quiz", moment: "-", capture: "H", standIn: SI.quiz, textPx: 23, label: "Quizzes" }),
  cell("out1", false, { id: "M3", features: ["M3"], family: "M", take: "kit M export", moment: "-", capture: "H+, R", standIn: slot("kit-M3", "Export… with Word, Excel, CSV and HTML"), label: "Export", note: "Word is labelled unverified in the app" }),
];

/** O2: 19 slide swaps along the outer ring, R321 + 6 i (never F9's slot). */
const OUT_W2: ReturnCellSpec[] = [
  cell("out2", false, { id: "I6a", features: ["I6"], family: "I", take: "kit I shortcuts", moment: "asking", card: true, capture: "R", standIn: slot("kit-I6a", "a Shortcuts card asking first"), label: "Shortcuts ask first" }),
  cell("out2", false, { id: "K4", features: ["K4"], family: "K", take: "kit K weather", moment: "-", capture: "H+", standIn: slot("kit-K4", "a weather answer"), label: "Weather", note: "Open-Meteo is a non-commercial service: the lead checks before it shows" }),
  cell("out2", false, { id: "I6b", features: ["I6"], family: "I", take: "kit I music", moment: "-", capture: "R", standIn: slot("kit-I6b", "Music starting a sample track"), label: "Music", note: "sample library only" }),
  cell("out2", false, { id: "F2", features: ["F2"], family: "F", take: "kit F edit card", moment: "done", card: true, capture: "H", standIn: SI.editCard, label: "Undo this edit" }),
  cell("out2", false, { id: "H5", features: ["H5"], family: "H", take: "kit H screenshot", moment: "-", capture: "R, H+", standIn: slot("kit-H5", "a screenshot thumbnail in the conversation"), label: "Screenshots", note: "a sample desktop" }),
  cell("out2", false, { id: "I6c", features: ["I6"], family: "I", take: "kit I notes", moment: "-", capture: "R", standIn: slot("kit-I6c", "a new note appearing in Notes"), label: "Notes" }),
  cell("out2", false, { id: "G5", features: ["G5"], family: "G", take: "kit G toolbox", moment: "-", capture: "H+", standIn: slot("kit-G5", "Pebble's Toolbox in Settings: View code, Remove, Put back"), label: "The Toolbox" }),
  // R4 named held-tests-review as F4's stand-in, but that capture shows the isolated-tests card, not the test-file card: a slot
  cell("out2", false, { id: "F4", features: ["F4"], family: "F", take: "kit F test-file card", moment: "asking", card: true, capture: "H", standIn: slot("kit-F4", "the test-file card leading with its reason"), label: "Tests stay yours" }),
  cell("out2", false, { id: "I6d", features: ["I6"], family: "I", take: "kit I calendar", moment: "-", capture: "R", standIn: slot("kit-I6d", "a new event appearing in Calendar"), label: "Calendar", note: "On My Mac calendar" }),
  cell("out2", false, { id: "J4", features: ["J4"], family: "J", take: "kit J Comet window", moment: "-", capture: "R", standIn: slot("kit-J4", "the Comet window opening for the task"), label: "Comet too", note: "its result, not its card; a trademark line for Comet" }),
  cell("out2", false, { id: "I6e", features: ["I6"], family: "I", take: "kit I Finder", moment: "-", capture: "R", standIn: slot("kit-I6e", "Finder revealing a folder"), label: "Finder" }),
  cell("out2", false, { id: "F6", features: ["F6"], family: "F", take: "kit F command card", moment: "asking", card: true, capture: "H", standIn: SI.commandCard, label: "Commands ask" }),
  cell("out2", false, { id: "H8", features: ["H8"], family: "H", take: "kit H file chips", moment: "-", capture: "R, H+", standIn: slot("kit-H8", "file chips in the composer"), label: "Attach files" }),
  cell("out2", false, { id: "X1", features: ["X1"], family: "X", take: "kit X1 Preview", moment: "-", capture: "R", standIn: slot("kit-X1", "Preview opening on the sample picture"), label: "Opens your file", note: "1.9.13: confirm in 2.0.0" }),
  cell("out2", false, { id: "F8", features: ["F8"], family: "F", take: "kit F rewind", moment: "-", capture: "H+", standIn: slot("kit-F8", "the rewind panel"), label: "Rewind files" }),
  cell("out2", false, { id: "F7", features: ["F7"], family: "F", take: "kit F git plan", moment: "asking", card: true, capture: "H", standIn: SI.gitPlan, textPx: 14, label: "Git plans" }),
  cell("out2", false, { id: "I4", features: ["I4"], family: "I", take: "kit I your turn", moment: "-", capture: "R", standIn: slot("kit-I4", "Pebble's \"your turn\" line beside a sample app's field"), label: "Your turn", note: "never a sign-in screen: leave it out if the frame needs one" }),
  cell("out2", false, { id: "N3", features: ["N3"], family: "N", take: "kit N schedule", moment: "asking", card: true, capture: "H+", standIn: slot("kit-N3", "the schedule review in words: Once, Next hour, Tomorrow at 9:00"), label: "Schedules", note: "its limit stays in the tour" }),
  // A2's stand-in was the pebble itself (SI.gaze): a second stone, and the darkest cell (0.694 on the page ground, under
  // the light rule), whose swap into B7's pale slot was the reels' one tile pop (RV-01, RV-02). A labelled slot until the
  // lead rules: its feature IS the companion's eyes
  cell("out2", false, { id: "A2", features: ["A2"], family: "A", take: "kit A gaze", moment: "-", capture: "V, H", standIn: slot("kit-A2", "the companion's eyes following the pointer"), label: "Eyes that follow", note: "off under Reduce motion; it pictures the pebble: RV-01, the lead's ruling", avatar: "expected" }),
];

/** Every cell, in the schedule's order. */
export const RETURN_WAVES: Readonly<Record<ReturnWave, readonly ReturnCellSpec[]>> = { inner: INNER, mid1: MID_W1, mid2: MID_W2, mid3: MID_W3, out1: OUT_W1, out2: OUT_W2 };

/** The features a cell may never show: Stealth Lockdown (setpieces/standins.ts STEALTH_FEATURES). */
export const stealthIn = (c: Pick<ReturnCellSpec, "features">): string[] => c.features.filter((f) => (STEALTH_FEATURES as readonly string[]).includes(f));

/**
 * Words a cell's image must never carry (MONTAGE_DESIGN §4's must-not-appear list; OVERRIDES §49): Stealth Lockdown in
 * any form, token or usage counts, Context use, "Worked for", "undetectable", "Context Warping". A slot draws its id, its
 * capture's id and its label into its image (setpieces/tools/return-thumbs.ts), so those are scanned (the review's
 * RV-06: B9's slot printed "cropped above Privacy & Stealth"); a still's pixels are cropped by hand (its note says how).
 */
export const NEVER_DRAWN: readonly RegExp[] = [/stealth/i, /lock\s*down/i, /\bveil\b/i, /⌃⌥⌘H/, /\btokens?\b/i, /context (use|warping)/i, /worked for/i, /undetectable/i];

/** The text a cell's image draws (a slot's id, capture id and label; nothing for a still, the frame or the engine). */
export const drawnLabelText = (c: Pick<ReturnCellSpec, "id" | "standIn">): string => (c.standIn.kind === "slot" ? `${c.id} · ${c.standIn.captureId} · ${c.standIn.label}` : "");

/** Every problem with a manifest's entries (the fields every cell must carry). */
export function manifestProblems(cells: readonly ReturnCellSpec[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const c of cells) {
    if (ids.has(c.id)) out.push(`${c.id}: two cells with one id`);
    ids.add(c.id);
    const st = stealthIn(c);
    if (st.length) out.push(`${c.id} shows Stealth Lockdown (${st.join(", ")}): the Return never does (a cell cannot hold the honest line)`);
    if (!c.features.length) out.push(`${c.id}: names no feature`);
    if (!c.take || !c.moment) out.push(`${c.id}: no take or no moment (one take, one moment: CR-11)`);
    if (c.id.includes("*") && !c.kitTake) out.push(`${c.id}: a * cell without its kit take`);
    if (!c.standIn) out.push(`${c.id}: no stand-in`);
    if (c.standIn?.kind === "still" && (c.standIn.crop.w <= 0 || c.standIn.crop.h <= 0)) out.push(`${c.id}: an empty crop`);
    if (c.standIn?.kind === "still" && c.standIn.fit === "cover" && Math.abs(c.standIn.crop.w / c.standIn.crop.h - 4 / 3) > 0.02) out.push(`${c.id}: a "cover" crop that is not 4:3 (${c.standIn.crop.w} × ${c.standIn.crop.h}): it would be stretched or cut`);
    if (c.slice && (c.slice.frames < 6 || c.slice.frames > 12)) out.push(`${c.id}: a slice of ${c.slice.frames} frames (6–12 at 1×)`);
    if (!(c.textPx >= 0)) out.push(`${c.id}: no text size`);
    const drawn = drawnLabelText(c);
    for (const re of NEVER_DRAWN) if (re.test(drawn)) out.push(`${c.id}'s image would draw "${drawn.match(re)![0]}" ("${drawn}"): the must-not-appear list (MONTAGE_DESIGN §4)`);
  }
  return out;
}

/** Refuses a manifest with a Stealth cell (or any entry missing a field): at load, and for any manifest built later. */
export function refuseBadManifest(cells: readonly ReturnCellSpec[], name = "the Return's cells"): readonly ReturnCellSpec[] {
  const p = manifestProblems(cells);
  if (p.length) throw new Error(`${name}: ${p.join("; ")}`);
  return cells;
}

/** The 85 cells (checked at load: no Stealth cell, every field present). */
export const RETURN_CELLS: readonly ReturnCellSpec[] = refuseBadManifest([...INNER, ...MID_W1, ...MID_W2, ...MID_W3, ...OUT_W1, ...OUT_W2]);
