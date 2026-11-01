// S08 Pebble Remote (8.5 s, Night): "Pebble, in your pocket." The real Pebble Remote iPhone app (its own code, a DEBUG
// build in the iOS Simulator, talking to the app repository's own stand-in Mac with the film's sample world:
// data/remote.ts) in the motion system's <Device>. Nothing on the phone's screen is redrawn; the only overlay is one
// highlight ring on the Reviews badge.
//
// Seconds from the scene's start, at the nominal 8.5 s (was 9.0: the 0.5 s came out of the final hold, 'approved' stays
// at 7.0 s (2 Nov, REVIEW-2 S-7: 'approved' is now 5.8 s, see below); of the beats before it only three moved: the opener 0.1 s earlier (so it holds 1.7 s), the first push 0.1 s
// earlier (the move to the conversation now starts before its cut) and the small line 0.5 s earlier (it holds 1.65 s):
//
// 0.0   Night; "Pebble, in your pocket." lands while the phone rises (whoosh), tilted, and flattens. Far behind it, a
//       blurred, dimmed hint of the Mac (RS15-01, the quick chat being typed into) so "your Mac" reads.
// 0.0   The Pebble tab while Pebble works on the Mac (remote-pebble-tab 8.4 s →): Writing, Editing…
// 1.5   The approval arrives (9.9 s): "Needs your review", the red 1 on Reviews (a sage ring on the badge).
// 1.9   The camera pushes into the phone's top (the hero card and "1 item needs your review · Change slots.py"); the
//       phone's top edge and status bar stay in frame (16:9).
// 2.6   "Pebble Remote for iPhone."
// 3.0   Inside the move, the phone cuts to the conversation (remote-approval 16.75 s →): Pebble's diagnosis and the
//       edit card "Change slots.py · Apply Edit".
// 4.3   The camera pushes onto the card's buttons (lands 4.9).
// 4.75  Apply Edit is pressed (27.05 s; click), held 0.6 s at 1× (the button greys, its spinner turns); "Approve with
//       Face ID." (5.25).
// 5.35  A cut over the wait to the system Face ID prompt (29.20 s), held 0.45 s (REVIEW-2 S-7: the Simulator's sheet has
//       no glyph, so it never holds longer than 0.5 s).
// 5.8   Approved: a cut over the app's own re-layout (→ 33.65 s, the camera holding the card in place; shimmer), the
//       camera settles on the edit card, now "Done · Undo This Edit"; the take runs to 35.20 s (7.35), then holds.
// 5.9   "Open source. Build it with Xcode." (two lines at 64 px in 16:9, one line at 48 px in 4:5).
// 8.1   Both lines exit (0.22 s, accelerating): gone by 8.32 s, five frames (30 fps) before the last frame (8.467 s);
//       the master hard-cuts into Stealth on the bar at 8.5 s with nothing of this scene's type left on screen.
//
// The picture's edges (REVIEW-1 N1, no half-words at window edges): the phone is zoomed past the frame's top and
// bottom, so every shot shows a WINDOW of the screen (windowOf below): its soft edges (alpha 0 → 1 over 40 to 55 frame px)
// lie in the app's own empty rows, measured on the clips' frames, so no line of the app's text is ever cut or half
// faded. Above and below it the phone's display is the app's own black. The window also keeps the app's "Locked…
// [Unlock]" row (the app's C1 lock before the first Face ID) and the model chips out of frame.
//
// The layout (REVIEW-1 S12): in 16:9 the phone keeps its right edge 30 px inside the frame and grows leftwards, so the
// gap to the type (right edge 817 px for "Pebble Remote", 790 px for "Approve with") stays 60 px or more at every
// moment the type is on screen; in 4:5 the type is above the phone.
//
// Retime: longer than nominal → the slack goes to the last hold (the take runs on, then holds while the camera
// drifts); shorter → every beat moves earlier by the same factor (the footage plays up to 1.25× fast, never slower than
// 1×; the type is gone before the last frame at any length from 6.8 s up).
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { Device, FontGate, Headline, ScreenZoom, SfxTrack, Stage, useWindowSize, type SfxCue } from "../../components";
import { pick, useLayout, type Layout, type Rect } from "../../layout";
import { timeMap, type TimeMap } from "../../timeMap";
import { C, DUR, EASE } from "../../tokens";
import { useWorld } from "../../world";
import { REMOTE_CLIPS } from "../../data/remote";
import { TAKES } from "../../data/takes";
import type { SceneProps } from "../types";

