// Takes: a recording (or harness playback) placed in a set piece at 1×, with its timing read from a manifest
// (TREATMENT §3.6, §4.7 step 8). Pebble's time is never sped up, so there is no rate anywhere: a take's in-point is
// SOLVED so that one of its events (the Allow click, the receipt, the kept card) lands on a frame the music chose, and
// every other frame of the take follows at 1×. Nothing inside a take is cut.
//
// One recording can feed several planes: a screen recording holds the companion and the browser at once, and the
// composed world (§3.9, S07) shows each window as its own plane. Each plane is a VIEW of the take (a crop of its
// picture), and every view shares the take's one clock.
//
// A 2.0.0 take's manifest comes from the capture harness or the recording's event log (G4). Until then the manifests
// here are PLACEHOLDERS: plausible timings over published stills (setpieces/standins.ts), each marked `placeholder`.
// Pure; no React.
import type { Rect } from "../motion/geometry";
import { SLOT, STILL, type SlotStandIn, type StandIn } from "./standins";

/** A still shown in a placeholder view from source frame `from` (until `to`), at `rect` inside the view. */
export interface ViewStill {
  from: number;
  to?: number;
  standIn: StandIn;
  /** where it sits inside the view (view px); default the whole view */
  rect?: Rect;
  /** it arrives with the shared card entrance (a placeholder for the recording's own arrival) */
  entrance?: boolean;
  /** it fades out over its last N source frames before `to` (a placeholder for the recording's own change) */
  fadeOut?: number;
}

export interface TakeView {
  /** the view's size, CSS px (world units at 1×) */
  w: number;
  h: number;
  /** real takes: the view's region in the recording's picture, CSS px */
  crop?: Rect;
  /** placeholders: published stills, shown by source frame */
  stills?: readonly ViewStill[];
  /** placeholders with no published capture: a labelled slot that shows the take's source time ticking at 1× */
  slot?: SlotStandIn;
  /** a slot's caption of what the take shows from source frame `from` (the menu-bar icon's new state …) */
  slotStates?: readonly { from: number; label: string }[];
  /** the real window the view shows: a still of the same window never shares a frame with it (CR-11) */
  place?: string;
  /** real takes: the view's body text (CSS px) and its legible words, for the legibility checks (CR-05) */
  textPx?: number;
  words?: number;
}

export interface TakeManifest {
  /** the capture ID (TREATMENT §6): RS-9, RS-W, HS-F … */
  id: string;
  /** the take's own frame rate */
  fps: number;
  /** its length, source frames */
  frames: number;
  /** its picture's size, CSS px */
  w: number;
  h: number;
  /** named moments, source frames from its first frame (0) */
  events: Readonly<Record<string, number>>;
  /** a real frame sequence: a path under video/public with "{n}" for the 1-based, 5-digit frame number */
  pattern?: string;
  /** the planes this take feeds */
  views: Readonly<Record<string, TakeView>>;
  /** true until the 2.0.0 capture replaces it */
  placeholder: boolean;
  note?: string;
}

/** The source frame a composition frame shows: 1×, from `inPoint` at frame `at`. */
export const sourceFrameAt = (frame: number, at: number, fps: number, m: TakeManifest, inPoint: number): number =>
  inPoint + Math.floor(((frame - at) * m.fps) / fps + 1e-6);

/** The composition frame on which source frame `src` first shows. */
export const frameOfSource = (src: number, at: number, fps: number, m: TakeManifest, inPoint: number): number => at + Math.ceil(((src - inPoint) * fps) / m.fps - 1e-6);

export interface TakeUse {
  manifest: TakeManifest;
  /** the frame its first shown frame plays (composition or a piece's local frames) */
  at: number;
  /** the source frame shown at `at` */
  inPoint: number;
  /** the frame after its last shown frame */
  until: number;
}

/** The frame on which `event` first shows in a use of a take. */
export const eventFrame = (u: TakeUse, event: string, fps: number): number => {
  const e = u.manifest.events[event];
  if (e === undefined) throw new Error(`take ${u.manifest.id} has no event "${event}" (it has ${Object.keys(u.manifest.events).join(", ")})`);
  return frameOfSource(e, u.at, fps, u.manifest, u.inPoint);
};

/** Is `event` on screen inside this use (between its first and last shown frames)? */
export const eventShown = (u: TakeUse, event: string, fps: number): boolean => {
  const f = eventFrame(u, event, fps);
  return f >= u.at && f < u.until;
};

/** The same use, `by` frames later (a piece's local frames into composition frames). */
export const shiftUse = (u: TakeUse, by: number): TakeUse => ({ ...u, at: u.at + by, until: u.until + by });

