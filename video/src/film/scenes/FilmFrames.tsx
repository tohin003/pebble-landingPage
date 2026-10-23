// Review samplers for the animated film (lane G2a): frame i of these compositions IS film frame `frames[i]` (a
// Sequence shifted by i − target makes every useCurrentFrame() inside read the film's absolute frame), so contact
// sheets, cut strips and full-resolution crops are exact frames of LaunchFilm / LaunchFilmSquare / LaunchFilmVertical
// without rendering the whole film. Render with --props='{"frames":[0,72,144]}' --sequence. FilmStyleFrames samples
// gate G1.5's style frames (timeline STYLE_FRAMES) the same way. (G1's board-o-matic, which these used to point at, is
// gone: lane v2-film.)
import { Sequence, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { STYLE_FRAMES } from "../timeline";
import { LaunchFilm } from "./LaunchFilm";

export interface FilmFramesProps {
  frames: number[];
  [key: string]: unknown;
}

export const FilmFrames: React.FC<FilmFramesProps> = ({ frames }) => {
  const i = useCurrentFrame();
  const target = frames[Math.min(i, frames.length - 1)] ?? 0;
  return (
    <Sequence from={i - target} layout="absolute-fill">
      <LaunchFilm />
    </Sequence>
  );
};

export const filmFramesMetadata: CalculateMetadataFunction<FilmFramesProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.frames.length),
});

/** Gate G1.5's sampler: frame i shows the film at STYLE_FRAMES[i].frame. */
export const FilmStyleFrames: React.FC = () => {
  const i = useCurrentFrame();
  const target = STYLE_FRAMES[Math.min(i, STYLE_FRAMES.length - 1)]!.frame;
  return (
    <Sequence from={i - target} layout="absolute-fill">
      <LaunchFilm />
    </Sequence>
  );
};