export const S08_NOMINAL = 8.5;

/** Scene seconds at the nominal length (choreography time). */
export const S08_BEATS = {
  text1: 0.0, // 0.1 at 9.0 s; with the faster entrance below it is fully up by 0.61 s, so it holds 1.7 s
  phoneIn: 0.15,
  approvalArrives: 1.5, // remote-pebble-tab 9.9 s
  pushTop: 1.9, // 2.0 at 9.0 s: the move to the conversation now starts 0.15 s before its cut (below)
  text2: 2.6,
  cutToCard: 3.0, // remote-approval 16.75 s
  jumpToApply: 4.5, // remote-approval 26.80 s
  pushFace: 4.3, // the push onto the card's Apply Edit lands by 4.9 (REVIEW-2 S-7: the press is the pushed shot)
  applyEdit: 4.75, // 27.05 s; the pushed press holds 0.6 s (the button greys, its spinner turns: 27.05 → 27.65)
  text3: 5.25,
  faceId: 5.35, // a cut over the wait to the system Face ID prompt (29.20 s), held 0.45 s (REVIEW-2 S-7: 0.5 s at most)
  approved: 5.8, // a cut to the settled transcript, "Done · Undo This Edit" (33.65 s; was 7.0)
  smallLine: 5.9, // two lines at 64 px, and the type leaves at 8.1 s
  doneRuns: 7.35, // the take runs 1.55 s after "Done" (33.65 → 35.20, the layout unchanged), then holds; camera drift
  textOut: 8.1, // both lines start to exit; gone 0.22 s later (8.32 s), five frames before the last
} as const;
const B = S08_BEATS;

export const S08_MARKS = [
  { name: "the phone rises (whoosh)", s: B.phoneIn + 0.3 },
  { name: "the approval arrives (Reviews badge 1)", s: B.approvalArrives },
  { name: "Pebble Remote for iPhone. (text hit)", s: B.text2 },
  { name: "the conversation: Change slots.py · Apply Edit", s: B.cutToCard },
  { name: "Apply Edit pressed (click)", s: B.applyEdit },
  { name: "Face ID prompt (Approve with Face ID. lands at 5.25)", s: B.faceId },
  { name: "Open source. Build it with Xcode. (small line)", s: B.smallLine },
  { name: "approved: Done (shimmer)", s: B.approved },
  { name: "the type is gone (the last frame follows)", s: B.textOut + DUR.exit },
] as const;

/** The outgoing type is gone this long (2 frames at 30 fps) before the next line starts (REVIEW-1 M2). */
const TYPE_GAP = 0.07;
const exitBefore = (nextAt: number) => nextAt - DUR.exit - TYPE_GAP;

/* ---------- sound (exported for the master; placed here only when PLACE_SFX) ---------- */

export const PLACE_SFX = false;
const SFX = {
  whoosh: "launch/audio/sfx/sfx-whoosh-medium.wav",
  click: "launch/audio/sfx/sfx-click-soft-a.wav",
  shimmer: "launch/audio/sfx/sfx-shimmer.wav",
} as const;
/** each file's measured peak (kit.json measure.peak_time_s) */
const PEAK: Record<string, number> = { [SFX.whoosh]: 0.3575, [SFX.click]: 0.0022, [SFX.shimmer]: 0.0007 };
const peakAt = (src: string, event: number, db: number): SfxCue => ({
  src,
  at: +Math.max(0, event + 1 / 120 - (PEAK[src] ?? 0)).toFixed(4),
  db,
});

