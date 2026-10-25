"""Gate checks for the film's final soundtrack masters (lane M1; critic H9/H12, OVERRIDES §4, FILM_SPEC §11 and §20).

For one master (--name web|social sets the targets; any other name, e.g. a cut's, takes them from --target):
  length    exactly the film's frames (tools/audio/beatmap.json), or the cut's (--cut docs/film-cuts/<name>.json), at
            its fps: 76.8 s for the film, 28.8 s for x30. Gate.
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
            End card (lane fin-audio): a report; the passes above hold its gates. It lists every 'telephone' and
            'ringtone' reading, master and bed alone, in each window of either grid that overlaps the end card. The end
            card starts at the beat map's "endcard" section (f2016), or in a cut where it first plays a frame from there.
            Hold window (the energetic recut, ENERGY_SPEC §11): the same kind of report for film 29-34 s (f870-1020,
            AgentGuard's hold and its release; in a cut, where it plays those frames), with the phone, voice-like and
            alarm readings. The bed alone is always the original bed (--bed: music_bed.wav, or a cut's
            music_bed_<name>.wav), never the bed with the drive, so a label the drive stem causes counts against the
            gates as an effect's does.
  mono      loudness lost when the mix folds down to mono, (L+R)/2 on both channels (gate <= 3 dB), L/R correlation.
  speaker   share of signal power above 150 Hz (H9 small-speaker translation, >= 0.30).
  silence   the last 54 frames (1.8 s) at or below -70 dBFS, sample peak (ENERGY_SPEC §8.5: the tail ends in digital
            silence). Gate.
  dynamics  the loudness curve (ENERGY_SPEC §8.5), a report: each check is a warning when it misses, with its numbers.
            BS.1770 (pyloudnorm, gated) per bar and per span of bars, against the master's integrated loudness:
            bars 1-2 4-8 LU under it; each gap's middle 200 ms at least 12 dB (K-weighted power) under the 300 ms from
            its hit (the hook gap 6 dB); the hold's 3 s short-term loudness, centred on the film hold's middle (f940),
            5-9 LU under it; bar 8 at least 3 LU over bar 7; bars 23-25 the loudest 3-bar span and at least 1.5 LU over
            the mean of bars 9-22; bars 26-28 at least 6 LU under bars 23-25. A cut maps the checks onto its bars by
            music.score_bars (a check whose bars the cut leaves out is skipped), its gaps from its own cue list and
            the hold's middle through its ranges.
  cues      for every effect in cues.json (automation entries, with no "file", are left out), placed exactly as
            mix_master.py places it, around the effect's peak (30 ms for clicks, pops, ticks and thuds; 200 ms for the
            rest), both K-weighted (BS.1770): the effect's level over the bed as the mix plays it (ducked, gapped and
            held: the automation's gains; the hold's low-pass is not modelled, so a margin in the hold reads low); its
            margin in its own loudest third-octave band (its body); and its best margin among the bands where it has
            energy (within 20 dB of its loudest), which is where it can be heard. FILM_SPEC §11 aims hits 3-6 dB over
            the bed. Not a gate: read it with the spectrograms.
  png       spectrograms (FFmpeg showspectrumpic): the full master, plus zooms on the reveal, the proof's hits and the end
            card (web; and a cut, with the film's zoom windows mapped onto the cut's timeline). Look at them, then
            delete them: mix_checks.sh (the film) and cut_soundtrack.sh (a cut) re-create them.
Usage: python -I mix_checks.py MASTER.wav OUT_DIR --name NAME [--target web|social] [--cut CUT.json] [--bed BED.wav]
       [--cues cues.json] [--film-cues tools/audio/cues.json] [--sound-tags .work/audio/sound_tags]
       [--ffmpeg /opt/homebrew/bin/ffmpeg] [--no-png]
Writes OUT_DIR/<name>.checks.json and the raw tag JSONs <name>.{tags,tags-shift,tags-open0.75,tags-open1.5}.json and
<name>.bed-*.json, the same for the bed alone (+ PNGs). Exit 1 when a gate fails.
For a cut (tools/audio/cut_soundtrack.sh runs this): --name x30 --target social --cut docs/film-cuts/x30.json, with the
cut's own bed (--bed .work/audio/render/music_bed_x30.wav) and cue list (--cues tools/audio/cues.x30.json).
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
ap.add_argument("--name", required=True, help="web, social, or a cut's name (then --target names its loudness targets)")
ap.add_argument("--target", choices=sorted(TARGETS), help="the loudness targets (default: --name)")
ap.add_argument("--cut", help="a cut file (docs/film-cuts/<name>.json): its length, end card and zoom windows")
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", ".."))
ap.add_argument("--beatmap", default=os.path.join(here, "beatmap.json"))
ap.add_argument("--bed", default=os.path.join(repo, ".work", "audio", "render", "music_bed.wav"))
ap.add_argument("--cues", default=os.path.join(here, "cues.json"))
ap.add_argument("--film-cues", default=os.path.join(here, "cues.json"), help="the film's list: its hold's middle (f940)")
ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
ap.add_argument("--ffmpeg", default="/opt/homebrew/bin/ffmpeg")
ap.add_argument("--no-png", action="store_true")
a = ap.parse_args()
target = a.target or a.name
if target not in TARGETS:
    ap.error(f"--name {a.name!r} has no loudness targets: add --target {'|'.join(sorted(TARGETS))}")
T = TARGETS[target]
os.makedirs(a.out_dir, exist_ok=True)
res = {"master": os.path.relpath(a.master, repo), "name": a.name, "target": target, "targets": T}
fails, warnings, notes = [], [], []

# The timeline: the film's (beat map), or a cut's (its ranges of film frames, in playing order)
BM = json.load(open(a.beatmap))
FPS = BM["fps"]
END_CARD_FRAME = next(s["start_frame"] for s in BM["sections"] if s["name"] == "endcard")    # f2016
if a.cut:
    cut = json.load(open(a.cut))
    RANGES, at = [], 0
    for r in cut["ranges"]:
        first, end = r if isinstance(r, list) else (r["from"], r["to"])
        RANGES.append((first, end, at))                                    # film [first, end) plays from cut frame `at`
        at += end - first
    FRAMES = at
    res["cut"] = {"file": os.path.relpath(os.path.abspath(a.cut), repo), "name": cut["name"], "frames": FRAMES}
else:
    RANGES, FRAMES = [(0, BM["total_frames"], 0)], BM["total_frames"]


def film_to_cut_s(f0, f1):
    """The cut-time span (s) where film frames [f0, f1) play, as (first, last) seconds, or None when none of them do."""
    spans = [(at + max(f0, first) - first, at + min(f1, end) - first) for first, end, at in RANGES if f0 < end and f1 > first]
    return (min(s for s, _ in spans) / FPS, max(e for _, e in spans) / FPS) if spans else None


# where the end card starts on this timeline: the first frame played from the film's end card on
END_CARD_S = next(((at + max(0, END_CARD_FRAME - first)) / FPS for first, end, at in RANGES if end > END_CARD_FRAME), None)
HOLD_WINDOW_FRAMES = (870, 1020)  # film 29-34 s: AgentGuard's hold (f891) and its release (to f1008), ENERGY_SPEC §11


def film_to_cut_frame(f):
    """The cut frame where film frame f plays, or None when the cut leaves it out."""
    return next((at + f - first for first, end, at in RANGES if first <= f < end), None)


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


# ---- length: exactly the film's (or the cut's) frames ----
info = sf.info(a.master)
want = round(FRAMES / FPS * info.samplerate)
res["length"] = {"samples": info.frames, "expected_samples": want, "seconds": round(info.frames / info.samplerate, 6),
                 "frames_at_fps": round(info.frames / info.samplerate * FPS, 3), "fps": FPS, "expected_frames": FRAMES}
if info.frames != want:
    fails.append(f"length {info.frames} samples ({info.frames / info.samplerate:.4f} s) is not {FRAMES} frames "
                 f"({want} samples)")

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

# the end card (a report; the passes above gate it): every phone reading, master and bed alone, in each window of
# either grid that overlaps it
if END_CARD_S is not None:
    ec_rows = []
    for view in ("main", "shift"):
        tg, bg = tags[("master", view)], tags[("bed", view)]
        off = SHIFT_S if view == "shift" else 0.0
        labs = sorted({lab for t_ in (tg, bg) for lab in t_.get("watch_windows", {}) if label_kind(lab) == "phone"})
        for w in tg["timeline"]:
            s = w["t"] - off
            if s + 3.0 <= END_CARD_S + 1e-9:
                continue
            ec_rows.append({"view": view, "window_s": [round(s, 1), round(s + 3.0, 1)],
                            **{lab: [readings(tg, lab).get(w["t"], 0.0), readings(bg, lab).get(w["t"], 0.0)]
                               for lab in labs}})
    res["tags"]["end_card"] = {
        "from_s": round(END_CARD_S, 3), "note": "per window and phone label: [master, bed alone]; 0.0 = below 0.1",
        "windows": ec_rows,
        "phone_max": max((v[0] for r in ec_rows for k, v in r.items() if k not in ("view", "window_s")), default=0.0)}
    res["tags"]["phone_max"]["end_card"] = res["tags"]["end_card"]["phone_max"]

# the hold window (a report; the passes above gate it): film 29-34 s, the hold and its release, wherever this timeline
# plays those frames; every phone, voice-like and alarm reading, master and bed alone, in each window of either grid
# that overlaps it
HOLD_SPAN = film_to_cut_s(*HOLD_WINDOW_FRAMES)
if HOLD_SPAN is not None:
    hw_rows = []
    for view in ("main", "shift"):
        tg, bg = tags[("master", view)], tags[("bed", view)]
        off = SHIFT_S if view == "shift" else 0.0
        labs = sorted({lab for t_ in (tg, bg) for lab in t_.get("watch_windows", {})
                       if label_kind(lab) in ("phone", "voice", "alarm")})
        for w in tg["timeline"]:
            s = w["t"] - off
            if s + 3.0 <= HOLD_SPAN[0] + 1e-9 or s >= HOLD_SPAN[1] - 1e-9:
                continue
            hw_rows.append({"view": view, "window_s": [round(s, 1), round(s + 3.0, 1)],
                            "top3": [t_["label"] for t_ in w["top"]],
                            **{lab: [readings(tg, lab).get(w["t"], 0.0), readings(bg, lab).get(w["t"], 0.0)]
                               for lab in labs}})
    kinds = lambda r, k: [v[0] for lab, v in r.items() if lab not in ("view", "window_s", "top3") and label_kind(lab) == k]  # noqa: E731
    res["tags"]["hold_window"] = {
        "span_s": [round(HOLD_SPAN[0], 3), round(HOLD_SPAN[1], 3)],
        "note": "per window and watch label: [master, bed alone]; 0.0 = below 0.1", "windows": hw_rows,
        **{f"{k}_max": max((v for r in hw_rows for v in kinds(r, k)), default=0.0) for k in ("phone", "voice", "alarm")}}
    res["tags"]["phone_max"]["hold_window"] = res["tags"]["hold_window"]["phone_max"]

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

# ---- the tail's digital silence: the last 54 frames at or below -70 dBFS (a gate) ----
SPF = SR / FPS
s_last = int(round((FRAMES - 54) * SPF))
peak_last = float(np.abs(y[s_last:]).max()) if y.shape[0] > s_last else 0.0
res["silence"] = {"last_frames": 54, "from_s": round(s_last / SR, 3), "exact_zeros": peak_last == 0.0,
                  "peak_dbfs": None if peak_last == 0.0 else round(20 * np.log10(peak_last), 1)}
if peak_last > 10 ** (-70 / 20):
    fails.append(f"the last 54 frames peak at {20 * np.log10(peak_last):.1f} dBFS (want <= -70: digital silence)")

# BS.1770 K-weighting at 48 kHz (high shelf, then the RLB high-pass)
KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]
THIRDS = 1000.0 * 2.0 ** (np.arange(-12, 13) / 3.0)  # third-octave centres, 63 Hz .. 16 kHz


def kweight(x):
    for b, a_ in KW:
        x = lfilter(b, a_, x, axis=1)
    return x


# ---- the loudness curve (ENERGY_SPEC §8.5): a report; a miss is a warning with its numbers ----
cues = json.load(open(a.cues))
effects = [c for c in cues if "file" in c]
auto = [c for c in cues if "file" not in c]                            # the mix automation: gaps, the hold, the tail
z = kweight(y.T)                                                       # the K-weighted master, channels x samples
BAR_F = BM["bar_frames"]
SCORE_BARS = cut["music"]["score_bars"] if a.cut else list(range(1, FRAMES // BAR_F + 1))
HOOK_END = next(s["end_frame"] for s in BM["sections"] if s["name"] == "hook")                 # f144


def kpow(s0, s1):
    """The K-weighted power over samples [s0, s1), summed over the channels as BS.1770 does, in dB."""
    seg = z[:, max(0, s0):max(0, min(z.shape[1], s1))]
    return float(10 * np.log10(np.sum(np.mean(seg ** 2, axis=1)) + 1e-20)) if seg.shape[1] else None


def lufs_bars(out_bars):
    """BS.1770 integrated (gated) loudness of the master over these bars of this timeline (1-based), or None."""
    if not out_bars:
        return None
    x = np.concatenate([y[int(round((b - 1) * BAR_F * SPF)):int(round(b * BAR_F * SPF))] for b in out_bars])
    v = meter.integrated_loudness(x)
    return round(float(v), 2) if np.isfinite(v) else None


def bars_of(score):
    """The bars of this timeline (1-based) that play these score bars (the film: the same bars)."""
    return [i + 1 for i, b in enumerate(SCORE_BARS) if b in score]


def smp(c, frame_key, t_key):
    if c.get(frame_key) is not None:
        return int(round(c[frame_key] * SPF))
    return None if c.get(t_key) is None else int(round(c[t_key] * SR))


dyn = {"integrated_lufs": round(float(full), 2),
       "per_bar": [{"bar": i + 1, "score_bar": b, "lufs": lufs_bars([i + 1])} for i, b in enumerate(SCORE_BARS)],
       "checks": []}


def check(name, value, ok, want, **extra):
    dyn["checks"].append({"check": name, "value": value, "want": want, "ok": bool(ok), **extra})
    if not ok:
        warnings.append(f"dynamics: {name} is {value} (want {want})")


ob = bars_of({1, 2})
if ob and lufs_bars(ob) is not None:
    v = round(full - lufs_bars(ob), 2)
    check("bars 1-2 under the integrated level (LU)", v, 4.0 <= v <= 8.0, "4-8", bars=ob)
for c in (c for c in auto if c.get("role") == "gap"):
    g0, g1 = smp(c, "frame", "t"), smp(c, "to_frame", "t_end")
    hook = c.get("source_frame", c.get("frame", HOOK_END)) < HOOK_END
    mid = (g0 + g1) // 2
    middle, after = kpow(mid - int(0.1 * SR), mid + int(0.1 * SR)), kpow(g1, g1 + int(0.3 * SR))
    if middle is not None and after is not None:
        v = round(after - middle, 1)
        want = 6.0 if hook else 12.0
        check(f"gap f{c.get('frame')}-{c.get('to_frame')}: the 300 ms from its hit over its middle 200 ms (dB)", v,
              v >= want, f">= {want:g}", source_frame=c.get("source_frame", c.get("frame")), hook=hook)
film_hold = next((c for c in json.load(open(a.film_cues)) if "file" not in c and c.get("role") == "hold"), None)
if film_hold is not None:
    centre = film_to_cut_frame((film_hold["frame"] + film_hold["to_frame"]) // 2)                  # f940 in the film
    if centre is not None:
        c0 = int(round(centre * SPF))
        st = kpow(c0 - int(1.5 * SR), c0 + int(1.5 * SR))
        if st is not None:
            v = round(full - (st - 0.691), 2)
            check(f"the hold's 3 s short-term loudness (centred on f{centre}) under the integrated level (LU)", v,
                  5.0 <= v <= 9.0, "5-9", short_term_lufs=round(st - 0.691, 2))
b7, b8 = bars_of({7}), bars_of({8})
if b7 and b8 and lufs_bars(b7) is not None and lufs_bars(b8) is not None:
    v = round(lufs_bars(b8) - lufs_bars(b7), 2)
    check("bar 8 over bar 7 (LU)", v, v >= 3.0, ">= 3", bar7=lufs_bars(b7), bar8=lufs_bars(b8))
p = bars_of({23, 24, 25})
if len(p) == 3 and lufs_bars(p) is not None:
    lp = lufs_bars(p)
    proof = [r["lufs"] for r in dyn["per_bar"] if 9 <= r["score_bar"] <= 22 and r["lufs"] is not None]
    if proof:
        v = round(lp - float(np.mean(proof)), 2)
        check("bars 23-25 over the mean of bars 9-22 (LU)", v, v >= 1.5, ">= 1.5", bars_23_25=lp,
              mean_9_22=round(float(np.mean(proof)), 2))
    spans = [(i, lufs_bars([i, i + 1, i + 2])) for i in range(1, len(SCORE_BARS) - 1)]
    best = max((s for s in spans if s[1] is not None), key=lambda s: s[1])
    check("the loudest 3-bar span", f"bars {best[0]}-{best[0] + 2} at {best[1]} LUFS", best[0] == p[0],
          f"bars {p[0]}-{p[2]}")
    q = bars_of({26, 27, 28})
    if len(q) == 3 and lufs_bars(q) is not None:
        v = round(lp - lufs_bars(q), 2)
        check("bars 26-28 under bars 23-25 (LU)", v, v >= 6.0, ">= 6", bars_26_28=lufs_bars(q))
dyn["pass"] = all(c["ok"] for c in dyn["checks"])
res["dynamics"] = dyn

# ---- every effect over the bed as the mix plays it (ducked, gapped, held), placed as mix_master.py places it ----
base = os.path.dirname(os.path.abspath(a.cues))
duck = np.ones(bed.shape[1])
for c in effects:
    if c.get("duck_db", 0):
        d = 10 ** (-abs(c["duck_db"]) / 20)
        k = int(c["t"] * SR)
        a1, r1 = int(0.04 * SR), int(0.6 * SR)
        env = np.concatenate([np.linspace(1, d, a1), np.linspace(d, 1, r1)])
        k0 = max(0, k - a1)
        duck[k0:k0 + len(env)] = np.minimum(duck[k0:k0 + len(env)], env[: len(duck[k0:k0 + len(env)])])
def lin(env, i0, i1, v0, v1):
    """env[i0:i1] goes linearly from v0 to v1 (clipped to env)."""
    if i1 > i0:
        k0, k1 = max(0, i0), min(len(env), i1)
        if k1 > k0:
            env[k0:k1] = (v0 + (v1 - v0) * (np.arange(i0, i1) - i0 + 1) / (i1 - i0))[k0 - i0:k1 - i0]


for c in auto:                                       # the automation's gains on the bed (linear ramps; no low-pass)
    i0, i1, nb = smp(c, "frame", "t"), smp(c, "to_frame", "t_end"), bed.shape[1]
    if c.get("role") == "gap":
        g = 10 ** (c.get("db", -24) / 20)
        ka, kr = int(c.get("attack_ms", 10) * SR / 1000), int(c.get("release_ms", 4) * SR / 1000)
        env = np.ones(nb)
        env[max(0, i0):max(0, i1)] = g
        lin(env, i0 - ka, i0, 1.0, g)
        lin(env, i1 - kr, i1, g, 1.0)
        duck *= env
    elif c.get("role") == "hold":
        ir = smp(c, "release_frame", "t_release") or i1
        kx = int(c.get("crossfade_ms", 30) * SR / 1000)
        share = np.zeros(nb)
        lin(share, i0 - kx, i0, 0.0, 1.0)
        share[max(0, i0):max(0, i1)] = 1.0
        lin(share, i1, ir, 1.0, 0.0)
        duck *= 10 ** (c.get("bed_db", -6) * share / 20)
bed_d = bed * duck


def window(x, start, a0, a1):
    """Samples a0..a1 (timeline) of a signal x placed at timeline sample `start`, zero where it doesn't sound."""
    seg = np.zeros((x.shape[0], a1 - a0))
    k0, k1 = max(a0, start), min(a1, start + x.shape[1])
    if k1 > k0:
        seg[:, k0 - a0:k1 - a0] = x[:, k0 - start:k1 - start]
    return seg


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
for c in effects:
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
    if a.cut:                                       # the film's zoom windows, where the cut plays them
        for zname, (ss, dur) in ZOOMS.items():
            span = film_to_cut_s(int(round(ss * FPS)), int(round((ss + dur) * FPS)))
            if span:
                spec(zname, round(span[0], 3), round(span[1] - span[0], 3), size="1400x600")
    elif a.name == "web":
        for zname, (ss, dur) in ZOOMS.items():
            spec(zname, ss, dur, size="1400x600")
res["png"] = pngs

res.update({"fails": fails, "warnings": warnings, "notes": notes, "pass": not fails})
with open(os.path.join(a.out_dir, f"{a.name}.checks.json"), "w") as f:
    json.dump(res, f, indent=1, ensure_ascii=False)
summary = {"name": a.name, "pass": not fails, "seconds": res["length"]["seconds"], "lufs": L["integrated_lufs"], "lra": L["lra_lu"],
           "tp": L["true_peak_dbtp"], "aac_tp": res["aac_192k"]["true_peak_dbtp"], "mono_loss_db": res["mono"]["lufs_lost_db"],
           "share_150": res["speaker"]["power_share_above_150hz"], "phone_max": res["tags"]["phone_max"],
           "silence_last_54_frames": res["silence"], "dynamics_pass": res["dynamics"]["pass"],
           "dynamics": [[c["check"], c["value"], c["ok"]] for c in res["dynamics"]["checks"]],
           "fails": fails, "warnings": warnings, "notes": notes}
print(json.dumps(summary, ensure_ascii=False))
sys.exit(1 if fails else 0)
