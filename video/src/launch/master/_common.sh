# Shared by the master's scripts (sourced, not run). Sets REPO, the headless shell, the aspect's composition id and
# the output folders; every script runs its heavy steps through scripts/heavy.sh, one at a time.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd -P)"
cd "$REPO"
# shellcheck source=/dev/null
source scripts/env.sh >/dev/null
HEAVY="$REPO/scripts/heavy.sh"
SHELL145="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell"
CHROME_FLAGS=(--browser-executable="$SHELL145" --chrome-mode=headless-shell --gl=angle)
OUT_DIR="$REPO/video/out/launch"
DRAFT_DIR="$REPO/.work/launch/master"
FF="${FF:-/opt/homebrew/bin/ffmpeg}"
FP="${FP:-/opt/homebrew/bin/ffprobe}"
mkdir -p "$OUT_DIR" "$DRAFT_DIR"

aspect_or_die() {
  case "${1:-}" in
    16x9|4x5) ASPECT="$1"; COMP="LaunchFilm-$1" ;;
    *) echo "usage: $(basename "$0") 16x9|4x5 [options]" >&2; exit 64 ;;
  esac
}

# the music file the master plays (data/music.ts MUSIC_PICK), for the music-only variant
music_wav() {
  local pick
  pick="$(sed -n 's/^export const MUSIC_PICK: MusicId = "\([ABC]\)";/\1/p' "$REPO/video/src/launch/data/music.ts")"
  sed -n "/^export const MUSIC_${pick}: Music = {/,/^};/p" "$REPO/video/src/launch/data/music.ts" | sed -n 's/^  file: "\(.*\)",$/\1/p' | sed "s#^#$REPO/video/public/#"
}