/**
 * The use that puts `event` on frame `land` when the take starts showing at frame `at` (1×) and shows until `until`.
 * Throws when the take cannot do it without speeding up or cutting: when the event comes too early in the take to fill
 * the frames before `land` (start the take later), or the take ends before `until`.
 */
export function solveInPoint(m: TakeManifest, event: string, land: number, at: number, until: number, fps: number): TakeUse {
  const e = m.events[event];
  if (e === undefined) throw new Error(`take ${m.id} has no event "${event}"`);
  if (land < at) throw new Error(`take ${m.id}: "${event}" must land on or after the take starts (${land} < ${at})`);
  // the event shows exactly on `land`: frameOfSource(e) = at + ceil((e − inPoint)·fps/m.fps) = land
  const inPoint = e - Math.floor(((land - at) * m.fps) / fps + 1e-6);
  if (inPoint < 0) {
    throw new Error(
      `take ${m.id}: "${event}" is ${(e / m.fps).toFixed(2)} s into the take, but would land ${((land - at) / fps).toFixed(2)} s after it starts; start the take later (never speed it up)`,
    );
  }
  if (frameOfSource(e, at, fps, m, inPoint) !== land) throw new Error(`take ${m.id}: "${event}" cannot land exactly on frame ${land} at ${m.fps} → ${fps} fps`);
  const lastSrc = sourceFrameAt(until - 1, at, fps, m, inPoint);
  if (lastSrc >= m.frames) throw new Error(`take ${m.id} ends (source frame ${m.frames}) before frame ${until} (it would need ${lastSrc}); shorten the shot or record a longer take`);
  return { manifest: m, at, inPoint, until };
}

/** The latest frame a take may start showing so that `event` lands on `land` (its in-point then 0). */
export const latestStart = (m: TakeManifest, event: string, land: number, fps: number): number => land - Math.floor(((m.events[event] ?? 0) * fps) / m.fps);

/**
 * Time honesty for one use of a take (§3.6, `checkTimeHonesty`): it never starts before its first frame or runs past
 * its last, and the film span between any two shown moments equals their real span, to a frame. True by construction
 * for solveInPoint; this guards hand-made uses and the 2.0.0 manifests.
 */
export function checkTakeUse(u: TakeUse, fps: number): string[] {
  const out: string[] = [];
  const m = u.manifest;
  if (u.inPoint < 0) out.push(`take ${m.id}: in-point ${u.inPoint} before its first frame`);
  if (u.until <= u.at) out.push(`take ${m.id}: shown for no frames (${u.at} → ${u.until})`);
  const lastSrc = sourceFrameAt(u.until - 1, u.at, fps, m, u.inPoint);
  if (lastSrc >= m.frames) out.push(`take ${m.id}: shown past its last frame (${lastSrc} ≥ ${m.frames})`);
  const shown = Object.entries(m.events).filter(([, e]) => {
    const f = frameOfSource(e, u.at, fps, m, u.inPoint);
    return f >= u.at && f < u.until;
  });
  for (const [a, ea] of shown) {
    for (const [b, eb] of shown) {
      if (eb <= ea) continue;
      const film = frameOfSource(eb, u.at, fps, m, u.inPoint) - frameOfSource(ea, u.at, fps, m, u.inPoint);
      const real = ((eb - ea) / m.fps) * fps;
      if (Math.abs(film - real) > 1) out.push(`take ${m.id}: ${a} → ${b} spans ${film} frames on film, ${real.toFixed(1)} in reality`);
    }
  }
  return out;
}

/** The file of a real take's source frame `src` (0-based): `pattern` with "{n}" as the 1-based, 5-digit frame number. */
export const takeFramePath = (m: TakeManifest, src: number): string => {
  if (!m.pattern) throw new Error(`take ${m.id} has no frame sequence yet (placeholder)`);
  return m.pattern.replace("{n}", String(Math.max(0, Math.min(m.frames - 1, src)) + 1).padStart(5, "0"));
};

/** The placeholder stills a view shows on source frame `src` (each from its `from` until its `to`). */
export const stillsAt = (v: TakeView, src: number): ViewStill[] => (v.stills ?? []).filter((s) => src >= s.from && (s.to === undefined || src < s.to));

/** "m:ss.cc" of a source frame, for a slot's ticking source time. */
export const sourceTimecode = (src: number, fps: number): string => {
  const s = Math.max(0, src) / fps;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
};

/* ---------------------------------------------------------------- placeholder manifests ------------------------- */

/**
 * The companion's panel: a real 1.0.x harness frame with the avatar hidden ("Thinking", "Task: running"; no usage
 * line: that appears from frame 199 of the take), so the film pebble is drawn where its avatar sits.
 */
