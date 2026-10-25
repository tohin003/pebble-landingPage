// The launch film, animated (lane G2a): one set of scenes for both compositions, LaunchFilm (1920 × 1080) and
// LaunchFilmSquare (1080 × 1080), on film/timeline.ts's frames (FILM_SPEC, the 100 BPM beat map: 2,304 frames at 30 fps).
// Each shot is a <Sequence> on its bar lines (so Studio's timeline shows the film's structure and nothing outside a
// shot is mounted), with an inner Sequence that gives its children the ABSOLUTE film frame: every scene reads the
// timeline's absolute frames directly, as the cue list, the beat map and FILM_SPEC do.
import type { ComponentType } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { CamKey } from "../../motion/camera";
import { ASPECTS, REFERENCE } from "../../motion/layout";
import { T, sec } from "../../motion/spec";
import { windowKeys } from "../framing";
import { hookKeys, ZOOM_THROUGH } from "../hook";
import { FPS, pendingCopy, validateTimeline, type CameraMove } from "../timeline";
import { S1Hook } from "./S1Hook";
import { S2Questions, S3Build, S8Claims } from "./SageScenes";
import { S4Reveal, S9EndCard } from "./PaperScenes";
import { S5S6Window } from "./WindowWorld";
import { BADGE_DIVE, GROW, S7Dashboard, S7Quiz } from "./S7Views";

/** The film's shots as rendered (FILM_SPEC §6): S7 splits where its world changes (S7a+b in the stage, S7c the quiz). */
export const FILM_SHOTS: readonly { name: string; from: number; to: number; Scene: ComponentType }[] = [
  { name: "S1 Hook", from: 0, to: 144, Scene: S1Hook },
  { name: "S2 Questions", from: 144, to: 360, Scene: S2Questions },
  { name: "S3 Build", from: 360, to: 504, Scene: S3Build },
  { name: "S4 Reveal", from: 504, to: 648, Scene: S4Reveal },
  { name: "S5–S6 Window", from: 648, to: 1584, Scene: S5S6Window },
  { name: "S7a–b Dashboard", from: 1584, to: 1728, Scene: S7Dashboard },
  { name: "S7c Quiz", from: 1728, to: 1800, Scene: S7Quiz },
  { name: "S8 Claims", from: 1800, to: 2016, Scene: S8Claims },
  { name: "S9 End card", from: 2016, to: 2304, Scene: S9EndCard },
];

/** Every camera move of the film, per aspect, as [from, to) spans (a one-frame key is a cut, not a move), for the
 *  timeline's breath and Verified-hold rules: the hook's keys and dive, the stage camera, the chart's growth and the
 *  quiz's dive. */
export function filmCameraMoves(): CameraMove[] {
  const moves = (keys: readonly CamKey[], aspect: CameraMove["aspect"], what: string): CameraMove[] =>
    keys.slice(1).flatMap((k) => {
      const dur = k.dur ?? sec(T.camera, FPS);
      return dur > 1 ? [{ aspect, from: k.at - dur, to: k.at, what: `${what} into f${k.at}` }] : [];
    });
  return ASPECTS.flatMap((a) => {
    const { width, height } = REFERENCE[a];
    return [
      ...moves(hookKeys(a, width, height, 1), a, "the hook camera"),
      { aspect: a, from: ZOOM_THROUGH.from, to: ZOOM_THROUGH.fill, what: "the hook's dive" },
      ...moves(windowKeys(a, 1), a, "the stage camera"),
      { aspect: a, from: GROW.at, to: GROW.at + GROW.dur, what: "the chart's growth" },
      { aspect: a, from: BADGE_DIVE.from, to: BADGE_DIVE.fill, what: "the quiz's dive" },
    ];
  });
}

let checked = false;
const assertTimeline = () => {
  if (checked) return;
  const problems = [...validateTimeline(filmCameraMoves()), ...pendingCopy().map((p) => `copy not yet in src/content/chapters.ts: ${p}`)];
  if (problems.length) throw new Error(`film/timeline.ts is invalid:\n  ${problems.join("\n  ")}`);
  checked = true;
};

export const LaunchFilm: React.FC = () => {
  assertTimeline();
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8F9F6" }}>
      {FILM_SHOTS.map(({ name, from, to, Scene }) => (
        <Sequence key={name} name={name} from={from} durationInFrames={to - from}>
          <Sequence from={-from} layout="none" name={`${name} (absolute frames)`}>
            <Scene />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
