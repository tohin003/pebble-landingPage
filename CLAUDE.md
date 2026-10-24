# CLAUDE.md

Guidance for coding agents in this repository: Pebble's website (Next.js 16 at the root) and its launch film, loops
and stills (Remotion in `video/`). `README.md` has the layout and the deploy notes; `docs/BUILDING.md` has every media
command; `docs/HOW_IT_WAS_MADE.md` explains why things are the way they are.

## Read first

- **`AGENTS.md`.** This is Next.js 16, which differs from what you may know: read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next code, and heed deprecation notices. `next dev` rewrites that file's
  managed block; if it changes, commit it with your work.
- **Sources of truth.** Change these first, never a copy of them.
  - Copy: every visible string lives in `src/content/*.ts` (`copy.ts`, `faq.ts`, `benchmarks.ts`, `chapters.ts`,
    `credits.ts`, `seo.ts`, `labels.ts`). Components never hard-code copy.
  - Release facts: `src/content/releaseFacts.ts`, the one file that states the release (below).
  - Facts: `docs/CLAIMS.md`. Every factual sentence on the site, in the film and in `llms.txt` needs a row there; the
    `[C-…]` tags in the content files are its IDs. A sentence you can't source is rewritten or removed.
  - Design: `docs/PHILOSOPHY.md` (the intent) and `docs/DESIGN-LEXINGTON.md` (tokens, grid, sections). Where they
    disagree, the philosophy sets the intent and the claims register sets the facts. `docs/DESIGN.md` records the
    first design round and is superseded wherever those two differ.
  - Film: `docs/FILM_SPEC.md`, `video/src/film/timeline.ts`, `docs/film-captions.json` (the only caption source;
    `src/content/filmCaptions.ts` mirrors it and a test checks) and `docs/film-cuts/x30.json` (the 30 s cut).
  - Licences: `CREDITS.md` (the site shows the same list at `/credits` from `src/content/credits.ts`: keep the two in
    step), `docs/media-provenance.json` and `public/media/README.md`.

## Every command

- Start with `cd <repo> && source scripts/env.sh && …`. It fixes `PATH`, exports `$FF`, `$FP`, `$PYQA` and
  `CHROME_PATH`, keeps caches inside `.work/`, and runs `npm run typecheck` through `scripts/serial.sh`, one type check
  at a time.
- Use `/usr/bin/git` (`env.sh` links `.work/bin/git` to it; the Intel builds in `/usr/local/bin` don't run on the build
  Mac). Keep the repository's local identity; never change the global git config.
- Pebble's source (`PEBBLE_REPO`, from the environment or the gitignored `.work/local.env`) is read-only. Never write
  there, caches included.

## Heavy jobs

Run every heavy job through `scripts/heavy.sh <label> <command…>`, one at a time: Remotion renders, stills and Studio;
`next build`; `next start` with Lighthouse; captures and recordings; FFmpeg batch encodes; audio analysis of more than
one file; headless-Chrome screenshot batches. It refuses to start below 1.7 GiB of free disk or 20 % of free memory,
while `.work/HOLD` exists, and when `.work/RESERVE` keeps disk for another session. Then do light work and retry later
(`scripts/heavy.sh --status`, `scripts/heavy.sh --wait-hold`). Never bypass it. Render from `video/`, and delete frame
sequences and masters once they have been used.

## Rules that are easy to break

- **Media versioning.** `/media/v1/` and `/ui/v1/` are served as immutable for a year. Once the site is deployed, never
  overwrite a file there: a re-render or a re-capture goes to `v2/`, which also means updating the folders
  `next.config.ts` lists and caches, and the paths in `src/lib/media.ts`.
- **No raw audio in git.** `*.wav`, `*.mp3`, `*.flac`, `*.aiff`, `*.m4a` and `*.mov` are ignored; the soundtrack exists
  only inside the encoded films.
- **Real captures only.** Never redraw Pebble's interface; keep its words verbatim; label sample data "Shown with
  sample data."
- **Capture a published release, never a moving checkout.** Pebble's checkout can hold the next version's
  unpublished work. Before a capture batch, nothing under its `src/` or `index.html` may be newer than the release;
  otherwise freeze the release's tag with `capture/freeze-release.py` and capture from the frozen copy
  (`capture/README.md`, `docs/BUILDING.md` §1). Quote Pebble's words from a published tag too (`file@vX.Y.Z:line` in
  `docs/CLAIMS.md`), never from a checkout.
- **Masters.** Render the compositions themselves, never the `FilmFrames` sampler; one browser tab
  (`--concurrency=1`); scan every master for blank and half-painted frames before encoding (`docs/BUILDING.md` §4).
