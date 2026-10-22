# capture/: Pebble's real UI with demo data

U2's Approach A (research report `U2-ui-capture.md`): Pebble's own Vite frontend, read from the Pebble checkout
(`$PEBBLE_REPO`, **read-only**), runs in the installed Chrome with Tauri's official IPC mocks and the fictional demo world
in `mock/fixtures.js` (Maya, `invoice-kit`, a Lisbon trip budget, a datetime quiz). Nothing is ever written inside the
Pebble checkout: Vite runs with `configFile:false`, its cache is `capture/vite-cache/`, and HMR and file watching are off.

Setup (once): `cd capture && npm ci --ignore-scripts` (puppeteer-core 25.13.0; no browser download).

Every run goes through `scripts/heavy.sh` (UI capture is a heavy job), from the repo root after `source scripts/env.sh`:

| Task | Command |
|---|---|
| Stills (2x PNG, light and dark) | `scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs main-done [--themes=light] [--out=DIR]` |
| Deterministic frames (vclock, 2x RGBA, 30 fps) | `scripts/heavy.sh record capture/with-server.sh node capture/record.mjs pet-live --theme=light --out=video/public/ui-frames/<shot>` |
| Check frames for raster glitches | `"$PYQA" -I capture/check_frames.py <frames-dir> 20` |
| Contact sheet / animated preview | `"$PYQA" -I capture/contact.py out.png a.png b.png …` / `"$PYQA" -I capture/preview.py <frames-dir> out.webp` |
| Static demo bundle | `scripts/heavy.sh demo-build node capture/build.mjs` (writes `capture/demo-build/`) |
| Browse by hand | `node capture/serve.mjs`, then `http://127.0.0.1:5199/?scene=approval&theme=dark` |

`capture.mjs` ends with a `SUMMARY:` line and exits 1 when a run has an unhandled IPC call, an error banner or a console
error (its JSON report is in `capture/logs/`). Treat any of those as a failure. Scenes: see `SCENES` in `capture.mjs`
and the scene names in `mock/fixtures.js`.

Outputs stay in this repo and are gitignored: `shots/`, `frames*/`, `logs/`, `vite-cache/`, `chrome-profile/` (about
100 MB, safe to delete), `demo-build/`, `previews/`, `sheets/`. `PEBBLE_REPO` comes from the environment (default: the
local checkout path set in `scripts/env.sh`).
