#!/usr/bin/env bash
# The headless shell for the film's renders (master/_common.sh passes it to Remotion as --browser-executable), with the
# compositor told to finish every stage (commit, raster, activation) before it draws. Without it a screenshot can be
# taken while a layer's tiles are still rasterising: draft 2 showed nine frames with a take's window or a whole frame
# drawn empty, all where a picture had just been mounted or put under a new filter (REVIEW-1 M1). Same binary, same
# arguments; one flag more.
exec "$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell" "$@" \
  --run-all-compositor-stages-before-draw
