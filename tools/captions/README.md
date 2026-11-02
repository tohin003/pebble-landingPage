# tools/captions

The film's text tracks for the site, built from their two sources (MASTER_PLAN §5.5). Node 24, no dependencies
(`src/content/chapters.ts` is imported with Node's built-in type stripping, so it imports nothing itself).

| Source | Output, in `public/media/v3/` |
|---|---|
| The film's own captions: `video/src/launch/master/captions.ts` (the director's; 46 cues of the film's on-screen type, in master seconds), whose `bun … --write` writes `video/out/launch/pebble-2.0-launch.vtt` (gitignored) | `film.en.vtt`: that VTT, cue for cue, with the site's note |
| `src/content/chapters.ts` `startSeconds` and `title` | `film.chapters.vtt` |
| `src/content/chapters.ts` `description`, one cue a chapter | `film.descriptions.en.vtt`, read aloud by the film player's audio-description toggle |

```bash
bun video/src/launch/master/captions.ts --write   # first: the film's VTT and SRT (the film's own --check runs first)
node tools/captions/build.mjs --check             # validate only
node tools/captions/build.mjs                     # the three VTTs into public/media/v3
node tools/captions/build.mjs --srt <file.srt>    # ... and the film's captions as SRT
```

`tools/encode/launch-site.sh tracks` runs the first and the third.

- **One caption source**: the film's captions are written once, in `captions.ts`, and the site copies its output. To
  change a caption, change it there (it is the director's file); the site's `film.en.vtt` follows on the next build.
  The /film transcript is the page's own text (`chapters.ts` `onScreen` and `description`); `film.test.ts` checks that
  it carries every word of every caption, chapter by chapter, but one.
- **The one exception, by the owner's ruling of 2 Nov 2026** (`docs/launch/CHECKPOINT.md`): the long-task scene's
  title. The film keeps it on screen, so its caption track keeps it too, as the film's words. The page's own text, its
  chapter titles and its descriptions use "long tasks", never that name, and the copy lint and `facts.test.ts` still
  ban it in `src/content`. The lint reads the built pages and `src/content`, not the tracks, so the caption track
  needs no lint exception.
- **Times**: the film runs at 30 fps; every caption time is on one of its frames (checked) and inside the film
  (`chapters.ts` `FILM_DURATION_SECONDS`, 99.4 s). Milliseconds: `HH:MM:SS.mmm` in WebVTT, `HH:MM:SS,mmm` in SRT, SRT
  cues counted from 1. The VTTs carry a `NOTE` naming their source.
- **Rules** (`cues.mjs`): time order, no overlaps, one or two lines of at most 42 characters, at least 1.2 s on screen,
  at most 3.5 words a second (above 3 is a warning), no exclamation mark; a word is a token with a letter or a digit.
  Any error: nothing is written.
- **The film's own pace** (`cues.mjs` `FILM_OWN_PACE`, the director's note for site phase 2): the film has no voice,
  and its captions carry its type for as long as the type is readable. Some of it reads faster than 3.5 words a
  second (the premise in S00, AgentGuard's rows, S08's small line, the honest line split over three cues, S10's
  cards, the end card), and `captions.ts` marks each such cue `fast`, with its reason (its own `--check` fails an
  unmarked one). Here a caption above 3.5 words a second is a warning, up to 10, and an error above that.
- **Descriptions**: a warning says when a description needs more speech (at 150 words a minute) than its chapter
  lasts. All twelve of this dense film's do: the player holds the film on the chapter's last frame until the voice is
  done (extended description; `src/lib/audioDescription.ts`).
- `tools/encode/verify.mjs` rebuilds these texts in memory and fails a `film.*.vtt` or a full-film `.srt` that differs
  (with the film's VTT missing, as in a fresh clone, it checks syntax and rules only).
- **Retired with the 1.x trailer** (2 Nov 2026; git history keeps them): `docs/film-captions.json` as the site's
  caption source (the trailer's own code still reads it), the narrated twin's SRT (`--narrated-srt`,
  `docs/film-narration.json`) and the cut captions (`--cut`, `docs/film-cuts/x30.json`).
