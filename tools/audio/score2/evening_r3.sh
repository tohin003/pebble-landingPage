#!/usr/bin/env bash
# score2 lane, revision 3 (OVERRIDES §65-§68): every heavy step of the score's revision 3, in order, with one command.
# Run it after the release session posts "Hold lifted" (it was prepared during their held-out run, when nothing heavy
# could run):
#
#   bash tools/audio/score2/evening_r3.sh                 every step below, in order
#   bash tools/audio/score2/evening_r3.sh build strips    only the named steps (to resume after a failure)
#
# Steps:
#   archive   move the fix revision's masters' records, pictures and previews (28 Oct 09:45-10:00, revision 2's plan)
#             into master/archive-2026-10-28-r2fix/ (the WAVs and npz are rebuilt in place, as every revision did)
#   timing    the coda's timing, read from its plan (coda_timing.ts) -> master/coda_timing.json        [light: bun]
#   layers    the layer sheets for both films -> master/layers_main.json, layers_x40.json            [pure]
#   measure   the revision 3 plan assembled as built and measured -> cuesheet/r3/main.metrics.json  [heavy]
#   confirm   the rule's evening confirmation (J2, J3) -> cuesheet/r3/confirm.json; STOPS the chain on a failure
#   sheet     the spec, CUE_SHEET.json, BEAT_SHEET and CUE_SHEET.md with the measured numbers         [pure]
#   build     both films' masters, web and social, each gated after AAC on FFmpeg's and Apple's encoders  [heavy]
#   coda      the coda's mix-side checks on the main masters, with their canaries -> master/main.coda.json  [heavy]
#             (not blocking: a failure is reported at the end and the chain exits 1, with every artifact built)
#   arc       FFmpeg ebur128's independent arc of both web masters                                     [heavy]
#   strips    the masters' strips (both films) and the measured bed's strips (cuesheet/r3/main-*.png)   [heavy]
#   sheet2    CUE_SHEET.md again, now with the masters (§12)                                           [pure]
#   previews  the two score preview videos (the main film runs on through the coda)                   [heavy]
#   readme    preview/README.txt                                                                       [pure]
#   provenance SCORE_PROVENANCE.json                                                                   [pure]
#
# Every heavy step runs alone through scripts/heavy.sh under taskpolicy -c utility. heavy.sh refuses on .work/HOLD, low
# memory or low disk (exit 73): this waits and retries, up to MAX_WAIT_S (default 6 h). Any other failure stops the chain.
# Log: .work/score2/r3-evening.log. No audio leaves .work; no music-only file is delivered (OVERRIDES §51).
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
cd "$REPO" || exit 1
# shellcheck source=/dev/null
source scripts/env.sh >/dev/null 2>&1
LOG=.work/score2/r3-evening.log
PY="$REPO/.work/tools-eval/tools-tests/audio-venv/bin/python"
QPY="$REPO/.work/qa-venv/bin/python"
T=tools/audio/score2
C=.work/score2/cuesheet
M=.work/score2/master
P=.work/score2/preview
NC="NUMBA_CACHE_DIR=$REPO/.work/score2/numba-cache"
MAX_WAIT_S=${MAX_WAIT_S:-21600}
BUN="$(command -v bun || echo "$HOME/.bun/bin/bun")"
mkdir -p "$(dirname "$LOG")"

say() { echo "=== $(date '+%H:%M:%S') $*" | tee -a "$LOG"; }

heavy() { # <label> <command...>: one heavy job; waits out a hold or a refusal (73) and retries; other exits are final
  local label="$1"; shift
  local waited=0 rc
  while :; do
    while [ -f .work/HOLD ] && [ "$waited" -lt "$MAX_WAIT_S" ]; do sleep 60; waited=$((waited + 60)); done
    if [ -f .work/HOLD ]; then say "$label: still on hold after ${waited}s"; return 75; fi
    scripts/heavy.sh "$label" /usr/sbin/taskpolicy -c utility "$@" >>"$LOG" 2>&1
    rc=$?
    if [ "$rc" -ne 73 ]; then return "$rc"; fi
    if [ "$waited" -ge "$MAX_WAIT_S" ]; then say "$label: refused and out of time"; return 73; fi
    sleep 120; waited=$((waited + 120))
  done
}