export const COMPANION_PANEL = {
  src: "ui-frames/pet-live-error-light-hidden/00120.png",
  w: 384,
  h: 456,
  stone: { x: 326.7, y: 397.3 },
  /** its body text (CSS px, measured: the question's cap height ÷ 0.727) and every legible word in it (CR-05) */
  textPx: 13.3,
  words: 27,
  /** the window it shows (CR-11) */
  place: "companion",
} as const;

/**
 * RS-9, the one continuous browser take (TREATMENT §6): the companion's card, Allow, the receipt, Pebble's tab, the
 * results, the video starting, the reply. PLACEHOLDER timings inside §3.6 chain 3 (8–13 s from the Allow to the reply).
 * Two views of one picture, on one clock (CR-11): the companion and the browser. No published capture shows the
 * companion holding a card, so until the receipt the companion is a labelled slot; from the receipt it is a real
 * 1.0.x frame of the companion at work, switched in with a hard cut on the event, as a recording changes (CR-18: the
 * old placeholder dissolved a main-window card into a receipt that overhung the panel). The browser is a slot with
 * the take's source time ticking at 1×.
 */
export const TAKE_RS9: TakeManifest = {
  id: "RS-9",
  fps: 60,
  frames: 2400,
  w: 2880,
  h: 1800,
  events: { card: 300, allow: 540, receipt: 566, tabOpens: 690, results: 830, press: 1100, videoStarts: 1190, reply: 1290 },
  views: {
    companion: {
      w: COMPANION_PANEL.w,
      h: COMPANION_PANEL.h,
      place: "companion",
      stills: [
        { from: 0, to: 566, standIn: SLOT.companionCard },
        { from: 566, standIn: STILL.companionWorking },
      ],
    },
    browser: { w: SLOT.browser.w, h: SLOT.browser.h, slot: SLOT.browser, place: "browser" },
  },
  placeholder: true,
  note: "placeholder timings; the 2.0.0 recording's event log replaces them",
};

/** Ring 4's views inside HS-F's picture (the conversation "studio-bookings"), view px: the history and the run. */
export const HSF_VIEWS = {
  held: { w: 253, h: 66 },
  /**
   * the test card's sentence, and further down the conversation the receipt (the resumed turn's own row), far enough
   * below that the camera's glide down to it carries the sentence out of frame before it reads the receipt closer
   */
  run: { w: 424, h: 312, tests: { x: 0, y: 0, w: 424, h: 43 }, receipt: { x: 0, y: 260, w: 250, h: 52 } },
} as const;

/**
 * HS-F, Ring 4's AgentGuard run (F3, F12): the conversation "studio-bookings", the held card in its history, the test
 * card reading Running, then Done, then "Verified" after the resumed turn. 1.5.0's real span was 4.63 s from the click
 * (TREATMENT §3.6 chain 9); the take rolls 15 s before Running (the person's own time, the click in the history).
 * Every plane of the place is a VIEW of this one take, on one clock (CR-11): the window (a slot: no published capture
 * shows the 2.0.0 conversation), the history (the held card's sentence) and the run (the test card's sentence, then
 * the receipt). PLACEHOLDER: 1.0.x stills cropped to what persists whatever the state (no buttons, no review badge),
 * so no frame shows a live button beside a verified run; the run's parts arrive with the card entrance on their events.
 */
export const TAKE_HSF: TakeManifest = {
  id: "HS-F",
  fps: 60,
  frames: 2400,
  w: 1160,
  h: 800,
  events: { history: 0, running: 900, done: 1068, verified: 1178 },
  views: {
    window: { w: SLOT.project.w, h: SLOT.project.h, slot: SLOT.project, place: "studio-bookings" },
    held: { w: HSF_VIEWS.held.w, h: HSF_VIEWS.held.h, place: "studio-bookings", stills: [{ from: 0, standIn: STILL.heldNote }] },
    run: {
      w: HSF_VIEWS.run.w,
      h: HSF_VIEWS.run.h,
      place: "studio-bookings",
      stills: [
        { from: 900, standIn: STILL.testsLine, rect: HSF_VIEWS.run.tests, entrance: true },
        { from: 1178, standIn: STILL.verifiedTop, rect: HSF_VIEWS.run.receipt, entrance: true },
      ],
    },
  },
  placeholder: true,
  note: "placeholder: 1.0.x stills cropped to persistent text; the 2.0.0 harness playback (timings from its event log) replaces them",
};

/** The slot for the climax's conversation "Kiln" (no published capture shows it). */
const KILN_SLOT: SlotStandIn = {
  kind: "slot",
  id: "kiln",
  captureId: "RS-W",
  label: "the conversation \"Kiln\": the question, the answer, Activity's make-and-check rows",
  w: 1160,
  h: 800,
  window: "pebble",
  standsFor: "G1, G2, B5",
};

