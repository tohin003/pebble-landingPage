"""Gate checks for the film's final soundtrack masters (lane M1; critic H9/H12, OVERRIDES §4, FILM_SPEC §11 and §20).

For one master (--name web|social sets the targets):
  loudness  FFmpeg ebur128 (peak=true, 4x oversampled true peak): integrated loudness, LRA, true peak.
            Gates: web -16 +-0.5 LUFS and <= -1.5 dBTP; social -14 +-0.5 LUFS and <= -1.0 dBTP.
  aac       the same measurement on an AAC 192 kb/s 48 kHz encode (FFmpeg's aac). Not a gate: it tells the encode
            lanes how much true-peak headroom survives the codec. The encode is deleted.
  tags      Apple SoundAnalysis through the sound_tags helper (3 s windows, no overlap).
            Gate (the helper's own windows): no voice-like label (speech, singing, shouting, laughter ...) and no
            siren/alarm/beep/buzzer label reaches 0.3 in any window or enters a window's top 3; every 'telephone' and
            'ringtone' label stays below 0.3 in every window.
            Boundary pass: the same labels on a copy delayed by 1.5 s, so an effect that straddles a window boundary is
            heard whole. To tell the effects from the music, the bed alone, level-matched to the master, is tagged the
            same way: a reading of 0.3 or more fails only where the bed alone stays below 0.3 (the effects push it
            over); where the bed alone is already there, it is a warning for the music, with both numbers.
            Opening pass (lane M2): the film's first 0.75 s and first 1.5 s heard after silence (a 3 s clip, silence
            first), master and bed alone. A feed starts the film from silence, so a phone label of 0.3 or more fails
            here whatever its source, and so does a voice or alarm label at 0.3 or in the top 3.
            Every phone reading from 0.25 (lane M2's target) up to the gate is a warning, in every pass.
            Other watch labels (bell, horn, whistle ...) at 0.3 or more are notes; instruments (vibraphone ...) are not.
  mono      loudness lost when the mix folds down to mono, (L+R)/2 on both channels (gate <= 3 dB), L/R correlation.
  speaker   share of signal power above 150 Hz (H9 small-speaker translation, >= 0.30).
  cues      for every cue in cues.json, placed exactly as mix_master.py places it, around the effect's peak (30 ms for
            clicks, pops, ticks and thuds; 200 ms for the rest), both K-weighted (BS.1770): the effect's level over the
            ducked bed's; its margin in its own loudest third-octave band (its body); and its best margin among the
            bands where it has energy (within 20 dB of its loudest), which is where it can be heard. FILM_SPEC §11 aims
            hits 3-6 dB over the bed. Not a gate: read it with the spectrograms.
  png       spectrograms (FFmpeg showspectrumpic): the full master, plus zooms on the reveal, the proof's hits and the end
            card (web only). Look at them, then delete them: mix_checks.sh re-creates them.
Usage: python -I mix_checks.py MASTER.wav OUT_DIR --name web|social [--bed BED.wav] [--cues cues.json]
       [--sound-tags .work/audio/sound_tags] [--ffmpeg /opt/homebrew/bin/ffmpeg] [--no-png]
Writes OUT_DIR/<name>.checks.json and the raw tag JSONs <name>.{tags,tags-shift,tags-open0.75,tags-open1.5}.json and
<name>.bed-*.json, the same for the bed alone (+ PNGs). Exit 1 when a gate fails.
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
from scipy.signal import lfilter, resample_poly, welch

TARGETS = {"web": {"lufs": -16.0, "tol": 0.5, "tp_max": -1.5}, "social": {"lufs": -14.0, "tol": 0.5, "tp_max": -1.0}}
# Matched against the label's "_"-separated words by prefix (a plain substring test would read "vibraphone" as "rap").
VOICE = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel", "rap",
         "humming", "whistling", "shout", "yell", "scream", "laugh", "giggl", "snicker", "chuckle", "cry", "sigh",
         "baby", "vocal"]
NOT_VOICE = {"singing_bowl", "bird_vocalization", "whale_vocalization", "train_whistle"}  # instruments, animals, horns
ALARM = ["siren", "alarm", "smoke", "civil", "buzzer", "beep"]
PHONE = ["telephone", "ringtone"]
INSTRUMENTS = {"vibraphone", "singing_bowl", "french_horn", "cowbell"}  # in the helper's watch list by substring only
LIMIT = 0.3
PHONE_TARGET = 0.25  # lane M2: phone readings at or above this (and under LIMIT) are warnings
SHIFT_S = 1.5
OPENING_XS = (0.75, 1.5)  # s of the film's start heard after silence
ZOOMS = {"reveal": (14.0, 6.0), "proof-hits": (26.5, 13.0), "endcard": (66.0, 10.8)}


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
fails, warnings, notes = [], [], []


def ff(*args):
    subprocess.run([a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def ebur128(path):
    p = subprocess.run([a.ffmpeg, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    summ = p.stderr[p.stderr.rfind("Summary:"):]

    def grab(label):
        m = re.search(label + r":\s+(-?[\d.]+|-inf)", summ)
        return None if not m or m.group(1) == "-inf" else float(m.group(1))

    return {"integrated_lufs": grab("I"), "lra_lu": grab("LRA"), "true_peak_dbtp": grab("Peak")}


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


# ---- loudness (FFmpeg ebur128) ----
L = ebur128(a.master)
res["loudness"] = L
if L["integrated_lufs"] is None or abs(L["integrated_lufs"] - T["lufs"]) > T["tol"]:
    fails.append(f"integrated {L['integrated_lufs']} LUFS is not {T['lufs']} +-{T['tol']}")
if L["true_peak_dbtp"] is None or L["true_peak_dbtp"] > T["tp_max"]:
    fails.append(f"true peak {L['true_peak_dbtp']} dBTP is above {T['tp_max']}")

y, SR = sf.read(a.master, always_2d=True, dtype="float64")
meter = pyln.Meter(SR)
full = meter.integrated_loudness(y)
bed = load(a.bed, SR)
bed_gain_db = round(float(full - meter.integrated_loudness(bed.T)), 2)  # the bed alone at the master's loudness
res["bed_gain_db"] = bed_gain_db

with tempfile.TemporaryDirectory(dir=a.out_dir) as tmp:
    # ---- the AAC encode's headroom (informational) ----
    m4a = os.path.join(tmp, "aac.m4a")
    ff("-i", a.master, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", m4a)
    res["aac_192k"] = ebur128(m4a)
    if res["aac_192k"]["true_peak_dbtp"] is not None and res["aac_192k"]["true_peak_dbtp"] > -1.0:
        notes.append(f"the AAC 192k encode peaks at {res['aac_192k']['true_peak_dbtp']} dBTP (over -1.0)")

    # ---- SoundAnalysis: master and level-matched bed, on the helper's windows and shifted by 1.5 s ----
    ms = int(SHIFT_S * 1000)
    files = {("master", "main"): a.master}
    files[("master", "shift")] = os.path.join(tmp, "master-shift.wav")
    ff("-i", a.master, "-af", f"adelay={ms}|{ms}", "-c:a", "pcm_s24le", files[("master", "shift")])
    files[("bed", "main")] = os.path.join(tmp, "bed.wav")
    ff("-i", a.bed, "-af", f"volume={bed_gain_db}dB", "-c:a", "pcm_f32le", files[("bed", "main")])
    files[("bed", "shift")] = os.path.join(tmp, "bed-shift.wav")
    ff("-i", a.bed, "-af", f"volume={bed_gain_db}dB,adelay={ms}|{ms}", "-c:a", "pcm_f32le", files[("bed", "shift")])
    tags = {}
    for (src, view), path in files.items():
        out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
        fname = f"{a.name}.{'bed-' if src == 'bed' else ''}tags{'-shift' if view == 'shift' else ''}.json"
        with open(os.path.join(a.out_dir, fname), "w") as f:
            f.write(out)
        tags[(src, view)] = json.loads(out)

    # ---- the opening heard after silence (lane M2): (3 - X) s of silence, then the film's first X s ----
    n3 = int(round(3.0 * SR))
    for x in OPENING_XS:
        k = int(round(x * SR))
        for src, sig in (("master", y.T), ("bed", bed * 10 ** (bed_gain_db / 20))):
            clip = np.zeros((2, n3))
            clip[:, n3 - k:] = sig[:, :k]
            path = os.path.join(tmp, f"open-{src}.wav")
            sf.write(path, clip.T.astype(np.float32), SR, subtype="FLOAT")
            out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
            with open(os.path.join(a.out_dir, f"{a.name}.{'bed-' if src == 'bed' else ''}tags-open{x}.json"), "w") as f:
                f.write(out)
            tags[(src, f"open{x}")] = json.loads(out)


def readings(tg, lab):
    """{window start s: confidence} where the label reached 0.1 (the helper records watch labels from 0.1)."""
    return {s: p for s, p in tg.get("watch_windows", {}).get(lab, [])}


def top3(tg):
    return {w["t"]: [t["label"] for t in w["top"]] for w in tg["timeline"]}


tag_res = {}
for view in ("main", "shift"):
    tg, bg = tags[("master", view)], tags[("bed", view)]
    off = SHIFT_S if view == "shift" else 0.0
    t3m, t3b = top3(tg), top3(bg)
    cls = {"voice": [], "alarm": [], "phone": [], "other_watch": []}
    for w in tg["watch"]:
        lab = w["label"]
        kind = label_kind(lab)
        rm, rb = readings(tg, lab), readings(bg, lab)
        over = sorted(s for s, p in rm.items() if p >= LIMIT)
        top_at = sorted(s for s, labs in t3m.items() if lab in labs)
        row = {"label": lab, "max": w["max"], "mean": w["mean"], "windows_over_0_3": w["windows_over_0_3"],
               "in_top3_at_s": [round(s - off, 1) for s in top_at],
               "windows_over_0_1": [[round(s - off, 1), p, rb.get(s, 0.0)] for s, p in sorted(rm.items())]}
        cls[kind].append(row)
        where = lambda s: f"{s - off:.1f}-{s - off + 3:.1f} s"  # noqa: E731
        if kind == "other_watch":
            if w["max"] >= LIMIT and lab not in INSTRUMENTS:
                notes.append(f"{view}: '{lab}' {w['max']} at " + ", ".join(
                    f"{where(s)} (bed alone {rb.get(s, 0.0)})" for s in over))
            continue
        for s in over:
            msg = f"{view}: {kind} '{lab}' {rm[s]} at {where(s)}; the bed alone reads {rb.get(s, '<0.1')}"
            if view == "main" or rb.get(s, 0.0) < LIMIT:
                fails.append(msg + ("" if view == "main" else ": the effects push it over"))
            else:
                warnings.append(msg + ": from the music")
        if kind == "phone":
            for s, p in sorted(rm.items()):
                if PHONE_TARGET <= p < LIMIT:
                    warnings.append(f"{view}: phone '{lab}' {p} at {where(s)} is over the {PHONE_TARGET} target; "
                                    f"the bed alone reads {rb.get(s, '<0.1')}")
        if kind in ("voice", "alarm"):
            for s in top_at:
                msg = f"{view}: {kind} '{lab}' in the top 3 at {where(s)}"
                if view == "main" or lab not in t3b.get(s, []):
                    fails.append(msg)
                else:
                    warnings.append(msg + " (also in the bed alone)")
    tag_res[view] = {"windows": tg["windows"], "top_tags": tg["tags"][:8],
                     **{k: sorted(v, key=lambda r: -r["max"]) for k, v in cls.items()}}
res["tags"] = {"windows_note": "windows_over_0_1 rows: [start s in film time, master, bed alone (0.0 = below 0.1)]",
               **tag_res}
res["tags"]["phone_max"] = {v: max([r["max"] for r in tag_res[v]["phone"]], default=0.0) for v in tag_res}

# the opening heard after silence: one 3 s window each; the gate holds whatever the source (a feed starts in silence)
opening = {}
for x in OPENING_XS:
    tg, bg = tags[("master", f"open{x}")], tags[("bed", f"open{x}")]
    wm = {w["label"]: w["max"] for w in tg["watch"]}
    wb = {w["label"]: w["max"] for w in bg["watch"]}
    top = [t["label"] for t in tg["timeline"][0]["top"]] if tg["timeline"] else []
    ranked = lambda d, k: sorted(([lab, p] for lab, p in d.items() if label_kind(lab) == k), key=lambda r: -r[1])  # noqa: E731
    opening[str(x)] = {"top3": top, "top_tags": tg["tags"][:6],
                       **{k: {"master": ranked(wm, k)[:3], "bed": ranked(wb, k)[:3]} for k in ("phone", "voice", "alarm")}}
    for lab, p in wm.items():
        kind = label_kind(lab)
        msg = f"opening (the first {x} s after silence): {kind} '{lab}' {p}; the bed alone reads {wb.get(lab, 0.0)}"
        if kind == "phone" and p >= LIMIT:
            fails.append(msg)
        elif kind == "phone" and p >= PHONE_TARGET:
            warnings.append(msg + f" (over the {PHONE_TARGET} target)")
        elif kind in ("voice", "alarm"):
            if p >= LIMIT:
                fails.append(msg)
            if lab in top:
                fails.append(f"opening (the first {x} s after silence): {kind} '{lab}' in the top 3")
res["tags"]["opening"] = opening
res["tags"]["phone_max"]["opening"] = max(
    (p for x in OPENING_XS for lab, p in ((w["label"], w["max"]) for w in tags[("master", f"open{x}")]["watch"])
     if label_kind(lab) == "phone"), default=0.0)

# ---- mono fold-down and small-speaker share ----
m2 = np.stack([y.mean(axis=1)] * 2, axis=1)
res["mono"] = {"lufs_lost_db": round(full - meter.integrated_loudness(m2), 2),
               "lr_correlation": round(float(np.corrcoef(y[:, 0], y[:, 1])[0, 1]), 3)}
if res["mono"]["lufs_lost_db"] > 3.0:
    fails.append(f"mono fold-down loses {res['mono']['lufs_lost_db']} dB (> 3)")
f, pxx = welch(y.mean(axis=1), fs=SR, nperseg=8192)
band = (f >= 20) & (f <= 20000)
res["speaker"] = {"power_share_above_150hz": round(float(pxx[band & (f >= 150)].sum() / pxx[band].sum()), 3)}
if res["speaker"]["power_share_above_150hz"] < 0.30:
    fails.append(f"small-speaker share {res['speaker']['power_share_above_150hz']} (< 0.30)")

# ---- every cue over the ducked bed, placed as mix_master.py places it ----
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
# BS.1770 K-weighting at 48 kHz (high shelf, then the RLB high-pass)
KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]
THIRDS = 1000.0 * 2.0 ** (np.arange(-12, 13) / 3.0)  # third-octave centres, 63 Hz .. 16 kHz


def window(x, start, a0, a1):
    """Samples a0..a1 (timeline) of a signal x placed at timeline sample `start`, zero where it doesn't sound."""
    seg = np.zeros((x.shape[0], a1 - a0))
    k0, k1 = max(a0, start), min(a1, start + x.shape[1])
    if k1 > k0:
        seg[:, k0 - a0:k1 - a0] = x[:, k0 - start:k1 - start]
    return seg


