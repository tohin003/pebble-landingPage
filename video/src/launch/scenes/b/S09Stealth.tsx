// S09 "Stealth Lockdown" (the dusk night, this scene only), 9.05 s nominal (FIXES-2: 70.051–79.101 on the master: the
// music's groove thins at 72.05 and stops at 73.07, the breakdown hit at 73.41).
//
// 0.0   "Presenting?" over the ⌘K palette (RS13-03), open on the first frame (REVIEW-2 M-2: the empty field with Light,
//       Dark and System theme; not one frame of the first-run screen). On 4:5 the camera pushes in from the whole
//       palette to 1.95× on the field (0.3–0.7, REVIEW-4 S-3), from the first keystroke to the row lighting. "stealth"
//       is typed whole by 1.13 and the row "Turn Stealth Lockdown on" is lit: the shot ends on it (REVIEW-3 S-1).
// 1.3   The real recording (RS13-03 was made with screencapture, so Pebble's windows really leave it), cut in on the same
//       source moment, so its field reads "stealth" with the row lit: one continuous action. It opens in the palette
//       shot's own window, place, scale and slow push (REVIEW-4 S-3: the crop's foot 24 px under the palette's lower
//       border on 16:9, above the "Actions run at once…" line on 4:5, so the first-run "Connect a model" is never in
//       the pushed frame), and from 2.0 pulls back over 15 frames (0.5 s) while the window opens out to Pebble's whole
//       window (a 16:10 crop), whole from 2.5; the window leaves in one frame at 3.0 (on the music's stop): 1.7 s with
//       the window in it, 0.5 s of it whole. The wait before Return (a still picture: only the caret blinks) plays at
//       about 0.35×.
//       0.8 s of the desktop without it (REVIEW-3 M-1): the take's Finder window and the widgets behind are cut out and
//       filled from the wallpaper round them (a normalised blur: wallpaper texture, no window, no edge).
//       Frosted: the desktop calendar's dates beside the window, the Dock's date and badge. Nothing inside Pebble's
//       window (REVIEW-5 MUST-1): it shows exactly as recorded, first-run lines and iCloud notice included.
//       "Stealth Lockdown." and the honest line, word for word, enter WITH the recording and sit under it (3 lines at
//       56 px on 16:9; 4 lines at 44 px on 4:5), and stay through the Veil: 1.3 → 8.98 (7.68 s).
// 3.8   The recording leaves; the pebble (Pebble's own body) comes in above the honest line and puts on the Veil
//       (Pebble's own Veil code: a render, never called a recording).
// 8.2   The Veil pebble glides to S10's hand-off: its body centred at (0.5 W, 0.5 H), 12 % of the frame's height (kit
//       VEIL_HANDOFF), still from 8.8 to the last frame; the type leaves in the last 2 frames.
import { Sequence } from "remotion";
import { fitRegion, type Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { cues, look, lookBack, pose, VeilPebble } from "../../components/PebbleActor";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { eventS, TAKES } from "../../data/takes";
import { useLayout, type Layout, type Rect } from "../../layout";
import { fromRamps } from "../../timeMap";
import { C, EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { lerp, lerpRect, MaskedZoom, pebbleAt, R, ramp, sfxAt, sfxSrc, useSceneTime, VEIL_HANDOFF, type Mask, type SfxNote } from "./kit";

export const S09_NOMINAL = 9.05;

/** Stealth Lockdown's honest line, word for word (TREATMENT §3, CLAUDE.md). Never shorten or split it. */
export const HONEST_LINE =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

const T = TAKES["RS13-03"];
const SIZE = { w: T.width, h: T.height };
const PALETTE_OPENS = eventS("RS13-03", "paletteOpens");
const ROW_LIT = eventS("RS13-03", "typeA");
const RETURN = eventS("RS13-03", "returnKey");
const LEAVE = eventS("RS13-03", "windowsLeave");
const DOCK_GONE = eventS("RS13-03", "dockIconGone");
const DOCK_CLOSED = eventS("RS13-03", "dockClosed");

/** the beats, scene seconds at nominal */
/** the pebble comes in only once the recording has gone (it must never read as inside the capture) */
/**
 * The director's ruling (2 Nov): the title and the honest line stay to the last frames and leave only in the final 2
 * (at 30 fps), since S10 sheds the Veil (Stealth turning off) in its first 0.6 s. The recording leaves at 4.3 so the
 * locked-off empty desktop never holds dead still for more than 1 s.
 */
/** REVIEW-4 S-3: the pull-back runs 2.0–2.5 (15 frames at 30 fps), so the whole window holds 0.5 s before the vanish */
const AT = { strip: 1.3, pullS: 0.5, whole: 2.5, vanish: 3.0, stripOut: 3.8, pebble: 4.2, veil: 4.6, glide: 8.2, glideS: 0.6, typeOut: S09_NOMINAL - 2 / 30 } as const;
/** the recording's lead before the vanish (REVIEW-3 S-1: the window on screen ≥ 1.2 s; the vanish still on the music's stop at 3.0) */
const LEAD = AT.vanish - AT.strip;

/**
 * The palette: opened at 4.4 (f264), "stealth" typed 5.2–6.433, the row lit from 5.8. Never below 1× while anything
 * moves (a screencapture conform). It starts on 4.433, two frames after it opened, so frame 0 is the palette (REVIEW-2
 * M-2): the empty field at 2.5×, the typing at 1.5×, then real time on "stealth" and the lit row to the cut.
 */
const PAL_IN = 4.433;
const TYPED = eventS("RS13-03", "typeH");
const palTime = fromRamps(
  [
    { s0: PAL_IN, s1: 5.2, speed: 2.5 },
    { s0: 5.2, s1: TYPED, speed: 1.5 },
  ],
  { tail: 1 },
);
/** the source moment of the cut: the recording starts on the palette shot's next source frame (REVIEW-3 S-1) */
const CUT_SRC = palTime.at(AT.strip);
/**
 * The recording: from CUT_SRC, the still wait before Return (6.45–7.18: nothing moves but the caret) slowed so the
 * window is on screen for LEAD (≥ 1.2 s); real time from 7.17 (Return 7.2, the leave 7.233).
 */
const WAIT_END = 7.17;
const WAIT_SPEED = (WAIT_END - CUT_SRC) / (LEAD - (LEAVE - WAIT_END));
const stripTime = fromRamps(
  [
    { s0: CUT_SRC, s1: WAIT_END, speed: WAIT_SPEED },
    { s0: WAIT_END, s1: LEAVE + 2.6, speed: 1 },
  ],
  { ramp: 0.05, tail: 1 },
);

/**
 * The palette in the take (source px, measured on f397): its outer border 1163–2280 × 317–706; the field 329–427; the
 * lit row 437–527 ("Turn Stealth Lockdown on", SF Pro 12 pt: a 17-px cap, 460–476); "Settings: Privacy & Stealth" and
 * "Open Settings" 548–599; the note "Actions run at once…" 646–691. Under it, the first-run "Connect a model" card
 * from y 757: never in the palette's frame. The empty field's placeholder runs 1211–1943.
 *
 * The palette shot's windows (reference px) and cameras: the take's point `src` sits at the frame's point `at`, `k`
 * frame px per take px (reference px).
 * - 16:9: the palette's own crop at 1.04 (REVIEW-3 S-1), its foot 24 px under the palette's lower border (REVIEW-4
 *   S-3: 655 against the border's 630 through the push).
 * - 4:5 (REVIEW-4 S-3): the shot opens on REVIEW-3's whole palette (0.877, as in draft 5), so the empty field's
 *   placeholder is whole while it shows (to 0.31). As "s" is typed the camera pushes in over 0.4 s (on the camera
 *   ease, arriving as the row lights at 0.71) to 1.95× about the field's left end (40, 380). REVIEW-4 asked 1.8× for
 *   "Turn Stealth Lockdown on" at ≥ 40 px: 1.8× sets it at 38 px, 1.95× at 41 px. The window keeps the 40-px margins,
 *   so its right edge crops the field and the lit row after their words; its foot (826) sits midway between "Open
 *   Settings" (785) and the note (866), so no sentence is cut.
 */
const PAL16 = { rect: { x: 366, y: 210, w: 1186, h: 445 }, src: { x: 1150, y: 305 }, k: 1186 / 1140 } as const;
const PAL45 = {
  /** REVIEW-3's whole palette: the take's (1150, 305) at (40, 330) */
  from: { x: 40, y: 330, w: 1000, h: 347 },
  /** the big palette: `from` scaled 1.95× about `at`, the foot cropped above the note */
  to: { x: 40, y: 282, w: 1000, h: 544 },
  /** the field's left end: the take's (1150, 362) stays on it */
  at: { x: 40, y: 380 },
  src: { x: 1150, y: 362 },
  k: 1000 / 1140,
  f: 1.95,
  /** from the first keystroke (0.31) to the row lighting (0.71): the placeholder is gone before the window crops it */
  push: { at: 0.3, dur: 0.4 },
} as const;
/** the palette shot's slow push (per second, as ScreenZoom's drift): the recording's push continues it */
const PAL_DRIFT = 0.01;
const scaleRect = (r: Rect, u: number): Rect => ({ x: r.x * u, y: r.y * u, w: r.w * u, h: r.h * u });

/** The palette shot's window (frame px) and camera (the take's px) at scene time `t`. */
const palCam = (t: number, portrait: boolean, u: number): { rect: Rect; box: Box } => {
  const d = Math.exp(PAL_DRIFT * Math.max(0, t));
  if (!portrait) {
    // ScreenZoom's drift: the box shrinks about its centre
    const P = PAL16;
    const w = P.rect.w / P.k;
    const h = P.rect.h / P.k;
    return { rect: scaleRect(P.rect, u), box: { x: P.src.x + (w - w / d) / 2, y: P.src.y + (h - h / d) / 2, w: w / d, h: h / d } };
  }
  // the push and the slow push both about the field's left end; the window's edges move with the push
  const P = PAL45;
  const p = EASE.camera(Math.min(1, Math.max(0, (t - P.push.at) / P.push.dur)));
  const k = P.k * Math.pow(P.f, p) * d;
  const r = lerpRect(P.from, P.to, p);
  return { rect: scaleRect(r, u), box: { x: P.src.x + (r.x - P.at.x) / k, y: P.src.y + (r.y - P.at.y) / k, w: r.w / k, h: r.h / k } };
};
/**
 * REVIEW-2 S-4: a 16:10 crop (1.61) holding Pebble's whole window (310–2940 × 124–1730), under the menu bar (the clock,
 * the recording pill) and above the Dock (from y ≈ 1735: its dated icon and badge stay out).
 */
const STRIP = (_portrait: boolean): Box => ({ x: 296, y: 100, w: 2644, h: 1640 });

/**
 * The recording's window (frame px), camera (the take's px) and soft edges at scene time `t` (REVIEW-4 S-3).
 * - The push (the cut to the pull): the palette shot's own window and camera, its slow push continued, so the cut on
 *   "stealth" and the lit row matches exactly (REVIEW-3 S-1's one action) and nothing under the palette is in frame.
 * - The pull-back (15 frames on the move ease, so every frame moves): the camera zooms out about the one frame point
 *   both framings share (log scale), while the window's edges open out to the whole-window crop; the view never leaves
 *   that crop (no menu bar, no Dock, no calendar dates).
 * - The palette shot's soft crop edges (ScreenZoom's "auto": 6 % of the window's shorter side) carry through the cut
 *   and fade out during the pull: the whole window and the after-state keep hard edges.
 */
const recShot = (t: number, M: { pull: number; whole: number }, strip: Rect, portrait: boolean, L: Layout) => {
  const fade = (r: Rect, k: number) => (0.06 * Math.min(r.w, r.h) * k * 1080) / L.H;
  const p = EASE.move(Math.min(1, Math.max(0, (t - M.pull) / Math.max(1e-6, M.whole - M.pull))));
  if (p <= 0) {
    const c = palCam(t, portrait, L.u);
    return { ...c, edgeFade: fade(c.rect, 1) };
  }
  const s = fitRegion(STRIP(portrait), { w: strip.w, h: strip.h }, SIZE);
  if (p >= 1) return { rect: strip, box: s, edgeFade: false as const };
  // source → frame on each camera: frame = A + source × k
  const a = palCam(M.pull, portrait, L.u);
  const ka = a.rect.w / a.box.w;
  const Aa = { x: a.rect.x - a.box.x * ka, y: a.rect.y - a.box.y * ka };
  const ks = strip.w / s.w;
  const As = { x: strip.x - s.x * ks, y: strip.y - s.y * ks };
  // the zoom's fixed point: the take's point both cameras put on the same frame point
  const S = { x: (As.x - Aa.x) / (ka - ks), y: (As.y - Aa.y) / (ka - ks) };
  const F = { x: Aa.x + S.x * ka, y: Aa.y + S.y * ka };
  const k = Math.exp(Math.log(ka) + (Math.log(ks) - Math.log(ka)) * p);
  const A = { x: F.x - S.x * k, y: F.y - S.y * k };
  const rect = lerpRect(a.rect, strip, p);
  return { rect, box: { x: (rect.x - A.x) / k, y: (rect.y - A.y) / k, w: rect.w / k, h: rect.h / k }, edgeFade: fade(a.rect, 1 - p) };
};
/** what Pebble's window leaves behind, cut out and filled from the wallpaper round it (REVIEW-3 M-1), source px */
const AFTER_HOLES: Box[] = [
  { x: 230, y: 40, w: 170, h: 420 }, // the calendar widget's right part (dates)
  { x: 230, y: 420, w: 360, h: 410 }, // the Photos widget ("…appear here when they… processing")
  { x: 480, y: 215, w: 1990, h: 1000 }, // the take's own pebble-takes Finder window, with its shadow
];
// REVIEW-5 MUST-1: nothing inside Pebble's window is masked. Its left edge is the take's x 311 (its dark outline; the
// light border 312–313, the body from 314), so the calendar's mask stops at 310. It ran to 380 and frosted the red
// close button and the left halves of the logo and of "+ New conversation". The frosts over Pebble's iCloud notice and
// the first-run "Connect a model" lines are gone: none of them is private (TREATMENT §5).
const STRIP_MASKS: Mask[] = [
  { box: { x: 270, y: 90, w: 40, h: 350 }, s0: 0, s1: LEAVE, px: 24, backing: "#2a2f2b" }, // the desktop calendar widget's right edge (dates; behind the window until it leaves), up to the window's outline
  ...AFTER_HOLES.map((box): Mask => ({ box, s0: LEAVE, s1: 99, kind: "wallpaper", px: 420 })),
  { box: { x: 1178, y: 1755, w: 176, h: 120 }, s0: 0, s1: DOCK_CLOSED, px: 22 }, // the Dock's dated Calendar icon
  { box: { x: 1226, y: 1755, w: 176, h: 120 }, s0: DOCK_CLOSED, s1: 99, px: 22 }, // … after the Dock closes up (≈ 50 px right)
  { box: { x: 1938, y: 1746, w: 58, h: 62 }, s0: 0, s1: DOCK_CLOSED, px: 22 }, // the System Settings badge
  { box: { x: 1986, y: 1746, w: 58, h: 62 }, s0: DOCK_CLOSED, s1: 99, px: 22 }, // … after the Dock closes up
];

/** 4:5: the window-and-line group moved down so its centre sits at 50 % of the height (REVIEW-3 S-2) */
const DOWN45 = 79;
/** the layout: reference px (1920 × 1080, 1080 × 1350) */
const frame09 = (L: Layout) =>
  L.portrait
    ? {
        // "Presenting?" above the palette's window (REVIEW-4 S-3: after the push, the window's top is at 282)
        ask: R(L, 64, 100, 952, 160),
        // REVIEW-3 S-2: the window and the type as one group centred at 50 % of the height
        strip: R(L, 54, 96 + DOWN45, 972, 604),
        title: R(L, 64, 790 + DOWN45, 952, 84),
        line: R(L, 64, 894 + DOWN45, 952, 300),
        askSize: L.px(104),
        titleSize: L.px(68),
        lineSize: L.px(44),
        up: { x: 0.5, y: (96 + DOWN45 + 302) / 1350, h: 0.17 },
      }
    : {
        ask: R(L, 128, 36, 1664, 150),
        strip: R(L, 362, 22, 1196, 742),
        title: R(L, 128, 774, 1664, 84),
        line: R(L, 150, 862, 1620, 210),
        askSize: L.px(120),
        titleSize: L.px(68),
        lineSize: L.px(56),
        up: { x: 0.5, y: 0.36, h: 0.2 },
      };

export const s09Moments = (lenS: number) => {
  const k = lenS / S09_NOMINAL;
  const strip = AT.strip * k;
  return {
    k,
    palette: palTime.inv(PALETTE_OPENS),
    // the row lights just after the cut, in the recording (the palette shot ends on 5.783)
    rowLit: palTime.inv(ROW_LIT) < strip ? palTime.inv(ROW_LIT) : strip + stripTime.inv(ROW_LIT),
    strip,
    pull: strip + (AT.whole - AT.pullS - AT.strip) * k,
    whole: strip + (AT.whole - AT.strip) * k,
    ret: strip + stripTime.inv(RETURN),
    leave: strip + stripTime.inv(LEAVE),
    dockGone: strip + stripTime.inv(DOCK_GONE),
    stripOut: AT.stripOut * k,
    pebble: AT.pebble * k,
    veilOn: AT.veil * k,
    glide: lenS - (S09_NOMINAL - AT.glide),
    typeOut: lenS - (S09_NOMINAL - AT.typeOut),
  };
};

export const S09_SFX = (lenS: number): SfxNote[] => {
  const M = s09Moments(lenS);
  return [
    { name: "click", s: M.ret, db: -17, what: "Return (Turn Stealth Lockdown on)" },
    { name: "whooshB", s: M.leave, db: -22, what: "Pebble's window leaves the recording (soft, on the music's stop)" },
    { name: "pop", s: M.pebble + 0.06, db: -20, what: "the pebble comes in" },
    { name: "shimmer", s: M.veilOn + 0.35, db: -19, what: "the Veil settles on the pebble" },
  ];
};

export const S09Stealth: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const G = frame09(L);
  const { t, lenS, f, fps } = useSceneTime(S09_NOMINAL, durationInFrames);
  const M = s09Moments(lenS);
  const pre = Math.round(fps);

  /* the pebble: comes in above the type, then glides to S10's hand-off and holds there */
  const pg = ramp(t, M.glide, AT.glideS, EASE.camera);
  const place = { x: lerp(G.up.x, VEIL_HANDOFF.x, pg), y: lerp(G.up.y, VEIL_HANDOFF.y, pg), h: lerp(G.up.h, VEIL_HANDOFF.h, pg) };
  const pin = ramp(t, M.pebble, 0.22, EASE.enter);
  const P = pebbleAt({ ...place, h: place.h * lerp(0.9, 1, pin) }, L.W, L.H);
  const sfx = S09_SFX(lenS);
  /* the palette shot (on 4:5 pushed in from the whole palette), then the recording in the same window and camera through
     the cut, and its pull-back to the whole window (REVIEW-4 S-3) */
  const pal = palCam(t, L.portrait, L.u);
  const rec = recShot(t, M, G.strip, L.portrait, L);
  // the camera across the shutter (180°: half a frame), so ScreenZoom's camera blur smears the fast push and pull-back;
  // held framings (the drift, the whole window) stay sharp. Keys in the ScreenZoom's own time (its Sequence starts at t0).
  const open = 0.5 / fps;
  const shutterKeys = (cam: (s: number) => { box: Box }, t0: number) => [
    { t: t - t0 - open, box: cam(t - open).box },
    { t: t - t0, box: cam(t).box, dur: open, ease: EASE.linear },
  ];
  const palKeys = shutterKeys((s) => palCam(s, L.portrait, L.u), 0);
  const recKeys = shutterKeys((s) => recShot(s, M, G.strip, L.portrait, L), f(M.strip) / fps);

  return (
    <FontGate>
      <Stage world="night" tint="dusk" keyLight={{ x: 0.5, y: lerp(G.up.y, VEIL_HANDOFF.y, pg), r: 0.6 }}>
        {/* the palette, cropped to itself */}
        <Sequence durationInFrames={f(M.strip)} name="RS13-03 · the palette">
          <FloatingWindow rect={pal.rect} enter="none" spill={0} background="#151A17">
            <ScreenZoom src={T.file} srcSize={SIZE} time={palTime} srcDuration={T.durationS} keys={palKeys} drift={0} />
          </FloatingWindow>
          <Headline text="Presenting?" at={0.06} exitAt={M.strip - 0.3} exit="fade" entrance="ink" size={G.askSize} align="center" valign="middle" box={G.ask} />
        </Sequence>

        {/* the recording, locked off: the window leaves it */}
        <Sequence from={f(M.strip)} durationInFrames={f(M.stripOut + 0.35) - f(M.strip)} premountFor={pre} name="RS13-03 · the recording">
          <FloatingWindow rect={rec.rect} enter="none" spill={0} exitAt={M.stripOut - M.strip} background="#151A17">
            <MaskedZoom src={T.file} srcSize={SIZE} time={stripTime} srcDuration={T.durationS} keys={recKeys} drift={0} motionBlur={6} edgeFade={rec.edgeFade} masks={STRIP_MASKS} />
          </FloatingWindow>
        </Sequence>

        {/* the title and the honest line: with the recording, under it, through the Veil */}
        <Sequence from={f(M.strip)} name="Stealth Lockdown + the honest line">
          <Headline text="Stealth Lockdown." at={0} exitAt={M.typeOut - M.strip} exit="cut" entrance="line" size={G.titleSize} align="center" valign="middle" box={G.title} color={C.stone0} />
          <Headline
            text={HONEST_LINE}
            at={0.08}
            exitAt={M.typeOut - M.strip}
            exit="cut"
            entrance="line"
            variant="support"
            wrap
            balance
            size={G.lineSize}
            align="center"
            valign="top"
            box={G.line}
            color={C.stone1}
          />
        </Sequence>

        {/* the Veil pebble (Pebble's own Veil code), then S10's hand-off */}
        <Sequence from={f(M.pebble)} premountFor={pre} name="the Veil">
          <VeilPebble
            x={P.x}
            y={P.y}
            size={P.size}
            initial={false}
            veil={[{ at: M.veilOn - M.pebble, on: true }]}
            cues={cues(pose(0, "idle"), look(0.9, 0, 0.55), lookBack(M.glide - M.pebble - 0.4))}
            // S10 draws its Veil pebble without the glow (scenes/d VeilShed): it fades as the pebble glides to the hand-off
            glow={Math.min(1, Math.max(0, (t - M.veilOn) / 0.8)) * (1 - pg)}
            opacity={pin}
          />
        </Sequence>
      </Stage>

      {sfx.map((c) => (
        <Sfx key={`${c.name}-${c.s.toFixed(3)}`} src={sfxSrc(c.name)} at={sfxAt(c.name, c.s)} db={c.db} />
      ))}
    </FontGate>
  );
};
