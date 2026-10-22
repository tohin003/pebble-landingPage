// The launch film as a board-o-matic (until lane G2's animated scenes exist): every shot of film/timeline.ts at its
// frames, drawn with the built looks on lane D's stills. It is what LaunchFilm and LaunchFilmSquare render today, so a
// timing review against the music (and the style frames) works now. G2 replaces this component in Root.tsx with the
// animated film; the looks, the components and the timeline stay.
import type { ComponentType } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Slate } from "../components";
import { GRID, STYLE_FRAMES, beatAt, shotAt, validateTimeline } from "../film/timeline";
import { ChartWorldLook, EndCardLook, HookLook, QuizLook, RevealLook, SageLook, WindowLook } from "./looks";

const S2: React.FC = () => <SageLook ids={["T1", "T2", "T3"]} />;
const S3: React.FC = () => <SageLook ids={["T4"]} pebble />;
const S8: React.FC = () => <SageLook ids={["T15", "T15s", "T16", "T17"]} />;

/** The look for each shot, or for a sub-beat where a shot changes world inside (S7). */
export const LOOKS: Readonly<Record<string, ComponentType>> = {
  S1: HookLook,
  S2,
  S3,
  S4: RevealLook,
  S5: WindowLook,
  S6: WindowLook,
  S7a: WindowLook,
  S7b: ChartWorldLook,
  S7c: QuizLook,
  S8,
  S9: EndCardLook,
};

let checked = false;
const assertTimeline = () => {
  if (checked) return;
  const problems = validateTimeline();
  if (problems.length) throw new Error(`film/timeline.ts is invalid:\n  ${problems.join("\n  ")}`);
  checked = true;
};

/** The film at the current (absolute) frame. */
export const FilmBoard: React.FC = () => {
  assertTimeline();
  const frame = useCurrentFrame();
  const shot = shotAt(frame);
  const beat = beatAt(frame);
  const Look = (beat && LOOKS[beat.id]) || (shot && LOOKS[shot.id]);
  if (!shot) return <AbsoluteFill style={{ background: "#F8F9F6" }} />;
  return (
    <AbsoluteFill style={{ background: "#F8F9F6" }}>
      {Look ? <Look /> : <Slate meta={`${shot.id} · frames ${shot.from}–${shot.to - 1} · bar ${shot.from / GRID.barFrames + 1}`} title={beat?.note ?? shot.id} />}
    </AbsoluteFill>
  );
};

/**
 * Gate G1.5's sampler: frame i shows the film at STYLE_FRAMES[i].frame. A Sequence shifted by (i − target) makes every
 * useCurrentFrame() inside read the film's absolute frame, so these ARE film frames, from whatever component renders
 * the film (`film`, default the board).
 */
export const StyleFrames: React.FC<{ film?: ComponentType }> = ({ film: Film = FilmBoard }) => {
  const i = useCurrentFrame();
  const target = STYLE_FRAMES[Math.min(i, STYLE_FRAMES.length - 1)]!.frame;
  return (
    <Sequence from={i - target} layout="absolute-fill">
      <Film />
    </Sequence>
  );
};