def kweight(x):
    for b, a_ in KW:
        x = lfilter(b, a_, x, axis=1)
    return x


TRANSIENTS = {"click", "pop", "tick", "thud"}  # measured over 30 ms around the peak; the other roles over 200 ms


def compare(s, i, pk, half, pre=int(0.5 * SR)):
    """The effect vs the ducked bed over pk +- half, both K-weighted (with 0.5 s of pre-roll so the filters settle):
    the level difference; the difference in the effect's loudest third-octave band (its body); and the best
    difference among the bands where the effect is within 20 dB of its loudest band (where it can be heard)."""
    a0, a1 = max(0, pk - half - pre), min(bed_d.shape[1], pk + half)
    ws, wb = kweight(window(s, i, a0, a1)), kweight(bed_d[:, a0:a1])
    cut = slice(pk - half - a0, a1 - a0)
    ws, wb = ws[:, cut], wb[:, cut]
    kw = 10 * np.log10((np.mean(ws ** 2) + 1e-20) / (np.mean(wb ** 2) + 1e-20))
    n = max(ws.shape[1], 4800)  # zero-pad short windows to 10 Hz bins
    win = np.hanning(ws.shape[1])
    fs_ = np.fft.rfftfreq(n, 1 / SR)
    ps, pb = [(np.abs(np.fft.rfft(w * win, n=n, axis=1)) ** 2).sum(0) for w in (ws, wb)]
    es = np.array([ps[(fs_ >= fc / 2 ** (1 / 6)) & (fs_ < fc * 2 ** (1 / 6))].sum() for fc in THIRDS]) + 1e-20
    eb = np.array([pb[(fs_ >= fc / 2 ** (1 / 6)) & (fs_ < fc * 2 ** (1 / 6))].sum() for fc in THIRDS]) + 1e-20
    snr = 10 * np.log10(es / eb)
    j = int(np.argmax(es))
    live = es >= es[j] / 100
    k = int(np.argmax(np.where(live, snr, -np.inf)))
    return {"over_bed_kw_db": round(float(kw), 1), "body_band_hz": int(round(THIRDS[j])),
            "over_bed_body_band_db": round(float(snr[j]), 1), "best_band_hz": int(round(THIRDS[k])),
            "over_bed_best_band_db": round(float(snr[k]), 1)}


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
    half = int((0.015 if c.get("role") in TRANSIENTS else 0.1) * SR)
    rows.append({"frame": c.get("frame"), "role": c.get("role"), "take": c.get("take"), "event": c.get("event"),
                 "gain_db": c.get("gain_db"), "peak_s": round(pk / SR, 4), "window_ms": round(2000 * half / SR),
                 **compare(s, i, pk, half)})
