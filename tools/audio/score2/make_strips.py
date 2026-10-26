"""score2 lane: draw the strips for MUSIC_MAP (overviews with cue windows, and sheets at the key windows and transitions).
Run with the qa venv (Pillow): .work/qa-venv/bin/python -I tools/audio/score2/make_strips.py WORK_DIR [NAME ...]"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import strips  # noqa: E402

W = sys.argv[1]
MM = json.load(open(f"{W}/MUSIC_MAP.json"))
COL = {"intimate_open": (120, 160, 255), "tension_build": (255, 200, 80), "drop_entrance": (255, 90, 60),
       "ring_groove": (90, 220, 120), "the_wall": (200, 120, 255), "quiet_dusk": (80, 120, 200),
       "climax_peak": (255, 60, 160), "convergence": (240, 240, 240), "title": (255, 230, 0), "end_decay": (160, 160, 160)}
SHORT = {"intimate_open": "open", "tension_build": "build", "drop_entrance": "drop", "ring_groove": "groove", "the_wall": "wall",
         "quiet_dusk": "dusk", "climax_peak": "climax", "convergence": "converge", "title": "title", "end_decay": "end"}
names = sys.argv[2:] or list(MM["tracks"])
os.makedirs(f"{W}/strips", exist_ok=True)
for n in names:
    tr = MM["tracks"][n]
    spans, marks = [], []
    for si, (sc, ws) in enumerate((k, v) for k, v in tr["cue_windows"].items() if k != "none"):
        for w in ws[:2]:
            spans.append((w["start_s"], w["end_s"], COL[sc], si, SHORT[sc]))
    for p in tr["transition_points"]:
        if any(k in p["kinds"] for k in ("entrance", "drop-out", "final hit", "stop before it")):
            marks.append((p["t"], ",".join(k_.split(" ")[0] for k_ in p["kinds"])))
    ov = strips.overview(n, marks=marks, spans=spans)
    ov.save(f"{W}/strips/{tr['label']}-{n}-overview.png")
    # key windows: one sheet per track with up to four zooms
    wins = []
    def add(sc, title, pre=4.0, post=4.0, key=None):
        ws = tr["cue_windows"].get(sc, [])
        if ws:
            w = ws[0]
            a, b = w["start_s"], w["end_s"]
            if b - a > 24:  # long windows: show the start
                b = a + 20
            mk = [(w[key], sc)] if key and w.get(key) is not None else []
            wins.append(dict(name=n, t0=max(0, a - pre), t1=b + post, title=f"{tr['label']} {n}: {title} {w['start_s']:.2f}-{w['end_s']:.2f} s ({w['lufs']} LUFS, score {w['score']})",
                             marks=mk, spans=[(w["start_s"], w["end_s"], COL[sc], 0, SHORT[sc])]))
    add("drop_entrance", "the Drop's entrance", key="entrance_s")
    add("quiet_dusk", "quiet dusk")
    add("climax_peak", "climax peak", key="landing_s")
    add("end_decay", "end card's decay", key="final_hit_s")
    if not wins:
        add("ring_groove", "ring groove")
    imgs = [strips.window(w["name"], w["t0"], w["t1"], w["title"], marks=w["marks"], spans=w["spans"]) for w in wins]
    if imgs:
        strips.stack(imgs[:2]).save(f"{W}/strips/{tr['label']}-{n}-windows-1.png")
        if len(imgs) > 2:
            strips.stack(imgs[2:]).save(f"{W}/strips/{tr['label']}-{n}-windows-2.png")
    print("ok", n)
