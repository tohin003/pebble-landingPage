# Building everything

How to rebuild the site's media from nothing: the captures of Pebble's real interface, the stills, the recordings, the
score and the mix, the films in three aspects, the loops, the posters, the encodes and the checks. The site itself
needs none of this to build (see `README.md`); this is for when the product, the story or the music changes.

The commands come from the scripts' own headers and the folders' READMEs. When a script and this page disagree, the
script is right, and this page should be corrected.

## What you need

- **A Mac with Apple silicon.** `scripts/heavy.sh` reads macOS's memory pressure, swap and the
  `/System/Volumes/Data` volume, the captures drive the installed Google Chrome, and the audio checks use Apple's
  SoundAnalysis framework. The pipeline was built on an 8 GB Mac with a few GB of free disk.
- **Node.js 24** with npm, and **Bun 1.3** (the tests, the cue exporter and the film's checks run on Bun).
- **Homebrew FFmpeg** (arm64; 9.0.2 was used) at `/opt/homebrew/bin`. `scripts/env.sh` exports it as `$FF` and
  `ffprobe` as `$FP`; always call them that way.
- **Google Chrome** in `/Applications` (the captures and the QA tools drive it through puppeteer-core; nothing
  downloads a browser for them).
- **uv** with **Python 3.13** for the audio tools (a virtual environment inside `.work/`), and a Python with Pillow
  for the frame checks: `$PYQA`, which defaults to the python.org framework build of Python 3.14.
- **Xcode's command line tools**, for `xcrun swiftc` (the SoundAnalysis helper is compiled from
  `tools/audio/sound_tags.swift`).
