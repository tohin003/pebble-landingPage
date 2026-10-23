# tools/encode

The page's and the social cuts' final encodes, and the checks that gate them (MASTER_PLAN §2.4, §5.5, §6.4; D10, D16;
OVERRIDES §4, §8 and §14). Homebrew FFmpeg 9 through `$FF` and `$FP` from `scripts/env.sh`; Node 24; no new
dependencies (posters use the sharp already in `tools/assets/node_modules`).

| File | What it does |
|---|---|
| `encode.sh` | `film`, `social`, `loop`, `teaser` and `poster` commands. Each command runs as **one** `scripts/heavy.sh` job: run it directly and it queues itself through heavy.sh |
| `verify.mjs` | Checks every delivered file and prints a table (or `--json`); exit 1 on any failure. Its loudness and seam passes run as one heavy job too |
| `mp4.mjs` | A small ISO-BMFF reader: faststart, the RFC 6381 codecs string from `hvcC`/`avcC`, the `colr` box, AVIF/WebP pixel sizes. `node tools/encode/mp4.mjs info\|codecs\|fits <file>` |
| `poster.mjs` | A PNG still to `<base>.avif` + `<base>.webp` (called by `encode.sh poster`) |
| `../captions/` | The text tracks: `film.en.vtt`, `film.chapters.vtt`, `film.descriptions.en.vtt` and the social `.srt` (see its README) |

## The media phase, in order

Every command runs from the repo root after `source scripts/env.sh`. Masters are H.264 CRF 12 renders (ProRes would not
fit this disk). Render them one at a time, and delete each master once its encodes have passed `verify.mjs`.

```bash
# 1. Masters (MASTER_PLAN §5.4), one heavy job each, all with the same flags (no audio: the mix is muxed later).
cd video
../scripts/heavy.sh master-film npx remotion render src/index.ts LaunchFilm out/masters/film.mp4 \
  --codec=h264 --crf=12 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 --muted --concurrency=2
../scripts/heavy.sh master-l3 npx remotion render src/index.ts LoopApproveUndo out/masters/loop-approve-undo.mp4 \
  --codec=h264 --crf=12 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 --muted --concurrency=2
#    The same for LaunchFilmSquare, LaunchFilmVertical, FilmTeaser and every Loop* / Loop*Phone composition in
#    video/src/Root.tsx. Posters are stills of frame 0; the film's is FilmPoster at --scale=2 (2560 x 1440):
../scripts/heavy.sh still-film npx remotion still src/index.ts FilmPoster out/stills/film.poster.png --frame=0 --scale=2
cd ..

# 2. The website film: four files with the web soundtrack (-16 LUFS), each fitted to its budget.
tools/encode/encode.sh film video/out/masters/film.mp4 .work/audio/render/soundtrack_web.wav

# 3. The teaser and the loops (silent). A loop's 4:5 phone master is the optional third argument.
tools/encode/encode.sh teaser video/out/masters/teaser.mp4
tools/encode/encode.sh loop approve-undo video/out/masters/loop-approve-undo.mp4 video/out/masters/loop-approve-undo-phone.mp4
tools/encode/encode.sh loop models video/out/masters/loop-models.mp4

# 4. Posters: sizes from src/lib/media.ts and video/src/stills/LoopPosters.tsx (the PNG must have the same aspect).
tools/encode/encode.sh poster video/out/stills/film.poster.png public/media/v1/film.poster 1920 1080
tools/encode/encode.sh poster video/out/stills/film.poster.png public/media/v1/teaser.poster 1280 720
tools/encode/encode.sh poster video/out/stills/loop-approve-undo.poster.png public/media/v1/loop-approve-undo.poster 1080 1080

# 5. Text tracks for the page, and the full film's SRT for the social folder.
node tools/captions/build.mjs --srt "$HOME/Desktop/Pebble launch film/Pebble-launch-film.srt"

# 6. Social masters (-14 LUFS; never committed): 16:9, 1:1 and 9:16, each from its own composition.
D="$HOME/Desktop/Pebble launch film"
tools/encode/encode.sh social video/out/masters/film.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1920x1080.mp4"
tools/encode/encode.sh social video/out/masters/film-square.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1080x1080.mp4"
tools/encode/encode.sh social video/out/masters/film-vertical.mp4 .work/audio/render/soundtrack_social.wav "$D/Pebble-launch-film-1080x1920.mp4"

# 7. Everything at once: public/media/v1 plus the social folder.
node tools/encode/verify.mjs "$D"
```

A ~30 s cut for X can be cut from a film master by frame ranges (see "Cut files" below). Its music must be its own edit
at the cut's length: the film's soundtrack chopped at the same frames would jump.

```bash
tools/encode/encode.sh social video/out/masters/film.mp4 <soundtrack_social_cut.wav> "$D/Pebble-launch-film-30s-1920x1080.mp4" --cut <cut.json>
node tools/captions/build.mjs --cut <cut.json> --srt "$D/Pebble-launch-film-30s.srt"
```

