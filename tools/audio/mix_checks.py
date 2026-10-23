"""Gate checks for the film's final soundtrack masters (lane M1; critic H9/H12, OVERRIDES §4, FILM_SPEC §11 and §20).

For one master (--name web|social sets the targets):
  loudness  FFmpeg ebur128 (peak=true, 4x oversampled true peak): integrated loudness, LRA, true peak.
            Gates: web -16 +-0.5 LUFS and <= -1.5 dBTP; social -14 +-0.5 LUFS and <= -1.0 dBTP.
  aac       the same measurement on an AAC 192 kb/s 48 kHz encode (FFmpeg's aac, as the film encodes use). Not a gate:
            it tells the encode lanes how much true-peak headroom survives the codec. The encode is deleted.
  tags      Apple SoundAnalysis through the sound_tags helper (3 s windows, no overlap), on the master AND on a copy
            delayed by 1.5 s, so an effect that straddles a window boundary is heard whole in one of the two passes.
            Gates: no voice-like label (speech, singing, shouting, laughter ...) and no siren/alarm/beep/buzzer label
            reaches 0.3 in any window or enters a window's top 3; every 'telephone'/'ringtone' label stays below 0.3 in
            every window. Other watch labels (bell, horn ...) at 0.3 or more are reported as notes.
  mono      loudness lost when the mix folds down to mono, (L+R)/2 on both channels (gate <= 3 dB), L/R correlation.
  speaker   share of signal power above 150 Hz (H9 small-speaker translation, >= 0.30).
  cues      for every cue in cues.json, placed exactly as mix_master.py places it: the effect's RMS over the ducked bed's
            RMS around the effect's peak, over 30 ms and 300 ms (FILM_SPEC §11 aims hits 3-6 dB over the bed). Not a gate.
  png       spectrograms (FFmpeg showspectrumpic): the full master, plus zooms on the reveal, the proof's hits and the end
            card (web only). Look at them, then delete them: mix_checks.sh re-creates them.
Usage: python -I mix_checks.py MASTER.wav OUT_DIR --name web|social [--bed BED.wav] [--cues cues.json]
       [--sound-tags .work/audio/sound_tags] [--ffmpeg /opt/homebrew/bin/ffmpeg] [--no-png]
Writes OUT_DIR/<name>.checks.json, <name>.tags.json, <name>.tags-shift.json (+ PNGs). Exit 1 when a gate fails.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import resample_poly, welch

TARGETS = {"web": {"lufs": -16.0, "tol": 0.5, "tp_max": -1.5}, "social": {"lufs": -14.0, "tol": 0.5, "tp_max": -1.0}}
# Matched against the label's "_"-separated words by prefix (a plain substring test would read "vibraphone" as "rap").
VOICE = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel", "rap",
         "humming", "whistling", "shout", "yell", "scream", "laugh", "giggl", "snicker", "chuckle", "cry", "sigh",
         "baby", "vocal"]
NOT_VOICE = {"singing_bowl", "bird_vocalization", "whale_vocalization", "train_whistle"}  # instruments, animals, horns
ALARM = ["siren", "alarm", "smoke", "civil", "buzzer", "beep"]
PHONE = ["telephone", "ringtone"]
SHIFT_S = 1.5


def label_kind(lab):
    words = lab.split("_")
    has = lambda stems: any(w.startswith(s) for w in words for s in stems)  # noqa: E731
    if has(PHONE):
        return "phone"
    if lab not in NOT_VOICE and has(VOICE):
        return "voice"
    if has(ALARM):
        return "alarm"
    return "other_watch"
ZOOMS = {"reveal": (14.0, 6.0), "proof-hits": (26.5, 13.0), "endcard": (66.0, 10.8)}

ap = argparse.ArgumentParser()
ap.add_argument("master")
ap.add_argument("out_dir")
ap.add_argument("--name", required=True, choices=sorted(TARGETS))
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", ".."))
ap.add_argument("--bed", default=os.path.join(repo, ".work", "audio", "render", "music_bed.wav"))
ap.add_argument("--cues", default=os.path.join(here, "cues.json"))
ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
ap.add_argument("--ffmpeg", default="/opt/homebrew/bin/ffmpeg")
ap.add_argument("--no-png", action="store_true")
a = ap.parse_args()
T = TARGETS[a.name]
os.makedirs(a.out_dir, exist_ok=True)
res = {"master": os.path.relpath(a.master, repo), "name": a.name, "targets": T}
fails = []
notes = []


def ebur128(path):
    p = subprocess.run([a.ffmpeg, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    summ = p.stderr[p.stderr.rfind("Summary:"):]

    def grab(label):
        m = re.search(label + r":\s+(-?[\d.]+|-inf)", summ)
        return None if not m or m.group(1) == "-inf" else float(m.group(1))

    return {"integrated_lufs": grab("I"), "lra_lu": grab("LRA"), "true_peak_dbtp": grab("Peak")}


# ---- loudness (FFmpeg ebur128) ----
L = ebur128(a.master)
res["loudness"] = L
if L["integrated_lufs"] is None or abs(L["integrated_lufs"] - T["lufs"]) > T["tol"]:
    fails.append(f"integrated {L['integrated_lufs']} LUFS is not {T['lufs']} +-{T['tol']}")
if L["true_peak_dbtp"] is None or L["true_peak_dbtp"] > T["tp_max"]:
    fails.append(f"true peak {L['true_peak_dbtp']} dBTP is above {T['tp_max']}")

with tempfile.TemporaryDirectory(dir=a.out_dir) as tmp:
    # ---- the AAC encode's headroom (informational) ----
    m4a = os.path.join(tmp, "aac.m4a")
    subprocess.run([a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", a.master, "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", m4a], check=True)
    res["aac_192k"] = ebur128(m4a)
    if res["aac_192k"]["true_peak_dbtp"] is not None and res["aac_192k"]["true_peak_dbtp"] > -1.0:
        notes.append(f"the AAC 192k encode peaks at {res['aac_192k']['true_peak_dbtp']} dBTP (over -1.0)")

    # ---- SoundAnalysis on the master and on a 1.5 s delayed copy ----
    shifted = os.path.join(tmp, "shift.wav")
    ms = int(SHIFT_S * 1000)
    subprocess.run([a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", a.master, "-af", f"adelay={ms}|{ms}",
                    "-c:a", "pcm_s24le", shifted], check=True)
    passes = {}
    for key, path, fname in (("master", a.master, f"{a.name}.tags.json"),
                             ("shifted_1_5s", shifted, f"{a.name}.tags-shift.json")):
        out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
        with open(os.path.join(a.out_dir, fname), "w") as f:
            f.write(out)
        passes[key] = json.loads(out)

tag_res = {}
for key, tg in passes.items():
    off = SHIFT_S if key.startswith("shifted") else 0.0
    top3 = {}
    for w in tg["timeline"]:
        for t in w["top"]:
            top3.setdefault(t["label"], []).append(round(w["t"] - off, 1))
    cls = {"voice": [], "alarm": [], "phone": [], "other_watch": []}
    for w in tg["watch"]:
        lab = w["label"]
        kind = label_kind(lab)
        row = {"label": lab, "max": w["max"], "mean": w["mean"], "windows_over_0_3": w["windows_over_0_3"],
               "in_top3_at_s": top3.get(lab, []),
               "windows_over_0_1": [[round(s - off, 1), p] for s, p in tg.get("watch_windows", {}).get(lab, [])]}
        cls[kind].append(row)
        if kind in ("voice", "alarm") and (w["max"] >= 0.3 or lab in top3):
            fails.append(f"{key}: {kind} label '{lab}' max {w['max']}, top 3 at {top3.get(lab, [])} s")
        if kind == "phone" and w["max"] >= 0.3:
            fails.append(f"{key}: '{lab}' reaches {w['max']} (>= 0.3) at {row['windows_over_0_1']}")
        if kind == "other_watch" and w["max"] >= 0.3:
            notes.append(f"{key}: '{lab}' reaches {w['max']} in {w['windows_over_0_3']} window(s)")
    tag_res[key] = {"windows": tg["windows"], "top_tags": tg["tags"][:8],
                    **{k: sorted(v, key=lambda r: -r["max"]) for k, v in cls.items()}}
res["tags"] = tag_res
res["tags"]["phone_max"] = max([r["max"] for p in tag_res.values() if isinstance(p, dict) for r in p.get("phone", [])],
                               default=0.0)

# ---- mono fold-down and small-speaker share ----
y, sr = sf.read(a.master, always_2d=True, dtype="float64")
meter = pyln.Meter(sr)
full = meter.integrated_loudness(y)
m2 = np.stack([y.mean(axis=1)] * 2, axis=1)
res["mono"] = {"lufs_lost_db": round(full - meter.integrated_loudness(m2), 2),
               "lr_correlation": round(float(np.corrcoef(y[:, 0], y[:, 1])[0, 1]), 3)}
if res["mono"]["lufs_lost_db"] > 3.0:
    fails.append(f"mono fold-down loses {res['mono']['lufs_lost_db']} dB (> 3)")
f, pxx = welch(y.mean(axis=1), fs=sr, nperseg=8192)
band = (f >= 20) & (f <= 20000)
res["speaker"] = {"power_share_above_150hz": round(float(pxx[band & (f >= 150)].sum() / pxx[band].sum()), 3)}
if res["speaker"]["power_share_above_150hz"] < 0.30:
    fails.append(f"small-speaker share {res['speaker']['power_share_above_150hz']} (< 0.30)")


# ---- every cue's level over the ducked bed, placed as mix_master.py places it ----
def load(p, SR):
    x, s = sf.read(p, always_2d=True)
    x = x.T.astype(np.float64)
    if x.shape[0] == 1:
        x = np.vstack([x, x])
    if s != SR:
        from math import gcd
        g = gcd(s, SR)
        x = resample_poly(x, SR // g, s // g, axis=1)
    return x


SR = sr
bed = load(a.bed, SR)
cues = json.load(open(a.cues))
base = os.path.dirname(os.path.abspath(a.cues))
duck = np.ones(bed.shape[1])
for c in cues:
    if c.get("duck_db", 0):
        d = 10 ** (-abs(c["duck_db"]) / 20)
        k = int(c["t"] * SR)
        a1, r1 = int(0.04 * SR), int(0.6 * SR)
        env = np.concatenate([np.linspace(1, d, a1), np.linspace(d, 1, r1)])
        k0 = max(0, k - a1)
        duck[k0:k0 + len(env)] = np.minimum(duck[k0:k0 + len(env)], env[: len(duck[k0:k0 + len(env)])])
bed_d = bed * duck


def window(x, start, a0, a1):
    """Samples a0..a1 (timeline) of a signal x placed at timeline sample `start`, zero where it doesn't sound."""
    seg = np.zeros((x.shape[0], a1 - a0))
    k0, k1 = max(a0, start), min(a1, start + x.shape[1])
    if k1 > k0:
        seg[:, k0 - a0:k1 - a0] = x[:, k0 - start:k1 - start]
    return seg


