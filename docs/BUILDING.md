# Building everything

How to rebuild the site's media from nothing: the captures of Pebble's real interface, the stills, the recordings, the
score and the mix, the films in three aspects and the 30 s cut, the loops, the posters, the encodes and the checks.
The site itself needs none of this to build (see `README.md`); this is for when the product, the story or the music
changes.

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
- **Pebble's frontend at a published release** (https://github.com/tohin003/Pebble): a checkout at that release, read
  only, with its frontend dependencies installed, or the release's tag frozen from GitHub by
  `capture/freeze-release.py`, which borrows the checkout's `node_modules` when its dependencies match the tag's
  (section 1). The capture harness only reads it: it never writes there, caches included. The fixtures in
  `capture/mock/fixtures.js` name the version they were checked against (1.2.0 today).

## Before every command

Start every command from the repository root, after sourcing `scripts/env.sh`:

```bash
cd <repo> && source scripts/env.sh && …
```

`env.sh` derives `REPO` from its own location and reads `PEBBLE_REPO` from the environment or from the gitignored
`.work/local.env`. It puts `/opt/homebrew/bin` first on `PATH` and links `.work/bin/git` to `/usr/bin/git` (on the Mac
this was built on, the Intel builds in `/usr/local/bin` do not run). It exports `$FF`, `$FP`, `$PYQA` and
`CHROME_PATH`, turns telemetry off (`DO_NOT_TRACK`, `NEXT_TELEMETRY_DISABLED`), and keeps the npm, uv and Playwright
caches inside `.work/`. It also routes `npm run typecheck` through `scripts/serial.sh`, one type check at a time
(two side by side push an 8 GB Mac into swap), and while `.work/HOLD` exists it runs every other `npm run` script at
background priority. Shell state does not carry over between separate shells, so source it every time.

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
- Render from `video/`, so Remotion reads `video/remotion.config.ts` and uses the headless browser in
  `video/node_modules/.remotion/` instead of downloading a second copy.
- Delete the caches in `.work/` after each install step, and check `df -h /System/Volumes/Data` after every install,
  capture batch, render and encode.

## Install, once per clone

```bash
cd <repo>
mkdir -p .work && echo 'PEBBLE_REPO=/path/to/Pebble' > .work/local.env   # Pebble at a published release, read only
source scripts/env.sh
npm ci                                                   # the site
(cd video && npm ci && npx remotion browser ensure)      # the films; Remotion's headless browser is about 570 MB
(cd capture && npm ci --ignore-scripts)                  # puppeteer-core; no browser download
(cd tools/assets && npm ci)                              # sharp
(cd tools/qa && npm ci)                                  # axe-core
rm -rf "$npm_config_cache"                               # the npm cache lives in .work/
```

This release's masters were rendered with the installed Chrome instead of Remotion's headless browser
(`--browser-executable="$CHROME_PATH" --chrome-mode=chrome-for-testing`, section 4), which downloads nothing.

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

`capture/` runs Pebble's own frontend (its Vite app, read from `PEBBLE_REPO`) in Chrome, with Tauri's official IPC
mocks standing in for the app's backend and a fictional world as the data: Maya, a Python project called
`invoice-kit`, a Lisbon trip budget and a datetime quiz. Nothing is redrawn: every picture of the app is the app.
`capture/README.md` lists every scene and timeline; these are the commands the site and the films use.

**Capture a published release, never a moving checkout.** Pebble's checkout may already hold the next version's
unpublished work: within an hour of 1.1.0's publication, it did. Before a batch, check that nothing in the checkout's
frontend is newer than the release (this must print nothing, before the batch and after it):

```bash
find "$PEBBLE_REPO/src" "$PEBBLE_REPO/index.html" -newermt "<the publication time, e.g. 2026-10-24 18:54>"
```

When the checkout has moved on, freeze the release and capture from the frozen copy:

```bash
/usr/bin/python3 -I -B capture/freeze-release.py v1.5.0 <new-dir> --node-modules="$PEBBLE_REPO/node_modules"
export PEBBLE_REPO=<new-dir> && source scripts/env.sh
/usr/bin/python3 -I -B capture/freeze-release.py --verify <new-dir>    # before the batch and after it
```

