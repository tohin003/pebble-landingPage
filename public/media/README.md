# Media licence

The films, loops, posters, stills and social images made for Pebble's website are © 2026 Tohin Majumder. They are not
covered by the Apache License 2.0 that covers the code in this repository (`LICENSE`), as `CREDITS.md` says.
Third-party material inside them keeps its own licence, listed below.

This covers everything under `public/media/` and the interface stills under `public/ui/`:

- `media/v3/`, the Pebble 2.0 launch (since 2 November 2026):
  - `film-1080.hevc.mp4` and `film-720.h264.mp4`: the Pebble 2.0 launch film, 99.4 s, with its soundtrack (the plan's
    two 16:9 files; `tools/encode/README.md` says why these two);
  - `film-phone.hevc.mp4` and `.h264.mp4`: the same film in its own 4:5 layout (1080 × 1350), played on phones;
  - `film.en.vtt`, `film.chapters.vtt` and `film.descriptions.en.vtt`: the film's captions (its on-screen type; the
    film has no voice), its chapters, and the descriptions the player's audio-description toggle reads;
  - `film.poster` and `film-phone.poster` (`.avif`, `.webp`): each film's first frame;
  - the 2.0 feature loops (`loop-<id>`, with `-phone` 4:5 cuts), silent, each cut from the film's own frames, with its
    poster: `tools/encode/launch-loops.json` lists them.
- `media/v1/loop-models`, `loop-isolated-tests` and `loop-views`: the 1.x silent feature loops, with a 4:5 cut for
  phones of the isolated-tests loop (`-phone`), and their posters. `loop-companion` and `loop-memory` retired on 2
  November 2026, when the 2.0 clips `desk` and `memory` took their places; their files are in git history.
- `media/v1/wallpaper-*`: the riverbed wallpaper.
- `ui/v1/`: stills of Pebble's real interface, in both themes and two widths; `ui/v2/` (when published): Pebble 2.0.x's.
- Retired: `media/v2/`, the 1.x launch trailer (a 76.8 s trailer, its 1:1 cut, tracks and poster), replaced by the
  Pebble 2.0 launch film at the owner's ask on 2 November 2026. Its files are in git history.

Files in `media/v1`, `media/v3` and `ui/v1` are served as immutable and never overwritten; a fix to a published `v3`
file goes to `v4`. The film's social copies (LinkedIn, YouTube) are made from the same masters by the film's own
delivery script (`video/src/launch/master/deliver.sh`) and are not in this repository.

## What is in them

- **Pebble's real interface.** The product interface shown is Pebble's own (Apache-2.0,
  https://github.com/tohin003/Pebble), never redrawn. The Pebble 2.0 launch film and its loops show recordings of
  Pebble 2.0 on a Mac, Pebble 2.0.1's own interface running with sample data, and the Pebble Remote app (open source)
  in the iOS Simulator against a stand-in Mac, all with fictional sample data (a pottery studio's open day, its kiln
  and its bookings). Personal and production details in the recordings are masked; Pebble's own windows are never
  altered. Each loop is captioned "Shown with sample data." with where its pictures come from; the long-tasks loop is
  a diagram, captioned as one. The 1.x loops capture the app's code with the earlier sample data (Maya, a Python
  project called `invoice-kit`, a Lisbon trip budget and a datetime quiz).
- **The pebble.** Pebble's character engine: bloub by Jérémy Perret (MIT), in the film, its loops and the 1.x loops.
- **The type.** Fraunces, Inter and Geist Mono, under the SIL Open Font License 1.1.
- **The riverbed wallpaper.** Original, made for this site.
- **The music.** The Pebble 2.0 launch film uses "Your Breath" by Eugenio Mininni (Mixkit), under the Mixkit Stock
  Music Free License, which requires no credit; `CREDITS.md` and `/credits` name it as a courtesy. (The retired
  trailer's score was synthesised in code by this repository's engine, `tools/audio/synth`.)
- **The sound effects.** Kenney's "Impact Sounds" and "Interface Sounds" (www.kenney.nl, CC0 1.0) and sounds designed
  in code for this project (CC0 1.0).
- **Audio** is only in the film files. The loops are silent, and no audio file is distributed on its own.

## Where the sources and tools are

In this repository, https://github.com/tohin003/pebble-landingPage:

- `video/src/launch/`: the Remotion project for the Pebble 2.0 launch film (its scenes, master, captions and
  delivery); `video/` holds the earlier films, the 1.x loops, the posters and the social card.
- `capture/`: the harnesses that capture Pebble's real interface, with their fictional sample data.
- `tools/encode/`: the site's encodes and their checks (`launch-site.sh` makes every site file of the film).
  `tools/captions/`: the text tracks. `tools/assets/`: the stills and the wallpaper. `tools/audio/`: the earlier
  films' score, sound effects and mix.
- `docs/media-provenance.json`: the source, hash and licence of the audio inputs.
- `docs/BUILDING.md`: how to rebuild everything, the launch film's site files included.

If the film's music, or any third-party material in the media, changes, update this file and `CREDITS.md` together.
