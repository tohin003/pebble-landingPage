# capture/: Pebble's real UI with demo data

U2's Approach A (research report `U2-ui-capture.md`): Pebble's own Vite frontend, read from the Pebble checkout
(`$PEBBLE_REPO`, **read-only**), runs in the installed Chrome with Tauri's official IPC mocks and the fictional demo world
in `mock/fixtures.js` (Maya, `invoice-kit`, a Lisbon trip budget, a datetime quiz). Nothing is ever written inside the
Pebble checkout: Vite runs with `configFile:false`, its cache is `capture/vite-cache/`, and HMR and file watching are off.

Setup (once): `cd capture && npm ci --ignore-scripts` (puppeteer-core 25.13.0; no browser download).

Every run goes through `scripts/heavy.sh` (UI capture is a heavy job), from the repo root after `source scripts/env.sh`.
Always pass `--locale=en-GB --tz=Europe/London` to `capture.mjs` (`record.mjs` sets them itself).

**Capture a published release, never a moving working tree.** Before a batch, check that no file under the checkout's
`src/` or `index.html` is newer than the release (`find "$PEBBLE_REPO/src" "$PEBBLE_REPO/index.html" -newermt '<published>'`
prints nothing), and check again after it. When the checkout has moved on (the next version's work in progress), freeze
the release and serve the frozen copy: `/usr/bin/python3 -I -B capture/freeze-release.py v1.1.0 <new-dir>
--node-modules="$PEBBLE_REPO/node_modules"` writes the tag's `index.html` and `src/` from GitHub, checks every file
against the tag's git tree, and links `node_modules` only if the checkout's dependencies match the tag's; then
`export PEBBLE_REPO=<new-dir>` before `source scripts/env.sh`, and `freeze-release.py --verify <new-dir>` around the
batch. The 1.1.0 captures (24 Oct) were made this way: the checkout took the next version's work in progress within
an hour of 1.1.0's publication. So was the 1.2.0 retake (24 Oct, `v1.2.0` at `a4af2e5`): the fixtures say 1.2.0, and
the `tests/test_dates.py` edit carries the host's 1.2.0 reason for a test change the request didn't ask for. The
trailer's captures (25 Oct) came from `v1.5.0` at `16dd425` the same way; the host templates the fixtures use were
compared with that tag (`mock/fixtures.js`, its header), and `record.mjs` and `capture.mjs` pass `version=1.5.0`.

| Task | Command |
|---|---|
| The trailer's held run, every clock its own (P0) | `scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs main-live-film-150 --theme=light --scale=3 --out=video/public/ui-frames/main-live-film-150` (825 frames, about 490 MB); the dark twin with `--theme=dark --from=6.0 --frames=499` |
| Check its clocks | `/usr/bin/python3 -I -B capture/check_live_film.py <frames-dir> [--corpus=<frozen>/src,<backend files>,capture/mock/fixtures.js,capture/record.mjs]`: every "+N s" stamp, "· N s" duration, status-line time, receipt, usage line and the toast against the recording's own frames, and for the Ask-mode climax no running test row or "Testing" status, the card's 2.4-s Running span and Verified after the resumed turn (when the recording reaches them); a round-2 schedule (meta `fidelity_round` 2) has its receipts counted from its own rows at each settle and its usage lines matched to its own usage records; `pet-live-150` gets the quick chat's checks (the answer whole on its turn's end, the status line's time, the usage line, the completion); with `--corpus`, every visible string not found literally in the sources is listed for review |
| The picture lane's manifest | `/usr/bin/python3 -I -B capture/manifest_live_film.py <frames-dir> capture/manifests/<shot>.json --check=<check.json>`: each moment's source frame and second, the boxes of the controls the film aims at, how long each waiting state holds; for `main-challenge-live` and `pet-live-150` their own moments; a round-2 manifest carries `"fidelity_round": 2` |
| Stills (PNG, light and dark) | `scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs main-done [--exact] [--themes=light] [--scale=2,3] [--out=DIR] --locale=en-GB --tz=Europe/London` |
| Film and loop stills | the same with `--themes=light --scale=2,3 --naming=video --out=video/public/ui` (writes `<scene>[-<step>]@2x.png` and `@3x.png`) |
| Page stills (AVIF + WebP) | capture the sources with `--scale=3 --themes=light,dark --out=capture/shots/page`, then `scripts/heavy.sh stills node tools/assets/stills.mjs` (writes `public/ui/v1/<name>-<theme>-2400.avif` and `.webp`, and the same at 1200) |
| 1.1.0 Privacy and focus stills | the four `*privacy*` scenes (below): the windows at `--scale=3`, the crops at `--scale=5`, into `capture/shots/page`; then `scripts/heavy.sh stills node capture/page-stills.mjs` (the same encoder and names as `stills.mjs`, which doesn't list them yet) |
| Compare a re-capture with the stills' sources | `"$PYQA" -I capture/diff.py capture/shots/page <new-dir> --out=<dir>` (per pair: same, or the differing regions as old \| new \| difference crops) |
| README media | capture at `--scale=1.6667` (the 1440×900 window at 2400 px) or `1.675` (hero) into `capture/shots/readme`, record `pet-gaze` (below), then `node tools/assets/readme.mjs --out=<folder>` |
| Deterministic frames (vclock, RGBA) | `scripts/heavy.sh record capture/with-server.sh node capture/record.mjs pet-live-error --theme=light --out=video/public/ui-frames/<shot>` |
| A short excerpt or sampled states | `record.mjs <timeline> --frames=60` records only the first 60 frames; `--at=2.6,9.9,15.3` saves stills at those seconds instead of a sequence; a timeline with `probe: true` also writes `probes.json` (per-frame positions, status line, toast, receipts, usage lines, the drawer's visible steps, and the visible text every `--text-every=10` frames and on `--text-at=F1,F2,…`) |
| A release's own version, or hidden elements, in stills | `capture.mjs … --version=1.5.0 [--hide=SELECTORS]` (opacity 0, as `record.mjs --hide`); `--measure='SEL1\|SEL2'` adds those elements' CSS-px boxes to the run's report (`measured`) |
| The film's riverbed plates as rasters | `scripts/heavy.sh plate node capture/riverbed-plate.mjs dark` writes `video/public/desktop/riverbed-dark@3x.png` (4800×3000, gitignored) from the page's dark wallpaper without its baked vignette, in Chrome like the RiverbedPlate still; `… light --out=<file>` re-renders the light plate to compare |
| Check frames for raster glitches | `"$PYQA" -I capture/check_frames.py <frames-dir> 1` (the Veil's glass pebble: add `--box=0.3,0.3,0.7,0.7 --alpha=120`) |
| Contact sheet / animated preview | `"$PYQA" -I capture/contact.py out.png a.png b.png …` / `"$PYQA" -I capture/preview.py <frames-dir> out.webp` |
| Static demo bundle | `scripts/heavy.sh demo-build node capture/build.mjs` (writes `capture/demo-build/`) |
| Browse by hand | `node capture/serve.mjs`, then `http://127.0.0.1:5199/?scene=approval&theme=dark` (add `&stealth` to start with Stealth Lockdown on) |

`capture.mjs` ends with a `SUMMARY:` line and exits 1 when a run has an unhandled IPC call, an error banner, a console
error or a scene error (its JSON report is in `capture/logs/`). Treat any of those as a failure, and still look at every
image: some failures show only as text on screen (for example "Notification settings are unavailable.").

## Scenes (`SCENES` in `capture.mjs`; `-wide` means the 1440×900 window)

| Scene | Shows |
|---|---|
| `main-welcome` | The Companion home: "Good to see you.", the four starters |
| `main-approval`, `main-approval-wide` | Two edit cards waiting in Details › Activity (Ask for approval); from 1.2.0 the test file's card leads with "Pebble wants to change a test file, and your request didn't ask for test changes. …" |
| `main-done` (+ `-timeline`), `main-done-wide` | The finished task: "Verified · pytest 42 passed on current files", Undo this edit |
| `main-live` (`-01-empty` … `-04-waiting-approval`) | A run played from the backend's events; `-02-reading` is the Reading-state still |
| `held-unverified`, `held-unverified-wide` | AgentGuard's hold: "Pebble's change isn't verified yet." with Run the tests / Ask Pebble to finish / Accept as unverified |
| `held-tests-review` | After Run the tests: the "Run isolated tests" card ("Runs the project's tests in a temporary copy. Your project files don't change.") |
| `main-challenge`, `main-challenge-wide` | The scope challenge as the refused step's error in Details › Activity (Auto in project) |
| `main-forget` (+ `-card`), `main-forget-wide` | "Forget my Lisbon trip plans.": the host's reply and the Forget card, before and after one Forget |
| `settings-models`, `settings-permissions`, `settings-permissions-auto`, `settings-memory`, `settings-memory-forgotten`, `settings-skills` | Settings tabs; `-auto` has Auto in project selected (C8); `-forgotten` is after Forget on "Uses metric units and 24-hour times." (L7) |
| `settings-privacy-wide`, `settings-privacy-on-wide`, `crop-privacy-card`, `crop-privacy-card-on` | 1.1.0: Settings scrolled to Privacy and focus, Stealth Lockdown off, then switched on (the avatars behind the dialog wear the Veil); the crops are the section alone, in one shared frame. The switch's CSS glow is held at one instant (`GLOW_AT`) |
| `main-dashboard` (wide), `main-dashboard-main`, `main-quiz`, `main-quiz-wide` | The Lisbon dashboard in the widened canvas; the datetime quiz |
| `command-review`, `git-plan` (P1) | A terminal command card ("Pebble can't undo a command.", Run command); a reviewed Git commit (Run Git plan) |
| `crop-*` | Region crops for film punch-ins: approval card, done receipt, held row, tests card, challenge step, models ways in, permission modes (+ auto), memory records (+ forgotten), dashboard chart, command card, Git card |
| `pet-collapsed`, `pet-collapsed-gaze`, `pet-status`, `pet-chat`, `pet-sidebar`, `pet-live` (`-01` … `-05`) | The companion (transparent PNGs at the window sizes main.rs uses); `pet-live` asks "What does 'day is out of range for month' mean?" (D22) |

## Timelines (`TIMELINES` in `record.mjs`)

| Timeline | Length | What happens |
|---|---|---|
| `pet-live-error` (alias `pet-live`) | 9 s | The pebble expands, the question is typed and sent, Thinking, the reply streams (Writing), the task completes |
| `pet-live-150` | 9 s | The quick chat on 1.5.0 in v1.5.0's own event order (fidelity round 2): the pebble expands, the question is typed (34 ms a character) and sent at 3.00 s exactly as in `pet-live-error`; Thinking while the model's turn runs (Pet.vue shows text only from `token` events and has no live stream view); the answer arrives whole at 6.50 s (runner.py sends a turn's text in one token event; its text renders on the next frame, 6.53 s), the usage line at 6.57 s, and the task completes at 6.60 s. The film's take is `--theme=light --scale=3 --hide=.pet-avatar` into `video/public/ui-frames/pet-live-150-light-hidden`; `capture/manifests/pet-live-150.json` |
| `main-live-film` | 27 s | Request, Searching, Reading, two edit cards, Apply edit twice, the gate holds ("Pebble's change isn't verified yet."), Run the tests, the "Run isolated tests" card, Run tests, "Requesting isolated tests · 11 s", "Verified · pytest 42 passed on current files", the final reply |
| `main-live-film-150` | 27.5 s | The same run on 1.5.0 in v1.5.0's own event order at the 4,096-token window (OVERRIDES §40-§41, fidelity round 2), every clock the window prints taken from the recording. Each model turn streams only into the drawer ("Receiving model response"); its text reaches the conversation in one piece when the turn ends. Host rows carry no activity class (no "Explored" fold), model rows no timing detail (a local GGUF model), and no turn-end is held (no "Draft withdrawn"). The edit cards arrive mid-run as each edit is staged (4.30 and 4.47 s), the proposal at 5.80 s, the wait for approval at 5.93 s. Apply edit at 9.20 and 9.70 s: each writes the host's "Applied the edit to … You can undo it in Activity & review." into the conversation, and the second resumes the run ("Recalled 3 memories" again). The model's summary arrives at 12.00 s; the completion check asks twice for evidence (each "Not verified …" answered by a model turn, at 12.77 and 13.90 s), then holds the run at 14.03 s, when the conversation re-reads and the reply moves after the two "Applied …" messages. Run the tests 16.00 s, the card 16.13 s, Run tests 17.80 s: the approve route runs the tests, so for exactly 2.4 s the card reads Running and nothing else moves (no test step, no "Testing"); at 20.20 s the card reads Done, "Action completed" and the host's summary arrive and the run resumes; its text reaches the conversation at 22.40 s, "Verified" follows at 22.43 s, completion at 22.50 s. Its schedule is in `timeline.json` (meta), its probes in `probes.json`; `capture/manifests/main-live-film-150.json` (and `-dark.json`, the dark twin's 6.0-16.6 s) has the moments, the boxes and the Undo's track |
| `main-challenge-live` | 12.5 s | 1.5.0, Auto in project, in v1.5.0's own event order (fidelity round 2): the scope-challenge run on the clock (two model turns of tool calls only, three reads, six edits applied without cards or conversation messages, no "Explored" fold), the refused step arriving in Details › Activity with the engine's words as its error, the model's next turn starting at once, then the person opening its Details. Recorded from 5.0 s; `capture/manifests/main-challenge-live.json` |
| `pet-gaze` | 6.5 s | The collapsed pebble's eyes follow a pointer circling it (the shell's quantized gaze messages); the extra half second lets `readme.mjs` cross-fade the loop |
| `pet-veil` | 7.4 s | 1.1.0: Stealth Lockdown on at 1.0 s (the Veil's cast, then one shimmer), off at 6.0 s (the release), as the host switches it for every window. A render of the pebble by Pebble's own code, never a screen recording |

Outputs stay in this repo and are gitignored: `shots/`, `frames*/`, `logs/`, `vite-cache/`, `chrome-profile/` (about
100 MB, safe to delete), `demo-build/`, `previews/`, `sheets/`. `PEBBLE_REPO` comes from the environment, else from the
gitignored `.work/local.env` (`PEBBLE_REPO=/path/to/the/checkout`), or is a frozen copy (above); no local path is
committed.
