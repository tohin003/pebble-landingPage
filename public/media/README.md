# Media licence

The films, loops, posters, stills and social images made for Pebble's website are © 2026 Tohin Majumder. They are not
covered by the Apache License 2.0 that covers the code in this repository (`LICENSE`), as `CREDITS.md` says.
Third-party material inside them keeps its own licence, listed below.

This covers everything under `public/media/` and the interface stills under `public/ui/`:

- `media/v1/film-1080` and `film-720`, each as `.hevc.mp4` and `.h264.mp4`: the launch film, 76.8 s, with its
  soundtrack.
- `media/v1/film.en.vtt`, `film.chapters.vtt` and `film.descriptions.en.vtt`: the film's captions (its sound
  descriptions and on-screen lines), its chapters, and the descriptions the player's audio-description toggle reads.
- `media/v1/teaser-720`: a silent teaser of the film.
- `media/v1/loop-companion`, `loop-models`, `loop-isolated-tests`, `loop-memory` and `loop-views`: silent feature
  loops, with 4:5 cuts for phones of the companion and isolated-tests loops (`-phone`).
- `*.poster.avif` and `*.poster.webp`: each video's first frame. The film's poster and the teaser's are the same
  picture.
- `media/v1/wallpaper-*`: the riverbed wallpaper.
- `ui/v1/`: stills of Pebble's real interface, in both themes and two widths.

The social films for X and LinkedIn are made from the same sources and are not in this repository.

## What is in them

- **Pebble's real interface.** The product interface shown is Pebble's own (Apache-2.0,
  https://github.com/tohin003/Pebble), captured from the app's code, never redrawn. Everything it shows is fictional
  sample data: Maya, a Python project called `invoice-kit`, a Lisbon trip budget and a datetime quiz.
- **The pebble.** Pebble's character engine: bloub by Jérémy Perret (MIT).
- **The type.** Fraunces, Inter and Geist Mono, under the SIL Open Font License 1.1.
- **The riverbed wallpaper.** Original, made for this site.
- **The music.** "Pebble launch cue", an original score composed for the film and played on recorded instrument samples
  released under CC0 1.0: the Versilian Community Sample Library (VCSL) by Versilian Studios, and VS Chamber Orchestra:
  Community Edition (VSCO 2 CE) by Versilian Studios (Sam Gossner) and Ivy Audio (Simon Dalzell). The films contain no
  third-party music. Tracks from Mixkit's free library were auditioned for the film and not used.
- **The sound effects.** Synthesised for the film and released under CC0 1.0, plus recorded foley from Kenney's
  "Impact Sounds" and "Interface Sounds" (www.kenney.nl, CC0 1.0).
- **Audio** is only in the film files. The teaser and the loops are silent, and no audio file is distributed on its
  own.

## Where the sources and tools are

In this repository, https://github.com/tohin003/pebble-landingPage:

- `capture/`: the harness that captures Pebble's real interface, with the fictional sample data in
  `capture/mock/fixtures.js`.
- `video/`: the Remotion project for the films, the loops, the posters and the social card.
- `tools/audio/`: the score, the sampler, the sound effects and the mix. `tools/audio/sample_kit.json` and
  `tools/audio/sha256-sources.txt` pin every sample and sound pack to its source and SHA-256.
- `tools/assets/`: the stills and the wallpaper. `tools/encode/`: the web and social encodes and their checks.
  `tools/captions/`: the text tracks.
- `docs/media-provenance.json`: the source, hash and licence of every audio input, and how the music was chosen.
- `docs/BUILDING.md`: how to rebuild all of it.

If the film's music, or any third-party material in the media, changes, update this file and `CREDITS.md` together.
