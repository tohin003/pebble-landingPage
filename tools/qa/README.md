# tools/qa

## shot.mjs: build, serve and screenshot the site

Builds the site (`next build`), serves it with `next start` on a free port, and screenshots each page at the given
widths × themes × motion settings with the installed Chrome (puppeteer-core from `capture/node_modules`, no browser
download). Each shot is a full-page PNG plus viewport-sized tiles (critic H10: an agent can't judge a 1440 × 12,000 px
image shrunk to fit; it can read the tiles), and `report.json` records the page height, horizontal overflow, the pebble
path's state, console errors, failed requests and CSP violations. The server and Chrome always stop at the end.

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
| `--no-tiles` | | full-page shots only |
| `--lenient` | | exit 0 even when a shot reports problems |
| `--interactions` | | also check the shell per width and theme, with a viewport shot of each state: the skip link is the first Tab stop, the sticky call to action appears after the hero, the phone menu opens and Esc closes it with focus back on its button, the theme toggle flips and stores the theme, Pause motion sets `data-motion="paused"` and `aria-pressed` |

Each shot scrolls through the page once before the capture, so lazy images load and the pebble's path is drawn (it
draws on with scrolling and never retracts), then returns to the top.

## Later (Phase 4, MASTER_PLAN §9)

Playwright and axe on the installed Chrome (`channel: "chrome"`, no browser download), Lighthouse, copy-lint, video-frame
and loudness checks; install here with `npm install --save-exact @playwright/test@1.64.1 @axe-core/playwright@4.14.0`
when Phase 4 starts, and run every suite through `scripts/heavy.sh`.
