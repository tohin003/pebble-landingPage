# tools/captions

The film's text tracks, built from their two sources (MASTER_PLAN §5.5, FILM_SPEC §13, OVERRIDES §4). Node 24, no
dependencies (`src/content/chapters.ts` is imported with Node's built-in type stripping).

| Source | Output |
|---|---|
| `docs/film-captions.json` (lane E: sound descriptions and the on-screen lines, frame-timed) | `public/media/v2/film.en.vtt`, and the social `.srt` |
| `src/content/chapters.ts` `startSeconds` and `title` | `public/media/v2/film.chapters.vtt` |
| `docs/film-captions.json` `"descriptions"` if it ever has them; otherwise each chapter's `description` in `chapters.ts` (FILM_SPEC §18), one cue a chapter | `public/media/v2/film.descriptions.en.vtt`, read aloud by the film player's audio-description toggle |

The tracks live beside the film in `public/media/v2/` since the energetic recut (`src/lib/media.ts` `FILM_MEDIA`).
`--out-dir`'s default is still `public/media/v1`, so pass `--out-dir public/media/v2`; `verify.mjs` reports tracks in
`v1/` as strays.

```bash
node tools/captions/build.mjs --check                                            # validate only
node tools/captions/build.mjs --out-dir public/media/v2                          # the three VTTs into public/media/v2
node tools/captions/build.mjs --out-dir public/media/v2 --srt "$HOME/Desktop/Pebble launch film/Pebble-launch-film.srt"   # ... and the SRT
node tools/captions/build.mjs --cut <cut.json> --srt <file.srt> [--vtt <file.vtt>]               # a cut's captions
```

- **Times**: seconds = frame / 30; milliseconds are rounded from the frame (`HH:MM:SS.mmm` in WebVTT, `HH:MM:SS,mmm` in
  SRT; SRT cues count from 1). The VTTs carry a `NOTE` naming their source.
- **Rules** (`cues.mjs`, after lane E's validator `.work/laneE/validate-film-spec.ts`): time order, no overlaps, one or
  two lines of at most 42 characters, at least 1.2 s on screen, at most 3.5 words a second (above the caption file's
  own 3 is a warning), no exclamation mark; a word is a token with a letter or a digit. Every caption starts inside its
  chapter; `chapters.ts` `FILM_DURATION_SECONDS` must equal `total_frames / fps`. Any error: nothing is written.
- **Descriptions**: a warning says when a description needs more speech (at 150 words a minute) than its cue lasts.
  Today 7 of 9 do: the player reads each cue as the film reaches it and moves on at the next one.
- **Cuts**: see "Cut files" in `tools/encode/README.md`. `node tools/captions/cues.mjs cut-inputs <cut.json> <frames>`
  prints the frame-exact input seeks `encode.sh social --cut` uses.
- `tools/encode/verify.mjs` rebuilds these texts in memory and fails a `film.*.vtt` (or a full-film `.srt`) that differs.
