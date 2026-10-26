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
export const COMPANION_PANEL = { src: "ui-frames/pet-live-error-light-hidden/00120.png", w: 384, h: 456, stone: { x: 326.7, y: 397.3 } } as const;

/**
 * RS-9, the one continuous browser take (TREATMENT §6): the companion's card, Allow, the receipt, Pebble's tab, the
 * results, the video starting, the reply. PLACEHOLDER timings inside §3.6 chain 3 (8–13 s from the Allow to the reply).
 * Two views: the companion's card (a real 1.0.x card standing in for "Use youtube.com", then a receipt) and the browser
 * (a slot: no published capture of it exists; it shows the take's source time ticking at 1×).
 */
export const TAKE_RS9: TakeManifest = {
  id: "RS-9",
  fps: 60,
  frames: 2400,
  w: 2880,
  h: 1800,
  events: { card: 300, allow: 540, receipt: 566, tabOpens: 690, results: 830, press: 1100, videoStarts: 1190, reply: 1290 },
  views: {
    companionCard: {
      w: 396,
      h: 275,
      stills: [
        { from: 0, to: 566, standIn: STILL.companionCard, rect: { x: 0, y: 0, w: 396, h: 275 } },
        { from: 566, standIn: STILL.doneReceipt, rect: { x: 0, y: 66, w: 396, h: 143.6 }, entrance: true },
      ],
    },
    browser: { w: SLOT.browser.w, h: SLOT.browser.h, slot: SLOT.browser },
  },
  placeholder: true,
  note: "placeholder timings; the 2.0.0 recording's event log replaces them",
};

/**
 * HS-F, Ring 4's AgentGuard run (F3, F12): the test card reading Running, then Done, then "Verified" after the resumed
 * turn. 1.5.0's real span was 4.63 s from the click (TREATMENT §3.6 chain 9). PLACEHOLDER: 1.0.x stills; the tests card
 * stands for Running and Done, the done receipt (cropped below its timing line) for Verified.
 */
export const TAKE_HSF: TakeManifest = {
  id: "HS-F",
  fps: 60,
  frames: 1200,
  w: 726,
  h: 640,
  events: { running: 0, done: 168, verified: 278 },
  views: {
    run: {
      w: 726,
      h: 640,
      stills: [
        { from: 0, standIn: STILL.testsCard, rect: { x: 0, y: 0, w: 495, h: 344 }, entrance: true },
        { from: 278, standIn: STILL.doneReceipt, rect: { x: 0, y: 380, w: 684, h: 248 }, entrance: true },
      ],
    },
  },
  placeholder: true,
  note: "placeholder: 1.0.x stills; the 2.0.0 harness playback (timings from its event log) replaces them",
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
    conversation: { w: 1160, h: 800, slot: KILN_SLOT },
    keptCard: { w: 495, h: 474, stills: [{ from: 450, standIn: STILL.commandCard, rect: { x: 0, y: 0, w: 495, h: 474 }, entrance: true }] },
  },
  placeholder: true,
  note: "placeholder: a 1.0.x card in the kept card's place; the 2.0.0 take (one 1× take) replaces it",
};

/** HS-B3, ⌘K: the palette opens, "stealth" is typed, the row lights, Enter. PLACEHOLDER timings over a slot. */
export const TAKE_HSB3: TakeManifest = {
  id: "HS-B3",
  fps: 60,
  frames: 600,
  w: SLOT.palette.w,
  h: SLOT.palette.h,
  events: { opens: 0, typed: 84, lit: 96, enter: 126 },
  views: { palette: { w: SLOT.palette.w, h: SLOT.palette.h, slot: SLOT.palette } },
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
    menuBar: { w: SLOT.menuBar.w, h: SLOT.menuBar.h, slot: SLOT.menuBar },
    dock: { w: SLOT.dock.w, h: SLOT.dock.h, slot: SLOT.dock },
  },
  placeholder: true,
};
