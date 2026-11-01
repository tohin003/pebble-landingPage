# Media licence

The films, loops, posters, stills and social images made for Pebble's website are © 2026 Tohin Majumder. They are not
covered by the Apache License 2.0 that covers the code in this repository (`LICENSE`), as `CREDITS.md` says.
Third-party material inside them keeps its own licence, listed below.

This covers everything under `public/media/` and the interface stills under `public/ui/`:

- `media/v2/film-1080` and `film-720`, each as `.hevc.mp4` and `.h264.mp4`: the launch film, a 76.8 s trailer, with
  its soundtrack.
- `media/v2/film-square`, as `.hevc.mp4` and `.h264.mp4`: the same film in its own 1:1 framing, played on phones, with
  the same soundtrack.
- `media/v2/film.en.vtt`, `film.chapters.vtt` and `film.descriptions.en.vtt`: the film's captions (its sound
  descriptions and on-screen lines), its chapters, and the descriptions the player's audio-description toggle reads.
- `media/v1/loop-companion`, `loop-models`, `loop-isolated-tests`, `loop-memory` and `loop-views`: silent feature
  loops, with 4:5 cuts for phones of the companion and isolated-tests loops (`-phone`).
- `*.poster.avif` and `*.poster.webp`: each video's first frame. The film's, `media/v2/film.poster`, is the 16:9
  film's first frame; the loops' are in `media/v1`.
- `media/v1/wallpaper-*`: the riverbed wallpaper.
- `ui/v1/`: stills of Pebble's real interface, in both themes and two widths.
- `media/v3/` (when published) the Pebble 2.0 launch: `film-1080` and `film-720`, each as `.hevc.mp4` and `.h264.mp4`,
  the launch film with its soundtrack; `film-phone`, its 4:5 cut for phones (1080 × 1350), which replaces the 1:1 cut;
  its three text tracks; `film.poster` and `film-phone.poster`; and the 2.0 feature loops (`loop-desk`, `loop-mac-apps`,
  `loop-mac-actions`, `loop-mac-web`, `loop-guard`, `loop-workshop`, `loop-memory`, `loop-long-tasks`, `loop-remote`,
  `loop-stealth`), silent, each with its poster and an optional 4:5 cut (`-phone`). `ui/v2/`: stills of Pebble 2.0.x's
  interface. Files in `media/v1`, `media/v2` and `ui/v1` are served as immutable and never overwritten; a fix to a
  published `v3` file goes to `v4`.

The social films for X and LinkedIn, and a narrated version of the film whose narrator is an AI voice (Sarvam AI's
Bulbul), are made from the same sources and are not in this repository.

## What is in them

- **Pebble's real interface.** The product interface shown is Pebble's own (Apache-2.0,
  https://github.com/tohin003/Pebble), never redrawn. The 1.x media capture it from the app's code; everything they
  show is fictional sample data: Maya, a Python project called `invoice-kit`, a Lisbon trip budget and a datetime quiz.
  The 2.0 launch's clips are recordings of the real app (takes of the 2.0.0 build and a harness of the published 2.0.1
  release) and of Pebble Remote built from its published source, with their own fictional sample data; each is
  captioned "Shown with sample data." with the version it was recorded from. The long-tasks loop is a diagram, captioned
  as one.
- **The pebble.** Pebble's character engine: bloub by Jérémy Perret (MIT).
- **The type.** Fraunces, Inter and Geist Mono, under the SIL Open Font License 1.1.
- **The riverbed wallpaper.** Original, made for this site.
- **The music.** The launch trailer's score, an original score composed for the film and synthesised entirely in code
  by this repository's own engine (`tools/audio/synth`; the score is `tools/audio/scores/trailer_b.py`). It uses no
  samples, no downloads and no third-party music. The Pebble 2.0 launch film (`media/v3`) uses "Your Breath" by
  Eugenio Mininni (Mixkit), under the Mixkit Stock Music Free License, which requires no credit; `CREDITS.md` and
  `/credits` name it as a courtesy.
- **The sound effects.** Synthesised for the film and released under CC0 1.0, plus recorded foley from Kenney's
  "Impact Sounds" and "Interface Sounds" (www.kenney.nl, CC0 1.0). The launch film's effects come from the same two
  Kenney packs and sounds designed in code for this project (CC0 1.0).
- **Audio** is only in the film files. The loops are silent, and no audio file is distributed on its own.

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