/** The scene's SFX for a scene length `durS` (seconds from the scene's start; `at` is the file's start). */
export const s08Sfx = (durS: number = S08_NOMINAL): SfxCue[] => {
  const kk = Math.min(1, Math.max(0.8, durS / S08_NOMINAL));
  return [
    peakAt(SFX.whoosh, (B.phoneIn + 0.3) * kk, -14), // the phone's rise, peak as it nears its place
    peakAt(SFX.click, B.applyEdit * kk, -12), // Apply Edit pressed (the button greys on this frame)
    peakAt(SFX.shimmer, B.approved * kk, -15), // approved: the prompt goes, "Done"
  ];
};

/* ---------- the footage ---------- */

const TAB = REMOTE_CLIPS["remote-pebble-tab"];
const APPROVAL = REMOTE_CLIPS["remote-approval"];
const SRC = { w: 1206, h: 2622 } as const;
const BADGE = { x: 791, y: 2416 }; // the red 1 on Reviews (reviewsBadge ROI), source px
const MAC = TAKES["RS15-01"];
const MAC_SRC_START = 4.0; // typing, sending, thinking: well before the usage line (15.38 s)

/** The phone's source time maps, in choreography seconds (scaled by kk at use). */
const tabTime = (kk: number): TimeMap => timeMap([[0, 8.4], [B.cutToCard * kk, 8.4 + B.cutToCard]], { head: 1, tail: 1 / kk });
const cardTime = (kk: number): TimeMap =>
  timeMap([[B.cutToCard * kk, 16.75], [B.jumpToApply * kk, 16.75 + (B.jumpToApply - B.cutToCard)]], { head: 1, tail: 1 / kk });
const applyTime = (kk: number): TimeMap =>
  timeMap(
    [
      [B.jumpToApply * kk, 26.8],
      [B.applyEdit * kk, 27.05],
    ],
    { head: 1, tail: 1 / kk },
  );
/** the system's Face ID prompt, fully shown from 29.15 s (the Simulator draws no glyph): 0.45 s of it, at 1× */
const faceTime = (kk: number): TimeMap => timeMap([[B.faceId * kk, 29.2], [B.approved * kk, 29.2 + (B.approved - B.faceId)]], { head: 1, tail: 0 });
const doneTime = (kk: number): TimeMap => timeMap([[B.approved * kk, 33.65], [B.doneRuns * kk, 35.2]], { head: 1, tail: 0 });

/* ---------- the windows: which rows of the app's screen show (REVIEW-1 N1) ---------- */

/**
 * A window on the screen, in the clip's own px (rows): alpha 0 at a0 rising to 1 at a1, 1 until b0, falling to 0 at b1.
 * The ramps lie inside the app's empty rows. Gaps measured on the clips' frames (edge density per row; px of the
 * 1206 × 2622 screen):
 *   Pebble tab, 10.5 s:  status bar 76–118 | gap 119–228 | "Ask for approval" 229–272 | … | "Change slots.py" 1224–1258 |
 *                        gap 1259–1401 | "Your Mac" 1402–1437
 *   conversation, 17–32 s: "Wrote the reply" 444–475 | gap 476–541 | "book() in studio_bookings/slots.py" 542–588 | … |
 *                        the card 838–1431 (the Face ID prompt 1074–1538) | "View Diff" 1499–1542 | gap 1543–1659 |
 *                        the "Needs your review" bar 1637–1766 | the lock row 1792–2034
 *   done, 33.65 s →:     "Context ready" 917–947 | gap 948–1013 | "book() in …" 1014–1060 | … | the card 1330–1770 |
 *                        "Turning it over 11 s" 1890–2036 | gap 2037–2084 | the model chips 2085–2120
 * The done layout is the conversation's, moved down by CARD_SHIFT (the card's header and title), so the windows line up
 * across the cut at "approved".
 */
interface Win {
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}
/** a window that shows the whole screen (the full-phone shot) */
const OPEN: Win = { a0: -2400, a1: -2300, b0: 5200, b1: 5300 };

/** how far the edit card's header moves down in the app's re-layout after the approval (32.70 → 33.65 s), source px */
const CARD_SHIFT = 473;

