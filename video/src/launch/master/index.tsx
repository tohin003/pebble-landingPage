// The launch film's master compositions (docs/launch/TREATMENT.md §1): LaunchFilm-16x9 (1920×1080) and LaunchFilm-4x5
// (1080×1350), 30 fps, FILM_S long (99.4 s: where the music ends, FIXES-3 N-6). Registered from launch/Root.tsx. Scripts: master/{draft,final,deliver,qa}.sh.
import { Composition, Folder } from "remotion";
import { MUSIC, MUSIC_PICK } from "../data/music";
import { Master, type MasterProps } from "./Master";
import { FILM_FPS, FILM_S } from "./timeline";

const SIZES = [
  { id: "16x9", width: 1920, height: 1080 },
  { id: "4x5", width: 1080, height: 1350 },
] as const;

export const MasterCompositions: React.FC = () => (
  <Folder name="LaunchFilm">
    {SIZES.map((sz) => (
      <Composition
        key={sz.id}
        id={`LaunchFilm-${sz.id}`}
        component={Master}
        durationInFrames={Math.round(Math.min(FILM_S, MUSIC[MUSIC_PICK].durationS) * FILM_FPS)}
        fps={FILM_FPS}
        width={sz.width}
        height={sz.height}
        defaultProps={{ music: MUSIC_PICK, sfx: true, sfxDb: 0, musicDb: 0 } satisfies MasterProps}
      />
    ))}
    {SIZES.map((sz) => (
      // the drafts' 30 fps twins (Remotion's --fps keeps the frame count, so a 30 fps draft needs its own composition)
      <Composition
        key={`${sz.id}-draft30`}
        id={`LaunchFilm-${sz.id}-draft30`}
        component={Master}
        durationInFrames={Math.round(Math.min(FILM_S, MUSIC[MUSIC_PICK].durationS) * 30)}
        fps={30}
        width={sz.width}
        height={sz.height}
        defaultProps={{ music: MUSIC_PICK, sfx: true, sfxDb: 0, musicDb: 0 } satisfies MasterProps}
      />
    ))}
  </Folder>
);