`freeze-release.py` writes the tag's `index.html` and `src/` from GitHub, checks every file against the tag's git tree
(its blob SHA-1), keeps the tree listing for `--verify`, and links `node_modules` only when the checkout's
`package-lock.json` equals the tag's apart from the version fields. `<new-dir>` must not exist yet. It uses the
standard library only; the network calls are the GitHub API (one tag, one commit, one tree) and one raw file request
per file. The 1.1.0 and 1.2.0 captures were made this way. Quote the app's words from the same tag too (GitHub's raw
files at the tag), never from a checkout.

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

**Sources for the page stills** (the scenes `tools/assets/stills.mjs` maps to page stills, both themes). The windows
are captured at 3x; the two crops of Settings › Privacy and focus at 5x:

```bash
scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs main-done-wide main-approval-wide \
  held-unverified-wide main-challenge-wide settings-permissions-wide settings-models-wide settings-memory-wide \
  main-quiz-wide main-dashboard pet-chat settings-privacy-wide settings-privacy-on-wide --exact --scale=3 \
  --themes=light,dark --out=capture/shots/page --locale=en-GB --tz=Europe/London
scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs crop-privacy-card crop-privacy-card-on \
  --exact --scale=5 --themes=light,dark --out=capture/shots/page --locale=en-GB --tz=Europe/London
```

To see what a retake changed, `"$PYQA" -I capture/diff.py capture/shots/page <new-dir> --out=<dir>` compares each
pair and saves the differing regions side by side.

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
| Page stills | `scripts/heavy.sh stills node tools/assets/stills.mjs` | `public/ui/v1/<name>-<theme>-<2400\|1200>.<avif\|webp>` from `capture/shots/page/`, the Privacy and focus stills included |
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
against its pinned commit and its SHA-256; about 113 MB), renders the bed, validates it against the beat map and copies
the beat map into place:

```bash
scripts/heavy.sh bed tools/audio/use_music.sh original-sampled   # the default: the score on recorded CC0 instruments
scripts/heavy.sh bed tools/audio/use_music.sh original           # the same score, synthesised in code
```

The bed's first bar is voiced on the upright piano, an octave lower than the score's marimba, with the strings' chord
under it (`render_sampled.py --opening warm`, the default): heard straight after silence, the marimba's first notes
read as a telephone or a ringtone to Apple's sound classifier. `tools/audio/music_options.json` lists every option,
including the stock tracks that were auditioned and not used. After any switch, the film must re-snap to the new beat
map and the cue list must be exported again.

**The sound effects** (`.work/audio/sfx/`). The whooshes, the riser, the soft hits, the shimmer, the downlifter and
the energetic recut's impacts, UI sounds and rim clicks are synthesised:

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

