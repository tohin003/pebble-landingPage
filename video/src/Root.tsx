import { Composition } from "remotion";
import { FPS } from "./motion/spec";
import { Placeholder } from "./Placeholder";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Placeholder" component={Placeholder} durationInFrames={90} fps={FPS.film} width={1920} height={1080} />
    </>
  );
};
