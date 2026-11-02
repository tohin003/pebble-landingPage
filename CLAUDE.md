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
  - Film: the Pebble 2.0 launch film, the one the page plays.
    - `docs/launch/TREATMENT.md` (the treatment, with the owner's decisions) and `docs/launch/EDIT_PLAN.md`; the code
      in `video/src/launch/`, its scenes' slots in `master/timeline.ts` (99.4 s at 30 fps).
    - Captions: `video/src/launch/master/captions.ts` is the only source. Its `--write` writes the SRT and the VTT into
      `video/out/launch/`; `tools/captions/build.mjs` makes the page's three tracks in `public/media/v3/` from that VTT
      and `src/content/chapters.ts` (the chapters, the transcript and the audio description; `src/content/film.test.ts`
      checks the transcript against the captions).
    - The long-task scene's title, "Context warping.", stays in the film, its captions and the LinkedIn post. The
      page's own words never use the name (Pebble's D55; the copy lint and `src/content/facts.test.ts` fail on it).
    - The 1.x trailer is retired. `docs/FILM_SPEC.md`, `docs/film-captions.json` and `docs/film-cuts/x30.json` are its
      record. Keep `docs/film-captions.json`: every Remotion bundle imports it through `video/src/film/timeline.ts`.
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

- **Media versioning.** The versioned folders are served as immutable for a year: `/media/v1/` (the 1.x loops and the
  wallpaper), `/media/v3/` (the launch film, its tracks and its loops), `/ui/v1/` and `/ui/v2/` (real-UI stills, 1.x
  and 2.0.x). Once a folder has been deployed, never overwrite a file in it: a re-render or a re-capture goes to a new
  folder (a fix to a v3 file goes to `/media/v4/`), which also means updating the folders `next.config.ts` lists and
  caches, and the paths in `src/lib/media.ts`. `/media/v2/` held the 1.x trailer and was retired on 2 Nov 2026; its
  files stay in git history.
- **No raw audio in git.** `*.wav`, `*.mp3`, `*.flac`, `*.aiff`, `*.m4a` and `*.mov` are ignored; the soundtrack exists
  only inside the encoded films.
- **Real captures only.** Never redraw Pebble's interface; keep its words verbatim; label sample data "Shown with
  sample data."
- **Capture a published release, never a moving checkout.** Pebble's checkout can hold the next version's
  unpublished work. Before a capture batch, nothing under its `src/` or `index.html` may be newer than the release;
  otherwise freeze the release's tag with `capture/freeze-release.py` and capture from the frozen copy
  (`capture/README.md`, `docs/BUILDING.md` §1). Quote Pebble's words from a published tag too (`file@vX.Y.Z:line` in
  `docs/CLAIMS.md`), never from a checkout.
- **Masters.** Render the compositions themselves, never a sampler such as the trailer's `FilmFrames`; one browser
  tab (`--concurrency=1`); scan every master for blank and half-painted frames before encoding. For the launch film,
  `video/src/launch/master/final.sh 16x9|4x5` renders a master and its WAV mix, `qa.sh <master> --verify` scans it
  (its `gates.txt` must pass), `deliver.sh 16x9|4x5` makes the posted files, and `tools/encode/launch-site.sh` makes
  every site file from the masters.
- **The pebble.** Only Pebble's own poses, never the engine's catalogue states. Credit it wherever it appears:
  "Pebble's character engine: bloub by Jérémy Perret (MIT)". It is always sage, never black, and the only thing that
  moves on its own. Leave the files copied from Pebble into `shared/pebble/` (bloub, and Pebble's own files such as
  `stealthVeil.ts`) as they are: a test checks the unchanged copies against their recorded hashes.
- **Stealth Lockdown.** Wherever it is shown, its honest line goes with it, word for word: "Hidden from screen capture
  and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants
  still forbid it." Never "undetectable" or "invisible", and nothing about exams, interviews, proctoring, monitoring,
  cheating, bypassing or evading beyond that line (`src/content/neverWords.ts`; the copy lint enforces it). Never stage
  or fake a screen-share view with Pebble missing. A real screen recording in which Pebble's windows leave the capture
  as Stealth Lockdown turns on may be shown, with the honest line beside it (the owner's ruling, 1 Nov 2026). The Veil
  on the page is a render by Pebble's own code, never called a recording, and its dusk blue stays inside the Stealth
  section. In lists away from the honest line, such as the film's chapters and chips, its scene is "Presenting".
- **Code boundaries.** The site never imports `video/src/**`; `shared/pebble/` (plain TypeScript, no React, no
  Remotion) is the only code the two share. Remotion stays pinned at 4.0.538; never run `npx remotion upgrade`.
- **No filled ink buttons.** Download and Copy use the sage accent; everything else is a text link or an outline.
  `src/components/ui/ui.test.ts` fails on an ink fill.
- **Comparisons.** None, except two approved lines, word for word: "An agent shouldn't grade its own work." and the
  benchmark headline "Pebble matches Claude Code on the same model, within the margin." And, by the owner's brief of
  1 Nov 2026 for the 2.0 launch: Pebble 2.0.0's published benchmark against Claude Code and Codex, its numbers
  exactly as in the v2.0.0 release notes, with the method beside them (same model for both products, golden set 2.0's
  held-out split, 255 runs each), never "beats" for an overall result (`docs/launch/TREATMENT.md` §3). The film shows
  no number that isn't published. A feature appears only after the Pebble release that ships it is published, and
  with no savings or speed numbers until a benchmark measures them. The one exception is the person's D157: one
  planned feature shown as coming and not yet built, in the footer's hint (PHILOSOPHY's "Unreleased features", CLAIMS
  C-NEXT-1 and C-NEXT-2). The retired trailer's post-credit scene showed it too; the launch film doesn't.
- **Release facts.** `src/content/releaseFacts.ts` holds what the page states about the release: version, tag, date,
  the zip's size and SHA-256, the test counts and the benchmark gate. Change it only for a published release, from its
  GitHub release (the API's `published_at` and asset size, and the release's own `SHA256SUMS`) and the README at its
  tag, then update the CLAIMS rows its header lists. `src/lib/release.ts` reads the latest version and size from the
  GitHub API at build time and hourly, and falls back to `releaseFacts.ts`; an API error must never hide the download.
- **Voice.** British spelling, sentence case, a period, no exclamation marks. A feature sentence is followed by its
  limit.

## Never (from `docs/PHILOSOPHY.md`)

The 2.0 launch film (`docs/launch/`, `video/src/launch/`) follows its own treatment: where its look differs from this
list (light, gradients), the treatment holds for that film and its loops only.

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
- Films: `(cd video && npx tsc)`; the launch film's plan, `bun video/src/launch/master/check.ts`; the 1.x loops,
  `(cd video && bun src/loops/check.ts)`; the retired trailer, `bun video/scripts/export-cues.ts --check`.
- Captions: `bun video/src/launch/master/captions.ts --check` (the film's cues), then
  `node tools/captions/build.mjs --check` (the page's tracks).
- Media: `node tools/encode/verify.mjs` (or `--no-analysis` for the light, probe-only pass), and
  `node tools/encode/loops.mjs --dry-run` for the loop plan.
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
how to run it, the open issues) in `.work/handoffs/` when you finish. Commit by path (`git commit -m "…" -- <paths>`):
the index is shared, and a plain `git commit` takes whatever another agent has staged.
