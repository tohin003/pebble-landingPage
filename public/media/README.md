# Media licence

The films, loops, posters, stills and social images made for Pebble's website are © 2026 Tohin Majumder. They are not
covered by the Apache License 2.0 that covers the code in this repository (`LICENSE`), as `CREDITS.md` says.
Third-party material inside them keeps its own licence, listed below.

This covers everything under `public/media/` (the riverbed wallpaper now; the films, loops, posters and captions after
the media phase) and the interface stills under `public/ui/`.

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
- **Audio** exists only inside the films. No audio file is distributed on its own.

## Where the sources and tools are

In this repository, https://github.com/tohin003/pebble-landingPage:

- `capture/`: the harness that captures Pebble's real interface, with the fictional sample data in
  `capture/mock/fixtures.js`.
- `video/`: the Remotion project for the films, the loops, the posters and the social card.
- `tools/audio/`: the score, the sampler, the sound effects and the mix. `tools/audio/sample_kit.json` and
  `tools/audio/sha256-sources.txt` pin every sample and sound pack to its source and SHA-256.
- `tools/assets/`: the stills and the wallpaper. `tools/encode/`: the web encodes.
- `docs/media-provenance.json`: the source, hash and licence of every audio input, and how the music was chosen.
- `docs/BUILDING.md`: how to rebuild all of it.

If the film's music, or any third-party material in the media, changes, update this file and `CREDITS.md` together.
