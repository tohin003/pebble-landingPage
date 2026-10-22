"""Score music candidates with the rubric (MASTER_PLAN §6.1 step 3, critic H9) and print/write the table.

Measured criteria are computed here from rubric_metrics.py and sound_tags output; judged ones come from
tools/audio/rubric_judgments.json (every point there carries its reason).
  30 brand fit        judged: mood 10 + instrumentation 10 + register 10
  20 structure        judged from the analysis: intro 5 + lift 6 + ending 5 + breakdown 4
  15 tempo            measured: grid stability 10 (>=95 % of onsets within 1 frame at 30 fps and timing spread <=10 ms: 10;
                      >=90 % and <=20 ms: 8; >=80 %: 5; >=65 %: 2; else 0) + whole frames per beat 5 (stretch needed
                      <=0.1 %: 5, <=1 %: 4, <=2 %: 3, more: 0; only counted when the grid is stable, i.e. stability >= 5)
  15 no voice/alarm   measured (SoundAnalysis watch list): 15, minus 6 for a voice label at >=0.3 (3 at >=0.2), minus 8 for
                      an alert label (siren, alarm, ringtone, telephone, buzzer, beep, smoke detector) at >=0.3 in 3+
                      windows (4 in 1-2 windows, 2 for a max >=0.2), minus 4 for a horn-like warning (foghorn, train/car/air
                      horn) in 3+ windows (2 in 1-2, 1 for a max >=0.2). Instruments (singing bowl, vibraphone) never count.
  10 dynamics         measured: LRA 4-10 LU: 6 (2 less per LU outside); PLR >=10 dB: 4, 8-10 dB: 2
  10 distinctiveness  judged
Gates (critic H9): power share above 150 Hz >= 0.30 (small speakers; R5: avoid beds whose energy sits below 150 Hz)
and mono fold-down loss <= 3 dB. A track that fails a gate cannot be chosen. Pass mark 70/100.
Usage: python -I score_rubric.py JUDGMENTS.json OUT.json ID=METRICS.json,TAGS.json [ID=...]
"""
import json
import sys

VOICE = {"speech", "singing", "rapping", "choir", "humming", "whistling", "chant", "yodel", "shout", "yell", "screaming",
         "laughter", "crying_sobbing", "baby_crying", "narration_monologue", "conversation", "whispering", "child_speech",
         "male_speech", "female_speech", "male_singing", "female_singing", "child_singing", "synthetic_singing", "talk"}
ALERT_WORDS = ("siren", "alarm", "ringtone", "telephone", "buzzer", "beep", "smoke_detector", "civil_defense")
HORN = {"foghorn", "train_horn", "car_horn", "air_horn", "vehicle_horn", "truck_horn"}
INSTRUMENTS = {"singing_bowl", "vibraphone"}