light() { /usr/sbin/taskpolicy -c utility "$@" >>"$LOG" 2>&1; }

run() { # <step>
  local st="$1" rc=0
  say "step $st"
  case "$st" in
  archive)
    local A="$M/archive-2026-10-28-r2fix"
    if [ -d "$A" ]; then say "archive: $A exists, skipped"; return 0; fi
    mkdir -p "$A/preview" || return 1
    for f in "$M"/main.build.json "$M"/x40.build.json "$M"/main.preview.json "$M"/x40.preview.json "$M"/main.arc.json \
             "$M"/x40.arc.json "$M"/layers_main.json "$M"/layers_x40.json "$M"/*.png; do
      [ -e "$f" ] && mv "$f" "$A/"
    done
    # the title probes stay (copied): the README quotes them as R-07's evidence, and the title's audio is unchanged
    for f in "$M"/title_probe*.json; do [ -e "$f" ] && cp -p "$f" "$A/"; done
    for f in "$P"/Pebble-2.0-score-preview.mp4 "$P"/Pebble-2.0-40s-score-preview.mp4 "$P"/README.txt; do
      [ -e "$f" ] && mv "$f" "$A/preview/"
    done
    [ -e .work/score2/SCORE_PROVENANCE.json ] && cp -p .work/score2/SCORE_PROVENANCE.json "$A/"
    printf '%s\n' "The fix revision's score build (28 Oct 09:45-10:00, commits f8d8162 and 30c2834: CUE_SHEET.md revision 2's" \
      "plan with the master revision), moved here by revision 3's evening chain (tools/audio/score2/evening_r3.sh) before" \
      "it rebuilt the masters. Its previews are the ones the person had on the Desktop at 10:57; revision 3 supersedes" \
      "them. The working WAVs and npz curves were rebuilt in place; every number of that build is in the JSON here." >"$A/WHY.txt"
    ;;
  timing) light "$BUN" "$T/coda_timing.ts" "$C/plan_main.json" "$M/coda_timing.json" || rc=$? ;;
  layers) light python3 -I -B "$T/score_layers.py" .work/score2 || rc=$? ;;
  measure) heavy score2r3-measure env "$NC" "$PY" -I -B "$T/revise_measure.py" plan "$C/plan_main.json" "$C/r3/main" \
             "$M/layers_main.json" || rc=$? ;;
  confirm) light python3 -I -B "$T/revise3_bars.py" confirm || rc=$? ;;
  sheet|sheet2)
    light python3 -I -B "$T/revise3_spec.py" && light python3 -I -B "$T/cue_sheet.py" && light python3 -I -B "$T/revise3_md.py" \
      || rc=$? ;;
  build)
    heavy score2r3-build-main env "$NC" "$PY" -I -B "$T/score_build.py" "$C/plan_main.json" "$M/layers_main.json" "$M" main \
      && heavy score2r3-build-x40 env "$NC" "$PY" -I -B "$T/score_build.py" "$C/plan_x40.json" "$M/layers_x40.json" "$M" x40 \
      || rc=$? ;;
  coda) # not blocking: a failed coda check is reported at the end (exit 1), after every artifact is built for review
    heavy score2r3-coda env "$NC" "$PY" -I -B "$T/score_coda.py" check "$M" || { say "coda checks FAILED: see $M/main.coda.json"; CODA_FAILED=1; } ;;
  arc) heavy score2r3-arc bash -c "set -e; /usr/bin/python3 -I -B $T/score_arc.py $M/main.web.wav $C/plan_main.json $M/main.arc.json; /usr/bin/python3 -I -B $T/score_arc.py $M/x40.web.wav $C/plan_x40.json $M/x40.arc.json" || rc=$? ;;
  strips) heavy score2r3-strips bash -c "set -e; '$QPY' -I -B $T/score_strips.py $C/plan_main.json $M/layers_main.json $M main; '$QPY' -I -B $T/score_strips.py $C/plan_x40.json $M/layers_x40.json $M x40; '$QPY' -I -B $T/cue_strips.py $C/plan_main.json $C/r3/main" || rc=$? ;;
  previews)
    mkdir -p "$P"
    heavy score2r3-preview-main "$QPY" -I -B "$T/score_preview.py" main .work/score2/CUE_SHEET.json "$M/main.build.json" \
        "$M/layers_main.json" "$M/main.social.wav" "$P/Pebble-2.0-score-preview.mp4" "$M/main.preview.json" \
      && heavy score2r3-preview-x40 "$QPY" -I -B "$T/score_preview.py" x40 .work/score2/CUE_SHEET.json "$M/x40.build.json" \
        "$M/layers_x40.json" "$M/x40.social.wav" "$P/Pebble-2.0-40s-score-preview.mp4" "$M/x40.preview.json" \
      || rc=$? ;;
  readme) light python3 -I -B "$T/score_readme.py" .work/score2 "$P/README.txt" || rc=$? ;;
  provenance) light python3 -I -B "$T/score_provenance.py" .work/score2 || rc=$? ;;
  *) say "unknown step $st"; return 2 ;;
  esac
  if [ "$rc" -ne 0 ]; then say "step $st FAILED (exit $rc): the chain stops; see $LOG"; return "$rc"; fi
  say "step $st done"
}

STEPS="${*:-archive timing layers measure confirm sheet build coda arc strips sheet2 previews readme provenance}"
CODA_FAILED=0
say "revision 3 evening chain: $STEPS (head $(/usr/bin/git rev-parse --short HEAD 2>/dev/null))"
python3 -I -c "import json,sys; p=json.load(open('$C/plan_main.json')); sys.exit(0 if p.get('revision',{}).get('n')==3 else 1)" \
  || { say "cuesheet/plan_main.json is not revision 3: run tools/audio/score2/revise3_plan.py plans"; exit 2; }
for st in $STEPS; do
  run "$st" || exit $?
done
say "done: $STEPS"
python3 -I - "$REPO" <<'PYEOF' | tee -a "$LOG"
import json, os, sys
R = sys.argv[1]
S = os.path.join(R, ".work", "score2")
def opt(p):
    p = os.path.join(S, p)
    return json.load(open(p)) if os.path.exists(p) else None
cf, cs, cd, bm, bx = (opt(p) for p in ("cuesheet/r3/confirm.json", "CUE_SHEET.json", "master/main.coda.json",
                                       "master/main.build.json", "master/x40.build.json"))
print("summary:")
if cf: print("  the rule's confirmation (J2, J3):", "PASS" if cf["pass"] else "FAIL")
if cs:
    ck = cs["checks"]
    print(f"  cue sheet checks: {sum(1 for c in ck if c['ok'] is True)} pass, {sum(1 for c in ck if c['ok'] is None)} pending, "
          f"{sum(1 for c in ck if c['ok'] is False)} fail, {sum(1 for c in ck if c.get('warn'))} warn")
    for c in ck:
        if c["ok"] is False: print("    FAIL", c["check"], "::", c["detail"][:200])
if cd: print("  the coda on the masters:", "PASS" if cd["ok"] else "FAIL " + ", ".join(k for k, v in cd["checks"].items() if not v["ok"]))
for nm, b in (("main", bm), ("x40", bx)):
    if b:
        for k, m in b["masters"].items():
            a = m["aac"]
            print(f"  {nm} {k}: {m['integrated_lufs']} LUFS, TP {m['true_peak_dbtp']} dBTP; AAC FFmpeg {a['native_default']['true_peak_dbtp']} / "
                  f"Apple {a['apple_audiotoolbox_cbr']['true_peak_dbtp']} dBTP; length {b['film_length_s']} s")
PYEOF
if [ "$CODA_FAILED" -ne 0 ]; then say "the coda's checks failed: the lead decides before the previews go anywhere"; exit 1; fi
echo "Look at: $M/main-overview.png, main-seams.png, main-hits.png, x40-overview.png; $C/r3/main-overview.png; $M/main.coda.json;"
echo "         the previews in $P (the main one runs on through the coda); CUE_SHEET.md §9 and §12."
