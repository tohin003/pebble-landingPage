// S11 Outro (EDIT_PLAN S11). Night world: the bookend of the cold open.
//
// The pebble stands where the film began (centre-low, small). "Small pebble." then "Real work." (the accent face, sage).
// Then it hops up into the lockup (the title's arrangement): "Pebble 2.0", "Free and open source for Mac." and
// "github.com/tohin003/Pebble" (Geist Mono). The end lines arrive, the pebble settles into `sleepy` and rests, and the
// light dims a little. Nothing new arrives in the last 1.5 s. Timed to the score (6.95 s): the two lines are set on the
// drum hits at 0.0 and 0.248 (a 0.1 s line entrance each), the pebble lands in the lockup at 2.0, it rests at 4.0.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { Headline, Label } from "../../components/Headline";
import { PebbleActor, cues, pose, sleepy } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout } from "../../layout";
import { tween } from "../../timing";
import { C, EASE, TYPE } from "../../tokens";
import { WORLDS } from "../../world";
import type { SceneProps } from "../types";
import { BODY_H, TITLE_TEXT, lineBox, lockupGeo, stagePebble, useClock, type SfxSuggestion } from "./common";

export const S11_NOMINAL = 6.95;

export interface S11Props extends SceneProps {
  /** a music credit line, if the track's licence asks for one on the end card (empty: none) */
  musicCredit?: string;
}

/** On the music: the two lines on the drum hits (0.0, 0.248), the lockup at 2.0, the rest at 4.0. */
const B = {
  small: 0,
  real: 0.248,
  wordsExit: 1.42,
  hop: 1.56,
  land: 2.0,
  lockup: 1.97,
  free: 2.3,
  github: 2.65,
  endLines: 3.3,
  rest: 4.0,
} as const;

export const S11_MARKS = [
  { name: "small-pebble", s: B.small },
  { name: "real-work", s: B.real },
  { name: "lockup-land", s: B.land },
  { name: "lockup", s: B.lockup },
  { name: "github", s: B.github },
  { name: "rest", s: B.rest },
  { name: "calm-hold", s: S11_NOMINAL - 1.5 },
] as const;

export const S11_SFX: SfxSuggestion[] = [
  { scene: "S11", s: B.land, kind: "pop (soft)", note: "the pebble lands in the lockup" },
  { scene: "S11", s: B.rest, kind: "soft swell (end)", note: "the pebble rests; let it ring out under the last 1.5 s" },
];

export const SAMPLE_LINE = "Shown with sample data.";
export const ENGINE_CREDIT = "Pebble's character engine: bloub by Jérémy Perret (MIT)";

export const S11Outro: React.FC<S11Props> = ({ durationInFrames, musicCredit = "" }) => {
  const L = useLayout();
  const { t, T, D } = useClock(S11_NOMINAL, durationInFrames);
  const peb = stagePebble(L);

  // "Small pebble." / "Real work.": two display lines above the pebble
  const ds = L.type.display;
  const base2 = peb.y - peb.size * BODY_H - L.px(pick(L, { "16x9": 110, "4x5": 150 }));
  const base1 = base2 - ds * 1.12;
  const line1 = lineBox(L.content.x, L.content.w, base1, ds, 1);
  const line2 = lineBox(L.content.x, L.content.w, base2, ds, 1);

  // the lockup, lifted to leave room for the end lines
  const freeSize = L.type.sub;
  const ghSize = pick(L, { "16x9": 54, "4x5": 40 }) * L.u;
  const gap = pick(L, { "16x9": 26, "4x5": 22 }) * L.u;
  const belowH = freeSize * 1.2 + gap + ghSize * 1.2;
  const g = lockupGeo(L, belowH, L.px(pick(L, { "16x9": 0, "4x5": 30 })));

  const endSize = pick(L, { "16x9": 28, "4x5": 25 }) * L.u;
  const endLines = [SAMPLE_LINE, musicCredit, ENGINE_CREDIT].filter((x) => x.trim().length > 0);
  const endBottom = L.safe.y + L.safe.h - L.px(6);

  const hops = [{ at: T(B.hop), to: { x: g.pebble.x, y: g.pebble.y }, duration: T(B.land) - T(B.hop), height: L.px(pick(L, { "16x9": 150, "4x5": 120 })) }];
  const actorCues = cues(pose(0, "idle"), pose(T(B.land) + 0.05, "happy"), pose(T(B.land) + 1.2, "idle"), sleepy(T(B.rest)));
  const energy = tween(t, [T(B.rest), D], [1, 0.74], EASE.camera);

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage keyLight={{ x: 0.5, y: 0.32, r: 0.8 }} energy={energy}>
          <Headline text="Small pebble." at={T(B.small)} entrance="line" dur={0.1} exitAt={T(B.wordsExit)} size={ds} align="center" valign="top" box={line1} leading={1} />
          <Headline text="*Real work.*" at={T(B.real)} exitAt={T(B.wordsExit) + 0.05} entrance="line" dur={0.1} size={ds} align="center" valign="top" box={line2} leading={1} />
          <PebbleActor
            x={peb.x}
            y={peb.y}
            size={peb.size}
            hops={hops}
            grow={{ at: T(B.hop), to: g.pebble.size, dur: T(B.land) - T(B.hop) }}
            cues={actorCues}
            glow={0.4}
          />
          <Headline text={TITLE_TEXT} variant="title" size={g.fs} accentFace="same" at={T(B.lockup)} stagger={0.07} align={g.align} valign="top" fit={false} box={g.titleBox} />
          <Headline
            text="Free and open source, for Macs with Apple silicon."
            variant="support"
            size={freeSize}
            color={WORLDS.night.ink2}
            at={T(B.free)}
            entrance="blur"
            align="center"
            valign="top"
            fit
            box={{ x: L.content.x, y: g.belowTop, w: L.content.w, h: freeSize * 1.3 }}
            leading={1.2}
          />
          <Label text="github.com/tohin003/Pebble" at={T(B.github)} size={ghSize} color={C.sage} x={L.centre.x} y={g.belowTop + freeSize * 1.2 + gap} align="center" />
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
        </Stage>
      </AbsoluteFill>
    </FontGate>
  );
};
