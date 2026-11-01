// LaunchStyle-16x9 and LaunchStyle-4x5: the six style frames of the look, two seconds each, in one composition per
// aspect. Each scene animates in and settles; the stills are taken at STILL_AT seconds into each.
//   (1) the cold open  (2) the title lockup  (3) a feature beat on real UI  (4) the benchmark card
//   (5) the accent card  (6) Stealth Lockdown's dusk look
import { AbsoluteFill, Sequence } from "remotion";
import { FontGate } from "../components/FontGate";
import { useS } from "../timing";
import { AccentCard, BenchmarkCard, ColdOpen, FeatureApps, StealthLook, TitleLockup, type SceneProps } from "./scenes";

export const STYLE_SEG_S = 2;
/** the still's time inside each two-second scene */
export const STILL_AT_S = 1.7;

const SCENES: { name: string; Scene: React.FC<SceneProps> }[] = [
  { name: "1 cold open", Scene: ColdOpen },
  { name: "2 title lockup", Scene: TitleLockup },
  { name: "3 feature: your apps", Scene: FeatureApps },
  { name: "4 benchmark", Scene: BenchmarkCard },
  { name: "5 accent", Scene: AccentCard },
  { name: "6 stealth", Scene: StealthLook },
];

export const STYLE_SCENES = SCENES.length;

/** The frame of style frame `i` (0-based) at `fps`. */
export const styleStillFrame = (i: number, fps: number) => Math.round((i * STYLE_SEG_S + STILL_AT_S) * fps);

export const StyleFrames: React.FC = () => {
  const S = useS();
  return (
    <AbsoluteFill style={{ backgroundColor: "#070B09" }}>
      <FontGate>
        {SCENES.map(({ name, Scene }, i) => (
          <Sequence key={name} name={name} from={S(i * STYLE_SEG_S)} durationInFrames={S(STYLE_SEG_S)}>
            <Scene dur={STYLE_SEG_S} />
          </Sequence>
        ))}
      </FontGate>
    </AbsoluteFill>
  );
};
