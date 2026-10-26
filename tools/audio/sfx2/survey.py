"""Measure every candidate in candidates.json as downloaded (resampled to 48 kHz, no edits) and tag it with Apple's
sound classifier, so the kit's takes are picked from numbers (nobody on this lane can listen).

Run through scripts/heavy.sh (multi-file audio analysis), one job at a time:
  scripts/heavy.sh sfx2-survey /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I \
      tools/audio/sfx2/survey.py --work .work/sfx2
Writes <work>/survey.json.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
ap.add_argument("--candidates", default=os.path.join(here, "candidates.json"))
ap.add_argument("--kenney", default=os.path.join(repo, ".work", "audio", "kenney"))
ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
ap.add_argument("--no-tags", action="store_true")
a = ap.parse_args()

cand = json.load(open(a.candidates, encoding="utf-8"))
prov = json.load(open(os.path.join(a.work, "provenance_mixkit.json"), encoding="utf-8"))["items"]
tmp = os.path.join(a.work, "tmp")
os.makedirs(tmp, exist_ok=True)
rows = []
t0 = time.time()
jobs = [("mixkit", str(it["id"]), os.path.join(a.work, "dl", "mixkit", f"mixkit-{it['id']}.wav"), it["roles"])
        for it in cand["mixkit"]]
jobs += [("kenney", f"{it['pack']}/{it['file']}", os.path.join(a.kenney, it["pack"], "Audio", it["file"]), it["roles"])
         for it in cand["kenney"]]
for provider, key, path, roles in jobs:
    rec = {"provider": provider, "key": key, "roles": roles, "path": os.path.relpath(path, repo)}
    if provider == "mixkit":
        p = prov.get(key, {})
        rec.update({"title": p.get("title"), "status": p.get("status"), "sha256": p.get("sha256")})
    if not os.path.exists(path):
        rec["missing"] = True
        rows.append(rec)
        print(f"missing {key}", flush=True)
        continue
    y, src = al.load(path)
    rec["source_format"] = src
    rec["measure"] = al.measure(y)
    s, e = al.trim_points(y)
    rec["trim_hint"] = {"start_s": round(s / al.SR, 4), "end_s": round(e / al.SR, 4)}
    if not a.no_tags:
        rec["classifier"] = al.classify(y[s:e], a.sound_tags, tmp)
    rows.append(rec)
    m = rec["measure"]
    print(f"{provider:6} {key:34} {m['duration_s']:7.2f}s tp {m['true_peak_dbtp']:6.1f} M {m['lufs_m_max']:6.1f} "
          f"cent {m['centroid_hz']:7.0f} {rec.get('classifier', {}).get('verdict', '-')}", flush=True)
json.dump({"made": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "secs": round(time.time() - t0, 1), "items": rows},
          open(os.path.join(a.work, "survey.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
os.rmdir(tmp) if not os.listdir(tmp) else None
print(f"{len(rows)} candidates in {time.time() - t0:.1f} s -> {os.path.join(a.work, 'survey.json')}")
