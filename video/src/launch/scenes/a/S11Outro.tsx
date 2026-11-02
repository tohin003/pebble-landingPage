// S11 Outro (EDIT_PLAN S11). Night world: the bookend of the cold open.
//
// It opens on the pebble S10 hands over (FIXES-1: happy, its body centred at (0.5 W, 0.56 H), 11 % of the frame's
// height; the engine runs on from S10's, so its bob and sparkles carry across the cut). "Small pebble." lands on the
// drum hit at 0.0 (on frame 1: frame 0 is the pebble alone) and "Real work." (the accent face, sage) on the hit at
// 0.248, each a 0-frame set, and the thesis holds 2.5 s (REVIEW-1 M5). From 2.76 the lockup forms: the thesis leaves
// (0.17 s) while the pebble crouches, the pebble leaps into the title's arrangement without crossing a line of type
// (flight.tsx), and "Pebble 2.0" arrives on the 3.0 beat as it lands (16:9; 3.05 on 4:5); then "Free and open source,
// / for Macs with Apple silicon." (two centred lines, REVIEW-1 S12) and "github.com/tohin003/Pebble" (Geist Mono),
// held to the end (3.5 s). The pebble rests (sleepy) on the final chord at 4.0, the small end lines arrive, the light
// dims; nothing new in the last 1.5 s. The film ends with the music at 6.345 s (FIXES-3 N-6, 99.4 on the master); the
// resting pebble gives one slow blink at 4.511 (film 97.57): the engine's own blink there, played at a fifth of its
// speed (the engine's clock slowed through it, so its frames are its own), so the end card is never dead still.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { Headline, Label } from "../../components/Headline";
import { cues, pose, sleepy } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout } from "../../layout";
import { tween } from "../../timing";
import { C, EASE, TYPE } from "../../tokens";
import { WORLDS } from "../../world";
import type { SceneProps } from "../types";
import { BODY_H, S10_HANDOFF, TITLE_TEXT, lineBox, lockupGeo, useClock, type SfxSuggestion } from "./common";
import { FlightPebble, lockupFlight, type Flight } from "./flight";
import { ExitWrap, HitSet } from "./fx";

export const S11_NOMINAL = 6.345;
/**
 * "Small pebble." lands on frame 1 (a 0-ms set just after the 0.0 hit), never on frame 0: the master's night wipe
 * opens out of the pebble's outline before 93.055 and would reveal anything on S11's first frame early (the director,
 * 2 Nov). Frame 0 is the pebble alone, exactly as S10 leaves it.
 */
const FIRST_FRAME = 1e-3;

export interface S11Props extends SceneProps {
  /** a music credit line, if the track's licence asks for one on the end card (empty: none) */
  musicCredit?: string;
}

/** On the music (S11 starts on the drum hit at 93.055): the hits 0.0 and 0.248, the final chord at 4.0. */
const B = {
  small: 0,
  real: 0.248,
  thesisExit: 2.76,
  /** 16:9: it swoops left under the leaving type, so it may take off as the thesis fades; the name on the 3.0 beat */
  hop: 2.88,
  lockup: 3.0,
  land: 3.2,
  /** 4:5: it rises straight through where the thesis was, so it waits for the type to go; the name once it has passed */
  hopPortrait: 2.93,
  lockupPortrait: 3.05,
  landPortrait: 3.25,
  free: 3.3,
  github: 3.42,
  rest: 4.0,
  endLines: 4.15,
  /** the engine's own blink nearest film 97.5 (engine time 19.011 at lead 14.5), slowed: see SLOW_BLINK */
  slowBlink: 4.511,
} as const;

/**
 * The slow blink (REVIEW-3 N-6): through the engine's blink at B.slowBlink (0.18 s in the engine) its clock runs at a
 * fifth of the film's, so the blink takes 0.9 s (the lids visibly move from about 4.75 to 5.13: film 97.8 to 98.2, about four times a normal blink). Only the engine's clock changes
 * (the actor's `lead`); its cues keep film time, and every frame is one the engine draws itself.
 */
const SLOW_BLINK = { at: B.slowBlink, engineDur: 0.19, rate: 1 / 5 } as const;
/** The actor's lead at film-local time `t` (s), in an unscaled clock (k = 1 on the master). */
const leadAt = (t: number, base: number) => {
  const { at, engineDur, rate } = SLOW_BLINK;
  const realDur = engineDur / rate;
  if (t <= at) return base;
  if (t >= at + realDur) return base - (realDur - engineDur);
  return base - (t - at) * (1 - rate);
};

export const S11_MARKS = [
  { name: "small-pebble", s: B.small },
  { name: "real-work", s: B.real },
  { name: "thesis-exit", s: B.thesisExit },
  { name: "lockup", s: B.lockup },
  { name: "lockup-land", s: B.land },
  { name: "github", s: B.github },
  { name: "rest", s: B.rest },
  { name: "slow-blink", s: B.slowBlink },
  { name: "calm-hold", s: S11_NOMINAL - 1.5 },
] as const;

export const S11_SFX: SfxSuggestion[] = [
  { scene: "S11", s: B.land, kind: "pop (soft)", note: "the pebble lands in the lockup" },
  { scene: "S11", s: B.rest, kind: "soft swell (end)", note: "the pebble rests on the final chord; let it ring out under the last 1.5 s" },
];

