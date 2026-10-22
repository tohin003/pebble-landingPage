import { Composition } from "remotion";
import { FPS } from "./motion/spec";
import { Placeholder } from "./Placeholder";
import { PEBBLE_DEMO_FRAMES, PebbleDemo } from "./pebble/PebbleDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Placeholder" component={Placeholder} durationInFrames={90} fps={FPS.film} width={1920} height={1080} />
      <Composition id="PebbleDemo" component={PebbleDemo} durationInFrames={PEBBLE_DEMO_FRAMES} fps={FPS.film} width={1920} height={1080} />
    </>
  );
};