- **The pebble.** Only Pebble's own poses, never the engine's catalogue states. Credit it wherever it appears:
  "Pebble's character engine: bloub by Jérémy Perret (MIT)". It is always sage, never black, and the only thing that
  moves on its own. Leave the files copied from Pebble into `shared/pebble/` (bloub, and Pebble's own files such as
  `stealthVeil.ts`) as they are: a test checks the unchanged copies against their recorded hashes.
- **Stealth Lockdown.** Wherever it is shown, its honest line goes with it, word for word: "Hidden from screen capture
  and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants
  still forbid it." Never "undetectable" or "invisible", and nothing about exams, interviews, proctoring, monitoring,
  cheating, bypassing or evading beyond that line (`src/content/neverWords.ts`; the copy lint enforces it). Never show
  or fake a screen share with Pebble missing. The Veil on the page is a render by Pebble's own code, never called a
  recording, and its dusk blue stays inside the Stealth section.
- **Code boundaries.** The site never imports `video/src/**`; `shared/pebble/` (plain TypeScript, no React, no
  Remotion) is the only code the two share. Remotion stays pinned at 4.0.538; never run `npx remotion upgrade`.
- **No filled ink buttons.** Download and Copy use the sage accent; everything else is a text link or an outline.
  `src/components/ui/ui.test.ts` fails on an ink fill.
- **Comparisons.** None, except two approved lines, word for word: "An agent shouldn't grade its own work." and the
  benchmark headline "Pebble matches Claude Code on the same model, within the margin." The film shows no number that
  isn't published. A feature appears only after the Pebble release that ships it is published, and with no savings or
  speed numbers until a benchmark measures them.
- **Release facts.** `src/content/releaseFacts.ts` holds what the page states about the release: version, tag, date,
  the zip's size and SHA-256, the test counts and the benchmark gate. Change it only for a published release, from its
  GitHub release (the API's `published_at` and asset size, and the release's own `SHA256SUMS`) and the README at its
  tag, then update the CLAIMS rows its header lists. `src/lib/release.ts` reads the latest version and size from the
  GitHub API at build time and hourly, and falls back to `releaseFacts.ts`; an API error must never hide the download.
- **Voice.** British spelling, sentence case, a period, no exclamation marks. A feature sentence is followed by its
  limit.

## Never (from `docs/PHILOSOPHY.md`)

- Decorative gradients, glass, neon, glow or purple. A released feature's own accent is the only exception, and only
  inside its own section.
- Bento grids, card grids, or icons on every feature.
- Logo walls, invented testimonials, stock photos, or invented UI.
- Scroll-jacking, scroll reveals on every section, autoplaying sound.
- Eyebrows, all caps, middle-dot meta strings, emoji, exclamation marks.
- "Magic", "seamless", "revolutionary", "secure", "private by design", "undetectable", "beats".
- Analytics, cookies, third-party requests.

## Checks

- `npm run typecheck`, `npm run test:site` and `npm run test:engine` (the tests run on Bun: `bun test`, never
  `node --test`).
- Films: `(cd video && npx tsc)`, `(cd video && bun src/loops/check.ts)` and `bun video/scripts/export-cues.ts --check`.
- Captions: `node tools/captions/build.mjs --check` (and `--check --cut docs/film-cuts/x30.json`).
- Media: `node tools/encode/verify.mjs` (or `--no-analysis` for the light, probe-only pass).
- Copy: `node tools/qa/copy-lint.mjs --src`, after a `next build`.
- Every gate on one build: `bash tools/qa/all.sh <run>`. Look at the tiles yourself.

## Before a push

- Push only when asked, and only `main` (`git push origin main`); never `--all` or `--mirror`. Never deploy from an
  agent: the owner deploys through Vercel.
- The pre-push guards; both commands must print nothing:
  - `git ls-files | grep -Ei '\.(wav|mp3|flac|aiff|m4a|mov)$'`: no raw audio is tracked.
  - `git ls-files -z | xargs -0 du -m | awk '$1 > 45'`: every file is at most 45 MB. And `du -sh public` stays at or
    under 90 MB.
- As in every commit: no local paths (`git grep -n -F "$HOME"` prints nothing) and no secrets; every new or changed
  claim has its row in `docs/CLAIMS.md`.

## Working beside other agents

Several agents may work in this checkout at once. Touch only the files your task owns, commit only those, in small
commits ending with the co-author trailer your session gives you, and leave a short handoff (what was done, the files,
how to run it, the open issues) in `.work/handoffs/` when you finish.