def over_bed_db(s, i, pk, half):
    a0, a1 = max(0, pk - half), min(bed_d.shape[1], pk + half)
    p_sfx = np.mean(window(s, i, a0, a1) ** 2)
    p_bed = np.mean(bed_d[:, a0:a1] ** 2)
    return round(float(10 * np.log10((p_sfx + 1e-20) / (p_bed + 1e-20))), 1)


rows = []
for c in cues:
    s = load(c["file"] if os.path.isabs(c["file"]) else os.path.join(base, c["file"]), SR)
    g = 10 ** (c.get("gain_db", -6) / 20)
    ang = (float(c.get("pan", 0)) + 1) * np.pi / 4
    s = np.vstack([s[0] * np.cos(ang) * np.sqrt(2), s[1] * np.sin(ang) * np.sqrt(2)]) * g
    al = c.get("align", "start")
    mono = np.abs(s).max(0)
    off = int(np.argmax(mono)) if al == "peak" else (int(np.nonzero(mono > mono.max() * 0.1)[0][-1]) if al == "end" else 0)
    i = int(round(c["t"] * SR)) - (off if al in ("peak", "end") else 0)  # where mix_master.py starts the effect
    pk = i + int(np.argmax(mono))                                          # the effect's loudest sample
    rows.append({"frame": c.get("frame"), "role": c.get("role"), "take": c.get("take"), "event": c.get("event"),
                 "gain_db": c.get("gain_db"), "peak_s": round(pk / SR, 4),
                 "over_bed_db_30ms": over_bed_db(s, i, pk, int(0.015 * SR)),
                 "over_bed_db_300ms": over_bed_db(s, i, pk, int(0.15 * SR))})
