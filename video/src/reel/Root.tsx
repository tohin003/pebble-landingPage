// The Pebble 2.0 launch reel's compositions (folder "Reel"), 60 fps: the style test in 16:9 (1920×1080) and 9:16
// (1080×1920). src/Root.tsx mounts this.
import { Composition, Folder } from "remotion";
import { ReelStyleTest, styleTestLength } from "./StyleTest";
import { FullReel, fullReelLength } from "./full/FullReel";

const lengthOr = (): number => {
  try {
    return styleTestLength();
  } catch {
    return 900; // a plan that can't be built right now never throws at registration
  }
};

const fullLengthOr = (): number => {
  try {
    return fullReelLength();
  } catch {
    return 3246;
  }
};

export const ReelCompositions: React.FC = () => (
  <Folder name="Reel">
    <Composition id="Reel-StyleTest-16x9" component={ReelStyleTest} durationInFrames={lengthOr()} fps={60} width={1920} height={1080} />
    <Composition id="Reel-StyleTest-9x16" component={ReelStyleTest} durationInFrames={lengthOr()} fps={60} width={1080} height={1920} />
    {/* the full reel, on the locked 50.1-s score: each aspect composed for its own frame */}
    <Composition id="Reel-Full-16x9" component={FullReel} durationInFrames={fullLengthOr()} fps={60} width={1920} height={1080} />
    <Composition id="Reel-Full-9x16" component={FullReel} durationInFrames={fullLengthOr()} fps={60} width={1080} height={1920} />
    <Composition id="Reel-Full-1x1" component={FullReel} durationInFrames={fullLengthOr()} fps={60} width={1080} height={1080} />
    {/* the posters: `npx remotion still src/index.ts Reel-Full-<aspect> poster.png --frame=2680` (the logo's lockup) */}
  </Folder>
);
