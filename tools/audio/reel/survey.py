"""reel music lane: print a candidate track's measured map (from score2/measure_track.py) as a music editor's survey:
tempo, key, sections with loudness, percussion and brightness, and the biggest bar-to-bar loudness steps (drops).
Reads JSON only; no audio.  python3 -I tools/audio/reel/survey.py MAP.json [MAP.json ...]"""
import json
import sys


def survey(path):
    d = json.load(open(path))
    t, k, L = d["tempo"], d["key"], d["loudness"]
    print(f"== {d['name']}  {d['duration_s']:.1f} s  {t['bpm']:.2f} bpm ({t['grid_mode']})  key {k['key']} "
          f"({k['camelot']}, 2nd {k['second']}, margin {k['margin']})  I {L['integrated_lufs']} LUFS  "
          f"LRA {L['lra_lu']}  first downbeat {d['downbeats']['first_downbeat_s']}  bar {d['bar_s_median']} s")
    for s in d["sections"]:
        print(f"   {s['start_s']:7.2f}-{s['end_s']:7.2f}  bars {s['bar_start']:3d}-{s['bar_end']:3d}  "
              f"{s['lufs']:6.1f} LUFS  step {s['step_in_lu'] if s['step_in_lu'] is not None else '':>5}  "
              f"perc {s['perc']:.2f}  onsets/beat {s['perc_onsets_per_beat']:.1f}  centroid {s['centroid']:5.0f}  "
              f"sub {s['sub']:.2f}  {s['label_rule']:<8} {s['key']}")
    bars = d["bar_table"]
    steps = sorted(((st, i) for i, st in enumerate(d["loudness_step_by_bar"][:len(bars)])), reverse=True)[:6]
    print("   biggest steps up:", ", ".join(f"bar {i} @ {bars[i]['start']:.2f} s +{st:.1f} LU" for st, i in steps))
    print("   ending:", d["ending"]["type"])


if __name__ == "__main__":
    for p in sys.argv[1:]:
        survey(p)
