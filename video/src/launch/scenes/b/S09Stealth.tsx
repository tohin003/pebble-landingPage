// S09 "Stealth Lockdown" (EDIT_PLAN S09, Desktop, then the dusk Night), 8 s nominal.
//
// 0.0   "Presenting?" (quiet, smaller) above RS13-03 in a flat window: the workspace, then ⌘K (4.4 source).
//       The palette; "stealth" typed (×1.5); a push onto the lit row "Turn Stealth Lockdown on / Hidden from screen
//       capture and screen sharing"; a cut to the whole workspace; Return (7.2) and the workspace leaves the recording
//       in one frame (7.233, real: the take was recorded with screencapture). Hold ≈ 0.55 s on the desktop without it
//       (the desktop calendar widget and the take's Finder window blurred).
// ≈3.3  Dusk falls: a soft wipe from the top into the dusk Night (the Veil's world, this scene only).
//       The pebble appears where S10 needs it and puts on the Veil (Pebble's own Veil code, a render, never called a
//       recording). "Stealth Lockdown." and the honest line, word for word, above it to the end (≥ 3.5 s at nominal).
// The scene ends on the Veil pebble centred, at S10's opening position and size (scenes/d S10 `night`).
import { Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { cues, look, lookBack, pose, VeilPebble } from "../../components/PebbleActor";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { SoftWipeLayer } from "../../components/transitions";
import { eventS, roiOf, TAKES } from "../../data/takes";
import { useLayout, type Layout, type Rect } from "../../layout";
import { fromRamps } from "../../timeMap";
import { punchAt } from "../../timing";
import { C } from "../../tokens";
import type { SceneProps } from "../types";
import { blurOverlay, lerp, ramp, sfxAt, sfxSrc, useSceneTime, type SfxNote } from "./kit";

export const S09_NOMINAL = 8;

/** Stealth Lockdown's honest line, word for word (TREATMENT §3, CLAUDE.md). Never shorten or split it. */
export const HONEST_LINE =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

const T = TAKES["RS13-03"];
const SIZE = { w: T.width, h: T.height };
const PALETTE_OPENS = eventS("RS13-03", "paletteOpens");
const ROW_LIT = eventS("RS13-03", "typeA");
const RETURN = eventS("RS13-03", "returnKey");
const LEAVE = eventS("RS13-03", "windowsLeave");

/** the take, anchored at the scene's start; `lead` seconds of the still workspace before ⌘K (shrinks on a retime) */
const takeTime = (lead: number) =>
  fromRamps(
    [
      { s0: 4.3 - lead, s1: 4.3, speed: 1 }, // the first-run workspace, still
      { s0: 4.3, s1: 5.3, speed: 2.5 }, // the palette opens (4.4)
      { s0: 5.3, s1: 6.5, speed: 1.5 }, // "stealth" typed; the row lights at 5.8
      { s0: 6.5, s1: 7.38, speed: 1 }, // hold on the lit row; Return 7.2; the windows leave 7.233 (never below 1×)
      { s0: 7.38, s1: 9.5, speed: 1 }, // the desktop without Pebble
    ],
    { ramp: 0.1, tail: 1 },
  );

/**
 * After the vanish: the band under the take's Finder window (it ends at y 1131, its shadow a little lower) and above the Dock (from y 1735): the
 * composer's place, bare wallpaper from 7.233. The hold on "the empty desktop".
 */
const BAND = (portrait: boolean): Box => (portrait ? { x: 1700, y: 1145, w: 680, h: 585 } : { x: 1420, y: 1140, w: 1050, h: 590 });

/** the whole workspace window (the strongest read of "leaves the recording"); below the menu bar, above the Dock */
const WIDE = (portrait: boolean): Box => (portrait ? { x: 1100, y: 120, w: 1840, h: 1508 } : { x: 316, y: 112, w: 2624, h: 1476 });

const blurs = (map: ReturnType<typeof takeTime>) =>
  blurOverlay(
    [
      { box: T.hazards.find((h) => h.what.startsWith("desktop calendar widget"))!.box, s0: 0, s1: 99, px: 20 },
      { box: T.hazards.find((h) => h.what.startsWith("the pebble-takes Finder"))!.box, s0: LEAVE, s1: 99, px: 30 },
    ],
    map,
  );

const frame = (L: Layout) =>
  L.portrait
    ? {
        ask: { x: L.content.x, y: L.px(150), w: L.content.w, h: L.px(150) } as Rect,
        win: { x: L.px(40), y: L.px(340), w: L.px(1000), h: L.px(860) } as Rect,
        title: { x: L.content.x, y: L.px(230), w: L.content.w, h: L.px(130) } as Rect,
        line: { x: L.content.x, y: L.px(400), w: L.content.w, h: L.px(360) } as Rect,
        pebble: { x: L.centre.x, y: L.px(930), size: L.px(210) },
        titleSize: L.type.title,
        lineSize: L.px(44),
      }
    : {
        ask: { x: L.content.x, y: L.px(40), w: L.content.w, h: L.px(150) } as Rect,
        win: { x: L.px(272), y: L.px(200), w: L.px(1376), h: L.px(774) } as Rect,
        title: { x: L.content.x, y: L.px(120), w: L.content.w, h: L.px(150) } as Rect,
        line: { x: L.px(250), y: L.px(300), w: L.px(1420), h: L.px(260) } as Rect,
        pebble: { x: L.centre.x, y: L.px(790), size: L.px(190) },
        titleSize: L.type.title,
        lineSize: L.px(56),
      };

export const s09Moments = (lenS: number) => {
  const k = lenS / S09_NOMINAL;
  const lead = 0.8 * Math.min(1.2, k);
  const m = takeTime(lead);
  const leave = m.inv(LEAVE);
  const wipe = leave + 0.55 * Math.min(1.2, k);
  return {
    k,
    lead,
    palette: m.inv(PALETTE_OPENS),
    rowLit: m.inv(ROW_LIT),
    ret: m.inv(RETURN),
    leave,
    wipe,
    pebble: wipe + 0.3,
    veilOn: wipe + 0.75,
    title: wipe + 0.6,
    honest: wipe + 0.95,
  };
};

export const S09_SFX = (lenS: number): SfxNote[] => {
  const M = s09Moments(lenS);
  return [
    { name: "click", s: M.ret, db: -16, what: "Return (Turn Stealth Lockdown on)" },
    { name: "whooshB", s: M.leave, db: -20, what: "the workspace leaves the recording (soft)" },
    { name: "pop", s: M.pebble + 0.08, db: -20, what: "the pebble appears (dusk)" },
    { name: "shimmer", s: M.veilOn + 0.35, db: -19, what: "the Veil settles on the pebble" },
  ];
};

export const S09Stealth: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const G = frame(L);
  const { t, lenS, f } = useSceneTime(S09_NOMINAL, durationInFrames);
  const M = s09Moments(lenS);
  const map = takeTime(M.lead);
  const pal = roiOf("RS13-03", "palette");
  // the input ("stealth") and the lit row, ≈ 1.8×: the row's own words read at the window's size
  const rowH = 428;
  const rowAspect = G.win.w / G.win.h;
  const row: Box = L.portrait ? { x: 1170, y: 280, w: 760, h: 760 / rowAspect } : { x: 1550 - (rowH * rowAspect) / 2, y: 300, w: rowH * rowAspect, h: rowH };
  const keys = [
    { t: 0, box: pal },
    { t: Math.max(0.2, M.rowLit - 0.45), box: pal },
    { t: M.rowLit + 0.15, box: row, dur: 0.6 },
    // cut wide once "stealth" is typed and the row is lit, 0.35 s before Return: the whole workspace leaves in one frame
    { t: M.ret - 0.35, box: WIDE(L.portrait), dur: 0 },
    // then down to the bare wallpaper where the composer was, away from the (blurred) Finder window
    { t: M.leave + 0.2, box: WIDE(L.portrait) },
    { t: M.leave + 0.75, box: BAND(L.portrait), dur: 0.55 },
  ];
  const pW = ramp(t, M.wipe, 0.75);
  const recede = ramp(t, M.wipe - 0.1, 0.9);
  const sfx = S09_SFX(lenS);

  return (
    <FontGate>
      <Sequence durationInFrames={f(M.wipe + 0.8)} name="RS13-03 · Stealth Lockdown on">
        <Stage world="desktop" desktop={{ src: T.file, srcSize: SIZE, time: map, box: WIDE(false), dim: 0.66 }}>
          <FloatingWindow
            rect={G.win}
            enter="none"
            spill={0.45}
            scale={punchAt([M.leave], t, 0.025, 0.03, 0.25) * lerp(1, 0.94, recede)}
            background="#1A211D"
          >
            <ScreenZoom src={T.file} srcSize={SIZE} time={map} srcDuration={T.durationS} keys={keys} drift={0.01} overlay={blurs(map)} />
          </FloatingWindow>
          <Headline text="Presenting?" at={0.1} exitAt={M.leave - 0.05} exit="fade" entrance="ink" variant="support" size={L.portrait ? L.px(58) : L.px(72)} align="center" valign="middle" box={G.ask} />
        </Stage>
      </Sequence>

      {/* dusk falls over the empty desktop: the change of world is a soft wipe, never a cut */}
      <Sequence from={f(M.wipe)} name="dusk · the Veil">
        <SoftWipeLayer progress={pW} role="in" direction="down" feather={0.55}>
          <Stage world="night" tint="dusk" keyLight={{ x: 0.5, y: L.portrait ? 0.66 : 0.7, r: 0.6 }}>
            <VeilPebble
              x={G.pebble.x}
              y={G.pebble.y}
              size={G.pebble.size * lerp(1.45, 1, ramp(t, M.veilOn + 0.9, Math.max(0.8, lenS - M.veilOn - 1.4)))}
              initial={false}
              veil={[{ at: M.veilOn - M.wipe, on: true }]}
              cues={cues(pose(0, "idle"), look(M.title - M.wipe + 0.1, 0, -0.6), lookBack(M.honest - M.wipe + 1.4))}
              glow={Math.min(1, Math.max(0, (t - M.veilOn) / 0.8))}
              opacity={Math.min(1, Math.max(0, (t - M.pebble) / 0.18))}
            />
            <Headline text="Stealth Lockdown." at={M.title - M.wipe} entrance="rise" size={G.titleSize} align="center" valign="bottom" box={G.title} color={C.stone0} />
            <Headline
              text={HONEST_LINE}
              at={M.honest - M.wipe}
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
          </Stage>
        </SoftWipeLayer>
      </Sequence>

      {sfx.map((c) => (
        <Sfx key={`${c.name}-${c.s.toFixed(3)}`} src={sfxSrc(c.name)} at={sfxAt(c.name, c.s)} db={c.db} />
      ))}
    </FontGate>
  );
};