- **A checkout of Pebble** (https://github.com/tohin003/Pebble) at the release the captures should show, with its
  frontend dependencies installed in it. The capture harness only reads it: it never writes there, caches included.
  The fixtures in `capture/mock/fixtures.js` name the version they were checked against (1.0.4 today).

## Before every command

Start every command from the repository root, after sourcing `scripts/env.sh`:

```bash
cd <repo> && source scripts/env.sh && …
```

`env.sh` derives `REPO` from its own location and reads `PEBBLE_REPO` from the environment or from the gitignored
`.work/local.env`. It puts `/opt/homebrew/bin` first on `PATH` and links `.work/bin/git` to `/usr/bin/git` (on the Mac
this was built on, the Intel builds in `/usr/local/bin` do not run). It exports `$FF`, `$FP`, `$PYQA` and
`CHROME_PATH`, turns telemetry off (`DO_NOT_TRACK`, `NEXT_TELEMETRY_DISABLED`), and keeps the npm, uv and Playwright
caches inside `.work/`. Shell state does not carry over between separate shells, so source it every time.

## Heavy jobs on a small Mac

`scripts/heavy.sh <label> <command> [args…]` runs one heavy job at a time. Heavy means: Remotion renders, stills and
Studio; `next build`; `next start` with Lighthouse; UI captures and recordings (Vite and headless Chrome); FFmpeg batch
encodes; audio analysis of more than one file; headless-Chrome screenshot batches. Editing, `tsc`, `next dev`, the
copy lint and single-file analysis are light, and may run beside one heavy job.

What it enforces:

- **One at a time.** An atomic lock at `.work/heavy.lock`. A second job waits for it (up to `HEAVY_WAIT_SECS`,
  3600 s by default). A lock whose runner and job are both dead is taken over.
- **Disk.** It refuses to start below 1.7 GiB free on `/System/Volumes/Data`, and stops a running job if free space
  falls below 1.5 GiB. A Remotion job whose headless browser is missing needs 0.6 GiB more, for the download.
- **Memory.** It refuses to start when `memory_pressure` reports less than 20 % free. When less than 0.75 GiB of swap
  is left, a job needs 1 GiB more free disk, because macOS is likely to add a swap file to the same disk.
- **Holds and reservations from other sessions.** While `.work/HOLD` exists, no heavy job starts; run
  `scripts/heavy.sh --wait-hold` (it waits up to 540 s, `HEAVY_HOLD_WAIT_SECS`), then retry. `.work/RESERVE` keeps
  disk for another session: its first line is the GiB to keep free, the rest is the reason.
- **Status and log.** `scripts/heavy.sh --status` shows the holder, any hold and the free disk; every start, end, exit
  code, duration and free-disk reading goes to `.work/heavy.log`.
- **Exit codes.** The job's own, or 64 (usage), 73 (refused: disk, memory or a hold), 74 (stopped at the disk floor),
  75 (the lock or the hold wait timed out).

Habits that keep a small Mac working:

- Never bypass `heavy.sh`. When it refuses, do light work and retry later.
- Stop `next dev` and Remotion Studio before rendering a master. Never run a render, a capture and `next dev` at once.
- Record UI frame sequences just in time and delete them once every master that reads them has rendered (the
  main-window recording is about 360 MB).
- Delete masters once their encodes have passed their checks.
- Render from `video/`, so Remotion uses the headless browser in `video/node_modules/.remotion/` instead of
  downloading a second copy.
- Delete the caches in `.work/` after each install step, and check `df -h /System/Volumes/Data` after every install,
  capture batch, render and encode.

## Install, once per clone

```bash
cd <repo>
mkdir -p .work && echo 'PEBBLE_REPO=/path/to/Pebble' > .work/local.env   # the read-only Pebble checkout
source scripts/env.sh
npm ci                                                   # the site
(cd video && npm ci && npx remotion browser ensure)      # the films; Remotion's headless browser is about 570 MB
(cd capture && npm ci --ignore-scripts)                  # puppeteer-core; no browser download
(cd tools/assets && npm ci)                              # sharp
(cd tools/qa && npm ci)                                  # axe-core
rm -rf "$npm_config_cache"                               # the npm cache lives in .work/
```

The audio tools use their own virtual environment, which is never installed globally:

```bash
uv venv --python 3.13 .work/audio/.venv
uv pip install --python .work/audio/.venv/bin/python -r tools/audio/requirements.txt && rm -rf "$UV_CACHE_DIR"
```

`tools/audio/requirements.txt` is the full stack (analysis, fitting, the sampler). The final mix and its checks need
only `tools/audio/requirements-mix.txt`; its header has the command for that smaller environment.

The films' desktop is a raster of the riverbed wallpaper. It is derived, so it is gitignored; make it once per clone:

```bash
cd video && ../scripts/heavy.sh riverbed npx remotion still src/index.ts RiverbedPlate public/desktop/riverbed-light@3x.png
```

## 1. Capture Pebble's real interface

`capture/` runs Pebble's own frontend (its Vite app, read from the checkout) in Chrome, with Tauri's official IPC
mocks standing in for the app's backend and a fictional world as the data: Maya, a Python project called
`invoice-kit`, a Lisbon trip budget and a datetime quiz. Nothing is redrawn: every picture of the app is the app.
`capture/README.md` lists every scene and timeline; these are the commands the site and the films use.

Every capture is a heavy job, and goes through `capture/with-server.sh`, which starts the harness's server, runs the
command and always stops the server. Pass `--locale=en-GB --tz=Europe/London` to `capture.mjs` (`record.mjs` sets
them itself). `capture.mjs` ends with a `SUMMARY:` line and exits 1 on any unhandled IPC call, error banner, console
error or scene error. Treat that as a failure, and look at every image anyway: some failures show only as text on
screen.

**Stills for the films and loops** (every scene, light theme, at 2x and 3x, named as `video/public/ui/` expects):

```bash
scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs --themes=light --scale=2,3 \
  --naming=video --out=video/public/ui --locale=en-GB --tz=Europe/London
```

**Sources for the page stills** (the scenes `tools/assets/stills.mjs` maps to page stills, both themes, at 3x):

```bash
scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs main-done-wide main-approval-wide \
  held-unverified-wide main-challenge-wide settings-permissions-wide settings-models-wide settings-memory-wide \
  main-quiz-wide main-dashboard pet-chat --exact --scale=3 --themes=light,dark --out=capture/shots/page \
  --locale=en-GB --tz=Europe/London
```

**Recordings** for the film, the loops and the teaser. `record.mjs` plays a timeline of backend events against a
virtual clock and saves one PNG per frame at 30 fps, so a recording is the same every time:

```bash
# the main window: request, Reading, the edit cards, AgentGuard's hold, Run the tests, Verified (690 frames, 3x)
scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs main-live-film --theme=light --scale=3 \
  --frames=690 --out=video/public/ui-frames/main-live-film
# the companion's quick chat for the film's opening, with the app's own pebble hidden (140 frames)
scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs pet-live-error --theme=light --scale=3 \
  --hide=.pet-avatar --frames=140 --out=video/public/ui-frames/pet-live-error
# the same chat at full length, for the companion loop
scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs pet-live-error --theme=light --scale=3 \
  --hide=.pet-avatar --out=video/public/ui-frames/pet-live-error-light-hidden
```

Adding `--from=3.8` to the first command saves no frame before 3.8 s (the numbering is kept): the film reads that
recording from 3.85 s and the teaser from 8.3 s. If a composition finds a recording missing, its error message prints
the command that makes it again (`RECORDINGS` in `video/src/loops/kit.tsx`).

Check every recording for frames that failed to paint, with `$PYQA`:

```bash
"$PYQA" -I capture/check_frames.py video/public/ui-frames/main-live-film 1 --ink
"$PYQA" -I capture/check_frames.py video/public/ui-frames/pet-live-error 19 --box=0.06,0.06,0.94,0.74 --ink
```

`capture/contact.py` makes a contact sheet and `capture/preview.py` an animated preview. To browse the harness by
hand: `node capture/serve.mjs`, then open `http://127.0.0.1:5199/?scene=approval&theme=dark`.

## 2. Stills, wallpaper, icons and fonts for the site

The tools live in `tools/assets/`. The images go through sharp, which writes no metadata; the display face is made
with fontTools.

| What | Command | Output |
|---|---|---|
| Page stills | `scripts/heavy.sh stills node tools/assets/stills.mjs` | `public/ui/v1/<name>-<theme>-<2400\|1200>.<avif\|webp>` from `capture/shots/page/` |
| The quick chat for "On your desktop" | `node tools/assets/quick-chat.mjs` | `public/ui/v1/quick-chat-<theme>-<1152\|768>.<avif\|webp>`, the app's own pebble mirrored out |
| The riverbed wallpaper | `scripts/heavy.sh wallpaper node tools/assets/wallpaper.mjs` | `public/media/v1/wallpaper-<theme>-<1600\|3200>.<avif\|webp>` |
| Icons | `node tools/assets/icons.mjs` | `src/app/icon.svg`, `apple-icon.png` and `favicon.ico`, from Pebble's own artwork |
| The display face | `tools/assets/fonts.sh <python with fontTools and brotli>` | `src/fonts/Fraunces-Display-latin.woff2` (its header shows how to make that Python) |
| Media for Pebble's own README | `node tools/assets/readme.mjs --out=<folder outside this repo>` | PNG stills and the gaze GIF (see `capture/README.md`) |

**Versioning.** `/ui/v1/` and `/media/v1/` are served with a year-long immutable cache. Before the first deployment
they could be replaced in place; after it, a re-capture or a re-render goes to `v2/`, never over `v1/`, or returning
visitors keep the old pictures for a year. Moving to `v2/` also means changing the folders that `next.config.ts` lists
and sends with the immutable header, and the paths in `src/lib/media.ts`.

## 3. The score, the sound effects and the mix

The film's music is an original score, composed in code (`tools/audio/compose_score.py`) and played on recorded CC0
instrument samples by our own sampler (`tools/audio/render_sampled.py`). It is cut music-first: the film's timeline
reads the score's beat map (`tools/audio/beatmap.json`: 100 BPM, 18 frames a beat at 30 fps). Raw audio never enters
git: `.gitignore` lists `*.wav`, `*.mp3`, `*.flac`, `*.aiff`, `*.m4a` and `*.mov`, and everything audible lives in
`.work/audio/`.

**The music bed.** One command fetches and verifies the sample kit (`tools/audio/sample_kit.py` checks every file
against its pinned commit and its SHA-256), renders the bed, validates it against the beat map and copies the beat map
into place:

```bash
tools/audio/use_music.sh original-sampled      # the default: the score on recorded CC0 instruments
tools/audio/use_music.sh original              # the same score, synthesised in code
```

`tools/audio/music_options.json` lists every option, including the stock tracks that were auditioned and not used.
After any switch, the film must re-snap to the new beat map and the cue list must be exported again.

**The sound effects** (`.work/audio/sfx/`). The whooshes, the riser, the soft hits, the shimmer and the downlifter are
synthesised:

```bash
.work/audio/.venv/bin/python -I tools/audio/sfx_synth.py .work/audio/sfx --bpm 100 --riser-bars 2
```

The clicks, pops, ticks and thuds are recorded CC0 foley from Kenney's "Impact Sounds" and "Interface Sounds" packs.
Download the two zips from the URLs in the header of `tools/audio/sfx_foley.py`, check their SHA-256 against
`tools/audio/sha256-sources.txt`, and extract them so that `.work/audio/kenney/impact/Audio/*.ogg` and
`.work/audio/kenney/interface/Audio/*.ogg` exist. Then:

```bash
.work/audio/.venv/bin/python -I tools/audio/sfx_foley.py .work/audio/kenney .work/audio/sfx .work/audio/sfx/foley-manifest.json
```

**The cue list.** The film's timeline places every effect; the exporter turns it into `tools/audio/cues.json`:

```bash
bun video/scripts/export-cues.ts           # write tools/audio/cues.json from video/src/film/timeline.ts
bun video/scripts/export-cues.ts --check   # exit 1 if the file on disk is out of date
```

**The masters and their checks.** `final_mix.sh` refuses to mix with a stale cue list and prints the bed's
SHA-256. It writes a web master at −16 LUFS (limiter ceiling −1.7 dBTP) and a social master at −14 LUFS (−1.5 dBTP,
so the AAC encode stays at or below −1.0 dBTP), both in `.work/audio/render/`:

```bash
scripts/heavy.sh final-mix tools/audio/final_mix.sh
scripts/heavy.sh mix-checks tools/audio/mix_checks.sh     # exit 1 when a gate fails
```

The checks measure loudness, true peak and loudness range with FFmpeg, the mono fold-down and the share of energy a
small speaker can play, and run Apple's SoundAnalysis over the mix to catch anything that reads as a voice, an alarm,
a siren or a ringtone. Results go to `.work/audio/analysis/m1/`; look at the spectrogram PNGs, then delete them.

## 4. The films, the loops and the stills in Remotion

`video/` is its own npm project, pinned to Remotion 4.0.538 (every `remotion` and `@remotion/*` package exactly; never
run `npx remotion upgrade` mid-project). `video/src/Root.tsx` registers the compositions; at the time of writing:

| Composition | Size | What |
|---|---|---|
| `LaunchFilm` | 1920 × 1080 | The launch film: the web and 16:9 social posts |
| `LaunchFilmSquare` | 1080 × 1080 | The square cut for social feeds |
| `LaunchFilmVertical` | 1080 × 1920 | The vertical cut for phones |
| `FilmTeaser` | 1280 × 720 | The silent teaser beside the film's poster |
| `LoopCompanion`, `LoopModels`, `LoopAgentGuard`, `LoopMemory`, `LoopViews` | 1600 × 1000 | Silent feature loops |
| `LoopApproveUndo`, `LoopIsolatedTests` | 1080 × 1080 | The project story's two loops |
| `LoopCompanionPhone`, `LoopApproveUndoPhone`, `LoopIsolatedTestsPhone`, `LoopAgentGuardPhone` | 1080 × 1350 | 4:5 cuts for phones |
| `FilmPoster` | 1280 × 720 | The film's poster, which is the teaser's first frame; render it at `--scale=2` |
| `OgImage` | 1200 × 630 | The social card |
| `StyleFrames`, `FilmFrames` (each also `…Square` and `…Vertical`) | as the film | Review samplers |
| `RiverbedPlate`, `ComponentCheck`, `FontMetrics`, `Placeholder`, `PebbleDemo` | | Tools and reference sheets |

The three film compositions render one timeline (`video/src/film/timeline.ts`, 2,304 frames at 30 fps, taken from the
beat map), one music bed and one caption track. Each aspect has its own framing, never a crop of another, and
everything sits inside its safe area.

Commands, from `video/`, each a heavy job:

```bash
cd video
../scripts/heavy.sh studio npx remotion studio                                   # stop it with Ctrl-C
../scripts/heavy.sh still npx remotion still src/index.ts LaunchFilm out/qa/f504.png --frame=504
../scripts/heavy.sh frames npx remotion render src/index.ts FilmFrames out/qa/frames --sequence \
  --image-format=png --props='{"frames":[0,504,1152,2160]}'                      # any film frames, for review
../scripts/heavy.sh animatic npx remotion render src/index.ts LaunchFilm out/animatic-16x9.mp4 --scale=0.5 --crf=28 --muted
```

Light checks, run before any render:

```bash
(cd video && npx tsc)                        # type-check the films and ../shared
(cd video && bun src/loops/check.ts)         # the loops' seams, frames, reading floor and pointer rules
bun video/scripts/export-cues.ts --check     # the cue list still matches the timeline
npm run test:engine                          # the pebble's engine, including every cue list in the repo
```

**Masters** (after the media phase). Each composition renders to a silent H.264 master at CRF 12 in BT.709; the
soundtrack is added at the encode step, and `tools/encode/README.md` names the files that step expects:

```bash
cd video && ../scripts/heavy.sh master-film npx remotion render src/index.ts LaunchFilm out/masters/film.mp4 \
  --codec=h264 --crf=12 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 --muted --concurrency=2
```

Do the same for `LaunchFilmSquare`, `LaunchFilmVertical`, `FilmTeaser` and each loop (the loops are light enough for
`--concurrency=3`). If a render is slow, crashes or is stopped, retry with `--concurrency=1`, then with
`--media-cache-size-in-bytes=1073741824`, then in chunks with `--frames=0-899` and so on, joined afterwards with
`"$FF" -f concat -safe 0 -i list.txt -c copy`.

**Posters and the social card** (after the media phase). Every poster is its loop's first frame, rendered from the
loop itself, so the poster and the video's first frame are the same picture. `LOOP_POSTERS` in
`video/src/stills/LoopPosters.tsx` lists each composition, file name and size:

```bash
cd video && ../scripts/heavy.sh poster npx remotion still src/index.ts LoopMemory out/posters/loop-memory.poster.png --frame=0
cd video && ../scripts/heavy.sh poster npx remotion still src/index.ts FilmPoster out/posters/film.poster.png --scale=2
cd video && ../scripts/heavy.sh og npx remotion still src/index.ts OgImage ../src/app/opengraph-image.png
```

`tools/encode/encode.sh poster` then encodes each poster to AVIF and WebP within its budget, into `public/media/v1/`
under the names `src/lib/media.ts` reads. The social card goes to `src/app/opengraph-image.png`, with its alt text
(`seo.openGraph.imageAlt` in `src/content/seo.ts`) in `src/app/opengraph-image.alt.txt`.

## 5. Encode and verify

`tools/encode/` makes the web and social encodes from the masters and checks them (after the media phase; the tools
were being finished as this page was written). The interface, from `tools/encode/README.md` and the header of
`tools/encode/encode.sh`:

```bash
tools/encode/encode.sh film   <master.mp4> .work/audio/render/soundtrack_web.wav
tools/encode/encode.sh loop   <id> <master.mp4> [<phone_master.mp4>]
tools/encode/encode.sh teaser <master.mp4>
tools/encode/encode.sh poster <png> <out-base> <width> <height>
tools/encode/encode.sh social <master.mp4> .work/audio/render/soundtrack_social.wav <out.mp4> [--cut <cut.json>]
```

- Homebrew FFmpeg through `$FF` and `$FP`. Each command is one `scripts/heavy.sh` job: run directly, the script runs
  itself through `heavy.sh`.
- It checks its inputs before queueing: 30 fps masters, the film at 1920 × 1080, and a 48 kHz stereo soundtrack as
  long as the picture, to the frame.
- HEVC (`hvc1`) first, then H.264, each in `yuv420p` with BT.709 tags and `+faststart`. The film's audio is AAC at
  48 kHz from the web soundtrack, encoded once; the loops and the teaser are silent. Each file starts at its planned
  quality and steps down only as far as its size budget needs; the resolution never drops.
- The files land in `public/media/v1/` under the names `src/lib/media.ts` expects: `film-1080` and `film-720`,
  `teaser-720` and `loop-<id>` (plus `loop-<id>-phone`), each as `.hevc.mp4` and `.h264.mp4`, and the posters as
  AVIF and WebP.
- At the end a verify pass checks the new files: codecs, colour tags, `+faststart`, sizes, loudness and the loops'
  seams. `node tools/encode/mp4.mjs codecs <file>` prints a file's codecs string, which must fit the one the page
  declares in `src/lib/media.ts` (`hvc1.1.6.L120.90` for HEVC, `avc1.640028` for H.264).

See `tools/encode/README.md` for the exact options, file names and budgets.

The social masters for X and LinkedIn (16:9, 1:1 and 9:16 at −14 LUFS, with an `.srt` of the captions) come from the
`social` command and the social soundtrack. They are delivered outside the repository and never committed.

## 6. Captions and chapters

`docs/film-captions.json` is the single source of the film's captions: sound descriptions and the on-screen lines,
word for word, with frame numbers. `tools/captions/build.mjs` turns it into `film.en.vtt` for the site and, with
`--srt`, the `.srt` for social posts; it turns `src/content/chapters.ts` into `film.chapters.vtt` and
`film.descriptions.en.vtt`, the text the film player's audio-description toggle reads. It checks every cue first (time
order, no overlaps, one or two lines of at most 42 characters, at least 1.2 s on screen, at most 3.5 words a second,
no exclamation mark) and writes nothing if one fails:

