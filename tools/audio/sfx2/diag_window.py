"""Find which events make one classifier window read a label: render the 3 s window that starts at T0 from every
subset of the named events (as a reel spec places them, with the reel's final gain) and tag each subset.

Found this way on the kit's first reel: a whoosh that read 'whoosh' at full scale read 'air_horn' 0.55 at its film
level, and a plunk over room tone read 'toilet_flush' 0.67. The classifier hears level and context.

Run through scripts/heavy.sh (it tags 2^n - 1 renders; keep n at 4 or fewer):
  scripts/heavy.sh sfx2-diag /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I \
      tools/audio/sfx2/diag_window.py --work .work/sfx2 --reel .work/sfx2/audition/reel --t0 4.5 ID1 ID2 bed
'bed' stands for the spec's bed.
"""
import argparse
import itertools
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
    ap.add_argument("--reel", required=True, help="the reel's path without extension (its .cues.json gives the spec)")
    ap.add_argument("--t0", type=float, required=True)
    ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
    ap.add_argument("ids", nargs="+")
    a = ap.parse_args()
    if len(a.ids) > 5:
        raise SystemExit("at most 5 events (31 renders)")
    kit = {f["id"]: f for f in json.load(open(os.path.join(a.work, "KIT.json"), encoding="utf-8"))["files"]}
    cues = json.load(open(a.reel + ".cues.json", encoding="utf-8"))
    spec = json.load(open(os.path.join(repo, cues["spec"]), encoding="utf-8"))
    gain_all = 10 ** (cues["gain_db"] / 20)
    L = int(3.0 * al.SR)
    tmp = os.path.join(a.work, "tmp")
    os.makedirs(tmp, exist_ok=True)

    def render(sel):
        mix = np.zeros((L, 2))
        for ev in spec["events"]:
            if ev["id"] not in sel:
                continue
            y, _ = al.load(os.path.join(a.work, kit[ev["id"]]["file"]))
            y = al.as_stereo(y) * 10 ** (ev["gain_db"] / 20)
            if ev.get("dur_s"):
                y = y[:int(ev["dur_s"] * al.SR)]
            off = {"peak": int(round(kit[ev["id"]]["measure"]["peak_time_s"] * al.SR)),
                   "end": y.shape[0]}.get(ev.get("align", "start"), 0)
            i = int(round(ev["t"] * al.SR)) - off - int(a.t0 * al.SR)
            j0, j1 = max(0, i), min(L, i + y.shape[0])
            if j1 > j0:
                mix[j0:j1] += y[j0 - i:j1 - i]
        if "bed" in sel and spec.get("bed"):
            b = spec["bed"]
            y, _ = al.load(os.path.join(a.work, kit[b["id"]]["file"]))
            y = al.as_stereo(y) * 10 ** (b["gain_db"] / 20)
            s = int(a.t0 * al.SR) % y.shape[0]
            mix += np.vstack([y, y])[s:s + L][:L]
        return (mix * gain_all).astype(np.float32)

    for r in range(1, len(a.ids) + 1):
        for sel in itertools.combinations(a.ids, r):
            tl = al.timeline(render(set(sel)), a.sound_tags, tmp)
            labs = tl[0]["labels"] if tl else {}
            top = sorted(labs.items(), key=lambda kv: -kv[1])[:5]
            print(f"{'+'.join(sel):60} {[(k, round(v, 2)) for k, v in top]}", flush=True)
    if not os.listdir(tmp):
        os.rmdir(tmp)


if __name__ == "__main__":
    main()