type Phase = "tab" | "card" | "done";
const windowOf = (L: Layout, phase: Phase): Win => {
  if (phase === "tab") {
    // 16:9: the top of the phone stays in frame (status bar and all), so only the bottom needs a ramp; 4:5: the phone's
    // top lies under the type, so the status bar is hidden too
    return pick(L, {
      "16x9": { a0: -400, a1: -300, b0: 1262, b1: 1325 },
      "4x5": { a0: 150, a1: 214, b0: 1262, b1: 1325 },
    });
  }
  if (phase === "card") return { a0: 484, a1: 538, b0: 1546, b1: 1620 };
  return { a0: 484 + CARD_SHIFT, a1: 538 + CARD_SHIFT, b0: 2022, b1: 2064 };
};

/* ---------- the camera on the phone ---------- */

/** A framing: `s` screen px per source px, the source point `f` placed at the frame point `p`. */
interface Shot {
  s: number;
  f: { x: number; y: number };
  p: { x: number; y: number };
}

/** The Device's width per unit of `s`: the display (1206 px) plus the band and bezel (3.8 % of the device's height). */
const DEV_W_PER_S = SRC.w + (0.038 / 0.962) * SRC.h;
const devW = (s: number) => DEV_W_PER_S * s;
/** 16:9: the phone's right edge, px at 1920 wide (30 px in from the frame's edge) */
const RIGHT = 1890;
/** a slow push so nothing holds dead still (0.4 %/s; the phone's right edge stays put in 16:9, see cameraAt) */
const DRIFT = 0.004;
/**
 * The ease of this scene's camera moves: a push that settles on a long tail like the film's (0.16, 1, 0.3, 1), but
 * with a gentler start. The film's own takes 31 % of a move in the first frame at 30 fps, which for the phone (its edges
 * travel up to 380 px) is a jump of 130 px, aliased across the frame by the 30-fps delivery and flagged by the
 * neighbour scan; this one takes 13 % at most (50 px), about what the camera ease (0.65, 0, 0.35, 1) takes at its fastest.
 */
const GLIDE = Easing.bezier(0.28, 0.5, 0.25, 1);

const shots = (L: Layout): Record<"full" | "top" | "card" | "face" | "done", Shot> => {
  const u = L.u;
  const P = (x: number, y: number) => ({ x: x * u, y: y * u });
  // a zoomed 16:9 shot: scale s, the source row f.y at the frame's middle, the phone's right edge at RIGHT
  const wide = (s: number, fy: number): Shot => ({ s: s * u, f: { x: 603, y: fy }, p: P(RIGHT - devW(s) / 2, 540) });
  // a zoomed 4:5 shot: centred, the source row f.y at frame row py
  const tall = (s: number, fy: number, py: number): Shot => ({ s: s * u, f: { x: 603, y: fy }, p: P(540, py) });
  return pick(L, {
    "16x9": {
      // full: the phone at 85 % of the frame's height (the display is 96.2 % of the device's height)
      full: { s: (0.85 * 1080 * 0.962 * u) / SRC.h, f: { x: 603, y: 1311 }, p: P(1290, 540) },
      // top: the display's top edge (source row 0) at frame row 80 (the phone's top edge at 40): the status bar, the
      // hero card and the review row, with 94 px of the frame under their last line
      top: wide(0.72, 639),
      // card, face: the window (rows 538–1546) centred on the frame; the face push is 7 % (the phone's width and the
      // type beside it allow no more: with the drift the gap to "Approve with" is 64 px at the end of that shot)
      card: wide(0.72, 1050),
      // (REVIEW-2 S-7) the push also moves down onto the card's buttons, Apply Edit in the frame's lower middle; the
      // window's rows 538–1546 stay inside the frame
      face: wide(0.77, 1130),
      done: wide(0.74, 1050 + CARD_SHIFT),
    },
    "4x5": {
      // full: the phone at 70 % of the frame's height, 47 px under the type (it was 75 %, 9 px under it)
      full: { s: (0.7 * 1350 * 0.962 * u) / SRC.h, f: { x: 603, y: 1311 }, p: P(540, 840) },
      top: tall(0.76, 760, 876),
      card: tall(0.72, 1050, 848),
      face: tall(0.76, 1050, 870),
      done: tall(0.73, 1050 + CARD_SHIFT, 853),
    },
  });
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Shot, b: Shot, t: number): Shot => ({
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),
  f: { x: lerp(a.f.x, b.f.x, t), y: lerp(a.f.y, b.f.y, t) },
  p: { x: lerp(a.p.x, b.p.x, t), y: lerp(a.p.y, b.p.y, t) },
});