res["cues"] = rows

# ---- spectrograms ----
pngs = []
if not a.no_png:
    def spec(name, ss=None, dur=None, size="1800x600"):
        out = os.path.join(a.out_dir, f"{a.name}.spec-{name}.png")
        cmd = [a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
        if ss is not None:
            cmd += ["-ss", str(ss), "-t", str(dur)]
        cmd += ["-i", a.master, "-lavfi", f"showspectrumpic=s={size}:legend=1:fscale=log:mode=combined:drange=100",
                "-frames:v", "1", out]
        subprocess.run(cmd, check=True)
        pngs.append(os.path.relpath(out, repo))

    spec("full")
    if a.name == "web":
        for zname, (ss, dur) in ZOOMS.items():
            spec(zname, ss, dur, size="1400x600")
res["png"] = pngs

res["fails"] = fails
res["notes"] = notes
res["pass"] = not fails
with open(os.path.join(a.out_dir, f"{a.name}.checks.json"), "w") as f:
    json.dump(res, f, indent=1, ensure_ascii=False)
summary = {"name": a.name, "pass": not fails, "lufs": L["integrated_lufs"], "lra": L["lra_lu"],
           "tp": L["true_peak_dbtp"], "aac_tp": res["aac_192k"]["true_peak_dbtp"], "mono_loss_db": res["mono"]["lufs_lost_db"],
           "share_150": res["speaker"]["power_share_above_150hz"], "phone_max": res["tags"]["phone_max"],
           "fails": fails, "notes": notes}
print(json.dumps(summary, ensure_ascii=False))
sys.exit(1 if fails else 0)
