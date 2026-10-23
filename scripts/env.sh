# scripts/env.sh: source me (bash or zsh) before every command:
#   cd <repo root> && source scripts/env.sh && ...
# It fixes PATH (the Intel binaries in /usr/local/bin, git and ffmpeg among them, don't run on this Mac) and keeps every
# cache inside .work/. Safe to source more than once.

# REPO is the folder above this script (falls back to the current directory).
_pebble_env_src=""
if [ -n "${BASH_SOURCE:-}" ]; then
  _pebble_env_src="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  eval '_pebble_env_src="${(%):-%x}"'
fi
if [ -n "$_pebble_env_src" ] && [ -f "$_pebble_env_src" ]; then
  REPO="$(cd "$(dirname "$_pebble_env_src")/.." && pwd -P)"
else
  REPO="$(pwd -P)"
fi
unset _pebble_env_src
export REPO

# The Pebble source checkout. READ-ONLY: never write in it (no caches either). No local path is committed: it comes
# from the environment, else from the gitignored .work/local.env (one line: PEBBLE_REPO=/path/to/the/checkout).
if [ -z "${PEBBLE_REPO:-}" ] && [ -f "$REPO/.work/local.env" ]; then
  PEBBLE_REPO="$(sed -n 's/^PEBBLE_REPO=//p' "$REPO/.work/local.env" | head -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")"
fi
if [ -n "${PEBBLE_REPO:-}" ]; then
  export PEBBLE_REPO
else
  echo "env.sh: PEBBLE_REPO is not set (export it, or add PEBBLE_REPO=/path/to/pebble to .work/local.env)" >&2
fi

# .work/bin/git -> /usr/bin/git, so that `git` (and Node's spawn('git')) never resolves to the broken /usr/local/bin/git.
# /usr/bin itself is NOT put first: that would hide the user's own python3 behind Apple's /usr/bin/python3 3.9.
mkdir -p "$REPO/.work/bin"
if [ "$(readlink "$REPO/.work/bin/git" 2>/dev/null)" != "/usr/bin/git" ]; then
  ln -sf /usr/bin/git "$REPO/.work/bin/git"
fi
case ":$PATH:" in
  *":$REPO/.work/bin:/opt/homebrew/bin:"*) ;;
  *) export PATH="$REPO/.work/bin:/opt/homebrew/bin:$PATH" ;;
esac

# Homebrew FFmpeg (arm64). Always call these by absolute path.
export FF=/opt/homebrew/bin/ffmpeg FP=/opt/homebrew/bin/ffprobe

# Python with Pillow for the QA helpers (capture/check_frames.py, contact.py, preview.py). Run them as "$PYQA" -I ...
# The audio stack uses its own venv (.work/audio/.venv, Python 3.13), never this one.
export PYQA="${PYQA:-/Library/Frameworks/Python.framework/Versions/3.14/bin/python3}"

# No telemetry, no update nags.
export DO_NOT_TRACK=1 DISABLE_TELEMETRY=1 NEXT_TELEMETRY_DISABLED=1

# Caches stay inside the repo's .work/ (delete them after each install step), never in $HOME.
export npm_config_cache="$REPO/.work/npm-cache" npm_config_fund=false npm_config_audit=false npm_config_update_notifier=false
export UV_CACHE_DIR="$REPO/.work/uv-cache"
export PLAYWRIGHT_BROWSERS_PATH="$REPO/.work/ms-playwright" PUPPETEER_SKIP_DOWNLOAD=1
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Homebrew: no auto-update, no automatic cleanup, no analytics, and never upgrade formulae that other projects use.
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 HOMEBREW_NO_ANALYTICS=1 HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

# Type checks one at a time (scripts/serial.sh): two `tsc` runs side by side push this 8 GB Mac into swap, and each new
# swap file takes 1 GiB of the shared disk. Every other npm command passes straight through.
npm() {
  if [ "${1:-}" = "run" ] && [ "${2:-}" = "typecheck" ] && [ -z "${PEBBLE_SERIAL_HELD:-}" ]; then
    "$REPO/scripts/serial.sh" typecheck npm "$@"
  else
    command npm "$@"
  fi
}
