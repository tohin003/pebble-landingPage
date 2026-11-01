// S09 "Stealth Lockdown" (the dusk night, this scene only), 9.05 s nominal (FIXES-2: 70.051–79.101 on the master: the
// music's groove thins at 72.05 and stops at 73.07, the breakdown hit at 73.41).
//
// 0.0   "Presenting?" over the ⌘K palette (RS13-03), open on the first frame (REVIEW-2 M-2: the empty field with Light,
//       Dark and System theme; not one frame of the first-run screen), "stealth" typed. 1.35 s.
// 1.35  The real recording (RS13-03 was made with screencapture, so Pebble's windows really leave it), flat and locked
//       off, a 16:10 crop holding Pebble's whole window (REVIEW-2 S-4: 62 % of the frame's width on 16:9, 90 % on 4:5),
//       the palette still on it with its lit row. 1.65 s with the window in it, then it leaves the recording in one
//       frame (3.0, on the music's stop); 1.55 s of the desktop without it. Frosted: Pebble's iCloud notice and its
//       first-run chips, the desktop's calendar widget, and the take's own Finder window once Pebble has gone.
//       "Stealth Lockdown." and the honest line, word for word, enter WITH the recording and sit under it (3 lines at
//       56 px on 16:9; 4 lines at 44 px on 4:5), and stay through the Veil: 1.35 → 8.98 (7.6 s).
// 4.55  The recording leaves; the pebble (Pebble's own body) comes in above the honest line and puts on the Veil
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
const AT = { strip: 1.35, vanish: 3.0, stripOut: 4.55, pebble: 4.95, veil: 5.35, glide: 8.2, glideS: 0.6, typeOut: S09_NOMINAL - 2 / 30 } as const;
/** the recording's lead before the vanish (FIXES-2: the recording at 1.35, the vanish still on the music's stop at 3.0) */
const LEAD = AT.vanish - AT.strip;

/**
 * The palette: opened at 4.4 (f264), "stealth" typed 5.2–6.433, the row lit from 5.8. Never below 1× (a screencapture
 * conform). It starts on 4.433, two frames after it opened, so frame 0 is the palette (REVIEW-2 M-2), and plays real
 * time; its last 0.2 s are the same source moments as the recording's first 0.2 s, in the two framings.
 */
const PAL_IN = 4.433;
const palTime = fromRamps([{ s0: PAL_IN, s1: 6.4, speed: 1 }], { tail: 1 });
/** the recording: real time, locked off, from LEAD before the vanish */
const stripTime = fromRamps([{ s0: LEAVE - LEAD, s1: LEAVE + 2.6, speed: 1 }], { tail: 1 });

/** the palette alone (input, rows, its note): no first-run card (it starts at y 758) */
const PAL = (portrait: boolean): Box => (portrait ? { x: 1150, y: 305, w: 1140, h: 396 } : { x: 1150, y: 305, w: 1140, h: 415 });
/**
 * REVIEW-2 S-4: a 16:10 crop (1.61) holding Pebble's whole window (310–2940 × 124–1730), under the menu bar (the clock,
 * the recording pill) and above the Dock (from y ≈ 1735: its dated icon and badge stay out).
 */
const STRIP = (_portrait: boolean): Box => ({ x: 296, y: 100, w: 2644, h: 1640 });
const STRIP_MASKS: Mask[] = [
  { box: { x: 1240, y: 1280, w: 1400, h: 120 }, s0: 0, s1: LEAVE, px: 22, backing: "#1b1f1c" }, // Pebble's iCloud notice ("Your Documents folder syncs with iCloud Drive…"): noise (REVIEW-2 S-4)
  { box: { x: 270, y: 90, w: 110, h: 350 }, s0: 0, s1: 99, px: 24, backing: "#2a2f2b" }, // the desktop calendar widget's right edge (dates; behind the window until it leaves)
  { box: { x: 530, y: 250, w: 1880, h: 895 }, s0: LEAVE, s1: 99, px: 30, backing: "#2b2d2c" }, // the take's own pebble-takes Finder window, once Pebble has gone
  { box: { x: 1360, y: 1572, w: 300, h: 48 }, s0: 0, s1: LEAVE, px: 18, backing: "#1b1f1c" }, // the composer's "Connect a model…" (first-run)
  { box: { x: 1620, y: 1664, w: 336, h: 42 }, s0: 0, s1: LEAVE, px: 18, backing: "#141715" }, // the footer's "Connect a model in Settings"
  { box: { x: 1178, y: 1755, w: 176, h: 120 }, s0: 0, s1: DOCK_CLOSED, px: 22 }, // the Dock's dated Calendar icon
  { box: { x: 1226, y: 1755, w: 176, h: 120 }, s0: DOCK_CLOSED, s1: 99, px: 22 }, // … after the Dock closes up (≈ 50 px right)
  { box: { x: 1938, y: 1746, w: 58, h: 62 }, s0: 0, s1: DOCK_CLOSED, px: 22 }, // the System Settings badge
  { box: { x: 1986, y: 1746, w: 58, h: 62 }, s0: DOCK_CLOSED, s1: 99, px: 22 }, // … after the Dock closes up
];

/** the layout: reference px (1920 × 1080, 1080 × 1350) */
const frame09 = (L: Layout) =>
  L.portrait
    ? {
        ask: R(L, 64, 180, 952, 160),
        pal: R(L, 40, 380, 1000, 347),
        strip: R(L, 54, 96, 972, 604),
        title: R(L, 64, 790, 952, 84),
        line: R(L, 64, 894, 952, 300),
        askSize: L.px(104),
        titleSize: L.px(68),
        lineSize: L.px(44),
        up: { x: 0.5, y: 0.295, h: 0.17 },
      }
    : {
        ask: R(L, 128, 150, 1664, 150),
        pal: R(L, 210, 330, 1500, 546),
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
    rowLit: palTime.inv(ROW_LIT),
    strip,
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
            <MaskedZoom src={T.file} srcSize={SIZE} time={stripTime} srcDuration={T.durationS} keys={[{ t: 0, box: STRIP(L.portrait) }]} drift={0} motionBlur={false} masks={STRIP_MASKS} />
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