## Settings and budgets

Each file starts at its MASTER_PLAN §5.5 CRF. Over its budget, the CRF rises (first the step that a bitrate fall of
about 14 % per CRF step predicts, then +1) until the file fits, never by more than 4 (film) or 6 (loops, teaser). The
resolution never drops. The first CRF that fits wins; failing that, the lowest CRF under the hard limit, with a warning; failing
that, the command fails and the last try is kept in `.work/tmp/encode-rejected/`. `--exact` keeps the starting CRF.

| Output | Encode | Budget (raise CRF to fit) | Hard limit |
|---|---|---|---|
| `film-1080.hevc.mp4` | x265 slow CRF 25, `hvc1`, AAC 160k 48 kHz | 12 MB | 20 MB |
| `film-1080.h264.mp4` | x264 slow CRF 20, High, AAC 160k 48 kHz | 18 MB | 30 MB |
| `film-720.hevc.mp4` | as 1080, `scale=1280:-2:flags=lanczos`, CRF 26 | 6 MB | 12 MB |
| `film-720.h264.mp4` | as 1080, scaled, CRF 21 | 9 MB | 18 MB |
| `teaser-720.{hevc,h264}.mp4` | the film-720 CRFs (26 / 21), `-an`, scaled only if the master is bigger | 1.5 MB | 1.5 MB |
| `loop-<id>[-phone].hevc.mp4` | x265 slow CRF 27, `-an` | 0.9 MB | 0.9 MB |
| `loop-<id>[-phone].h264.mp4` | x264 slow CRF 23, High, `-an` | 1.2 MB | 1.5 MB |
| `<name>.poster.avif` / `.webp` | sharp AVIF q50 effort 6 / WebP q76 effort 6; quality down by 2 to fit (AVIF to q30, WebP to q50). A simple picture (under a quarter of its budget at the start quality: flat fields, soft gradients) gets the highest quality up to AVIF q80 / WebP q90 that stays under that quarter, because the start quality bands there | 60 KB / 90 KB | |
| social (`encode.sh social`) | x264 slow CRF 18, High, VBV 20 Mb/s (inside level 4.0), AAC-LC 192k 48 kHz stereo | X: 512 MB, 3 to 140 s | |

