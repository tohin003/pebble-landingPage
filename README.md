# Pebble's website and launch film

This repository is the source of Pebble's website, and of the launch film, feature loops and stills made for it.

[Pebble](https://github.com/tohin003/Pebble) is a free, open-source (Apache-2.0) AI companion for Macs with Apple
silicon. A small animated pebble lives on your screen: click it to chat, or open the full window to work in a project,
read the web, keep memory you control and build small interactive views.

- The site is a Next.js 16 app at the root of this repository. Vercel builds and serves it.
- The page's film is the Pebble 2.0 launch film, made with Remotion in `video/src/launch/` from recordings of Pebble
  2.0, Pebble 2.0.1's own interface (captured in `capture/`), the Pebble Remote app and the pebble's own animation
  engine. The page's feature clips are cut from it (`tools/encode/`). The earlier films, the 1.x loops, the posters
  and the social card are in `video/` too.
- The claims register, `docs/CLAIMS.md`, maps every factual sentence on the site and in the film to its source.
- The page states the facts of Pebble 2.0.3: version, size, SHA-256 and test counts, from
  `src/content/releaseFacts.ts`. At build time, and then hourly, it reads the latest release's version and size from
  GitHub.

Live site: https://pebble-landing-page-eta.vercel.app

## What the site shows

The home page, top to bottom. The anchors are public links (the header, the footer and the FAQ use them), so they stay
stable.

| Section | What it shows | Anchor |
|---|---|---|
| A little help, right here. | The live pebble, Download with its honest line, the release facts | `#top` |
| (the strip under the hero) | Pebble 2.0 against Claude Code and Codex: the benchmark's headline and its two "Tasks done correctly" rows | `#benchmark-strip` |
| Watch Pebble at work. | The Pebble 2.0 launch film (1:39) behind its own first frame; it plays with sound, captions, chapters and audio description, and phones get its 4:5 cut | `#film` |
| Evidence before "done". | AgentGuard, the evidence layer, as a ledger of real captures | `#agentguard` |
| On your screen, out of your way. | The companion on your desktop, with a feature loop | `#desktop` |
| Works in your project, under your review. | A coding task, step by step | `#project` |
| Across your Mac, as far as you allow. | The app windows, websites and apps Pebble may use, each with its limit, and a clip from the film | `#mac` |
| Pebble's Workshop. | The small tools Pebble makes, tests and keeps, with a clip from the film | `#workshop` |
| Pebble Remote. | The iPhone app, source only, with its limits, and a clip from the film | `#remote` |
| Your model, your choice. | The three ways to bring a model | `#models` |
| You set the pace. | The three permission modes, as an interactive dial | `#permissions` |
| Memory you can read and forget. | The six labelled layers, and forgetting one memory | `#memory` |
| Views, not just text. | Views built from data, bigger tasks kept in bounds, and what else is inside | `#views`, `#more` |
| Built like infrastructure. | The engineering facts, with the release's test counts | `#infrastructure` |
| Pebble 2.0 against Claude Code and Codex. | Golden set 2.0: the method, the two tables, the paired differences, where Pebble led and trailed, the safety result and the data; the 1.0.2 run below it as dated history. It renders only while `benchmarksPublic` in `releaseFacts.ts` is true | `#benchmarks` |
| Private by default. | What is stored on your Mac, and what leaves it | `#privacy` |
| Stealth Lockdown. | In Pebble's own words, as of Pebble 2.0.3, with its honest line: an interactive example of the page's pebble wearing the Veil, drawn by Pebble's own code, and a clip from the film | `#stealth` |
| Install Pebble. | The one-line install, the zip and its checksum, first run and updates | `#install` |
| What Pebble isn't (yet) | The limits, stated plainly | `#limits` |
| Free and open source. | The repository and the licence, then the questions | `#open-source`, `#faq` |
| Say hi to Pebble. | The last call to action | `#get-pebble` |

Wherever the site shows Stealth Lockdown (the section, the FAQ and `llms.txt`), Pebble's honest line goes with it, word
for word: "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams
and interviews that forbid assistants still forbid it."

The other pages: `/film` (the film with its transcript), `/credits`, `/privacy`, and `/llms.txt`, `/sitemap.xml`,
`/robots.txt` and the social card.

## What is in here

| Path | What it holds |
|---|---|
| `src/` | The site, a Next.js App Router app: routes in `app/`, components, every visible string in `content/`, helpers in `lib/`, self-hosted fonts in `fonts/` |
| `shared/pebble/` | The pebble's animation engine (bloub, MIT) and Pebble's own poses, shared by the site and the films; and the Veil, Stealth Lockdown's look, from Pebble's own code |
| `public/` | The Pebble 2.0 launch film, its 4:5 phone cut, its text tracks, its posters and the clips cut from it (`media/v3/`); the 1.x loops and the riverbed wallpaper (`media/v1/`); stills of Pebble's real interface (`ui/v1/`); the media licence (`media/README.md`). The retired 1.x trailer's `media/v2/` is in git history |
| `video/` | The Remotion project: the Pebble 2.0 launch film in 16:9 and 4:5 (`src/launch/`), the retired 1.x trailer, the 1.x loops, the posters and the social card. A separate npm project, not part of the site's build |
| `capture/` | The capture harness: Pebble's real interface running in Chrome, with the app's calls mocked and fictional sample data |
| `tools/` | `encode/` (every site file of the film from its masters, `launch-site.sh`: the web mix, the film and its 4:5 cut, the posters, the clips, and their checks), `captions/` (the page's three tracks, from the film's own captions and `src/content/chapters.ts`), `audio/` (the retired trailer's synthesised score, its sound effects and mix), `assets/` (stills, wallpaper, icons, fonts), `qa/` (the quality gates) |
| `docs/` | The design philosophy and system, the claims register, the launch film's treatment and edit plan (`launch/`), the retired trailer's spec, captions and cuts, the media provenance, how to build everything and how it was made |
| `scripts/` | `env.sh`, sourced before every command; `heavy.sh`, which runs one heavy job at a time; `serial.sh`, which runs one type check at a time |

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
| `GITHUB_TOKEN` | you, optional | A fine-grained, read-only GitHub token. The server reads the latest Pebble release (tag, date, download size) from the GitHub API at build time and at most once an hour. Shared build machines can reach GitHub's limit of 60 unauthenticated requests an hour; the token lifts it. Without the token, or on any error, rate limit or timeout (6 s), the page uses the known-good release facts in `src/content/releaseFacts.ts` and still offers the download (`src/lib/release.ts`) |
| `PEBBLE_RELEASE_STATE` | you, optional | `soon` hides the Download button and the install command at build time and keeps "View on GitHub". Any other value, or none, means live. You should not need it |

Good to know:

- The home page and `/film` regenerate at most once an hour, so a new Pebble release reaches the page within about an
  hour without a redeploy.
- Films and loops appear on the page only if their files are in `public/media/` when the build starts: the film and
  the 2.0 clips in `v3/`, the 1.x loops in `v1/` (`next.config.ts` lists both). Without them the page shows a poster
  or a still in their place.
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
| `npm run test:site` | Bun tests for `src/lib`, `src/components/ui`, `src/components/sections` and `src/content` |
| `npm run test:engine` | Bun tests for the pebble's engine (`shared/pebble`) and its site components |

Rebuilding the media (captures, the score, the films, the encodes) needs a Mac with Apple silicon, Pebble's source at
a published release and a few more tools. `docs/BUILDING.md` lists them, with every command. On that Mac, start every
command with `source scripts/env.sh`, and run heavy jobs (builds, renders, captures, encodes) through
`scripts/heavy.sh`.

## Licences

The code in this repository is licensed under the Apache License 2.0 (`LICENSE`). The films, loops, posters, stills and
social images are © 2026 Tohin Majumder and are not covered by the code licence (`public/media/README.md`).
Third-party work keeps its own licence, listed in `CREDITS.md` and on the site's `/credits` page: the pebble's
character engine, bloub by Jérémy Perret (MIT); the fonts Fraunces, Inter and Geist Mono (SIL Open Font License 1.1);
the film's music, "Your Breath" by Eugenio Mininni (Mixkit, whose licence asks for no credit), and its CC0 sound
effects; and the packages the site ships. Pebble itself is
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
