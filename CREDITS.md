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

## Launch film: music

- **"Pebble launch cue"**: an original score composed for this film (`tools/audio/compose_score.py`) and played on
  recorded instrument samples by our own sampler (`tools/audio/render_sampled.py`). It uses no third-party music. It
  is part of the film media (© 2026 Tohin Majumder).
- **Instrument samples** (CC0 1.0; credit is a courtesy, not a requirement):
  - **Versilian Community Sample Library (VCSL)** by Versilian Studios (https://github.com/sgossner/VCSL): marimba,
    vibraphone, glockenspiel, upright piano, bass drum and shaker.
  - **VS Chamber Orchestra: Community Edition (VSCO 2 CE)** by Versilian Studios (Sam Gossner) and Ivy Audio
    (Simon Dalzell) (http://vis.versilstudios.net/vsco-community.html): viola and violin sections, and the double
    bass pizzicato.
  - Each file, with its pinned commit and SHA-256 hash, is listed in `tools/audio/sample_kit.json`.
  - The samples are never distributed on their own: they are heard only inside the film.
- The same score synthesised entirely in code, with no samples, was the film's first music. It stays one command
  away: `tools/audio/use_music.sh original`.
- How it was chosen: five Mixkit tracks were auditioned and scored first. None reached the pass mark, so the planned
  composed fallback was used, then played on recorded instruments. The scores, the licence checks and the sources
  are in `docs/media-provenance.json`.
- If the film is switched to one of the Mixkit alternates (`tools/audio/use_music.sh mixkit-<id>`), replace this entry
  with that track's `credit_if_used` line from `docs/media-provenance.json`, under the Mixkit Stock Music Free License
  (https://mixkit.co/license/#musicFree), and keep Mixkit's terms: web and social use only; no broadcast, game, CD or
  DVD use; no music-only remix; no Content ID registration; the track is never distributed on its own.

## Launch film: sound effects

- Original sound effects synthesised for this project (`tools/audio/sfx_synth.py`): the whooshes, the riser, the soft
  hit, the shimmer and the downlifter. CC0 1.0.
- Kenney (www.kenney.nl), "Impact Sounds" and "Interface Sounds": recorded clicks, ticks, drops and soft thuds,
  trimmed, filtered and tuned for the film (`tools/audio/sfx_foley.py`). CC0 1.0. The source files and their hashes are
  listed in `docs/media-provenance.json`.

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