/**
 * RS-W, the climax (G1, G2, G3, B5): the make-and-check rows are complete, then the kept card lands and the avatar
 * turns happy. PLACEHOLDER: the conversation "Kiln" is a slot; a 1.0.x card with two buttons stands in the kept card's
 * place ("Kept in Pebble's Toolbox · kiln_ramp_time", View code and Remove).
 */
export const TAKE_RSW: TakeManifest = {
  id: "RS-W",
  fps: 60,
  frames: 1500,
  w: 1160,
  h: 800,
  events: { rowsComplete: 120, cardLands: 450, happy: 462 },
  views: {
    conversation: { w: 1160, h: 800, slot: KILN_SLOT, place: "kiln" },
    // no published capture shows the kept card (1.7.0): a labelled slot at the 2.0.0 card's size, arriving on its event
    keptCard: { w: SLOT.keptCard.w, h: SLOT.keptCard.h, place: "kiln", stills: [{ from: 450, standIn: SLOT.keptCard, entrance: true }] },
  },
  placeholder: true,
  note: "placeholder: slots for the conversation and the kept card; the 2.0.0 take (one 1× take) replaces them",
};

/**
 * HS-G, the climax's first beat (G4): the conversation "Glaze" and Pebble's ask card, "Keep this tool in Pebble's
 * Toolbox?" with Discard and Keep, arriving (the product's own motion; the shared card entrance stands in for it).
 * PLACEHOLDER: slots (the Workshop's cards were never published). The climax opens on this take with the card
 * already arriving (CR-06: it opened on 16 blank frames of its slot).
 */
export const TAKE_HSG: TakeManifest = {
  id: "HS-G",
  fps: 60,
  frames: 1200,
  w: 1160,
  h: 800,
  events: { conversation: 0, card: 240 },
  views: {
    conversation: { w: 1160, h: 800, slot: { kind: "slot", id: "glaze", captureId: "HS-G", label: "the conversation \"Glaze\"", w: 1160, h: 800, window: "pebble", standsFor: "G4's conversation", place: "glaze" }, place: "glaze" },
    card: { w: SLOT.glazeCard.w, h: SLOT.glazeCard.h, place: "glaze", stills: [{ from: 240, standIn: SLOT.glazeCard, entrance: true }] },
  },
  placeholder: true,
  note: "placeholder: slots; the 2.0.0 harness capture replaces them",
};

/** HS-B3, ⌘K: the palette opens, "stealth" is typed, the row lights, Enter. PLACEHOLDER timings over a slot. */
export const TAKE_HSB3: TakeManifest = {
  id: "HS-B3",
  fps: 60,
  frames: 900,
  w: SLOT.workspace.w,
  h: SLOT.workspace.h,
  // the take rolls on the workspace before ⌘K, so the passage opens on it (CR-06: it opened on bare ground)
  events: { workspace: 0, opens: 120, typed: 204, lit: 216, enter: 246 },
  views: {
    workspace: { w: SLOT.workspace.w, h: SLOT.workspace.h, slot: SLOT.workspace, place: "workspace" },
    palette: { w: SLOT.palette.w, h: SLOT.palette.h, place: "workspace", stills: [{ from: 120, standIn: SLOT.palette, entrance: true }], slotStates: [{ from: 0, label: "" }, { from: 204, label: "typed: stealth" }, { from: 216, label: "Turn Stealth Lockdown on" }, { from: 246, label: "Enter" }] },
  },
  placeholder: true,
};

/**
 * RS-13: Stealth Lockdown turns on in the recording; the Dock icon leaves and the menu-bar icon becomes a filled pebble in
 * a ring (a third of a second apart in reality: the crane shows the Dock leaving at 1×, and arrives at the menu bar on
 * the icon's new state). The recording rolls 2.5 s before the switch. PLACEHOLDER timings over slots.
 */
export const TAKE_RS13: TakeManifest = {
  id: "RS-13",
  fps: 60,
  frames: 1200,
  w: 1440,
  h: 900,
  events: { switchOn: 130, dockLeaves: 150, iconChanges: 170 },
  views: {
    menuBar: { w: SLOT.menuBar.w, h: SLOT.menuBar.h, slot: SLOT.menuBar, place: "menu bar", slotStates: [{ from: 0, label: "Pebble's icon: the pebble" }, { from: 170, label: "now a filled pebble in a ring" }] },
    dock: { w: SLOT.dock.w, h: SLOT.dock.h, slot: SLOT.dock, place: "dock", slotStates: [{ from: 0, label: "Pebble's icon in the Dock" }, { from: 150, label: "Pebble's icon has left the Dock" }] },
  },
  placeholder: true,
};
