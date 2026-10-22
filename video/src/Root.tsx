import { Composition, Folder, Still } from "remotion";
import { DURATION_FRAMES, FPS as FILM_FPS, STYLE_FRAMES } from "./film/timeline";
import { FPS } from "./motion/spec";
import { Placeholder } from "./Placeholder";
import { PEBBLE_DEMO_FRAMES, PebbleDemo } from "./pebble/PebbleDemo";
import { FilmBoard, StyleFrames } from "./stills/FilmBoard";
import { FilmPoster } from "./stills/FilmPoster";
import { LoopStub, TeaserStub } from "./stills/LoopStub";
import { COMPONENT_CHECK_FRAMES, ComponentCheck } from "./stills/ComponentCheck";
import { OgImage } from "./stills/OgImage";
import { RIVERBED_PLATE, RiverbedPlate } from "./stills/RiverbedPlate";

// Compositions (MASTER_PLAN §5.4, OVERRIDES §4). The film is aspect-aware: LaunchFilm and LaunchFilmSquare render the
// same timeline (film/timeline.ts, 2,304 frames from the beat map) and every scene adapts through useLayout().
// Today the film is the board-o-matic (stills/FilmBoard.tsx: the built looks plus slates); lane G2 swaps in the
// animated film here. Loops and the teaser are registered at their final sizes and lengths, with stub pictures.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Film">
        <Composition id="LaunchFilm" component={FilmBoard} durationInFrames={DURATION_FRAMES} fps={FILM_FPS} width={1920} height={1080} />
        <Composition id="LaunchFilmSquare" component={FilmBoard} durationInFrames={DURATION_FRAMES} fps={FILM_FPS} width={1080} height={1080} />
        <Composition id="FilmTeaser" component={TeaserStub} durationInFrames={240} fps={FPS.film} width={1280} height={720} />
        <Composition id="StyleFrames" component={StyleFrames} durationInFrames={STYLE_FRAMES.length} fps={FILM_FPS} width={1920} height={1080} />
        <Composition id="StyleFramesSquare" component={StyleFrames} durationInFrames={STYLE_FRAMES.length} fps={FILM_FPS} width={1080} height={1080} />
      </Folder>
      <Folder name="Loops">
        <Composition id="LoopCompanion" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopCompanion" as const }} />
        <Composition id="LoopModels" component={LoopStub} durationInFrames={180} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopModels" as const }} />
        <Composition id="LoopApproveUndo" component={LoopStub} durationInFrames={300} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopApproveUndo" as const }} />
        <Composition id="LoopIsolatedTests" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopIsolatedTests" as const }} />
        <Composition id="LoopMemory" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopMemory" as const }} />
        <Composition id="LoopViews" component={LoopStub} durationInFrames={300} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopViews" as const }} />
        <Composition id="LoopAgentGuard" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopAgentGuard" as const }} />
        <Composition id="LoopReviewCommands" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopReviewCommands" as const }} />
      </Folder>
      <Folder name="Stills">
        <Still id="FilmPoster" component={FilmPoster} width={1280} height={720} />
        <Still id="OgImage" component={OgImage} width={1200} height={630} />
      </Folder>
      <Folder name="Tools">
        <Composition id="ComponentCheck" component={ComponentCheck} durationInFrames={COMPONENT_CHECK_FRAMES} fps={FPS.film} width={1920} height={1080} />
        <Still id="RiverbedPlate" component={RiverbedPlate} width={RIVERBED_PLATE.width} height={RIVERBED_PLATE.height} />
        <Composition id="Placeholder" component={Placeholder} durationInFrames={90} fps={FPS.film} width={1920} height={1080} />
        <Composition id="PebbleDemo" component={PebbleDemo} durationInFrames={PEBBLE_DEMO_FRAMES} fps={FPS.film} width={1920} height={1080} />
      </Folder>
    </>
  );
};
