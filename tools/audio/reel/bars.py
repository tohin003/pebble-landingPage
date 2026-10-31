"""reel music lane: print a measured track's bars (start, loudness, peak momentary, percussive share, onsets per beat,
low/sub/air shares, centroid, loudness step) over a range of bars. JSON only.
  python3 -I tools/audio/reel/bars.py MAP.json FIRST_BAR LAST_BAR"""
import json
import sys

d = json.load(open(sys.argv[1]))
a, b = int(sys.argv[2]), int(sys.argv[3])
st = d["loudness_step_by_bar"]
nov = d["novelty_by_bar"]
for i, x in enumerate(d["bar_table"][a:b + 1], a):
    print(f"bar {i:3d} {x['start']:8.3f}-{x['end']:8.3f} ({x['beats']}b) {x['lufs']:6.1f} mom {x['mom_max']:6.1f} "
          f"perc {x['perc']:.2f} on/b {x['perc_onsets_per_beat']:.1f} low {x['low']:.2f} sub {x['sub']:.2f} "
          f"air {x['air']:.3f} cen {x['centroid']:5.0f} step {st[i]:+5.1f} nov {nov[i] if isinstance(nov[i], (int, float)) else nov[i]}")
