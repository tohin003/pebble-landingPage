import { Composition, Folder, Still } from "remotion";
import { DURATION_FRAMES, FPS as FILM_FPS, STYLE_FRAMES } from "./film/timeline";
import { FPS } from "./motion/spec";
import { Placeholder } from "./Placeholder";
import { PEBBLE_DEMO_FRAMES, PebbleDemo } from "./pebble/PebbleDemo";
// lane G2a: the animated film (video/src/film/scenes) and its review samplers
import { LaunchFilm } from "./film/scenes/LaunchFilm";
import { FilmFrames, FilmStyleFrames, filmFramesMetadata } from "./film/scenes/FilmFrames";
import { FilmPoster } from "./stills/FilmPoster";
import { FontMetrics } from "./stills/FontMetrics";
import { LoopStub } from "./stills/LoopStub";
import { COMPONENT_CHECK_FRAMES, ComponentCheck } from "./stills/ComponentCheck";
import { OgImage } from "./stills/OgImage";
import { RIVERBED_PLATE, RiverbedPlate } from "./stills/RiverbedPlate";
// lane G2b: the feature loops, the teaser T0 and their posters (video/src/loops, video/src/teaser)
import { LoopAgentGuard } from "./loops/LoopAgentGuard";
import { LoopApproveUndo } from "./loops/LoopApproveUndo";
import { LoopCompanion } from "./loops/LoopCompanion";
import { LoopIsolatedTests } from "./loops/LoopIsolatedTests";
import { LoopMemory } from "./loops/LoopMemory";
import { LoopModels } from "./loops/LoopModels";
import { LoopViews } from "./loops/LoopViews";
import { L1, L2, L3, L4, L6, L7, L8, T0 } from "./loops/plans";
import { FilmTeaser } from "./teaser/FilmTeaser";

// Compositions (MASTER_PLAN §5.4, OVERRIDES §4). The film is aspect-aware: LaunchFilm and LaunchFilmSquare render the
// same timeline (film/timeline.ts, 2,304 frames from the beat map) and every scene adapts through useLayout().
// The film is the animated cut (film/scenes, lane G2a); FilmFrames samples any list of its frames for review
// (--props='{"frames":[…]}'), and StyleFrames samples gate G1.5's frames of it. Loops and the teaser are lane G2b's.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Film">
        <Composition id="LaunchFilm" component={LaunchFilm} durationInFrames={DURATION_FRAMES} fps={FILM_FPS} width={1920} height={1080} />
        <Composition id="LaunchFilmSquare" component={LaunchFilm} durationInFrames={DURATION_FRAMES} fps={FILM_FPS} width={1080} height={1080} />
        <Composition id="FilmTeaser" component={FilmTeaser} durationInFrames={T0.plan.n} fps={FPS.film} width={1280} height={720} />
        <Composition id="StyleFrames" component={FilmStyleFrames} durationInFrames={STYLE_FRAMES.length} fps={FILM_FPS} width={1920} height={1080} />
        <Composition id="StyleFramesSquare" component={FilmStyleFrames} durationInFrames={STYLE_FRAMES.length} fps={FILM_FPS} width={1080} height={1080} />
        <Composition id="FilmFrames" component={FilmFrames} calculateMetadata={filmFramesMetadata} defaultProps={{ frames: [0] }} durationInFrames={1} fps={FILM_FPS} width={1920} height={1080} />
        <Composition id="FilmFramesSquare" component={FilmFrames} calculateMetadata={filmFramesMetadata} defaultProps={{ frames: [0] }} durationInFrames={1} fps={FILM_FPS} width={1080} height={1080} />
      </Folder>
      <Folder name="Loops">
        <Composition id="LoopCompanion" component={LoopCompanion} durationInFrames={L1.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopModels" component={LoopModels} durationInFrames={L2.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopApproveUndo" component={LoopApproveUndo} durationInFrames={L3.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopIsolatedTests" component={LoopIsolatedTests} durationInFrames={L4.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopMemory" component={LoopMemory} durationInFrames={L7.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopViews" component={LoopViews} durationInFrames={L8.plan.n} fps={FPS.loop} width={1600} height={1000} />
        <Composition id="LoopAgentGuard" component={LoopAgentGuard} durationInFrames={L6.plan.n} fps={FPS.loop} width={1600} height={1000} />
        {/* 4:5 punch-ins for phones (critic H2), the same timelines; see HANDOFF-G2b-loops.md for why only these three */}
        <Composition id="LoopCompanionPhone" component={LoopCompanion} durationInFrames={L1.plan.n} fps={FPS.loop} width={1080} height={1350} />
        <Composition id="LoopIsolatedTestsPhone" component={LoopIsolatedTests} durationInFrames={L4.plan.n} fps={FPS.loop} width={1080} height={1350} />
        <Composition id="LoopAgentGuardPhone" component={LoopAgentGuard} durationInFrames={L6.plan.n} fps={FPS.loop} width={1080} height={1350} />
        <Composition id="LoopReviewCommands" component={LoopStub} durationInFrames={240} fps={FPS.loop} width={1600} height={1000} defaultProps={{ id: "LoopReviewCommands" as const }} />
      </Folder>
      <Folder name="Stills">
        {/* one-frame compositions at 30 fps, not <Still> (1 fps): engine and camera time stay right (lane G2b) */}
        <Composition id="FilmPoster" component={FilmPoster} durationInFrames={1} fps={FPS.film} width={1280} height={720} />
        <Composition id="OgImage" component={OgImage} durationInFrames={1} fps={FPS.film} width={1200} height={630} />
      </Folder>
      <Folder name="Tools">
        <Composition id="ComponentCheck" component={ComponentCheck} durationInFrames={COMPONENT_CHECK_FRAMES} fps={FPS.film} width={1920} height={1080} />
        <Still id="FontMetrics" component={FontMetrics} width={1920} height={400} />
        <Still id="RiverbedPlate" component={RiverbedPlate} width={RIVERBED_PLATE.width} height={RIVERBED_PLATE.height} />
        <Composition id="Placeholder" component={Placeholder} durationInFrames={90} fps={FPS.film} width={1920} height={1080} />
        <Composition id="PebbleDemo" component={PebbleDemo} durationInFrames={PEBBLE_DEMO_FRAMES} fps={FPS.film} width={1920} height={1080} />
      </Folder>
    </>
  );
};
