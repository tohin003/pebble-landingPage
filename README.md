# Pebble's website and launch film

This repository is the source of Pebble's website, and of the launch film, feature loops and stills made for it.

[Pebble](https://github.com/tohin003/Pebble) is a free, open-source (Apache-2.0) AI companion for Macs with Apple
silicon. A small animated pebble lives on your screen: click it to chat, or open the full window to work in a project,
read the web, keep memory you control and build small interactive views.

- The site is a Next.js 16 app at the root of this repository. Vercel builds and serves it.
- The film, the loops, the posters and the social card are made with Remotion in `video/`, from Pebble's real
  interface (captured in `capture/`) and the pebble's own animation engine.
- The claims register, `docs/CLAIMS.md`, maps every factual sentence on the site and in the film to its source.

Live site: the address is added here after the first deployment.

## What is in here

| Path | What it holds |
|---|---|
| `src/` | The site, a Next.js App Router app: routes in `app/`, components, every visible string in `content/`, helpers in `lib/`, self-hosted fonts in `fonts/` |
| `shared/pebble/` | The pebble's animation engine (bloub, MIT) and Pebble's own poses, shared by the site and the films |
| `public/` | Stills of Pebble's real interface (`ui/v1/`); the riverbed wallpaper and, after the media phase, the films, loops, posters and captions (`media/v1/`); the media licence (`media/README.md`) |
| `video/` | The Remotion project: the launch film in 16:9, 1:1 and 9:16, the teaser, the loops, the posters and the social card. A separate npm project, not part of the site's build |
| `capture/` | The capture harness: Pebble's real interface running in Chrome, with the app's calls mocked and fictional sample data |
| `tools/` | `audio/` (the score, the sampler, the sound effects and the mix), `assets/` (stills, wallpaper, icons, fonts), `captions/` (the film's caption and chapter files), `encode/` (the web and social encodes, the posters and their checks), `qa/` (the quality gates) |
| `docs/` | The design philosophy and system, the claims register, the film spec and captions, the media provenance, how to build everything and how it was made |
| `scripts/` | `env.sh`, sourced before every command, and `heavy.sh`, which runs one heavy job at a time |

## Deploy on Vercel

1. In Vercel, add a new project and import the GitHub repository `tohin003/pebble-landingPage`.
2. Keep every default. The framework preset is Next.js (detected), the root directory is the repository root, and
   the install and build commands stay as Vercel sets them (`npm install`, then `npm run build`, which runs
   `next build`). Vercel takes Node.js 24 from `engines` in `package.json`.
3. Deploy. No environment variables are required.

What the site reads from the environment:

| Variable | Set by | What it does |
|---|---|---|
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel (a system variable) | The production domain. It becomes the canonical address in the page metadata, `sitemap.xml` and `robots.txt` (`src/lib/site.ts`). Without it they point at `http://localhost:3000`, so on another host set it to your domain |
| `VERCEL` | Vercel | Adds `upgrade-insecure-requests` to the Content Security Policy (`next.config.ts`) |
| `GITHUB_TOKEN` | you, optional | A fine-grained, read-only GitHub token. The server reads the latest Pebble release (tag, date, download size) from the GitHub API at build time and at most once an hour. Shared build machines can reach GitHub's limit of 60 unauthenticated requests an hour; the token lifts it. Without the token, or on any error, rate limit or timeout (6 s), the page uses the known-good release facts in `src/content/copy.ts` and still offers the download (`src/lib/release.ts`) |
| `PEBBLE_RELEASE_STATE` | you, optional | `soon` hides the Download button and the install command at build time and keeps "View on GitHub". Any other value, or none, means live. You should not need it |

Good to know:

- The home page and `/film` regenerate at most once an hour, so a new Pebble release reaches the page within about an
  hour without a redeploy.
- Films and loops appear on the page only if their files are in `public/media/v1/` when the build starts
  (`next.config.ts` lists them). Until then the page shows a poster or a still in their place.
- `.vercelignore` leaves `video/`, `capture/`, `tools/`, `docs/` and `scripts/` out of the deployment: the site
  needs none of them to build.
- After you add a custom domain, redeploy once so every page carries the new canonical address.
- Keep the site free of analytics: leave Vercel Web Analytics and Speed Insights off, and turn the Vercel Toolbar off
  in the project's settings. The site says it has no analytics, and its footer counts third-party requests in each
  visitor's browser.

## Local development

You need Node.js 24 (`engines` in `package.json`) with npm, and [Bun](https://bun.sh) 1.3 for the tests.

```bash
npm ci
npm run dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | The development server. The Content Security Policy and the year-long media caching apply only to production builds |
| `npm run build`, then `npm start` | A production build, served on port 3000 |
| `npm run typecheck` | `next typegen`, then `tsc --noEmit` |
| `npm run test:site` | Bun tests for `src/lib`, `src/components/ui` and `src/content` |
| `npm run test:engine` | Bun tests for the pebble's engine (`shared/pebble`) and its site components |

Rebuilding the media (captures, the score, the films, the encodes) needs a Mac with Apple silicon, a read-only
checkout of Pebble and a few more tools. `docs/BUILDING.md` lists them, with every command. On that Mac, start every
command with `source scripts/env.sh`, and run heavy jobs (builds, renders, captures, encodes) through
`scripts/heavy.sh`.

## Licences

The code in this repository is licensed under the Apache License 2.0 (`LICENSE`). The films, loops, posters, stills and
social images are © 2026 Tohin Majumder and are not covered by the code licence (`public/media/README.md`).
Third-party work keeps its own licence, listed in `CREDITS.md` and on the site's `/credits` page: the pebble's
character engine, bloub by Jérémy Perret (MIT); the fonts Fraunces, Inter and Geist Mono (SIL Open Font License 1.1);
the CC0 instrument samples and sound effects heard in the film; and the packages the site ships. Pebble itself is
Apache-2.0, in its own repository.

## Privacy

The site sets no cookies and runs no analytics or trackers. In production every page carries a Content Security
Policy (`next.config.ts`) that lets the browser load scripts, styles, images, media and fonts, and open connections,
only from the site's own origin. Inline scripts and styles, `data:` and `blob:` images and `blob:` media are allowed;
frames and plugins are not. So, while it shows the page, a visitor's browser makes no request to any other site, and
the footer counts cookies, trackers and third-party requests live, in that browser. Two things happen outside the page
itself: the site's server asks the GitHub API for the latest Pebble release at build time and at most once an hour,
and Vercel, as the host, receives each visitor's IP address and request details, as `/privacy` explains.

## More

- `docs/BUILDING.md`: how to rebuild everything, from the captures to the encodes, on a small Mac.
- `docs/HOW_IT_WAS_MADE.md`: the story of the site and the film, the gates, the tools and what was rejected.
- `docs/PHILOSOPHY.md` and `docs/DESIGN-LEXINGTON.md`: the design philosophy and the system that implements it.
- `CLAUDE.md`: guidance for coding agents working in this repository.
- `CREDITS.md`: credits and licences.
