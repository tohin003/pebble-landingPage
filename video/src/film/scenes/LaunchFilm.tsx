// The launch trailer, animated: one set of scenes for the three compositions, LaunchFilm (1920 × 1080),
// LaunchFilmSquare (1080 × 1080) and LaunchFilmVertical (1080 × 1920), on film/timeline.ts's frames (the 100 BPM beat
// map: 2,304 frames at 30 fps). Each shot is a <Sequence> on its bar lines (so Studio's timeline shows the film's
// structure and nothing outside a shot is mounted), with an inner Sequence that gives its children the ABSOLUTE film
// frame: every scene reads the timeline's absolute frames directly, as the cue list, the beat map and FILM_SPEC do.
import type { ComponentType } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { checkAll } from "../framing";
import { ColdOpen } from "./ColdOpen";
import { Questions, TurnAndBuild } from "./Night";
import { Reveal } from "./Reveal";
import { QuickChat } from "./QuickChat";
import { WholeWindow } from "./WholeWindow";
import { WindowWorld } from "./WindowWorld";
import { S8Claims } from "./SageScenes";
import { S9EndCard } from "./PaperScenes";

/** The film's shots as rendered (the timeline's SHOTS group them by movement; these split where the world changes). */
export const FILM_SHOTS: readonly { name: string; from: number; to: number; Scene: ComponentType }[] = [
  { name: "Bar 1 The look", from: 0, to: 72, Scene: ColdOpen },
  { name: "Bars 2–7 The questions and their glimpses", from: 72, to: 504, Scene: Questions },
  { name: "Bars 8–9 The turn and the build", from: 504, to: 648, Scene: TurnAndBuild },
  { name: "Bars 10–11 The drop and the star beat", from: 648, to: 792, Scene: Reveal },
  { name: "Bars 12–13 The quick chat", from: 792, to: 936, Scene: QuickChat },
  { name: "Bar 14 The whole workspace", from: 936, to: 1008, Scene: WholeWindow },
  { name: "Bars 15–25 The montage and the climax", from: 1008, to: 1800, Scene: WindowWorld },
  { name: "Bars 26–28 The breakdown", from: 1800, to: 2016, Scene: S8Claims },
  { name: "Bars 29–32 The title and the button", from: 2016, to: 2304, Scene: S9EndCard },
];

let checked = false;
const assertTimeline = () => {
  if (checked) return;
  const problems = checkAll();
  if (problems.length) throw new Error(`film/timeline.ts is invalid:\n  ${problems.join("\n  ")}`);
  checked = true;
};

export const LaunchFilm: React.FC = () => {
  assertTimeline();
  return (
    <AbsoluteFill style={{ backgroundColor: "#191E1B" }}>
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