export const SAMPLE_LINE = "Shown with sample data.";
export const ENGINE_CREDIT = "Pebble's character engine: bloub by Jérémy Perret (MIT)";
export const FREE_LINES = "Free and open source,\nfor Macs with Apple silicon.";

export const S11Outro: React.FC<S11Props> = ({ durationInFrames, musicCredit = "" }) => {
  const L = useLayout();
  const { t, T, D } = useClock(S11_NOMINAL, durationInFrames);

  // the pebble S10 hands over: its body centred at (0.5 W, 0.56 H), 11 % of the frame's height
  const bodyH = S10_HANDOFF.bodyOfH * L.H;
  const start = { x: S10_HANDOFF.cx * L.W, y: S10_HANDOFF.cy * L.H + bodyH / 2, size: bodyH / BODY_H };

  // "Small pebble." / "Real work.": two display lines above it
  const ds = L.type.display;
  const base2 = start.y - bodyH - L.px(pick(L, { "16x9": 80, "4x5": 90 }));
  const base1 = base2 - ds * 1.12;
  const line1 = lineBox(L.content.x, L.content.w, base1, ds, 1);
  const line2 = lineBox(L.content.x, L.content.w, base2, ds, 1);
  const origin = (r: { y: number; h: number }) => `50% ${(r.y + r.h / 2).toFixed(1)}px`;

  // the lockup, lifted a little on 4:5 to leave room for the end lines
  // two centred lines (REVIEW-1 S12): 60 px on 16:9, 44 px on 4:5 (≥ 40)
  const freeSize = L.portrait ? L.type.sub : L.px(60);
  const freeLead = 1.2;
  const freeH = 2 * freeSize * freeLead;
  const ghSize = pick(L, { "16x9": 60, "4x5": 44 }) * L.u;
  const gap = pick(L, { "16x9": 26, "4x5": 22 }) * L.u;
  const belowH = freeH + gap + ghSize * 1.25;
  const g = lockupGeo(L, belowH, L.px(pick(L, { "16x9": 0, "4x5": 30 })));

  const endSize = pick(L, { "16x9": 28, "4x5": 25 }) * L.u;
  const endLines = [SAMPLE_LINE, musicCredit, ENGINE_CREDIT].filter((x) => x.trim().length > 0);
  const endBottom = L.safe.y + L.safe.h - L.px(6);

  // the leap into the lockup (flight.tsx): it crouches while the thesis leaves, and never crosses a line of type
  const hopAt = T(L.portrait ? B.hopPortrait : B.hop);
  const landAt = T(L.portrait ? B.landPortrait : B.land);
  const lockupAt = T(L.portrait ? B.lockupPortrait : B.lockup);
  const to = { x: g.pebble.x, y: g.pebble.y };
  const leap: Flight = { from: start, to, fromSize: start.size, toSize: g.pebble.size, at: hopAt, dur: landAt - hopAt, ...lockupFlight(L.portrait, L.px, start, to, -10, 1) };
  // happy since long before (the engine continues S10's), asleep on the final chord
  const actorCues = cues(pose(-5, "happy"), sleepy(T(B.rest)));
  const hopP = tween(t, [hopAt - 0.15, landAt], [0, 1], EASE.camera);
  const energy = tween(t, [T(B.rest), D], [1, 0.74], EASE.camera);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage keyLight={{ x: 0.5, y: 0.4 - 0.06 * hopP, r: 0.8 }} energy={energy}>
          <ExitWrap at={T(B.thesisExit)} t={t} rise={L.px(16)}>
            <HitSet at={T(B.small) + FIRST_FRAME} t={t} u={L.u} origin={origin(line1)}>
              <Headline text="Small pebble." at={-1} size={ds} align="center" valign="top" box={line1} leading={1} />
            </HitSet>
            {/* REVIEW-5 N-2: on the frame nearest its hit (93.302): f2799, 2 ms before it, not f2800, 31 ms after */}
            <HitSet at={T(B.real) - 0.5 / 30} t={t} u={L.u} origin={origin(line2)}>
              <Headline text="*Real work.*" at={-1} size={ds} align="center" valign="top" box={line2} leading={1} />
            </HitSet>
          </ExitWrap>
          <Headline text={TITLE_TEXT} variant="title" size={g.fs} accentFace="same" entrance="blur" at={lockupAt} align={g.align} valign="top" fit={false} box={g.titleBox} />
          <Headline
            text={FREE_LINES}
            variant="support"
            size={freeSize}
            color={WORLDS.night.ink2}
            at={T(B.free)}
            entrance="line"
            align="center"
            valign="top"
            fit={false}
            box={{ x: L.content.x, y: g.belowTop, w: L.content.w, h: freeH + L.px(8) }}
            leading={freeLead}
          />
          <Label text="github.com/tohin003/Pebble" at={T(B.github)} size={ghSize} color={C.sage} x={L.centre.x} y={g.belowTop + freeH + gap} align="center" />
          {endLines.map((line, i) => (
            <Label
              key={line}
              text={line}
              at={T(B.endLines) + 0.12 * i}
              size={endSize}
              color={WORLDS.night.small}
              weight={400}
              x={L.centre.x}
              y={endBottom - (endLines.length - 1 - i) * endSize * 1.45}
              align="center"
              valign="bottom"
              style={{ fontFamily: TYPE.mono.fontFamily }}
            />
          ))}
          <FlightPebble flight={leap} t={t} cues={actorCues} lead={leadAt(t / T(1), S10_HANDOFF.engineAt)} glow={0.45} pool={0.8 * (1 - hopP)} />
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};