/** The camera at choreography time `tc`: one push per action (rulings v1.1), drift between. */
const cameraAt = (L: Layout, tc: number): { shot: Shot; zoom: number } => {
  const S = shots(L);
  const moves: { at: number; dur: number; from: Shot; to: Shot }[] = [
    { at: B.pushTop, dur: 0.6, from: S.full, to: S.top },
    // the cut to the conversation lands 0.15 s into this move (the camera 55 % of the way), so from the cut on the whole
    // window is inside the frame and no row of the app is ever cut by the frame's edge
    { at: B.cutToCard - 0.15, dur: 0.6, from: S.top, to: S.card },
    { at: B.pushFace, dur: 0.6, from: S.card, to: S.face },
    // approved: the picture cuts to the settled transcript with the camera offset by the card's own move in the
    // re-layout, so the edit card stays in place while the prompt goes and "Done" appears; then it settles
    { at: B.approved, dur: 0.75, from: { ...S.face, f: { x: S.face.f.x, y: S.face.f.y + CARD_SHIFT } }, to: S.done },
  ];
  let shot = S.full;
  for (const m of moves) {
    if (tc < m.at) break;
    shot = mix(m.from, m.to, GLIDE(clamp01((tc - m.at) / m.dur)));
  }
  // how far the first push (the whole phone → its top) has gone: the windows and the Mac hint follow it, and stay at 1
  const zoom = GLIDE(clamp01((tc - B.pushTop) / 0.6));
  // the drift grows the phone about the framing point; in 16:9 the phone's right edge stays where the framing put it
  // (so the type's gap shrinks by 0.4 %/s of the phone's width at most), in 4:5 it grows about its centre
  const s = shot.s * (1 + DRIFT * tc);
  const p = L.portrait ? shot.p : { x: shot.p.x + (devW(shot.s) - devW(s)) / 2, y: shot.p.y };
  return { shot: { ...shot, s, p }, zoom };
};

/** The Device's centre and height for a framing (the display is the device minus the band and bezel, 3.8 % of H). */
const deviceFor = (shot: Shot) => {
  const sw = SRC.w * shot.s;
  const sh = SRC.h * shot.s;
  const cx = shot.p.x - (shot.f.x - SRC.w / 2) * shot.s;
  const cy = shot.p.y - (shot.f.y - SRC.h / 2) * shot.s;
  return { centre: { x: cx, y: cy }, height: sh / 0.962, sw };
};

/* ---------- pieces ---------- */

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** The Mac, far behind: a blurred, dimmed crop of a real take (RS15-01), clearly secondary. */
const MacHint: React.FC<{ zoom: number }> = ({ zoom }) => {
  const L = useLayout();
  const t = useT();
  const r: Rect = pick(L, {
    "16x9": { x: 520 * L.u, y: 70 * L.u, w: 1300 * L.u, h: 845 * L.u },
    "4x5": { x: 20 * L.u, y: 360 * L.u, w: 1040 * L.u, h: 676 * L.u },
  });
  const pin = EASE.enter(clamp01(t / 0.5));
  const sc = (1 + 0.004 * t) * lerp(1, 1.06, zoom);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        borderRadius: 18 * L.u,
        overflow: "hidden",
        opacity: pin * lerp(0.2, 0.12, zoom),
        transform: `scale(${sc.toFixed(5)})`,
        filter: `blur(${(22 * L.u).toFixed(1)}px)`,
      }}
    >
      <ScreenZoom
        src={MAC.file}
        srcSize={{ w: MAC.width, h: MAC.height }}
        srcStart={MAC_SRC_START}
        width={r.w}
        height={r.h}
        drift={0}
        motionBlur={false}
        edgeFade={false}
        grade={{ brightness: 0.55, saturate: 0.7 }}
      />
    </div>
  );
};

