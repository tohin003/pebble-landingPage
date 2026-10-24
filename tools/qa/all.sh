#!/usr/bin/env bash
# tools/qa/all.sh [run] [step ...]: every gate of MASTER_PLAN §9.1–§9.3 on one build, in order.
#
#   cd <repo> && source scripts/env.sh && bash tools/qa/all.sh qa-r2                  # all steps
#   cd <repo> && source scripts/env.sh && bash tools/qa/all.sh qa-r2 a11y interact     # only these (on the last build)
#
# Steps: shot (next build, then 320–1920 px × light/dark × motion on/reduced, viewport tiles), sheets, a11y, interact,
# requests, lh-h2 (Lighthouse on / through h2proxy.mjs, as Vercel serves), lh-h2-film (the same on /film), lh (plain
# next start), lh-film, line, lint (copy lint).
# Each heavy step is its own scripts/heavy.sh job, so another session's job can take the lock in between. The chain
# stops when a CPU hold (.work/HOLD) appears and never bypasses it: rerun it later with the steps that are left.
# Logs: .work/qa/logs/<run>-<step>.out; a one-line result per step goes to .work/qa/logs/<run>-all.out.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
cd "$REPO" || exit 1
RUN="${1:-qa-$(date +%m%d-%H%M)}"
shift || true
STEPS="${*:-shot sheets a11y interact requests lh-h2 lh-h2-film lh lh-film line lint}"
LOGS="$REPO/.work/qa/logs"
mkdir -p "$LOGS"
SUMMARY="$LOGS/$RUN-all.out"

note() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$SUMMARY"; }

heavy() { # <step> <command...>: one heavy job; stop the chain at a hold
  local step="$1" rc
  shift
  if [ -f "$REPO/.work/HOLD" ]; then
    note "$step: not started, CPU hold: $(head -n 1 "$REPO/.work/HOLD")"
    note "stopped; rerun later: bash tools/qa/all.sh $RUN $REMAINING"
    exit 75
  fi
  note "$step: start"
  scripts/heavy.sh "$RUN-$step" "$@" >"$LOGS/$RUN-$step.out" 2>&1
  rc=$?
  note "$step: exit $rc; $(grep -E '^(SUMMARY|.*MEDIAN)' "$LOGS/$RUN-$step.out" | tr '\n' ' ' | cut -c1-400)"
  if [ "$rc" = 73 ] && grep -q 'HOLD' "$LOGS/$RUN-$step.out"; then
    note "stopped at a CPU hold; rerun later: bash tools/qa/all.sh $RUN $REMAINING"
    exit 75
  fi
}

REMAINING="$STEPS"
for step in $STEPS; do
  case "$step" in
  shot) heavy shot node tools/qa/shot.mjs --run="$RUN" --widths=320,390,768,1024,1440,1920 --themes=light,dark --motion=on,reduced --lenient ;;
  sheets)
    node tools/qa/sheets.mjs "$RUN" >"$LOGS/$RUN-sheets.out" 2>&1
    note "sheets: exit $?; $(tail -n 1 "$LOGS/$RUN-sheets.out")"
    ;;
  a11y) heavy a11y node tools/qa/a11y.mjs --run="$RUN-a11y" --widths=320,390,1024,1440 --themes=light,dark --motion=on ;;
  interact) heavy interact node tools/qa/interact.mjs --run="$RUN-interact" --widths=390,1440 --themes=light,dark --motion=on,reduced ;;
  requests) heavy requests node tools/qa/requests.mjs --run="$RUN-requests" --widths=390,1440 --themes=light,dark ;;
  lh-h2) heavy lh-h2 env H2=1 bash tools/qa/lighthouse.sh "$RUN-lh-h2" 3 ;;
  lh-h2-film) heavy lh-h2-film env H2=1 bash tools/qa/lighthouse.sh "$RUN-lh-h2-film" 3 /film ;;
  lh) heavy lh bash tools/qa/lighthouse.sh "$RUN-lh" 3 ;;
  lh-film) heavy lh-film bash tools/qa/lighthouse.sh "$RUN-lh-film" 3 /film ;;
  line) heavy line node tools/qa/line-check.mjs --run="$RUN-line" ;;
  lint)
    node tools/qa/copy-lint.mjs --src >"$LOGS/$RUN-lint.out" 2>&1
    note "lint: exit $?; $(tail -n 1 "$LOGS/$RUN-lint.out")"
    ;;
  *) note "unknown step: $step" ;;
  esac
  REMAINING="${REMAINING#"$step"}"
  REMAINING="${REMAINING# }"
done
note "done: $RUN"
