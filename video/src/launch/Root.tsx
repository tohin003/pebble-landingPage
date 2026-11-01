// The launch film's compositions (docs/launch/TREATMENT.md), registered from video/src/Root.tsx. Every one is laid out
// for 16:9 (1920×1080) and 4:5 (1080×1350) from launch/layout.ts; ids carry the aspect.
import { Composition, Folder } from "remotion";
import { MasterCompositions } from "./master";
import { ScenePreviews } from "./scenes/Previews";
import { CHECK_SCENES, CHECK_SEG_S, ComponentCheck } from "./style/ComponentCheck";
import { MOTION_TEST_S, MotionTest } from "./style/MotionTest";
import { STYLE_SCENES, STYLE_SEG_S, StyleFrames } from "./style/StyleFrames";

export const LAUNCH_FPS = 60;

const SIZES = [
  { id: "16x9", width: 1920, height: 1080 },
  { id: "4x5", width: 1080, height: 1350 },
] as const;

export const LaunchCompositions: React.FC = () => (
  <Folder name="Launch">
    {SIZES.map((sz) => (
      <Composition
        key={`style-${sz.id}`}
        id={`LaunchStyle-${sz.id}`}
        component={StyleFrames}
        durationInFrames={STYLE_SCENES * STYLE_SEG_S * LAUNCH_FPS}
        fps={LAUNCH_FPS}
        width={sz.width}
        height={sz.height}
      />
    ))}
    {SIZES.map((sz) => (
      <Composition
        key={`motion-${sz.id}`}
        id={`LaunchMotionTest-${sz.id}`}
        component={MotionTest}
        durationInFrames={MOTION_TEST_S * LAUNCH_FPS}
        fps={LAUNCH_FPS}
        width={sz.width}
        height={sz.height}
      />
    ))}
    {SIZES.map((sz) => (
      <Composition
        key={`check-${sz.id}`}
        id={`LaunchComponents-${sz.id}`}
        component={ComponentCheck}
        durationInFrames={CHECK_SCENES * CHECK_SEG_S * LAUNCH_FPS}
        fps={LAUNCH_FPS}
        width={sz.width}
        height={sz.height}
      />
    ))}
    <ScenePreviews />
    <MasterCompositions />
  </Folder>
);
