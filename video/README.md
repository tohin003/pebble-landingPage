# video/: Pebble's films, loops and stills (Remotion 4.0.538)

A separate npm project (its own `package.json` and lockfile; not a workspace, not part of the Vercel build). Every
`remotion` and `@remotion/*` package is pinned to exactly 4.0.538 (`npx remotion versions` must agree). Never run
`npx remotion upgrade` mid-project; if 4.0.538 regresses, move every Remotion package to 4.0.537 together.

Always start from the repo root, after `source scripts/env.sh`.

| Task | Command (renders, stills and Studio are heavy jobs: one at a time, through `scripts/heavy.sh`) |
|---|---|
| Install (fresh clone) | `cd video && npm ci && npx remotion browser ensure` (headless shell 157, about 570 MB, in `node_modules/.remotion/`) |
| Studio | `cd video && ../scripts/heavy.sh studio npx remotion studio` (opens in your browser; stop it with Ctrl-C) |
| One still | `cd video && ../scripts/heavy.sh still npx remotion still src/index.ts Placeholder out/placeholder.png --frame=45` |
| QA frames | `cd video && ../scripts/heavy.sh qa-frames npx remotion render src/index.ts <Id> out/qa/<Id> --sequence --frames=0,30,60 --image-format=png` |
| Type-check | `cd video && npx tsc` |

- QA frames come from the composition itself, never from the `FilmFrames` sampler, whose frame 0 is sometimes flat
  (OVERRIDES §20). `--sequence` writes one PNG per frame into the folder. In Remotion 4.0.538, `--frames` takes a list
  (`0,30,60` renders only those frames), a range (`0-60` renders every frame in it) or one frame. The CLI's help text
  names only the range and the single frame. If Remotion ever moves off 4.0.538, use a range until the list is checked.
  For one frame, use `remotion still … --frame=504` (`docs/BUILDING.md` §4).

- `remotion.config.ts` (CLI and Studio only): Rspack, ANGLE OpenGL, bt709, concurrency 2, overwrite on.
- `src/motion/spec.ts`: the motion spec (timing, easing, springs, camera, cursor, type, colours) from research report R5,
  with `FPS.film = 30` (decision D7).
- `src/fonts.ts`: loads the same woff2 files as the site from `public/fonts/` with `@remotion/fonts` (no network).
- `../shared/` is type-checked here (`tsconfig.json` includes it) and bundles fine from Remotion (verified in Phase 0).
  Never import `video/src/**` from the site.
- Gitignored: `out/`, `public/ui/`, `public/ui-frames/`, `public/audio/`, `public/sfx/`.

Licence: Remotion's licence applies to the Remotion packages (free for an individual, see
https://github.com/remotion-dev/remotion/blob/main/LICENSE.md); this project's own code follows the repo's licence.
