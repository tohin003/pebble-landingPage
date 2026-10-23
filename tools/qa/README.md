# tools/qa

## shot.mjs: build, serve and screenshot the site

Builds the site (`next build`), serves it with `next start` on a free port, and screenshots each page at the given
widths × themes × motion settings with the installed Chrome (puppeteer-core from `capture/node_modules`, no browser
download). Each shot is a series of viewport screenshots taken while scrolling down (critic H10: an agent can't judge a
1440 × 12,000 px image shrunk to fit; it can read the tiles, and they show the sticky header and call to action where a
visitor sees them), and `report.json` records the page height, horizontal overflow, the pebble path's state, console
errors, failed requests, CSP violations and each tile's scroll position. The server and Chrome always stop at the end.
`node tools/qa/sheets.mjs <run>` packs the light and dark tiles side by side into review sheets at full resolution.

Run it through the heavy-job runner (the build, the server and Chrome are one heavy job):

```bash
cd /path/to/pebble-landingPage && source scripts/env.sh && \
  scripts/heavy.sh qa-shot node tools/qa/shot.mjs --widths=390,1440 --themes=light,dark
```

Output: `.work/qa/screens/<run>/` (gitignored). Logs: `.work/qa/logs/`.

| Option | Default | |
|---|---|---|
| `--run=NAME` | a timestamp | the output folder |
| `--paths=/,/film` | `/` | pages to shoot |
| `--widths=320,390,1440` | `390,1440` | under 500 px: phone emulation through CDP (headless Chrome won't open a window narrower than 500 px), an iPhone user agent and touch, so the page shows its non-Mac call to action |
| `--themes=light,dark` | both | the stored theme choice plus the matching `prefers-color-scheme` |
| `--motion=on,paused,reduced` | `on` | `paused` is the site's Pause motion; `reduced` emulates `prefers-reduced-motion` |
| `--height=N` | 844 / 900 / 1080 | viewport height (phones / up to 1600 px / wider) |
| `--dpr=2` | 1 | device pixel ratio |
| `--no-build` | | reuse the last build |
| `--no-tiles` | | no tiles (use with `--full`) |
| `--full` | | also one full-page capture per shot, as an overview only: Chrome can blank long pages below about 16,000 px |
| `--tile-wait=450` | 450 | ms to wait after each scroll step before a tile is taken |
| `--lenient` | | exit 0 even when a shot reports problems |
| `--interactions` | | also check the shell per width and theme, with a viewport shot of each state: the skip link is the first Tab stop, the sticky call to action appears after the hero, the phone menu opens and Esc closes it with focus back on its button, the theme toggle flips and stores the theme, Pause motion sets `data-motion="paused"` and `aria-pressed` |

Each shot scrolls through the page once before the capture, so lazy images load and the pebble's path is drawn (it
draws on with scrolling and never retracts), then returns to the top.

## The other gates (MASTER_PLAN §9.1–§9.3)

Each serves the last `next build` (shot.mjs builds; `scripts/heavy.sh qa-build npx next build` also works) with
`next start` on a free port and drives the installed Chrome through puppeteer-core (`lib.mjs`), so each one is a heavy
job; the copy lint and the sheets only read files. Each file's header lists its options.

| Tool | Checks | Output |
|---|---|---|
| `a11y.mjs` | axe-core 4.14 (pinned here: run `npm ci` in this folder), WCAG 2.0–2.2 A and AA plus best practices, light and dark, at the top, mid-page and after a full scroll, plus the open states (menu sheet, download notice, FAQ answer, honesty stamp, film theatre); a contrast pass with the decorative line and grain set aside | `.work/qa/a11y/<run>.json` |
| `interact.mjs` | the keyboard walk (every Tab stop shown, on screen, not under the sticky header or call to action, with a visible focus change), the skip link, header toggles, the phone menu, the three explainers, the story tabs and AgentGuard's switch, the film dialog with focus return, the install Copy button and its live region, the loop pause buttons | `.work/qa/screens/<run>/report-interact.json` |
| `requests.mjs` | every request same-origin, no cookies (document, browser jar, Set-Cookie), zero console errors and failed requests, first-load JS and transfer budgets, a link crawl | `.work/qa/requests/<run>.json` |
| `lighthouse.sh` | Lighthouse 13.5.0, mobile and desktop, N runs each, medians against MASTER_PLAN §7.7; `H2=1` puts `h2proxy.mjs` (HTTP/2, TLS, Brotli, as Vercel serves the site) in front of `next start` | `.work/qa/lighthouse/<run>/` |
| `line-check.mjs` | the pebble's path never runs through text (and, as a softer check, product media) | `.work/qa/screens/<run>/` |
| `copy-lint.mjs` | the voice and claim rules on the built HTML and `llms.txt` (`--src` adds `src/content`); light work | stdout |
| `sheets.mjs` | review sheets from a shot.mjs run; light work | `.work/qa/screens/<run>/sheets/` |

`all.sh` runs every gate in order on one build, each heavy step as its own `scripts/heavy.sh` job, and stops when a
CPU hold (`.work/HOLD`) appears, printing the command that runs the steps left (it never bypasses a hold):

```bash
cd /path/to/pebble-landingPage && source scripts/env.sh && bash tools/qa/all.sh qa-r2             # everything
cd /path/to/pebble-landingPage && source scripts/env.sh && bash tools/qa/all.sh qa-r2 a11y lh-h2  # some steps, last build
```

Steps: `shot` (builds first), `sheets`, `a11y`, `interact`, `requests`, `lh-h2`, `lh`, `line`, `lint`. One line per
step goes to `.work/qa/logs/<run>-all.out`, the full output to `.work/qa/logs/<run>-<step>.out`.
