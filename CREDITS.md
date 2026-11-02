# Credits and licences

The code in this repository is licensed under the Apache License 2.0 (see `LICENSE`). That licence does **not** cover
the media or the third-party work below: each keeps its own licence. The site shows the same list at `/credits`
(from `src/content/credits.ts`; keep the two in step).

## Media

- The films, loops, posters, stills and social images are © 2026 Tohin Majumder. They are not covered by the code
  licence.
- The product interface in them is Pebble's real interface (Apache-2.0), shown with fictional sample data.
- Audio is distributed only inside the rendered films, never as standalone files.

## The pebble

**Pebble's character engine: bloub by Jérémy Perret (MIT)**

- Source: https://github.com/jeremy-prt/bloub, revision `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749`.
- Copied from the copy vendored in Pebble (`src/vendor/bloub/`) into `shared/pebble/bloub/`, with its MIT licence
  text in `shared/pebble/bloub/LICENSE` ("Copyright (c) 2026 Jérémy Perret").
- The site and the films use only Pebble's own poses.

## Pebble 2.0 launch film: music and sound effects

Since 2 November 2026 the site's film is the Pebble 2.0 launch film (`public/media/v3/`).

- **"Your Breath"** by Eugenio Mininni (Mixkit), edited to picture: the music of the Pebble 2.0 launch film. Mixkit Stock
  Music Free License (https://mixkit.co/license/): no credit is required; this line is a courtesy. The source file's
  hash, the edit and its licence are in `docs/media-provenance.json` (`launch_film`); the working record is
  `.work/launch/music/MUSIC.md` (not committed).
- Sound effects: Kenney (www.kenney.nl), "Impact Sounds" and "Interface Sounds", CC0 1.0, and sounds designed in code
  for this project, CC0 1.0. Pebble itself makes no sounds.
- The pebble: wherever it appears in the film and in the clips cut from it, it is drawn by Pebble's character engine
  (above), in the app's recordings and in the film's own scenes alike. The film's end card credits it: "Pebble's
  character engine: bloub by Jérémy Perret (MIT)".

## The 1.x launch trailer (retired from the site)

The site played the 1.x launch trailer until 2 November 2026, when the Pebble 2.0 launch film replaced it at the
owner's request. Its files are in git history (`public/media/v2/`); its sources stay in the repository
(`video/src/film/`, `tools/audio/`). No media on the site plays its score or its effects now.

### Music

- **"Pebble launch trailer score"**: an original score composed for the launch trailer and synthesised entirely in
  code by this repository's synthesis engine (`tools/audio/synth`; the score is `tools/audio/scores/trailer_b.py`). It
  uses no samples, no downloads and no third-party music. It is part of the film media (© 2026 Tohin Majumder).
- How it was chosen: two candidate scores were written on the engine for the trailer's blueprint, and a judge picked
  one by measurement (energy, the hits' sync, the climax and the classifier gates). The candidates, the judge and the
  masters' gates are in `docs/media-provenance.json` (`music.trailer_score`).
- The earlier film's score, played on CC0 instrument samples (the Versilian Community Sample Library and VS Chamber
  Orchestra: Community Edition), is retired with that film; no media on the site plays it.

### Sound effects

- Original sound effects synthesised for this project: the whooshes, the impacts, the sounds on the interface's
  events, the rim clicks (`tools/audio/sfx_synth.py`) and the suck-backs (`tools/audio/synth`). CC0 1.0. They are the
  film's sound design: Pebble itself makes no sounds. The trailer plays no riser, soft hit, shimmer or downlifter from
  the kit.
- Kenney (www.kenney.nl), "Impact Sounds" and "Interface Sounds": recorded clicks, ticks and soft thuds, trimmed,
  filtered and tuned for the trailer (`tools/audio/sfx_foley.py`). CC0 1.0. The source files and their hashes are
  listed in `docs/media-provenance.json`.
- Which take plays where is the final cue list, `tools/audio/cues.json` (exported from `video/src/film/timeline.ts`).

## Fonts

All three are under the SIL Open Font License 1.1. The same files are used by the site (`src/fonts/`) and the films
(`video/public/fonts/`).

- **Fraunces**: Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces).
  `src/fonts/OFL-Fraunces.txt`
- **Inter**: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter). `src/fonts/OFL-Inter.txt`
- **Geist Mono**: Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git).
  `src/fonts/OFL-GeistMono.txt`

## Software in the site

| Package | Licence | Notice |
|---|---|---|
| Next.js | MIT | Copyright (c) 2025 Vercel, Inc. |
| React | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| Motion | MIT | Copyright (c) 2024 Motion B.V.; framer-motion: Copyright (c) 2018 Framer B.V. |
| Tailwind CSS | MIT | Copyright (c) Tailwind Labs, Inc. |
| Phosphor Icons | MIT | Copyright (c) 2020 Phosphor Icons |

## Pebble

- **Pebble**, the app this site is about: Apache-2.0, Copyright 2026 Tohin Majumder, https://github.com/tohin003/Pebble
- **Reliability: AgentGuard (Apache 2.0)**: Pebble's built-in reliability engine (see Pebble's `NOTICE.md`).

## Tools used to make the media (not distributed)

- **Remotion**: the `video/` project depends on Remotion, which is under the Remotion License
  (https://www.remotion.dev/docs/license), used here under its Free License.
- **FFmpeg** (LGPL 2.1 or later, with GPL parts in the Homebrew build), **librosa** (ISC), **Spotify pedalboard**
  (GPL-3.0), **pyloudnorm** (MIT), **sharp** (Apache-2.0), **puppeteer-core** 25.13.0 (Apache-2.0, Google), which
  drives Chrome for the interface captures and the QA checks, and Apple's SoundAnalysis framework.
