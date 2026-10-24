#!/usr/bin/env bash
# tools/qa/lighthouse.sh [run] [runs] [page]: Lighthouse 13.5.0, mobile and desktop, against `next start` (MASTER_PLAN
# §9.2). Serves the last `next build` (tools/qa/shot.mjs builds) on a free port, runs Lighthouse `runs` times per form
# factor (default 3) on `page` (default /) with the installed Chrome (CHROME_PATH from scripts/env.sh; headless), then
# prints each run's scores and the median, against the budgets of MASTER_PLAN §7.7: performance ≥ 95 target / 90 hard,
# LCP ≤ 2.5 s hard, CLS ≤ 0.1 hard, accessibility, best practices and SEO 100. The server always stops at the end.
#
#   cd <repo> && source scripts/env.sh && scripts/heavy.sh qa-lighthouse bash tools/qa/lighthouse.sh f3-r1 3
#   H2=1 ... lighthouse.sh f3-r1-h2 3     # through tools/qa/h2proxy.mjs: HTTP/2 + TLS + Brotli, as Vercel serves it
#   ... lighthouse.sh f3-r1-film 3 /film  # another page
#
# Why H2=1: `next start` speaks HTTP/1.1 with gzip, and Lighthouse's simulated throttling models each parallel
# HTTP/1.1 request as a new connection with a cold TCP window. With two preloaded fonts and the framework's scripts,
# that alone adds about a second to the simulated mobile LCP. Production (Vercel) serves HTTP/2 with Brotli; report
# both.
#
# Output: .work/qa/lighthouse/<run>/{mobile,desktop}-N.report.{json,html}. Chrome's temporary profiles go to .work/tmp.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
RUN="${1:-$(date +%Y-%m-%d-%H-%M-%S)}"
RUNS="${2:-3}"
PAGE="${3:-/}"
OUT="$REPO/.work/qa/lighthouse/$RUN"
mkdir -p "$OUT" "$REPO/.work/tmp/lighthouse" "$REPO/.work/qa/logs"
export TMPDIR="$REPO/.work/tmp/lighthouse"

PORT="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
BASE="http://127.0.0.1:$PORT"
cd "$REPO"
set -m # the server in its own process group, so it can be stopped with its workers
npx next start -p "$PORT" -H 127.0.0.1 >"$REPO/.work/qa/logs/next-start-lighthouse-$RUN.log" 2>&1 &
SERVER=$!
set +m
stop() { kill -TERM -- "-$SERVER" 2>/dev/null || kill -TERM "$SERVER" 2>/dev/null || true; }
trap stop EXIT
for _ in $(seq 1 180); do
  curl -fsS -o /dev/null "$BASE/" 2>/dev/null && break
  sleep 0.5
done
curl -fsS -o /dev/null "$BASE/" # fail here if the server never came up

EXTRA_FLAGS=""
if [ "${H2:-0}" = 1 ]; then
  PPORT="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')"
  node "$HERE/h2proxy.mjs" "$PORT" "$PPORT" >"$REPO/.work/qa/logs/h2proxy-$RUN.log" 2>&1 &
  PROXY=$!
  stop() { kill -TERM "$PROXY" 2>/dev/null || true; kill -TERM -- "-$SERVER" 2>/dev/null || kill -TERM "$SERVER" 2>/dev/null || true; }
  trap stop EXIT
  BASE="https://127.0.0.1:$PPORT"
  for _ in $(seq 1 60); do
    curl -kfsS -o /dev/null "$BASE/" 2>/dev/null && break
    sleep 0.5
  done
  curl -kfsS -o /dev/null --http2 "$BASE/"
  EXTRA_FLAGS=" --ignore-certificate-errors"
fi

FLAGS="--headless=new --no-first-run --no-default-browser-check --disable-extensions --disable-background-networking --disable-sync --mute-audio$EXTRA_FLAGS"
for factor in mobile desktop; do
  for i in $(seq 1 "$RUNS"); do
    extra=()
    [ "$factor" = desktop ] && extra=(--preset=desktop)
    npx -y lighthouse@13.5.0 "$BASE$PAGE" ${extra[@]+"${extra[@]}"} \
      --only-categories=performance,accessibility,best-practices,seo \
      --chrome-flags="$FLAGS" \
      --output=json --output=html --output-path="$OUT/$factor-$i" \
      --quiet || echo "lighthouse $factor run $i failed" >&2
  done
done

node --input-type=module - "$OUT" "$RUNS" "$PAGE" <<'EOF'
import { readFileSync, existsSync } from "node:fs";
const [out, runs, page] = process.argv.slice(2);
console.log(`page ${page}`);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
let bad = 0;
for (const factor of ["mobile", "desktop"]) {
  const rows = [];
  for (let i = 1; i <= Number(runs); i++) {
    const f = `${out}/${factor}-${i}.report.json`;
    if (!existsSync(f)) continue;
    const r = JSON.parse(readFileSync(f, "utf8"));
    const a = r.audits;
    rows.push({
      perf: Math.round(r.categories.performance.score * 100),
      a11y: Math.round(r.categories.accessibility.score * 100),
      bp: Math.round(r.categories["best-practices"].score * 100),
      seo: Math.round(r.categories.seo.score * 100),
      fcp: a["first-contentful-paint"].numericValue,
      lcp: a["largest-contentful-paint"].numericValue,
      tbt: a["total-blocking-time"].numericValue,
      cls: a["cumulative-layout-shift"].numericValue,
      si: a["speed-index"].numericValue,
      bytes: a["total-byte-weight"].numericValue,
    });
  }
  if (!rows.length) { console.log(`${factor}: no report`); bad++; continue; }
  for (const [i, x] of rows.entries())
    console.log(`${factor} #${i + 1}: perf ${x.perf} a11y ${x.a11y} bp ${x.bp} seo ${x.seo} | FCP ${(x.fcp / 1000).toFixed(2)} s LCP ${(x.lcp / 1000).toFixed(2)} s TBT ${Math.round(x.tbt)} ms CLS ${x.cls.toFixed(3)} SI ${(x.si / 1000).toFixed(2)} s | ${(x.bytes / 1024).toFixed(0)} KB`);
  const m = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, median(rows.map((x) => x[k]))]));
  console.log(`${factor} ${page} MEDIAN: perf ${m.perf} a11y ${m.a11y} bp ${m.bp} seo ${m.seo} | LCP ${(m.lcp / 1000).toFixed(2)} s TBT ${Math.round(m.tbt)} ms CLS ${m.cls.toFixed(3)}`);
  const gates = [
    ["performance >= 90 (hard)", m.perf >= 90], ["LCP <= 2.5 s (hard)", m.lcp <= 2500], ["CLS <= 0.1 (hard)", m.cls <= 0.1],
    ["accessibility 100", m.a11y === 100], ["best practices 100", m.bp === 100], ["SEO 100", m.seo === 100],
  ];
  for (const [name, ok] of gates) { console.log(`  ${ok ? "ok  " : "FAIL"} ${factor} ${name}`); if (!ok) bad++; }
  console.log(`  ${m.perf >= 95 ? "ok  " : "warn"} ${factor} performance >= 95 (target)`);
}
process.exit(bad ? 1 : 0);
EOF