- **The film budgets** are critic C6's (12 / 18 / 6 / 9 MB = 45 MB), adopted by OVERRIDES §8 ("film set <= ~45 MB
  total"), which overrides MASTER_PLAN §5.5's 20 / 30 / 12 / 18 MB (80 MB). §5.5's numbers are the hard limits. If the
  1080p H.264 can't reach 18 MB within +4 CRF, C6's alternative is to drop it: `--only 1080.hevc,720.hevc,720.h264`
  (the player then plays 720p H.264 where HEVC can't play).
- **Every encode**: `yuv420p`, BT.709 primaries/transfer/matrix and limited range in the stream (x265 `colorprim`,
  `transfer`, `colormatrix`; x264 VUI) and in the MP4 `colr` box, `+faststart`, no global metadata (Remotion's
  "Made with Remotion" comment is dropped), the master's exact frame count (checked).
- **Two measured FFmpeg 9 / x264 traps, handled**:
  - FFmpeg 9 takes colour primaries and transfer from the frames and ignores `-color_primaries` / `-color_trc` for
    untagged ones (the output then has them unset and no `colr` box). The chain ends in
    `setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv`, which tags without converting, so
    `encode.sh` refuses a master tagged anything but BT.709, or full range.
  - With `-preset slow`'s 5 reference frames, x264 signals level 5.0 at 1920x1080 (`avc1.640032`), not the page's
    `avc1.640028`. Every H.264 encode runs at `-level:v 4.0`; FFmpeg's libx264 wrapper then trims the references to
    level 4.0's DPB (4 at 1080p).
- **The HEVC level guard**: after each HEVC encode, `mp4.mjs fits` compares the file's codecs string with the page's
  `<source type>` in `src/lib/media.ts` (`hvc1.1.6.L120.90`: Main, main tier, level 4.0 or lower, `hvc1` sample
  entry). If x265 ever signals more, the file is re-encoded with `level-idc=4.0:high-tier=0` (x265 then holds level
  4.0's VBV limits).
- **Inputs are checked before a job queues**: 30 fps (D7), the film master at 1920x1080 with as many frames as
  `docs/film-captions.json` times (a mismatch is a warning here and a failure in `verify.mjs`), a stereo PCM
  soundtrack within one frame of the picture's length.

## What `verify.mjs` checks

```bash
node tools/encode/verify.mjs                                     # public/media/v1, plus public/ totals
node tools/encode/verify.mjs "$HOME/Desktop/Pebble launch film"  # ... plus the social folder
node tools/encode/verify.mjs --no-public <files or folders>      # only these
node tools/encode/verify.mjs --no-analysis                       # probe-only: no loudness or seam pass, no heavy job
node tools/encode/verify.mjs --json                              # machine-readable, the same exit code
```

- **Roles by name**: `film-{1080,720}.{hevc,h264}.mp4`, `teaser-720.*`, `loop-<id>[-phone].*`, `*.poster.{avif,webp}`,
  `film.en.vtt` / `film.chapters.vtt` / `film.descriptions.en.vtt`, other `.vtt` / `.srt`; any other `.mp4` is a social
  master.
- **Video**: codec and profile; the codecs string against the page's (`mp4.mjs`); the peak bitrate over any second
  against the ceiling of the level the page declares (HEVC Main 4.0: 12 Mb/s; H.264 High 4.0: 25 Mb/s; social files:
  their own level), so the declared level is a promise kept, not just a label; `yuv420p`; BT.709 and limited range in
  the stream and the `colr` box; 30 fps; square pixels; frame count against duration; the film's frames against
  `docs/film-captions.json`; the frame sizes (a loop must have the size `src/lib/media.ts` lays it out at, from its
  `LOOP_FRAMES` / `LOOP_PHONE_FRAME` when present); `moov` before `mdat`.
- **Audio**: the film has one AAC-LC 48 kHz stereo track at about 160 kb/s that lasts as long as the picture; loops
  and the teaser have none (D11); social masters have AAC-LC 48 kHz stereo at about 192 kb/s.
- **Loudness** (`ebur128` with true peak, read at full precision from its metadata): the website film −16 LUFS ±1 and
  ≤ −1.5 dBTP (D10); social −14 LUFS ±1 and ≤ −1.0 dBTP (OVERRIDES §4). Outside ±0.5 LU (MASTER_PLAN §6.4's gate) is a
  warning.
- **Sizes**: every file under `public/` ≤ 45 MB and `public/` ≤ 90 MB (D16); the film set ≤ 45 MB (OVERRIDES §8); a
  film file over its C6 share is a warning; teaser, loop and poster budgets as above; social ≤ 512 MB and 3 to 140 s
  (LinkedIn's minimum, X's 2 min 20 s).
- **Seams** (loops and the teaser): the PSNR of the last frame against the first must be at least the median PSNR
  between neighbouring frames minus 3 dB, the rule of the loops lane's `loopqa.py` and FILM_SPEC §16. On an encode it
  is measured at 400 px wide (area scaling) and the median is capped at 45 dB: a still hold encodes as identical frames
  (infinite PSNR) while the seam's two frames carry different coding noise, so an uncapped rule would fail every loop
  with a still tail. A cursor left on screen or a camera that doesn't return still fails. Calibrated on a detailed
  test loop (a frozen `testsrc2` frame) at HEVC CRF 27–33 and H.264 CRF 23–29: clean seams read 58.6–66.9 dB and a
  24x36 px cursor left at the end 35.7 dB, against the 42 dB threshold.
- **Text tracks**: WebVTT/SRT syntax and the caption rules (`tools/captions/cues.mjs`); `film.*.vtt` must equal what
  `tools/captions/build.mjs` makes from today's sources (a stale track fails), and so must a full-film `.srt`.
- **Posters**: format, budget, an AVIF and a WebP twin, the aspect of their video and of the size `src/lib/media.ts`
  gives them (a different size with the same aspect is a warning: the page's srcset would describe it wrongly).
- **Strays**: a file in `public/media/v1` that `src/lib/media.ts` would never request is a warning.

## Cut files

`--cut <cut.json>` (for `encode.sh social` and `tools/captions/build.mjs`) lists the film's source frame ranges in the
order they play, as `[first, end)` (end exclusive) at the film's 30 fps:

```json
{
  "name": "x-30s",
  "fps": 30,
  "ranges": [[0, 144], [504, 648], [936, 1224], [2088, 2304]],
  "exclude": ["c09"],
  "add": [{ "id": "x1", "start": 0, "end": 36, "lines": ["[Gentle music begins]"] }]
}
```

- `include` (optional): only these caption ids; `exclude` (optional): never these; `add` (optional): the cut's own
  cues, in the cut's frames (for example the sound descriptions of its own music edit).
- The video is assembled frame-exactly: one input per range, seeked to the range's first frame (its time rounded down
  to the microsecond) and trimmed to the range's length, then concatenated. The soundtrack must last as long as the
  cut, within one frame.
- Captions move to the cut's timeline. A caption that runs across two consecutive ranges stays one cue, a clipped
  caption is reported, and every cue must still pass the caption rules (≥ 1.2 s, ≤ 3.5 words/s) or nothing is written.

## Tests

The tools were tested on tiny synthetic inputs (lavfi `testsrc2`, `smptehdbars` and pink noise, 2 to 3 s) through
heavy.sh, with every output under `.work/tmp/` and none in `public/`. `ENCODE_BUDGET_SCALE=<factor>` (tests only)
multiplies every budget in `encode.sh` and `poster.mjs`, so that small inputs exercise the CRF and quality steps;
`verify.mjs` always applies the real budgets.