/** The sage ring on the Reviews badge as the approval arrives (a highlight over the real screen, never a redraw). */
const badgeRing = (kk: number) => (toView: (p: { x: number; y: number }) => { x: number; y: number }, scale: number, t: number) => {
  const p = clamp01((t - B.approvalArrives * kk) / 0.75);
  if (p <= 0 || p >= 1) return null;
  const c = toView(BADGE);
  const r = (70 + 90 * EASE.enter(p)) * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: c.x - r,
        top: c.y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        border: `${Math.max(1.5, 9 * scale).toFixed(2)}px solid ${C.sage}`,
        opacity: (1 - p) * 0.9,
      }}
    />
  );
};

/** The phone's screen: the clips, in the window of the app's rows that the current framing shows (see `Win`). */
const Screen: React.FC<{ kk: number; zoom: number }> = ({ kk, zoom }) => {
  const t = useT();
  const L = useLayout();
  const display = useWindowSize();
  const tc = t / kk;
  const common = { srcSize: SRC, drift: 0, motionBlur: false as const, edgeFade: false as const };

  let screen: ReactNode;
  let phase: Phase = "card";
  if (tc < B.cutToCard) {
    phase = "tab";
    screen = <ScreenZoom {...common} src={TAB.file} time={tabTime(kk)} srcDuration={TAB.durationS} overlay={badgeRing(kk)} />;
  } else if (tc < B.jumpToApply) {
    screen = <ScreenZoom {...common} src={APPROVAL.file} time={cardTime(kk)} srcDuration={APPROVAL.durationS} />;
  } else if (tc < B.faceId) {
    // the press, pushed: Apply Edit greys and its spinner turns (27.05 → 27.65, real time)
    screen = <ScreenZoom {...common} src={APPROVAL.file} time={applyTime(kk)} srcDuration={APPROVAL.durationS} />;
  } else if (tc < B.approved) {
    // a cut over the wait to the system's Face ID prompt, 0.45 s (REVIEW-2 S-7: the glyphless sheet never holds)
    screen = <ScreenZoom {...common} src={APPROVAL.file} time={faceTime(kk)} srcDuration={APPROVAL.durationS} />;
  } else {
    // approved: a cut from the prompt to the settled transcript (33.65), over the app's own fade and re-layout, so no
    // frame from the middle of the re-layout shows (the camera keeps the card in place)
    phase = "done";
    screen = <ScreenZoom {...common} src={APPROVAL.file} time={doneTime(kk)} srcDuration={APPROVAL.durationS} />;
  }

  // the window's rows → the display's px (the clip fills the display, k display px per source px); open while the whole
  // phone shows (the first shot), closing to the phase's window as the camera pushes in
  const k = (display?.w ?? SRC.w) / SRC.w;
  const target = windowOf(L, phase);
  const w: Win = {
    a0: lerp(OPEN.a0, target.a0, zoom),
    a1: lerp(OPEN.a1, target.a1, zoom),
    b0: lerp(OPEN.b0, target.b0, zoom),
    b1: lerp(OPEN.b1, target.b1, zoom),
  };
  const mask =
    zoom < 0.001
      ? undefined
      : `linear-gradient(to bottom, rgba(0,0,0,0) ${(w.a0 * k).toFixed(1)}px, #000 ${(w.a1 * k).toFixed(1)}px, #000 ${(w.b0 * k).toFixed(
          1,
        )}px, rgba(0,0,0,0) ${(w.b1 * k).toFixed(1)}px)`;
  return <div style={{ position: "absolute", inset: 0, WebkitMaskImage: mask, maskImage: mask }}>{screen}</div>;
};

/* ---------- the scene ---------- */

