# tools/encode

The page's encodes of the Pebble 2.0 launch film, its 4:5 cut, the loops cut from it and the posters, and the checks
that gate them (MASTER_PLAN §2.4, §5.5, §6.4; D10, D16; OVERRIDES §4 and §8; `.work/launch/briefs/site2.md`). Homebrew
FFmpeg 9 through `$FF` and `$FP` from `scripts/env.sh`; Node 24; no new dependencies (posters use the sharp already in
`tools/assets/node_modules`).

| File | What it does |
|---|---|
| `launch-site.sh` | **The one command**: every site file of the film, from the director's masters, in order (`tracks mix film posters loops verify`, or any of them). Run it again whenever the film changes |
| `encode.sh` | `mix`, `film`, `phone`, `still`, `loop`, `poster` and `social` commands. Each command runs as **one** `scripts/heavy.sh` job: run it directly and it queues itself through heavy.sh |
| `loops.mjs` | The loops of `launch-loops.json`, cut from the masters: the loop masters, a review strip each, the posters and the encodes (one heavy job a loop). `--dry-run` checks the plan (light) |
| `launch-loops.json` | The loop plan: for each slot (`src/lib/media.ts` `LaunchLoopId`) the scene, its master frames, the cycle, the poster frame, the cuts and draft labels |
| `verify.mjs` | Checks every delivered file and prints a table (or `--json`); exit 1 on any failure. Its loudness and seam passes run as one heavy job too |
| `mp4.mjs` | A small ISO-BMFF reader: faststart, the RFC 6381 codecs string from `hvcC`/`avcC`, the `colr` box, AVIF/WebP pixel sizes. `node tools/encode/mp4.mjs info\|codecs\|fits <file>` |
| `poster.mjs` | A PNG still to `<base>.avif` + `<base>.webp` (called by `encode.sh poster`) |
| `../captions/` | The text tracks: `film.en.vtt` (the film's own captions), `film.chapters.vtt`, `film.descriptions.en.vtt` (see its README) |

The 1.x launch trailer was retired from the site on 2 Nov 2026, when the Pebble 2.0 launch film replaced it at the
owner's ask: its `public/media/v2/` files, its 1:1 cut (`encode.sh square`), the first film's teaser (`encode.sh
teaser`) and its 30 s cut for X (`encode.sh social --cut`, `docs/film-cuts/x30.json`) are in git history.

## The film's files, in order

The masters are the director's: `video/out/launch/LaunchFilm-16x9-master.mp4` and `LaunchFilm-4x5-master.mp4`
(H.264 CRF 12, 30 fps, 2,982 frames, from `video/src/launch/master/final.sh`), each with its mix beside it
(`…-master.wav`). Every command runs from the repo root after `source scripts/env.sh`.

```bash
tools/encode/launch-site.sh                      # all of it: the steps below, each heavy one queued through heavy.sh

# or step by step:
bun video/src/launch/master/captions.ts --write  # the film's captions (its own check first), video/out/launch/*.vtt
node tools/captions/build.mjs                    # film.en.vtt, film.chapters.vtt, film.descriptions.en.vtt -> v3
tools/encode/encode.sh mix video/out/launch/LaunchFilm-16x9-master.wav .work/launch/site/mix-16x9-web.wav
tools/encode/encode.sh mix video/out/launch/LaunchFilm-4x5-master.wav .work/launch/site/mix-4x5-web.wav
tools/encode/encode.sh film video/out/launch/LaunchFilm-16x9-master.mp4 .work/launch/site/mix-16x9-web.wav
tools/encode/encode.sh phone video/out/launch/LaunchFilm-4x5-master.mp4 .work/launch/site/mix-4x5-web.wav
tools/encode/encode.sh still video/out/launch/LaunchFilm-16x9-master.mp4 0 .work/launch/site/film.poster.png
tools/encode/encode.sh poster .work/launch/site/film.poster.png public/media/v3/film.poster 1920 1080
tools/encode/encode.sh still video/out/launch/LaunchFilm-4x5-master.mp4 0 .work/launch/site/film-phone.poster.png
tools/encode/encode.sh poster .work/launch/site/film-phone.poster.png public/media/v3/film-phone.poster 1080 1350
node tools/encode/loops.mjs                      # the loops, their posters and encodes
node tools/encode/verify.mjs                     # every file in public/media, loudness and seams included
tools/encode/launch-site.sh clean                # then: the intermediate mixes, stills and loop masters go
```

- **The web mix** (`encode.sh mix`): the site plays the film at −16 LUFS (D10). The mix goes through the same chain as
  the director's own web copy (`video/src/launch/master/deliver.sh`): a 4×-oversampled peak limiter at −4 dBFS
  (`MIX_LIMIT_DB`), then two-pass loudnorm that must stay linear, one gain for the whole film; it stops otherwise. The
  result is a 48 kHz 24-bit WAV, so the film's AAC is one generation. The director's `LaunchFilm-<aspect>-web.mp4` is
  the same level in a file of its own (H.264 CRF 16, AAC 256k) and is not the page's.
- **Posters**: each master's frame 0, a finished composition ("This is Pebble." over the small pebble), read as
  BT.709 limited range (`encode.sh still`).
- **The loops** (`loops.mjs`, `launch-loops.json`): cut from the masters, never a new render (the scenes' preview
  compositions run at 60 fps, and the masters are the frames the critic signed off). Each cycle is the film's own
  frames; its last `blend` frames (12, 0.4 s) dissolve into its first, and it starts on its poster frame, so the poster
  is frame 0 and the seam is two neighbouring film frames (`verify.mjs` checks every loop's seam). The 16:9 cuts are
  scaled to 1600 × 900; the 4:5 cuts are the 4:5 master's own frames, 1080 × 1350; long tasks is a 3:2 crop of the
  16:9 diagram (1140 × 760), clear of its scene's title and of its budget line's label. `--dry-run` checks the plan against `src/lib/media.ts`; each loop writes a
  six-frame review strip to `.work/launch/site/loops/review/` for the eye.

## The launch film's budget

`public/` must stay within 90 MB and every file within 45 MB (D16), with 5 MB of headroom: at most 85 MB as `du -sh
public` counts it (the director's phase-B brief). The film set may take about 50 MB (OVERRIDES §8 set 45; the
director's phase-B answer 3 allows 50 "if clean needs it", and the calibration below says it does). Decimal MB, measured
on 2 Nov 2026 with the trailer retired; the encoded sizes are phase B's:

| Part | Files | Budget |
|---|---|---|
| Kept: `media/v1` (1.x loops, posters, wallpaper), `ui/v1` | 36 + 112 | 12.08 now; 8.74 once the v1 `companion` and `memory` loops retire (3.34), after `desk` and `memory` replace them |
| The film, 16:9 | `film-1080.hevc` 14 (13.32 at CRF 27), `film-720.h264` 11 (10.60 at CRF 22) | 25 |
| The film, 4:5 for phones | `film-phone.hevc` 11 (10.17 at CRF 28), `film-phone.h264` 12.5 (12.60 at CRF 25) | 23.5 |
| **The film set** | 4 | **48.5 of 50 (46.69 encoded)** |
| The film's posters and tracks | 4 + 3 | 0.3 |
| The loops | 8 loops, 14 clips (7 at 16:9 or 3:2, 7 at 4:5): HEVC ≤ 0.6, H.264 ≤ 0.9 (hard 1.2) | ≤ 21 (hard 25.2) |
| The loops' posters | 28 (AVIF ≤ 60 KB, WebP ≤ 90 KB) | ≤ 2.5, about 1.3 |
| **`public/`** | | **about 81 at the budgets after the two v1 loops go (77 MiB in `du -sh` units)** |
| Left | | about 4 MB at the budgets, more at the encoded sizes; `ui/v2`'s 2.0.x stills (at most 6) need the loops to land under theirs |

- **Which film files**: the player tries, on a phone, the 4:5 cut (HEVC, then H.264) and then the 16:9 files; on a
  screen at least 1,700 device pixels wide, 1080p then 720p, else 720p then 1080p; HEVC before H.264 in each; only what
  the browser can play (`src/lib/filmSources.ts`). The plan encodes **1080p HEVC**, **720p H.264** and the **4:5 cut in
  both**: Safari and Chrome on a Mac (most of the page's visitors) play the 1080p HEVC, every other desktop browser the
  720p H.264, phones the 4:5 cut. It leaves out 1080p H.264 (critic C6's alternative: the H.264-only browsers get 720p,
  upscaled) and 720p HEVC (a small screen with HEVC plays the 720p H.264). `encode.sh film --only 1080.h264,720.hevc`
  still makes them, with C6's shares, if the set has room.
- **Bitrates**: 99.4 s with AAC 160 kb/s (about 2 MB a file) leaves the video about 0.87 Mb/s at 1080p HEVC, 0.6 at
  720p H.264, 0.52 at 4:5 HEVC and 0.72 at 4:5 H.264.
- **The grain**: the masters carry the film's grain (at most 3 %, re-seeded 30 times a second, `video/src/launch/
  components/Grain.tsx`); it costs the most bits at these rates, and an encoder that can't keep it smears it or makes it
  pulse on the dark grounds (S00, S01, S08, S11). The drafts measured it: draft 5 at half size and CRF 20 is about 2.0
  Mb/s of video. Phase B calibrated on a dark stretch and a light one before the full encodes (2 Nov 2026, the 16:9
  master's 0-8 s, the opening on its dark stage, and 31-40 s, a card on a light ground; x265 slow and x264 slow),
  judged by eye on crops at 3× contrast and by the director's blockiness measure (`bun video/src/launch/master/
  blockiness.ts <file>`; the master itself reads 1.73 and 1.38, its grain carrying H.264's 8-px grid):
  - **No denoise** (the film's own look): at the planned 0.87 Mb/s, and at CRF 27, the grain doesn't survive. The dark
    ground (luma about 34) breaks into flat blocks a level or two apart, and the first second after the start reads
    2.6 to 3.7 (the master 1.7 to 1.8). x264 at 720p keeps some grain, as mottled patches, for 0.86 Mb/s on a near-still
    dark shot. The director's own crop filter (`eq=contrast=3:brightness=0.15`) crushes a ground that dark to black, so
    the crops are lifted from black instead (`lutyuv=y=(val-16)*3`).
  - **So the web files use `FILM_VF=hqdn3d=0:0:4:4`** (a temporal-only denoise), the loops too (`launch-loops.json`
    `prefilter`, each range read 15 frames early so the filter is warm at its first frame). On its own it changes
    little in x265; with **`ENC_AQ=3`** (both encoders' adaptive quantisation with a bias to dark scenes, now the
    default) the ground is smooth: median 1.26 at CRF 27, for 464 kb/s on the dark stretch. x264 at 720p is smooth
    with it too (1.16, 0.52 Mb/s). The HEVC film's first second (**`FILM_ZONE`**, frames 0-29 at 2.5 times the bits,
    about 0.4 MB) starts clean instead of clearing over a second: 1.07 to 1.19, and the stretch's worst falls to 1.32.
    x264's first second was clean without it.
- **If a file misses its budget** at its CRF + `FILM_MAX_RAISE`, it takes the lowest CRF under its hard limit, and
  the film set must still pass 50 MB. Raise `FILM_MAX_RAISE` (to 6) or the starting CRF (`FILM_HEVC_CRF`,
  `FILM_H264_CRF`) before dropping a file.

## Settings and budgets

Each file starts at its CRF. Over its budget, the CRF rises (first the step that a bitrate fall of about 14 % per CRF
step predicts, then +1) until the file fits, never by more than `FILM_MAX_RAISE` (film, default 4) or 6 (loops). The
resolution never drops. The first CRF that fits wins; failing that, the lowest CRF under the hard limit, with a
warning; failing that, the command fails and the last try is kept in `.work/tmp/encode-rejected/`. `--exact` keeps the
starting CRF.

| Output | Encode | Budget (raise CRF to fit) | Hard limit |
|---|---|---|---|
| `film-1080.hevc.mp4` | x265 slow CRF 27 (`FILM_HEVC_CRF`), `hvc1`, `FILM_ZONE` on its first second, AAC 160k 48 kHz | 14 MB | 16 MB |
| `film-720.h264.mp4` | x264 slow CRF 22 (`FILM_H264_CRF` + 1), High, `scale=1280:-2:flags=lanczos`, AAC 160k | 11 MB | 12 MB |
| `film-phone.hevc.mp4` | x265 slow CRF 27 from the 4:5 master, `hvc1`, `FILM_ZONE`, AAC 160k from its mix | 11 MB | 12 MB |
| `film-phone.h264.mp4` | x264 slow CRF 21 from the 4:5 master, High, AAC 160k | 12.5 MB | 14 MB |
| `film-1080.h264.mp4`, `film-720.hevc.mp4` | not in the plan (`--only`): CRF 21 / 28 | 18 / 6 MB | 30 / 12 MB |
| `loop-<id>[-phone].hevc.mp4` | x265 slow CRF 27, `-an` | 0.6 MB for the launch loops (`LOOP_HEVC_BUDGET`; 0.9 by default) | the same |
| `loop-<id>[-phone].h264.mp4` | x264 slow CRF 23, High, `-an` | 0.9 MB for the launch loops (`LOOP_H264_BUDGET`; 1.2) | 1.2 (`LOOP_H264_HARD`; 1.5) |
| `<name>.poster.avif` / `.webp` | sharp AVIF q50 effort 6 / WebP q76 effort 6; quality down by 2 to fit (AVIF to q30, WebP to q50). A simple picture (under a quarter of its budget at the start quality: flat fields, soft gradients) gets the highest quality up to AVIF q80 / WebP q90 that stays under that quarter, because the start quality bands there | 60 KB / 90 KB | |
| social (`encode.sh social`) | x264 slow CRF 18, High, VBV 20 Mb/s (inside level 4.0), AAC-LC 192k 48 kHz stereo | X: 512 MB, 3 to 140 s | |

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
- **Inputs are checked before a job queues**: 30 fps (D7), the film master at 1920x1080 and the 4:5 one at 1080x1350,
  each with as many frames as the film has (`src/content/chapters.ts` `FILM_DURATION_SECONDS` at 30 fps: 2,982), a
  stereo soundtrack within one frame of the picture's length.

## What `verify.mjs` checks

```bash
node tools/encode/verify.mjs                                     # public/media (v1, v3), plus public/ totals
node tools/encode/verify.mjs video/out/launch/LaunchFilm-4x5-linkedin.mp4   # ... plus a delivered social file (never the masters)
node tools/encode/verify.mjs --no-public <files or folders>      # only these
node tools/encode/verify.mjs --no-analysis                       # probe-only: no loudness or seam pass, no heavy job
node tools/encode/verify.mjs --json                              # machine-readable, the same exit code
```

- **Roles by name**: `film-{1080,720,phone}.{hevc,h264}.mp4`, `loop-<id>[-phone].*`, `*.poster.{avif,webp}`,
  `film.en.vtt` / `film.chapters.vtt` / `film.descriptions.en.vtt`, other `.vtt` / `.srt`; any other `.mp4` is a social
  master.
- **Video**: codec and profile; the codecs string against the page's (`mp4.mjs`); the peak bitrate over any second
  against the ceiling of the level the page declares (HEVC Main 4.0: 12 Mb/s; H.264 High 4.0: 25 Mb/s; social files:
  their own level), so the declared level is a promise kept, not just a label; `yuv420p`; BT.709 and limited range in
  the stream and the `colr` box; 30 fps; square pixels; frame count against duration; the film's frames against
  `chapters.ts` (2,982); the frame sizes (a loop must have the size `src/lib/media.ts` lays it out at:
  `LAUNCH_LOOP_FRAMES`, `LOOP_FRAMES`, `LOOP_PHONE_FRAME`); `moov` before `mdat`.
- **Audio**: the film has one AAC-LC 48 kHz stereo track at about 160 kb/s that lasts as long as the picture; loops
  have none (D11); social masters have AAC-LC 48 kHz stereo at about 192 kb/s.
- **Loudness** (`ebur128` with true peak, read at full precision from its metadata): the website film −16 LUFS ±1 and
  ≤ −1.5 dBTP (D10); social −14 LUFS ±1 and ≤ −1.0 dBTP (OVERRIDES §4). Outside ±0.5 LU (MASTER_PLAN §6.4's gate) is a
  warning.
- **Sizes**: every file under `public/` ≤ 45 MB and `public/` ≤ 90 MB (D16); the film set ≤ 50 MB (OVERRIDES §8's 45,
  raised by the director's phase-B answer 3); a
  film file over its share (`LIMITS.film`, the plan above) is a warning; loop and poster budgets as above; social
  ≤ 512 MB and 3 to 140 s (LinkedIn's minimum, X's 2 min 20 s).
- **Seams** (loops): the PSNR of the last frame against the first must be at least the median PSNR between
  neighbouring frames minus 3 dB, the rule of the loops lane's `loopqa.py`. On an encode it is measured at 400 px wide
  (area scaling) and the median is capped at 45 dB: a still hold encodes as identical frames (infinite PSNR) while the
  seam's two frames carry different coding noise, so an uncapped rule would fail every loop with a still tail.
- **Text tracks**: WebVTT/SRT syntax and the caption rules (`tools/captions/cues.mjs`), with the film's own-pace
  exception for captions (`FILM_OWN_PACE`: a fast cue is a warning); `film.*.vtt` must equal what
  `tools/captions/build.mjs` makes from today's sources (a stale track fails), and so must a full-film `.srt`. Without
  the film's own VTT (`video/out/launch/`, gitignored), the tracks are checked for syntax and rules only.
- **Posters**: format, budget, an AVIF and a WebP twin, the aspect of their video and of the size `src/lib/media.ts`
  gives them (a different size with the same aspect is a warning: the page's srcset would describe it wrongly).
- **Strays**: a file in a versioned media folder that `src/lib/media.ts` would never request from that folder is a
  warning: the film and the 2.0 loops belong in its `LAUNCH_MEDIA` (`v3`), the 1.x loops and the wallpaper in its
  `MEDIA` (`v1`), and nothing in the retired `v2`.

## Tests

The tools were tested on tiny synthetic inputs (lavfi `testsrc2`, `smptehdbars` and pink noise, 2 to 3 s) through
heavy.sh, with every output under `.work/tmp/` and none in `public/`. `ENCODE_BUDGET_SCALE=<factor>` (tests only)
multiplies every budget in `encode.sh` and `poster.mjs`, so that small inputs exercise the CRF and quality steps;
`verify.mjs` always applies the real budgets. The launch commands (`mix`, `phone`, `still`, `loops.mjs`) were written
during a hold, when nothing could run: phase B tests them on synthetic inputs first (`.work/handoffs/launch-site-2.md`).