```bash
node tools/captions/build.mjs --check                      # validate only
node tools/captions/build.mjs --srt <file.srt>             # the three VTTs in public/media/v1/, and the SRT
```

The files land in `public/media/v1/` (after the media phase). `src/content/filmCaptions.ts` mirrors the JSON for the
`/film` transcript; `npm run test:site` fails if the two drift apart.

## 7. Quality gates

`tools/qa/README.md` describes each gate. To run them all on one build, in order, each heavy step as its own
`heavy.sh` job:

```bash
bash tools/qa/all.sh qa-final                 # every step
bash tools/qa/all.sh qa-final a11y lh-h2      # only these steps, on the last build
```

The steps: `shot` (builds, then viewport tiles at 320 to 1920 px in both themes, with motion on and reduced),
`sheets`, `a11y` (axe-core), `interact` (the keyboard walk and every control), `requests` (same-origin only, no
cookies, no console errors, script and transfer budgets, a link crawl), `lh-h2` and `lh` (Lighthouse, through an
HTTP/2 proxy and plain), `line` and `lint` (the copy lint). The chain stops at a hold and prints the command for the
steps left. Look at every tile yourself: the tools find what can be measured, not what looks wrong.

The copy lint alone is light: after a `next build`, `node tools/qa/copy-lint.mjs --src`.

## 8. Before a push

- `git ls-files | grep -Ei '\.(wav|mp3|flac|aiff|m4a|mov)$'` prints nothing: no raw audio is tracked.
- `git ls-files -z | xargs -0 du -m | awk '$1 > 45'` prints nothing: no tracked file is over 45 MB.
- `du -sh public` stays under 90 MB.
- `git grep -n -F "$HOME"` prints nothing: no local paths in committed files.

## 9. Clean up

When the media are encoded and checked, delete what can be made again: the recordings in `video/public/ui-frames/`,
`video/out/`, `video/public/ui/`, `capture/shots/`, `capture/vite-cache/`, `capture/chrome-profile/`, the audio
environment and renders in `.work/audio/`, and the `node_modules` folders of `video/`, `capture/` and `tools/*`. Keep
the root `node_modules`, so `npm run dev` still works.
