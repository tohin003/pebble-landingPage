// S09 "Stealth Lockdown" (the dusk night, this scene only), 9.05 s nominal (FIXES-2: 70.051–79.101 on the master: the
// music's groove thins at 72.05 and stops at 73.07, the breakdown hit at 73.41).
//
// 0.0   "Presenting?" over the ⌘K palette (RS13-03), open on the first frame (REVIEW-2 M-2: the empty field with Light,
//       Dark and System theme; not one frame of the first-run screen). "stealth" is typed whole by 1.13 and the row
//       "Turn Stealth Lockdown on" is lit: the shot ends on it (REVIEW-3 S-1).
// 1.3   The real recording (RS13-03 was made with screencapture, so Pebble's windows really leave it), cut in on the same
//       source moment, so its field reads "stealth" with the row lit: one continuous action. It opens pushed in on the
//       palette (2.3×; on 4:5 at nearly the palette shot's own place and size), pulls back over 0.5 s to Pebble's whole
//       window (a 16:10 crop) by 2.7, and the window leaves in one frame at 3.0 (on the music's stop): 1.7 s with the
//       window in it. The wait before Return (a still picture: only the caret blinks) plays at about 0.35×.
//       0.8 s of the desktop without it (REVIEW-3 M-1): the take's Finder window and the widgets behind are cut out and
//       filled from the wallpaper round them (a normalised blur: wallpaper texture, no window, no edge).
//       Frosted: Pebble's iCloud notice and its first-run chips, the Dock's date and badge.
//       "Stealth Lockdown." and the honest line, word for word, enter WITH the recording and sit under it (3 lines at
//       56 px on 16:9; 4 lines at 44 px on 4:5), and stay through the Veil: 1.3 → 8.98 (7.68 s).
// 3.8   The recording leaves; the pebble (Pebble's own body) comes in above the honest line and puts on the Veil
//       (Pebble's own Veil code: a render, never called a recording).
// 8.2   The Veil pebble glides to S10's hand-off: its body centred at (0.5 W, 0.5 H), 12 % of the frame's height (kit
//       VEIL_HANDOFF), still from 8.8 to the last frame; the type leaves in the last 2 frames.
import { Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { cues, look, lookBack, pose, VeilPebble } from "../../components/PebbleActor";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { eventS, TAKES } from "../../data/takes";
import { useLayout, type Layout } from "../../layout";
import { fromRamps } from "../../timeMap";
import { C, EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { lerp, MaskedZoom, pebbleAt, R, ramp, sfxAt, sfxSrc, useSceneTime, VEIL_HANDOFF, type Mask, type SfxNote } from "./kit";

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
const AT = { strip: 1.3, pullS: 0.5, whole: 2.7, vanish: 3.0, stripOut: 3.8, pebble: 4.2, veil: 4.6, glide: 8.2, glideS: 0.6, typeOut: S09_NOMINAL - 2 / 30 } as const;
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

/** the palette alone (input, rows, its note): no first-run card (it starts at y 758) */
const PAL = (portrait: boolean): Box => (portrait ? { x: 1150, y: 305, w: 1140, h: 396 } : { x: 1150, y: 305, w: 1140, h: 415 });
/**
 * REVIEW-2 S-4: a 16:10 crop (1.61) holding Pebble's whole window (310–2940 × 124–1730), under the menu bar (the clock,
 * the recording pill) and above the Dock (from y ≈ 1735: its dated icon and badge stay out).
 */
const STRIP = (_portrait: boolean): Box => ({ x: 296, y: 100, w: 2644, h: 1640 });
/**
 * REVIEW-3 S-2 (and S-1's "the less of the first-run state, the better"): the recording opens pushed in on the palette
 * (2.3× the whole window on 4:5, 2.3× on 16:9), at the palette shot's own place and scale, so the field and the lit row
 * match across the cut (4:5 at ×0.97, so the palette's right edge stays in; the window's top edge as the crop's top).
 */
const pushMatch = (portrait: boolean, pal: { x: number; y: number; w: number }, strip: { x: number; y: number; w: number; h: number }): Box => {
  const P = PAL(portrait);
  const k = (pal.w / P.w) * (portrait ? 0.97 : 1); // view px per source px
  const w = strip.w / k;
  const h = strip.h / k;
  const x = P.x - (pal.x - strip.x) / k;
  const y = Math.max(124, P.y - (pal.y - strip.y) / k); // from the window's top edge (no menu bar, no wallpaper above it)
  return { x, y, w, h };
};
/** what Pebble's window leaves behind, cut out and filled from the wallpaper round it (REVIEW-3 M-1), source px */
const AFTER_HOLES: Box[] = [
  { x: 230, y: 40, w: 170, h: 420 }, // the calendar widget's right part (dates)
  { x: 230, y: 420, w: 360, h: 410 }, // the Photos widget ("…appear here when they… processing")
  { x: 480, y: 215, w: 1990, h: 1000 }, // the take's own pebble-takes Finder window, with its shadow
];
const STRIP_MASKS: Mask[] = [
  { box: { x: 1240, y: 1280, w: 1400, h: 120 }, s0: 0, s1: LEAVE, px: 22, backing: "#1b1f1c" }, // Pebble's iCloud notice ("Your Documents folder syncs with iCloud Drive…"): noise (REVIEW-2 S-4)
  { box: { x: 270, y: 90, w: 110, h: 350 }, s0: 0, s1: LEAVE, px: 24, backing: "#2a2f2b" }, // the desktop calendar widget's right edge (dates; behind the window until it leaves)
  ...AFTER_HOLES.map((box): Mask => ({ box, s0: LEAVE, s1: 99, kind: "wallpaper", px: 420 })),
  { box: { x: 1360, y: 1572, w: 300, h: 48 }, s0: 0, s1: LEAVE, px: 18, backing: "#1b1f1c" }, // the composer's "Connect a model…" (first-run)
  { box: { x: 1620, y: 1664, w: 336, h: 42 }, s0: 0, s1: LEAVE, px: 18, backing: "#141715" }, // the footer's "Connect a model in Settings"
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
        // the palette sits where the recording's push shows it (the window's top edge as its crop: REVIEW-3 S-1, S-2)
        ask: R(L, 64, 135, 952, 160),
        pal: R(L, 40, 330, 1000, 347),
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
        // the palette where the recording's push shows it (1.04 frame px per take px: REVIEW-3 S-1's one action)
        ask: R(L, 128, 36, 1664, 150),
        pal: R(L, 366, 210, 1186, 432),
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
  /* the recording's camera: pushed in on the palette, then the whole window from 0.3 s before it leaves */
  const pushBox = pushMatch(L.portrait, G.pal, G.strip);
  const keysStrip = [
    { t: 0, box: pushBox },
    { t: M.pull - M.strip, box: pushBox },
    { t: M.whole - M.strip, box: STRIP(L.portrait), dur: M.whole - M.pull, ease: EASE.camera },
  ];

  return (
    <FontGate>
      <Stage world="night" tint="dusk" keyLight={{ x: 0.5, y: lerp(G.up.y, VEIL_HANDOFF.y, pg), r: 0.6 }}>
        {/* the palette, cropped to itself */}
        <Sequence durationInFrames={f(M.strip)} name="RS13-03 · the palette">
          <FloatingWindow rect={G.pal} enter="none" spill={0} background="#151A17">
            <ScreenZoom src={T.file} srcSize={SIZE} time={palTime} srcDuration={T.durationS} keys={[{ t: 0, box: PAL(L.portrait) }]} drift={0.01} />
          </FloatingWindow>
          <Headline text="Presenting?" at={0.06} exitAt={M.strip - 0.3} exit="fade" entrance="ink" size={G.askSize} align="center" valign="middle" box={G.ask} />
        </Sequence>

        {/* the recording, locked off: the window leaves it */}
        <Sequence from={f(M.strip)} durationInFrames={f(M.stripOut + 0.35) - f(M.strip)} premountFor={pre} name="RS13-03 · the recording">
          <FloatingWindow rect={G.strip} enter="none" spill={0} exitAt={M.stripOut - M.strip} background="#151A17">
            <MaskedZoom src={T.file} srcSize={SIZE} time={stripTime} srcDuration={T.durationS} keys={keysStrip} drift={0} motionBlur={false} edgeFade={false} masks={STRIP_MASKS} />
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