judg = json.load(open(sys.argv[1]))
out_path = sys.argv[2]
rows = []
for arg in sys.argv[3:]:
    tid, files = arg.split("=", 1)
    mf, tf = files.split(",")
    m, t = json.load(open(mf)), json.load(open(tf))
    j = judg["tracks"][tid]
    g, lo, sp, mo = m["grid"], m["loudness"], m["speaker"], m["mono"]
    # tempo
    w1, spread = g["within_1_frame_pct"] or 0, g["timing_spread_ms"] or 99
    stab = 10 if (w1 >= 95 and spread <= 10) else 8 if (w1 >= 90 and spread <= 20) else 5 if w1 >= 80 else 2 if w1 >= 65 else 0
    st = abs(g["nearest_integer_fpb"][0]["stretch_pct"])
    fpb = (5 if st <= 0.1 else 4 if st <= 1 else 3 if st <= 2 else 0) if stab >= 5 else 0
    # voice / alerts
    watch = [x for x in t.get("watch", []) if x["label"] not in INSTRUMENTS]
    vmax = max([x["max"] for x in watch if x["label"] in VOICE] or [0])
    alerts = [x for x in watch if any(a in x["label"] for a in ALERT_WORDS)]
    horns = [x for x in watch if x["label"] in HORN]
    def pen(lst, big, mid, small):
        p = 0
        for x in lst:
            p = max(p, big if x["windows_over_0_3"] >= 3 else mid if x["windows_over_0_3"] >= 1 else small if x["max"] >= 0.2 else 0)
        return p
    vpen = 6 if vmax >= 0.3 else 3 if vmax >= 0.2 else 0
    apen, hpen = pen(alerts, 8, 4, 2), pen(horns, 4, 2, 1)
    voice_score = max(0, 15 - vpen - apen - hpen)
    flagged = [f"{x['label']} max {x['max']} ({x['windows_over_0_3']} windows >= 0.3)" for x in watch
               if (x["label"] in VOICE or x in alerts or x in horns) and x["max"] >= 0.2]
    # dynamics
    lra = lo["lra_lu"]
    lra_pts = 6 if 4 <= lra <= 10 else max(0, round(6 - 2 * (4 - lra if lra < 4 else lra - 10)))
    plr = lo["plr_db"]
    plr_pts = 4 if plr >= 10 else 2 if plr >= 8 else 0
    brand = {k: v for k, v in j["brand_fit"].items()}
    struct = {k: v for k, v in j["structure"].items()}
    scores = {
        "brand_fit": sum(v[0] for v in brand.values()),
        "structure": sum(v[0] for v in struct.values()),
        "tempo": stab + fpb,
        "no_voice_or_alarm": voice_score,
        "dynamics": lra_pts + plr_pts,
        "distinctiveness": j["distinctiveness"][0],
    }
    gates = {"small_speaker_share_ge_0.30": sp["power_share_above_150hz"] >= 0.30, "mono_loss_le_3db": mo["lufs_lost_db"] <= 3.0}
    rows.append({
        "id": tid, "total": sum(scores.values()), "scores": scores, "gates": gates, "eligible": all(gates.values()),
        "judged": {"brand_fit": brand, "structure": struct, "distinctiveness": j["distinctiveness"]},
        "measured": {"tempo_bpm": g["bpm"], "onsets_within_1_frame_pct": w1, "timing_spread_ms": spread,
                     "stretch_to_whole_frames_per_beat_pct": g["nearest_integer_fpb"][0]["stretch_pct"],
                     "frames_per_beat_at_30fps": g["nearest_integer_fpb"][0]["frames_per_beat"],
                     "tempo_points": f"stability {stab} + frames per beat {fpb}",
                     "integrated_lufs": lo["integrated_lufs"], "lra_lu": lra, "true_peak_dbtp": lo["true_peak_dbtp"], "plr_db": plr,
                     "power_share_above_150hz": sp["power_share_above_150hz"],
                     "lufs_lost_through_150hz_highpass_db": sp["lufs_lost_through_150hz_highpass_db"],
                     "mono_fold_down_loss_db": mo["lufs_lost_db"],
                     "voice_alarm_flags": flagged or ["none"],
                     "top_sound_tags": [f"{x['label']} {x['score']}" for x in t["tags"][:8]]},
    })
rows.sort(key=lambda r: -r["total"])
composed = lambda r: r["id"].startswith("original")   # our own scores ("original", "original-sampled") are not stock
eligible = [r for r in rows if r["eligible"] and not composed(r)]
stock = [r for r in rows if not composed(r)]
best = stock[0] if stock else None
res = {"pass_mark": 70, "weights": {"brand_fit": 30, "structure": 20, "tempo": 15, "no_voice_or_alarm": 15, "dynamics": 10, "distinctiveness": 10},
       "rows": rows,
       "top_stock": best["id"] if best else None, "top_stock_total": best["total"] if best else None,
       "best_eligible_stock": eligible[0]["id"] if eligible else None,
       "stock_passes": bool(eligible and eligible[0]["total"] >= 70)}
json.dump(res, open(out_path, "w"), indent=1)
print(f"{'id':>9} {'total':>5}  brand struct tempo voice dyn dist  gates")
for r in rows:
    s = r["scores"]
    print(f"{r['id']:>9} {r['total']:>5}  {s['brand_fit']:>5} {s['structure']:>6} {s['tempo']:>5} {s['no_voice_or_alarm']:>5} {s['dynamics']:>3} {s['distinctiveness']:>4}  "
          f"{'ok' if r['eligible'] else 'FAIL ' + ','.join(k for k, v in r['gates'].items() if not v)}")
print("stock track passes the gate:", res["stock_passes"], "| top stock:", res["top_stock"], res["top_stock_total"])
