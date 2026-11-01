// Registers every launch scene as its own preview composition, in 16:9 and 4:5. Owned by the director; the scene
// groups (a … e) are owned by their workers and only export SceneDef[] (scenes/types.ts).
import { Composition, Folder } from "remotion";
import { GROUP_A } from "./a";
import { GROUP_B } from "./b";
import { GROUP_C } from "./c";
import { GROUP_D } from "./d";
import { GROUP_E } from "./e";
import type { SceneDef, SceneProps } from "./types";

const FPS = 60;
const SIZES = [
  { id: "16x9", width: 1920, height: 1080 },
  { id: "4x5", width: 1080, height: 1350 },
] as const;

export const ALL_SCENES: readonly SceneDef[] = [...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D, ...GROUP_E].sort(
  (p, q) => p.id.localeCompare(q.id),
);

export const ScenePreviews: React.FC = () => (
  <Folder name="LaunchScenes">
    {ALL_SCENES.flatMap((scene) =>
      SIZES.map((sz) => (
        <Composition
          key={`${scene.id}-${sz.id}`}
          id={`Launch-${scene.id}-${sz.id}`}
          component={scene.component}
          durationInFrames={Math.round(scene.nominalS * FPS)}
          fps={FPS}
          width={sz.width}
          height={sz.height}
          defaultProps={{ durationInFrames: Math.round(scene.nominalS * FPS) } satisfies SceneProps}
        />
      )),
    )}
  </Folder>
);
