#!/usr/bin/env bash
# tools/assets/fonts.sh <python-with-fonttools-and-brotli>
#
# Makes src/fonts/Fraunces-Display-latin.woff2, the site's display face (docs/DESIGN.md §3, critic M4): Fraunces with
# wght pinned at 350, SOFT at 100 and WONK at 0, keeping only the optical-size axis (opsz 9-144) so that
# `font-optical-sizing: auto` still fits the H1 and the H2s. 121,016 bytes (four axes) become about 33 KB.
#
# The Python needs fontTools 4.67.0 and brotli (to write WOFF2). Make a throwaway one outside the repo, for example:
#   uv venv --python 3.13 "$TMPDIR/fontvenv" && uv pip install --python "$TMPDIR/fontvenv/bin/python" fonttools==4.67.0 brotli
#   tools/assets/fonts.sh "$TMPDIR/fontvenv/bin/python"
# (scripts/env.sh points UV_CACHE_DIR into .work/; delete that cache afterwards.)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
FONTS="$HERE/../../src/fonts"
PY="${1:?usage: tools/assets/fonts.sh <python with fontTools and brotli>}"

"$PY" -I -m fontTools.varLib.instancer "$FONTS/Fraunces-Variable-latin.woff2" \
  wght=350 SOFT=100 WONK=0 -o "$FONTS/Fraunces-Display-latin.woff2"
"$PY" -I - "$FONTS/Fraunces-Display-latin.woff2" <<'PYEOF'
import sys
from fontTools.ttLib import TTFont
t = TTFont(sys.argv[1])
axes = [(a.axisTag, a.minValue, a.maxValue) for a in t["fvar"].axes]
assert axes == [("opsz", 9.0, 144.0)], axes
assert t["OS/2"].usWeightClass == 350
print("ok:", sys.argv[1], axes, len(t.getGlyphOrder()), "glyphs")
PYEOF