**The cue list.** The film's timeline places every effect and the mix's automation; the exporter turns them into
`tools/audio/cues.json` (36 effects, and 7 automation spans: the hook's ride, four gaps, the hold and the tail):

```bash
bun video/scripts/export-cues.ts           # write tools/audio/cues.json from video/src/film/timeline.ts
bun video/scripts/export-cues.ts --check   # exit 1 if the file on disk is out of date
```

**The masters and their checks.** `final_mix.sh` refuses to mix with a stale cue list, renders the drum-and-sub drive
(`tools/audio/drive.py` → `.work/audio/render/drive.wav`) when it is missing or older than `drive.py`, and prints the
bed's and the drive's SHA-256. It writes a web master at −16 LUFS (limiter ceiling −1.7 dBTP) and a social master at
−14 LUFS (−1.5 dBTP), both in `.work/audio/render/`. Each is then encoded as `encode.sh` encodes it (AAC 160 kb/s for
the film, 192 kb/s for the social films), and the ceiling comes down in 0.1 dB steps until that encode's true peak
stays under `verify.mjs`'s gate (−1.5 and −1.0 dBTP), because the recut's drums make the codec overshoot the ceiling:

```bash
scripts/heavy.sh final-mix tools/audio/final_mix.sh
scripts/heavy.sh mix-checks tools/audio/mix_checks.sh     # exit 1 when a gate fails
```

The checks measure loudness, true peak and loudness range with FFmpeg, the mono fold-down and the share of energy a
small speaker can play, and run Apple's SoundAnalysis over the mix to catch anything that reads as a voice, an alarm,
a siren or a ringtone, including the opening heard straight after silence and the end card. Results go to
`.work/audio/analysis/m1/`; look at the spectrogram PNGs, then delete them. The checks also gate the AAC encodes' true
peak and the last 54 frames' digital silence, and report the loudness curve (the dynamics report). The energetic
recut's masters measure −16.1 LUFS and −1.8 dBTP (web; its AAC 160 kb/s encode −1.62 dBTP) and −14.3 LUFS and −1.5 dBTP
(social; AAC 192 kb/s −1.05); their hashes are in `docs/media-provenance.json`.

**The 30 s cut's soundtrack.** The cut for X (`docs/film-cuts/x30.json`, section 5) has its own music: a 12-bar
arrangement of the same score, not a splice of the bed, with the film's effects mapped onto the cut. One command
builds the bed, the mix and the checks (the film's bed must be current, and the sample kit on disk for the bed step):

```bash
scripts/heavy.sh cut-x30 tools/audio/cut_soundtrack.sh docs/film-cuts/x30.json   # soundtrack_x30_social.wav, -14 LUFS
.work/audio/.venv/bin/python -I tools/audio/cut_cues.py docs/film-cuts/x30.json --check   # the cut's cue list is current
```

The energetic recut keeps the x30 bed as rendered: after a new cue export, run `cut_cues.py docs/film-cuts/x30.json`
(without `--check`) to re-map the cut's cues, then only the `mix` and `checks` steps (`cut_soundtrack.sh
docs/film-cuts/x30.json mix`, then `… checks`). The mix renders the cut's drive (`drive.py --cut`) every time.

## 4. The films, the loops and the stills in Remotion

`video/` is its own npm project, pinned to Remotion 4.0.538 (every `remotion` and `@remotion/*` package exactly; never
run `npx remotion upgrade` mid-project). `video/src/Root.tsx` registers the compositions:

| Composition | Size | What |
|---|---|---|
| `LaunchFilm` | 1920 × 1080 | The launch film: the website's film and the 16:9 social posts |
| `LaunchFilmSquare` | 1080 × 1080 | The square cut for social feeds |
| `LaunchFilmVertical` | 1080 × 1920 | The vertical cut for phones |
| `FilmTeaser` | 1280 × 720 | The silent teaser beside the film's poster |
| `LoopCompanion`, `LoopModels`, `LoopMemory`, `LoopViews` | 1600 × 1000 | Silent feature loops on the page |
| `LoopIsolatedTests` | 1080 × 1080 | The project story's loop |
| `LoopCompanionPhone`, `LoopIsolatedTestsPhone` | 1080 × 1350 | 4:5 cuts for phones |
| `LoopApproveUndo`, `LoopAgentGuard` (each also `…Phone`), `LoopReviewCommands` | | Registered, not on the page: the project story shows the approval card as an explainer, AgentGuard's section shows real captures, and `LoopReviewCommands` is a stub slate |
| `FilmPoster` | 1280 × 720 | The film's poster, which is the teaser's first frame; render it at `--scale=2` |
| `OgImage` | 1200 × 630 | The social card |
| `StyleFrames`, `FilmFrames` (each also `…Square` and `…Vertical`) | as the film | Review samplers for style frames. Never for masters or review frames: `FilmFrames`' frame 0 is sometimes flat |
| `RiverbedPlate`, `ComponentCheck`, `FontMetrics`, `Placeholder`, `PebbleDemo` | | Tools and reference sheets |

The three film compositions render one timeline (`video/src/film/timeline.ts`, 2,304 frames at 30 fps, taken from the
beat map), one music bed and one caption track. Each aspect has its own framing, never a crop of another, and
everything sits inside its safe area.

Commands, from `video/`, each a heavy job. Review frames come from the composition itself:

```bash
cd video
../scripts/heavy.sh studio npx remotion studio                                   # stop it with Ctrl-C
../scripts/heavy.sh still npx remotion still src/index.ts LaunchFilm out/qa/f504.png --frame=504
../scripts/heavy.sh qa-frames npx remotion render src/index.ts LaunchFilm out/qa/LaunchFilm --sequence \
  --frames=0,504,1152,2160 --image-format=png                                    # a few frames, one PNG each
../scripts/heavy.sh animatic npx remotion render src/index.ts LaunchFilm out/animatic-16x9.mp4 --scale=0.5 --crf=28 --muted
```

In Remotion 4.0.538, `--frames` takes a list (`0,504,1152`), a range (`0-60`) or one frame; if Remotion ever moves off
that version, use a range until the list is checked.

Light checks, run before any render:

```bash
(cd video && npx tsc)                        # type-check the films and ../shared
(cd video && bun src/loops/check.ts)         # the loops' seams, frames, reading floor and pointer rules
bun video/scripts/export-cues.ts --check     # the cue list still matches the timeline
npm run test:engine                          # the pebble's engine, including every cue list in the repo
```

**Masters.** Each composition renders to a silent H.264 master at CRF 12 in BT.709; the soundtrack is added at the
encode step. The rules, each learned the hard way:

- **Render the compositions themselves**, never the `FilmFrames` sampler.
- **One browser tab:** `--concurrency=1`. With two or three tabs under memory pressure, Chrome made blank and tiled
  frames. (`remotion.config.ts` defaults to 2, for Studio and quick renders.)
- **PNG frames into the encoder:** `--image-format=png` (the config's default is JPEG).
- **Scan every master before encoding** (below).

```bash
cd video && ../scripts/heavy.sh master-film npx remotion render src/index.ts LaunchFilm out/masters/film.mp4 \
  --codec=h264 --crf=12 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 --muted \
  --concurrency=1 --image-format=png --browser-executable="$CHROME_PATH" --chrome-mode=chrome-for-testing
```

Render the others the same way, one heavy job each, under the names section 5 uses: `LaunchFilmSquare` to
`out/masters/film-square.mp4`, `LaunchFilmVertical` to `film-vertical.mp4`, `FilmTeaser` to `teaser.mp4`, and each
loop on the page to `loop-<id>.mp4` (its 4:5 cut to `loop-<id>-phone.mp4`). If a render crashes or is stopped, retry
with `--media-cache-size-in-bytes=1073741824`, then in chunks with `--frames=0-899` and so on, joined afterwards with
`"$FF" -f concat -safe 0 -i list.txt -c copy`.

**The scan.** Two render glitches pass every other check: a blank frame (one flat colour: a frame that lost its
layers) and an isolated outlier (a frame far from both neighbours while they are close to each other: a capture that
came back half-painted). Decode each master small, test every frame for both, and look at a contact sheet: the
downbeats of the film's 32 bars, and each loop's frames and its seam (the last frames beside the first). The film is
flat by design only at its two dives (f143 and f1799) and one empty beat (f354–360). The scripts that scanned this
release's masters stayed in the build's gitignored `.work/` folder; any scanner that makes these two tests and the
sheets will do. Delete each master once its encodes have passed `verify.mjs`.

**Posters and the social card.** Every poster is its video's first frame, rendered from the composition itself, so the
poster and the video's first picture are the same. `LOOP_POSTERS` in `video/src/stills/LoopPosters.tsx` lists each
composition, file name and size; the film's poster and the teaser's are both `FilmPoster`, rendered at 2x:

```bash
cd video && ../scripts/heavy.sh poster npx remotion still src/index.ts LoopMemory out/stills/loop-memory.poster.png --frame=0
cd video && ../scripts/heavy.sh poster npx remotion still src/index.ts FilmPoster out/stills/film.poster.png --frame=0 --scale=2
cd video && ../scripts/heavy.sh og npx remotion still src/index.ts OgImage ../src/app/opengraph-image.png --frame=0
```

`tools/encode/encode.sh poster` then encodes each poster (section 5). The social card goes to
`src/app/opengraph-image.png`, with its alt text (`seo.openGraph.imageAlt` in `src/content/seo.ts`, byte for byte, with
no trailing newline) in `src/app/opengraph-image.alt.txt`. Render it again whenever the hero's H1 or that alt text
changes.

## 5. Encode and verify

`tools/encode/encode.sh` makes the web and social encodes from the masters, and `tools/encode/verify.mjs` checks them.
`tools/encode/README.md` has the exact options, file names and budgets; `tools/encode/encode.sh --help` prints the
usage.

```bash
tools/encode/encode.sh film   <master.mp4> <soundtrack_web.wav> [--only 1080.hevc,1080.h264,720.hevc,720.h264]
tools/encode/encode.sh social <master.mp4> <soundtrack_social.wav> <out.mp4> [--cut <cut.json>] [--crf <n>]
tools/encode/encode.sh loop   <id> <master.mp4> [<phone_master.mp4>]
tools/encode/encode.sh teaser <master.mp4>
tools/encode/encode.sh poster <png> <out-base> <width> <height>
```

- Homebrew FFmpeg through `$FF` and `$FP`. Each command is one `scripts/heavy.sh` job: run directly, the script runs
  itself through `heavy.sh`.
- It checks its inputs before queueing: 30 fps masters, the film at 1920 × 1080, and a 48 kHz stereo soundtrack as
  long as the picture, to the frame.
- HEVC (`hvc1`) first, then H.264, each in `yuv420p` with BT.709 tags and `+faststart`. The film's audio is AAC at
  48 kHz from the web soundtrack, encoded once; the loops and the teaser are silent. Each file starts at its planned
  quality and steps down only as far as its size budget needs; the resolution never drops. A loop can start at a
  higher quality with `LOOP_HEVC_CRF` and `LOOP_H264_CRF`, within the same budgets. The desktop loop (companion) uses
  22 and 19: its desktop is one smooth gradient, which showed blocks at the defaults, 27 and 23.
- At the end a verify pass checks the new files. `node tools/encode/mp4.mjs codecs <file>` prints a file's codecs
  string, which must fit the one the page declares in `src/lib/media.ts` (`hvc1.1.6.L120.90` for HEVC, `avc1.640028`
  for H.264).

**The website's media**, into `public/media/v1/` under the names `src/lib/media.ts` reads:

```bash
tools/encode/encode.sh film video/out/masters/film.mp4 .work/audio/render/soundtrack_web.wav     # film-1080, film-720
tools/encode/encode.sh teaser video/out/masters/teaser.mp4                                        # teaser-720
tools/encode/encode.sh loop isolated-tests video/out/masters/loop-isolated-tests.mp4 video/out/masters/loop-isolated-tests-phone.mp4
tools/encode/encode.sh loop memory video/out/masters/loop-memory.mp4      # and models, views
LOOP_HEVC_CRF=22 LOOP_H264_CRF=19 tools/encode/encode.sh loop companion video/out/masters/loop-companion.mp4 video/out/masters/loop-companion-phone.mp4
tools/encode/encode.sh poster video/out/stills/film.poster.png public/media/v1/film.poster 1920 1080
tools/encode/encode.sh poster video/out/stills/film.poster.png public/media/v1/teaser.poster 1280 720
tools/encode/encode.sh poster video/out/stills/loop-memory.poster.png public/media/v1/loop-memory.poster 1600 1000
node tools/encode/verify.mjs                  # everything in public/media/v1, and public/'s totals
node tools/encode/verify.mjs --no-analysis    # the same without the loudness and seam passes: light, no heavy job
```

`verify.mjs` checks codecs and profile against the page's `<source type>`, the peak bitrate against the declared level,
the colour tags, `+faststart`, the frame count (the film's against `docs/film-captions.json`), sizes and budgets
(every file at most 45 MB, `public/` at most 90 MB, the film set at most 45 MB), the film's loudness on the encoded
AAC (−16 LUFS ±1, at most −1.5 dBTP), the loops' and the teaser's seams on the encodes, the text tracks against what
`tools/captions/build.mjs` makes now, and the posters against their videos. Its loudness and seam passes decode every
file, so they run as one heavy job of their own.

**The social films** for X and LinkedIn: 16:9, 1:1 and 9:16, each from its own master, with the social soundtrack
(−14 LUFS). They are delivered outside the repository and never committed:

```bash
D="<a folder outside the repository>"
tools/encode/encode.sh social video/out/masters/film.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1920x1080.mp4"
tools/encode/encode.sh social video/out/masters/film-square.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1080x1080.mp4"
tools/encode/encode.sh social video/out/masters/film-vertical.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1080x1920.mp4"
node tools/captions/build.mjs --srt "$D/Pebble-launch-film.srt"
```

**The 30 s cut for X** (`docs/film-cuts/x30.json`; `docs/FILM_SPEC.md` §23). It is made only of the film's own frames:
four source ranges, each starting on the same beat of the bar in the film and in the cut, 864 frames (28.8 s). There is
no separate composition: `encode.sh social --cut` seeks each range frame-exactly in a film master and joins them, with
the cut's own soundtrack (section 3):

```bash
tools/encode/encode.sh social video/out/masters/film.mp4 .work/audio/render/soundtrack_x30_social.wav \
  "$D/Pebble-launch-film-30s-1920x1080.mp4" --cut docs/film-cuts/x30.json
# the same with film-square.mp4 (-1080x1080) and film-vertical.mp4 (-1080x1920)
node tools/captions/build.mjs --cut docs/film-cuts/x30.json --srt "$D/Pebble-launch-film-30s.srt"
node tools/encode/verify.mjs "$D"             # public/media/v1 and the social folder together
```

`node tools/captions/cues.mjs cut-inputs docs/film-cuts/x30.json 2304 30` prints the seeks the cut uses. If the
film's timing changes, pick the ranges again by the same rule, then re-run the caption check, `cut_cues.py --check`
and `cut_soundtrack.sh`.

## 6. Captions and chapters

`docs/film-captions.json` is the single source of the film's captions: sound descriptions and the on-screen lines,
word for word, with frame numbers. `tools/captions/build.mjs` turns it into `film.en.vtt` for the site and, with
`--srt`, the `.srt` for social posts; it turns `src/content/chapters.ts` into `film.chapters.vtt` and
`film.descriptions.en.vtt`, the text the film player's audio-description toggle reads. It checks every cue first (time
order, no overlaps, one or two lines of at most 42 characters, at least 1.2 s on screen, at most 3.5 words a second,
no exclamation mark) and writes nothing if one fails:

```bash
node tools/captions/build.mjs --check                                   # validate only
node tools/captions/build.mjs --srt <file.srt>                          # the three VTTs in public/media/v1/, and the SRT
node tools/captions/build.mjs --check --cut docs/film-cuts/x30.json     # a cut's captions, on the cut's timeline
```

The three VTTs land in `public/media/v1/`. A warning says when a description needs more speech than its chapter lasts
(7 of 9 do): the film player then holds the film on the chapter's last frame until the voice is done. Run it again
whenever the JSON or `chapters.ts` changes: `verify.mjs` fails a stale track. `src/content/filmCaptions.ts` mirrors the
JSON for the `/film` transcript; `npm run test:site` fails if the two drift apart.

## 7. Quality gates

`tools/qa/README.md` describes each gate. To run them all on one build, in order, each heavy step as its own
`heavy.sh` job:

```bash
bash tools/qa/all.sh qa-final                 # every step
bash tools/qa/all.sh qa-final a11y lh-h2      # only these steps, on the last build
```

The steps: `shot` (builds, then viewport tiles at 320 to 1920 px in both themes, with motion on and reduced),
`sheets`, `a11y` (axe-core), `interact` (the keyboard walk and every control), `requests` (same-origin only, no
cookies, no console errors, script and transfer budgets, a link crawl), `lh-h2` and `lh` (Lighthouse on `/`, through
an HTTP/2 proxy and plain), `lh-h2-film` and `lh-film` (the same on `/film`), `line` (the pebble's ground lines never
cross text) and `lint` (the copy lint). The chain stops at a hold and prints the command for the steps left. Look at
every tile yourself: the tools find what can be measured, not what looks wrong.

The copy lint alone is light: after a `next build`, `node tools/qa/copy-lint.mjs --src`.

## 8. Before a push

The two guards; both must print nothing, and `public/` stays at or under 90 MB:

- `git ls-files | grep -Ei '\.(wav|mp3|flac|aiff|m4a|mov)$'`: no raw audio is tracked.
- `git ls-files -z | xargs -0 du -m | awk '$1 > 45'`: no tracked file is over 45 MB. Then `du -sh public`.

As in every commit, no local paths (`git grep -n -F "$HOME"` prints nothing) and no secrets.

## 9. Clean up

When the media are encoded and checked, delete what can be made again: the recordings in `video/public/ui-frames/`,
`video/out/` (masters and stills), `video/public/ui/`, `capture/shots/`, `capture/vite-cache/`,
`capture/chrome-profile/`, frozen release copies, the audio environment and renders in `.work/audio/`, and the
`node_modules` folders of `video/`, `capture/` and `tools/*`. Keep the root `node_modules`, so `npm run dev` still
works.
