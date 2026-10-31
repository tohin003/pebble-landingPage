// The Pebble 2.0 launch reel's compositions (folder "Reel"), 60 fps: the style test in 16:9 (1920×1080) and 9:16
// (1080×1920). src/Root.tsx mounts this.
import { Composition, Folder } from "remotion";
import { ReelStyleTest, styleTestLength } from "./StyleTest";

const lengthOr = (): number => {
  try {
    return styleTestLength();
  } catch {
    return 900; // a plan that can't be built right now never throws at registration
  }
};

export const ReelCompositions: React.FC = () => (
  <Folder name="Reel">
    <Composition id="Reel-StyleTest-16x9" component={ReelStyleTest} durationInFrames={lengthOr()} fps={60} width={1920} height={1080} />
    <Composition id="Reel-StyleTest-9x16" component={ReelStyleTest} durationInFrames={lengthOr()} fps={60} width={1080} height={1920} />
  </Folder>
);