export const S08Remote: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const t = useT();
  const durS = (durationInFrames ?? compFrames) / fps;
  // shorter than nominal: everything earlier by the same factor; longer: the slack is the last hold
  const kk = Math.min(1, Math.max(0.8, durS / S08_NOMINAL));
  const tc = t / kk;
  const at = (s: number) => s * kk;

  const { shot, zoom } = cameraAt(L, tc);
  const dev = deviceFor(shot);

  // 4:5: the phone's top lies under the type, so while it is zoomed its body fades out above the first visible row
  // (16:9: the frame's own edges cut it, and the window keeps every row of the app clear of them)
  const z = zoom;
  const bodyMask = L.portrait
    ? `linear-gradient(to bottom, rgba(0,0,0,${(1 - z).toFixed(3)}) ${(395 * L.u).toFixed(1)}px, #000 ${lerp(395 * L.u, 440 * L.u, z).toFixed(1)}px)`
    : undefined;

  const text: { head: Rect; small: Rect; size: number; smallSize: number; smallText: string } = pick(L, {
    "16x9": {
      head: { x: 128 * L.u, y: 250 * L.u, w: 700 * L.u, h: 400 * L.u },
      small: { x: 128 * L.u, y: 690 * L.u, w: 700 * L.u, h: 170 * L.u },
      size: L.type.title,
      // 64 px (REVIEW-1 S9: 56 px or more); two lines, broken after the first sentence, so it fits the 700-px column
      smallSize: 64 * L.u,
      smallText: "Open source.\nBuild it with Xcode.",
    },
    "4x5": {
      head: { x: 64 * L.u, y: 70 * L.u, w: 952 * L.u, h: 250 * L.u },
      small: { x: 64 * L.u, y: 338 * L.u, w: 952 * L.u, h: 70 * L.u },
      size: L.type.title,
      // 48 px (REVIEW-1 S9: 40 px or more in 4:5), one line
      smallSize: 48 * L.u,
      smallText: "Open source. Build it with Xcode.",
    },
  });

  return (
    <FontGate>
      <Stage world="night" keyLight={pick(L, { "16x9": { x: 0.7, y: 0.36, r: 0.5 }, "4x5": { x: 0.5, y: 0.5, r: 0.6 } })}>
        <MacHint zoom={zoom} />
        <AbsoluteFill style={{ WebkitMaskImage: bodyMask, maskImage: bodyMask }}>
          <Device
            centre={dev.centre}
            height={dev.height}
            screenAspect={SRC.w / SRC.h}
            at={at(B.phoneIn)}
            flattenAt={at(B.phoneIn + 0.35)}
          >
            <Screen kk={kk} zoom={zoom} />
          </Device>
        </AbsoluteFill>
        <Headline
          text={"Pebble,\nin your pocket."}
          at={at(B.text1)}
          exitAt={at(exitBefore(B.text2))}
          stagger={0.05}
          lineStagger={0.06}
          dur={0.4}
          box={text.head}
          size={text.size}
          align="left"
          valign="bottom"
        />
        <Headline
          text={"Pebble Remote\nfor iPhone."}
          at={at(B.text2)}
          exitAt={at(exitBefore(B.text3))}
          entrance="blur"
          box={text.head}
          size={text.size}
          align="left"
          valign="bottom"
        />
        <Headline
          text={"Approve with\nFace ID."}
          at={at(B.text3)}
          exitAt={at(B.textOut)}
          box={text.head}
          size={text.size}
          align="left"
          valign="bottom"
        />
        <SmallLine text={text.smallText} at={at(B.smallLine)} exitAt={at(B.textOut)} box={text.small} size={text.smallSize} />
        {PLACE_SFX && <SfxTrack cues={s08Sfx(durS)} />}
      </Stage>
    </FontGate>
  );
};

const SmallLine: React.FC<{ text: string; at: number; exitAt: number; box: Rect; size: number }> = ({ text, at, exitAt, box, size }) => {
  const W = useWorld();
  return (
    <Headline
      text={text}
      at={at}
      exitAt={exitAt}
      entrance="blur"
      variant="support"
      box={box}
      size={size}
      color={W.ink2}
      align="left"
      valign="top"
    />
  );
};