res["cues"] = rows

# ---- spectrograms ----
pngs = []
if not a.no_png:
    def spec(name, ss=None, dur=None, size="1800x600"):
        out = os.path.join(a.out_dir, f"{a.name}.spec-{name}.png")
        cut = [] if ss is None else ["-ss", str(ss), "-t", str(dur)]
        ff(*cut, "-i", a.master, "-lavfi", f"showspectrumpic=s={size}:legend=1:fscale=log:mode=combined:drange=100",
           "-frames:v", "1", out)
        pngs.append(os.path.relpath(out, repo))

    spec("full")
    if a.name == "web":
        for zname, (ss, dur) in ZOOMS.items():
            spec(zname, ss, dur, size="1400x600")
res["png"] = pngs

res.update({"fails": fails, "warnings": warnings, "notes": notes, "pass": not fails})
with open(os.path.join(a.out_dir, f"{a.name}.checks.json"), "w") as f:
    json.dump(res, f, indent=1, ensure_ascii=False)
summary = {"name": a.name, "pass": not fails, "lufs": L["integrated_lufs"], "lra": L["lra_lu"],
           "tp": L["true_peak_dbtp"], "aac_tp": res["aac_192k"]["true_peak_dbtp"], "mono_loss_db": res["mono"]["lufs_lost_db"],
           "share_150": res["speaker"]["power_share_above_150hz"], "phone_max": res["tags"]["phone_max"],
           "fails": fails, "warnings": warnings, "notes": notes}
print(json.dumps(summary, ensure_ascii=False))
sys.exit(1 if fails else 0)
