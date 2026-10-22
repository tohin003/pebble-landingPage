"""Print a short summary of one auditioned track: analyze_track.py JSON, sound_tags JSON, rubric_metrics.py JSON.
Usage: python -I audition_summary.py ID.json ID.tags.json ID.metrics.json"""
import json
import sys

a, t, m = (json.load(open(p)) for p in sys.argv[1:4])
g, s, lo = m["grid"], m["structure"], m["loudness"]
print(f"  librosa {a['tempo_bpm']} BPM | scan {g['scan_best_bpm']} | tactus {g['bpm']} BPM (x2 {g['double_time_score']}, x1 {g['grid_score']}, "
      f"x0.5 {g['half_time_score']}), offsets median {g['median_abs_offset_ms']} ms, {g['within_1_frame_pct']}% within "
      f"1 frame, drift {g['drift_s_per_min']} s/min, spread {g['timing_spread_ms']} ms, onsets on {g['onset_coverage']} of beats")
print(f"  nearest integer frames/beat @30: {g['nearest_integer_fpb'][0]}")
print(f"  I {lo['integrated_lufs']} LUFS, LRA {lo['lra_lu']} LU, TP {lo['true_peak_dbtp']} dBTP, PLR {lo['plr_db']} dB | "
      f">150 Hz share {m['speaker']['power_share_above_150hz']} (HPF loss {m['speaker']['lufs_lost_through_150hz_highpass_db']} dB), "
      f"mono loss {m['mono']['lufs_lost_db']} dB (corr {m['mono']['lr_correlation']})")
print(f"  bars {s['n_bars']} x {s['bar_s']} s from {s['first_downbeat_s']} s; biggest lift {s['biggest_lift']}; "
      f"low-band drop {s['low_band_drop']}; last loud bar ends {s['last_loud_bar_end_s']} s, ring-out {s['ringout_s']} s")
print("  tags:", ", ".join(f"{x['label']} {x['score']}" for x in t["tags"][:12]))
bad = ("speech", "singing", "sing", "choir", "vocal", "rapping", "humming", "whistling", "siren", "alarm", "civil_defense",
       "screaming", "shout", "yell", "laughter", "crying")
hits = [(w["t"], x["label"], x["p"]) for w in t["timeline"] for x in w["top"] if any(b in x["label"] for b in bad)]
print("  voice/siren/alarm in any window's top 3:", hits if hits else "none")
